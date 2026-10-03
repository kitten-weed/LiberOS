// poppet-rite.js — the tutorial's first making: the FULL doll, major pieces.
// Nine guided beats paint the doll's own texture canvases while its full
// articulated form stays beside the sheet. Afterwards the workshop opens:
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

  // Step → surface + guide box (% of shown canvas, top-down).
  // Boxes are suggestions ("a mark here") — paint anywhere counts.
  var STEPS = [
    { id: 'face', label: 'face', surf: 'face', hint: 'eyes, mouth — whatever it should be', box: null },
    { id: 'eyes', label: 'eyes', surf: 'eyes', hint: 'the look in them', box: null },
    { id: 'hair', label: 'hair', surf: 'hair', hint: 'crown it — wild, sleek, or gone', box: null },
    { id: 'chest', label: 'the chest mark', surf: 'body', hint: 'a sigil over the heart', box: [35, 68.5, 7.75, 30] },
    { id: 'arm', label: 'an arm', surf: 'body', hint: 'sleeves of scars or stars', box: [1.5, 2, 2.875, 37] },
    { id: 'hand', label: 'a hand', surf: 'body', hint: 'what it holds, what it lets go', box: [1.5, 41, 4.5, 9] },
    { id: 'leg', label: 'a leg', surf: 'body', hint: 'stockings, wounds, maps', box: [49, 2, 2.875, 37] },
    { id: 'foot', label: 'a foot', surf: 'body', hint: 'where it has walked', box: [21.5, 41, 5.5, 9] },
    { id: 'clothes', label: 'clothes', surf: 'clothes', hint: 'the hulls appear where you paint them', box: [0, 25, 100, 50] }
  ];

  function inkName(hex) { return MOD.kit.inkName(hex); }

  function loadModules() {
    if (MOD) return Promise.resolve(MOD);
    // NOTE: dynamic import() resolves against THIS script's URL (/src/),
    // not the page — hence the ../ prefixes (same layout as the lab's own
    // static imports). Keeps file://-safe relative addressing throughout.
    return Promise.all([
      import('../vendor/three.module.js'),
      import('../poppet-lab/doll.js?v=lab57'),
      import('../poppet-lab/frame-doll.js?v=frame1'),
      import('../poppet-lab/surface.js?v=lab53'),
      import('../poppet-lab/keepsake.js?v=lab55'),
      import('../poppet-lab/keep-commit.js?v=commit1'),
      import('../poppet-lab/paint-kit.js?v=kit3')
    ]).then(function (m) {
      MOD = { THREE: m[0], doll: m[1], framing: m[2], surface: m[3], keep: m[4], commit: m[5], kit: m[6] };
      INKS = m[6].INKS; SIZES = m[6].SIZES;
      return MOD;
    });
  }

  function startLoad(active) {
    active.ready = false;
    active.failed = false;
    active.shell.setAttribute('aria-busy', 'true');
    active.shell.classList.remove('is-commit-pending');
    active.shell.innerHTML = '<div class="rite-card"><p class="rite-line" role="status">waking the pigments…</p></div>';
    loadModules().then(function () {
      if (session !== active || active.closed) return;
      build(active);
    }).catch(function (error) {
      if (session === active && !active.closed) failSession(active, error);
    });
  }

  function open(opts) {
    opts = opts || {};
    if (session) { return session; }
    var stage = document.querySelector('.screen-stage');
    if (!stage) {
      var stageError = new Error('first-making stage is unavailable');
      if (opts.onError) opts.onError(stageError, null);
      return null;
    }
    var shell = document.createElement('div');
    shell.className = 'rite';
    shell.id = 'poppet-rite';
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-label', 'make the first poppet');
    shell.setAttribute('tabindex', '-1');
    shell.setAttribute('aria-busy', 'true');
    shell.innerHTML = '<div class="rite-card"><p class="rite-line">waking the pigments…</p></div>';
    stage.appendChild(shell);
    session = {
      shell: shell,
      onKeep: opts.onKeep || null,
      onDismiss: opts.onDismiss || null,
      onReady: opts.onReady || null,
      onError: opts.onError || null,
      ready: false,
      closed: false,
      failed: false,
      strokes: 0,
      kept: false
    };
    var active = session;
    active.requestDismiss = function () { return requestDismiss(active); };
    if (typeof shell.focus === 'function') shell.focus({preventScroll: true});
    startLoad(active);
    return active;
  }

  function disposeResources(s) {
    try {
      if (s.raf) cancelAnimationFrame(s.raf);
    } catch (error) { console.error('poppet rite animation cleanup failed', error); }
    s.raf = 0;
    try {
      if (s.onResize) window.removeEventListener('resize', s.onResize);
    } catch (error) { console.error('poppet rite resize cleanup failed', error); }
    s.onResize = null;
    if (s.pvScene) {
      try {
        s.pvScene.traverse(function (object) {
          if (object.geometry) {
            try { object.geometry.dispose(); }
            catch (error) { console.error('poppet rite geometry cleanup failed', error); }
          }
          var materials = object.material
            ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
          materials.forEach(function (material) {
            try { material.dispose(); }
            catch (error) { console.error('poppet rite material cleanup failed', error); }
          });
        });
      } catch (error) { console.error('poppet rite scene cleanup failed', error); }
      s.pvScene = null;
    }
    if (s.pvRenderer) {
      try { s.pvRenderer.dispose(); }
      catch (error) { console.error('poppet rite renderer cleanup failed', error); }
      s.pvRenderer = null;
    }
    s.pvCanvas = null;
  }

  function teardownSession(s) {
    if (!s || s.closed) return false;
    s.closed = true;
    disposeResources(s);
    try {
      if (s.shell && s.shell.parentNode) s.shell.parentNode.removeChild(s.shell);
    } catch (error) { console.error('poppet rite shell cleanup failed', error); }
    if (session === s) session = null;
    return true;
  }

  function requestDismiss(s) {
    if (!s || s.closed || session !== s) return false;
    var primarySaved = !!(s.keepCommit && s.keepCommit.pending);
    if (s.strokes > 0 && !s.kept && !primarySaved &&
        !window.confirm('the first making is unfinished; leave it?')) {
      return false;
    }
    var onDismiss = s.onDismiss;
    teardownSession(s);
    if (onDismiss) onDismiss(s);
    return true;
  }

  function failSession(s, error) {
    disposeResources(s);
    s.ready = false;
    s.failed = true;
    s.shell.removeAttribute('aria-busy');
    s.shell.classList.remove('is-commit-pending');
    s.shell.innerHTML = '<div class="rite-card"><p class="rite-line" role="status">'
      + 'the pigments did not wake. try again.</p><button class="rite-retry" type="button">try again</button></div>';
    var retry = s.shell.querySelector('.rite-retry');
    retry.addEventListener('click', function () {
      if (session === s && !s.closed) startLoad(s);
    });
    if (typeof retry.focus === 'function') retry.focus({preventScroll: true});
    if (window.console && window.console.error) window.console.error('poppet rite setup failed', error);
    if (s.onError) s.onError(error, s);
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
      s.pvRenderer = pvRenderer;
      pvRenderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      pvRenderer.outputColorSpace = THREE.SRGBColorSpace;
      pvRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      pvRenderer.toneMappingExposure = 1.15;
      pvScene = new THREE.Scene();
      s.pvScene = pvScene;
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
      doll.physicsFrame(0);
      pvCamera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
      pvCamera.position.set(0, 1.55, 1.9);
      pvCamera.lookAt(0, 1.45, 0);
      s.pvCanvas = pvCanvas;
    } catch (error) { throw error; }

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
      + '<div class="rite-head">'
      + '<div class="rite-head-main"><span class="rite-title">the first making</span>'
      + '<span class="rite-progress" id="rite-progress"></span></div>'
      + '<p class="rite-line" aria-live="polite">the whole doll, piece by piece. the small one wears every stroke live.</p>'
      + '<button class="rite-x" type="button" aria-label="close">×</button></div>'
      + '<div class="rite-tabs" role="tablist">' + tabsHtml + '</div>'
      + '<div class="rite-body">'
      + '<div class="rite-canvas-col">'
      + '<div class="rite-sheet-wrap" id="rite-sheet"></div>'
      + '<div class="rite-palette-row"><div class="rite-inks" id="rite-inks"></div>'
      + '<button class="rite-tool" id="rite-undo" type="button">undo</button></div>'
      + '<div class="rite-tool-row">'
      + '<div class="rite-sizes" id="rite-sizes"></div>'
      + '<button class="rite-tool is-on" data-tool="brush">brush</button>'
      + '<button class="rite-tool" data-tool="bucket">bucket</button></div>'
      + '</div>'
      + '<div class="rite-pv-col"><div class="rite-pv" id="rite-pv"></div>'
      + '<p class="rite-hint" id="rite-hint"></p></div>'
      + '</div>'
      + '<div class="rite-footer">'
      + '<div class="rite-nav"><button id="rite-back" type="button">← back</button>'
      + '<button id="rite-next" type="button">next →</button></div>'
      + '<div class="rite-reveal" id="rite-reveal" hidden>'
      + '<button class="rite-keep" id="rite-keep" type="button">keep</button>'
      + '<button class="rite-refine" id="rite-refine" type="button">keep &amp; open the workshop</button>'
      + '</div></div>'
      + '</div>';

    var sheetWrap = shell.querySelector('#rite-sheet');
    var mark = document.createElement('div');
    mark.className = 'rite-chest-mark';
    sheetWrap.appendChild(mark);
    var displayCanvas = document.createElement('canvas');
    displayCanvas.width = displayCanvas.height = 512;
    displayCanvas.className = 'rite-sheet';
    displayCanvas.setAttribute('aria-label', 'poppet paint sheet');
    var displayCtx = displayCanvas.getContext('2d');
    sheetWrap.insertBefore(displayCanvas, mark);
    var pvBox = shell.querySelector('#rite-pv');
    if (doll && s.pvCanvas) pvBox.appendChild(s.pvCanvas);
    var introText = 'the whole doll, piece by piece. the small one wears every stroke live.';
    var completedText = 'safe. the workshop is open — every piece lives there. return anytime.';
    var headerLine = shell.querySelector('.rite-line');
    function renderHeader() {
      headerLine.textContent = s.headerStatus || (revealed() ? completedText : introText);
    }

    // ── strokes ──
    var drawing = false, last = null, undoCaptured = false;
    function ws() { return s.sheets[STEPS[s.idx].surf]; }
    function redrawDisplay() {
      var active = ws();
      active.ws.el = displayCanvas;
      active.redraw(displayCtx, displayCanvas.width, displayCanvas.height);
    }
    displayCanvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { displayCanvas.setPointerCapture(e.pointerId); } catch (error) {}
      drawing = true;
      last = null;
      undoCaptured = false;
      paintDisplay(e, true);
    });
    displayCanvas.addEventListener('pointermove', function (e) {
      if (drawing) paintDisplay(e, false);
    });
    displayCanvas.addEventListener('pointerup', endStroke);
    displayCanvas.addEventListener('pointercancel', endStroke);
    function endStroke() { drawing = false; last = null; undoCaptured = false; }
    function paintDisplay(e, start) {
      var active = ws();
      var p = active.pos(e);
      if (p.x < 0 || p.y < 0 || p.x > active.cv.width || p.y > active.cv.height) {
        last = null;
        return;
      }
      if (!undoCaptured) { active.pushUndo(); undoCaptured = true; }
      if (s.tool === 'bucket') {
        active.fillAt(p.x, p.y, s.ink, 40);
      } else if (last && !start) {
        active.stampLine(last.x, last.y, p.x, p.y, s.size / 2, s.ink);
      } else {
        active.stamp(p.x, p.y, s.size / 2, s.ink);
      }
      last = { x: p.x, y: p.y };
      touch();
      redrawDisplay();
    }
    function touch() {
      s.touched[STEPS[s.idx].id]++; s.strokes++;
      if (STEPS[s.idx].surf === 'clothes' && doll.markHullPainted) doll.markHullPainted();
      syncReveal();
    }

    // ── steps ──
    var camGoal = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    var frameStepReady = false;
    function updateFrameGoal() {
      doll.body.updateWorldMatrix(true, true);
      pvScene.updateMatrixWorld(true);
      var goal = MOD.framing.dollFrameGoal(pvCamera, doll, 'all', 0.1);
      camGoal.pos.copy(goal.pos);
      camGoal.look.copy(goal.look);
    }
    function showStep(i) {
      drawing = false;
      last = null;
      undoCaptured = false;
      s.idx = i;
      var step = STEPS[i];
      mark.classList.toggle('rite-hull-guide', step.id === 'clothes');
      shell.querySelector('#rite-progress').textContent =
        'piece ' + (i + 1) + ' of ' + STEPS.length + ' — ' + step.label;
      shell.querySelector('#rite-hint').textContent = step.hint;
      s.headerStatus = null;
      renderHeader();
      shell.querySelectorAll('.rite-tab').forEach(function (x, xi) {
        x.classList.toggle('is-on', xi === i);
      });
      ws().ws.el = displayCanvas;
      mark.hidden = !step.box;
      if (step.box) {
        mark.style.left = step.box[0] + '%'; mark.style.top = step.box[1] + '%';
        mark.style.width = step.box[2] + '%'; mark.style.height = step.box[3] + '%';
      }
      redrawDisplay();
      updateFrameGoal();
      frameStepReady = true;
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
    shell.querySelector('#rite-undo').addEventListener('click', function () {
      ws().undo();
      redrawDisplay();
    });
    shell.querySelector('.rite-x').addEventListener('click', function () { dismiss(); });

    // ── the reveal: workshop open, keep or keep-editing ──
    function revealed() {
      return STEPS.every(function (st) { return s.touched[st.id] > 0; });
    }
    function syncReveal() {
      var done = revealed();
      shell.querySelector('#rite-reveal').hidden = !done;
      renderHeader();
      if (done) {
        var h = shell.querySelector('#rite-hint');
        if (h) h.textContent = 'every piece touched. ready.';
      }
    }
    function keepFail(msg) {
      var h = shell.querySelector('#rite-hint');
      if (h) h.textContent = msg;
      s.headerStatus = msg;
      renderHeader();
      s.saving = false;
      s.pendingDestination = null;
      shell.classList.remove('is-commit-pending');
      var keep = shell.querySelector('#rite-keep');
      var refine = shell.querySelector('#rite-refine');
      if (keep) keep.disabled = false;
      if (refine) refine.disabled = false;
    }
    function keepPatch(destination) {
      var flow = window.LiberTutorialFlow;
      if (!flow || !Array.isArray(flow.ORDER)) throw new Error('tutorial cursor helper is unavailable');
      var index = flow.ORDER.indexOf('beat-017');
      if (index < 0) throw new Error('first-making return cursor is unavailable');
      return Object.assign({}, flow.patchAt(index), { tutorialPaused: destination === 'workshop' });
    }
    var commit = MOD.commit.createKeepCommit({
      idPrefix: 'poppet-rite',
      capture: function () {
        var sheets = MOD.keep.snapshotDollSheets(doll);
        return {
          atlasCv: atlasCv,
          clothCv: null,
          spec: {
            P: MOD.kit.defaultProportions(),
            pose: 'stand', worn: {},
            ink: s.ink, brush: s.size,
            name: 'Poppet Nº 1',
            lesson: { tutorial: true, rite: 'first-making' },
            coverage: MOD.keep.atlasCoverage(doll.bodyCtx, doll.ATLAS),
            face: sheets.face,
            hull: sheets.hull
          }
        };
      }
    });
    s.keepCommit = commit;
    function keepThen(destination) {
      if (!revealed()) return;
      if (s.pendingDestination && s.pendingDestination !== destination) return;
      if (s.saving) return;
      // re-entrancy latch: the PNG encode takes hundreds of ms, and a second
      // click inside that window would mint a second poppet. Buttons lock
      // until the save settles either way.
      s.saving = true;
      s.headerStatus = null;
      renderHeader();
      var keep = shell.querySelector('#rite-keep');
      var refine = shell.querySelector('#rite-refine');
      if (keep) keep.disabled = true;
      if (refine) refine.disabled = true;
      var result;
      try {
        result = commit.commit(keepPatch(destination));
      } catch (error) {
        result = { ok: false, stage: 'primary', error: error };
      }
      if (!result.ok && result.stage === 'primary') {
        keepFail('the keep failed. your paint is still here. try again.');
        return;
      }
      if (!result.ok) {
        s.pendingDestination = destination;
        s.saving = false;
        shell.classList.add('is-commit-pending');
        s.headerStatus = 'the poppet is kept, but its book mark failed. try again.';
        renderHeader();
        if (keep) {
          keep.disabled = destination !== 'home';
          if (destination === 'home') keep.textContent = 'try again';
        }
        if (refine) {
          refine.disabled = destination !== 'workshop';
          if (destination === 'workshop') refine.textContent = 'try again';
        }
        shell.querySelectorAll('.rite-tab, .rite-ink, .rite-size, .rite-tool, #rite-back, #rite-next').forEach(function (button) {
          button.disabled = true;
        });
        displayCanvas.style.pointerEvents = 'none';
        return;
      }
      s.kept = true;
      var onKeep = s.onKeep;
      teardownSession(s);
      try { localStorage.setItem('poppet.keepsake.fresh', String(Date.now())); }
      catch (error) { console.error('poppet fresh marker could not be stored', error); }
      if (onKeep) onKeep(result, destination, s);
    }
    shell.querySelector('#rite-keep').addEventListener('click', function () { keepThen('home'); });
    shell.querySelector('#rite-refine').addEventListener('click', function () {
      keepThen('workshop');
    });

    function dismiss() {
      return requestDismiss(s);
    }

    function sizePreview() {
      if (!pvRenderer || !pvCamera) return;
      var w = Math.max(2, pvBox.clientWidth || 220), h = Math.max(2, pvBox.clientHeight || 260);
      pvRenderer.setSize(w, h, false);
      pvCamera.aspect = w / Math.max(1, h);
      pvCamera.updateProjectionMatrix();
      if (frameStepReady) updateFrameGoal();
    }

    var raf = 0, lastT = 0;
    function loop(t) {
      if (!session) return;
      s.raf = requestAnimationFrame(loop);
      raf = s.raf;
      if (document.hidden) return;
      var dt = Math.min(0.05, (t - lastT) / 1000 || 0);
      lastT = t;
      try {
        doll.physicsFrame(dt);
        var k = 1 - Math.exp(-dt / 1.1);
        pvCamera.position.lerp(camGoal.pos, k);
        // lookAt needs the goal, not a drifted accumulation
        pvCamera.lookAt(camGoal.look);
        if (pvRenderer && pvScene && pvCamera) pvRenderer.render(pvScene, pvCamera);
      } catch (error) {
        if (session === s && !s.closed) failSession(s, error);
      }
    }

    s.onResize = function () {
      try { sizePreview(); }
      catch (error) {
        if (session === s && !s.closed) failSession(s, error);
      }
    };
    s.pvScene = pvScene;
    s.pvRenderer = pvRenderer;
    window.addEventListener('resize', s.onResize);
    s.ready = true;
    s.failed = false;
    s.shell.removeAttribute('aria-busy');
    showStep(0);
    syncReveal();
    sizePreview();
    lastT = performance.now();
    s.raf = requestAnimationFrame(loop);
    var firstTab = shell.querySelector('.rite-tab');
    if (firstTab && typeof firstTab.focus === 'function') firstTab.focus({preventScroll: true});
    if (s.onReady) s.onReady(s);
  }

  function close() {
    if (!session) return false;
    return requestDismiss(session);
  }

  window.LiberPoppetRite = { open: open, close: close, requestDismiss: function () {
    return session ? requestDismiss(session) : false;
  } };
})();
