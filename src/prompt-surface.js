// prompt-surface.js — renders emergent prompts on the desktop shell.
// Listens for 'liber:prompt' events from the engine and shows the latest
// one as a single fading line. Shell-owned (not a persona app): styling
// lives in styles/desktop.css. No history UI — prompts persist in
// state.prompts for future surfaces.

(function () {
  'use strict';

  var el = null;
  var hideTimer = null;
  var SHOW_MS = 9000;

  function ensureEl() {
    if (el) return el;
    el = document.createElement('div');
    el.className = 'prompt-line';
    el.setAttribute('role', 'status');
    // Anchor inside the CRT screen (the desktop stage) so the whisper
    // can never straddle the screen border (WS5 residual). Fallback to
    // body keeps the surface alive if the stage id changes.
    var stage = document.getElementById('desktop');
    (stage || document.body).appendChild(el);
    return el;
  }

  function show(prompt) {
    if (!prompt || !prompt.text) return;
    var node = ensureEl();
    node.textContent = prompt.text;
    node.classList.add('show');
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      node.classList.remove('show');
    }, SHOW_MS);
  }

  document.addEventListener('liber:prompt', function (e) {
    show(e.detail);
  });

  document.addEventListener('DOMContentLoaded', function () {
    var st = window.Liber && window.Liber.state;
    if (!st) return;
    var s = st.get();
    var prompts = s.prompts || [];
    if (prompts.length) show(prompts[prompts.length - 1]);
    if (window.Liber.prompts && window.Liber.prompts.generate) window.Liber.prompts.generate();
  });
})();
