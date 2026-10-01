// assoc.js — the word game, then the reading.
//
// Phase 1 is an arcade: a cue stands on the table, the clock runs, and
// every word the visitor types is checked against the Jonauskaite et al.
// (2025) English norms — a hit is a word people actually gave to that cue,
// scored by its production probability. The chain moves to the hit word
// when the hit word is itself one of the 62 cues (Semantris flow: the
// words keep unlocking each other).
//
// Phase 2 is the re-presentation pass, after Vezzoli et al. (2007): the
// strongest junctions are put back on the table one at a time — "what
// comes now, sitting with it?" — and the answers are kept with the record.
//
// Phase 3 is the brief analysis, in the method's terms: common vs
// idiosyncratic responses, the normative weight of the chain, which kinds
// of cues the play reached (objects, emotions, colours), and the
// indicators — reaction (speed of the chain), repetition, interpretation.
// It reads a game, not a person, and cites its sources.
(function () {
  'use strict';

  var A = window.LIBER_ARCANA_DATA;
  var NORMS = A.assoc;
  var CUES = Object.keys(NORMS);

  var ROUND_SECONDS = 60;

  var S = { record: [], cue: null, t0: 0, timer: null, running: false };

  function norm(w) {
    return String(w || '').toLowerCase().trim()
      .replace(/[^\w\s'-]/g, '')
      .replace(/\s+/g, ' ');
  }
  function stem(w) {
    var s = w;
    if (s.length > 5 && s.slice(-3) === 'ing') s = s.slice(0, -3);
    else if (s.length > 4 && s.slice(-2) === 'ed') s = s.slice(0, -2);
    else if (s.length > 4 && s.slice(-2) === 'es') s = s.slice(0, -2);
    else if (s.length > 3 && s.slice(-1) === 's') s = s.slice(0, -1);
    return s;
  }
  function sameWord(a, b) {
    if (a === b) return true;
    var sa = stem(a), sb = stem(b);
    return sa.length > 2 && sa === sb;
  }
  function lookup(cue, word) {
    var t = NORMS[cue];
    if (!t) return null;
    var list = t.assoc;
    for (var i = 0; i < list.length; i++) {
      if (sameWord(list[i].w, word)) return list[i];
      // multi-word norm entries match if the typed word is the phrase's head
      if (list[i].w.indexOf(' ') > -1 && list[i].w.split(' ')[0] === word) return list[i];
    }
    return null;
  }
  function isCue(w) { return Object.prototype.hasOwnProperty.call(NORMS, w); }
  function randomCue(exclude) {
    var c, guard = 0;
    do { c = CUES[(Math.random() * CUES.length) | 0]; guard++; }
    while (exclude && exclude.indexOf(c) !== -1 && guard < 50);
    return c;
  }

  // ── phase 1: the arcade ───────────────────────────────────────────────
  function start() {
    S.record = [];
    S.running = false;
    S.cue = randomCue();

    var work = document.getElementById('arc-win-work');
    var wbody = document.getElementById('arc-work-body');
    if (!work || !wbody) return;

    var V = window.ARCANA_VIZ;
    // close the reading pane BEFORE the scene opens (its onClose would
    // otherwise tear the brand-new scene down)
    window.ARCANA_SHELL.WM.close('arc-win-read');
    var onStage = !!(V && V.beginScene && V.beginScene());

    if (onStage) {
      // the cue stands in the void; the pane is only the table (input)
      window.ARCANA_SHELL.WM.open('arc-win-work');
      wbody.innerHTML =
        '<div class="wg-hint">type what the cue hands you. one word, then enter. hits must be words people actually gave \u2014 the rest are yours alone, and yours alone are also kept.</div>'
        + '<input class="wg-input" id="wg-input" type="text" spellcheck="false" autocomplete="off" aria-label="your association"/>'
        + '<button type="button" class="arc-btn" id="wg-done" style="margin-top:10px">&gt; end the round early</button>'
        + '<div class="wg-score" id="wg-score" style="margin-top:8px">score <b>0</b> \u00b7 <span id="wg-clock">' + ROUND_SECONDS + 's</span></div>';
      V.stageCue(S.cue);
    } else {
      var read = document.getElementById('arc-win-read');
      var body = document.getElementById('arc-read-body');
      if (!read || !body) return;
      window.ARCANA_SHELL.WM.open('arc-win-read');
      window.ARCANA_SHELL.WM.open('arc-win-work');
      body.innerHTML =
        '<div class="rd-name">the table is set</div>'
        + '<div class="rd-meta">jonauskaite et al. 2025 \u00b7 62 cues \u00b7 every hit is a real recorded association</div>'
        + '<div class="wg-cue" id="wg-cue" aria-live="polite">' + S.cue + '</div>'
        + '<div class="wg-score" id="wg-score">score <b>0</b> \u00b7 <span id="wg-clock">' + ROUND_SECONDS + 's</span></div>'
        + '<div class="wg-chain" id="wg-chain" aria-live="polite"></div>'
        + '<div class="rd-cite">' + window.ARCANA_SHELL.readingCite() + '</div>';
      wbody.innerHTML =
        '<div class="wg-hint">type what the cue hands you. one word, then enter. hits must be words people actually gave \u2014 the rest are yours alone, and yours alone are also kept.</div>'
        + '<input class="wg-input" id="wg-input" type="text" spellcheck="false" autocomplete="off" aria-label="your association"/>'
        + '<button type="button" class="arc-btn" id="wg-done" style="margin-top:10px">&gt; end the round early</button>';
    }

    var input = document.getElementById('wg-input');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(input.value); input.value = ''; }
    });
    document.getElementById('wg-done').addEventListener('click', endRound);
    input.focus();

    S.running = true;
    S.t0 = Date.now();
    S.timer = setInterval(tickClock, 250);

    function tickClock() {
      var left = ROUND_SECONDS - Math.floor((Date.now() - S.t0) / 1000);
      var clock = document.getElementById('wg-clock');
      if (clock) clock.textContent = Math.max(0, left) + 's';
      if (left <= 0) endRound();
    }
  }

  function submit(raw) {
    var w = norm(raw);
    if (!w || !S.running) return;
    var hit = lookup(S.cue, w);
    var rec = { word: w, cue: S.cue, ts: Date.now() - S.t0 };
    var V = window.ARCANA_VIZ;
    if (hit) {
      rec.hit = true;
      rec.p = hit.p;
      S.score = (S.score || 0) + 10 + Math.round(hit.p * 100);
      if (V && V.ready) {
        V.flashWord(w, 0x8cc85f);
        for (var i = 0; i < 3; i++) V.flash(null, '\u2736', 0x8cc85f);
      }
      window.ARCANA_SHELL.play('chime');
      // the chain moves on when the hit word is itself a cue
      var nextCue = isCue(w) ? w : null;
      if (nextCue) S.cue = nextCue;
      else S.cue = randomCue(recentCues());
    } else {
      rec.hit = false;
      S.score = (S.score || 0) + 1;
      if (V && V.ready) V.flashWord(w, 0x80a0ff);
      window.ARCANA_SHELL.play('click');
      S.cue = S.cue; // the cue holds the table; the word is noted beside it
    }
    // on stage: the word is emitted out of the void beside the cue;
    // a chain hit dissolves the cue and the next one condenses
    if (V && V.stageWord) {
      var W = V.stageX(), Y = V.stageY();
      var angle = (S.record.length % 5) - 2;
      V.stageWord((hit ? '\u2727 ' : '\u00b7 ') + w, hit ? '#8cc85f' : '#80a0ff',
        { x: W - 240 + angle * 46, y: Y - 60 + (S.record.length % 3) * 34, hold: hit ? 2100 : 1500 });
    }
    if (V && V.stageCue && S.cue !== rec.cue) V.stageCue(S.cue);
    S.record.push(rec);
    var scoreEl = document.getElementById('wg-score');
    if (scoreEl) scoreEl.innerHTML = 'score <b>' + S.score + '</b> \u00b7 <span id="wg-clock">' +
      Math.max(0, ROUND_SECONDS - Math.floor((Date.now() - S.t0) / 1000)) + 's</span>';
    var cueEl = document.getElementById('wg-cue');
    if (cueEl) cueEl.textContent = S.cue;
    var chainEl = document.getElementById('wg-chain');
    if (chainEl) {
      var last = S.record.slice(-8).map(function (r) {
        return '<span class="ch-word">' + r.word + '</span>';
      });
      chainEl.innerHTML = last.join('<span class="ch-sep"> \u00b7 </span>');
    }
  }
  function recentCues() {
    return S.record.slice(-6).map(function (r) { return r.cue; }).concat([S.cue]);
  }

  function endRound() {
    if (!S.running) return;
    S.running = false;
    clearInterval(S.timer);
    if (S.record.length === 0) { showAnalysis([]); return; }
    var junctions = pickJunctions();
    runRepPass(junctions, 0, []);
  }

  // ── phase 2: the re-presentation pass ─────────────────────────────────
  function pickJunctions() {
    var hits = S.record.filter(function (r) { return r.hit; })
      .sort(function (a, b) { return b.p - a.p; });
    var picks = hits.slice(0, 3);
    var misses = S.record.filter(function (r) { return !r.hit; });
    if (misses.length && picks.length < 4) picks.push(misses[(Math.random() * misses.length) | 0]);
    return picks;
  }
  function runRepPass(junctions, idx, answers) {
    if (idx >= junctions.length) { showAnalysis(answers); return; }
    var j = junctions[idx];
    var work = document.getElementById('arc-win-work');
    var wbody = document.getElementById('arc-work-body');
    if (!work || !wbody) { showAnalysis(answers); return; }
    var isMiss = !j.hit;
    wbody.innerHTML =
      '<div class="wg-hint">the re-presentation \u00b7 ' + (idx + 1) + ' of ' + junctions.length + '</div>'
      + '<div class="jq jq-q">when <b>' + j.cue + '</b> was on the table you said <b>' + j.word + '</b>'
      + (isMiss ? ' \u2014 a link of your own; the crowd never gave it.' : ' \u2014 the crowd gave it too (' + Math.round(j.p * 100) + '%).')
      + ' sit with it. what comes now?</div>'
      + '<input class="jq-input" id="jq-input" type="text" spellcheck="false" autocomplete="off" aria-label="what comes now"/>'
      + '<button type="button" class="arc-btn" id="jq-next" style="margin-top:8px">&gt; set it down' + (idx === junctions.length - 1 ? ' and read the table' : '') + '</button>';
    var input = document.getElementById('jq-input');
    input.focus();
    function next() {
      answers.push({ cue: j.cue, word: j.word, hit: !!j.hit, p: j.p || null, answer: norm(input.value) });
      document.getElementById('jq-next').removeEventListener('click', next);
      runRepPass(junctions, idx + 1, answers);
    }
    document.getElementById('jq-next').addEventListener('click', next);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); next(); } });
  }

  // ── phase 3: the brief analysis ───────────────────────────────────────
  function showAnalysis(answers) {
    var rec = S.record;
    var hits = rec.filter(function (r) { return r.hit; });
    var priv = rec.filter(function (r) { return !r.hit; });
    var weight = hits.reduce(function (a, r) { return a + r.p; }, 0);
    var kinds = { object: 0, emotion: 0, colour: 0 };
    hits.forEach(function (r) { var k = NORMS[r.cue] && NORMS[r.cue].kind; if (k) kinds[k]++; });
    var V = window.ARCANA_VIZ;
    var onStage = !!(V && V.sceneActive && V.sceneActive());
    var cite = window.ARCANA_SHELL.readingCite();

    // the indicators, in the experiment's terms (vezzoli et al. 2007)
    var lines = [];
    lines.push(['common responses', hits.length + ' of ' + rec.length + ' \u2014 words the crowd also gave (normative weight ' + weight.toFixed(2) + ')']);
    lines.push(['idiosyncratic responses', priv.length + (priv.length ? ' \u2014 ' + priv.slice(0, 4).map(function (r) { return r.word; }).join(', ') : '')]);
    lines.push(['reaction', rec.length ? 'the chain moved ' + rec.length + ' times in ' + ROUND_SECONDS + 's \u2014 ' + (rec.length > 14 ? 'quick, few hesitations' : rec.length > 7 ? 'measured' : 'the table was sat with longer than typed at') : 'nothing was laid on the table']);
    lines.push(['repetition', (function () {
      var seen = {}, dups = 0;
      rec.forEach(function (r) { seen[r.word] = (seen[r.word] || 0) + 1; if (seen[r.word] === 2) dups++; });
      return dups ? dups + ' word' + (dups > 1 ? 's' : '') + ' returned to the table' : 'nothing repeated';
    })()]);
    lines.push(['interpretation', priv.length > hits.length ? 'the private words outweigh the shared ones \u2014 the links lean yours' : 'the shared words lead \u2014 the chain ran close to the crowd']);
    lines.push(['where it reached', 'objects ' + kinds.object + ' \u00b7 emotions ' + kinds.emotion + ' \u00b7 colours ' + kinds.colour
      + (kinds.emotion === 0 ? ' \u2014 the feeling-cues stayed untouched' : '')]);

    var probe = '';
    if (rec.length === 0) probe = 'the table was left empty. that is also a reading, and it is not mine to fill.';
    else if (kinds.emotion === 0) probe = 'the feeling-cues never took a hit. was the table keeping them, or were you?';
    else if (priv.length > hits.length) probe = 'many links were yours alone. what were the shared words making room for?';
    else if (weight > 1.5) probe = 'the chain ran close to the crowd\u2019s. what would it have said if the crowd left the room?';
    else probe = 'the table is read. sit with ' + (hits[0] ? '\u201c' + hits[0].word + '\u201d' : 'the chain') + ' once more before it goes back in the stack.';

    // the verdict text, shared by both stages
    var verdict = '';
    lines.forEach(function (L) { verdict += L[0] + ': ' + L[1] + '\n'; });
    if (answers.length) {
      verdict += '\nthe re-presentations:';
      answers.forEach(function (a) { verdict += '\n  ' + a.cue + ' \u2192 ' + a.word + ' \u2014 ' + (a.answer || '(nothing set down)'); });
    }
    verdict += '\n\n' + probe;

    var keep = function () {
      window.ARCANA_SHELL.saveArtifact({
        name: 'a sitting at the word table',
        key: probe,
        reading: probe,
        game: 'association',
        chain: rec,
        rePRESENTATIONS: answers,
        indicators: lines.map(function (L) { return { k: L[0], v: L[1] }; }),
        question: '',
        ts: Date.now()
      });
    };

    // stage: the cue dissolves, the table reads itself out of the void
    if (onStage) {
      V.cueOut();
      var chainTxt = rec.slice(-6).map(function (r) { return r.word; }).join(' \u00b7 ');
      if (chainTxt) V.stageWord(chainTxt, '#5c6370', { y: V.stageY() - 130, hold: 2600 });
      V.stageReading({
        title: 'the table, read',
        text: verdict,
        color: '#cf87e8',
        speed: 10,
        cite: cite,
        onKeep: function () { window.ARCANA_SHELL.play('chime'); keep(); },
        onDiscard: function () { window.ARCANA_SHELL.play('click'); }
      });
      var wbody0 = document.getElementById('arc-work-body');
      if (wbody0) wbody0.innerHTML = '<div class="wg-hint">the round is over. the reading stands in the room.</div>';
      return;
    }

    var body = document.getElementById('arc-read-body');
    if (body) {
      var out = '<div class="rd-name">the table, read</div>'
        + '<div class="rd-meta">brief, and in the method\u2019s own terms \u2014 it reads a game, not a person</div>';
      lines.forEach(function (L) {
        out += '<div class="an-line"><span class="an-k">' + L[0] + '</span> \u2014 ' + L[1] + '</div>';
      });
      out += '<div class="rd-line" style="margin-top:10px">' + probe + '</div>';
      if (answers.length) {
        out += '<div class="rd-meta" style="margin-top:10px">the re-presentations</div>';
        answers.forEach(function (a) {
          out += '<div class="an-line"><span class="an-k">' + a.cue + ' \u2192 ' + a.word + '</span> \u2014 ' + (a.answer || '(nothing set down)') + '</div>';
        });
      }
      out += '<div class="rd-cite">' + window.ARCANA_SHELL.readingCite() + '</div>';
      body.innerHTML = out;
    }

    var wbody = document.getElementById('arc-work-body');
    if (wbody) wbody.innerHTML = '<div class="wg-hint">the round is over. the reading stands in the window across the table.</div>';

    if (V && V.ready) { for (var i = 0; i < 8; i++) V.flash(null, '\u2736', 0xcf87e8); }

    window.ARCANA_SHELL.openKeep(
      '\u2014 keep the sitting? \u2014',
      'the word game, ' + rec.length + ' associations laid down\n'
      + hits.length + ' common \u00b7 ' + priv.length + ' private \u00b7 weight ' + weight.toFixed(2) + '\n\n'
      + lines.map(function (L) { return L[0] + ': ' + L[1]; }).join('\n')
      + '\n\n' + probe,
      keep
    );
  }

  window.LIBER_ARCANA_DATA.games.assoc = { start: start };
})();
