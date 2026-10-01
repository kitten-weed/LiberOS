// tauri-stage.cjs — stages a clean Tauri frontend into ./dist (zero-dep).
// The repo root holds .git, node_modules, src-tauri, .audit — none of that
// ships. Only the app does. Run: node tauri-stage.cjs
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");

// Ship list: pages, code, content. Everything else stays home.
const KEEP_TOP = new Set([
  "index.html", "about.html", "arcana.html", "desktop.html", "divination.html",
  "dreams.html", "games.html", "journal.html", "memory.html", "poppet-home.html",
  "poppet-lab.html", "settings.html", "sigil.html", "vanir.html", "404.html",
]);
const KEEP_DIRS = ["api", "assets", "data", "fonts", "poppet-home", "poppet-lab", "src", "styles", "vendor"];

function clean(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

clean(DIST);
for (const f of KEEP_TOP) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(DIST, f));
}
for (const d of KEEP_DIRS) {
  const src = path.join(ROOT, d);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(DIST, d), { recursive: true });
}
// media already removed from the tree; belt-and-braces if any returns:
for (const dead of ["assets/music"]) {
  const p = path.join(DIST, dead);
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
console.log("staged", DIST);
