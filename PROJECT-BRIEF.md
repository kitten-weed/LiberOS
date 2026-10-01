# LiberOS — Project Brief (Tauri Mac + Windows)
Source: owner answers 2026-10-01. Rebuild covenant from ShipBuild; ShipBuild data is ground truth.
Previous covenant NOT binding. New answer files are canonical going forward.

## Feel
- Booting into LiberOS. Always-offline app living on your computer as a haunted CRT, traveller-defined rooms.

## Distribution
- GitHub Pages + Polypane = testing and live preview only.
- Tauri Mac + Windows = ships everything. Current ShipBuild (`~/Desktop/LiberOS` @ 839784c, v0.1.0) is the baseline.
- Offline-first. Nothing touches network. No fetch/XHR/beacon in first-party code (keep it that way).

## Signing / releases (owner: no certs)
- No Apple Developer ID, no Windows EV/OV today.
- Ship standard releases: mac `.dmg` (+ `.app.tar.gz` if updater needs it), win x64 `.msi` + NSIS `.exe`. ARM64 best-effort.
- Unsigned for now; HOLD public binaries until signed (owner 2026-10-01). Build locally only. Add signing later without code change.
- Auto-update: OFF until certs + feed exist (Tauri updater needs signed artifacts).

## Identity (owner-approved, adjust freely)
- App identifier: `LiberOS` → canonical: `com.liberos.libervacui`
- Bundle/product name: `LiberVacui`
- Single instance: on. Deep links + file associations: DEFERRED for v1 (owner 2026-10-01: sounds cool, defer).

## Frontend / backend split
- Vite/bundler ALLOWED where best-practice, zero feature regression vs ShipBuild.
- Rust ONLY where non-destructive (dialog, fs scope, window chrome, sqlite/store). No rewrite of game logic in Rust.
- Webview loading: best-practice fully-offline (bundled assets, no remote, `tauri://localhost`, no `file://` quirks).
- Replace sidecars per best practice: `serve.cjs` → `tauri dev`; keep `smoke.mjs` probes until Tauri smoke replaces them.
- Replaces in Tauri: web `localStorage liber_vacui_v1` → app-data FILES now (one file per save/photo, owner 2026-10-01: files-then-DB). SQLite later only if needed. Photos out of localStorage (quota bug) → app-data PNG files.

## FS / export / security defaults (best-practice, offline)
- FS scope: app-data only. No user dirs except via explicit Save dialog.
- Export: PNG only, ALWAYS via Save dialog (owner 2026-10-01). Never silent auto-save.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: asset:; media-src 'self'; connect-src 'none'` (no network).
- Egress: none. Pixi CDN transcoder URLs stay dormant; CSP blocks if ever hit.
- Consent gate: fail-closed (fix `boot-gate.js:10` catch → `'0'`).
- Secrets: none in tree, none in binary. Future backend: none planned; if ever, via OS keychain, never bundled.

## Open schema questions (verified against running app next)
- `thimble` vs `tree`: owner unsure. Rule: read running app + `crt-bay.js:92-93` vs `state.js:16-62` vs `garden/tree.js:62,70-71` and propose canonical shape; `thimble` currently undocumented but persisted by accident.
- Cutscene truth: verify against running app now. `src/cutscene.js` (2297 lines) vs `cutscene-v2.data.js` (114 lines, never loaded) — app behavior wins; mark dead file for deletion.
- One engine per page: KEEP BOTH Pixi+Three for v1 (owner 2026-10-01). Optimize later, zero regression.
- CI: add Tauri Mac+Windows builds on tag, local-only until signed (owner approved). Keep Pages deploy as-is.
- Protect `main` (require PR + smoke, block force-push) + merge 5 green dependabots (owner approved).
- LICENSE: real MIT `Copyright (c) 2026 kitten-weed` (owner approved).
- ShipBuild fixes approved but CAREFUL (owner 2026-10-01): XSS (`memory.js`, `vanir/hud.js`) + font MIME + CSP. Smallest diffs, smoke + screenshot per fix.
- Audio: REMOVE `assets/music/` (8.5MB) from Tauri bundle (owner 2026-10-01: yes remove all); keep `src/sound.js` synth.
- Reduced motion: REMOVED 2026-10-01 (39 `reduce` blocks deleted, 6 `no-preference`
  blocks unwrapped to always-animate, 2 stale comments reworded across 20 stylesheets).
  Animate by default. JS `matchMedia` runtime checks intentionally left (default path
  already animates; only fires when OS requests reduction).
- Dev-server CSP (`serve.cjs`) is permissive on script (`'unsafe-inline' 'unsafe-eval'`,
  `frame-ancestors 'self'`) so inline scripts + Pixi effects + poppet iframes keep working.
  The strict webview CSP (no inline/eval) lands with Tauri once inline scripts carry hashes.
- Cutscene: delete `src/cutscene-v2.data.js` after app-behavior verification (owner approved removal).
- Fonts: faces referenced in build CSS are canonical. Convert TTF/OTF (~1MB) → subset woff2; keep `jacquard24/vt323-latin.woff2` pattern.
- Data twins (`*.json` + `*.data.js`): source of truth = whatever the presented app actually loads (`window.LIBER_DATA` script tags in `desktop.html:172-186` etc). Deprecate the other twin after diff.

## UX contract (new)
- Focus trap: fine (allowed).
- Contrast: standard best practice (WCAG AA 4.5:1 text; keep CREAM/VOID + GOLD/VOID AAA pairs).
- Reduced motion: DO NOT INCLUDE. Remove `prefers-reduced-motion` blocks going forward (owner decision 2026-10-01). Animate by default.
- Keyboard controls: not required. No full keyboard path, no global shortcuts for v1.
- Window chrome: immersive, locked, non-resizable + fullscreen toggle (owner 2026-10-01). Must fit 16:9 down to 720p (1280×720 min). At 720p: crop with letterbox bars (owner choice). HiDPI aware, native close/minimize only.

## Versioning / history
- Preserve single-commit style from here. Small patch bumps from `0.1.0` → `0.1.1`, `0.1.2`… (0.0.1 increments).
- `main` unprotected today → protect before Tauri work (require PR + smoke).

## What Pages is for
- Preview + live link only. Tauri is the ship vehicle. Do not add Tauri-only secrets or app-data paths to Pages bundle.
