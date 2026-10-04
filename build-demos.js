// Builds public demo copies of the local-business templates.
// Changes vs the masters: noindex, a visible "demo / fictional business" label,
// and WhatsApp/phone pointing at Gee's number.
// Also builds personal proposals (e.g. /kingbarber/) from a template source + real data.
// Usage: node build-demos.js
const fs = require('fs-extra');
const path = require('path');

const LB = '/Users/r2d2/template-machine/shared/local-business';
const TEMPLATES = '/Users/r2d2/template-machine/templates';
const { render, footer } = require(path.join(LB, 'build.js'));
const DEMOS = { cafe: '121', salon: '122', trades: '123', rental: '124', barber: '125' };
const WA = '34634852119';
// Old links that should keep working: old slug -> new slug
const REDIRECTS = { kingbarber: 'kings' };
const PHONE = '+34 634 852 119';

const pillStyle = `
<style>
  .demo-pill { position: fixed; left: 16px; bottom: 16px; z-index: 70; max-width: calc(100% - 104px); background: rgba(20,20,20,.88); color: #fff; font: 12px/1.4 system-ui, sans-serif; padding: 8px 12px; border-radius: 12px; }
  .demo-pill a { color: #fff; font-weight: 700; }
  html[dir="rtl"] .demo-pill { font-family: "Kufi", system-ui, sans-serif; }
  @media (max-width: 900px) { body:has(.callbar) .demo-pill { bottom: 72px; } }
</style>`;

const demoLabel = pillStyle + `
<div class="demo-pill">
  <span lang="es"><b>Demo</b> · negocio ficticio. Los botones de WhatsApp escriben a Gee. <a href="../">Más demos</a></span>
  <span lang="en"><b>Demo</b> · fictional business. WhatsApp buttons message Gee. <a href="../">More demos</a></span>
  <span lang="ar"><b>نموذج</b> · نشاط تجاري وهمي. أزرار واتساب تراسل Gee. <a href="../">نماذج أخرى</a></span>
</div>`;

const proposalLabel = name => pillStyle + `
<div class="demo-pill">
  <span lang="es"><b>Propuesta no oficial</b> de Gee para ${name}. Los botones escriben a Gee.</span>
  <span lang="en"><b>Unofficial proposal</b> by Gee for ${name}. Buttons message Gee.</span>
  <span lang="ar"><b>اقتراح غير رسمي</b> من Gee لـ ${name}. الأزرار تراسل Gee.</span>
</div>`;

// Shrinks a photo to max 1400px (never enlarges), JPEG quality 72
function resizePhoto(src, dest) {
  require('child_process').execFileSync('python3', ['-c', 'import sys;from PIL import Image;i=Image.open(sys.argv[1]).convert("RGB");i.thumbnail((1400,1400));i.save(sys.argv[2],"JPEG",quality=72,optimize=True,progressive=True)', src, dest]);
}

function finish(html, slug, label) {
  html = html
    .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">\n<link rel="icon" href="data:,">')
    .replace(/whatsapp: "34600000000"/, `whatsapp: "${WA}"`)
    .replace(/phone: "\+34 600 000 000"/, `phone: "${PHONE}"`)
    .replace(/"telephone": "\+34 600 000 000"/, `"telephone": "${PHONE}"`)
    .replace('<!--@footer-->', '')
    .replace(/<\/body>/, label + '\n</body>');
  if (html.includes('34600000000') || html.includes('600 000 000')) throw new Error(`${slug}: placeholder number left`);
  if (html.includes('{{')) throw new Error(`${slug}: unfilled token`);
  return html;
}

// Generic demos: copy the built template
for (const [slug, id] of Object.entries(DEMOS)) {
  const out = path.join(__dirname, slug);
  fs.emptyDirSync(out);
  fs.copySync(path.join(TEMPLATES, id, 'static'), out);
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(out, 'index.html'), finish(html, slug, demoLabel));
  console.log(`✓ ${slug} (from #${id})`);
}

// Personal proposals: template source + proposals/<slug>.json
for (const file of fs.readdirSync(path.join(__dirname, 'proposals')).filter(f => f.endsWith('.json'))) {
  const slug = path.basename(file, '.json');
  const data = fs.readJsonSync(path.join(__dirname, 'proposals', file));
  const id = data.TEMPLATE;
  const out = path.join(__dirname, slug);
  fs.emptyDirSync(out);
  fs.copySync(path.join(TEMPLATES, id, 'static'), out);
  const src = fs.readFileSync(path.join(LB, 'pages', `${id}.html`), 'utf8');
  const html = render(src, id, data).replace('<!--@footer-->', footer + '<!--@footer-->');
  let page = finish(html, slug, proposalLabel(data.NAME));
  // Optional real hero photo (only with the business's OK), from ../kingbarber-local/photos/
  if (data.HERO_PHOTO) {
    const srcPhoto = path.join(__dirname, '..', 'kingbarber-local', 'photos', data.HERO_PHOTO);
    fs.ensureDirSync(path.join(out, 'photos'));
    resizePhoto(srcPhoto, path.join(out, 'photos', data.HERO_PHOTO));
    page = page.replace('</style>\n</head>', `  .hero { background: linear-gradient(180deg, rgba(11,10,9,.78), rgba(11,10,9,.9) 60%, #0b0a09), url(photos/${data.HERO_PHOTO}) center / cover; }\n</style>\n</head>`);
  }
  // Optional photo section (only with the business's OK)
  if (data.GALLERY) {
    fs.ensureDirSync(path.join(out, 'photos'));
    const figs = data.GALLERY.map(g => {
      resizePhoto(path.join(__dirname, '..', 'kingbarber-local', 'photos', g.file), path.join(out, 'photos', g.file));
      return `        <figure><img src="photos/${g.file}" alt="${g.alt}" loading="lazy"><figcaption><span lang="es">${g.es}</span><span lang="en">${g.en}</span><span lang="ar">${g.ar}</span></figcaption></figure>`;
    }).join('\n');
    page = page.replace('</style>\n</head>', `  .shop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .shop-grid figure { margin: 0; position: relative; border-radius: 18px; overflow: hidden; border: 1px solid var(--line); aspect-ratio: 3 / 4; }
  .shop-grid img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ease; }
  .shop-grid figure:hover img { transform: scale(1.04); }
  .shop-grid figcaption { position: absolute; left: 12px; bottom: 12px; background: rgba(11,10,9,.75); padding: 5px 10px; border-radius: 99px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--gold); }
  html[dir="rtl"] .shop-grid figcaption { left: auto; right: 12px; letter-spacing: 0; }
  .shop-grid.three { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 900px) {
    .shop-grid { gap: 10px; }
    .shop-grid.three { grid-template-columns: 1fr 1fr; }
    .shop-grid.three figure { aspect-ratio: 4 / 3; }
    .shop-grid.three figure:first-child { grid-row: span 2; aspect-ratio: auto; }
  }
</style>\n</head>`);
    page = page.replace('  <section id="tracklist">', `  <section id="el-local" style="padding-bottom:0">
    <div class="wrap">
      <div class="sec-head reveal"><div><span class="side"><span lang="es">El local</span><span lang="en">The shop</span><span lang="ar">المحل</span></span><h2 class="display"><span lang="es">Trono de oro</span><span lang="en">Golden thrones</span><span lang="ar">عروش ذهبية</span></h2></div></div>
      <div class="shop-grid${data.GALLERY.length === 3 ? ' three' : ''} reveal">
${figs}
      </div>
    </div>
  </section>

  <section id="tracklist">`);
  }
  fs.writeFileSync(path.join(out, 'index.html'), page);
  console.log(`✓ ${slug} (proposal from #${id})`);
}

// Redirect pages for old links
for (const [from, to] of Object.entries(REDIRECTS)) {
  const out = path.join(__dirname, from);
  fs.emptyDirSync(out);
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="icon" href="data:,"><title>Redirecting…</title><meta http-equiv="refresh" content="0; url=../${to}/"><link rel="canonical" href="../${to}/"><a href="../${to}/">../${to}/</a>\n`);
  console.log(`↪ ${from} -> ${to}`);
}
