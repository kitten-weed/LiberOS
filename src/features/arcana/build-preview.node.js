// build-preview.node.js — ONE-TIME tool (not shipped as product).
//
//   node src/features/arcana/build-preview.node.js
//
// The Freebuff Preview tab serves exactly one HTML file, so this inlines
// the modular app into ShipBuild/arcana.preview.html — css, data, scripts —
// and strips the boot gate (a preview artifact must not bounce to a page
// the single-file server cannot serve). arcana.html remains the real,
// modular product; regenerate this bundle after edits:
//   node src/features/arcana/build-preview.node.js
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', '..');
const src = path.join(root, 'arcana.html');
let html = fs.readFileSync(src, 'utf8');

// inline stylesheets; css url(...) assets (the three arcana fonts) go
// along as data URIs — the preview serves exactly one file
function inlineCssUrls(css, cssDir) {
  return css.replace(/url\(([^)]+)\)/g, (m, u) => {
    const rel = u.replace(/^['"]|['"]$/g, '');
    if (/^data:|^https?:|^\//.test(rel)) return m;
    const p = path.join(cssDir, rel);
    try {
      const b = fs.readFileSync(p);
      return 'url(data:font/ttf;base64,' + b.toString('base64') + ')';
    } catch (e) { return m; }
  });
}
html = html.replace(/<link rel="stylesheet" href="([^"]+)"\/>/g, (m, href) => {
  const p = path.join(root, href);
  const css = inlineCssUrls(fs.readFileSync(p, 'utf8'), path.dirname(p));
  return '<style>\n' + css + '\n</style>';
});

// inline scripts, except the boot gate
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, srcAttr) => {
  if (srcAttr.includes('boot-gate')) return '<!-- preview bundle: boot gate stripped -->';
  const js = fs.readFileSync(path.join(root, srcAttr), 'utf8');
  return '<script>\n' + js + '\n</script>';
});

html = '<!-- GENERATED PREVIEW BUNDLE — the product is the modular arcana.html.\n     Regenerate: node src/features/arcana/build-preview.node.js -->\n' + html;

const out = path.join(root, 'arcana.preview.html');
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + 'kb');
