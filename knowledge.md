# knowledge.md — LiberOS ShipBuild

Project context for Freebuff/Codebuff. Read every run.

## What this is
Liber Vacui ShipBuild: static multi-page game (index/about/arcana/desktop/divination/dreams/games/journal/loading/memory/poppet-*/settings/sigil/vanir + assets/data/fonts/src/styles/vendor). No framework, no build step, no dependencies.

## Run / verify (always after edits)
- `npm start` → http://localhost:8080
- `npm test` → runs the zero-dependency smoke checks (boots `serve.cjs` on :8124; asserts index 200 + "Liber Vacui" marker, `api/health.json` `{status:"ok"}`, and 404 fallback) and the deterministic native regression suites in `tests/refinement/`.
- Refinement tests cover source-level and simulated behavior invariants; they do not replace rendered, pointer/keyboard acceptance checks in a browser.

## Deploy
Push to `main` → `.github/workflows/pages.yml` stamps `api/health.json.sha`, uploads `./`, deploys. Pages source: GitHub Actions. PRs get `preview-<sha>` artifact from `ci.yml`.

## Conventions
- Ship content is the game: edit care, keep atmospheric voice, no placeholder prose.
- Toolchain files (dotfiles, `api/`, `404.html`, `serve.cjs`, `smoke.mjs`) stay zero-dep.
- Secrets never in tree. `api/` stays PII-free (Pages artifact is public, repo is private).
- Trust: repo `.agents/` + `mcp.json` need consent — interactive prompt, or `--trust-agents` / `CODEBUFF_TRUST_AGENT_DIRS=1` in CI.
