/* app-tutorial.js — first-visit tutorials for each app, with ? replay.
   A short traveller-branded overlay appears the first time you enter a room;
   a small ? button in the corner replays it anytime. Copy lives in
   AI-AUTHORED-PROSE.md §2. Load on any app page and call
   AppTutorial.mount({ id, traveller, accent, lines }). */
(function (global) {
  'use strict';

  var CSS = ''
    + '.apptut-root{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;'
    + 'background:rgba(6,4,3,.68);backdrop-filter:blur(2px);animation:apptut-fade .4s ease both;}'
    + '@keyframes apptut-fade{from{opacity:0}to{opacity:1}}'
    + '.apptut-card{width:min(470px,86%);background:linear-gradient(170deg,#241a10,#140d06);'
    + 'border:2px solid var(--apptut-accent,#c9962e);border-radius:6px;padding:22px 26px 18px;color:#efe6cd;'
    + 'box-shadow:0 30px 80px rgba(0,0,0,.85);font-family:Georgia,serif;}'
    + '.apptut-card b.who{display:block;font:700 .66rem/1 "Courier New",monospace;letter-spacing:.3em;'
    + 'color:var(--apptut-accent,#c9962e);margin-bottom:12px;text-transform:uppercase;}'
    + '.apptut-card h2{margin:0 0 12px;font:400 1.2rem/1.3 Georgia,serif;letter-spacing:.08em;color:#f4ead2;}'
    + '.apptut-card p{margin:8px 0;font:1.02rem/1.6 Georgia,serif;color:#e2d5b4;}'
    + '.apptut-card .apptut-btns{display:flex;justify-content:flex-end;margin-top:16px;}'
    + '.apptut-card button{font:700 .74rem/1 "Courier New",monospace;letter-spacing:.16em;padding:10px 20px;'
    + 'background:transparent;border:1px solid var(--apptut-accent,#c9962e);color:var(--apptut-accent,#c9962e);cursor:pointer;}'
    + '.apptut-card button:hover{background:rgba(255,255,255,.07);}'
    + '.apptut-q{position:fixed;right:16px;bottom:16px;z-index:1190;width:34px;height:34px;border-radius:50%;'
    + 'background:rgba(20,14,8,.85);border:1px solid var(--apptut-accent,#c9962e);color:var(--apptut-accent,#c9962e);'
    + 'font:700 .95rem/1 Georgia,serif;cursor:pointer;opacity:.6;transition:opacity .2s ease;}'
    + '.apptut-q:hover{opacity:1;}';

  function st() { return global.Liber && global.Liber.state; }
  var seen = {};
  try {
    // JSON.parse(...|| '{}') only guards null/empty — a valid-JSON scalar like
    // '1' parses to a number and later property writes onto it throw. Guard
    // the shape, not the emptiness.
    var parsed = JSON.parse(localStorage.getItem('apptut.seen') || '{}');
    seen = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch (e) { seen = {}; }
  function markSeen(id) {
    seen[id] = Date.now();
    try { localStorage.setItem('apptut.seen', JSON.stringify(seen)); } catch (e) { /* full */ }
  }

  var injected = false;
  function inject() {
    if (injected) return;
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
    injected = true;
  }

  function show(cfg) {
    inject();
    var existing = document.querySelector('.apptut-root');
    if (existing) existing.remove();
    var root = document.createElement('div');
    root.className = 'apptut-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', cfg.title || 'how this room works');
    root.style.setProperty('--apptut-accent', cfg.accent || '#c9962e');
    root.innerHTML = '<div class="apptut-card">'
      + '<b class="who">' + (cfg.traveller || 'the room') + '</b>'
      + '<h2>' + cfg.title + '</h2>'
      + cfg.lines.map(function (l) { return '<p>' + l + '</p>'; }).join('')
      + '<div class="apptut-btns"><button type="button">GOT IT</button></div>'
      + '</div>';
    var close = function () {
      root.remove();
      document.removeEventListener('keydown', onKey);
    };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    root.querySelector('button').addEventListener('click', close);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    document.body.appendChild(root);
    markSeen(cfg.id);
  }

  function mount(cfg) {
    if (!cfg || !cfg.id || !cfg.lines) return;
    inject();
    if (!seen[cfg.id]) setTimeout(function () { show(cfg); }, 700);
    /* One '?' per room: adopt the page's native help button when the app
       authored one (games, dreams) instead of stacking a second floating
       '?' on top of it. Rooms without a native help control still get the
       floating one. */
    var native = cfg.helpButton && document.querySelector(cfg.helpButton);
    if (native) {
      native.addEventListener('click', function () { show(cfg); });
      return;
    }
    var q = document.createElement('button');
    q.type = 'button';
    q.className = 'apptut-q';
    q.textContent = '?';
    q.title = 'how this room works';
    q.addEventListener('click', function () { show(cfg); });
    document.body.appendChild(q);
  }

  global.AppTutorial = { mount: mount, show: show };
})(window);
