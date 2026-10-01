// carvings.js — render the 12 carvings around the bezel
// Inline SVG paths, one per visitor. Position is set by CSS in
// styles/bezel.css.

(function () {
  'use strict';

  // Each carving is a small inline SVG glyph. Designed to read as a
  // sketchy etching at 22px. Paths are kept simple so they read at
  // small size.
  const GLYPHS = {
    'stone':      '<path d="M3 14 L10 3 L17 14 L10 17 Z M6 12 L10 8 L14 12 Z" stroke-linejoin="round" fill="none" stroke-width="1.4"/>',
    'thread':     '<path d="M3 7 C7 4, 13 4, 17 7 M3 11 C7 8, 13 8, 17 11 M3 15 C7 12, 13 12, 17 15" stroke-width="1.2" fill="none"/>',
    'candle':     '<path d="M10 3 L10 6 M8 6 L12 6 L11.5 17 L8.5 17 Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/>',
    'bell':       '<path d="M5 14 L15 14 L13.5 5 L6.5 5 Z M10 17 L10 14" fill="currentColor" fill-opacity="0.3" stroke-width="1.2" stroke-linejoin="round"/>',
    'glyph':      '<path d="M10 3 L10 17 M3 10 L17 10 M5 5 L15 15 M15 5 L5 15" stroke-width="1.4" fill="none"/>',
    'bulb':       '<path d="M10 3 a5 5 0 0 1 5 5 c0 3 -2 4 -2 7 l-6 0 c0 -3 -2 -4 -2 -7 a5 5 0 0 1 5 -5 Z M8 15 L12 15 M9 17 L11 17" fill="currentColor" fill-opacity="0.3" stroke-width="1.2" stroke-linejoin="round"/>',
    'tower-rev':  '<path d="M5 17 L15 17 L13 14 L11 14 L11 8 L13 8 L11 5 L9 8 L11 8 L11 14 L9 14 Z M3 17 L17 17" fill="currentColor" fill-opacity="0.3" stroke-width="1.2" stroke-linejoin="round"/>',
    'hole-punch': '<path d="M10 3 L17 10 L10 17 L3 10 Z M7 10 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" stroke-width="1.2" fill="none"/>',
    'nib':        '<path d="M10 3 L14 10 L10 17 L6 10 Z M10 10 L10 17" fill="currentColor" fill-opacity="0.3" stroke-width="1.2" stroke-linejoin="round"/>',
    'compass':    '<path d="M10 3 a7 7 0 1 0 0.01 0 Z M10 3 L12 10 L10 17 L8 10 Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/>',
    'grate':      '<path d="M3 5 L17 5 M3 9 L17 9 M3 13 L17 13 M3 17 L17 17" stroke-width="1.4" fill="none"/>',
    'hook':       '<path d="M14 4 a4 4 0 0 1 -4 4 L6 12 L3 15 M6 12 L9 12" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
  };

  const ORDER = [
    'stone', 'thread', 'candle', 'bell',
    'glyph', 'bulb', 'tower-rev', 'hole-punch',
    'nib', 'compass', 'grate', 'hook',
  ];

  // Theme id → carving id, in bezel arrival order. Apps without a shipped
  // theme (learn/hole-punch, relation/grate) and non-traveller skins
  // (corrupted, wanderlust) never glow.
  const THEME_TO_CARVING = {
    physius:   'stone',
    librarian: 'thread',
    vanir:     'candle',
    elizabeth: 'bell',
    entity404: 'glyph',
    whimsy:    'bulb',
    arcana:    'tower-rev',
    raison:    'nib',
    iris:      'compass',
    ravaging:  'hook',
  };

  function setActive(theme) {
    const container = document.querySelector('.carvings');
    if (!container) return;
    const target = THEME_TO_CARVING[theme] || null;
    const carvings = container.querySelectorAll('.carving');
    carvings.forEach(function (c) {
      c.classList.toggle('active', !!target && c.dataset.id === target);
    });
  }

  function init() {
    const container = document.querySelector('.carvings');
    if (!container) return;
    container.innerHTML = '';
    for (const id of ORDER) {
      const c = document.createElement('div');
      c.className = 'carving';
      c.dataset.id = id;
      c.title = id;
      c.innerHTML = `<svg viewBox="0 0 20 20" aria-label="${id}">${GLYPHS[id] || ''}</svg>`;
      container.appendChild(c);
    }
    const s = window.Liber && window.Liber.state ? window.Liber.state.get() : null;
    setActive(s ? (s.theme || 'corrupted') : 'corrupted');
  }

  window.Liber = window.Liber || {};
  window.Liber.carvings = { setActive: setActive };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
