// apply-theme.js — the machine's appearance, applied from state. Runs on
// every page. Two keys so far:
//
//   theme  the persisted skin (classes in styles/machine.css)
//   crt    the tube's bloom intensity (liberdev/crt-decision.md)
//
// The CRT half is a state->CSS bridge, NOT a look. It publishes values; each
// room authors its own material off them in its own stylesheet, scoped by
// `body[data-crt="<room>"]`, so there is no global CRT stylesheet and a room
// that never opts in is simply unaffected.

(function () {
  'use strict';

  var IDS = ['corrupted', 'wanderlust', 'riason', 'physius', 'whimsy',
    'vanir', 'entity404', 'arcana', 'librarian', 'elizabeth', 'iris',
    'ravaging', 'royalty', 'clean', 'shadow', 'mono', 'gold'];

  function paintTheme() {
    var s = (window.Liber && window.Liber.state && window.Liber.state.get()) || {};
    var theme = s.theme || 'corrupted';
    if (IDS.indexOf(theme) < 0) theme = 'corrupted';
    try { document.body.setAttribute('data-theme', theme); } catch (e) {}
    var machine = document.querySelector('.machine');
    if (machine) {
      for (var i = 0; i < IDS.length; i++) machine.classList.remove('theme-' + IDS[i]);
      machine.classList.add('theme-' + theme);
    }
    var screen = document.querySelector('.screen');
    if (screen && !screen.querySelector('.theme-grade')) {
      var grade = document.createElement('div');
      grade.className = 'theme-grade';
      grade.setAttribute('aria-hidden', 'true');
      screen.appendChild(grade);
    }
    // The picture in the glass. The skin is copied onto the wallpaper element
    // rather than scoped from the body, so any surface can show any
    // traveller's tube (the atlas previews a tin before you commit it).
    // styles/wallpaper.css owns the painting; this only names it.
    var paper = document.querySelectorAll('.wallpaper');
    for (var w = 0; w < paper.length; w++) {
      // a mounted sample (the atlas's drawer) keeps its own maker's picture
      if (paper[w].parentNode && paper[w].parentNode.classList &&
          paper[w].parentNode.classList.contains('wp-thumb')) continue;
      paper[w].setAttribute('data-wt', theme);
    }
  }

  // ── the tube's bloom ────────────────────────────────────────────────
  var CRT_DEFAULT = { intensity: 0.4, off: false };

  function readCrt(s) {
    var c = (s && typeof s.crt === 'object' && s.crt) ? s.crt : {};
    var v = typeof c.intensity === 'number' ? c.intensity : CRT_DEFAULT.intensity;
    if (!isFinite(v)) v = CRT_DEFAULT.intensity;
    return { intensity: Math.max(0, Math.min(1, v)), off: !!c.off };
  }

  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  // which room is this page? the room's own scoping attribute keys on it.
  function roomKey() {
    var declared = document.body && document.body.getAttribute('data-room');
    if (declared) return declared;
    var m = String((window.location && window.location.pathname) || '').match(/([^/]+)\.html?$/);
    return m ? m[1] : 'machine';
  }

  // The room renders material inside this; it is plumbing only (geometry and
  // pointer-events), set here so no shared stylesheet has to exist. Rooms
  // style it in their own CSS or it stays invisible.
  function weave() {
    var screen = document.querySelector('.screen');
    if (!screen) return null;
    var el = screen.querySelector('.crt-weave');
    if (!el) {
      el = document.createElement('div');
      el.className = 'crt-weave';
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:absolute;inset:0;z-index:5;pointer-events:none';
      screen.appendChild(el);
    }
    return el;
  }

  function paintCrt() {
    var s = (window.Liber && window.Liber.state && window.Liber.state.get()) || {};
    var cfg = readCrt(s);
    var still = reducedMotion();
    // Motion is a gift, not a tax: off and reduced-motion both take the
    // animated bloom to zero. Static texture may stay, but never above the
    // authored default — and it always dies with `off`.
    var moving = (cfg.off || still) ? 0 : cfg.intensity;
    var texture = cfg.off ? 0 : (still ? Math.min(cfg.intensity, CRT_DEFAULT.intensity) : cfg.intensity);
    var root = document.documentElement;
    root.style.setProperty('--crt', String(moving));
    root.style.setProperty('--crt-still', String(texture));
    var body = document.body;
    if (body) {
      body.setAttribute('data-crt', roomKey());
      body.setAttribute('data-crt-motion', still ? 'reduced' : 'full');
      // the hard kill-switch, before any room flourish
      if (cfg.off) body.classList.add('crt-off'); else body.classList.remove('crt-off');
    }
    weave();
  }

  function paint() { paintTheme(); paintCrt(); }

  function init() {
    paint();
    var st = window.Liber && window.Liber.state;
    if (st && st.on) st.on('change', paint);
    try {
      var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq) {
        // Safari < 14 has no addEventListener on MediaQueryList
        if (mq.addEventListener) mq.addEventListener('change', paintCrt);
        else if (mq.addListener) mq.addListener(paintCrt);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
