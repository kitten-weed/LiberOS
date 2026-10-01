/* Poppet Lab — main controller. The desk is the interface: two big button
   columns (ACTIONS beside LAYERS), the settings gear, the burn plate, the view
   locks and the plaque — all objects on the table, hit through one raycaster. */
import * as THREE from '../vendor/three.module.js';
import { V, buildScene } from './lab.js?v=lab51';
import { IDX, TOTAL, dims, makeRng } from './rig.js?v=lab51';
import { createDoll, weaveFill } from './doll.js?v=lab51';
import { buildDesk } from './desk.js?v=lab51';
import { daub, spacedStamps, floodFillAt, floodFillRegionAt } from './painter.js?v=lab51';
import { saveKeepsake, keepsakeCount, atlasCoverage, KEYP_KEY } from './keepsake.js?v=lab51';
import { buildPoppetOverlay } from './poppet.js?v=lab51';
import { makeWorksurface } from './surface.js?v=lab51';
import { beginKeeping } from './keepdrop.js?v=lab51';

const canvas = document.getElementById('view');
const L = buildScene(canvas);
const scene = L.scene, camera = L.camera, renderer = L.renderer;

/* ── shared doll params ── */
const P = {
  head: 0.42, chest: 1, waist: 0.55, hips: 1,
  arml: 1, armt: 1, legl: 1, legt: 1, flop: 0.45,
  pose: 'stand', showRig: false,
  worn: { robe: false, dress: false, top: false, hoodie: false, pants: false, bralet: false },   // starts bare
  thoughts: { fears: [], wishes: [], likes: [], dislikes: [], thoughts: [] }   // named vars for the house
};
const brushes = {
  body: { ink: '#2b2016', size: 10 },
  cloth: { ink: '#2b2016', size: 6 }
};
let inkMode = 'brush';       // brush | bucket
let dollPaint = false;       // DOLL DRAW mode: paint straight onto the poppet
let burnTally = 0;           // ceremonies performed on this visit
let activeLayer = 'body';    // body | face | clothes | thoughts

/* ── layer colors — the colored buttons tint the room while active ── */
const LAYER_TINT = { body: 0x8a5a3c, face: 0xd9a44a, clothes: 0x6f88c8, thoughts: 0x7fb069 };
function applyRoomTint(hex) {
  if (!L.lamp || !L.lamp.color) return;
  L.lamp.color.setHex(0xffd9a0);
  L.lamp.color.lerp(new THREE.Color(hex || 0xffd9a0), 0.45);
}
/* the lazy brush is retired — strokes follow the cursor directly, interpolated
   between pointer events so fast moves stay continuous */
let strokeHot = null;   // atlas region under the active stroke, for the ledger outline
let lastThoughtSheet = null;   // the thought sheet the last stroke touched

let rng = makeRng((Date.now() & 0xffffff) >>> 0);
let gen = 0;

/* ── the doll: its atlas canvas is data — the desk sheet displays it ── */
const atlasCv = document.createElement('canvas');
atlasCv.width = atlasCv.height = 1024;
const doll = createDoll(scene, atlasCv, null, {
  rng: null,
  brush: function () { return brushes.body; }
});
doll.setParams(P);

/* ── the desk ── */
const desk = buildDesk(scene, {});

/* ── the thought sheets: five canvases, one per kind — FEARS · WISHES · LIKES ·
   DISLIKES · THOUGHTS — each with its own palette and its own glyph color ── */
const THOUGHT_KINDS = ['fears', 'wishes', 'likes', 'dislikes', 'thoughts'];
const THOUGHT_GLYPH_INK = { fears: '#b03a2a', wishes: '#c9962e', likes: '#7fb069', dislikes: '#8a6a9e', thoughts: '#79b8c9' };
const thoughtCvs = {}, thoughtCtxs = {}, thoughtTexs = {};
THOUGHT_KINDS.forEach(function (kind) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  weaveFill(ctx, cv.width, cv.height, '#efe6cd');
  const tex = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  thoughtCvs[kind] = cv; thoughtCtxs[kind] = ctx; thoughtTexs[kind] = tex;
});
/* the right side of the table is clear — cloth + thoughts live on the CANVAS overlay */

/* wash any sheet back to its blank state (the overlay's WASH + weave share this) */
function washSheet(key, hex) {
  if (key === 'body') {
    weaveFill(doll.bodyCtx, atlasCv.width, atlasCv.height, '#ead9b4');
    doll.bodyTex.needsUpdate = true;
  } else if (key.indexOf('face:') === 0) {
    const fm = doll.faceMaps[key.slice(5)];
    fm.ctx.clearRect(0, 0, fm.cv.width, fm.cv.height);
    fm.tex.needsUpdate = true;
  } else if (key === 'clothes') {
    doll.hullCtx.clearRect(0, 0, doll.hullCanvas.width, doll.hullCanvas.height);
    doll.hullTex.needsUpdate = true;
  } else if (key.indexOf('thoughts:') === 0) {
    const k = key.slice(9);
    weaveFill(thoughtCtxs[k], 256, 128, '#efe6cd');
    thoughtTexs[k].needsUpdate = true;
    rebuildThoughtGlyphs(k);
  } else if (key === 'cloth') {
    weaveFill(doll.clothCtx, doll.clothCtx.canvas.width, doll.clothCtx.canvas.height, hex || '#e6d7b2');
    doll.clothTex.needsUpdate = true;
  }
}

/* ── the mapping: every piece in order, per layer — THE walk the CANVAS takes ──
   BODY: the 16 real skin atlas regions. FACE: the shell's three sections.
   CLOTHES: the eight limb hulls. THOUGHTS: the five kinds — each its own
   sheet, its own palette, its own glyphs with its own var name
   (P.thoughts.fears …) for use in the house. */
const MAPPING = {
  body: ['head', 'chest', 'pelvis', 'waistBall', 'armLU', 'armLL', 'armRU', 'armRL', 'legLU', 'legLL', 'legRU', 'legRL', 'haL', 'haR', 'ftL', 'ftR'],
  face: ['eyes', 'face', 'hair'],
  clothes: ['armLU', 'armRU', 'armLL', 'armRL', 'legLU', 'legRU', 'legLL', 'legRL'],
  thoughts: ['fears', 'wishes', 'likes', 'dislikes', 'thoughts']
};
const PART_PROMPTS = {
  head: 'Draw the face — eyes, mouth, whatever it should be',
  chest: 'Draw the chest — the body of the poppet',
  pelvis: 'Draw the pelvis — where the legs begin',
  waistBall: 'Draw the waist — the joint between',
  armLU: 'Draw the upper left arm', armLL: 'Draw the lower left arm',
  armRU: 'Draw the upper right arm', armRL: 'Draw the lower right arm',
  legLU: 'Draw the upper left leg', legLL: 'Draw the lower left leg',
  legRU: 'Draw the upper right leg', legRL: 'Draw the lower right leg',
  haL: 'Draw the left hand', haR: 'Draw the right hand',
  ftL: 'Draw the left foot', ftR: 'Draw the right foot',
  eyes: 'Paint the eyes — the band around the shell\u2019s middle',
  face: 'Paint the face — the bowl below the eyes',
  hair: 'Paint the hair — the crown above',
  fears: 'Scribble its fears — red glyphs will orbit the poppet',
  wishes: 'Scribble its wishes — gold glyphs will orbit the poppet',
  likes: 'Scribble its likes — green glyphs will orbit the poppet',
  dislikes: 'Scribble its dislikes — violet glyphs will orbit the poppet',
  thoughts: 'Scribble its thoughts — blue glyphs will orbit the poppet'
};
function partPrompt(layer, part) {
  if (layer === 'clothes') {
    const side = part.slice(-1) === 'L' ? 'left' : 'right';
    const seg = part.indexOf('LL') >= 0 || part.indexOf('RL') >= 0 ? 'lower' : 'upper';
    return 'Paint the ' + seg + ' ' + side + ' ' + (part[0] === 'a' ? 'arm' : 'leg') + '\u2019s cloth hull';
  }
  return PART_PROMPTS[part] || ('Paint the ' + part);
}
let lesson = { layer: 'body', idx: 0 };
function lessonKey() { return MAPPING[lesson.layer][lesson.idx]; }
/* the atlas region a lesson part maps to — used for the doll-side outline */
function lessonRegion() {
  if (lesson.layer === 'body') return lessonKey();
  if (lesson.layer === 'face') return 'head';
  if (lesson.layer === 'clothes') return lessonKey();
  return null;
}
function setLesson(layer, idx) {
  lesson.layer = layer;
  lesson.idx = Math.max(0, Math.min(MAPPING[layer].length - 1, idx || 0));
  /* in the thoughts layer every body part carries the active thought sheet */
  const tp = layer === 'thoughts';
  doll.body.children.forEach(function (m) { m.userData.thoughtPaint = tp; });
  doll.setFaceShell(layer === 'face');
  doll.setHulls(layer === 'clothes' || doll.hullPainted());   // ghost preview while cutting cloth; stays once painted
  if (layer === 'thoughts') doll.setGlyphLayer(lessonKey());
  else doll.setGlyphLayer(null);
  updateLessonCard();
  syncLedger();
}
function nextLesson() {
  if (lesson.idx < MAPPING[lesson.layer].length - 1) setLesson(lesson.layer, lesson.idx + 1);
  else if (lesson.layer === 'body') setLesson('face', 0);
  else if (lesson.layer === 'face') setLesson('clothes', 0);
  else if (lesson.layer === 'clothes') setLesson('thoughts', 0);
}
function prevLesson() {
  if (lesson.idx > 0) setLesson(lesson.layer, lesson.idx - 1);
  else if (lesson.layer === 'face') setLesson('body', MAPPING.body.length - 1);
  else if (lesson.layer === 'clothes') setLesson('face', MAPPING.face.length - 1);
  else if (lesson.layer === 'thoughts') setLesson('clothes', MAPPING.clothes.length - 1);
}

/* the prompt card under the stage — the walkthrough's current piece */
function updateLessonCard() {
  const bar = document.getElementById('lesson-card');
  if (!bar) return;
  const nm = lessonKey();
  const layerNames = { body: 'BODY', face: 'FACE & HAIR', clothes: 'CLOTHES', thoughts: 'THOUGHTS' };
  const prog = layerNames[lesson.layer] + ' · PIECE ' + (lesson.idx + 1) + ' OF ' + MAPPING[lesson.layer].length + ' — ' + nm.toUpperCase();
  bar.innerHTML =
    '<button type="button" class="lc-nav" id="lc-prev"' + (lesson.layer === 'body' && lesson.idx === 0 ? ' disabled' : '') + '>◀</button>' +
    '<div class="lc-main"><div class="lc-prog"></div><div class="lc-prompt"></div></div>' +
    '<button type="button" class="lc-nav" id="lc-next"' + (lesson.layer === 'thoughts' && lesson.idx === MAPPING[lesson.layer].length - 1 ? ' disabled' : '') + '>▶</button>';
  bar.querySelector('.lc-prog').textContent = prog;
  bar.querySelector('.lc-prompt').textContent = partPrompt(lesson.layer, nm);
  const pv = bar.querySelector('#lc-prev'), nx = bar.querySelector('#lc-next');
  if (pv) pv.addEventListener('click', prevLesson);
  if (nx) nx.addEventListener('click', nextLesson);
}

/* ── the spec plaque: an engraved brass ledger, three lines ── */
function engravePlaque(a, b, c) {
  const cv = document.createElement('canvas');
  cv.width = 900; cv.height = 112;
  const g = cv.getContext('2d');
  g.fillStyle = '#a8862e';
  g.fillRect(0, 0, 900, 112);
  g.strokeStyle = '#6a5218';
  g.lineWidth = 4;
  g.strokeRect(4, 4, 892, 104);
  g.fillStyle = '#241708';
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.font = '600 25px Germania, Georgia, serif';
  g.fillText(a, 16, 26);
  g.font = '19px Germania, Georgia, serif';
  g.fillText(b, 16, 60);
  g.fillText(c, 16, 91);
  const t = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (desk.plaque.material.map) desk.plaque.material.map.dispose();
  desk.plaque.material.map = t;
  desk.plaque.material.needsUpdate = true;
}
function updatePlaque(state) {
  const D = dims(P);
  const worn = Object.keys(P.worn).filter(function (k) { return P.worn[k]; });
  const a = 'SPECIMEN Nº ' + (gen + 1) + ' — height ' + (TOTAL / D.headD).toFixed(2) + ' heads · pose ' + P.pose + (state ? ' — ' + state : '');
  const b = 'head ' + Math.round(P.head * 100) + '% · chest ' + Math.round(P.chest * 100) + '% · waist ' + Math.round(P.waist * 100) + '% · hips ' + Math.round(P.hips * 100) + '% · arms ' + Math.round(P.arml * 100) + '/' + Math.round(P.armt * 100) + '% · legs ' + Math.round(P.legl * 100) + '/' + Math.round(P.legt * 100) + '% · flop ' + Math.round(P.flop * 100) + '%';
  const c = 'brush Ø ' + brushes.body.size + 'px · ink ' + brushes.body.ink + ' · wearing ' + (worn.length ? worn.join(', ') : 'nothing — bare clay');
  const key = a + '|' + b + '|' + c;
  if (key === plaqueKey) return;   // don't re-engrave an unchanged ledger
  plaqueKey = key;
  engravePlaque(a, b, c);
}
let plaqueKey = '';

/* ── thought glyphs: how much ink is on the sheet decides how many orbit ── */
function rebuildThoughtGlyphs(kind) {
  const G = doll.glyphGroups()[kind];
  if (!G) return;
  const ctx = thoughtCtxs[kind];
  const img = ctx.getImageData(0, 0, thoughtCvs[kind].width, thoughtCvs[kind].height).data;
  let inked = 0;
  for (let o = 0; o < img.length; o += 64) {
    const a = img[o + 3];
    // ink = not paper: skip the cream weave, count everything else
    const isCream = Math.abs(img[o] - 239) < 30 && Math.abs(img[o + 1] - 230) < 30 && Math.abs(img[o + 2] - 205) < 30;
    if (a > 40 && !isCream) inked++;
  }
  const show = Math.min(7, inked > 0 ? Math.max(1, Math.round(inked / 60)) : 0);
  G.meshes.forEach(function (m, i) { m.visible = i < show; });
}

/* every doll-side stroke lands through here — the slate IS the worksurface */
/* which walkthrough piece did this stroke touch? — part names, never sheet names */
function hotFor(sheet, x, y) {
  const lk = lessonKey();
  const belongs = (activeLayer === 'body' && sheet === 'body') ||
    (activeLayer === 'face' && sheet === 'face:' + lk) ||
    (activeLayer === 'clothes' && sheet === 'clothes') ||
    (activeLayer === 'thoughts' && sheet === 'thoughts:' + lk);
  let hot = belongs ? lk : sheet;
  if (activeLayer === 'body' && sheet === 'body' && hot === 'body') {
    hot = uvToRegion(x / atlasCv.width, 1 - y / atlasCv.height) || hot;   // WHICH panel was inked
  }
  return hot;
}
function paintProxy(sheet, x, y) {
  const sl = getSheet(sheet);
  if (!sl) return;
  if (inkMode === 'bucket') {
    undoPush(sheet);
    sl.fillAt(x, y, brushes.body.ink, 40);
    strokeHot = hotFor(sheet, x, y);   // bucket clicks advance the walkthrough too
  } else {
    armUndo(sheet);   // one snapshot per stroke
    const r = brushes.body.size / 2;
    /* continue the stroke from where it last landed — no gaps, no lazy lag.
       Crossing into another panel breaks the line (a dot, not a streak). */
    let prev = (ghost.last && ghost.last.sheet === sheet) ? ghost.last : null;
    if (prev && sl.panelAt) {
      const a = sl.panelAt(prev.x, prev.y), b = sl.panelAt(x, y);
      if (a && b && a !== b) prev = null;
    }
    const pts = prev ? spacedStamps(prev.x, prev.y, x, y, Math.max(2, brushes.body.size / 3)) : [{ x: x, y: y }];
    pts.forEach(function (s) {
      if (eraseMode) sl.eraseDot(s.x, s.y, r);
      else sl.stamp(s.x, s.y, r, brushes.body.ink);
    });
    /* the walkthrough listens for its OWN piece — name the part, not the sheet */
    strokeHot = hotFor(sheet, x, y);
    ghost.last = { x: x, y: y, sheet: sheet };
  }
  if (sheet === 'clothes') doll.markHullPainted();
  if (sheet.indexOf('thoughts:') === 0) lastThoughtSheet = sheet;   // glyphs refresh on release
  syncLedger();
}

/* ── UV mapping: desk sheets → canvas pixels (raycast uv is texture space) ── */
function regionFromUV(mesh, uv) {
  if (desk.easels.cloth && mesh === desk.easels.cloth.pad) {
    const cv = doll.clothCtx.canvas;
    return { sheet: 'cloth', x: uv.x * cv.width, y: (1 - uv.y) * cv.height };
  }
  if (desk.easels.aura3 && mesh === desk.easels.aura3.pad) {
    return { sheet: 'thoughts:fears', x: uv.x * thoughtCvs.fears.width, y: (1 - uv.y) * thoughtCvs.fears.height };
  }
  if (desk.easels.aura4 && mesh === desk.easels.aura4.pad) {
    return { sheet: 'thoughts:thoughts', x: uv.x * thoughtCvs.thoughts.width, y: (1 - uv.y) * thoughtCvs.thoughts.height };
  }
  return null;
}
function bucketAt(p) {
  if (!p) return false;
  if (p.sheet === 'atlas') {
    const reg = uvToRegion(p.x / atlasCv.width, 1 - p.y / atlasCv.height);   // canvas y → uv v
    if (reg) {
      floodFillRegionAt(doll.bodyCtx, p.x, p.y, brushes.body.ink, doll.ATLAS[reg], 40);
      doll.bodyTex.needsUpdate = true;
      strokeHot = hotFor('body', p.x, p.y);   // the panel's own name — advances the walkthrough
      syncLedger();
    }
    return !!reg;
  }
  paintProxy(p.sheet, p.x, p.y);
  return true;
}

/* ── layer switching: the room tints to the layer's color ── */
const brassActive = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8, emissive: 0x332200 });
function applyLayerLook() {   // the visual state a layer owns — safe to re-assert mid-mode
  Object.keys(desk.buttons).forEach(function (k) {
    desk.buttons[k].plate.material = k === activeLayer ? brassActive : desk.baseBrass;
  });
  applyRoomTint(LAYER_TINT[activeLayer]);
}
function setLayer(key) {
  if (dollPaint) setDollPaint(false);   // layers and DOLL DRAW toggle separately
  activeLayer = key;
  applyLayerLook();
  setLesson(key, 0);
  hint();
  syncLedger();
}
function hint() {
  const el = document.getElementById('mode-hint');
  const tool = (inkMode === 'bucket' ? 'the bucket floods' : (eraseMode ? 'the eraser lifts' : 'the brush draws')) + ' · \u2318Z undoes';
  let layerTxt;
  if (activeLayer === 'body') layerTxt = 'BODY — paint the skin: ' + tool + ' right on the doll · CANVAS walks every piece';
  else if (activeLayer === 'face') layerTxt = 'FACE & HAIR — paint the shell hovering outside the head · CANVAS walks its sections';
  else if (activeLayer === 'clothes') layerTxt = 'CLOTHES — the hulls appear when you paint them · CANVAS walks every limb';
  else layerTxt = 'THOUGHTS — ' + lessonKey() + ': ' + tool + ' on the doll · its glyphs orbit the poppet';
  if (dollPaint) layerTxt = 'DOLL DRAW — painting straight onto the poppet (' + activeLayer + ') · DOLL DRAW again to release';
  el.textContent = layerTxt + (viewLock ? ' · view locked — press ' + (viewLock === 'table' ? 'POPPET' : 'TABLE') + ' to release' : '');
}

/* ── the tool ledger: a flat readout of what you're working with ── */
const LAYER_NAMES = { body: 'BODY · the skin', face: 'FACE & HAIR · the shell', clothes: 'CLOTHES · the hulls', thoughts: null };   // thoughts reads live
const SHEET_OF_LAYER = { body: 'the skin atlas', face: 'the face shell', clothes: 'the cloth hulls', thoughts: 'the thought sheets' };
const INK_NAMES = { '#2b2016': 'ink', '#3a66c8': 'woad', '#b03a2a': 'madder', '#c9962e': 'ochre', '#e6d7b2': 'cream' };
let ledgerEls = null;
function buildLedger() {
  const el = document.getElementById('tool-ledger');
  if (!el || ledgerEls) return;
  const keys = ['LAYER', 'PIECE', 'TOOL', 'INK', 'VIEW', 'SPECIMEN'];
  el.innerHTML = '<h3>WORKBENCH</h3>' +
    keys.map(function (k) { return '<div class="row"><b>' + k + '</b><span data-v="' + k + '"></span></div>'; }).join('');
  ledgerEls = { root: el, vals: {} };
  el.querySelectorAll('[data-v]').forEach(function (s) { ledgerEls.vals[s.getAttribute('data-v')] = s; });
}
function uvToRegion(u, v) {
  const keys = Object.keys(doll.ATLAS);
  for (let i = 0; i < keys.length; i++) {
    const r = doll.ATLAS[keys[i]];
    if (u >= r[0] && u <= r[0] + r[2] && v >= r[1] && v <= r[1] + r[3]) return keys[i];
  }
  return null;
}
function syncLedger() {
  buildLedger();
  if (!ledgerEls) return;
  const v = ledgerEls.vals;
  const inkName = INK_NAMES[brushes.body.ink] || brushes.body.ink;
  v.LAYER.textContent = activeLayer === 'thoughts' ? ('THOUGHTS · ' + lessonKey()) : LAYER_NAMES[activeLayer];
  v.PIECE.textContent = (lesson.idx + 1) + ' / ' + MAPPING[lesson.layer].length + ' — ' + lessonKey();
  v.TOOL.textContent = inkMode === 'bucket' ? 'paint bucket' : (eraseMode ? 'eraser' : 'brush \u00d8 ' + brushes.body.size + 'px');
  v.INK.innerHTML = '<i class="swatch" style="background:' + brushes.body.ink + '"></i>' + inkName;
  v.VIEW.textContent = viewLock ? viewLock + ' — locked' : 'free orbit';
  v.SPECIMEN.textContent = 'N\u00ba ' + (gen + 1) + (burn.phase !== 'idle' ? ' — ' + burn.phase : '');
}

/* ── brush size + erase: the slider mini-menu is the way ── */
let eraseMode = false;   // ◌ eraser — lifts ink instead of laying it

/* ── DOLL DRAW: paint straight onto the poppet (toggles with CANVAS) ── */
function setDollPaint(on) {
  dollPaint = !!on;
  const db = desk.panelButtons.doll;
  db.plate.material = dollPaint ? brassActive : desk.baseBrass;
  if (dollPaint) {
    if (desk.panelButtons.canvas) { desk.panelButtons.canvas.plate.material = desk.baseBrass; }   // CANVAS pops back up
    if (popOverlay.isOpen()) popOverlay.close();
    // the walkthrough follows onto the doll: shell, hulls, glyphs come alive
    // (never setLayer here — it pops DOLL DRAW straight back down)
    applyLayerLook();
    setLesson(activeLayer, lesson.idx);
    L.lamp.intensity = Math.max(L.lamp.intensity, 0.35);
  }
  if (ghost.sheet === 'doll' && !dollPaint) ghost.sheet = null;
  hint();
  syncLedger();
}

/* ── keepsake readiness: every layer must carry ink before the button lights ── */
function keepsakeReady() {
  if (sheetHasInk('body') === false) return false;
  const faceDone = ['eyes', 'face', 'hair'].every(function (z) {
    const fm = doll.faceMaps[z];
    const d = fm.ctx.getImageData(0, 0, fm.cv.width, fm.cv.height).data;
    for (let i = 3; i < d.length; i += 64) if (d[i] > 40) return true;
    return false;
  });
  if (!faceDone) return false;
  if (sheetHasInk('clothes') === false) return false;
  if (!THOUGHT_KINDS.every(function (k) { return sheetHasInk('thoughts:' + k); })) return false;
  return true;
}

/* ── keepsake: save the specimen with its full making, then fly it home ── */
function pressKeepsake(force) {
  if (!force && !keepsakeReady()) {
    desk.flashKeepsakeLocked();   // the button itself says: draw on every layer first
    hint();
    return;
  }
  const D = dims(P);
  const n = saveKeepsake(atlasCv, doll.clothCtx.canvas, {
    P: P,
    pose: P.pose,
    worn: P.worn,
    ink: brushes.body.ink,
    brush: brushes.body.size,
    heightHeads: +(TOTAL / D.headD).toFixed(2),
    name: 'Poppet Nº ' + (gen + 1),
    lesson: { layer: lesson.layer, step: lesson.idx + 1, of: MAPPING[lesson.layer].length, part: lessonKey() },
    coverage: atlasCoverage(doll.bodyCtx, doll.ATLAS),
    aura3: thoughtCvs.fears.toDataURL('image/png'),
    aura4: thoughtCvs.thoughts.toDataURL('image/png'),
    thoughts: (function () {
      const out = {};
      THOUGHT_KINDS.forEach(function (kind) { out[kind] = thoughtCvs[kind].toDataURL('image/png'); });
      return out;
    })(),
  });
  updatePlaque('SAVED ' + n);
  hint();
  syncLedger();
  beginKeeping();   // shrink · vignette · sweep · dark — home drops the poppet in
}

/* ── raycast plumbing ── */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let painting = false;
const camTarget = V(0, 0.98, 0);
let viewLock = null;   // null | 'table' | 'poppet'
const VIEWS = {
  table: { target: V(-0.55, 0.05, 0.1), theta: 0.0, phi: 0.6, dist: 3.4 },
  poppet: { target: V(0, 1.05, 0), theta: 0.5, phi: 1.25, dist: 4.2 }
};
function setViewLock(key) {
  viewLock = key;
  hint();
  syncLedger();
}
let px = 0, py = 0;
const ghost = { last: null, sheet: null, hullPart: null };
const tmpC = V(0, 0, 0);

function place() {
  if (viewLock) {
    const Vv = VIEWS[viewLock];
    // eased glide to the locked view
    camTarget.lerp(Vv.target, 0.08);
    theta += (Vv.theta - theta) * 0.08;
    phi += (Vv.phi - phi) * 0.08;
    dist += (Vv.dist - dist) * 0.08;
  }
  camera.position.set(
    camTarget.x + dist * Math.sin(phi) * Math.sin(theta),
    camTarget.y + dist * Math.cos(phi),
    camTarget.z + dist * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(camTarget);
}
function pick(e, objects, skipHulls) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(objects, true);   // recursive: groups have children
  for (let i = 0; i < hits.length; i++) {
    if (hits[i].object && hits[i].object.visible === false) continue;   // hidden hulls/shells don't block
    if (skipHulls && hits[i].object.userData && hits[i].object.userData.hull) continue;   // see through painted hulls
    let o = hits[i].object;
    // climb to the tagged ancestor (groups hold the userData)
    while (o && !(o.userData && (o.userData.layerBtn || o.userData.toolBtn || o.userData.canvasLaunch || o.userData.gear || o.userData.burn || o.userData.viewBtn || o.userData.panelBtn || o.userData.bodyPart || o.userData.faceZone || o.userData.hull || o.userData.glyph || (desk.easels.cloth && o === desk.easels.cloth.pad) || (desk.easels.aura3 && o === desk.easels.aura3.pad) || (desk.easels.aura4 && o === desk.easels.aura4.pad)))) {
      o = o.parent;
      if (o === scene) { o = null; break; }
      if (o === desk.desk) { o = null; break; }
    }
    if (o) return { object: o, uv: hits[i].uv, point: hits[i].point, distance: hits[i].distance }; 
  }
  return null;
}
/* ── the worksurface slates: one per paintable sheet, every stroke goes through them ── */
/* atlas panels are UV rects (bottom-up v); the worksurface lives in canvas-y */
function uvPanelsToCanvasY(ATLAS) {
  const out = {};
  Object.keys(ATLAS).forEach(function (k) {
    const r = ATLAS[k];
    out[k] = [r[0], 1 - (r[1] + r[3]), r[2], r[3]];
  });
  return out;
}
const slateFactories = {
  'body': function () { return makeWorksurface({ cv: atlasCv, tex: doll.bodyTex, panels: uvPanelsToCanvasY(doll.ATLAS), bg: '#ead9b4' }); },
  'face:eyes': function () { return makeWorksurface({ cv: doll.faceMaps.eyes.cv, tex: doll.faceMaps.eyes.tex, checker: true }); },
  'face:face': function () { return makeWorksurface({ cv: doll.faceMaps.face.cv, tex: doll.faceMaps.face.tex, checker: true }); },
  'face:hair': function () { return makeWorksurface({ cv: doll.faceMaps.hair.cv, tex: doll.faceMaps.hair.tex, checker: true }); },
  'clothes': function () { const s = makeWorksurface({ cv: doll.hullCanvas, tex: doll.hullTex, panels: doll.hullRects, checker: true }); s.onFill = function () { doll.markHullPainted(); }; return s; },
  'cloth': function () { const s = makeWorksurface({ cv: doll.clothCtx.canvas, tex: doll.clothTex, bg: '#e6d7b2' }); s.weave = function (hex) { weaveFill(doll.clothCtx, doll.clothCtx.canvas.width, doll.clothCtx.canvas.height, hex); }; return s; }
};
THOUGHT_KINDS.forEach(function (kind) {
  slateFactories['thoughts:' + kind] = function () { return makeWorksurface({ cv: thoughtCvs[kind], tex: thoughtTexs[kind], bg: '#efe6cd' }); };
});
const slates = {};
function getSheet(key) {
  if (!slates[key] && slateFactories[key]) slates[key] = slateFactories[key]();
  return slates[key] || null;
}
function sheetHasInk(key) {
  const sl = getSheet(key);
  if (!sl) return true;
  const d = sl.ctx.getImageData(0, 0, sl.cv.width, sl.cv.height).data;
  for (let i = 3; i < d.length; i += 32) {
    if (d[i] > 40) return true;
  }
  return false;
}
const undoCache = {};
let undoArmed = false;   // one snapshot per stroke, not per move
function armUndo(key) { if (undoArmed) { undoPush(key); undoArmed = false; } }
function undoSheetKey() {   // the sheet the active layer paints into
  if (activeLayer === 'face') return 'face:' + lessonKey();
  if (activeLayer === 'clothes') return 'clothes';
  if (activeLayer === 'thoughts') return 'thoughts:' + lessonKey();
  return 'body';
}
window.addEventListener('keydown', function (e) {
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    sheetUndo(undoSheetKey());
    syncLedger();
    e.preventDefault();
  }
});
function undoPush(key) {
  const sl = getSheet(key);
  if (!sl) return;
  if (!undoCache[key]) undoCache[key] = [];
  undoCache[key].push(sl.ctx.getImageData(0, 0, sl.cv.width, sl.cv.height));
  if (undoCache[key].length > 5) undoCache[key].shift();
}
function sheetUndo(key) {
  const st = undoCache[key];
  const sl = getSheet(key);
  if (!st || !st.length || !sl) return;
  sl.ctx.putImageData(st.pop(), 0, 0);
  if (sl.tex) sl.tex.needsUpdate = true;
}
/* the brush used for the ACTIVE layer — body sizes for face/hull sheets too */
function layerBrush() {
  return brushes.body;
}
function stampFace(zone, x, y) {
  const fm = doll.faceMaps[zone];
  daub(fm.ctx, x, y, brushes.body.size / 2, brushes.body.ink);
  fm.tex.needsUpdate = true;
}
function stampHull(x, y) {
  daub(doll.hullCtx, x, y, brushes.body.size / 2, brushes.body.ink);
  doll.hullTex.needsUpdate = true;
  doll.markHullPainted();
}
/* hull hit → canvas px: clamp to the limb's strip so ink lands on its own tube */
function hullUVtoPx(uv, part) {
  const r = doll.hullRects[part];
  const cv = doll.hullCanvas;
  let x = uv.x * cv.width;
  x = Math.max(r[0] * cv.width + 2, Math.min((r[0] + r[2]) * cv.width - 2, x));
  const y = (1 - uv.y) * cv.height;
  return { cx: x, cy: y, x0: Math.floor(r[0] * cv.width), w: Math.floor(r[2] * cv.width) };
}
/* which sheet does this body-mesh carry? (body parts: thoughts when in that layer) */
function dollSheet(mesh) {
  if (mesh.userData.thoughtPaint) return 'thoughts:' + lessonKey();
  const key = Object.keys(doll.M()).find(function (k) { return doll.M()[k] === mesh; });
  if (!key) return null;
  return REGION_OF_MESH[key] || null;
}
function hitUVpx(sheet, uv) {
  const cv = getSheet(sheet).cv;
  return { x: uv.x * cv.width, y: (1 - uv.y) * cv.height };
}
const REGION_OF_MESH = {
  head: 'body', chest: 'body', pelvis: 'body', waistBall: 'body', neck: 'body',
  armLU: 'body', armLL: 'body', armRU: 'body', armRL: 'body',
  legLU: 'body', legLL: 'body', legRU: 'body', legRL: 'body',
  hand_haL: 'body', hand_haR: 'body', foot_akL: 'body', foot_akR: 'body',
  j_shL: 'body', j_shR: 'body', j_elL: 'body', j_elR: 'body',
  j_hpL: 'body', j_hpR: 'body', j_knL: 'body', j_knR: 'body'
};
function dollHitTargets() {
  const rings = doll.M().rings;
  const arr = doll.body.children.filter(function (m) { return m !== rings; });   // rings grab, they don't paint
  ['face_eyes', 'face_face', 'face_hair'].forEach(function (k) { const m = doll.M()[k]; if (m) arr.push(m); });
  return arr;
}

function deskPickables() {
  const arr = [];
  desk.easels.cloth && arr.push(desk.easels.cloth.pad);
  desk.easels.aura3 && arr.push(desk.easels.aura3.pad);
  desk.easels.aura4 && arr.push(desk.easels.aura4.pad);
  if (desk.panelPickables) arr.push.apply(arr, desk.panelPickables);
  arr.push.apply(arr, desk.layerPickables);
  if (desk.gearPickables) arr.push.apply(arr, desk.gearPickables);
  arr.push.apply(arr, desk.burnPickables);
  arr.push.apply(arr, desk.viewPickables);
  return arr;
}

/* ── CANVAS: opens the expand overlay — the walkthrough of the whole mapping ── */
function canvasLaunch() {
  if (dollPaint) setDollPaint(false);
  setLayer(activeLayer);          // sync the walkthrough to the active layer
  popOverlay.syncBrush();
  popOverlay.open(lesson.layer, lesson.idx);   // the walkthrough IS the overlay's stage
}

/* ── the EXPAND overlay: the walkthrough of the whole mapping lives here ── */
const popOverlay = buildPoppetOverlay(document.body, {
  doll: doll,
  ink: function () { return brushes.body.ink; },
  brush: function () { return brushes.body.size; },
  setInk: function (hex) { brushes.body.ink = hex; syncLedger(); updatePlaque(); },
  setSize: function (px) { brushes.body.size = px; updatePlaque(); },
  wispCv: function (kind) { return thoughtCvs[kind]; },
  wispTex: function (kind) { return thoughtTexs[kind]; },
  weaveFor: function (key) {
    if (key === 'cloth') return function (hex) { weaveFill(doll.clothCtx, doll.clothCtx.canvas.width, doll.clothCtx.canvas.height, hex); };
    if (key === 'body') return function (hex) { weaveFill(doll.bodyCtx, atlasCv.width, atlasCv.height, hex || '#ead9b4'); };
    return null;
  },
  fillCloth: function (hex) { weaveFill(doll.clothCtx, doll.clothCtx.canvas.width, doll.clothCtx.canvas.height, hex); },
  washSheet: washSheet,
  onStep: function (key, part) {
    /* the walkthrough moves — the desk follows: layer, lesson, glyphs, hulls */
    const layer = key.split(':')[0];
    if (layer === 'body') setLesson('body', Math.max(0, MAPPING.body.indexOf(part)));
    else if (layer === 'face') setLesson('face', Math.max(0, MAPPING.face.indexOf(part)));
    else if (layer === 'clothes') setLesson('clothes', Math.max(0, MAPPING.clothes.indexOf(part)));
    else if (layer === 'thoughts') setLesson('thoughts', Math.max(0, MAPPING.thoughts.indexOf(part)));
  },
  onDoll: function () {
    /* DOLL →: take this piece to the poppet itself */
    popOverlay.close();
    setDollPaint(true);
  },
  onStrokeEnd: function (sheetKey) {
    /* a stroke finished in the overlay: thought glyphs refresh, hull wakes, gate re-checks */
    if (sheetKey === 'clothes') doll.markHullPainted();
    if (sheetKey.indexOf('thoughts:') === 0) rebuildThoughtGlyphs(sheetKey.slice(9));
    desk.setKeepsakeReady(keepsakeReady());
  }
});

/* ── the gear's slider mini-menu — proportions + brush + tool ── */
const sliderEls = {};
const PROP_META = [
  ['head', 'HEAD', 0.34, 0.5], ['chest', 'CHEST', 0.7, 1.35], ['waist', 'WAIST', 0, 1],
  ['hips', 'HIPS', 0.7, 1.35], ['arml', 'ARM LEN', 0.7, 1.35], ['armt', 'ARM THICK', 0.7, 1.5],
  ['legl', 'LEG LEN', 0.7, 1.35], ['legt', 'LEG THICK', 0.7, 1.5], ['flop', 'FLOP', 0, 1]
];
function buildSliderMenu() {
  if (sliderEls.root) return;
  const root = document.createElement('div');
  root.className = 'slider-root';
  let rows = '';
  PROP_META.forEach(function (m) {
    rows += '<div class="slider-row"><b>' + m[1] + '</b><input type="range" min="' + m[2] + '" max="' + m[3] + '" step="0.01" data-prop="' + m[0] + '"/></div>';
  });
  root.innerHTML =
    '<div class="slider-card">' +
    '<div class="slider-head"><b>PROPORTIONS</b><button type="button" class="slider-x">×</button></div>' +
    rows +
    '<div class="slider-sec">BRUSH Ø <span class="slider-size-v"></span></div>' +
    '<input type="range" class="slider-size" min="2" max="48" step="1"/>' +
    '<div class="slider-tools">' +
    '<button type="button" data-tool="brush">◆ BRUSH</button>' +
    '<button type="button" data-tool="bucket">◈ BUCKET</button>' +
    '<button type="button" data-tool="erase">◌ ERASER</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(root);
  sliderEls.root = root;
  sliderEls.props = Array.prototype.slice.call(root.querySelectorAll('[data-prop]'));
  sliderEls.size = root.querySelector('.slider-size');
  sliderEls.sizeV = root.querySelector('.slider-size-v');
  sliderEls.tools = Array.prototype.slice.call(root.querySelectorAll('[data-tool]'));
  sliderEls.props.forEach(function (inp) {
    inp.addEventListener('input', function () {
      P[inp.getAttribute('data-prop')] = +inp.value;
      queueRebuild();
      updatePlaque();
    });
  });
  sliderEls.size.addEventListener('input', function () {
    brushes.body.size = +sliderEls.size.value;
    sliderEls.sizeV.textContent = brushes.body.size + 'px';
    if (popOverlay.isOpen()) popOverlay.syncBrush();
  });
  sliderEls.tools.forEach(function (t) {
    t.addEventListener('click', function () {
      const tool = t.getAttribute('data-tool');
      inkMode = tool === 'erase' ? 'brush' : tool;
      eraseMode = tool === 'erase';
      refreshSliderTools();
      if (popOverlay.isOpen()) popOverlay.setTool(eraseMode ? 'erase' : inkMode);
      syncLedger();
    });
  });
  root.querySelector('.slider-x').addEventListener('click', function () { root.classList.remove('open'); });
}
function refreshSliderTools() {
  if (!sliderEls.tools) return;
  sliderEls.tools.forEach(function (t) {
    const tool = t.getAttribute('data-tool');
    t.classList.toggle('on', eraseMode ? tool === 'erase' : tool === inkMode);
  });
}
function openSliderMenu(noSync) {
  buildSliderMenu();
  sliderEls.props.forEach(function (inp) { inp.value = P[inp.getAttribute('data-prop')]; });
  sliderEls.size.value = brushes.body.size;
  sliderEls.sizeV.textContent = brushes.body.size + 'px';
  refreshSliderTools();
  sliderEls.root.classList.add('open');
  if (!noSync) syncLedger();
}
function closeSliderMenu() {
  if (sliderEls.root) sliderEls.root.classList.remove('open');
}

canvas.addEventListener('pointerdown', function (e) {
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers */ }
  px = e.clientX; py = e.clientY;
  idle = 0;
  ghost.last = null; ghost.sheet = null; ghost.hullPart = null;
  undoArmed = true;   // strokes snapshot once, at their start
  /* desk objects first */
  const dh = pick(e, deskPickables());
  if (dh) {
    const o = dh.object;
    if ((desk.easels.cloth && o === desk.easels.cloth.pad) || (desk.easels.aura3 && o === desk.easels.aura3.pad) || (desk.easels.aura4 && o === desk.easels.aura4.pad)) {
      const p = regionFromUV(o, dh.uv);
      if (inkMode === 'bucket') { bucketAt(p); return; }   // bucket is click-only
      else { paintProxy(p.sheet, p.x, p.y); ghost.sheet = p.sheet; painting = true; canvas.classList.add('painting'); return; }
    }
    if (o.userData.canvasLaunch) { canvasLaunch(); return; }
    if (o.userData.layerBtn) { setLayer(o.userData.layerBtn); return; }
    if (o.userData.gear) { desk.gear.spin(); openSliderMenu(); return; }
    if (o.userData.toolBtn) {
      inkMode = o.userData.toolBtn === 'erase' ? 'brush' : o.userData.toolBtn;
      eraseMode = o.userData.toolBtn === 'erase';
      if (popOverlay.isOpen()) popOverlay.setTool(eraseMode ? 'erase' : inkMode);
      openSliderMenu(true);
      syncLedger();
      return;
    }
    if (o.userData.burn) {
      // the burn is a true ending for this specimen, not an undo: say so
      // before the jar drops. A window confirm — the ceremony itself is
      // the next click, never this one.
      var proceed = true;
      try {
        proceed = window.confirm('The burn is forever for this specimen.\n\nWhat you have painted will be ash — you will be making a FRESH POPPET from an empty sheet.\n\nBurn it?');
      } catch (err) { proceed = true; }
      if (!proceed) return;
      startBurn();
      return;
    }
    if (o.userData.panelBtn) {
      const k = o.userData.panelBtn;
      if (k === 'canvas') {
        canvasLaunch();
      } else if (k === 'doll') {
        setDollPaint(!dollPaint);   // DOLL DRAW: painting happens on the poppet itself
      } else if (k === 'keepsake') {
        pressKeepsake();
      }
      return;
    }
    if (o.userData.viewBtn) {
      // pressing the active lock releases it
      setViewLock(viewLock === o.userData.viewBtn ? null : o.userData.viewBtn);
      return;
    }
  }
  /* the doll: paint it or grab it — hulls, face zones, body, thoughts in order */
  /* painted hulls never block painting the body beneath (outside CLOTHES work) */
  let hit = pick(e, dollHitTargets());
  if (hit && hit.object.userData && hit.object.userData.hull && activeLayer !== 'clothes' && !dollPaint) {
    hit = pick(e, dollHitTargets(), true);   // hulls ride limbs as grandchildren — skip them in the ray, not the list
  }
  const ob = hit ? hit.object : null;
  /* CLOTHES: the transparent hulls — they wake when you start painting them */
  if (hit && ob.userData.hull && (activeLayer === 'clothes' || dollPaint)) {
    if (ob.visible) {
      const part = ob.userData.hull;
      const pxs = hullUVtoPx(hit.uv, part);
      if (inkMode === 'bucket') {
        undoPush('clothes');
        doll.hullCtx.fillStyle = brushes.body.ink;
        doll.hullCtx.fillRect(pxs.x0, 0, pxs.w, doll.hullCanvas.height);
        doll.hullTex.needsUpdate = true;
        doll.markHullPainted();
        strokeHot = lessonKey();   // bucket clicks advance the walkthrough too
        syncLedger();
        return;
      }
      if (ob.material.opacity < 0.5 && !eraseMode) ob.material.opacity = 0.85;   // the hull appears
      if (eraseMode) getSheet('clothes').eraseDot(pxs.cx, pxs.cy, brushes.body.size / 2);
      else { armUndo('clothes'); stampHull(pxs.cx, pxs.cy); }
      strokeHot = lessonKey();   // hull strokes speak in part names, like paintProxy
      painting = true; ghost.sheet = 'doll'; ghost.hullPart = part;
      ghost.last = { x: pxs.cx, y: pxs.cy, sheet: 'clothes' };
      canvas.classList.add('painting');
      return;
    }
  }
  /* THOUGHTS: glyphs are signposts — walk through them, don't grab */
  if (hit && ob.userData.glyph) { orbiting = true; return; }
  /* FACE & HAIR: the shell's three zones, hovering outside the head */
  if (hit && ob.userData.faceZone && (activeLayer === 'face' || dollPaint)) {
    if (ob.visible) {
      const sheet = 'face:' + ob.userData.faceZone;
      const pxy = hitUVpx(sheet, hit.uv);
      if (inkMode === 'bucket') { paintProxy(sheet, pxy.x, pxy.y); return; }
      if (eraseMode) getSheet(sheet).eraseDot(pxy.x, pxy.y, brushes.body.size / 2);
      else { armUndo(sheet); stampFace(ob.userData.faceZone, pxy.x, pxy.y); }
      strokeHot = lessonKey();   // face strokes speak in zone names, like paintProxy
      painting = true; ghost.sheet = 'doll';
      ghost.last = { x: pxy.x, y: pxy.y, sheet: sheet };
      canvas.classList.add('painting');
      return;
    }
  }
  /* BODY + THOUGHTS: the skin atlas and the active thought sheet ride the body */
  if (hit && !ob.userData.garment && ob.visible) {
    const sheet = dollSheet(ob);
    if (sheet) {
      const pxy = hitUVpx(sheet, hit.uv);
      if (inkMode === 'bucket') { paintProxy(sheet, pxy.x, pxy.y); return; }   // click-only
      paintProxy(sheet, pxy.x, pxy.y);
      painting = true; ghost.sheet = 'doll'; canvas.classList.add('painting');
      return;
    }
  }
  if (hit) {
    const pi = hit.object.userData.pi;
    if (typeof pi === 'number' && doll.pts()[pi]) {
      doll.state.grabbed = pi;
      doll.dragPoint.copy(doll.pts()[pi].p);
      doll.dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(tmpC).clone().negate(), doll.pts()[pi].p.clone());
      doll.setDrag(true);
      canvas.classList.add('grabbing');
      doll.state.pinTimer = 0;
      return;
    }
  }
  orbiting = true;
});
function regionOfMesh(mesh) {
  const key = Object.keys(doll.M()).find(function (k) { return doll.M()[k] === mesh; });
  return key ? (doll.REGION_OF[key] || null) : null;
}
canvas.addEventListener('pointermove', function (e) {
  idle = 0;
  if (painting) {
    // keep painting whatever paintable thing is under the cursor — hulls,
    // face zones, the skin, the active thought sheet, or the desk easels
    const pickTargets = dollHitTargets();
    if (desk.easels.cloth) pickTargets.push(desk.easels.cloth.pad);
    if (desk.easels.aura3) pickTargets.push(desk.easels.aura3.pad);
    if (desk.easels.aura4) pickTargets.push(desk.easels.aura4.pad);
    const dh = pick(e, pickTargets, !(activeLayer === 'clothes' || dollPaint));   // see through painted hulls unless hulling
    if (dh) {
      const ob = dh.object;
      const eC = desk.easels.cloth, e3 = desk.easels.aura3, e4 = desk.easels.aura4;
      if ((eC && ob === eC.pad) || (e3 && ob === e3.pad) || (e4 && ob === e4.pad)) {
        const p = regionFromUV(ob, dh.uv);
        if (p && p.sheet === ghost.sheet && inkMode === 'brush') {
          paintProxy(p.sheet, p.x, p.y);   // paintProxy tracks ghost.last itself
        }
      } else if (ob.userData.hull && ghost.sheet === 'doll') {
        const part = ob.userData.hull;
        const pxs = hullUVtoPx(dh.uv, part);
        /* strokes stay on their own limb's strip — crossing strips breaks the line */
        if (ghost.hullPart === part) {
          const sl = getSheet('clothes');
          const prev = (ghost.last && ghost.last.sheet === 'clothes') ? ghost.last : null;
          const pts = prev ? spacedStamps(prev.x, prev.y, pxs.cx, pxs.cy, Math.max(2, brushes.body.size / 3)) : [{ x: pxs.cx, y: pxs.cy }];
          pts.forEach(function (s) {
            if (eraseMode) sl.eraseDot(s.x, s.y, brushes.body.size / 2);
            else stampHull(s.x, s.y);
          });
          ghost.last = { x: pxs.cx, y: pxs.cy, sheet: 'clothes' };
          strokeHot = lessonKey();
        }
      } else if (ob.userData.faceZone && ghost.sheet === 'doll') {
        const sheet = 'face:' + ob.userData.faceZone;
        const pxy = hitUVpx(sheet, dh.uv);
        paintProxy(sheet, pxy.x, pxy.y);
        strokeHot = lessonKey();
      } else if (ghost.sheet === 'doll' && !ob.userData.garment && ob.visible) {
        const sheet = dollSheet(ob);
        if (sheet) {
          const pxy = hitUVpx(sheet, dh.uv);
          paintProxy(sheet, pxy.x, pxy.y);
        }
      }
    }
    return;
  }
  if (doll.state.grabbed >= 0) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hit = tmpC.clone();
    if (ray.ray.intersectPlane(doll.dragPlane, hit)) doll.dragPoint.copy(hit);
  } else if (orbiting) {
    if (viewLock) return;   // locked views don't orbit
    theta -= (e.clientX - px) * 0.006;
    phi = Math.max(0.3, Math.min(1.52, phi - (e.clientY - py) * 0.005));
    px = e.clientX; py = e.clientY;
  }
});
function release() {
  if (painting) {
    /* heavy checks run once per stroke, never per move */
    if (lastThoughtSheet) { rebuildThoughtGlyphs(lastThoughtSheet.slice(9)); lastThoughtSheet = null; }
    if (ghost.sheet === 'doll' && doll.state.grabbed >= 0) {   // doll stroke, not grab
      doll.state.grabbed = -1;
      doll.setDrag(false);
    }
  }
  desk.setKeepsakeReady(keepsakeReady());   // the gate lights when the work is done — bucket clicks too
  // finished the walkthrough's current piece? advance after a beat (bucket is click-only: no painting flag)
  if (strokeHot && !popOverlay.isOpen()) {
    const finished = strokeHot;
    setTimeout(function () {
      if (strokeHot === null && lessonKey() === finished && !popOverlay.isOpen()) nextLesson();
    }, 900);
  }
  strokeHot = null;
  painting = false;
  ghost.last = null; ghost.sheet = null; ghost.hullPart = null;
  canvas.classList.remove('painting');
  if (doll.state.grabbed >= 0) {
    doll.state.grabbed = -1;
    doll.setDrag(false);
    doll.state.returning = 1.6;
    canvas.classList.remove('grabbing');
  }
  orbiting = false;
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', function (e) {
  e.preventDefault();
  if (viewLock) return;   // locked views ignore zoom
  dist = Math.max(2.4, Math.min(9, dist + e.deltaY * 0.004));
  idle = 0;
}, { passive: false });

/* ── proportions: the gear's slider menu drives P ──
   a rebuild disposes every mesh, so never one per input event: rebuild at most
   ~8×/s, deferring the surplus to the next frame (or the next input, if the
   frame loop is stalled) */
let rebuildQueued = false;
let lastRebuildT = -1000;
function doRebuild() {
  lastRebuildT = performance.now();
  rebuildQueued = false;
  doll.rebuild(P.pose);
  setLesson(activeLayer);   // shell / hull / thought-paint flags ride the rebuild
  updatePlaque();
}
function queueRebuild() {
  if (performance.now() - lastRebuildT > 120) doRebuild();
  else rebuildQueued = true;
}

/* ── the burn ceremony ── */
const burn = {
  phase: 'idle', t: 0,
  jarY: 0, jarV: 0, bombY: 0, bombV: 0,
  center: V(0, 1.3, 0),
  deadDoll: null
};
let orbiting = false, theta = 0.38, phi = 1.1, dist = 5.9, idle = 0;   // default frames desk + poppet
let dropZoom = 0, startDist = 5.9, startPhi = 1.1;   // the keeping's camera pull
function startBurn() {
  if (burn.phase !== 'idle') return;
  burn.phase = 'jar';
  burn.t = 0;
  burn.jarY = 6; burn.jarV = 0;
  L.jar.visible = true;
  L.jar.position.set(0, burn.jarY, 0);
  updatePlaque('BURNING…');
  syncLedger();
}
function killDoll() {
  burn.deadDoll = { pieces: doll.killForBurn() };
}
function cleanupDead() {
  if (!burn.deadDoll) return;
  burn.deadDoll.pieces.forEach(function (m) {
    scene.remove(m);
    m.geometry.dispose();
    (Array.isArray(m.material) ? m.material : [m.material]).forEach(function (mt) { mt.dispose(); });
  });
  burn.deadDoll = null;
}
function stepBurn(dt) {
  burn.t += dt;
  if (burn.phase === 'jar') {
    burn.jarV -= 5.5 * dt;
    burn.jarY += burn.jarV * dt;
    const floorY = -0.06;
    if (burn.jarY <= floorY) {
      burn.jarY = floorY; burn.jarV = 0;
      if (burn.t > 0.35) {
        L.sparkBurst(V(0, 0.15, 0), 3);
        burn.phase = 'fuse'; burn.t = 0;
        burn.bombY = 5.5; burn.bombV = 0;
        L.bomb.visible = true;
        L.fuseSpark.visible = false;
      }
    }
    L.jar.position.y = burn.jarY;
  } else if (burn.phase === 'fuse') {
    burn.bombV -= 5.5 * dt;
    burn.bombY += burn.bombV * dt;
    const restY = 0.3;
    if (burn.bombY <= restY) {
      burn.bombY = restY; burn.bombV = 0;
      L.fuseSpark.visible = true;
      L.fuseSpark.scale.setScalar(0.18 + Math.random() * 0.12);
      if (burn.t > 1.7) {
        L.sparkBurst(burn.center, 26);
        L.lamp.intensity = 4.2;
        killDoll();
        charPieces();
        burn.phase = 'char'; burn.t = 0;
        L.bomb.visible = false;
        L.fuseSpark.visible = false;
        L.jar.visible = false;
        L.spawnAsh();               // the table keeps what's left
        L.scorch.visible = true;
        L.scorch.material.opacity = Math.min(0.95, (L.scorch.visible ? L.scorch.material.opacity : 0) + 0.35);   // scorch deepens with each burn
        L.sparkEmbers();
        burnTally++;
        updatePlaque('BURNED · CEREMONY ' + burnTally);
      }
    }
    L.bomb.position.y = burn.bombY;
    L.bomb.rotation.y += dt * 1.4;
  } else if (burn.phase === 'char') {
    stepDead(dt);
    if (burn.t > 2.4) {
      burn.phase = 'respawn'; burn.t = 0;
      burn.jarY = 6; burn.jarV = 0;
      L.jar.visible = true;
      L.jar.position.set(0, burn.jarY, 0);
    }
  } else if (burn.phase === 'respawn') {
    stepDead(dt);
    burn.jarV -= 5.5 * dt;
    burn.jarY += burn.jarV * dt;
    if (burn.jarY <= -0.06) {
      burn.jarY = -0.06;
      if (burn.t > 0.3) {
        L.jar.visible = false;
        L.sparkBurst(V(0, 0.4, 0), 4);
        gen++;
        rng = makeRng((Date.now() + gen * 7919) >>> 0);
        freshP();
        doll.rebuild('stand');
        updatePlaque();
        setLesson(activeLayer);   // re-apply the walkthrough: shell, hulls, thought-paint flags
        syncLedger();
        const pts = doll.pts();
        pts.forEach(function (pt) { pt.p.y += 3.2; pt.prev.y += 3.2; });
        cleanupDead();
        burn.phase = 'settle'; burn.t = 0;
      }
    }
    L.jar.position.y = burn.jarY;
  } else if (burn.phase === 'settle') {
    if (burn.t > 1.6) { burn.phase = 'idle'; burn.t = 0; updatePlaque(); syncLedger(); }
  }
}
function charPieces() {
  if (!burn.deadDoll) return;
  burn.deadDoll.pieces.forEach(function (m) {
    (Array.isArray(m.material) ? m.material : [m.material]).forEach(function (mt) {
      if (mt && mt.color) mt.color.multiplyScalar(0.18);
      if (mt && mt.emissive) mt.emissive.setHex(0x180a04);
    });
  });
}
function stepDead(dt) {
  if (!burn.deadDoll) return;
  burn.deadDoll.pieces.forEach(function (m) {
    if (m.userData.flingT <= 0) return;
    m.userData.flingT -= dt * 0.55;
    m.userData.flingV.y -= 6.5 * dt;
    m.position.addScaledVector(m.userData.flingV, dt);
    m.rotation.x += m.userData.flingW.x * dt;
    m.rotation.y += m.userData.flingW.y * dt;
    m.rotation.z += m.userData.flingW.z * dt;
    if (m.position.y < 0.05) {
      m.position.y = 0.05;
      m.userData.flingV.multiplyScalar(0.4);
      m.userData.flingV.y = Math.abs(m.userData.flingV.y) * 0.3;
    }
  });
}

function freshP() {
  P.head = 0.4 + rng() * 0.08; P.chest = 0.9 + rng() * 0.25; P.waist = 0.4 + rng() * 0.35; P.hips = 0.9 + rng() * 0.25;
  P.arml = 0.9 + rng() * 0.25; P.armt = 0.9 + rng() * 0.25; P.legl = 0.9 + rng() * 0.25; P.legt = 0.9 + rng() * 0.3;
  P.flop = 0.35 + rng() * 0.3; P.pose = 'stand';
  P.worn = { robe: false, dress: false, top: false, hoodie: false, pants: false, bralet: false };
  P.thoughts = { fears: [], wishes: [], likes: [], dislikes: [], thoughts: [] };
}

/* ── boot ── */
updateLessonCard();
updatePlaque();
doll.rebuild('stand');
doll.setSpike(true, L.SPIKE_TIP_Y);
setLayer('body');
openSliderMenu(true);   // sliders mirror P before the first open
sliderEls.root.classList.remove('open');
THOUGHT_KINDS.forEach(rebuildThoughtGlyphs);   // glyph counts match the sheets
desk.setKeepsakeReady(keepsakeReady());        // the KEEPSAKE gate starts where the work is
setDollPaint(true);   // the lab opens ready to paint the poppet itself

/* the guided first-run workshop: Physius welcomes, the bell summons, and the
   walkthrough advances by real paint detection (guide.js, release script) */
if (window.PoppetGuide) {
  window.PoppetGuide.maybeStart({
    doll: doll,
    name: function () {
      // seated in the ship's bezel: the desktop (parent) owns the name
      try {
        if (window.parent && window.parent !== window && window.parent.Liber && window.parent.Liber.state) {
          return window.parent.Liber.state.get().travellerAlias || 'traveller';
        }
      } catch (err) { /* standalone */ }
      return (window.Liber && window.Liber.state && window.Liber.state.get().travellerAlias) || 'traveller';
    },
    shouldRun: function () { return !keepsakeCount(); },
    setDollPaint: function (on) { setDollPaint(!!on); },
    // the guide opens the desk's own texture subsections: layer + index
    // into the real lesson plan (the threejs desk IS the tutorial).
    // activeLayer must move too: deferred rebuilds re-impose setLesson
    // from the band, so the band IS the authority.
    setLessonPart: function (layer, idx) { activeLayer = layer; setDollPaint(true); setLesson(layer, idx); },
    setLessonFree: function () { setLesson('clothes', 0); },
    keep: function () {
      try { localStorage.setItem('poppet.keepsake.fresh', String(Date.now())); } catch (e) {}
      pressKeepsake(true);   // the guided workshop keeps whatever stage it reached
    }
  });
}
function resize() {
  const r = canvas.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return; // a hidden frame reports 0 — keep the last good size
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(1, r.height);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
place();

let last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  idle += dt;
  popOverlay.tick && popOverlay.tick(dt);
  if (rebuildQueued && (burn.phase === 'idle' || burn.phase === 'settle')) doRebuild();
  if (burn.phase === 'idle' || burn.phase === 'settle') doll.physicsFrame(dt);
  stepBurn(dt);
  if (desk.gear) desk.gear.tick(dt);
  if (desk.updateKeepsake) desk.updateKeepsake(now / 1000);
  if (!dropZoom && window.__lab && window.__lab.__keepZoom > 0) {   // the keeping begins
    dropZoom = window.__lab.__keepZoom;
    startDist = dist; startPhi = phi;   // pull from wherever the viewer stands
  }
  if (dropZoom > 0) {   // the keeping pulls the room toward the middle distance
    dropZoom = Math.min(1, dropZoom + dt / 1.44);
    dist = startDist - dropZoom * (startDist - 2.6);
    phi = startPhi + dropZoom * (0.62 - startPhi);
  }
  L.updateFX(dt);
  place();
  renderer.render(scene, camera);
}
requestAnimationFrame(function t(now) { last = now; requestAnimationFrame(tick); });

/* debug handle */
window.__lab = {
  doll: doll, scene: scene, camera: camera, P: P, burn: burn, desk: desk,
  get M() { return doll.M(); }, ATLAS: doll.ATLAS, IDX: IDX,
  setLayer: setLayer, updatePlaque: updatePlaque, painter: popOverlay,
  nextLesson: nextLesson, prevLesson: prevLesson, openCanvas: canvasLaunch, openSliders: openSliderMenu,
  get lesson() { return lesson; },
  get brushes() { return brushes; },
  get viewLock() { return viewLock; },
  get sheet() { return getSheet; },
  paintSheet: paintProxy,   // debug: land a stroke through the real pipeline
  get keepsakeReady() { return keepsakeReady(); },
  setKeepsakeGlow: function (v) { desk.setKeepsakeReady(!!v); }
};
