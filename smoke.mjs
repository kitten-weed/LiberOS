// Smoke test: boot serve.cjs on an ephemeral port, assert index + probe.
import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = 8124;
const server = spawn("node", [join(HERE, "serve.cjs")], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
});

const fail = (msg) => {
  console.error("SMOKE FAIL:", msg);
  server.kill();
  process.exit(1);
};
const ok = (msg) => console.log("SMOKE OK:", msg);

await new Promise((r) => setTimeout(r, 800));
try {
  const index = await fetch(`http://localhost:${PORT}/`);
  if (index.status !== 200) fail(`index -> ${index.status}`);
  const html = await index.text();
  if (!html.includes("Liber Vacui")) fail("index missing Liber Vacui marker");
  ok("index 200 + marker");

  const api = await fetch(`http://localhost:${PORT}/api/health.json`);
  if (api.status !== 200) fail(`api -> ${api.status}`);
  const data = await api.json();
  if (data.status !== "ok") fail("api.status != ok");
  ok("api/health.json ok");

  const missing = await fetch(`http://localhost:${PORT}/nope-${Date.now()}`);
  if (missing.status !== 404) fail(`404 probe -> ${missing.status}`);
  ok("404 fallback");
} catch (e) {
  fail(e.message);
}
server.kill();
console.log("All smoke checks passed.");
