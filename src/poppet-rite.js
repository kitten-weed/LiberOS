// poppet-rite.js — the first making lives inside the existing cutscene handoff.
(function () {
  'use strict';

  var MOD = null;
  var session = null;
  var INKS = null, SIZES = null;
  var FACE_STEPS = [
    {id:'hair', label:'hair', surf:'hair', panel:'hair', hint:'Give the crown a line, a curl, or leave it quiet.'},
    {id:'eyes', label:'eyes', surf:'eyes', panel:'eyes', hint:'Set the look in its eyes.'},
    {id:'mouth', label:'mouth', surf:'face', panel:'face', hint:'Leave a small word or curve below the eyes.'}
  ];
  var CLOTHING_PARTS = ['armLU', 'armRU', 'armLL', 'armRL', 'legLU', 'legRU', 'legLL', 'legRL'];
  var CLOTHING_LABELS = ['upper left arm', 'upper right arm', 'lower left arm', 'lower right arm',
    'upper left leg', 'upper right leg', 'lower left leg', 'lower right leg'];
  var STEPS = FACE_STEPS.concat(CLOTHING_PARTS.map(function (part, index) {
    return {id:'clothes-' + part, label:CLOTHING_LABELS[index], surf:'clothes', panel:part,
      chapter:1, hint:'Mark only this cloth hull, or keep the cloth as it is.'};
  })).concat([
    {id:'personal-1', label:'first mark', surf:'drawing', drawing:0, chapter:2, hint:'Draw one small thought to hover near the head.'},
    {id:'personal-2', label:'second mark', surf:'drawing', drawing:1, chapter:2, hint:'Add another thought, or keep this slip blank.'},
    {id:'shadow-1', label:'first shadow', surf:'drawing', drawing:2, chapter:3, hint:'Draw what may stay unspoken; its ink will keep its colour.'},
    {id:'shadow-2', label:'second shadow', surf:'drawing', drawing:3, chapter:3, hint:'One last little shadow, or leave this slip blank.'}
  ]);
  var CHAPTERS = [
    {label:'Face', start:0, end:2},
    {label:'Clothes', start:3, end:10},
    {label:'Personal unconscious', start:11, end:12},
    {label:'Shadow & surrender', start:13, end:14}
  ];
  var DRAWING_IDS = ['personal-unconscious-1', 'personal-unconscious-2',
    'shadow-surrender-1', 'shadow-surrender-2'];
  var ATTRIBUTION = 'The five broad traits are informed by the public-domain International Personality Item Pool (IPIP) Big Five factor markers (Goldberg, 1992). These ten original scenes are a creative adaptation, not the validated IPIP inventory, a diagnostic tool, or a measure of worth. Colours are chosen for this rite; they do not reveal personality.';

  function loadModules() {
    if (MOD) return Promise.resolve(MOD);
    return Promise.all([
      import('../vendor/three.module.js'),
      import('../poppet-lab/doll.js?v=rite-draw6'),
      import('../poppet-lab/frame-doll.js?v=frame1'),
      import('../poppet-lab/surface.js?v=rite-crop1'),
      import('../poppet-lab/keepsake.js?v=rite-draw3'),
      import('../poppet-lab/keep-commit.js?v=commit1'),
      import('../poppet-lab/paint-kit.js?v=kit3'),
      import('./first-rite-data.js?v=rite-data3')
    ]).then(function (modules) {
      MOD = {
        THREE: modules[0], doll: modules[1], framing: modules[2], surface: modules[3],
        keep: modules[4], commit: modules[5], kit: modules[6], data: modules[7]
      };
      INKS = modules[6].INKS;
      SIZES = modules[6].SIZES;
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
    if (session) return session;
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
    shell.setAttribute('aria-modal', 'true');
    shell.setAttribute('aria-label', 'make the first poppet');
    shell.setAttribute('tabindex', '-1');
    shell.setAttribute('aria-busy', 'true');
    shell.innerHTML = '<div class="rite-card"><p class="rite-line" role="status">waking the pigments…</p></div>';
    stage.appendChild(shell);
    session = {
      shell:shell, onKeep:opts.onKeep || null, onDismiss:opts.onDismiss || null,
      onReady:opts.onReady || null, onError:opts.onError || null,
      returnToDesktop:!!opts.returnToDesktop,
      returnFocus:document.activeElement || null,
      ready:false, closed:false, failed:false, strokes:0, kept:false
    };
    var active = session;
    active.requestDismiss = function () { return requestDismiss(active); };
    if (typeof shell.addEventListener === 'function') {
      shell.addEventListener('keydown', function (event) {
        if (event.key !== 'Tab') return;
        var focusable = Array.prototype.slice.call(shell.querySelectorAll(
          'button:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])'
        ));
        if (!focusable.length) {
          event.preventDefault();
          shell.focus({preventScroll:true});
          return;
        }
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !shell.contains(document.activeElement))) {
          event.preventDefault();
          last.focus({preventScroll:true});
        } else if (!event.shiftKey && (document.activeElement === last || !shell.contains(document.activeElement))) {
          event.preventDefault();
          first.focus({preventScroll:true});
        }
      });
    }
    if (typeof shell.focus === 'function') shell.focus({preventScroll:true});
    startLoad(active);
    return active;
  }

  function disposeResources(s) {
    try { if (s.raf) cancelAnimationFrame(s.raf); }
    catch (error) { console.error('poppet rite animation cleanup failed', error); }
    s.raf = 0;
    try { if (s.displayResizeObserver) s.displayResizeObserver.disconnect(); }
    catch (error) { console.error('poppet rite crop cleanup failed', error); }
    s.displayResizeObserver = null;
    s.displaySurface = null;
    try { if (s.onResize) window.removeEventListener('resize', s.onResize); }
    catch (error) { console.error('poppet rite resize cleanup failed', error); }
    s.onResize = null;
    try {
      (s.candidateDolls || []).forEach(function (candidate) {
        candidate.body.visible = false;
        candidate.body.removeFromParent();
        var canvases = [candidate.bodyTex, candidate.clothTex, candidate.hullTex];
        Object.keys(candidate.faceMaps || {}).forEach(function (key) { canvases.push(candidate.faceMaps[key].tex); });
        canvases.forEach(function (texture) { if (texture && texture.dispose) texture.dispose(); });
        Object.values(candidate.M().rings || {}).forEach(function (ring) {
          ring.removeFromParent();
          if (ring.geometry) ring.geometry.dispose();
          var materials = ring.material ? (Array.isArray(ring.material) ? ring.material : [ring.material]) : [];
          materials.forEach(function (material) { material.dispose(); });
        });
      });
      s.candidateDolls = [];
    } catch (error) { console.error('poppet rite specimen cleanup failed', error); }
    if (s.doll) {
      try {
        var textures = [s.doll.bodyTex, s.doll.clothTex, s.doll.hullTex];
        Object.keys(s.doll.faceMaps || {}).forEach(function (key) { textures.push(s.doll.faceMaps[key].tex); });
        textures.forEach(function (texture) { if (texture && texture.dispose) texture.dispose(); });
      } catch (error) { console.error('poppet rite paint cleanup failed', error); }
    }
    if (s.pvScene) {
      try {
        s.pvScene.traverse(function (object) {
          if (object.geometry) object.geometry.dispose();
          var materials = object.material
            ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
          materials.forEach(function (material) { if (material) material.dispose(); });
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
    try { if (s.shell && s.shell.parentNode) s.shell.parentNode.removeChild(s.shell); }
    catch (error) { console.error('poppet rite shell cleanup failed', error); }
    if (session === s) session = null;
    if (s.returnFocus && s.returnFocus.isConnected && typeof s.returnFocus.focus === 'function') {
      s.returnFocus.focus({preventScroll:true});
    }
    return true;
  }

  function requestDismiss(s) {
    if (!s || s.closed || session !== s) return false;
    var primarySaved = !!(s.keepCommit && s.keepCommit.pending);
    if (s.strokes > 0 && !s.kept && !primarySaved &&
        !window.confirm('the first making is unfinished; leave it?')) return false;
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
      + 'the first rite could not start. try again.</p><button class="rite-retry" type="button">try again</button></div>';
    var retry = s.shell.querySelector('.rite-retry');
    retry.addEventListener('click', function () {
      if (session === s && !s.closed) startLoad(s);
    });
    if (typeof retry.focus === 'function') retry.focus({preventScroll:true});
    if (window.console && window.console.error) window.console.error('poppet rite setup failed', error);
    if (s.onError) s.onError(error, s);
  }

  function stateApi() {
    var root = window.parent && window.parent !== window ? window.parent : window;
    return root.Liber && root.Liber.state || null;
  }

  function validateStoredRite(record) {
    if (!record) return null;
    if (!MOD.data.validateOnboarding(record)) {
      throw new Error('saved first-rite answers are malformed; they have not been replaced');
    }
    return record;
  }

  function initialOnboarding() {
    return {version:1, phase:'questions', questionIndex:0, answers:{},
      resultId:null, templateId:null, paletteId:null, confirmed:false};
  }

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function build(s) {
    var THREE = MOD.THREE;
    var shelf = MOD.keep.readKeepsakes();
    s.firstMaking = shelf.length === 0;
    s.quizEnabled = s.firstMaking;
    var state = stateApi();
    if (s.quizEnabled) {
      if (!state || typeof state.get !== 'function' || typeof state.trySet !== 'function') {
        throw new Error('canonical slot state is unavailable for first-rite recovery');
      }
      var savedRite = validateStoredRite(state.get().firstRite);
      s.onboarding = savedRite || initialOnboarding();
      if (!savedRite && !state.trySet({firstRite:s.onboarding})) {
        throw new Error('first-rite answers could not be saved to this slot');
      }
    } else {
      s.onboarding = null;
    }
    s.answers = s.onboarding ? s.onboarding.answers : {};
    s.scores = s.onboarding && Object.keys(s.answers).length === MOD.data.QUESTIONS.length
      ? MOD.data.scoreAnswers(s.answers) : null;
    s.suggestions = s.scores ? MOD.data.suggestions(s.scores) : [];
    s.palette = s.scores ? MOD.data.paletteFor(s.scores) : null;
    s.selectedTemplate = null;
    if (s.onboarding && s.onboarding.templateId) {
      s.selectedTemplate = MOD.data.TEMPLATES.find(function (template) {
        return template.id === s.onboarding.templateId;
      }) || null;
    }
    if (s.onboarding && s.onboarding.paletteId && s.palette &&
        s.onboarding.paletteId !== s.palette.id) {
      throw new Error('saved first-rite palette does not match its answers');
    }
    s.ink = s.palette ? s.palette.inks[0].hex : INKS[0];
    s.size = SIZES[1];
    s.tool = 'brush';
    s.idx = 0;
    s.resolved = {};
    s.touched = {};
    s.strokes = 0;
    s.candidateDolls = [];
    s.headerStatus = null;

    var atlasCv = document.createElement('canvas');
    atlasCv.width = atlasCv.height = 1024;
    var pvCanvas = document.createElement('canvas');
    pvCanvas.className = 'rite-pv-canvas';
    var pvRenderer = new THREE.WebGLRenderer({canvas:pvCanvas, antialias:true, alpha:false});
    s.pvRenderer = pvRenderer;
    pvRenderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    pvRenderer.outputColorSpace = THREE.SRGBColorSpace;
    pvRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    pvRenderer.toneMappingExposure = 1.15;
    var pvScene = new THREE.Scene();
    s.pvScene = pvScene;
    pvScene.background = new THREE.Color(0x14100a);
    pvScene.add(new THREE.HemisphereLight(0xffe2b8, 0x241708, 1.0));
    var key = new THREE.DirectionalLight(0xffdca8, 1.0);
    key.position.set(2, 3.2, 2.6);
    pvScene.add(key);
    var rim = new THREE.DirectionalLight(0x9ab0d0, 0.55);
    rim.position.set(-2.8, 2.4, -2.6);
    pvScene.add(rim);
    var doll = MOD.doll.createDoll(pvScene, atlasCv, null, {
      rng:null, brush:function () { return {ink:s.ink, size:s.size}; }
    });
    s.doll = doll;
    s.params = MOD.kit.defaultProportions();
    doll.setParams(s.params);
    doll.rebuild('stand');
    doll.setFaceShell(true);
    doll.setHulls(true);
    doll.physicsFrame(0);
    if (s.selectedTemplate) {
      s.params = MOD.data.applyTemplate(doll, s.selectedTemplate, s.palette.inks);
      doll.physicsFrame(0);
    }
    s.atlasCv = atlasCv;
    s.pvCanvas = pvCanvas;
    s.pvCamera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
    s.pvCamera.position.set(0, 1.55, 1.9);
    s.pvCamera.lookAt(0, 1.45, 0);
    s.sheets = MOD.kit.buildSheetSet(doll, atlasCv);
    s.drawSheets = DRAWING_IDS.map(function (id) {
      var cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      var tex = new THREE.CanvasTexture(cv);
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      var sheet = MOD.surface.makeWorksurface({
        cv:cv, tex:tex, key:'drawing', transparent:true, bg:'#efe6cd',
        panels:{drawing:[0,0,1,1]}
      });
      sheet.ws.el = null;
      return {id:id, canvas:cv, texture:tex, surface:sheet};
    });
    doll.setRiteDrawings(s.drawSheets.map(function (entry, index) {
      return {id:entry.id, layer:index < 2 ? 'personal-unconscious' : 'shadow-surrender', canvas:entry.canvas};
    }));
    s.displayCanvas = document.createElement('canvas');
    s.displayCanvas.width = s.displayCanvas.height = 512;
    s.displayCanvas.className = 'rite-sheet';
    s.displayCanvas.setAttribute('aria-label', 'current poppet part paint surface');
    var displayCtx = s.displayCanvas.getContext('2d');
    s.displayCtx = displayCtx;
    s.mainView = 'making';
    s.frameStepReady = false;
    var camGoal = {pos:new THREE.Vector3(), look:new THREE.Vector3()};

    s.shell.innerHTML = '<div class="rite-card" role="document">'
      + '<header class="rite-head"><div class="rite-head-main">'
      + '<span class="rite-title">the first making</span><span class="rite-progress" id="rite-progress"></span></div>'
      + '<p class="rite-line" aria-live="polite"></p>'
      + '<button class="rite-x" type="button" aria-label="close first making">×</button></header>'
      + '<main class="rite-content" id="rite-content"></main>'
      + '<footer class="rite-footer" id="rite-footer"></footer></div>';
    var content = s.shell.querySelector('#rite-content');
    var footer = s.shell.querySelector('#rite-footer');
    var headerLine = s.shell.querySelector('.rite-line');

    function currentStep() { return STEPS[s.idx]; }
    function currentSurface() {
      var step = currentStep();
      return step.surf === 'drawing' ? s.drawSheets[step.drawing].surface : s.sheets[step.surf];
    }
    function sizeDisplayCanvas(surface, host) {
      if (!surface || !host || !host.isConnected) return;
      var rect = s.displayCanvas.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) return;
      var pixelRatio = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
      var width = Math.max(1, Math.round(rect.width * pixelRatio));
      var height = Math.max(1, Math.round(rect.height * pixelRatio));
      if (s.displayCanvas.width !== width) s.displayCanvas.width = width;
      if (s.displayCanvas.height !== height) s.displayCanvas.height = height;
      surface.redraw(displayCtx, width, height);
    }
    function observeDisplayCanvas(surface, host) {
      if (s.displayResizeObserver) s.displayResizeObserver.disconnect();
      s.displayResizeObserver = null;
      if (typeof ResizeObserver !== 'function') return;
      s.displayResizeObserver = new ResizeObserver(function () {
        if (session === s && !s.closed && s.displayCanvas.parentElement === host) {
          sizeDisplayCanvas(surface, host);
        }
      });
      s.displayResizeObserver.observe(host);
    }
    function allDrawings() {
      return s.drawSheets.map(function (entry, index) {
        return {id:entry.id, layer:index < 2 ? 'personal-unconscious' : 'shadow-surrender', canvas:entry.canvas};
      });
    }
    function refreshDrawingMeshes() {
      doll.setRiteDrawings(allDrawings());
      if (s.mainView === 'live' && s.frameStepReady) updateFrameGoal();
    }
    function persistOnboarding(next) {
      if (!s.quizEnabled) return true;
      var api = stateApi();
      if (!api || typeof api.trySet !== 'function' || !api.trySet({firstRite:next})) {
        s.headerStatus = 'this answer could not be kept in the current slot. try again before continuing.';
        headerLine.textContent = s.headerStatus;
        return false;
      }
      s.onboarding = next;
      s.answers = next.answers;
      if (Object.keys(next.answers).length === MOD.data.QUESTIONS.length) {
        s.scores = MOD.data.scoreAnswers(next.answers);
        s.suggestions = MOD.data.suggestions(s.scores);
        s.palette = MOD.data.paletteFor(s.scores);
      }
      return true;
    }
    function updateOnboarding(patch) {
      var next = Object.assign({}, s.onboarding, patch);
      next.answers = Object.assign({}, s.onboarding.answers, patch.answers || {});
      return persistOnboarding(next);
    }
    function renderHeader(text, progress) {
      headerLine.textContent = s.headerStatus || text;
      s.shell.querySelector('#rite-progress').textContent = progress || '';
    }
    function focusFirst(selector) {
      var node = s.shell.querySelector(selector);
      if (node && typeof node.focus === 'function') node.focus({preventScroll:true});
    }
    function addFooter(html) {
      footer.innerHTML = html;
    }
    function bindFooter(id, callback) {
      var button = footer.querySelector('#' + id);
      if (button) button.addEventListener('click', callback);
      return button;
    }
    function makeCandidateDolls() {
      if (s.candidateDolls.length || !s.suggestions.length) return;
      s.suggestions.forEach(function (suggestion, index) {
        var template = MOD.data.TEMPLATES.find(function (entry) { return entry.id === suggestion.template; });
        if (!template) throw new Error('suggested specimen has no authored template');
        var cv = document.createElement('canvas');
        cv.width = cv.height = 1024;
        var candidate = MOD.doll.createDoll(pvScene, cv, null, {
          rng:null, brush:function () { return {ink:s.palette.inks[0].hex, size:10}; }
        });
        MOD.data.applyTemplate(candidate, template, s.palette.inks);
        candidate.body.position.x = (index - 1) * 0.68;
        candidate.body.scale.setScalar(0.68);
        candidate.physicsFrame(0);
        Object.values(candidate.M().rings || {}).forEach(function (ring) { ring.visible = false; });
        candidate.body.visible = false;
        s.candidateDolls.push(candidate);
      });
    }
    function frameCandidateScene() {
      if (!s.candidateDolls.length) return;
      var bounds = new THREE.Box3();
      s.candidateDolls.forEach(function (candidate) {
        candidate.body.updateWorldMatrix(true, true);
        bounds.expandByObject(candidate.body);
      });
      if (bounds.isEmpty()) return;
      var center = bounds.getCenter(new THREE.Vector3());
      var size = bounds.getSize(new THREE.Vector3());
      var verticalFov = THREE.MathUtils.degToRad(s.pvCamera.fov);
      var horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * s.pvCamera.aspect);
      var verticalDistance = size.y / (2 * Math.tan(verticalFov / 2));
      var horizontalDistance = size.x / (2 * Math.tan(horizontalFov / 2));
      var distance = Math.max(verticalDistance, horizontalDistance) + size.z / 2 + 0.22;
      s.pvCamera.position.set(center.x, center.y, center.z + distance);
      s.pvCamera.lookAt(center);
    }
    function showCandidateScene() {
      makeCandidateDolls();
      doll.body.visible = false;
      s.candidateDolls.forEach(function (candidate) { candidate.body.visible = true; });
      s.frameStepReady = false;
    }
    function disposeCandidates() {
      s.candidateDolls.forEach(function (candidate) {
        candidate.body.removeFromParent();
        var textures = [candidate.bodyTex, candidate.clothTex, candidate.hullTex];
        Object.keys(candidate.faceMaps || {}).forEach(function (name) { textures.push(candidate.faceMaps[name].tex); });
        textures.forEach(function (texture) { if (texture && texture.dispose) texture.dispose(); });
        candidate.body.traverse(function (object) {
          if (object.geometry) object.geometry.dispose();
          var materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
          materials.forEach(function (material) { material.dispose(); });
        });
        Object.values(candidate.M().rings || {}).forEach(function (ring) {
          ring.removeFromParent();
          if (ring.geometry) ring.geometry.dispose();
          var materials = ring.material ? (Array.isArray(ring.material) ? ring.material : [ring.material]) : [];
          materials.forEach(function (material) { material.dispose(); });
        });
      });
      s.candidateDolls = [];
      doll.body.visible = true;
    }
    function updateFrameGoal() {
      doll.body.updateWorldMatrix(true, true);
      pvScene.updateMatrixWorld(true);
      var goal = MOD.framing.dollFrameGoal(s.pvCamera, doll, 'all', 0.1);
      camGoal.pos.copy(goal.pos);
      camGoal.look.copy(goal.look);
    }
    function placePreview(kind) {
      var host = s.shell.querySelector(kind === 'specimens' ? '#rite-specimen-view' : '#rite-live-view');
      if (!host) return;
      host.appendChild(pvCanvas);
      s.mainView = kind;
      if (kind === 'specimens') showCandidateScene();
      else {
        if (s.candidateDolls.length) disposeCandidates();
        doll.body.visible = true;
        updateFrameGoal();
        s.frameStepReady = true;
      }
      sizePreview();
    }

    function renderQuestion() {
      var questions = MOD.data.QUESTIONS;
      var index = s.onboarding.questionIndex || 0;
      if (index >= questions.length) index = questions.length - 1;
      var question = questions[index];
      var selected = s.answers[question.id];
      var marks = questions.map(function (entry, i) {
        return '<span class="rite-punch' + (s.answers[entry.id] ? ' is-punched' : '') +
          (i === index ? ' is-current' : '') + '" aria-label="question ' + (i + 1) +
          (s.answers[entry.id] ? ', answered' : ', not answered') + '"></span>';
      }).join('');
      var options = question.options.map(function (option) {
        return '<button class="rite-answer' + (selected === option.id ? ' is-on' : '') +
          '" type="button" data-answer="' + esc(option.id) + '" aria-pressed="' +
          (selected === option.id ? 'true' : 'false') + '">' + esc(option.label) + '</button>';
      }).join('');
      content.innerHTML = '<section class="rite-listening" aria-labelledby="rite-question">'
        + '<div class="rite-punches" aria-label="ten question listening plate">' + marks + '</div>'
        + '<div class="rite-question-slip"><span class="rite-slip-stamp">listening plate</span>'
        + '<p class="rite-question-count">scene ' + (index + 1) + ' of ' + questions.length + '</p>'
        + '<h2 id="rite-question" tabindex="-1">' + esc(question.prompt) + '</h2>'
        + '<div class="rite-answers" role="group" aria-label="choose the response that feels nearest">'
        + options + '</div><details class="rite-colophon"><summary>about these questions</summary>'
        + '<p>' + esc(ATTRIBUTION) + '</p><p><a href="https://ipip.ori.org/newBigFive5broadKey.htm" target="_blank" rel="noreferrer">IPIP factor markers</a> · '
        + '<a href="https://ipip.ori.org/newPermission.htm" target="_blank" rel="noreferrer">IPIP permissions</a></p></details></div></section>';
      var questionLine = window.innerWidth <= 650
        ? 'Scroll each slip; Wanderlust listens without a score.'
        : 'Wanderlust listens for the shape of your answers, not a score.';
      renderHeader(questionLine, 'scene ' + (index + 1) + ' / 10');
      addFooter('<div class="rite-nav"><button id="rite-back" type="button"' +
        (index === 0 ? ' disabled' : '') + '>back</button></div>'
        + '<button class="rite-next" id="rite-next" type="button"' + (!selected ? ' disabled' : '') +
        '>' + (index === questions.length - 1 ? 'hear the match' : 'next scene') + '</button>');
      content.querySelectorAll('.rite-answer').forEach(function (button) {
        button.addEventListener('click', function () {
          var answers = Object.assign({}, s.answers);
          answers[question.id] = button.dataset.answer;
          if (!updateOnboarding({phase:'questions', questionIndex:index, answers:answers})) return;
          content.querySelectorAll('.rite-answer').forEach(function (choice) {
            var active = choice === button;
            choice.classList.toggle('is-on', active);
            choice.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
          footer.querySelector('#rite-next').disabled = false;
          s.headerStatus = null;
          renderHeader(questionLine, 'scene ' + (index + 1) + ' / 10');
        });
      });
      bindFooter('rite-back', function () {
        if (index > 0 && updateOnboarding({phase:'questions', questionIndex:index - 1})) renderQuestion();
      });
      bindFooter('rite-next', function () {
        if (!s.answers[question.id]) return;
        if (index < questions.length - 1) {
          if (updateOnboarding({phase:'questions', questionIndex:index + 1})) renderQuestion();
          return;
        }
        var scores = MOD.data.scoreAnswers(s.answers);
        var ranked = MOD.data.suggestions(scores);
        var palette = MOD.data.paletteFor(scores);
        if (updateOnboarding({phase:'suggestions', questionIndex:index,
          resultId:ranked[0].id, templateId:null, paletteId:palette.id, confirmed:false})) {
          s.scores = scores;
          s.suggestions = ranked;
          s.palette = palette;
          renderSuggestions();
        }
      });
      focusFirst('#rite-question');
    }

    function renderSuggestions() {
      var tiles = s.suggestions.map(function (suggestion, index) {
        var template = MOD.data.TEMPLATES.find(function (entry) { return entry.id === suggestion.template; });
        var chosen = s.onboarding.templateId === template.id;
        return '<button type="button" class="rite-niche' + (chosen ? ' is-on' : '') +
          '" data-template="' + esc(template.id) + '" aria-pressed="' + (chosen ? 'true' : 'false') + '">'
          + '<span class="rite-niche-name">' + esc(template.name) + '</span>'
          + (index === 0 ? '<span class="rite-match">closest match</span>' : '')
          + '<span class="rite-niche-line">' + esc(template.line) + '</span></button>';
      }).join('');
      var wells = s.palette.inks.map(function (ink) {
        return '<span class="rite-well" role="img" aria-label="' + esc(ink.name + ' ink') +
          '" title="' + esc(ink.name) + '"><i style="background:' + esc(ink.hex) + '"></i><span>' +
          esc(ink.name) + '</span></span>';
      }).join('');
      content.innerHTML = '<section class="rite-specimens" aria-labelledby="rite-specimen-title">'
        + '<div class="rite-specimen-heading"><h2 id="rite-specimen-title" tabindex="-1">Three small lives, none assigned.</h2>'
        + '<p>Choose the one you want to make. Each is pre-painted with the same six inks.</p></div>'
        + '<div class="rite-specimen-view" id="rite-specimen-view" aria-label="three generated poppet specimens"></div>'
        + '<div class="rite-niches">' + tiles + '</div>'
        + '<div class="rite-wells" aria-label="the six inks chosen for this rite">' + wells + '</div></section>';
      var suggestionLine = window.innerWidth <= 650
        ? 'Scroll to compare; these storybook shapes are not diagnoses.'
        : 'These are storybook shapes, not personality labels or diagnoses.';
      renderHeader(suggestionLine, 'three suggestions');
      var selected = !!s.onboarding.templateId;
      addFooter('<button class="rite-back" id="rite-back" type="button">back to questions</button>'
        + '<button class="rite-next" id="rite-next" type="button"' + (!selected ? ' disabled' : '') + '>choose this specimen</button>');
      content.querySelectorAll('.rite-niche').forEach(function (button) {
        button.addEventListener('click', function () {
          var template = MOD.data.TEMPLATES.find(function (entry) { return entry.id === button.dataset.template; });
          if (!template || !updateOnboarding({phase:'suggestions', templateId:template.id, confirmed:false})) return;
          content.querySelectorAll('.rite-niche').forEach(function (choice) {
            var active = choice === button;
            choice.classList.toggle('is-on', active);
            choice.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
          footer.querySelector('#rite-next').disabled = false;
          s.headerStatus = null;
        });
      });
      bindFooter('rite-back', function () {
        if (updateOnboarding({phase:'questions', questionIndex:MOD.data.QUESTIONS.length - 1})) renderQuestion();
      });
      bindFooter('rite-next', function () {
        if (!s.onboarding.templateId) return;
        if (!updateOnboarding({phase:'making', confirmed:true})) return;
        s.selectedTemplate = MOD.data.TEMPLATES.find(function (entry) {
          return entry.id === s.onboarding.templateId;
        });
        s.params = MOD.data.applyTemplate(doll, s.selectedTemplate, s.palette.inks);
        doll.physicsFrame(0);
        s.ink = s.palette.inks[0].hex;
        disposeCandidates();
        s.idx = 0;
        renderMaking();
      });
      placePreview('specimens');
      focusFirst('#rite-specimen-title');
    }

    function stepChapter(index) {
      return index < 3 ? 0 : index < 11 ? 1 : index < 13 ? 2 : 3;
    }
    function paintPalettes() {
      var available = s.palette ? s.palette.inks : INKS.map(function (hex) {
        return {name:MOD.kit.inkName(hex), hex:hex};
      });
      var inks = available.map(function (ink) {
        var name = /(?:^|\s)ink$/i.test(ink.name) ? ink.name : ink.name + ' ink';
        return '<button type="button" class="rite-ink' + (s.ink === ink.hex ? ' is-on' : '') +
          '" data-ink="' + esc(ink.hex) + '" aria-label="use ' + esc(name) + '" aria-pressed="' +
          (s.ink === ink.hex ? 'true' : 'false') + '"><i style="background:' + esc(ink.hex) +
          '"></i><span>' + esc(ink.name) + '</span></button>';
      }).join('');
      var sizes = SIZES.map(function (size, index) {
        return '<button type="button" class="rite-size' + (s.size === size ? ' is-on' : '') +
          '" data-size="' + size + '" aria-label="brush size ' + size + '" aria-pressed="' +
          (s.size === size ? 'true' : 'false') + '">' + ['small', 'medium', 'large'][index] + '</button>';
      }).join('');
      return '<div class="rite-tools"><div class="rite-inks" role="group" aria-label="six labelled inks">' + inks + '</div>'
        + '<div class="rite-tool-row"><button class="rite-tool is-on" data-tool="brush" type="button" aria-pressed="true">brush</button>'
        + '<button class="rite-tool" data-tool="bucket" type="button" aria-pressed="false">bucket</button>'
        + '<div class="rite-sizes" role="group" aria-label="brush size">' + sizes + '</div>'
        + '<button class="rite-tool" id="rite-undo" type="button">undo</button></div></div>';
    }
    function renderMaking() {
      var step = currentStep();
      var chapterIndex = stepChapter(s.idx);
      var chapter = CHAPTERS[chapterIndex];
      var localIndex = s.idx - chapter.start;
      var localTotal = chapter.end - chapter.start + 1;
      var markers = CHAPTERS.map(function (entry, index) {
        var current = index === chapterIndex;
        var complete = STEPS.slice(entry.start, entry.end + 1).every(function (part) { return s.resolved[part.id]; });
        return '<button type="button" class="rite-chapter' + (current ? ' is-on' : '') +
          (complete ? ' is-done' : '') + '" data-chapter="' + index + '" aria-label="' +
          esc(entry.label + (complete ? ', complete' : '')) + '"' +
          (current ? ' aria-current="step"' : '') + '><span>' + (index + 1) + '</span><b>' +
          esc(entry.label) + '</b></button>';
      }).join('');
      content.innerHTML = '<section class="rite-making" aria-labelledby="rite-target-title">'
        + '<nav class="rite-chapters" aria-label="four making chapters">' + markers + '</nav>'
        + '<div class="rite-workbench"><div class="rite-platen">'
        + '<div class="rite-target-line"><div><p class="rite-chapter-name">' + esc(chapter.label) +
          '</p><h2 id="rite-target-title" tabindex="-1">' + esc(step.label) + '</h2></div>'
        + '<span class="rite-step-count">part ' + (localIndex + 1) + ' of ' + localTotal + '</span></div>'
        + '<p class="rite-instruction">' + esc(step.hint) + '</p>'
        + '<div class="rite-sheet-wrap" id="rite-sheet-wrap"></div>' + paintPalettes()
        + '</div><aside class="rite-companion"><div class="rite-live-view" id="rite-live-view" aria-label="live whole poppet preview"></div>'
        + '<p class="rite-hint">' + (step.surf === 'drawing'
          ? 'Your drawn outline keeps its pigment and grows a little depth beside the head.'
          : 'Every stroke appears on the whole poppet as you make it.') + '</p></aside></div></section>';
      renderHeader(window.innerWidth <= 650
        ? 'Scroll inside the glass to reach the paint and inks; keep each part to continue.'
        : 'The living poppet keeps every mark where you put it.',
      'chapter ' + (chapterIndex + 1) + ' / 4');
      var allResolved = STEPS.every(function (part) { return s.resolved[part.id]; });
      addFooter('<div class="rite-nav"><button id="rite-back" type="button"' +
        (s.idx === 0 ? ' disabled' : '') + '>back</button>'
        + '<button class="rite-accept" id="rite-accept" type="button">' +
        (s.resolved[step.id] ? 'part kept' : 'keep this part') + '</button></div>'
        + '<button class="rite-next" id="rite-next" type="button"' +
        (!s.resolved[step.id] ? ' disabled' : '') + '>' +
        (s.idx === STEPS.length - 1 ? (allResolved ? 'assemble' : 'next part') : 'next part') + '</button>');

      var sheetWrap = content.querySelector('#rite-sheet-wrap');
      sheetWrap.appendChild(s.displayCanvas);
      var surface = currentSurface();
      var panel = step.surf === 'drawing' ? 'drawing' : step.panel;
      var crop = surface.ws.panels && surface.ws.panels[panel];
      if (!crop) throw new Error('the active poppet part has no paint region: ' + step.id);
      surface.setCrop(crop, panel);
      surface.ws.el = s.displayCanvas;
      s.displaySurface = surface;
      sizeDisplayCanvas(surface, sheetWrap);
      observeDisplayCanvas(surface, sheetWrap);
      content.querySelectorAll('.rite-chapter').forEach(function (button) {
        button.addEventListener('click', function () {
          var target = Number(button.dataset.chapter);
          if (Number.isInteger(target) && target >= 0 && target < CHAPTERS.length) {
            showStep(CHAPTERS[target].start);
          }
        });
      });
      content.querySelectorAll('.rite-ink').forEach(function (button) {
        button.addEventListener('click', function () {
          s.ink = button.dataset.ink;
          content.querySelectorAll('.rite-ink').forEach(function (ink) {
            var active = ink === button;
            ink.classList.toggle('is-on', active);
            ink.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
        });
      });
      content.querySelectorAll('.rite-size').forEach(function (button) {
        button.addEventListener('click', function () {
          s.size = Number(button.dataset.size);
          content.querySelectorAll('.rite-size').forEach(function (size) {
            var active = size === button;
            size.classList.toggle('is-on', active);
            size.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
        });
      });
      content.querySelectorAll('.rite-tool[data-tool]').forEach(function (button) {
        button.addEventListener('click', function () {
          s.tool = button.dataset.tool;
          content.querySelectorAll('.rite-tool[data-tool]').forEach(function (tool) {
            var active = tool === button;
            tool.classList.toggle('is-on', active);
            tool.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
        });
      });
      content.querySelector('#rite-undo').addEventListener('click', function () {
        surface.undo();
        surface.redraw(displayCtx, s.displayCanvas.width, s.displayCanvas.height);
        if (step.surf === 'drawing') refreshDrawingMeshes();
      });
      bindFooter('rite-back', function () { if (s.idx > 0) showStep(s.idx - 1); });
      bindFooter('rite-accept', function () {
        s.resolved[step.id] = true;
        renderMaking();
      });
      bindFooter('rite-next', function () {
        if (!s.resolved[step.id]) return;
        if (s.idx < STEPS.length - 1) showStep(s.idx + 1);
        else if (STEPS.every(function (part) { return s.resolved[part.id]; })) renderReveal();
      });
      placePreview('live');
      if (!s.paintEventsBound) {
        attachPaintEvents();
        s.paintEventsBound = true;
      }
      focusFirst('#rite-target-title');
    }

    var drawing = false, last = null, undoCaptured = false, operationTouched = false;
    function attachPaintEvents() {
      s.displayCanvas.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        try { s.displayCanvas.setPointerCapture(event.pointerId); } catch (error) {}
        drawing = true;
        last = null;
        undoCaptured = false;
        operationTouched = false;
        paintDisplay(event, true, currentSurface(), currentStep());
      });
      s.displayCanvas.addEventListener('pointermove', function (event) {
        if (drawing) paintDisplay(event, false, currentSurface(), currentStep());
      });
      s.displayCanvas.addEventListener('pointerup', finishStroke);
      s.displayCanvas.addEventListener('pointercancel', finishStroke);
    }
    function finishStroke() {
      var activeStep = currentStep();
      drawing = false;
      last = null;
      undoCaptured = false;
      if (operationTouched && activeStep && activeStep.surf === 'drawing') refreshDrawingMeshes();
      operationTouched = false;
    }
    function paintDisplay(event, start, surface, step) {
      if (s.tool === 'bucket' && !start) return;
      var point = surface.pos(event);
      if (!point.inside || !surface.contains(point.x, point.y)) {
        last = null;
        return;
      }
      if (!undoCaptured) {
        surface.pushUndo();
        undoCaptured = true;
      }
      if (s.tool === 'bucket') {
        if (surface.fillAt(point.x, point.y, s.ink, 40) == null) return;
      } else if (last && !start) {
        surface.stampLine(last.x, last.y, point.x, point.y, s.size / 2, s.ink);
      } else {
        surface.stamp(point.x, point.y, s.size / 2, s.ink);
      }
      last = {x:point.x, y:point.y};
      if (!operationTouched) {
        operationTouched = true;
        s.resolved[step.id] = true;
        s.strokes++;
      }
      if (step.surf === 'clothes' && doll.markHullPainted) doll.markHullPainted();
      surface.redraw(displayCtx, s.displayCanvas.width, s.displayCanvas.height);
      var next = footer.querySelector('#rite-next');
      if (next) next.disabled = false;
      if (next && s.idx === STEPS.length - 1 &&
          STEPS.every(function (part) { return s.resolved[part.id]; })) next.textContent = 'assemble';
      var accept = footer.querySelector('#rite-accept');
      if (accept) accept.textContent = 'part kept';
    }

    function showStep(index) {
      drawing = false;
      last = null;
      undoCaptured = false;
      operationTouched = false;
      var target = Math.max(0, Math.min(STEPS.length - 1, index));
      for (var i = s.idx; i < target; i++) {
        if (!s.resolved[STEPS[i].id]) return false;
      }
      s.idx = target;
      renderMaking();
      return true;
    }

    function renderReveal() {
      if (!STEPS.every(function (step) { return s.resolved[step.id]; })) return;
      content.innerHTML = '<section class="rite-reveal" aria-labelledby="rite-reveal-title">'
        + '<div class="rite-reveal-copy"><span class="rite-seal" aria-hidden="true">✦</span>'
        + '<h2 id="rite-reveal-title" tabindex="-1">A companion, made by hand.</h2>'
        + '<p>Every part has been kept. One seal saves this poppet and returns to the story.</p></div>'
        + '<div class="rite-live-view rite-reveal-view" id="rite-live-view" aria-label="assembled poppet with its drawn thoughts"></div></section>';
      renderHeader('The work is gathered. The next step is one durable Keep.', 'ready to keep');
      addFooter('<button class="rite-keep" id="rite-keep" type="button">keep</button>');
      placePreview('live');
      bindFooter('rite-keep', keep);
      focusFirst('#rite-keep');
    }

    function keepPatch() {
        var patch;
        if (s.returnToDesktop) {
          patch = {tutorialPaused:false};
        } else {
          var flow = window.LiberTutorialFlow;
          if (!flow || !Array.isArray(flow.ORDER)) throw new Error('tutorial cursor helper is unavailable');
          var index = flow.ORDER.indexOf('beat-017');
          if (index < 0) throw new Error('first-making return cursor is unavailable');
          patch = Object.assign({}, flow.patchAt(index), {tutorialPaused:false});
        }
      if (s.quizEnabled && s.onboarding) {
        patch.firstRite = Object.assign({}, s.onboarding, {phase:'kept'});
      }
      return patch;
    }
    function keepFailure(message, pending) {
      s.headerStatus = message;
      renderHeader(message, 'keep not complete');
      s.saving = false;
      s.shell.classList.toggle('is-commit-pending', !!pending);
      var button = footer.querySelector('#rite-keep');
      if (button) {
        button.disabled = false;
        button.textContent = pending ? 'try again' : 'keep';
      }
      if (pending) {
        content.querySelectorAll('button').forEach(function (control) { control.disabled = true; });
      }
    }
    function keep() {
      if (!STEPS.every(function (step) { return s.resolved[step.id]; }) || s.saving) return;
      s.saving = true;
      s.headerStatus = null;
      renderHeader('the keep seal is setting…', 'saving');
      var button = footer.querySelector('#rite-keep');
      if (button) button.disabled = true;
      var result;
      try { result = s.keepCommit.commit(keepPatch()); }
      catch (error) { result = {ok:false, stage:'primary', error:error}; }
      if (!result.ok && result.stage === 'primary') {
        keepFailure('the Keep failed. your drawings are still here. try again.', false);
        console.error('first-rite primary keep failed', result.error);
        return;
      }
      if (!result.ok) {
        keepFailure('the poppet is saved, but its slot bookmark failed. try again.', true);
        console.error('first-rite slot bookmark failed', result.error);
        return;
      }
      s.kept = true;
      var onKeep = s.onKeep;
      teardownSession(s);
      try { localStorage.setItem('poppet.keepsake.fresh', String(Date.now())); }
      catch (error) { console.error('poppet fresh marker could not be stored', error); }
      if (onKeep) onKeep(result, s);
    }

    s.keepCommit = MOD.commit.createKeepCommit({
      idPrefix:'poppet-rite',
      capture:function () {
        var sheets = MOD.keep.snapshotDollSheets(doll);
        return {
          atlasCv:atlasCv,
          clothCv:null,
          spec:{
            P:JSON.parse(JSON.stringify(s.params)),
            pose:'stand',
            worn:s.params.worn,
            ink:s.ink,
            brush:s.size,
            name:'Poppet Nº 1',
            lesson:{tutorial:true, rite:'first-making'},
            coverage:MOD.keep.atlasCoverage(doll.bodyCtx, doll.ATLAS),
            face:sheets.face,
            hull:sheets.hull,
            riteDrawings:MOD.keep.snapshotRiteDrawings(doll),
            firstRite:s.quizEnabled ? {
              version:1,
              resultId:s.onboarding.resultId,
              templateId:s.onboarding.templateId,
              paletteId:s.onboarding.paletteId,
              inks:s.palette.inks.map(function (ink) { return {name:ink.name, hex:ink.hex}; })
            } : null
          }
        };
      }
    });

    function renderPhase() {
      if (s.quizEnabled && s.onboarding.phase === 'questions') {
        renderQuestion();
      } else if (s.quizEnabled && s.onboarding.phase === 'suggestions') {
        if (!s.scores || !s.palette || s.suggestions.length !== 3) {
          throw new Error('the saved first-rite suggestion set is incomplete');
        }
        renderSuggestions();
      } else {
        if (s.quizEnabled && s.onboarding.phase === 'making' && !s.selectedTemplate) {
          throw new Error('the saved first-rite specimen choice is unavailable');
        }
        s.selectedTemplate = s.selectedTemplate || (s.onboarding && s.onboarding.templateId
          ? MOD.data.TEMPLATES.find(function (template) { return template.id === s.onboarding.templateId; })
          : null);
        if (s.selectedTemplate && s.quizEnabled && !Object.keys(s.sheets || {}).length) {
          s.params = MOD.data.applyTemplate(doll, s.selectedTemplate, s.palette.inks);
        }
        if (s.quizEnabled && s.onboarding.phase === 'kept') {
          throw new Error('a kept first rite has no matching saved poppet');
        }
        if (s.idx >= STEPS.length) renderReveal();
        else renderMaking();
      }
    }

    function sizePreview() {
      if (s.displaySurface && s.displayCanvas.parentElement) {
        sizeDisplayCanvas(s.displaySurface, s.displayCanvas.parentElement);
      }
      if (!s.pvRenderer || !s.pvCamera) return;
      var host = pvCanvas.parentNode;
      if (!host) return;
      var width = Math.max(2, host.clientWidth || 220);
      var height = Math.max(2, host.clientHeight || 260);
      s.pvRenderer.setSize(width, height, false);
      s.pvCamera.aspect = width / Math.max(1, height);
      s.pvCamera.updateProjectionMatrix();
      if (s.mainView === 'specimens') frameCandidateScene();
      if (s.mainView === 'live' && s.frameStepReady) updateFrameGoal();
    }
    s.onResize = sizePreview;
    window.addEventListener('resize', s.onResize);

    var lastT = 0;
    function loop(time) {
      if (session !== s || s.closed) return;
      s.raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      var dt = Math.min(0.05, (time - lastT) / 1000 || 0);
      lastT = time;
      try {
        doll.physicsFrame(dt);
        if (s.mainView === 'live' && s.frameStepReady) {
          s.pvCamera.position.lerp(camGoal.pos, 1 - Math.exp(-dt / 1.1));
          s.pvCamera.lookAt(camGoal.look);
        }
        if (s.pvRenderer && s.pvScene && s.pvCamera) s.pvRenderer.render(s.pvScene, s.pvCamera);
      } catch (error) {
        if (session === s && !s.closed) failSession(s, error);
      }
    }

    s.shell.querySelector('.rite-x').addEventListener('click', function () { requestDismiss(s); });
    renderPhase();
    s.ready = true;
    s.failed = false;
    s.shell.removeAttribute('aria-busy');
    lastT = performance.now();
    s.raf = requestAnimationFrame(loop);
    if (s.onReady) s.onReady(s);
  }

  function close() {
    if (!session) return false;
    return requestDismiss(session);
  }

  window.LiberPoppetRite = {
    open:open,
    close:close,
    requestDismiss:function () { return session ? requestDismiss(session) : false; },
    steps:STEPS.map(function (step) { return {id:step.id, label:step.label, surf:step.surf, panel:step.panel || null}; })
  };
})();
