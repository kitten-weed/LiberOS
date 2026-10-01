/* Paint utilities: proper scanline flood fill, lazy-nezumi input smoothing,
   and the expanded painting overlay (bigger canvas, same tools, same inks).
   Shared by the lab desk view and the overlay painter. */

/* ── lazy-nezumi smoothing: the cursor is the intent, the brush lags behind ── */
export function makeLazyBrush(opts) {
  const o = opts || {};
  return {
    x: null, y: null,
    has: false,
    pos(x, y, dt) {
      const k = 1 - Math.exp(-dt / (o.laziness || 0.14));   // frame-rate independent ease
      if (!this.has) { this.x = x; this.y = y; this.has = true; return { x: this.x, y: this.y, jump: true }; }
      this.x += (x - this.x) * k;
      this.y += (y - this.y) * k;
      return { x: this.x, y: this.y, jump: false };
    },
    reset() { this.has = false; this.x = this.y = null; }
  };
}

/* stamp a soft-edged round daub */
export function daub(ctx, x, y, r, color, hardness) {
  const rr = Math.max(0.5, r);
  const cv = ctx.canvas;
  if (rr <= 2.5) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const S = Math.ceil(rr * 2) + 2;
  if (S > cv.width || S > cv.height) { ctx.fillStyle = color; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2); return; }
  const c2 = document.createElement('canvas');
  c2.width = c2.height = S;
  const g = c2.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, rr * (hardness !== undefined ? hardness : 0.55), S / 2, S / 2, rr);
  gr.addColorStop(0, color);
  gr.addColorStop(1, 'transparent');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(S / 2, S / 2, rr, 0, Math.PI * 2);
  g.fill();
  ctx.drawImage(c2, x - S / 2, y - S / 2);
}

/* even spacing between stamps along a segment */
export function spacedStamps(fromX, fromY, toX, toY, step) {
  const dx = toX - fromX, dy = toY - fromY;
  const d = Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(d / (step || 2)));
  const out = [];
  for (let i = 1; i <= n; i++) out.push({ x: fromX + dx * i / n, y: fromY + dy * i / n });
  return out;
}

/* ── a real flood fill: scanline seed fill with tolerance, on raw pixels ── */
export function floodFillAt(ctx, sx, sy, hex, tolerance) {
  const cv = ctx.canvas;
  const w = cv.width, h = cv.height;
  sx = Math.floor(sx); sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return false;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const idx = (sy * w + sx) * 4;
  const tr = d[idx], tg = d[idx + 1], tb = d[idx + 2], ta = d[idx + 3];
  const nr = parseInt(hex.slice(1, 3), 16), ng = parseInt(hex.slice(3, 5), 16), nb = parseInt(hex.slice(5, 7), 16);
  if (Math.abs(tr - nr) + Math.abs(tg - ng) + Math.abs(tb - nb) < 6 && Math.abs(ta - 255) < 6) return false;
  const tol = (tolerance !== undefined ? tolerance : 40);
  const tol2 = tol * tol * 3;
  const seen = new Uint8Array(w * h);
  const stack = [sy * w + sx];
  seen[sy * w + sx] = 1;
  let touched = 0;
  while (stack.length) {
    const p = stack.pop();
    const py = (p / w) | 0, px0 = p - py * w;
    // walk the span left/right
    let l = px0, r = px0;
    const rowOff = py * w * 4;
    while (l > 0 && match(l - 1 + py * w)) l--;
    while (r < w - 1 && match(r + 1 + py * w)) r++;
    for (let x = l; x <= r; x++) {
      const o = (rowOff + x * 4) | 0;
      d[o] = nr; d[o + 1] = ng; d[o + 2] = nb; d[o + 3] = 255;
      touched++;
      if (py > 0 && !seen[p - w] && match(p - w)) { seen[p - w] = 1; stack.push(p - w); }
      if (py < h - 1 && !seen[p + w] && match(p + w)) { seen[p + w] = 1; stack.push(p + w); }
    }
  }
  function match(p) {
    const o = p * 4;
    const dr = d[o] - tr, dg = d[o + 1] - tg, db = d[o + 2] - tb, da = d[o + 3] - ta;
    return dr * dr + dg * dg + db * db + da * da * 0.25 <= tol2;
  }
  if (touched) ctx.putImageData(img, 0, 0);
  return touched > 0;
}

/* keep fills inside one atlas panel (so woad never escapes the arm into the floor) */
export function floodFillRegionAt(ctx, sx, sy, hex, regionRect, tolerance) {
  const cv = ctx.canvas;
  const x0 = Math.floor(regionRect[0] * cv.width), y0 = Math.floor(regionRect[1] * cv.height);
  const x1 = Math.floor((regionRect[0] + regionRect[2]) * cv.width);
  const y1 = Math.floor((regionRect[1] + regionRect[3]) * cv.height);
  sx = Math.floor(sx); sy = Math.floor(sy);
  if (sx < x0 || sy < y0 || sx >= x1 || sy >= y1) {
    // seed outside the rect: clamp it in, fill still bounded
    sx = Math.max(x0, Math.min(x1 - 1, sx));
    sy = Math.max(y0, Math.min(y1 - 1, sy));
  }
  const tmp = document.createElement('canvas');
  tmp.width = x1 - x0; tmp.height = y1 - y0;
  const tg = tmp.getContext('2d', { willReadFrequently: true });
  tg.drawImage(cv, x0, y0, tmp.width, tmp.height, 0, 0, tmp.width, tmp.height);
  const ok = floodFillAt(tg, sx - x0, sy - y0, hex, tolerance);
  if (!ok) return false;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, tmp.width, tmp.height);
  ctx.clip();
  ctx.drawImage(tmp, x0, y0);
  ctx.restore();
  return true;
}

/* hex → rgba color utils shared with the overlay picker */
export function hexInk(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return alpha === undefined ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

/* ── the expanded painting overlay ── */
export function buildExpandedPainter(mount, cfg) {
  const root = document.createElement('div');
  root.className = 'painter-root';
  root.innerHTML =
    '<div class="painter-card">' +
    '<div class="painter-head"><b>EXPANDED PAINTING</b><span id="painter-sub"></span><button type="button" class="painter-x" title="close">×</button></div>' +
    '<div class="painter-body">' +
    '<div class="painter-side">' +
    '<div class="painter-tabs">' +
    '<button type="button" data-tab="body" class="on">BODY</button>' +
    '<button type="button" data-tab="cloth">CLOTH</button>' +
    '</div>' +
    '<div class="painter-sec">INKS</div>' +
    '<div class="painter-inks"></div>' +
    '<div class="painter-sec">TOOLS</div>' +
    '<div class="painter-tools">' +
    '<button type="button" data-tool="brush" class="on">◆ BRUSH</button>' +
    '<button type="button" data-tool="bucket">◈ FILL</button>' +
    '<button type="button" data-tool="erase">◌ LIFT</button>' +
    '</div>' +
    '<div class="painter-sec">BRUSH <span class="painter-size-v"></span></div>' +
    '<input type="range" class="painter-size" min="2" max="48" value="10" step="1"/>' +
    '<div class="painter-sec">LAZINESS <span class="painter-lazy-v"></span></div>' +
    '<input type="range" class="painter-lazy" min="0" max="100" value="35" step="1"/>' +
    '<div class="painter-sec">TOLERANCE <span class="painter-tol-v"></span></div>' +
    '<input type="range" class="painter-tol" min="4" max="140" value="40" step="2"/>' +
    '<div class="painter-actions">' +
    '<button type="button" class="painter-undo">↶ UNDO</button>' +
    '<button type="button" class="painter-clear">WASH PANEL</button>' +
    '</div>' +
    '</div>' +
    '<div class="painter-stage"><canvas class="painter-cv" width="1024" height="1024"></canvas></div>' +
    '</div>' +
    '</div>';
  mount.appendChild(root);

  const el = {
    root, sub: root.querySelector('#painter-sub'),
    tabs: Array.prototype.slice.call(root.querySelectorAll('[data-tab]')),
    inks: root.querySelector('.painter-inks'),
    tools: Array.prototype.slice.call(root.querySelectorAll('[data-tool]')),
    size: root.querySelector('.painter-size'), sizeV: root.querySelector('.painter-size-v'),
    lazy: root.querySelector('.painter-lazy'), lazyV: root.querySelector('.painter-lazy-v'),
    tol: root.querySelector('.painter-tol'), tolV: root.querySelector('.painter-tol-v'),
    undo: root.querySelector('.painter-undo'), clear: root.querySelector('.painter-clear'),
    cv: root.querySelector('.painter-cv'),
    x: root.querySelector('.painter-x')
  };
  el.ctx = el.cv.getContext('2d', { willReadFrequently: true });

  const state = {
    tab: 'body', tool: 'brush', ink: cfg.inks[0].hex,
    size: 10, lazy: 0.35, tol: 40,
    lazyBrush: makeLazyBrush({ laziness: 0.35 }),
    painting: false, last: null,
    undoStack: []
  };
  const CREAM = cfg.cream;   // panels come from cfg.panels, assigned once the doll exists

  function currentCtx() { return state.tab === 'cloth' ? cfg.getClothCtx() : cfg.getBodyCtx(); }
  function currentTex() { return state.tab === 'cloth' ? cfg.getClothTex() : cfg.getBodyTex(); }

  function pushUndo() {
    const cv = currentCtx().canvas;
    state.undoStack.push({ tab: state.tab, data: currentCtx().getImageData(0, 0, cv.width, cv.height) });
    if (state.undoStack.length > 5) state.undoStack.shift();
  }
  function undo() {
    const u = state.undoStack.pop();
    if (!u) return;
    if (u.tab === 'cloth') cfg.getClothCtx().putImageData(u.data, 0, 0); else cfg.getBodyCtx().putImageData(u.data, 0, 0);
    currentTex().needsUpdate = true;
    redraw();
  }

  function redraw() {
    const src = currentCtx().canvas;
    el.ctx.clearRect(0, 0, 1024, 1024);
    // fit the source canvas (atlas 1024² or cloth 256×192) square in the view
    const fit = Math.min(1024 / src.width, 1024 / src.height);
    const dw = src.width * fit, dh = src.height * fit;
    const ox = (1024 - dw) / 2, oy = (1024 - dh) / 2;
    el.ctx.fillStyle = '#efe6cd';
    el.ctx.fillRect(ox, oy, dw, dh);
    el.ctx.drawImage(src, ox, oy, dw, dh);
    if (state.tab === 'body') {
      el.ctx.strokeStyle = 'rgba(90, 66, 34, 0.5)';
      el.ctx.lineWidth = 2;
      el.ctx.font = '600 26px Germania, Georgia, serif';
      el.ctx.fillStyle = 'rgba(90, 66, 34, 0.62)';
      Object.keys(cfg.panels || {}).forEach(function (k) {
        const r = cfg.panels[k];
        el.ctx.strokeRect(r[0] * 1024, r[1] * 1024, r[2] * 1024, r[3] * 1024);
        el.ctx.fillText(k.replace(/b$/, ''), r[0] * 1024 + 8, r[1] * 1024 + 30);
      });
    }
  }

  /* pointer → source-canvas pixels (accounting for the fit letterbox) */
  function pos(e) {
    const src = currentCtx().canvas;
    const fit = Math.min(1024 / src.width, 1024 / src.height);
    const dw = src.width * fit, dh = src.height * fit;
    const ox = (1024 - dw) / 2, oy = (1024 - dh) / 2;
    const r = el.cv.getBoundingClientRect();
    const vx = (e.clientX - r.left) / r.width * 1024, vy = (e.clientY - r.top) / r.height * 1024;
    return { x: (vx - ox) / fit, y: (vy - oy) / fit };
  }
  function panelAt(x, y) {
    const u = x / currentCtx().canvas.width, v = y / currentCtx().canvas.height;
    const keys = Object.keys(cfg.panels || {});
    for (let i = 0; i < keys.length; i++) {
      const r = cfg.panels[keys[i]];
      if (u >= r[0] && u <= r[0] + r[2] && v >= r[1] && v <= r[1] + r[3]) return keys[i];
    }
    return null;
  }

  el.cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    try { el.cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers have no capture */ }
    const p = pos(e);
    if (state.tool === 'bucket') {
      pushUndo();
      const reg = state.tab === 'body' ? panelAt(p.x, p.y) : null;
      const rect = reg ? cfg.panels[reg] : [0, 0, 1, 1];
      floodFillRegionAt(currentCtx(), p.x, p.y, state.ink, rect, state.tol);
      currentTex().needsUpdate = true;
      redraw();
      if (cfg.onchange) cfg.onchange('fill', reg);
      return;
    }
    pushUndo();
    state.lazyBrush.reset();
    const q = state.lazyBrush.pos(p.x, p.y, 1);
    if (state.tool === 'erase') {
      const ctx = currentCtx();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(q.x, q.y, state.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      daub(currentCtx(), q.x, q.y, state.size / 2, state.ink);
    }
    currentTex().needsUpdate = true;
    redraw();
    state.painting = true;
    state.last = q;
  });
  el.cv.addEventListener('pointermove', function (e) {
    if (!state.painting) return;
    const p = pos(e);
    const q = state.lazyBrush.pos(p.x, p.y, 1 / 60);
    if (state.tool === 'erase') {
      const ctx = currentCtx();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      spacedStamps(state.last.x, state.last.y, q.x, q.y, state.size / 3).forEach(function (s) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, state.size / 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    } else {
      spacedStamps(state.last.x, state.last.y, q.x, q.y, Math.max(1, state.size / 5)).forEach(function (s) {
        daub(currentCtx(), s.x, s.y, state.size / 2, state.ink);
      });
    }
    currentTex().needsUpdate = true;
    redraw();
    state.last = q;
  });
  window.addEventListener('pointerup', function () {
    if (state.painting) { state.painting = false; if (cfg.onchange) cfg.onchange('stroke', null); }
  });

  function refreshInkSel() {
    el.inks.querySelectorAll('.ink-dot').forEach(function (d) {
      d.classList.toggle('on', d.getAttribute('data-ink') === state.ink);
    });
  }
  cfg.inks.forEach(function (ink) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ink-dot' + (ink.hex === state.ink ? ' on' : '');
    b.style.background = ink.hex;
    b.title = ink.name;
    b.setAttribute('data-ink', ink.hex);
    b.addEventListener('click', function () { state.ink = ink.hex; refreshInkSel(); });
    el.inks.appendChild(b);
  });
  el.tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      state.tab = t.getAttribute('data-tab');
      el.tabs.forEach(function (t2) { t2.classList.toggle('on', t2 === t); });
      state.undoStack = state.undoStack.filter(function (u) { return u.tab === state.tab; });
      redraw();
    });
  });
  el.tools.forEach(function (t) {
    t.addEventListener('click', function () {
      state.tool = t.getAttribute('data-tool');
      el.tools.forEach(function (t2) { t2.classList.toggle('on', t2 === t); });
    });
  });
  el.size.addEventListener('input', function () { state.size = +el.size.value; el.sizeV.textContent = state.size + 'px'; });
  el.lazy.addEventListener('input', function () {
    state.lazy = +el.lazy.value / 100;
    state.lazyBrush = makeLazyBrush({ laziness: Math.max(0.01, state.lazy * 0.4) });
    el.lazyV.textContent = el.lazy.value + '%';
  });
  el.tol.addEventListener('input', function () { state.tol = +el.tol.value; el.tolV.textContent = state.tol; });
  el.undo.addEventListener('click', undo);
  el.clear.addEventListener('click', function () {
    pushUndo();
    const ctx = currentCtx();
    if (state.tab === 'cloth') cfg.fillCloth(state.ink); else cfg.fillBody();
    currentTex().needsUpdate = true;
    redraw();
    if (cfg.onchange) cfg.onchange('wash', null);
  });
  el.x.addEventListener('click', function () { api.close(); });

  /* live mirror: keep the overlay canvas in sync when the desk paints too */
  let mirrorTimer = 0;
  const api = {
    open(tab) {
      if (tab) { state.tab = tab; el.tabs.forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-tab') === tab); }); }
      root.classList.add('open');
      state.undoStack = [];
      redraw();
    },
    close() { root.classList.remove('open'); },
    isOpen() { return root.classList.contains('open'); },
    setSub(s) { el.sub.textContent = s || ''; },
    tick(dt) {
      mirrorTimer -= dt;
      if (mirrorTimer <= 0) { mirrorTimer = 0.25; if (root.classList.contains('open')) redraw(); }
    },
    setPanels(p) { cfg.panels = p; },
    setInk(hex) { state.ink = hex; refreshInkSel(); },
    setSize(px) { state.size = px; el.size.value = px; el.sizeV.textContent = px + 'px'; },
    get state() { return state; }
  };
  return api;
}
