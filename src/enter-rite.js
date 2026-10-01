// enter-rite.js — blank-dormant desktop + name ritual.
// Vanilla IIFE + window.Liber, file://-safe. Opens only on a fresh
// first visit (no tutorialDone, no artifacts); proceed pixel-builds
// the traveller name, stores it, then hands to the cutscene flow.

(function (global) {
  'use strict';

  var CPS = 40;

  function byId(id) { return document.getElementById(id); }

  var closePopup = null;
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || typeof closePopup !== 'function') return;
    var popup = byId('enter-popup');
    if (!popup || popup.hidden) return;
    e.stopImmediatePropagation();
    closePopup();
  }, true);

  function isFresh(state) {
    if (!state) return true;
    if (state.tutorialDone) return false;
    if (state.enterRiteDone) return false;
    var keys = ['buddy', 'relations', 'divination', 'games', 'learn', 'abstract', 'sea', 'garden', 'dreams', 'journal'];
    for (var i = 0; i < keys.length; i++) {
      var arr = state[keys[i]];
      if (Array.isArray(arr) && arr.length) return false;
    }
    return true;
  }

  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  function init() {
    var desktop = byId('desktop');
    var rite = byId('enter-rite');
    var box = byId('enter-box');
    var backdrop = byId('enter-backdrop');
    var popup = byId('enter-popup');
    var closeBtn = byId('enter-close');
    var nameInput = byId('enter-name');
    var proceed = byId('enter-proceed');
    var build = byId('enter-build');
    var buildName = byId('enter-build-name');
    if (!desktop || !rite || !box || !backdrop || !popup || !nameInput || !proceed || !build || !buildName) return;

    var store = global.Liber && global.Liber.state;
    if (!store) return;
    if (!isFresh(store.get())) return;

    desktop.classList.add('enter-dormant');
    var stage = document.querySelector('.screen-stage');
    if (stage) stage.classList.add('enter-veiled');
    try {
      document.body.classList.add('enter-dormant-room');
      var room = document.querySelector('.room');
      if (room) room.classList.add('enter-dormant-room');
    } catch (e) {}
    show(rite);

    // the signpost: dormancy is the design, but silence reads as a broken
    // screen. One quiet line under the glyph says the tube is asleep and
    // what waking it asks for — no input-modality claim (touch, click and
    // Tab+Enter all reach the mark).
    var hint = document.createElement('p');
    hint.className = 'enter-hint';
    hint.setAttribute('aria-live', 'polite');
    hint.textContent = 'the machine is asleep. wake it — it will ask your name.';
    rite.appendChild(hint);

    function openPopup() {
      hide(build);
      show(backdrop);
      show(popup);
      proceed.disabled = nameInput.value.trim().length === 0;
      try { nameInput.focus(); } catch (e) {}
    }

    closePopup = function () {
      hide(popup);
      hide(backdrop);
      try { box.focus(); } catch (e) {}
    };

    box.addEventListener('click', openPopup);
    closeBtn.addEventListener('click', closePopup);
    backdrop.addEventListener('click', closePopup);
    nameInput.addEventListener('input', function () {
      proceed.disabled = nameInput.value.trim().length === 0;
    });

    proceed.addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) return;
      store.set({ travellerAlias: name.slice(0, 40), enterRiteDone: true, nameTransition: true, tutorialBeat: 0 });
      hide(popup);
      hide(backdrop);
      show(build);
      var full = 'its name is ' + name;
      var i = 0;
      buildName.textContent = '';
      var per = Math.round(1000 / CPS);
      var timer = setInterval(function () {
        i += 1;
        buildName.textContent = full.slice(0, i);
        if (i >= full.length) {
          clearInterval(timer);
          setTimeout(handOff, 600);
        }
      }, per);
    });

    function handOff() {
      // Deterministic handoff: reload so the existing cutscene auto-open
      // fires fresh on a clean tube. The flag above keeps the rite shut.
      window.location.reload();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
