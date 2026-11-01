// Checks translated batches against their todo files.
// Usage (from tools/ar): node ../ar-check.cjs e-001 x-002 ...   (reads todo/<n>.tsv and questions/p2-<n>.tsv)
const fs = require('fs');
for (const n of process.argv.slice(2)) {
  const todo = fs.readFileSync(`todo/${n}.tsv`, 'utf8').trim().split(/\r?\n/).map(l => l.slice(0, 10));
  const out = `questions/p2-${n}.tsv`;
  if (!fs.existsSync(out)) { console.log(n, 'MISSING FILE'); continue; }
  const tr = fs.readFileSync(out, 'utf8').trim().split(/\r?\n/);
  const got = new Set(tr.map(l => (l.match(/^([0-9a-f]{10})\s+\S/) || [])[1]).filter(Boolean));
  const missing = todo.filter(h => !got.has(h));
  const extra = [...got].filter(h => !todo.includes(h));
  const bad = tr.filter(l => !/^[0-9a-f]{10}\s+\S/.test(l));
  const ok = !missing.length && !extra.length && !bad.length;
  console.log(n, ok ? 'OK' : 'PROBLEM', 'todo', todo.length, 'missing', missing.join(','), 'extra', extra.join(','), 'bad', bad.length);
}
