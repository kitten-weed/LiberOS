// trave-rom.js — TraveROM, the haunted top-loading console on its own wired
// worktable. The shared Pixi runtime paints the furniture; DOM buttons remain
// the pointer, keyboard, and screen-reader controls.
(function (global) {
  'use strict';
  global.__liberTraveROMLoaded = true;
  if (global.__liberTraveROM) return;
  var bay = null;
  var well = null;
  var tray = null;
  global.__liberTraveROM = true;

  var PIXI = global.PIXI;
  var REDUCED = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var CARTS = (global.Liber && global.Liber.crtBay && global.Liber.crtBay.carts) || [];
  var app = null;
  var layer = null;
  var roomHost = null;
  var viewport = null;
  var invalidateLayer = null;
  var scene = null;
  var desk = null;
  var deskKey = null;
  var vacuiPortElement = null;
  var deskMetrics = null;
  var cards = [];
  var lights = [];
  var possessionFx = null;
  var possessionParticles = [];
  var possessionProfile = null;
  var consoleSkin = null;
  var consolePrompt = null;
  var open = false;
  var opening = false;
  var possessing = false;
  var externalActive = false;
  var mounting = false;
  var deskCreated = false;
  var deskOriginalParent = null;
  var deskOriginalNextSibling = null;
  var trayOriginalParent = null;
  var trayOriginalNextSibling = null;
  var elapsed = 0;
  var trayObserver = null;
  var stateUnsubscribe = null;
  var machine = document.querySelector('.machine');

  function consoleUnlocked() {
    var controls = global.Liber && global.Liber.crtBay;
    return !!(controls && typeof controls.isAlive === 'function' && controls.isAlive());
  }

  function updateDeskKey() {
    if (!deskKey) return;
    var unlocked = consoleUnlocked();
    deskKey.disabled = !unlocked;
    deskKey.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
  }

  var PALETTE = {
    shell: 0xcdbfa0,
    shellHi: 0xf0e5c9,
    shellEdge: 0x8e6530,
    ink: 0x2a1b10,
    socket: 0x090706,
    brass: 0xd2a052,
    lightOff: 0x3e2c1b,
    possession: 0xf2c36a
  };

  // Each Traveller changes the machine's material language, not just its
  // accent colour. These are deliberately restrained registers: one dominant
  // hue, one motion grammar, and one small architectural cue per arrival.
  var POSSESSION = {
    home:       { name: 'wanderlust', hue: 0xd6ae5d, shell: 0x24170f, edge: 0xf0c878, motion: 'orbit', mark: 'stars' },
    sigil:      { name: 'physius', hue: 0xaa5a18, shell: 0x302b2a, edge: 0xd7d0c4, motion: 'chisel', mark: 'chips' },
    journal:    { name: 'riason', hue: 0xaa7838, shell: 0x3a281b, edge: 0xe3c184, motion: 'index', mark: 'pages' },
    sea:        { name: 'vanir', hue: 0x2a8a8a, shell: 0x092b35, edge: 0x8bd8df, motion: 'tide', mark: 'waves' },
    games:      { name: 'whimsy wow', hue: 0xd4af37, shell: 0x451b13, edge: 0xffe9a3, motion: 'chase', mark: 'bulbs' },
    toybox:     { name: 'pip', hue: 0xd88a3c, shell: 0x412317, edge: 0xffc078, motion: 'bounce', mark: 'blocks' },   // retired (archive/toybox)
    divination: { name: 'arcana', hue: 0xf4e8d2, shell: 0x25182e, edge: 0xfff5d8, motion: 'orbit', mark: 'chalk' },
    dreams:     { name: 'insightful inquiry', hue: 0xa48ad4, shell: 0x1c1d3b, edge: 0xd9cbff, motion: 'drift', mark: 'fog' },
    memory:     { name: 'the sand', hue: 0xd8b877, shell: 0x2e2416, edge: 0xf0dca8, motion: 'settle', mark: 'grains' },
  };

  function profileFor(cart) { return POSSESSION[cart && cart.id] || POSSESSION.home; }

  // The register is the ONE place a traveller's material language is named.
  // pixi-layer reads it lazily (this file loads after it) so the GPU layer
  // that furnishes the room behind the machine and the arrival animation that
  // possesses the console cannot disagree about who is currently here. Before
  // this export the room behind was furnished identically for every traveller
  // — same shelf, same corkboard, same window — and only recoloured.
  global.LiberTravellers = {
    all: POSSESSION,
    currentId: function () { return currentId(); },
    current: function () { return POSSESSION[currentId()] || POSSESSION.home; }
  };

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { t = clamp(t, 0, 1); return t * t * t; }
  /* THE COVENANT (author, 2026-09-30): every app wears the SAME bevel. The
     machine's size belongs to machine.css + stage.js alone — the only things
     that change between apps are the room behind the monitor and the picture
     in the glass. The console therefore never writes a machine width: it
     composes itself around the machine's live rect in metrics(), which is
     re-measured on every layout pass. (The old override here — a staged
     guess, then a measured pin — was the whole family of too-small-bezel
     bugs: a stale or transient reading froze the tube for the run.) */
  function composeRoom(w, h) {
    // The console sits DIRECTLY BELOW the monitor, on its right side —
    // tucked under the settings cog's corner, not on its own table across
    // the room. The machine keeps its authored width; the console takes
    // the floor between the machine's right foot and the room's edge.
    var inset = clamp(w * 0.018, 10, 18);
    if (!Number.isFinite(w) || w < 100 || !Number.isFinite(h) || h < 100) {
      // A not-yet-laid-out or hidden host reported a degenerate viewport
      // (this happens at mount during the dormant enter-rite). Draw nothing
      // authoritative; the next real layout pass composes properly.
      return { tableWidth: 240, gap: 8, inset: inset, groupLeft: 0, degenerate: true };
    }
    return { tableWidth: clamp(w * 0.44, 240, 420), gap: clamp(w * 0.014, 8, 18), inset: inset, groupLeft: 0 };
  }
  function colorFor(cart) {
    var n = parseInt(String(cart && cart.acc || '#a88858').replace('#', ''), 16);
    return Number.isFinite(n) ? n : 0xa88858;
  }
  function currentId() {
    var path = (location.pathname.split('/').pop() || 'desktop.html').toLowerCase();
    for (var i = 0; i < CARTS.length; i++) if ((CARTS[i].page || 'desktop.html') === path) return CARTS[i].id;
    return 'home';
  }

  function makeText(text, size, color) {
    var label = new PIXI.Text({
      text: text,
      style: {
        fontFamily: 'VT323, Courier New, monospace',
        fontSize: size,
        fontWeight: '700',
        fill: color,
        align: 'center',
        letterSpacing: 1
      }
    });
    label.anchor.set(0.5);
    label.roundPixels = true;
    return label;
  }

  // Keep the machine and worktable side by side; the shared canvas sits
  // behind the CRT, so the table must never be hidden by its silhouette.
  function metrics(w, h, composition) {
    var roomRect = roomHost.getBoundingClientRect();
    var machineRect = machine.getBoundingClientRect();
    /* The base is authored inside .machine on most pages but directly in
       .room on others (sigil et al). Accept either: the console only needs
       the base's on-screen position to route the cable. */
    var monitorBase = machine.querySelector('.monitor-base') || roomHost.querySelector('.room > .monitor-base');
    if (!monitorBase) throw new Error('TraveROM requires the Vacui monitor base');
    var baseRect = monitorBase.getBoundingClientRect();
    var tableW = composition.tableWidth;
    // Below the monitor, right side: the console deck hugs the floor under
    // the machine's right half. Its top surface stays low (a shelf under the
    // screen, not a table the eye travels to), so the monitor keeps command
    // of the composition.
    var inset = composition.inset;
    /* The monitor hugs the walls now, so the console sits lower in the
       floor line: a shorter case, sunk below the room's bottom edge so
       the tube keeps command of the composition. */
    var tableH = clamp(h * 0.24, 160, 210);
    var tableX = clamp(machineRect.right - roomRect.left - tableW * 0.62, inset, w - tableW - inset);
    var tableY = h - tableH * 0.70;
    var tableDepth = tableH * 0.52;
    var tableEdgeY = tableY + tableDepth;
    var tableBottomY = tableY + tableH;
    var frontW = clamp(tableW * 0.94, 220, 400);
    var frontH = clamp(h * 0.075, 52, 68);
    var topH = clamp(frontH * 0.30, 14, 20);
    var baseY = tableEdgeY;
    var frontX = tableX + (tableW - frontW) / 2;
    var vacuiPort = {
      x: machineRect.right - roomRect.left + 10,
      y: baseRect.top - roomRect.top + baseRect.height * 0.54
    };
    var consolePort = {
      x: frontX + frontW * 0.21 + 5,
      y: baseY - frontH - topH + topH * 0.30 + 3
    };
    var cablePoints = [
      vacuiPort,
      { x: vacuiPort.x + 14, y: vacuiPort.y + 12 },
      { x: tableX + 10, y: vacuiPort.y + 25 },
      { x: tableX + 28, y: consolePort.y + 28 },
      { x: consolePort.x - 22, y: consolePort.y + 12 },
      consolePort
    ];
    var frontY = baseY - frontH;
    var topY = frontY - topH;
    var cardGap = clamp(tableW * 0.02, 7, 10);
    var cardW = Math.min((tableW - 28 - 5 * cardGap) / 6, 88);
    var cardH = cardW + 30;
    var rowGap = clamp(cardW * 0.12, 8, 12);
    return {
      w: w, h: h,
      tableX: tableX, tableY: tableY, tableW: tableW, tableH: tableH,
      tableDepth: tableDepth, tableEdgeY: tableEdgeY, tableBottomY: tableBottomY,
      supports: [
        { x: tableX + tableW * 0.16, y: tableEdgeY + 14, width: clamp(tableW * 0.07, 20, 28), height: tableBottomY - tableEdgeY - 14 },
        { x: tableX + tableW * 0.77, y: tableEdgeY + 14, width: clamp(tableW * 0.07, 20, 28), height: tableBottomY - tableEdgeY - 14 }
      ],
      frontX: frontX, frontY: frontY, frontW: frontW, frontH: frontH,
      topY: topY, topH: topH, baseY: baseY,
      mouthW: frontW * 0.46, mouthY: topY + topH * 0.42,
      cardGap: cardGap, rowGap: rowGap, cardW: cardW, cardH: cardH,
      vacuiPort: vacuiPort, consolePort: consolePort, cablePoints: cablePoints
    };
  }

  function drawTable(root, m) {
    var g = new PIXI.Graphics({ label: 'traverom-table' });
    root.addChild(g);
    var leftSupport = m.supports[0];
    var rightSupport = m.supports[1];
    var supportHeight = m.tableBottomY - m.tableEdgeY - 14;

    g.ellipse(m.tableX + m.tableW * 0.52, m.tableBottomY - 3, m.tableW * 0.52, 12).fill({ color: 0x050403, alpha: 0.54 });
    g.rect(leftSupport.x, leftSupport.y, leftSupport.width, supportHeight).fill(0x2b1b11).stroke({ width: 2, color: 0x100b08 });
    g.rect(rightSupport.x, rightSupport.y, rightSupport.width, supportHeight).fill(0x2b1b11).stroke({ width: 2, color: 0x100b08 });
    g.rect(leftSupport.x + leftSupport.width, m.tableEdgeY + 20, rightSupport.x - leftSupport.x - leftSupport.width, 8).fill(0x1d130d);

    g.moveTo(m.tableX + 9, m.tableY)
      .lineTo(m.tableX + m.tableW - 9, m.tableY)
      .lineTo(m.tableX + m.tableW, m.tableEdgeY)
      .lineTo(m.tableX, m.tableEdgeY)
      .closePath()
      .fill(0x4a3020)
      .stroke({ width: 3, color: 0x120c08 });
    g.moveTo(m.tableX + 11, m.tableY + 3)
      .lineTo(m.tableX + m.tableW - 11, m.tableY + 3)
      .lineTo(m.tableX + m.tableW - 4, m.tableEdgeY - 3)
      .stroke({ width: 2, color: 0x8c6237, alpha: 0.72 });
    for (var grain = 0; grain < 4; grain++) {
      var grainY = m.tableY + m.tableDepth * (0.24 + grain * 0.16);
      g.moveTo(m.tableX + 22, grainY)
        .lineTo(m.tableX + m.tableW - 28, grainY + 3)
        .stroke({ width: 1, color: 0x9a7042, alpha: 0.25 });
    }

    g.moveTo(m.tableX, m.tableEdgeY)
      .lineTo(m.tableX + m.tableW, m.tableEdgeY)
      .lineTo(m.tableX + m.tableW - 2, m.tableEdgeY + 14)
      .lineTo(m.tableX + 2, m.tableEdgeY + 14)
      .closePath()
      .fill(0x2b1b11)
      .stroke({ width: 2, color: 0x100b08 });
    g.moveTo(m.tableX + 4, m.tableEdgeY + 2)
      .lineTo(m.tableX + m.tableW - 4, m.tableEdgeY + 2)
      .stroke({ width: 2, color: 0xc39556, alpha: 0.8 });
  }

  function drawCable(root, m) {
    var g = new PIXI.Graphics({ label: 'traverom-vacui-cable' });
    root.addChild(g);
    var points = m.cablePoints;
    var i;

    for (i = 0; i < points.length - 1; i++) {
      g.moveTo(points[i].x, points[i].y).lineTo(points[i + 1].x, points[i + 1].y);
    }
    g.stroke({ width: 9, color: 0x090706, cap: 'square', join: 'miter' });
    for (i = 0; i < points.length - 1; i++) {
      g.moveTo(points[i].x, points[i].y - 1).lineTo(points[i + 1].x, points[i + 1].y - 1);
    }
    g.stroke({ width: 3, color: 0x594329, cap: 'square', join: 'miter' });
    for (i = 0; i < points.length - 1; i++) {
      g.moveTo(points[i].x, points[i].y + 2).lineTo(points[i + 1].x, points[i + 1].y + 2);
    }
    g.stroke({ width: 1, color: 0xc18b4a, alpha: 0.9, cap: 'square', join: 'miter' });
  }

  function drawConsole(root, m) {
    var g = new PIXI.Graphics();
    root.addChild(g);
    var activeProfile = possessionProfile || POSSESSION.home;
    consoleSkin = new PIXI.Graphics({ label: 'traveller-console-skin' });
    consoleSkin.visible = !!possessionProfile;
    root.addChild(consoleSkin);
    var mouthX = m.frontX + (m.frontW - m.mouthW) / 2;
    var i = 0;

    g.rect(m.frontX + 8, m.baseY - 4, m.frontW - 16, 4).fill({ color: 0x080604, alpha: 0.72 });

    // the top face, drawn as stepped rows: the loader keeps a square pixel
    // lid rather than a rounded one, and the mouth sits inside it.
    g.rect(m.frontX + m.frontW * 0.11, m.topY, m.frontW * 0.78, m.topH * 0.34).fill(0xf0e5c9);
    g.rect(m.frontX + m.frontW * 0.055, m.topY + m.topH * 0.34, m.frontW * 0.89, m.topH * 0.31).fill(0xdbcfb2);
    g.rect(m.frontX, m.topY + m.topH * 0.65, m.frontW, m.topH * 0.35).fill(0xcdbfa0);
    g.rect(m.frontX, m.topY + m.topH - 3, m.frontW, 3).fill(PALETTE.shellEdge);
    g.rect(mouthX, m.topY + m.topH * 0.14, m.mouthW, m.topH * 0.58).fill(PALETTE.socket).stroke({ width: 2, color: PALETTE.brass });
    // Strain reliefs make the table cable's two conductors legible at the case.
    g.rect(m.frontX + m.frontW * 0.21, m.topY + m.topH * 0.30, 9, 7).fill(0x090706).stroke({ width: 1, color: 0x6d4b28 });
    g.rect(m.frontX + m.frontW * 0.295, m.topY + m.topH * 0.46, 7, 6).fill(0x090706).stroke({ width: 1, color: 0x6d4b28 });
    g.rect(mouthX + 7, m.topY + m.topH * 0.30, m.mouthW - 14, 4).fill(0x1d130b);
    g.rect(mouthX - 3, m.topY + m.topH * 0.14, 3, m.topH * 0.58).fill(PALETTE.shellHi);
    g.rect(mouthX + m.mouthW, m.topY + m.topH * 0.14, 3, m.topH * 0.58).fill(PALETTE.shellHi);
    // A plain instruction belongs on the hardware, not in a floating tooltip.
    // It is deliberately short and stays visible at the 900px floor.
    consolePrompt = makeText('OPEN TRAY', 14, PALETTE.ink);
    consolePrompt.position.set(m.frontX + m.frontW / 2, m.topY - 7);
    consolePrompt.visible = !open;
    root.addChild(consolePrompt);

    // the case shares the monitor's molded-cream material language.
    g.rect(m.frontX + 5, m.frontY + 5, m.frontW, m.frontH).fill(0x080604);
    g.rect(m.frontX, m.frontY, m.frontW, m.frontH).fill(activeProfile.shell).stroke({ width: 3, color: activeProfile.edge });
    // the cheeks shade in, with one brass hairline on each inner edge, so the
    // face reads as a moulded case and not a flat rectangle
    var cheek = m.frontW * 0.085;
    g.rect(m.frontX + 4, m.frontY + 4, cheek, m.frontH - 8).fill(0xa89470);
    g.rect(m.frontX + m.frontW - 4 - cheek, m.frontY + 4, cheek, m.frontH - 8).fill(0xa89470);
    g.rect(m.frontX + 4 + cheek, m.frontY + 6, 2, m.frontH - 12).fill(0x6d4b28);
    g.rect(m.frontX + m.frontW - 6 - cheek, m.frontY + 6, 2, m.frontH - 12).fill(0x6d4b28);
    // the cart guides, aimed at the mouth, and the seam that closes the lid
    g.rect(mouthX - 9, m.frontY + m.frontH * 0.08, 6, m.frontH * 0.24).fill(PALETTE.shellHi);
    g.rect(mouthX + m.mouthW + 3, m.frontY + m.frontH * 0.08, 6, m.frontH * 0.24).fill(PALETTE.shellHi);
    g.rect(m.frontX + 4, m.frontY + m.frontH * 0.35, m.frontW - 8, 3).fill(0x120c08);

    // the lamp row: twelve sockets, state-fed, never a menu. Each socket keeps
    // a brass ring so the register still reads when every lamp is dark.
    var rowW = m.frontW * 0.70;
    var rowX = m.frontX + (m.frontW - rowW) / 2;
    var step = rowW / 12;
    var socket = Math.max(7, Math.min(14, step * 0.62));
    var lampY = m.frontY + m.frontH * 0.50;
    g.rect(m.frontX + m.frontW * 0.09, lampY - 7, m.frontW * 0.82, socket + 14).fill(activeProfile.motion === 'tide' ? 0x071a21 : 0x1a110b);
    for (i = 0; i < 12; i++) {
      var lx = rowX + step * i + (step - socket) / 2;
      g.rect(lx - 3, lampY - 3, socket + 6, socket + 6).fill(0x0d0906);
      g.rect(lx - 3, lampY - 3, socket + 6, socket + 6).stroke({ width: 1, color: 0x6d4b28 });
      g.rect(lx, lampY, socket, socket).fill(lights[i] || PALETTE.lightOff);
      g.rect(lx, lampY, socket, 2).fill(0x120c08);
    }
    // the pilot lamp, left of the row
    g.rect(m.frontX + 11, lampY + socket * 0.2 - 2, 10, 10).fill(0x0d0906).stroke({ width: 1, color: 0x6d4b28 });
    g.rect(m.frontX + 13, lampY + socket * 0.2, 6, 6).fill(activeProfile.hue);

    // the maker's plate, engraved on the face
    var plateW = Math.min(m.frontW * 0.54, 240);
    var plateY = m.frontY + m.frontH * 0.66;
    var plateH = Math.max(18, m.frontH * 0.26);
    g.rect(m.frontX + (m.frontW - plateW) / 2, plateY, plateW, plateH).fill(0x140d08).stroke({ width: 2, color: 0x8e6530 });
    var title = makeText('TRAVEROM', clamp(plateW * 0.14, 16, 24), activeProfile.edge);
    title.position.set(m.frontX + m.frontW / 2, plateY + plateH / 2);
    root.addChild(title);

    // corner screws and the two brass feet that carry the case
    var sc = Math.max(5, Math.min(8, m.frontW * 0.018));
    g.rect(m.frontX + 9, m.frontY + m.frontH * 0.40, sc, sc).fill(PALETTE.brass);
    g.rect(m.frontX + m.frontW - 9 - sc, m.frontY + m.frontH * 0.40, sc, sc).fill(PALETTE.brass);
    g.rect(m.frontX + 9, m.frontY + m.frontH - 9 - sc, sc, sc).fill(PALETTE.brass);
    g.rect(m.frontX + m.frontW - 9 - sc, m.frontY + m.frontH - 9 - sc, sc, sc).fill(PALETTE.brass);
    g.rect(m.frontX + 14, m.baseY - 5, 30, 5).fill(PALETTE.brass);
    g.rect(m.frontX + m.frontW - 44, m.baseY - 5, 30, 5).fill(PALETTE.brass);

  }

  // The drawn case is only pixels. This is its real hit target, kept in the
  // DOM so the console stays a genuine control even when the display is shut
  // and the canvas is inert.
  function positionDeskKey(m) {
    if (!deskKey || !desk) return;
    deskKey.style.left = m.frontX + 'px';
    deskKey.style.top = m.topY + 'px';
    deskKey.style.width = m.frontW + 'px';
    deskKey.style.height = (m.baseY - m.topY) + 'px';
    desk.style.setProperty('--traverom-console-x', m.frontX + 'px');
    desk.style.setProperty('--traverom-console-y', m.topY + 'px');
    desk.style.setProperty('--traverom-console-width', m.frontW + 'px');
    desk.style.setProperty('--traverom-console-height', (m.baseY - m.topY) + 'px');
  }

  function cardPosition(index, m) {
    var row = index < 6 ? 0 : 1;
    var col = index < 6 ? index : index - 6;
    var count = row === 0 ? 6 : 5;
    var cardW = m.cardW;
    var cardH = m.cardH;
    var gap = m.cardGap;
    var total = count * cardW + (count - 1) * gap;
    var lowerY = m.topY - m.rowGap - cardH / 2;
    var left = m.tableX + (m.tableW - total) / 2;
    return {
      x: left + col * (cardW + gap) + cardW / 2,
      y: row === 0 ? lowerY - cardH - m.rowGap : lowerY,
      w: cardW,
      h: cardH,
      row: row,
      rotate: (col - (count - 1) / 2) * (row ? 0.035 : 0.045)
    };
  }

  function makeCard(cart, index, m) {
    var pos = cardPosition(index, m);
    var profile = profileFor(cart);
    var root = new PIXI.Container({ label: 'traverom-' + cart.id });
    root.eventMode = 'none';
    root.position.set(m.frontX + m.frontW / 2, m.mouthY);
    root.rotation = 0;

    var body = new PIXI.Graphics();
    body.rect(-pos.w / 2 + 3, -pos.h / 2 + 4, pos.w, pos.h).fill(0x070504);
    body.rect(-pos.w / 2, -pos.h / 2, pos.w, pos.h).fill(profile.shell).stroke({ width: 2, color: profile.edge });
    body.rect(-pos.w * 0.34, -pos.h * 0.34, pos.w * 0.68, pos.h * 0.30).fill(PALETTE.socket).stroke({ width: 2, color: PALETTE.shellHi });
    body.rect(-pos.w * 0.39, pos.h * 0.08, pos.w * 0.78, pos.h * 0.25).fill(0x080604).stroke({ width: 2, color: profile.hue });
    body.rect(-pos.w * 0.27, pos.h * 0.40, pos.w * 0.54, 6).fill(PALETTE.shellHi);
    for (var tooth = 0; tooth < 6; tooth++) {
      body.rect(-pos.w * 0.27 + tooth * (pos.w * 0.108), pos.h * 0.48, pos.w * 0.065, 5).fill(profile.hue);
    }
    root.addChild(body);

    var MARKS = { home: '⌂', sigil: '✦', journal: '▤', sea: '≈', vanir: '≈', games: '+', toybox: '◉', divination: '◉', learn: '◒', garden: 'Y', dreams: '☾', trash: '▥' };
    var glyph = makeText(MARKS[cart.id] || String(cart.label || cart.id).slice(0, 1).toUpperCase(), Math.max(19, pos.w * 0.22), profile.edge);
    glyph.position.set(0, -pos.h * 0.20);
    root.addChild(glyph);
    var labelText = String(cart.label || cart.id).toUpperCase();
    // Fit the name to its nameplate: measure at a reference size, then scale
    // the font itself until the whole word sits inside the dark dish — no
    // floors, no clipping, no horizontal squashing. Short names grow large;
    // long names step down (two lines past 9 letters) but always fit whole.
    var twoLine = labelText.length > 9;
    var cut = Math.ceil(labelText.length / 2);
    var displayLabel = twoLine ? labelText.slice(0, cut) + '\n' + labelText.slice(cut) : labelText;
    var probe = makeText(displayLabel, 100, PALETTE.ink);
    var fitted = Math.max(9, Math.min(20, 100 * (pos.w * 0.86) / Math.max(1, probe.width)));
    probe.destroy();
    var label = makeText(displayLabel, fitted, PALETTE.ink);
    label.position.set(0, pos.h * 0.20);
    root.addChild(label);

    root.visible = false;
    scene.addChild(root);
    return { root: root, cart: cart, pos: pos, label: label, phase: 'hidden', t: 0, index: index };
  }

  function updateLights() {
    var active = currentId();
    var visited = (global.Liber && global.Liber.state && global.Liber.state.get().visited) || {};
    // Eleven destinations plus one reserved socket. Keep this as a plain
    // color register; the Pixi holder reads it when the scene is rebuilt.
    lights = [];
    for (var i = 0; i < CARTS.length + 1; i++) {
      lights[i] = (CARTS[i] && (CARTS[i].id === active || visited[CARTS[i].id])) ? colorFor(CARTS[i]) : PALETTE.lightOff;
    }
  }

  /* tutorial staging: during the handoff, only the poppet cartridge exists.
     rebuildScene honours this mask, and cards outside it stay hidden — even
     after revealAll() brings the travellers in one by one. */
  var soloMask = null;
  function soloPoppet() {
    soloMask = { sigil: true };
    if (viewport) layout();
    openConsole(false, true);
  }
  /* the summon brings the travellers in one at a time: each cartridge takes
     the stage alone for a beat before the next arrives, so the first
     introduction reads as a procession rather than a deck flipped face-up. */
  var revealTimer = 0;
  function revealAll() {
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = 0; }
    soloMask = {};
    var step = 0;
    function nextReveal() {
      if (step >= CARTS.length) { soloMask = null; revealTimer = 0; if (viewport) layout(); return; }
      soloMask[CARTS[step].id] = true;
      step++;
      if (viewport) layout();
      revealTimer = setTimeout(nextReveal, 640);
    }
    nextReveal();
  }

  function buildPossessionFx(root, m) {
    possessionFx = new PIXI.Container({ label: 'traveller-possession-fx' });
    possessionFx.eventMode = 'none';
    possessionFx.visible = false;
    possessionFx.position.set(m.frontX + m.frontW / 2, m.mouthY);
    root.addChild(possessionFx);

    var aura = new PIXI.Graphics();
    aura.rect(-m.mouthW * 0.62, -13, m.mouthW * 1.24, 26)
      .fill({ color: PALETTE.possession, alpha: 0.08 })
      .stroke({ width: 3, color: PALETTE.possession, alpha: 0.74 });
    aura.label = 'possession-aura';
    possessionFx.addChild(aura);
    possessionFx.aura = aura;

    possessionParticles = [];
    for (var i = 0; i < 18; i++) {
      var mote = new PIXI.Graphics();
      var size = i % 3 === 0 ? 4 : 2;
      mote.rect(-size / 2, -size / 2, size, size).fill(PALETTE.possession);
      mote.position.set(((i * 37) % Math.max(40, m.mouthW)) - m.mouthW / 2, ((i * 19) % 52) - 26);
      mote.alpha = 0;
      possessionFx.addChild(mote);
      possessionParticles.push({ node: mote, seed: i * 0.73, radius: 24 + (i % 5) * 13 });
    }
  }

  function updateConsoleSkin(m) {
    if (!consoleSkin) return;
    consoleSkin.clear();
    if (!possessionProfile) {
      consoleSkin.visible = false;
      return;
    }
    var profile = possessionProfile;
    var x = m.frontX;
    var y = m.frontY;
    var w = m.frontW;
    var h = m.frontH;
    consoleSkin.visible = true;
    consoleSkin.rect(x - 2, y - 2, w + 4, h + 4)
      .stroke({ width: 4, color: profile.edge, alpha: 0.92, pixelLine: true });
    consoleSkin.rect(x + 7, y + h * 0.38, w - 14, 3)
      .fill({ color: profile.hue, alpha: 0.3 });
    if (profile.motion === 'tide') {
      for (var wave = 0; wave < 5; wave++) consoleSkin.rect(x + 18 + wave * (w - 36) / 5, y + h * 0.72, (w - 54) / 7, 4).fill({ color: profile.edge, alpha: 0.8 });
    } else if (profile.motion === 'chisel') {
      for (var cut = 0; cut < 4; cut++) consoleSkin.rect(x + 22 + cut * 26, y + h * 0.68, 5, h * 0.18).fill({ color: profile.edge, alpha: 0.72 });
    } else if (profile.motion === 'index') {
      for (var tab = 0; tab < 7; tab++) consoleSkin.rect(x + 16 + tab * (w - 32) / 7, y + h * 0.86, 12, 3).fill({ color: profile.edge, alpha: 0.72 });
    } else if (profile.motion === 'chase') {
      for (var bulb = 0; bulb < 8; bulb++) consoleSkin.rect(x + 18 + bulb * (w - 36) / 8, y + h * 0.68, 7, 7).fill({ color: profile.edge, alpha: 0.85 });
    } else if (profile.motion === 'sway') {
      for (var vine = 0; vine < 4; vine++) consoleSkin.rect(x + 28 + vine * 42, y + h * 0.58, 4, h * 0.25).fill({ color: profile.edge, alpha: 0.68 });
    } else if (profile.motion === 'drift') {
      for (var fog = 0; fog < 5; fog++) consoleSkin.rect(x + 16 + fog * 34, y + h * (0.6 + (fog % 2) * 0.08), 22, 3).fill({ color: profile.edge, alpha: 0.48 });
    } else if (profile.motion === 'fall') {
      for (var grit = 0; grit < 6; grit++) consoleSkin.rect(x + 24 + grit * 31, y + h * (0.58 + (grit % 3) * 0.08), 6, 6).fill({ color: profile.edge, alpha: 0.72 });
    } else {
      for (var mark = 0; mark < 5; mark++) consoleSkin.rect(x + 20 + mark * 38, y + h * 0.72, 12, 3).fill({ color: profile.edge, alpha: 0.64 });
    }
  }

  function updatePossessionFx(m) {
    if (!possessionFx) return;
    var active = !!(possessing && possessionProfile);
    possessionFx.visible = active;
    if (!active) return;
    var profile = possessionProfile;
    var beat = elapsed * 5.2;
    var pulse = 0.72 + Math.sin(beat) * 0.22;
    possessionFx.aura.tint = profile.hue;
    possessionFx.aura.alpha = pulse;
    possessionFx.aura.scale.set(1 + Math.sin(beat * 0.7) * 0.08, 1 + Math.cos(beat) * 0.16);
    for (var i = 0; i < possessionParticles.length; i++) {
      var p = possessionParticles[i];
      var angle = p.seed + beat * (profile.motion === 'tide' ? 0.42 : 0.78);
      var lift = (elapsed * (18 + (i % 4) * 6) + p.seed * 12) % 64;
      var x = Math.cos(angle) * p.radius;
      var y = 25 - lift;
      if (profile.motion === 'fall') y = -28 + lift;
      if (profile.motion === 'chisel') x += (i % 2 ? -1 : 1) * Math.sin(beat * 2.8) * 9;
      if (profile.motion === 'tide') x += Math.sin(beat + i) * 12;
      p.node.position.set(x, y);
      p.node.tint = profile.hue;
      p.node.alpha = Math.max(0, 0.2 + Math.sin(angle * 1.7) * 0.35);
    }
  }

  function positionCartridgeButtons() {
    if (!tray || !externalActive) return;
    var buttons = tray.querySelectorAll('.crt-cartridge');
    var drawn = 0;
    for (var i = 0; i < cards.length; i++) {
      var item = cards[i];
      var button = buttons[i];
      if (!button) continue;
      if (!item.root || !item.pos) {   // masked-out: hide its DOM twin too
        button.style.setProperty('visibility', 'hidden', 'important');
        button.style.setProperty('pointer-events', 'none', 'important');
        continue;
      }
      button.style.setProperty('left', item.root.x + 'px', 'important');
      button.style.setProperty('top', item.root.y + 'px', 'important');
      button.style.setProperty('width', item.pos.w + 'px', 'important');
      button.style.setProperty('height', item.pos.h + 'px', 'important');
      button.style.setProperty('transform', 'translate(-50%, -50%) rotate(' + (item.root.rotation * 180 / Math.PI) + 'deg) scale(' + item.root.scale.x + ')', 'important');
      button.style.setProperty('opacity', String(item.root.alpha), 'important');
      button.style.setProperty('visibility', open && item.root.visible ? 'visible' : 'hidden', 'important');
      button.style.setProperty('pointer-events', open && item.root.visible ? 'auto' : 'none', 'important');
      button.style.setProperty('z-index', String(10 + i), 'important');
    }
  }

  function positionVacuiPort(m) {
    if (!vacuiPortElement) return;
    vacuiPortElement.style.left = m.vacuiPort.x + 'px';
    vacuiPortElement.style.top = m.vacuiPort.y + 'px';
  }

  function localBox(roomRect, x, y, width, height) {
    return {
      x: roomRect.left + x,
      y: roomRect.top + y,
      width: width,
      height: height
    };
  }

  function layoutFacts() {
    if (!externalActive || !deskMetrics || !roomHost || !tray) return null;
    var m = deskMetrics;
    var roomRect = roomHost.getBoundingClientRect();
    return {
      placement: 'external-tabletop',
      table: localBox(roomRect, m.tableX, m.tableY, m.tableW, m.tableH),
      supports: m.supports.map(function (support) {
        return localBox(roomRect, support.x, support.y, support.width, support.height);
      }),
      console: localBox(roomRect, m.frontX, m.topY, m.frontW, m.baseY - m.topY),
      cards: Array.from(tray.querySelectorAll('.crt-cartridge')).map(function (button) {
        var rect = button.getBoundingClientRect();
        return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
      }),
      vacuiPort: { x: roomRect.left + m.vacuiPort.x, y: roomRect.top + m.vacuiPort.y },
      consolePort: { x: roomRect.left + m.consolePort.x, y: roomRect.top + m.consolePort.y },
      cablePoints: m.cablePoints.map(function (point) {
        return { x: roomRect.left + point.x, y: roomRect.top + point.y };
      })
    };
  }

  function layout(context) {
    if (context) {
      viewport = context.viewport;
      REDUCED = context.reducedMotion;
    }
    if (!app || !scene || !externalActive || !viewport) {
      if (scene) scene.visible = false;
      return;
    }
    scene.visible = true;
    var children = scene.removeChildren();
    for (var old = 0; old < children.length; old++) children[old].destroy({ children: true });
    cards = [];
    updateLights();
    var composition = composeRoom(viewport.width, viewport.height);
    var m = metrics(viewport.width, viewport.height, composition);
    deskMetrics = m;
    consolePrompt = null;
    drawTable(scene, m);
    drawCable(scene, m);
    drawConsole(scene, m);
    buildPossessionFx(scene, m);
    for (var i = 0; i < CARTS.length; i++) {
      if (soloMask && !soloMask[CARTS[i].id]) { cards.push({ root: null, cart: CARTS[i], pos: null, label: null, phase: 'masked', t: 0, index: i }); continue; }
      var item = makeCard(CARTS[i], i, m);
      if (open) {
        var target = cardPosition(i, m);
        item.phase = 'idle';
        item.root.visible = true;
        item.root.position.set(target.x, target.y);
        item.root.rotation = target.rotate;
        item.root.scale.set(1);
        item.root.alpha = 1;
      }
      cards.push(item);
    }
    positionDeskKey(m);
    positionVacuiPort(m);
    positionCartridgeButtons();
  }

  function setVisible(next, options) {
    options = options || {};
    open = !!next;
    if (desk) desk.classList.toggle('is-open', open);
    if (deskKey) {
      deskKey.setAttribute('aria-expanded', open ? 'true' : 'false');
      deskKey.setAttribute('aria-label', open ? 'Close the TraveROM cartridge console' : 'Open the TraveROM cartridge console');
    }
    updateDeskKey();
    if (consolePrompt) consolePrompt.visible = !open;
    var desktop = document.querySelector('.state-desktop');
    if (desktop) desktop.classList.toggle('traverom-open', open);
    opening = true;
    for (var i = 0; i < cards.length; i++) {
      var item = cards[i];
      if (!item.root) continue;   // masked-out card (tutorial solo stage)
      if (REDUCED) {
        var target = cardPosition(item.index, deskMetrics);
        item.phase = open ? 'idle' : 'hidden';
        item.t = 0;
        item.root.visible = open;
        item.root.position.set(open ? target.x : deskMetrics.frontX + deskMetrics.frontW / 2, open ? target.y : deskMetrics.mouthY);
        item.root.rotation = open ? target.rotate : 0;
        item.root.scale.set(open ? 1 : 0.24);
        item.root.alpha = open ? 1 : 0;
      } else {
        item.phase = open ? 'summon' : 'retract';
        item.t = open ? -i * 0.055 : (cards.length - i) * 0.025;
        item.root.visible = true;
        if (open) {
          item.root.position.set(deskMetrics.frontX + deskMetrics.frontW / 2, deskMetrics.mouthY);
          item.root.rotation = 0;
          item.root.scale.set(0.24);
          item.root.alpha = 1;
        }
      }
    }
    if (REDUCED) opening = false;
    positionCartridgeButtons();
    if (open && options.focusFirst && tray) {
      var first = tray.querySelector('.crt-cartridge:not(:disabled)');
      if (first) first.focus({ preventScroll: true });
    } else if (!open && options.restoreFocus && externalActive && deskKey) {
      deskKey.focus({ preventScroll: true });
    }
    if (invalidateLayer) invalidateLayer();
  }

  function openConsole(focusFirst, tutorialPreview) {
    if (possessing || !externalActive || (!tutorialPreview && !consoleUnlocked())) return false;
    if (global.Liber && global.Liber.crtBay && global.Liber.crtBay.openTray) {
      global.Liber.crtBay.openTray();
    }
    setVisible(true, { focusFirst: focusFirst !== false });
    return true;
  }

  function closeConsole() {
    if (!externalActive) return false;
    var restoreFocus = !!(tray && tray.contains(document.activeElement));
    if (global.Liber && global.Liber.crtBay && global.Liber.crtBay.closeTray) {
      global.Liber.crtBay.closeTray();
    }
    setVisible(false, { restoreFocus: restoreFocus });
    return true;
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !open || possessing) return;
    event.preventDefault();
    event.stopPropagation();
    closeConsole();
  });

  function possessClass(on, cart) {
    if (!machine) return;
    machine.classList.toggle('traverom-possessed', !!on);
    if (desk) {
      desk.classList.toggle('is-possessed', !!on);
      if (on && cart) {
        desk.dataset.traveromTraveller = cart.id;
        desk.dataset.traveromArrival = machine && machine.dataset.traveromArrival || 'full';
      } else {
        delete desk.dataset.traveromTraveller;
        delete desk.dataset.traveromArrival;
        desk.style.removeProperty('--traverom-accent');
      }
    }
    if (on && cart) {
      possessionProfile = profileFor(cart);
      updateConsoleSkin(deskMetrics);
      machine.dataset.traveromTraveller = cart.id;
      var accent = '#' + possessionProfile.hue.toString(16).padStart(6, '0');
      machine.style.setProperty('--traverom-accent', accent);
      if (desk) desk.style.setProperty('--traverom-accent', accent);
    } else {
      possessionProfile = null;
      updateConsoleSkin(deskMetrics);
      delete machine.dataset.traveromTraveller;
      delete machine.dataset.traveromArrival;
      machine.style.removeProperty('--traverom-accent');
    }
    var screen = document.querySelector('.screen');
    if (screen) {
      screen.classList.toggle('traverom-screen-lock', !!on);
      if (on && cart) screen.dataset.traveromTraveller = cart.id;
      else delete screen.dataset.traveromTraveller;
    }
  }

  // ── ARRIVAL LENGTH: full the first time, brief after ────────────────────
  // The arrival is the point of the cartridge — a traveller's spirit infusing
  // the cartridge, the monitor and the room. But you pass through it dozens of
  // times a sitting, and a sequence that is right once is a toll by the tenth.
  // So it plays in full the FIRST time a given app is opened in a session, and
  // briefly on every return to it. Session-scoped, not persisted: a new sitting
  // earns the full arrival again, which is the behaviour the author asked for.
  // prefers-reduced-motion still collapses it to an instant state change, and
  // that check comes first — consent outranks the ceremony.
  var ARRIVAL_SEEN_KEY = 'liber_arrival_seen';

  function arrivalSeen(id) {
    if (!id) return false;
    try {
      var raw = global.sessionStorage.getItem(ARRIVAL_SEEN_KEY) || '';
      return raw.split(',').indexOf(id) !== -1;
    } catch (e) { return false; }   // private mode: every arrival is a first
  }

  function markArrival(id) {
    if (!id) return;
    try {
      var raw = global.sessionStorage.getItem(ARRIVAL_SEEN_KEY) || '';
      var list = raw ? raw.split(',') : [];
      if (list.indexOf(id) === -1) list.push(id);
      global.sessionStorage.setItem(ARRIVAL_SEEN_KEY, list.join(','));
    } catch (e) { /* nothing to do: the arrival simply stays full */ }
  }

  // full ~1.55s / brief ~0.6s / reduced instant. Published to the machine as
  // data-traverom-arrival so a traveller's stylesheet can shorten its own
  // sweep to match rather than guessing at the timing.
  function arrivalPlan(cartId) {
    if (REDUCED) return { kind: 'reduced', hold: 250, commit: 60 };
    if (arrivalSeen(cartId)) return { kind: 'brief', hold: 620, commit: 320 };
    return { kind: 'full', hold: 1550, commit: 760 };
  }

  function launch(index) {
    // crt-bay passes cartridge ids ('vanir'); the console's own callers pass
    // numeric indices. Resolve ids here so a string never silently misses.
    if (typeof index === 'string') {
      var found = -1;
      for (var k = 0; k < cards.length; k++) {
        if (cards[k].cart && cards[k].cart.id === index) { found = k; break; }
      }
      if (found < 0) return false;
      index = found;
    }
    if (!externalActive || !open || possessing || !cards[index]) return false;
    var item = cards[index];
    possessing = true;
    open = false;
    var desktop = document.querySelector('.state-desktop');
    if (desktop) desktop.classList.remove('traverom-open');
    closeConsole();
    var plan = arrivalPlan(item.cart && item.cart.id);
    if (machine) machine.dataset.traveromArrival = plan.kind;
    possessClass(true, item.cart);
    markArrival(item.cart && item.cart.id);
    for (var i = 0; i < cards.length; i++) {
      cards[i].phase = i === index ? 'seat' : 'retract';
      cards[i].t = i === index ? 0 : 0.03 * i;
    }
    if (global.Liber && global.Liber.crtBay && global.Liber.crtBay.commitCartridge) {
      global.setTimeout(function () { global.Liber.crtBay.commitCartridge(item.cart.id); }, plan.commit);
    }
    global.setTimeout(function () {
      possessClass(false);
      possessing = false;
    }, plan.hold);
    return true;
  }

  function tick(deltaMS) {
    if (!externalActive || !deskMetrics) return;
    var dt = Math.min(0.05, (deltaMS || 16.7) / 1000);
    elapsed += dt;
    var m = deskMetrics;
    var holder = { x: m.frontX + m.frontW / 2, y: m.mouthY };
    var done = true;
    for (var i = 0; i < cards.length; i++) {
      var item = cards[i];
      if (!item.root) continue;   // masked-out card (tutorial solo stage)
      item.t += dt;
      var target = cardPosition(item.index, m);
      if (item.phase === 'summon') {
        var p = clamp(item.t / 0.62, 0, 1);
        var e = easeOut(p);
        item.root.visible = p > 0;
        item.root.alpha = 1;
        item.root.position.set(holder.x + (target.x - holder.x) * e, holder.y + (target.y - holder.y) * e);
        item.root.rotation = target.rotate * e;
        item.root.scale.set(0.24 + 0.76 * e);
        done = done && p >= 1;
      } else if (item.phase === 'retract') {
        var r = easeIn(clamp(item.t / 0.42, 0, 1));
        item.root.position.set(target.x + (holder.x - target.x) * r, target.y + (holder.y - target.y) * r);
        item.root.rotation = target.rotate * (1 - r);
        item.root.scale.set(1 - 0.82 * r);
        item.root.alpha = 1 - r;
        if (r >= 1) item.root.visible = false; else done = false;
      } else if (item.phase === 'seat') {
        var s = easeIn(clamp(item.t / (REDUCED ? 0.1 : 0.82), 0, 1));
        item.root.position.set(target.x + (holder.x - target.x) * s, target.y + (holder.y - target.y) * s);
        item.root.rotation = target.rotate * (1 - s);
        item.root.scale.set(1 - 0.78 * s);
        item.root.alpha = 1 - 0.25 * s;
        if (s >= 1) item.root.visible = false; else done = false;
      }
    }
    updatePossessionFx(m);
    if (opening && done) opening = false;
    positionCartridgeButtons();
  }

  function restoreNode(parent, node, nextSibling) {
    if (!parent || !node) return;
    if (nextSibling && nextSibling.parentNode === parent) parent.insertBefore(node, nextSibling);
    else parent.appendChild(node);
  }

  function cleanupMount() {
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = 0; }
    if (trayObserver) {
      trayObserver.disconnect();
      trayObserver = null;
    }
    if (stateUnsubscribe) {
      stateUnsubscribe();
      stateUnsubscribe = null;
    }
    if (tray && trayOriginalParent && tray.parentNode !== trayOriginalParent) {
      restoreNode(trayOriginalParent, tray, trayOriginalNextSibling);
    }
    if (well) well.classList.remove('traverom-pixi');
    if (deskCreated && desk && desk.parentNode) desk.parentNode.removeChild(desk);
    else if (deskOriginalParent && desk && desk.parentNode !== deskOriginalParent) {
      restoreNode(deskOriginalParent, desk, deskOriginalNextSibling);
    }
    if (desk) {
      desk.classList.remove('is-open', 'is-possessed');
      delete desk.dataset.traveromTraveller;
      delete desk.dataset.traveromArrival;
      ['--traverom-console-x', '--traverom-console-y', '--traverom-console-width', '--traverom-console-height', '--traverom-accent'].forEach(function (property) {
        desk.style.removeProperty(property);
      });
    }
    if (roomHost) {
      roomHost.classList.remove('traverom-tabletop-active');
      roomHost.style.removeProperty('--traverom-machine-width');
      roomHost.style.removeProperty('--traverom-machine-offset');
    }
    if (machine) {
      machine.classList.remove('traverom-possessed');
      delete machine.dataset.traveromTraveller;
      delete machine.dataset.traveromArrival;
      machine.style.removeProperty('--traverom-accent');
    }
    var screen = document.querySelector('.screen');
    if (screen) {
      screen.classList.remove('traverom-screen-lock');
      delete screen.dataset.traveromTraveller;
    }
    document.body.classList.remove('traverom-open');
    if (global.LiberTraveROM && global.LiberTraveROM.app === app) delete global.LiberTraveROM;
    externalActive = false;
    open = false;
    opening = false;
    possessing = false;
    app = null;
    layer = null;
    scene = null;
    desk = null;
    deskKey = null;
    vacuiPortElement = null;
    tray = null;
    viewport = null;
    deskMetrics = null;
    invalidateLayer = null;
    cards = [];
    consoleSkin = null;
    consolePrompt = null;
    trayOriginalParent = null;
    trayOriginalNextSibling = null;
    deskOriginalParent = null;
    deskOriginalNextSibling = null;
    deskCreated = false;
  }

  function ensureDesk() {
    if (!machine) machine = document.querySelector('.machine');
    if (!roomHost) roomHost = document.querySelector('.room');
    if (!roomHost || !machine) throw new Error('TraveROM requires the room and Vacui hosts');
    var node = roomHost.querySelector('.traverom-stage') || machine.querySelector('.traverom-stage');
    if (!node) {
      node = document.createElement('div');
      node.className = 'traverom-stage';
      deskCreated = true;
    }
    if (node.parentElement !== roomHost) {
      deskOriginalParent = node.parentNode;
      deskOriginalNextSibling = node.nextSibling;
      roomHost.appendChild(node);
    }
    desk = node;
    var key = desk.querySelector('.traverom-desk-key');
    if (!key) {
      key = document.createElement('button');
      key.type = 'button';
      key.className = 'traverom-desk-key';
      key.tabIndex = 0;
      key.setAttribute('aria-label', 'Open the TraveROM cartridge console');
      key.setAttribute('aria-expanded', 'false');
      key.setAttribute('aria-controls', 'crt-tray-grid');
      key.addEventListener('click', function () {
        if (possessing) return;
        if (open) closeConsole();
        else openConsole(true);
      });
      desk.appendChild(key);
    }
    deskKey = key;
    updateDeskKey();
    vacuiPortElement = desk.querySelector('.traverom-vacui-port');
    if (!vacuiPortElement) {
      vacuiPortElement = document.createElement('span');
      vacuiPortElement.className = 'traverom-vacui-port';
      vacuiPortElement.setAttribute('aria-hidden', 'true');
      desk.appendChild(vacuiPortElement);
    }
    return desk;
  }

  async function mount() {
    bay = document.querySelector('.crt-bay');
    well = document.querySelector('.crt-bay-well');
    roomHost = document.querySelector('.room');
    if (!bay || !well || !roomHost || app || mounting) return;
    var runtime = global.LiberPixiRuntime;
    if (!runtime) return;
    mounting = true;
    try {
      delete global.__liberTraveROMError;
      // The stage host must exist before registration: it is the layer's
      // canvas mount point (own-canvas layers render inside their host).
      machine = document.querySelector('.machine');
      ensureDesk();
      layer = await runtime.registerLayer({
        id: 'traverom-console',
        owner: 'src/trave-rom.js',
        host: desk,
        order: 20,
        // Own canvas: the shared page canvas sits at z 1, underneath the
        // machine (z 10), so the console painted there was swallowed wherever
        // the monitor's foot reached. The console renders into its own canvas
        // inside .traverom-stage (z 11), which the browser paints over the
        // machine — the console stands in front of it, as furniture should.
        ownCanvas: true,
        animated: true,
        onMount: function (context) {
          app = context.app;
          viewport = context.viewport;
          invalidateLayer = context.invalidate;
          REDUCED = context.reducedMotion;
          machine = document.querySelector('.machine');
          ensureDesk();
          tray = document.querySelector('.crt-bay-tray');
          if (!tray) throw new Error('TraveROM requires the semantic cartridge tray');
          trayOriginalParent = tray.parentNode;
          trayOriginalNextSibling = tray.nextSibling;
          desk.appendChild(tray);
          well.classList.add('traverom-pixi');
          externalActive = true;
          open = tray.classList.contains('out');
          scene = new PIXI.Container({ label: 'TraveROM tabletop' });
          scene.eventMode = 'none';
          context.root.addChild(scene);
          trayObserver = new MutationObserver(function () {
            var isOut = tray.classList.contains('out');
            if (isOut !== open && !possessing) setVisible(isOut, { focusFirst: isOut });
          });
          trayObserver.observe(tray, { attributes: true, attributeFilter: ['class'] });
          var state = global.Liber && global.Liber.state;
          if (state && typeof state.on === 'function') {
            stateUnsubscribe = state.on('change', function () {
              if (!externalActive) return;
              try {
                updateDeskKey();
                layout();
              } catch (error) {
                global.__liberTraveROMError = String((error && error.message) || error);
                console.error('TraveROM layout failed:', error);
              }
            });
          }
          layout(context);
        },
        onResize: function (context) {
          if (externalActive) layout(context);
        },
        onUpdate: function (context, deltaMS) {
          if (!externalActive) return;
          viewport = context.viewport;
          REDUCED = context.reducedMotion;
          tick(deltaMS);
        },
        onDispose: cleanupMount
      });
      app = layer.app;
      invalidateLayer = layer.invalidate;
      global.LiberTraveROM = {
        app: app,
        canvas: app.canvas,
        open: function () { return openConsole(true); },
        close: closeConsole,
        soloPoppet: soloPoppet,
        revealAll: revealAll,
        launch: function (id) {
          for (var i = 0; i < cards.length; i++) if (cards[i].cart.id === id) return launch(i);
          return false;
        },
        possession: function () { return possessing; },
        labels: function () { return cards.filter(function (item) { return item.label; }).map(function (item) { return item.label.text; }); },
        layoutFacts: layoutFacts,
        contract: {
          renderer: 'shared-pixi-runtime',
          holder: 'top-loading',
          placement: 'external-tabletop',
          owns: 'console, lamps, cartridge display, possession beat',
          mount: '.traverom-stage',
          layer: 'traverom-console',
          lights: 'state-fed',
          semanticDom: true,
          grid: 64,
          labelFloor: 14
        }
      };
    } catch (e) {
      cleanupMount();
      global.__liberTraveROMError = String((e && e.message) || e);
      console.error('TraveROM mount failed:', e);
    } finally {
      mounting = false;
    }
  }

  function boot() {
    var tries = 0;
    function retry() {
      if (app) return;
      if (!PIXI && global.PIXI) PIXI = global.PIXI;
      if (document.querySelector('.crt-bay-well') && PIXI && global.LiberPixiRuntime) {
        mount();
        return;
      }
      if (tries++ < 40) global.setTimeout(retry, 120);
    }
    retry();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window);
