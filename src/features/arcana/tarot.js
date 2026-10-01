// tarot.js — the deck. Full Rider–Waite–Smith: 78 cards, one drawn, a
// chance of reversal (22%: enough to meet, not enough to steer). The
// reading pane carries the card's full upright or reversed line, the
// question, and the animation viz.js performs for majors/aces/courts.
(function () {
  'use strict';

  var A = window.LIBER_ARCANA_DATA;
  var DECK = A.tarot;

  var drawn = []; // ids out of the stack this sitting

  function pick() {
    var i, guard = 0;
    do { i = (Math.random() * DECK.length) | 0; guard++; }
    while (drawn.indexOf(DECK[i].id) !== -1 && guard < 400);
    return DECK[i];
  }

  // rank/suit reading for the pip cards (anim: null) — viz synthesizes
  // the scene from the count and the suit's element
  function pipInfo(card) {
    var suit = null, rank = null, count = 0;
    var rm = String(card.name || '').match(/^(ace|two|three|four|five|six|seven|eight|nine|ten) of (wands|cups|swords|pentacles)$/);
    if (rm) { rank = rm[1]; suit = rm[2]; count = { ace: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }[rm[1]]; }
    return { suit: suit, rank: rank, count: count };
  }

  var busy = false;

  function start() {
    var work = document.getElementById('arc-win-work');
    var wbody = document.getElementById('arc-work-body');
    if (!work || !wbody) return;
    // tarot keeps only the table window: the reading itself is the stage
    window.ARCANA_SHELL.WM.close('arc-win-read');
    window.ARCANA_SHELL.WM.open('arc-win-work');

    wbody.innerHTML =
      '<div id="arc-slate"></div>'
      + '<button type="button" class="arc-btn" id="arc-cut" style="margin-top:10px">&gt; cut the deck</button>'
      + '<div class="wg-hint" id="arc-deck-left" style="margin-top:8px"></div>';

    var slate = window.ARCANA_SHELL.slate(document.getElementById('arc-slate'), 'the question, written small', null);
    document.getElementById('arc-cut').addEventListener('click', draw);
    document.getElementById('arc-cut').focus();
    document.getElementById('arc-deck-left').textContent = (78 - drawn.length) + ' remain in the stack';

    function draw() {
      if (drawn.length >= 78) {
        document.getElementById('arc-deck-left').textContent = 'the deck is out. reshuffle by leaving and returning.';
        return;
      }
      if (busy) return;
      busy = true;
      var card = pick();
      drawn.push(card.id);
      var rev = Math.random() < 0.22;
      var reading = rev ? card.rev : card.up;
      window.ARCANA_SHELL.play('thunk');
      document.getElementById('arc-deck-left').textContent = (78 - drawn.length) + ' remain in the stack';


      // all of it on the stage: card out of the wall, scene, typed
      // interpretation, then keep/discard inline. no modal. flat fields
      // (no canvas, reduced motion) fall back to the shell's keep prompt.
      var V = window.ARCANA_VIZ;
      var pip = pipInfo(card);
      var afterKeep = function () {
        busy = false;
        window.ARCANA_SHELL.play('chime');
        window.ARCANA_SHELL.saveArtifact({
          name: card.name,
          key: reading,
          reading: reading,
          orientation: rev ? 'reversed' : 'upright',
          n: card.n,
          g: card.glyph,
          question: slate.value(),
          ts: Date.now()
        });
      };
      var afterDiscard = function () {
        busy = false;
        window.ARCANA_SHELL.play('click');
        // the card goes back in the stack — the deck hates a hoarded card
        var di = drawn.indexOf(card.id);
        if (di !== -1) drawn.splice(di, 1);
        var left = document.getElementById('arc-deck-left');
        if (left) left.textContent = (78 - drawn.length) + ' remain in the stack';
      };
      if (!V || !V.cardScene || !V.ready || window.ARCANA_SHELL.reduced) {
        window.ARCANA_SHELL.openKeep(
          '\u2014 keep the card? \u2014',
          card.name + (rev ? ' (reversed)' : '') + '\n\n' + reading
          + (slate.value() ? '\n\nquestion: ' + slate.value() : '\n\n(unguided draw)'),
          afterKeep, afterDiscard
        );
        return;
      }
      V.cardScene(card, rev, pip.suit ? { suit: pip.suit, rank: pip.rank, count: pip.count } : null, {
        text: card.name + (rev ? ' \u00b7 reversed' : '') + ' — ' + reading,
        cite: window.ARCANA_SHELL.readingCite(),
        onKeep: afterKeep,
        onDiscard: afterDiscard
      });
    }
  }

  window.LIBER_ARCANA_DATA.games.tarot = { start: start };
})();
