// build-preview.node.js — ONE-TIME tool (not shipped as product).
//
//   node src/features/vanir/build-preview.node.js
//
// The Freebuff Preview tab serves exactly one HTML file, so this inlines
// the drop-in page into ShipBuild/vanir.preview.html — stylesheets, the
// house's classic scripts, and the ES-module app (bundled with the bun
// CLI, since the scene code is modular). The boot gate is stripped: a
// preview artifact must not bounce to a page the single-file server
// cannot serve. vanir.html remains the real, modular product;
// regenerate this bundle after edits.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..', '..');
const src = path.join(root, 'vanir.html');
const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vanir-build-'));

// 1) bundle the ES-module app with bun (classic scripts are inlined as-is)
let moduleJs = '';
try {
  execFileSync('bun', ['build', path.join(root, 'src/features/vanir/vanir-boot.js'),
    '--outdir', tmp, '--target', 'browser', '--minify'], { stdio: 'inherit' });
  moduleJs = fs.readFileSync(path.join(tmp, 'vanir-boot.js'), 'utf8');
} catch (e) {
  console.error('bun bundle failed:', e.message);
  process.exit(1);
} finally {
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}

// 2) inline stylesheets (plus any css url(...) assets as data URIs)
function inlineCssUrls(css, cssDir) {
  return css.replace(/url\(([^)]+)\)/g, (m, u) => {
    const rel = u.replace(/^['"]|['"]$/g, '');
    if (/^data:|^https?:|^\//.test(rel)) return m;
    const p = path.join(cssDir, rel);
    try {
      const b = fs.readFileSync(p);
      const ext = path.extname(p).slice(1) || 'png';
      const mime = ext === 'ttf' ? 'font/ttf' : ext === 'woff2' ? 'font/woff2' : 'image/' + ext;
      return 'url(data:' + mime + ';base64,' + b.toString('base64') + ')';
    } catch (e) { return m; }
  });
}

let html = fs.readFileSync(src, 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)"\/>/g, (m, href) => {
  const p = path.join(root, href.split('?')[0]);
  const css = inlineCssUrls(fs.readFileSync(p, 'utf8'), path.dirname(p));
  return '<style>\n' + css + '\n</style>';
});

// 3) inline the house's classic scripts, except the boot gate
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, srcAttr) => {
  if (srcAttr.includes('boot-gate')) return '<!-- preview bundle: boot gate stripped -->';
  const js = fs.readFileSync(path.join(root, srcAttr.split('?')[0]), 'utf8');
  return '<script>\n' + js + '\n</script>';
});

// 4) inline the bundled module app
html = html.replace(
  /<script type="module" src="src\/features\/vanir\/vanir-boot\.js"><\/script>/,
  () => '<script type="module">\n' + moduleJs + '\n</script>'
);

html = '<!-- GENERATED PREVIEW BUNDLE — the product is the modular vanir.html.\n     Regenerate: node src/features/vanir/build-preview.node.js -->\n' + html;

const out = path.join(root, 'vanir.preview.html');
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + 'kb');
