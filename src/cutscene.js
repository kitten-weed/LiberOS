// cutscene.js — tutorial cutscene v3 controller (desktop only).
// Beat-accurate to the V3 traveller script. Content lives in
// src/cutscene-v2.data.js (RITUAL + BEATS) for loader compatibility; this file is behavior only —
// stage directions become controller/CSS behavior, never rendered copy.
// Starts at "Oh hello <name>!" — the name gate already ran in enter-rite.
// Typewriter ~40cps letter-by-letter on every dialogue beat, no skip.
// Chatboxes are bodies keyed by dataset.speaker [liber-vacui, wanderlust,
// riason, physius]: a new speaker enters physically, the single gate sits
// under both when they are done. The liber-vacui body IS the traveller:
// it is labeled with the alias they entered in the rite and wears the
// room's cream/gold material — the machine speaks in their voice.
// Persistence is state.js ONLY: tutorialBeat (reload-resume cursor),
// keysNamed (wakes the dock), tutorialDone/tutorialStage, plus the one
// REAL poppet the embedded worktable teaches + its relation
// (LiberPoppet.mountTutor drives the genuine app; addArtifact/
// bindRelation are the fallback path only).

(function () {
  'use strict';

  var CPS = 40;
  var HOLD_MS = 1700;

  // the embedded real poppet worktable (LiberPoppet.mountTutor) + its
  // detached-but-cached wrapper for resume; null until the Physius mount.
  var poppetApi = null;
  var poppetBenchWrap = null;
  var primaryKeepReader = null;
  var primaryKeepReadPromise = null;
  var keepCommitFactory = null;
  var keepCommitFactoryPromise = null;
  var riteControlState = null;
  var riteCutsceneState = null;
  var tutorialStartToken = 0;
  var spellRoot = null;
  var spellBodyInertStates = [];

  function st() {
    return (window.Liber && window.Liber.state) || null;
  }

  function store() {
    return st() ? st().get() : {};
  }

  function el(id) { return document.getElementById(id); }

  function data() {
    return window.CutsceneV2Data || { RITUAL: [], BEATS: [] };
  }

  function beats() { return data().BEATS || []; }

  function production() { return data().PRODUCTION || []; }

  function applyProductionContract(meta) {
    var root = el('cutscene');
    if (!root || !meta) return;
    root.dataset.sceneAuthority = meta.authority || meta.speaker || 'machine';
    root.dataset.sceneSurface = meta.surface || 'cast-box';
    root.dataset.sceneMode = meta.mode || 'advance';
    root.dataset.sceneCarry = meta.carry && meta.carry.residue ? meta.carry.residue : '';
    root.style.setProperty('--ctv-enter-ms', String((meta.timing && meta.timing.enter) || 0) + 'ms');
    root.style.setProperty('--ctv-hold-ms', String((meta.timing && meta.timing.hold) || 0) + 'ms');
    root.style.setProperty('--ctv-handoff-ms', String((meta.timing && meta.timing.handoff) || 0) + 'ms');
  }

  function aliasOf() {
    return store().travellerAlias || 'traveller';
  }

  function fillName(text) {
    return String(text == null ? '' : text)
      .split('<name>').join(aliasOf())
      .split('<you>').join(aliasOf());
  }

  function rememberSpellBody(body) {
    if (!spellRoot || !body) return;
    for (var i = 0; i < spellBodyInertStates.length; i++) {
      if (spellBodyInertStates[i].body === body) return;
    }
    spellBodyInertStates.push({ body: body, inert: !!body.inert });
    body.inert = true;
  }

  function beginSpellPresentation(root) {
    restoreSpellPresentation();
    spellRoot = root;
    root.classList.add('is-spell');
    var bodies = root.querySelectorAll('.ctv-body');
    for (var i = 0; i < bodies.length; i++) rememberSpellBody(bodies[i]);
  }

  function restoreSpellPresentation() {
    if (!spellRoot) return;
    spellRoot.classList.remove('is-spell');
    for (var i = 0; i < spellBodyInertStates.length; i++) {
      var saved = spellBodyInertStates[i];
      saved.body.inert = saved.inert;
    }
    spellBodyInertStates = [];
    spellRoot = null;
  }

  function clearBox() {
    var old = el('cutscene');
    if (old) {
      restoreSpellPresentation();
      old.remove();
    }
  }

  function clearTransientTutorialNodes() {
    var selectors = [
      '.cutscene-flash', '.ctv-flash', '.ctv-ritual', '.ctv-montage', '.ctv-timewheel',
      '.ctv-concept-cards', '.ctv-as-above-copy', '.ctv-floor-inscription',
      '.ctv-stone-seam', '.ctv-void-aperture', '.ctv-arcana-table-shift',
      '.ctv-physius-summon', '.ctv-arcana-summon', '.ctv-vanir-summon',
      '.ctv-wander-weather', '.ctv-rainy-card',
      '.ctv-divination-table', '.ctv-artifact', '.ctv-relate', '.ctv-breach',
      '.ctv-breach-ring', '.ctv-finale', '.ctv-finale-orbit', '.ctv-poppet-montage',
      '.ctv-cracks', '.ctv-stars', '.ctv-vanir-puddle', '.ctv-self-figure', '.ctv-sheen'
    ];
    for (var i = 0; i < selectors.length; i++) {
      document.querySelectorAll(selectors[i]).forEach(function (node) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
      });
    }
    document.querySelectorAll('.ctv-pulse-geometry, .ctv-smoke, .ctv-sheen').forEach(function (node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
  }

  function chime() {
    if (window.Liber && window.Liber.sound) {
      try { window.Liber.sound.play('chime'); } catch (e) {}
    }
  }

  function thunk() {
    if (window.Liber && window.Liber.sound) {
      try { window.Liber.sound.play('thunk'); } catch (e) {}
    }
  }

  function shakeMachine(ms) {
    var m = document.querySelector('.machine');
    if (!m) return;
    m.classList.remove('do-shake-hard');
    void m.offsetWidth;
    m.classList.add('do-shake-hard');
    setTimeout(function () { m.classList.remove('do-shake-hard'); }, ms || 1200);
  }

  function flash(color, ms) {
    var f = document.createElement('div');
    f.className = 'cutscene-flash';
    if (color) f.style.background = color;
    document.body.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, ms || 500);
  }

  function cursor(idx) {
    var flow = window.LiberTutorialFlow;
    if (!flow) {
      reportTutorialFailure('tutorial-cursor-helper-missing', new Error('tutorial flow helper is unavailable'));
      return;
    }
    if (st()) st().set(flow.patchAt(idx));
  }

  function reportTutorialFailure(event, error) {
    var detail = { message: error && error.message ? String(error.message) : String(error || '') };
    if (st() && st().diagnose) st().diagnose(event, detail);
    else if (window.console && window.console.error) window.console.error(event, error);
  }

  function loadPrimaryKeepReader() {
    if (primaryKeepReader) return Promise.resolve(primaryKeepReader);
    if (!primaryKeepReadPromise) {
      primaryKeepReadPromise = import('../poppet-lab/keepsake.js?v=lab55').then(function (module) {
        if (!module || typeof module.readKeepsakes !== 'function') {
          throw new Error('strict keepsake reader is unavailable');
        }
        primaryKeepReader = module.readKeepsakes;
        return primaryKeepReader;
      }).catch(function (error) {
        primaryKeepReadPromise = null;
        throw error;
      });
    }
    return primaryKeepReadPromise;
  }

  function loadKeepCommitFactory() {
    if (keepCommitFactory) return Promise.resolve(keepCommitFactory);
    if (!keepCommitFactoryPromise) {
      keepCommitFactoryPromise = import('../poppet-lab/keep-commit.js?v=commit1').then(function (module) {
        if (!module || typeof module.createKeepCommit !== 'function') {
          throw new Error('keepsake commit controller is unavailable');
        }
        keepCommitFactory = module.createKeepCommit;
        return keepCommitFactory;
      }).catch(function (error) {
        keepCommitFactoryPromise = null;
        throw error;
      });
    }
    return keepCommitFactoryPromise;
  }

  function setRiteControlOwnership(owned) {
    if (owned) {
      if (riteControlState) return;
      try {
        if (window.LiberTraveROM && typeof window.LiberTraveROM.close === 'function') {
          window.LiberTraveROM.close();
        }
      } catch (error) { reportTutorialFailure('rite-console-close-failed', error); }
      try {
        if (window.Liber && window.Liber.crtBay && typeof window.Liber.crtBay.closeTray === 'function') {
          window.Liber.crtBay.closeTray();
        }
      } catch (error) { reportTutorialFailure('rite-cartridge-close-failed', error); }
      riteControlState = [];
      [
        document.getElementById('desktop'),
        document.querySelector('.crt-bay'),
        document.getElementById('crt-bay-tray'),
        document.querySelector('.traverom-stage')
      ].forEach(function (node) {
        if (!node || riteControlState.some(function (entry) { return entry.node === node; })) return;
        riteControlState.push({ node: node, inert: !!node.inert });
        node.inert = true;
      });
      return;
    }
    if (!riteControlState) return;
    riteControlState.forEach(function (entry) {
      if (entry.node) entry.node.inert = entry.inert;
    });
    riteControlState = null;
  }

  function yieldCutsceneToRite() {
    var root = el('cutscene');
    if (root && !riteCutsceneState) {
      riteCutsceneState = { node: root, inert: !!root.inert };
      root.classList.add('is-yielded');
      root.inert = true;
    }
    setRiteControlOwnership(true);
  }

  function restoreCutsceneFromRite() {
    if (riteCutsceneState) {
      var state = riteCutsceneState;
      if (state.node) {
        state.node.classList.remove('is-yielded');
        state.node.inert = state.inert;
      }
      riteCutsceneState = null;
    }
    setRiteControlOwnership(false);
  }

  function firstMakingRequested() {
    return /(?:^|[?&])first-making=1(?:&|$)/.test(String(window.location.search || '').replace(/^\?/, ''));
  }

  function clearFirstMakingRequest() {
    if (!firstMakingRequested() || !window.history || !window.history.replaceState) return;
    var params = String(window.location.search || '').replace(/^\?/, '').split('&').filter(function (part) {
      return part && !/^first-making=1$/.test(part);
    });
    window.history.replaceState(null, '', window.location.pathname
      + (params.length ? '?' + params.join('&') : '')
      + (window.location.hash || ''));
  }

  function openCompletedFirstMaking() {
    if (!window.LiberPoppetRite) {
      reportTutorialFailure('first-making-rite-unavailable', new Error('first-making rite is unavailable'));
      return;
    }
    document.body.classList.add('ctv-poppet-glow');
    setRiteControlOwnership(true);
    var active = window.LiberPoppetRite.open({
      onKeep: function (result, destination) {
        void result;
        document.body.classList.remove('ctv-poppet-glow');
        clearFirstMakingRequest();
        setRiteControlOwnership(false);
        if (destination === 'workshop') {
          window.location.href = 'sigil.html';
          return;
        }
        renderDesktopResidue();
      },
      onDismiss: function () {
        document.body.classList.remove('ctv-poppet-glow');
        clearFirstMakingRequest();
        setRiteControlOwnership(false);
      },
      onError: function (error) {
        reportTutorialFailure('first-making-setup-failed', error);
      }
    });
    if (!active) {
      document.body.classList.remove('ctv-poppet-glow');
      setRiteControlOwnership(false);
    }
  }

  function resolveAndPlay(clearPause) {
    var token = ++tutorialStartToken;
    return loadPrimaryKeepReader().then(function (readKeepsakes) {
      if (token !== tutorialStartToken) return;
      var flow = window.LiberTutorialFlow;
      if (!flow) throw new Error('tutorial flow helper is unavailable');
      var shelf = readKeepsakes();
      var resolved = flow.resolveCursor(store(), shelf.length > 0);
      if (resolved.blocked) {
        reportTutorialFailure('tutorial-cursor-blocked', new Error(resolved.reason + ': ' + String(resolved.id || '')));
        liftVeil();
        return;
      }
      if (st()) {
        st().set(resolved.patch);
        if (clearPause) st().set({ tutorialPaused: false });
      }
      if (resolved.index >= beats().length) {
        endClean(true);
        return;
      }
      playFrom(resolved.index);
    }).catch(function (error) {
      if (token !== tutorialStartToken) return;
      reportTutorialFailure('tutorial-cursor-resolution-failed', error);
      liftVeil();
    });
  }

  // ── cast: speaker bodies ──────────────────────────────────────────────
  // One body per speaker, appended in arrival order. A body that leaves
  // (shrink, skulk, obliteration) is removed from the cast for real.

  function cast() {
    var root = el('cutscene');
    if (!root) return null;
    var c = root.querySelector('.ctv-cast');
    return c;
  }

  function voiceLabel(speaker) {
    // the liber vacui speaks as the traveller's own voice: its chatbox
    // carries the name entered in the enter rite, not the machine's name.
    if (speaker === 'liber-vacui') return aliasOf() || 'liber vacui';
    return speaker;
  }

  function bodyOf(speaker) {
    var root = el('cutscene');
    if (!root) return null;
    // Bodies can be elevated above the embedded worktable while the Poppet
    // is open; querying the cast only made Physius disappear behind the app.
    return root.querySelector('.ctv-body[data-speaker="' + speaker + '"]');
  }

  function placePoppetSidecar(body, speaker) {
    var root = el('cutscene');
    if (!root || !body || !root.classList.contains('has-poppet')) return;
    if (speaker !== 'physius' && speaker !== 'liber-vacui') return;
    root.appendChild(body);
    body.classList.add('ctv-poppet-sidecar');
    body.style.setProperty('left', 'auto', 'important');
    body.style.setProperty('right', '2%', 'important');
    body.style.setProperty('bottom', 'auto', 'important');
    body.style.setProperty('top', speaker === 'physius' ? '3%' : 'calc(3% + 28% + 10px)', 'important');
    body.style.setProperty('width', speaker === 'physius' ? '33%' : '25%', 'important');
    body.style.setProperty('max-width', speaker === 'physius' ? '33%' : '25%', 'important');
    body.style.setProperty('max-height', speaker === 'physius' ? '28%' : '14%', 'important');
    if (speaker === 'liber-vacui') body.style.setProperty('transform', 'none', 'important');
  }

  function ensureBody(speaker, enterFx) {
    var c = cast();
    if (!c) return null;
    var b = bodyOf(speaker);
    if (b) {
      rememberSpellBody(b);
      b.classList.remove('is-dim');
      placePoppetSidecar(b, speaker);
      return b;
    }
    b = document.createElement('div');
    b.className = 'ctv-body ctv-' + speaker + (speaker === 'liber-vacui' ? ' ctv-traveller' : '');
    b.dataset.speaker = speaker;
    if (enterFx) b.classList.add(enterFx);
    b.innerHTML = '<div class="ctv-aura" aria-hidden="true"><i></i><i></i><i></i></div>'
      + '<div class="ctv-head"><span class="ctv-eye" aria-hidden="true">'
      + '<span class="ctv-iris"><span class="ctv-pupil"></span></span></span>'
      + '<div class="ctv-voice">' + voiceLabel(speaker) + '</div></div>'
      + '<div class="ctv-line" aria-live="polite"></div>'
      + '<div class="ctv-ink-trail" aria-hidden="true"></div>';
    c.appendChild(b);
    rememberSpellBody(b);
    void b.offsetWidth;
    b.classList.add('is-live');
    placePoppetSidecar(b, speaker);
    return b;
  }

  function dimOthers(speaker) {
    var root = el('cutscene');
    var c = cast();
    if (!root || !c) return;
    var kids = root.querySelectorAll('.ctv-body');
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].dataset.speaker !== speaker) kids[i].classList.add('is-dim');
    }
    var live = bodyOf(speaker);
    if (live) {
      try {
        var delta = live.offsetTop - c.scrollTop - 12;
        if (delta < 0 || delta + live.offsetHeight > c.clientHeight) c.scrollTop = live.offsetTop - 12;
      } catch (e) {}
    }
  }

  function setTone(body, tone) {
    if (!body) return;
    var tones = ['is-jovial', 'is-suspicious', 'is-alarmed', 'is-dry', 'is-still'];
    for (var i = 0; i < tones.length; i++) body.classList.remove(tones[i]);
    if (tone === 'dry') body.classList.add('is-dry');
    else if (tone === 'still') body.classList.add('is-still');
    else if (tone === 'jovial') body.classList.add('is-jovial');
    else if (tone === 'suspicious') body.classList.add('is-suspicious');
    else if (tone === 'alarmed') body.classList.add('is-alarmed');
  }

  // Every authored beat moves the room, not only the beats that have a
  // named spectacle. The pulse is visual-only: no new copy, no state, and
  // no timing dependency for the tutorial cursor.
  function beatPulse(beat) {
    var root = el('cutscene');
    if (!root) return;
    var names = ['ctv-pulse-jovial', 'ctv-pulse-suspicious', 'ctv-pulse-alarmed', 'ctv-pulse-dry', 'ctv-pulse-still', 'ctv-pulse-ritual'];
    for (var i = 0; i < names.length; i++) root.classList.remove(names[i]);
    var tone = beat && beat.tone;
    var cls = tone ? 'ctv-pulse-' + tone : (beat && beat.kind === 'ritual' ? 'ctv-pulse-ritual' : 'ctv-pulse-still');
    root.classList.add(cls);
    var geometry = document.createElement('div');
    geometry.className = 'ctv-pulse-geometry';
    geometry.setAttribute('aria-hidden', 'true');
    root.appendChild(geometry);
    setTimeout(function () { if (geometry.parentNode) geometry.parentNode.removeChild(geometry); }, 1200);
    void root.offsetWidth;
    var screen = document.querySelector('.screen');
    if (screen) {
      screen.classList.remove('ctv-screen-pulse');
      void screen.offsetWidth;
      screen.classList.add('ctv-screen-pulse');
      setTimeout(function () { screen.classList.remove('ctv-screen-pulse'); }, 900);
    }
    setTimeout(function () { root.classList.remove(cls); }, 900);
  }

  function removeBody(speaker) {
    var b = bodyOf(speaker);
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  // ── gate: one response box under both bodies ──────────────────────────

  function placePoppetGate(gate) {
    if (!gate) return;
    gate.classList.add('ctv-poppet-gate');
    gate.style.position = 'absolute';
    gate.style.left = '82%';
    gate.style.right = 'auto';
    gate.style.top = 'calc(3% + 28% + 10px + 14% + 10px)';
    gate.style.bottom = 'auto';
    gate.style.width = '16%';
    gate.style.maxWidth = '16%';
    gate.style.margin = '0';
    gate.style.transform = 'none';
  }

  // ── Wanderlust's hand: the hijacked keyboard ─────────────────────────
  // The traveller's responses are TYPED BY THE MACHINE — the player never
  // types, never presses Enter to speak. But the scene's PACING stays with
  // the player: the hijacked response types into the response gate, then
  // arms itself and waits for a click (or Enter/Space on focus) before the
  // beat advances. Only the text is automated; the cutscene is not.
  var HIJACK_CPS = 26;
  // auto: when true, the armed response fires itself after a breath instead
  // of waiting for the player's click — Wanderlust acting on her own words
  // (the poppet handoff). Guarded against double-fire either way.
  function autoAdvance(label, onAdvance, auto) {
    var root = el('cutscene');
    if (!root) { onAdvance(); return; }
    // gateRow keeps the original geometry — including the poppet-worktable
    // placement — and owns the consumed/disabled click contract.
    var fired = false;
    var fire = function () {
      if (fired) return;
      fired = true;
      onAdvance();
    };
    var btn = gateRow(label || '>>', fire);
    if (!btn) { onAdvance(); return; }
    if (root.classList.contains('has-poppet')) btn.classList.add('ctv-act');
    btn.classList.add('ctv-response-auto');
    btn.disabled = true;              // cannot advance mid-sentence
    var full = fillName(label || '>>');
    var i = 0;
    var per = Math.round(1000 / HIJACK_CPS);
    var timer = setInterval(function () {
      i += 1;
      btn.textContent = full.slice(0, i);
      if (i >= full.length) {
        clearInterval(timer);
        btn.classList.remove('ctv-response-auto');
        btn.classList.add('is-armed');
        btn.disabled = false;
        btn.hidden = false;           // armed: the player's click advances —
                                      // unless this beat fires itself (auto)
        try { btn.focus(); } catch (e) {}
        if (auto) setTimeout(fire, 1100);
      }
    }, per);
  }

  // The possessed-hand grammar for a real input field (Arcana typing her
  // demo verb): the field fills letter by letter, then the action fires.
  function typeIntoInput(input, text, done) {
    var full = fillName(text);
    var i = 0;
    var per = Math.round(1000 / HIJACK_CPS);
    input.classList.add('is-possessed');
    var timer = setInterval(function () {
      i += 1;
      input.value = full.slice(0, i);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (i >= full.length) {
        clearInterval(timer);
        input.classList.remove('is-possessed');
        setTimeout(done, 380);
      }
    }, per);
  }

  function gateRow(label, onAdvance) {
    var root = el('cutscene');
    if (!root) return null;
    var old = root.querySelector('.ctv-gate');
    if (old) old.remove();
    var row = document.createElement('div');
    row.className = 'ctv-gate';
    // The Poppet lesson has a real worktable beneath this layer. Mark the
    // gate at creation time so a resumed beat cannot briefly paint the
    // advance control across the sewing document while CSS state catches up.
    if (root.classList.contains('has-poppet') || root.querySelector('.ctv-poppet')) {
      placePoppetGate(row);
    }
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ctv-response cutscene-option';
    btn.id = 'ctv-response';
    btn.textContent = label || '>>';
    btn.hidden = true;
    btn.addEventListener('click', function () {
      // consumed guard: a same-tick double-click advances exactly one beat.
      if (btn.dataset.consumed) return;
      btn.dataset.consumed = '1';
      btn.disabled = true;
      onAdvance();
    });
    row.appendChild(btn);
    var rail = root.querySelector('.ctv-response-rail');
    (rail || root).appendChild(row);
    return btn;
  }

  function setResponseMode(mode) {
    var root = el('cutscene');
    if (!root) return;
    root.dataset.responseMode = mode || 'advance';
    root.classList.toggle('is-action-locked', mode === 'action-lock');
    var rail = root.querySelector('.ctv-response-rail');
    if (rail) rail.hidden = mode === 'action-lock';
  }

  function openGate(label, onAdvance, mode) {
    var nextMode = mode || ((label && label !== '>>') ? 'choice' : 'advance');
    setResponseMode(nextMode);
    var btn = gateRow(label, onAdvance);
    if (btn) btn.hidden = false;
    return btn;
  }

  function closeGate(mode) {
    var root = el('cutscene');
    if (!root) return;
    var gate = root.querySelector('.ctv-gate');
    if (gate) gate.remove();
    setResponseMode(mode || 'action-lock');
  }

  // ── typewriter: ~40cps, letter-by-letter, no skip ─────────────────────

  function revealRiasonParentheticals(lineEl) {
    if (!lineEl || !lineEl.closest('.ctv-riason')) return;
    var source = lineEl.dataset.riasonSource || lineEl.textContent || '';
    if (source.indexOf('(') < 0) return;
    var frag = document.createDocumentFragment(), cursor = 0, openAt = -1, depth = 0;
    for (var i = 0; i < source.length; i++) {
      if (source[i] === '(') { if (depth === 0) openAt = i; depth++; }
      else if (source[i] === ')' && depth) {
        depth--;
        if (depth === 0 && openAt >= 0) {
          var term = document.createElement('span');
          term.className = 'ctv-hover-term'; term.tabIndex = 0;
          term.addEventListener('focus', function (event) {
            var current = event.currentTarget;
            var siblings = lineEl.querySelectorAll('.ctv-hover-term');
            for (var si = 0; si < siblings.length; si++) {
              if (siblings[si] !== current) siblings[si].classList.remove('is-hover-open');
            }
            current.classList.add('is-hover-open');
          });
          term.addEventListener('blur', function (event) {
            event.currentTarget.classList.remove('is-hover-open');
          });
          var lead = source.slice(cursor, openAt);
          var trimmedLead = lead.trim();
          var visible = trimmedLead.replace(/^,\s*(?:and\s+)?/i, '');
          var leadStart = trimmedLead ? lead.indexOf(trimmedLead) : lead.length;
          var visibleStart = leadStart + (trimmedLead.length - visible.length);
          if (visibleStart > 0) frag.appendChild(document.createTextNode(lead.slice(0, visibleStart)));
          term.textContent = visible || 'term';
          var definition = source.slice(openAt + 1, i).trim();
          term.setAttribute('data-definition', definition);
          term.title = definition;
          term.setAttribute('aria-label', (visible || 'term') + ': ' + definition);
          frag.appendChild(term);
          cursor = i + 1; openAt = -1;
        }
      }
    }
    if (cursor < source.length) frag.appendChild(document.createTextNode(source.slice(cursor)));
    lineEl.textContent = ''; lineEl.appendChild(frag); lineEl.classList.add('has-hover-definitions');
  }

  function riasonVisibleText(text) {
    return String(text || '').replace(/\([^()]*\)/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim();
  }

  function typewrite(lineEl, text, done) {
    var full = fillName(text);
    var isRiason = !!(lineEl && lineEl.closest('.ctv-riason') && full.indexOf('(') >= 0);
    var visible = isRiason ? riasonVisibleText(full) : full;
    if (lineEl) {
      if (isRiason) lineEl.dataset.riasonSource = full;
      else delete lineEl.dataset.riasonSource;
    }
    lineEl.textContent = '';
    var i = 0;
    var per = Math.round(1000 / CPS);
    var timer = setInterval(function () {
      i += 1;
      lineEl.textContent = visible.slice(0, i);
      if (i >= visible.length) {
        clearInterval(timer);
        if (done) done();
      }
    }, per);
    return timer;
  }

  // A name is not a password: the summoning accepts a damaged, hurried
  // transcription. Case, punctuation, repeated spaces and trailing ellipses
  // are disposable; typed characters only need to arrive in the right order.
  function summonKey(value) {
    return String(value || '').toLowerCase().replace(/[\u2026.!,?;:'"“”‘’—_\-\s]/g, '');
  }

  function summonSubsequence(typed, target) {
    var ti = 0;
    for (var i = 0; i < typed.length; i++) {
      var found = target.indexOf(typed[i], ti);
      if (found < 0) return false;
      ti = found + 1;
    }
    return true;
  }

  function summonProgress(value, target) {
    var typed = summonKey(value);
    var wanted = summonKey(target);
    if (!typed || !wanted || !summonSubsequence(typed, wanted)) return 0;
    return typed.length / wanted.length;
  }

  function possessInput(input, target, row, lineIndex, finish) {
    var wanted = fillName(target);
    var cursorAt = input.value.length;
    var tail = wanted.slice(Math.max(0, cursorAt));
    input.classList.add('is-possessed');
    row.classList.add('is-possessed');
    var n = 0;
    function take() {
      if (n >= tail.length) {
        input.value = wanted;
        input.classList.remove('is-possessed');
        row.classList.remove('is-possessed');
        finish();
        return;
      }
      // The hand keeps trying to finish the line, but lets the traveller
      // retain a little authorship on the earlier verses.
      input.value = wanted.slice(0, cursorAt + n + 1);
      n += 1;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(take, Math.max(38, 132 - lineIndex * 20));
    }
    setTimeout(take, Math.max(90, 260 - lineIndex * 42));
  }

  function fxLogicSlip(body) {
    if (!body) return;
    var slip = document.createElement('div');
    slip.className = 'ctv-logic-slip';
    slip.setAttribute('aria-hidden', 'true');
    slip.innerHTML = '<span>OBJECT</span><i>↔</i><span>SELF?</span>';
    body.appendChild(slip);
    setTimeout(function () { if (slip.parentNode) slip.parentNode.removeChild(slip); }, 2100);
  }

  function revealIdentities(lineEl, names, done) {
    if (!names || !names.length) { done(); return; }
    var host = document.createElement('span');
    host.className = 'ctv-identities';
    lineEl.appendChild(document.createTextNode(' '));
    lineEl.appendChild(host);
    var i = 0;
    function one() {
      if (i >= names.length) { done(); return; }
      var chip = document.createElement('span');
      chip.className = 'ctv-identity ctv-identity-' + i;
      chip.textContent = names[i];
      host.appendChild(chip);
      void chip.offsetWidth;
      chip.classList.add('is-revealed');
      i += 1;
      setTimeout(one, 460);
    }
    one();
  }

  // ── root ──────────────────────────────────────────────────────────────

  function retireLegacyTutorialLayers() {
    var selectors = ['#hijack', '.hijack-overlay', '.hijack-box', '#ctv-sigil-demo', '#ctv-sigil-cast', '#ctv-sigil-save', '.cutscene-box.legacy', '.tutorial-overlay'];
    for (var i = 0; i < selectors.length; i++) {
      document.querySelectorAll(selectors[i]).forEach(function (node) { if (node && node.parentNode) node.parentNode.removeChild(node); });
    }
    // The V3 cutscene owns first-run progression. Legacy room walkthroughs
    // may still be shipped for other rooms, but they must never be allowed to
    // mount on the desktop while this replacement is active.
    document.documentElement.classList.add('v3-cutscene-owner');
  }

  function mountRoot() {
    liftVeil();
    retireLegacyTutorialLayers();
    clearTransientTutorialNodes();
    clearBox();
    var stage = document.querySelector('.screen-stage');
    if (!stage) return null;
    var root = document.createElement('div');
    root.className = 'cutscene ctv';
    root.id = 'cutscene';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'tutorial');
    root.innerHTML = '<div class="ctv-world" aria-hidden="true"><div class="ctv-world-glow"></div><div class="ctv-world-floor"></div></div>'
      + '<div class="ctv-stage"><div class="ctv-cast"></div><div class="ctv-response-rail" aria-live="polite"></div></div>';
    // No skip control: the owner ruling is that the tutorial is an authored
    // ritual, not a barrier to bypass. Wanderlust's hands and the auto-advance
    // keep every beat moving; Escape (the safe pause below) remains the only
    // way out, and it preserves the resume cursor.
    stage.appendChild(root);
    setResponseMode('advance');
    return root;
  }

  // ── machine dressing (directions, never copy) ─────────────────────────

  function fxShake() { shakeMachine(1200); thunk(); }

  // The ritual's screen changes are drawn on the cast's GPU layer
  // (src/pixi-cast.js, LiberCast.weather): fractures are geometry, not a
  // gradient, and the star field is a batched particle draw. The DOM elements
  // below are only the fallback for a browser that never mounted Pixi.
  function weather(kind, amount) {
    if (window.LiberCast && typeof window.LiberCast.weather === 'function') {
      try { return window.LiberCast.weather(kind, amount) === true; } catch (e) { return false; }
    }
    return false;
  }

  function fxPinkCracks() {
    if (weather('cracks', 1)) return;
    var root = el('cutscene');
    if (!root || root.querySelector('.ctv-cracks')) return;
    var d = document.createElement('div');
    d.className = 'ctv-cracks';
    d.setAttribute('aria-hidden', 'true');
    root.appendChild(d);
    setTimeout(function () { d.classList.add('is-fade'); }, 2600);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 5200);
  }

  function fxStarfield() {
    if (weather('stars', 1)) return;
    var stage = document.querySelector('.screen-stage');
    if (!stage || stage.querySelector('.ctv-stars')) return;
    var d = document.createElement('div');
    d.className = 'ctv-stars';
    d.setAttribute('aria-hidden', 'true');
    var html = '';
    var seeds = [11, 29, 47, 68, 83, 101, 124, 149, 173, 197, 221, 247, 271, 299, 323, 349, 373, 401, 427, 453, 479, 503, 529, 557];
    for (var i = 0; i < seeds.length; i++) {
      var x = seeds[i] % 100, y = (seeds[i] * 37) % 100, r = 1 + (seeds[i] % 2);
      html += '<span style="left:' + x + '%;top:' + y + '%;width:' + r + 'px;height:' + r + 'px"></span>';
    }
    d.innerHTML = html;
    stage.appendChild(d);
  }

  // Beat 07, third line: "distant warm color enters the CRT."
  function fxWarmWeather() {
    if (weather('warm', 1)) return;
    var root = el('cutscene');
    if (!root || root.querySelector('.ctv-wander-weather')) return;
    materialOverlay(root, 'ctv-wander-weather', '<i></i><i></i><i></i>');
  }

  // A plate that is taller than the stage is fitted, not cropped; instruction
  // text never drops below the readable 16px floor.
  function fitBody(body) {
    var root = el('cutscene');
    var line = body && body.querySelector('.ctv-line');
    if (!root || !body || !line) return;
    if (body.classList.contains('ctv-poppet-sidecar')) return;
    line.style.removeProperty('font-size');
    body.classList.remove('is-fitted');
    var rail = 96;
    var avail = root.clientHeight - rail - 16;
    var guard = 0;
    while (guard < 5) {
      var tooTall = body.offsetHeight > avail;
      var pastTop = body.offsetTop < 4;
      if (!tooTall && !pastTop) break;
      var current = parseFloat(window.getComputedStyle(line).fontSize) || 16;
      if (current <= 16) break;
      line.style.fontSize = Math.max(16, current * 0.9) + 'px';
      guard += 1;
    }
    if (line.style.fontSize) body.classList.add('is-fitted');
  }

  function fxColorCycle(body, during) {
    if (!body) return;
    var hues = ['is-hue-fate', 'is-hue-wheel', 'is-hue-destiny', 'is-hue-muse'];
    var n = 0;
    body.classList.add(hues[0]);
    var timer = setInterval(function () {
      body.classList.remove(hues[n % hues.length]);
      n += 1;
      body.classList.add(hues[n % hues.length]);
    }, 320);
    setTimeout(function () {
      clearInterval(timer);
      for (var i = 0; i < hues.length; i++) body.classList.remove(hues[i]);
    }, during || 2600);
  }

  function fxPixelSmoke(fromBody, done) {
    var root = el('cutscene');
    if (!root) { if (done) done(); return; }
    var puff = document.createElement('div');
    puff.className = 'ctv-smoke';
    puff.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 9; i++) {
      var bit = document.createElement('span');
      bit.style.setProperty('--dx', String((i * 37 % 41) - 20));
      bit.style.setProperty('--dy', String((i * 53 % 31) - 8));
      puff.appendChild(bit);
    }
    if (fromBody) fromBody.appendChild(puff);
    else root.appendChild(puff);
    void puff.offsetWidth;
    puff.classList.add('go');
    shakeMachine(1400);
    thunk();
    setTimeout(function () {
      if (puff.parentNode) puff.parentNode.removeChild(puff);
      if (done) done();
    }, 1100);
  }

  function fxRoomCycle(done) {
    var root = el('cutscene');
    if (!root) { if (done) done(); return; }
    // Wanderlust does not merely change the background: she takes the whole
    // machine offline and pours the future travellers through its circuitry.
    var machine = document.querySelector('.machine');
    var stage = document.querySelector('.screen-stage');
    if (machine) machine.classList.add('ctv-time-hijack-machine');
    if (stage) stage.classList.add('ctv-time-hijack-stage');
    var m = document.createElement('div');
    m.className = 'ctv-montage';
    m.setAttribute('aria-hidden', 'true');
    m.innerHTML = '<div class="ctv-timewheel"><i></i><b>TIME</b></div>'
      + '<div class="ctv-timecode">00:00 · 03:17 · ∞</div>'
      + '<span class="ctv-montage-room is-r1"><b>the room before</b><i></i></span>'
      + '<span class="ctv-montage-room is-r2"><b>the room becoming</b><i></i></span>'
      + '<span class="ctv-montage-room is-r3"><b>the room remembered</b><i></i></span>'
      + '<span class="ctv-montage-room is-r4"><b>the room that waits</b><i></i></span>'
      + '<div class="ctv-time-scrub"></div>';
    var stream = document.createElement('div');
    stream.className = 'ctv-traveller-stream';
    stream.setAttribute('aria-hidden', 'true');
    var names = ['FEAR', 'ENTROPY', 'DREAD', 'REASON', 'PHYSIUS', 'WANDERLUST'];
    for (var si = 0; si < names.length; si++) {
      var token = document.createElement('span');
      token.textContent = names[si];
      token.style.setProperty('--stream-i', String(si));
      stream.appendChild(token);
    }
    m.appendChild(stream);
    document.body.appendChild(m);
    void m.offsetWidth;
    m.classList.add('go', 'is-hijacking');
    var shakes = 0;
    var shakeTimer = setInterval(function () {
      shakeMachine(360);
      shakes += 1;
      if (shakes > 5) clearInterval(shakeTimer);
    }, 430);
    setTimeout(function () {
      clearInterval(shakeTimer);
      if (m.parentNode) m.parentNode.removeChild(m);
      if (machine) machine.classList.remove('ctv-time-hijack-machine');
      if (stage) stage.classList.remove('ctv-time-hijack-stage');
      if (done) done();
    }, 3600);
  }

  function fxShrinkToThemes() {
    var b = bodyOf('wanderlust');
    if (!b) return;
    b.classList.add('is-shrink');
    setTimeout(function () { removeBody('wanderlust'); }, 900);
  }

  // ── Wanderlust's theatrical first entrance ───────────────────────────
  // Before her chatbox exists at all, the ROOM performs: the seated boxes
  // are knocked from somewhere outside the glass, a warm bloom gathers
  // behind the cast, and only then does she arrive — deliberately too
  // large for the space she is given — and shrink down to her seat while
  // her first line is already typing. Wordless: all pantomime, no copy.
  function firstWanderlustIndex() {
    var list = beats();
    for (var i = 0; i < list.length; i++) {
      if (list[i].speaker === 'wanderlust') return i;
    }
    return -1;
  }

  function fxGrandEntrance() {
    var root = el('cutscene');
    if (!root) return;
    root.classList.add('ctv-grand-enter');
    // The bloom paints between the world and the cast (DOM order, no z-index
    // games): above the room dressing, below every chatbox.
    var bloom = document.createElement('div');
    bloom.className = 'ctv-grand-enter-bloom';
    bloom.setAttribute('aria-hidden', 'true');
    var stage = root.querySelector('.ctv-stage');
    if (stage) root.insertBefore(bloom, stage); else root.appendChild(bloom);
    setTimeout(function () {
      var stale = root.querySelector('.ctv-grand-enter-bloom');
      if (stale) stale.remove();
      root.classList.remove('ctv-grand-enter');
    }, 4400);
  }

  var riasonDeparted = false;

  function fxSkulkAway() {
    riasonDeparted = true;
    var b = bodyOf('riason');
    if (!b) return;
    b.classList.add('is-skulk');
    setTimeout(function () { removeBody('riason'); }, 900);
  }

  function fxDiegeticCracks() {
    var root = el('cutscene');
    if (!root || root.querySelector('.ctv-cracks-wild')) {
      fxShake();
      return;
    }
    var d = document.createElement('div');
    d.className = 'ctv-cracks ctv-cracks-wild';
    d.setAttribute('aria-hidden', 'true');
    root.appendChild(d);
    fxShake();
  }

  function fxSheen() {
    var root = el('cutscene');
    if (!root) return;
    var s = document.createElement('div');
    s.className = 'ctv-sheen';
    s.setAttribute('aria-hidden', 'true');
    root.appendChild(s);
    void s.offsetWidth;
    s.classList.add('go');
    var wild = root.querySelector('.ctv-cracks-wild');
    if (wild) wild.classList.add('is-fade');
    setTimeout(function () {
      if (s.parentNode) s.parentNode.removeChild(s);
      var w = root.querySelector('.ctv-cracks-wild');
      if (w && w.parentNode) w.parentNode.removeChild(w);
    }, 1600);
  }

  function markLineWord(lineEl, word, className) {
    if (!lineEl || !word) return;
    var walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var at = node.nodeValue.indexOf(word);
      if (at < 0) continue;
      var frag = document.createDocumentFragment();
      if (at) frag.appendChild(document.createTextNode(node.nodeValue.slice(0, at)));
      var mark = document.createElement('span');
      mark.className = className || 'ctv-special-word';
      mark.textContent = word;
      frag.appendChild(mark);
      if (at + word.length < node.nodeValue.length) frag.appendChild(document.createTextNode(node.nodeValue.slice(at + word.length)));
      node.parentNode.replaceChild(frag, node);
      return;
    }
  }

  function materialOverlay(root, className, content) {
    var old = root.querySelector('.' + className);
    if (old) old.remove();
    var overlay = document.createElement('div');
    overlay.className = className;
    overlay.setAttribute('aria-hidden', 'true');
    if (content) overlay.innerHTML = content;
    root.appendChild(overlay);
    return overlay;
  }

  function fxV3Effect(name) {
    var root = el('cutscene');
    if (!root || !name) return;
    var slug = String(name).replace(/[^a-z0-9-]/gi, '-');
    root.classList.remove('ctv-v3-effect-' + slug);
    void root.offsetWidth;
    root.classList.add('ctv-v3-effect-' + slug);
    if (name === 'opening-disturbance') {
      root.classList.add('ctv-opening-displaced');
      setTimeout(function () { root.classList.remove('ctv-opening-displaced'); }, 1900);
    }
    if (name === 'partial-recognition') {
      root.classList.add('ctv-partial-recognition');
      // Beat 02: "a small incomplete figure is visible inside the box: not a
      // full avatar, only a head shape, one seam, and a blank region" — with
      // reflection / icon / silhouette tried on and collapsing back. The figure
      // lives inside Y's own plate, so the traveller recognises a body they
      // have not been given yet.
      var selfBody = bodyOf('liber-vacui');
      if (selfBody && !selfBody.querySelector('.ctv-self-figure')) {
        var figure = document.createElement('div');
        figure.className = 'ctv-self-figure';
        figure.setAttribute('aria-hidden', 'true');
        figure.innerHTML = '<i>reflection</i><i>icon</i><i>silhouette</i>';
        selfBody.appendChild(figure);
        setTimeout(function () { if (figure.parentNode) figure.parentNode.removeChild(figure); }, 1900);
      }
      setTimeout(function () { root.classList.remove('ctv-partial-recognition'); }, 1500);
    }
    if (name === 'relation-wound') {
      // "Y's box briefly gains a visible seam, as if the attempted relation
      // has affected them." Arcana's failed click leaves a mark on the body it
      // was aimed at, not on the card.
      var wounded = bodyOf('liber-vacui');
      if (wounded) {
        wounded.classList.add('is-seamed');
        setTimeout(function () { wounded.classList.remove('is-seamed'); }, 1400);
      }
    }
    if (name === 'name-loosen') {
      var named = bodyOf('liber-vacui');
      if (named) { named.classList.add('is-name-loose'); setTimeout(function () { named.classList.remove('is-name-loose'); }, 1100); }
    }
    if (name === 'inside-screen-reveal') {
      root.classList.add('ctv-inside-screen');
      setTimeout(function () { root.classList.remove('ctv-inside-screen'); }, 2400);
    }
    if (name === 'concept-cards') {
      var cards = document.createElement('div');
      cards.className = 'ctv-concept-cards';
      cards.setAttribute('aria-hidden', 'true');
      ['poppet amplification', 'process psychology', 'play therapy', 'wise mind', 'IFS'].forEach(function (label, i) {
        var card = document.createElement('i');
        card.textContent = label;
        card.style.setProperty('--card-i', String(i));
        cards.appendChild(card);
      });
      root.appendChild(cards);
      setTimeout(function () { if (cards.parentNode) cards.parentNode.removeChild(cards); }, 5200);
    }
    if (name === 'infodump') {
      // "A small diagram tries to form and fails because there are too many
      // overlapping concepts" — the joke is the pressure, so the vellum is
      // never allowed a clean hold. No loading bar: nothing here has progress.
      root.classList.add('ctv-riason-overload');
      setTimeout(function () { root.classList.remove('ctv-riason-overload'); }, 1700);
    }
    if (name === 'infodump-escalate') {
      root.classList.add('ctv-riason-overload');
      setTimeout(function () { root.classList.remove('ctv-riason-overload'); }, 2600);
    }
    if (name === 'as-above') {
      root.classList.add('ctv-inversion');
      materialOverlay(root, 'ctv-as-above-copy', '<span>AS ABOVE</span><span>SO BELOW</span>');
      setTimeout(function () { root.classList.remove('ctv-inversion'); var copy = root.querySelector('.ctv-as-above-copy'); if (copy) copy.remove(); }, 2600);
    }
    if (name === 'floor-inscription') {
      root.classList.add('ctv-floor-revealed');
      materialOverlay(root, 'ctv-floor-inscription', '<i></i><span>the mark continues beyond the light</span>');
      setTimeout(function () { root.classList.remove('ctv-floor-revealed'); var floor = root.querySelector('.ctv-floor-inscription'); if (floor) floor.remove(); }, 2400);
    }
    if (name === 'poppet-transition') {
      root.classList.add('ctv-poppet-threshold');
      materialOverlay(root, 'ctv-stone-seam', '<i></i><b>PHYSIUS // WORKTABLE</b>');
      setTimeout(function () { root.classList.remove('ctv-poppet-threshold'); var seam = root.querySelector('.ctv-stone-seam'); if (seam) seam.remove(); }, 1600);
    }
    if (name === 'others-transition') {
      root.classList.add('ctv-others-turn');
      setTimeout(function () { root.classList.remove('ctv-others-turn'); }, 1900);
    }
    if (name === 'arcana-runes') {
      var arcana = bodyOf('arcana');
      if (arcana) materialOverlay(arcana, 'ctv-v3-runes', '');
    }
    if (name === 'alchemist-word') {
      var physiusLine = bodyOf('physius') && bodyOf('physius').querySelector('.ctv-line');
      markLineWord(physiusLine, 'an alchemist', 'ctv-gold-stamp');
    }
    if (name === 'logic-threat') {
      var threatLine = bodyOf('wanderlust') && bodyOf('wanderlust').querySelector('.ctv-line');
      markLineWord(threatLine, 'take over', 'ctv-spooky-word');
      root.classList.add('ctv-interface-breach');
      setTimeout(function () { root.classList.remove('ctv-interface-breach'); }, 1500);
    }
    if (name === 'rainy-day') {
      var rainyCard = materialOverlay(root, 'ctv-rainy-card', '<b>RAINY DAY</b><span>optional / reversible</span>');
      rainyCard.setAttribute('role', 'button');
      rainyCard.setAttribute('tabindex', '0');
      rainyCard.setAttribute('aria-label', 'toggle the optional Rainy Day challenge layer');
      rainyCard.style.pointerEvents = 'auto';
      if (store().shadowOn) rainyCard.classList.add('is-selected');
      var toggleRain = function () {
        var current = store();
        if (st()) st().set({ shadowOn: !current.shadowOn });
        rainyCard.classList.toggle('is-selected', !current.shadowOn);
      };
      rainyCard.addEventListener('click', toggleRain);
      rainyCard.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRain(); } });
    }
    if (name === 'noble-shadow') {
      var nobleLine = bodyOf('vanir') && bodyOf('vanir').querySelector('.ctv-line');
      markLineWord(nobleLine, 'Noble Shadow', 'ctv-noble-word');
      var gold = document.createElement('div'); gold.className = 'ctv-v3-noble-shadow'; gold.setAttribute('aria-hidden', 'true'); root.appendChild(gold);
      setTimeout(function () { if (gold.parentNode) gold.parentNode.removeChild(gold); }, 2600);
    }
    if (name === 'infection') {
      root.classList.add('ctv-wander-care');
      materialOverlay(root, 'ctv-wander-weather', '<i></i><i></i><i></i><b>the room warms around the fear</b>');
      setTimeout(function () { root.classList.remove('ctv-wander-care'); var weather = root.querySelector('.ctv-wander-weather'); if (weather) weather.remove(); }, 2600);
    }
    if (name === 'finale-envelope') {
      // The poppet is still settling on the desk when she comes back for it:
      // warm the cast so the room reads as changed before she speaks.
      root.classList.add('ctv-finale-warm');
      setTimeout(function () { root.classList.remove('ctv-finale-warm'); }, 3200);
      // The travellers arrive WITH the finale now (no separate summoning
      // ceremony): lift the handoff's solo mask the moment the finale opens.
      try {
        if (window.LiberTraveROM && window.LiberTraveROM.revealAll) window.LiberTraveROM.revealAll();
      } catch (e) {}
    }
    if (name === 'vanir-ritual') {
      root.classList.add('ctv-vanir-threshold');
      // "A region of the CRT fails to render. Stars disappear." The aperture is
      // the dark region; the GPU layer swallows the ritual's own stars inside
      // it, so the loss is measurable as light going out rather than as an
      // overlay being drawn.
      weather('void', 1);
      materialOverlay(root, 'ctv-void-aperture', '<i></i><b></b>');
      setTimeout(function () { root.classList.remove('ctv-vanir-threshold'); var aperture = root.querySelector('.ctv-void-aperture'); if (aperture) aperture.remove(); }, 2400);
    }
    if (name === 'arcana-ritual') {
      materialOverlay(root, 'ctv-arcana-table-shift', '<i></i><i></i><i></i>');
    }
    if (name === 'stone-enter') {
      materialOverlay(root, 'ctv-physius-summon', '<i></i><b>STONE / BRASS / BREATH</b>');
      setTimeout(function () { var seam = root.querySelector('.ctv-physius-summon'); if (seam) seam.remove(); }, 2100);
    }
    if (name === 'arcana-enter') {
      materialOverlay(root, 'ctv-arcana-summon', '<i></i><i></i><b>THE DECK KNOWS YOUR NAME</b>');
      setTimeout(function () { var spread = root.querySelector('.ctv-arcana-summon'); if (spread) spread.remove(); }, 1800);
    }
    if (name === 'vanir-enter') {
      materialOverlay(root, 'ctv-vanir-summon', '<i></i><b>THE DARK HAS A THREAD</b>');
      setTimeout(function () { var voidMark = root.querySelector('.ctv-vanir-summon'); if (voidMark) voidMark.remove(); }, 2300);
    }
    if (name === 'traveller-nestle') {
      root.classList.add('ctv-traveller-nestle');
      setTimeout(function () { root.classList.remove('ctv-traveller-nestle'); }, 1300);
    }
    if (name === 'arcana-table') {
      var table = root.querySelector('.ctv-divination-table');
      if (!table) {
        table = document.createElement('div');
        table.className = 'ctv-divination-table';
        table.setAttribute('aria-label', 'Arcana’s question table');
        table.innerHTML = '<label for="ctv-divination-question">question card</label>'
          + '<input id="ctv-divination-question" type="text" maxlength="120" autocomplete="off" spellcheck="false" placeholder="write a question…" />'
          + '<div class="ctv-divination-deck" aria-hidden="true"><i></i><i></i><i></i><b>draw</b></div>'
          + '<div class="ctv-divination-status" aria-live="polite">the deck is waiting</div>';
        root.appendChild(table);
        var question = table.querySelector('#ctv-divination-question');
        if (question) {
          question.disabled = true;
          question.setAttribute('aria-disabled', 'true');
          question.value = 'What is the traveller’s fate?';
          table.classList.add('has-question');
        }
      }
      table.classList.add('is-table-live');
    }
    if (name === 'arcana-draw') {
      var deck = root.querySelector('.ctv-divination-table');
      if (deck) {
        deck.classList.add('is-drawing');
        var status = deck.querySelector('.ctv-divination-status');
        if (status) status.textContent = 'the fool — a journey just beginning';
        setTimeout(function () { deck.classList.remove('is-drawing'); deck.classList.add('has-drawn'); }, 520);
      }
    }
    if (name === 'arcana-orbit') {
      var orbitTable = root.querySelector('.ctv-divination-table');
      if (orbitTable) orbitTable.classList.add('is-orbiting');
    }
    if (name === 'relation-shake') shakeMachine(1000);
    setTimeout(function () { root.classList.remove('ctv-v3-effect-' + slug); }, 1800);
  }

  function fxObliteration(done) {
    // The authored breach is Wanderlust forcing Vanir out of the visible
    // room. It must never target Riason, who may already be gone or may be
    // carrying the scene's diagram residue.
    var b = bodyOf('vanir');
    if (!b) { if (done) done(); return; }
    b.classList.add('is-shatter', 'is-vanir-dissolving');
    b.style.setProperty('--tx', '0px');
    b.style.setProperty('--ty', '34px');
    thunk();
    setTimeout(function () {
      removeBody('vanir');
      var root = el('cutscene');
      var puddle = root && root.querySelector('.ctv-vanir-puddle');
      if (puddle) puddle.classList.add('is-settled');
      if (done) done();
    }, 1250);
  }

  function fxPhysiusLeave() {
    var b = bodyOf('physius');
    if (!b) return;
    b.classList.add('is-withdrawing');
    setTimeout(function () { removeBody('physius'); }, 900);
  }

  function fxPhysiusReturnToDesktop() {
    var b = bodyOf('physius');
    if (!b) return;
    b.classList.remove('is-withdrawing', 'is-stone');
    b.classList.add('is-desktop-return');
    void b.offsetWidth;
    setTimeout(function () { if (b.parentNode) b.classList.remove('is-desktop-return'); }, 1250);
  }

  // ── ritual beat: four lines, typed to light ───────────────────────────

  function playRitual(next) {
    var root = el('cutscene');
    if (!root) { next(); return; }
    closeGate('action-lock');
    beginSpellPresentation(root);
    root.classList.add('ritual-active');
    var lines = data().RITUAL || [];
    var wrap = document.createElement('div');
    wrap.className = 'ctv-ritual';
    wrap.id = 'ctv-ritual';
    var html = '';
    for (var i = 0; i < lines.length; i++) {
      html += '<div class="ctv-ritual-line" data-ritual-line="' + i + '">'
        + '<span class="ctv-ritual-text">' + fillName(lines[i].text) + '</span></div>';
    }
    html += '<p class="ctv-ritual-status" id="ctv-ritual-status" role="status" aria-live="polite"></p>'
      + '<input class="ctv-ritual-input" id="ctv-ritual-input" type="text" autocomplete="off"'
      + ' spellcheck="false" aria-label="type the highlighted summoning line"'
      + ' aria-describedby="ctv-ritual-status" placeholder="type the highlighted line" />';
    // No Continue button: the moment the threshold is met, Wanderlust takes
    // the hands and completes the line herself (possessInput). The player's
    // only act is beginning the line; the Vacui does the rest.
    wrap.innerHTML = html;
    root.appendChild(wrap);
    var seal = document.createElement('div');
    seal.className = 'ctv-ritual-seal';
    seal.setAttribute('aria-hidden', 'true');
    seal.innerHTML = '<i></i><b>✶</b><span>THE VACUI OPENS</span>';
    root.appendChild(seal);
    var rows = wrap.querySelectorAll('.ctv-ritual-line');
    var input = wrap.querySelector('.ctv-ritual-input');
    var status = wrap.querySelector('.ctv-ritual-status');
    var savedRitual = store();
    var li = Math.max(0, Math.min(lines.length, Number(savedRitual.tutorialRitualLine) || 0));
    var armed = null;
    var thresholds = [0.72, 0.58, 0.46, 0.34];

    function armLine() {
      if (li >= lines.length) {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        restoreSpellPresentation();
        root.classList.remove('ritual-active');
        if (st()) st().set({ tutorialRitualLine: 0 });
        weather('warm', 0.35);
        setTimeout(function () { fitBody(bodyOf('wanderlust')); }, 60);
        next();
        return;
      }
      armed = li;
      rows[armed].classList.add('is-typing');
      input.value = '';
      status.textContent = 'line ' + (li + 1) + ' of ' + lines.length
        + ' — begin the line; the Vacui will take your hands.';
      try { input.focus(); } catch (e) {}
    }

    function completeLine() {
      if (armed == null || armed >= lines.length || possessed) return;
      var want = fillName(lines[armed].text);
      // No button, no Enter requirement: possession begins the instant the
      // threshold is crossed while the player is still mid-word.
      var progress = summonProgress(input.value, want);
      if (progress < thresholds[armed] && summonKey(input.value) !== summonKey(want)) {
        status.textContent = 'keep typing the highlighted line…';
        return;
      }
      possessed = true;
      possessInput(input, want, rows[armed], armed, function () {
        if (el('cutscene') !== root) return;
        rows[armed].classList.remove('is-typing');
        rows[armed].classList.add('is-lit');
        armed = null;
        possessed = false;
        var fx = lines[li].effect;
        if (fx === 'pink-cracks') fxPinkCracks();
        else if (fx === 'starfield') fxStarfield();
        else if (fx === 'warm-weather') fxWarmWeather();
        else if (fx === 'chatbox-construct') {
          // The chatbox is built OUT OF the fractures, so the fractures stop
          // being the surface the player is reading and hand over to it.
          weather('cracks', 0);
          ensureBody('wanderlust', 'is-construct');
        } else if (fx === 'machine-shake') fxShake();
        else fxShake();
        chime();
        li += 1;
        if (st()) st().set({ tutorialRitualLine: li >= lines.length ? 0 : li });
        if (seal && li >= lines.length) {
          seal.classList.add('is-sucked');
          setTimeout(function () { if (seal.parentNode) seal.parentNode.removeChild(seal); }, 1500);
        }
        setTimeout(armLine, 450);
      });
    }

    var possessed = false;
    input.addEventListener('input', function () {
      // The ritual takes the hands on the first keystroke, but Y stays
      // visibly present as the muffled witness required by V3.
      var ritualWitness = bodyOf('liber-vacui');
      if (ritualWitness) ritualWitness.classList.add('is-ritual-witness');
      root.classList.add('ritual-active', 'traveller-departed');
      setResponseMode('action-lock');
      if (armed == null || armed >= lines.length || possessed) return;
      var want = fillName(lines[armed].text);
      var progress = summonProgress(input.value, want);
      var ready = progress >= thresholds[armed] || summonKey(input.value) === summonKey(want);
      if (ready) { completeLine(); return; }
      status.textContent = 'keep typing…';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      completeLine();
    });
    // (Enter still commits early for keyboard players; the threshold alone
    // drives the takeover for everyone else. No skip control exists.)
    closeGate('action-lock');
    armLine();
  }

  // ── poppet walkthrough: the REAL worktable, driven by Physius ───────
  // The genuine poppet app (src/features/sigil/poppet.js) mounts inside
  // the cutscene root. Physius's cursor opens its real doors, picks its
  // real inks, pulls real strokes across the real canvas, lays each
  // piece, and saves a genuine kind:'poppet' artifact to the desktop.
  // Physius owns the demonstration: the worktable is pointer-locked while
  // the traveller advances her explanations, but every door, palette pick,
  // stroke, and save still travels through the genuine app engine. Resume
  // re-mounts the same bench; if the engine is unavailable the walk is
  // skipped, never faked.

  var PUPPET_INKS = { outline: 3, clothes: 0, traits: 0, others: 0 };
  var PUPPET_STROKES = {
    outline: [[224, 88], [316, 88], [316, 472], [224, 472], [224, 88]],
    clothes: [[206, 162], [334, 162], [346, 300], [194, 300], [206, 162]],
    traits: [[270, 186], [298, 252], [270, 318], [242, 252], [270, 186]],
    others: [[270, 244], [284, 270], [270, 296], [256, 270], [270, 244]]
  };

  function lockTutorBench(locked) {
    if (!poppetBenchWrap) return;
    poppetBenchWrap.classList.toggle('is-physius-lock', !!locked);
    var controls = poppetBenchWrap.querySelectorAll('.poppet-door, .poppet-tool, .poppet-swatch, .poppet-keep, .poppet-save-desktop, .poppet-discard');
    for (var i = 0; i < controls.length; i++) {
      controls[i].setAttribute('aria-disabled', locked ? 'true' : 'false');
    }
  }

  function fxImaginaryWord(body) {
    if (!body) return;
    var word = document.createElement('span');
    word.className = 'ctv-evaporating-word';
    word.textContent = 'imaginary';
    word.setAttribute('aria-hidden', 'true');
    body.appendChild(word);
    void word.offsetWidth;
    word.classList.add('is-sucked');
    setTimeout(function () { if (word.parentNode) word.parentNode.removeChild(word); }, 1500);
  }

  function fxWindowBreath() {
    var root = el('cutscene');
    if (!root) return;
    root.classList.remove('ctv-window-breath');
    void root.offsetWidth;
    root.classList.add('ctv-window-breath');
    setTimeout(function () { root.classList.remove('ctv-window-breath'); }, 900);
  }

  function mountPoppetBench() {
    var root = el('cutscene');
    if (!root) return null;
    // Never adopt a stale standalone/legacy Poppet mount. The tutorial owns
    // one fresh reworked bench and its engine state is isolated from the room.
    document.querySelectorAll('body > #poppet-app, body > #poppet-worktable').forEach(function (node) {
      if (!node.closest('.ctv-poppet')) node.remove();
    });
    if (poppetBenchWrap && poppetApi) {
      if (!poppetBenchWrap.parentNode) {
        var castEl = root.querySelector('.ctv-cast');
        if (castEl) castEl.insertAdjacentElement('afterend', poppetBenchWrap);
        else root.appendChild(poppetBenchWrap);
      }
      return poppetBenchWrap;
    }
    if (!(window.LiberPoppet && typeof window.LiberPoppet.mountTutor === 'function')) return null;
    var api = window.LiberPoppet.mountTutor({
      mode: 'demonstration',
      isolated: true,
      onLayerReady: function (layer) {
        var root = el('cutscene');
        if (root) { root.dataset.poppetLayer = layer; root.classList.add('poppet-layer-ready'); }
      },
      onPieceLaid: function (layer) {
        var root = el('cutscene');
        if (root) { root.dataset.poppetLaid = layer; root.classList.add('poppet-piece-laid'); setTimeout(function () { root.classList.remove('poppet-piece-laid'); }, 850); }
      },
      onComplete: function () {
        var root = el('cutscene');
        if (root) root.classList.add('poppet-all-laid');
      },
      onExit: function () {
        var root = el('cutscene');
        if (root) root.classList.add('poppet-exit');
      }
    });
    if (!api || !api.bench) return null;
    poppetApi = api;
    var wrap = document.createElement('div');
    wrap.className = 'ctv-poppet';
    wrap.id = 'ctv-poppet';
    root.classList.add('has-poppet', 'poppet-immersion');
    var existingGate = root.querySelector('.ctv-gate');
    if (existingGate) placePoppetGate(existingGate);
    var montage = document.createElement('div');
    montage.className = 'ctv-poppet-montage';
    montage.setAttribute('aria-hidden', 'true');
    montage.innerHTML = '<i></i><i></i><i></i><b>THE WORKTABLE REMEMBERS YOUR HANDS</b>';
    root.appendChild(montage);
    setTimeout(function () {
      if (montage.parentNode) montage.parentNode.removeChild(montage);
      root.classList.remove('poppet-immersion');
    }, 1600);
    // the room chrome (titlebar) is Physius's to speak; the save/discard
    // pair is traveller-owned and stays — but stays dark until she lays
    // the last piece, exactly as the real app gates it.
    var t = api.bench.querySelector('.poppet-titlebar');
    if (t && t.parentNode === api.bench) t.parentNode.removeChild(t);
    wrap.appendChild(api.bench);
    poppetBenchWrap = wrap;
    lockTutorBench(true);
    var cast = root.querySelector('.ctv-cast');
    if (cast) cast.insertAdjacentElement('afterend', wrap);
    else root.appendChild(wrap);
    // The worktable is intentionally opaque. Keep the two speaker plates in
    // the root stacking context so the right-side Physius lane and the small
    // traveller witness cannot be painted underneath the real controls.
    ['physius', 'liber-vacui'].forEach(function (speaker) {
      var body = root.querySelector('.ctv-body[data-speaker="' + speaker + '"]');
      if (body) {
        root.appendChild(body);
        body.classList.add('ctv-poppet-sidecar');
        body.style.setProperty('left', 'auto', 'important');
        body.style.setProperty('right', '2%', 'important');
        body.style.setProperty('bottom', 'auto', 'important');
        if (speaker === 'physius') {
          body.style.setProperty('top', '3%', 'important');
          body.style.setProperty('width', '33%', 'important');
          body.style.setProperty('max-width', '33%', 'important');
          body.style.setProperty('max-height', '28%', 'important');
        } else {
          body.style.setProperty('top', 'calc(3% + 28% + 10px)', 'important');
          body.style.setProperty('width', '25%', 'important');
          body.style.setProperty('max-width', '25%', 'important');
          body.style.setProperty('max-height', '14%', 'important');
          body.style.setProperty('transform', 'none', 'important');
        }
      }
    });
    return wrap;
  }

  function removePoppetBench() {
    if (poppetBenchWrap && poppetBenchWrap.parentNode) poppetBenchWrap.parentNode.removeChild(poppetBenchWrap);
    var root = el('cutscene');
    if (root) {
      root.classList.remove('has-poppet', 'poppet-immersion', 'desktop-reveal', 'ritual-active');
      root.querySelectorAll('.ctv-poppet-sidecar').forEach(function (body) {
        body.classList.remove('ctv-poppet-sidecar');
        ['left', 'right', 'top', 'bottom', 'width', 'max-width', 'max-height', 'transform'].forEach(function (prop) {
          body.style.removeProperty(prop);
        });
      });
    }
    if (poppetApi) {
      try { poppetApi.door('outline'); } catch (e) {}
      poppetApi = null;
    }
  }

  function ptOnBench(x, y) {
    if (!poppetBenchWrap) return null;
    var stack = poppetBenchWrap.querySelector('.poppet-stack');
    if (!stack) return null;
    var r = stack.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: x * r.width / 480, y: y * r.height / 544 };
  }

  // Each explanation turns and lays its own station before the next layer is
  // named. That keeps the words and the worktable in the same moment.
  function performPoppetLayer(layer, done) {
    if (!poppetApi || !poppetApi.door) { if (done) done(); return; }
    try { poppetApi.door(layer); } catch (e) {}
    try { if (poppetApi.swatch) poppetApi.swatch(PUPPET_INKS[layer] == null ? 0 : PUPPET_INKS[layer]); } catch (e) {}
    strokeOnBench(layer, function () {
      if (poppetApi && poppetApi.keep) poppetApi.keep();
      if (done) setTimeout(done, 320);
    });
  }

  function strokeOnBench(layer, done) {
    var pts = PUPPET_STROKES[layer];
    if (!poppetApi || !poppetApi.strokePath || !pts) { if (done) done(); return; }
    var scaled = [];
    for (var i = 0; i < pts.length; i++) {
      var p = ptOnBench(pts[i][0], pts[i][1]);
      if (!p) { if (done) done(); return; }
      scaled.push(p);
    }
    poppetApi.strokePath(scaled);
    if (done) setTimeout(done, 420);
  }

  function playPoppetStage(beat, next) {
    var body = ensureBody('physius', null);
    if (body) { dimOthers('physius'); setTone(body, beat.tone); }
    var lineEl = body ? body.querySelector('.ctv-line') : null;
    if (beat.kind === 'poppet-app') mountPoppetBench();
    typewrite(lineEl, beat.text, function () {
      // Wanderlust's hand here too: the worktable step runs itself after
      // the authored response types out. The bench stays pointer-locked
      // the whole time — Physius is driving.
      autoAdvance(beat.response, function () { runPoppetStep(next); });
    });
  }

  function xOnBench(done) {
    if (!poppetApi || !poppetApi.strokePath) { if (done) done(); return; }
    var a = [ptOnBench(198, 148), ptOnBench(282, 232)];
    var b = [ptOnBench(282, 148), ptOnBench(198, 232)];
    if (!a[0] || !a[1] || !b[0] || !b[1]) { if (done) done(); return; }
    poppetApi.strokePath(a);
    poppetApi.strokePath(b);
    if (done) setTimeout(done, 420);
  }

  function runPoppetStep(next) {
    var list = beats();
    var beat = list[poppetStepIdx];
    if (!beat || !poppetApi) { next(); return; }
    var effect = beat.effect || '';
    var body = bodyOf('physius');
    var lineEl = body ? body.querySelector('.ctv-line') : null;
    function sayThen(text, fn) {
      if (lineEl) typewrite(lineEl, text, fn);
      else fn();
    }
    if (effect === 'save-desktop') {
      sayThen('There. On the desktop now — kept, real, yours.', function () {
        setTimeout(function () {
          if (poppetApi.keep) poppetApi.keep();
          if (poppetApi.save) poppetApi.save();
          // the saved poppet IS the tutorial artifact: point the id at the
          // real entry so the placeholder fallback never mints.
          var s2 = st();
          if (s2) {
            var g2 = s2.get() || {};
            var b2 = g2.buddy || [];
            for (var bi = b2.length - 1; bi >= 0; bi--) {
              if (b2[bi] && b2[bi].kind === 'poppet') { s2.set({ tutorialArtifactId: b2[bi].id }); break; }
            }
          }
          chime();
          var reveal = el('cutscene');
          if (reveal) {
            reveal.classList.remove('has-poppet', 'poppet-immersion');
            reveal.classList.add('desktop-reveal');
            var anchor = document.createElement('div');
            anchor.className = 'ctv-buddy-anchor';
            anchor.setAttribute('aria-hidden', 'true');
            anchor.innerHTML = '<i></i><span>the place remembers</span>';
            reveal.appendChild(anchor);
          }
          flash('rgba(232,200,144,0.22)', 420);
          removePoppetBench();
          next();
        }, 700);
      });
      return;
    }
    if (effect.indexOf('door:') === 0) {
      // each door change lays the piece just finished — the real app's
      // own layPiece, with its chime — then turns the alchemical ring.
      // The pointer lock is intentional: Physius is demonstrating the
      // operation, not asking the traveller to guess it yet.
      if (poppetApi.keep) poppetApi.keep();
      var key = effect.slice(5);
      poppetApi.door(key);
      if (poppetApi.swatch && PUPPET_INKS[key] != null) poppetApi.swatch(PUPPET_INKS[key]);
      setTimeout(next, 550);
      return;
    }
    if (effect.indexOf('trace:') === 0) {
      strokeOnBench(effect.slice(6), function () {
        setTimeout(next, 300);
      });
      return;
    }
    next();
  }

  var poppetStepIdx = 0;

  // ── artifact beat: the card appears, click sets its relation ──────────

  function tutorialArtifactId() {
    return store().tutorialArtifactId || null;
  }

  function playArtifact(beat, next) {
    var body = ensureBody('arcana', null);
    if (!body) { next(); return; }
    dimOthers('arcana');
    setTone(body, beat.tone);
    // Arcana's card is a demonstration object. V3 explicitly rejects the
    // relation because this is not the player's Poppet; never mint a sealed
    // tutorial artifact or persist a demo relation here.
    var entry = null;
    var root = el('cutscene');
    if (root && !root.querySelector('.ctv-artifact')) {
      var stage = document.querySelector('.screen-stage');
      var card = document.createElement('div');
      card.className = 'ctv-artifact ctv-sky-artifact';
      card.id = 'ctv-artifact';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', 'the tutorial artifact. activate to set its relation.');
      card.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true">'
        + '<circle cx="50" cy="50" r="34" fill="none" stroke="#e8c890" stroke-width="2.5"/>'
        + '<path d="M50 30 L50 70 M30 50 L70 50" stroke="#e8c890" stroke-width="3"/></svg>';
      // Keep the demo card inside the tutorial owner. Appending it to the
      // desktop stage makes Escape/reload leave an orphaned interactive card
      // behind after the V3 overlay is canceled.
      root.appendChild(card);
      root.classList.add('is-sky-open');
    }
    var lineEl = body.querySelector('.ctv-line');
    typewrite(lineEl, beat.text, function () {
      autoAdvance(beat.response, function () {
        var anchor = root.querySelector('.ctv-buddy-anchor');
        if (anchor && anchor.parentNode) anchor.parentNode.removeChild(anchor);
        root.classList.remove('desktop-reveal');
        var cardEl = el('ctv-artifact');
        var line2 = bodyOf('arcana') ? bodyOf('arcana').querySelector('.ctv-line') : null;
        if (line2) line2.textContent = 'it waits. click it to set its relation..';
        if (!cardEl) { next(); return; }
        cardEl.classList.add('is-waiting');
        var openRelate = function () {
          if (cardEl.dataset.consumed) return;
          cardEl.dataset.consumed = '1';
          cardEl.classList.remove('is-waiting');
          cardEl.classList.add('is-kept');
          var r2 = el('cutscene');
          if (!r2) { next(); return; }
          var rel = document.createElement('div');
          rel.className = 'ctv-relate';
          rel.id = 'ctv-relate';
          rel.innerHTML = '<span>it</span>'
            + '<input class="ctv-relate-verb" id="ctv-artifact-verb" type="text" maxlength="40"'
            + ' spellcheck="false" list="verb-families" placeholder="protects" aria-label="what the artifact does to your buddy" />'
            + '<span>your buddy</span>'
            + '<button type="button" class="ctv-relate-bind cutscene-option" id="ctv-artifact-bind">bind to buddy</button>';
          r2.appendChild(rel);
          var verbEl = rel.querySelector('#ctv-artifact-verb');
          var bindBtn = rel.querySelector('#ctv-artifact-bind');
          try { if (verbEl) verbEl.focus(); } catch (e) {}
          var doBind = function () {
            if (bindBtn.dataset.consumed) return;
            bindBtn.dataset.consumed = '1';
            bindBtn.disabled = true;
            var verb = (verbEl && verbEl.value.trim()) ? verbEl.value.trim() : 'protects';
            if (verbEl) verbEl.value = verb;
            // The demo Poppet is not user-owned, so the Vacui rejects the
            // proposed relation. Keep the physical snap-back, not state.
            rel.classList.add('is-rejected');
            thunk();
            setTimeout(function () {
              if (rel.parentNode) rel.parentNode.removeChild(rel);
              next();
            }, 420);
          };
          bindBtn.addEventListener('click', doBind);
          verbEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); doBind(); }
          });          // Arcana performs her own demonstration: the hand types the verb
          // and the bind fires — but only after the player has clicked her
          // card. The card click stays a player act; the typing is hers.
          typeIntoInput(verbEl, 'encourages', doBind);
        };
        cardEl.addEventListener('click', openRelate);
        cardEl.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRelate(); }
        });
        // The orbit is intentionally alive, but it must not make the real
        // card impossible to activate for a careful or hurried user.
        cardEl.addEventListener('pointerenter', function () { cardEl.classList.add('is-paused'); });
        cardEl.addEventListener('pointerleave', function () { cardEl.classList.remove('is-paused'); });
        try { cardEl.focus(); } catch (e) {}
        // The card click remains the player's act — Arcana's part (typing
        // the verb) begins only once they open the relation. No auto-click,
        // no stage drift; the demo waits exactly here.
      });
    });
  }

  // ── breach + finale: fullscreen ───────────────────────────────────────

  function playBreach(beat, next) {
    var root = el('cutscene');
    if (!root) { next(); return; }
    ensureBody('wanderlust', null);
    var full = document.createElement('div');
    full.className = 'ctv-breach';
    full.id = 'ctv-breach';
    full.innerHTML = '<div class="ctv-breach-glitch" aria-hidden="true">WANDERLUST // OVERRIDE</div><div class="ctv-breach-line" aria-live="polite"></div>';
    root.appendChild(full);
    fxShake();
    weather('void', 0);
    var breachRing = document.createElement('div');
    breachRing.className = 'ctv-breach-ring';
    breachRing.setAttribute('aria-hidden', 'true');
    breachRing.innerHTML = '<i></i><i></i><i></i>';
    root.appendChild(breachRing);
    var lineEl = full.querySelector('.ctv-breach-line');
    typewrite(lineEl, beat.text, function () {
      autoAdvance(beat.response, function () {
        if (full.parentNode) full.parentNode.removeChild(full);
        var ring = root.querySelector('.ctv-breach-ring');
        if (ring && ring.parentNode) ring.parentNode.removeChild(ring);
        var skyArtifact = el('ctv-artifact');
        if (skyArtifact && skyArtifact.parentNode) skyArtifact.parentNode.removeChild(skyArtifact);
        var cutsceneRoot = el('cutscene');
        if (cutsceneRoot) cutsceneRoot.classList.remove('is-sky-open');
        next();
      });
      var gate = root.querySelector('.ctv-gate');
      if (gate) full.appendChild(gate);
    });
  }

  function persistBreachResidue() {
    var s = st();
    if (!s) return;
    var prior = store().tutorialResidue || {};
    s.set({ tutorialResidue: Object.assign({}, prior, {
      vanir: { kind: 'weather-wound', material: 'wet black paper', goldThread: true, damagedRegion: true, ts: Date.now() }
    }) });
  }

  function leaveBreachResidue() {
    var root = el('cutscene');
    if (!root) return;
    root.classList.add('ctv-breach-residue');
    if (!root.querySelector('.ctv-vanir-puddle')) {
      var puddle = document.createElement('div');
      puddle.className = 'ctv-vanir-puddle';
      puddle.setAttribute('aria-hidden', 'true');
      puddle.innerHTML = '<i class="ctv-vanir-gold-thread"></i><b></b>';
      root.appendChild(puddle);
    }
    persistBreachResidue();
  }

  function restoreBreachResidue() {
    var residue = store().tutorialResidue && store().tutorialResidue.vanir;
    var root = el('cutscene');
    if (!root || !residue) return;
    root.classList.add('ctv-breach-residue', 'has-vanir-residue');
    var puddle = document.createElement('div');
    puddle.className = 'ctv-vanir-puddle ctv-vanir-puddle-restored is-settled';
    puddle.setAttribute('aria-hidden', 'true');
    puddle.innerHTML = '<i class="ctv-vanir-gold-thread"></i><b></b>';
    root.appendChild(puddle);
  }

  function renderDesktopResidue() {
    var residue = store().tutorialResidue && store().tutorialResidue.vanir;
    var stage = document.querySelector('.screen-stage');
    if (!residue || !stage || stage.querySelector('.ctv-desktop-vanir-residue')) return;
    var mark = document.createElement('div');
    mark.className = 'ctv-desktop-vanir-residue';
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = '<i class="ctv-vanir-gold-thread"></i><b></b>';
    stage.appendChild(mark);
  }

  /* The finale's desktop residue (empty table, four material doors, Y's box)
     was retired at the author's request: on the live desktop it read as a
     lattice of stray outlines and a mystery textbox over the home room.
     persistFinaleResidue still records that the finale happened; nothing
     renders it anymore. */
  function persistFinaleResidue() {
    var s = st();
    if (!s) return;
    var prior = store().tutorialResidue || {};
    s.set({ tutorialResidue: Object.assign({}, prior, {
      final: { kind: 'empty-poppet-table', materials: ['outline', 'clothes', 'traits', 'Others'], waiting: true, yStable: true }
    }) });
  }

  function playFinale(beat, next) {
    var root = el('cutscene');
    if (!root) { next(); return; }
    flash('rgba(255,240,220,0.85)', 450);
    fxShake();
    setTimeout(function () {
      var r2 = el('cutscene');
      if (!r2) { next(); return; }
      var full = document.createElement('div');
      full.className = 'ctv-finale';
      full.id = 'ctv-finale';
      full.innerHTML = '<div class="ctv-finale-memory" aria-hidden="true"><i></i><b></b><em>' + fillName(aliasOf()) + '</em></div>'
        + '<div class="ctv-finale-line">' + fillName(beat.text) + '</div>'
        + '<div class="ctv-finale-traces" aria-hidden="true">'
        + '<i class="ctv-trace-outline"><b>outline</b></i>'
        + '<i class="ctv-trace-clothes"><b>clothes</b></i>'
        + '<i class="ctv-trace-traits"><b>traits</b></i>'
        + '<i class="ctv-trace-others"><b>Others</b></i>'
        + '</div>'
        + '<div class="ctv-finale-after" aria-hidden="true">the machine learned the shape of you</div>';
      r2.appendChild(full);
      var finaleOrbit = document.createElement('div');
      finaleOrbit.className = 'ctv-finale-orbit';
      finaleOrbit.setAttribute('aria-hidden', 'true');
      finaleOrbit.innerHTML = '<i></i><i></i><i></i>';
      r2.appendChild(finaleOrbit);
      void full.offsetWidth;
      full.classList.add('go');
      setTimeout(function () {
        full.classList.add('is-fade');
        setTimeout(function () { next(); }, 2100);
      }, 3000);
    }, 1300);
  }

  // ── dialogue beat ─────────────────────────────────────────────────────

  var ENTER_FX = {
    'creep-in': 'is-creep',
    'stone-enter': 'is-stone',
    'infection': 'is-infect',
    'arcana-enter': 'is-creep',
    'vanir-enter': 'is-stone'
  };

  function persistTutorReturn() {
    if (!poppetApi) return;
    try { if (poppetApi.keep) poppetApi.keep(); } catch (e) {}
    var root = el('cutscene');
    if (root) {
      root.classList.remove('has-poppet', 'poppet-immersion');
      root.classList.add('desktop-reveal', 'poppet-return-residue');
      if (!root.querySelector('.ctv-desktop-demo')) {
        var demo = document.createElement('div');
        demo.className = 'ctv-desktop-demo';
        demo.setAttribute('aria-hidden', 'true');
        demo.innerHTML = '<div class="ctv-demo-notepad">scratch / orbit</div>'
          + '<div class="ctv-demo-galaxy"><i></i><b>the empty poppet</b><em></em></div>'
          + '<div class="ctv-demo-dock"><i></i><i></i><i></i><i></i><i></i><span>cartridge dock / asleep</span></div>';
        root.appendChild(demo);
      }
      if (!root.querySelector('.ctv-buddy-anchor')) {
        var anchor = document.createElement('div');
        anchor.className = 'ctv-buddy-anchor'; anchor.setAttribute('aria-hidden', 'true');
        anchor.innerHTML = '<i></i><span>the place remembers</span>';
        root.appendChild(anchor);
      }
    }
    removePoppetBench();
  }

  function runPhysiusIllustration(done) {
    if (!poppetApi || !poppetApi.door || !poppetApi.strokePath) { if (done) done(); return; }
    if (poppetApi.savedAll && poppetApi.savedAll()) { if (done) done(); return; }
    var layers = ['outline', 'clothes', 'traits', 'others'];
    var step = 0;
    function one() {
      if (step >= layers.length) { if (done) done(); return; }
      var key = layers[step++];
      poppetApi.door(key);
      if (poppetApi.swatch) poppetApi.swatch(PUPPET_INKS[key] == null ? 0 : PUPPET_INKS[key]);
      strokeOnBench(key, function () {
        if (poppetApi.keep) poppetApi.keep();
        setTimeout(one, 360);
      });
    }
    one();
  }

  function playDialogue(idx, beat, next) {
    var enterFx = ENTER_FX[beat.effect] || null;
    if (beat.speaker === 'riason' && riasonDeparted) { next(); return; }
    var root = el('cutscene');
    if (root) {
      root.dataset.presentation = beat.presentation || (beat.effect === 'as-above' ? 'ritual' : 'normal');
      root.dataset.activeSpeaker = beat.speaker;
      root.classList.toggle('is-ritual-line', root.dataset.presentation === 'ritual');
    }
    var body = ensureBody(beat.speaker, enterFx);
    if (!body) { next(); return; }
    // V3 lets Riason leave on his authored "skulks-away" beat; do not
    // tear Physius out merely because Riason speaks later while carrying Y.
    dimOthers(beat.speaker);
    setTone(body, beat.tone);
    if (beat.effect === 'creep-in') {
      var c = cast();
      if (c) c.classList.add('is-overlap');
    }
    var lineEl = body.querySelector('.ctv-line');
    var typed = function () {
      var afterVoice = function () {
        if (beat.speaker === 'riason') revealRiasonParentheticals(lineEl);
        if (beat.speaker === 'riason' && beat.text.indexOf('LEARN') >= 0) markLineWord(lineEl, 'LEARN', 'ctv-learn-door');
        if (beat.text && /imaginary/i.test(beat.text)) fxImaginaryWord(body);
        // the OBJECT↔SELF slip rides the object-relations beat; keyed to the
        // words rather than a beat number so retuned openings keep it.
        if (beat.text && /by yourself identifying/i.test(beat.text)) fxLogicSlip(body);
        if (beat.effect === 'room-cycle' || beat.effect === 'pixel-smoke' || beat.effect === 'diegetic-cracks') fxWindowBreath();
        if (beat.effect === 'color-cycle') fxColorCycle(body, 2400);
        // The shadow material arrives with Vanir's authored warning; the
        // response rail remains the only tutorial control in this scene.
        // Fit after every inline mark is in place: the five-concept line only
        // reaches its real height once its definition spans exist.
        fitBody(body);
        if (beat.effect === 'noble-shadow' || beat.effect === 'rainy-day') {
          fxV3Effect(beat.effect);
        }
        if (beat.effect === 'auto-illustrate') {
          // This is deliberately not a player action. The line hands the
          // table to Physius, then the MMPH beat is allowed to interrupt only
          // after all four real layers have been made and laid.
          closeGate('action-lock');
          runPhysiusIllustration(function () { advanceFrom(idx, next); });
          return;
        }
        // Wanderlust hijacks the keyboard: the authored response types
        // itself in the rail and the scene advances. No gate, no button.
        // beat.auto: she fires it herself (the poppet handoff opens the app).
        autoAdvance(beat.response, function () {
        var c2 = cast();
        if (c2) c2.classList.remove('is-overlap');
        if (beat.effect === 'x-face') {
          // The Vacui took her hands: she marks the others layer in the
          // real worktable, then yields — the traveller finishes it later.
          xOnBench(function () { advanceFrom(idx, next); });
          return;
        }
        // Physius speaks first, then performs the mark after the traveller
        // acknowledges the lesson. This keeps the explanation readable while
        // making every demonstrated stroke travel through the real app.
        if (beat.effect && beat.effect.indexOf('trace:') === 0) {
          strokeOnBench(beat.effect.slice(6), function () {
            setTimeout(function () { advanceFrom(idx, next); }, 300);
          });
          return;
        }
        if (beat.effect && beat.effect.indexOf('poppet-option-') === 0) {
          performPoppetLayer(beat.effect.slice('poppet-option-'.length), function () {
            advanceFrom(idx, next);
          });
          return;
        }
        if (beat.effect === 'pixel-smoke') {
          fxPixelSmoke(body, function () { advanceFrom(idx, next); });
          return;
        }
        if (beat.effect === 'room-cycle') {
          fxRoomCycle(function () { advanceFrom(idx, next); });
          return;
        }
        if (beat.effect === 'shrink-to-themes') fxShrinkToThemes();
        else if (beat.effect === 'skulks-away') {
          if (beat.speaker === 'riason') fxSkulkAway();
          else if (beat.speaker === 'physius') fxPhysiusLeave();
          else removeBody(beat.speaker);
        }
        else if (beat.effect === 'obliteration') {
          // Wanderlust interrupts Vanir; the dark material remains as a
          // wound, not a defeated character, and the gold thread survives. She
          // does not delete the dark — she pushes it out, so the void closes
          // and the stars she brought come back.
          weather('void', 0);
          weather('stars', 1);
          leaveBreachResidue();
          fxObliteration(function () { advanceFrom(idx, next); });
          return;
        }
        else if (beat.effect === 'sheen') fxSheen();
        else if (beat.effect === 'diegetic-cracks') fxDiegeticCracks();
        else if (beat.effect === 'riason-centre') {
          body.classList.add('is-centre');
          var stage = document.querySelector('.ctv-stage');
          if (stage) stage.classList.add('riason-order');
        }
        else if (beat.effect === 'save-home') {
          // The worktable leaves, but Physius does not vanish and respawn on
          // the next advance. She travels with Y into the desktop scene and
          // remains present for the two authored setup lines that follow.
          // Remove the worktable first, then animate the still-mounted Physius
          // into her home resting zone. Starting the animation after the
          // screen handoff prevents the plate from flying out of the stage or
          // reappearing only after the next authored line.
          persistTutorReturn();
          fxPhysiusReturnToDesktop();
          flash('rgba(0,0,0,0.9)', 600);
        }
        if (beat.effect !== 'noble-shadow' && beat.effect !== 'rainy-day' && beat.effect !== 'as-above') fxV3Effect(beat.effect);
        advanceFrom(idx, next);
        }, beat.auto);
      };
      if (beat.identities) revealIdentities(lineEl, beat.identities, afterVoice);
      else afterVoice();
    };
    // The ritual line changes the textbox at the moment its authored speech
    // begins, rather than after the response gate has been clicked.
    if (beat.effect === 'as-above') fxV3Effect('as-above');
    typewrite(lineEl, beat.text, typed);
  }

  function advanceFrom(idx, next) {
    var root = el('cutscene');
    var beat = beats()[idx];
    if (root) {
      // The authored ritual line owns its special presentation until the
      // next beat has actually mounted. Resetting here made the shared gate
      // flash under a stale Riason box and hid the AS ABOVE transition.
      if (!beat || beat.presentation !== 'ritual') {
        root.dataset.presentation = 'normal';
        root.classList.remove('is-ritual-line');
      }
    }
    if (idx === 0 && st()) st().set({ keysNamed: true });
    cursor(idx + 1);
    next();
  }

  // ── driver ────────────────────────────────────────────────────────────

  function playFrom(startIdx) {
    var list = beats();
    if (!mountRoot()) return;
    var idx = startIdx || 0;
    var riasonExit = -1;
    for (var ri = 0; ri < list.length; ri++) {
      if (list[ri].speaker === 'riason' && list[ri].effect === 'skulks-away') {
        riasonExit = ri;
        break;
      }
    }
    riasonDeparted = riasonExit >= 0 ? idx > riasonExit : idx > 50;

    // reload-resume: rebuild the cast the visitor would see at this beat.
    // The release script is Wanderlust's show end to end: she is on stage
    // from her first arrival through the desktop finale. The rebuild keys
    // off her authored arrival rows, not hardcoded beat numbers. The rule:
    // pre-mount her only when NO wanderlust arrival lies at or ahead of the
    // cursor — an upcoming arrival owns her entrance itself, so the stage
    // breathes empty through the handoff and its wait before the finale
    // brings her back (and through the wait before her first entrance).
    var wanderIdx = firstWanderlustIndex();
    var pendingArrival = false;
    for (var pa = idx; pa < list.length; pa++) {
      if (list[pa].kind === 'arrival' && list[pa].speaker === 'wanderlust') { pendingArrival = true; break; }
    }
    if (wanderIdx >= 0 && !pendingArrival) ensureBody('wanderlust', null);
    // resume inside the poppet walk: the real bench comes back mounted.
    var firstPoppet = -1, lastPoppet = -1, poppetFinish = list.length;
    for (var fp = 0; fp < list.length; fp++) {
      var bk = list[fp].kind;
      if (bk === 'poppet-app' || bk === 'poppet-door' || bk === 'poppet-draw' || bk === 'poppet-keep') {
        if (firstPoppet < 0) firstPoppet = fp;
        lastPoppet = fp;
      }
      if (firstPoppet >= 0 && fp > firstPoppet && list[fp].effect === 'save-home') { poppetFinish = fp; break; }
    }
    // Most of the demonstration is authored dialogue now, not poppet-kind
    // rows. Resume must therefore keep the real table mounted until the
    // authored save-home handoff, not only while a control row is active.
    if (firstPoppet >= 0 && idx >= firstPoppet && idx < poppetFinish) mountPoppetBench();

    restoreBreachResidue();

    (function step() {
      if (idx >= list.length) { endClean(true); return; }
      var beat = list[idx];
      var meta = production()[idx];
        if (meta) {
          applyProductionContract(meta);
          setResponseMode(meta.mode);
        }
        (function (at, b) {

        function go() { idx = at + 1; step(); }
        beatPulse(b);
        if (b.kind === 'ritual') {
          playRitual(function () { advanceFrom(at, go); });
        } else if (b.kind === 'arrival') {
          // The cursor only advances when the beat COMPLETES, so the parked
          // cursor during the wait and the pre-show is this arrival: a reload
          // mid-performance replays it from the top instead of skipping it.
          (function performArrival(at, b, go) {
            var begin = function () {
              // Grand arrivals bypass the ordinary enter class: her entrance
              // is the too-large arrival (is-grand-arrive), not is-infect.
              var body = ensureBody(b.speaker, b.grand ? 'is-grand-arrive' : (ENTER_FX[b.effect] || 'is-infect'));
              if (!body) { advanceFrom(at, go); return; }
              dimOthers(b.speaker);
              if (b.effect) fxV3Effect(b.effect);
              setTone(body, b.tone);
              var lineEl = body.querySelector('.ctv-line');
              var speak = function () {
                typewrite(lineEl, b.text, function () {
                  fitBody(body);
                  setTimeout(function () { advanceFrom(at, go); }, HOLD_MS);
                });
              };
              if (b.grand) setTimeout(speak, 1200);
              else speak();
            };
            if (b.grand) fxGrandEntrance();
            if (b.wait) setTimeout(begin, b.wait);
            else begin();
          })(at, b, go);
        } else if (b.kind === 'poppet-app' || b.kind === 'poppet-door' || b.kind === 'poppet-draw' || b.kind === 'poppet-keep') {
          poppetStepIdx = at;
          playPoppetStage(b, function () { advanceFrom(at, go); });
        } else if (b.kind === 'handoff') {
          playHandoff(function () { advanceFrom(at, go); });
        } else if (b.kind === 'rat') {
          playRat(function () { advanceFrom(at, go); });
        } else if (b.kind === 'rat-explode') {
          playRatExplode(function () { advanceFrom(at, go); });
        } else if (b.kind === 'artifact') {
          playArtifact(b, function () { advanceFrom(at, go); });
        } else if (b.kind === 'breach') {
          playBreach(b, function () { advanceFrom(at, go); });
        } else if (b.kind === 'finale') {
          playFinale(b, function () { playDesktopFinale(function () { advanceFrom(at, go); }); });
        } else {
          playDialogue(at, b, go);
        }
      })(idx, beat);
    })();
  }

  // ── the new-opening and desktop-finale beats ───────────────────────────

  /* handoff: the tutorial opens the paint rite on the desktop — the doll's
     own texture canvases with a live buddy beside them. Keeping lifts the
     park; walking away falls back to the tray seat (full lab). The beat
     parks here either way: the finale waits until a poppet is kept. */
  function keptRecords() {
    if (!primaryKeepReader) throw new Error('strict keepsake reader has not loaded');
    return primaryKeepReader();
  }

  function recoverPrimaryMirror(record, next) {
    var root = el('cutscene');
    var rail = root && root.querySelector('.ctv-response-rail');
    if (!root || !rail) {
      reportTutorialFailure('tutorial-primary-mirror-surface-missing', new Error('tutorial response surface is unavailable'));
      if (st()) st().set({ tutorialPaused: true });
      return;
    }
    closeGate('advance');
    rail.innerHTML = '';
    var status = document.createElement('p');
    status.className = 'ctv-rite-status';
    status.setAttribute('role', 'status');
    status.textContent = 'the poppet is kept, but its book mark failed. try again.';
    var retry = document.createElement('button');
    retry.className = 'ctv-response cutscene-option';
    retry.type = 'button';
    retry.textContent = 'try again';
    rail.appendChild(status);
    rail.appendChild(retry);
    if (typeof retry.focus === 'function') retry.focus({preventScroll: true});
    if (st()) st().set({ tutorialPaused: true });
    var busy = false;
    retry.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      retry.disabled = true;
      Promise.all([loadKeepCommitFactory(), loadPrimaryKeepReader()]).then(function (modules) {
        var createKeepCommit = modules[0];
        var readKeepsakes = modules[1];
        var flow = window.LiberTutorialFlow;
        if (!flow || !Array.isArray(flow.ORDER)) throw new Error('tutorial cursor helper is unavailable');
        var cursorIndex = flow.ORDER.indexOf('beat-017');
        if (cursorIndex < 0) throw new Error('first-making return cursor is unavailable');
        var latestShelf = readKeepsakes();
        var pending = latestShelf.find(function (item) { return item.n === record.n; });
        if (!pending) throw new Error('the saved poppet is no longer on the shelf');
        var controller = createKeepCommit({
          idPrefix: 'poppet-rite',
          pending: { record: pending, count: latestShelf.length },
          capture: function () { throw new Error('recovery cannot create a new poppet'); }
        });
        var result = controller.commit(Object.assign({}, flow.patchAt(cursorIndex), {
          tutorialPaused: false
        }));
        if (!result.ok) throw result.error || new Error('the saved poppet could not be marked');
        rail.innerHTML = '';
        if (st()) st().set({ tutorialPaused: false });
        next();
      }).catch(function (error) {
        reportTutorialFailure('tutorial-primary-mirror-retry-failed', error);
        status.textContent = 'the poppet is kept, but its book mark failed. try again.';
        retry.disabled = false;
        busy = false;
      });
    });
  }

  function playHandoff(next) {
    // Already been? If a lab poppet exists, the handoff already happened —
    // resuming from the parked cursor must walk straight into the finale,
    // never replay the tray seat (that replay is what made the returned
    // desktop feel dead: pause, tray, pause).
    var shelf;
    try {
      shelf = keptRecords();
    } catch (error) {
      reportTutorialFailure('tutorial-primary-keep-read-failed', error);
      if (st()) st().set({ tutorialPaused: true });
      closeGate('action-lock');
      return;
    }
    if (shelf.length) {
      var latest = shelf[shelf.length - 1];
      var buddy = store().buddy;
      var hasMirror = Array.isArray(buddy) && buddy.some(function (entry) {
        return entry && entry.kind === 'poppet' && entry.keepsakeN === latest.n;
      });
      if (!hasMirror) {
        recoverPrimaryMirror(latest, next);
        return;
      }
      try { if (st()) st().set({ tutorialPaused: false }); } catch (e) {}
      next();
      return;
    }
    document.body.classList.add('ctv-poppet-glow');
    if (window.LiberPoppetRite) {
      try {
        // Wanderlust does it herself: the machine shakes, the TraveROM
        // rattles, and the first making opens on its own — the traveller
        // seats nothing and clicks nothing to get there.
        try {
          var dock2 = (window.Liber && window.Liber.crtBay) || null;
          if (dock2 && dock2.shudder) dock2.shudder(1200);
        } catch (e) {}
        shakeMachine(1200);
        setTimeout(function () {
          closeGate('action-lock');
          try { if (st()) st().set({ tutorialPaused: true }); } catch (e) {}
          yieldCutsceneToRite();
          var active = window.LiberPoppetRite.open({
            onKeep: function (result, destination) {
              void result;
              document.body.classList.remove('ctv-poppet-glow');
              clearFirstMakingRequest();
              restoreCutsceneFromRite();
              if (destination === 'workshop') {
                window.location.href = 'sigil.html';
                return;
              }
              next();
            },
            onDismiss: function () {
              document.body.classList.remove('ctv-poppet-glow');
              clearFirstMakingRequest();
              restoreCutsceneFromRite();
              endClean(false);
            },
            onError: function (error) {
              reportTutorialFailure('first-making-setup-failed', error);
            }
          });
          if (!active) {
            document.body.classList.remove('ctv-poppet-glow');
            restoreCutsceneFromRite();
            reportTutorialFailure('first-making-open-failed', new Error('first-making rite could not be mounted'));
            if (st()) st().set({ tutorialPaused: true });
          }
        }, 900);
        closeGate('action-lock');
        try { if (st()) st().set({ tutorialPaused: true }); } catch (e) {}
        return;
      } catch (error) {
        document.body.classList.remove('ctv-poppet-glow');
        restoreCutsceneFromRite();
        reportTutorialFailure('first-making-open-failed', error);
        if (st()) st().set({ tutorialPaused: true });
        closeGate('action-lock');
        return;
      }
    }
    reportTutorialFailure('first-making-rite-unavailable', new Error('first-making rite is unavailable'));
    if (st()) st().set({ tutorialPaused: true });
    closeGate('action-lock');
  }

  /* summon: Wanderlust's four-line rhyming call, staged like the opening */
  /* rat: the creator's fourth-wall note, glitching into existence */
  function playRat(next) {
    var root = el('cutscene');
    if (!root) { next(); return; }
    var box = document.createElement('div');
    box.className = 'ctv-body ctv-rat ctv-rat-glitch';
    box.dataset.speaker = 'rat';
    box.innerHTML = '<div class="ctv-aura" aria-hidden="true"><i></i><i></i><i></i></div>'
      + '<div class="ctv-head"><div class="ctv-voice">RAT</div></div>'
      + '<div class="ctv-line">Hi! It’s rose, the creator of this. This is an early alpha build, please try it out and give your feedback to libervacui@gmail.com</div>';
    box.style.cssText = 'position:absolute;right:4%;top:38%;width:min(400px,52%);z-index:30;';
    root.appendChild(box);
    typewrite(box.querySelector('.ctv-line'), box.querySelector('.ctv-line').textContent, function () {
      setTimeout(next, 1200);
    });
  }
  function playRatExplode(next) {
    var root = el('cutscene');
    var box = root && root.querySelector('.ctv-rat');
    if (!box) { next(); return; }
    box.classList.add('ctv-rat-die');
    flash('rgba(220,255,220,0.6)', 400);
    fxShake();
    setTimeout(function () {
      if (box.parentNode) box.remove();
      next();
    }, 950);
  }

  /* the desktop finale: pink envelope, Wanderlust orb + chat, in place of
     the old in-cutscene finale for the beats the script now runs live on
     the desktop after the poppet comes home. The finale beat itself reuses
     the existing full-screen player. */
  function playDesktopFinale(next) {
    var stage = document.querySelector('.screen-stage') || document.body;
    stage.classList.add('ctv-pink-envelope');
    setTimeout(function () {
      stage.classList.remove('ctv-pink-envelope');
      if (next) next();
    }, 4000);
  }

  // ── re-entry: two beats for the returned ──────────────────────────────

  function playReentry() {
    if (!mountRoot()) return;
    var body = ensureBody('liber-vacui', null);
    var lineEl = body.querySelector('.ctv-line');
    typewrite(lineEl, 'the same silence. the wheel turned while you were gone.', function () {
      openGate('resume', function () {
        typewrite(lineEl, 'then resume, traveller — the tray answers either way.', function () {
          openGate('resume', function () { endClean(true); });
        });
      });
    });
  }

  function endClean(forceComplete) {
    if (poppetApi && typeof poppetApi.exit === 'function') {
      try { poppetApi.exit(); } catch (e) {}
    }
    // Escape is a safe cancellation, not a completed lesson: preserve the
    // saved cursor and let the user reopen the same beat.
    var canceled = forceComplete !== true;
    restoreSpellPresentation();
    clearTransientTutorialNodes();
    clearBox();
    poppetBenchWrap = null;
    poppetApi = null;
    var rootClean = el('cutscene');
    if (rootClean) {
      rootClean.classList.remove('has-poppet');
      delete rootClean.dataset.sceneAuthority;
      delete rootClean.dataset.sceneSurface;
      delete rootClean.dataset.sceneMode;
      delete rootClean.dataset.sceneCarry;
    }
    var stage = document.querySelector('.screen-stage');
    if (stage) {
      var stars = stage.querySelector('.ctv-stars');
      if (stars && stars.parentNode) stars.parentNode.removeChild(stars);
      stage.classList.remove('ctv-time-hijack-stage', 'ctv-screen-pulse');
    }
    // The sky belongs to the tutorial's stage: clear it with the scene so no
    // fracture or star survives onto the desktop.
    weather('clear', 0);
    var screen = document.querySelector('.screen');
    if (screen) screen.classList.remove('ctv-screen-pulse');
    var machine = document.querySelector('.machine');
    if (machine) machine.classList.remove('flame-glow', 'machine-break', 'machine-break-hard', 'ctv-time-hijack-machine', 'do-shake-hard');
    // The handoff dims the machine to point at the poppet cart. That lesson is
    // over now, and the desktop is not a dimmed room: hand the desktop its own
    // brightness back.
    document.body.classList.remove('ctv-poppet-glow');
    if (st()) {
      if (!canceled) {
        persistFinaleResidue();
        st().set({ tutorialDone: true, tutorialStage: 'done', tutorialPaused: false });
      } else {
        st().set({ tutorialPaused: true });
      }
    }
    chime();
  }

  function resumeTutorial() {
    var g = store();
    if (g.tutorialDone) return;
    resolveAndPlay(true);
  }

  window.Cutscene = window.Cutscene || {};
  window.Cutscene.open = playFrom;
  window.Cutscene.reentry = playReentry;
  window.Cutscene.resume = resumeTutorial;

  // ── pre-tutorial veil ─────────────────────────────────────────────
  // desktop.html paints a VOID cover with first paint so the home screen
  // (rug poppet included) never flashes before the cutscene exists. Lift it
  // the moment the cutscene mounts, and on every path where no cutscene
  // will play (returning users, name gate) so it can never trap.
  function liftVeil() {
    try {
      var v = document.getElementById('ctv-veil');
      if (v && v.parentNode) v.parentNode.removeChild(v);
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('desktop')) { liftVeil(); return; }
    if (!window.CutsceneV2Data) { liftVeil(); return; }
    // A completed state can arrive from the dock, a reload handoff, or a
    // harness restoring a saved session while the old scene is still on the
    // screen. Never leave the Poppet worktable/cast mounted in that window.
    if (st() && st().on) {
      st().on('change', function (next) {
        if (next && next.tutorialDone && next.tutorialStage === 'done' && el('cutscene')) endClean(true);
      });
    }
    var g = store();
    if (firstMakingRequested() && !g.enterRiteDone) {
      liftVeil();
      return;
    }
    // Returning from the workshop (or any app) while the tutorial is paused:
    // resume the cursor directly. Without this the visitor lands on a dead
    // desktop — paused with no player — and the next advance appears to do
    // nothing. Never replay the tray handoff on return.
    if (g.tutorialPaused && !g.tutorialDone && g.enterRiteDone) {
      resumeTutorial();
      return;
    }
    if (g.nameTransition) {
      if (st()) st().set({ nameTransition: false });
      var transition = document.createElement('div');
      transition.className = 'ctv-name-transition';
      transition.setAttribute('aria-hidden', 'true');
      transition.innerHTML = '<i></i><b>THE NAME HAS ARRIVED</b><span>' + fillName(aliasOf()) + '</span>';
      document.body.appendChild(transition);
      liftVeil(); // the transition owns the screen from this repaint on
      setTimeout(function () { if (transition.parentNode) transition.parentNode.removeChild(transition); }, 1600);
      setTimeout(function () { resolveAndPlay(false); }, 650);
      return;
    }
    if (g.tutorialDone && firstMakingRequested()) {
      liftVeil();
      renderDesktopResidue();
      openCompletedFirstMaking();
      return;
    }
    if (g.tutorialPaused) { liftVeil(); return; }
    if (g.tutorialDone) {
      liftVeil(); // residue only from here — no cutscene will mount
      renderDesktopResidue();
      if (g.tutorialStage === 'reentry') {
        if (st()) st().set({ tutorialStage: 'done' });
        playReentry();
      }
      return;
    }
    // The name gate runs first: enter-rite owns the tube until it hands off.
    // Veil lifts here — the name modal must be visible, and pre-tutorial the
    // desktop behind it is the current behavior, not the flash (which is the
    // post-name reload path, covered by mountRoot).
    if (!g.enterRiteDone) { liftVeil(); return; }
    resolveAndPlay(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('poppet-rite') && window.LiberPoppetRite &&
        typeof window.LiberPoppetRite.requestDismiss === 'function') {
      e.preventDefault();
      e.stopPropagation();
      window.LiberPoppetRite.requestDismiss();
      return;
    }
    if (el('cutscene')) {
      var tray = document.getElementById('crt-bay-tray');
      if (tray && tray.classList.contains('out')) return;
      e.preventDefault();
      e.stopPropagation();
      endClean(false);
    }
  }, true);
})();
