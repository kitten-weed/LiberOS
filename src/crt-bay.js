// crt-bay.js — THE CARTRIDGE DOCK · homescreen trial
// One complete unit bolted to the bottom bevel: machined face, dark slot
// mouth, keycap-styled eject, engraved plate, corner screws, and an IDC
// ribbon cable running toward the back of the case. The tray rises AND
// falls as a rigid mechanical door, born inside the screen so the
// machine's own edge does the revealing. Mounted on every room window:
// desktop.html + the app pages — the console is the dock everywhere. The console is
// this dock alone now: the tray of cartridges + the slot's lamp bar +
// a live status line. Same rooms, same labels, same visited ledger,
// same "quiet until named" gate the old keybed kept.

(function () {
  'use strict';

  // same rooms as the v1 dock (home + 7 cartridges; learn/garden/trash retired).
  // blank stays out of the tray: the reserved socket is a bed state, not a cart.
  // mat: the traveller's matter — each cart is a small hovering material
  // object from a different time (mockup §10 vacui ritual: summon grid +
  // cart-summon/cart-hover, per-room dock-cart gradients, vacui-seat drop).
  var CARTS = [
    { id: 'home', label: 'home', page: null, acc: '#d6ae5d', home: true, mat: 'starfield' },
    { id: 'sigil', label: 'poppet', page: 'sigil.html', acc: '#aa5a18', mat: 'stone' },
    { id: 'vanir', label: 'sea', page: 'vanir.html', acc: '#7ab8a8', mat: 'water' },
    { id: 'journal', label: 'journal', page: 'journal.html', acc: '#aa7838', mat: 'vellum' },
    { id: 'games', label: 'games', page: 'games.html', acc: '#d4af37', mat: 'marquee' },
    { id: 'memory', label: 'memory', page: 'memory.html', acc: '#d8b877', mat: 'sand' },
    { id: 'divination', label: 'arcana', page: 'divination.html', acc: '#f4e8d2', mat: 'chalk' },
    { id: 'dreams', label: 'dreams', page: 'dreams.html', acc: '#a48ad4', mat: 'fog' },
  ];
  // the reserved socket: a bed state, not a cartridge — it rides the
  // lamp bar as the twelfth socket, exactly as the old keybed drew it
  var BLANK = { id: 'blank', label: '—', acc: '#6f6657', blank: true };

  var bay = null, tray = null, well = null, ejectBtn = null, walkTimer = null, lightsBox = null, selectedIdx = 0;
  var seating = false, walked = {};
  var RISE_MS = 850, FALL_MS = 720;
  var QUIET = 'keys quiet · not yet named';

  function getState() { return (window.Liber && window.Liber.state && window.Liber.state.get()) || {}; }
  // Next-cartridge guide (2026-10-01): exactly one glowing door. While no
  // keepsake exists the poppet cart glows; after the first keep the sea
  // takes over. Re-armed on every render, so it survives tray re-renders.
  function keptCount() {
    var n = 0;
    try {
      var raw = localStorage.getItem('poppet.keepsakes.v1');
      if (raw) { var arr = JSON.parse(raw); if (arr && arr.length) n += arr.length; }
    } catch (e) {}
    var s = getState();
    if (s && s.buddy && s.buddy.length) n += s.buddy.length;
    return n;
  }
  function nextCartId() {
    var s = getState();
    if (!s || !s.tutorialDone) return null;
    if (keptCount() === 0) return 'sigil';
    var v = s.visited || {};
    if (!v.vanir) return 'vanir';
    return null;
  }
  // Naming the console is the existing wake gate. Tutorial completion is not
  // required: the opening ritual explicitly hands the named machine its dock.
  function alive() { var s = getState(); return !!(s && (s.keysNamed || s.tutorialDone)); }

  function hexGlow(hex) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 'rgba(200,168,120,0.42)';
    var n = parseInt(m[1], 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',0.42)';
  }

  function shakeMachine() {
    var m = document.querySelector('.machine');
    if (!m || m.classList.contains('crt-shake')) return;
    m.classList.add('crt-shake');
    setTimeout(function () { m.classList.remove('crt-shake'); }, 500);
  }
  function flashMachine() {
    var m = document.querySelector('.machine');
    if (!m || m.classList.contains('crt-flash')) return;
    m.classList.add('crt-flash');
    setTimeout(function () { m.classList.remove('crt-flash'); }, 500);
  }
  // Wanderlust rattles the dock herself: the whole bay shudders in place —
  // no tray opens, nothing seats, the traveller does nothing. The cutscene
  // handoff calls this right before the first making opens itself.
  function shudder(ms) {
    if (!bay || bay.classList.contains('crt-shudder')) return;
    bay.classList.add('crt-shudder');
    setTimeout(function () { if (bay) bay.classList.remove('crt-shudder'); }, ms || 1200);
  }

  // the cutscene's Riason-cursor beat drives the REAL dock: open the tray,
  // then press the real cartridge button so the whole slot-click → tray →
  // shake → seat path runs (no canned demo).
  function seatCart(id) {
    var press = function () {
      var b = document.getElementById('crt-cartridge-' + id);
      if (b) b.click();
    };
    if (tray && tray.classList.contains('out')) { press(); return; }
    out();
    setTimeout(press, RISE_MS + 120);
  }

  function visit(id, page) {
    var s = getState();
    if (window.Liber && window.Liber.state && id !== 'home') {
      var visited = Object.assign({}, s.visited);
      // v1 (§5): the transit portrait names a room on its FIRST opening only;
      // later launches skip straight to the room. The fact is captured here —
      // before the ledger write — because the dock is the only doorway that
      // knows the room was never opened. The destination page consumes and
      // clears the flag (src/cartridge-transit.js).
      var firstOpen = !visited[id] && !!page;
      try {
        if (firstOpen) sessionStorage.setItem('liber_vacui_transit_first', page);
        else sessionStorage.removeItem('liber_vacui_transit_first');
      } catch (e) {}
      visited[id] = Date.now();
      var th = s.thimble || { visits: 0, base: 0, harvested: 0 };
      window.Liber.state.set({ visited: visited, thimble: { visits: (th.visits || 0) + 1, base: th.base || 0, harvested: th.harvested || 0 } });
    }
    if (page) window.location.href = page;
  }

  // Resolve the destination from the stable cartridge id at launch time. The
  // old handlers relied on parallel array indexes and two separate timeout
  // paths; after the tray animation moved, a stale index could send a click to
  // the wrong room. One id → one destination keeps the launch deterministic.
  function travel(cart) {
    if (!cart || seating) return;
    var destination = cart.home ? 'desktop.html' : cart.page;
    if (!destination || destination === currentPage()) {
      seating = false;
      return;
    }
    if (walked[cart.id]) return;
    walked[cart.id] = true;
    seating = true;
    clearTimeout(walkTimer);
    var id = cart.id;
    walkTimer = setTimeout(function () {
      shakeMachine();
      flashMachine();
      seat();
      visit(id, destination);
      seating = false;
    }, RISE_MS + 400);
  }

  // The dock used to paint a live caption strip here. That copy competed with
  // the lower bezel and is intentionally gone; keep the call sites as quiet
  // no-ops so room modules can still report transient state without creating
  // another visual surface.
  function say(t) { void t; }
  function restoreStatus() {}
  function currentPage() { return (location.pathname.split('/').pop() || 'desktop.html').toLowerCase(); }
  // the quiet dock must speak once: a disabled keycap swallows clicks, so
  // the tray explains itself the first time a visitor reaches for it
  function noteQuiet() {
    if (walked.quiet) return;
    walked.quiet = true;
    try {
      var m = document.querySelector('.machine');
      if (m && !m.classList.contains('crt-shake')) {
        m.classList.add('crt-shake');
        setTimeout(function () { m.classList.remove('crt-shake'); }, 500);
      }
    } catch (e) {}
    var probe = function () {
      var trayEl = document.getElementById('crt-bay-tray');
      if (!trayEl || trayEl.classList.contains('out')) return false;
      out();
      return true;
    };
    if (!probe()) setTimeout(probe, 400);
  }
  function isSigilLocked() { return ((getState().buddy || []).some(function (e) { return e && (e.kind === 'stone' || e.kind === 'poppet'); })); }

  // the plug — a black IDC connector that lives IN the port (a child of
  // it, so it always tracks the socket's mouth): keyed block + strain
  // relief, top edge tucking 2px up into the socket.
  function buildPlug() {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'crt-bay-plug');
    svg.setAttribute('viewBox', '0 0 60 22');
    svg.setAttribute('aria-hidden', 'true');
    var s = '';
    s += '<rect x="0" y="0" width="60" height="12" rx="2.5" fill="#14100c"/>';
    s += '<rect x="2" y="2" width="56" height="8" rx="2" fill="#241c14"/>';
    s += '<rect x="24" y="0" width="12" height="3" fill="#0a0806"/>';
    s += '<circle cx="5" cy="6" r="1.6" fill="#3a3226"/>';
    s += '<circle cx="55" cy="6" r="1.6" fill="#3a3226"/>';
    s += '<path d="M4 12 L56 12 L50 22 L10 22 Z" fill="#100d09"/>';
    svg.innerHTML = s;
    return svg;
  }

  // the routed ribbon — the cord's real journey: it leaves the plug,
  // drops just below the plug as a short service lead and settles into a
  // nearby grommet. It stays attached to the machine instead of crossing
  // the monitor base or reading as a loose cable in the room. Aspect-exact
  // (90×40) so nothing letterboxes; the lead's origin is pinned under the plug.
  function buildRibbon() {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'crt-bay-ribbon');
    svg.setAttribute('viewBox', '0 0 90 40');
    svg.setAttribute('aria-hidden', 'true');
    var s = '';
    var cols = ['#c8c4bc', '#8a6a3a', '#b03a2a', '#e8a03c', '#d8c84a', '#3a7a3a', '#3a9a9a', '#3a5ac8', '#7a3ac8', '#c83a9a', '#8a5a3a', '#141210'];
    for (var i = 0; i < 12; i++) {
      var k = i * 0.52;
      s += '<path d="M5 ' + (5 + k * 0.08) + ' C8 ' + (14 + k * 0.1) + ', 20 ' + (24 + k * 0.12) + ', 37 ' + (27 + k * 0.14)
        + ' C52 ' + (30 + k * 0.16) + ', 67 ' + (29 + k * 0.12) + ', 79 ' + (25 + k * 0.08)
        + ' C83 ' + (24 + k * 0.06) + ', 85 ' + (22 + k * 0.04) + ', 86 ' + (20 + k * 0.02)
        + '" stroke="' + cols[i] + '" stroke-width="3.1" fill="none" opacity="0.95"/>';
    }
    // a restrained sheen and shadow keep the short service lead attached to the port
    s += '<path d="M5 5 C8 14, 20 24, 37 27 C52 30, 67 29, 79 25" stroke="rgba(255,255,255,0.14)" stroke-width="1.3" fill="none"/>';
    s += '<path d="M37 29 C52 32, 67 31, 79 27" stroke="rgba(0,0,0,0.28)" stroke-width="1.5" fill="none"/>';
    // the grommet — a small dark oval at the end of the service lead
    s += '<ellipse cx="86" cy="35" rx="5" ry="4" fill="#14100c"/>';
    s += '<ellipse cx="86" cy="34.5" rx="3.6" ry="2.6" fill="#241c14"/>';
    svg.innerHTML = s;
    return svg;
  }

  function build() {
    if (!document.querySelector('.bezel')) return;
    bay = document.createElement('div');
    bay.className = 'crt-bay';
    bay.dataset.assembly = 'keyboard-console';
    bay.dataset.loader = 'top-loading';
    bay.setAttribute('role', 'group');
    bay.setAttribute('aria-label', 'top-loading keyboard and cartridge console bay');

    // the machined face
    var face = document.createElement('div');
    face.className = 'crt-dock-face';

    // The dock is one mounted object, not a loose tray: these rails and the
    // apron give the face a believable load path into the lower bezel.
    var mount = document.createElement('span');
    mount.className = 'crt-dock-mount';
    mount.setAttribute('aria-hidden', 'true');
    var railLeft = document.createElement('span');
    railLeft.className = 'crt-dock-rail rail-left';
    railLeft.setAttribute('aria-hidden', 'true');
    var railRight = document.createElement('span');
    railRight.className = 'crt-dock-rail rail-right';
    railRight.setAttribute('aria-hidden', 'true');
    face.setAttribute('aria-hidden', 'true');

    // the slot mouth — hosts the twelve indicator dots (real buttons,
    // so the mouth itself stays exposed to assistive tech)
    var slot = document.createElement('div');
    slot.className = 'crt-dock-slot';

    // the eject keycap
    ejectBtn = document.createElement('button');
    ejectBtn.type = 'button';
    ejectBtn.className = 'crt-bay-eject';
    ejectBtn.setAttribute('aria-pressed', 'false');
    ejectBtn.setAttribute('aria-controls', 'crt-bay-tray');
    ejectBtn.setAttribute('aria-label', 'eject the cartridge tray');
    ejectBtn.setAttribute('aria-disabled', alive() ? 'false' : 'true');
    ejectBtn.title = 'cartridge tray';

    // the lamp bar's box (the dots mount into the slot below)
    lightsBox = document.createElement('div');
    lightsBox.className = 'crt-bay-dots';
    lightsBox.id = 'crt-bay-dots';
    lightsBox.setAttribute('role', 'group');
    lightsBox.setAttribute('aria-label', 'console state');

    // the maker's plate, engraved left of the slot
    var plate = document.createElement('span');
    plate.className = 'crt-dock-plate';
    plate.textContent = 'lv · cart';
    plate.setAttribute('aria-hidden', 'true');

    // the connection port — a recessed socket on the face, lower-right:
    // the cord's home. The engraving holds the left, the eject the
    // center, the port the right — nothing clips.
    var port = document.createElement('span');
    port.className = 'crt-dock-port';
    port.setAttribute('aria-hidden', 'true');

    // the machined screws
    var stl = document.createElement('span'); stl.className = 'crt-dock-screw tl'; stl.setAttribute('aria-hidden', 'true');
    var str = document.createElement('span'); str.className = 'crt-dock-screw tr'; str.setAttribute('aria-hidden', 'true');

    bay.appendChild(mount);
    bay.appendChild(railLeft);
    bay.appendChild(railRight);
    bay.appendChild(face);
    bay.appendChild(slot);
    bay.appendChild(ejectBtn);
    bay.appendChild(plate);
    bay.appendChild(port);
    bay.appendChild(stl);
    bay.appendChild(str);

    tray = document.createElement('div');
    tray.className = 'crt-bay-tray';
    tray.id = 'crt-bay-tray';
    tray.setAttribute('aria-hidden', 'true');

    var carriage = document.createElement('div');
    carriage.className = 'crt-tray-carriage';

    var grid = document.createElement('div');
    grid.className = 'crt-tray-grid';
    grid.id = 'crt-tray-grid';
    grid.setAttribute('role', 'listbox');
    grid.setAttribute('aria-label', 'room cartridges');

    carriage.appendChild(grid);
    tray.appendChild(carriage);

    var bezel = document.querySelector('.bezel');
    bezel.classList.add('crt-bay-host');
    // the desktop's deeper top bevel is a desk stance (the stamp breathes
    // there); rooms keep the stock padding their layouts were tuned to
    if (currentPage() === 'desktop.html') bezel.classList.add('crt-bay-desk');
    // the lamp bar mounts into the slot mouth; the dots are this dock's
    // own now (the keybed is retired)
    lightsBox.classList.add('crt-bay-lights');
    slot.appendChild(lightsBox);
    buildLights();
    // the plug lives in the port; the routed ribbon hangs from the
    // bezel, painted under the dock, folding back on itself and running
    // the bevel to the grommet — aligned to the port at runtime
    port.appendChild(buildPlug());
    var ribbon = buildRibbon();
    bezel.appendChild(ribbon);
    var alignRibbon = function () {
      var scale = machineScale();
      var pr = port.getBoundingClientRect(), brz = bezel.getBoundingClientRect();
      var pw = pr.width / scale, ph = pr.height / scale;
      // the port's box in unscaled bezel coordinates
      var px = (pr.left - brz.left) / scale, py = (pr.top - brz.top) / scale;
      var bw = brz.width / scale;
      // aspect-exact: height = width × viewBox ratio, so the svg never
      // letterboxes and the route lands where it is drawn. Bounded so the
      // short lead remains attached even at narrow widths.
      // Keep the ribbon as a short service lead under the dock. The old
      // full-width run crossed the monitor base and read as a loose cable
      // laid across the room instead of a connection to this hardware.
      var w = Math.min(90, Math.max(54, (bw - px - 14) * 90 / 84));
      var h = w * 40 / 90;
      ribbon.style.width = w + 'px';
      ribbon.style.height = h + 'px';
      ribbon.style.left = (px + pw / 2 - (5 / 90) * w) + 'px';
      ribbon.style.top = (py + ph - 2) + 'px';
    };
    var machineScale = function () {
      var m = document.querySelector('.machine');
      return m ? (getComputedStyle(m).transform || 'none') !== 'none' ? new DOMMatrixReadOnly(getComputedStyle(m).transform).a : 1 : 1;
    };
    alignRibbon();
    // the port's own box never changes after mount — but the BEZEL's box
    // changes with layout, boot animation and machine scaling, and the
    // port rides inside it. Sweep past the boot with delayed re-aligns.
    if (window.ResizeObserver) new ResizeObserver(alignRibbon).observe(bezel);
    window.addEventListener('resize', alignRibbon);
    setTimeout(alignRibbon, 300);
    setTimeout(alignRibbon, 1200);

    var host = document.querySelector('.bezel .screen') || bezel;
    well = document.createElement('div');
    well.className = 'crt-bay-well';
    well.setAttribute('aria-hidden', 'true');
    well.appendChild(tray);
    bezel.appendChild(bay);
    host.appendChild(well);

    // the settings cog embeds into the plastic (desktop trial)
    var cog = document.getElementById('settings-cog');
    if (cog) {
      cog.classList.add('crt-cog-adopted');
      bezel.appendChild(cog);
    }

    ejectBtn.addEventListener('click', toggle);
    // a disabled button never fires: catch the pointerdown and answer
    ejectBtn.addEventListener('pointerdown', function () { if (!alive()) noteQuiet(); });
    var traveTab = document.getElementById('traverom-tab');
    if (traveTab) traveTab.addEventListener('pointerdown', function () { if (!alive()) noteQuiet(); });
    tray.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        var runtime = window.LiberTraveROM;
        if (runtime && typeof runtime.close === 'function') runtime.close();
        else seat();
        return;
      }
      var delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 :
        e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      var buttons = tray.querySelectorAll('.crt-cartridge');
      var current = Array.prototype.indexOf.call(buttons, e.target);
      if (!delta || current < 0 || !buttons.length || !tray.classList.contains('out')) return;
      e.preventDefault();
      var next = current;
      var remaining = buttons.length;
      do {
        next = (next + delta + buttons.length) % buttons.length;
        remaining--;
      } while (remaining > 0 && buttons[next].disabled);
      if (!buttons[next].disabled) {
        setTrayTabStops(true, next);
        buttons[next].focus({ preventScroll: true });
      }
    });

    // on the desktop, the room you last sat with keeps the lamp lit
    var s = getState(), latestId = null, latestTs = 0, visitedMap = s.visited || {};
    for (var vid in visitedMap) if (visitedMap[vid] > latestTs) { latestTs = visitedMap[vid]; latestId = vid; }
    if (currentPage() === 'desktop.html' && latestId) {
      for (var vi = 0; vi < CARTS.length; vi++) if (CARTS[vi].id === latestId) { selectedIdx = vi; break; }
    }
    render();
    // sweep past boot/layout so the lamps read the room you sit with
    setTimeout(lightLamps, 300);
    setTimeout(lightLamps, 1200);
  }

  // each room's mark, cast into its cartridge: a small line emblem in
  // the same engraved language as the bezel glyphs
  var MARKS = {
    home: '<path d="M4 11.5 L12 4.5 L20 11.5 M6.5 10 V19 H17.5 V10 M10.5 19 V14.5 H13.5 V19"/>',
    sigil: '<path d="M12 3.5 L14 10 L20.5 12 L14 14 L12 20.5 L10 14 L3.5 12 L10 10 Z"/>',
    journal: '<path d="M4.5 6.5 Q8 4.5 12 6.5 Q16 4.5 19.5 6.5 V18 Q16 16.2 12 18 Q8 16.2 4.5 18 Z M12 6.5 V18"/>',
    sea: '<path d="M3.5 14.5 C6.5 9.5 9.5 9.5 12 14.5 C14.5 19.5 17.5 19.5 20.5 14.5 M3.5 9 C6.5 4.5 9.5 4.5 12 9"/>',
    vanir: '<path d="M3.5 14.5 C6.5 9.5 9.5 9.5 12 14.5 C14.5 19.5 17.5 19.5 20.5 14.5 M3.5 9 C6.5 4.5 9.5 4.5 12 9"/>',   // same mark as sea: the cart's id is vanir, its label is sea
    games: '<path d="M9.8 4.5 H14.2 V9.8 H19.5 V14.2 H14.2 V19.5 H9.8 V14.2 H4.5 V9.8 H9.8 Z"/>',
    toybox: '<circle cx="12" cy="12" r="7.5"/><path d="M5 9.5 Q12 13.5 19 9.5"/>',   // retired (archive/toybox)
    memory: '<path d="M4.5 8.5 H19.5 M4.5 12 H19.5 M4.5 15.5 H19.5 M4.5 8.5 V15.5 M19.5 8.5 V15.5 M7 19.5 Q12 16.5 17 19.5"/>',
    divination: '<path d="M3.5 12 Q12 5.5 20.5 12 Q12 18.5 3.5 12 Z"/><circle cx="12" cy="12" r="2.4"/>',
    learn: '<path d="M12 4.5 Q7 5.5 6.5 11 V14.5 H17.5 V11 Q17 5.5 12 4.5 Z M10.3 17.5 Q12 19.5 13.7 17.5"/>',
    garden: '<path d="M12 20 V12 M12 13 C7.5 13 5.5 9.5 5.5 6.5 C10 6.5 12 9 12 13 M12 11.5 C16 11.5 18.5 8.5 18.5 5 C14.5 5 12 7.5 12 11.5"/>',
    dreams: '<path d="M14.5 4.5 A8 8 0 1 0 19.5 14.5 A6.5 6.5 0 1 1 14.5 4.5 Z"/>',
    trash: '<path d="M6.5 7.5 H17.5 L16.5 19.5 H7.5 Z M4.5 7.5 H19.5 M10 5 H14 M10 10.5 V16.5 M14 10.5 V16.5"/>'
  };

  function setTrayTabStops(open, activeIndex) {
    if (!tray) return;
    var buttons = tray.querySelectorAll('.crt-cartridge');
    var active = Number.isInteger(activeIndex) ? activeIndex : 0;
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].tabIndex = open && i === active && !buttons[i].disabled ? 0 : -1;
    }
  }

  function render() {
    if (!tray) return;
    var grid = tray.querySelector('.crt-tray-grid');
    var visitedMap = getState().visited || {};
    var isAlive = alive();
    var locked = isSigilLocked();
    var nextId = nextCartId();
    grid.innerHTML = '';
    CARTS.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'crt-cartridge mat-' + c.mat + (c.home ? ' home' : '') + (visitedMap[c.id] ? ' visited' : ' empty');
      b.id = 'crt-cartridge-' + c.id;
      b.dataset.id = c.id;
      b.dataset.label = c.label;
      // the stone's lock rides the shell: the sigil cart wears the cross
      if (c.id === 'sigil' && locked) b.classList.add('crossed');
      // the guide: one glowing door at a time (poppet first, then the sea)
      if (c.id === nextId) b.classList.add('crt-next');
      b.style.setProperty('--ac', c.acc);
      b.style.setProperty('--glow', hexGlow(c.acc));
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('aria-label', c.home ? 'seat the home cartridge' : 'seat the ' + c.label + ' cartridge');
      b.setAttribute('aria-disabled', isAlive ? 'false' : 'true');
      b.disabled = !isAlive;
      b.tabIndex = -1;
      b.addEventListener('click', function () {
        if (!isAlive) { say(QUIET); return; }
        if (seating) return;
        var runtime = window.LiberTraveROM;
        if (runtime && typeof runtime.launch === 'function') {
          if (runtime.launch(c.id)) {
            selectedIdx = i;
            lightLamps();
            b.setAttribute('aria-selected', 'true');
            return;
          }
          // console refused (closed/idle): fall through to the direct
          // travel ritual below instead of dying on a dead click.
        }
        selectedIdx = i;
        lightLamps();
        // the ritual: the chosen cart holds foreground while the rest
        // recede, then it drops into the slot — shake + flash on the
        // catch, door falls shut behind it, and the room wakes after.
        grid.classList.add('entering');
        var sibs = grid.querySelectorAll('.crt-cartridge');
        for (var si = 0; si < sibs.length; si++) sibs[si].classList.remove('selected');
        b.classList.add('selected');
        b.setAttribute('aria-selected', 'true');
        travel(c);
      });
      b.addEventListener('mouseenter', function () {
        if (isAlive) say(c.label + ' / ready');
      });
      b.style.setProperty('--i', i);
      // the room's mark — a small carving recessed into the shell above
      // the label: the emblem cast into an era cartridge. Guarded: a cart
      // id without a mark must not print 'undefined' into the DOM (the
      // cold audit caught exactly that on the vanir cart).
      var mark = document.createElement('span');
      mark.className = 'crt-cart-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = '<svg viewBox="0 0 24 24" class="mark-glyph" aria-hidden="true">' + (MARKS[c.id] || '') + '</svg>';
      var label = document.createElement('span');
      label.className = 'crt-cart-label';
      label.textContent = c.label;
      b.appendChild(mark);
      b.appendChild(label);
      var lamp = document.createElement('span');
      lamp.className = 'crt-cart-lamp';
      lamp.setAttribute('aria-hidden', 'true');
      b.appendChild(lamp);
      grid.appendChild(b);
    });
    setTrayTabStops(tray.classList.contains('out'));
    lightLamps();
    if (!isAlive) say(QUIET); else restoreStatus();
  }

  // The slot's lamp bar is twelve read-only indicators. They are part of the
  // console's state display, never a navigation menu: only a cartridge that
  // has erupted into the Pixi TraveROM display can commit a destination.
  function buildLights() {
    var all = CARTS.concat([BLANK]);
    all.forEach(function (key) {
      var d = document.createElement('span');
      d.className = 'keybank-dot';
      d.id = 'crt-lamp-' + key.id;
      d.title = key.label;
      d.setAttribute('aria-hidden', 'true');
      d.setAttribute('data-navigation', 'none');
      lightsBox.appendChild(d);
    });
  }

  function lightLamps() {
    if (!lightsBox) return;
    var isAlive = alive();
    var here = currentPage();
    var kids = lightsBox.children;
    for (var i = 0; i < CARTS.length; i++) {
      var c = CARTS[i], d = kids[i];
      if (!d) continue;
      d.style.setProperty('--gl', c.acc);
      // the cart you sit with holds the lamp: on the desktop that is the
      // selected cart, on a room window it is the room itself — whatever
      // the visit ledger says
      var lit = isAlive && (here === 'desktop.html' ? i === selectedIdx : c.page === here);
      d.classList.toggle('lit', lit);
      d.dataset.state = lit ? 'active' : (isAlive ? 'ready' : 'quiet');
    }
    var blank = kids[CARTS.length];
    if (blank) { blank.classList.remove('lit'); blank.dataset.state = isAlive ? 'reserved' : 'quiet'; }
    if (ejectBtn) {
      ejectBtn.setAttribute('aria-disabled', isAlive ? 'false' : 'true');
      ejectBtn.disabled = !isAlive;
    }
  }

  function out() {
    if (!tray) return;
    document.body.classList.add('traverom-open');
    clearTimeout(walkTimer);
    var grid = tray.querySelector('.crt-tray-grid');
    if (grid) grid.classList.remove('entering');
    tray.classList.remove('closing');
    tray.classList.add('out');
    setTrayTabStops(true);
    tray.setAttribute('aria-hidden', 'false');
    if (ejectBtn) ejectBtn.setAttribute('aria-pressed', 'true');
    if (bay) bay.classList.add('ejecting');
    var first = tray.querySelector('.crt-cartridge');
    if (first && !(well && well.classList.contains('traverom-pixi'))) first.focus({ preventScroll: true });
  }

  function seat() {
    if (!tray) return;
    document.body.classList.remove('traverom-open');
    var grid = tray.querySelector('.crt-tray-grid');
    if (grid) grid.classList.remove('entering');
    tray.classList.remove('out');
    tray.classList.add('closing');
    setTrayTabStops(false);
    // Do not hide an ancestor while one of its cartridge buttons still owns
    // focus. Blur first; otherwise Chromium correctly reports an
    // aria-hidden/focused-descendant violation during every retract.
    if (tray.contains(document.activeElement) && document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    tray.setAttribute('aria-hidden', 'true');
    if (ejectBtn) ejectBtn.setAttribute('aria-pressed', 'false');
    // the rail stays lit while the door falls home, then goes dark
    setTimeout(function () {
      tray.classList.remove('closing');
      if (bay) bay.classList.remove('ejecting');
    },  FALL_MS);
  }

  function toggle() {
    if (!tray) return;
    if (tray.classList.contains('out') || tray.classList.contains('closing')) { if (!tray.classList.contains('closing')) seat(); }
    else out();
  }

  // clicking anywhere else on the glass seats the tray back
  document.addEventListener('pointerdown', function (e) {
    if (!tray || !tray.classList.contains('out')) return;
    // The Pixi well is mounted beside the legacy bay node, so it must count as
    // part of the console. The desk-front stage lives on the machine, outside
    // the glass, and counts too — without it this guard would retract the tray
    // before Pixi could receive the cartridge's pointertap.
    if (tray.contains(e.target) || (bay && bay.contains(e.target)) || (well && well.contains(e.target))) return;
    if (e.target && e.target.closest && e.target.closest('.traverom-stage')) return;
    seat();
  });

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', build);
    } else {
      build();
    }
    if (window.Liber && window.Liber.state && window.Liber.state.on) {
      window.Liber.state.on('change', function () { render(); lightLamps(); });
    }
  }

  window.Liber = window.Liber || {};
  // TraveROM calls this only after its Pixi possession beat. Resolve by the
  // stable cartridge id and reuse one navigation path so the haunted console
  // can never drift into a neighbouring room or a random app.
  function commitCartridge(id) {
    var cart = CARTS.find(function (item) { return item.id === id; });
    if (!cart || !alive() || seating) return false;
    selectedIdx = CARTS.indexOf(cart);
    travel(cart);
    return true;
  }
  window.Liber.crtBay = {
    openTray: out,
    closeTray: seat,
    shudder: shudder,
    // Legacy callers may still ask the console to show its tray, but this
    // shim intentionally cannot navigate. Destination commits belong to Pixi.
    seatCart: function () { out(); return false; },
    commitCartridge: commitCartridge,
    carts: CARTS
  };

  init();
})();
