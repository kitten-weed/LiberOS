import { sourceViewTransform, mapSourceViewPoint } from './source-view.js?v=source-view1';

/* poppet.js — the EXPAND overlay. Opens from the big CANVAS button and walks
   you through the doll piece by piece: each arrow-press (or finished part)
   moves the walkthrough to the next mapped part — in the correct spots, on the
   correct sheet. BODY walks the skin atlas panels; FACE & HAIR walks the
   shell's eye / face / hair sections; CLOTHES walks the eight limb hulls;
   THOUGHTS walks the five kinds, each with its own palette, stamped onto its
   own sheet as glyph marks that orbit the poppet.

   The same sheet it paints is the sheet DOLL DRAW paints through (surface.js),
   so a stroke lands in the same pixels whether you work here or on the doll. */
const BODY_PARTS = ['head', 'chest', 'pelvis', 'waistBall', 'armLU', 'armLL', 'armRU', 'armRL', 'legLU', 'legLL', 'legRU', 'legRL', 'haL', 'haR', 'ftL', 'ftR'];
const HULL_PARTS = ['armLU', 'armRU', 'armLL', 'armRL', 'legLU', 'legRU', 'legLL', 'legRL'];
const LAYER_SHEETS = {
  body: BODY_PARTS.map(function (p) { return { key: 'body', part: p, name: p }; }),
  face: [
    { key: 'face:eyes', part: 'eyes', name: 'EYES' },
    { key: 'face:face', part: 'face', name: 'FACE' },
    { key: 'face:hair', part: 'hair', name: 'HAIR' }
  ],
  clothes: HULL_PARTS.map(function (p) { return { key: 'clothes', part: p, name: p }; }),
  thoughts: [
    { key: 'thoughts:fears', part: 'fears', name: 'FEARS' },
    { key: 'thoughts:wishes', part: 'wishes', name: 'WISHES' },
    { key: 'thoughts:likes', part: 'likes', name: 'LIKES' },
    { key: 'thoughts:dislikes', part: 'dislikes', name: 'DISLIKES' },
    { key: 'thoughts:thoughts', part: 'thoughts', name: 'THOUGHTS' }
  ]
};

export function mapOverlayPoint(e, rect, view, width, height) {
  const transform = sourceViewTransform(
    width, height, view ? [view.sx, view.sy, view.sw, view.sh] : null,
    rect.width, rect.height, !view
  );
  const point = mapSourceViewPoint(e.clientX, e.clientY, rect, transform);
  return {x: point.x, y: point.y};
}

const THOUGHT_PALETTES = {
  fears: ['#b03a2a', '#7a2a20', '#c96a3a', '#4a1c14', '#e6a080'],
  wishes: ['#c9962e', '#e6c06a', '#a8721c', '#f0e0a0', '#8a5a10'],
  likes: ['#7fb069', '#4a8a3a', '#a8d08a', '#2a5a20', '#d0e8c0'],
  dislikes: ['#8a6a9e', '#5a4070', '#b098c8', '#3a2850', '#d0c0e0'],
  thoughts: ['#79b8c9', '#4888a0', '#a8d8e6', '#2a5868', '#d0e8f0']
};
const BODY_INKS = [
  { name: 'ink', hex: '#2b2016' }, { name: 'woad', hex: '#3a66c8' },
  { name: 'madder', hex: '#b03a2a' }, { name: 'ochre', hex: '#c9962e' },
  { name: 'cream', hex: '#e6d7b2' }
];
const PROMPTS = {
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
  eyes: 'Paint the eyes on the shell — the band around the middle',
  face: 'Paint the face on the shell — the bowl below the eyes',
  hair: 'Paint the hair on the shell — the crown above',
  clothes: 'Paint the cloth hull — it wraps the limb like a transparent tube',
  fears: 'Scribble its fears — red glyphs will orbit the poppet',
  wishes: 'Scribble its wishes — gold glyphs will orbit the poppet',
  likes: 'Scribble its likes — green glyphs will orbit the poppet',
  dislikes: 'Scribble its dislikes — violet glyphs will orbit the poppet',
  thoughts: 'Scribble its thoughts — blue glyphs will orbit the poppet'
};

export function buildPoppetOverlay(mount, cfg) {
  /* cfg: { doll, ink, brush, getSurface, canEdit, onStep, onChange } */
  function surf(key) {
    const surface = cfg.getSurface(key);
    if (!surface) throw new Error('Unknown poppet worksurface: ' + key);
    return surface;
  }

  /* ── the walkthrough state ── */
  const walk = { layer: 'body', idx: 0 };
  let editingLocked = false;
  function canEdit() {
    return !editingLocked && (!cfg.canEdit || cfg.canEdit());
  }
  function key() { return LAYER_SHEETS[walk.layer][walk.idx].key; }
  function part() { return LAYER_SHEETS[walk.layer][walk.idx].part; }
  function sheetName() { return LAYER_SHEETS[walk.layer][walk.idx].name; }
  function walkPrompt() {
    const k = key(), p = part();
    if (walk.layer === 'body') return PROMPTS[p] || ('Draw the ' + p);
    if (walk.layer === 'clothes') {
      const side = p.slice(-1) === 'L' ? 'left' : 'right';
      const seg = (p.indexOf('LL') >= 0 || p.indexOf('RL') >= 0) ? 'lower' : 'upper';
      return 'Paint the ' + seg + ' ' + side + ' ' + (p[0] === 'a' ? 'arm' : 'leg') + '\u2019s cloth hull — a transparent tube';
    }
    return PROMPTS[p] || PROMPTS[k] || ('Paint the ' + sheetName().toLowerCase());
  }
  function setWalk(layer, idx) {
    if (!canEdit()) return;
    walk.layer = layer;
    walk.idx = Math.max(0, Math.min(LAYER_SHEETS[layer].length - 1, idx));
    const s = surf(key());
    s.setOutline(walk.layer === 'face' ? null : part());   // face sheets are one zone each
    if (cfg.onStep) cfg.onStep(key(), part());
    show();
  }
  function nextWalk() {
    if (walk.idx < LAYER_SHEETS[walk.layer].length - 1) setWalk(walk.layer, walk.idx + 1);
    else if (walk.layer === 'body') setWalk('face', 0);
    else if (walk.layer === 'face') setWalk('clothes', 0);
    else if (walk.layer === 'clothes') setWalk('thoughts', 0);
  }
  function prevWalk() {
    if (walk.idx > 0) setWalk(walk.layer, walk.idx - 1);
    else if (walk.layer === 'face') setWalk('body', 15);
    else if (walk.layer === 'clothes') setWalk('face', 2);
    else if (walk.layer === 'thoughts') setWalk('clothes', 0);
  }

  /* ── the brush state — shared with DOLL DRAW mode via cfg ── */
  const st = { tool: cfg.getTool ? cfg.getTool() : 'brush', ink: cfg.ink(), size: cfg.brush(), painting: false, last: null, erase: false };
  let activeKey = 'body';   // which sheet is on the easel right now

  /* ── DOM ── */
  const root = document.createElement('div');
  root.className = 'poppet-root';
  root.innerHTML =
    '<div class="poppet-card">' +
    '<div class="poppet-head"><b>THE CANVAS — PIECE BY PIECE</b><span id="poppet-sub"></span><button type="button" class="poppet-x" title="close" aria-label="Close canvas">×</button></div>' +
    '<div class="poppet-body">' +
    '<div class="poppet-side">' +
    '<div class="poppet-sec">TOOL</div>' +
    '<div class="poppet-tools">' +
    '<button type="button" data-tool="brush" class="on" aria-pressed="true" aria-label="Brush tool">◆ BRUSH</button>' +
    '<button type="button" data-tool="bucket" aria-pressed="false" aria-label="Fill tool">◈ FILL</button>' +
    '<button type="button" data-tool="erase" aria-pressed="false" aria-label="Erase tool">◌ ERASE</button>' +
    '</div>' +
    '<div class="poppet-sec" id="poppet-ink-name">INKS</div>' +
    '<div class="poppet-inks"></div>' +
    '<div class="poppet-sec">BRUSH <span class="poppet-size-v"></span></div>' +
    '<input type="range" class="poppet-size" min="2" max="48" value="10" step="1" aria-label="Brush size"/>' +
    '<div class="poppet-actions">' +
    '<button type="button" class="poppet-undo" aria-label="Undo last paint stroke">↶ UNDO</button>' +
    '<button type="button" class="poppet-wash" aria-label="Wash the active panel">WASH PANEL</button>' +
    '</div>' +
    '</div>' +
    '<div class="poppet-stage">' +
    '<div class="poppet-phase" id="poppet-phase" aria-live="polite"></div>' +
    '<canvas class="poppet-cv" width="1024" height="1024"></canvas>' +
    '<button type="button" class="poppet-doll-btn" title="paint this on the doll itself" aria-label="Paint this part on the doll">DOLL →</button>' +
    '</div>' +
    '</div>' +
    '<div class="poppet-lesson">' +
    '<button type="button" class="poppet-nav" id="poppet-prev" aria-label="Previous piece">◀</button>' +
    '<div class="poppet-lmain"><div class="poppet-prog"></div><div class="poppet-prompt"></div></div>' +
    '<button type="button" class="poppet-nav" id="poppet-next" aria-label="Next piece">▶</button>' +
    '</div>' +
    '</div>';
  mount.appendChild(root);

  const el = {
    root, sub: root.querySelector('#poppet-sub'),
    tools: Array.prototype.slice.call(root.querySelectorAll('[data-tool]')),
    inks: root.querySelector('.poppet-inks'),
    inkName: root.querySelector('#poppet-ink-name'),
    size: root.querySelector('.poppet-size'), sizeV: root.querySelector('.poppet-size-v'),
    undo: root.querySelector('.poppet-undo'), wash: root.querySelector('.poppet-wash'),
    cv: root.querySelector('.poppet-cv'),
    dollBtn: root.querySelector('.poppet-doll-btn'),
    x: root.querySelector('.poppet-x'),
    prog: root.querySelector('.poppet-prog'), prompt: root.querySelector('.poppet-prompt'),
    phase: root.querySelector('#poppet-phase'),
    prev: root.querySelector('#poppet-prev'), next: root.querySelector('#poppet-next')
  };
  el.ctx = el.cv.getContext('2d', { willReadFrequently: true });

  /* ── inks: body set, or the active thought's palette ── */
  function curPalette() {
    if (activeKey.indexOf('thoughts:') === 0) return THOUGHT_PALETTES[activeKey.slice(9)];
    return BODY_INKS.map(function (i) { return i.hex; });
  }
  function refreshInks() {
    const pal = curPalette();
    el.inks.innerHTML = '';
    pal.forEach(function (hex) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ink-dot' + (st.ink === hex ? ' on' : '');
      b.style.background = hex;
      b.setAttribute('data-ink', hex);
      b.setAttribute('aria-label', hex + ' ink');
      b.setAttribute('aria-pressed', st.ink === hex ? 'true' : 'false');
      b.disabled = !canEdit();
      b.addEventListener('click', function () {
        if (!canEdit()) return;
        st.ink = hex;
        cfg.setInk(hex, true);
        refreshInks();
      });
      el.inks.appendChild(b);
    });
    if (activeKey.indexOf('thoughts:') === 0) {
      const kind = activeKey.slice(9);
      el.inkName.textContent = kind.toUpperCase() + ' — OWN PALETTE';
      if (pal.indexOf(st.ink) < 0) { st.ink = pal[0]; cfg.setInk(st.ink, false); refreshInks(); }
    } else {
      el.inkName.textContent = 'INKS';
    }
  }

  function setTool(tool) {
    if (!['brush', 'bucket', 'erase'].includes(tool)) throw new TypeError('Unknown poppet tool: ' + tool);
    if (!canEdit()) return;
    st.tool = tool;
    el.tools.forEach(function (button) {
      const selected = button.getAttribute('data-tool') === tool;
      button.classList.toggle('on', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    if (cfg.setTool && cfg.getTool && cfg.getTool() !== tool) cfg.setTool(tool);
  }

  function setLocked(locked) {
    editingLocked = !!locked;
    root.classList.toggle('edits-locked', editingLocked);
    el.cv.inert = editingLocked;
    el.cv.setAttribute('aria-disabled', editingLocked ? 'true' : 'false');
    el.tools.forEach(function (button) { button.disabled = editingLocked; });
    el.size.disabled = editingLocked;
    el.undo.disabled = editingLocked;
    el.wash.disabled = editingLocked;
    el.dollBtn.disabled = editingLocked;
    el.inks.querySelectorAll('button').forEach(function (button) { button.disabled = editingLocked; });
    updateLessonRow();
  }

  /* ── painting through the shared worksurface ── */
  function s() { return surf(activeKey); }
  el.cv.addEventListener('pointerdown', function (e) {
    if (!canEdit()) return;
    e.preventDefault();
    try { el.cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers */ }
    const p = vpos(e);
    s().pushUndo();
    st.painting = true;
    if (st.tool === 'bucket') {
      s().fillAt(p.x, p.y, st.ink, 40);
      if (cfg.onChange) cfg.onChange(activeKey);
      draw();
      st.painting = false;
      return;
    }
    if (st.tool === 'erase') s().eraseDot(p.x, p.y, st.size / 2);
    else s().stamp(p.x, p.y, st.size / 2, st.ink);
    st.last = p;
    if (cfg.onChange) cfg.onChange(activeKey);
    draw();
  });
  el.cv.addEventListener('pointermove', function (e) {
    if (!st.painting || st.tool === 'bucket' || !canEdit()) return;
    const p = vpos(e);
    s().stampLine(st.last.x, st.last.y, p.x, p.y, st.size / 2, st.ink, st.tool === 'erase');
    st.last = p;
    draw();
  });
  window.addEventListener('pointerup', function () {
    if (!st.painting) return;
    st.painting = false;
    st.last = null;
    if (cfg.onChange) cfg.onChange(activeKey);
  });

  el.tools.forEach(function (t) {
    t.addEventListener('click', function () {
      setTool(t.getAttribute('data-tool'));
    });
  });
  el.size.addEventListener('input', function () {
    if (!canEdit()) return;
    st.size = +el.size.value;
    cfg.setSize(st.size);
    el.sizeV.textContent = st.size + 'px';
  });
  el.undo.addEventListener('click', function () {
    if (!canEdit()) return;
    if (s().undo()) {
      if (cfg.onChange) cfg.onChange(activeKey);
    }
    draw();
  });
  el.wash.addEventListener('click', function () {
    if (!canEdit()) return;
    s().pushUndo();
    cfg.washSheet(activeKey, st.ink);
    if (cfg.onChange) cfg.onChange(activeKey);
    draw();
  });
  el.prev.addEventListener('click', prevWalk);
  el.next.addEventListener('click', nextWalk);
  el.x.addEventListener('click', function () { api.close(); });
  el.dollBtn.addEventListener('click', function () { if (canEdit() && cfg.onDoll) cfg.onDoll(); });

  /* ── draw + show ──
     The sheet moves WITH the walkthrough: instead of the whole atlas every
     time, the display zooms to the current panel (with a margin of
     surrounding skin for context). Pointer mapping follows the same view,
     so strokes land where the eye sees them. Face zones are already
     single-panel canvases and show whole. */
  var view = null;   // {sx,sy,sw,sh} canvas px currently framed, or null
  function hotPanel() {
    var api = s();
    var inner = (api && api.ws) || {};
    var panels = inner.panels;
    if (!panels) return null;
    var key = inner.outline || activeKey;
    var r = panels[key] || panels[part()];
    if (!r) return null;
    return r;
  }
  function draw() {
    var ws = s();
    var W = el.cv.width, H = el.cv.height;
    var cv = ws.cv;
    var r = hotPanel();
    if (!r) {
      view = null;
      ws.redraw(el.ctx, W, H);
    } else {
      var mx = 0.35, my = 0.45;   // margin of surrounding skin
      var sx = Math.max(0, (r[0] - r[2] * mx) * cv.width);
      var sy = Math.max(0, (r[1] - r[3] * my) * cv.height);
      var sw = Math.min(cv.width - sx, r[2] * (1 + mx * 2) * cv.width);
      var sh = Math.min(cv.height - sy, r[3] * (1 + my * 2) * cv.height);
      view = { sx: sx, sy: sy, sw: sw, sh: sh, W: W, H: H };
      var g = el.ctx;
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#efe6cd';
      g.fillRect(0, 0, W, H);
      g.drawImage(cv, sx, sy, sw, sh, 0, 0, W, H);
      g.strokeStyle = '#a8862e';
      g.lineWidth = 6;
      g.strokeRect(4, 4, W - 8, H - 8);
    }
    updateLessonRow();
  }
  // pointer → texture coords through the CURRENT view (zoomed or whole)
  function vpos(e) {
    var ws = s();
    var rect = el.cv.getBoundingClientRect();
    return mapOverlayPoint(e, rect, view, ws.cv.width, ws.cv.height);
  }
  function updateLessonRow() {
    const total = LAYER_SHEETS[walk.layer].length;
    const layerNames = { body: 'BODY — THE SKIN', face: 'FACE & HAIR — THE SHELL', clothes: 'CLOTHES — THE HULLS', thoughts: 'THOUGHTS — THE GLYPHS' };
    // the phase banner: nobody wonders what they are drawing on.
    const phase = { body: 'DRAW THE SKIN', face: 'DRAW THE FACE & HAIR', clothes: 'DRAW THE CLOTHES', thoughts: 'DRAW THE THOUGHTS' };
    el.prog.textContent = layerNames[walk.layer] + ' · PIECE ' + (walk.idx + 1) + ' OF ' + total + ' — ' + sheetName();
    if (el.phase) el.phase.textContent = phase[walk.layer] || '';
    el.prompt.textContent = walkPrompt();
    el.prev.disabled = editingLocked || (walk.layer === 'body' && walk.idx === 0);
    const lastLayer = walk.layer === 'thoughts' && walk.idx === total - 1;
    el.next.disabled = editingLocked || lastLayer;
  }
  function show() {
    activeKey = key();
    refreshInks();
    el.sizeV.textContent = st.size + 'px';
    draw();
  }

  const api = {
    open(layer, idx) {
      if (!canEdit()) return;
      root.classList.add('open');
      // the sheet owns the middle of the room: dock Physius aside so her
      // box never covers the canvas it narrates.
      try { document.body.classList.add('sheet-open'); } catch (e) {}
      setWalk(layer || 'body', idx || 0);
    },
    close() {
      root.classList.remove('open');
      try { document.body.classList.remove('sheet-open'); } catch (e) {}
    },
    isOpen() { return root.classList.contains('open'); },
    setSub(text) { el.sub.textContent = text || ''; },
    /* DOLL DRAW hands its brush here so both share one ink + size */
    syncBrush() {
      st.ink = cfg.ink();
      st.size = cfg.brush();
      if (cfg.getTool) {
        st.tool = cfg.getTool();
        el.tools.forEach(function (button) {
          const selected = button.getAttribute('data-tool') === st.tool;
          button.classList.toggle('on', selected);
          button.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
      }
      refreshInks();
      el.sizeV.textContent = st.size + 'px';
    },
    setTool(t) {
      setTool(t);
    },
    setLocked: setLocked,
    /* the walkthrough, driven from outside too (auto-advance on the doll) */
    layerOf(keyK) { return keyK.split(':')[0]; },
    stepKey: key,
    nextWalk: nextWalk,
    prevWalk: prevWalk,
    walk: walk,
    get activeKey() { return activeKey; },
    surface: surf,
    draw: draw,
    st: st,
    dollBtn: el.dollBtn
  };
  return api;
}
