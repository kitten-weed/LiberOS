// house.js — the room the machine stands in.
//
// Liber is a house. The main menu keeps the house's own room (the room behind
// the CRT, src/features/crt-room/, "look behind"). Every traveller's page
// stands in that traveller's own room instead of an empty void: the same
// building, a different room. The architecture is shared (styles/house.css);
// the finish — substrate, palette, light, furniture — is declared by the room
// in its own stylesheet, and the register of which page is which room is
// data/rooms.data.js.
//
// WHAT IT REMEMBERS (covenant rule 4). Not a copy of the main room's props:
// the same two hooks, re-made in this room's own material, exactly as
// liberdev/room-hooks.md names them —
//   lamp   the session light, burning down as you sit (state.sessionStart)
//   shelf  one volume per journal keep, standing on this room's shelf
//   pool   the water table, in the one room of the house that has one
//   board  one pinned card per relation
// A page shows one room, so nothing here is rendered twice.
//
// Reads state only through window.Liber.state. No shared imports (covenant).
// Motion with consent; diegetic text only — the room's own labels.

(function () {
  'use strict';

  var PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
  var ROOMS = window.LiberRooms || {};
  var ROOM = ROOMS[PAGE];
  if (!ROOM) return;   // the house's own room is the authored DOM room

  // patina thresholds mirror src/shadow.js PATINA_TIERS (visits + keeps)
  var PATINA_TIERS = [2, 6, 12];
  var KEEP_KINDS = ['buddy', 'divination', 'games', 'learn', 'abstract', 'sea',
    'garden', 'dreams', 'journal', 'methodology', 'council'];

  // the session light: a fresh wick each sitting, spent over the hour
  var CANDLE_MS = 60 * 60 * 1000;

  var SHELF_ROWS = 2, PER_ROW = 5;

  // one spine tint per keep kind — the same vocabulary the main room uses,
  // because it is the same ledger, read in a different room
  var SPINES = {
    note: '#7a6a8a', kept: '#8a5a3a', dream: '#5a6a8a', game: '#8a6a2a',
    'tree-pressing': '#5a7a4a', 'kept-reason': '#7a4a4a'
  };

  function st() { return (window.Liber && window.Liber.state) || null; }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function has(list, v) { return list.indexOf(v) !== -1; }

  function shade(hex, dir) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var f = dir > 0 ? 1.25 : 0.65;
    r = Math.min(255, Math.round(r * f));
    g = Math.min(255, Math.round(g * f));
    b = Math.min(255, Math.round(b * f));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function tierOf(s) {
    var visits = Object.keys(s.visited || {}).length;
    var keeps = 0;
    for (var i = 0; i < KEEP_KINDS.length; i++) {
      if (Array.isArray(s[KEEP_KINDS[i]])) keeps += s[KEEP_KINDS[i]].length;
    }
    var t = 0;
    for (var j = 0; j < PATINA_TIERS.length; j++) {
      if (visits + keeps >= PATINA_TIERS[j]) t = j + 1;
    }
    return t;
  }

  var ui = null;

  // ── the seen band ──────────────────────────────────────────────────────

  // The room is only visible where the machine is not. Rather than guess the
  // frame in percentages — which is what makes furniture slide behind the
  // monitor when the window changes — the desk is measured and the band is
  // written down as it actually is. The band is a property of the desk, so it
  // is read off the desk. Called on load, on resize (coalesced to one frame),
  // and once after the machine has settled.
  function measure() {
    if (!ui) return;
    var m = document.querySelector('.machine');
    var vw = window.innerWidth, vh = window.innerHeight;
    if (!m) return;
    var r = m.getBoundingClientRect();
    var unit = r.width || vw * 0.72;          // the machine's width
    // the wall above the desk tube is the band's clear height; the tube is
    // measured rather than assumed, because its height is its own business
    // Liberchat's retired second tube no longer participates in room
    // geometry. Keep the house measurement anchored to the actual machine.
    var above = vh;
    ui.scene.style.setProperty('--house-band-x', Math.round(r.right) + 'px');
    ui.scene.style.setProperty('--house-band-w', Math.max(0, Math.round(vw - r.right)) + 'px');
    ui.scene.style.setProperty('--house-above', Math.round(above) + 'px');
    ui.scene.style.setProperty('--house-unit', Math.round(unit) + 'px');

    // How much room did this window actually leave? Measured in pixels and
    // not in machine units, because what decides whether a room can be
    // furnished is whether there is room to SEE a thing — a unit is smaller
    // than a pixel on a narrow screen and larger on a wide one, so units are
    // the wrong ruler for capacity. The free wall is what sits between the
    // machine and the glass; the narrowest of the two measures decides. The
    // tiers are named rather than guessed, so a room can hold its own opinion
    // about which of its things are the load-bearing ones.
    var glass = document.querySelector('.house-window');
    var free = vw - r.right;
    if (glass) {
      var g = glass.getBoundingClientRect();
      if (g.width > 0) free = Math.max(0, g.left - r.right);
    }
    ui.scene.setAttribute('data-band',
      (free < 70 || above < 60) ? 'none'
        : (free < 130 || above < 130) ? 'tight'
          : 'roomy');
  }

  var pending = false;
  function remeasure() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      measure();
    });
  }

  // ── build ──────────────────────────────────────────────────────────────

  function build() {
    var scene = el('div', 'house-scene');
    scene.id = 'house-scene';
    scene.setAttribute('data-house', ROOM.id);
    scene.setAttribute('aria-hidden', 'true');

    scene.appendChild(el('div', 'house-ceiling'));
    scene.appendChild(el('div', 'house-wall'));
    scene.appendChild(el('div', 'house-floor'));
    scene.appendChild(el('div', 'house-skirting'));
    scene.appendChild(el('div', 'house-dust'));

    // no door: the only wall this room has is the band above the desk tube,
    // and half a door is not a door. See styles/house.css.

    // the window: one opening in the house, this room's weather behind it
    var win = el('div', 'house-window');
    win.appendChild(el('i', 'house-sill'));
    scene.appendChild(win);

    // the room's own furniture, painted by the room's own stylesheet. Every
    // prop takes one of the two slots that survive every window shape — the
    // wall above the desk tube, or the boards below the machine — so the room
    // CSS only has to say where a thing sits and how big it is, not whether
    // it will be behind the monitor on this particular screen. Which props
    // stand on the floor is the register's business (data/rooms.data.js).
    var onFloor = ROOM.floor || [];
    for (var p = 0; p < ROOM.props.length; p++) {
      var prop = el('i', 'house-prop');
      prop.setAttribute('data-prop', ROOM.props[p]);
      prop.setAttribute('data-place', onFloor.indexOf(ROOM.props[p]) !== -1 ? 'floor' : 'band');
      scene.appendChild(prop);
    }

    // the session light — the room names its own lamp; this is cord and body
    if (has(ROOM.memory, 'lamp')) {
      var lamp = el('div', 'house-lamp');
      lamp.appendChild(el('i', 'house-lamp-cord'));
      lamp.appendChild(el('i', 'house-lamp-body'));
      scene.appendChild(lamp);
    }

    // the shelf: one volume per journal keep, bottom board first
    var shelf = null, rows = null;
    if (has(ROOM.memory, 'shelf')) {
      shelf = el('div', 'house-shelf');
      rows = [];
      for (var b = 0; b < SHELF_ROWS; b++) {
        var board = el('i', 'house-shelf-board');
        board.style.bottom = (b * (100 / SHELF_ROWS)) + '%';
        var row = el('div', 'house-row');
        board.appendChild(row);
        shelf.appendChild(board);
        rows.push(row);
      }
      scene.appendChild(shelf);
    }

    // the water table, in the one room of the house that has one
    var water = null;
    if (has(ROOM.memory, 'pool')) {
      var pool = el('div', 'house-pool');
      water = el('i', 'house-pool-water');
      pool.appendChild(water);
      scene.appendChild(pool);
    }

    // the board: one pinned card per relation
    var pins = null;
    if (has(ROOM.memory, 'board')) {
      pins = el('div', 'house-pins');
      scene.appendChild(pins);
    }

    // behind the machine, in front of the room's own backdrop
    var anchor = document.querySelector('.room') || document.body;
    anchor.insertBefore(scene, anchor.firstChild);
    document.body.setAttribute('data-house', ROOM.id);

    ui = { scene: scene, rows: rows, shelf: shelf, water: water, pins: pins };
  }

  // ── render: state → the room ────────────────────────────────────────────

  var lastSig = '';

  function render() {
    if (!ui) return;
    var lib = st();
    if (!lib) return;
    var s = lib.get() || {};

    // re-render when a feed changed, or once a minute so the light burns
    var sig = [
      (s.journal || []).length,
      (s.sea || []).length,
      (s.graveyard || []).length,
      (s.relations || []).length,
      s.shadowOn ? 1 : 0,
      s.sessionStart ? Math.floor((Date.now() - s.sessionStart) / 60000) : -1
    ].join('|');
    if (sig === lastSig) return;
    lastSig = sig;

    // the session light burns down while you sit; the next visit relights it
    var burn = 1;
    if (s.sessionStart) burn = Math.max(0.1, 1 - (Date.now() - s.sessionStart) / CANDLE_MS);
    ui.scene.style.setProperty('--house-burn', burn.toFixed(3));

    // presence settles as dust, it does not brighten the room
    ui.scene.style.setProperty('--house-tier', String(tierOf(s)));

    // the weather has one owner (src/rainy.js writes s.shadowOn); the house
    // mirrors it into its own window rather than deciding again
    ui.scene.setAttribute('data-weather', s.shadowOn ? 'rain' : 'clear');

    // the shelf: one volume per keep, bottom board first, capped — a shelf
    // gets filled, it does not get stacked to the ceiling
    if (ui.rows) {
      var keeps = Array.isArray(s.journal) ? s.journal : [];
      var want = Math.min(keeps.length, PER_ROW * SHELF_ROWS);
      var vols = ui.shelf.querySelectorAll('.house-volume');
      var have = vols.length;
      if (want > have) {
        for (var k = have; k < want; k++) {
          var keep = keeps[keeps.length - want + k] || {};
          var v = el('i', 'house-volume');
          v.style.height = (20 + ((k * 7) % 18)) + 'px';
          v.style.width = (5 + ((k * 5) % 5)) + 'px';
          var c = SPINES[keep.kind] || '#6a5a44';
          v.style.background = 'linear-gradient(180deg,' + shade(c, 1) + ' 0%,' + c + ' 70%,' + shade(c, -1) + ' 100%)';
          ui.rows[Math.floor(k / PER_ROW)].appendChild(v);
        }
      } else if (want < have) {
        for (var d = vols.length - 1; d >= want; d--) vols[d].remove();
      }
    }

    // the water table: releases and burials raise it, the tide keeps the
    // finer memory, and the two are never allowed to disagree
    if (ui.water) {
      var sea = Array.isArray(s.sea) ? s.sea.length : 0;
      var grave = Array.isArray(s.graveyard) ? s.graveyard.length : 0;
      var tide = (s.seaTide && typeof s.seaTide.level === 'number') ? s.seaTide.level : 0;
      var level = Math.min(1, Math.max((sea + grave) / 12, tide));
      ui.water.style.height = Math.max(6, Math.round(level * 100)) + '%';
    }

    // the board: a pin per relation, placed where the pin went in. The board
    // itself is furniture and shows bare when nothing is pinned to it — an
    // empty board is the truth about an empty board, and hiding it would make
    // the room lose a wall the moment the traveller had no relations yet.
    if (ui.pins) {
      var rels = Array.isArray(s.relations) ? s.relations : [];
      ui.pins.innerHTML = '';
      for (var r = 0; r < Math.min(rels.length, 6); r++) {
        var rel = rels[r] || {};
        var card = el('i', 'house-pin');
        var rx = (r * 61 + String(rel.verb || '').length * 13) % 100;
        var ry = (r * 37 + String(rel.from || '').length * 17) % 100;
        card.style.left = (6 + (rx % 82)) + '%';
        card.style.top = (7 + (ry % 76)) + '%';
        ui.pins.appendChild(card);
      }
    }
  }

  // ── exported for the covenant gate: the register, live ─────────────────
  window.Liber = window.Liber || {};
  window.Liber.house = {
    room: function () { return ROOM.id; },
    place: function () { return ROOM.place; },
    traveller: function () { return ROOM.traveller; },
    memory: function () { return ROOM.memory.slice(); },
    props: function () { return ROOM.props.slice(); },
    facts: function () {
      var s = (st() && st().get()) || {};
      var cs = ui && ui.scene ? getComputedStyle(ui.scene) : null;
      return {
        room: ROOM.id,
        open: !!document.getElementById('house-scene'),
        volumes: ui && ui.shelf ? ui.shelf.querySelectorAll('.house-volume').length : 0,
        weather: s.shadowOn ? 'rain' : 'clear',
        tier: tierOf(s),
        band: cs ? {
          x: parseFloat(cs.getPropertyValue('--house-band-x')) || 0,
          w: parseFloat(cs.getPropertyValue('--house-band-w')) || 0,
          above: parseFloat(cs.getPropertyValue('--house-above')) || 0,
          unit: parseFloat(cs.getPropertyValue('--house-unit')) || 0
        } : null
      };
    }
  };

  // ── init ───────────────────────────────────────────────────────────────

  function init() {
    if (!st()) return;
    if (!document.getElementById('house-scene')) build();
    measure();
    render();
    var lib = st();
    if (lib && lib.on) lib.on('change', render);
    // the band moves when the window does, and when the tube finishes sizing
    window.addEventListener('resize', remeasure);
    window.addEventListener('orientationchange', remeasure);
    // the tube mounts on its own schedule, so settle once after it has
    setTimeout(measure, 250);
    if (window.ResizeObserver) {
      var m = document.querySelector('.machine');
      if (m) new ResizeObserver(remeasure).observe(m);
    }
    // the lamp burns while you sit
    setInterval(function () { if (!document.hidden) render(); }, 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
