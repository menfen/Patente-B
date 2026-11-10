// Checks each NN.out.txt against NN.tsv: same number of lines, and with the تشكيل removed, the same letters
// (lines with digits or signs may differ, since numbers are written out as words). Usage: node check.cjs [NN ...]
const fs = require("fs");
const strip = s => s.replace(/[ً-ْٰـ]/g, "").replace(/\s+/g, " ").trim();
const nums = s => /[0-9%=/+×÷]/.test(s);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(".").filter(f => f.endsWith(".out.txt")).map(f => f.slice(0, 2));
const ok = JSON.parse(fs.existsSync("exceptions.json") ? fs.readFileSync("exceptions.json", "utf8") : "{}");
let bad = 0;
for (const id of ids) {
  const src = fs.readFileSync(id + ".tsv", "utf8").split("\n").filter(Boolean).map(l => l.split("\t")[0]);
  const out = fs.readFileSync(id + ".out.txt", "utf8").split("\n").filter(Boolean);
  if (src.length !== out.length) { console.log(id, "line count", src.length, "vs", out.length); bad++; continue; }
  src.forEach((s, i) => {
    if (nums(s) || ok[id + ":" + (i + 1)]) return;
    if (strip(s) !== strip(out[i])) { bad++; console.log(id, i + 1, "\n  src:", strip(s), "\n  out:", strip(out[i])); }
  });
  const marks = out.join("").match(/[ً-ْ]/g)?.length || 0, ar = out.join("").match(/[ء-ي]/g)?.length || 1;
  console.log(id, "ok-ish;", (marks / ar).toFixed(2), "marks per letter");
}
console.log(bad ? bad + " problems" : "all match");
