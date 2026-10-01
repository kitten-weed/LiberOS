// divination.js — Arcana. Tarot (22-card deck) + I Ching (six-line hexagram).
// One felt table, one keep language: both games go through the same prompt
// and land on the same shelf, in the same shape.

(function () {
  function WL(kind, data) {
    try {
      var W = window.Liber && window.Liber.wanderlustAccent;
      if (W && W.evidenceFor) data.keywordsMatched = W.evidenceFor(data);
    } catch (e) { /* the keep lands regardless */ }
    return data;
  }
  // Deck mirrors data/tarot.json: { id, name, n, g, keywords, upright[] }.
  // The reading line is upright[0] — the author's own fragment. key is
  // never read from the card; kept records set key from upright[0].
  var DECK = [
    { id: 'fool', name: 'the fool', n: 0, g: 'O', keywords: [], upright: ['a step taken without map'] },
    { id: 'magician', name: 'the magician', n: 1, g: '☽', keywords: [], upright: ['will bent into form'] },
    { id: 'high-priestess', name: 'the high priestess', n: 2, g: '⚮', keywords: [], upright: ['what is hidden, kept'] },
    { id: 'empress', name: 'the empress', n: 3, g: '♀', keywords: [], upright: ['a body that bears'] },
    { id: 'emperor', name: 'the emperor', n: 4, g: '♂', keywords: [], upright: ['a line drawn and held'] },
    { id: 'hierophant', name: 'the hierophant', n: 5, g: '⌘', keywords: [], upright: ['the old teaching'] },
    { id: 'lovers', name: 'the lovers', n: 6, g: '⚥', keywords: [], upright: ['two become a question'] },
    { id: 'chariot', name: 'the chariot', n: 7, g: '⚔', keywords: [], upright: ['force, harnessed'] },
    { id: 'strength', name: 'strength', n: 8, g: 'Ω', keywords: [], upright: ['softness against the throat'] },
    { id: 'hermit', name: 'the hermit', n: 9, g: '⌬', keywords: [], upright: ['the lamp, the corridor'] },
    { id: 'wheel-of-fortune', name: 'wheel of fortune', n: 10, g: '☸', keywords: [], upright: ['it turns, indifferent'] },
    { id: 'justice', name: 'justice', n: 11, g: '⚖', keywords: [], upright: ['the weight, returned'] },
    { id: 'hanged-man', name: 'the hanged man', n: 12, g: '⚓', keywords: [], upright: ['let go, downward'] },
    { id: 'death', name: 'death', n: 13, g: '✝', keywords: [], upright: ['an ending, named'] },
    { id: 'temperance', name: 'temperance', n: 14, g: '⚗', keywords: [], upright: ['two waters, one cup'] },
    { id: 'devil', name: 'the devil', n: 15, g: '⌖', keywords: [], upright: ['the chain you did not see'] },
    { id: 'tower', name: 'the tower', n: 16, g: '⚡', keywords: [], upright: ['the structure, broken'] },
    { id: 'star', name: 'the star', n: 17, g: '★', keywords: [], upright: ['small light, far'] },
    { id: 'moon', name: 'the moon', n: 18, g: '☾', keywords: [], upright: ['things, in water'] },
    { id: 'sun', name: 'the sun', n: 19, g: '☀', keywords: [], upright: ['open, burning'] },
    { id: 'judgement', name: 'judgement', n: 20, g: '♪', keywords: [], upright: ['a sound, far off'] },
    { id: 'world', name: 'the world', n: 21, g: 'O', keywords: [], upright: ['a circle, closed'] }
  ];

  // The reading line, everywhere: upright[0]. Falls back to the old key
  // shape only for saves written before the mirror.
  function cardReading(card) {
    if (!card) return '';
    if (card.upright && card.upright.length) return card.upright[0];
    return card.key || '';
  }

  // Second line of the interpret — the workbook lens, diegetic register.
  // The counsel answers the situation around the question as often as the
  // sentence; the first telling flatters the daylight. No imperatives.
  function lensLine() {
    return 'the situation around the question, asked through you — the first telling flatters the daylight; what it leaves out stays on the felt.';
  }

  // Hexagram reading line, everywhere: interpretation. Falls back to the
  // old desc shape only for saves written before the mirror.
  function hexReading(hex) {
    if (!hex) return '';
    return hex.interpretation || hex.desc || '';
  }

  // I Ching — 64 hexagrams. Each line is yin (0) or yang (1); read bottom-up.
  // 6-bit binary: row 6 (top) is the first character.
  var HEXAGRAM_NAMES = [
    'The Creative','The Receptive','Difficulty at the Beginning','Youthful Folly',
    'Waiting','Conflict','The Army','Holding Together',
    'Small Taming','Treading','Peace','Standstill',
    'Fellowship','Great Possession','Modesty','Enthusiasm',
    'Following','Work on What Has Been Spoiled','Approach','Contemplation',
    'Biting Through','Grace','Splitting Apart','Return',
    'Innocence','Great Taming','Nourishment','Great Preponderance',
    'The Abysmal','The Clinging','Influence','Duration',
    'Retreat','Great Power','Progress','Darkening of the Light',
    'The Family','Opposition','Obstruction','Deliverance',
    'Decrease','Increase','Breakthrough','Coming to Meet',
    'Gathering Together','Pushing Upward','Oppression','The Well',
    'Revolution','The Cauldron','The Arousing','Keeping Still',
    'Development','The Marrying Maiden','Abundance','The Wanderer',
    'The Gentle','The Joyous','Dispersion','Limitation',
    'Inner Truth','Small Preponderance','After Completion','Before Completion'
  ];
  var HEXAGRAM_DESCRIPTIONS = [
    'pure yang — the primal force of heaven, the dragon at the threshold of being.',
    'pure yin — the nurturing power of the earth, the field that receives.',
    'chaos before creation. the first thread ties itself; do not rush the knot.',
    'the need for a teacher. the well is dark until the rope is thrown.',
    'patience and preparation. the storm passes if you do not walk in it.',
    'tension and opposition. do not meet force with force; meet it with clarity.',
    'organised collective action. one heart, many hands, one direction.',
    'union and mutual support. the seal binds only if the wax is warm.',
    'gentle restraint. the small leash tames; the great one breaks.',
    'careful behaviour. walk on the toes of the dance; one false step and the floor remembers.',
    'harmony and prosperity. the gate opens because the keeper is ready.',
    'stagnation and obstruction. wood rots when it cannot move.',
    'community and shared purpose. the circle is stronger than any spoke.',
    'abundance and responsibility. the cup overflows; who carries the spillage?',
    'humility and yielding. the mountain hides beneath the hill.',
    'joyful energy. the spring rises without being asked.',
    'adaptation and moving with the flow. the reed bends; the oak does not.',
    'decay and repair. mend the raft before the river rises.',
    'advancement and growth. the tide comes in; bring it something.',
    'observation and reflection. the watcher sees more than the actor.',
    'decisive action. the jaw closes; the matter is settled.',
    'beauty and adornment. form is the courtesy the soul pays to the world.',
    'disintegration and dissolution. the leaf returns to the loam that made it.',
    'the turning point. the wheel has come around; step off, or step on.',
    'spontaneity and the unforced path. the unpainted picture is already true.',
    'holding steady. the great river moves but does not rage.',
    'sustenance and care. what you feed, grows.',
    'excess and the bending. the bow that is too straight snaps.',
    'danger and water. listen for the current beneath the quiet.',
    'fire and clarity. what burns away is not lost.',
    'attraction. the moon draws the tide without touching it.',
    'endurance. the stone forgets the river; the river forgets the stone.',
    'withdrawal. the mountain does not chase the cloud.',
    'vigour. the great axle turns because the bearings are true.',
    'advancement. the small door opens onto a great room.',
    'injury and obscuration. the eclipse is brief; the sun remembers.',
    'the household. the hearth is the first altar.',
    'polarity. two stones strike; the spark is the third thing.',
    'difficulty. the river meets the rock and the rock is patient.',
    'release. the knot undone is not undone — it is remembered as undone.',
    'diminution. to empty is to fill; to fill is to spill.',
    'growth. the vine that climbs covers the wall.',
    'breakthrough. the spring breaks the ice because the ice forgot to move.',
    'encounter. the meeting at the crossroads.',
    'assembly. many small fires make a great warmth.',
    'ascent. the shoot does not hurry; the light is patient.',
    'exhaustion. even the mountain crumbles under its own weight.',
    'nourishment. the well does not move; the village comes to it.',
    'change. what was solid becomes air; what was air becomes song.',
    'transformation. the cauldron does not boil itself.',
    'shock. the thunder does not apologise.',
    'meditation. the mountain does not think; it knows.',
    'gradual growth. the bamboo bends first, then rises.',
    'the lesser path. the second marriage is the practical one.',
    'fullness. the cup brims but does not spill.',
    'the road. the wanderer keeps no hearth but carries the fire.',
    'softness. the lake yields to the wind; the wind remembers the lake.',
    'joy. the lake reflects the sky without keeping it.',
    'dissolution. the salt returns to the sea that gave it.',
    'measure. the cup without a bottom cannot hold.',
    'sincerity. the inner and outer meet without negotiation.',
    'excess of the small. the grain of sand is heavier than the wave.',
    'order. the after-state, the slow exhale.',
    'transition. the before-state, the held breath.'
  ];
  // Pre-computed lookup from the standard 64-hexagram binary patterns.
  var HEXAGRAM_PATTERNS = [
    '111111','000000','100010','010001','111010','010111','010000','000010',
    '111011','110111','111000','000111','101111','111101','001000','000100',
    '011001','100110','110000','000011','100101','101001','000001','100000',
    '100111','111001','100001','011110','010010','101101','001110','011100',
    '001111','111100','000101','101000','101011','110101','001010','010100',
    '110001','100011','111110','011111','000110','011000','010110','011010',
    '101110','011101','100100','001001','110100','001011','101100','001101',
    '110110','011011','110010','010011','110011','001100','010101','101010'
  ];

  // Lookup mirrors data/hexagrams.json: { pattern, number, name, interpretation }.
  // desc is kept as an alias for saves written before the mirror.
  function hexagramForPattern(pat) {
    var idx = HEXAGRAM_PATTERNS.indexOf(pat);
    if (idx < 0) return null;
    return {
      name: HEXAGRAM_NAMES[idx],
      interpretation: HEXAGRAM_DESCRIPTIONS[idx],
      desc: HEXAGRAM_DESCRIPTIONS[idx],
      number: idx + 1,
      pattern: HEXAGRAM_PATTERNS[idx]
    };
  }

  // ─── state ──────────────────────────────────────────────────────────
  var mode = 'tarot';
  var drawn = [];        // indices currently out of the stack (kept cards)
  var pendingCard = null;
  var pendingHex = null; // { pattern, lines } awaiting keep/discard
  var ichingLines = [];  // 6 entries: { primary: 0|1, changing: bool }
  var tossing = false;

  function el(id) { return document.getElementById(id); }
  function deckBtn() { return el('divination-draw'); }
  function areaEl() { return el('divination-card-area'); }
  function hintEl() { return el('divination-card-hint'); }
  function inputEl() { return el('divination-input'); }
  function slateEl() { return el('divination-slate'); }
  function tallyEl() { return el('divination-tally'); }
  function castBtn() { return el('divination-cast'); }
  function castNote() { return el('divination-cast-note'); }
  function hexEl() { return el('divination-hexagram'); }
  function resultEl() { return el('divination-iching-result'); }
  function subEl() { return el('divination-sub'); }

  function play(kind) {
    if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play(kind); } catch (e) {} }
  }

  // on the small table the chalked column grows below the fold — bring the
  // new line into view (reduced-motion visitors get the jump, not the glide)
  function compactTable() {
    try { return window.matchMedia('(max-width: 700px), (max-height: 560px)').matches; } catch (e) { return false; }
  }
  function revealInView(node) {
    if (!node || !compactTable()) return;
    var smooth = true;
    try { smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    node.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
  }

  // ─── the slate: one question serves both games; it turns to face the house ──
  function question() {
    var q = inputEl() ? inputEl().value : '';
    return q.trim();
  }
  function wireSlate() {
    var input = inputEl();
    var slate = slateEl();
    if (!input || !slate) return;
    // the chalk turns when you stop writing — it faces the house, not you
    input.addEventListener('blur', function () { if (input.value.trim()) slate.classList.add('turned'); });
    input.addEventListener('focus', function () { slate.classList.remove('turned'); });
  }

  // ─── rainy nights: Arcana catches the rephrase ─────────────────────
  // Sitting-local only (this array dies with the page — nothing stored,
  // nothing written): if tonight's slate shares its bones with an earlier
  // question asked sideways, the rim says so in chalk and the draw still
  // proceeds. She refuses to pretend with you, not to read for you.
  var askedQs = [];
  var STOPWORDS = ['what', 'should', 'with', 'about', 'does', 'will', 'when',
    'they', 'them', 'this', 'that', 'from', 'your', 'like', 'feel', 'feeling',
    'tonight', 'today', 'there', 'have', 'been', 'were', 'would', 'could',
    'the', 'and', 'for', 'are', 'you', 'she', 'him', 'her', 'his', 'was',
    'over', 'under', 'into'];
  function sigWords(q) {
    return String(q || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/)
      .filter(function (w) { return w.length > 2 && STOPWORDS.indexOf(w) < 0; });
  }
  function stem(w) {
    var s = String(w || '');
    if (s.length > 5 && s.slice(-3) === 'ing') s = s.slice(0, -3);
    else if (s.length > 4 && s.slice(-2) === 'ed') s = s.slice(0, -2);
    else if (s.length > 4 && s.slice(-2) === 'es') s = s.slice(0, -2);
    else if (s.length > 3 && s.slice(-1) === 's') s = s.slice(0, -1);
    if (s.length > 3 && s.slice(-1) === 'e') s = s.slice(0, -1);
    s = s.replace(/(.)\1$/, '$1');
    return s;
  }
  function sameBone(a, b) {
    if (a === b) return true;
    var sa = stem(a), sb = stem(b);
    if (sa.length > 2 && sa === sb) return true;
    if (a.length >= 4 && b.indexOf(a) === 0) return true;
    if (b.length >= 4 && a.indexOf(b) === 0) return true;
    return false;
  }
  function isSideways(cur, prior) {
    if (!cur || !prior || cur === prior) return false;
    var a = sigWords(cur), b = sigWords(prior);
    if (!a.length || !b.length) return false;
    var shared = 0, i, j;
    for (i = 0; i < a.length; i++) {
      for (j = 0; j < b.length; j++) {
        if (sameBone(a[i], b[j])) { shared++; break; }
      }
    }
    return shared >= 2;
  }
  function rainySideways() {
    var sh = false;
    try { sh = !!((window.Liber && window.Liber.state && window.Liber.state.get() || {}).shadowOn); } catch (e) {}
    if (!sh) return;
    var cur = question();
    var note = el('divination-rim-sideways');
    if (note) note.classList.remove('shown');
    if (cur) {
      for (var i = 0; i < askedQs.length; i++) {
        if (isSideways(cur, askedQs[i])) {
          var note = el('divination-rim-sideways');
          if (note) {
            var prior = askedQs[i].length > 30 ? askedQs[i].slice(0, 29) + '…' : askedQs[i];
            note.textContent = 'sideways — asked as \u201c' + prior + '\u201d';
            note.classList.add('shown');
            setTimeout(function () { note.classList.remove('shown'); }, 6000);
          }
          break;
        }
      }
      askedQs.push(cur);
      if (askedQs.length > 12) askedQs.shift();
    }
  }

  // ─── tarot: a stack with weight ─────────────────────────────────────
  function updateTally() {
    if (!tallyEl()) return;
    var left = DECK.length - drawn.length;
    tallyEl().textContent = left === DECK.length ? '' : (left + ' remain');
  }

  function pickCard() {
    var i;
    do { i = Math.floor(Math.random() * DECK.length); }
    while (drawn.indexOf(i) !== -1);
    drawn.push(i);
    return DECK[i];
  }

  // the draw: the top card slides from the stack, then the prompt offers it
  function drawFromStack() {
    if (pendingCard || pendingHex) return;
    if (drawn.length >= DECK.length) {
      if (subEl()) subEl().textContent = 'the deck is out. it was counted three times.';
      return;
    }
    var card = pickCard();
    play('thunk');
    rainySideways();
    var deck = deckBtn();
    if (deck) {
      deck.classList.add('drawing');
      setTimeout(function () { deck.classList.remove('drawing'); }, 380);
    }
    pendingCard = card;
    updateTally();
    openPrompt(renderCardPrompt(card));
  }

  function questionLine() {
    var q = question();
    return q ? '"' + q + '"' : '(unguided draw)';
  }

  function seedEl() { return el('divination-seed'); }
  function ichingSeedEl() { return el('divination-iching-seed'); }
  function feltEl() { return document.querySelector('.divination-felt'); }
  // the kept record's own number — the existing book path (Liber.state id),
  // shown alongside the reading. No new shuffle, no new random.
  function paintSeed(node, entry) {
    if (!node) return;
    if (!entry || !entry.id) { node.textContent = ''; return; }
    node.textContent = String(entry.id);
  }

  // ─── the unified keep prompt ────────────────────────────────────────
  // Hash-driven so back closes it: open sets #keep, close clears it.
  var hashLock = false;
  function setHash(h) {
    try {
      if ((location.hash || '') === h) return;
      hashLock = true;
      if (!h) history.back();
      else location.hash = h;
    } catch (e) { hashLock = false; }
  }
  function syncBackground() {
    var felt = feltEl();
    if (!felt) return;
    var prompt = el('divination-save-prompt');
    var raison = el('divination-raison');
    var busy = (!!prompt && prompt.classList.contains('open')) ||
      (!!raison && raison.classList.contains('open'));
    if (busy) felt.setAttribute('inert', '');
    else felt.removeAttribute('inert');
  }
  function openPrompt(bodyHTML) {
    var prompt = el('divination-save-prompt');
    var body = el('divination-save-prompt-body');
    if (!prompt) return;
    if (body) body.innerHTML = bodyHTML;
    prompt.classList.add('open');
    prompt.removeAttribute('inert');
    syncBackground();
    setHash('#keep');
    var keep = el('divination-save-prompt-keep');
    if (keep) { try { keep.focus({ preventScroll: true }); } catch (e) { try { keep.focus(); } catch (f) {} } }
  }
  function closePrompt() {
    var prompt = el('divination-save-prompt');
    if (!prompt) return;
    prompt.classList.remove('open');
    prompt.setAttribute('inert', '');
    syncBackground();
    if ((location.hash || '') === '#keep' && !hashLock) {
      try { history.back(); } catch (e) {}
    }
  }

  function renderCardPrompt(card) {
    return '<div class="divination-prompt-card">'
      + '<div class="divination-prompt-card-face">'
      + '<div class="divination-prompt-card-num">' + String(card.n).padStart(2, '0') + ' / 22</div>'
      + '<div class="divination-prompt-card-glyph">' + card.g + '</div>'
      + '<div class="divination-prompt-card-name">' + card.name + '</div>'
      + '</div>'
      + '<div class="divination-prompt-card-read">'
      + '<div class="divination-prompt-card-key">' + cardReading(card) + '</div>'
      + '<div class="divination-prompt-card-lens">' + lensLine() + '</div>'
      + '<div class="divination-prompt-card-q">question: ' + questionLine() + '</div>'
      + '</div>'
      + '</div>';
  }

  function renderHexPrompt(hex, pattern) {
    var rows = '';
    for (var r = 5; r >= 0; r--) {
      var yin = pattern[r] === '0';
      rows += '<div class="divination-hexagram-row' + (yin ? '' : '') + '" style="width:92px;height:8px">'
        + (yin
          ? '<i class="divination-hexagram-seg left"></i><i class="divination-hexagram-seg right"></i>'
          : '<i class="divination-hexagram-seg full"></i><i class="divination-hexagram-seg full"></i>')
        + '</div>';
    }
    var numLine = 'nº ' + hex.number + ' · ' + hex.pattern;
    return '<div class="divination-prompt-card">'
      + '<div class="divination-prompt-card-face" style="flex-direction:column-reverse;display:flex;gap:5px;justify-content:center">'
      + rows
      + '</div>'
      + '<div class="divination-prompt-card-read">'
      + '<div class="divination-prompt-card-key">' + hex.name + ' — ' + numLine + '</div>'
      + '<div class="divination-prompt-card-key">' + hexReading(hex) + '</div>'
      + '<div class="divination-prompt-card-lens">' + lensLine() + '</div>'
      + '<div class="divination-prompt-card-q">question: ' + questionLine() + '</div>'
      + '</div>'
      + '</div>';
  }

  // keep: the same shelf, the same shape of record, for both games.
  // The journal opens kept divination artifacts as name + reading +
  // question + seed (bodyOf joins question, reading, name), so reading
  // must carry the full text — upright[0] / interpretation.
  function keepDraw() {
    if (pendingCard) {
      var card = pendingCard;
      var cardLine = cardReading(card);
      var entry = window.Liber.state.addArtifact('divination', WL(0, {
        name: card.name, key: cardLine, n: card.n, g: card.g,
        reading: cardLine, question: question(), ts: Date.now()
      }));
      revealCard(card);
      paintSeed(seedEl(), entry);
      paintSeed(ichingSeedEl(), null);
      play('chime');
    } else if (pendingHex) {
      var hex = hexagramForPattern(pendingHex.pattern);
      var hexLine = hexReading(hex);
      var hexEntry = window.Liber.state.addArtifact('divination', WL(0, {
        name: hex.name, desc: hexLine, reading: hexLine,
        interpretation: hexLine, number: hex.number,
        pattern: pendingHex.pattern, question: question(), ts: Date.now()
      }));
      showHexResult(hex, pendingHex.pattern);
      paintSeed(ichingSeedEl(), hexEntry);
      paintSeed(seedEl(), null);
      revealInView(resultEl());
      play('chime');
    }
    pendingCard = null;
    pendingHex = null;
    closePrompt();
  }

  function discardDraw() {
    if (pendingCard) {
      // the card goes back in the stack
      drawn.pop();
      updateTally();
      pendingCard = null;
      clearReadingPlace();
    } else if (pendingHex) {
      pendingHex = null;
      resetIChing();
    }
    closePrompt();
  }

  // ─── the reading place ──────────────────────────────────────────────
  function clearReadingPlace() {
    var area = areaEl();
    if (!area) return;
    var card = area.querySelector('.divination-card');
    if (card) card.remove();
    if (hintEl()) hintEl().style.display = '';
    var eye = area.querySelector('.divination-chalk-eye');
    if (eye) eye.style.opacity = '';
  }

  function revealCard(card) {
    var area = areaEl();
    if (!area) return;
    clearReadingPlace();
    if (hintEl()) hintEl().style.display = 'none';
    var eye = area.querySelector('.divination-chalk-eye');
    if (eye) eye.style.opacity = '0.16';
    var d = document.createElement('div');
    d.className = 'divination-card';
    d.setAttribute('data-card-id', 'card-' + Date.now());
    d.innerHTML = '<div class="divination-card-num">' + String(card.n).padStart(2, '0') + ' / 22</div>'
      + '<div class="divination-card-glyph">' + card.g + '</div>'
      + '<div class="divination-card-name">' + card.name + '</div>'
      + '<div class="divination-card-key">' + cardReading(card) + '</div>'
      + '<div class="divination-card-lens">' + lensLine() + '</div>'
      + '<div class="divination-card-stamped">— card drawn, on the desktop —</div>';
    area.appendChild(d);
  }

  // ─── i ching: three coins, six lines, bottom first ──────────────────
  function castLine() {
    if (tossing || pendingCard || pendingHex) return;
    if (ichingLines.length >= 6) return;
    tossing = true;
    var dish = castBtn();
    if (dish) dish.classList.add('tossing');
    play('click');
    setTimeout(function () {
      // the three coins: odd = yang, even = yin; a 6 or an 8 in the old
      // counting is a changing line. approximated honestly.
      var pips = 0;
      for (var c = 0; c < 3; c++) pips += Math.random() < 0.5 ? 2 : 3;
      var yang = pips >= 7;          // 7, 9 yang — 6, 8 yin
      var changing = pips === 9 || pips === 6;
      ichingLines.push({ primary: yang ? 1 : 0, changing: changing });
      tossing = false;
      if (dish) dish.classList.remove('tossing');
      renderHexagram();
      play('tick');
      if (castNote()) castNote().textContent = 'line ' + ichingLines.length + ' of 6 — ' + pips;
      revealInView(hexEl());
      if (ichingLines.length === 6) offerHexagram();
    }, 420);
  }

  function renderHexagram() {
    var h = hexEl();
    if (!h) return;
    h.innerHTML = '';
    ichingLines.slice().reverse().forEach(function (ln) {
      var row = document.createElement('div');
      row.className = 'divination-hexagram-row' + (ln.changing ? ' changing' : '');
      var s1 = document.createElement('i');
      var s2 = document.createElement('i');
      s1.className = 'divination-hexagram-seg';
      s2.className = 'divination-hexagram-seg';
      if (ln.primary === 0) { s1.classList.add('left'); s2.classList.add('right'); }
      else { s1.classList.add('full'); s2.classList.add('full'); }
      row.appendChild(s1); row.appendChild(s2);
      h.appendChild(row);
    });
  }

  function offerHexagram() {
    var pattern = ichingLines.map(function (l) { return l.primary; }).join('');
    var hex = hexagramForPattern(pattern);
    if (!hex) return;
    pendingHex = { pattern: pattern, lines: ichingLines.slice() };
    if (castBtn()) castBtn().disabled = true;   // the hexagram stands
    if (castNote()) castNote().textContent = '';
    openPrompt(renderHexPrompt(hex, pattern));
  }

  function showHexResult(hex, pattern) {
    var pat = pattern || hex.pattern || '';
    var numLine = (hex.number ? 'nº ' + hex.number + ' · ' : '') + pat;
    if (el('divination-iching-name')) el('divination-iching-name').textContent = hex.name;
    if (el('divination-iching-num')) el('divination-iching-num').textContent = numLine;
    if (el('divination-iching-desc')) el('divination-iching-desc').textContent = hexReading(hex);
    if (el('divination-iching-lens')) el('divination-iching-lens').textContent = lensLine();
    if (resultEl()) resultEl().hidden = false;
    if (castBtn()) castBtn().disabled = true;
  }

  function resetIChing() {
    ichingLines = [];
    pendingHex = null;
    renderHexagram();
    var h = hexEl();
    if (h) h.innerHTML = '<div class="divination-hexagram-empty">six lines, chalked bottom first.</div>';
    if (resultEl()) resultEl().hidden = true;
    if (castBtn()) castBtn().disabled = false;
    if (castNote()) castNote().textContent = '';
  }

  // ─── mode switching ─────────────────────────────────────────────────
  function modeBtns() { return Array.prototype.slice.call(document.querySelectorAll('.divination-mode')); }
  function setMode(next, focusIt) {
    mode = next;
    var tarot = el('divination-tarot');
    var iching = el('divination-iching');
    if (tarot) tarot.hidden = (next !== 'tarot');
    if (iching) iching.hidden = (next !== 'iching');
    if (subEl()) subEl().textContent = next === 'iching'
      ? 'three coins · six lines · bottom first'
      : 'the deck · 22, counted three times';
    var btns = modeBtns();
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].dataset.mode === next;
      btns[i].classList.toggle('active', on);
      btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
      btns[i].tabIndex = on ? 0 : -1;
      if (on && focusIt) { try { btns[i].focus(); } catch (e) {} }
    }
  }
  function wireModeRoving() {
    var bar = el('divination-modes');
    if (!bar) return;
    bar.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Home' && k !== 'End') return;
      e.preventDefault();
      var btns = modeBtns();
      if (!btns.length) return;
      var cur = btns.indexOf(document.activeElement);
      if (cur < 0) cur = (mode === 'iching') ? 1 : 0;
      var next = cur;
      if (k === 'ArrowRight') next = (cur + 1) % btns.length;
      else if (k === 'ArrowLeft') next = (cur - 1 + btns.length) % btns.length;
      else if (k === 'Home') next = 0;
      else if (k === 'End') next = btns.length - 1;
      setMode(btns[next].dataset.mode, true);
    });
  }

  // ─── boot ───────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var drawBtn = deckBtn();
    if (drawBtn) drawBtn.addEventListener('click', drawFromStack);
    if (inputEl()) inputEl().addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'tarot') drawFromStack(); else castLine();
      }
    });
    wireSlate();
    updateTally();

    var modeBtns = document.querySelectorAll('.divination-mode');
    for (var i = 0; i < modeBtns.length; i++) {
      modeBtns[i].addEventListener('click', function () { setMode(this.dataset.mode); });
    }
    wireModeRoving();

    var cast = castBtn();
    if (cast) cast.addEventListener('click', castLine);

    var exit = el('divination-exit');
    if (exit) exit.addEventListener('click', function () {
      if (history.length > 1) history.back(); else location.href = 'desktop.html';
    });

    var helpBtn = el('divination-help');
    var raison = el('divination-raison');
    var raisonClose = el('divination-raison-close');
    var lastFocus = null;
    function openR() {
      if (raison) {
        try { lastFocus = document.activeElement; } catch (e) { lastFocus = null; }
        raison.classList.add('open'); raison.removeAttribute('inert');
        syncBackground();
        if ((location.hash || '') !== '#note') { try { location.hash = '#note'; } catch (e) {} }
        if (raisonClose) { try { raisonClose.focus(); } catch (e) {} }
      }
    }
    function closeR() {
      if (raison) {
        raison.classList.remove('open'); raison.setAttribute('inert', '');
        syncBackground();
        if ((location.hash || '') === '#note') { try { history.back(); } catch (e) {} }
        if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { try { lastFocus.focus(); } catch (f) {} } }
      }
    }
    if (helpBtn) helpBtn.addEventListener('click', openR);
    if (raisonClose) raisonClose.addEventListener('click', closeR);
    if (raison) raison.addEventListener('click', function (e) { if (e.target === raison) closeR(); });
    if (window.LiberRoomShell) window.LiberRoomShell.bindRoomOverlays({ overlays: [
      { id: 'divination-raison', close: closeR }
    ] });

    var keepBtn = el('divination-save-prompt-keep');
    var discardBtn = el('divination-save-prompt-discard');
    var closeBtn = el('divination-save-prompt-close');
    function cancelPrompt() {
      if (pendingCard) { drawn.pop(); updateTally(); pendingCard = null; clearReadingPlace(); }
      if (pendingHex) { resetIChing(); }   // escape must not strand the cast
      pendingHex = null;
      closePrompt();
    }
    if (window.LiberRoomShell) window.LiberRoomShell.bindRoomOverlays({ overlays: [
      { id: 'divination-save-prompt', close: cancelPrompt }
    ] });
    if (window.LiberRoomShell.bindConfirmKey) window.LiberRoomShell.bindConfirmKey(['divination-save-prompt']);
    if (keepBtn) keepBtn.addEventListener('click', keepDraw);
    if (discardBtn) discardBtn.addEventListener('click', discardDraw);
    if (closeBtn) closeBtn.addEventListener('click', cancelPrompt);
    var promptEl = el('divination-save-prompt');
    if (promptEl) promptEl.addEventListener('click', function (e) { if (e.target === promptEl) cancelPrompt(); });
    // back-button close: leaving #keep / #note dismisses instead of leaving
    window.addEventListener('hashchange', function () {
      if (hashLock) { hashLock = false; return; }
      var h = location.hash || '';
      var prompt = el('divination-save-prompt');
      var raisonEl = el('divination-raison');
      if (h !== '#keep' && prompt && prompt.classList.contains('open')) cancelPrompt();
      if (h !== '#note' && raisonEl && raisonEl.classList.contains('open')) closeR();
    });

    // ── Riason's artifact-birth demo (tutorial stage 'divdemo') ─────────
    // A fake copy of the tent, like the buddy demo in sigil.js: Riason
    // asks, draws, and bursts the card on the felt. Writes nothing — the
    // pending draw is unwound, the closed prompt leaves no record.
    try {
      var tut = (window.Liber && window.Liber.state && window.Liber.state.get().tutorialStage) || null;
      if (tut === 'divdemo') runDivDemo();
    } catch (e) {}
    // 2.13.0: the tutorial's hand-off. The tent opens from black on the
    // side the stone's curtain closed (same layer, same duration), so the
    // step from the buddy demo to Arcana reads as one movement through the
    // house rather than two page loads.
    function curtainIn() {
      var reduced = false;
      try { reduced = !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      if (reduced) return;
      var veil = document.createElement('div');
      veil.className = 'div-curtain';
      veil.setAttribute('aria-hidden', 'true');
      veil.style.opacity = '1';
      document.body.appendChild(veil);
      void veil.offsetWidth;
      requestAnimationFrame(function () { veil.style.opacity = '0'; });
      setTimeout(function () { if (veil.parentNode) veil.parentNode.removeChild(veil); }, 900);
    }
    function curtainOut(done) {
      var reduced = false;
      try { reduced = !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      if (reduced) { done(); return; }
      var veil = document.createElement('div');
      veil.className = 'div-curtain';
      veil.setAttribute('aria-hidden', 'true');
      document.body.appendChild(veil);
      void veil.offsetWidth;
      veil.classList.add('go');
      setTimeout(done, 620);
    }
    function runDivDemo() {
      curtainIn();
      var bar = document.createElement('div');
      bar.className = 'divination-demo';
      bar.innerHTML = '<div class="divination-demo-voice">riason</div><div class="divination-demo-line"></div><button type="button" class="divination-demo-next" hidden>&gt;&gt;</button>';
      document.body.appendChild(bar);
      var veil = document.createElement('div');
      veil.className = 'divination-veil';
      document.body.appendChild(veil);
      var lineEl = bar.querySelector('.divination-demo-line');
      var nextBtn = bar.querySelector('.divination-demo-next');
      function say(t) { if (lineEl) lineEl.textContent = t; }
      function deny() {
        say('Not yet. Let me finish this.');
        veil.classList.remove('deny');
        void veil.offsetWidth;
        veil.classList.add('deny');
        play('thunk');
        setTimeout(function () { veil.classList.remove('deny'); }, 600);
      }
      veil.addEventListener('pointerdown', deny);
      function alive() { return document.body.contains(bar); }
      function after(ms, fn) { setTimeout(function () { if (alive() && fn) fn(); }, ms); }
      function showNext() { if (nextBtn && alive()) nextBtn.hidden = false; }
      function hideNext() { if (nextBtn) nextBtn.hidden = true; }
      function goBind() {
        var st = (window.Liber && window.Liber.state) || null;
        if (st) st.set({ tutorialStage: 'bind' });
        say('Take the card with you. The desktop is next \u2014 keep it there, and bind it to your buddy.');
        after(2000, function () {
          curtainOut(function () {
            if (bar.parentNode) bar.parentNode.removeChild(bar);
            if (veil.parentNode) veil.parentNode.removeChild(veil);
            window.location.href = 'desktop.html';
          });
        });
      }
      function burstOnFelt() {
        var felt = feltEl();
        if (!felt) return;
        var reduced = false;
        try { reduced = !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
        var b = document.createElement('div');
        b.className = 'div-demo-burst';
        b.setAttribute('aria-hidden', 'true');
        if (!reduced) {
          for (var i = 0; i < 18; i++) {
            var a = (i * 137.5) * Math.PI / 180;
            var s = document.createElement('span');
            s.className = 'div-demo-bit';
            s.style.setProperty('--dx', Math.cos(a).toFixed(2));
            s.style.setProperty('--dy', Math.sin(a).toFixed(2));
            b.appendChild(s);
          }
          felt.appendChild(b);
          play('chime');
          setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 1100);
        }
      }
      var stepIdx = 0;
      if (nextBtn) nextBtn.addEventListener('click', function () {
        hideNext();
        stepIdx++;
        runStep();
      });
      function runStep() {
        if (!alive()) return;
        if (stepIdx === 0) {
          say('This is Arcana\u2019s tent. Everything here becomes an artifact if you keep it \u2014 watch the felt.');
          showNext();
        } else if (stepIdx === 1) {
          say('First she needs a question. Mine, not yours \u2014 yours comes later.');
          var input = inputEl();
          if (input) {
            input.value = 'what does the new traveller need?';
            var slate = slateEl();
            if (slate) slate.classList.add('turned');
          }
          after(1200, showNext);
        } else if (stepIdx === 2) {
          say('One slides out. That prompt is the artifact asking to be born.');
          var deck = deckBtn();
          if (deck) { try { deck.click(); } catch (e) {} }
          after(900, showNext);
        } else if (stepIdx === 3) {
          say('Had I kept it, that burst is the birth. Yours goes with you: on the desktop you keep it, and you tell it what it means to your buddy.');
          var keep = el('divination-save-prompt-keep');
          if (keep) keep.classList.add('demo-hit');
          after(700, function () {
            if (keep) keep.classList.remove('demo-hit');
            // unwind the real draw: no record, no tally, no reading place.
            if (pendingCard && drawn.length) drawn.pop();
            pendingCard = null;
            pendingHex = null;
            try { updateTally(); } catch (e) {}
            try { clearReadingPlace(); } catch (e) {}
            try { closePrompt(); } catch (e) {}
            burstOnFelt();
            after(1400, showNext);
          });
        } else {
          goBind();
        }
      }
      runStep();
    }
  });
})();
