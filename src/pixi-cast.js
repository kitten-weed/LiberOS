// pixi-cast.js — the cutscene's stage: light, air, and physical speaker plates.
//
// WHY THIS EXISTS
//
// The cast used to be four to six boxes pinned to fixed `left`/`top` percentages
// with a canned hover keyframe each — a 5.8s drift of two or three pixels. The
// stage had 55 keyframes of theatre and none of it was in the plates: they never
// moved anywhere, never touched, never reacted to each other. A conversation
// between five characters looked like five sticky notes on a wall. The room
// behind them was black and the panel behind THAT was a magenta wash nobody
// could account for, so the whole scene read as a glowing rectangle floating in
// a void rather than a place the machine was showing you.
//
// So the plates are bodies now. Each has mass, a lean, and a temperament, and it
// gets shoved when its neighbour takes the floor. Physics is the personality:
// Wanderlust is light and bouncy and will not settle, Physius is stone and
// barely moves, Arcana drifts in long arcs, Vanir is nearly immovable, and the
// traveller — whose box the player reads — holds the centre.
//
// WHAT PIXI OWNS HERE, AND WHY IT IS NOT DECORATION
//
// CSS keeps the plates: their materials, seals, ink trails, type and personality
// are authored in styles/cutscene.css and stay there. Pixi owns the SPACE they
// move through, which is the part the DOM cannot do at all:
//
//   · a projection shadow per plate that moves, spreads and softens with the
//     plate's real elevation, recomputed every frame
//   · air. A dust field that inherits velocity from plates moving through it, so
//     a shove puffs the dust and the dust settles again
//   · motion streaks trailing fast plates, the way phosphor lags a moving beam
//   · one key light, tinted by the room's own authored lamp, so the cutscene is
//     lit by the same light as the room the machine stands in
//
// The transform it writes is an OFFSET on top of each plate's authored position,
// never a replacement for it, so every existing layout rule (including the
// `has-poppet` reflow that turns the cast into a stacked column) keeps working.
//
// Reads no project data. IIFE. file://-safe.

(function (global) {
  'use strict';
  if (global.__liberCast) return;
  global.__liberCast = true;

  var PIXI = global.PIXI;
  if (!PIXI) return;

  var REDUCED = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ── temperament ─────────────────────────────────────────────────────────
  // These numbers ARE the characters. `spring` is how hard a plate returns to
  // where it belongs (low = wanders), `damp` how long it argues about it (high =
  // keeps moving), `rest` how much energy it keeps in a collision (high = bouncy,
  // low = dead stone), `idle`/`idleSpeed` the size and pace of its resting drift,
  // `wobble` how much it leans, `elev` how far it floats above the table and so
  // how far it throws its shadow, and `leash` how far it can be knocked from
  // where it lives. The leash is character too: Wanderlust is authored as
  // "physically impossible to contain" and gets thrown across the stage, Vanir
  // is a standing stone and takes one step and stops.
  var CAST = {
    // the traveller's own voice: the box the player is reading. Steady, central,
    // and heavier than anything it argues with.
    'liber-vacui': { mass: 1.30, spring: 16, damp: 0.940, rest: 0.34, idle: 5, idleSpeed: 0.55, wobble: 1.2, elev: 6, leash: 44 },
    // restless, light, will not settle. bumps into people.
    wanderlust: { mass: 0.70, spring: 9, damp: 0.975, rest: 0.72, idle: 13, idleSpeed: 1.25, wobble: 4.5, elev: 10, leash: 92 },
    // precise and twitchy: returns fast, arrives in steps of its own.
    riason: { mass: 0.95, spring: 13, damp: 0.960, rest: 0.48, idle: 8, idleSpeed: 0.85, wobble: 2.6, elev: 7, leash: 60 },
    // stone. almost nothing moves it and it stops the moment it lands.
    physius: { mass: 1.90, spring: 22, damp: 0.930, rest: 0.16, idle: 3, idleSpeed: 0.35, wobble: 0.7, elev: 4, leash: 32 },
    // floats in long, slow arcs. the lightest thing on the stage.
    arcana: { mass: 0.80, spring: 7, damp: 0.985, rest: 0.60, idle: 15, idleSpeed: 0.45, wobble: 3.4, elev: 12, leash: 86 },
    // a standing stone. it is present, it does not travel.
    vanir: { mass: 2.60, spring: 30, damp: 0.920, rest: 0.10, idle: 2, idleSpeed: 0.25, wobble: 0.4, elev: 3, leash: 22 }
  };
  var DEFAULT_CFG = CAST['liber-vacui'];

  // ── state ───────────────────────────────────────────────────────────────
  var castEl = null, rootEl = null, canvas = null, app = null;
  var lightLayer = null, fxLayer = null, dustLayer = null;
  // glass weather: see the sky block below. The layer order is additive — this
  // is the one part of the cutscene where the SURFACE is the performer.
  var skyLayer = null, skyCracks = null, skyWarm = null, skyVoid = null, skyStars = null;
  var bodies = [];
  var raf = 0, last = 0, started = false, suspended = false;
  var collisions = 0, shoves = 0, shoveCount = 0;
  var pointer = { x: 0.5, y: 0.5 }, eased = { x: 0.5, y: 0.5 };
  // The DOM plates and the room register already carry the scene. Pixi dust
  // is only air between them, not a second starfield.
  var dust = [], dustCount = 0, DUST_MAX = 35;
  var plateTex = null, dotTex = null;

  function hash(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

  function pick(name) {
    var b = null;
    for (var i = 0; i < bodies.length; i++) if (bodies[i].speaker === name) b = bodies[i];
    return b;
  }

  // ── reading the plates off the DOM ──────────────────────────────────────
  // Only the plates that live in the cast stage are physical. In `has-poppet`
  // mode two plates are deliberately pulled out to the root as sidecars next to a
  // real worktable, and those must stay put: they are beside a form the player is
  // filling in, and a shove there would move a control's label.
  function refresh() {
    if (!castEl) return;
    var els = castEl.querySelectorAll('.ctv-body');
    var next = [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var speaker = el.dataset.speaker || '';
      var found = null;
      for (var j = 0; j < bodies.length; j++) if (bodies[j].el === el) found = bodies[j];
      if (found) { next.push(found); continue; }
      var cfg = CAST[speaker] || DEFAULT_CFG;
      next.push({
        el: el, speaker: speaker, cfg: cfg,
        seed: hash(i * 31.7 + speaker.length * 7.3) * 12.6,
        ox: 0, oy: 0, vx: 0, vy: 0, a: 0, va: 0,
        hx: 0, hy: 0, hw: 0, hh: 0,
        speed: 0, lift: 0, flash: 0
      });
    }
    bodies = next;
    for (var k = 0; k < bodies.length; k++) measure(bodies[k]);
  }

  // offsetLeft/offsetTop are layout positions and are unaffected by the transform
  // this file writes, which is what makes the offset-on-top-of-home model work:
  // the plate's authored position stays authoritative and the physics is a
  // displacement from it.
  //
  // Stored as the plate's CENTRE, because that is what every other function here
  // means by hx/hy. Storing the left edge instead — which is what offsetLeft
  // gives — makes collide() and contain() reason about a box half a plate off
  // from where it actually is, and the plate gets shoved the difference.
  function measure(b) {
    try {
      b.hx = b.el.offsetLeft + b.el.offsetWidth / 2;
      b.hy = b.el.offsetTop + b.el.offsetHeight / 2;
      b.hw = b.el.offsetWidth / 2;
      b.hh = b.el.offsetHeight / 2;
    } catch (e) { /* detached mid-measure; the next refresh picks it up */ }
  }

  function visible(b) {
    return !!b.el && b.el.isConnected && !b.el.classList.contains('ctv-poppet-sidecar');
  }

  // ── physics ─────────────────────────────────────────────────────────────
  function step(b, dt, t) {
    var c = b.cfg;
    // the resting drift, an orbit around the authored home
    var ix = Math.cos(t * c.idleSpeed + b.seed) * c.idle;
    var iy = Math.sin(t * c.idleSpeed * 0.8 + b.seed * 1.7) * c.idle * 0.55;

    b.vx += (ix - b.ox) * c.spring * dt;
    b.vy += (iy - b.oy) * c.spring * dt;
    var d = Math.pow(c.damp, dt * 60);
    b.vx *= d; b.vy *= d;
    b.ox += b.vx * dt; b.oy += b.vy * dt;

    // the lean follows the movement, so a shove reads as the plate tipping
    var target = Math.sin(t * c.idleSpeed * 0.6 + b.seed) * c.wobble + b.vx * 0.05;
    b.va += (target - b.a) * c.spring * 0.35 * dt;
    b.va *= d;
    b.a += b.va * dt;

    b.speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    // elevation: how far off the table it is right now. The idle float plus a
    // push from its own speed, which is what makes a fast plate look airborne.
    b.lift = c.elev * (0.55 + 0.45 * Math.sin(t * c.idleSpeed + b.seed)) + Math.min(18, b.speed * 0.35);
    if (b.flash > 0) b.flash -= dt * 1.6;
  }

  function collide(a, b) {
    var dx = (a.hx + a.ox) - (b.hx + b.ox);
    var dy = (a.hy + a.oy) - (b.hy + b.oy);
    var ox = (a.hw + b.hw) - Math.abs(dx);
    var oy = (a.hh + b.hh) - Math.abs(dy);
    if (ox <= 0 || oy <= 0) return false;

    var nx = 0, ny = 0, pen = 0;
    if (ox < oy) { nx = dx < 0 ? -1 : 1; pen = ox; }
    else { ny = dy < 0 ? -1 : 1; pen = oy; }

    var invA = 1 / a.cfg.mass, invB = 1 / b.cfg.mass;
    var invSum = invA + invB;
    if (!invSum) return false;

    a.ox += nx * pen * (invA / invSum) * 0.62;
    a.oy += ny * pen * (invA / invSum) * 0.62;
    b.ox -= nx * pen * (invB / invSum) * 0.62;
    b.oy -= ny * pen * (invB / invSum) * 0.62;

    var vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (vn >= 0) return false;

    var e = Math.min(a.cfg.rest, b.cfg.rest);
    var j = (-(1 + e) * vn) / invSum;
    a.vx += j * nx * invA; a.vy += j * ny * invA;
    b.vx -= j * nx * invB; b.vy -= j * ny * invB;
    // off-centre contact spins the plate
    a.va += (nx * j * invA) * 0.55;
    b.va -= (ny * j * invB) * 0.55;
    // ...and both of them flare, so a collision is visible as a collision and
    // not just two boxes that happen to have stopped overlapping.
    a.flash = Math.max(a.flash, Math.min(0.7, 0.14 + Math.abs(vn) / 90));
    b.flash = Math.max(b.flash, Math.min(0.7, 0.14 + Math.abs(vn) / 90));
    // remember the contact so the render can flare a shadow at the touch point
    var mx = (a.hx + a.ox + b.hx + b.ox) / 2;
    var my = (a.hy + a.oy + b.hy + b.oy) / 2;
    sparks.push({ x: mx, y: my, t: 1, vx: nx * 22, vy: ny * 22 });
    if (sparks.length > 90) sparks.shift();
    collisions++;
    return true;
  }

  var sparks = [];

  // A leash, not a wall.
  //
  // The first version clamped the plate's whole box inside the stage. That is
  // wrong twice over: the authored layout deliberately runs plates past the edge
  // (`.ctv-stage` clips them, by design), and clamping the BOX fights the spring
  // rather than damping it, so the plate settles wherever the two agree instead
  // of where it belongs. Measured at 198px from home — the plate was pinned
  // against a wall it was never asked to respect.
  //
  // What a shoved plate actually needs is a limit on how far it can be knocked
  // from where it lives, with the wall taking the energy rather than sliding it.
  var LEASH_X = 54, LEASH_Y = 40;
  function contain(b) {
    var lx = b.cfg.leash || LEASH_X;
    var ly = lx * (LEASH_Y / LEASH_X);
    if (b.ox > lx) { b.ox = lx; if (b.vx > 0) b.vx = -b.vx * b.cfg.rest; }
    else if (b.ox < -lx) { b.ox = -lx; if (b.vx < 0) b.vx = -b.vx * b.cfg.rest; }
    if (b.oy > ly) { b.oy = ly; if (b.vy > 0) b.vy = -b.vy * b.cfg.rest; }
    else if (b.oy < -ly) { b.oy = -ly; if (b.vy < 0) b.vy = -b.vy * b.cfg.rest; }
  }

  // Taking the floor is a physical event. The plate leans in toward the centre of
  // the stage and everyone it lands on gets moved out of its way. This is the
  // whole point of the file: turn-taking you can see.
  function shove(name) {
    var b = pick(name);
    if (!b) return;
    var cx = (b.hx + b.ox), cy = (b.hy + b.oy);
    var tx = (castEl.clientWidth || 1) * 0.5;
    var ty = (castEl.clientHeight || 1) * 0.46;
    var dx = tx - cx, dy = ty - cy;
    var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    b.vx += (dx / len) * 46 * (1 / b.cfg.mass);
    b.vy += (dy / len) * 30 * (1 / b.cfg.mass);
    b.va += 2.4;

    for (var i = 0; i < bodies.length; i++) {
      var o = bodies[i];
      if (o === b) continue;
      var ox = (o.hx + o.ox) - cx, oy = (o.hy + o.oy) - cy;
      var l = Math.max(40, Math.sqrt(ox * ox + oy * oy));
      var push = 34 * (1 / o.cfg.mass);
      o.vx += (ox / l) * push;
      o.vy += (oy / l) * push;
      o.va -= 1.6 * (1 / o.cfg.mass);
    }
    shoveCount++;
  }

  // ── rendering ───────────────────────────────────────────────────────────
  function plateTexture(renderer) {
    var g = new PIXI.Graphics();
    // a soft rounded slab: the shape a projected shadow wants, not a hard rect
    for (var i = 8; i >= 1; i--) {
      var t = i / 8;
      g.roundRect(-60 * t, -26 * t, 120 * t, 52 * t, 26 * t * 0.32)
        .fill({ color: 0xffffff, alpha: 0.05 + (1 - t) * (1 - t) * 0.8 });
    }
    try { return renderer.generateTexture({ target: g, resolution: 1 }); }
    catch (e) { return renderer.generateTexture(g); }
  }

  function dotTexture(renderer) {
    var g = new PIXI.Graphics();
    for (var i = 6; i >= 1; i--) {
      var t = i / 6;
      g.circle(8, 8, 7 * t).fill({ color: 0xffffff, alpha: 0.06 + (1 - t) * (1 - t) * 0.9 });
    }
    try { return renderer.generateTexture({ target: g, resolution: 1 }); }
    catch (e) { return renderer.generateTexture(g); }
  }

  function buildScene() {
    var renderer = app.renderer;
    plateTex = plateTexture(renderer);
    dotTex = dotTexture(renderer);

    lightLayer = new PIXI.Container({ label: 'cast-light' });
    skyLayer = new PIXI.Container({ label: 'cast-sky' });
    skyCracks = new PIXI.Graphics();
    skyWarm = new PIXI.Graphics();
    skyVoid = new PIXI.Graphics();
    skyStars = new PIXI.ParticleContainer({
      texture: dotTex,
      dynamicProperties: { position: true, color: true, alpha: true, scale: true }
    });
    skyStars.blendMode = 'normal';
    skyLayer.addChild(skyWarm, skyStars, skyVoid, skyCracks);
    fxLayer = new PIXI.Container({ label: 'cast-fx' });
    dustLayer = new PIXI.ParticleContainer({
      texture: dotTex,
      dynamicProperties: { position: true, color: true, alpha: true, scale: true }
    });
    // Additive dust turned every mote into a competing light source. Keep the
    // air on the room's normal material so it cannot bleach the dialogue.
    dustLayer.blendMode = 'normal';

    // One key light, above and slightly behind the stage, tinted by the room's
    // own authored lamp so the cutscene belongs to the same room as the machine.
    // Drawn as one Graphics per gradient with graded alpha fills — the earlier
    // 14-step concentric-ring approximation banded into visible arcs on
    // wide windows; fewer, softer passes with a screen blend read as one light.
    var pal = global.LiberPalette ? global.LiberPalette.room() : null;
    var lamp = pal ? pal.lampCore : 0xffd9a0;
    var wash = pal ? pal.lampWash.color : 0xffc680;
    var key = new PIXI.Graphics();
    var w = app.renderer.screen.width || 800, h = app.renderer.screen.height || 560;
    for (var r = 6; r >= 1; r--) {
      var t = r / 6;
      key.ellipse(w * 0.5, -h * 0.12, w * 0.78 * t, h * 0.78 * t)
        .fill({ color: lamp, alpha: 0.010 + (1 - t) * (1 - t) * 0.012 });
    }
    for (var r2 = 5; r2 >= 1; r2--) {
      var t2 = r2 / 5;
      key.ellipse(w * 0.5, h * 1.04, w * 0.7 * t2, h * 0.5 * t2)
        .fill({ color: wash, alpha: 0.008 + (1 - t2) * (1 - t2) * 0.009 });
    }
    key.blendMode = 'add';
    lightLayer.addChild(key);

    app.stage.addChild(lightLayer, skyLayer, dustLayer, fxLayer);

    // air
    for (var i = 0; i < DUST_MAX; i++) {
      var p = new PIXI.Particle({
        texture: dotTex,
        x: hash(i * 3.1) * w,
        y: hash(i * 7.7) * h,
        scaleX: 0.08 + hash(i * 5.3) * 0.18,
        scaleY: 0.08 + hash(i * 5.3) * 0.18,
        anchorX: 0.5, anchorY: 0.5,
        tint: i % 11 === 0 ? lamp : (i % 7 === 0 ? wash : 0xffffff),
        alpha: 0.025 + hash(i * 11.3) * 0.055
      });
      dustLayer.addParticle(p);
      dust.push({ p: p, vx: 0, vy: 0, base: p.alpha, drift: 0.4 + hash(i * 2.7) * 1.3 });
    }
    dustCount = dust.length;
  }

  function clearScene() {
    for (var i = fxLayer.children.length - 1; i >= 0; i--) {
      var c = fxLayer.children[i];
      fxLayer.removeChild(c);
      if (!c.destroyed) c.destroy({ children: true });
    }
  }

  // ── glass weather ────────────────────────────────────────────────────────
  //
  // The ritual is staged as four changes to the SCREEN, not to the boxes:
  // hairline fractures in the bezel, stars populating the monitor, a distant
  // warm colour entering the tube, and a chatbox built out of the fractures.
  // Vanir's arrival is the inverse — a region of the glass that stops
  // rendering. CSS cannot express any of it faithfully (a linear-gradient is a
  // straight line; a fracture is not), and the four effects are the tutorial's
  // one true spectacle, so they are drawn on the GPU: Graphics for the
  // geometry, one batched ParticleContainer for the star field, additive
  // gradients for the weather, all tinted from the room's own lamp.
  //
  // Amounts are 0..1 and eased per frame, so a caller can fade a layer out as
  // easily as it fades one in (the cracks fade as the chatbox assembles out of
  // them, and Wanderlust's arrival clears Vanir's void).
  var sky = {
    cracks: 0, cracksTo: 0,
    stars: 0, starsTo: 0,
    warm: 0, warmTo: 0,
    void: 0, voidTo: 0,
    lines: [], built: null, starItems: [], starsBuilt: null
  };

  function buildCrackLines(w, h) {
    var lines = [];
    for (var i = 0; i < 11; i++) {
      var edge = i % 4;
      var t = (i * 37 % 100) / 100;
      var x, y, ang;
      if (edge === 0) { x = w * (0.06 + t * 0.88); y = -2; ang = Math.PI / 2; }
      else if (edge === 1) { x = w * (0.06 + t * 0.88); y = h + 2; ang = -Math.PI / 2; }
      else if (edge === 2) { x = -2; y = h * (0.08 + t * 0.84); ang = 0; }
      else { x = w + 2; y = h * (0.08 + t * 0.84); ang = Math.PI; }
      var span = (0.10 + hash(i * 5.7) * 0.24) * Math.min(w, h);
      var a = ang + (hash(i * 9.1) - 0.5) * 0.9;
      var steps = 8 + Math.floor(hash(i * 2.3) * 7);
      var pts = [[x, y]];
      for (var s = 0; s < steps; s++) {
        a += (hash(i * 13.7 + s * 4.1) - 0.5) * 0.75;
        x += Math.cos(a) * (span / steps);
        y += Math.sin(a) * (span / steps);
        pts.push([x, y]);
      }
      lines.push(pts);
    }
    return lines;
  }

  function buildSkyStars(w, h) {
    var n = 120;
    for (var i = 0; i < n; i++) {
      var p = new PIXI.Particle({
        texture: dotTex,
        x: hash(i * 4.7) * w,
        y: hash(i * 8.3) * h * 0.84,
        scaleX: 0.05 + hash(i * 2.1) * 0.15,
        scaleY: 0.05 + hash(i * 2.1) * 0.15,
        anchorX: 0.5, anchorY: 0.5,
        // starfield stays in the machine's own warm register: cream, gold and
        // lamp-amber. The old pink/lilac accents fought the room palette.
        tint: i % 9 === 0 ? 0xe8c890 : (i % 5 === 0 ? 0xffd9a0 : 0xfff2d6),
        alpha: 0
      });
      skyStars.addParticle(p);
      sky.starItems.push({ p: p, base: 0.30 + hash(i * 6.1) * 0.62, phase: hash(i * 3.9) * 6.283, hx: p.x, hy: p.y });
    }
  }

  function clearSkyStars() {
    if (typeof skyStars.removeParticles === 'function') {
      skyStars.removeParticles(0, sky.starItems.length);
    } else {
      for (var q = sky.starItems.length - 1; q >= 0; q--) skyStars.removeParticle(sky.starItems[q].p);
    }
    sky.starItems = [];
  }

  function ensureSky(w, h) {
    if (sky.built && sky.built.w === w && sky.built.h === h) return;
    sky.built = { w: w, h: h };
    // Rebuild on resize: the fracture geometry is authored in stage pixels, so
    // a resized stage would otherwise keep fractures from the old frame.
    sky.lines = buildCrackLines(w, h);
    if (sky.starItems.length) clearSkyStars();
    sky.starsBuilt = null;
    if (sky.starsTo > 0) buildSkyStars(w, h);
  }

  function drawSkyCracks(progress) {
    ensureSky(app.renderer.screen.width, app.renderer.screen.height);
    skyCracks.clear();
    if (progress <= 0.001) return;
    var i, p, pts, upto, tip;
    for (i = 0; i < sky.lines.length; i++) {
      pts = sky.lines[i];
      upto = Math.max(1, Math.min(pts.length - 1, Math.ceil(progress * pts.length)));
      skyCracks.moveTo(pts[0][0], pts[0][1]);
      for (p = 1; p <= upto; p++) skyCracks.lineTo(pts[p][0], pts[p][1]);
    }
    skyCracks.stroke({ width: 3, color: 0xe8c890, alpha: 0.10 * progress, cap: 'round' });
    for (i = 0; i < sky.lines.length; i++) {
      pts = sky.lines[i];
      upto = Math.max(1, Math.min(pts.length - 1, Math.ceil(progress * pts.length)));
      skyCracks.moveTo(pts[0][0], pts[0][1]);
      for (p = 1; p <= upto; p++) skyCracks.lineTo(pts[p][0], pts[p][1]);
    }
    skyCracks.stroke({ width: 1, color: 0xfff3e2, alpha: 0.62 * Math.min(1, progress * 1.4) });
    for (i = 0; i < sky.lines.length; i++) {
      pts = sky.lines[i];
      tip = Math.max(1, Math.min(pts.length - 1, Math.ceil(progress * pts.length)));
      skyCracks.circle(pts[tip][0], pts[tip][1], 1.5).fill({ color: 0xfffaf2, alpha: 0.85 * progress });
    }
  }

  function drawSkyWarm(amt, w, h) {
    skyWarm.clear();
    if (amt <= 0.001) return;
    for (var r = 12; r >= 1; r--) {
      var t = r / 12;
      skyWarm.circle(w * 0.80, h * 0.22, Math.min(w, h) * (0.42 + t * 0.86))
        .fill({ color: 0xffb066, alpha: amt * (0.006 + (1 - t) * (1 - t) * 0.022) });
      skyWarm.circle(w * 0.16, h * 0.86, Math.min(w, h) * (0.30 + t * 0.70))
        .fill({ color: 0xd07ab0, alpha: amt * (0.004 + (1 - t) * (1 - t) * 0.014) });
    }
    skyWarm.blendMode = 'add';
  }

  function drawSkyVoid(amt, w, h) {
    skyVoid.clear();
    if (amt <= 0.001) return;
    // "A region of the CRT fails to render": not smoke, not a monster — a hole
    // in the picture with a violet edge where the phosphor stops.
    var cx = w * 0.74, cy = h * 0.30;
    var rx = w * 0.30 * amt, ry = h * 0.36 * amt;
    for (var r = 8; r >= 1; r--) {
      var t = r / 8;
      skyVoid.ellipse(cx, cy, rx * (1 + t * 0.5), ry * (1 + t * 0.5))
        .fill({ color: 0x000000, alpha: 0.14 * amt });
    }
    skyVoid.ellipse(cx, cy, rx, ry).fill({ color: 0x000000, alpha: 0.95 * amt });
    skyVoid.ellipse(cx, cy, rx, ry).stroke({ width: 1, color: 0xa99bff, alpha: 0.26 * amt });
  }

  function updateSky(dt, t) {
    if (!skyLayer) return;
    var ease = Math.min(1, dt * 1.6);
    sky.cracks += (sky.cracksTo - sky.cracks) * ease;
    sky.stars += (sky.starsTo - sky.stars) * ease;
    sky.warm += (sky.warmTo - sky.warm) * ease;
    sky.void += (sky.voidTo - sky.void) * ease;

    var w = app.renderer.screen.width, h = app.renderer.screen.height;
    if (sky.starsTo > 0 && !sky.starsBuilt) { buildSkyStars(w, h); sky.starsBuilt = true; }

    drawSkyCracks(sky.cracks);
    drawSkyWarm(sky.warm, w, h);
    drawSkyVoid(sky.void, w, h);

    var vx = w * 0.74, vy = h * 0.30;
    var vrx = w * 0.30 * sky.void, vry = h * 0.36 * sky.void;
    for (var i = 0; i < sky.starItems.length; i++) {
      var it = sky.starItems[i];
      var dx = (it.p.x - vx) / Math.max(1, vrx);
      var dy = (it.p.y - vy) / Math.max(1, vry);
      var swallowed = sky.void > 0.02 && (dx * dx + dy * dy) < 1;
      it.p.alpha = swallowed ? 0 : sky.stars * it.base * (0.45 + 0.55 * Math.sin(t * 1.7 + it.phase));
    }
    if (skyStars && sky.starItems.length) skyStars.update();
  }

  // Public verb. `kind` is one of cracks | stars | warm | void | clear, and
  // `amount` (default 1) is the target; 0 fades the layer back out.
  function weather(kind, amount) {
    if (!started || !app || !skyLayer) return false;
    var to = amount == null ? 1 : Math.max(0, Math.min(1, amount));
    if (kind === 'cracks') { sky.cracksTo = to; if (to > 0) ensureSky(app.renderer.screen.width, app.renderer.screen.height); return true; }
    if (kind === 'stars') { sky.starsTo = to; return true; }
    if (kind === 'warm') { sky.warmTo = to; return true; }
    if (kind === 'void') {
      sky.voidTo = to;
      // Vanir's arrival is the stars going out, so the two move together.
      if (to > 0) sky.starsTo = Math.min(sky.starsTo, 0.12);
      return true;
    }
    if (kind === 'clear') { sky.cracksTo = sky.starsTo = sky.warmTo = sky.voidTo = 0; return true; }
    return false;
  }

  // ── per-frame ───────────────────────────────────────────────────────────
  function frame(now) {
    if (!started) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    var t = now / 1000;
    var sw = app.renderer.screen.width, sh = app.renderer.screen.height;

    eased.x += (pointer.x - eased.x) * 0.05;
    eased.y += (pointer.y - eased.y) * 0.05;

    // A plate is only physical when the cast is actually a stage. `has-poppet`
    // reflows the cast into a stacked column beside a live worktable, and there
    // the plates must stay exactly where the document put them.
    var physical = !suspended && !(rootEl && rootEl.classList.contains('has-poppet'));

    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (!visible(b)) continue;
      if (physical) step(b, dt, t);
      else { b.ox = b.oy = b.vx = b.vy = b.a = b.va = 0; b.speed = 0; }
    }

    if (physical) {
      for (var pass = 0; pass < 2; pass++) {
        for (var a = 0; a < bodies.length; a++) {
          for (var c = a + 1; c < bodies.length; c++) {
            if (!visible(bodies[a]) || !visible(bodies[c])) continue;
            collide(bodies[a], bodies[c]);
          }
        }
      }
      for (var k = 0; k < bodies.length; k++) if (visible(bodies[k])) contain(bodies[k]);
    }

    // Write the motion back onto the plates.
    //
    // It has to be the independent `translate` / `rotate` properties and NOT
    // `transform`. Declarations from CSS animations outrank normal author
    // declarations — including inline style — so writing `transform` here is
    // silently overruled by every `ctv-*-hover` keyframe and again by each
    // arrival animation, and the plates never move at all. `translate` and
    // `rotate` are separate properties that compose with `transform` (the used
    // value is translate, then rotate, then scale, then transform), so the
    // physics and the authored animation both survive: the drift each character
    // already had becomes a material on top of real movement instead of a
    // substitute for it.
    for (var m = 0; m < bodies.length; m++) {
      var bd = bodies[m];
      if (!bd.el) continue;
      if (!physical) { bd.el.style.translate = ''; bd.el.style.rotate = ''; continue; }
      bd.el.style.translate = bd.ox.toFixed(2) + 'px ' + bd.oy.toFixed(2) + 'px';
      bd.el.style.rotate = bd.a.toFixed(2) + 'deg';
    }

    stir(dt, t, sw, sh);
    updateSky(dt, t);
    render(sw, sh);

    global.requestAnimationFrame(frame);
  }

  // Air inherits motion. A plate pushed through the dust drags some of it along
  // and the dust then settles, which is the difference between "particles" and
  // "air in a room where something just moved".
  function stir(dt, t, sw, sh) {
    for (var i = 0; i < dust.length; i++) {
      var d = dust[i], p = d.p;
      for (var j = 0; j < bodies.length; j++) {
        var b = bodies[j];
        if (!visible(b) || b.speed < 8) continue;
        var bx = b.hx + b.ox, by = b.hy + b.oy;
        var dx = p.x - bx, dy = p.y - by;
        if (dx > -b.hw - 40 && dx < b.hw + 40 && dy > -b.hh - 40 && dy < b.hh + 40) {
          var falloff = 1 / (1 + (Math.abs(dx) + Math.abs(dy)) / 90);
          d.vx += b.vx * 0.055 * falloff;
          d.vy += b.vy * 0.055 * falloff;
        }
      }
      d.vx *= 0.94; d.vy *= 0.94;
      p.x += d.vx * dt;
      p.y += d.vy * dt - d.drift * dt * 3.2;
      // a slow sideways breath so still air is never frozen
      p.x += Math.sin(t * 0.5 + i) * 0.06;
      if (p.y < -12) { p.y = sh + 12; p.x = Math.random() * sw; d.vx = d.vy = 0; }
      if (p.x < -12) p.x = sw + 12;
      if (p.x > sw + 12) p.x = -12;
      // dust near a moving plate glows brighter, because it is lit by it
      var lift = 0;
      for (var q = 0; q < bodies.length; q++) {
        var bb = bodies[q];
        if (!visible(bb)) continue;
        var ddx = p.x - (bb.hx + bb.ox), ddy = p.y - (bb.hy + bb.oy);
        var dist = Math.sqrt(ddx * ddx + ddy * ddy);
        lift += (1 / (1 + dist / 150)) * (0.25 + Math.min(1, bb.speed / 60));
      }
      p.alpha = Math.min(0.24, d.base * (1 + lift * 0.38));
    }
    dustLayer.update();
  }

  function render(sw, sh) {
    clearScene();
    // parallax: the light leans with the pointer, the way a lit surface does
    lightLayer.position.set((eased.x - 0.5) * -26, (eased.y - 0.5) * -16);

    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (!visible(b)) continue;
      var cx = b.hx + b.ox + b.hw;
      var cy = b.hy + b.oy + b.hh;

      // projection shadow: a flat contact trace hugging the plate's foot —
      // not a second slab. The old rule stretched the shadow to twice the
      // plate's width and its full height, which read as a hole in the floor
      // under every pale plate.
      var shadow = new PIXI.Sprite(plateTex);
      shadow.anchor.set(0.5);
      shadow.width = b.hw * 1.7;
      shadow.height = Math.max(12, b.hh * 0.58);
      shadow.position.set(cx + b.lift * 0.35, b.hy + b.oy + b.hh * 2 - 2 + b.lift * 0.45);
      shadow.rotation = b.a * 0.0175;
      shadow.tint = 0x120d0a;
      shadow.blendMode = 'multiply';
      shadow.alpha = Math.max(0.006, 0.020 - b.lift / 420);
      fxLayer.addChild(shadow);

      // wake: a plate moving quickly leaves the light behind it
      if (b.speed > 14) {
        var streak = new PIXI.Sprite(plateTex);
        streak.anchor.set(0.5);
        var len = Math.min(2.4, b.speed / 55);
        streak.width = b.hw * 2 * (1 + len);
        streak.height = b.hh * 2 * 0.82;
        streak.position.set(cx - b.vx * 0.045, cy - b.vy * 0.045);
        streak.rotation = b.a * 0.0175;
        var pal = global.LiberPalette ? global.LiberPalette.room() : null;
        streak.tint = pal ? pal.lampCore : 0xffd9a0;
        streak.alpha = Math.min(0.055, b.speed / 1400);
        fxLayer.addChild(streak);
      }

      // a contact flare where two plates argued
      if (b.flash > 0) {
        var ring = new PIXI.Sprite(dotTex);
        ring.anchor.set(0.5);
        var s = 20 + (1 - b.flash) * 70;
        ring.width = s; ring.height = s;
        ring.position.set(cx, cy);
        ring.tint = palHint();
        ring.alpha = b.flash * 0.08;
        ring.blendMode = 'add';
        fxLayer.addChild(ring);
      }
    }

    for (var s = sparks.length - 1; s >= 0; s--) {
      var sp = sparks[s];
      sp.t -= 0.035;
      sp.x += sp.vx * 0.05;
      sp.y += sp.vy * 0.05;
      sp.vx *= 0.9; sp.vy *= 0.9;
      if (sp.t <= 0) { sparks.splice(s, 1); continue; }
      var g = new PIXI.Sprite(dotTex);
      g.anchor.set(0.5);
      var gs = 8 + (1 - sp.t) * 34;
      g.width = gs; g.height = gs;
      g.position.set(sp.x, sp.y);
      g.tint = palHint();
      g.alpha = sp.t * 0.12;
      g.blendMode = 'add';
      fxLayer.addChild(g);
    }

    app.renderer.render({ container: app.stage, target: null, clear: true });
  }

  var _palHint = null;
  function palHint() {
    if (_palHint === null) {
      var pal = global.LiberPalette ? global.LiberPalette.room() : null;
      _palHint = pal ? pal.lampCore : 0xffd9a0;
    }
    return _palHint;
  }

  // ── bridging the controller ─────────────────────────────────────────────
  // The cutscene controller is not modified. `dimOthers()` already marks exactly
  // one plate as the one holding the floor by removing `is-dim`, so watching for
  // that is enough to know when to shove, and it keeps working if the controller
  // changes how it decides who is speaking.
  function watchFloor() {
    if (!castEl || !global.MutationObserver) return;
    var obs = new global.MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var el = records[i].target;
        if (!el.dataset || !el.dataset.speaker) continue;
        if (el.classList.contains('is-dim')) continue;
        if (el === lastSpeakerEl) continue;
        lastSpeakerEl = el;
        shove(el.dataset.speaker);
        var b = pick(el.dataset.speaker);
        if (b) b.flash = 1;
      }
    });
    obs.observe(castEl, { attributes: true, attributeFilter: ['class'], subtree: true });
  }
  var lastSpeakerEl = null;

  // ── lifecycle ───────────────────────────────────────────────────────────
  function find() {
    rootEl = document.getElementById('cutscene') || document.querySelector('.cutscene.ctv');
    castEl = rootEl ? rootEl.querySelector('.ctv-cast') : null;
    return !!(rootEl && castEl);
  }

  async function mount() {
    if (started || !find()) return;
    if (!castEl.querySelector('.ctv-body')) return;

    canvas = document.createElement('canvas');
    canvas.className = 'pixi-cast';
    canvas.setAttribute('aria-hidden', 'true');
    castEl.insertBefore(canvas, castEl.firstChild);

    try {
      app = new PIXI.Application();
      await app.init({
        canvas: canvas,
        resizeTo: castEl,
        autoStart: false,
        autoDensity: true,
        resolution: Math.min(global.devicePixelRatio || 1, 2),
        preference: 'webgl',
        antialias: false,
        backgroundAlpha: 0,
        gcActive: true,
        eventFeatures: { move: false, globalMove: false, click: false, wheel: false }
      });
    } catch (e) {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      global.__liberCastError = String((e && e.message) || e);
      return;
    }

    if (castEl.classList.contains('has-poppet')) suspended = true;
    buildScene();
    refresh();
    watchFloor();

    global.addEventListener('pointermove', function (e) {
      pointer.x = e.clientX / Math.max(global.innerWidth, 1);
      pointer.y = e.clientY / Math.max(global.innerHeight, 1);
    }, { passive: true });

    global.addEventListener('resize', function () {
      if (!app) return;
      app.resize();
      if (REDUCED) { refresh(); frame(performance.now()); }
    }, { passive: true });

    started = true;
    last = performance.now();

    if (REDUCED) {
      // No motion, but the stage is still lit and the plates still cast shadows.
      refresh();
      var once = performance.now();
      for (var i = 0; i < bodies.length; i++) { bodies[i].lift = bodies[i].cfg.elev * 0.6; }
      render(app.renderer.screen.width, app.renderer.screen.height);
      void once;
      return;
    }
    global.requestAnimationFrame(frame);
  }

  // The controller builds the cast during its own boot, so the stage waits for
  // the plates rather than racing them.
  function boot() {
    var tries = 0;
    var iv = global.setInterval(function () {
      tries++;
      if (find() && castEl.querySelector('.ctv-body')) {
        global.clearInterval(iv);
        mount();
      } else if (tries > 120) {
        global.clearInterval(iv);
      }
    }, 250);
  }

  global.LiberCast = {
    refresh: refresh,
    shove: shove,
    weather: weather,
    // verification surface: whether the stage is live, how many plates are
    // physical, and how much contact has actually happened.
    facts: function () {
      var maxSpeed = 0, totalOffset = 0;
      for (var i = 0; i < bodies.length; i++) {
        if (bodies[i].speed > maxSpeed) maxSpeed = bodies[i].speed;
        totalOffset += Math.sqrt(bodies[i].ox * bodies[i].ox + bodies[i].oy * bodies[i].oy);
      }
      return {
        mounted: started,
        plates: bodies.length,
        physical: bodies.filter(visible).length,
        collisions: collisions,
        shoves: shoveCount,
        sparks: sparks.length,
        dust: dustCount,
        maxSpeed: +maxSpeed.toFixed(2),
        displacement: +(totalOffset / Math.max(1, bodies.length)).toFixed(2),
        suspended: suspended,
        // glass weather is published so a harness can assert the ritual's
        // authored screen changes actually reached the GPU.
        sky: { cracks: +sky.cracks.toFixed(3), stars: +sky.stars.toFixed(3), warm: +sky.warm.toFixed(3), void: +sky.void.toFixed(3) },
        error: global.__liberCastError || null
      };
    },
    suspend: function (v) {
      suspended = !!v;
      if (v) {
        for (var i = 0; i < bodies.length; i++) {
          if (bodies[i].el) { bodies[i].el.style.translate = ''; bodies[i].el.style.rotate = ''; }
        }
      }
    }
  };

  if (document.readyState === 'complete') boot();
  else global.addEventListener('load', boot, { once: true });
})(window);
