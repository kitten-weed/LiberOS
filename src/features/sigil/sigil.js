// sigil.js — the Poppet room (Mistress Physius keeps the ritual).
// Four doors, four canvases, one layered self. No shared imports.
//
// Port of liberdev/poppet-pitch.html's working engine: LAYERS/ORDER/ARCH,
// per-door palettes, hand-jittered stitched strokes, dotted template guide
// (never saves), fixed guide alphas, blind others-door (glow only), live
// stack composite + dreams-see-it toggle + quadrant icon ledger, per-door
// tags (BUDDY_TAGS), door-dimension binds, save gated on all-four-kept,
// discard wipes all four, name inherited from travellerAlias.
//
// The old single-canvas stone stays readable as an outline-only ancestor:
// stones with no layers read as { outline } pieces. Smoke step 13 drives
// the outline door's selectors directly (.sigil-input, palette tray,
// .sigil-canvas, #sigil-save, #sigil-save-prompt-keep), so those ids and
// classes are kept on the outline canvas — the Poppet wears the stone's
// hooks, not the other way round.

(function () {
  var activeElement = 'earth';
  var canvas = document.querySelector('.sigil-canvas');
  var cursor = document.getElementById('sigil-cursor');
  var wrap = document.querySelector('.sigil-canvas-wrap');
  var ctx = null;
  var drawing = false;
  var last = null;
  var cursorVisible = false;
  var currentId = null;
  var replaceMode = false;
  var ghostLoaded = false;

  var GLYPHS = {
    air:    '<svg viewBox="0 0 24 24"><path d="M2 8h12a3 3 0 1 0-3-3M2 14h16a3 3 0 1 1-3 3M2 11h9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    water:  '<svg viewBox="0 0 24 24"><path d="M12 2c-4 6-7 10-7 14a7 7 0 0 0 14 0c0-4-3-8-7-14z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    fire:   '<svg viewBox="0 0 24 24"><path d="M12 2c2 4 0 6 2 8s4 2 4 6a6 6 0 0 1-12 0c0-3 2-4 3-7s1-4 3-7z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    earth:  '<svg viewBox="0 0 24 24"><path d="M3 18l5-9 4 6 3-4 6 7H3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    spirit: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 2"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };

  var STROKES = {
    air:    { color: 'rgba(168, 200, 216, 0.85)', width: 1.4, jitter: 0.4 },
    water:  { color: 'rgba(104, 144, 176, 0.85)', width: 2.0, jitter: 0.8 },
    fire:   { color: 'rgba(216, 144, 96, 0.95)',  width: 1.6, jitter: 0.6 },
    earth:  { color: 'rgba(138, 112, 80, 0.9)',   width: 2.4, jitter: 0.3 },
    spirit: { color: 'rgba(232, 200, 160, 1.0)',  width: 1.0, jitter: 1.2 }
  };

  var INKS = [
    { name: 'High Spirituality', hex: '#B4B4D2' },
    { name: 'Religious Feeling, tinged with Fear', hex: '#2E2E6E' },
    { name: 'Sympathy', hex: '#79B879' },
    { name: 'Adaptability', hex: '#7A7A3C' },
    { name: 'Selfishness', hex: '#6B5B4B' },
    { name: 'Devotion mixed with Affection', hex: '#9FA8C2' },
    { name: 'Highest Intellect', hex: '#F2F200' },
    { name: 'Love for Humanity', hex: '#BE8FBE' },
    { name: 'Jealousy', hex: '#6B4A2E' },
    { name: 'Avarice', hex: '#8C8C8C' },
    { name: 'Devotion to a Noble Ideal', hex: '#6E92D6' },
    { name: 'Strong Intellect', hex: '#E09320' },
    { name: 'Unselfish Affection', hex: '#E28292' },
    { name: 'Deceit', hex: '#8A9077' },
    { name: 'Anger', hex: '#C02424' },
    { name: 'Pure Religious Feeling', hex: '#2440C4' },
    { name: 'Low type of Intellect', hex: '#A06224' },
    { name: 'Selfish Affection', hex: '#4E2424' },
    { name: 'Fear', hex: '#B2B2C2' },
    { name: 'Sensuality', hex: '#92605C' },
    { name: 'Selfish Religious Feeling', hex: '#121A24' },
    { name: 'Pride', hex: '#E04414' },
    { name: 'Pure Affection', hex: '#E22424' },
    { name: 'Depression', hex: '#3B3448' },
    { name: 'Malice', hex: '#0B0B0B' }
  ];

  var activeTool = 'brush';
  var activeInk = INKS[0].hex;
  var activeInkName = INKS[0].name;
  var armedPart = null;
  var undoStack = [];
  var shapeAnchor = null;
  var shapeSnap = null;

  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function pushUndo() {
    if (!canvas) return;
    try {
      undoStack.push(canvas.toDataURL('image/png'));
      if (undoStack.length > 20) undoStack.shift();
      var u = document.getElementById('sigil-undo');
      if (u) u.classList.remove('spent');
    } catch (e) {}
  }

  function doUndo() {
    if (!ctx || !undoStack.length) return;
    var prev = undoStack.pop();
    var img = new Image();
    img.onload = function () {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    };
    img.src = prev;
    if (!undoStack.length) {
      var u = document.getElementById('sigil-undo');
      if (u) u.classList.add('spent');
    }
    if (window.Liber && window.Liber.sound) window.Liber.sound.play('thunk');
  }

  function setTool(t) {
    activeTool = t;
    armedPart = null;
    var btns = document.querySelectorAll('.sigil-tool[data-tool]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-tool') === t;
      btns[i].classList.toggle('active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    var parts = document.querySelectorAll('.sigil-part');
    for (var j = 0; j < parts.length; j++) parts[j].classList.remove('armed');
    if (wrap) wrap.classList.remove('armed');
    benchMaterial('material_tool', { tool: t }, t.length);
  }

  function setInk(idx) {
    var ink = INKS[idx] || INKS[0];
    activeInk = ink.hex;
    activeInkName = ink.name;
    var tray = document.querySelectorAll('.sigil-swatch');
    for (var i = 0; i < tray.length; i++) {
      tray[i].classList.toggle('active', i === idx);
    }
    var name = document.getElementById('sigil-ink-name');
    if (name) name.textContent = ink.name.toLowerCase();
    if (cursor) cursor.style.color = ink.hex;
    benchMaterial('material_ink', { ink: ink.name.toLowerCase() }, idx);
  }

  function buildPalette() {
    var tray = document.getElementById('sigil-palette-tray');
    if (!tray) return;
    tray.innerHTML = '';
    for (var i = 0; i < INKS.length; i++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sigil-swatch';
        b.style.background = INKS[n].hex;
        b.title = INKS[n].name;
        b.setAttribute('aria-label', 'ink: ' + INKS[n].name);
        b.addEventListener('click', function () { setInk(n); });
        tray.appendChild(b);
      })(i);
    }
    setInk(0);
  }

  function drawShape(kind, x0, y0, x1, y1) {
    if (!ctx) return;
    var x = Math.min(x0, x1), y = Math.min(y0, y1);
    var w = Math.max(Math.abs(x1 - x0), 4), h = Math.max(Math.abs(y1 - y0), 4);
    ctx.strokeStyle = activeInk;
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (kind === 'square') {
      ctx.rect(x, y, w, h);
    } else if (kind === 'circle') {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (kind === 'triangle') {
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
    } else if (kind === 'spiral') {
      var cx = x + w / 2, cy = y + h / 2;
      var maxR = Math.min(w, h) / 2, turns = 3, steps = 72;
      for (var i = 0; i <= steps; i++) {
        var a = (i / steps) * turns * Math.PI * 2;
        var r = (i / steps) * maxR;
        var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  function drawStamp(kind, x, y) {
    if (!ctx) return;
    var s = 46, h = s / 2;
    ctx.strokeStyle = activeInk;
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (kind === 'eye') {
      ctx.moveTo(x - h, y);
      ctx.quadraticCurveTo(x, y - h * 0.9, x + h, y);
      ctx.quadraticCurveTo(x, y + h * 0.9, x - h, y);
      ctx.moveTo(x + 8, y);
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.moveTo(x - 14, y - 14);
      ctx.lineTo(x - 18, y - 20);
      ctx.moveTo(x + 14, y - 14);
      ctx.lineTo(x + 18, y - 20);
    } else if (kind === 'moon') {
      ctx.arc(x, y, h * 0.8, Math.PI * 0.25, Math.PI * 1.75);
      ctx.quadraticCurveTo(x + h * 0.5, y, x + Math.cos(Math.PI * 0.25) * h * 0.8, y - Math.sin(Math.PI * 0.25) * h * 0.8);
      ctx.closePath();
    } else if (kind === 'hand') {
      ctx.arc(x, y + 6, 11, 0, Math.PI * 2);
      ctx.moveTo(x - 8, y + 2); ctx.lineTo(x - 11, y - 14);
      ctx.moveTo(x - 3, y); ctx.lineTo(x - 4, y - 18);
      ctx.moveTo(x + 3, y); ctx.lineTo(x + 4, y - 18);
      ctx.moveTo(x + 8, y + 2); ctx.lineTo(x + 11, y - 14);
      ctx.moveTo(x + 10, y + 8); ctx.lineTo(x + 17, y + 2);
    } else if (kind === 'star') {
      for (var i = 0; i <= 10; i++) {
        var a = -Math.PI / 2 + (i * Math.PI) / 5;
        var r = (i % 2 === 0) ? h : h * 0.45;
        var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (kind === 'frame') {
      ctx.arc(x, y, h * 0.8, 0, Math.PI * 2);
      ctx.moveTo(x + h * 0.4, y);
      ctx.arc(x, y, h * 0.4, 0, Math.PI * 2);
      for (var k = 0; k < 12; k++) {
        var ta = (k / 12) * Math.PI * 2;
        ctx.moveTo(x + Math.cos(ta) * h * 0.8, y + Math.sin(ta) * h * 0.8);
        ctx.lineTo(x + Math.cos(ta) * (h * 0.8 + 5), y + Math.sin(ta) * (h * 0.8 + 5));
      }
    }
    ctx.stroke();
  }

  function floodFill(sx, sy, hex) {
    if (!ctx || !canvas) return;
    var rect = canvas.getBoundingClientRect();
    var kx = canvas.width / rect.width, ky = canvas.height / rect.height;
    var x0 = Math.floor(sx * kx), y0 = Math.floor(sy * ky);
    var W = canvas.width, H = canvas.height;
    var img = ctx.getImageData(0, 0, W, H);
    var d = img.data;
    function at(x, y) { return (y * W + x) * 4; }
    if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return;
    var si = at(x0, y0);
    var tr = d[si], tg = d[si + 1], tb = d[si + 2], ta = d[si + 3];
    var c = hexToRgb(hex);
    var tol = 48;
    function match(i) {
      return Math.abs(d[i] - tr) <= tol && Math.abs(d[i + 1] - tg) <= tol &&
             Math.abs(d[i + 2] - tb) <= tol && Math.abs(d[i + 3] - ta) <= tol;
    }
    if (tr === c.r && tg === c.g && tb === c.b && ta === 255) return;
    var stack = [[x0, y0]];
    var guard = W * H;
    while (stack.length && guard-- > 0) {
      var pt = stack.pop(), x = pt[0], y = pt[1];
      var nx = x;
      while (nx >= 0 && match(at(nx, y))) nx--;
      nx++;
      var up = false, down = false;
      while (nx < W && match(at(nx, y))) {
        var i2 = at(nx, y);
        d[i2] = c.r; d[i2 + 1] = c.g; d[i2 + 2] = c.b; d[i2 + 3] = 255;
        if (y > 0) {
          if (match(at(nx, y - 1))) { if (!up) { stack.push([nx, y - 1]); up = true; } }
          else up = false;
        }
        if (y < H - 1) {
          if (match(at(nx, y + 1))) { if (!down) { stack.push([nx, y + 1]); down = true; } }
          else down = false;
        }
        nx++;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function setActive(el) {
    activeElement = el;
    var btns = document.querySelectorAll('.sigil-element');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-element') === el) {
        btns[i].classList.add('active');
      } else {
        btns[i].classList.remove('active');
      }
    }
    cursor.setAttribute('data-element', el);
    cursor.innerHTML = GLYPHS[el];
  }

  var fitW = 0, fitH = 0;

  function initCanvas() {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fitW = rect.width;
    fitH = rect.height;
  }

  function refitCanvas() {
    if (!canvas || !ctx) return;
    var rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    if (Math.abs(fitW - rect.width) < 2 && Math.abs(fitH - rect.height) < 2) return;
    var keep = null;
    try { keep = canvas.toDataURL('image/png'); } catch (e) {}
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var oldW = fitW || rect.width, oldH = fitH || rect.height;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fitW = rect.width;
    fitH = rect.height;
    undoStack = [];
    var u = document.getElementById('sigil-undo');
    if (u) u.classList.add('spent');
    if (!keep) return;
    var img = new Image();
    img.onload = function () {
      var sc = Math.min(rect.width / oldW, rect.height / oldH, 1);
      var dw = oldW * sc, dh = oldH * sc;
      ctx.save();
      ctx.drawImage(img, 0, 0, img.width, img.height, (rect.width - dw) / 2, (rect.height - dh) / 2, dw, dh);
      ctx.restore();
    };
    img.src = keep;
  }

  var refitTimer = null;
  window.addEventListener('resize', function () {
    if (refitTimer) clearTimeout(refitTimer);
    refitTimer = setTimeout(refitCanvas, 200);
  });
  window.addEventListener('load', function () {
    setTimeout(refitCanvas, 400);
  });

  function pos(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e) {
    var p = pos(e);
    if (armedPart) {
      pushUndo();
      drawStamp(armedPart, p.x, p.y);
      armedPart = null;
      var parts = document.querySelectorAll('.sigil-part');
      for (var i = 0; i < parts.length; i++) parts[i].classList.remove('armed');
      if (wrap) wrap.classList.remove('armed');
      if (window.Liber && window.Liber.sound) window.Liber.sound.play('thunk');
      shedDust(3);
      stillWatch();
      return;
    }
    if (activeTool === 'bucket') {
      pushUndo();
      floodFill(p.x, p.y, activeInk);
      if (window.Liber && window.Liber.sound) window.Liber.sound.play('thunk');
      shedDust(3);
      stillWatch();
      return;
    }
    if (activeTool === 'triangle' || activeTool === 'circle' || activeTool === 'spiral' || activeTool === 'square') {
      try { shapeSnap = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch (err) { shapeSnap = null; }
      shapeAnchor = p;
      drawing = true;
      return;
    }
    pushUndo();
    drawing = true;
    last = p;
    stillWatch();
  }

  function move(e) {
    if (!cursorVisible) {
      cursor.classList.add('visible');
      cursorVisible = true;
    }
    var p = pos(e);
    cursor.style.left = p.x + 'px';
    cursor.style.top = p.y + 'px';
    stillWatch();

    if (!drawing || !ctx) return;
    if (shapeAnchor && shapeSnap) {
      ctx.putImageData(shapeSnap, 0, 0);
      ctx.save();
      ctx.setLineDash([4, 3]);
      drawShape(activeTool, shapeAnchor.x, shapeAnchor.y, p.x, p.y);
      ctx.restore();
      last = p;
      return;
    }
    var s = STROKES[activeElement];
    var j = s.jitter;
    ctx.strokeStyle = activeInk;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x + (Math.random() - 0.5) * j, last.y + (Math.random() - 0.5) * j);
    ctx.lineTo(p.x + (Math.random() - 0.5) * j, p.y + (Math.random() - 0.5) * j);
    ctx.stroke();

    if (activeElement === 'spirit' && Math.random() < 0.3) {
      ctx.fillStyle = 'rgba(232, 200, 160, 0.4)';
      ctx.beginPath();
      ctx.arc(p.x + (Math.random() - 0.5) * 8, p.y + (Math.random() - 0.5) * 8, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    last = p;
  }

  function end() {
    if (shapeAnchor && shapeSnap && last) {
      ctx.putImageData(shapeSnap, 0, 0);
      drawShape(activeTool, shapeAnchor.x, shapeAnchor.y, last.x, last.y);
      shapeAnchor = null;
      shapeSnap = null;
    }
    var drew = drawing;
    drawing = false;
    last = null;
    if (drew) shedDust(2);
    stillWatch();
  }

  function leave() {
    cursor.classList.remove('visible');
    cursorVisible = false;
    if (shapeAnchor && shapeSnap && ctx) {
      try { ctx.putImageData(shapeSnap, 0, 0); } catch (e) {}
    }
    drawing = false;
    shapeAnchor = null;
    shapeSnap = null;
    stillWatch();
  }

  // ── the bench · ROOM 01's four wired contexts ─────────────────────────
  // While you work, the lamp comments: the typed intention, the material
  // you change, a hand that has stopped moving, and the save. All four go
  // through liberchat's bench surface, so every line lives in the persona
  // register (data/personas.data.js) and none of it is prose in this file.
  var benchArmed = false;     // no commentary before the room is live
  var HESITATE_MS = 6000;
  var MATERIAL_GAP_MS = 4200; // material picks come in bursts; one voice
  var lastMaterialAt = 0;
  var stillTimer = null;
  var stillSpoken = false;

  function lamp() { return window.LiberLiberchat || null; }

  function benchSay(key, vars, seed) {
    if (!benchArmed) return false;
    var lc = lamp();
    if (!lc || !lc.benchSay) return false;
    return lc.benchSay(key, vars, seed);
  }

  function benchMaterial(key, vars, seed) {
    var now = Date.now();
    if (now - lastMaterialAt < MATERIAL_GAP_MS) return false;
    var said = benchSay(key, vars, seed);
    if (said) lastMaterialAt = now;
    return said;
  }

  // a hand that stops moving over the stone gets one line — not a nag
  function stillWatch() {
    if (stillTimer) { clearTimeout(stillTimer); stillTimer = null; }
    stillSpoken = false;
    if (!benchArmed || !cursorVisible) return;
    stillTimer = setTimeout(function () {
      stillTimer = null;
      if (stillSpoken || !cursorVisible || drawing) return;
      stillSpoken = true;
      benchSay('hesitation', null, (Date.now() / 1000) | 0);
    }, HESITATE_MS);
  }

  function armIntentionBench() {
    var input = document.querySelector('.sigil-input');
    if (!input) return;
    var timer = null;
    var lastSaid = '';
    function settle() {
      var text = String(input.innerText == null ? '' : input.innerText).replace(/\s+/g, ' ').trim();
      if (text.length < 3 || text === lastSaid) return;
      lastSaid = text;
      var clip = text.length > 58 ? text.slice(0, 55).replace(/\s+\S*$/, '') + '…' : text;
      var seed = 0;
      for (var i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
      benchSay('intention', { text: clip }, seed);
    }
    input.addEventListener('input', function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(settle, 1400);
    });
    input.addEventListener('blur', function () {
      if (timer) { clearTimeout(timer); timer = null; }
      settle();
    });
  }

  // ── the dust tray ─────────────────────────────────────────────────────
  // Every mark leaves grit. It gathers in the tray for the length of the
  // sitting and is deliberately not persisted — the tray is swept when
  // you leave the bench. `--grit` is the tray's own gauge: the room's CSS
  // reads it for the baseline density, hover reveals the grains.
  var DUST_MAX = 64;
  var dustCount = 0;

  function shedDust(n) {
    var tray = document.querySelector('.sigil-dust');
    if (!tray) return;
    if (!tray.getAttribute('data-tray')) {
      tray.setAttribute('data-tray', '1');
      tray.setAttribute('aria-hidden', 'true');
    }
    for (var i = 0; i < n; i++) {
      if (dustCount >= DUST_MAX) break;
      var g = document.createElement('span');
      g.className = 'sigil-dust-grain';
      var a = Math.random() * Math.PI * 2;
      var r = 16 + Math.random() * 44;
      g.style.left = (50 + Math.cos(a) * r).toFixed(1) + '%';
      g.style.top = (50 + Math.sin(a) * r * 0.6).toFixed(1) + '%';
      g.style.setProperty('--grain', (0.6 + Math.random() * 1.4).toFixed(2));
      g.style.setProperty('--tilt', (Math.random() * 180).toFixed(0) + 'deg');
      tray.appendChild(g);
      dustCount++;
    }
    tray.style.setProperty('--grit', (dustCount / DUST_MAX).toFixed(3));
    tray.setAttribute('data-grains', String(dustCount));
  }

  var savePromptEl = null;
  var savePromptBodyEl = null;
  var pendingAction = null;

  function openSavePrompt(bodyText, onKeep, onDiscard) {
    if (!savePromptEl) savePromptEl = document.getElementById('sigil-save-prompt');
    if (!savePromptBodyEl) savePromptBodyEl = document.getElementById('sigil-save-prompt-body');
    if (!savePromptEl) return;
    if (savePromptBodyEl) savePromptBodyEl.textContent = bodyText;
    pendingAction = { keep: onKeep, discard: onDiscard };
    savePromptEl.classList.add('open');
    savePromptEl.removeAttribute('inert');
  }

  function closeSavePrompt() {
    if (!savePromptEl) return;
    savePromptEl.classList.remove('open');
    savePromptEl.setAttribute('inert', '');
    pendingAction = null;
  }

function loadGhost(bitmapDataUrl) {
    if (!bitmapDataUrl || !ctx) return;
    var img = new Image();
    img.onload = function () {
      // The ghost always returns at the same visible size: fitted inside
      // the canvas with aspect preserved and centered, never cropped,
      // never stretched, never blown up.
      var cw = canvas.width / 2, ch = canvas.height / 2;
      var sc = Math.min(cw / img.width, ch / img.height, 1);
      var dw = img.width * sc, dh = img.height * sc;
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      ctx.restore();
      ghostLoaded = true;
      // Persist the original bitmap dimensions for the desktop overlay.
      try {
        var cur = (window.Liber && window.Liber.state) ? window.Liber.state.get() : {};
        cur._sigilGhostDims = { w: img.width, h: img.height };
        if (window.Liber && window.Liber.state && window.Liber.state.set) {
          window.Liber.state.set(cur);
        }
      } catch (e) {}
    };
    img.src = bitmapDataUrl;
  }

  function snapshotBitmap() {
    if (!canvas) return null;
    try {
      return canvas.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  }

  function signedUI() {
    var sub = document.querySelector('.sigil-subtitle');
    if (sub) sub.textContent = 'the stone is signed. it waits on the desktop.';
    var desk = document.getElementById('sigil-todesktop');
    if (desk) desk.removeAttribute('hidden');
  }

  function getStone() {
    var s = (window.Liber && window.Liber.state && window.Liber.state.get()) || {};
    return ((s.buddy || []).filter(function (e) { return e && e.kind === 'stone'; }));
  }
  function buddyTags() {
    var st = (window.Liber && window.Liber.state) || null;
    if (st && st.BUDDY_TAGS) return st.BUDDY_TAGS;
    return ['shadow', 'anima', 'animus', 'persona', 'self', 'ego', 'trickster', 'wise old', 'great mother', 'puer', 'senex', 'hero'];
  }
  function buildTagGrid(selected) {
    var sel = document.getElementById('sigil-tags-select');
    var chips = document.getElementById('sigil-tags-chips');
    if (!sel || !chips) return;
    sel.innerHTML = '';
    var hint = document.createElement('option');
    hint.value = '';
    hint.textContent = '+ add tag…';
    sel.appendChild(hint);
    var tags = buddyTags();
    for (var i = 0; i < tags.length; i++) {
      var o = document.createElement('option');
      o.value = tags[i];
      o.textContent = tags[i];
      sel.appendChild(o);
    }
    sel.value = '';
    setSelectedTags(selected || []);
    if (!sel.dataset.wired) {
      sel.dataset.wired = '1';
      sel.addEventListener('change', function () {
        if (!sel.value) return;
        var cur = selectedTags();
        if (cur.indexOf(sel.value) < 0) {
          cur.push(sel.value);
          setSelectedTags(cur);
        }
        sel.value = '';
      });
    }
  }
  function setSelectedTags(list) {
    var chips = document.getElementById('sigil-tags-chips');
    if (!chips) return;
    chips.innerHTML = '';
    for (var i = 0; i < (list || []).length; i++) {
      (function (t) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'sigil-tag-chip';
        c.setAttribute('aria-label', 'remove tag ' + t);
        c.textContent = t + ' ×';
        c.addEventListener('click', function () {
          var cur = selectedTags().filter(function (x) { return x !== t; });
          setSelectedTags(cur);
        });
        chips.appendChild(c);
      })(list[i]);
    }
  }
  function selectedTags() {
    var out = [];
    var chips = document.getElementById('sigil-tags-chips');
    if (!chips) return out;
    var btns = chips.querySelectorAll('.sigil-tag-chip');
    for (var i = 0; i < btns.length; i++) {
      var t = btns[i].textContent.replace(/\s×$/, '');
      if (t) out.push(t);
    }
    return out;
  }
  function setStone(arr) {
    var st = (window.Liber && window.Liber.state) || null;
    if (!st) return;
    var sealed = ((st.get().buddy || []).filter(function (e) { return !e || e.kind !== 'stone'; }));
    // §09 wanderlust evidence: stamp keywordsMatched on fresh stones at the
    // boundary. Re-carves keep their existing stamp (evidence is stable).
    try {
      var W = window.Liber && window.Liber.wanderlustAccent;
      if (W && W.evidenceFor) {
        for (var i = 0; i < arr.length; i++) {
          if (arr[i] && arr[i].kind === 'stone' && !arr[i].keywordsMatched) {
            arr[i] = Object.assign({}, arr[i], { keywordsMatched: W.evidenceFor(arr[i]) });
          }
        }
      }
    } catch (e) { /* the stone lands regardless */ }
    st.set({ buddy: arr.concat(sealed) });
  }

  function save() {
    var app = document.querySelector('.sigil-app');
    if (!app) return;
    app.classList.add('saved');
    if (window.Liber && window.Liber.state) {
      var s = window.Liber.state.get() || {};
      var arr = getStone();
      var intention = document.querySelector('.sigil-input').innerText;
      var bitmap = snapshotBitmap();
      var tags = selectedTags();
      if (replaceMode && currentId) {
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].id === currentId) {
            arr[i] = Object.assign({}, arr[i], {
              intention: intention,
              element: activeElement,
              ts: Date.now(),
              bitmap: bitmap || arr[i].bitmap || null,
              tags: tags
            });
            setStone(arr);
            signedUI();
            advanceStoneStage();
            benchSay('save', null, 1);
            return;
          }
        }
      }
      var id = 'sigil-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      arr.push({
        id: id,
        kind: 'stone',
        intention: intention,
        element: activeElement,
        ts: Date.now(),
        annotation: '',
        bitmap: bitmap,
        tags: tags
      });
      setStone(arr);
      try {
        var g0 = window.Liber.state.get() || {};
        var ch0 = Object.assign({}, g0.chat);
        ch0.unread = Object.assign({}, ch0.unread);
        ch0.unread.buddy = (ch0.unread.buddy || 0) + 1;
        window.Liber.state.set({ chat: ch0 });
      } catch (e0) {}
      signedUI();
      advanceStoneStage();
      benchSay('save', null, 1);
    }
  }

  function advanceStoneStage() {
    var st = (window.Liber && window.Liber.state) || null;
    if (!st) return;
    if ((st.get().tutorialStage || null) === 'stone') st.set({ tutorialStage: 'games' });
  }

  function discard() {
    if (!ctx) return;
    var rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ghostLoaded = false;
    var input = document.querySelector('.sigil-input');
    if (input) input.innerText = '';
  }

  function loadExisting(sigil) {
    if (!sigil) return;
    replaceMode = true;
    currentId = sigil.id;
    setActive(sigil.element || 'earth');
    var input = document.querySelector('.sigil-input');
    if (input) input.innerText = sigil.intention || '';
    buildTagGrid(Array.isArray(sigil.tags) ? sigil.tags : []);
    var title = document.querySelector('.sigil-title');
    if (title) title.textContent = 'BUDDY · re-open the stone';
    var sub = document.querySelector('.sigil-subtitle');
    if (sub) sub.textContent = 'redraw and re-save. the old work lingers faintly as a ghost.';
    var desk0 = document.getElementById('sigil-todesktop');
    if (desk0) desk0.removeAttribute('hidden');
    var hint = document.querySelector('.sigil-ghost-hint');
    if (hint) hint.classList.add('visible');
    if (sigil.bitmap) loadGhost(sigil.bitmap);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var existing = [];
    try {
      var s = (window.Liber && window.Liber.state && window.Liber.state.get()) || {};
      existing = getStone();
    } catch (e) {}

    if (existing.length > 0) {
      initCanvas();
      loadExisting(existing[0]);
    } else {
      setActive('earth');
      initCanvas();
      buildTagGrid([]);
    }

    var btns = document.querySelectorAll('.sigil-element');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', (function (el) {
        return function () { setActive(el); };
      })(btns[i].getAttribute('data-element')));
    }

    buildPalette();
    var tools = document.querySelectorAll('.sigil-tool[data-tool]');
    for (var ti = 0; ti < tools.length; ti++) {
      tools[ti].addEventListener('click', (function (t) {
        return function () { setTool(t); };
      })(tools[ti].getAttribute('data-tool')));
    }
    var undoBtn = document.getElementById('sigil-undo');
    if (undoBtn) {
      undoBtn.classList.add('spent');
      undoBtn.addEventListener('click', doUndo);
    }
    var partBtns = document.querySelectorAll('.sigil-part');
    for (var pi = 0; pi < partBtns.length; pi++) {
      partBtns[pi].addEventListener('click', (function (b) {
        return function () {
          var was = b.classList.contains('armed');
          for (var q = 0; q < partBtns.length; q++) partBtns[q].classList.remove('armed');
          if (was) {
            armedPart = null;
            if (wrap) wrap.classList.remove('armed');
          } else {
            b.classList.add('armed');
            armedPart = b.getAttribute('data-part');
            if (wrap) wrap.classList.add('armed');
            benchMaterial('material_part', { part: armedPart }, armedPart.length);
          }
        };
      })(partBtns[pi]));
    }

    if (canvas) {
      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      canvas.addEventListener('mouseup', end);
      canvas.addEventListener('mouseleave', leave);
      document.addEventListener('mouseup', end);
    }
    if (wrap) {
      wrap.addEventListener('mouseleave', leave);
    }

    // the keyboard path to the same kept mark: arrows walk the chisel,
    // enter lays it down. no mouse required to reach save.
    var kpos = null;
    function kEnsure() {
      if (!canvas) return null;
      var rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return null;
      if (!kpos) kpos = { x: rect.width / 2, y: rect.height / 2 };
      kpos.x = Math.max(0, Math.min(rect.width, kpos.x));
      kpos.y = Math.max(0, Math.min(rect.height, kpos.y));
      return kpos;
    }
    function kShow() {
      var p = kEnsure();
      if (!p || !cursor) return;
      cursor.style.left = p.x + 'px';
      cursor.style.top = p.y + 'px';
      if (!cursorVisible) {
        cursor.classList.add('visible');
        cursorVisible = true;
      }
    }
    function kMark() {
      if (!ctx || !canvas) return;
      var p = kEnsure();
      if (!p) return;
      pushUndo();
      if (armedPart) {
        drawStamp(armedPart, p.x, p.y);
        armedPart = null;
        var parts = document.querySelectorAll('.sigil-part');
        for (var i = 0; i < parts.length; i++) parts[i].classList.remove('armed');
        if (wrap) wrap.classList.remove('armed');
      } else if (activeTool === 'bucket') {
        floodFill(p.x, p.y, activeInk);
      } else {
        ctx.fillStyle = activeInk;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (window.Liber && window.Liber.sound) window.Liber.sound.play('thunk');
      shedDust(3);
      stillWatch();
    }
    if (wrap) {
      wrap.addEventListener('focus', kShow);
      wrap.addEventListener('keydown', function (e) {
        var p = kEnsure();
        if (!p) return;
        var step = e.shiftKey ? 2 : 12;
        if (e.key === 'ArrowLeft') { p.x -= step; e.preventDefault(); kShow(); }
        else if (e.key === 'ArrowRight') { p.x += step; e.preventDefault(); kShow(); }
        else if (e.key === 'ArrowUp') { p.y -= step; e.preventDefault(); kShow(); }
        else if (e.key === 'ArrowDown') { p.y += step; e.preventDefault(); kShow(); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kMark(); }
      });
    }

    if ((window.Liber && window.Liber.state && window.Liber.state.get().tutorialStage) === 'stonedemo') runRiasonDemo();
    function runRiasonDemo() {
      var C = window.Cursor || null;
      var bar = document.createElement('div');
      bar.className = 'sigil-demo';
      bar.innerHTML = '<div class="sigil-demo-voice">riason</div><div class="sigil-demo-line"></div><button type="button" class="sigil-demo-next" hidden>&gt;&gt;</button>';
      document.body.appendChild(bar);
      var veil = document.createElement('div');
      veil.className = 'sigil-veil';
      document.body.appendChild(veil);
      var lineEl = bar.querySelector('.sigil-demo-line');
      var nextBtn = bar.querySelector('.sigil-demo-next');
      function say(t) { if (lineEl) lineEl.textContent = t; }
      function deny() {
        say('Not yet. Let me finish this.');
        veil.classList.remove('deny');
        void veil.offsetWidth;
        veil.classList.add('deny');
        if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play('thunk'); } catch (e) {} }
        setTimeout(function () { veil.classList.remove('deny'); }, 600);
      }
      veil.addEventListener('pointerdown', deny);
      function alive() { return document.body.contains(bar); }
      function after(ms, fn) { setTimeout(function () { if (alive() && fn) fn(); }, ms); }
      // 2.13.0: the hand-off to the tent is a curtain, not a jump cut.
      // The room's own screen goes black, the page changes behind it, and
      // divination.html opens from black on its side (same layer, same
      // duration). Reduced motion cuts instantly, as everywhere else.
      function curtainOut(done) {
        var reduced = false;
        try { reduced = !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
        if (reduced) { done(); return; }
        var veil = document.createElement('div');
        veil.className = 'sigil-curtain';
        veil.setAttribute('aria-hidden', 'true');
        document.body.appendChild(veil);
        void veil.offsetWidth;
        veil.classList.add('go');
        setTimeout(done, 620);
      }
      function goDesktop() {
        var st = (window.Liber && window.Liber.state) || null;
        if (st) st.set({ tutorialStage: 'divdemo' });
        curtainOut(function () { window.location.href = 'divination.html'; });
      }
      function showNext() { if (nextBtn && alive()) nextBtn.hidden = false; }
      function hideNext() { if (nextBtn) nextBtn.hidden = true; }
      var input = document.querySelector('.sigil-input');
      if (input) input.innerText = '';
      try { if (typeof ctx !== 'undefined' && ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); } catch (e) {}
      var stepIdx = 0;
      if (nextBtn) nextBtn.addEventListener('click', function () {
        hideNext();
        stepIdx++;
        runStep();
      });
      function runStep() {
        if (!alive()) return;
        if (stepIdx === 0) {
          say('This is the buddy app. First you decide what your buddy is going to represent!');
          showNext();
        } else if (stepIdx === 1) {
          say('This is just a random example, no correlation at all.');
          if (input) input.classList.add('demo-blue');
          if (input && C && C.typeText) { try { C.typeText(input, 'putting logic over emotions', 70); } catch (e) { input.innerText = 'putting logic over emotions'; } }
          else if (input) input.innerText = 'putting logic over emotions';
          after(2800, showNext);
        } else if (stepIdx === 2) {
          say('Next, you can choose what colours you want to use. I had better just do one.');
          var tray = document.querySelectorAll('#sigil-palette-tray .sigil-swatch');
          var sw = tray[15] || tray[0];
          function picked() { after(800, showNext); }
          if (sw && C && C.clickEl) { try { C.clickEl(sw, 1200).then(picked, picked); } catch (e) { sw.click(); picked(); } }
          else { if (sw) sw.click(); picked(); }
        } else if (stepIdx === 3) {
          say('Watch the circle. One round trip, no lifting.');
          var tool = document.querySelector('.sigil-tool[data-tool="circle"]');
          var cv = document.querySelector('.sigil-canvas');
          function stroke() {
            if (cv && C && C.canvasStroke && C.circlePoints) {
              try {
                var r = cv.getBoundingClientRect();
                C.canvasStroke(cv, C.circlePoints(r.width / 2, r.height / 2, Math.min(r.width, r.height) * 0.3, 36), 85);
              } catch (e) {}
            }
            after(3800, showNext);
          }
          if (tool && C && C.clickEl) { try { C.clickEl(tool, 1200).then(function () { after(400, stroke); }, function () { if (tool) tool.click(); stroke(); }); } catch (e) { tool.click(); stroke(); } }
          else { if (tool) tool.click(); stroke(); }
        } else if (stepIdx === 4) {
          say('When you are finished, you click save and the buddy shows up on your desktop.');
          var sv = document.getElementById('sigil-save');
          function flashed() {
            if (sv) sv.classList.add('demo-hit');
            if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play('chime'); } catch (e) {} }
            var pv = document.createElement('div');
            pv.className = 'demo-blue-preview';
            var tab = document.querySelector('.sigil-tablet');
            (tab || document.body).appendChild(pv);
            if (input) input.classList.remove('demo-blue');
            say('Blue buddy preview. Mine stays with me — yours comes later.');
            after(1200, showNext);
          }
          if (sv && C && C.clickEl) { try { C.clickEl(sv, 1200).then(flashed, flashed); } catch (e) { sv.click(); flashed(); } }
          else { if (sv) sv.click(); flashed(); }
        } else if (stepIdx === 5) {
          // the last thing said on the stone is where the hand-off happens:
          // the curtain closes, and goDesktop() carries the stage to the tent
          say('Good. Leave the stone \u2014 Arcana keeps the tent, and she has a card waiting for you.');
          after(2400, goDesktop);
        } else {
          goDesktop();
        }
      }
      runStep();
    }

    var saveBtn = document.getElementById('sigil-save');
    if (saveBtn) saveBtn.addEventListener('click', promptSave);
    var deskBtn = document.getElementById('sigil-todesktop');
    if (deskBtn) deskBtn.addEventListener('click', function () {
      window.location.href = 'desktop.html';
    });
    if (window.Hijack && window.Cursor) {
      var tst = (window.Liber && window.Liber.state) || null;
      var tss = tst ? tst.get() : {};
      var stoneTour = (tss.tutorialStage === 'stone');
      if (stoneTour) {
        window.Hijack.run({ flag: 'walkSigil', room: 'sigil', accent: '#8acaff',
          onStep: function (idx, box) {
            function live() { return box && document.body.contains(box); }
            if (idx === 0) {
              var sInput = document.querySelector('.sigil-input');
              if (sInput && !sInput.innerText.trim()) {
                window.Cursor.typeText(sInput, 'putting logic over emotions', 45);
              }
            } else if (idx === 1) {
              setTimeout(function () {
                if (!live()) return;
                var tray = document.querySelectorAll('#sigil-palette-tray .sigil-swatch');
                var sw = tray[15] || tray[0];
                if (sw) window.Cursor.clickEl(sw, 500);
              }, 700);
            } else if (idx === 2) {
              setTimeout(function () {
                if (!live()) return;
                var tool = document.querySelector('.sigil-tool[data-tool="circle"]');
                var canvas = document.querySelector('.sigil-canvas');
                if (!tool || !canvas) return;
                window.Cursor.clickEl(tool, 400).then(function () {
                  if (!live()) return;
                  var r = canvas.getBoundingClientRect();
                  var cx = r.width / 2, cy = r.height / 2;
                  var rad = Math.min(r.width, r.height) * 0.3;
                  window.Cursor.canvasStroke(canvas, window.Cursor.circlePoints(cx, cy, rad, 36), 40);
                });
              }, 700);
            } else if (idx === 3) {
              setTimeout(function () {
                if (!live()) return;
                var save = document.getElementById('sigil-save');
                if (!save) return;
                window.Cursor.clickEl(save, 500).then(function () {
                  setTimeout(function () {
                    if (!live()) return;
                    var keep = document.getElementById('sigil-save-prompt-keep');
                    if (!keep) return;
                    window.Cursor.clickEl(keep, 400).then(function () {
                      setTimeout(function () {
                        var st2 = (window.Liber && window.Liber.state) || null;
                        if (st2) st2.set({ tutorialStage: 'games' });
                        window.location.href = 'games.html';
                      }, 1000);
                    });
                  }, 700);
                });
              }, 700);
            }
          },
          steps: [
          { voice: 'riason', line: 'watch closely — first, the intention. I will write mine; you can keep it or wipe it after.', target: '.sigil-input' },
          { voice: 'riason', line: 'blue. like the deep that raised you. one click.', target: '#sigil-palette' },
          { voice: 'riason', line: 'and now the circle. one round trip, no lifting.', target: '.sigil-canvas' },
          { voice: 'riason', line: 'save it. then we go and feed the town.', target: 'sigil-save' }
        ] });
      }
    }
    var discardBtn = document.getElementById('sigil-discard');
    if (discardBtn) discardBtn.addEventListener('click', promptDiscard);

    var backBtn = document.getElementById('sigil-back');
    if (backBtn) backBtn.addEventListener('click', function () {
      // the forge exits to the ship's desktop; the old study mockup it used
      // to leave for is archived and no longer part of the release
      location.href = '../desktop.html';
    });

    var helpBtn = document.getElementById('sigil-help');
    var riason = document.getElementById('sigil-raison');
    var riasonClose = document.getElementById('sigil-raison-close');
    function openRiason() {
      if (riason) {
        riason.classList.add('open');
        riason.removeAttribute('inert');
      }
    }
    function closeRiason() {
      if (riason) {
        riason.classList.remove('open');
        riason.setAttribute('inert', '');
      }
    }
    if (helpBtn) helpBtn.addEventListener('click', openRiason);
    if (riasonClose) riasonClose.addEventListener('click', closeRiason);
    if (riason) riason.addEventListener('click', function (e) {
      if (e.target === riason) closeRiason();
    });
    if (window.LiberRoomShell) window.LiberRoomShell.bindRoomOverlays({ overlays: [
      { id: 'sigil-raison', close: closeRiason }
    ] });

    var prompt = document.getElementById('sigil-save-prompt');
    var promptBody = document.getElementById('sigil-save-prompt-body');
    var keepBtn = document.getElementById('sigil-save-prompt-keep');
    var discardPromptBtn = document.getElementById('sigil-save-prompt-discard');
    var promptClose = document.getElementById('sigil-save-prompt-close');
    savePromptEl = prompt;
    savePromptBodyEl = promptBody;
    if (keepBtn) keepBtn.addEventListener('click', function () {
      var a = pendingAction;
      closeSavePrompt();
      if (a && a.keep) a.keep();
      if (window.Liber && window.Liber.sound) window.Liber.sound.play('chime');
    });
    if (discardPromptBtn) discardPromptBtn.addEventListener('click', function () {
      var a = pendingAction;
      closeSavePrompt();
      if (a && a.discard) a.discard();
    });
    if (promptClose) promptClose.addEventListener('click', closeSavePrompt);
    if (prompt) prompt.addEventListener('click', function (e) {
      if (e.target === prompt) closeSavePrompt();
    });
    if (window.LiberRoomShell) window.LiberRoomShell.bindRoomOverlays({ overlays: [
      { id: 'sigil-save-prompt', close: closeSavePrompt }
    ] });
    if (window.LiberRoomShell.bindConfirmKey) window.LiberRoomShell.bindConfirmKey(['sigil-save-prompt']);

    // the bench goes live only now: no commentary may fire off boot-time
    // defaults (setInk(0), the initial brush) as though you had chosen them.
    armIntentionBench();
    benchArmed = true;
  });

  function describeWork() {
    var intention = (document.querySelector('.sigil-input') || {}).innerText || '';
    var hasStrokes = false;
    if (ctx) {
      try {
        var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (var i = 3; i < data.length; i += 4) {
          if (data[i] !== 0) { hasStrokes = true; break; }
        }
      } catch (e) {}
    }
    var intentionText = intention.trim() ? '"' + intention.trim() + '"' : '(none)';
    var drawingText = hasStrokes ? 'with strokes' : '(empty)';
    var ghostText = (replaceMode && ghostLoaded) ? ' ghost: 30%. new: 100%.' : '';
    return 'intention: ' + intentionText + '. element: ' + activeElement + '. ink: ' + activeInkName + '. drawing: ' + drawingText + '.' + ghostText;
  }

  function promptSave() {
    if (document.querySelector('.sigil-veil')) return;
    var intention = (document.querySelector('.sigil-input') || {}).innerText || '';
    var hasStrokes = false;
    if (ctx) {
      try {
        var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (var i = 3; i < data.length; i += 4) {
          if (data[i] !== 0) { hasStrokes = true; break; }
        }
      } catch (e) {}
    }
    if (!intention.trim() && !hasStrokes) {
      var sub = document.querySelector('.sigil-subtitle');
      if (sub) sub.textContent = 'give the stone an intention or a mark before saving.';
      return;
    }
    openSavePrompt(describeWork(), save, discard);
  }
  function promptDiscard() {
    openSavePrompt(describeWork(), function () {
      // discard chose to keep — no-op (the user changed their mind after seeing the description)
    }, discard);
  }
})();
