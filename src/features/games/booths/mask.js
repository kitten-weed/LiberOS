// mask.js — "communication mask", Whimsy Wow's midway.
//
// The authored payload is unchanged: one face, two truths — the left half is
// what you FEEL, the right half is what you SHOW. What changed is the grammar.
// Freeform brushwork asked the visitor to be a painter and gave them a stub;
// this is an identikit. The blank is stamped tin and the features arrive as
// numbered plates that slide in and out of three slots per half. You set a
// brow, an eye and a mouth on each side, and the two sides are allowed to
// disagree — the disagreement is the whole attraction, and it reads at a
// glance, which a smear of enamel never did.

var MASK_SLOTS = [
  { id: 'brow', row: 108, label: 'brow' },
  { id: 'eye', row: 154, label: 'eye' },
  { id: 'mouth', row: 234, label: 'mouth' }
];

// Plate sets. `n` is the count stamped into each slot's run; the drawing
// functions take the half's centre and a direction so one plate mirrors
// correctly into either side of the seam.
var MASK_PLATES = {
  brow: [
    { name: 'level', d: function (cx, cy) { return 'M' + (cx - 34) + ' ' + cy + ' L' + (cx + 34) + ' ' + cy; } },
    { name: 'raised', d: function (cx, cy) { return 'M' + (cx - 34) + ' ' + (cy + 7) + ' Q' + cx + ' ' + (cy - 13) + ' ' + (cx + 34) + ' ' + (cy + 1); } },
    { name: 'furrowed', d: function (cx, cy, dir) { return 'M' + (cx - 34 * dir) + ' ' + (cy - 7) + ' Q' + cx + ' ' + (cy + 9) + ' ' + (cx + 34 * dir) + ' ' + (cy + 4); } },
    { name: 'outer lifted', d: function (cx, cy, dir) { return 'M' + (cx - 34 * dir) + ' ' + (cy + 5) + ' Q' + cx + ' ' + (cy + 3) + ' ' + (cx + 34 * dir) + ' ' + (cy - 10); } },
    { name: 'heavy', d: function (cx, cy) { return 'M' + (cx - 34) + ' ' + (cy - 3) + ' L' + (cx + 34) + ' ' + (cy - 3) + ' M' + (cx - 30) + ' ' + (cy + 5) + ' L' + (cx + 28) + ' ' + (cy + 5); } }
  ],
  eye: [
    { name: 'open', shapes: function (cx, cy) { return ellipse(cx, cy, 24, 15) + dot(cx, cy, 5.5); } },
    { name: 'narrowed', shapes: function (cx, cy) { return lens(cx, cy, 25, 8) + dot(cx, cy + 1, 4.5); } },
    { name: 'wide', shapes: function (cx, cy) { return ellipse(cx, cy, 26, 20) + dot(cx, cy, 4) + ellipse(cx, cy, 13, 11); } },
    { name: 'closed', shapes: function (cx, cy) { return path('M' + (cx - 24) + ' ' + cy + ' Q' + cx + ' ' + (cy + 9) + ' ' + (cx + 24) + ' ' + cy) + path('M' + (cx - 14) + ' ' + (cy + 7) + ' l-3 6 M' + cx + ' ' + (cy + 9) + ' l0 6 M' + (cx + 14) + ' ' + (cy + 7) + ' l3 6', 'mask-hair'); } },
    { name: 'averted', shapes: function (cx, cy, dir) { return ellipse(cx, cy, 24, 15) + dot(cx + 9 * dir, cy, 5.5); } }
  ],
  mouth: [
    { name: 'flat', shapes: function (cx, cy, dir) { return path('M150 ' + cy + ' L' + (150 + 46 * dir) + ' ' + cy); } },
    { name: 'smile', shapes: function (cx, cy, dir) { return path('M150 ' + (cy + 4) + ' Q' + (150 + 26 * dir) + ' ' + (cy + 14) + ' ' + (150 + 46 * dir) + ' ' + (cy - 7)); } },
    { name: 'pressed', shapes: function (cx, cy, dir) { return path('M150 ' + cy + ' Q' + (150 + 26 * dir) + ' ' + (cy + 5) + ' ' + (150 + 44 * dir) + ' ' + (cy + 1)) + path('M' + (150 + 44 * dir) + ' ' + (cy - 6) + ' l0 12', 'mask-hair'); } },
    { name: 'open', shapes: function (cx, cy, dir) { return path('M150 ' + (cy - 11) + ' Q' + (150 + 40 * dir) + ' ' + (cy - 9) + ' ' + (150 + 40 * dir) + ' ' + cy + ' Q' + (150 + 38 * dir) + ' ' + (cy + 15) + ' 150 ' + (cy + 15) + ' Z', 'mask-hole'); } },
    { name: 'turned down', shapes: function (cx, cy, dir) { return path('M150 ' + (cy - 5) + ' Q' + (150 + 26 * dir) + ' ' + (cy - 9) + ' ' + (150 + 46 * dir) + ' ' + (cy + 11)); } }
  ]
};

function path(d, cls) { return '<path class="' + (cls || 'mask-form') + '" d="' + d + '" fill="none"/>'; }
function ellipse(cx, cy, rx, ry) { return '<ellipse class="mask-form" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="none"/>'; }
function lens(cx, cy, rx, ry) {
  return '<path class="mask-form" fill="none" d="M' + (cx - rx) + ' ' + cy + ' Q' + cx + ' ' + (cy - ry) + ' ' + (cx + rx) + ' ' + cy
    + ' Q' + cx + ' ' + (cy + ry) + ' ' + (cx - rx) + ' ' + cy + ' Z"/>';
}
function dot(cx, cy, r) { return '<circle class="mask-pupil" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>'; }

function playMask(ctx, b, body) {
  // plate index per side per slot; -1 is an empty slot, and an empty slot is
  // a legitimate answer the booth does not nag about
  var set = { feel: { brow: -1, eye: -1, mouth: -1 }, show: { brow: -1, eye: -1, mouth: -1 } };
  var touched = 0;

  body.innerHTML = ''
    + '<div class="mask-booth">'
    + '<div class="mask-apparatus">'
    + '<span class="mask-issue" aria-hidden="true">IDENTIKIT SET Nº6 · PLATES 1–5 PER SLOT'
    + '<small>ONE FACE PER VISITOR · PLATES ARE NOT PRIZES</small></span>'
    + '<div class="mask-blank" id="mask-blank"></div>'
    + '<span class="mask-half mask-half-feel" aria-hidden="true">FEEL</span>'
    + '<span class="mask-half mask-half-show" aria-hidden="true">SHOW</span>'
    + '</div>'
    + '<div class="mask-slots" id="mask-slots"></div>'
    + '<div class="mask-read" id="mask-read" role="status" aria-live="polite">six slots empty.</div>'
    + '<div class="games-actions">'
    + '<button type="button" class="games-action" id="mask-clear">strip the plates</button>'
    + '<button type="button" class="games-action" id="mask-keep" disabled>keep it</button>'
    + '</div>'
    + '<div class="games-result" id="mask-result"></div>'
    + '</div>';

  var blank = document.getElementById('mask-blank');
  var slotBar = document.getElementById('mask-slots');
  var read = document.getElementById('mask-read');
  var keepBtn = document.getElementById('mask-keep');
  var clearBtn = document.getElementById('mask-clear');
  var result = document.getElementById('mask-result');

  function featureSvg(slot, side) {
    var idx = set[side][slot.id];
    if (idx < 0) return '';
    var plate = MASK_PLATES[slot.id][idx];
    var cx = side === 'feel' ? 104 : 196;
    var dir = side === 'feel' ? -1 : 1;
    if (plate.d) return path(plate.d(cx, slot.row, dir), 'mask-form');
    return plate.shapes(cx, slot.row, dir);
  }

  function paintBlank() {
    var s = ''
      + '<svg class="mask-tin" viewBox="34 20 232 322" role="img" aria-label="stamped tin mask, three plate slots each half">'
      + '<defs>'
      + '<filter id="mask-contact" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="8"/></filter>'
      + '<linearGradient id="mask-plate" x1="0.1" y1="0" x2="0.9" y2="1">'
      + '<stop offset="0" stop-color="#c0b291"/><stop offset="0.38" stop-color="#9a8d72"/>'
      + '<stop offset="0.72" stop-color="#6b6151"/><stop offset="1" stop-color="#473f33"/></linearGradient>'
      + '<linearGradient id="mask-gleam" x1="0" y1="0" x2="0.7" y2="1">'
      + '<stop offset="0" stop-color="#fff4d6" stop-opacity="0.46"/>'
      + '<stop offset="0.4" stop-color="#fff4d6" stop-opacity="0"/></linearGradient>'
      + '<clipPath id="mask-oval"><ellipse cx="150" cy="168" rx="106" ry="140"/></clipPath>'
      + '</defs>'
      // nothing floats: contact shadow under the stand, cast away from the bulbs
      + '<ellipse cx="160" cy="336" rx="62" ry="8.5" fill="#120609" opacity="0.7" filter="url(#mask-contact)"/>'
      + '<rect x="143" y="300" width="14" height="34" rx="5" fill="#63451f"/>'
      + '<rect x="143" y="300" width="5" height="34" rx="2" fill="#8a6631" opacity="0.75"/>'
      + '<g clip-path="url(#mask-oval)">'
      + '<ellipse cx="150" cy="168" rx="106" ry="140" fill="url(#mask-plate)"/>'
      // the press marks the tin carries whether or not a plate is in
      + '<g class="mask-press" aria-hidden="true">'
      + '<line x1="150" y1="34" x2="150" y2="306"/>'
      + '<path d="M150 168 l-10 46 q10 8 20 0" fill="none"/>'
      + '</g>'
      // one warm bulb upper-left: a single gleam on the lit flank only
      + '<path d="M54 56 q62 -32 132 -20 q-72 26 -106 116 q-26 -46 -26 -96 Z" fill="url(#mask-gleam)" aria-hidden="true"/>'
      + '</g>'
      + '<ellipse class="mask-rim" cx="150" cy="168" rx="106" ry="140" fill="none"/>'
      // a tell: struck once, hammered back, never quite true again
      + '<path class="mask-dent" d="M243 224 q-14 17 -5 36" fill="none"/>';

    for (var i = 0; i < MASK_SLOTS.length; i++) {
      s += featureSvg(MASK_SLOTS[i], 'feel');
      s += featureSvg(MASK_SLOTS[i], 'show');
    }
    s += '<text class="mask-stamp" x="150" y="284" text-anchor="middle">BLANK Nº6 · SET OF SIX · TWO MISSING</text>'
      + '</svg>';
    if (blank) blank.innerHTML = s;
  }

  function describe() {
    if (!read) return;
    var same = 0, both = 0, empty = 0;
    for (var i = 0; i < MASK_SLOTS.length; i++) {
      var id = MASK_SLOTS[i].id;
      var f = set.feel[id], sh = set.show[id];
      if (f < 0 || sh < 0) { empty++; continue; }
      both++;
      if (f === sh) same++;
    }
    if (!touched) { read.textContent = 'six slots empty.'; return; }
    if (!both) { read.textContent = 'plates in one half only — the other side is still blank tin.'; return; }
    var differ = both - same;
    read.textContent = both + ' pair' + (both === 1 ? '' : 's') + ' set — '
      + (differ === 0 ? 'both halves stamped the same.' : differ + ' of them stamped differently.')
      + (empty ? ' ' + empty + ' slot' + (empty === 1 ? '' : 's') + ' left open.' : '');
  }

  function buildSlots() {
    if (!slotBar) return;
    slotBar.innerHTML = '';
    ['feel', 'show'].forEach(function (side) {
      var col = document.createElement('div');
      col.className = 'mask-slot-col';
      col.setAttribute('data-side', side);
      col.innerHTML = '<span class="mask-slot-head" aria-hidden="true">' + (side === 'feel' ? 'INSIDE' : 'OUTSIDE') + '</span>';
      MASK_SLOTS.forEach(function (slot) {
        var run = MASK_PLATES[slot.id];
        var row = document.createElement('div');
        row.className = 'mask-slot';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mask-plate-btn';
        btn.setAttribute('data-slot', slot.id);
        function sync() {
          var idx = set[side][slot.id];
          var plate = idx < 0 ? null : run[idx];
          btn.innerHTML = '<span class="mask-plate-slot" aria-hidden="true">' + slot.label + '</span>'
            + '<span class="mask-plate-no" aria-hidden="true">' + (idx < 0 ? '—' : String(idx + 1)) + '</span>';
          btn.setAttribute('aria-label', (side === 'feel' ? 'inside' : 'outside') + ' ' + slot.label
            + ': ' + (plate ? plate.name : 'no plate') + '. next plate');
          btn.classList.toggle('empty', idx < 0);
        }
        btn.addEventListener('click', function () {
          var idx = set[side][slot.id];
          // the run cycles back through empty, so a slot can be re-opened
          set[side][slot.id] = idx + 1 >= run.length ? -1 : idx + 1;
          if (set[side][slot.id] >= 0) touched++;
          sync();
          paintBlank();
          describe();
          ctx.thunk();
          if (keepBtn) keepBtn.disabled = !anyPlate();
        });
        sync();
        row.appendChild(btn);
        col.appendChild(row);
      });
      slotBar.appendChild(col);
    });
  }

  function anyPlate() {
    for (var i = 0; i < MASK_SLOTS.length; i++) {
      if (set.feel[MASK_SLOTS[i].id] >= 0 || set.show[MASK_SLOTS[i].id] >= 0) return true;
    }
    return false;
  }

  if (clearBtn) clearBtn.addEventListener('click', function () {
    set = { feel: { brow: -1, eye: -1, mouth: -1 }, show: { brow: -1, eye: -1, mouth: -1 } };
    touched = 0;
    buildSlots();
    paintBlank();
    describe();
    ctx.thunk();
    if (keepBtn) keepBtn.disabled = true;
    if (result) result.textContent = '';
  });

  function maskShot() {
    try {
      var svg = body.querySelector('.mask-tin');
      if (!svg) return null;
      var c = document.createElement('canvas');
      c.width = 140; c.height = 164;
      var g = c.getContext('2d');
      g.fillStyle = '#150e0b';
      g.fillRect(0, 0, 140, 164);
      g.save();
      g.beginPath();
      g.ellipse(70, 78, 49, 65, 0, 0, Math.PI * 2);
      g.clip();
      var grd = g.createLinearGradient(21, 13, 119, 143);
      grd.addColorStop(0, '#a49a86');
      grd.addColorStop(0.7, '#5f584c');
      grd.addColorStop(1, '#413c34');
      g.fillStyle = grd;
      g.fillRect(21, 13, 98, 130);
      g.restore();
      g.strokeStyle = '#efe3c8';
      g.lineWidth = 2.4;
      g.beginPath();
      g.ellipse(70, 78, 49, 65, 0, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(70, 15); g.lineTo(70, 141);
      g.stroke();
      // the plates, as the stamped bars they are, so the keep reads at thumb size
      g.lineWidth = 2.6;
      g.strokeStyle = '#f2e6c8';
      MASK_SLOTS.forEach(function (slot, i) {
        var y = 40 + i * 30;
        [['feel', 48], ['show', 92]].forEach(function (pair) {
          if (set[pair[0]][slot.id] < 0) return;
          var lift = (set[pair[0]][slot.id] - 2) * 3;
          g.beginPath();
          g.moveTo(pair[1] - 15, y + lift);
          g.lineTo(pair[1] + 15, y - lift);
          g.stroke();
        });
      });
      return c.toDataURL('image/jpeg', 0.74);
    } catch (e) { return null; }
  }

  if (keepBtn) keepBtn.addEventListener('click', function () {
    if (!anyPlate()) return;
    var pairs = 0, differ = 0, parts = [];
    MASK_SLOTS.forEach(function (slot) {
      var f = set.feel[slot.id], sh = set.show[slot.id];
      var fn = f < 0 ? '—' : MASK_PLATES[slot.id][f].name;
      var sn = sh < 0 ? '—' : MASK_PLATES[slot.id][sh].name;
      if (f >= 0 && sh >= 0) { pairs++; if (f !== sh) differ++; }
      parts.push(slot.label + ' ' + fn + '/' + sn);
    });
    var summary = 'result: ' + parts.join('; ') + '. '
      + (pairs === 0 ? 'one half only.' : differ + ' of ' + pairs + ' stamped differently inside and out.');
    ctx.promptSave(b, summary, function () {
      ctx.saveToDesktopAndJournal(b, { feel: set.feel, show: set.show, pairs: pairs, differ: differ }, maskShot());
      if (result) result.textContent = 'kept. the tent remembers.';
    }, null);
  });

  buildSlots();
  paintBlank();
  describe();
}

window.LiberBooths = window.LiberBooths || {};
window.LiberBooths.mask = playMask;
