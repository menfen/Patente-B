"""Records the app's voice clips with Chatterbox (github.com/resemble-ai/chatterbox, MIT licence).

    python tools/narration/make-audio.py narration [en|ar]   # scenario captions -> wwwroot/audio/narration/<lang>/<key>.mp3
    python tools/narration/make-audio.py questions           # exam questions    -> wwwroot/audio/questions/<key>.ogg (Opus)

Input comes from export.mjs. Each line is made of segments; English and Arabic segments use the
English and the multilingual model, Italian segments (the Italian terms in a caption, and every
question) use the multilingual model in Italian, so learners hear the real pronunciation.
Every segment is transcribed back with Whisper and recorded again (up to TRIES times) when the
transcript doesn't match the text. Existing files are skipped; delete one to redo it.
Set NARRATION_LIMIT=n to record only the first n missing lines, and NARRATION_SHARD=i/n to split
the work between n processes running at the same time (each writes its own report).

Needs Python 3.11 and an NVIDIA GPU:
    pip install chatterbox-tts openai-whisper soundfile "setuptools<81" --extra-index-url https://download.pytorch.org/whl/cu124
"""
import difflib
import json
import os
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

ROOT = Path(__file__).resolve().parents[2]
WWW = ROOT / "src/PatenteB.Web/wwwroot/audio"
TRIES = 8
SR = 24000
FADE = 0.01  # seconds faded in and out at each segment edge, so joins don't click


# Signs and units the voice would misread, written out as said.
SAID = {
    "en": [(r"\s*=\s*", " equals "), (r"\s\+\s", " plus "), (r"\s*÷\s*", " divided by "), (r"\s*×\s*", " times "),
           (r"km/h", "kilometres per hour"), (r"(\d) s\b", r"\1 second"), (r"(\d) m\b", r"\1 metres")],
    "ar": [(r"\s*=\s*", " تساوي "), (r"\s\+\s", " زائد "), (r"\s*÷\s*", " على "), (r"\s*×\s*", " في "),
           (r"كم/س", "كيلومتر في الساعة"), (r"جم/لتر", "جرام في اللتر"), (r"0\.5", "نص")],
}


def speakable(text: str, last: bool = True, lang: str = "en") -> str:
    """Text as the voice should read it (the file name still comes from the original).
    A segment that the sentence continues after ends with a comma, so the voice keeps a
    continuing intonation instead of dropping as at the end of a sentence."""
    text = re.sub(r"\(\s*", "(", text)
    text = re.sub(r"\s*\)", ")", text)
    text = re.sub(r"\s+([,.:;!?،])", r"\1", text)
    for sign, said in SAID.get(lang, []):
        text = re.sub(sign, said, text)
    text = text.replace(" – ", ", ").replace("–", ", ").replace("=", ":")
    text = re.sub(r"\s+", " ", text).strip(" ,،").lstrip(".:;)").strip()
    if re.search(r"[.!?…]$", text):
        return text
    if last:
        return text + "."
    # Italian terms are short and a comma after them makes the voice take a breath
    return text if lang == "it" else text + ","


def pause_before(seg_text: str) -> float:
    """Silence between two segments, from the punctuation where they meet."""
    t = seg_text.lstrip()
    if t[:1] in ".!?…":
        return 0.28
    if t[:1] in ":;":
        return 0.18
    if t[:1] in ",،":
        return 0.10
    return 0.04


def letters(text: str, lang: str) -> str:
    text = text.lower()
    if lang == "ar":
        text = re.sub(r"[ً-ْـ]", "", text)  # diacritics and tatweel
        text = re.sub(r"[إأآا]", "ا", text).replace("ى", "ي").replace("ة", "ه")
        return re.sub(r"[^ء-ي0-9]", "", text)
    text = text.replace("à", "a").replace("è", "e").replace("é", "e").replace("ì", "i").replace("ò", "o").replace("ù", "u")
    return re.sub(r"[^a-z0-9]", "", text)


def score(text: str, heard: str, lang: str) -> float:
    a, b = letters(text, lang), letters(heard, lang)
    s = difflib.SequenceMatcher(None, a, b).ratio()
    # repeated words or extra sounds make the take longer than the text: count that against it
    if len(b) > len(a) * 1.1 and a:
        s *= len(a) * 1.1 / len(b)
    return s


def threshold(text: str, lang: str) -> float:
    n = len(letters(text, lang))
    if n < 8:
        return 0.8
    return {"en": 0.9, "ar": 0.85, "it": 0.88}[lang]


FRAME = SR // 100  # 10 ms


def speech_runs(wav: np.ndarray):
    """Stretches of sound at most 20 dB below the loudest part, as [start, end) frame pairs,
    with their mean spectral flatness (near 0 for a voice, high for breath-like noise)."""
    n = len(wav) // FRAME
    if n == 0:
        return [], 0
    fr = wav[: n * FRAME].reshape(n, FRAME)
    rms = np.sqrt(np.mean(fr ** 2, axis=1))
    power = np.abs(np.fft.rfft(fr * np.hanning(FRAME), axis=1)) ** 2 + 1e-12
    flat = np.exp(np.mean(np.log(power), axis=1)) / np.mean(power, axis=1)
    on = rms > 0.1 * rms.max()
    runs, i = [], 0
    while i < n:
        if on[i]:
            j = i
            while j < n and (on[j] or (j + 6 < n and on[j:j + 6].any())):  # bridge gaps under 60 ms
                j += 1
            runs.append([i, j, float(flat[i:j].mean())])
            i = j
        else:
            i += 1
    return runs, n


MAX_PAUSE = 30  # frames: longer silences inside a segment are shortened to 0.3 s


def trim(wav: np.ndarray) -> np.ndarray:
    """Keeps only the speech: cuts silence at both ends, a breath or sniff before or after the words
    (a short burst cut off from them by a pause), and shortens long silences in between."""
    runs, _ = speech_runs(wav)
    if runs:
        short, apart = 45, 25  # a burst under 0.45 s, at least 0.25 s away from the words
        while len(runs) > 1 and runs[-1][1] - runs[-1][0] < short and runs[-1][0] - runs[-2][1] >= apart:
            runs.pop()
        while len(runs) > 1 and runs[0][1] - runs[0][0] < short and runs[1][0] - runs[0][1] >= apart:
            runs.pop(0)
        keep = [(max(0, runs[0][0] * FRAME - int(0.02 * SR)), runs[0][1] * FRAME)]
        for (_, prev_end, _), (start, end, _) in zip(runs, runs[1:]):
            if start - prev_end > MAX_PAUSE:  # drop the middle of a long silence
                keep.append((start * FRAME - MAX_PAUSE * FRAME // 2, end * FRAME))
                keep[-2] = (keep[-2][0], prev_end * FRAME + MAX_PAUSE * FRAME // 2)
            else:
                keep[-1] = (keep[-1][0], end * FRAME)
        keep[-1] = (keep[-1][0], min(len(wav), keep[-1][1] + int(0.05 * SR)))
        wav = np.concatenate([wav[a:b] for a, b in keep])
    n = min(int(FADE * SR), len(wav) // 4)
    if n:
        ramp = np.linspace(0, 1, n, dtype=np.float32)
        wav = wav.copy()
        wav[:n] *= ramp
        wav[-n:] *= ramp[::-1]
    return wav


def level(wav: np.ndarray, target_rms: float = 0.08) -> np.ndarray:
    rms = float(np.sqrt(np.mean(wav ** 2))) or 1.0
    return wav * (target_rms / rms)


class Voices:
    def __init__(self):
        import whisper
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        self.asr = whisper.load_model("turbo", device="cuda")
        # One multilingual model for English, Arabic and Italian: the same speaker says every part of
        # a caption, so the Italian terms sound like the narrator pronouncing them, not a second voice.
        self.mtl = ChatterboxMultilingualTTS.from_pretrained(device="cuda")

    def hear(self, wav: np.ndarray, lang: str) -> str:
        import torchaudio.functional as F
        audio = F.resample(torch.from_numpy(wav).float(), SR, 16000).numpy()
        return self.asr.transcribe(audio, language=lang, fp16=True)["text"]

    def say(self, text: str, lang: str, last: bool = True):
        """Best take of one segment: (score, wav, transcript)."""
        text = speakable(text, last, lang)
        best = None
        for attempt in range(TRIES):
            torch.manual_seed(1000 + attempt)
            try:
                wav = self.mtl.generate(text, language_id=lang, exaggeration=0.4, cfg_weight=0.5)
            except IndexError:  # the model's alignment check fails on some very short texts; try another seed
                continue
            wav = trim(wav.squeeze().cpu().numpy().astype(np.float32))
            # a take much longer than the text needs is a hallucination
            if len(wav) / SR > 1.5 + 0.12 * len(text):
                s, heard = 0.0, "(too long)"
            else:
                heard = self.hear(wav, lang)
                s = score(text, heard, lang)
            if not best or s > best[0]:
                best = (s, wav, heard)
            if s >= threshold(text, lang):
                break
        return best or (0.0, np.zeros(int(0.1 * SR), np.float32), "(failed)")


def main():
    kind = sys.argv[1] if len(sys.argv) > 1 else "narration"
    langs = sys.argv[2:] or ["en", "ar", "it"]
    lines = json.loads((ROOT / f"tools/narration/{'questions' if kind == 'questions' else 'lines'}.json").read_text("utf-8"))
    dest = (lambda l: WWW / "questions" / f'{l["key"]}.ogg') if kind == "questions" else (lambda l: WWW / "narration" / l["lang"] / f'{l["key"]}.mp3')
    shard = os.environ.get("NARRATION_SHARD")  # "i/n": record every n-th line from the i-th, to run several at once
    if shard:
        # by position in the whole list, so a restarted process still takes the same lines
        i, n = map(int, shard.split("/"))
        lines_ = lines[i::n]
    else:
        lines_ = lines
    todo = [l for l in lines_ if l["lang"] in langs and not dest(l).exists()]
    if os.environ.get("NARRATION_LIMIT"):
        todo = todo[: int(os.environ["NARRATION_LIMIT"])]
    print(f"{len(todo)} of {len(lines)} {kind} lines to record", flush=True)
    if not todo:
        return

    voices = Voices()
    rep_path = ROOT / f"tools/narration/report-{kind}{'-' + shard.replace('/', 'of') if shard else ''}.json"
    report = json.loads(rep_path.read_text("utf-8")) if rep_path.exists() else {}
    for n, line in enumerate(todo, 1):
        parts, notes, prev = [], [], None
        segs = line["segments"]
        for i, seg in enumerate(segs):
            s, wav, heard = voices.say(seg["text"], seg["lang"], last=i == len(segs) - 1)
            if prev is not None:
                gap = max(pause_before(seg["text"]), pause_before(prev["text"][-1:]))
                parts.append(np.zeros(int(gap * SR), np.float32))
            parts.append(level(wav))
            prev = seg
            notes.append({"lang": seg["lang"], "score": round(s, 3), "text": seg["text"], "heard": heard.strip()})
        wav = np.concatenate(parts)
        wav = wav / max(1.0, float(np.max(np.abs(wav))) / 0.89)
        out = dest(line)
        out.parent.mkdir(parents=True, exist_ok=True)
        if kind == "narration":
            # MP3 around 40 kbit/s: plays everywhere and there are only a few hundred captions.
            sf.write(out, wav, SR, format="MP3", bitrate_mode="VARIABLE", compression_level=0.7)
        else:
            # Opus around 18 kbit/s keeps all ~6,800 questions near 80 MB; browsers that can't play it fall back to the device voice.
            sf.write(out, wav, SR, format="OGG", subtype="OPUS", compression_level=0.96)
        report[f'{line["lang"]}:{line["key"]}'] = notes
        low = min(x["score"] for x in notes)
        print(f"[{n}/{len(todo)}] {line['lang']} {line['key']} min score {low:.2f}", flush=True)
        if n % 25 == 0 or n == len(todo):
            rep_path.write_text(json.dumps(report, ensure_ascii=False, indent=1), "utf-8")
    weak = [k for k, v in report.items() if any(x["score"] < threshold(x["text"], x["lang"]) for x in v)]
    print(f"done; {len(weak)} lines with a segment below the threshold (see {rep_path.name})")


if __name__ == "__main__":
    main()
