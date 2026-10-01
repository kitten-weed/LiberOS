// poppet-rite.js — the tutorial's first making: paint a little of the doll
// HERE, on the desktop, instead of navigating the lab for the first pass.
//
// Four tabs, each a subsection of the REAL texture canvases (face / hair /
// clothes hull / chest sigil), full tools (brush + bucket + undo), and a
// small live 3D buddy beside the canvas sharing the same texture objects —
// a stroke lands in the same pixels the preview wears. Keeping writes a
// real keepsake + buddy mirror, which is what lifts the handoff lock.
//
// Classic script (desktop loads no module graph for this); three.js and the
// lab modules arrive via dynamic import on first open.
(function () {
  'use strict';

  var MOD = null;          // lazily imported modules
  var session = null;      // live rite session or null

  var INKS = ['#2b2016', '#b03a2a', '#c9962e', '#7fb069'];
  var SIZES = [6, 10, 18];

  // Default proportions — the same bare clay the lab starts from.
  var DEFAULT_P = {
    head: 0.42, chest: 1, waist: 0.55, hips: 1,
    arml: 1, armt: 1, legl: 1, legt: 1, flop: 0.45,
    pose: 'stand', showRig: false,
    worn: { robe: false, dress: false, top: false, hoodie: false, pants: false, bralet: false },
    thoughts: { fears: [], wishes: [], likes: [], dislikes: [], thoughts: [] }
  };

  function el(id) { return document.getElementById(id); }

  function loadModules() {
    if (MOD) return Promise.resolve(MOD);
    // NOTE: dynamic import() resolves against THIS script's URL (/src/),
    // not the page — hence the ../ prefixes (same layout as the lab's own
    // static imports). Keeps file://-safe relative addressing throughout.
    return Promise.all([
      import('../vendor/three.module.js'),
      import('../poppet-lab/doll.js?v=lab51'),
      import('../poppet-lab/surface.js?v=lab51'),
      import('../poppet-lab/keepsake.js?v=lab51')
    ]).then(function (m) {
      MOD = { THREE: m[0], doll: m[1], surface: m[2], keep: m[3] };
      return MOD;
    });
  }

  function inkName(hex) {
    return { '#2b2016': 'ink', '#b03a2a': 'blood', '#c9962e': 'gold', '#7fb069': 'moss' }[hex] || 'ink';
  }

  function open(opts) {
    opts = opts || {};
    if (session) { return session; }
    var stage = document.querySelector('.screen-stage');
    if (!stage) { if (opts.onDismiss) opts.onDismiss(); return null; }
    // Loading veil while the modules arrive — never a dead screen.
    var shell = document.createElement('div');
    shell.className = 'rite';
    shell.id = 'poppet-rite';
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-label', 'make the first poppet');
    shell.innerHTML = '<div class="rite-card"><p class="rite-line">waking the pigments…</p></div>';
    stage.appendChild(shell);
    session = { shell: shell, onKeep: opts.onKeep || null, onDismiss: opts.onDismiss || null, ready: false };
    loadModules().then(function () { build(session); }, function () {
      // Modules failed: hand back to the caller (tray/lab path) — never trap.
      close(true);
      if (opts.onDismiss) opts.onDismiss();
    });
    return session;
  }

  function build(s) {
    var THREE = MOD.THREE, dollMod = MOD.doll, surfaceMod = MOD.surface;
    var shell = s.shell;

    // ── the doll: real textures, owned by this rite ──
    var atlasCv = document.createElement('canvas');
    atlasCv.width = atlasCv.height = 1024;

    // Mini preview scene — house grade, one warm key, one cool rim.
    var pvRenderer, pvScene, pvCamera, doll;
    try {
      var pvCanvas = document.createElement('canvas');
      pvCanvas.className = 'rite-pv-canvas';
      pvRenderer = new THREE.WebGLRenderer({ canvas: pvCanvas, antialias: true });
      pvRenderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      pvRenderer.outputColorSpace = THREE.SRGBColorSpace;
      pvRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      pvRenderer.toneMappingExposure = 1.15;
      pvScene = new THREE.Scene();
      pvScene.background = new THREE.Color(0x14100a);
      pvScene.add(new THREE.HemisphereLight(0xffe2b8, 0x241708, 1.0));
      var key = new THREE.DirectionalLight(0xffdca8, 1.0);
      key.position.set(2, 3.2, 2.6);
      pvScene.add(key);
      var rim = new THREE.DirectionalLight(0x9ab0d0, 0.55);
      rim.position.set(-2.8, 2.4, -2.6);
      pvScene.add(rim);
      doll = dollMod.createDoll(pvScene, atlasCv, null, {
        rng: null, brush: function () { return { ink: s.ink, size: s.size }; }
      });
      doll.setParams(JSON.parse(JSON.stringify(DEFAULT_P)));
      // the preview always wears its shells — the rite paints all four and
      // the small one must show every stroke live, no layer gating.
      // rebuild() assembles the meshes (createDoll alone builds none).
      try { doll.rebuild('stand'); } catch (e) {}
      try { doll.setFaceShell(true); doll.setHulls(true); } catch (e) {}
      pvCamera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
      pvCamera.position.set(0, 1.2, 5.4);
      pvCamera.lookAt(0, 0.9, 0);
      s.pvCanvas = pvCanvas;
    } catch (e) {
      doll = null;
    }

    // ── worksurfaces on the doll's own canvases ──
    // NOTE: ws.el (the DISPLAY canvas for pointer mapping) must be set —
    // without it pos() collapses to 0,0 and every stroke lands in a corner.
    function wsFor(key) {
      var made;
      if (key === 'face') {
        var fm = doll.faceMaps.face;
        made = surfaceMod.makeWorksurface({ cv: fm.cv, tex: fm.tex, key: 'face' });
      } else if (key === 'hair') {
        var hm = doll.faceMaps.hair;
        made = surfaceMod.makeWorksurface({ cv: hm.cv, tex: hm.tex, key: 'hair' });
      } else if (key === 'clothes') {
        made = surfaceMod.makeWorksurface({ cv: doll.hullCanvas, tex: doll.hullTex, key: 'clothes', panels: doll.hullRects });
      } else {
        made = surfaceMod.makeWorksurface({ cv: atlasCv, tex: doll.bodyTex, key: 'body', panels: doll.ATLAS });
      }
      made.ws.el = made.ws.cv;
      return made;
    }

    s.ink = INKS[0]; s.size = SIZES[1]; s.tool = 'brush';
    s.sheets = { face: wsFor('face'), hair: wsFor('hair'), clothes: wsFor('clothes'), sigil: wsFor('body') };
    s.touched = { face: 0, hair: 0, clothes: 0, sigil: 0 };
    s.strokes = 0;
    s.tab = 'face';

    // ── the panel ──
    shell.innerHTML =
      '<div class="rite-card" role="document">'
      + '<div class="rite-head"><span class="rite-title">the first making</span>'
      + '<button class="rite-x" type="button" aria-label="close">×</button></div>'
      + '<p class="rite-line">a little of each — face, hair, clothes, a mark on the chest. the small one wears it live.</p>'
      + '<div class="rite-body">'
      + '<div class="rite-canvas-col">'
      + '<div class="rite-tabs" role="tablist">'
      + '<button class="rite-tab is-on" data-tab="face" role="tab">face</button>'
      + '<button class="rite-tab" data-tab="hair" role="tab">hair</button>'
      + '<button class="rite-tab" data-tab="clothes" role="tab">clothes</button>'
      + '<button class="rite-tab" data-tab="sigil" role="tab">sigil</button>'
      + '</div>'
      + '<div class="rite-sheet-wrap" id="rite-sheet"></div>'
      + '<div class="rite-tools">'
      + '<div class="rite-inks" id="rite-inks"></div>'
      + '<div class="rite-sizes" id="rite-sizes"></div>'
      + '<button class="rite-tool" data-tool="brush">brush</button>'
      + '<button class="rite-tool" data-tool="bucket">bucket</button>'
      + '<button class="rite-tool" id="rite-undo">undo</button>'
      + '</div>'
      + '</div>'
      + '<div class="rite-pv-col">'
      + '<div class="rite-pv" id="rite-pv"></div>'
      + '<p class="rite-hint" id="rite-hint">touch each of the four — then keep.</p>'
      + '<button class="rite-keep" id="rite-keep" type="button" disabled>keep the poppet</button>'
      + '</div>'
      + '</div>'
      + '</div>';

    var sheetWrap = shell.querySelector('#rite-sheet');
    var mark = document.createElement('div');
    mark.className = 'rite-chest-mark';
    mark.hidden = true;
    sheetWrap.appendChild(mark);
    var cv = s.sheets.face.cv;
    cv.classList.add('rite-sheet');
    sheetWrap.appendChild(cv);
    if (doll) {
      var pvBox = shell.querySelector('#rite-pv');
      pvBox.appendChild(s.pvCanvas);
      sizePreview();
    }

    // tabs
    shell.querySelectorAll('.rite-tab').forEach(function (b) {
      b.addEventListener('click', function () { setTab(b.dataset.tab); });
    });
    // inks
    var inksBox = shell.querySelector('#rite-inks');
    INKS.forEach(function (hex, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rite-ink' + (i === 0 ? ' is-on' : '');
      b.style.background = hex; b.title = inkName(hex);
      b.setAttribute('aria-label', 'ink ' + inkName(hex));
      b.addEventListener('click', function () {
        s.ink = hex;
        inksBox.querySelectorAll('.rite-ink').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
      inksBox.appendChild(b);
    });
    // sizes
    var sizesBox = shell.querySelector('#rite-sizes');
    SIZES.forEach(function (n, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rite-size' + (i === 1 ? ' is-on' : '');
      b.textContent = ['s', 'm', 'l'][i];
      b.setAttribute('aria-label', 'brush size ' + n);
      b.addEventListener('click', function () {
        s.size = n;
        sizesBox.querySelectorAll('.rite-size').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
      sizesBox.appendChild(b);
    });
    // brush / bucket
    shell.querySelectorAll('.rite-tool[data-tool]').forEach(function (b) {
      if (b.dataset.tool === 'brush') b.classList.add('is-on');
      b.addEventListener('click', function () {
        s.tool = b.dataset.tool;
        shell.querySelectorAll('.rite-tool[data-tool]').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
    });
    shell.querySelector('#rite-undo').addEventListener('click', function () {
      s.sheets[s.tab].undo();
    });
    shell.querySelector('.rite-x').addEventListener('click', function () { dismiss(); });
    shell.querySelector('#rite-keep').addEventListener('click', function () { keep(); });

    // ── strokes land through the worksurface ──
    var drawing = false, last = null;
    var bound = new Set();
    function bindCanvas(c) {
      if (bound.has(c)) return;
      bound.add(c);
      c.addEventListener('pointerdown', function (e) {
        if (s.tab !== c.dataset.tab) return;
        e.preventDefault();
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        drawing = true; last = null;
        stroke(e, true);
      });
      c.addEventListener('pointermove', function (e) { if (drawing) stroke(e, false); });
      c.addEventListener('pointerup', endStroke);
      c.addEventListener('pointercancel', endStroke);
    }
    function endStroke() { drawing = false; last = null; }

    function stroke(e, start) {
      var ws = s.sheets[s.tab];
      var p = ws.pos(e);
      if (start) ws.pushUndo();
      if (s.tool === 'bucket') {
        ws.fillAt(p.x, p.y, s.ink, 40);
        if (start) { touch(); }
        return;
      }
      var r = s.size / 2;
      if (last && !start) ws.stampLine(last.x, last.y, p.x, p.y, r, s.ink);
      else ws.stamp(p.x, p.y, r, s.ink);
      last = { x: p.x, y: p.y };
      touch();
    }

    function touch() {
      s.touched[s.tab]++; s.strokes++;
      if (s.tab === 'clothes' && doll.markHullPainted) { try { doll.markHullPainted(); } catch (e) {} }
      syncKeep();
    }

    function setTab(key) {
      s.tab = key;
      mark.hidden = (key !== 'sigil');
      // canvases keep their native aspect — never stretched (coords map 1:1)
      sheetWrap.style.aspectRatio = (key === 'clothes') ? '2 / 1' : '1 / 1';
      shell.querySelectorAll('.rite-tab').forEach(function (x) {
        x.classList.toggle('is-on', x.dataset.tab === key);
      });
      var old = sheetWrap.querySelector('canvas');
      if (old) sheetWrap.removeChild(old);
      cv = s.sheets[key].cv;
      cv.classList.add('rite-sheet');
      cv.dataset.tab = key;
      bindCanvas(cv);
      sheetWrap.insertBefore(cv, mark);
    }
    // initial canvas
    cv.dataset.tab = 'face';
    bindCanvas(cv);

    function syncKeep() {
      var done = s.touched.face > 0 && s.touched.hair > 0 && s.touched.clothes > 0 && s.touched.sigil > 0;
      var btn = shell.querySelector('#rite-keep');
      var hint = shell.querySelector('#rite-hint');
      btn.disabled = !done;
      if (hint) hint.textContent = done ? 'it wears everything. keep it.' : 'touch each of the four — then keep.';
    }

    function keep() {
      var n;
      try {
        n = MOD.keep.saveKeepsake(atlasCv, null, {
          P: JSON.parse(JSON.stringify(DEFAULT_P)),
          pose: 'stand', worn: {},
          ink: s.ink, brush: s.size,
          name: 'Poppet Nº 1',
          lesson: { tutorial: true, rite: 'first-making' },
          coverage: MOD.keep.atlasCoverage(doll.bodyCtx, doll.ATLAS)
        });
      } catch (e) { return; }
      // buddy mirror through state (fires change events; keepdrop's path is
      // lab-localStorage-direct and would skip them).
      try {
        var st = window.Liber && window.Liber.state;
        if (st) {
          var g = st.get() || {};
          var arr = Array.isArray(g.buddy) ? g.buddy.slice() : [];
          if (!arr.some(function (x) { return x && x.kind === 'poppet' && x.keepsakeN === n; })) {
            arr.push({ id: 'poppet-rite-' + n, kind: 'poppet', name: 'Poppet Nº ' + n, keepsakeN: n, ts: Date.now() });
            st.set({ buddy: arr });
          }
        }
      } catch (e) {}
      try { localStorage.setItem('poppet.keepsake.fresh', String(Date.now())); } catch (e) {}
      var cb = s.onKeep;
      teardown();
      if (cb) cb(n);
    }

    function dismiss() {
      if (s.strokes > 0 && !window.confirm('the first making is unfinished; leave it?')) return;
      var cb = s.onDismiss;
      teardown();
      if (cb) cb();
    }

    function sizePreview() {
      if (!pvRenderer || !pvCamera) return;
      var box = shell.querySelector('#rite-pv');
      var w = Math.max(2, box.clientWidth || 220), h = Math.max(2, box.clientHeight || 260);
      pvRenderer.setSize(w, h, false);
      pvCamera.aspect = w / Math.max(1, h);
      pvCamera.updateProjectionMatrix();
    }

    // gentle turntable while open — hidden frames cost nothing
    var raf = 0, lastT = 0;
    function loop(t) {
      if (!session) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      var dt = Math.min(0.05, (t - lastT) / 1000 || 0);
      lastT = t;
      try {
        if (doll && doll.body) doll.body.rotation.y += dt * 0.4;
        if (pvRenderer && pvScene && pvCamera) pvRenderer.render(pvScene, pvCamera);
      } catch (e) {}
    }

    function teardown() {
      try { cancelAnimationFrame(raf); } catch (e) {}
      if (shell.parentNode) shell.parentNode.removeChild(shell);
      if (session === s) session = null;
    }
    s.teardown = teardown;

    window.addEventListener('resize', sizePreview);
    s.ready = true;
    syncKeep();
    sizePreview();
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function close(silent) {
    if (!session) return;
    var s = session;
    try {
      cancelAnimationFrame(0);
      if (s.shell.parentNode) s.shell.parentNode.removeChild(s.shell);
    } catch (e) {}
    session = null;
  }

  window.LiberPoppetRite = { open: open, close: close };
})();
