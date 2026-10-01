// boot-gate.js — v1 (§8, §13): nothing opens before the boot warning.
// index.html owns the warning letter, the helplines, and the consent
// checkbox; every other surface bounces there before mounting anything
// that can speak. Storage failure fails CLOSED — an environment that cannot
// persist consent must not be treated as consented; the visitor is bounced
// to the boot page (which itself is exempt below, so no boot loop).
(function () {
  'use strict';
  var granted = null;
  try { granted = localStorage.getItem('liber_vacui_consent'); } catch (e) { granted = '0'; }
  if (granted) return; // consented: this page mounts normally

  // Ignore the gate on the boot page itself.
  var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (path === 'index.html' || path === '') return;

  // Stop the page before its controllers initialize. The boot page reads
  // `?from=` to explain itself; state stays untouched (no 'boot' write,
  // no residue), so Enter returns the visitor exactly where they were.
  window.stop();
  var target = path + (location.search || '');
  location.replace('index.html?gate=1&from=' + encodeURIComponent(target));
})();
