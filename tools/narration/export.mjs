// Lists every line the app plays as a recording, for make-audio.py:
// - tools/narration/lines.json: scenario captions in English and Egyptian Arabic, exactly as scenes.js
//   speaks them (tags stripped, spaces collapsed). Each is split into segments so the Italian terms
//   in it are spoken by the Italian voice.
// - tools/narration/questions.json: the Italian text of every exam question.
// Usage: node tools/narration/export.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { narrationKey } from './key.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const www = f => fs.readFileSync(path.join(root, 'src/PatenteB.Web/wwwroot', f), 'utf8');

// scenes.js only needs the DOM when a scene is shown; loading it just defines window.Scenes.
const ctx = { window: {}, document: {}, performance: { now: () => 0 } };
ctx.window.window = ctx.window;
vm.createContext(ctx);
for (const f of ['js/scenes.js', 'js/scenarios.js', 'js/scenarios-ar.js', 'data/questions.js', 'data/questions-ar.js', 'js/topic-scenes.js']) vm.runInContext(www(f), ctx, { filename: f });
for (const ch of ctx.window.QDATA.chapters) vm.runInContext(www(`js/topics/${ch.id}.js`), ctx, { filename: ch.id });

const clean = s => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
// Italian terms in the English captions that are not in <i>…</i>.
const ITALIAN = ['extraurbana principale', 'extraurbana secondaria', 'urbana di scorrimento', 'urbana di quartiere', 'strada locale', 'autostrada', 'fondo di garanzia vittime della strada', 'bonus-malus', 'banchina', 'sosta', 'fermata', 'arresto', 'revisione', 'RCA'];
const IT_START = '\u0001', IT_END = '\u0002';

// Splits marked text into [{ lang, text }] segments, dropping the brackets around Italian terms.
function segments(marked, host) {
  const out = [];
  for (const [i, part] of marked.split(new RegExp(`[${IT_START}${IT_END}]`)).entries()) {
    const italian = i % 2 === 1;
    let text = part.replace(/\s+/g, ' ');
    if (!italian) text = text.replace(/\(\s*$/, '').replace(/^\s*\)/, '').replace(/\(\s*\)/g, '');
    text = text.trim();
    if (!/[\p{L}\p{N}]/u.test(text)) continue;
    out.push({ lang: italian ? 'it' : host, text });
  }
  return out;
}

function englishSegments(raw) {
  let s = raw.replace(/<i>(.*?)<\/i>/g, `${IT_START}$1${IT_END}`).replace(/<[^>]+>/g, ' ');
  for (const term of ITALIAN) {
    const re = new RegExp(`(^|[^\\p{L}${IT_START}])(${term})(?=$|[^\\p{L}${IT_END}])`, 'giu');
    s = s.replace(re, `$1${IT_START}$2${IT_END}`);
  }
  return segments(s, 'en');
}

function arabicSegments(raw) {
  // In the Arabic captions every Latin-script run is an Italian term, except single letters, licence categories (A1, AM)
  // and STOP, which the Arabic voice reads: the voice can't say a letter on its own as a separate Italian part.
  const said = { A: 'إيه', B: 'بي', C: 'سي', D: 'دي', E: 'إي', F: 'إف', G: 'جي', H: 'إتش', L: 'إل', M: 'إم', N: 'إن', O: 'أو', P: 'بي', R: 'آر', S: 'إس', T: 'تي', V: 'في', X: 'إكس' };
  const s = raw.replace(/<[^>]+>/g, ' ').replace(/(?<![A-Za-zÀ-ÿ'’])(?:STOP|([A-Z]{1,2})(\d?))(?![A-Za-zÀ-ÿ'’])/g, (m, code, n) => code ? [...code].map(c => said[c] || c).join(' ') + (n ? ' ' + n : '') : 'ستوب').replace(/[A-Za-zÀ-ÖØ-öø-ÿ](?:[A-Za-zÀ-ÖØ-öø-ÿ'’\-/ ]*[A-Za-zÀ-ÖØ-öø-ÿ])?/g, m => `${IT_START}${m}${IT_END}`);
  return segments(s, 'ar');
}

const AR = ctx.window.SCENES_AR || {};
const lines = new Map();
for (const sc of Object.values(ctx.window.SCENARIOS).flat()) {
  for (const step of sc.steps || []) {
    const en = clean(step.text);
    lines.set('en:' + en, { lang: 'en', key: narrationKey(en), text: en, segments: englishSegments(step.text) });
    if (AR[step.text]) {
      const ar = clean(AR[step.text]);
      lines.set('ar:' + ar, { lang: 'ar', key: narrationKey(ar), text: ar, segments: arabicSegments(AR[step.text]) });
    }
  }
}
const out = [...lines.values()];
fs.writeFileSync(path.join(root, 'tools/narration/lines.json'), JSON.stringify(out, null, 1));

const questions = new Map();
for (const ch of ctx.window.QDATA.chapters) for (const sub of ch.subs) for (const q of sub.qs) {
  const it = clean(q.t);
  if (it && !questions.has(it)) questions.set(it, { lang: 'it', ch: ch.id, key: narrationKey(it), text: it, segments: [{ lang: 'it', text: it }] });
}
fs.writeFileSync(path.join(root, 'tools/narration/questions.json'), JSON.stringify([...questions.values()], null, 1));

// The topic animations (js/topics/*.js): every caption, in English and Arabic, for audio/topics/<lang>/<key>.ogg.
const topicLines = new Map();
for (const ch of ctx.window.QDATA.chapters) for (const sub of ctx.window.TopicScenes.list(ch)) {
  for (const step of ctx.window.TopicScenes.scenarioFor(ch.id, sub).steps) {
    const en = clean(step.text);
    if (!topicLines.has('en:' + en)) topicLines.set('en:' + en, { lang: 'en', ch: ch.id, key: narrationKey(en), text: en, segments: englishSegments(step.text) });
    if (AR[step.text]) {
      const ar = clean(AR[step.text]);
      if (!topicLines.has('ar:' + ar)) topicLines.set('ar:' + ar, { lang: 'ar', ch: ch.id, key: narrationKey(ar), text: ar, segments: arabicSegments(AR[step.text]) });
    }
  }
}
fs.writeFileSync(path.join(root, 'tools/narration/topics.json'), JSON.stringify([...topicLines.values()], null, 1));
console.log(`${topicLines.size} topic captions`);

const withIt = out.filter(l => l.segments.some(s => s.lang === 'it')).length;
console.log(`${out.filter(l => l.lang === 'en').length} English and ${out.filter(l => l.lang === 'ar').length} Arabic captions (${withIt} with Italian terms), ${questions.size} questions`);
