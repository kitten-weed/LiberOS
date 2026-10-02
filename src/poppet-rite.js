// poppet-rite.js — the tutorial's first making: the FULL doll, major pieces.
// Six guided pieces (face, hair, chest mark, an arm, a leg, clothes) painted
// on the doll's own texture canvases, camera pushing into each piece while a
// small live buddy turns beside the sheet. Afterwards the workshop opens:
// keep and rest, or keep and walk into the lab to finish every piece.
// Both paths keep first — unfinished work never travels. The doll takes no
// pronouns anywhere in this flow.
//
// Classic script (desktop loads no module graph for this); three.js and the
// lab modules arrive via dynamic import on first open.
(function () {
  'use strict';

  var MOD = null;
  var session = null;

  // Shared first-making vocabulary (inks, sizes, proportions, sheet set)
  // lives in poppet-lab/paint-kit.js so the rite and the alt workshop
  // cannot drift apart. The lab keeps its own literals (freshP randomizes).
  var INKS = null, SIZES = null;

  // Step → surface + camera push (pos/look) + guide box (% of shown canvas,
  // canvas-y top-down: converted from the atlas uv fractions, bottom-up).
  // Boxes are suggestions ("a mark here") — paint anywhere counts.
  var STEPS = [
    { id: 'face', label: 'face', surf: 'face', hint: 'eyes, mouth — whatever it should be', cam: [[0, 1.55, 1.9], [0, 1.45, 0]], box: null },
    { id: 'eyes', label: 'eyes', surf: 'eyes', hint: 'the look in them', cam: [[0, 1.58, 1.6], [0, 1.48, 0]], box: null },
    { id: 'hair', label: 'hair', surf: 'hair', hint: 'crown it — wild, sleek, or gone', cam: [[0, 1.6, 2.0], [0, 1.5, 0]], box: null },
    { id: 'chest', label: 'the chest mark', surf: 'body', hint: 'a sigil over the heart', cam: [[0, 1.15, 2.6], [0, 1.05, 0]], box: [35, 68.5, 31, 30] },
    { id: 'arm', label: 'an arm', surf: 'body', hint: 'sleeves of scars or stars', cam: [[1.0, 1.0, 2.6], [0.5, 0.95, 0]], box: [1.5, 2, 11.5, 37] },
    { id: 'hand', label: 'a hand', surf: 'body', hint: 'what it holds, what it lets go', cam: [[0.9, 0.8, 2.2], [0.4, 0.75, 0]], box: [1.5, 41, 9, 9] },
    { id: 'leg', label: 'a leg', surf: 'body', hint: 'stockings, wounds, maps', cam: [[0.6, 0.45, 2.8], [0.25, 0.4, 0]], box: [49, 2, 11.5, 37] },
    { id: 'foot', label: 'a foot', surf: 'body', hint: 'where it has walked', cam: [[0.5, 0.3, 2.4], [0.2, 0.3, 0]], box: [21.5, 41, 11, 9] },
    { id: 'clothes', label: 'clothes', surf: 'clothes', hint: 'the hulls appear where you paint them', cam: [[0, 1.0, 4.6], [0, 0.95, 0]], box: null }
  ];

  function inkName(hex) { return MOD.kit.inkName(hex); }

  function loadModules() {
    if (MOD) return Promise.resolve(MOD);
    // NOTE: dynamic import() resolves against THIS script's URL (/src/),
    // not the page — hence the ../ prefixes (same layout as the lab's own
    // static imports). Keeps file://-safe relative addressing throughout.
    return Promise.all([
      import('../vendor/three.module.js'),
      import('../poppet-lab/doll.js?v=lab53'),
      import('../poppet-lab/surface.js?v=lab53'),
      import('../poppet-lab/keepsake.js?v=lab53'),
      import('../poppet-lab/paint-kit.js?v=kit1')
    ]).then(function (m) {
      MOD = { THREE: m[0], doll: m[1], surface: m[2], keep: m[3], kit: m[4] };
      INKS = m[4].INKS; SIZES = m[4].SIZES;
      return MOD;
    });
  }

  function open(opts) {
    opts = opts || {};
    if (session) { return session; }
    var stage = document.querySelector('.screen-stage');
    if (!stage) { if (opts.onDismiss) opts.onDismiss(); return null; }
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
    var THREE = MOD.THREE, dollMod = MOD.doll;
    var shell = s.shell;

    // ── the doll: real textures, owned by this rite ──
    var atlasCv = document.createElement('canvas');
    atlasCv.width = atlasCv.height = 1024;
    atlasCv.getContext('2d', { willReadFrequently: true });

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
      doll.setParams(MOD.kit.defaultProportions());
      doll.rebuild('stand');
      // the preview always wears its shells — every stroke shows live.
      try { doll.setFaceShell(true); doll.setHulls(true); } catch (e) {}
      pvCamera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
      pvCamera.position.set(0, 1.55, 1.9);
      pvCamera.lookAt(0, 1.45, 0);
      s.pvCanvas = pvCanvas;
    } catch (e) { doll = null; }

    // ── worksurfaces on the doll's own canvases, via the shared kit ──
    s.sheets = MOD.kit.buildSheetSet(doll, atlasCv);

    s.ink = INKS[0]; s.size = SIZES[1]; s.tool = 'brush';
    s.touched = {}; s.idx = 0; s.strokes = 0; s.kept = false;
    STEPS.forEach(function (st) { s.touched[st.id] = 0; });

    // ── the panel ──
    var tabsHtml = STEPS.map(function (st, i) {
      return '<button class="rite-tab' + (i === 0 ? ' is-on' : '') + '" data-i="' + i + '" role="tab">' + st.label + '</button>';
    }).join('');
    shell.innerHTML =
      '<div class="rite-card" role="document">'
      + '<div class="rite-head"><span class="rite-title">the first making</span>'
      + '<button class="rite-x" type="button" aria-label="close">×</button></div>'
      + '<p class="rite-line">the whole doll, piece by piece. the small one wears every stroke live.</p>'
      + '<div class="rite-body">'
      + '<div class="rite-canvas-col">'
      + '<p class="rite-progress" id="rite-progress"></p>'
      + '<div class="rite-tabs" role="tablist">' + tabsHtml + '</div>'
      + '<div class="rite-sheet-wrap" id="rite-sheet"></div>'
      + '<div class="rite-tools">'
      + '<div class="rite-inks" id="rite-inks"></div>'
      + '<div class="rite-sizes" id="rite-sizes"></div>'
      + '<button class="rite-tool is-on" data-tool="brush">brush</button>'
      + '<button class="rite-tool" data-tool="bucket">bucket</button>'
      + '<button class="rite-tool" id="rite-undo">undo</button>'
      + '</div>'
      + '<p class="rite-hint" id="rite-hint"></p>'
      + '<div class="rite-nav">'
      + '<button id="rite-back" type="button">← back</button>'
      + '<button id="rite-next" type="button">next →</button>'
      + '</div>'
      + '</div>'
      + '<div class="rite-pv-col">'
      + '<div class="rite-pv" id="rite-pv"></div>'
      + '<div class="rite-reveal" id="rite-reveal" hidden>'
      + '<p class="rite-workshop-line">safe. the workshop is open — every piece lives there. return anytime.</p>'
      + '<button class="rite-keep" id="rite-keep" type="button">keep</button>'
      + '<button class="rite-refine" id="rite-refine" type="button">keep &amp; open the workshop</button>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '</div>';

    var sheetWrap = shell.querySelector('#rite-sheet');
    var mark = document.createElement('div');
    mark.className = 'rite-chest-mark';
    sheetWrap.appendChild(mark);
    var pvBox = shell.querySelector('#rite-pv');
    if (doll && s.pvCanvas) { pvBox.appendChild(s.pvCanvas); sizePreview(); }

    // ── strokes ──
    var drawing = false, last = null;
    var bound = new Set();
    function ws() { return s.sheets[STEPS[s.idx].surf]; }
    function cv() { return ws().ws.cv; }
    function bindCanvas(c) {
      if (bound.has(c)) return;
      bound.add(c);
      c.addEventListener('pointerdown', function (e) {
        if (c !== cv()) return;
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
      var w = ws();
      var p = w.pos(e);
      if (start) w.pushUndo();
      if (s.tool === 'bucket') { w.fillAt(p.x, p.y, s.ink, 40); }
      else {
        var r = s.size / 2;
        if (last && !start) w.stampLine(last.x, last.y, p.x, p.y, r, s.ink);
        else w.stamp(p.x, p.y, r, s.ink);
        last = { x: p.x, y: p.y };
      }
      touch();
    }
    function touch() {
      s.touched[STEPS[s.idx].id]++; s.strokes++;
      if (STEPS[s.idx].surf === 'clothes' && doll.markHullPainted) {
        try { doll.markHullPainted(); } catch (e) {}
      }
      syncReveal();
    }

    // ── steps ──
    var camGoal = { pos: new THREE.Vector3(0, 1.55, 1.9), look: new THREE.Vector3(0, 1.45, 0) };
    function showStep(i) {
      s.idx = i;
      var step = STEPS[i];
      shell.querySelector('#rite-progress').textContent =
        'piece ' + (i + 1) + ' of ' + STEPS.length + ' — ' + step.label;
      shell.querySelector('#rite-hint').textContent = step.hint;
      shell.querySelectorAll('.rite-tab').forEach(function (x, xi) {
        x.classList.toggle('is-on', xi === i);
      });
      var old = sheetWrap.querySelector('canvas');
      if (old) sheetWrap.removeChild(old);
      var c = cv();
      c.classList.add('rite-sheet');
      sheetWrap.insertBefore(c, mark);
      mark.hidden = !step.box;
      if (step.box) {
        mark.style.left = step.box[0] + '%'; mark.style.top = step.box[1] + '%';
        mark.style.width = step.box[2] + '%'; mark.style.height = step.box[3] + '%';
      }
      sheetWrap.style.aspectRatio = (step.surf === 'clothes') ? '2 / 1' : '1 / 1';
      bindCanvas(c);
      camGoal.pos.set(step.cam[0][0], step.cam[0][1], step.cam[0][2]);
      camGoal.look.set(step.cam[1][0], step.cam[1][1], step.cam[1][2]);
      shell.querySelector('#rite-back').disabled = (i === 0);
      shell.querySelector('#rite-next').disabled = (i === STEPS.length - 1);
    }
    shell.querySelectorAll('.rite-tab').forEach(function (x) {
      x.addEventListener('click', function () { showStep(Number(x.dataset.i)); });
    });
    shell.querySelector('#rite-back').addEventListener('click', function () {
      if (s.idx > 0) showStep(s.idx - 1);
    });
    shell.querySelector('#rite-next').addEventListener('click', function () {
      if (s.idx < STEPS.length - 1) showStep(s.idx + 1);
    });

    // tools
    var inksBox = shell.querySelector('#rite-inks');
    INKS.forEach(function (hex, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rite-ink' + (i === 0 ? ' is-on' : '');
      b.style.background = hex;
      b.setAttribute('aria-label', 'ink ' + inkName(hex));
      b.addEventListener('click', function () {
        s.ink = hex;
        inksBox.querySelectorAll('.rite-ink').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
      inksBox.appendChild(b);
    });
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
    shell.querySelectorAll('.rite-tool[data-tool]').forEach(function (b) {
      b.addEventListener('click', function () {
        s.tool = b.dataset.tool;
        shell.querySelectorAll('.rite-tool[data-tool]').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
    });
    shell.querySelector('#rite-undo').addEventListener('click', function () { ws().undo(); });
    shell.querySelector('.rite-x').addEventListener('click', function () { dismiss(); });

    // ── the reveal: workshop open, keep or keep-editing ──
    function revealed() {
      return STEPS.every(function (st) { return s.touched[st.id] > 0; });
    }
    function syncReveal() {
      var done = revealed();
      shell.querySelector('#rite-reveal').hidden = !done;
      if (done) {
        var h = shell.querySelector('#rite-hint');
        if (h) h.textContent = 'every piece touched. ready.';
      }
    }
    function keepThen(cb) {
      if (s.kept) { if (cb) cb(); return; }
      var n;
      try {
        var sheets = MOD.keep.snapshotDollSheets(doll);
        n = MOD.keep.saveKeepsake(atlasCv, null, {
          P: MOD.kit.defaultProportions(),
          pose: 'stand', worn: {},
          ink: s.ink, brush: s.size,
          name: 'Poppet Nº 1',
          lesson: { tutorial: true, rite: 'first-making' },
          coverage: MOD.keep.atlasCoverage(doll.bodyCtx, doll.ATLAS),
          face: sheets.face,
          hull: sheets.hull
        });
      } catch (e) { return; }
      MOD.keep.mirrorKeepsakeToBuddy(n, 'Poppet Nº ' + n, 'poppet-rite');
      try { localStorage.setItem('poppet.keepsake.fresh', String(Date.now())); } catch (e) {}
      s.kept = true;
      var cb2 = s.onKeep;
      teardown();
      if (cb) cb();
      if (cb2) cb2(n);
    }
    shell.querySelector('#rite-keep').addEventListener('click', function () { keepThen(null); });
    shell.querySelector('#rite-refine').addEventListener('click', function () {
      // kept first (nothing travels unkept), then the workshop doors open.
      keepThen(function () { location.href = 'sigil.html'; });
    });

    function dismiss() {
      if (s.strokes > 0 && !s.kept && !window.confirm('the first making is unfinished; leave it?')) return;
      var cb = s.onDismiss;
      teardown();
      if (cb) cb();
    }

    function sizePreview() {
      if (!pvRenderer || !pvCamera) return;
      var w = Math.max(2, pvBox.clientWidth || 220), h = Math.max(2, pvBox.clientHeight || 260);
      pvRenderer.setSize(w, h, false);
      pvCamera.aspect = w / Math.max(1, h);
      pvCamera.updateProjectionMatrix();
    }

    var raf = 0, lastT = 0;
    function loop(t) {
      if (!session) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      var dt = Math.min(0.05, (t - lastT) / 1000 || 0);
      lastT = t;
      try {
        var k = 1 - Math.exp(-dt / 1.1);
        pvCamera.position.lerp(camGoal.pos, k);
        // lookAt needs the goal, not a drifted accumulation
        pvCamera.lookAt(camGoal.look);
        if (doll && doll.body) doll.body.rotation.y += dt * 0.35;
        if (pvRenderer && pvScene && pvCamera) pvRenderer.render(pvScene, pvCamera);
      } catch (e) {}
    }

    function teardown() {
      try { cancelAnimationFrame(raf); } catch (e) {}
      // release GPU: geometries, materials and the renderer context would
      // otherwise leak one WebGL context per open (browsers cap ~16).
      try {
        if (pvScene) {
          pvScene.traverse(function (o) {
            if (o.geometry) { try { o.geometry.dispose(); } catch (e) {} }
            var mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
            mats.forEach(function (mt) { try { mt.dispose(); } catch (e) {} });
          });
        }
        if (pvRenderer) { try { pvRenderer.dispose(); } catch (e) {} }
      } catch (e) {}
      if (shell.parentNode) shell.parentNode.removeChild(shell);
      if (session === s) session = null;
    }
    s.teardown = teardown;

    window.addEventListener('resize', sizePreview);
    s.ready = true;
    showStep(0);
    syncReveal();
    sizePreview();
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function close() {
    if (!session) return;
    var s = session;
    try {
      if (s.shell.parentNode) s.shell.parentNode.removeChild(s.shell);
    } catch (e) {}
    session = null;
  }

  window.LiberPoppetRite = { open: open, close: close };
})();
