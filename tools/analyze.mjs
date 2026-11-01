import fs from 'node:fs';
const dl = process.argv[2];
const ed = JSON.parse(fs.readFileSync(`${dl}/ed/quiz.json`, 'utf8'));
const src = fs.readFileSync(`${dl}/mkc/questions.js`, 'utf8').replace(/^window\.QUESTIONS\s*=\s*/, '').replace(/;\s*$/, '');
const mkc = JSON.parse(src);
const norm = s => s.normalize('NFC').toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9àèéìòù']+/g, ' ').trim();
const map = new Map(); for (const q of mkc) map.set(norm(q.it), q);
let tot = 0, hit = 0, imgs = new Set();
for (const [ch, subs] of Object.entries(ed)) {
  let c = 0, h = 0;
  for (const [s, qs] of Object.entries(subs)) for (const q of qs) { c++; if (map.has(norm(q.q))) h++; if (q.img) imgs.add(q.img); }
  console.log(`${ch.padEnd(60)} ${Object.keys(subs).length} subs, ${c} q, ${h} matched`);
  tot += c; hit += h;
}
console.log({ chapters: Object.keys(ed).length, tot, hit, mkc: mkc.length, edImages: imgs.size, mkcWithImg: mkc.filter(q => q.image).length });
