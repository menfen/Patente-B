// Shared by ar-export.mjs and build-data.mjs: Arabic translations of question texts are stored by
// a short hash of the English text, so they survive question renumbering.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const arHash = s => crypto.createHash('sha1').update(s.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 10);

// Explanations are keyed by the Italian question text and its answer.
export const explHash = (it, answer) => arHash(`${it}|${answer ? 1 : 0}`);

// Reads every tools/expl/done/*.tsv ("hash<TAB>English<TAB>Arabic" per line) into a Map hash -> [en, ar].
export function loadExplanations(root) {
  const dir = path.join(root, 'tools', 'expl', 'done');
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.tsv')).sort()) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) {
      const [h, en, ar] = line.split('\t');
      if (/^[0-9a-f]{10}$/.test(h || '') && en && en.trim()) map.set(h, [en.trim(), (ar || '').trim()]);
    }
  }
  return map;
}

// Reads every tools/ar/questions/*.tsv ("hash<TAB or space>Arabic" per line) into a Map.
export function loadArabic(root) {
  const dir = path.join(root, 'tools', 'ar', 'questions');
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.tsv')).sort()) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([0-9a-f]{10})\s+(\S.*)$/);
      if (m) map.set(m[1], m[2].trim());
    }
  }
  return map;
}
