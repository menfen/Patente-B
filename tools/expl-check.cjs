// Checks explanation batches. Usage (from repo root): node tools/expl-check.cjs q-001 q-002 ...
const fs = require('fs');
for (const n of process.argv.slice(2)) {
  const todo = fs.readFileSync(`tools/expl/todo/${n}.tsv`, 'utf8').trim().split(/\r?\n/).map(l => l.slice(0, 10));
  const out = `tools/expl/done/${n}.tsv`;
  if (!fs.existsSync(out)) { console.log(n, 'MISSING FILE'); continue; }
  const rows = fs.readFileSync(out, 'utf8').trim().split(/\r?\n/).map(l => l.split('\t'));
  const bad = rows.filter(r => r.length !== 3 || !/^[0-9a-f]{10}$/.test(r[0]) || !r[1].trim() || !r[2].trim() || !/[؀-ۿ]/.test(r[2]));
  const got = new Set(rows.map(r => r[0]));
  const missing = todo.filter(h => !got.has(h));
  const extra = [...got].filter(h => !todo.includes(h));
  console.log(n, !bad.length && !missing.length && !extra.length ? 'OK' : 'PROBLEM', 'todo', todo.length, 'missing', missing.join(','), 'extra', extra.join(','), 'bad', bad.length);
}
