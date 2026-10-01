# AGENTS.md — LiberOS ShipBuild

Read `knowledge.md` first.

- Serve: `npm start` (port 8080). Test: `npm test` (must pass before push).
- No build step, no new dependencies without asking. `serve.cjs` stays zero-dep.
- `.agents/mcp.json` holds MCP servers (placeholder). Stdio servers run on first prompt; `$VAR` fills from CLI env, not headers.
- Pages deploys via Actions (`pages.yml`); never hand-commit to a `gh-pages` branch.
- BrowserStack tests target the Pages URL, never localhost (no Local tunnel configured).
- DeepScan covers `*.js/*.mjs/*.ts`; keep ship JS lint-clean.
