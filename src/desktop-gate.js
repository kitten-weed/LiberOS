// desktop-gate.js — the honest "made for a desk" gate.
// The machine shell is a fixed ~1280x860 composition; on a phone it renders
// as a tiny monitor in a void. Rather than a broken reflow (or pretending a
// breakpoint fixes twelve authored rooms), small screens get this card: the
// truth, in the house palette, with a way through for the stubborn.
// Session-only dismissal — a fresh visit is asked again. Vanilla IIFE,
// file://-safe, loads in <head> and builds on DOMContentLoaded.
(function () {
  'use strict';

  // Frames never gate: the top-level page owns the small-screen decision.
  // (The sigil shell and desktop rug embed rooms as iframes; a gate inside
  // the frame would double-gate and trap workshops behind a card.)
  if (window.top !== window) return;

  var KEY = 'liber_vacui_gate';
  // narrow width OR short landscape: both crush the composition
  var QUERY = '(max-width: 899px), (max-height: 599px)';
  var el = null;
  var dismissed = false;
  try { dismissed = sessionStorage.getItem(KEY) === '1'; } catch (e) { /* private mode */ }

  var CSS = ''
    + '.desktop-gate{position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;'
    + 'background:radial-gradient(120% 90% at 50% 8%, #160b08 0%, #070403 62%);padding:24px;}'
    + '.desktop-gate-card{max-width:420px;text-align:center;color:#eadfc6;'
    + 'font-family:Georgia,"Times New Roman",serif;}'
    + '.desktop-gate-mark{font:700 0.62rem/1 "Courier New",monospace;letter-spacing:0.42em;'
    + 'color:#d4af65;margin-bottom:26px;}'
    + '.desktop-gate-card h1{margin:0 0 14px;font:400 1.7rem/1.25 Georgia,serif;letter-spacing:0.04em;color:#f4ead2;}'
    + '.desktop-gate-card p{margin:10px 0;font:1.02rem/1.65 Georgia,serif;color:#cbbd9c;}'
    + '.desktop-gate-enter{margin-top:26px;padding:12px 26px;background:transparent;'
    + 'border:1px solid #d4af65;color:#d4af65;font:700 0.72rem/1 "Courier New",monospace;'
    + 'letter-spacing:0.18em;text-transform:uppercase;cursor:pointer;min-height:44px;min-width:44px;}'
    + '.desktop-gate-enter:hover{background:rgba(212,175,101,0.12);}'
    + '.desktop-gate-enter:focus-visible{outline:2px solid #d4af65;outline-offset:3px;}';

  function matches() {
    return !!(window.matchMedia && window.matchMedia(QUERY).matches);
  }

  function build() {
    if (el || dismissed || !matches()) return;
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
    el = document.createElement('div');
    el.className = 'desktop-gate';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'made for a desk');
    el.innerHTML = '<div class="desktop-gate-card">'
      + '<div class="desktop-gate-mark">LIBER · VACUI</div>'
      + '<h1>made for a desk</h1>'
      + '<p>this room is composed for a large screen — a monitor with room to breathe. a phone would cramp it out of shape.</p>'
      + '<p>come back on a desktop, or a tablet stood upright and generous with its height.</p>'
      + '<button type="button" class="desktop-gate-enter">look anyway</button>'
      + '</div>';
    document.body.appendChild(el);
    var btn = el.querySelector('button');
    btn.addEventListener('click', dismiss);
    try { btn.focus(); } catch (e) {}
  }

  function dismiss() {
    dismissed = true;
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* private mode */ }
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = null;
  }

  function onGateChange() {
    if (el && !matches()) { // grew into a real window mid-visit: un-gate
      if (el.parentNode) el.parentNode.removeChild(el);
      el = null;
      return;
    }
    build();
  }

  function init() {
    build();
    var mql = window.matchMedia(QUERY);
    if (mql.addEventListener) mql.addEventListener('change', onGateChange);
    else if (mql.addListener) mql.addListener(onGateChange); // older Safari
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
