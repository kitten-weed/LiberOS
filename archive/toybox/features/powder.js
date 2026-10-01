// powder.js — LiberOS powder-tent automata, dependency-free.
// The sink-world: 20 materials. The original powder, water, fire, oil,
// salt, seed, steam, sprout — plus the gifts the travellers left Pip,
// one apiece: wood (bunyip), stone (vanir), magma (arcana), ice (inquiry),
// snow (inquiry), metal (riason), gunpowder (elizabeth), superball (whimsy),
// fireworks (whimsy), gas (bunyip), thunder (arcana), clone (ruby), ant (ruby),
// soapy (elizabeth), and the fan breeze (pip's own discovery).
// Deterministic: shade picks and lifetimes derive from (x, y, frame) —
// no Math.random anywhere the visitor can perceive (house rule).
// Pure logic, no DOM: the toybox room paints it, node verifies it.
// No imports (covenant Q.1); loads as a plain script or via require().
(function (global) {
  'use strict';

  var W = 156, H = 125;   // the sink is wider than it is deep
  var EMPTY = 0, WALL = 1, POWDER = 2, WATER = 3, FIRE = 4;
  var OIL = 5, SALT = 6, SEED = 7, STEAM = 8, SPROUT = 9;
  // the gifts
  var WOOD = 10, STONE = 11, MAGMA = 12, ICE = 13, SNOW = 14, METAL = 15;
  var GUNPOWDER = 16, BALL = 17, FIREWORK = 18, GAS = 19, THUNDER = 20;
  var CLONE = 21, ANT = 22, SOAPY = 23, BUBBLE = 24;
  var ERASE = -1;

  var PALETTES = {
    1: [[122, 110, 96]],
    2: [[216, 170, 80], [226, 180, 92], [206, 158, 70]],
    3: [[64, 130, 200], [74, 142, 210], [56, 118, 188]],
    4: [[255, 120, 40], [255, 160, 60], [240, 90, 30]],
    5: [[122, 102, 40], [132, 112, 50], [110, 92, 36]],
    6: [[235, 230, 220], [240, 236, 228], [228, 222, 212]],
    7: [[90, 120, 50], [100, 130, 60]],
    8: [[180, 190, 200], [190, 200, 210]],
    9: [[80, 180, 80], [100, 200, 90], [60, 160, 70]],
    10: [[122, 82, 48], [108, 70, 40], [134, 94, 58]],
    11: [[128, 128, 120], [118, 118, 110], [138, 138, 130]],
    12: [[240, 90, 20], [255, 130, 40], [200, 60, 14]],
    13: [[150, 205, 230], [176, 222, 240], [128, 188, 218]],
    14: [[235, 244, 250], [222, 234, 244], [244, 250, 254]],
    15: [[150, 158, 166], [170, 178, 184], [132, 140, 148]],
    16: [[58, 56, 54], [72, 70, 66], [46, 44, 42]],
    17: [[210, 96, 130], [236, 122, 156], [186, 74, 108]],
    18: [[224, 210, 170], [236, 226, 190], [206, 190, 148]],
    19: [[158, 216, 160], [176, 230, 178], [140, 198, 142]],
    20: [[255, 244, 130], [210, 226, 255], [255, 200, 90]],
    21: [[168, 130, 220], [184, 148, 236], [150, 114, 200]],
    22: [[128, 84, 56], [110, 70, 44], [144, 98, 66]],
    23: [[170, 220, 235], [190, 232, 244], [150, 206, 224]],
    24: [[200, 236, 248], [224, 246, 252], [176, 224, 240]]
  };

  // solids cannot fall or be swapped; powders fall; gases rise
  var SOLIDS = { 1: 1, 9: 1, 10: 1, 11: 1, 13: 1, 15: 1, 21: 1 };
  var POWDERS = { 2: 1, 6: 1, 7: 1, 16: 1, 22: 1 };
  var GASES = { 8: 1, 19: 1, 24: 1 };

  // burn fuel per material: [chance per frame, life on ignition, heat]
  // heat feeds the energy gauge; oil burns slow+hot, gas fast+hottest
  var FUEL = {
    2: [0.05, 4], 4: [0, 5], 5: [0.12, 26], 7: [0.06, 4], 9: [0.04, 7],
    10: [0.025, 24], 16: [1, 2], 18: [0.2, 2], 19: [0.5, 3], 22: [0.05, 5],
    23: [0.03, 3], 24: [0.04, 2]
  };

  function abs(n) { return n < 0 ? -n : n; }

  function createSim() {
    var grid = new Uint8Array(W * H);
    var col = new Uint8Array(W * H);
    var life = new Int16Array(W * H);
    var aux = new Uint8Array(W * H);      // material-specific memory
    var seen = new Int32Array(W * H);
    var frame = 0, strokes = 0;
    var used = {};
    var lastPour = 0;                      // the firework payload: last real material poured
    var breeze = 0;                        // signed wind force this frame
    var energy = 0;                        // slow-decaying energy gauge
    var windDir = 0;                       // the bellows: the room squeezes, the world feels

    function idx(x, y) { return y * W + x; }
    function inBounds(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
    function at(x, y) {
      if (!inBounds(x, y)) return WALL;   // out of bounds behaves as wall
      return grid[idx(x, y)];
    }
    function setAt(x, y, v, c, lf) {
      if (!inBounds(x, y)) return;
      var i = idx(x, y);
      grid[i] = v;
      col[i] = c || 0;
      life[i] = lf || 0;
      aux[i] = 0;
    }
    function swap(x1, y1, x2, y2) {
      var i1 = idx(x1, y1), i2 = idx(x2, y2), t;
      t = grid[i1]; grid[i1] = grid[i2]; grid[i2] = t;
      t = col[i1]; col[i1] = col[i2]; col[i2] = t;
      t = life[i1]; life[i1] = life[i2]; life[i2] = t;
      t = aux[i1]; aux[i1] = aux[i2]; aux[i2] = t;
      seen[i1] = frame; seen[i2] = frame;
    }
    function neighborIs(x, y, v) {
      return at(x, y - 1) === v || at(x, y + 1) === v || at(x - 1, y) === v || at(x + 1, y) === v;
    }
    function neighborCount(x, y, v) {
      var n = 0;
      if (at(x - 1, y - 1) === v) n++;
      if (at(x, y - 1) === v) n++;
      if (at(x + 1, y - 1) === v) n++;
      if (at(x - 1, y) === v) n++;
      if (at(x + 1, y) === v) n++;
      if (at(x - 1, y + 1) === v) n++;
      if (at(x, y + 1) === v) n++;
      if (at(x + 1, y + 1) === v) n++;
      return n;
    }
    function isSolid(v) { return !!SOLIDS[v]; }
    function standable(v) { return isSolid(v) || v === POWDER; }
    function flammable(v) { return !!FUEL[v]; }
    // wind at a cell: the bellows' push + heat updraft from fire and magma
    function windAt(x, y) {
      var w = breeze;
      if (at(x, y + 1) === FIRE || at(x, y + 1) === MAGMA) w += 0.18;
      return w;
    }
    function ignite(x, y) {
      var v = at(x, y);
      if (!flammable(v)) return false;
      setAt(x, y, FIRE, col[idx(x, y)] % 3, FUEL[v][1]);
      return true;
    }
    function steamLife(x, y) { return 26 + abs((x + y + frame) % 16); }
    function splash(cx, cy) {
      for (var dy = -1; dy <= 1; dy++)
        for (var dx = -1; dx <= 1; dx++)
          if (at(cx + dx, cy + dy) === EMPTY && (dx || dy) && (abs(dx * 7 + dy * 3 + frame) % 3 === 0))
            setAt(cx + dx, cy + dy, STEAM, abs((cx + dx) * 31 + (cy + dy) * 17 + frame) % 2, steamLife(cx + dx, cy + dy));
    }
    // an explosion: destroys the area, throws out fire and sparks
    function explode(cx, cy, power) {
      var r = power;
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          var d = dx * dx + dy * dy;
          if (d > r * r) continue;
          var x = cx + dx, y = cy + dy;
          if (!inBounds(x, y)) continue;
          var v = grid[idx(x, y)];
          if (v === WALL || v === CLONE) continue;
          if (d <= r * r / 3 && v !== WALL) {
            setAt(x, y, FIRE, abs((x * 31 + y * 17 + frame) % 3), 3 + abs((x + y + frame) % 4));
          } else if (v !== FIRE && (abs(dx * 5 + dy * 7 + frame) % 2 === 0)) {
            setAt(x, y, EMPTY, 0, 0);
          }
        }
      }
      splash(cx, cy);
      energy = Math.min(120, energy + power * 7);
    }
    function pour(cx, cy, el, brush) {
      brush = brush == null ? 2 : brush;
      for (var dy = -brush; dy <= brush; dy++) {
        for (var dx = -brush; dx <= brush; dx++) {
          if (dx * dx + dy * dy > brush * brush + 1) continue;
          var x = cx + dx, y = cy + dy;
          if (!inBounds(x, y)) continue;
          if (el === ERASE) { setAt(x, y, EMPTY, 0, 0); continue; }
          if (grid[idx(x, y)] !== EMPTY) continue;
          var pal = PALETTES[el];
          if (!pal) continue;
          var pick = abs((x * 31 + y * 17 + frame) % pal.length);
          var lf = 0;
          if (el === FIRE) lf = 4 + abs((x + y + frame) % 4);
          else if (el === STEAM) lf = steamLife(x, y);
          else if (el === GAS) lf = 30 + abs((x + y + frame) % 30);
          setAt(x, y, el, pick, lf);
          if (el === FIREWORK) aux[idx(x, y)] = lastPour || POWDER;   // poppers eat what you poured last
          else if (el > 0) lastPour = el;
        }
      }
      strokes++;
      if (el > 0) used[el] = true;
    }

    function step() {
      frame++;
      var dir = (frame % 2 === 0) ? 1 : -1;
      // the bellows pumps in gusts: full squeeze, then let go
      breeze = windDir * 3.4;
      if (breeze !== 0 && frame % 3 !== 0) breeze *= 0.4;
      for (var y = H - 1; y >= 0; y--) {
        for (var xi = 0; xi < W; xi++) {
          var x = dir === 1 ? xi : (W - 1 - xi);
          var i0 = idx(x, y);
          if (seen[i0] === frame) continue;
          var v = grid[i0];

          // ── solids: only react, never move ──
          if (v === WOOD) {
            var wi = i0;
            if (neighborIs(x, y, FIRE) || neighborIs(x, y, MAGMA)) {
              if (abs((x * 7 + y * 3 + frame) % 3) === 0) setAt(x, y, FIRE, col[wi] % 3, FUEL[WOOD][1]);
            } else if (neighborCount(x, y, SEED) > 0 && neighborCount(x, y, WATER) > 0 && abs((x * 3 + y * 5 + frame) % 40) === 0) {
              setAt(x, y, WOOD, col[wi] % 3, 0);   // wood is grown wood: stays
            }
            continue;
          }
          if (v === STONE) {
            if (neighborIs(x, y, MAGMA)) setAt(x, y, MAGMA, col[i0] % 3, 0);
            else if (neighborIs(x, y, WATER) && abs((x * 7 + y * 3 + frame) % 140) === 0) {
              setAt(x, y, POWDER, col[i0] % 3, 0);  // water weathers stone to powder
            }
            continue;
          }
          if (v === MAGMA) {
            if (neighborIs(x, y, WATER) && neighborCount(x, y, WATER) >= 5) {
              setAt(x, y, STONE, abs((x * 31 + y * 17 + frame) % 3), 0);
              continue;
            }
            // magma ignites everything flammable it touches
            var mp = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
            for (var m = 0; m < mp.length; m++) {
              var mv = at(mp[m][0], mp[m][1]);
              if (flammable(mv)) setAt(mp[m][0], mp[m][1], FIRE, col[idx(mp[m][0], mp[m][1])] % 3, FUEL[mv][1]);
            }
            continue;
          }
          if (v === ICE) {
            if (neighborIs(x, y, MAGMA) || neighborIs(x, y, FIRE)) {
              setAt(x, y, WATER, col[i0] % 3, 0);
              continue;
            }
            // ice freezes touching water
            var ip = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
            for (var q = 0; q < ip.length; q++) {
              if (at(ip[q][0], ip[q][1]) === WATER) {
                setAt(ip[q][0], ip[q][1], ICE, col[idx(ip[q][0], ip[q][1])] % 3, 0);
                break;
              }
            }
            // strong wind shaves it into snow
            if (abs(windAt(x, y)) >= 3) {
              setAt(x, y, SNOW, col[i0] % 3, 0);
              continue;
            }
            continue;
          }
          if (v === METAL) {
            if (neighborIs(x, y, MAGMA)) { setAt(x, y, MAGMA, col[i0] % 3, 0); continue; }
            if (neighborIs(x, y, WATER) && abs((x * 5 + y * 3 + frame) % 120) === 0) {
              setAt(x, y, POWDER, col[i0] % 3, 0);   // water rusts metal to powder
            }
            continue;
          }
          if (v === CLONE) {
            // clones emit the first material that touched them
            if (aux[i0] > 0) {
              var cc2 = 0;
              for (var cy = -1; cy <= 1; cy++) {
                for (var cx2 = -1; cx2 <= 1; cx2++) {
                  if (!cx2 && !cy) continue;
                  if (at(x + cx2, y + cy) === EMPTY && cc2 < 2) {
                    setAt(x + cx2, y + cy, aux[i0], abs(((x + cx2) * 31 + (y + cy) * 17 + frame) % 3), 0);
                    cc2++;
                  }
                }
              }
            } else {
              var cp = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
              for (var c3 = 0; c3 < cp.length; c3++) {
                var cv2 = at(cp[c3][0], cp[c3][1]);
                if (cv2 > 0 && cv2 !== CLONE && cv2 !== WALL && cv2 !== FIRE && cv2 !== STEAM && cv2 !== THUNDER) {
                  aux[i0] = cv2;
                  break;
                }
              }
            }
            continue;
          }

          if (v === EMPTY || v === WALL || v === SPROUT) continue;

          // ── mobiles ──
          if (v === POWDER) {
            if (at(x, y + 1) === EMPTY || at(x, y + 1) === WATER) swap(x, y, x, y + 1);
            else if (at(x - dir, y + 1) === EMPTY || at(x - dir, y + 1) === WATER) swap(x, y, x - dir, y + 1);
            else if (at(x + dir, y + 1) === EMPTY || at(x + dir, y + 1) === WATER) swap(x, y, x + dir, y + 1);
            else {
              var wx = 0;
              if (abs(windAt(x, y)) > 1.6 && at(x - 1, y) === EMPTY && at(x + 1, y) === EMPTY) {
                wx = windAt(x, y) > 0 ? 1 : -1;
                if (abs((x + y + frame) % 3) === 0) swap(x, y, x + wx, y);
              }
            }
          } else if (v === WATER) {
            if (at(x, y + 1) === EMPTY) swap(x, y, x, y + 1);
            else if (at(x - dir, y + 1) === EMPTY) swap(x, y, x - dir, y + 1);
            else if (at(x + dir, y + 1) === EMPTY) swap(x, y, x + dir, y + 1);
            else if (at(x - dir, y) === EMPTY) swap(x, y, x - dir, y);
            else if (at(x + dir, y) === EMPTY) swap(x, y, x + dir, y);
            var nb = [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)];
            for (var f = 0; f < nb.length; f++) {
              if (nb[f] === FIRE) {
                var pal = PALETTES[STEAM];
                setAt(x, y, STEAM, abs((x * 31 + y * 17 + frame) % pal.length), steamLife(x, y));
                break;
              }
            }
          } else if (v === FIRE) {
            var i = i0;
            life[i]--;
            if (life[i] <= 0) { setAt(x, y, EMPTY, 0, 0); continue; }
            if (at(x, y - 1) === WATER || at(x - 1, y) === WATER || at(x + 1, y) === WATER) {
              setAt(x, y, EMPTY, 0, 0);
              continue;
            }
            var pts = [[x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]];
            var lit = false;
            for (var o = 0; o < pts.length; o++) {
              var pv = at(pts[o][0], pts[o][1]);
              if (pv === OIL || pv === WOOD || pv === GAS || pv === SEED || pv === SPROUT || pv === ANT || pv === SOAPY || pv === BUBBLE) {
                if (abs((pts[o][0] * 3 + pts[o][1] * 5 + frame) % 3) !== 0) { lit = true; continue; }
                setAt(pts[o][0], pts[o][1], FIRE, col[idx(pts[o][0], pts[o][1])] % 3, FUEL[pv][1]);
                lit = true;
                break;
              }
              if (pv === GUNPOWDER) { explode(pts[o][0], pts[o][1], 4); lit = true; break; }
              if (pv === FIREWORK) {
                var pay = aux[idx(pts[o][0], pts[o][1])] || POWDER;
                var fxp = pts[o][0], fyp = pts[o][1];
                setAt(fxp, fyp, EMPTY, 0, 0);
                explode(fxp, fyp, 3);
                for (var py = -2; py <= 2; py++)
                  for (var px2 = -2; px2 <= 2; px2++)
                    if (abs(px2 * 3 + py * 5 + frame) % 2 === 0 && at(fxp + px2, fyp + py) === EMPTY)
                      setAt(fxp + px2, fyp + py, pay, abs(((fxp + px2) * 31 + (fyp + py) * 17 + frame) % 3), 0);
                lit = true;
                break;
              }
            }
            if (lit) continue;
            energy = Math.min(120, energy + 0.4);
            if (at(x, y - 1) === EMPTY) swap(x, y, x, y - 1);
            else if (at(x - dir, y - 1) === EMPTY) swap(x, y, x - dir, y - 1);
            else if (at(x + dir, y - 1) === EMPTY) swap(x, y, x + dir, y - 1);
          } else if (v === OIL) {
            if (neighborIs(x, y, FIRE)) {
              setAt(x, y, FIRE, col[i0] % 3, FUEL[OIL][1]);
              continue;
            }
            if (at(x, y - 1) === WATER) swap(x, y, x, y - 1);
            else if (at(x, y + 1) === EMPTY) swap(x, y, x, y + 1);
            else if (at(x - dir, y + 1) === EMPTY) swap(x, y, x - dir, y + 1);
            else if (at(x + dir, y + 1) === EMPTY) swap(x, y, x + dir, y + 1);
          } else if (v === SALT) {
            if (neighborIs(x, y, WATER) && (x + y + frame) % 2 === 0) {
              setAt(x, y, EMPTY, 0, 0);
              continue;
            }
            if (at(x, y + 1) === EMPTY || at(x, y + 1) === WATER) swap(x, y, x, y + 1);
            else if (at(x - dir, y + 1) === EMPTY || at(x - dir, y + 1) === WATER) swap(x, y, x - dir, y + 1);
            else if (at(x + dir, y + 1) === EMPTY || at(x + dir, y + 1) === WATER) swap(x, y, x + dir, y + 1);
          } else if (v === SEED) {
            if (neighborIs(x, y, WATER)) {
              setAt(x, y, SPROUT, col[i0] % 3, 0);
              continue;
            }
            if (at(x, y + 1) === EMPTY) swap(x, y, x, y + 1);
            else if (at(x - dir, y + 1) === EMPTY) swap(x, y, x - dir, y + 1);
            else if (at(x + dir, y + 1) === EMPTY) swap(x, y, x + dir, y + 1);
          } else if (v === STEAM) {
            life[i0]--;
            if (life[i0] <= 0) { setAt(x, y, EMPTY, 0, 0); continue; }
            if (at(x, y - 1) === EMPTY) swap(x, y, x, y - 1);
            else if (at(x - dir, y - 1) === EMPTY) swap(x, y, x - dir, y - 1);
            else if (at(x + dir, y - 1) === EMPTY) swap(x, y, x + dir, y - 1);
            else if (at(x - dir, y) === EMPTY) swap(x, y, x - dir, y);
            else if (at(x + dir, y) === EMPTY) swap(x, y, x + dir, y);
          } else if (v === SNOW) {
            // snow lasts moments, then melts back to water
            life[i0]++;
            if (life[i0] > 22) { setAt(x, y, WATER, col[i0] % 3, 0); continue; }
            if (at(x, y + 1) === EMPTY) swap(x, y, x, y + 1);
            else if (at(x - dir, y + 1) === EMPTY) swap(x, y, x - dir, y + 1);
            else if (at(x + dir, y + 1) === EMPTY) swap(x, y, x + dir, y + 1);
          } else if (v === GUNPOWDER) {
            if (neighborIs(x, y, FIRE) || neighborIs(x, y, MAGMA) || neighborIs(x, y, THUNDER)) {
              explode(x, y, 4);
              continue;
            }
            if (at(x, y + 1) === EMPTY) swap(x, y, x, y + 1);
            else if (at(x - dir, y + 1) === EMPTY) swap(x, y, x - dir, y + 1);
            else if (at(x + dir, y + 1) === EMPTY) swap(x, y, x + dir, y + 1);
          } else if (v === BALL) {
            // super ball: gravity with a stored bounce vector, half energy back
            if (aux[i0] === 0) aux[i0] = dir;
            var bvx = (aux[i0] === 1) ? 1 : -1;
            if (at(x, y + 1) === EMPTY || at(x, y + 1) === WATER || GASES[at(x, y + 1)]) swap(x, y, x, y + 1);
            else {
              if (at(x, y - 1) === EMPTY) swap(x, y, x, y - 1);            // bounce up
              if (at(x + bvx, y) === EMPTY) swap(x, y, x + bvx, y);
              else { aux[i0] = -bvx; bvx = -bvx; if (at(x + bvx, y) === EMPTY) swap(x, y, x + bvx, y); }
              var nv = at(x, y + 1);
              if (nv === MAGMA || nv === FIRE) setAt(x, y, FIRE, col[i0] % 3, 2);  // melt mid-air
            }
          } else if (v === FIREWORK) {
            // firework: waits for flame, then bursts its payload
            if (neighborIs(x, y, FIRE) || neighborIs(x, y, MAGMA) || neighborIs(x, y, THUNDER)) {
              var pay2 = aux[i0] || POWDER;
              setAt(x, y, EMPTY, 0, 0);
              explode(x, y, 3);
              for (var py2 = -2; py2 <= 2; py2++)
                for (var px3 = -2; px3 <= 2; px3++)
                  if (abs(px3 * 3 + py2 * 5 + frame) % 2 === 0 && at(x + px3, y + py2) === EMPTY)
                    setAt(x + px3, y + py2, pay2, abs(((x + px3) * 31 + (y + py2) * 17 + frame) % 3), 0);
              continue;
            }
            if (at(x, y + 1) === EMPTY) swap(x, y, x, y + 1);
            else if (at(x - dir, y + 1) === EMPTY) swap(x, y, x - dir, y + 1);
            else if (at(x + dir, y + 1) === EMPTY) swap(x, y, x + dir, y + 1);
          } else if (v === GAS) {
            life[i0]--;
            if (life[i0] <= 0) { setAt(x, y, EMPTY, 0, 0); continue; }
            if (neighborIs(x, y, FIRE)) { setAt(x, y, FIRE, col[i0] % 3, FUEL[GAS][1]); continue; }
            if (at(x, y - 1) === EMPTY) swap(x, y, x, y - 1);
            else if (at(x - dir, y - 1) === EMPTY) swap(x, y, x - dir, y - 1);
            else if (at(x + dir, y - 1) === EMPTY) swap(x, y, x + dir, y - 1);
            else if (at(x - dir, y) === EMPTY) swap(x, y, x - dir, y);
            else if (at(x + dir, y) === EMPTY) swap(x, y, x + dir, y);
          } else if (v === THUNDER) {
            // thunder: moves erratically, wind-immune; metal cages it, stone grounds it
            var ti = i0;
            life[ti]--;
            if (life[ti] <= 0) { setAt(x, y, EMPTY, 0, 0); continue; }
            var td = abs((x * 13 + y * 7 + frame) % 8);
            var tdx = (td === 0 || td === 3 || td === 5) ? 1 : (td === 1 || td === 4 || td === 6) ? -1 : 0;
            var tdy = (td < 2) ? -1 : (td > 5) ? 1 : 0;
            // lightning seeks ground: stone or metal within four cells below pulls it down
            for (var sd = 1; sd <= 4; sd++) {
              var sv = at(x, y + sd);
              if (sv === STONE || sv === METAL) { tdx = 0; tdy = 1; break; }
              if (sv !== EMPTY && !GASES[sv] && sv !== WATER && sv !== FIRE && sv !== STEAM) break;
            }
            var txp = x + tdx, typ = y + tdy;
            var tv = at(txp, typ);
            if (tv === METAL || tv === WALL) { /* contained */ }
            else if (tv === STONE) { setAt(txp, typ, POWDER, col[idx(txp, typ)] % 3, 0); setAt(x, y, EMPTY, 0, 0); }
            else if (tv === EMPTY) swap(x, y, txp, typ);
            else if (flammable(tv) && tv !== GUNPOWDER) {
              ignite(txp, typ);
              energy = Math.min(120, energy + 1.5);
            } else if (tv === GUNPOWDER) {
              explode(txp, typ, 4);
            } else if (GASES[tv] || tv === WATER) {
              setAt(x, y, EMPTY, 0, 0);   // dissipates in water and cloud
            }
            energy = Math.min(120, energy + 0.8);
          } else if (v === ANT) {
            // ants burrow: tunnel through wood and soft solids, breed mildly
            var ai = i0;
            if (neighborIs(x, y, FIRE) || neighborIs(x, y, MAGMA)) { setAt(x, y, FIRE, col[ai] % 3, FUEL[ANT][1]); continue; }
            var adx = ((x * 7 + y * 5 + frame) % 3) - 1;
            var ady = ((x * 3 + y * 11 + frame) % 3) - 1;
            if (adx === 0 && ady === 0) ady = 1;
            var axp = x + adx, ayp = y + ady;
            var av = at(axp, ayp);
            if (av === WOOD || av === STONE || av === METAL || av === ICE || av === SPROUT) {
              swap(x, y, axp, ayp);   // burrow into the solid
              if ((x + y + frame) % 37 === 0 && at(x, y) === EMPTY) setAt(x, y, ANT, col[ai] % 3, 0);
            } else if (av === EMPTY && (x + y + frame) % 2 === 0) {
              swap(x, y, axp, ayp);
            } else if (at(x, y + 1) === EMPTY) swap(x, y, x, y + 1);
          } else if (v === SOAPY) {
            // soapy water: heavier-duty fire response, popped by strong wind
            var sw = windAt(x, y);
            if (abs(sw) >= 2.4) {
              setAt(x, y, BUBBLE, col[i0] % 3, 0);
              continue;
            }
            if (at(x, y + 1) === EMPTY) swap(x, y, x, y + 1);
            else if (at(x - dir, y + 1) === EMPTY) swap(x, y, x - dir, y + 1);
            else if (at(x + dir, y + 1) === EMPTY) swap(x, y, x + dir, y + 1);
            else if (at(x - dir, y) === EMPTY) swap(x, y, x - dir, y);
            else if (at(x + dir, y) === EMPTY) swap(x, y, x + dir, y);
            var sb = [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)];
            for (var sf = 0; sf < sb.length; sf++) {
              if (sb[sf] === FIRE) {
                // sometimes the flame's own heat pops it instead
                if (abs((x * 5 + y * 3 + frame) % 4) !== 0) {
                  setAt(x, y, STEAM, col[i0] % 2, steamLife(x, y));
                } else {
                  setAt(x, y, BUBBLE, col[i0] % 3, 0);
                }
                break;
              }
            }
          } else if (v === BUBBLE) {
            // bubbles drift up; the first solid-ish thing they touch, they become
            var bv2 = at(x, y - 1);
            if (bv2 === EMPTY || bv2 === GAS || bv2 === STEAM) swap(x, y, x, y - 1);
            else if (at(x - dir, y - 1) === EMPTY) swap(x, y, x - dir, y - 1);
            else if (at(x + dir, y - 1) === EMPTY) swap(x, y, x + dir, y - 1);
            else {
              var touch = bv2;
              if (touch !== WALL && touch !== CLONE) {
                setAt(x, y, touch === WATER ? WATER : touch, col[idx(x, y - 1)] % 3, 0);
              } else {
                setAt(x, y, WATER, col[i0] % 3, 0);   // pop against the walls
              }
            }
          }
        }
      }
    }

    // the bellows: the room owns the squeeze; the sim only feels the push
    function setWind(d) { windDir = d > 0 ? 1 : d < 0 ? -1 : 0; }

    function countElement(v) {
      var n = 0;
      for (var i = 0; i < grid.length; i++) if (grid[i] === v) n++;
      return n;
    }
    // y0..y1 inclusive: callers ask for a band ending on the floor row, and
    // the floor row is exactly where settled powder lands.
    function countInRows(v, y0, y1) {
      var n = 0;
      var lo = y0 < 0 ? 0 : y0, hi = y1 > H - 1 ? H - 1 : y1;
      for (var y = lo; y <= hi; y++)
        for (var x = 0; x < W; x++)
          if (grid[idx(x, y)] === v) n++;
      return n;
    }
    function topRow(v) {
      for (var y = 0; y < H; y++)
        for (var x = 0; x < W; x++)
          if (grid[idx(x, y)] === v) return y;
      return -1;
    }
    function shadeAt(x, y) {
      if (!inBounds(x, y)) return 0;
      return col[idx(x, y)];
    }
    function census() {
      var names = [];
      if (used[POWDER]) names.push('powder');
      if (used[WATER]) names.push('water');
      if (used[FIRE]) names.push('fire');
      if (used[OIL]) names.push('oil');
      if (used[SALT]) names.push('salt');
      if (used[SEED] || used[SPROUT]) names.push('seed');
      if (countElement(STEAM) > 0 && names.indexOf('steam') < 0) names.push('steam');
      if (used[WOOD]) names.push('wood');
      if (used[STONE]) names.push('stone');
      if (used[MAGMA]) names.push('magma');
      if (used[ICE] || used[SNOW]) names.push('ice');
      if (used[METAL]) names.push('metal');
      if (used[GUNPOWDER]) names.push('gunpowder');
      if (used[BALL]) names.push('superball');
      if (used[FIREWORK]) names.push('firework');
      if (used[GAS]) names.push('gas');
      if (used[THUNDER]) names.push('thunder');
      if (used[CLONE]) names.push('clone');
      if (used[ANT]) names.push('ants');
      if (used[SOAPY] || used[BUBBLE]) names.push('soap');
      return names;
    }
    function snapshot() { return Array.prototype.slice.call(grid); }
    function reset() {
      grid = new Uint8Array(W * H);
      col = new Uint8Array(W * H);
      life = new Int16Array(W * H);
      aux = new Uint8Array(W * H);
      seen = new Int32Array(W * H);
      frame = 0; strokes = 0; used = {};
      breeze = 0; energy = 0; windDir = 0; lastPour = 0;
    }

    return {
      W: W, H: H,
      EMPTY: EMPTY, WALL: WALL, POWDER: POWDER, SAND: POWDER, WATER: WATER,
      FIRE: FIRE, OIL: OIL, SALT: SALT, SEED: SEED, STEAM: STEAM,
      SPROUT: SPROUT, WOOD: WOOD, STONE: STONE, MAGMA: MAGMA, ICE: ICE,
      SNOW: SNOW, METAL: METAL, GUNPOWDER: GUNPOWDER, BALL: BALL,
      FIREWORK: FIREWORK, GAS: GAS, THUNDER: THUNDER, CLONE: CLONE,
      ANT: ANT, SOAPY: SOAPY, BUBBLE: BUBBLE, ERASE: ERASE,
      PALETTES: PALETTES, SOLIDS: SOLIDS, POWDERS: POWDERS, GASES: GASES,
      FUEL: FUEL,
      at: at, setAt: setAt, shadeAt: shadeAt, pour: pour, step: step, reset: reset,
      setWind: setWind, windAt: windAt,
      isSolid: isSolid, standable: standable, flammable: flammable,
      countElement: countElement, countInRows: countInRows, topRow: topRow,
      census: census, snapshot: snapshot,
      state: function () { return { frame: frame, strokes: strokes, energy: Math.round(energy) }; }
    };
  }

  var api = {
    create: createSim, W: W, H: H,
    EMPTY: EMPTY, WALL: WALL, POWDER: POWDER, SAND: POWDER, WATER: WATER,
    FIRE: FIRE, OIL: OIL, SALT: SALT, SEED: SEED, STEAM: STEAM,
    SPROUT: SPROUT, WOOD: WOOD, STONE: STONE, MAGMA: MAGMA, ICE: ICE,
    SNOW: SNOW, METAL: METAL, GUNPOWDER: GUNPOWDER, BALL: BALL,
    FIREWORK: FIREWORK, GAS: GAS, THUNDER: THUNDER, CLONE: CLONE,
    ANT: ANT, SOAPY: SOAPY, BUBBLE: BUBBLE, ERASE: ERASE, PALETTES: PALETTES
  };
  global.LiberPowder = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
