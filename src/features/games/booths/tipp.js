// The Quiet Floor (TIPP) — extracted verbatim from the games monolith.
var TIPP_STEPS = [
  { key: 'T', name: 'temperature', body: 'Cold water on the face, the wrists, the back of the neck. The dive reflex slows the heart. The wave does not get a vote.' },
  { key: 'I', name: 'intense exercise', body: 'Ten minutes of anything vigorous — stairs, a fast walk, pushing a wall. Burn the chemistry down to a size you can carry.' },
  { key: 'P', name: 'paced breathing', body: 'In for four, out for six. Longer out-breath than in. The body reads that ratio as: the danger has passed.' },
  { key: 'P', name: 'paired relaxation', body: 'Tense a muscle group while breathing in, let it go while breathing out. Teach the body that releasing is survivable.' }
];

function playTipp(ctx, b, body) {
  var html = '<div class="tipp-ladder" id="tipp-ladder">';
  for (var i = 0; i < TIPP_STEPS.length; i++) {
    var s = TIPP_STEPS[i];
    html += '<div class="tipp-step' + (i === 0 ? '' : ' locked') + '" data-tipp-step="' + i + '">'
      + '<span class="tipp-medallion" aria-hidden="true">' + s.key + '</span>'
      + '<div class="tipp-step-main"><h4>' + s.name + '</h4><p>' + s.body + '</p>'
      + '<div class="tipp-step-actions">'
      + '<button type="button" class="games-action tipp-did" data-tipp-did="' + i + '">i did this</button>'
      + '<label class="tipp-rate' + (i === 0 ? '' : ' tipp-rate-hidden') + '">what it did: '
      + '<input type="range" min="0" max="5" step="1" value="3" data-tipp-rate="' + i + '" aria-label="how much ' + s.name + ' helped"/></label>'
      + '</div></div></div>';
  }
  html += '</div>'
    + '<div class="games-actions">'
    + '<button type="button" class="games-action" id="tipp-card">read the scribe\u2019s card</button>'
    + '<button type="button" class="games-action" id="tipp-again" hidden>start over</button>'
    + '<button type="button" class="games-action" id="tipp-keep" disabled>keep the record</button>'
    + '</div>'
    + '<div class="games-result" id="tipp-result">walk the floor in order. there is no failing here.</div>';
  body.innerHTML = html;

  var ladder = document.getElementById('tipp-ladder');
  var keep = document.getElementById('tipp-keep');
  var again = document.getElementById('tipp-again');
  var result = document.getElementById('tipp-result');
  var cardBtn = document.getElementById('tipp-card');

  // Cross-link: the four skills have a card of their own on the shelf.
  if (cardBtn) cardBtn.addEventListener('click', function () { location.href = 'learn.html#tipp'; });
  var done = [false, false, false, false];
  var ratings = [3, 3, 3, 3];

  function refresh() {
    var all = done[0] && done[1] && done[2] && done[3];
    if (keep) keep.disabled = !all;
    if (ladder) ladder.setAttribute('data-tipp-progress', String(done.filter(Boolean).length));
  }

  if (ladder) ladder.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-tipp-did]') : null;
    if (!btn || btn.dataset.did) return;
    var i = parseInt(btn.dataset.tippDid, 10);
    btn.dataset.did = '1';
    btn.textContent = 'done';
    btn.disabled = true;
    done[i] = true;
    var step = ladder.querySelector('[data-tipp-step="' + i + '"]');
    if (step) step.classList.add('done');
    var next = ladder.querySelector('[data-tipp-step="' + (i + 1) + '"]');
    if (next) next.classList.remove('locked');
    var rate = ladder.querySelector('[data-tipp-rate="' + i + '"]');
    if (rate && rate.parentElement) rate.parentElement.classList.remove('tipp-rate-hidden');
    if (result) result.textContent = i < TIPP_STEPS.length - 1
      ? 'next: ' + TIPP_STEPS[i + 1].name + '.'
      : 'the floor held. keep the record for the next storm.';
    ctx.thunk();
    refresh();
  });
  if (ladder) ladder.addEventListener('input', function (e) {
    var r = e.target.closest ? e.target.closest('[data-tipp-rate]') : null;
    if (r) ratings[parseInt(r.dataset.tippRate, 10)] = parseInt(r.value, 10);
  });
  if (again) again.addEventListener('click', function () {
    playTipp(b, body);
  });
  if (keep) keep.addEventListener('click', function () {
    var names = [];
    for (var k = 0; k < TIPP_STEPS.length; k++) names.push(TIPP_STEPS[k].name + ' ' + ratings[k] + '/5');
    var steps = [];
    for (var j = 0; j < TIPP_STEPS.length; j++) steps.push({ key: TIPP_STEPS[j].key, name: TIPP_STEPS[j].name, rating: ratings[j] });
    ctx.promptSave(b, 'walked the floor: ' + names.join(', ') + '.', function () {
      ctx.saveToDesktopAndJournal(b, { skills: steps }, tippShot(ratings));
      if (result) result.textContent = 'kept. the floor remembers.';
    }, null);
  });

  function tippShot(rt) {
    try {
      var c = document.createElement('canvas');
      c.width = 160; c.height = 160;
      var ctx = c.getContext('2d');
      var g = ctx.createLinearGradient(0, 0, 0, 160);
      g.addColorStop(0, '#16404a');
      g.addColorStop(1, '#0a1c26');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 160, 160);
      ctx.fillStyle = '#dff2f4';
      ctx.font = 'bold 34px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('T I P P', 80, 74);
      ctx.font = 'italic 13px Georgia';
      ctx.fillText('the floor held', 80, 104);
      ctx.font = '11px Courier New';
      ctx.fillText(rt.join(' · '), 80, 128, 150);
      return c.toDataURL('image/jpeg', 0.72);
    } catch (e) { return null; }
  }
}

window.LiberBooths = window.LiberBooths || {};
window.LiberBooths.tipp = playTipp;
