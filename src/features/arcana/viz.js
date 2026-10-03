// viz.js — Arcana's ascii engine. Pixi v8 owns only what lies ON the
// terminal: the walking kitten, coin spins, glyph explosions, hexagram
// lines, ambient sparks. The DOM stays authoritative — every readable
// word is real text; the field is a pointer-transparent overlay.
//
// WebGL failure or reduced motion degrades to a flat field. The room
// degrades, never breaks (the journal-folio precedent).
(function () {
  'use strict';

  var V = {
    ready: false,
    app: null,
    host: null,
    field: null,      // the glyph wall, dimmed
    fx: null,         // the fx layer above the field
    kitty: null,
    reduced: false,
    flashers: []      // { node, glyph, until }
  };

  var CELL = 16;        // glyph cell in css px (recomputed at mount)
  var COLS = 80, ROWS = 30;

  var GLYPHS = '\u00b7\u22c5:\u2261\u2248\u2668\u2736\u2727*+x'; // the wall: steam and stars
  var SPARK = ['\u2736', '\u2727', '\u2735', '+', '\u00b7'];

  var MONO = '"Fira Code","Cascadia Mono",ui-monospace,Menlo,Consolas,monospace';
  function glyphText(str) {
    return new PIXI.Text({ text: str, style: { fontFamily: MONO, fontSize: CELL * 0.92, fill: 0xcfd6e6, letterSpacing: 0 } });
  }
  function monoText(str, size, color) {
    return new PIXI.Text({ text: str, style: { fontFamily: MONO, fontSize: size, fill: color } });
  }

  // ── mount: one canvas over the field wall ─────────────────────────────
  V.mount = function (hostEl) {
    V.host = hostEl;
    if (!hostEl) return;
    V.reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var w = hostEl.clientWidth || 640, h = hostEl.clientHeight || 400;
    CELL = Math.max(10, Math.round(w / 80));
    COLS = Math.max(40, Math.floor(w / CELL));
    ROWS = Math.max(18, Math.floor(h / CELL));
    if (V.reduced) return;                    // flat field: DOM wall only
    try {
      V.app = new PIXI.Application();
    } catch (e) { return; }
    V.app.init({ width: w, height: h, backgroundAlpha: 0, antialias: true, autoStart: true })
      .then(function () {
        var canvas = V.app.canvas;
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        hostEl.appendChild(canvas);
        V.ready = true;
        buildField();
        buildKitty();
        wirePointer();
        V.app.ticker.add(tick);
      })
      .catch(function () { V.app = null; });
  };

  // ── the reactive world: the wall notices the pointer, the ground notices ──
  V.pointer = { x: -999, y: -999, on: false };
  function wirePointer() {
    window.addEventListener('pointermove', function (e) {
      if (!V.host) return;
      var r = V.host.getBoundingClientRect();
      V.pointer.x = e.clientX - r.left;
      V.pointer.y = e.clientY - r.top;
      V.pointer.on = true;
    }, { passive: true });
    window.addEventListener('pointerleave', function () { V.pointer.on = false; });
    // a touch anywhere in the room leaves a little spark cluster;
    // near the kitten it is a poke
    document.addEventListener('pointerdown', function (e) {
      if (!V.ready || !V.host) return;
      var r = V.host.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return;
      if (V.kitty && nearKitty(x, y)) { pokeKitty(); return; }
      V.burst(x, y, ['\u2736', '\u2727', '\u00b7', '+'], { n: 10, speed: 55, up: 30, color: 0x79dac8, dur: 0.9 });
    });
  }
  function nearKitty(x, y) {
    var k = V.kitty;
    return x > k.x - 10 && x < k.x + 8 * CELL + 10 && y > k.y - 10 && y < k.y + 4 * CELL + 10;
  }
  function pokeKitty() {
    var k = V.kitty;
    if (!k || k.startle > 0) return;
    k.startle = 1.1;          // seconds of hopping
    k.startleT = 0;
    var hr = V.host.getBoundingClientRect();
    V.burst(k.x + 4 * CELL, k.y - 6, ['\u2661', '\u2660', '\u2727', '\u2665'], { n: 7, speed: 42, up: 70, color: 0xcf87e8, dur: 1.2 });
  }

  V.resize = function () {
    if (!V.ready || !V.host) return;
    var w = V.host.clientWidth, h = V.host.clientHeight;
    V.app.renderer.resize(w, h);
  };

  // ── the glyph wall: a dim breathing field, the room's steam ───────────
  function buildField() {
    V.field = new PIXI.Container();
    V.fx = new PIXI.Container();
    V.app.stage.addChild(V.field);
    V.app.stage.addChild(V.fx);
    var cells = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (Math.random() > 0.16) continue;
        var t = glyphText(GLYPHS[(Math.random() * GLYPHS.length) | 0]);
        t.x = c * CELL; t.y = r * CELL;
        t.alpha = 0.05 + Math.random() * 0.07;
        t.cellPhase = Math.random() * Math.PI * 2;
        cells.push(t);
        V.field.addChild(t);
      }
    }
    V.cells = cells;
  }

  // ── the kitten: a small walker with a real gait ───────────────────────
  // frames are drawn at 1x, mirrored for the other direction
  var KITTY_FRAMES = [
    ['        ', '  /\\_/\\ ', ' ( o.o )', '  > ^ < '],
    ['        ', '  /\\_/\\ ', ' ( o.o )', '  >-^-< '],
    ['   /\\   ', '  /  \\_ ', ' ( o.o )', '  > ^ < '],
    ['        ', '  /\\_/\\ ', ' ( -.- )', '  > ^ < ']
  ];
  function buildKitty() {
    V.kitty = new PIXI.Container();
    V.kitty.chars = [];
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 8; c++) {
        var t = glyphText(' ');
        t.x = c * CELL; t.y = r * CELL;
        V.kitty.chars.push(t);
        V.kitty.addChild(t);
      }
    }
    V.kitty.dir = 1;
    V.kitty.speed = 26 + Math.random() * 14;   // px/s
    V.kitty.frameT = 0;
    V.kitty.frame = 0;
    V.kitty.pauseT = 2 + Math.random() * 5;
    V.kitty.startle = 0;
    V.kitty.x = Math.random() * 400;
    V.kitty.y = (ROWS - 5) * CELL;
    V.kitty.baseY = V.kitty.y;
    V.kitty.alpha = 0.85;
    V.fx.addChild(V.kitty);
    setKittyFrame(0);
  }
  function setKittyFrame(f) {
    var fr = KITTY_FRAMES[f % KITTY_FRAMES.length];
    for (var r = 0; r < 4; r++) {
      var line = fr[r] || '        ';
      for (var c = 0; c < 8; c++) {
        var t = V.kitty.chars[r * 8 + c];
        t.text = (V.kitty.dir === 1) ? (line[c] || ' ') : (line[7 - c] || ' ');
      }
    }
  }
  function tickKitty(dt) {
    var k = V.kitty;
    if (!k) return;
    if (!k.baseY) k.baseY = k.y;
    // startled: hop in place, then tear off at double speed
    if (k.startle > 0) {
      k.startle -= dt / 60;
      k.startleT = (k.startleT || 0) + dt / 60;
      k.y = k.baseY - Math.abs(Math.sin(k.startleT * 14)) * 14;
      k.speed = 62;
      if (k.startle <= 0) { k.y = k.baseY; k.speed = 26 + Math.random() * 14; }
      return;
    }
    if (k.pauseT > 0) { k.pauseT -= dt / 60; if (k.pauseT > 0) return; }
    k.x += k.dir * k.speed * (dt / 60);
    k.frameT += dt / 60;
    if (k.frameT > 0.18) { k.frameT = 0; k.frame = (k.frame + 1) % 4; setKittyFrame(k.frame); }
    var maxX = COLS * CELL - 8 * CELL - 4;
    if (k.x >= maxX) { k.dir = -1; setKittyFrame(k.frame); }
    if (k.x <= 4) { k.dir = 1; setKittyFrame(k.frame); }
    if (k.dir === 1 && Math.random() < 0.0015) { k.pauseT = 1.5 + Math.random() * 4; }
  }

  // ── flashes: a glyph pulses up from the wall and sinks back ───────────
  // (used to mark hits, casts, line locks)
  V.flash = function (colHint, glyph, color) {
    if (!V.ready) return;
    var c = (typeof colHint === 'number') ? colHint : (Math.random() * COLS) | 0;
    var t = glyphText(glyph || SPARK[(Math.random() * SPARK.length) | 0]);
    t.x = c * CELL;
    t.y = (Math.random() * (ROWS - 2) + 1) * CELL;
    if (V.kitty && t.y > V.kitty.y - CELL && t.y < V.kitty.y + 4 * CELL) t.y = (ROWS - 6) * CELL;
    t.alpha = 0.9;
    t.life = 0;
    if (color) t.tint = color;
    V.fx.addChild(t);
    V.flashers.push(t);
  };
  V.flashWord = function (word, color) {
    // a short word stamped mid-air then sunk: used on big hits
    if (!V.ready || V.reduced) return;
    var t = monoText(String(word).slice(0, 12).toUpperCase(), CELL * 0.9, color || 0x9fe870);
    t.x = 40 + Math.random() * (COLS * CELL - 200);
    t.y = 60 + Math.random() * (ROWS * CELL - 160);
    t.alpha = 0.85;
    t.life = 0;
    V.fx.addChild(t);
    V.flashers.push(t);
  };

  // ── explosions: glyphs fly out from a point (tower, death, etc.) ──────
  V.burst = function (cx, cy, glyphs, opts) {
    if (!V.ready) return;
    opts = opts || {};
    var n = opts.n || 26;
    var host = new PIXI.Container();
    host.x = cx; host.y = cy;
    var parts = [];
    for (var i = 0; i < n; i++) {
      var t = glyphText(glyphs[(Math.random() * glyphs.length) | 0]);
      if (opts.color) t.tint = opts.color;
      var a = Math.random() * Math.PI * 2;
      var sp = (opts.speed || 90) * (0.4 + Math.random() * 0.9);
      parts.push({ t: t, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 40), rot: (Math.random() - 0.5) * 4 });
      host.addChild(t);
    }
    V.fx.addChild(host);
    var life = 0, DUR = opts.dur || 1.6;
    var fn = function () {
      var dt = V.app.ticker.deltaMS * 0.06;   // ms → 60fps frame units (classic ticker delta)
      life += dt / 60;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.vy += 160 * (dt / 60);                    // gravity
        p.t.x += p.vx * (dt / 60);
        p.t.y += p.vy * (dt / 60);
        p.t.rotation += p.rot * (dt / 60);
      }
      host.alpha = Math.max(0, 1 - life / DUR);
      if (life >= DUR) { V.app.ticker.remove(fn); host.destroy({ children: true }); }
    };
    V.app.ticker.add(fn);
  };
  V.burstAt = function (el, glyphs, opts) {
    // explode from the center of a DOM element (the card face, the dish)
    if (!V.ready || !el) return;
    var hr = V.host.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    V.burst(r.left - hr.left + r.width / 2, r.top - hr.top + r.height / 2, glyphs, opts);
  };

  // ── card pop: a tiny ascii card that flips in over the drawn face ─────
  V.cardPop = function (el, card) {
    if (!V.ready || !el) return;
    var hr = V.host.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    var host = new PIXI.Container();
    var x = r.left - hr.left + r.width / 2, y = r.top - hr.top + r.height / 2;
    host.x = x; host.y = y;
    var back = new PIXI.Container();
    for (var rr = 0; rr < 9; rr++) {
      var line = new PIXI.Text({
        text: (rr === 0 || rr === 8) ? '\u250c\u2500\u2500\u2500\u2500\u2500\u2510' : '\u2502\u00b7\u2500\u25e1\u2500\u00b7\u2502',
        style: { fontFamily: MONO, fontSize: 12, fill: 0xcfd6e6 }
      });
      line.x = -34; line.y = -26 + rr * 6;
      back.addChild(line);
    }
    var face = glyphText(card.glyph || 'O');
    face.style.fontSize = 30; face.x = -10; face.y = -14;
    face.alpha = 0;
    back.addChild(face);
    host.addChild(back);
    V.fx.addChild(host);
    var life = 0, DUR = 1.1;
    var fn = function () {
      var dt = V.app.ticker.deltaMS * 0.06;   // ms → 60fps frame units (classic ticker delta)
      life += dt / 60;
      var t01 = Math.min(1, life / (DUR * 0.55));
      back.scale.x = 0.3 + 0.7 * Math.abs(Math.cos(t01 * Math.PI));  // flip
      face.alpha = Math.max(0, t01 * 2 - 0.7);
      back.y = -18 * Math.sin(t01 * Math.PI);                        // hop
      if (life >= DUR) { V.app.ticker.remove(fn); host.destroy({ children: true }); }
    };
    V.app.ticker.add(fn);
  };

  // ── coin: three spinning ascii coins that settle ───────────────────────
  V.coins = function (el, done) {
    if (!V.ready || !el) { if (done) done(); return; }
    var hr = V.host.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    var host = new PIXI.Container();
    var cx = r.left - hr.left + r.width / 2, cy = r.top - hr.top + r.height / 2;
    var coins = [];
    for (var i = 0; i < 3; i++) {
      var t = glyphText(['\u25ce', '\u25c7', '\u25c6'][i]);
      t.style.fontSize = 20;
      t.x = cx + (i - 1) * 22; t.y = cy;
      t.anchor = 0.5; t.scale.y = 0.2;
      coins.push(t); host.addChild(t);
    }
    V.fx.addChild(host);
    var life = 0, DUR = 1.5;
    var fn = function () {
      var dt = V.app.ticker.deltaMS * 0.06;   // ms → 60fps frame units (classic ticker delta)
      life += dt / 60;
      for (var i = 0; i < 3; i++) {
        var c = coins[i];
        var spin = Math.max(0, 1 - life / (DUR * (0.75 + i * 0.12)));
        c.scale.y = 0.2 + 0.8 * Math.abs(Math.sin((life * 9 + i * 2.2)));
        c.scale.x = 1 - 0.5 * (1 - spin);
        c.y = cy - Math.abs(Math.sin(life * 7 + i)) * 18 * spin;
        if (spin <= 0.02) c.scale.y = 1;
      }
      if (life >= DUR) { V.app.ticker.remove(fn); host.destroy({ children: true }); if (done) done(); }
    };
    V.app.ticker.add(fn);
  };

  // ── hexagram line: grows in, wobbles if changing ──────────────────────
  V.hexLine = function (el, changing) {
    if (!V.ready || !el) return;
    var hr = V.host.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    var host = new PIXI.Container();
    host.x = r.left - hr.left; host.y = r.top - hr.top + r.height / 2;
    var t = glyphText(changing ? '\u2248\u2500\u2248\u2500\u2248\u2500\u2248' : '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
    t.x = 4;
    host.addChild(t);
    V.fx.addChild(host);
    var life = 0, DUR = changing ? 2.2 : 1.2;
    var fn = function () {
      var dt = V.app.ticker.deltaMS * 0.06;   // ms → 60fps frame units (classic ticker delta)
      life += dt / 60;
      if (changing) t.rotation = Math.sin(life * 10) * 0.06 * Math.max(0, 1 - life / DUR);
      host.alpha = Math.min(1, life * 3) * Math.max(0, 1 - Math.max(0, life - DUR * 0.6) / (DUR * 0.4));
      if (life >= DUR) { V.app.ticker.remove(fn); host.destroy({ children: true }); }
    };
    V.app.ticker.add(fn);
  };

  // ── ticker ─────────────────────────────────────────────────────────────
  function tick() {
    var dt = V.app.ticker.deltaMS * 0.06;   // ms → 60fps frame units
    // wall breathing + the pointer's lantern: cells near the cursor glow
    var cells = V.cells;
    var px = V.pointer.x, py = V.pointer.y, on = V.pointer.on;
    var now = performance.now();
    for (var i = 0; i < cells.length; i++) {
      var t = cells[i];
      var base = 0.05 + 0.04 * (0.5 + 0.5 * Math.sin(now / 900 + t.cellPhase));
      if (on && t._ox === undefined) {
        var dx = t.x - px, dy = t.y - py;
        var d2 = dx * dx + dy * dy;
        if (d2 < 20000) {
          var glow = 1 - d2 / 20000;
          base += glow * 0.55;
          if (glow > 0.7) t.tint = 0x79dac8;
          else if (glow > 0.35) t.tint = 0x8cc85f;
          else t.tint = 0xffffff;
        } else if (t.tint !== 0xffffff) { t.tint = 0xffffff; }
      }
      // the wall as raw material: pulled into the scene's shape, then let go
      if (t._ox !== undefined) {
        t._sp = Math.min(1, (t._sp || 0) + dt / 46);
        var e = EASE(t._sp);
        t.x = t._bx + t._ox * e;
        t.y = t._by + t._oy * e;
        if (t._tint !== undefined) t.tint = t._tint;
        t.alpha = (t._a !== undefined ? t._a : 0.6) + 0.1 * Math.sin(now / 460 + t.cellPhase);
      } else if (t._rx || t._ry) {
        t._rx *= 0.88; t._ry *= 0.88;
        t.x += t._rx * (dt / 60); t.y += t._ry * (dt / 60);
        if (Math.abs(t._rx) < 0.25) { t._rx = 0; t._ry = 0; t.x = t._bx; t.y = t._by; }
        t.alpha = base;
      } else {
        t.alpha = base;
      }
    }
    // sparks occasionally lift from under the pointer
    if (on && Math.random() < 0.05) V.flash(Math.max(0, (px / CELL) | 0), null, 0xe3c78a);
    // flashes
    for (var f = V.flashers.length - 1; f >= 0; f--) {
      var fl = V.flashers[f];
      fl.life += dt / 60;
      fl.alpha = Math.max(0, 0.9 - fl.life / 1.4);
      fl.y -= 14 * (dt / 60);
      if (fl.life >= 1.4) { V.fx.removeChild(fl); fl.destroy(); V.flashers.splice(f, 1); }
    }
    tickKitty(dt);
  }

  // ambient sparks drift up when the room is idle-ish
  setInterval(function () {
    if (!V.ready || document.hidden) return;
    if (Math.random() < 0.5) V.flash(null, null, 0x3b4252);
  }, 1400);

  // ═════════════════════════════════════════════════════════════════════
  // ── the scene engine ─────────────────────────────────────────────────
  //
  // Card scenes are not bursts. They are staged, DOM-drawn ascii theatre
  // laid INTO the room: one document layer over the field, a palette of
  // primitives (pixel beams, ascii art lines, rings, glow, veils, stamps,
  // a terminal card frame), and a timeline helper. The wall itself is raw
  // material: holdWall dims it, wallScatter tears a third of it loose,
  // wallRelax lets it settle back. Reduced motion: no scenes at all.
  // ═════════════════════════════════════════════════════════════════════

  var EASE = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

  function ensureFonts(done) {
    // Pixi text measures before webfonts land; hold scenes ~1 frame until
    // the faces are ready (or bail — fallback mono still reads fine)
    var need = ['PixelRunes', 'AstronomicSigns', 'Pixel12x10Mono'];
    if (!document.fonts || !document.fonts.check) { if (done) done(); return; }
    // warm them now so stamps and decoration measure with the real faces
    try { for (var i = 0; i < need.length; i++) document.fonts.load('16px "' + need[i] + '"'); } catch (e) {}
    var tries = 0;
    (function poll() {
      var ok = true;
      for (var i = 0; i < need.length; i++) { try { ok = ok && document.fonts.check('16px "' + need[i] + '"'); } catch (e) { ok = false; } }
      if (ok || tries++ > 8) { if (done) done(); return; }
      setTimeout(poll, 120);
    })();
  }

  var SCENE = { el: null, timers: [], afters: [], active: false, endMs: 0 };
  var SCENE_WORK = null;

  function suspendSceneWork() {
    var wm = window.ARCANA_SHELL && window.ARCANA_SHELL.WM;
    var entry = wm && wm.wins && wm.wins['arc-win-work'];
    var node = entry && entry.node;
    if (!node || SCENE_WORK) return;
    SCENE_WORK = {
      node: node,
      hidden: node.hidden,
      inert: node.inert,
      ariaHidden: node.getAttribute('aria-hidden'),
      alreadySuspended: node.classList.contains('scene-suspended'),
      focus: document.activeElement
    };
    node.inert = true;
    node.setAttribute('aria-hidden', 'true');
    node.classList.add('scene-suspended');
  }

  function restoreSceneWork() {
    if (!SCENE_WORK) return;
    var prior = SCENE_WORK;
    SCENE_WORK = null;
    if (prior.node.hidden === prior.hidden) {
      prior.node.inert = prior.inert;
      if (prior.ariaHidden === null) prior.node.removeAttribute('aria-hidden');
      else prior.node.setAttribute('aria-hidden', prior.ariaHidden);
    }
    if (!prior.alreadySuspended) prior.node.classList.remove('scene-suspended');
    if (prior.focus && prior.node.hidden === prior.hidden && prior.node.contains(prior.focus) && !prior.node.hidden && !prior.node.inert) {
      try { prior.focus.focus({preventScroll: true}); } catch (e) {}
    }
  }

  function after(ms, fn) {
    // schedule inside the scene's clock; Infinity = fire on endScene
    if (ms === Infinity) { SCENE.afters.push(fn); return; }
    var t = setTimeout(fn, ms);
    SCENE.timers.push(t);
    return t;
  }

  function px(color, x, y, size) {
    var d = document.createElement('div');
    d.className = 'px';
    d.style.left = Math.round(x) + 'px';
    d.style.top = Math.round(y) + 'px';
    d.style.color = color;
    if (size && size !== 7) { d.style.width = d.style.height = size + 'px'; }
    SCENE.el.appendChild(d);
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('on'); }); });
    return d;
  }

  function art(x, y, lines, opts) {
    opts = opts || {};
    var box = document.createElement('div');
    box.className = 'art';
    box.style.left = Math.round(x) + 'px';
    box.style.top = Math.round(y) + 'px';
    if (opts.color) box.style.color = opts.color;
    if (opts.size) box.style.fontSize = opts.size + 'px';
    if (opts.cls) box.className += ' ' + opts.cls;
    var t0 = opts.t0 || 0, stagger = opts.stagger || 55;
    for (var i = 0; i < lines.length; i++) {
      var L = document.createElement('div');
      L.className = 'al';
      L.textContent = lines[i] === '' ? ' ' : lines[i];
      box.appendChild(L);
      (function (node, j) {
        after(t0 + j * stagger, function () {
          node.style.opacity = '1';
          node.style.transform = 'none';
          box.classList.add('on');
        });
      })(L, i);
    }
    SCENE.el.appendChild(box);
    return box;
  }

  function ring(x, y, size, color, opts) {
    opts = opts || {};
    var r = document.createElement('div');
    r.className = 'ring' + (opts.expand ? ' m-expand' : '');
    r.style.left = Math.round(x) + 'px';
    r.style.top = Math.round(y) + 'px';
    r.style.color = color;
    var loops = opts.loops || 3, gap = opts.gap || 9;
    for (var i = 0; i < loops; i++) {
      var l = document.createElement('div');
      l.className = 'rl';
      var d = size - i * gap * 2;
      l.style.width = l.style.height = d + 'px';
      l.style.left = i * gap + 'px'; l.style.top = i * gap + 'px';
      l.style.border = '1px dashed ' + color;
      l.style.borderRadius = '50%';
      l.style.opacity = String(0.8 - i * 0.18);
      r.appendChild(l);
    }
    SCENE.el.appendChild(r);
    after(30, function () { r.classList.add('on'); });
    return r;
  }

  function glow(x, y, radius, color, pulse) {
    var g = document.createElement('div');
    g.className = 'glow' + (pulse ? ' pulse' : '');
    g.style.left = Math.round(x - radius) + 'px';
    g.style.top = Math.round(y - radius) + 'px';
    g.style.width = g.style.height = radius * 2 + 'px';
    g.style.color = color;
    SCENE.el.appendChild(g);
    after(40, function () { g.classList.add('on'); });
    return g;
  }

  function veil() {
    var v = SCENE.el.querySelector('.veil') || document.createElement('div');
    if (!v.parentNode) SCENE.el.appendChild(v);
    v.className = 'veil';
    after(30, function () { v.classList.add('on'); });
    return v;
  }

  function stamp(word, x, y, opts) {
    opts = opts || {};
    var s = document.createElement('div');
    s.className = 'stamp ' + (opts.cls || 'pg');
    s.textContent = word;
    s.style.left = Math.round(x) + 'px';
    s.style.top = Math.round(y) + 'px';
    s.style.color = opts.color || 'var(--yellow)';
    if (opts.size) s.style.fontSize = opts.size + 'px';
    SCENE.el.appendChild(s);
    after(opts.hold === undefined ? 900 : opts.hold, function () { s.classList.add('on'); });
    if (opts.gone !== false) after((opts.hold === undefined ? 900 : opts.hold) + (opts.holdFor || 1500), function () { s.classList.add('gone'); });
    return s;
  }

  // the typewriter: interpretation text, written onto the stage, one
  // character at a time, with a caret that keeps blinking after
  function typewriter(text, x, y, opts) {
    opts = opts || {};
    var node = document.createElement('div');
    node.className = 'tw ' + (opts.cls || 'pg');
    node.style.left = Math.round(x) + 'px';
    node.style.top = Math.round(y) + 'px';
    node.style.color = opts.color || 'var(--fg)';
    if (opts.width) node.style.width = opts.width + 'px';
    SCENE.el.appendChild(node);
    var span = document.createElement('span');
    var caret = document.createElement('i');
    caret.className = 'caret';
    node.appendChild(span); node.appendChild(caret);
    var t = String(text), i = 0;
    var speed = opts.speed || 26;
    var iv = setInterval(function () {
      if (!SCENE.active) { clearInterval(iv); return; }
      if (i >= t.length) { clearInterval(iv); node.classList.add('done'); return; }
      span.textContent = t.slice(0, ++i);
    }, speed);
    SCENE.timers.push(iv);
    return { node: node, ms: t.length * speed + 300, done: function () { clearInterval(iv); span.textContent = t; node.classList.add('done'); } };
  }

  // the terminal card: a frame drawn line by line, carried in like a card
  // the big card: a full ascii card drawn from wall matter — corner marks,
  // runes at the quarters, an astronomical band, the glyph seal, name and
  // number. The whole card is one pre; rotation (reversal) is a transform.
  function cardFrame(card, x, y, opts) {
    opts = opts || {};
    var W = opts.w || 37, H = opts.h || 19;
    var name = String(card.name).toUpperCase();
    if (name.length > W - 6) name = name.slice(0, W - 8) + '\u2026';
    var num = String(card.n).padStart(2, '0');
    var g = String(card.glyph);
    var inn = W - 2;
    function center(s) {
      var l = Math.floor((inn - s.length) / 2);
      return ' '.repeat(l) + s + ' '.repeat(inn - s.length - l);
    }
    var mid = (H - 2) >> 1;
    var rows = [];
    for (var i = 0; i < H; i++) {
      var r = i - 1;
      if (i === 0 || i === H - 1) { rows.push('\u250c' + '\u2500'.repeat(inn) + '\u2510'); continue; }
      if (i === 2 || i === H - 3) { rows.push('\u2502' + center('\u00b7 \u25e1 \u00b7   \u00b7 \u25e1 \u00b7') + '\u2502'); continue; }
      if (i === 3) { rows.push('\u2502' + center(name) + '\u2502'); continue; }
      if (i === H - 4) { rows.push('\u2502' + center(num) + '\u2502'); continue; }
      if (i === mid - 1) { rows.push('\u2502' + center('\u00b7   \u26a7   \u00b7') + '\u2502'); continue; }
      if (i === mid) { rows.push('\u2502' + center(g) + '\u2502'); continue; }
      if (i === mid + 1) { rows.push('\u2502' + center('\u00b7   \u2693   \u00b7') + '\u2502'); continue; }
      if (i === 1 || i === H - 2 || i === mid - 2 || i === mid + 2) { rows.push('\u2502' + ' '.repeat(inn) + '\u2502'); continue; }
      rows.push('\u2502' + center('\u2248') + '\u2502');
    }
    var node = document.createElement('div');
    node.className = 'arc-carddoc';
    var rot = document.createElement('div');
    rot.className = 'card-rot';
    var pre = document.createElement('div');
    pre.style.fontFamily = "'Pixel12x10Mono', monospace";
    pre.style.fontSize = '19px';
    pre.style.lineHeight = '21px';
    var rw = opts.w || 37, rh = opts.h || 19;
    for (var j = 0; j < rows.length; j++) {
      var L = document.createElement('div');
      L.className = 'cl';
      if (j === 3) L.className += ' cnm';
      if (j === mid) L.className += ' cgl';
      if (j === H - 4) L.className += ' cnum rg';
      L.textContent = rows[j] || ' ';
      rot.appendChild(L);
    }
    node.appendChild(rot);
    node.style.left = Math.round(x) + 'px';
    node.style.top = Math.round(y) + 'px';
    node.style.transform = 'translate(-50%,-50%)';
    SCENE.el.appendChild(node);
    return {
      node: node,
      enter: function (up) {
        after(60, function () {
          node.classList.add('on');
          node.style.transform = 'translate(-50%,-50%) translateY(-160px)';
          after(90, function () { node.style.transform = 'translate(-50%,-50%)'; });
          if (up) rot.classList.add('upside');
        });
      },
      flip: function (up) {
        after(1, function () { rot.classList.toggle('upside', !!up); });
      },
      leave: function (how) {
        node.classList.remove('on');
        node.classList.add(how === 'up' ? 'leave-up' : 'leave-back');
      }
    };
  }

  function pauseAll() { if (SCENE.el) SCENE.el.classList.add('paused'); }
  function resumeAll() { if (SCENE.el) SCENE.el.classList.remove('paused'); }

  function endScene(ms) {
    if (!SCENE.active) return;
    SCENE.active = false;
    var stage = V.host && V.host.parentNode;
    if (stage && stage.classList) stage.classList.remove('scene-live');
    restoreSceneWork();
    var el = SCENE.el;
    var kill = function () {
      if (!el) return;
      el.classList.add('gone');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        el.innerHTML = '';
        el.classList.remove('gone', 'paused', 'end', 'm-flip', 'shiver');
      }, 1000);
    };
    for (var i = 0; i < SCENE.timers.length; i++) clearTimeout(SCENE.timers[i]);
    SCENE.timers = [];
    var fns = SCENE.afters; SCENE.afters = [];
    for (var j = 0; j < fns.length; j++) { try { fns[j](); } catch (e) {} }
    wallRelax();
    holdWall(0);
    if (ms === undefined || ms <= 0) { kill(); }
    else { var t = setTimeout(kill, ms); SCENE.timers.push(t); }
  }
  function clearScene() { endScene(0); }

  // ── the wall as raw material ─────────────────────────────────────────
  V.hold = 0; V.holdTarget = 0;
  function holdWall(f) {
    V.holdTarget = f;
    if (V.host) {
      var fld = V.host;
      if (fld.classList) {
        if (f > 0.3) fld.classList.add('hold'); else fld.classList.remove('hold');
      }
    }
  }
  function wallScatter(strength) {
    if (!V.cells) return;
    for (var i = 0; i < V.cells.length; i++) {
      var t = V.cells[i];
      if (Math.random() > 0.38) continue;
      var a = Math.random() * Math.PI * 2;
      var m = (18 + Math.random() * 34) * (strength || 1);
      t._sx = Math.cos(a) * m; t._sy = Math.sin(a) * m;
      t._sp = 0;
    }
  }
  function wallRelax() {
    if (!V.cells) return;
    for (var i = 0; i < V.cells.length; i++) {
      var t = V.cells[i];
      if (t._sx || t._sy) { t._rx = t._sx; t._ry = t._sy; t._sx = 0; t._sy = 0; }
    }
  }
  // seize wall glyphs as the scene's own matter. fn(i, x, y) returns
  // { x, y } offsets toward the shape (or falsy to leave the cell alone);
  // tint/alpha dress them to the card's palette. The tick loop walks them
  // home with the same easing the rest of the room breathes by.
  function takeover(cells, fn) {
    if (!V.cells) return 0;
    var list = cells || V.cells, used = 0;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t._bx === undefined) { t._bx = t.x; t._by = t.y; }
      var spec = fn(i, t.x, t.y);
      if (!spec) continue;
      t._ox = spec.x; t._oy = spec.y;
      t._sp = 0;
      if (spec.tint !== undefined) t._tint = spec.tint;
      if (spec.a !== undefined) t._a = spec.a;
      used++;
    }
    return used;
  }
  function release(cells) {
    var list = cells || V.cells;
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t._ox === undefined) continue;
      // glide home from wherever the shape held them
      t._rx = (t._bx - t.x) * 0.16;
      t._ry = (t._by - t.y) * 0.16;
      delete t._ox; delete t._oy; delete t._a; delete t._tint;
      t.tint = 0xffffff;
    }
  }

  // ── the timeline clock ───────────────────────────────────────────────
  // at(ms, fn): scene-time scheduler; at(0, …) fires immediately.
  function at(ms, fn) {
    if (ms <= 0) { fn(); return; }
    after(ms, fn);
  }

  // ── reversal: the world turns over, then rights itself ───────────────
  function reversalWave(cx, cy) {
    SCENE.el.classList.add('m-flip');
    after(1400, function () { SCENE.el.classList.remove('m-flip'); });
    for (var i = 0; i < 22; i++) {
      (function (j) {
        after(340 + j * 26, function () {
          var d = px('#79dac8', cx - 200 + j * 19, cy - 1, 5);
          setTimeout(function () { d.classList.add('out'); }, 420);
        });
      })(i);
    }
  }

  // ── the scenes ───────────────────────────────────────────────────────
  // every scene(kw, cx, cy, card, rev) draws against the doc layer and
  // returns its own end-time; cardScene adds reversal + end housekeeping.
  var TL = {};

  TL.tower = function (kw, cx, cy) {
    var W = SCENE.w;
    var gy = cy + 118;
    var ax = cx + W * 0.20;                       // storm gathers right
    var sx = Math.max(140, cx - 250);             // art stands stage-left of the card
    // the wall leans in: a third of it pulled taut toward the tower's foot
    takeover(null, function (i, x, y) {
      var dx = cx - x, dy = (cy + 40) - y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > W * 0.55) return null;
      var pull = Math.min(1, 90 / d);
      return { x: dx * pull * 0.35, y: dy * pull * 0.3, tint: 0x8a8f9c, a: 0.55 };
    });
    for (var i = 0; i < 26; i++) {
      (function (j) { after(j * 45, function () { var d = px('#5c6370', ax + (Math.random() - 0.5) * 90, cy - 130 + Math.random() * 40, 5); setTimeout(function () { d.classList.add('out'); }, 900); }); })(i);
    }
    at(500, function () {
      art(sx - 70, cy - 60, [
        '       ##      ',
        '      ####     ',
        '      #  #     ',
        '     /####\\    ',
        '     #    #    ',
        '     #    #    ',
        '    /######\\   ',
        '    #      #   ',
        '    #  ##  #   ',
        '    #  ##  #   ',
        '  ~~########~~ '
      ], { color: '#8a8f9c', size: 12, stagger: 75 });
    });
    at(1250, function () {
      SCENE.el.classList.add('shiver');
      after(400, function () { SCENE.el.classList.remove('shiver'); });
      glow(cx + 90, cy - 40, 60, '#ff5454');
      art(sx + 34, cy - 150, ['  \\  ', '   \\ ', '    \\'], { color: '#ff5454', size: 12, stagger: 60 });
    });
    at(1800, function () {
      release();                                  // the wall itself falls out of shape
      wallScatter(1.15);
      var stones = '#8a8f9c';
      for (var i = 0; i < 22; i++) {
        (function (j) {
          after(j * 26, function () {
            var d = px(stones, cx - 60 + Math.random() * 120, cy - 40 + Math.random() * 40, 6);
            d.style.transition = 'opacity 1.1s ease, transform 1.1s cubic-bezier(0.3,0,0.7,1), background-color 0.45s linear';
            var dx = (Math.random() - 0.5) * 220, dy = 40 + Math.random() * 90;
            setTimeout(function () { d.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; d.classList.add('out'); }, 30);
          });
        })(i);
      }
      art(sx - 50, cy - 30, ['  ##      ##  ', ' ############ ', '  ## ~~   ##  '], { color: '#ff5454', size: 12, stagger: 90 });
      glow(sx, cy + 20, 70, '#ff5454', true);
    });
    at(2400, function () { stamp(kw, sx, cy + 116, { color: '#ff5454' }); });
    return 3900;
  };

  TL.wheel = function (kw, cx, cy) {
    ring(cx, cy, 120, '#80a0ff', { expand: true, loops: 4, gap: 8 });
    var sx = Math.max(140, cx - 250);
    at(250, function () {
      var a = art(sx - 55, cy - 58, [
        '  .-"""-.  ',
        ' /  TAR  \\ ',
        '|  O   R  |',
        '|  A   O  |',
        ' \\  RAT  / ',
        '  "-...-"  '
      ], { color: '#80a0ff', size: 12, stagger: 70 });
      a.classList.add('m-spin');
    });
    for (var i = 0; i < 10; i++) {
      (function (j) {
        after(400 + j * 210, function () {
          px(j % 2 ? '#e3c78a' : '#80a0ff', cx + Math.cos(j) * 100, cy + Math.sin(j * 1.7) * 80, 5);
        });
      })(i);
    }
    at(2350, function () { stamp(kw, cx, cy + 116, { color: '#80a0ff' }); });
    return 3800;
  };

  TL.star = function (kw, cx, cy) {
    var W = SCENE.w, gy = cy + 128;
    var sx = Math.max(140, cx - 250);
    glow(sx, cy - 84, 42, '#79dac8', true);
    // the wall's lower field gathers into the pool the water returns to
    takeover(null, function (i, x, y) {
      if (y < gy - 90) return null;
      var dx = x - cx, dy = y - gy;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > 170 || d < 40) return null;
      return { x: -dx * 0.72, y: -dy * 0.72, tint: 0x79dac8, a: 0.42 };
    });
    at(150, function () {
      art(sx - 8, cy - 96, ['*', '*'], { color: '#79dac8', size: 26, stagger: 220 });
    });
    at(700, function () {
      art(sx - 60, cy - 40, ['  ~ ', ' ~  ', ' ~  '], { color: '#3b6f6a', size: 12, stagger: 180 });
      art(sx - 14, cy + 6, [' o ', '/|\\', ' | '], { color: '#8a8f9c', size: 12, stagger: 120 });
    });
    var pour = setInterval(function () {
      if (!SCENE.active) { clearInterval(pour); return; }
      var d = px('#79dac8', sx - 6 + Math.random() * 8, cy - 26, 5);
      d.style.setProperty('--drop', String(gy - cy + 6));
      d.classList.add('fall');
      setTimeout(function () { d.remove(); }, 950);
    }, 90);
    SCENE.timers.push(pour);
    at(1900, function () {
      var pool = px('#79dac8', sx - 30, gy, 8);
      pool.style.width = '62px'; pool.style.height = '5px';
    });
    at(2300, function () { stamp(kw, sx, cy + 116, { color: '#79dac8' }); });
    return 3700;
  };

  TL.moon = function (kw, cx, cy) {
    var W = SCENE.w;
    veil();
    var sx = Math.max(140, cx - 250);
    var mx = cx + W * 0.16, my = cy - 110;
    takeover(null, function (i, x, y) {
      var dx = x - mx, dy = y - my;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > 150 || d < 52) return null;
      var want = 64;
      return { x: (dx / d) * (want - d), y: (dy / d) * (want - d), tint: 0xcf87e8, a: 0.34 };
    });
    at(400, function () { glow(cx + W * 0.16, cy - 110, 46, '#cf87e8', true); });
    at(700, function () { art(cx + W * 0.16 - 16, cy - 126, ['\u263e'], { color: '#cf87e8', size: 30, stagger: 100, cls: 'm-float' }); });
    var fog = setInterval(function () {
      if (!SCENE.active) { clearInterval(fog); return; }
      var d = px('#4a4458', cx - 160 + Math.random() * 320, cy + 60 + Math.random() * 50, 6);
      d.classList.add('rise');
      setTimeout(function () { d.remove(); }, 1500);
    }, 150);
    SCENE.timers.push(fog);
    at(1000, function () {
      art(sx - 150, cy + 40, [' /  ', '/   ', '    '], { color: '#3a3f4b', size: 12, stagger: 160 });
      art(sx + 90, cy + 46, ['\\   ', ' \\  ', '    '], { color: '#3a3f4b', size: 12, stagger: 160 });
      var d1 = px('#5c6370', sx - 70, cy + 58, 6); d1.classList.add('blink');
      var d2 = px('#5c6370', sx + 66, cy + 62, 6); d2.classList.add('blink');
    });
    at(2200, function () { release(); stamp(kw, cx, cy + 116, { color: '#cf87e8' }); });
    return 3700;
  };

  TL.sun = function (kw, cx, cy) {
    var W = SCENE.w;
    var sx = cx + W * 0.17, sy = cy - 100;
    glow(sx, sy, 60, '#e3c78a', true);
    takeover(null, function (i, x, y) {
      var dx = x - sx, dy = y - sy;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > 130 || d < 34) return null;
      var want = 44;
      return { x: (dx / d) * (want - d), y: (dy / d) * (want - d), tint: 0xe3c78a, a: 0.4 };
    });
    at(200, function () { art(cx + W * 0.17 - 14, cy - 118, ['\u2600'], { color: '#e3c78a', size: 30, stagger: 100 }); });
    at(800, function () {
      art(cx - 46, cy + 10, ['  o  ', ' /|\\ ', ' / \\ '], { color: '#bdbdbd', size: 12, stagger: 130 });
      art(cx - 100, cy - 20, ['#', '#'], { color: '#8cc85f', size: 12, stagger: 140 });
    });
    for (var i = 0; i < 12; i++) {
      (function (j) {
        after(500 + j * 160, function () {
          var a = j * 0.52, r = 88 + (j % 3) * 22;
          px('#e3c78a', cx + W * 0.17 + Math.cos(a) * r, cy - 96 + Math.sin(a) * r, 4);
        });
      })(i);
    }
    at(2000, function () { release(); stamp(kw, cx, cy + 116, { color: '#e3c78a' }); });
    return 3400;
  };

  TL.death = function (kw, cx, cy) {
    var W = SCENE.w;
    var sx = Math.max(140, cx - 250);
    veil();
    at(500, function () {
      art(sx - 12, cy - 96, ['\u271d'], { color: '#bdbdbd', size: 30, stagger: 100 });
      var hor = setInterval(function () {
        if (!SCENE.active) { clearInterval(hor); return; }
        var d = px('#5c6370', sx - 200, cy - 10 + Math.random() * 30, 5);
        d.classList.add('zoom-r');
        setTimeout(function () { d.remove(); }, 550);
      }, 130);
      SCENE.timers.push(hor);
    });
    at(1500, function () {
      var g = glow(sx, cy + 30, 80, '#bdbdbd');
      after(900, function () { g.classList.add('gone'); g.style.opacity = '0'; });
    });
    at(2200, function () { stamp(kw, sx, cy + 116, { color: '#bdbdbd' }); });
    return 3600;
  };

  TL.fool = function (kw, cx, cy) {
    var W = SCENE.w, gx = cx - W * 0.22, gy = cy + 118;
    at(200, function () {
      art(gx - 8, cy - 40, [' o ', '/|\\', ' \\ '], { color: '#8cc85f', size: 12, stagger: 110 });
      art(gx + 26, cy - 22, ['o'], { color: '#e3c78a', size: 12, stagger: 60 });
    });
    var pack = setInterval(function () {
      if (!SCENE.active) { clearInterval(pack); return; }
      var d = px('#5c6370', gx - 10 + Math.random() * 20, cy - 6, 4);
      d.classList.add('rise');
      setTimeout(function () { d.remove(); }, 1500);
    }, 300);
    SCENE.timers.push(pack);
    at(1200, function () {
      var step = setInterval(function () {
        if (!SCENE.active) { clearInterval(step); return; }
        gx += 4.2;
        after(0, function () {});
        var d = px('#8cc85f', gx, gy - Math.abs(Math.sin(Date.now() / 90)) * 8, 5);
        setTimeout(function () { d.remove(); }, 700);
        if (gx > cx + W * 0.18) clearInterval(step);
      }, 46);
      SCENE.timers.push(step);
    });
    at(2100, function () { stamp(kw, cx, cy + 116, { color: '#8cc85f' }); });
    return 3500;
  };

  TL.pour = function (kw, cx, cy) {
    var W = SCENE.w, gy = cy + 116;
    at(200, function () {
      art(cx - 96, cy - 40, ['  ___ ', ' |   |_', ' |____|'], { color: '#80a0ff', size: 12, stagger: 120 });
      art(cx + 44, cy + 8, [' _____ ', ' |     |', ' |_____|'], { color: '#80a0ff', size: 12, stagger: 120 });
    });
    var pour = setInterval(function () {
      if (!SCENE.active) { clearInterval(pour); return; }
      var d = px('#79dac8', cx - 34 + Math.random() * 10, cy - 24, 5);
      d.style.setProperty('--drop', String(gy - cy + 14));
      d.classList.add('fall');
      setTimeout(function () { d.remove(); }, 950);
    }, 80);
    SCENE.timers.push(pour);
    at(1800, function () { stamp(kw, cx, cy + 116, { color: '#80a0ff' }); });
    return 3300;
  };

  TL.chain = function (kw, cx, cy) {
    at(200, function () { art(cx - 6, cy - 90, ['\u2316'], { color: '#cf87e8', size: 28, stagger: 100 }); });
    at(700, function () {
      var y = cy - 60;
      var iv = setInterval(function () {
        if (!SCENE.active) { clearInterval(iv); return; }
        y += 13;
        if (y > cy + 60) { clearInterval(iv); return; }
        var d = px('#cf87e8', cx - 4, y, 6);
        d.style.transition = 'opacity 1.6s ease, transform 0.7s ease-out, background-color 0.45s linear';
        setTimeout(function () { d.classList.add('out'); }, 60);
      }, 110);
      SCENE.timers.push(iv);
    });
    at(1700, function () { stamp(kw, cx, cy + 116, { color: '#cf87e8' }); });
    return 3200;
  };

  TL.hermit = function (kw, cx, cy) {
    var W = SCENE.w;
    veil();
    at(500, function () { art(cx - 120, cy + 20, ['   /\\', '  /  \\', ' /    \\'], { color: '#3a3f4b', size: 12, stagger: 140 }); });
    at(1000, function () {
      art(cx - 118, cy - 6, [' o ', '/|\\'], { color: '#8a8f9c', size: 12, stagger: 110 });
      var g = glow(cx - 112, cy + 8, 26, '#e3c78a', true);
    });
    var beam = setInterval(function () {
      if (!SCENE.active) { clearInterval(beam); return; }
      var d = px('#e3c78a', cx - 104 + Math.random() * 14, cy + 20, 4);
      d.style.transition = 'opacity 1.4s ease, transform 1.4s ease-out, background-color 0.45s linear';
      d.style.transform = 'translate(6px, 10px)';
      setTimeout(function () { d.classList.add('out'); }, 40);
    }, 220);
    SCENE.timers.push(beam);
    at(2100, function () { stamp(kw, cx, cy + 116, { color: '#e3c78a' }); });
    return 3600;
  };

  TL.hang = function (kw, cx, cy) {
    at(200, function () { art(cx - 40, cy - 110, ['___________'], { color: '#5c6370', size: 12, stagger: 100 }); });
    at(700, function () {
      art(cx - 8, cy - 60, ['o', '/|', '/ '], { color: '#bdbdbd', size: 12, stagger: 140 });
      var rope = px('#5c6370', cx + 2, cy - 100, 4);
      rope.style.height = '44px'; rope.style.width = '3px';
    });
    at(1300, function () { SCENE.el.classList.add('m-flip'); after(1300, function () { SCENE.el.classList.remove('m-flip'); }); });
    at(2400, function () { stamp(kw, cx, cy + 116, { color: '#80a0ff' }); });
    return 3800;
  };

  TL.scales = function (kw, cx, cy) {
    at(200, function () {
      art(cx - 30, cy - 90, ['  ____  ', ' /    \\ ', '_________'], { color: '#e3c78a', size: 12, stagger: 130 });
    });
    at(800, function () {
      var l = art(cx - 92, cy - 64, ['#'], { color: '#e3c78a', size: 12, stagger: 1, cls: 'm-sway' });
      var r = art(cx + 78, cy - 64, ['#'], { color: '#e3c78a', size: 12, stagger: 1, cls: 'm-sway' });
      r.style.animationDelay = '-1.8s';
    });
    at(1600, function () { stamp(kw, cx, cy + 116, { color: '#e3c78a' }); });
    return 3100;
  };

  TL.union = function (kw, cx, cy) {
    var hx = cx - 70, kx = cx + 70;
    at(200, function () {
      art(hx - 8, cy - 40, [' o ', '/|\\'], { color: '#ff9db1', size: 12, stagger: 110 });
      art(kx - 8, cy - 40, [' o ', '/|\\'], { color: '#80a0ff', size: 12, stagger: 110 });
      var l1 = px('#ff9db1', hx, cy - 52, 5); l1.classList.add('blink');
      var l2 = px('#80a0ff', kx, cy - 52, 5); l2.classList.add('blink');
    });
    var meet = setInterval(function () {
      if (!SCENE.active) { clearInterval(meet); return; }
      hx += 1.6; kx -= 1.6;
    }, 46);
    SCENE.timers.push(meet);
    at(1900, function () {
      clearInterval(meet);
      var g = glow(cx, cy - 30, 56, '#cf87e8');
      after(700, function () { g.style.opacity = '0'; });
      stamp(kw, cx, cy + 116, { color: '#cf87e8' });
    });
    return 3400;
  };

  TL.charge = function (kw, cx, cy) {
    var W = SCENE.w;
    var x = cx - W * 0.3;
    at(200, function () {
      art(x - 14, cy - 30, [' o', '/|>', ' / \\'], { color: '#e3c78a', size: 12, stagger: 90 });
    });
    var run = setInterval(function () {
      if (!SCENE.active) { clearInterval(run); return; }
      x += 9;
      var d = px('#e3c78a', x - 18, cy - 12 + Math.random() * 6, 5);
      setTimeout(function () { d.remove(); }, 500);
      if (x > cx + W * 0.3) clearInterval(run);
    }, 50);
    SCENE.timers.push(run);
    at(1700, function () { stamp(kw, cx, cy + 116, { color: '#e3c78a' }); });
    return 3100;
  };

  TL.grow = function (kw, cx, cy) {
    var W = SCENE.w, gy = cy + 118;
    at(300, function () {
      var stem = art(cx - 3, cy - 10, ['|'], { color: '#8cc85f', size: 12, stagger: 1 });
      after(500, function () {
        art(cx - 3, cy - 30, ['*'], { color: '#cf87e8', size: 14, stagger: 1, cls: 'm-bob' });
        art(cx - 18, cy - 16, ['.', '.'], { color: '#8cc85f', size: 12, stagger: 160 });
      });
    });
    var spore = setInterval(function () {
      if (!SCENE.active) { clearInterval(spore); return; }
      var d = px('#8cc85f', cx - 60 + Math.random() * 120, gy - Math.random() * 12, 4);
      d.classList.add('rise');
      setTimeout(function () { d.remove(); }, 1500);
    }, 260);
    SCENE.timers.push(spore);
    at(1700, function () { stamp(kw, cx, cy + 116, { color: '#8cc85f' }); });
    return 3200;
  };

  TL.wall = function (kw, cx, cy) {
    var W = SCENE.w;
    at(200, function () {
      art(cx - 130, cy - 70, [
        '+---+---+---+---+---+',
        '|   |   |   |   |   |',
        '+---+---+---+---+---+',
        '|   |   |   |   |   |',
        '+---+---+---+---+---+'
      ], { color: '#8a8f9c', size: 12, stagger: 110 });
    });
    at(1500, function () { stamp(kw, cx, cy + 116, { color: '#8a8f9c' }); });
    return 3000;
  };

  TL.keys = function (kw, cx, cy) {
    at(200, function () {
      art(cx - 30, cy - 60, ['\u26a7'], { color: '#e3c78a', size: 26, stagger: 100 });
    });
    at(900, function () {
      var l = art(cx - 90, cy - 20, ['o-'], { color: '#e3c78a', size: 12, stagger: 1, cls: 'm-sway' });
      var r = art(cx + 74, cy - 20, ['o-'], { color: '#e3c78a', size: 12, stagger: 1, cls: 'm-sway' });
      r.style.animationDelay = '-0.8s';
    });
    at(1600, function () { stamp(kw, cx, cy + 116, { color: '#e3c78a' }); });
    return 3100;
  };

  TL.lion = function (kw, cx, cy) {
    at(200, function () {
      art(cx - 26, cy - 56, ['  ,-.  ', ' (o.o) ', '  "-"  '], { color: '#e3c78a', size: 12, stagger: 130, cls: 'm-sway-f' });
    });
    at(900, function () { art(cx + 60, cy - 96, ['\u221e'], { color: '#80a0ff', size: 24, stagger: 100 }); });
    for (var i = 0; i < 5; i++) {
      (function (j) { after(1100 + j * 260, function () { px('#e3c78a', cx - 40 + Math.random() * 80, cy - 30 + Math.random() * 30, 5); }); })(i);
    }
    at(1900, function () { stamp(kw, cx, cy + 116, { color: '#e3c78a' }); });
    return 3400;
  };

  TL.magician = function (kw, cx, cy) {
    at(200, function () {
      art(cx - 8, cy - 50, [' o ', '/|>'], { color: '#bdbdbd', size: 12, stagger: 110 });
      art(cx - 60, cy - 80, ['\u221e'], { color: '#80a0ff', size: 22, stagger: 100 });
    });
    for (var i = 0; i < 4; i++) {
      (function (j) {
        after(900 + j * 220, function () {
          var gl = ['#ff9db1', '#80a0ff', '#8cc85f', '#e3c78a'][j];
          var d = px(gl, cx + 14, cy - 44 + j * 6, 5);
          d.classList.add('blink');
        });
      })(i);
    }
    at(1800, function () { stamp(kw, cx, cy + 116, { color: '#80a0ff' }); });
    return 3300;
  };

  TL.veil = function (kw, cx, cy) {
    veil();
    at(500, function () {
      art(cx - 44, cy - 60, ['  |  |  ', '  |  |  ', ' --+-- '], { color: '#4a4458', size: 12, stagger: 130 });
      var d = px('#e3c78a', cx - 3, cy - 34, 6); d.classList.add('blink');
    });
    at(1600, function () { stamp(kw, cx, cy + 116, { color: '#e3c78a' }); });
    return 3100;
  };

  TL.world = function (kw, cx, cy) {
    ring(cx, cy, 130, '#8cc85f', { loops: 3, gap: 10 });
    // the whole near field gathered into the wreath
    takeover(null, function (i, x, y) {
      var dx = x - cx, dy = y - cy;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > 200 || d < 60) return null;
      var want = 132;
      return { x: (dx / d) * (want - d), y: (dy / d) * (want - d), tint: 0x8cc85f, a: 0.38 };
    });
    at(400, function () {
      art(cx - 4, cy - 6, ['o'], { color: '#8cc85f', size: 14, stagger: 1, cls: 'm-bob-f' });
    });
    at(1400, function () { stamp(kw, cx, cy + 96, { color: '#8cc85f' }); });
    at(2300, function () { release(); });
    return 3000;
  };

  TL.trumpet = function (kw, cx, cy) {
    for (var i = 0; i < 3; i++) {
      (function (j) {
        after(300 + j * 380, function () {
          ring(cx + (j - 1) * 60, cy - 40, 40 + j * 16, '#e3c78a', { expand: true, loops: 2, gap: 8 });
        });
      })(i);
    }
    at(1900, function () { stamp(kw, cx, cy + 116, { color: '#e3c78a' }); });
    return 3200;
  };

  // suits — synthesized from rank and count, anchored at the suit table
  function suitScene(suit, rank, count, cx, cy, kw, rev) {
    var sy = cy + 116;
    var colors = { wands: '#e3c78a', cups: '#80a0ff', swords: '#bdbdbd', pentacles: '#8cc85f' };
    var glyphs = { wands: '\u2665', cups: '\u2665', swords: '\u2660', pentacles: '\u2663' };
    var c = colors[suit];
    var top = 'the ' + (rank === 'ace' ? 'ace' : rank);
    var label = count > 1 && count <= 10 ? String(count) : (rank === 'ace' ? 'the ace' : top);
    var face = count > 4 || count === 0 ? glyphs[suit] + ' \u00d7 ' + count : new Array(count + 1).join(glyphs[suit]);
    if (suit === 'wands') {
      var flick = setInterval(function () {
        if (!SCENE.active) { clearInterval(flick); return; }
        var d = px('#e3c78a', cx - 60 + Math.random() * 120, sy - 60 + Math.random() * 30, 5);
        d.classList.add('rise');
        setTimeout(function () { d.remove(); }, 1500);
      }, 170);
      SCENE.timers.push(flick);
    } else if (suit === 'cups') {
      var fill = setInterval(function () {
        if (!SCENE.active) { clearInterval(fill); return; }
        var d = px('#79dac8', cx - 16 + Math.random() * 32, sy - 70, 4);
        d.style.setProperty('--drop', '70');
        d.classList.add('fall');
        setTimeout(function () { d.remove(); }, 950);
      }, 110);
      SCENE.timers.push(fill);
    } else if (suit === 'swords') {
      at(500, function () {
        for (var i = 0; i < 5; i++) {
          (function (j) {
            after(j * 190, function () {
              var d = px('#bdbdbd', cx - 80 + j * 40, cy - 90, 5);
              d.style.width = '3px'; d.style.height = '34px';
              d.style.transition = 'opacity 1.2s ease, transform 1.2s cubic-bezier(0.4,0,0.9,1), background-color 0.45s linear';
              setTimeout(function () { d.style.transform = 'translateY(120px)'; setTimeout(function () { d.classList.add('out'); }, 900); }, 40);
            });
          })(i);
        }
      });
    } else if (suit === 'pentacles') {
      ring(cx, sy - 46, 110, c, { expand: true, loops: 3, gap: 9 });
    }
    at(1400, function () {
      stamp(face, cx, sy - 40, { color: c, size: 22 });
      after(600, function () { stamp(kw, cx, cy + 116, { color: c }); });
    });
    return 3400;
  }

  var TITLE_FOR = {
    'the fool': 'the first step', 'the magician': 'the wand and the word',
    'the high priestess': 'behind the veil', 'the empress': 'the garden grows',
    'the emperor': 'the line drawn', 'the hierophant': 'the keys handed over',
    'the lovers': 'two, as one question', 'the chariot': 'the reins held',
    'strength': 'the gentle jaw', 'the hermit': 'one lamp, one step',
    'wheel of fortune': 'it turns', 'justice': 'the weight, returned',
    'the hanged man': 'the world, upside down', 'death': 'an ending, named',
    'temperance': 'two waters, one cup', 'the devil': 'the chain you did not see',
    'the tower': 'the structure, broken', 'the star': 'small light, far',
    'the moon': 'things, in water', 'the sun': 'open, burning',
    'judgement': 'a sound, far off', 'the world': 'a circle, closed',
    'ace of wands': 'a spark, struck', 'ace of cups': 'the cup, offered',
    'ace of swords': 'the first cut', 'ace of pentacles': 'the seed, in palm'
  };

  // ── the one public call: perform a card ──────────────────────────────
  var DUR = {
    tower: 3900, wheel: 3800, star: 3700, moon: 3700, sun: 3400, death: 3600,
    fool: 3500, pour: 3300, chain: 3200, hermit: 3600, hang: 3800, scales: 3100,
    union: 3400, charge: 3100, grow: 3200, wall: 3000, keys: 3100, lion: 3400,
    magician: 3300, veil: 3100, world: 3000, trumpet: 3200, spark: 2600
  };

  V.cardScene = function (card, rev, pip, opts) {
    opts = opts || {};
    if (!V.ready || V.reduced || !card) { if (opts.onActions) setTimeout(opts.onActions, 200); return 0; }
    var kind = (card.anim && card.anim.kind) || 'spark';
    var tl = (pip && pip.suit) ? 3400 : (DUR[kind] || 2600);
    var text = String(opts.text || '').slice(0, 260);
    var typeMs = text.length * 24 + 400;
    var total = 950 + tl + 600 + typeMs + 500;
    ensureFonts(function () {
      clearScene();
      var doc = document.createElement('div');
      doc.className = 'arc-doc';
      // the stage, not the field: the field is aria-hidden, and the doc
      // carries focusable keep/discard buttons
      var stage = V.host.parentNode || V.host;
      stage.appendChild(doc);
      if (stage.classList) stage.classList.add('scene-live');
      suspendSceneWork();
      SCENE.el = doc; SCENE.timers = []; SCENE.afters = [];
      SCENE.active = true;
      SCENE.w = stage.clientWidth; SCENE.h = stage.clientHeight;
      var W = SCENE.w;
      var cx = W * 0.56, cy = SCENE.h * 0.34;   // right of the top-left table pane
      var kw = (TITLE_FOR[String(card.name).toLowerCase()] || String(card.name)).toUpperCase();

      // the room recedes; the scene holds the stage
      holdWall(0.45);

      // the wall gathers into the card: nearby matter pulled to its rim
      takeover(null, function (i, x, y) {
        var dx = x - cx, dy = y - cy;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d > 300 || d < 150) return null;
        var want = 168;
        return { x: (dx / d) * (want - d) * 0.5, y: (dy / d) * (want - d) * 0.5, tint: 0x8a8f9c, a: 0.3 };
      });

      var frame = cardFrame(card, cx, cy, {});
      frame.enter(rev);

      at(950, function () {
        if (pip && pip.suit) suitScene(pip.suit, pip.rank, pip.count, cx, cy, kw, rev);
        else if (TL[kind]) TL[kind](kw, cx, cy, card, rev);
        else if (card.anim && card.anim.words) {
          for (var i = 0; i < card.anim.words.length; i++) {
            (function (j) { after(j * 150, function () { px('#e3c78a', cx - 40 + Math.random() * 80, cy - 60 + Math.random() * 70, 5); }); })(i);
          }
        }
      });

      // the interpretation types itself under the card; the citations
      // land at the foot of the stage once the reading is written
      var typeY = cy + 168;
      at(950 + tl + 500, function () {
        release();
        if (text) typewriter(text, Math.max(30, cx - 250), typeY, { width: Math.min(520, W - 60), speed: 24 });
        if (opts.cite) {
          var cite = document.createElement('div');
          cite.className = 'scite pg';
          cite.textContent = opts.cite;
          cite.style.left = '50%';
          cite.style.top = Math.round(SCENE.h - 30) + 'px';
          SCENE.el.appendChild(cite);
          after(typeMs, function () { cite.classList.add('on'); });
        }
      });

      // reversal reads twice: the sweep first, the name after
      if (rev) {
        at(420, function () { reversalWave(cx, cy - 40); });
        at(950 + tl - 200, function () { stamp('READ IT UPSIDE DOWN', cx, cy - 120, { color: '#79dac8', size: 15, hold: 200, holdFor: 2400 }); });
      }

      // the actions: keep / discard, inline on the stage, after the type.
      // landActions is named so the skip button can jump straight here.
      var landed = false;
      var landActions = function () {
        if (landed) return;
        landed = true;
        var sk = doc.querySelector('.act-skip');
        if (sk && sk.parentNode) sk.parentNode.removeChild(sk);
        stageActions(function (choice) {
          if (choice === 'keep') { if (opts.onKeep) opts.onKeep(); }
          else if (choice === 'discard') { if (opts.onDiscard) opts.onDiscard(); }
          endScene(500);
        });
      };
      var skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'act act-skip on';
      skip.innerHTML = '<span class="act-key">[s]</span> skip';
      skip.style.left = 'auto';
      skip.style.right = '12px';
      skip.style.top = '12px';
      skip.style.transform = 'none';
      skip.addEventListener('click', function () {
        for (var si = 0; si < SCENE.timers.length; si++) clearTimeout(SCENE.timers[si]);
        SCENE.timers = [];
        landActions();
      });
      doc.appendChild(skip);
      try { skip.focus({preventScroll: true}); } catch (e) {}
      at(950 + tl + 600 + typeMs, landActions);

      // if the stage is torn down before a choice (pane closed, menu hit),
      // the card quietly returns to the stack — nothing is kept unseen
      SCENE.afters.push(function () {
        if (SCENE.chose) return;
        SCENE.chose = true;
        if (opts.onDiscard) { try { opts.onDiscard(); } catch (e) {} }
      });

      SCENE.endMs = total;
    });
    return total;
  };

  // stage actions: the reading's own keep/discard, drawn as terminal rows
  function stageActions(choose, yOverride) {
    var y = yOverride || SCENE.h * 0.34 + 300;
    SCENE.chose = false;
    var wrapped = function (c) { SCENE.chose = true; choose(c); };
    var mkBtn = function (label, key, choice, delay) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'act';
      b.innerHTML = '<span class="act-key">[' + key + ']</span> ' + label;
      b.style.left = '50%';
      b.style.top = Math.round(y) + 'px';
      SCENE.el.appendChild(b);
      after(delay, function () {
        b.classList.add('on');
        b.addEventListener('click', function () { wrapped(choice); });
      });
      return b;
    };
    mkBtn('keep it on the shelf', 'k', 'keep', 60);
    var d = mkBtn('back in the stack', 'd', 'discard', 260);
    d.style.top = Math.round(y + 44) + 'px';
    var onKey = function (e) {
      if (e.key === 'k' || e.key === 'K') { cleanup(); wrapped('keep'); }
      else if (e.key === 'd' || e.key === 'D') { cleanup(); wrapped('discard'); }
    };
    function cleanup() { document.removeEventListener('keydown', onKey); }
    document.addEventListener('keydown', onKey);
    SCENE.afters.push(cleanup);
  }

  // ── shared stage verbs: the other two games emerge from the same void ─
  // beginScene opens the doc layer and holds the wall; the verbs below
  // draw and dissolve against it. All no-op safely when the field is flat.
  V.sceneActive = function () { return SCENE.active; };

  V.beginScene = function () {
    if (!V.ready || V.reduced) return false;
    ensureFonts(function () {});
    clearScene();
    var doc = document.createElement('div');
    doc.className = 'arc-doc';
    var stage = V.host.parentNode || V.host;
    stage.appendChild(doc);
    if (stage.classList) stage.classList.add('scene-live');
    SCENE.el = doc; SCENE.timers = []; SCENE.afters = [];
    SCENE.active = true;
    SCENE.w = stage.clientWidth; SCENE.h = stage.clientHeight;
    holdWall(0.45);
    return true;
  };

  // pull nearby wall glyphs toward a point, let them drift home again
  V.gatherAt = function (x, y, radius, tint, ms) {
    if (!SCENE.active || !V.cells) return;
    takeover(null, function (i, gx, gy) {
      var dx = gx - x, dy = gy - y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > (radius || 160) || d < 26) return null;
      return { x: -dx * 0.4, y: -dy * 0.4, tint: tint || 0x80a0ff, a: 0.35 };
    });
    after(ms || 1100, function () { release(); });
  };

  // the stage's compose point (right of the top-left table pane)
  V.stageX = function () { return SCENE.w ? SCENE.w * 0.56 : 400; };
  V.stageY = function () { return SCENE.h ? SCENE.h * 0.34 : 200; };

  // one hexagram line condenses onto the stage (n = 1..6, bottom first)
  V.hexLineStage = function (n, yang, changing) {
    if (!SCENE.active) return;
    var W = SCENE.w, H = SCENE.h;
    var cx = W * 0.56, y = H * 0.14 + (6 - n) * 30;
    V.gatherAt(cx, y, 130, changing ? 0xe3c78a : 0x80a0ff, 800);
    after(350, function () {
      var bar = yang ? '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501'
                     : '\u2501\u2501\u2501\u2501\u2501 \u2501\u2501\u2501\u2501\u2501';
      var a = art(cx - 95, y - 8, [bar], { color: changing ? '#e3c78a' : '#80a0ff', size: 16, stagger: 1 });
      if (changing) a.classList.add('m-sway-f');
      for (var i = 0; i < 5; i++) {
        (function (j) { after(j * 70, function () {
          var d = px(changing ? '#e3c78a' : '#80a0ff', cx - 85 + Math.random() * 170, y + 10, 4);
          setTimeout(function () { d.remove(); }, 900);
        }); })(i);
      }
    });
  };

  // a word emitted out of the void: condenses, holds, floats away
  V.stageWord = function (word, color, opts) {
    if (!SCENE.active) return null;
    opts = opts || {};
    var W = SCENE.w;
    var s = document.createElement('div');
    s.className = 'wemit pg';
    s.textContent = String(word);
    s.style.left = Math.round(opts.x !== undefined ? opts.x : W * 0.56) + 'px';
    s.style.top = Math.round(opts.y !== undefined ? opts.y : SCENE.h * 0.30) + 'px';
    s.style.color = color || 'var(--fg)';
    SCENE.el.appendChild(s);
    after(30, function () { s.classList.add('on'); });
    after(opts.hold || 1500, function () { s.classList.add('wout'); });
    return s;
  };

  // the standing cue: big, breathing, replaced with a dissolve
  V.stageCue = function (word) {
    if (!SCENE.active) return null;
    var old = SCENE.el.querySelector('.cueword');
    if (old) { old.classList.add('out'); var o = old; after(500, function () { o.remove(); }); }
    var s = document.createElement('div');
    s.className = 'cueword pg';
    s.textContent = String(word).toUpperCase();
    s.style.left = Math.round(SCENE.w * 0.56) + 'px';
    s.style.top = Math.round(SCENE.h * 0.28) + 'px';
    SCENE.el.appendChild(s);
    after(30, function () { s.classList.add('on'); });
    return s;
  };

  V.cueOut = function () {
    if (!SCENE.active) return;
    var old = SCENE.el.querySelector('.cueword');
    if (old) { old.classList.add('out'); var o = old; after(600, function () { o.remove(); }); }
  };

  V.typeOut = function (text, opts) {
    if (!SCENE.active) return 0;
    opts = opts || {};
    var x = opts.x !== undefined ? opts.x : Math.max(30, SCENE.w * 0.56 - 260);
    var t = typewriter(String(text), x, opts.y !== undefined ? opts.y : SCENE.h * 0.56,
      { width: opts.width || 520, speed: opts.speed || 22, color: opts.color });
    return t.ms;
  };

  V.stageCite = function (cite) {
    if (!SCENE.active || !cite) return;
    var c = document.createElement('div');
    c.className = 'scite pg';
    c.textContent = cite;
    c.style.left = '50%';
    c.style.top = Math.round(SCENE.h - 26) + 'px';
    SCENE.el.appendChild(c);
    after(200, function () { c.classList.add('on'); });
  };

  // the shared end-of-game reading: title stamp, typed text, citations,
  // then keep/discard inline. both other games land here.
  V.stageReading = function (o) {
    if (!SCENE.active) { if (o.fallback) o.fallback(); return 0; }
    suspendSceneWork();
    var W = SCENE.w, H = SCENE.h;
    stamp(String(o.title || '').toUpperCase(), W * 0.56, H * 0.50,
      { color: o.color || '#80a0ff', hold: 400, holdFor: 2600 });
    var text = String(o.text || '');
    var typeMs = text.length * (o.speed || 14) + 400;
    after(1100, function () {
      V.typeOut(text, { y: H * 0.56, width: Math.min(540, Math.max(320, W * 0.52)), speed: o.speed || 14, color: o.textColor });
      if (o.cite) after(typeMs, function () { V.stageCite(o.cite); });
    });
    after(1100 + typeMs + 800, function () {
      stageActions(function (choice) {
        if (choice === 'keep') { if (o.onKeep) o.onKeep(); }
        else if (choice === 'discard') { if (o.onDiscard) o.onDiscard(); }
        endScene(500);
      }, Math.round(H * 0.84));
    });
    return 1100 + typeMs + 1400;
  };

  V.endScene = endScene;
  V.clearScene = clearScene;
  V.pauseAll = pauseAll;
  V.resumeAll = resumeAll;
  V.holdWall = holdWall;
  V.wallScatter = wallScatter;
  V.wallRelax = wallRelax;
  V.wallTakeover = function (fn) { return takeover(null, fn); };
  V.wallRelease = function () { release(); };

  window.ARCANA_VIZ = V;
})();
