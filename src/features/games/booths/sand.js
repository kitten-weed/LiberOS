// Powder tent — extracted verbatim from the games monolith.
var SAND_W = 120, SAND_H = 150, SAND_CELL = 3;
var SAND_EMPTY = 0, SAND_WALL = 1, SAND_SAND = 2, SAND_WATER = 3, SAND_FIRE = 4;
var SAND_COLORS = {
  1: [[122, 110, 96]],
  2: [[216, 170, 80], [226, 180, 92], [206, 158, 70]],
  3: [[64, 130, 200], [74, 142, 210], [56, 118, 188]],
  4: [[255, 120, 40], [255, 160, 60], [240, 90, 30]]
};

function playSand(api, b, body) {
  body.innerHTML =
    '<div class="sand-wrap">'
    + '<canvas class="sand-canvas" id="sand-canvas" width="' + (SAND_W * SAND_CELL) + '" height="' + (SAND_H * SAND_CELL) + '"></canvas>'
    + '<div class="sand-bar" id="sand-bar"></div>'
    + '<div class="sand-hint">pour, splash, strike. the tent keeps a picture when you keep it.</div>'
    + '<div class="games-actions" style="justify-content:center">'
    + '<button type="button" class="games-action" id="sand-clear">sweep it</button>'
    + '<button type="button" class="games-action" id="sand-keep">keep it</button>'
    + '</div>'
    + '<div class="games-result" id="sand-result"></div>'
    + '</div>';

  var cv = document.getElementById('sand-canvas');
  var ctx = cv.getContext('2d');
  var gridArr = new Uint8Array(SAND_W * SAND_H);
  var colArr = new Uint8Array(SAND_W * SAND_H);
  var lifeArr = new Int16Array(SAND_W * SAND_H);
  var EL = [
    { id: SAND_SAND, name: 'sand' },
    { id: SAND_WATER, name: 'water' },
    { id: SAND_FIRE, name: 'fire' },
    { id: SAND_WALL, name: 'wall' },
    { id: -1, name: 'erase' }
  ];
  var el = SAND_SAND;
  var brush = 2;
  var pouring = false;
  var strokes = 0;
  var used = {};
  var frame = 0;
  var raf = 0;
  var img = ctx.createImageData(cv.width, cv.height);

  function at(x, y) {
    if (x < 0 || y < 0 || x >= SAND_W || y >= SAND_H) return -1;
    return gridArr[y * SAND_W + x];
  }
  function setAt(x, y, v, c, life) {
    if (x < 0 || y < 0 || x >= SAND_W || y >= SAND_H) return;
    gridArr[y * SAND_W + x] = v;
    colArr[y * SAND_W + x] = c || 0;
    lifeArr[y * SAND_W + x] = life || 0;
  }
  function swapCells(x1, y1, x2, y2) {
    var i1 = y1 * SAND_W + x1, i2 = y2 * SAND_W + x2;
    var t = gridArr[i1]; gridArr[i1] = gridArr[i2]; gridArr[i2] = t;
    t = colArr[i1]; colArr[i1] = colArr[i2]; colArr[i2] = t;
    t = lifeArr[i1]; lifeArr[i1] = lifeArr[i2]; lifeArr[i2] = t;
  }

  function pour(cx, cy) {
    for (var dy = -brush; dy <= brush; dy++) {
      for (var dx = -brush; dx <= brush; dx++) {
        if (dx * dx + dy * dy > brush * brush + 1) continue;
        var x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= SAND_W || y >= SAND_H) continue;
        if (el === -1) {
          setAt(x, y, SAND_EMPTY, 0, 0);
        } else if (gridArr[y * SAND_W + x] === SAND_EMPTY) {
          var pal = SAND_COLORS[el].length;
          var pick = Math.abs((x * 31 + y * 17 + frame) % pal);
          setAt(x, y, el, pick, el === SAND_FIRE ? 4 + (Math.abs(x + y + frame) % 4) : 0);
        }
      }
    }
    strokes++;
    if (el > 0) used[el] = true;
  }

  function cellPos(e) {
    var r = cv.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) * (SAND_W / r.width)),
      y: Math.floor((e.clientY - r.top) * (SAND_H / r.height))
    };
  }
  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    pouring = true;
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    var p = cellPos(e);
    pour(p.x, p.y);
  });
  cv.addEventListener('pointermove', function (e) {
    if (!pouring) return;
    var p = cellPos(e);
    pour(p.x, p.y);
  });
  function stopPour() { pouring = false; }
  cv.addEventListener('pointerup', stopPour);
  cv.addEventListener('pointercancel', stopPour);
  cv.addEventListener('pointerleave', stopPour);

  var bar = document.getElementById('sand-bar');
  EL.forEach(function (o) {
    var eb = document.createElement('button');
    eb.type = 'button';
    eb.className = 'sand-el' + (o.id === el ? ' on' : '');
    eb.textContent = o.name;
    eb.addEventListener('click', function () {
      el = o.id;
      var sibs = bar.querySelectorAll('.sand-el');
      for (var k = 0; k < sibs.length; k++) sibs[k].classList.remove('on');
      eb.classList.add('on');
    });
    bar.appendChild(eb);
  });

  function step() {
    frame++;
    var dir = (frame % 2 === 0) ? 1 : -1;
    for (var y = SAND_H - 1; y >= 0; y--) {
      for (var xi = 0; xi < SAND_W; xi++) {
        var x = dir === 1 ? xi : (SAND_W - 1 - xi);
        var v = gridArr[y * SAND_W + x];
        if (v === SAND_EMPTY || v === SAND_WALL) continue;
        if (v === SAND_SAND) {
          if (at(x, y + 1) === SAND_EMPTY || at(x, y + 1) === SAND_WATER) swapCells(x, y, x, y + 1);
          else if (at(x - dir, y + 1) === SAND_EMPTY || at(x - dir, y + 1) === SAND_WATER) swapCells(x, y, x - dir, y + 1);
          else if (at(x + dir, y + 1) === SAND_EMPTY || at(x + dir, y + 1) === SAND_WATER) swapCells(x, y, x + dir, y + 1);
        } else if (v === SAND_WATER) {
          if (at(x, y + 1) === SAND_EMPTY) swapCells(x, y, x, y + 1);
          else if (at(x - dir, y + 1) === SAND_EMPTY) swapCells(x, y, x - dir, y + 1);
          else if (at(x + dir, y + 1) === SAND_EMPTY) swapCells(x, y, x + dir, y + 1);
          else if (at(x - dir, y) === SAND_EMPTY) swapCells(x, y, x - dir, y);
          else if (at(x + dir, y) === SAND_EMPTY) swapCells(x, y, x + dir, y);
          // fire + water: both hiss out
          var nb = [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)];
          for (var f = 0; f < nb.length; f++) {
            if (nb[f] === SAND_FIRE) { setAt(x, y, SAND_EMPTY, 0, 0); break; }
          }
        } else if (v === SAND_FIRE) {
          var i = y * SAND_W + x;
          lifeArr[i]--;
          if (lifeArr[i] <= 0) { setAt(x, y, SAND_EMPTY, 0, 0); continue; }
          if (at(x, y - 1) === SAND_WATER || at(x - 1, y) === SAND_WATER || at(x + 1, y) === SAND_WATER) {
            setAt(x, y, SAND_EMPTY, 0, 0);
            continue;
          }
          if (at(x, y - 1) === SAND_EMPTY) swapCells(x, y, x, y - 1);
          else if (at(x - dir, y - 1) === SAND_EMPTY) swapCells(x, y, x - dir, y - 1);
          else if (at(x + dir, y - 1) === SAND_EMPTY) swapCells(x, y, x + dir, y - 1);
        }
      }
    }
  }

  function paint() {
    var px = img.data;
    var p = 0;
    for (var y = 0; y < SAND_H; y++) {
      for (var x = 0; x < SAND_W; x++) {
        var v = gridArr[y * SAND_W + x];
        var rC = 10, gC = 8, bC = 5;
        if (v !== SAND_EMPTY) {
          var pal = SAND_COLORS[v] || [[200, 200, 200]];
          var cc = pal[colArr[y * SAND_W + x] % pal.length];
          rC = cc[0]; gC = cc[1]; bC = cc[2];
        }
        for (var sy = 0; sy < SAND_CELL; sy++) {
          for (var sx = 0; sx < SAND_CELL; sx++) {
            var o = (((y * SAND_CELL + sy) * cv.width) + (x * SAND_CELL + sx)) * 4;
            px[o] = rC; px[o + 1] = gC; px[o + 2] = bC; px[o + 3] = 255;
          }
        }
        p++;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function loop() {
    if (!document.body.contains(cv)) return;
    step();
    paint();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  if (api.stage) {
    api.stage._teardown = function () {
      try { cancelAnimationFrame(raf); } catch (e) {}
    };
  }

  var clear = document.getElementById('sand-clear');
  if (clear) clear.addEventListener('click', function () {
    gridArr = new Uint8Array(SAND_W * SAND_H);
    colArr = new Uint8Array(SAND_W * SAND_H);
    lifeArr = new Int16Array(SAND_W * SAND_H);
    strokes = 0;
    used = {};
  });

  var keepBtn = document.getElementById('sand-keep');
  var result = document.getElementById('sand-result');
  if (keepBtn) keepBtn.addEventListener('click', function () {
    if (!strokes) {
      if (result) result.textContent = 'the tent is empty. pour sand, splash water, strike fire.';
      return;
    }
    var shot = api.thumb(cv);
    var names = [];
    if (used[SAND_SAND]) names.push('sand');
    if (used[SAND_WATER]) names.push('water');
    if (used[SAND_FIRE]) names.push('fire');
    if (used[SAND_WALL]) names.push('wall');
    api.promptSave(b, 'result: a powder world of ' + (names.join(', ') || 'dust') + '.', function () {
      api.saveToDesktopAndJournal(b, { strokes: strokes, elements: names }, shot);
      if (result) result.textContent = 'kept. the tent remembers.';
    }, null);
  });
}

window.LiberBooths = window.LiberBooths || {};
window.LiberBooths.sand = playSand;
