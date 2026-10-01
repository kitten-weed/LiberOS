// arcana.js — the shell. Owns the boot, the wall, the kitten (DOM fallback),
// the windows, the status bar, the keep prompt and the studies. The three
// games (tarot.js, iching.js, assoc.js) self-register into ARCANA.games.
//
// Design notes kept from the house:
//  - readable copy is semantic DOM; the Pixi field is decoration only
//  - WebGL failure or reduced motion degrades to a flat field; the room
//    degrades, never breaks
//  - the keep prompt closes on back-button (hash #keep), like the tent's
//  - nothing leaves this room except what the visitor keeps
(function () {
  'use strict';

  var A = (window.LIBER_ARCANA_DATA = window.LIBER_ARCANA_DATA || {});
  A.games = A.games || {};

  var shell = {
    reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  };

  function el(id) { return document.getElementById(id); }

  function play(kind) {
    if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play(kind); } catch (e) {} }
  }
  shell.play = play;

  // ── the boot log ─────────────────────────────────────────────────────
  var bootLines = [
    ['arcana bios 0.66 — liber vacui cartridge', ''],
    ['mounting the field ........................ ok', 'bl-ok'],
    ['counting the deck: 78, and the deck is honest', 'bl-info'],
    ['the coins: three, cast six times, bottom first', 'bl-info'],
    ['norms loaded: 62 cues, n\u2248540 each — jonauskaite et al. 2025', 'bl-ok'],
    ['indicators armed: rt, repetition, interpretation — vezzoli et al. 2007', 'bl-ok'],
    ['the kitten is in the room. it was always in the room.', '']
  ];
  function runBootLog(done) {
    var box = el('arc-bootlog');
    if (!box) { if (done) done(); return; }
    var i = 0;
    function next() {
      if (i >= bootLines.length) { setTimeout(function () { box.classList.add('gone'); }, 3200); if (done) done(); return; }
      var L = bootLines[i++];
      var div = document.createElement('div');
      div.className = 'bl-line ' + L[1];
      div.textContent = L[0];
      box.appendChild(div);
      setTimeout(next, shell.reduced ? 60 : 260);
    }
    next();
  }

  // ── the glyph wall (flat DOM layer under the Pixi canvas) ────────────
  function buildWall() {
    var field = el('arc-field');
    if (!field) return;
    var glyphs = '\u00b7\u22c5:\u2261\u2248\u2668\u2736\u2727*+x';
    var rows = 26, cols = 86;
    var txt = '';
    for (var r = 0; r < rows; r++) {
      var line = '';
      for (var c = 0; c < cols; c++) {
        line += Math.random() < 0.14 ? glyphs[(Math.random() * glyphs.length) | 0] : ' ';
      }
      txt += line + '\n';
    }
    field.textContent = txt;
  }

  // ── the kitten, DOM fallback (also the reduced-motion resting cat) ───
  var KITTY_FRAMES = [
    ['        ', '  /\\_/\\ ', ' ( o.o )', '  > ^ < '],
    ['        ', '  /\\_/\\ ', ' ( o.o )', '  >-^-< '],
    ['   /\\   ', '  /  \\_ ', ' ( o.o )', '  > ^ < '],
    ['        ', '  /\\_/\\ ', ' ( -.- )', '  > ^ < ']
  ];
  function startKittyFallback() {
    var field = el('arc-field');
    if (!field) return;
    var pre = document.createElement('pre');
    pre.className = 'kitty-dom';
    pre.setAttribute('aria-hidden', 'true');
    pre.style.cssText = 'position:absolute;margin:0;font-size:inherit;line-height:1.55;color:rgba(189,189,189,0.75);will-change:transform;';
    field.appendChild(pre);
    var frame = 0, dir = 1, x = 30;
    var vw = field.clientWidth || 800;
    function draw() {
      var fr = KITTY_FRAMES[frame % 4];
      var out = '';
      for (var r = 0; r < 4; r++) {
        var line = fr[r] || '        ';
        out += (dir === 1 ? line : line.split('').reverse().join('')) + '\n';
      }
      pre.textContent = out;
    }
    function step() {
      x += dir * 0.7;
      if (x > vw - 110) dir = -1;
      if (x < 10) dir = 1;
      frame += 1;
      pre.style.transform = 'translateX(' + x + 'px) scaleX(' + dir + ')';
      draw();
      if (!shell.reduced) requestAnimationFrame(step);
      else draw();
    }
    step();
  }

  // ── the wavy title: whole-block bob + shimmer (explodes via viz on pick) ──
  // the floating block title: assembled from exact per-glyph rows so
  // the columns are aligned by code, not by hand
  var TITLE_PARTS = {
    '<': ['  ██', ' ██ ', '██  ', ' ██ ', '  ██', '    '],
    'D': ['██████╗ ', '██╔══██╗', '██║  ██║', '██║  ██║', '██████╔╝', '╚═════╝ '],
    'I': ['██╗', '██║', '██║', '██║', '██║', '╚═╝'],
    'V': ['██╗   ██╗', '██║   ██║', '██║   ██║', '╚██╗ ██╔╝', ' ╚████╔╝ ', '  ╚═══╝  '],
    '>': ['██  ', ' ██ ', '  ██', ' ██ ', '██  ', '    ']
  };
  var TITLE = (function () {
    var order = ['<', 'D', 'I', 'V', '>'];
    var rows = ['', '', '', '', '', ''];
    for (var g = 0; g < order.length; g++) {
      var gl = TITLE_PARTS[order[g]];
      for (var r = 0; r < 6; r++) rows[r] += gl[r] + '  ';
    }
    return rows;
  })();
  function waveTitle() {
    var node = el('arc-title');
    if (!node) return;
    node.textContent = TITLE.join('\n');
    if (!shell.reduced) {
      node.style.animation = 'arc-wave 3.4s ease-in-out infinite';
      // the shimmer: a hue sweep runs over the block letters
      node.style.background = 'linear-gradient(100deg, #8cc85f 30%, #e3f0a0 46%, #79dac8 54%, #8cc85f 70%)';
      node.style.backgroundSize = '220% 100%';
      node.style.webkitBackgroundClip = 'text';
      node.style.backgroundClip = 'text';
      node.style.webkitTextFillColor = 'transparent';
      node.style.animation = 'arc-wave 3.4s ease-in-out infinite, arc-shimmer 6s linear infinite';
    }
  }
  // injected once
  (function injectKeyframes() {
    var st = document.createElement('style');
    st.textContent = '@keyframes arc-wave{0%,100%{transform:translateY(0) skewX(0deg)}25%{transform:translateY(-3px) skewX(0.4deg)}75%{transform:translateY(3px) skewX(-0.4deg)}}'
      + '@keyframes arc-shimmer{0%{background-position:120% 0}100%{background-position:-120% 0}}'
      + '@keyframes arc-rise{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(st);
  })();

  // ── the scramble: menu options decode out of glyph noise ──────────────
  var SCRAMBLE_POOL = '\u2736\u2727\u2261\u2248\u2668\u00b7+*/x\\|<>[]{}';
  function scrambleIn(node, finalText, delay) {
    var GLYPH = SCRAMBLE_POOL;
    var frames = 14;
    var hold = delay || 0;
    var t0 = null;
    function stepFn(ts) {
      if (t0 === null) t0 = ts;
      if (ts - t0 < hold) { requestAnimationFrame(stepFn); return; }
      var p = Math.min(1, (ts - t0 - hold) / (frames * 34));
      var out = '';
      for (var i = 0; i < finalText.length; i++) {
        if (finalText[i] === ' ') { out += ' '; continue; }
        out += (i / finalText.length < p) ? finalText[i] : GLYPH[(Math.random() * GLYPH.length) | 0];
      }
      node.textContent = out;
      if (p < 1) requestAnimationFrame(stepFn);
      else node.textContent = finalText;
    }
    node.textContent = finalText.replace(/\S/g, '\u00b7');
    requestAnimationFrame(stepFn);
  }

  // ── window manager ───────────────────────────────────────────────────
  var WM = {
    wins: {},
    register: function (id, opts) {
      var node = el(id);
      if (!node) return;
      this.wins[id] = { node: node, body: node.querySelector('.arc-win-body'), onClose: opts && opts.onClose, modal: opts && opts.modal };
      if (opts && opts.onOpen) this.wins[id].onOpen = opts.onOpen;
      var x = node.querySelector('.win-x');
      if (x) x.addEventListener('click', function () { WM.close(id); });
    },
    open: function (id) {
      var w = this.wins[id];
      if (!w) return;
      w.node.hidden = false;
      w.node.removeAttribute('inert');
      if (w.onOpen) { try { w.onOpen(); } catch (e) {} }
      var f = w.node.querySelector('input, button:not(.win-x), [tabindex]');
      if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
    },
    close: function (id) {
      var w = this.wins[id];
      if (!w || w.node.hidden) return;
      w.node.hidden = true;
      w.node.setAttribute('inert', '');
      if (w.onClose) w.onClose();
    },
    closeAll: function () { for (var k in this.wins) this.close(k); }
  };
  shell.WM = WM;

  // ── the keep prompt ──────────────────────────────────────────────────
  var hashLock = false;
  function setHash(h) {
    try {
      if ((location.hash || '') === h) return;
      hashLock = true;
      if (!h) history.back();
      else location.hash = h;
    } catch (e) { hashLock = false; }
  }
  var keepCtx = null;
  var discardCtx = null;
  shell.openKeep = function (title, body, onKeep, onDiscard) {
    var p = el('arc-keep');
    if (!p) return;
    el('arc-keep-title').textContent = title;
    el('arc-keep-body').innerHTML = body;
    keepCtx = onKeep || null;
    discardCtx = onDiscard || null;
    p.hidden = false;
    p.removeAttribute('inert');
    setHash('#keep');
    var b = el('arc-keep-keep');
    if (b) { try { b.focus(); } catch (e) {} }
  };
  shell.closeKeep = function () {
    var p = el('arc-keep');
    if (!p || p.hidden) return;
    p.hidden = true;
    p.setAttribute('inert', '');
    keepCtx = null;
    discardCtx = null;
    if ((location.hash || '') === '#keep' && !hashLock) {
      try { history.back(); } catch (e) {}
    }
  };
  function wireKeep() {
    var p = el('arc-keep');
    if (!p) return;
    el('arc-keep-keep').addEventListener('click', function () {
      var fn = keepCtx; keepCtx = null;
      p.hidden = true; p.setAttribute('inert', '');
      play('chime');
      if (fn) fn();
      if ((location.hash || '') === '#keep') setHash('');
    });
    function cancel() {
      p.hidden = true; p.setAttribute('inert', '');
      keepCtx = null;
      var d = discardCtx; discardCtx = null;
      if (d) { play('click'); try { d(); } catch (e) {} }
      if ((location.hash || '') === '#keep') setHash('');
    }
    el('arc-keep-discard').addEventListener('click', cancel);
    el('arc-keep-close').addEventListener('click', cancel);
    p.addEventListener('click', function (e) { if (e.target === p) cancel(); });
    window.addEventListener('hashchange', function () {
      if (hashLock) { hashLock = false; return; }
      if ((location.hash || '') !== '#keep' && p && !p.hidden) cancel();
    });
  }

  // ── keep: into the house state, journal-shaped ───────────────────────
  shell.saveArtifact = function (payload) {
    try {
      var st = window.Liber && window.Liber.state;
      if (!st) return null;
      var data = Object.assign({}, payload);
      try {
        var W = window.Liber.wanderlustAccent;
        if (W && W.evidenceFor && data.evidence !== false) data.keywordsMatched = W.evidenceFor(data);
      } catch (e) {}
      return st.addArtifact('divination', data);
    } catch (e) { return null; }
  };

  // ── question slate helper (each game owns its wording) ───────────────
  shell.slate = function (hostEl, placeholder, onSubmit) {
    if (!hostEl) return { value: function () { return ''; } };
    hostEl.innerHTML = '';
    var input = document.createElement('input');
    input.className = 'arc-q';
    input.type = 'text';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.placeholder = placeholder || 'write what you want known (or leave it blank)';
    input.setAttribute('aria-label', 'the question');
    hostEl.appendChild(input);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (typeof onSubmit === 'function') onSubmit(input.value.trim()); }
    });
    return { value: function () { return input.value.trim(); }, input: input };
  };

  shell.readingCite = function () {
    return 'methods: jonauskaite et al. 2025 (doi 10.5334/jopd.140) \u00b7 vezzoli et al. 2007 (doi 10.1111/j.1468-5922.2007.00642.x) — this room reads a game, not a person.';
  };

  // ── studies window content ───────────────────────────────────────────
  function renderStudies() {
    var body = el('arc-studies-body');
    if (!body) return;
    var S = A.studies || [];
    var out = '';
    for (var i = 0; i < S.length; i++) {
      var s = S[i];
      out += '<div class="study-item">'
        + '<div class="study-topic">' + s.topic + '</div>'
        + '<div class="study-src">' + s.source + '</div>'
        + '<ul class="study-claims">' + s.claimedFor.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul>'
        + '<div class="study-note">' + s.note + '</div>'
        + '</div>';
    }
    out += '<div class="study-note">both sources are also on the shelf of the whole house, in data/citations.</div>';
    body.innerHTML = out;
  }

  // ── the menu ─────────────────────────────────────────────────────────
  function wireMenu() {
    var opts = document.querySelectorAll('.menu-opt');
    for (var i = 0; i < opts.length; i++) {
      (function (opt, idx) {
        // the label decodes out of noise; the hint and glyph stay still
        var label = opt.querySelector('.opt-label');
        if (label) scrambleIn(label, label.textContent, 300 + idx * 260);
        opt.addEventListener('click', function () {
          var game = opt.getAttribute('data-game');
          play('thunk');
          if (window.ARCANA_VIZ) window.ARCANA_VIZ.burstAt(el('arc-title'), ['\u2736', '\u2727', '\u2735', '\u00b7', '\u2588'], { n: 30, color: 0x8cc85f });
          WM.close('arc-win-menu');
          var mod = A.games[game];
          if (mod && mod.start) mod.start();
          else if (window[game + 'Boot']) window[game + 'Boot']();
        });
        opt.addEventListener('mouseenter', function () {
          if (window.ARCANA_VIZ) window.ARCANA_VIZ.flash(null, '\u2736', 0xe3c78a);
          if (label && !shell.reduced) {
            label.style.textShadow = '0 0 12px rgba(140,200,95,0.9), 0 0 24px rgba(121,218,200,0.5)';
            setTimeout(function () { label.style.textShadow = ''; }, 450);
          }
        });
      })(opts[i], i);
    }
  }

  // ── resize ───────────────────────────────────────────────────────────
  window.addEventListener('resize', function () {
    if (window.ARCANA_VIZ) window.ARCANA_VIZ.resize();
  });

  // ── boot ─────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    buildWall();
    waveTitle();
    runBootLog();

    // Pixi first; DOM kitten only if the field is flat
    var field = el('arc-field');
    if (window.ARCANA_VIZ && field) {
      window.ARCANA_VIZ.mount(field);
      setTimeout(function () {
        if (!window.ARCANA_VIZ.ready) startKittyFallback();
      }, 900);
    } else {
      startKittyFallback();
    }

    WM.register('arc-win-menu', {});
    WM.register('arc-win-studies', {});
    WM.register('arc-win-read', {
      onClose: function () {
        // closing the reading closes its scene: the stage belongs to the pane
        if (window.ARCANA_VIZ && window.ARCANA_VIZ.endScene) window.ARCANA_VIZ.endScene(0);
      }
    });
    WM.register('arc-win-work', {});
    renderStudies();
    wireMenu();
    wireKeep();
    // windows rise like cards laid down
    if (!shell.reduced) {
      ['arc-win-menu', 'arc-win-studies', 'arc-win-read', 'arc-win-work'].forEach(function (id) {
        var w = el(id);
        if (!w) return;
        new MutationObserver(function () {
          if (!w.hidden) { w.style.animation = 'none'; void w.offsetWidth; w.style.animation = 'arc-rise .35s ease-out'; }
        }).observe(w, { attributes: true, attributeFilter: ['hidden'] });
      });
    }

    var stBtn = el('arc-studies-btn');
    if (stBtn) stBtn.addEventListener('click', function () { WM.open('arc-win-studies'); });
    var exit = el('arc-exit');
    if (exit) exit.addEventListener('click', function () {
      if (history.length > 1) history.back(); else location.href = 'desktop.html';
    });
    var newS = el('arc-new');
    if (newS) newS.addEventListener('click', function () {
      WM.closeAll();
      WM.open('arc-win-menu');
    });
  });

  window.ARCANA_SHELL = shell;
})();
