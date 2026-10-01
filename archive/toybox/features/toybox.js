// toybox.js — Pip's room, native. One big sand game with movable props:
// the full powder engine (sand, water, fire, oil, salt, seed, steam,
// sprouts, wall), element jars, a draggable crab that walks piles flat
// and a shell that plows (terrain restored on lift). No tutorial, no
// walkthrough: every prop reacts the instant it is touched. Keeps save
// to games + journal with a polaroid. No shared imports.
(function () {
  'use strict';

  var CELL = 3, PW = 468, PH = 375;
  var GW = 156, GH = 125;

  // the side shelves: one labelled board per traveller, their objects on it.
  // each thing is drawn as the thing itself; the freight line rides the tooltip.
  var SHELVES_LEFT = [
    { giver: 'the house', items: [
      { id: 2,  label: 'sack',     art: 'sandbag',  title: 'house sweepings · sieve no. 3' },
      { id: 23, label: 'soap',     art: 'soapbar',  title: 'house tin · cold water only' },
      { id: 24, label: 'wand',     art: 'wand',     title: 'blown, not poured' },
      { id: -1, label: 'sponge',   art: 'sponge',   title: 'the sponge · worn to the wire' }
    ] },
    { giver: 'ruby', items: [
      { id: 7,  label: 'packet',   art: 'packet',   title: 'ruby · unlabelled, do not sort' },
      { id: 10, label: 'plank',    art: 'plank',    title: 'ruby · glasshouse offcut, third pruning' }
    ] },
    { giver: 'physius', items: [
      { id: 6,  label: 'cellar',   art: 'cellar',   title: 'physius · lab grade, reagent 12' },
      { id: 11, label: 'stone',    art: 'stone',    title: 'physius · casting stone, batch 9' }
    ] },
    { giver: 'inquiry', items: [
      { id: 13, label: 'ice',      art: 'icecube',  title: 'inquiry · kept at −4°, do not warm' },
      { id: 14, label: 'snow',     art: 'snowdab',  title: 'inquiry · will not keep, opened once' }
    ] },
    { giver: 'riason', items: [
      { id: 15, label: 'hinge',    art: 'hinge',    title: 'riason · corner stock, 3 mm' }
    ] },
    { giver: 'whimsy', items: [
      { id: 17, label: 'ball',     art: 'ball',     title: 'whimsy · lost & found, claimed twice' }
    ] }
  ];
  var SHELVES_RIGHT = [
    { giver: 'vanir', items: [
      { id: 3,  label: 'bottle',   art: 'bottle',   title: 'vanir · ballast, drawn at high tide' },
      { id: 1,  label: 'plate',    art: 'plate',    title: 'vanir · hull plate offcut' }
    ] },
    { giver: 'arcana', items: [
      { id: 4,  label: 'matches',  art: 'matches',  title: 'arcana · matches, struck before reading' },
      { id: 20, label: 'cell',     art: 'battery',  title: 'arcana · one use only · do not relight after' }
    ] },
    { giver: 'pete', items: [
      { id: 5,  label: 'oil can',  art: 'oilcan',   title: 'pete · lamp cut, 40 lb net' },
      { id: 16, label: 'keg',      art: 'keg',      title: 'pete · yard grade, keep from the lamp' },
      { id: 22, label: 'ant tin',  art: 'antfarm',  title: 'pete · live goods, vented' }
    ] },
    { giver: 'e-lizabeth', items: [
      { id: 18, label: 'rocket',   art: 'rocket',   title: 'e-lizabeth · holds the last pour' }
    ] },
    { giver: 'the scribe', items: [
      { id: 19, label: 'fume jar', art: 'jar',      title: 'the scribe · fume jar, marginalia notes' }
    ] },
    { giver: 'wanderlust', items: [
      { id: 21, label: 'spool',    art: 'spool',    title: 'wanderlust · she sends more' }
    ] },
    { giver: 'no name on it', items: [
      { id: 12, label: 'crucible', art: 'crucible', title: 'found tin, no giver · do not shake' }
    ] }
  ];
  // the shelf objects as pixel sprites, same register as the crew and
  // the powder cells — hand-pixelled, drawn by drawArt at scale 2
  var PIX = {
    sandbag: { w: 10, h: 8, pal: { s: '#d8aa50', d: '#9a7838', k: '#8a6828', h: '#ecc878' }, rows: [
      '....kk....', '...kssk...', '..hssssd..', '.hssssssd.', '.hssssssd.', '.dssssssd.', '..dssssd..', '...dddd...'] },
    bottle: { w: 8, h: 12, pal: { g: '#2a5a88', w: '#7ab0d8', c: '#4a8ac8' }, rows: [
      '..gggg..', '..g..g..', '..g..g..', '.gwwwwg.', '.gwccwg.', '.gwccwg.', '.gccccg.', '.gccccg.', '.gccccg.', '.gccccg.', '.gccccg.', 'gggggggg'] },
    matches: { w: 12, h: 7, pal: { f: '#e05a20', w: '#c8a060', b: '#7a3a28', y: '#e8d0a0', d: '#5a2a1c' }, rows: [
      '....ff..ff..', '....ww..ww..', '....ww..ww..', 'bbbbbbbbbbbb', 'byyyyyyyyyyb', 'bbbbbbbbbbbb', 'dddddddddddd'] },
    oilcan: { w: 11, h: 8, pal: { m: '#a89848', s: '#c8b868', o: '#4a4220' }, rows: [
      '........oo.', '........o..', '..o.mmmmm..', '..mmmmmmm..', '..msssssm..', '..msssssm..', '..msssssm..', '..mmmmmmm..'] },
    cellar: { w: 10, h: 9, pal: { w: '#e8e4da', s: '#c8c4b8', g: '#8a887c', h: '#f4f0e6' }, rows: [
      '...hhhh...', '..hhhhhh..', '.gggggggg.', '.gwwwwwwg.', '.gwwwwwwg.', '.gwwwwwwg.', '.gwwwwwwg.', '.gssssssg.', '.gggggggg.'] },
    packet: { w: 10, h: 11, pal: { l: '#e0d0a8', p: '#c8a86a', g: '#7a9a3a', d: '#a08850' }, rows: [
      'llllllllll', 'lppppppppl', 'lppppppppl', 'lppggppppl', 'lpggggpppl', 'lppggppppl', 'lppppppppl', 'lppppppppl', 'lppppppppl', 'llllllllll', 'dddddddddd'] },
    plate: { w: 12, h: 7, pal: { m: '#8a9496', l: '#b8c2c4', s: '#39413f' }, rows: [
      'llllllllllll', 'lmmmmmmmmmml', 'lmsmmmmmmsml', 'lmmmmmmmmmml', 'lmmmmmmmmmml', 'lmmmmmmmmmml', 'llllllllllll'] },
    plank: { w: 12, h: 5, pal: { w: '#b8864a', d: '#8a6234', g: '#6a4a28' }, rows: [
      'wwwwwwwwwwww', 'wwdwwwwwdwww', 'wwwwwwdwwwww', 'wwwwwwwwwwww', 'gggggggggggg'] },
    stone: { w: 11, h: 7, pal: { l: '#b8b6ac', m: '#9a988f', d: '#6a6860' }, rows: [
      '..lllll....', '.llllmmm...', 'llllmmmmdd.', 'lmmmmmmmmdd', 'lmmmmmmmddd', '.mmmmmmmddd', '.ddddddddd.'] },
    crucible: { w: 10, h: 8, pal: { k: '#2a2622', k2: '#4a4440', o: '#ffd070', m: '#e87020' }, rows: [
      '..ommo....', '.ommmmmo..', '.kkkkkkkk.', '.k222222k.', '.k222222k.', '.k222222k.', '..k2222k..', '..kkkkkk..'] },
    icecube: { w: 10, h: 8, pal: { i: '#9ad0e0', l: '#d8f0f8', w: '#ffffff', d: '#6eaac8' }, rows: [
      '.wwwwwwww.', '.wlllllll.', '.wliiiiid.', '.wiiiiiid.', '.wiiiiiid.', '.wiiiiiid.', '.wiiiiiid.', '.dddddddd.'] },
    snowdab: { w: 11, h: 6, pal: { w: '#ffffff', s: '#e4ecf2', b: '#c8d8e4' }, rows: [
      '....ww.....', '..wwwwww...', '.wwwwwwww..', 'wwwwwwwwwww', '.bsssssbb..', '..bbbbbb...'] },
    hinge: { w: 10, h: 6, pal: { m: '#c0c8ce', s: '#586070', d: '#8890a0' }, rows: [
      'smmm..mmms', 'mmmmmmmmmm', 'smmm..mmms', 'mmmmmmmmmm', 'smmm..mmms', 'dddddddddd'] },
    keg: { w: 10, h: 10, pal: { s: '#7a5c38', d: '#4a3a24', r: '#3a2e1c' }, rows: [
      '...dddd...', '..dssssd..', '.dssssssd.', '.rrrrrrrr.', 'dssssssssd', 'dssssssssd', '.rrrrrrrr.', '.dssssssd.', '..dssssd..', '...dddd...'] },
    ball: { w: 9, h: 8, pal: { p: '#e07a9e', l: '#f2a6c2', d: '#a84a6e', w: '#ffffff' }, rows: [
      '..llpp...', '.llllpp..', 'llwwppppd', 'llwwpppdd', 'pppppppdd', 'pppppdddd', '.pppdddd.', '..dddd...'] },
    rocket: { w: 7, h: 10, pal: { n: '#e05a20', c: '#e0c890', r: '#c84a18', f: '#ffd070' }, rows: [
      '..nnn..', '.nnnnn.', '.nnnnn.', '.ccccc.', '.ccccc.', '.ccccc.', '.ccccc.', 'rr.c.rr', '..fff..', '...f...'] },
    jar: { w: 9, h: 9, pal: { g: '#6a7a70', m: '#9ad89a', d: '#3c6e46', h: '#8a9a90' }, rows: [
      '..hhhhh..', '..hhhhh..', '.ggggggg.', '.gmdmmmg.', '.gmmmmmg.', '.gdmmmmg.', '.gmmmdmg.', '.gmmmmmg.', '.ggggggg.'] },
    battery: { w: 8, h: 10, pal: { y: '#ffe482', k: '#3a3a34', t: '#8a8a80' }, rows: [
      '...tt...', '.yyyyyy.', 'kkkkkkkk', 'kkkkkyyy', 'kkkkyyyy', 'kkkyykkk', 'kkyykkkk', 'kkkkkkkk', '.yyyyyy.', 'kkkkkkkk'] },
    spool: { w: 9, h: 9, pal: { h: '#6a5090', t: '#b08ae0', w: '#8a68b0' }, rows: [
      'hhhhhhhhh', 'httttttth', 'httttttth', 'httttttth', 'wtttttttw', 'httttttth', 'httttttth', 'httttttth', 'hhhhhhhhh'] },
    antfarm: { w: 12, h: 8, pal: { v: '#c8b088', s: '#a8784a', a: '#241a10', d: '#7a5430' }, rows: [
      'vvvvvvvvvvvv', 'vvvvvvvvvvvv', 'ssssssssssss', 'ssaassssaass', 'ssssaassssas', 'ssaasssssass', 'ssssssssssss', 'dddddddddddd'] },
    soapbar: { w: 11, h: 6, pal: { s: '#cce8f0', h: '#eef8fc', d: '#9ec8d8' }, rows: [
      '.hhhhhhhhh.', 'hsssssssssh', 'hsssssssssd', 'hsssssssssd', '.dsssssssd.', '..ddddddd..'] },
    wand: { w: 11, h: 8, pal: { b: '#c8e8f4', s: '#9ab8c8' }, rows: [
      '...bbb.....', '..bb..bb...', '..b....b...', '..bb..bb...', '...bbb.ss..', '.......ss..', '........ss.', '.........ss'] },
    sponge: { w: 11, h: 7, pal: { y: '#d8c878', d: '#b8a858', h: '#8a7a3a' }, rows: [
      '.yyyyyyyyy.', 'yyhyyyhyyyh', 'yyyyhyyyyyy', 'yhyyyyhyyyy', 'yyyyyhyyyhy', 'yyyyyyyyyyy', '.ddddddddd.'] }
  };
  var JAR_COLORS = {
    1: '#7a6e60', 2: '#d8aa50', 3: '#4a8ac8', 4: '#e05a20', 5: '#8a7a2a',
    6: '#cfc8bb', 7: '#7a9a3a', 10: '#a8763f', 11: '#9a988f', 12: '#e87020',
    13: '#9ad0e0', 14: '#e4ecf2', 15: '#a8b0b8', 16: '#6a655c', 17: '#e07a9e',
    18: '#e0c890', 19: '#9ad89a', 20: '#ffe482', 21: '#b08ae0', 22: '#8a6038',
    23: '#aadce8', 24: '#c8e8f4', '-1': '#888'
  };

  var sim = null;
  var crew = null;
  var cv = null, ctx = null, img = null;
  var pit = null, resultEl = null;
  var el = 2, brush = 2, pouring = false;
  var paused = false;
  var sweepWind = 1, sweepGusts = 0;   // the broom: sweep direction and remaining gusts
  var crewDrops = 0;                   // keyboard placements cycle the drop spot
  var draining = 0;                    // frames left in the drain
  var drainBtn = null;
  var lastTick = 0;
  var CREW_KINDS = ['crab', 'snail', 'duck'];


  function drawArt(cv2, art, scale) {
    cv2.width = art.w * scale;
    cv2.height = art.h * scale;
    var x2 = cv2.getContext('2d');
    for (var r = 0; r < art.h; r++) {
      for (var q = 0; q < art.w; q++) {
        var ch = art.rows[r][q];
        if (ch === '.' || !art.pal[ch]) continue;
        x2.fillStyle = art.pal[ch];
        x2.fillRect(q * scale, r * scale, scale, scale);
      }
    }
  }

  // the drain: wet cells nearest the hole are eaten first, so the rest
  // visibly slumps in over the pull. steam is a gas — it leaves on its own.
  function wetCount() {
    var n = 0;
    for (var y = 0; y < GH; y++)
      for (var x = 0; x < GW; x++) {
        var v = sim.at(x, y);
        if (v === sim.WATER || v === sim.OIL || v === sim.BUBBLE) n++;
      }
    return n;
  }
  function drainBite() {
    var dx = GW >> 1, dy = GH - 3, removed = 0;
    var WATER = sim.WATER, OIL = sim.OIL, BUBBLE = sim.BUBBLE;
    function wet(v) { return v === WATER || v === OIL || v === BUBBLE; }
    // the pull: settled fluid steps toward the hole, so the whole pool
    // visibly slumps in. falling fluid keeps falling on its own.
    for (var pass = 0; pass < 2; pass++) {
      var x0 = pass ? 0 : GW - 2, x1 = pass ? GW - 1 : 1, sx = pass ? 1 : -1;
      for (var x = x0; x !== x1 + sx; x += sx) {
        for (var y = GH - 1; y >= 0; y--) {
          var v = sim.at(x, y);
          if (!wet(v)) continue;
          var below = y < GH - 1 ? sim.at(x, y + 1) : 1;
          if (below === 0) continue;   /* falling — the sim owns it */
          var step = x < dx ? 1 : (x > dx ? -1 : 0);
          if (step && sim.at(x + step, y) === 0) {
            sim.setAt(x + step, y, v, 0, sim.shadeAt(x, y));
            sim.setAt(x, y, 0, 0, 0);
          }
        }
      }
    }
    // the hole: wet cells nearest it are eaten first
    for (var r = 0; r <= 26 && removed < 12; r++) {
      for (var oy = -r; oy <= r && removed < 12; oy++) {
        for (var ox = -r; ox <= r && removed < 12; ox++) {
          var ax = ox < 0 ? -ox : ox, ay = oy < 0 ? -oy : oy;
          if (Math.max(ax, ay) !== r) continue;
          var bx = dx + ox, by = dy + oy;
          if (bx < 0 || by < 0 || bx >= GW || by >= GH) continue;
          var wv = sim.at(bx, by);
          if (wet(wv)) { sim.setAt(bx, by, 0, 0, 0); removed++; }
        }
      }
    }
  }
  function finishDrain() {
    draining = 0;
    for (var y = 0; y < GH; y++)
      for (var x = 0; x < GW; x++) {
        var v = sim.at(x, y);
        if (v === sim.WATER || v === sim.OIL || v === sim.BUBBLE) sim.setAt(x, y, 0, 0, 0);
      }
    if (drainBtn) drainBtn.classList.remove('open');
    if (resultEl) resultEl.textContent = '';
  }

  // the basin fits the world exactly: a wide 1.25:1 well between the
  // splashback and the floor line, so the canvas never distorts
  function fitBasin() {
    if (!pit || !pit.parentElement) return;
    var app = pit.parentElement;
    var aw = app.clientWidth, ah = app.clientHeight;
    if (!aw || !ah) return;
    var topPad = 152;   /* below the splashback, on the basin's back rim */
    var botPad = 64;
    app.style.setProperty('--basin-half', '160px');
    app.classList.toggle('compact', aw < 700);
    var availH = ah - topPad - botPad;
    var availW = aw - 460;   /* the two flank boards (210 each) + a margin apiece */
    if (availH < 120 || availW < 220) {
      var fw = Math.max(140, Math.min(240, aw - 268));
      var fh = Math.round(fw * 0.8);
      app.style.setProperty('--basin-half', Math.round(fw / 2) + 'px');
      pit.style.width = fw + 'px';
      pit.style.height = fh + 'px';
      pit.style.left = Math.round((aw - fw) / 2) + 'px';
      // lane C: compact stage — the crew bar stands ~52px tall on the bottom
      // band; 44 left its art under the basin's rim. 64 clears it.
      var ft = ah - fh - 64;   /* above the crew bar and the tools */
      if (ft < 120) ft = Math.max(96, Math.round((ah - fh) * 0.45));
      pit.style.top = ft + 'px';
      pit.style.transform = 'none';
      return;
    }
    var w = Math.min(availW, availH * 1.25, 470);
    w = Math.max(200, Math.round(w));
    var h = Math.round(w * 0.8);
    if (h > availH) {
      h = availH;
      w = Math.max(160, Math.round(Math.min(w, h * 1.25)));
      h = Math.round(w * 0.8);
    }
    app.style.setProperty('--basin-half', Math.round(w / 2) + 'px');
    var px = Math.round((aw - w) / 2), py = topPad + Math.round((availH - h) / 2);
    pit.style.width = w + 'px';
    pit.style.height = h + 'px';
    pit.style.left = px + 'px';
    pit.style.top = py + 'px';
    pit.style.transform = 'none';
    // the residents ledge sits on the basin's back rim
    var bar = document.getElementById('toybox-crew');
    if (bar) {
      bar.style.left = (px + 8) + 'px';
      bar.style.top = (py - 30) + 'px';
      bar.style.bottom = 'auto';
    }
  }

  function tick() {
    var now = Date.now();
    if (now - lastTick < 160) return;
    lastTick = now;
    if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play('tick'); } catch (e) {} }
  }
  function thunk() {
    if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play('thunk'); } catch (e) {} }
  }

  function thumb(srcCanvas, w) {
    try {
      w = w || 160;
      var scale = w / srcCanvas.width;
      var c = document.createElement('canvas');
      c.width = w;
      c.height = Math.max(1, Math.round(srcCanvas.height * scale));
      var x = c.getContext('2d');
      x.fillStyle = '#101010';
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(srcCanvas, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.72);
    } catch (e) { return null; }
  }

  function saveKeep(names, shot) {
    if (!window.Liber || !window.Liber.state) return;
    var st = sim.state();
    var payload = { kind: 'toybox', name: 'pip’s toybox', glyph: '◍', result: { strokes: st.strokes, elements: names }, ts: Date.now() };
    if (shot) payload.shot = shot;
    if (window.Liber.state.addArtifact) window.Liber.state.addArtifact('games', payload);
    if (window.Liber.state.addArtifact) {
      var mirror = { kind: 'game', ref: 'toybox', name: 'pip’s toybox', result: payload.result, ts: Date.now() };
      if (shot) mirror.shot = shot;
      window.Liber.state.addArtifact('journal', mirror);
    }
    if (window.Liber.sound) { try { window.Liber.sound.play('chime'); } catch (e) {} }
  }

  function cellPos(e) {
    var r = cv.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(GW - 1, Math.floor((e.clientX - r.left) * (GW / r.width)))),
      y: Math.max(0, Math.min(GH - 1, Math.floor((e.clientY - r.top) * (GH / r.height))))
    };
  }

  function paint() {
    var px = img.data;
    var pals = window.LiberPowder.PALETTES;
    for (var y = 0; y < GH; y++) {
      for (var x = 0; x < GW; x++) {
        var v = sim.at(x, y);
        var rC = 40, gC = 48, bC = 44;   /* dim porcelain under the bulb */
        if (v !== 0) {
          var pal = pals[v] || [[200, 200, 200]];
          var cc = pal[sim.shadeAt(x, y) % pal.length];
          rC = cc[0]; gC = cc[1]; bC = cc[2];
        }
        for (var sy = 0; sy < CELL; sy++) {
          for (var sx = 0; sx < CELL; sx++) {
            var o = (((y * CELL + sy) * PW) + (x * CELL + sx)) * 4;
            px[o] = rC; px[o + 1] = gC; px[o + 2] = bC; px[o + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    // the crew draws over the powder, in cell scale
    crew.draw(ctx, CELL, Date.now() / 100);
  }


  function buildShelfBoard(root, groups) {
    if (!root) return;
    root.innerHTML = '';
    groups.forEach(function (g) {
      var grp = document.createElement('div');
      grp.className = 'shelf-group';
      var row = document.createElement('div');
      row.className = 'shelf-row';
      g.items.forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'shelf-obj' + (o.id === el ? ' on' : '');
        b.title = o.title;
        b.setAttribute('aria-label', g.giver + ' — ' + o.label);
        b.style.setProperty('--jc', JAR_COLORS[o.id] || '#c8a878');
        var artSpec = PIX[o.art];
        if (artSpec) {
          var c = document.createElement('canvas');
          drawArt(c, artSpec, 2);
          c.className = 'obj-art';
          b.appendChild(c);
        } else {
          var art = document.createElement('i');
          art.className = 'obj-art obj-' + o.art;
          art.setAttribute('aria-hidden', 'true');
          b.appendChild(art);
        }
        var nm = document.createElement('span');
        nm.className = 'obj-label';
        nm.textContent = o.label;
        b.appendChild(nm);
        b.addEventListener('click', function () {
          el = o.id;
          var sibs = document.querySelectorAll('.shelf-obj');
          for (var k = 0; k < sibs.length; k++) sibs[k].classList.remove('on');
          b.classList.add('on');
        });
        row.appendChild(b);
      });
      grp.appendChild(row);
      // the shelf itself: a board jutting from the wall, plaque on its face
      var board = document.createElement('div');
      board.className = 'shelf-board';
      var plate = document.createElement('span');
      plate.className = 'shelf-plate';
      plate.textContent = g.giver;
      board.appendChild(plate);
      grp.appendChild(board);
      root.appendChild(grp);
    });
  }
  function buildShelves() {
    buildShelfBoard(document.getElementById('toybox-shelf-left'), SHELVES_LEFT);
    buildShelfBoard(document.getElementById('toybox-shelf-right'), SHELVES_RIGHT);
  }

  function loop() {
    if (document.body.contains(cv) && !document.hidden) {
      if (!paused) {
        sim.setWind(sweepGusts > 0 ? sweepWind : 0);
        if (sweepGusts > 0) sweepGusts--;
        sim.step();
        crew.step();
      }
      // the plug obeys gravity, not the tap: it drains even when the world
      // is held still
      if (draining) {
        draining--;
        drainBite();
        if (!draining || (draining % 15 === 0 && !wetCount())) finishDrain();
      }
      paint();
    }
    requestAnimationFrame(loop);
  }

  function paintCrewArt(b, kind) {
    var sp = window.LiberCrew.SPRITES[kind];
    if (!sp) return;
    var c = document.createElement('canvas');
    c.width = sp.w * 3; c.height = sp.h * 3;
    var x2 = c.getContext('2d');
    var frame = sp.walk[0];
    for (var r = 0; r < sp.h; r++) {
      for (var q = 0; q < sp.w; q++) {
        var ch = frame[r][q];
        if (ch === '.') continue;
        x2.fillStyle = sp.pal[ch];
        x2.fillRect(q * 3, r * 3, 3, 3);
      }
    }
    c.className = 'toybox-crew-art';
    b.textContent = '';
    b.appendChild(c);
    var nm = document.createElement('span');
    nm.className = 'toybox-crew-name';
    nm.textContent = kind;
    b.appendChild(nm);
  }

  // the residents live on the back rim: drag one down into the water.
  // keyboard path drops it at a cycling spot above the basin floor.
  function crewGrounded(x, y) {
    var v = sim.at(x, y + 1);
    return sim.standable ? (sim.standable(v) || v === sim.SPROUT) : (v === sim.SAND || v === sim.WALL || v === sim.SPROUT);
  }
  function dropCrew(kind, gx, gy) {
    crew.removeAt(gx, gy, 4);   // one resident per spot
    crew.spawn(kind, gx, Math.max(1, gy));
    thunk();
    if (resultEl) resultEl.textContent = 'a ' + kind + ' moves in.';
  }
  function wireCrew() {
    var bar = document.getElementById('toybox-crew');
    if (!bar || !window.LiberCrew) return;
    var btns = bar.querySelectorAll('[data-crew]');
    Array.prototype.forEach.call(btns, function (b) {
      var kind = b.getAttribute('data-crew');
      paintCrewArt(b, kind);
      var dragging = false;
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        dragging = true;
        b.classList.add('held');
        try { b.setPointerCapture(e.pointerId); } catch (err) {}
      });
      b.addEventListener('pointerup', function (e) {
        if (!dragging) return;
        dragging = false;
        b.classList.remove('held');
        var pr = pit.getBoundingClientRect();
        if (e.clientX >= pr.left && e.clientX <= pr.right && e.clientY >= pr.top && e.clientY <= pr.bottom) {
          var p = cellPos(e);
          dropCrew(kind, p.x, Math.max(1, p.y - 1));
        }
      });
      b.addEventListener('pointercancel', function () { dragging = false; b.classList.remove('held'); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        var x = Math.round(GW * (0.25 + 0.22 * (crewDrops % 3)));
        crewDrops++;
        var y = 2;
        while (y < GH - 1 && !crewGrounded(x, y)) y++;
        dropCrew(kind, x, y);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.LiberPowder) return;
    sim = window.LiberPowder.create();
    crew = window.LiberCrew.create(sim);
    cv = document.getElementById('toybox-canvas');
    pit = document.getElementById('toybox-pit');
    resultEl = document.getElementById('toybox-result');
    if (!cv || !pit) return;
    ctx = cv.getContext('2d');
    img = ctx.createImageData(PW, PH);

    buildShelves();
    wireCrew();
    fitBasin();
    window.addEventListener('resize', fitBasin);
    // The machine's width follows the viewport, but the app's own box can also
    // change with no window resize at all — devtools docking, browser zoom, an
    // embedded panel. Listening only to `resize` left the compact/strip
    // decision stale: the boards stayed horizontal strips (with their plaques
    // over each other) on a screen wide enough for the columns.
    if (window.ResizeObserver) {
      var basinApp = document.querySelector('.toybox-app');
      if (basinApp && !basinApp.__basinRO) {
        var lastW = -1, lastH = -1;
        basinApp.__basinRO = new ResizeObserver(function () {
          var w = basinApp.clientWidth, h = basinApp.clientHeight;
          if (w === lastW && h === lastH) return;   // no oscillation: fitBasin resizes children only
          lastW = w; lastH = h;
          fitBasin();
        });
        basinApp.__basinRO.observe(basinApp);
      }
    }

    // probe hooks (acceptance passes read these; harmless in production)
    window.__sinkSim = sim;
    try {
      Object.defineProperty(window, '__sinkCrew', { get: function () { return crew.list(); }, configurable: true });
    } catch (e) { window.__sinkCrew = crew.list(); }

    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      pouring = true;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      var p = cellPos(e);
      sim.pour(p.x, p.y, el, brush);
    });
    cv.addEventListener('pointermove', function (e) {
      if (!pouring) return;
      var p = cellPos(e);
      sim.pour(p.x, p.y, el, brush);
    });
    function stopPour() { pouring = false; }
    cv.addEventListener('pointerup', stopPour);
    cv.addEventListener('pointercancel', stopPour);
    cv.addEventListener('pointerleave', stopPour);

    // the broom: long sweeping strokes push the powder; sweep clears nothing
    var sweep = document.getElementById('toybox-sweep');
    if (sweep) sweep.addEventListener('click', function () {
      sweepWind = sweepWind === 1 ? -1 : 1;
      sweepGusts = 26;
      if (resultEl) resultEl.textContent = sweepWind === 1 ? 'sweeping right.' : 'sweeping left.';
    });

    // pause / drain: the tray obeys, the crew keeps its place
    var pauseBtn = document.getElementById('toybox-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', function () {
      paused = !paused;
      var pauseLabel = pauseBtn.querySelector('span');
      if (pauseLabel) pauseLabel.textContent = paused ? 'tap off' : 'tap on';
      pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      if (resultEl) resultEl.textContent = paused ? 'the drip stops.' : '';
    });
    drainBtn = document.getElementById('toybox-drain');
    if (drainBtn) drainBtn.addEventListener('click', function () {
      if (draining) return;
      draining = 540;   // the pull runs up to nine seconds, then sweeps
      drainBtn.classList.add('open');
      if (resultEl) resultEl.textContent = 'the plug pulls.';
    });

    var keep = document.getElementById('toybox-keep');
    if (keep) keep.addEventListener('click', function () {
      var st = sim.state();
      if (!st.strokes && !crew.count()) {
        if (resultEl) resultEl.textContent = 'nothing to keep yet.';
        return;
      }
      paint(); // crew composited into the shot
      var shot = thumb(cv);
      var names = sim.census();
      var residents = crew.list().map(function (c) { return c.kind; });
      if (residents.length) names.push(residents.length + ' crew');
      saveKeep(names, shot);
      if (resultEl) resultEl.textContent = 'kept.';
      thunk();
    });

    var exit = document.getElementById('toybox-exit');
    if (exit) exit.addEventListener('click', function () {
      if (history.length > 1) history.back(); else location.href = 'desktop.html';
    });

    var helpBtn = document.getElementById('toybox-help');
    var raison = document.getElementById('toybox-raison');
    var raisonClose = document.getElementById('toybox-raison-close');
    function openRaison() {
      if (raison) { raison.classList.add('open'); raison.removeAttribute('inert'); }
    }
    function closeRaison() {
      if (raison) { raison.classList.remove('open'); raison.setAttribute('inert', ''); }
    }
    if (helpBtn) helpBtn.addEventListener('click', openRaison);
    if (raisonClose) raisonClose.addEventListener('click', closeRaison);
    if (raison) raison.addEventListener('click', function (e) { if (e.target === raison) closeRaison(); });
    if (window.LiberRoomShell) window.LiberRoomShell.bindRoomOverlays({ overlays: [
      { id: 'toybox-raison', close: closeRaison }
    ] });

    requestAnimationFrame(loop);
  });
})();
