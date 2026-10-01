// games.js — Whimsy Wow, the room coordinator. Owns the midway shell:
// camera, booth picker, stage lifecycle, the save prompt, personal bests,
// and the tutorial pass-through. Each attraction lives in booths/<id>.js,
// self-registers onto LiberBooths, and receives the shared booth context.
// Adding a booth is a new module plus one registry line.

(function () {
  function WL(kind, data) {
    try {
      var W = window.Liber && window.Liber.wanderlustAccent;
      if (W && W.evidenceFor) data.keywordsMatched = W.evidenceFor(data);
    } catch (e) { /* the keep lands regardless */ }
    return data;
  }
  // Per-booth play modules — one file per attraction under booths/.
  // (The thimble booth retired to the Glasshouse — see tree.js, which
  // migrated its legacy visits. The midway is a promenade of active games.)
  var BOOTH_PLAY = {
    tipp: LiberBooths.tipp,
    wheel: LiberBooths.wheel,
    mask: LiberBooths.mask,
    shield: LiberBooths.shield,
    circles: LiberBooths.circles,
    sand: LiberBooths.sand,
    tidepool: LiberBooths.tide,
    inkstorm: LiberBooths.storm
  };
  var boothCtx = null; // built once the shell vars resolve
  var grid = document.getElementById('games-grid');
  var descBox = document.getElementById('games-desc');
  var stage = document.getElementById('games-stage');
  var app = document.querySelector('.games-app');
  var panLeft = document.getElementById('games-pan-left');
  var panRight = document.getElementById('games-pan-right');
  var cameraIndex = 1;
  boothCtx = LiberBooths.makeBoothContext({
    app: app, stage: stage,
    promptSave: promptSave,
    saveToDesktopAndJournal: saveToDesktopAndJournal,
    thumb: thumb, esc: esc, thunk: thunk, setView: setView
  });
  var CAMERA_ORDER = ['mask', 'wheel', 'shield', 'circles', 'sand', 'tidepool', 'inkstorm', 'tipp'];

  // camera parity for the barker: opening a booth hushes him; stepping back
  // out re-barks the centered booth only when the camera itself moved
  function setView(view) {
    if (app) app.setAttribute('data-view', view);
    if (view !== 'facade') {
      var voice = document.getElementById('games-bark');
      if (voice) voice.classList.remove('speak');
    } else {
      var c = grid ? grid.querySelector('.games-booth[data-camera-position="center"]') : null;
      if (c) lastBarkBooth = null; // re-arm: the walk is being looked at again
      if (c) barkFor(c.getAttribute('data-game'));
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var GAMES = [
    { id: 'wheel', name: 'emotion wheel', glyph: '◉',
      material: 'painted wheel · three throws',
      pitch: 'Step right up! The wheel knows twelve feelings and your arm knows the truth. Throw a dart, land on one — no dodging! Then pick the color it feels like and watch it flood the tent. Three darts, three honest answers. Keep the prettiest.' },
    { id: 'mask', name: 'communication mask', glyph: '◭',
      material: 'split face · two truths',
      pitch: 'Everybody wears one — here is yours to paint! Left side: what you FEEL inside. Right side: what you SHOW the world. Same face, two truths. Paint it loud, then keep it.' },
    { id: 'shield', name: 'boundaries shield', glyph: '◈',
      material: 'four quarters · your rules',
      pitch: 'Four quarters, four boundaries: body, heart, clock, and mind. Color in how strong each wall is right now — bright means solid, dark means needs work. Your shield, your rules!' },
    { id: 'circles', name: 'relationship circles', glyph: '◎',
      material: 'three rings · honest seating',
      pitch: 'Three rings: closest, friends, distant. Write the names where they actually belong — not where they wish they belonged. An honest seating chart. Keep it.' },
    { id: 'sand', name: 'powder tent', glyph: '▦',
      material: 'loose grain · make a world',
      pitch: 'Liber powder! Pour sand, splash water, strike fire — it all falls and flows like the real stuff. Build a little world out of grains, then keep a picture before it settles.' },
    { id: 'tidepool', name: 'tide pool', glyph: '≋', unlock: 'tidepool',
      material: 'wet slate · the deep opens',
      pitch: 'Vanir’s pool, down in the deep. Drop a feeling while the tide is high and it floats; drop it low and it strands, waiting. The pool decides the pacing — you decide the honesty. No winning.',
      hint: '??? — the deep opens to those who release.' },
    { id: 'inkstorm', name: 'ink storm', glyph: '≣', unlock: 'inkstorm',
      material: 'phosphor glass · sealed words',
      pitch: 'Entity404’s terminal. Glyphs rain; type the word to execute it. Missed words simply dissolve — no failing here. The storm slows when you struggle, and tells you so, kindly.',
      hint: '??? — static gathers where words are sealed.' },
    { id: 'tipp', name: 'the quiet floor', glyph: '❄', featured: true,
      material: 'cold water · four skills',
      pitch: 'The floor of the room, the floor of the wave. TIPP — temperature, intense exercise, paced breathing, paired relaxation — the distress-tolerance skills the hard-nights page keeps by the door. Walk them one at a time, rate what each did for you, keep the record for the next storm.',
      hint: '' }
  ];

  var WHO_NAME = { whimsy: 'whimsy wow', vanir: 'vanir', ruby: 'ruby', elizabeth: 'e-lizabeth', riason: 'riason' };

  function affinity() { return (window.Liber && window.Liber.affinity) || null; }

  function isUnlocked(g) {
    if (!g.unlock) return true;
    var a = affinity();
    try { return a ? !!a.unlocked(g.unlock) : false; } catch (e) { return false; }
  }

  // invite lines, shown once each in the barker's voice-box
  function inviteLines() {
    var a = affinity();
    if (!a) return [];
    try {
      var inv = a.invites() || [];
      inv.forEach(function (u) { try { a.seen(u.id); } catch (e) {} });
      return inv;
    } catch (e) { return []; }
  }

  var current = null;
  var roundDirty = false;   // the round has been played, not yet kept
  var hashLock = false;

  // ── the promenade camera (pitch: The Full Promenade) ──────────────────
  // Whimsy barks ONLY when his booth is camera-centered — the pitch's rule:
  // the voice is tied to the center of the walk, not to the room. The line
  // lives in the barker's voice-box (games-side, one per booth), arrives
  // through the lamp persona's register, and never repeats until the camera
  // comes back around.
  var BARKS = {
    mask: 'two truths, ONE FACE! paint the inside on the left, the outside on the right. nobody has to know which is which. except you.',
    wheel: 'the wheel knows TWELVE feelings and your arm knows the truth. three darts, three honest answers, one pretty keep!',
    shield: 'four walls, FOUR QUARTERS! body, heart, clock, mind. colour them how strong they really are — the barker will not look. much.',
    circles: 'an honest SEATING CHART! closest, friends, distant — write them where they ARE, not where they wish they were!',
    sand: 'LIBER POWDER! pour, splash, strike — it falls and flows like the real stuff. build a world, keep the picture!',
    tidepool: 'vanir’s pool, down in the DEEP. high tide and it floats. low tide and it waits. the pool decides the pacing, friend.',
    inkstorm: 'glyphs RAIN at entity404’s terminal. type the word to execute it. misses dissolve here — no failing, only weather!',
    tipp: 'the QUIET FLOOR. no barking past this sign. tipp sits with you and the wave cools. that is the whole attraction. it is enough.'
  };
  var lastBarkBooth = null;

  function barkFor(boothId) {
    if (!boothId || boothId === lastBarkBooth) return;
    lastBarkBooth = boothId;
    var line = BARKS[boothId];
    if (!line) return;
    var voice = document.getElementById('games-bark');
    if (!voice) {
      voice = document.createElement('div');
      voice.id = 'games-bark';
      voice.className = 'games-bark';
      voice.setAttribute('role', 'status');
      voice.setAttribute('aria-live', 'polite');
      var side = document.querySelector('.games-side');
      (side || document.body).appendChild(voice);
    }
    // re-trigger the arrival beat even when the line is unchanged
    voice.classList.remove('speak');
    void voice.offsetWidth;
    voice.textContent = line;
    voice.classList.add('speak');
    if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play('tink'); } catch (e) {} }
  }

  function applyCamera() {
    if (!grid) return;
    grid.setAttribute('data-camera-index', String(cameraIndex));
    // the parallax driver: the three ground layers slide against the walk.
    // Set on .games-app so every layer inherits it (the near dirt lives on
    // .games-shell, which is not inside .games-side).
    if (app) app.style.setProperty('--walk', String(cameraIndex));
    if (panLeft) panLeft.disabled = cameraIndex === 0;
    if (panRight) panRight.disabled = cameraIndex === CAMERA_ORDER.length - 1;
    var buttons = grid.querySelectorAll('.games-booth');
    var centered = null;
    for (var i = 0; i < buttons.length; i++) {
      var boothIndex = CAMERA_ORDER.indexOf(buttons[i].getAttribute('data-game'));
      var delta = boothIndex - cameraIndex;
      var position = delta === 0 ? 'center' : (delta === -1 ? 'left' : (delta === 1 ? 'right' : 'off'));
      buttons[i].setAttribute('data-camera-position', position);
      buttons[i].setAttribute('aria-hidden', position === 'off' ? 'true' : 'false');
      buttons[i].tabIndex = position === 'off' ? -1 : 0;
      if (position === 'center') centered = buttons[i].getAttribute('data-game');
    }
    // the walk has a voice: the barker lines arrive with the booth he fronts
    if (centered && app && app.getAttribute('data-view') === 'facade') barkFor(centered);
  }

  function moveCamera(amount) {
    cameraIndex = Math.max(0, Math.min(CAMERA_ORDER.length - 1, cameraIndex + amount));
    applyCamera();
  }

  function buildPicker() {
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 0; i < GAMES.length; i++) {
      (function (g) {
        var locked = !isUnlocked(g);
        var div = document.createElement('button');
        div.type = 'button';
        div.className = 'games-booth' + (current && current.id === g.id ? ' current' : '') + (locked ? ' locked' : '') + (g.featured ? ' featured' : '');
        div.setAttribute('data-game', g.id);
        div.setAttribute('data-index', String(i));
        div.setAttribute('aria-label', (locked ? 'locked booth' : g.name) + (g.material ? ', ' + g.material : ''));
        div.innerHTML = '<span class="games-booth-scene" aria-hidden="true"></span>'
          + '<span class="games-booth-poster"><span class="games-booth-number">' + String(i + 1).padStart(2, '0') + '</span>'
          + '<span class="games-booth-glyph">' + (locked ? '?' : g.glyph) + '</span>'
          + '<span class="games-booth-copy"><span class="games-booth-name">' + esc(locked ? '???' : g.name) + '</span>'
          + '<span class="games-booth-material">' + esc(locked ? 'curtain still closed' : g.material) + '</span></span>'
          + '<span class="games-booth-mark" aria-hidden="true">›</span></span>';
        div.addEventListener('click', function () { selectGame(g); });
        grid.appendChild(div);
      })(GAMES[i]);
    }
    applyCamera();
  }

  function paintDesc(g) {
    if (!descBox) return;
    var html = '';
    inviteLines().forEach(function (u) {
      html += '<div class="games-invite"><span class="games-invite-who">' + esc(WHO_NAME[u.who] || u.who) + '</span> ' + esc(u.invite) + '</div>';
    });
    html += '<div class="games-desc-name">' + esc(g.name) + '</div><div>' + esc(g.pitch) + '</div>';
    descBox.innerHTML = html;
  }

  function paintLocked(g) {
    if (descBox) {
      descBox.innerHTML = '<div class="games-desc-name">???</div><div>' + esc(g.hint || 'not yet. keep playing.') + '</div>';
    }
    if (stage) {
      closeStage();
      stage.removeAttribute('inert');
      setView('attraction');
      stage.innerHTML = '<div class="games-stage-inner"><div class="games-stage-head">'
        + '<span class="games-stage-glyph">?</span>'
        + '<span class="games-stage-name">???</span>'
        + '<button type="button" class="games-stage-close" id="games-stage-close" aria-label="close">×</button>'
        + '</div><div class="games-locked">'
        + '<span class="games-locked-glyph">?</span>'
        + '<div>' + esc(g.hint || 'not yet. keep playing.') + '</div>'
        + '</div></div>';
      var lockedClose = document.getElementById('games-stage-close');
      if (lockedClose) lockedClose.addEventListener('click', closeStage);
    }
  }

  function selectGame(g) {
    current = g;
    buildPicker();
    if (!isUnlocked(g)) { paintLocked(g); return; }
    paintDesc(g);
    openPlay(g);
  }

  function byId(id) {
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
    return null;
  }

  // ── personal bests (kept: scripts/verify-gamification.mjs pins this) ──

  var BEST_OF = {
    tip: { key: 'ice', label: 'ice held', dir: 'high' },
  };

  function recordBest(boothId, value) {
    if (!window.Liber || !window.Liber.state) return null;
    var metric = BEST_OF[boothId];
    if (!metric || typeof value !== 'number' || isNaN(value) || value <= 0) return null;
    var bests = Object.assign({}, window.Liber.state.get().bests || {});
    var prev = typeof bests[boothId] === 'number' ? bests[boothId] : null;
    var better = prev === null || (metric.dir === 'high' ? value > prev : prev < value);
    if (!better) return { newBest: false, value: value, best: prev, label: metric.label };
    bests[boothId] = value;
    window.Liber.state.set({ bests: bests });
    return { newBest: true, value: value, best: value, label: metric.label };
  }

  // ── saving ────────────────────────────────────────────────────────────

  function thumb(srcCanvas, w) {
    try {
      w = w || 160;
      var scale = w / srcCanvas.width;
      var c = document.createElement('canvas');
      c.width = w;
      c.height = Math.max(1, Math.round(srcCanvas.height * scale));
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#101010';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(srcCanvas, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.72);
    } catch (e) { return null; }
  }

  // What reaches localStorage is a thumbnail, never the booth's frame. The
  // full-size picture lives in this session only, long enough for the save
  // dialog's PNG button to hand it over through the browser's own Save dialog.
  var SHOT_W = 320;              // stored width, in pixels
  var lastFullShot = null;       // { booth, url } — memory only, never stored

  function capShot(dataUrl, done) {
    var img = new Image();
    img.onload = function () {
      try {
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        var scale = w > SHOT_W ? SHOT_W / w : 1;
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * scale));
        c.height = Math.max(1, Math.round(h * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        done(c.toDataURL('image/jpeg', 0.7));
      } catch (e) { done(null); }
    };
    img.onerror = function () { done(null); };
    img.src = dataUrl;
  }

  // a real PNG, not a JPEG wearing a .png name
  function shotAsPng(dataUrl, done) {
    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        done(c.toDataURL('image/png'));
      } catch (e) { done(null); }
    };
    img.onerror = function () { done(null); };
    img.src = dataUrl;
  }

  function saveToDesktopAndJournal(b, result, shot) {
    if (!window.Liber || !window.Liber.state) return;
    var st = window.Liber.state;
    var payload = { kind: b.id, name: b.name, glyph: b.glyph, result: result, ts: Date.now() };
    lastFullShot = shot ? { booth: b.id, url: shot } : null;
    var kept = null;
    if (st.addArtifact) kept = st.addArtifact('games', WL(0, payload));
    // one keeps, one remembers: the journal row points at the artifact
    // instead of copying it, so the picture is stored once, not twice
    if (st.addArtifact && kept) {
      st.addArtifact('journal', WL(0, {
        kind: 'game',
        ref: { room: 'games', id: kept.id },
        name: b.name,
        ts: Date.now()
      }));
    }
    if (shot && kept && st.updateArtifact) {
      capShot(shot, function (small) {
        if (small) st.updateArtifact('games', kept.id, { shot: small });
      });
    }
    roundDirty = false;
    if (window.Liber.sound) { try { window.Liber.sound.play('chime'); } catch (e) {} }
  }

  // ── the quiet floor (TIPP) ────────────────────────────────────────────
  // DBT distress tolerance, walked one skill at a time. Never scores; the
  // ratings only describe what helped, for the next storm.

  // The keep prompt is a place in the room, not a floating state: it takes
  // a hash so the browser's own Back button steps out of it, and the round
  // underneath stays exactly where it was left.
  function setHash(h) {
    if ((location.hash || '') === h) return;
    try {
      if (h) { location.hash = h; hashLock = true; }
      else if (history.length > 1) { history.back(); hashLock = true; }
    } catch (e) { hashLock = false; }
  }

  function promptSave(b, summary, doSave, doDiscard) {
    var prompt = document.getElementById('games-save-prompt');
    var body = document.getElementById('games-save-prompt-body');
    if (!prompt) { doSave(); return; }
    pendingPayload = { summary: summary, doSave: doSave, doDiscard: doDiscard };
    lastFullShot = null;   // the previous booth's frame is not this one's
    if (body) body.innerHTML = 'booth: <em>' + esc(b.name) + '</em>. ' + summary;
    addPngButton(b);
    prompt.classList.add('open');
    prompt.removeAttribute('inert');
    setHash('#save');
  }

  // the export lives in the dialog, not on the shelf: PNG only, and the
  // browser's Save dialog decides where it lands
  function addPngButton(b) {
    var row = document.querySelector('#games-save-prompt .games-save-prompt-actions');
    if (!row || row.querySelector('.games-save-prompt-png')) return;
    var keepBtn = document.getElementById('games-save-prompt-keep');
    var btn = document.createElement('button');
    btn.type = 'button';
    // reuses the dialog's neutral button treatment rather than shipping a
    // second style for a third button; the class is the hook if it ever earns
    // one of its own
    btn.className = 'games-save-prompt-png games-save-prompt-discard';
    btn.textContent = 'keep a png';
    btn.setAttribute('aria-label', 'keep this one, and hand the picture over as a PNG');
    if (keepBtn && keepBtn.nextSibling) row.insertBefore(btn, keepBtn.nextSibling);
    else row.insertBefore(btn, row.firstChild);
  }

  var pendingPayload = null;

  function closePrompt() {
    var prompt = document.getElementById('games-save-prompt');
    if (!prompt) return;
    prompt.classList.remove('open');
    prompt.setAttribute('inert', '');
    pendingPayload = null;
    if ((location.hash || '') === '#save' && !hashLock) {
      try { history.back(); } catch (e) {}
    }
  }

  function closeStage() {
    if (!stage) return;
    if (stage._teardown) { try { stage._teardown(); } catch (e) {} stage._teardown = null; }
    stage.innerHTML = '';
    stage.setAttribute('inert', '');
    roundDirty = false;
    setView('facade');
  }

  // Walking away from a played-but-unkept round is the one irreversible loss
  // the midway asks about. Nothing else here nags.
  function requestClose() {
    if (roundDirty && !window.confirm('this round is not kept yet. walk away from it?')) return false;
    closeStage();
    return true;
  }

  // The stage element outlives its contents, so one delegated pair of
  // listeners covers every booth: anything the player touches in the body
  // means there is now something to lose.
  function watchRound() {
    if (!stage) return;
    var inBody = function (e) {
      if (e.target && e.target.closest && e.target.closest('.games-stage-head')) return;
      roundDirty = true;
    };
    stage.addEventListener('pointerdown', inBody);
    stage.addEventListener('keydown', inBody);
  }

  function stepBack() {
    // the keep prompt holds the Back button while it is open — one step
    // closes the prompt, and the round is still there to play
    var prompt = document.getElementById('games-save-prompt');
    if (prompt && prompt.classList.contains('open')) { closePrompt(); return; }
    closeRaisonSafe();
    if (stage && !stage.hasAttribute('inert')) {
      var gid = current ? current.id : null;
      if (!requestClose()) return;
      if (gid) {
        var back = grid && grid.querySelector('.games-booth[data-game="' + gid + '"]');
        if (back) back.focus();
      }
    }
  }

  function closeRaisonSafe() {
    var raison = document.getElementById('games-raison');
    if (raison) { raison.classList.remove('open'); raison.setAttribute('inert', ''); }
  }

  function openPlay(b) {
    if (!stage) return;
    closeStage();
    stage.removeAttribute('inert');
    setView('attraction');
    var html = '<div class="games-stage-inner">';
    html += '<div class="games-stage-head">';
    html += '<span class="games-stage-glyph">' + b.glyph + '</span>';
    html += '<span class="games-stage-name">' + esc(b.name) + '</span>';
    html += '<button type="button" class="games-stage-close" id="games-stage-close" aria-label="close">×</button>';
    html += '</div>';
    html += '<div class="games-stage-body" id="games-stage-body"></div>';
    html += '</div>';
    stage.innerHTML = html;
    var closeBtn = document.getElementById('games-stage-close');
    if (closeBtn) closeBtn.addEventListener('click', requestClose);
    var body = document.getElementById('games-stage-body');
    if (!body) return;
    renderPlay(b, body);
  }

  function renderPlay(b, body) {
    body.innerHTML = '';
    var fn = window.LiberBooths ? BOOTH_PLAY[b.id] : null;
    if (fn) return fn(boothCtx, b, body, b.id);
  }

  function thunk() {
    if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play('thunk'); } catch (e) {} }
  }

  // ── emotion wheel ─────────────────────────────────────────────────────

  // ── paint games: mask / shield / circles ──────────────────────────────

  // ── powder tent ───────────────────────────────────────────────────────

  // ── tide pool: Vanir's game ───────────────────────────────────────
  // A rock pool on a slow timer. Drop a feeling at high tide and it
  // floats; at low tide it strands. Release lets the floaters out.
  // No winning — the pool decides the pacing, you decide the honesty.

  // ── ink storm: Entity404's game ─────────────────────────────────────
  // A terminal rains glyphs; type the shown word to "execute" it. Missed
  // words dissolve — zero fail state. The storm slows when you struggle
  // and tells you so, kindly.

  // (The thimble garden section retired with the booth: the pot is the
  // Glasshouse tree now, and its legacy visits live in garden/tree.js.)

  // ── first-visit demo: the tutorial passes through games on its way to
  // the bind. Open the wheel, throw one dart through the Cursor's hands,
  // keep it, and move on. Every step falls through to advance().

  document.addEventListener('DOMContentLoaded', function () {
    buildPicker();
    watchRound();

    // Deep link: #<booth id> pans the midway to that booth and opens it.
    // The Learn shelf's TIPP card cross-links here as #tipp.
    var deepId = (location.hash || '').replace(/^#/, '').toLowerCase();
    var deepGame = deepId ? byId(deepId) : null;
    if (deepGame) {
      var deepIdx = CAMERA_ORDER.indexOf(deepGame.id);
      if (deepIdx >= 0) cameraIndex = deepIdx;
      selectGame(deepGame);
    }

    if (panLeft) panLeft.addEventListener('click', function () { moveCamera(-1); });
    if (panRight) panRight.addEventListener('click', function () { moveCamera(1); });
    Array.prototype.forEach.call(document.querySelectorAll('.games-shingle'), function (el) {
      el.addEventListener('click', function () {
        var g = byId(el.getAttribute('data-goto'));
        if (g) {
          selectGame(g);
          var closeBtn = document.getElementById('games-stage-close');
          if (closeBtn) closeBtn.focus();
        }
      });
    });
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === 'Escape') { stepBack(); return; }
      if (typing) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveCamera(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveCamera(1); }
    });
    if (descBox && !descBox.querySelector('.games-desc-name')) {
      descBox.innerHTML = '<div class="games-desc-name">pick a game, friend.</div><div>follow the dirt path, pan the midway, and pull a poster when you are ready.</div>';
    }

    (function tutorialBooth() {
      var tst = (window.Liber && window.Liber.state) || null;
      if (!tst || !window.Cursor) return;
      if ((tst.get().tutorialStage || null) !== 'games') return;
      function advance() {
        var s2 = (window.Liber && window.Liber.state) || null;
        if (!s2) return;
        if ((s2.get().tutorialStage || null) !== 'games') return;
        s2.set({ tutorialStage: 'bind' });
        window.location.href = 'desktop.html';
      }
      setTimeout(function () {
        var booth = document.querySelector('.games-booth[data-game="wheel"]');
        if (!booth) { advance(); return; }
        window.Cursor.clickEl(booth, 700).then(function () {
          setTimeout(function () {
            var wheel = document.getElementById('wheel-svg');
            if (!wheel) { advance(); return; }
            window.Cursor.clickEl(wheel, 400).then(function () {
              setTimeout(function () {
                var swatch = document.querySelector('#wheel-colors .wheel-color');
                if (!swatch) { advance(); return; }
                window.Cursor.clickEl(swatch, 400).then(function () {
                  setTimeout(function () {
                    var keep = document.getElementById('games-save-prompt-keep');
                    var kb = document.getElementById('wheel-keep');
                    if (kb) kb.click();
                    setTimeout(function () {
                      if (!keep) { advance(); return; }
                      window.Cursor.clickEl(keep, 400).then(function () {
                        setTimeout(advance, 1000);
                      });
                    }, 700);
                  }, 700);
                });
              }, 900);
            });
          }, 700);
        });
      }, 1000);
    })();

    var exit = document.getElementById('games-exit');
    if (exit) exit.addEventListener('click', function () {
      if (history.length > 1) history.back(); else location.href = 'desktop.html';
    });

    var helpBtn = document.getElementById('games-help');
    var raison = document.getElementById('games-raison');
    var raisonClose = document.getElementById('games-raison-close');
    function openRaison() {
      if (raison) { raison.classList.add('open'); raison.removeAttribute('inert'); }
    }
    function closeRaison() {
      if (raison) { raison.classList.remove('open'); raison.setAttribute('inert', ''); }
    }
    if (helpBtn) helpBtn.addEventListener('click', openRaison);
    if (raisonClose) raisonClose.addEventListener('click', closeRaison);
    if (raison) raison.addEventListener('click', function (e) { if (e.target === raison) closeRaison(); });
    if (window.LiberRoomShell) window.LiberRoomShell.bindRoomOverlays({ overlays: [
      { id: 'games-raison', close: closeRaison }
    ] });

    var prompt = document.getElementById('games-save-prompt');
    var keepBtn = document.getElementById('games-save-prompt-keep');
    var discardBtn = document.getElementById('games-save-prompt-discard');
    var closeBtn = document.getElementById('games-save-prompt-close');
    if (keepBtn) keepBtn.addEventListener('click', function () {
      var p = pendingPayload;
      closePrompt();
      if (p && p.doSave) p.doSave();
    });
    if (discardBtn) discardBtn.addEventListener('click', function () {
      var p = pendingPayload;
      closePrompt();
      if (p && p.doDiscard) p.doDiscard();
    });
    if (closeBtn) closeBtn.addEventListener('click', closePrompt);
    if (prompt) prompt.addEventListener('click', function (e) { if (e.target === prompt) closePrompt(); });
    // the png button is built per prompt, so it is caught by delegation
    if (prompt) prompt.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains('games-save-prompt-png')) return;
      e.stopPropagation();
      var p = pendingPayload;
      closePrompt();
      if (p && p.doSave) p.doSave();
      var s = lastFullShot;
      if (!s) return;
      shotAsPng(s.url, function (png) {
        if (!png) return;
        var a = document.createElement('a');
        a.href = png;
        a.download = s.booth + '-' + new Date().toISOString().slice(0, 10) + '.png';
        document.body.appendChild(a);
        a.click();
        if (a.parentNode) a.parentNode.removeChild(a);
      });
    });
    window.addEventListener('hashchange', function () {
      if (hashLock) { hashLock = false; return; }
      if ((location.hash || '') === '#save') return;
      if (prompt && prompt.classList.contains('open')) closePrompt();
    });
    if (window.LiberRoomShell) window.LiberRoomShell.bindRoomOverlays({ overlays: [
      { id: 'games-save-prompt', close: closePrompt }
    ] });
    if (window.LiberRoomShell.bindConfirmKey) window.LiberRoomShell.bindConfirmKey(['games-save-prompt']);
  });

  window.Liber = window.Liber || {};
  window.Liber.games = { recordBest: recordBest, bestOf: BEST_OF };
})();
