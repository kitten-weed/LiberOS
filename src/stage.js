// stage.js — the machine's size, held at discrete states.
//
// The room is a fixed composition, not a fluid one. The monitor sits in the
// middle of it, the house is painted around it, the bezel owns fractions of
// the screen, and every room's furniture is placed as a percentage of the
// frame. If the machine's width follows the viewport continuously then every
// one of those fractions slides while a window edge is dragged: the room
// never settles, and a layout that is right at one size is half-right at
// every size between. The covenant already says the answer — choose
// dimensions and hold them.
//
// So the machine is sized in steps. `auto` takes the largest step that fits
// the window it is in and holds it until the window has actually changed
// enough to want a different one; a pinned step holds regardless, which is
// what the maintenance panel's RESOLUTION group sets (s.resolution). Below
// the smallest step the variable is removed and machine.css's own fluid rule
// takes over — that is the fallback that keeps 439px a real page.
//
// Writes one thing: a CSS custom property on <html>. Reads one: s.resolution.

(function () {
  'use strict';

  // the ladder, widest first, in px of machine width. 20px apart at the top
  // because that is roughly where a desktop lands, coarser below.
  // 900px is the smallest held composition. Below that the responsive
  // fallback may keep the page usable, but the settings system never stores
  // or presents a smaller authored machine.
  var STEPS = [
    1500, 1400, 1300, 1200, 1150, 1100, 1080, 1060, 1040, 1020, 1000,
    980, 960, 940, 920, 900
  ];

  // the machine is 4/3 (machine.css). The monitor hugs the walls now: a
  // small base reserve and nearly the whole viewport width, so the tube —
  // and every app inside it — gets the room.
  var ASPECT = 3 / 4;
  var BASE = 40;
  var WIDTH_SHARE = 0.96;

  function state() { return (window.Liber && window.Liber.state) || null; }

  function pinnedValue() {
    var lib = state();
    if (!lib) return null;
    var s = lib.get() || {};
    var r = s.resolution;
    if (!r || r === 'auto') return null;
    var n = parseInt(r, 10);
    return isFinite(n) && n >= 900 ? n : null;
  }

  function largestFitting() {
    var w = window.innerWidth || 1024;
    var h = window.innerHeight || 768;
    var maxW = w * WIDTH_SHARE;
    var maxH = (h - BASE) / ASPECT;   // the height budget, expressed in width units
    for (var i = 0; i < STEPS.length; i++) {
      var s = STEPS[i];
      if (s <= maxW && s <= maxH) return s;
    }
    return null;   // nothing fits: the fluid rule is the right answer
  }

  function apply() {
    var pin = pinnedValue();
    var step = pin || largestFitting();
    var root = document.documentElement;
    if (!step) root.style.removeProperty('--stage-w');
    else root.style.setProperty('--stage-w', step + 'px');
    current = step ? String(step) : 'fluid';
  }

  var current = null;
  var timer = 0;

  function onResize() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = 0; apply(); }, 120);
  }

  function set(value) {
    var lib = state();
    var n = parseInt(value, 10);
    var next = value === 'auto' || !isFinite(n) || n < 900 ? 'auto' : String(n);
    if (lib) lib.set({ resolution: next });
    apply();
  }

  function init() {
    apply();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    var lib = state();
    if (lib && lib.on) lib.on('change', function () {
      var pin = pinnedValue();
      var want = pin ? String(pin) : (largestFitting() ? String(largestFitting()) : 'fluid');
      if (want !== current) apply();
    });
  }

  window.Liber = window.Liber || {};
  window.Liber.stage = {
    steps: function () { return STEPS.slice(); },
    current: function () { return current; },
    set: set,
    apply: apply
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
