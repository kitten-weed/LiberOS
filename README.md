# LiberOS — ShipBuild rig

ShipBuild content (Liber Vacui static game) in a clean folder, wired to the student toolchain. Private repo: `kitten-weed/LiberOS`.

## Quick start

```bash
cd ~/Desktop/LiberOS
npm start          # http://localhost:8080
npm test           # smoke: index 200 + Liber Vacui marker, api ok, 404 fallback
```

Freebuff: `freebuff` here reads `knowledge.md` + `AGENTS.md`.

## Toolchain hooks

| Tool | Hook |
|---|---|
| GitHub Pages | `.github/workflows/pages.yml` — push to `main` deploys `./`, stamps `api/health.json` |
| CI smoke | `.github/workflows/ci.yml` on every push/PR + preview artifact |
| BrowserStack | point at the Pages URL for real-device tests (geneva: no localhost without Local tunnel) |
| DeepScan | JS/TS analysis; add repo as project in dashboard; `deepscan.enable` in `.vscode/settings.json` |
| Appwrite | future backend; `appwrite init project` here when ready |
| JetBrains/Polypane | open folder; Polypane at `localhost:8080` for viewports |

## Notes

- Zero build step. `serve.cjs` + `smoke.mjs` are the only Node files; everything else is the shipped game.
- Ship content lives as-is; toolchain files are the dotfiles + `api/` + `404.html` + this README.
