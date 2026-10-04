// Builds public demo copies of the local-business templates.
// Changes vs the masters: noindex, a visible "demo / fictional business" label,
// and WhatsApp/phone pointing at Gee's number.
// Usage: node build-demos.js
const fs = require('fs-extra');
const path = require('path');

const TEMPLATES = '/Users/r2d2/template-machine/templates';
const DEMOS = { cafe: '121', salon: '122', trades: '123', rental: '124' };
const WA = '34634852119';
const PHONE = '+34 634 852 119';

const label = `
<style>
  .demo-pill { position: fixed; left: 16px; bottom: 16px; z-index: 70; max-width: calc(100% - 104px); background: rgba(20,20,20,.88); color: #fff; font: 12px/1.4 system-ui, sans-serif; padding: 8px 12px; border-radius: 12px; }
  .demo-pill a { color: #fff; font-weight: 700; }
  @media (max-width: 900px) { body:has(.callbar) .demo-pill { bottom: 72px; } }
</style>
<div class="demo-pill">
  <span lang="es"><b>Demo</b> · negocio ficticio. Los botones de WhatsApp escriben a Gee. <a href="../">Más demos</a></span>
  <span lang="en"><b>Demo</b> · fictional business. WhatsApp buttons message Gee. <a href="../">More demos</a></span>
</div>`;

for (const [slug, id] of Object.entries(DEMOS)) {
  const out = path.join(__dirname, slug);
  fs.emptyDirSync(out);
  fs.copySync(path.join(TEMPLATES, id, 'static'), out);
  let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  html = html
    .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">')
    .replace(/whatsapp: "34600000000"/, `whatsapp: "${WA}"`)
    .replace(/phone: "\+34 600 000 000"/, `phone: "${PHONE}"`)
    .replace(/"telephone": "\+34 600 000 000"/, `"telephone": "${PHONE}"`)
    .replace('<!--@footer-->', '')
    .replace(/<\/body>/, label + '\n</body>');
  if (html.includes('34600000000') || html.includes('600 000 000')) throw new Error(`${slug}: placeholder number left`);
  fs.writeFileSync(path.join(out, 'index.html'), html);
  console.log(`✓ ${slug} (from #${id})`);
}
