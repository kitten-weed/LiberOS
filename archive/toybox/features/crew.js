// crew.js — the powder sink's creature crew (pitch contract: full designs,
// not props). Three residents with states and concrete sim interactions:
//   crab  — sidesteps in hops, digs into sand, sidles around water,
//           flees fire, waves a claw when water is poured near it
//   snail — leaves a fading slime trail, shelters in its shell near fire,
//           rides oil rafts that drift on water
//   duck  — bobs on water, paddles toward the nearest seed and eats it,
//           shakes off when it leaves the water
// Deterministic per house rule: all variation derives from (x, y, frame).
// Pure logic + canvas self-drawing, no DOM, no imports. The room owns
// placement; this file owns walking, drawing, and sim interaction.
(function (global) {
  'use strict';

  function abs(n) { return n < 0 ? -n : n; }

  // 12x10 sprite frames, drawn with rects on the room's canvas at cell
  // scale. Each creature has an idle/walk pair + a special state frame.
  // Palette per creature: '.'=transparent, letters = colors below.
  var CRAB_PAL = { c: '#e06848', d: '#b04830', e: '#f09070', k: '#301810', w: '#ffe6c4' };
  var CRAB_BODY = [
    [
      '............',
      '............',
      '..c......c..',
      '...c....c...',
      '..cccccccc..',
      '.cccccccccc.',
      '.cdecccecc..',
      '..cccccccc..',
      '..k......k..',
      '............'
    ],
    [
      '............',
      '............',
      '..c......c..',
      '...c....c...',
      '..cccccccc..',
      '.cccccccccc.',
      '.cdecccecc..',
      '..cccccccc..',
      '...k....k...',
      '............'
    ]
  ];
  // wave frame: one claw raised
  var CRAB_WAVE = [
    [
      '..c.........',
      '..c.........',
      '..c.c....c..',
      '...ccccc....',
      '..cccccccc..',
      '.cccccccccc.',
      '.cdecccecc..',
      '..cccccccc..',
      '..k......k..',
      '............'
      ]
  ];

  var SNAIL_PAL = { s: '#c8a860', h: '#e0c890', t: '#a08840', k: '#301810', l: '#d8e8f0' };
  var SNAIL_BODY = [
    [
      '............',
      '....hhh.....',
      '...hhhhh....',
      '..shhhhk....',
      '.ssshhhhk...',
      'ssssssss....',
      'ssssssss....',
      '.ssssss.....',
      '............',
      '............'
    ],
    [
      '............',
      '....hhh.....',
      '...hhhhh....',
      '..shhhhk....',
      '.ssshhhhk...',
      'ssssssss....',
      '.sssssss....',
      '..ssssss....',
      '............',
      '............'
    ]
  ];
  // sheltered: all shell
  var SNAIL_SHELTER = [
    [
      '............',
      '............',
      '....hhhh....',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '...hhhhhh...',
      '............',
      '............',
      '............'
      ]
  ];

  var DUCK_PAL = { b: '#f0d060', o: '#e08830', k: '#101010', w: '#ffffff' };
  var DUCK_BODY = [
    [
      '............',
      '............',
      '....bbb.....',
      '...bbbbb....',
      '...bbkww....',
      '...bbbbbo...',
      '....bbbb....',
      '.....bb.....',
      '............',
      '............'
    ],
    [
      '............',
      '............',
      '............',
      '....bbb.....',
      '...bbkbbo...',
      '...bbbbbo...',
      '....bbbb....',
      '.....bb.....',
      '............',
      '............'
      ]
  ];

  var SPRITES = {
    crab: { pal: CRAB_PAL, walk: CRAB_BODY, special: CRAB_WAVE, w: 12, h: 10 },
    snail: { pal: SNAIL_PAL, walk: SNAIL_BODY, special: SNAIL_SHELTER, w: 12, h: 10 },
    duck: { pal: DUCK_PAL, walk: DUCK_BODY, special: null, w: 12, h: 10 }
  };

  function createCrew(sim) {
    var W = sim.W, H = sim.H;
    var crew = [];

    function spawn(kind, x, y) {
      var c = {
        kind: kind,
        x: Math.max(0, Math.min(W - 1, x)),
        y: Math.max(0, Math.min(H - 1, y)),
        dir: 1,            // -1 left, 1 right
        state: 'walk',     // walk | wave | shelter | bob | shake
        stateT: 0,
        frame: 0,
        hopT: 0,
        trail: []
      };
      crew.push(c);
      return c;
    }

    function at(x, y) { return sim.at(Math.round(x), Math.round(y)); }

    function near(x, y, v, r) {
      for (var dy = -r; dy <= r; dy++)
        for (var dx = -r; dx <= r; dx++)
          if (at(x + dx, y + dy) === v) return true;
      return false;
    }

    function findNearest(x, y, v, maxR) {
      var best = null, bd = 1e9;
      for (var yy = Math.max(0, y - maxR); yy < Math.min(H, y + maxR); yy++) {
        for (var xx = Math.max(0, x - maxR); xx < Math.min(W, x + maxR); xx++) {
          if (sim.at(xx, yy) === v) {
            var d = abs(xx - x) + abs(yy - y);
            if (d < bd) { bd = d; best = { x: xx, y: yy }; }
          }
        }
      }
      return best;
    }

    function canStand(x, y) {
      if (x < 1 || y < 1 || x >= W - 1) return false;
      if (y >= H - 1) return true; // tray floor
      var below = at(x, y + 1);
      if (sim.standable) return sim.standable(below) || below === sim.SPROUT;
      return below === sim.SAND || below === sim.WALL || below === sim.SPROUT;
    }

    // ── per-kind behaviour ─────────────────────────────────────────────
    function stepCrab(c) {
      // flee fire: sprint 2 cells away from the nearest flame
      var fire = findNearest(c.x, c.y, sim.FIRE, 9);
      if (fire) {
        c.state = 'walk';
        c.dir = c.x <= fire.x ? -1 : 1;
        var nx = c.x + c.dir * 2;
        if (canStand(nx, c.y)) c.x = nx;
        else if (canStand(c.x + c.dir, c.y)) c.x += c.dir;
        return;
      }
      // water poured near: wave the claw a beat, then sidle around it
      if (c.state !== 'wave' && near(c.x, c.y, sim.WATER, 3) && (c.x + c.y) % 4 === 0) {
        c.state = 'wave';
        c.stateT = 6;
        return;
      }
      if (c.state === 'wave') {
        if (--c.stateT <= 0) c.state = 'walk';
        return;
      }
      // dig: standing on sand sinks a notch (walks piles flat)
      if (canStand(c.x, c.y) && at(c.x, c.y) === sim.EMPTY && (c.x * 7 + c.y * 3) % 11 === 0) {
        sim.setAt(Math.round(c.x), Math.round(c.y + 1), sim.EMPTY, 0, 0);
        c.y += 1;
        return;
      }
      // hop: 2 cells when open ground, else 1; water is sidled around
      c.hopT++;
      if (c.hopT % 3 !== 0) return;
      var nx = c.x + c.dir;
      if (at(nx, c.y) === sim.WATER) {
        // sidle around: try diag through dry land, else turn
        if (canStand(nx, c.y - 1) && at(nx, c.y - 1) !== sim.WATER) { c.x = nx; c.y -= 1; return; }
        if (canStand(nx, c.y + 1) && at(nx, c.y + 1) !== sim.WATER) { c.x = nx; c.y += 1; return; }
        c.dir = -c.dir;
        return;
      }
      if (canStand(nx, c.y)) { c.x = nx; return; }
      if (canStand(nx, c.y - 1)) { c.x = nx; c.y -= 1; return; }   // climb piles
      if (canStand(nx, c.y + 1)) { c.x = nx; c.y += 1; return; }   // descend
      c.dir = -c.dir; // wall or water ahead: turn
    }

    function stepSnail(c) {
      // shelter near fire
      if (near(c.x, c.y, sim.FIRE, 4)) {
        if (c.state !== 'shelter') { c.state = 'shelter'; c.stateT = 8; }
        if (--c.stateT <= 0) c.state = 'walk';
        return;
      }
      // ride oil rafts: standing on oil above water drifts with it
      var below = at(c.x, c.y + 1);
      if (below === sim.OIL && at(c.x, c.y + 2) === sim.WATER) {
        c.x += (c.x + c.y) % 2 === 0 ? 1 : -1;
        c.x = Math.max(1, Math.min(W - 2, c.x));
      }
      // slow walk: 1 cell every 4 beats
      if (c.frame % 4 !== 0) return;
      var nx = c.x + c.dir;
      if (canStand(nx, c.y)) {
        c.x = nx;
        // slime trail: recolor the cell we left (draw-time overlay)
        c.trail.push({ x: Math.round(c.x) - c.dir, y: Math.round(c.y), t: 40 });
        if (c.trail.length > 24) c.trail.shift();
      } else if (canStand(nx, c.y - 1)) { c.x = nx; c.y -= 1; }
      else if (canStand(nx, c.y + 1)) { c.x = nx; c.y += 1; }
      else c.dir = -c.dir;
    }

    function stepDuck(c) {
      var inWater = at(c.x, c.y) === sim.WATER || at(c.x, c.y + 1) === sim.WATER;
      if (!inWater) {
        if (c.state === 'bob') { c.state = 'shake'; c.stateT = 5; }
        if (c.state === 'shake') { if (--c.stateT <= 0) c.state = 'walk'; }
        // waddle on land toward nearest water
        if (c.state === 'walk') {
          var w = findNearest(c.x, c.y, sim.WATER, 30);
          if (w) c.dir = w.x >= c.x ? 1 : -1;
          var nx = c.x + c.dir;
          if (canStand(nx, c.y)) c.x = nx;
          else if (canStand(nx, c.y - 1)) { c.x = nx; c.y -= 1; }
          else if (canStand(nx, c.y + 1)) { c.x = nx; c.y += 1; }
          else c.dir = -c.dir;
        }
        return;
      }
      c.state = 'bob';
      // paddle toward the nearest seed and eat it
      var seed = findNearest(c.x, c.y, sim.SEED, 40);
      if (seed) {
        c.dir = seed.x >= c.x ? 1 : -1;
        var sx = c.x + c.dir;
        if (sx === seed.x && Math.abs(c.y - seed.y) <= 1) {
          sim.setAt(seed.x, seed.y, sim.EMPTY, 0, 0);
          c.stateT = 4; // happy bob beat
          return;
        }
        if (at(sx, c.y) === sim.WATER || at(sx, c.y) === sim.EMPTY) c.x = sx;
      }
      // bob: gentle vertical drift on the surface
      if ((c.x + c.y) % 3 === 0) {
        if (at(c.x, c.y - 1) === sim.WATER) c.y -= 1;
        else if (at(c.x, c.y + 1) === sim.WATER) c.y += 1;
      }
    }

    // gravity: land creatures fall until standable (or water — they float
    // out of it); the duck settles onto the surface instead.
    function applyGravity(c) {
      if (c.kind === 'duck') {
        if (at(c.x, c.y + 1) === sim.WATER) { c.y += 1; return; } // sink to surface
        return;
      }
      var ground = at(c.x, c.y + 1);
      var floor = (c.y + 1 >= H); // the tray floor itself is ground
      if (floor) return;
      if (ground === sim.EMPTY || ground === sim.WATER || ground === sim.STEAM || ground === sim.SEED) {
        c.y += 1;
      }
    }

    function step() {
      for (var i = 0; i < crew.length; i++) {
        var c = crew[i];
        c.frame++;
        applyGravity(c);
        if (c.kind === 'crab') stepCrab(c);
        else if (c.kind === 'snail') stepSnail(c);
        else stepDuck(c);
        c.x = Math.max(1, Math.min(W - 2, c.x));
        c.y = Math.max(1, Math.min(H - 2, c.y));
      }
    }

    // ── drawing (room supplies ctx, cell size, palette blending) ───────
    function draw(ctx, cell, frame) {
      for (var i = 0; i < crew.length; i++) {
        var c = crew[i];
        // snail slime trail first (under everything)
        if (c.kind === 'snail') {
          for (var t = 0; t < c.trail.length; t++) {
            var s = c.trail[t];
            var a = s.t / 60;
            ctx.fillStyle = 'rgba(216, 232, 240, ' + (a * 0.35).toFixed(3) + ')';
            ctx.fillRect(s.x * cell, s.y * cell, cell, cell);
            s.t--;
          }
          c.trail = c.trail.filter(function (s) { return s.t > 0; });
        }
        var sp = SPRITES[c.kind];
        var fr;
        if (c.state === 'wave' && sp.special) fr = sp.special[0];
        else if (c.state === 'shelter' && sp.special) fr = sp.special[0];
        else if (c.state === 'shake' || (c.state === 'bob' && c.stateT > 0)) fr = sp.walk[1];
        else fr = sp.walk[Math.floor(frame / 6) % sp.walk.length];
        var px = (c.x - sp.w / 2) * cell;
        var py = (c.y - sp.h + 1) * cell;
        for (var r = 0; r < sp.h; r++) {
          var row = fr[r];
          for (var q = 0; q < sp.w; q++) {
            var ch = row[q];
            if (!ch || ch === '.') continue;
            ctx.fillStyle = sp.pal[ch] || '#f0f0f0';
            // sprite faces its dir: mirror by drawing from the right
            var dx = c.dir === 1 ? q : (sp.w - 1 - q);
            ctx.fillRect(px + dx * cell, py + r * cell, cell, cell);
          }
        }
      }
    }

    function list() { return crew.map(function (c) { return { kind: c.kind, x: c.x, y: c.y, state: c.state }; }); }
    function count() { return crew.length; }
    function removeAt(x, y, r) {
      for (var i = crew.length - 1; i >= 0; i--) {
        var c = crew[i];
        if (abs(c.x - x) <= (r || 3) && abs(c.y - y) <= (r || 3)) crew.splice(i, 1);
      }
    }

    return { spawn: spawn, step: step, draw: draw, list: list, count: count, removeAt: removeAt };
  }

  global.LiberCrew = { create: createCrew, SPRITES: SPRITES };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.LiberCrew;
})(typeof window !== 'undefined' ? window : globalThis);
