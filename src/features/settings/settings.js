// settings.js — The room's room. Tutorial replay, shadow toggle, wipe.
// No shared imports (covenant Q.1).
// 2.13.0: the music panel is gone — the OST is removed for now, so the
// volume slider, the level reads and the "now playing" line went with it.
// The sound-fx switch stays; the machine's own clicks are still its voice.

(function () {
  function renderState() {
    var s = (window.Liber && window.Liber.state && window.Liber.state.get()) || {};
    var out = [];
    out.push('tutorialDone: ' + !!s.tutorialDone);
    out.push('stone: ' + ((s.buddy || []).filter(function (e) { return e && e.kind === 'stone'; }).length));
    out.push('sealed: ' + ((s.buddy || []).filter(function (e) { return !e || e.kind !== 'stone'; }).length));
    out.push('visited: ' + Object.keys(s.visited || {}).length + ' visitor' + (Object.keys(s.visited || {}).length === 1 ? '' : 's'));
    out.push('shadowOn: ' + !!s.shadowOn);
    out.push('shadowUnlocked: ' + !!s.shadowUnlocked);
    var el = document.getElementById('settings-state');
    if (el) el.textContent = out.join('\n');

    var machine = document.querySelector('.machine');
    var sb = document.getElementById('settings-shadow');
    if (sb) {
      var on = machine && machine.classList.contains('shadow-on');
      sb.textContent = on ? '— clear the weather —' : '— let it rain —';
    }

    renderSound();
    renderCrt();
  }

  // ── the tube's bloom: one owner (s.crt) for the whole machine. Every room
  //    that authors a CRT layer reads it in its own stylesheet; this panel is
  //    the canonical control (liberdev/crt-decision.md).
  var CRT_DEFAULT_INTENSITY = 0.4;
  var CRT_STEPS = { dim: 0.15, low: 0.4, full: 0.8 };
  function crtState() {
    var s = (window.Liber && window.Liber.state && window.Liber.state.get()) || {};
    var c = (s && typeof s.crt === 'object' && s.crt) ? s.crt : {};
    var v = typeof c.intensity === 'number' ? c.intensity : CRT_DEFAULT_INTENSITY;
    return { off: !!c.off, intensity: Math.max(0, Math.min(1, isFinite(v) ? v : CRT_DEFAULT_INTENSITY)) };
  }
  function crtStepName(c) {
    if (c.off) return 'off';
    if (c.intensity <= 0.2) return 'dim';
    if (c.intensity >= 0.6) return 'full';
    return 'low';
  }
  function renderCrt() {
    var name = crtStepName(crtState());
    var btns = document.querySelectorAll('[data-crt-step]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-crt-step') === name;
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) btns[i].classList.add('on'); else btns[i].classList.remove('on');
    }
  }
  function setCrtStep(step) {
    var st = window.Liber && window.Liber.state;
    if (!st) return;
    var cur = crtState();
    if (step === 'off') {
      // off keeps the intensity it had, so off -> on restores it instead of
      // snapping back to the default
      st.set({ crt: { intensity: cur.intensity, off: true } });
    } else {
      var v = CRT_STEPS[step];
      st.set({ crt: { intensity: typeof v === 'number' ? v : cur.intensity, off: false } });
    }
    renderCrt();
    if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play('tick'); } catch (e) {} }
  }

  // ── resolution: the machine's held width (s.resolution). One owner
  //    (src/stage.js) actually sizes the machine; this panel is its control,
  //    the same shape as the CRT steps above. See liberdev/scaling-checklist.md.
  function resValue() {
    var s = (window.Liber && window.Liber.state && window.Liber.state.get()) || {};
    var value = s.resolution || 'auto';
    var n = parseInt(value, 10);
    return value === 'auto' || !isFinite(n) || n < 900 ? 'auto' : String(n);
  }
  function renderRes() {
    var want = String(resValue());
    var btns = document.querySelectorAll('[data-res]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-res') === want;
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) btns[i].classList.add('on'); else btns[i].classList.remove('on');
    }
  }
  function setRes(v) {
    if (window.Liber && window.Liber.stage) window.Liber.stage.set(v);
    renderRes();
    if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play('tick'); } catch (e) {} }
  }

  // (the old room-behind toggle retired with the crt-room feature; the
  // Look Behind world is the room's only future owner)

  function renderSound() {
    var b = document.getElementById('settings-sound');
    if (!b) return;
    var on = (window.Liber && window.Liber.sound) ? window.Liber.sound.isEnabled() : true;
    b.textContent = 'sound fx: ' + (on ? 'on' : 'off');
  }

  function toggleSound() {
    var nowOn = true;
    if (window.Liber && window.Liber.sound) {
      nowOn = !window.Liber.sound.isEnabled();
      window.Liber.sound.setEnabled(nowOn);
    }
    renderSound();
    if (nowOn && window.Liber && window.Liber.sound) {
      try { window.Liber.sound.play('chime'); } catch (e) {}
    }
  }

  function replay() {
    if (window.Liber && window.Liber.state) {
      var g = window.Liber.state.get() || {};
      var kept = (g.buddy || []).length + (g.divination || []).length
        + (g.games || []).length + (g.sea || []).length + (g.garden || []).length
        + (g.dreams || []).length + (g.journal || []).length;
      if (kept > 0) {
        window.Liber.state.set({ tutorialDone: true, tutorialStage: 'reentry' });
      } else {
        window.Liber.state.set({ tutorialDone: false, tutorialStage: null });
      }
    }
    window.location.href = 'desktop.html';
  }

  function toggleShadow() {
    var machine = document.querySelector('.machine');
    if (!machine) return;
    machine.classList.toggle('shadow-on');
    if (window.Liber && window.Liber.state) {
      window.Liber.state.set({ shadowOn: machine.classList.contains('shadow-on') });
    }
    renderState();
  }

  // the wipe rides a two-switch interlock under a cover: lift the
  // cover, pull 1, then pull 2. any pause past the count drops it all
  // back to safe. plain pulls, no questions asked and none answered.
  var wipeTimer = null;
  function wipeSafe() {
    if (wipeTimer) { clearTimeout(wipeTimer); wipeTimer = null; }
    var cover = document.getElementById('settings-wipe-cover');
    var box = document.getElementById('settings-wipe-switches');
    var s1 = document.getElementById('settings-wipe-1');
    var s2 = document.getElementById('settings-wipe');
    if (s1) { s1.setAttribute('aria-pressed', 'false'); s1.disabled = true; }
    if (s2) { s2.setAttribute('aria-pressed', 'false'); s2.disabled = true; }
    if (box) box.hidden = true;
    if (cover) cover.setAttribute('aria-expanded', 'false');
  }
  function wipeCount() {
    if (wipeTimer) clearTimeout(wipeTimer);
    wipeTimer = setTimeout(wipeSafe, 8000);
  }
  function wipeCover() {
    var cover = document.getElementById('settings-wipe-cover');
    var box = document.getElementById('settings-wipe-switches');
    if (!cover || !box) return;
    var open = box.hidden;
    if (!open) { wipeSafe(); return; }
    box.hidden = false;
    cover.setAttribute('aria-expanded', 'true');
    var s1 = document.getElementById('settings-wipe-1');
    if (s1) s1.disabled = false;
    wipeCount();
  }
  function wipePull1() {
    var s1 = document.getElementById('settings-wipe-1');
    var s2 = document.getElementById('settings-wipe');
    if (!s1 || s1.disabled) return;
    s1.setAttribute('aria-pressed', 'true');
    s1.disabled = true;
    if (s2) s2.disabled = false;
    wipeCount();
  }
  function wipePull2() {
    var s2 = document.getElementById('settings-wipe');
    if (!s2 || s2.disabled) return;
    wipeSafe();
    if (window.Liber && window.Liber.state) window.Liber.state.reset();
    // Factory reset means everything: the state reset above only clears the
    // CURRENT slot, but the rug reads poppet.keepsakes.v1 (a global sidecar),
    // so a wiped save would still show the old doll. Sweep all of ours.
    try {
      var kill = [
        'liber_vacui_v1', 'liber_vacui_v1__play', 'liber_vacui_v1__keep', 'liber_vacui_v1__show',
        'liber_vacui_slot', 'liber_vacui_consent',
        'poppet.keepsakes.v1', 'poppet.keepdrop.v1', 'poppet.keepsake.fresh', 'poppet.dropannounce',
        'vanir.shelf.v1', 'vanir.exited.v1',
        'apptut.seen', 'liber_diag'
      ];
      for (var i = 0; i < kill.length; i++) localStorage.removeItem(kill[i]);
      // future-proofing: any other sidecar under our prefixes goes too.
      var prefixes = ['liber_vacui_', 'liber_vacui', 'poppet.', 'vanir.', 'apptut.', 'liber_diag'];
      var k, p, hit;
      var gone = [];
      for (var n = 0; n < localStorage.length; n++) {
        k = localStorage.key(n);
        if (!k) continue;
        for (p = 0; p < prefixes.length; p++) {
          if (k === prefixes[p] || k.indexOf(prefixes[p]) === 0) { gone.push(k); break; }
        }
      }
      for (hit = 0; hit < gone.length; hit++) localStorage.removeItem(gone[hit]);
    } catch (e) {}
    if (window.Liber && window.Liber.sound) window.Liber.sound.play('thunk');
    renderState();
  }

  function slotSummary(id) {
    var raw = null;
    try {
      raw = localStorage.getItem('liber_vacui_v1__' + id);
      if (!raw && id === 'keep') raw = localStorage.getItem('liber_vacui_v1');
      if (!raw) return 'empty';
      var s = JSON.parse(raw);
      var kinds = ['buddy', 'divination', 'games', 'learn', 'abstract', 'sea', 'garden', 'dreams', 'journal', 'methodology'];
      var n = 0, i;
      for (i = 0; i < kinds.length; i++) if (Array.isArray(s[kinds[i]])) n += s[kinds[i]].length;
      return (n ? n + ' kept' : 'empty') + (s.tutorialDone ? '' : ' · new');
    } catch (e) { return ''; }
  }

  function paintSlots() {
    var cur = null;
    try {
      var st0 = (window.Liber && window.Liber.state) || null;
      cur = st0 && st0.getSlot ? st0.getSlot() : 'keep';
    } catch (e) { cur = 'keep'; }
    var btns = document.querySelectorAll('[data-slot]');
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        var id = b.getAttribute('data-slot');
        var base = b.textContent.split(' — ')[0];
        b.textContent = base + ' — ' + slotSummary(id);
        if (id === cur) { b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); }
        else { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }
      })(btns[i]);
    }
  }
  function back() {
    window.location.href = 'desktop.html';
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderState();
    renderRes();
    paintSlots();
    var r = document.getElementById('settings-replay');
    var s = document.getElementById('settings-shadow');
    var sd = document.getElementById('settings-sound');
    var wcover = document.getElementById('settings-wipe-cover');
    var w1 = document.getElementById('settings-wipe-1');
    var w = document.getElementById('settings-wipe');
    var b = document.getElementById('settings-back');
    if (r) r.addEventListener('click', replay);
    if (s) s.addEventListener('click', toggleShadow);
    if (sd) sd.addEventListener('click', toggleSound);
    var crtBtns = document.querySelectorAll('[data-crt-step]');
    for (var ci = 0; ci < crtBtns.length; ci++) {
      (function (btn) {
        btn.addEventListener('click', function () { setCrtStep(btn.getAttribute('data-crt-step')); });
      })(crtBtns[ci]);
    }
    var resBtns = document.querySelectorAll('[data-res]');
    for (var ri = 0; ri < resBtns.length; ri++) {
      (function (btn) {
        btn.addEventListener('click', function () { setRes(btn.getAttribute('data-res')); });
      })(resBtns[ri]);
    }
    if (wcover) wcover.addEventListener('click', wipeCover);
    if (w1) w1.addEventListener('click', wipePull1);
    if (w) w.addEventListener('click', wipePull2);
    if (b) b.addEventListener('click', back);
    var slotBtns = document.querySelectorAll('[data-slot]');
    for (var si = 0; si < slotBtns.length; si++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var st = (window.Liber && window.Liber.state) || null;
          if (st && st.setSlot) st.setSlot(btn.getAttribute('data-slot'));
          paintSlots();
        });
      })(slotBtns[si]);
    }
  });
})();
