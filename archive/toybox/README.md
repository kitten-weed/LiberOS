# archive/toybox — Pip's room, retired

Pip's toybox (the sink-world sand game: `toybox.html` + `features/`) was
replaced in the TraverOM cartridge dock by **memory**, the sand-tray room
(`memory.html`, `src/features/memory/`). The files here are the untouched
original, kept because Pip's crew may return in a future room.

- `toybox.html` — the page. Its asset paths were re-rooted (`../../…`)
  so the archived copy still loads as-is from this folder.
- `features/` — `toybox.js`, `crew.js`, `powder.js`, `toybox.css`, `house.css`.

Nothing in the live app references this folder. To restore the room, move
`toybox.html` back to the project root and `features/` back to
`src/features/toybox/`, then re-add its cartridge to the dock list in
`src/crt-bay.js`.
