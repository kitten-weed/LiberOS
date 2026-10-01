// Emotion wheel — extracted verbatim from the games monolith.
var WHEEL_EMOTIONS = [
  { name: 'Anger', hex: '#C02424' },
  { name: 'Fear', hex: '#B2B2C2' },
  { name: 'Pride', hex: '#E04414' },
  { name: 'Pure Affection', hex: '#E22424' },
  { name: 'Depression', hex: '#3B3448' },
  { name: 'Sympathy', hex: '#79B879' },
  { name: 'Jealousy', hex: '#6B4A2E' },
  { name: 'Highest Intellect', hex: '#F2F200' },
  { name: 'Love for Humanity', hex: '#BE8FBE' },
  { name: 'Adaptability', hex: '#7A7A3C' },
  { name: 'Sensuality', hex: '#92605C' },
  { name: 'Devotion', hex: '#6E92D6' }
];

var WHEEL_COLORS = ['#C02424', '#E09320', '#F2F200', '#79B879', '#2a8a8a', '#4a6ad4', '#7a3aaa', '#BE8FBE'];

function polar(r, a) {
  return [150 + r * Math.cos(a), 150 + r * Math.sin(a)];
}

function wedgePath(i, n) {
  var a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
  var a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
  var p0 = polar(140, a0), p1 = polar(140, a1);
  return 'M150 150 L' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1)
    + ' A140 140 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' Z';
}

function playWheel(ctx, b, body) {
  var n = WHEEL_EMOTIONS.length;
  var svg = '<svg id="wheel-svg" viewBox="0 0 300 300" role="img" aria-label="emotion dartboard">';
  for (var i = 0; i < n; i++) {
    var e = WHEEL_EMOTIONS[i];
    var mid = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    var lp = polar(108, mid);
    svg += '<path d="' + wedgePath(i, n) + '" fill="' + e.hex + '" stroke="#0a0a0a" stroke-width="2" data-wedge="' + i + '"/>'
      + '<text x="' + lp[0].toFixed(1) + '" y="' + lp[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="middle"'
      + ' font-size="10" fill="#f0e8d8" transform="rotate(' + ((mid * 180 / Math.PI) + 90).toFixed(1) + ' ' + lp[0].toFixed(1) + ' ' + lp[1].toFixed(1) + ')">'
      + ctx.esc(e.name.split(' ')[0]) + '</text>';
  }
  svg += '<circle cx="150" cy="150" r="16" fill="#d4af37" stroke="#0a0a0a" stroke-width="2"/></svg>';

  body.innerHTML =
    '<div class="wheel-wrap" id="wheel-wrap">' + svg
    + '<div class="wheel-dart" id="wheel-dart" aria-hidden="true">'
    + '<svg viewBox="0 0 34 34" width="34" height="34"><path d="M17 2 L21 20 L17 26 L13 20 Z" fill="#e8c890" stroke="#5a3a10"/><circle cx="17" cy="8" r="2.5" fill="#c02424"/></svg>'
    + '</div><div class="wheel-seep" id="wheel-seep" aria-hidden="true"></div></div>'
    + '<div class="wheel-hint" id="wheel-hint">a dart waits. the wheel takes the throw.</div>'
    + '<div class="wheel-colors" id="wheel-colors" hidden></div>'
    + '<div class="games-actions">'
    + '<button type="button" class="games-action" id="wheel-again" hidden>another dart</button>'
    + '<button type="button" class="games-action" id="wheel-keep" disabled>keep it</button>'
    + '</div>'
    + '<div class="games-result" id="wheel-result"></div>';

  var wrap = document.getElementById('wheel-wrap');
  var dart = document.getElementById('wheel-dart');
  var seep = document.getElementById('wheel-seep');
  var colors = document.getElementById('wheel-colors');
  var hint = document.getElementById('wheel-hint');
  var again = document.getElementById('wheel-again');
  var keep = document.getElementById('wheel-keep');
  var result = document.getElementById('wheel-result');
  var thrown = null;   // { emotion, x, y (fractions), color }
  var darts = [];

  function dartXY(evt) {
    var r = wrap.getBoundingClientRect();
    return { x: (evt.clientX - r.left) / r.width, y: (evt.clientY - r.top) / r.height };
  }

  wrap.addEventListener('mousemove', function (e) {
    if (!dart || thrown) return;
    var p = dartXY(e);
    dart.style.transform = 'translate(' + (p.x * wrap.clientWidth).toFixed(1) + 'px,' + (p.y * wrap.clientHeight).toFixed(1) + 'px)';
  });
  wrap.addEventListener('mouseleave', function () {
    if (dart && !thrown) dart.style.transform = 'translate(-40px,-40px)';
  });

  function wedgeAt(x, y) {
    var dx = x - 0.5, dy = y - 0.5;
    var a = Math.atan2(dy, dx) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    var i = Math.floor(a / (Math.PI * 2) * n) % n;
    if (Math.sqrt(dx * dx + dy * dy) > 0.47) return -1;
    return i;
  }

  wrap.addEventListener('click', function (e) {
    if (thrown) return;
    var p = dartXY(e);
    var wi = wedgeAt(p.x, p.y);
    if (wi < 0) { if (hint) hint.textContent = 'off the board! aim inside the wheel.'; return; }
    var emo = WHEEL_EMOTIONS[wi];
    thrown = { emotion: emo.name, hex: emo.hex, x: p.x, y: p.y, color: null };
    if (dart) {
      dart.style.transform = 'translate(' + (p.x * wrap.clientWidth).toFixed(1) + 'px,' + (p.y * wrap.clientHeight).toFixed(1) + 'px)';
    }
    ctx.thunk();
    if (hint) hint.textContent = emo.name + ' — now pick the color it feels like.';
    if (colors) {
      colors.innerHTML = '';
      colors.hidden = false;
      WHEEL_COLORS.forEach(function (c) {
        var cb = document.createElement('button');
        cb.type = 'button';
        cb.className = 'wheel-color';
        cb.style.background = c;
        cb.setAttribute('aria-label', 'color ' + c);
        cb.addEventListener('click', function () { flood(c); });
        colors.appendChild(cb);
      });
    }
  });

  function flood(color) {
    if (!thrown || thrown.color) return;
    thrown.color = color;
    if (seep) {
      var wpx = wrap.clientWidth;
      seep.style.left = (thrown.x * 100) + '%';
      seep.style.top = (thrown.y * 100) + '%';
      seep.style.width = seep.style.height = (wpx * 2.4) + 'px';
      seep.style.background = 'radial-gradient(circle, ' + color + ' 0%, ' + color + '55 45%, transparent 72%)';
      void seep.offsetWidth;
      seep.classList.add('go');
    }
    if (dart) dart.classList.add('dropped');
    darts.push({ emotion: thrown.emotion, color: color });
    if (result) result.textContent = 'dart ' + darts.length + ': ' + thrown.emotion + ' in ' + color + '.';
    if (hint) hint.textContent = 'the color seeps out. throw another, or keep it.';
    if (again) again.hidden = false;
    if (keep) keep.disabled = false;
    ctx.thunk();
  }

  if (again) again.addEventListener('click', function () {
    thrown = null;
    if (seep) { seep.classList.remove('go'); }
    if (dart) { dart.classList.remove('dropped'); dart.style.transform = 'translate(-40px,-40px)'; }
    if (colors) colors.hidden = true;
    if (hint) hint.textContent = 'a dart waits. the wheel takes the throw.';
  });

  if (keep) keep.addEventListener('click', function () {
    if (!darts.length) return;
    var last = darts[darts.length - 1];
    var shot = wheelShot(last);
    ctx.promptSave(b, 'result: ' + darts.length + ' dart' + (darts.length === 1 ? '' : 's') + ', last landed ' + last.emotion + ' in ' + last.color + '.', function () {
      ctx.saveToDesktopAndJournal(b, { darts: darts }, shot);
      if (result) result.textContent = 'kept. the tent remembers.';
    }, null);
  });

  function wheelShot(last) {
    try {
      var c = document.createElement('canvas');
      c.width = 160; c.height = 160;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#1a0008';
      ctx.fillRect(0, 0, 160, 160);
      var g = ctx.createRadialGradient(80, 80, 4, 80, 80, 90);
      g.addColorStop(0, last.color);
      g.addColorStop(1, '#1a0008');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 160, 160);
      ctx.fillStyle = '#f0e8d8';
      ctx.font = 'italic 15px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(last.emotion, 80, 84, 150);
      return c.toDataURL('image/jpeg', 0.72);
    } catch (e) { return null; }
  }
}

window.LiberBooths = window.LiberBooths || {};
window.LiberBooths.wheel = playWheel;
