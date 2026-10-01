// boot-title.js — the loading title typesets itself.
// "Liber Vacui" is hand-set: each glyph lands individually with a small
// press-sink and ink-spread, sequenced like a physical print run. When
// the last glyph settles, "Now Loading" arrives with the press thunk
// (src/sound.js's existing 'thunk' voice). Reduced motion: the title
// simply is, no printing.

(function () {
  'use strict';

  var LETTER_DELAY = 70;
  var LAND_MS = 320;

  function typeset() {
    var title = document.querySelector('.loading-title');
    if (!title) return;
    var text = title.textContent;
    title.textContent = '';
    title.setAttribute('aria-label', text);

    var letters = text.split('');
    letters.forEach(function (ch, i) {
      var span = document.createElement('span');
      span.className = 'letterpress-glyph';
      span.style.setProperty('--glyph-i', String(i));
      if (ch === ' ') {
        span.className += ' letterpress-space';
      } else {
        span.textContent = ch;
      }
      title.appendChild(span);
    });

    var landTotal = letters.length * LETTER_DELAY + LAND_MS;
    var now = document.querySelector('.loading-now');
    if (now) {
      now.classList.add('letterpress-arrives');
      now.style.setProperty('--arrive-delay', (landTotal + 60) + 'ms');
      setTimeout(function () {
        if (window.Liber && window.Liber.sound) {
          window.Liber.sound.play('thunk');
        }
      }, landTotal + 60);
    }
  }

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // reduced motion: the title is already set; no printing, no thunk
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', typeset);
  } else {
    typeset();
  }
})();
