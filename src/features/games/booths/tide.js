// Tide pool — Vanir's game — extracted verbatim from the games monolith.
function playTide(api, b, body) {
  body.innerHTML =
    '<div class="tide-wrap">'
    + '<canvas class="tide-canvas" id="tide-canvas" width="480" height="360"></canvas>'
    + '<div class="tide-row"><input id="tide-input" maxlength="40" aria-label="drop a feeling" placeholder="a feeling"/>'
    + '<button type="button" class="games-action" id="tide-drop">drop it</button></div>'
    + '<div class="tide-hint" id="tide-hint">drop a feeling. high tide floats it, low tide strands it.</div>'
    + '<div class="games-actions" style="justify-content:center">'
    + '<button type="button" class="games-action" id="tide-release">release</button>'
    + '<button type="button" class="games-action" id="tide-keep">keep it</button>'
    + '</div>'
    + '<div class="games-result" id="tide-result"></div>'
    + '</div>';

  var cv = document.getElementById('tide-canvas');
  var ctx = cv.getContext('2d');
  var t0 = Date.now();
  var PERIOD = 75000;
  var items = [];
  var dropped = 0, released = 0;
  var lastTurn = 1;
  var raf = 0;

  function tide() { return Math.sin(((Date.now() - t0) / PERIOD) * Math.PI * 2); }
  function waterline() { return 150 + 95 * tide(); }
  function tideWord() {
    var s = tide();
    if (s > 0.5) return 'high';
    if (s < -0.5) return 'low';
    return Math.cos(((Date.now() - t0) / PERIOD) * Math.PI * 2) > 0 ? 'flowing' : 'ebbing';
  }

  function drop() {
    var inp = document.getElementById('tide-input');
    var text = inp ? inp.value.trim().slice(0, 40) : '';
    if (!text) return;
    if (inp) inp.value = '';
    var high = tide() > -0.1;
    items.push({ text: text, floating: high, x: 60 + ((dropped * 97) % 360), born: Date.now() });
    dropped++;
    api.thunk();
  }

  function paint() {
    var now = Date.now();
    var wl = waterline();
    ctx.fillStyle = '#0a0805';
    ctx.fillRect(0, 0, 480, 360);
    // sand bed
    ctx.fillStyle = '#2a1c0e';
    ctx.fillRect(0, 320, 480, 40);
    // water
    var grd = ctx.createLinearGradient(0, wl - 40, 0, 360);
    grd.addColorStop(0, 'rgba(74,138,200,0.12)');
    grd.addColorStop(1, 'rgba(74,138,200,0.55)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, wl, 480, 360 - wl);
    ctx.strokeStyle = 'rgba(140,190,230,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var x = 0; x <= 480; x += 16) {
      var y = wl + 4 * Math.sin(x / 40 + now / 900);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // night tides glow faintly teal
    var hour = new Date().getHours();
    var night = hour < 5 || hour >= 21;
    // feelings
    ctx.font = 'italic 14px Georgia';
    ctx.textAlign = 'center';
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      var alpha = it.alpha == null ? 1 : it.alpha;
      if (it.floating) {
        var by = wl - 16 + 5 * Math.sin(now / 600 + i * 1.7);
        ctx.fillStyle = night
          ? 'rgba(120,220,210,' + alpha + ')'
          : 'rgba(232,220,192,' + alpha + ')';
        ctx.fillText(it.text, it.x, by);
        if (it.leaving) {
          it.alpha = alpha - 0.03;
          it.x += 1.2;
          if (it.alpha <= 0) { items.splice(i, 1); released++; }
        }
      } else {
        var pulse = 0.65 + 0.25 * Math.sin(now / 500 + i);
        ctx.fillStyle = 'rgba(200,170,130,' + (alpha * pulse) + ')';
        ctx.fillText(it.text, it.x, 300);
      }
    }
    // tide-turn bell
    var turn = tide() >= 0 ? 1 : -1;
    if (turn !== lastTurn) {
      lastTurn = turn;
      if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play('tick'); } catch (e) {} }
    }
  }

  function loop() {
    if (!document.body.contains(cv)) return;
    paint();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  if (api.stage) {
    api.stage._teardown = function () {
      try { cancelAnimationFrame(raf); } catch (e) {}
    };
  }

  var dropBtn = document.getElementById('tide-drop');
  var inp = document.getElementById('tide-input');
  if (dropBtn) dropBtn.addEventListener('click', drop);
  if (inp) inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); drop(); }
  });
  var rel = document.getElementById('tide-release');
  if (rel) rel.addEventListener('click', function () {
    var any = false;
    items.forEach(function (it) { if (it.floating && !it.leaving) { it.leaving = true; any = true; } });
    var result = document.getElementById('tide-result');
    if (!any && result) result.textContent = 'nothing floats right now. wait for the tide, or drop at low water and sit with it.';
    else api.thunk();
  });
  var keepBtn = document.getElementById('tide-keep');
  var result2 = document.getElementById('tide-result');
  if (keepBtn) keepBtn.addEventListener('click', function () {
    if (!dropped) {
      if (result2) result2.textContent = 'the pool is empty. drop a feeling and it joins the tide.';
      return;
    }
    var shot = api.thumb(cv);
    var tw = tideWord();
    api.promptSave(b, 'result: a pool at ' + tw + ' tide, ' + released + ' released.', function () {
      api.saveToDesktopAndJournal(b, { dropped: dropped, released: released, tide: tw }, shot);
      if (result2) result2.textContent = 'kept. the tent remembers.';
    }, null);
  });
}

window.LiberBooths = window.LiberBooths || {};
window.LiberBooths.tide = playTide;
