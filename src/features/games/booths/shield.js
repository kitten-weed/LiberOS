// shield.js — "boundaries shield", Whimsy Wow's midway.
//
// The authored payload is unchanged: four quarters, four boundaries — physical,
// emotional, time-related, mental. What changed is the grammar. Colouring a
// quarter in with a brush measured nothing; this is a strength tester. You drag
// a quarter's wall up from the boss and it rises in tin; let go and it settles
// back a notch, because walls sag. A quarter is a height you can read, compare
// and disagree with, and the settle is the booth telling the truth about upkeep.

var SHIELD_QUARTERS = [
  { id: 'physical', label: 'physical', corner: 'tl' },
  { id: 'emotional', label: 'emotional', corner: 'tr' },
  { id: 'time', label: 'time-related', corner: 'bl' },
  { id: 'mental', label: 'mental', corner: 'br' }
];

var SHIELD_MAX = 100;
var SHIELD_SETTLE = 6;      // the notch a released wall gives back
var SHIELD_RED_LINE = 86;   // the line the stall does not pay out above

function playShield(ctx, b, body) {
  var level = { physical: 0, emotional: 0, time: 0, mental: 0 };
  var touched = {};

  body.innerHTML = ''
    + '<div class="shield-booth">'
    + '<div class="shield-apparatus">'
    + '<span class="shield-issue" aria-hidden="true">WALL GAUGE Nº4 · FOUR QUARTERS'
    + '<small>NO PRIZE ABOVE THE RED LINE · GAUGE LAST TRUED 14/iii</small></span>'
    + '<div class="shield-plate" id="shield-plate"></div>'
    + '</div>'
    + '<div class="shield-levers" id="shield-levers"></div>'
    + '<div class="shield-read" id="shield-read" role="status" aria-live="polite">four quarters flat.</div>'
    + '<div class="games-actions">'
    + '<button type="button" class="games-action" id="shield-drop">drop them all</button>'
    + '<button type="button" class="games-action" id="shield-keep" disabled>keep it</button>'
    + '</div>'
    + '<div class="games-result" id="shield-result"></div>'
    + '</div>';

  var plate = document.getElementById('shield-plate');
  var levers = document.getElementById('shield-levers');
  var read = document.getElementById('shield-read');
  var keepBtn = document.getElementById('shield-keep');
  var dropBtn = document.getElementById('shield-drop');
  var result = document.getElementById('shield-result');

  // Each quarter is a 90-degree wedge grown from the boss and clipped to the
  // shield's own silhouette, so a raised wall takes the shield's edge instead
  // of ending in a square corner. Rectangles read as a bar chart; a wedge that
  // meets the rim reads as tin.
  var QUAD = {
    tl: { a0: Math.PI, a1: Math.PI * 1.5 },
    tr: { a0: Math.PI * 1.5, a1: Math.PI * 2 },
    br: { a0: 0, a1: Math.PI * 0.5 },
    bl: { a0: Math.PI * 0.5, a1: Math.PI }
  };
  var BOSS = { x: 150, y: 162 };
  var REACH = 172;   // clears the farthest corner, so 100 fills the quarter

  function wedge(corner, frac) {
    var g = QUAD[corner];
    var r = REACH * frac;
    var x0 = BOSS.x + r * Math.cos(g.a0), y0 = BOSS.y + r * Math.sin(g.a0);
    var x1 = BOSS.x + r * Math.cos(g.a1), y1 = BOSS.y + r * Math.sin(g.a1);
    return 'M' + BOSS.x + ' ' + BOSS.y + ' L' + x0.toFixed(1) + ' ' + y0.toFixed(1)
      + ' A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Z';
  }

  function crest(corner, frac) {
    var g = QUAD[corner];
    var r = REACH * frac;
    var x0 = BOSS.x + r * Math.cos(g.a0), y0 = BOSS.y + r * Math.sin(g.a0);
    var x1 = BOSS.x + r * Math.cos(g.a1), y1 = BOSS.y + r * Math.sin(g.a1);
    return 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1)
      + ' A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
  }

  function paintPlate() {
    var s = ''
      + '<svg class="shield-tin" viewBox="28 12 244 310" role="img" aria-label="four-quarter tin wall gauge">'
      + '<defs>'
      + '<filter id="shield-contact" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="7.5"/></filter>'
      + '<clipPath id="shield-body"><path d="M150 22 L262 66 L262 178 Q262 264 150 306 Q38 264 38 178 L38 66 Z"/></clipPath>'
      + '<linearGradient id="shield-bare" x1="0.1" y1="0" x2="0.9" y2="1">'
      + '<stop offset="0" stop-color="#c0b291"/><stop offset="0.42" stop-color="#877b64"/>'
      + '<stop offset="1" stop-color="#473f33"/></linearGradient>'
      + '<linearGradient id="shield-fill" x1="0" y1="1" x2="0" y2="0">'
      + '<stop offset="0" stop-color="#d8a648"/><stop offset="1" stop-color="#f0d68a"/></linearGradient>'
      + '<linearGradient id="shield-gleam" x1="0" y1="0" x2="0.7" y2="1">'
      + '<stop offset="0" stop-color="#fff4d6" stop-opacity="0.4"/>'
      + '<stop offset="0.45" stop-color="#fff4d6" stop-opacity="0"/></linearGradient>'
      + '</defs>'
      + '<ellipse cx="158" cy="318" rx="74" ry="9" fill="#120609" opacity="0.66" filter="url(#shield-contact)"/>'
      + '<g clip-path="url(#shield-body)">'
      + '<path d="M150 22 L262 66 L262 178 Q262 264 150 306 Q38 264 38 178 L38 66 Z" fill="url(#shield-bare)"/>';

    // each quarter's raised wall, grown from the boss and cut by the rim
    SHIELD_QUARTERS.forEach(function (q) {
      var frac = level[q.id] / SHIELD_MAX;
      if (frac <= 0.004) return;
      s += '<path class="shield-wall" data-q="' + q.id + '" d="' + wedge(q.corner, frac)
        + '" fill="url(#shield-fill)" opacity="0.94"/>';
      s += '<path class="shield-crest" fill="none" d="' + crest(q.corner, frac) + '"/>';
    });

    s += '<g class="shield-seam" aria-hidden="true">'
      + '<line x1="150" y1="22" x2="150" y2="306"/>'
      + '<line x1="38" y1="162" x2="262" y2="162"/>'
      + '</g>'
      // the red line the sign refers to
      + '<circle class="shield-redline" cx="150" cy="162" r="' + (REACH * SHIELD_RED_LINE / SHIELD_MAX).toFixed(1) + '" fill="none"/>'
      + '<path d="M52 44 q66 -26 132 -14 q-74 26 -104 112 q-28 -44 -28 -98 Z" fill="url(#shield-gleam)" aria-hidden="true"/>'
      + '</g>'
      + '<path class="shield-rim" fill="none" d="M150 22 L262 66 L262 178 Q262 264 150 306 Q38 264 38 178 L38 66 Z"/>'
      // the boss, and the dent beside it from being struck
      + '<circle class="shield-boss" cx="150" cy="162" r="13"/>'
      + '<path class="shield-dent" fill="none" d="M232 206 q-13 15 -4 32"/>'
      + '<text class="shield-stamp" x="150" y="290" text-anchor="middle">GAUGE Nº4 · REV. B</text>'
      + '</svg>';
    if (plate) plate.innerHTML = s;
  }

  function describe() {
    if (!read) return;
    var keys = Object.keys(touched);
    if (!keys.length) { read.textContent = 'four quarters flat.'; return; }
    var lowest = null, highest = null;
    SHIELD_QUARTERS.forEach(function (q) {
      if (lowest === null || level[q.id] < level[lowest]) lowest = q.id;
      if (highest === null || level[q.id] > level[highest]) highest = q.id;
    });
    var lo = SHIELD_QUARTERS.filter(function (q) { return q.id === lowest; })[0];
    var hi = SHIELD_QUARTERS.filter(function (q) { return q.id === highest; })[0];
    var over = SHIELD_QUARTERS.filter(function (q) { return level[q.id] > SHIELD_RED_LINE; });
    read.textContent = hi.label + ' stands highest at ' + level[highest] + '; ' + lo.label + ' lowest at ' + level[lowest] + '.'
      + (over.length ? ' ' + over.length + ' over the red line — no payout.' : '');
  }

  function buildLevers() {
    if (!levers) return;
    levers.innerHTML = '';
    SHIELD_QUARTERS.forEach(function (q) {
      var wrap = document.createElement('div');
      wrap.className = 'shield-lever';
      var slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = String(SHIELD_MAX);
      slider.value = '0';
      slider.step = '1';
      slider.className = 'shield-range';
      slider.setAttribute('aria-label', q.label + ' wall height');
      var cap = document.createElement('span');
      cap.className = 'shield-lever-cap';
      cap.innerHTML = '<b aria-hidden="true">' + q.label + '</b><i class="shield-lever-num" aria-hidden="true">0</i>';

      function apply(v, settle) {
        level[q.id] = Math.max(0, Math.min(SHIELD_MAX, v));
        slider.value = String(level[q.id]);
        cap.querySelector('.shield-lever-num').textContent = String(level[q.id]);
        wrap.classList.toggle('over', level[q.id] > SHIELD_RED_LINE);
        if (settle) {
          wrap.classList.remove('settling');
          void wrap.offsetWidth;
          wrap.classList.add('settling');
        }
        paintPlate();
        describe();
        if (keepBtn) keepBtn.disabled = !Object.keys(touched).length;
      }

      var held = false;
      slider.addEventListener('input', function () {
        touched[q.id] = true;
        held = true;
        apply(parseInt(slider.value, 10), false);
      });
      // a released wall gives a notch back: tin settles, upkeep is real
      function settle() {
        if (!held) return;      // change and pointerup both fire; take one
        held = false;
        if (!touched[q.id]) return;
        if (level[q.id] <= 0) return;
        apply(level[q.id] - SHIELD_SETTLE, true);
        ctx.thunk();
      }
      slider.addEventListener('change', settle);
      slider.addEventListener('pointerup', settle);

      wrap.appendChild(cap);
      wrap.appendChild(slider);
      levers.appendChild(wrap);
    });
  }

  if (dropBtn) dropBtn.addEventListener('click', function () {
    level = { physical: 0, emotional: 0, time: 0, mental: 0 };
    touched = {};
    buildLevers();
    paintPlate();
    describe();
    ctx.thunk();
    if (keepBtn) keepBtn.disabled = true;
    if (result) result.textContent = '';
  });

  function shieldShot() {
    try {
      var c = document.createElement('canvas');
      c.width = 150; c.height = 164;
      var g = c.getContext('2d');
      g.fillStyle = '#150e0b';
      g.fillRect(0, 0, 150, 164);
      var cx = 75, cy = 80;
      g.strokeStyle = '#6e6659';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx, 14); g.lineTo(131, 36); g.lineTo(131, 92);
      g.quadraticCurveTo(131, 134, cx, 154);
      g.quadraticCurveTo(19, 134, 19, 92); g.lineTo(19, 36);
      g.closePath();
      g.stroke();
      SHIELD_QUARTERS.forEach(function (q) {
        var frac = level[q.id] / SHIELD_MAX;
        if (frac <= 0) return;
        var w = 54 * frac, h = 62 * frac;
        var dx = (q.corner === 'tl' || q.corner === 'bl') ? -1 : 1;
        var dy = (q.corner === 'tl' || q.corner === 'tr') ? -1 : 1;
        var x = dx < 0 ? cx - w : cx;
        var y = dy < 0 ? cy - h : cy;
        var grd = g.createLinearGradient(0, y + h, 0, y);
        grd.addColorStop(0, '#d8a648');
        grd.addColorStop(1, '#f0d68a');
        g.fillStyle = grd;
        g.fillRect(x, y, w, h);
      });
      g.strokeStyle = '#efe3c8';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(cx, 14); g.lineTo(cx, 154);
      g.moveTo(19, cy); g.lineTo(131, cy);
      g.stroke();
      g.fillStyle = '#efe3c8';
      g.beginPath();
      g.arc(cx, cy, 6, 0, Math.PI * 2);
      g.fill();
      return c.toDataURL('image/jpeg', 0.74);
    } catch (e) { return null; }
  }

  if (keepBtn) keepBtn.addEventListener('click', function () {
    if (!Object.keys(touched).length) return;
    var parts = SHIELD_QUARTERS.map(function (q) { return q.label + ' ' + level[q.id]; });
    var over = SHIELD_QUARTERS.filter(function (q) { return level[q.id] > SHIELD_RED_LINE; }).length;
    var summary = 'result: ' + parts.join(', ') + ' out of ' + SHIELD_MAX + '.'
      + (over ? ' ' + over + ' over the red line.' : '');
    ctx.promptSave(b, summary, function () {
      ctx.saveToDesktopAndJournal(b, { levels: level, redLine: SHIELD_RED_LINE }, shieldShot());
      if (result) result.textContent = 'kept. the tent remembers.';
    }, null);
  });

  buildLevers();
  paintPlate();
  describe();
}

window.LiberBooths = window.LiberBooths || {};
window.LiberBooths.shield = playShield;
