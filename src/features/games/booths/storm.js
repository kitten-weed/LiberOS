// Ink storm — Entity404's game — extracted verbatim from the games monolith.
var STORM_WORDS = ['tide', 'wax', 'ember', 'moth', 'loam', 'bell', 'reed', 'ash', 'owl', 'fern', 'dune', 'wren', 'moss', 'tallow', 'silt', 'hush'];

function playStorm(api, b, body) {
  body.innerHTML =
    '<div class="storm-wrap">'
    + '<canvas class="storm-canvas" id="storm-canvas" width="480" height="360"></canvas>'
    + '<div class="storm-buffer" id="storm-buffer" aria-hidden="true">_</div>'
    + '<div class="storm-hint" id="storm-hint">falling words. the terminal executes matches.</div>'
    + '<div class="games-actions" style="justify-content:center">'
    + '<button type="button" class="games-action" id="storm-keep">keep it</button>'
    + '</div>'
    + '<div class="games-result" id="storm-result"></div>'
    + '</div>';

  var cv = document.getElementById('storm-canvas');
  var ctx = cv.getContext('2d');
  var bufEl = document.getElementById('storm-buffer');
  var hintEl = document.getElementById('storm-hint');
  var words = [];
  var buffer = '';
  var spawned = 0;
  var executed = 0, missed = 0, missStreak = 0;
  var speed = 0.9;
  var lastSpawn = 0;
  var spawnMs = 2600;
  var slowedNote = false;
  var raf = 0;
  var flashes = [];

  function spawn(now) {
    var cols = 6;
    words.push({
      text: STORM_WORDS[spawned % STORM_WORDS.length],
      x: 40 + ((spawned * 89) % 400),
      y: -12,
      hit: false
    });
    spawned++;
    lastSpawn = now;
  }

  function paint(now) {
    ctx.fillStyle = '#020204';
    ctx.fillRect(0, 0, 480, 360);
    ctx.textAlign = 'left';
    for (var i = words.length - 1; i >= 0; i--) {
      var w = words[i];
      w.y += speed;
      if (w.y > 348) {
        words.splice(i, 1);
        missed++;
        missStreak++;
        if (missStreak >= 3 && speed > 0.35) {
          speed = Math.max(0.35, speed - 0.12);
          spawnMs = Math.min(6000, spawnMs * 1.1);
          if (!slowedNote && hintEl) {
            slowedNote = true;
            hintEl.textContent = 'the storm slows for you. no hurry at all.';
          }
        }
        continue;
      }
      var glow = w.hit ? 1 : 0.75;
      ctx.font = '15px "Courier New", monospace';
      ctx.fillStyle = w.hit ? 'rgba(255,255,255,' + glow + ')' : 'rgba(120,200,150,' + glow + ')';
      ctx.fillText(w.text, w.x, w.y);
      // phosphor trail
      ctx.fillStyle = 'rgba(120,200,150,0.25)';
      ctx.fillText(w.text, w.x, w.y - 16);
    }
    for (var f = flashes.length - 1; f >= 0; f--) {
      flashes[f].a -= 0.06;
      if (flashes[f].a <= 0) { flashes.splice(f, 1); continue; }
      ctx.fillStyle = 'rgba(255,255,255,' + flashes[f].a + ')';
      ctx.font = '15px "Courier New", monospace';
      ctx.fillText(flashes[f].text, flashes[f].x, flashes[f].y);
    }
    if (bufEl) bufEl.textContent = '>' + (buffer || '') + '_';
  }

  function loop(now) {
    if (!document.body.contains(cv)) return;
    if (!lastSpawn) lastSpawn = now;
    if (now - lastSpawn > spawnMs) spawn(now);
    paint(now);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  function onKey(e) {
    if (!document.body.contains(cv)) return;
    if (e.key === 'Backspace') { buffer = buffer.slice(0, -1); return; }
    if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-12);
    for (var i = 0; i < words.length; i++) {
      if (words[i].text === buffer) {
        flashes.push({ text: words[i].text, x: words[i].x, y: words[i].y, a: 1 });
        words.splice(i, 1);
        buffer = '';
        executed++;
        missStreak = 0;
        if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play('tink'); } catch (err) {} }
        break;
      }
    }
  }
  document.addEventListener('keydown', onKey);
  if (api.stage) {
    api.stage._teardown = function () {
      try { cancelAnimationFrame(raf); } catch (e) {}
      try { document.removeEventListener('keydown', onKey); } catch (e2) {}
    };
  }

  var keepBtn = document.getElementById('storm-keep');
  var result = document.getElementById('storm-result');
  if (keepBtn) keepBtn.addEventListener('click', function () {
    var total = executed + missed;
    if (!total) {
      if (result) result.textContent = 'the static is still gathering. let it rain a little.';
      return;
    }
    var shot = api.thumb(cv);
    var ratio = executed / total;
    var weather = ratio > 0.8
      ? 'a clear night, ' + executed + ' lightning words'
      : ratio > 0.4
        ? 'steady drizzle, ' + executed + ' lightning words'
        : 'a heavy storm, ' + executed + ' lightning words. nothing lost.';
    api.promptSave(b, 'result: ' + weather + '.', function () {
      api.saveToDesktopAndJournal(b, { executed: executed, missed: missed, weather: weather }, shot);
      if (result) result.textContent = 'kept. the tent remembers.';
    }, null);
  });
}

window.LiberBooths = window.LiberBooths || {};
window.LiberBooths.storm = playStorm;
