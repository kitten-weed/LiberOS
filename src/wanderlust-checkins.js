/* wanderlust-checkins.js — Wanderlust checks in as your keeps accumulate.
   Thresholds: 5, 10, 15 total artifacts across every store; one visit each,
   then never again. Copy lives in AI-AUTHORED-PROSE.md. Self-contained UI:
   a small pink chat bubble in the machine's lower-right, typewritten, clicks
   away. Desktop-only script. */
(function (global) {
  'use strict';

  var CHECKS = [
    { at: 5, text: 'Look at you, collecting already. Five keeps — five little pieces of you on the shelf. The poppet wears what you give it, so give carefully. Or don\u2019t. It likes surprises.' },
    { at: 10, text: 'Ten now. That\u2019s a whole constellation of you. Try relating a few \u2014 click a keep in the poppet\u2019s room and tell it what it carries. The poppet remembers who gave it what.' },
    { at: 15, text: 'Fifteen. The room is getting crowded, little buddy. When it feels like too much, some keeps can rest in the graveyard instead. Not everything you keep has to stay kept.' }
  ];

  var BUBBLE_CSS = ''
    + '.wl-checkin{position:fixed;right:26px;bottom:96px;z-index:960;width:min(360px,74%);'
    + 'background:linear-gradient(160deg,#2a0f24,#16060f);border:2px solid #ff69b4;color:#ffd7e6;'
    + 'box-shadow:0 0 0 4px rgba(255,105,180,.09),0 0 34px rgba(180,90,255,.4);padding:14px 18px;'
    + 'font:1rem/1.5 Georgia,serif;cursor:pointer;animation:wl-in .5s ease both;}'
    + '@keyframes wl-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'
    + '.wl-checkin b{display:block;font:700 .62rem/1 monospace;letter-spacing:.3em;color:#ff8ab8;margin-bottom:7px;}'
    + '.wl-checkin:hover{filter:brightness(1.12);}';
  var injected = false;
  function inject() {
    if (injected) return;
    var s = document.createElement('style');
    s.textContent = BUBBLE_CSS;
    document.head.appendChild(s);
    injected = true;
  }

  function st() { return global.Liber && global.Liber.state; }
  function snap() { return st() ? st().get() : {}; }

  var STORES = ['buddy', 'divination', 'games', 'sea', 'garden', 'dreams', 'journal', 'crossing', 'learn', 'abstract', 'methodology', 'council', 'graveyard'];
  function totalKeeps() {
    var s = snap(), n = 0;
    STORES.forEach(function (k) { if (Array.isArray(s[k])) n += s[k].length; });
    return n;
  }

  var busy = false;
  function check() {
    if (busy || !st() || document.hidden) return;
    var seen = snap().checkinsSeen || [];
    var count = totalKeeps();
    for (var i = 0; i < CHECKS.length; i++) {
      var c = CHECKS[i];
      if (count >= c.at && seen.indexOf(c.at) < 0) { deliver(c); return; }
    }
  }
  function deliver(c) {
    busy = true;
    inject();
    var b = document.createElement('div');
    b.className = 'wl-checkin';
    b.setAttribute('role', 'status');
    b.innerHTML = '<b>WANDERLUST</b><span class="wl-line"></span>';
    document.body.appendChild(b);
    var line = b.querySelector('.wl-line');
    var i = 0;
    var typer = setInterval(function () {
      if (i >= c.text.length) { clearInterval(typer); return; }
      line.textContent += c.text[i++];
    }, 24);
    var dismiss = function () {
      if (!b.parentNode) return;
      b.style.transition = 'opacity .4s ease, transform .4s ease';
      b.style.opacity = '0';
      b.style.transform = 'translateY(10px)';
      setTimeout(function () { if (b.parentNode) b.remove(); busy = false; }, 420);
    };
    b.addEventListener('click', dismiss);
    setTimeout(dismiss, 14000);
    var s = st();
    var seen = (snap().checkinsSeen || []).slice();
    seen.push(c.at);
    s.set({ checkinsSeen: seen });
  }

  function init() {
    if (!document.querySelector('.machine')) return;
    if (st() && st().on) st().on('change', function () { setTimeout(check, 900); });
    setTimeout(check, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
