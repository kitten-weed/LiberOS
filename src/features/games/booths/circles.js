// circles.js — "relationship circles", Whimsy Wow's midway.
//
// The authored payload is unchanged: three rings — closest, friends, distant —
// and an honest seating chart, names where they actually belong rather than
// where they wish they belonged. What changed is the grammar. Three text fields
// beside a drawing of rings made the honesty abstract; here a name becomes a
// numbered tin tag you hang on the board, and you move it by dragging it. Taking
// someone out of the inner ring is a thing your hand does, which is the point.

var CIRCLES_RINGS = [
  { id: 'closest', label: 'closest', r: 60, cap: 4 },
  { id: 'friends', label: 'friends', r: 108, cap: 7 },
  { id: 'distant', label: 'distant', r: 156, cap: 10 }
];

function playCircles(ctx, b, body) {
  var tags = [];          // { id, name, ring, a (angle), no }
  var seq = 0;
  var dragging = null;

  body.innerHTML = ''
    + '<div class="circles-booth">'
    + '<div class="circles-apparatus">'
    + '<span class="circles-issue" aria-hidden="true">SEATING BOARD Nº2 · TAGS 1–21'
    + '<small>ONE TAG PER NAME · TAGS ARE NOT PRIZES · BOARD RE-PAINTED 9/xi</small></span>'
    + '<div class="circles-board" id="circles-board">'
    + '<svg class="circles-zinc" viewBox="0 0 360 360" aria-hidden="true">'
    + '<defs>'
    + '<radialGradient id="circles-pan" cx="0.38" cy="0.3" r="0.8">'
    + '<stop offset="0" stop-color="#7d7260"/><stop offset="0.55" stop-color="#575043"/>'
    + '<stop offset="1" stop-color="#332e27"/></radialGradient>'
    + '<filter id="circles-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6"/></filter>'
    + '</defs>'
    + '<circle cx="180" cy="180" r="172" fill="url(#circles-pan)"/>'
    + '<ellipse cx="186" cy="196" rx="150" ry="140" fill="#100a0c" opacity="0.34" filter="url(#circles-soft)"/>'
    + '<circle class="circles-ring" cx="180" cy="180" r="156" fill="none"/>'
    + '<circle class="circles-ring" cx="180" cy="180" r="108" fill="none"/>'
    + '<circle class="circles-ring" cx="180" cy="180" r="60" fill="none"/>'
    + '<circle class="circles-hub" cx="180" cy="180" r="15"/>'
    + '<text class="circles-ring-label" x="180" y="134" text-anchor="middle">CLOSEST</text>'
    + '<text class="circles-ring-label" x="180" y="84" text-anchor="middle">FRIENDS</text>'
    + '<text class="circles-ring-label" x="180" y="34" text-anchor="middle">DISTANT</text>'
    + '<path class="circles-scuff" fill="none" d="M262 250 q-16 20 -6 40"/>'
    + '<text class="circles-stamp" x="180" y="348" text-anchor="middle">BOARD Nº2 · PAINT LOT 41</text>'
    + '</svg>'
    + '<div class="circles-tags" id="circles-tags"></div>'
    + '</div>'
    + '</div>'
    + '<div class="circles-bench">'
    + '<label class="circles-write">'
    + '<span aria-hidden="true">NAME</span>'
    + '<input id="circles-name" maxlength="18" autocomplete="off" aria-label="name for a new tag"/>'
    + '</label>'
    + '<button type="button" class="games-action circles-hang" id="circles-hang">hang it</button>'
    + '</div>'
    + '<div class="circles-read" id="circles-read" role="status" aria-live="polite">the board is empty.</div>'
    + '<div class="games-actions">'
    + '<button type="button" class="games-action" id="circles-strip">take them down</button>'
    + '<button type="button" class="games-action" id="circles-keep" disabled>keep it</button>'
    + '</div>'
    + '<div class="games-result" id="circles-result"></div>'
    + '</div>';

  var board = document.getElementById('circles-board');
  var layer = document.getElementById('circles-tags');
  var nameInput = document.getElementById('circles-name');
  var hangBtn = document.getElementById('circles-hang');
  var stripBtn = document.getElementById('circles-strip');
  var keepBtn = document.getElementById('circles-keep');
  var read = document.getElementById('circles-read');
  var result = document.getElementById('circles-result');

  function ringOf(id) {
    for (var i = 0; i < CIRCLES_RINGS.length; i++) if (CIRCLES_RINGS[i].id === id) return CIRCLES_RINGS[i];
    return CIRCLES_RINGS[1];
  }

  // a tag sits at a radius inside its ring band, at its own angle, so the
  // board reads as hung rather than plotted
  function placeTag(t) {
    var ring = ringOf(t.ring);
    var inner = t.ring === 'closest' ? 0 : (t.ring === 'friends' ? 60 : 108);
    var rad = inner + (ring.r - inner) * 0.56;
    var x = 180 + rad * Math.cos(t.a);
    var y = 180 + rad * Math.sin(t.a);
    t.el.style.left = (x / 360 * 100) + '%';
    t.el.style.top = (y / 360 * 100) + '%';
  }

  // even spacing WITHIN each ring, recomputed on every change: a ring with two
  // tags puts them opposite, a ring with six spreads them at sixths. Dragging
  // chooses the ring; the board decides the seat, so nothing ever stacks.
  function relayout() {
    CIRCLES_RINGS.forEach(function (ring) {
      var inRing = tags.filter(function (t) { return t.ring === ring.id; });
      inRing.sort(function (x, y) { return x.no - y.no; });
      var lean = ring.id === 'friends' ? 0.38 : (ring.id === 'distant' ? 0.72 : 0);
      inRing.forEach(function (t, i) {
        t.a = (-Math.PI / 2) + lean + (i / Math.max(1, inRing.length)) * Math.PI * 2;
        placeTag(t);
      });
    });
  }

  function describe() {
    if (!read) return;
    if (!tags.length) { read.textContent = 'the board is empty.'; return; }
    var counts = {};
    CIRCLES_RINGS.forEach(function (r) { counts[r.id] = 0; });
    tags.forEach(function (t) { counts[t.ring]++; });
    read.textContent = CIRCLES_RINGS.map(function (r) {
      return counts[r.id] + ' ' + r.label;
    }).join(' · ') + '.'
      + (counts.closest === 0 ? ' the inner ring is empty.' : '');
    if (keepBtn) keepBtn.disabled = !tags.length;
  }

  function ringFromPoint(clientX, clientY) {
    var r = board.getBoundingClientRect();
    var dx = (clientX - r.left) / r.width * 360 - 180;
    var dy = (clientY - r.top) / r.height * 360 - 180;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var a = Math.atan2(dy, dx);
    var id = dist <= 60 ? 'closest' : (dist <= 108 ? 'friends' : 'distant');
    return { ring: id, a: a, outside: dist > 168 };
  }

  function hang(name) {
    name = String(name || '').trim();
    if (!name) {
      if (read) read.textContent = 'write a name on the tag first.';
      return;
    }
    if (tags.length >= 21) {
      if (read) read.textContent = 'the board holds twenty-one tags. take one down first.';
      return;
    }
    seq++;
    var t = {
      id: 'tag-' + seq,
      no: seq,
      name: name,
      ring: 'friends',
      a: (-Math.PI / 2) + (seq * 2.399963)   // a spread that does not stack
    };
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'circles-tag';
    // tag 7's paint went years ago — the board's own tell
    if (seq === 7) el.classList.add('bare');
    el.innerHTML = '<i aria-hidden="true">' + String(t.no).padStart(2, '0') + '</i><b></b>';
    el.querySelector('b').textContent = name;
    el.setAttribute('aria-label', name + ', ' + t.ring + ' ring. drag to move, or press to send outward');
    t.el = el;
    layer.appendChild(el);
    tags.push(t);
    relayout();
    el.classList.add('dropped');

    // drag to move between rings
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      dragging = t;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      el.classList.add('lifted');
    });
    el.addEventListener('pointermove', function (e) {
      if (dragging !== t) return;
      var hit = ringFromPoint(e.clientX, e.clientY);
      var r = board.getBoundingClientRect();
      el.style.left = ((e.clientX - r.left) / r.width * 100) + '%';
      el.style.top = ((e.clientY - r.top) / r.height * 100) + '%';
      el.setAttribute('data-over', hit.ring);
    });
    function release(e) {
      if (dragging !== t) return;
      dragging = null;
      el.classList.remove('lifted');
      el.removeAttribute('data-over');
      var hit = ringFromPoint(e.clientX, e.clientY);
      t.ring = hit.ring;
      relayout();
      el.classList.remove('dropped');
      void el.offsetWidth;
      el.classList.add('dropped');
      el.setAttribute('aria-label', t.name + ', ' + t.ring + ' ring. drag to move, or press to send outward');
      ctx.thunk();
      describe();
    }
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    // keyboard path: stepping a tag outward ring by ring, then back to closest
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      var order = ['closest', 'friends', 'distant'];
      t.ring = order[(order.indexOf(t.ring) + 1) % order.length];
      relayout();
      el.setAttribute('aria-label', t.name + ', ' + t.ring + ' ring. drag to move, or press to send outward');
      ctx.thunk();
      describe();
    });

    if (nameInput) nameInput.value = '';
    ctx.thunk();
    describe();
  }

  if (hangBtn) hangBtn.addEventListener('click', function () { hang(nameInput ? nameInput.value : ''); });
  if (nameInput) nameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); hang(nameInput.value); }
  });

  if (stripBtn) stripBtn.addEventListener('click', function () {
    tags = [];
    seq = 0;
    if (layer) layer.innerHTML = '';
    describe();
    ctx.thunk();
    if (keepBtn) keepBtn.disabled = true;
    if (result) result.textContent = '';
  });

  function circlesShot() {
    try {
      var c = document.createElement('canvas');
      c.width = 160; c.height = 160;
      var g = c.getContext('2d');
      g.fillStyle = '#14100e';
      g.fillRect(0, 0, 160, 160);
      var grd = g.createRadialGradient(62, 50, 8, 80, 80, 78);
      grd.addColorStop(0, '#6d6659');
      grd.addColorStop(1, '#2b2822');
      g.fillStyle = grd;
      g.beginPath(); g.arc(80, 80, 76, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#cbbf9e';
      g.lineWidth = 1.4;
      [69, 48, 27].forEach(function (r) {
        g.beginPath(); g.arc(80, 80, r, 0, Math.PI * 2); g.stroke();
      });
      tags.forEach(function (t) {
        var inner = t.ring === 'closest' ? 0 : (t.ring === 'friends' ? 27 : 48);
        var outer = t.ring === 'closest' ? 27 : (t.ring === 'friends' ? 48 : 69);
        var rad = inner + (outer - inner) * 0.56;
        var x = 80 + rad * Math.cos(t.a);
        var y = 80 + rad * Math.sin(t.a);
        g.fillStyle = '#e8d9ae';
        g.fillRect(x - 5, y - 3.5, 10, 7);
        g.fillStyle = '#2b2822';
        g.fillRect(x - 5, y - 3.5, 10, 1.4);
      });
      g.fillStyle = '#efe3c8';
      g.beginPath(); g.arc(80, 80, 6, 0, Math.PI * 2); g.fill();
      return c.toDataURL('image/jpeg', 0.74);
    } catch (e) { return null; }
  }

  if (keepBtn) keepBtn.addEventListener('click', function () {
    if (!tags.length) return;
    var byRing = {};
    CIRCLES_RINGS.forEach(function (r) { byRing[r.id] = []; });
    tags.forEach(function (t) { byRing[t.ring].push(t.name); });
    var summary = 'result: ' + CIRCLES_RINGS.map(function (r) {
      return r.label + ': ' + (byRing[r.id].length ? byRing[r.id].join(', ') : '—');
    }).join('; ') + '.';
    ctx.promptSave(b, summary, function () {
      ctx.saveToDesktopAndJournal(b, { rings: byRing, count: tags.length }, circlesShot());
      if (result) result.textContent = 'kept. the tent remembers.';
    }, null);
  });

  describe();
}

window.LiberBooths = window.LiberBooths || {};
window.LiberBooths.circles = playCircles;
