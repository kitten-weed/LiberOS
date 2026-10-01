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
};

function send(res, code, body, type) {
  res.writeHead(code, { "content-type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let file = path.join(root, urlPath === "/" ? "index.html" : urlPath.slice(1));
    if (!file.startsWith(root)) return send(res, 403, "forbidden");
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file)) file = path.join(root, "404.html");
    const ext = path.extname(file).toLowerCase();
    const noCache = file.includes(`${path.sep}api${path.sep}`);
    try {
      const body = fs.readFileSync(file);
      res.writeHead(fs.existsSync(file) && file.endsWith("404.html") && !req.url.includes("404") ? 404 : 200, {
        "content-type": MIME[ext] || "application/octet-stream",
        ...(noCache ? { "cache-control": "no-store" } : {}),
      });
      res.end(body);
    } catch {
      send(res, 500, "server error");
    }
  })
  .listen(port, () => console.log(`freebuff-static-lab on http://localhost:${port}`));
