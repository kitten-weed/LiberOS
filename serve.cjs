// Zero-dependency static server for freebuff-static-lab.
// Usage: npm start [-- --port 8080]  — serves repo root, SPA-safe, no-cache for api/.
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || process.argv[3] || 8080);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".eot": "application/vnd.ms-fontobject",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};

// Offline-first hardening: no third-party egress. Dev-server CSP is
// intentionally permissive on script (inline scripts + Pixi's eval-based
// effects predate CSP) while still blocking network egress and framing
// off-origin. The Tauri webview gets the strict variant (no inline, no eval,
// frame-ancestors 'self') once inline scripts carry hashes — see PROJECT-BRIEF.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self' data:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join("; ");

function send(res, code, body, type) {
  res.writeHead(code, { "content-type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split("?")[0]);
    } catch {
      return send(res, 400, "bad request");
    }
    if (urlPath.includes("\0")) return send(res, 400, "bad request");
    let file = path.resolve(root, urlPath === "/" ? "index.html" : "." + urlPath);
    if (file !== root && !file.startsWith(root + path.sep)) return send(res, 403, "forbidden");
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file)) file = path.join(root, "404.html");
    const ext = path.extname(file).toLowerCase();
    const noCache = file.includes(`${path.sep}api${path.sep}`);
    try {
      const body = fs.readFileSync(file);
      res.writeHead(fs.existsSync(file) && file.endsWith("404.html") && !req.url.includes("404") ? 404 : 200, {
        "content-type": MIME[ext] || "application/octet-stream",
        "content-security-policy": CSP,
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        ...(noCache ? { "cache-control": "no-store" } : {}),
      });
      res.end(body);
    } catch {
      send(res, 500, "server error");
    }
  })
  .listen(port, () => console.log(`freebuff-static-lab on http://localhost:${port}`));
