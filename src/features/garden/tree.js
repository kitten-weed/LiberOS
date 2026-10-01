// tree.js — Ruby's glasshouse. The thimble pot, promoted: one tree in its own
// pot that grows on wall-clock time while you are elsewhere in the machine.
// Offline growth is computed on return (absence is fine, nothing decays); a
// can of water outside the six-hour window banks an hour of growth; mature
// trees hang fruit, and fruit comes away as petals for the paint boxes and a
// pressing for the journal. Legacy thimble visits migrate forward as starting
// growth. No shared imports; xmur3 + mulberry32 copied from
// src/prompt-engine.js the way garden.js copies them.

(function () {
  var treeRoom = document.getElementById('garden-room-tree');
  var treeSvg = document.getElementById('tree-svg');
  var treeMeta = document.getElementById('tree-meta');
  var treeNote = document.getElementById('tree-note');
  var rootsSvg = document.getElementById('tree-roots');
  var fruitRow = document.getElementById('tree-fruit-row');

  // 40 min per stage at full rate; stage 5 is the seasonal crown and holds.
  var STAGE_MS = 40 * 60 * 1000;
  var STAGES = 5;
  var WATER_BONUS_MS = 60 * 60 * 1000;      // the bought hour
  var FRUIT_SPOTS = 5;

  var PETALS = ['#e08ab0', '#9ac8e8', '#c8e89a', '#e8d89a', '#d8a8e8'];
  var STAGE_NAMES = ['planted', 'a sapling', 'young wood', 'grown on', 'mature', 'in season'];

  // xmur3 + mulberry32 (mirrors src/prompt-engine.js, as garden.js does)
  function hashSeed(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h ^= h >>> 16) >>> 0;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function st() { return (window.Liber && window.Liber.state) || null; }

  // ─── state: s.tree, one plant ────────────────────────────────────────────
  // {
  //   planted:  epoch ms the seed went in (legacy: first glasshouse open)
  //   watered:  epoch ms of the last can, or 0 (the record)
  //   wateredStage: stage the last can was spent on — one can per stage
  //   stageAt:  epoch ms the current stage began
  //   grown:    ms banked into the current stage
  //   seen:     epoch ms the tree was last on screen (growth accrues off-screen)
  //   fruits:   [epoch ms] fruit taken down
  //   pressings: count pressed into the book
  //   migratedFrom: 'thimble' | null
  // }
  function legacyVisits() {
    var s = (st() && st().get()) || {};
    return (s.thimble && s.thimble.visits) || 0;
  }

  function ensureTree() {
    var t = (st().get() || {}).tree;
    if (t) return t;
    var now = Date.now();
    var visits = legacyVisits();
    // Legacy thimble visits become starting growth — 3 visits ≈ one stage,
    // the same arithmetic the thimble used. Nothing kept is lost.
    var banked = Math.min(STAGES - 1, Math.floor(visits / 3)) * STAGE_MS;
    // planted backdated by the banked stages, so the ledger reads them as
    // already-grown stages; the current stage begins now
    t = {
      planted: now - banked,
      watered: 0,
      wateredStage: null,
      stageAt: now,
      grown: 0,
      seen: now,
      fruits: [],
      pressings: 0,
      migratedFrom: visits > 0 ? 'thimble' : null
    };
    st().set({ tree: t });
    return t;
  }

  function stageOf(t) {
    return Math.max(0, Math.min(STAGES, Math.floor((t.stageAt - t.planted) / STAGE_MS)));
  }
  function progressOf(t) {
    if (stageOf(t) >= STAGES) return 1;
    return Math.max(0, Math.min(1, t.grown / STAGE_MS));
  }
  function hangingOf(t) {
    return Math.max(0, FRUIT_SPOTS - (t.fruits || []).length);
  }

  // fold ms of growth into the ledger, turning stages as they fill
  function fold(t2, ms) {
    var rem = ms;
    while (rem > 0 && stageOf(t2) < STAGES) {
      var space = STAGE_MS - t2.grown;
      var take = Math.min(space, rem);
      t2.grown += take;
      rem -= take;
      if (t2.grown >= STAGE_MS) {
        t2.grown = 0;
        t2.stageAt = (t2.stageAt || t2.planted) + STAGE_MS;
      }
    }
    return t2;
  }

  // growth accrues only while the tree has no eyes on it
  function accrue(t) {
    var now = Date.now();
    var seen = t.seen || t.stageAt || t.planted;
    var away = now - seen;
    if (away <= 0) return t;
    var t2 = fold(Object.assign({}, t), away);
    t2.seen = now;
    st().set({ tree: t2 });
    return t2;
  }

  // watering: one can per stage — ruby's calendar, not a timer
  function canWater(t) {
    if (stageOf(t) >= STAGES) return false;
    return t.wateredStage !== stageOf(t);
  }

  function water() {
    var t = accrue(ensureTree());
    if (!canWater(t)) {
      if (treeNote) treeNote.textContent = 'the soil is still wet from the last can.';
      return;
    }
    // the bought hour fills the current stage — it never turns one. the
    // stage's last five minutes always finish on their own; ruby does not
    // force blooms, and a can must not buy the next stage's can.
    var add = Math.min(WATER_BONUS_MS, Math.max(0, STAGE_MS - 5 * 60000 - t.grown));
    if (add <= 0) {
      if (treeNote) treeNote.textContent = 'it is nearly there. let it finish on its own.';
      return;
    }
    var t2 = Object.assign({}, t);
    t2.grown = t.grown + add;
    t2.watered = Date.now();
    t2.wateredStage = stageOf(t);
    t2.seen = Date.now();
    st().set({ tree: t2 });
    if (treeNote) treeNote.textContent = 'watered. an hour, banked.';
    pourArc();
    renderAll();
  }

  // the can's arc: a brief fall of droplets over the pot. the can itself
  // never appears — you brought it, you know where it is.
  function pourArc() {
    var pour = document.getElementById('tree-pour');
    if (!pour) return;
    pour.innerHTML = '';
    pour.classList.remove('on');
    void pour.offsetWidth;
    pour.classList.add('on');
    for (var i = 0; i < 9; i++) {
      var d = document.createElement('i');
      d.style.left = (34 + i * 2.4) + '%';
      d.style.top = (18 + (i % 3) * 4) + '%';
      d.style.animationDelay = (i * 55) + 'ms';
      pour.appendChild(d);
    }
    setTimeout(function () { pour.classList.remove('on'); pour.innerHTML = ''; }, 1400);
  }

  function harvest() {
    var t = accrue(ensureTree());
    if (stageOf(t) < STAGES || !hangingOf(t)) {
      if (treeNote) treeNote.textContent = 'nothing hanging yet. the tree keeps its own calendar.';
      return;
    }
    var petal = PETALS[(t.pressings || 0) % PETALS.length];
    var now = Date.now();
    var t2 = Object.assign({}, t);
    t2.fruits = (t.fruits || []).concat([now]);
    t2.pressings = (t.pressings || 0) + 1;
    st().set({ tree: t2 });
    // the rewards: a petal for every paint box, a pressing for the book
    try {
      var s = st().get() || {};
      var pal = Array.isArray(s.palette) ? s.palette.slice() : [];
      if (pal.indexOf(petal) < 0) pal.push(petal);
      st().set({ palette: pal });
    } catch (e) {}
    pourArc();
    st().addArtifact('journal', {
      kind: 'tree-pressing',
      name: 'a pressing from the glasshouse tree',
      petal: petal,
      ts: now
    });
    if (window.Liber && window.Liber.soundscape) {
      try { window.Liber.soundscape.motif('ruby'); } catch (e) {}
    }
    if (treeNote) treeNote.textContent = 'pressed. a ' + petal + ' petal drifts to every paint box.';
    renderAll();
  }

  // ─── drawing ─────────────────────────────────────────────────────────────
  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // the tree is one plant with one id — the same pot always draws the same
  // silhouette: a lean nobody corrected, a first fork, a spread.
  function silhouette(t) {
    var rng = mulberry32(hashSeed('ruby-tree:' + (t.planted || 0)));
    return {
      lean: (rng() - 0.5) * 10,
      firstFork: 88 + rng() * 14,
      spread: 0.85 + rng() * 0.3
    };
  }

  function drawTree(t) {
    if (!treeSvg) return;
    var s = stageOf(t);
    var p = progressOf(t);
    var sh = silhouette(t);
    treeSvg.innerHTML = '';

    var cx = 210, baseY = 330;

    // the bench keeps the marks of every pot that has stood here — faint
    // water-rings beside the tree's. ruby never scrubs them out.
    var rings = svgEl('g', { 'class': 'tree-bench-rings' });
    rings.appendChild(svgEl('ellipse', { cx: 96, cy: 386, rx: 26, ry: 6, fill: 'none', stroke: 'rgba(122, 74, 94, 0.28)', 'stroke-width': '2.5' }));
    rings.appendChild(svgEl('ellipse', { cx: 330, cy: 388, rx: 30, ry: 7, fill: 'none', stroke: 'rgba(138, 154, 107, 0.22)', 'stroke-width': '2.5' }));
    rings.appendChild(svgEl('ellipse', { cx: 372, cy: 384, rx: 16, ry: 4, fill: 'none', stroke: 'rgba(176, 106, 62, 0.25)', 'stroke-width': '2' }));
    treeSvg.appendChild(rings);

    // the pot: terracotta, glazed rim, the chip on the lip that was always there
    var pot = svgEl('g', { 'class': 'tree-pot' });
    pot.appendChild(svgEl('path', {
      d: 'M158 ' + baseY + ' L262 ' + baseY + ' L252 388 L168 388 Z',
      fill: '#9a5a34', stroke: '#5a3218', 'stroke-width': '2'
    }));
    pot.appendChild(svgEl('rect', { x: 152, y: baseY - 10, width: 116, height: 14, rx: 3, fill: '#b06a3e', stroke: '#5a3218', 'stroke-width': '2' }));
    pot.appendChild(svgEl('path', { d: 'M244 ' + (baseY - 10) + ' l5 13', stroke: '#5a3218', 'stroke-width': '1.4', fill: 'none' }));
    pot.appendChild(svgEl('rect', { x: 160, y: baseY, width: 100, height: 8, fill: '#3a2412' }));
    treeSvg.appendChild(pot);

    if (s === 0 && p < 0.15) {
      // before anything: the label stake, like a seed packet on a stick
      var stick = svgEl('g', { 'class': 'tree-stake' });
      stick.appendChild(svgEl('line', { x1: cx, y1: baseY - 2, x2: cx + sh.lean, y2: baseY - 34, stroke: '#c9b088', 'stroke-width': '3' }));
      var tag = svgEl('text', { x: cx + sh.lean + 7, y: baseY - 26, 'class': 'tree-stake-tag' });
      tag.textContent = 'tree';
      stick.appendChild(tag);
      treeSvg.appendChild(stick);
      return;
    }

    // trunk — the lean the pot never corrected
    var h = 26 + s * 34 + p * 12;
    var topX = cx + sh.lean;
    treeSvg.appendChild(svgEl('path', {
      d: 'M' + (cx - 5) + ' ' + baseY +
         ' C ' + (cx - 4) + ' ' + (baseY - h * 0.5) + ' ' + (topX - 4) + ' ' + (baseY - h * 0.8) + ' ' + topX + ' ' + (baseY - h) +
         ' L ' + (topX + 5) + ' ' + (baseY - h) +
         ' C ' + (topX + 5) + ' ' + (baseY - h * 0.8) + ' ' + (cx + 5) + ' ' + (baseY - h * 0.5) + ' ' + (cx + 6) + ' ' + baseY + ' Z',
      fill: '#6a4526', stroke: '#3a2412', 'stroke-width': '1.4'
    }));

    // boughs by stage — ruby's sage, deepening toward the bed's leaf tone;
    // no green here that the rest of the room could not have mixed
    var greens = ['#64744c', '#6f7d50', '#7a8a56', '#84945c', '#8a9a6b', '#8a9a6b'];
    var g = greens[Math.min(greens.length - 1, s)];
    function bough(x, y, rx, ry, rot) {
      treeSvg.appendChild(svgEl('ellipse', {
        cx: x, cy: y, rx: rx, ry: ry,
        transform: 'rotate(' + rot + ' ' + x + ' ' + y + ')',
        fill: g, stroke: '#2e4a22', 'stroke-width': '1.2'
      }));
    }
    if (s >= 1) {
      bough(topX - 26 * sh.spread, baseY - h - 4, 24 * sh.spread, 13, -12);
      if (s >= 2) bough(topX + 28 * sh.spread, baseY - h - 14, 26 * sh.spread, 14, 10);
      if (s >= 3) bough(topX - 14, baseY - h - 30, 30 * sh.spread, 16, -4);
      if (s >= 4) {
        bough(topX + 10, baseY - h - 44, 32 * sh.spread, 17, 3);
        bough(topX - 38 * sh.spread, baseY - h - 18, 18 * sh.spread, 10, -22);
        bough(topX + 42 * sh.spread, baseY - h - 26, 18 * sh.spread, 10, 24);
      }
    }

    // in season: fruit hangs where the boughs meet; picked fruit leave gaps
    if (s >= STAGES) {
      var rng = mulberry32(hashSeed('fruit:' + (t.planted || 0)));
      var spots = [
        [topX - 30 * sh.spread, baseY - h - 8],
        [topX + 26 * sh.spread, baseY - h - 18],
        [topX - 6, baseY - h - 34],
        [topX + 14, baseY - h - 48],
        [topX - 40 * sh.spread, baseY - h - 22]
      ];
      var hanging = hangingOf(t);
      for (var j = 0; j < spots.length && j < hanging; j++) {
        var fx = spots[j][0] + (rng() - 0.5) * 6;
        var fy = spots[j][1] + 6 + rng() * 4;
        treeSvg.appendChild(svgEl('line', { x1: fx, y1: fy - 5, x2: fx, y2: fy - 11, stroke: '#3a2412', 'stroke-width': '1' }));
        treeSvg.appendChild(svgEl('circle', { cx: fx, cy: fy, r: 5.5, fill: '#c98a9e', stroke: '#7a4a5e', 'stroke-width': '1.2', 'class': 'tree-fruit' }));
      }
    }
  }

  function drawRoots(t) {
    if (!rootsSvg) return;
    rootsSvg.innerHTML = '';
    var s = stageOf(t);
    var p = progressOf(t);
    var reach = 18 + s * 16 + p * 10;
    var depths = [26, 44, 60, 74, 86, 96];
    var d = depths[Math.min(depths.length - 1, s)];
    function root(x2, y2, w) {
      rootsSvg.appendChild(svgEl('path', {
        d: 'M210 26 C ' + (210 + (x2 - 210) * 0.4) + ' 34, ' + (210 + (x2 - 210) * 0.75) + ' ' + (y2 * 0.5) + ', ' + x2 + ' ' + y2,
        fill: 'none', stroke: '#c9b088', 'stroke-width': w, 'stroke-linecap': 'round', opacity: '0.75'
      }));
    }
    root(210 - reach, 26 + d * 0.55, 2.4);
    root(210 + reach, 26 + d * 0.5, 2.4);
    root(210 - reach * 0.55, 26 + d, 1.8);
    root(210 + reach * 0.6, 26 + d * 0.9, 1.8);
    root(210, 26 + d, 2);
  }

  // ─── fruit row — the ledger of what came down, in ruby's hand ────────────
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function renderFruitRow(t) {
    if (!fruitRow) return;
    fruitRow.innerHTML = '';
    var list = (t.fruits || []).slice().reverse();
    if (!list.length) {
      var none = document.createElement('span');
      none.className = 'tree-fruit-none';
      none.textContent = 'no fruit taken yet';
      fruitRow.appendChild(none);
      return;
    }
    for (var i = 0; i < list.length; i++) {
      (function (ts, i) {
        var d = new Date(ts);
        var chip = document.createElement('span');
        chip.className = 'tree-fruit-chip';
        var dot = document.createElement('i');
        dot.style.background = PETALS[(t.pressings - 1 - i + PETALS.length * 8) % PETALS.length] || PETALS[0];
        chip.appendChild(dot);
        // the ledger keeps odd-precision counts: fruit n of 5, and the
        // minute the ladder was leaned away
        chip.appendChild(document.createTextNode(
          '#' + (t.pressings - i) + ' of 5 · ' +
          d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' +
          ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2)
        ));
        fruitRow.appendChild(chip);
      })(list[i], i);
    }
  }

  function metaLine(t) {
    var s = stageOf(t);
    var line = STAGE_NAMES[s];
    if (s >= STAGES) {
      line += ' · ' + hangingOf(t) + ' fruit hanging';
    } else {
      var remain = STAGE_MS - t.grown;
      var hrs = Math.floor(remain / 3600000);
      var mins = Math.ceil((remain % 3600000) / 60000);
      line += ' · next stage in ' + (hrs ? hrs + 'h ' : '') + mins + 'm';
    }
    return line;
  }

  function renderAll() {
    var t = accrue(ensureTree());
    drawTree(t);
    drawRoots(t);
    if (treeMeta) treeMeta.textContent = metaLine(t);
    renderFruitRow(t);
    var harvestBtn = document.getElementById('tree-harvest');
    var waterBtn = document.getElementById('tree-water');
    if (harvestBtn) harvestBtn.disabled = stageOf(t) < STAGES || !hangingOf(t);
    if (waterBtn) waterBtn.disabled = !canWater(t);
    // the lamp follows the machine's clock: lit after dark, cold in daylight
    var hr = new Date().getHours();
    var dark = hr >= 18 || hr < 7;
    var lamp = document.getElementById('tree-lamp');
    if (lamp) lamp.classList.toggle('on', dark);
    // daylight: sun through the glass lays bands across the bench —
    // the lamp's counterpart on the machine's clock
    var bands = document.getElementById('tree-bands');
    if (bands) bands.classList.toggle('on', !dark);
    var wrap = document.getElementById('tree-wrap');
    if (wrap) wrap.classList.toggle('inseason', stageOf(t) >= STAGES);
  }

  // ─── room wiring ─────────────────────────────────────────────────────────
  function activate() {
    ensureTree();
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', function () {
    // condensation wipes with the cursor: passing over a pane clears it
    var panes = document.querySelectorAll('.garden-tree-pane');
    for (var i = 0; i < panes.length; i++) {
      (function (pane) {
        pane.addEventListener('pointerenter', function () { pane.classList.add('wiped'); });
      })(panes[i]);
    }
    var tabTree = document.getElementById('garden-tab-tree');
    if (tabTree) tabTree.addEventListener('click', function () {
      if (window.Liber && window.Liber.garden && window.Liber.garden.showRoom) window.Liber.garden.showRoom('tree');
    });
    // saplings in the striking bed: two flats sown, one waiting. the third
    // is empty because ruby planted from it and has not refilled it.
    var beds = document.getElementById('tree-beds');
    if (beds && !beds.childNodes.length) {
      var flats = ['', '', 'empty'];
      for (var b = 0; b < flats.length; b++) {
        var flat = document.createElement('div');
        flat.className = 'tree-flat' + (flats[b] ? ' ' + flats[b] : '');
        if (!flats[b]) {
          for (var n = 0; n < 3; n++) flat.appendChild(document.createElement('i'));
        }
        beds.appendChild(flat);
      }
    }
    var harvestBtn = document.getElementById('tree-harvest');
    if (harvestBtn) harvestBtn.addEventListener('click', harvest);
    var waterBtn = document.getElementById('tree-water');
    if (waterBtn) waterBtn.addEventListener('click', water);
    // re-render when state moves (harvest writes, slot syncs, bfcache resync)
    if (window.Liber && window.Liber.state) {
      window.Liber.state.on('change', function () {
        if (treeRoom && !treeRoom.hasAttribute('inert')) renderAll();
      });
    }
    activate();
  });

  // exported for garden.js's showRoom and for the acceptance script
  window.Liber = window.Liber || {};
  window.Liber.tree = {
    activate: activate,
    model: function () {
      var t = accrue(ensureTree());
      return {
        stage: stageOf(t),
        progress: progressOf(t),
        canWater: canWater(t),
        hanging: hangingOf(t),
        pressings: t.pressings || 0,
        migratedFrom: t.migratedFrom || null,
        meta: metaLine(t)
      };
    },
    // test hook: fold N minutes of growth into the ledger, as absence would
    advance: function (mins) {
      var t = ensureTree();
      var t2 = fold(Object.assign({}, t), mins * 60000);
      t2.seen = Date.now();
      st().set({ tree: t2 });
      renderAll();
      return window.Liber.tree.model();
    },
    STAGE_MS: STAGE_MS,
    STAGES: STAGES
  };
})();
