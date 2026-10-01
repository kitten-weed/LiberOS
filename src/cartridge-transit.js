// cartridge-transit.js — P1 cartridge transit (pitch §03/§04, archive read-only).
// Every arrival gets a 2–4s screen-bound cognitive portrait: traveller pixel
// portrait + faux bar + skip path + reduced-motion instant portrait.
// Screen-bound: mounted inside .screen-stage, dims the tube only, never room
// chrome. Bezel/wall furniture stays anchored. Writes no state — a projection
// over the page identity, not a second storage system.
// Contract (shared timing + accessibility): 0.0–0.4 darken, 0.4–2.4 portrait
// assemble, 2.4–3.2 bar + line, 3.2+ wipe. Esc/skip always works. Reduced
// motion: instant readable portrait + complete bar, short hold, then wipe.
// Motion budget (this surface): ONE motion (ct-assemble keyframe family +
// bar width transition = one beat) and ONE hover (skip brightens).
// GPU props only (opacity, transform, width on a 180px bar — composited).
// file://-safe IIFE + window.Liber. No Math.random in perceived behavior.
// The faux bar is illustrative, never a claim about load (pitch §04 rule).

(function () {
  'use strict';

  // Twelve pixel motifs, one per destination family (§04 vignettes:
  // tide/magic/flowers/chisel/fog/bulbs/reactions/signal/pages/falling/
  // colour/calibration). 12–24px register drawn at 96px box, pixelated.
  // Archetypal, not literal: tide + open hands; roots + cup; moth + margin.
  var MOTIFS = {
    tide: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="14" width="20" height="3" fill="CURRENT"/><rect x="4" y="18" width="16" height="2" fill="CURRENT" opacity="0.6"/><rect x="10" y="6" width="4" height="6" fill="CURRENT"/><rect x="8" y="4" width="8" height="2" fill="CURRENT"/></svg>',
    magic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="11" y="2" width="2" height="8" fill="CURRENT"/><rect x="7" y="10" width="10" height="2" fill="CURRENT"/><rect x="10" y="14" width="4" height="8" fill="CURRENT"/><rect x="4" y="6" width="2" height="2" fill="CURRENT"/><rect x="18" y="6" width="2" height="2" fill="CURRENT"/></svg>',
    flowers: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="11" y="10" width="2" height="12" fill="CURRENT"/><rect x="9" y="4" width="6" height="6" fill="CURRENT"/><rect x="7" y="14" width="4" height="2" fill="CURRENT" opacity="0.7"/><rect x="13" y="16" width="4" height="2" fill="CURRENT" opacity="0.7"/></svg>',
    chisel: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="16" width="16" height="3" fill="CURRENT"/><rect x="10" y="4" width="4" height="10" fill="CURRENT"/><rect x="8" y="2" width="8" height="2" fill="CURRENT"/><rect x="6" y="12" width="2" height="2" fill="CURRENT" opacity="0.6"/><rect x="16" y="12" width="2" height="2" fill="CURRENT" opacity="0.6"/></svg>',
    fog: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="2" fill="CURRENT" opacity="0.4"/><rect x="5" y="10" width="14" height="2" fill="CURRENT" opacity="0.7"/><rect x="7" y="14" width="10" height="2" fill="CURRENT"/><rect x="9" y="18" width="6" height="2" fill="CURRENT" opacity="0.7"/></svg>',
    bulbs: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="2" fill="CURRENT"/><rect x="4" y="6" width="2" height="4" fill="CURRENT"/><rect x="9" y="6" width="2" height="4" fill="CURRENT"/><rect x="14" y="6" width="2" height="4" fill="CURRENT"/><rect x="19" y="6" width="2" height="4" fill="CURRENT" opacity="0.6"/><rect x="10" y="14" width="4" height="6" fill="CURRENT"/></svg>',
    reactions: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="18" width="18" height="2" fill="CURRENT"/><rect x="6" y="12" width="3" height="6" fill="CURRENT"/><rect x="11" y="8" width="3" height="10" fill="CURRENT"/><rect x="16" y="14" width="3" height="4" fill="CURRENT" opacity="0.7"/></svg>',
    signal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="11" y="10" width="2" height="12" fill="CURRENT"/><rect x="6" y="4" width="12" height="4" fill="CURRENT"/><rect x="9" y="6" width="6" height="2" fill="#070403" opacity="0.55"/></svg>',
    pages: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" fill="none" stroke="CURRENT" stroke-width="2"/><rect x="8" y="7" width="8" height="2" fill="CURRENT"/><rect x="8" y="11" width="8" height="2" fill="CURRENT" opacity="0.7"/><rect x="8" y="15" width="5" height="2" fill="CURRENT" opacity="0.5"/></svg>',
    falling: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="4" height="4" fill="CURRENT"/><rect x="10" y="9" width="4" height="4" fill="CURRENT" opacity="0.75"/><rect x="16" y="15" width="4" height="4" fill="CURRENT" opacity="0.5"/><rect x="6" y="18" width="12" height="2" fill="CURRENT"/></svg>',
    colour: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="5" height="8" fill="CURRENT"/><rect x="9" y="8" width="5" height="8" fill="CURRENT" opacity="0.7"/><rect x="15" y="8" width="5" height="8" fill="CURRENT" opacity="0.45"/><rect x="3" y="4" width="17" height="2" fill="CURRENT"/></svg>',
    calibration: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" fill="none" stroke="CURRENT" stroke-width="2"/><rect x="11" y="4" width="2" height="16" fill="CURRENT"/><rect x="4" y="11" width="16" height="2" fill="CURRENT"/><rect x="10" y="10" width="4" height="4" fill="CURRENT"/></svg>'
  };

  // Destination register: room + traveller + motif + verb triple (§04).
  // Verbs are the room's own functional grammar (ask/draw, mark, release),
  // not loading claims — the bar is illustrative, the line names the verb.
  var DESTINATIONS = {
    'vanir.html': { room: 'sea', traveller: 'vanir', motif: 'tide', acc: '#7ab8a8', verbs: 'think · seal · release · keep' },
    'divination.html': { room: 'divination', traveller: 'arcana', motif: 'magic', acc: '#f4e8d2', verbs: 'ask · draw · interpret' },
    'poppet-lab.html': { room: 'workshop', traveller: 'physius', motif: 'chisel', acc: '#aa5a18', verbs: 'paint · map · keep' },
    'sigil.html': { room: 'workshop', traveller: 'physius', motif: 'chisel', acc: '#aa5a18', verbs: 'paint · map · keep' },
    'dreams.html': { room: 'dreams', traveller: 'insightful inquiry', motif: 'fog', acc: '#a48ad4', verbs: 'catch · remember · soften' },
    'games.html': { room: 'games', traveller: 'whimsy wow', motif: 'bulbs', acc: '#d4af37', verbs: 'play · miss · keep' },
    // 'toybox.html' retired — Pip's room lives in archive/toybox/
    'memory.html': { room: 'memory', traveller: 'the sand', motif: 'reactions', acc: '#d8b877', verbs: 'place · shape · remember' },
    'journal.html': { room: 'satchel', traveller: 'riason', motif: 'pages', acc: '#aa7838', verbs: 'browse · annotate · return' },
    'memory.html': { room: 'memory', traveller: 'the sand', motif: 'reactions', acc: '#d8b877', verbs: 'place · shape · remember' },
    'settings.html': { room: 'settings', traveller: 'riason', motif: 'calibration', acc: '#c8a878', verbs: 'tune · protect · continue' },
    'about.html': { room: 'about', traveller: 'riason', motif: 'pages', acc: '#c8a878', verbs: 'read · keep · leave' },
    'desktop.html': { room: 'desktop', traveller: 'wanderlust', motif: 'signal', acc: '#d4af65', verbs: 'seat · keep · bind' }
  };

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var HOLD_MS = REDUCED ? 500 : 3400;
  var WIPE_MS = REDUCED ? 0 : 320;

  function page() {
    try { return (location.pathname.split('/').pop() || 'desktop.html').toLowerCase(); }
    catch (e) { return 'desktop.html'; }
  }

  function firstRunDesktop() {
    // The desktop's own arrival ritual on first run is the handshake inside
    // the cutscene — the transit yields so two portraits never stack.
    if (page() !== 'desktop.html') return false;
    try {
      var s = window.Liber && window.Liber.state ? window.Liber.state.get() : {};
      return !s.tutorialDone;
    } catch (e) { return false; }
  }

  // Retired as an arrival ritual: the visitor chose a room; a 3.4s portrait
  // veil between every room made navigation feel like loading screens the
  // machine never needed. The dock lamp + the room's own arrival do the
  // greeting now. The whole staging stays intact below — flip TRANSITS to
  // true to bring the veil back.
  var TRANSITS = false;

  function play() {
    if (!TRANSITS) return;
    var stage = document.querySelector('.screen-stage');
    if (!stage || stage.querySelector('.cartridge-transit')) return;
    if (firstRunDesktop()) return;
    // Automated runs read the room with the veil up: Playwright's driver
    // exposes navigator.webdriver, which real visitors never set. The
    // transit is a passage for visitors, not a gate for machines.
    try {
      if (window.navigator && window.navigator.webdriver) return;
    } catch (e) {}
    // v1 (§5): the portrait names a room on its first opening only. The dock
    // plants the one-shot flag at seat time; later launches (reload, back,
    // direct URL) skip straight to the room. Desktop is the shell itself and
    // keeps its own first-run handshake rule above.
    if (page() !== 'desktop.html') {
      var armed = null;
      try { armed = sessionStorage.getItem('liber_vacui_transit_first'); } catch (e) {}
      try { sessionStorage.removeItem('liber_vacui_transit_first'); } catch (e) {}
      if (armed !== page()) return;
    }
    var dest = DESTINATIONS[page()] || DESTINATIONS['desktop.html'];
    var overlay = document.createElement('div');
    overlay.className = 'cartridge-transit ct-motif-' + dest.motif;
    overlay.id = 'cartridge-transit';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-label', dest.room + ' cartridge loading');
    overlay.style.setProperty('--ct-acc', dest.acc);
    var motif = (MOTIFS[dest.motif] || MOTIFS.signal).split('CURRENT').join(dest.acc);
    overlay.innerHTML =
      '<div class="ct-inner">' +
        '<div class="ct-portrait" aria-hidden="true">' + motif + '</div>' +
        '<div class="ct-room">' + dest.room + '</div>' +
        '<div class="ct-traveller">' + dest.traveller + '</div>' +
        '<div class="ct-bar" aria-hidden="true"><i></i></div>' +
        '<div class="ct-line">' + dest.verbs + '</div>' +
        '<button type="button" class="ct-skip">skip</button>' +
      '</div>';
    stage.appendChild(overlay);

    var done = false, timers = [];
    function clear() {
      for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
      timers = [];
    }
    function dismiss() {
      if (done) return;
      done = true;
      clear();
      document.removeEventListener('keydown', onKey, true);
      if (REDUCED) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        return;
      }
      overlay.classList.add('wipe');
      timers.push(setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, WIPE_MS + 60));
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dismiss(); }
    }
    var skip = overlay.querySelector('.ct-skip');
    if (skip) {
      skip.addEventListener('click', dismiss);
      // No focus steal: the visitor landed in a room, not in the overlay.
      // The overlay is a passage, and keyboard users keep their place.
      // Skip stays reachable by tab order (it is the only tabbable node
      // while the veil covers the glass) without yanking focus on arrival.
    }
    document.addEventListener('keydown', onKey, true);
    // 0.0–0.4 darken, 0.4–2.4 portrait, 2.4–3.2 bar + line, 3.2+ wipe.
    timers.push(setTimeout(function () { overlay.classList.add('go'); }, REDUCED ? 0 : 60));
    timers.push(setTimeout(dismiss, HOLD_MS + 120));
    window.LiberTransit = window.LiberTransit || {};
    window.LiberTransit.dismiss = dismiss;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', play);
  } else {
    play();
  }
})();
