// Lists the questions that still need a "why, according to the law" explanation.
// Writes tools/expl/todo/q-NNN.tsv with lines: hash<TAB>VERO|FALSO<TAB>topic<TAB>Italian<TAB>English translation<TAB>picture description (may be empty)
// Explanations go in tools/expl/done/q-NNN.tsv as: hash<TAB>English explanation<TAB>Egyptian Arabic explanation
// build-data.mjs adds them to the question bank. Usage: node tools/expl-export.mjs [batch size]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { explHash, loadExplanations } from './ar-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
await import(new URL('file:///' + path.join(root, 'src', 'PatenteB.Web', 'wwwroot', 'data', 'questions.js').replace(/\\/g, '/')));
const done = loadExplanations(root);
const size = +process.argv[2] || 100;

const lines = [];
const seen = new Set();
for (const ch of window.QDATA.chapters) for (const sub of ch.subs) for (const q of sub.qs) {
  const h = explHash(q.t, q.a);
  if (done.has(h) || seen.has(h)) continue;
  seen.add(h);
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  lines.push([h, q.a ? 'VERO' : 'FALSO', clean(sub.en), clean(q.t), clean(q.e), clean(q.s)].join('\t'));
}
const dir = path.join(root, 'tools', 'expl', 'todo');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync(path.join(root, 'tools', 'expl', 'done'), { recursive: true });
for (let i = 0; i * size < lines.length; i++) {
  fs.writeFileSync(path.join(dir, `q-${String(i + 1).padStart(3, '0')}.tsv`), lines.slice(i * size, (i + 1) * size).join('\n') + '\n');
}
console.log('questions still to explain:', lines.length, 'already explained:', done.size);
