// iching.js — the coins. Three coins, six lines, bottom first. The cast
// uses the true old probabilities: each coin 2/3 heads, so a line is
// old yang 1/8, young yang 3/8, young yin 3/8, old yin 1/8. Changing
// lines (the old ones) wobble in Pixi and derive the second hexagram.
(function () {
  'use strict';

  var A = window.LIBER_ARCANA_DATA;
  var HEX = A.iching;

  var state = { lines: [], done: false };
  var slateRef = null;

  function findHex(pattern) {
    for (var i = 0; i < HEX.length; i++) if (HEX[i].pattern === pattern) return HEX[i];
    return null;
  }

  // cast one line: 3 coins, each 2/3 "heads" — faithful to the yarrow-ish odds
  function castLine() {
    var heads = 0;
    var faces = [];
    for (var c = 0; c < 3; c++) {
      var h = Math.random() < (2 / 3);
      if (h) heads++;
      faces.push(h ? '\u25cf' : '\u25cb');
    }
    // heads: value 3, tails: value 2 — old counting
    var val = heads + 3 * 0; // placeholder, replaced below
    val = heads === 3 ? 9 : heads === 2 ? 8 : heads === 1 ? 7 : 6;
    return { heads: heads, faces: faces, val: val, yang: val === 7 || val === 9, changing: val === 6 || val === 9 };
  }

  function renderLines() {
    var host = document.getElementById('arc-hex');
    if (!host) return;
    host.innerHTML = '';
    // render top-down: line 6 first
    for (var n = state.lines.length; n >= 1; n--) {
      var L = state.lines[n - 1];
      var row = document.createElement('div');
      row.className = 'hex-row' + (L.changing ? ' changing' : '');
      row.id = 'arc-hex-row-' + n;
      var num = document.createElement('span');
      num.className = 'hx-num';
      num.textContent = L6(n) + '\u00b7';
      row.appendChild(num);
      var bar = document.createElement('span');
      bar.className = L.yang ? 'hex-yang' : 'hex-yin';
      bar.textContent = L.yang ? '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501' : '\u2501\u2501\u2501 \u2501\u2501\u2501';
      row.appendChild(bar);
      if (L.changing) {
        var mark = document.createElement('span');
        mark.className = 'hx-mark';
        mark.textContent = ' \u2248 ' + (L.val === 9 ? 'old yang \u2192 yin' : 'old yin \u2192 yang');
        row.appendChild(mark);
      }
      host.appendChild(row);
    }
  }
  function L6(n) { return String(n); }

  function patternOf(lines, transform) {
    var out = '';
    for (var i = 0; i < 6; i++) {
      var L = lines[i];
      var yang = transform ? (L.changing ? !L.yang : L.yang) : L.yang;
      out += yang ? '1' : '0';
    }
    return out;
  }

  function start() {
    var work = document.getElementById('arc-win-work');
    var wbody = document.getElementById('arc-work-body');
    if (!work || !wbody) return;
    state.lines = []; state.done = false;

    var V = window.ARCANA_VIZ;
    // closing the reading pane first: its onClose tears scenes down, and
    // the stage scene must be born after that, not murdered by it
    window.ARCANA_SHELL.WM.close('arc-win-read');
    var onStage = !!(V && V.beginScene && V.beginScene());

    if (onStage) {
      // the stage is the reading; the pane is only the table (question + cast)
      window.ARCANA_SHELL.WM.open('arc-win-work');
      wbody.innerHTML =
        '<div id="arc-slate"></div>'
        + '<button type="button" class="arc-btn" id="arc-cast" style="margin-top:10px">&gt; cast the three coins</button>'
        + '<div class="wg-hint" id="arc-cast-count" style="margin-top:8px">six lines, bottom first</div>'
        + '<div class="wg-hint" id="arc-coin-readout" aria-live="polite"></div>';
    } else {
      // flat field: the old window reading
      var read = document.getElementById('arc-win-read');
      var body = document.getElementById('arc-read-body');
      if (!read || !body) return;
      window.ARCANA_SHELL.WM.open('arc-win-read');
      window.ARCANA_SHELL.WM.open('arc-win-work');
      body.innerHTML =
        '<div class="rd-name">the coins wait</div>'
        + '<div class="rd-meta">three coins \u00b7 six lines \u00b7 bottom first \u00b7 changing lines wobble</div>'
        + '<div class="hex" id="arc-hex" aria-live="polite"></div>'
        + '<div id="arc-hex-verdict"></div>'
        + '<div class="rd-cite">' + window.ARCANA_SHELL.readingCite() + '</div>';
      wbody.innerHTML =
        '<div id="arc-slate"></div>'
        + '<button type="button" class="arc-btn" id="arc-cast" style="margin-top:10px">&gt; cast the three coins</button>'
        + '<div class="coin-line" id="arc-coin-readout" style="margin-top:8px" aria-hidden="true"></div>'
        + '<div class="wg-hint" id="arc-cast-count"></div>';
    }

    slateRef = window.ARCANA_SHELL.slate(document.getElementById('arc-slate'), 'the question, written small', null);
    document.getElementById('arc-cast').addEventListener('click', cast);
    document.getElementById('arc-cast').focus();

    function cast() {
      if (state.done || state.lines.length >= 6) return;
      var btn = document.getElementById('arc-cast');
      btn.disabled = true;
      var dish = document.getElementById('arc-win-work');
      function settle() {
        var L = castLine();
        state.lines.push(L);
        window.ARCANA_SHELL.play('tick');
        var ro = document.getElementById('arc-coin-readout');
        if (ro) ro.textContent = L.faces.join(' ');
        if (onStage) {
          // the line condenses out of the wall, where the coins threw it
          V.hexLineStage(state.lines.length, L.yang, L.changing);
          if (L.changing) V.stageWord('\u2248 old ' + (L.val === 9 ? 'yang' : 'yin') + ' \u2192 ' + (L.val === 9 ? 'yin' : 'yang'), '#e3c78a', { y: V.stageY() + 150, hold: 1700 });
        } else {
          renderLines();
          if (V && V.ready) V.hexLine(document.getElementById('arc-hex-row-' + state.lines.length), L.changing);
          if (L.changing && V && V.ready) V.flash(null, '\u2248', 0xe3c78a);
        }
        var cc = document.getElementById('arc-cast-count');
        if (cc) cc.textContent = 'line ' + state.lines.length + ' of 6 \u00b7 value ' + L.val;
        btn.disabled = false;
        if (state.lines.length === 6) setTimeout(offer, onStage ? 1200 : 0);
      }
      if (V && V.ready && dish) V.coins(dish, settle); else setTimeout(settle, 420);
    }

    function offer() {
      state.done = true;
      document.getElementById('arc-cast').disabled = true;
      var primary = patternOf(state.lines, false);
      var derived = patternOf(state.lines, true);
      var h1 = findHex(primary);
      var h2 = (derived !== primary) ? findHex(derived) : null;
      var changed = state.lines.filter(function (L) { return L.changing; }).length;
      var num1 = HEX.indexOf(h1) + 1, num2 = h2 ? HEX.indexOf(h2) + 1 : null;

      var keep = function () {
        window.ARCANA_SHELL.saveArtifact({
          name: h1.name,
          desc: h1.judgement,
          reading: h1.judgement,
          interpretation: h1.judgement,
          image: h1.image,
          number: num1,
          pattern: primary,
          derivedPattern: h2 ? derived : null,
          derivedName: h2 ? h2.name : null,
          lines: state.lines.map(function (L) { return { yang: L.yang, changing: L.changing, val: L.val }; }),
          question: slateRef.value(),
          ts: Date.now()
        });
      };

      if (onStage) {
        // the verdict gathers out of the six settled lines
        V.gatherAt(V.stageX(), V.stageY() + 60, 190, 0x80a0ff, 1200);
        var text = h1.name + ' \u00b7 n\u00ba ' + num1 + '\n\nthe judgement: ' + h1.judgement
          + '\n\nthe image: ' + h1.image;
        if (h2 && changed > 0) {
          text += '\n\n' + changed + ' changing line' + (changed > 1 ? 's' : '')
            + ' \u2014 tending toward ' + h2.name + ' \u00b7 n\u00ba ' + num2 + ': ' + h2.judgement;
        }
        if (slateRef.value()) text += '\n\nquestion: ' + slateRef.value();
        V.stageReading({
          title: h1.name + ' \u00b7 n\u00ba ' + num1,
          text: text,
          color: '#80a0ff',
          speed: 12,
          cite: window.ARCANA_SHELL.readingCite(),
          onKeep: function () { window.ARCANA_SHELL.play('chime'); keep(); },
          onDiscard: function () { window.ARCANA_SHELL.play('click'); }
        });
      } else {
        var out = '<div class="rd-name">' + h1.name + ' \u00b7 n\u00ba ' + num1 + '</div>'
          + '<div class="rd-meta">the judgement</div>'
          + '<div class="rd-line">' + h1.judgement + '</div>'
          + '<div class="rd-meta">the image</div>'
          + '<div class="rd-line">' + h1.image + '</div>';
        if (h2 && changed > 0) {
          out += '<div class="rd-meta">' + changed + ' changing line' + (changed > 1 ? 's' : '') + ' \u2014 the tendency, if the old lines are listened to</div>'
            + '<div class="rd-name" style="font-size:1.4rem">' + h2.name + ' \u00b7 n\u00ba ' + num2 + '</div>'
            + '<div class="rd-line">' + h2.judgement + '</div>';
        }
        document.getElementById('arc-hex-verdict').innerHTML = out;
        window.ARCANA_SHELL.openKeep(
          '\u2014 keep the hexagram? \u2014',
          h1.name + ' \u00b7 n\u00ba ' + num1 + '\n\n' + h1.judgement
          + (h2 ? '\n\ntending toward: ' + h2.name + '\n' + h2.judgement : '')
          + (slateRef.value() ? '\n\nquestion: ' + slateRef.value() : '\n\n(unguided cast)'),
          keep
        );
      }
    }
  }

  window.LIBER_ARCANA_DATA.games.iching = { start: start };
})();
