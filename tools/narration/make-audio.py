"""Records the app's voice clips with Chatterbox (github.com/resemble-ai/chatterbox, MIT licence).

    python tools/narration/make-audio.py narration [en|ar]   # scenario captions -> wwwroot/audio/narration/<lang>/<key>.mp3
    python tools/narration/make-audio.py questions           # exam questions    -> wwwroot/audio/questions/<key>.ogg (Opus)
    python tools/narration/make-audio.py topics [en|ar]      # topic animations  -> wwwroot/audio/topics/<lang>/<key>.ogg (Opus)

Input comes from export.mjs. Each line is made of segments; English and Arabic segments use the
English and the multilingual model, Italian segments (the Italian terms in a caption, and every
question) use the multilingual model in Italian, so learners hear the real pronunciation.
Every segment is transcribed back with Whisper and recorded again (up to TRIES times) when the
transcript doesn't match the text. Existing files are skipped; delete one to redo it.
Set NARRATION_LIMIT=n to record only the first n missing lines, and NARRATION_SHARD=i/n to split
the work between n processes running at the same time (each writes its own report), and
NARRATION_CHAPTER=<chapter id> to record one chapter. record-by-chapter.sh uses all three: long runs get slower.

Our own Egyptian voice for the Arabic: set EGY_T3 to the fine-tuned T3 checkpoint (F:/tts-train/ckpt/egy4_ep1.safetensors)
and EGY_VOICE to the reference recording of the voice to copy. Arabic lines are then read by that model in that voice,
from the تشكيل version of each segment in tashkeel-ar.json (ق kept as written); their Italian terms use the base model
in the same voice. English lines are unchanged. The fine-tune data is licensed for non-commercial use only.

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
WWW = Path(os.environ.get("AUDIO_OUT") or ROOT / "src/PatenteB.Web/wwwroot/audio")  # AUDIO_OUT: record somewhere else, e.g. to test
TRIES = 8
SR = 24000
FADE = 0.01  # seconds faded in and out at each segment edge, so joins don't click


# Signs and units the voice would misread, written out as said.
SAID = {
    "en": [(r"^(The|A)$", "The road type"), (r"^,?\s*([B-F])$", r"type \1"),  # the voice fails on one short word alone
           (r"\s*=\s*", " equals "), (r"\s\+\s", " plus "), (r"\s*÷\s*", " divided by "), (r"\s*×\s*", " times "),
           (r"km/h", "kilometres per hour"), (r"(\d) s\b", r"\1 second"), (r"(\d) m\b", r"\1 metres")],
    "ar": [(r"\s*=\s*", " تساوي "), (r"\s\+\s", " زائد "), (r"\s*÷\s*", " على "), (r"\s*×\s*", " في "),
           (r"^و$", "وكمان"), (r"كم/س", "كيلومتر في الساعة"), (r"جم/لتر", "جرام في اللتر"), (r"0\.5", "نص")],
}


IT_ONES = "zero uno due tre quattro cinque sei sette otto nove dieci undici dodici tredici quattordici quindici sedici diciassette diciotto diciannove".split()
IT_TENS = "venti trenta quaranta cinquanta sessanta settanta ottanta novanta".split()
IT_CODES = {"A1": "a uno", "A2": "a due", "B1": "bi uno", "C1": "ci uno", "AM": "a emme", "BE": "bi e", "BS": "bi esse", "CE": "ci e", "PL": "pi elle",
            "GPL": "gi pi elle", "ABS": "a bi esse", "RCA": "erre ci a", "ASL": "a esse elle", "LSD": "elle esse di"}
IT_LETTERS = {"B": "bi", "C": "ci", "D": "di", "F": "effe", "G": "gi", "H": "acca", "L": "elle", "M": "emme", "N": "enne", "P": "pi", "Q": "cu",
              "R": "erre", "S": "esse", "T": "ti", "V": "vu", "X": "ics", "Z": "zeta"}


def it_number(n: int) -> str:
    if n < 20:
        return IT_ONES[n]
    if n < 100:
        tens, one = IT_TENS[n // 10 - 2], n % 10
        return (tens[:-1] if one in (1, 8) else tens) + ("" if not one else "tré" if one == 3 else IT_ONES[one])
    if n < 1000:
        rest = n % 100
        words = ("cento" if n < 200 else IT_ONES[n // 100] + "cento") + (it_number(rest) if rest else "")
        return words.replace("centoott", "centott")
    if n < 1000000:
        rest = n % 1000
        return ("mille" if n < 2000 else it_number(n // 1000) + "mila") + (it_number(rest) if rest else "")
    return str(n)


def said_italian(text: str) -> str:
    """Italian as it is said: the voice misreads digits ("8.00" as eight thousand), units and letters on their own."""
    for sign, said in [(r"bonus-malus", "bonus malus"), (r"km/h", "chilometri orari"), (r"cm3", "centimetri cubici"), (r"kW/kg", "chilowatt per chilogrammo"), (r"kW/t", "chilowatt per tonnellata"),
                       (r"(\d) ?x ?(\d)", r"\1 per \2"), (r"\bmm\b", "millimetri"), (r"\bkW\b", "chilowatt"), (r"\bkm\b", "chilometri"), (r"\bcm\b", "centimetri"), (r"\bkg\b", "chilogrammi"), (r"\bm\.? ?(\d[\d.,]*)", r"\1 metri"),
                       (r"(\d)\s*m\b", r"\1 metri"), (r"(\d)\s*t\b", r"\1 tonnellate"), (r"\s*%", " per cento"), (r"\bn\. ?(\d)", r"numero \1"), (r"\bS\. ?ANDREA", "Sant'Andrea")]:
        text = re.sub(sign, said, text)
    text = re.sub(r"\b[A-Z]{1,3}\d?\b(?!['’.])", lambda m: IT_CODES.get(m[0], IT_LETTERS.get(m[0], m[0])), text)
    text = re.sub(r"\b(\d{1,3})\.(\d{3})\b", r"\1\2", text)  # 1.000
    text = re.sub(r"\b(\d{1,2})\.(\d{2})\b|\bore (\d{1,2}),(\d{2})\b",  # 7.30, 8.00
                  lambda m: ("ore " if m[3] else "") + it_number(int(m[1] or m[3])) + ("" if (m[2] or m[4]) == "00" else " e " + it_number(int(m[2] or m[4]))), text)
    text = re.sub(r"(\d+),(\d+)", lambda m: it_number(int(m[1])) + " virgola " + " ".join(["zero"] * (len(m[2]) - len(m[2].lstrip("0"))) + ([it_number(int(m[2]))] if int(m[2]) else [])), text)
    return re.sub(r"\d+", lambda m: it_number(int(m[0])), text)


NUMBER_WORDS = {"".join(c for c in it_number(i).replace("é", "e")) for i in [*range(3001), *range(3000, 100000, 500)]} - {"uno", "sei"}


def spoken_numbers(text: str) -> list:
    """The numbers in Italian text, to compare what was written with what was said. Leaves out uno and sei, which are also ordinary words."""
    words = re.split(r"[^\wàèéìòù]+", said_italian(text).lower().replace("é", "e"))
    return [w for w in words if w in NUMBER_WORDS]


def speakable(text: str, last: bool = True, lang: str = "en") -> str:
    """Text as the voice should read it (the file name still comes from the original).
    A segment that the sentence continues after ends with a comma, so the voice keeps a
    continuing intonation instead of dropping as at the end of a sentence."""
    text = re.sub(r"\(\s*", "(", text)
    text = re.sub(r"\s*\)", ")", text)
    text = re.sub(r"\s+([,.:;!?،])", r"\1", text)
    for sign, said in SAID.get(lang, []):
        text = re.sub(sign, said, text)
    if lang == "it":
        text = said_italian(text)
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


EGY_T3, EGY_VOICE = os.environ.get("EGY_T3"), os.environ.get("EGY_VOICE")
EGY_SETTINGS = dict(exaggeration=0.5, cfg_weight=0.3, temperature=0.7)  # what the listening tests used


def egy_text(text: str) -> str:
    """The تشكيل version of an Arabic segment, as the Egyptian model was tested on: no punctuation inside, a full stop at the end."""
    t = TASHKEEL.get(text.strip(), text)
    t = re.sub(r"\([^)]*[A-Za-z][^)]*\)", " ", t)
    t = re.sub(r"[A-Za-zÀ-ÿ]+", " ", t)
    t = re.sub(r"[:؛;،,()\"«»؟?!.]", " ", t)
    return re.sub(r"\s+", " ", t).strip() + "."


TASHKEEL = json.loads((ROOT / "tools/narration/tashkeel-ar.json").read_text("utf-8")) if EGY_T3 else {}


class Voices:
    def __init__(self):
        import whisper
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        self.asr = whisper.load_model("turbo", device="cuda")
        # One multilingual model for English, Arabic and Italian: the same speaker says every part of
        # a caption, so the Italian terms sound like the narrator pronouncing them, not a second voice.
        self.mtl = ChatterboxMultilingualTTS.from_pretrained(device="cuda")
        self.base_t3, self.default_conds = self.mtl.t3, self.mtl.conds
        if EGY_T3:
            import copy
            from safetensors.torch import load_file
            self.egy_t3 = copy.deepcopy(self.base_t3)
            self.egy_t3.load_state_dict(load_file(EGY_T3))
            self.egy_t3.eval()
            self.mtl.prepare_conditionals(EGY_VOICE, exaggeration=EGY_SETTINGS["exaggeration"])
            self.egy_conds, self.mtl.conds = self.mtl.conds, self.default_conds

    def hear(self, wav: np.ndarray, lang: str) -> str:
        import torchaudio.functional as F
        audio = F.resample(torch.from_numpy(wav).float(), SR, 16000).numpy()
        return self.asr.transcribe(audio, language=lang, fp16=True)["text"]

    def say(self, text: str, lang: str, last: bool = True, egy: bool = False):
        """Best take of one segment: (score, wav, transcript). egy: a segment of an Arabic line read in our Egyptian voice."""
        spoken = egy_text(text) if egy and lang == "ar" else None
        text = speakable(text, last, lang)
        self.mtl.conds = self.egy_conds if egy else self.default_conds
        self.mtl.t3 = self.egy_t3 if spoken else self.base_t3
        settings = EGY_SETTINGS if spoken else dict(exaggeration=0.4, cfg_weight=0.5)
        best = None
        for attempt in range(TRIES):
            torch.manual_seed(int(os.environ.get("SEED", 1000)) + attempt)
            try:
                wav = self.mtl.generate(spoken or text, language_id=lang, **settings)
            except IndexError:  # the model's alignment check fails on some very short texts; try another seed
                continue
            wav = trim(wav.squeeze().cpu().numpy().astype(np.float32))
            # a take much longer than the text needs is a hallucination
            if len(wav) / SR > 1.5 + 0.12 * len(text):
                s, heard = 0.0, "(too long)"
            else:
                heard = self.hear(wav, lang)
                # Whisper writes numbers and units as digits and signs: compare them as said
                s = score(text, said_italian(heard) if lang == "it" else heard, lang)
                if lang == "it" and spoken_numbers(text) != spoken_numbers(heard):  # a wrong number is worse than a garbled word
                    s = min(s, threshold(text, lang) - 0.01)
            if not best or s > best[0]:
                best = (s, wav, heard)
            if s >= threshold(text, lang):
                break
        return best or (0.0, np.zeros(int(0.1 * SR), np.float32), "(failed)")


def main():
    kind = sys.argv[1] if len(sys.argv) > 1 else "narration"
    langs = sys.argv[2:] or ["en", "ar", "it"]
    lines = json.loads((ROOT / f"tools/narration/{ {'questions': 'questions', 'topics': 'topics'}.get(kind, 'lines') }.json").read_text("utf-8"))
    dest = {
        "questions": lambda l: WWW / "questions" / f'{l["key"]}.ogg',
        "topics": lambda l: WWW / "topics" / l["lang"] / f'{l["key"]}.ogg',
    }.get(kind, lambda l: WWW / "narration" / l["lang"] / f'{l["key"]}.mp3')
    shard = os.environ.get("NARRATION_SHARD")  # "i/n": record every n-th line from the i-th, to run several at once
    chapter = os.environ.get("NARRATION_CHAPTER")
    todo = [l for l in lines if l["lang"] in langs and not dest(l).exists() and (not chapter or l.get("ch") == chapter)]
    if shard:
        # every n-th of the lines still missing: processes started together see the same list, so they never overlap.
        # (Splitting the whole list instead left one process idle when lines alternate English / Arabic.)
        i, n = map(int, shard.split("/"))
        todo = todo[i::n]
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
            s, wav, heard = voices.say(seg["text"], seg["lang"], last=i == len(segs) - 1, egy=bool(EGY_T3) and line["lang"] == "ar")
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
