// Rebuilds src/PatenteB.Web/wwwroot/licenses.html from the licence files of the parts the app is built from.
// Usage: node tools/licenses.mjs
import fs from 'node:fs';
const root = new URL('../', import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/%20/g, ' ');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const items = [
  ['This app', 'Patente B', '', 'LICENSE', 'Free for everyone, always: no ads, no payments, no tracking. Lessons, scenarios, the Egyptian Arabic translation and the legal explanations were written for this app (with AI assistance).'],
  ['Quiz questions and sign pictures', 'Ed0ardo/QuizPatenteB', 'https://github.com/Ed0ardo/QuizPatenteB', '_downloads/ed/LICENSE', 'Based on the public list of ministerial quiz questions of the Italian Ministry of Infrastructure and Transport.'],
  ['English translations, trap words and sign notes', 'MathKidsClub/Italian-Driving-Theory-Tester', 'https://github.com/MathKidsClub/Italian-Driving-Theory-Tester', '_downloads/mkc/LICENSE', ''],
  ['App framework (Android/Windows)', '.NET MAUI', 'https://github.com/dotnet/maui', process.env.USERPROFILE + '/.nuget/packages/microsoft.maui.controls/10.0.110/LICENSE.TXT', ''],
];
let body = items.map(([what, name, url, lic, note]) => `<section><h2>${what}</h2><p>${url ? `<a href="${url}">${name}</a>` : `<b>${name}</b>`}${note ? ' – ' + note : ''}</p><pre>${esc(fs.readFileSync(lic.startsWith('C:') || lic.includes(':') ? lic : root + lic, 'utf8').trim())}</pre></section>`).join('\n');
body += `\n<section><h2>Font</h2><p>Open Sans, © The Open Sans Project Authors, licensed under the <a href="https://openfontlicense.org">SIL Open Font License 1.1</a>.</p></section>`;
body += `\n<section><h2>Narration voices</h2><p>The scenario narration was recorded with <a href="https://github.com/resemble-ai/chatterbox">Chatterbox</a> by Resemble AI (MIT licence), an open-source AI speech model. The recordings contain an inaudible watermark marking them as AI-generated.</p></section>`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Licences – Patente B</title>
<style>
  :root { --bg: #f5f4ef; --card: #fff; --text: #1c1f23; --brand: #0b6e4f; }
  @media (prefers-color-scheme: dark) { :root { --bg: #121416; --card: #1c1f23; --text: #eceff1; --brand: #2bb886; } }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.55 system-ui, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; } a { color: var(--brand); } h1 { color: var(--brand); }
  section { background: var(--card); border-radius: 14px; padding: 4px 20px 12px; margin: 16px 0; }
  pre { white-space: pre-wrap; font-size: .8rem; }
</style>
</head>
<body>
<main>
<h1>Licences and sources</h1>
<p>Patente B is an unofficial study aid, not affiliated with the Italian Ministry of Infrastructure and Transport. It is open source under the MIT licence. The parts it is built from keep their own licences, listed below.</p>
${body}
</main>
</body>
</html>
`;
fs.writeFileSync(root + 'src/PatenteB.Web/wwwroot/licenses.html', html);
console.log('written', html.length);
