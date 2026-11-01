// Lists the English question texts that still need an Egyptian Arabic translation.
// Writes tools/ar/todo/<field>-NNN.tsv with lines "hash<TAB>English"; translate each into
// tools/ar/questions/<same name>.tsv with lines "hash<TAB>Arabic". build-data.mjs picks those up.
// Fields: e = translation, s = picture note, x = trap note, k = trap-word notes.
// Usage: node tools/ar-export.mjs [batch size]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { arHash, loadArabic } from './ar-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
await import(new URL('file:///' + path.join(root, 'src', 'PatenteB.Web', 'wwwroot', 'data', 'questions.js').replace(/\\/g, '/')));
const qs = window.QDATA.chapters.flatMap(c => c.subs.flatMap(s => s.qs));
const done = loadArabic(root);
const size = +process.argv[2] || 120;

const todoDir = path.join(root, 'tools', 'ar', 'todo');
fs.rmSync(todoDir, { recursive: true, force: true });
fs.mkdirSync(todoDir, { recursive: true });
const report = {};
for (const field of ['e', 's', 'x', 'k']) {
  const seen = new Set();
  const lines = [];
  for (const q of qs) {
    const texts = field === 'k' ? (q.k || []).map(([, w]) => w) : [q[field]];
    for (const t of texts) {
      if (!t) continue;
      const h = arHash(t);
      if (done.has(h) || seen.has(h)) continue;
      seen.add(h);
      lines.push(`${h}\t${t.replace(/\s+/g, ' ')}`);
    }
  }
  for (let i = 0; i * size < lines.length; i++) {
    fs.writeFileSync(path.join(todoDir, `${field}-${String(i + 1).padStart(3, '0')}.tsv`), lines.slice(i * size, (i + 1) * size).join('\n') + '\n');
  }
  report[field] = lines.length;
}
console.log('still to translate:', report, 'already translated:', done.size);
