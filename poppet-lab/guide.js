/* poppet-lab guide.js — the first-run guided workshop, per the release script.
   Physius introduces the poppet (hermetic homunculus framing), then the player
   paints the doll through the real lesson plan — the three.js desk IS the
   tutorial surface. Each step opens the texture's next subsection (head,
   chest, arms… face: eyes/mouth/hair, then the persona cloth); the dialogue
   box gets out of the way while the traveller paints and comes back when the
   DONE button for that part is pressed. First visit makes the poppet; later
   visits are plain updates with no ceremony. Self-contained: injects its own
   styles; talks to main.js only through the hooks passed to maybeStart(). */
(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }

  /* ── styles, injected once ──
     The plate is the OG cutscene box, ported 1:1 from styles/cutscene.css:
     .ctv-body anatomy (badge, tail, head, blinking eye, voice, line), the
     .ctv-physius skin, her hermetic aura, the arrive/withdraw flights and
     the VT323 response gate. Placement classes (pv-box/pv-side) position it;
     everything visual is the cutscene's own. */
  var CSS = ''
    + '@font-face{font-family:"PhysiusDialogue";src:url("assets/fonts/cutscene/SisterPhysius.TTF") format("truetype");font-display:swap;}'
    + '.ctv-body{position:fixed;z-index:900;width:min(430px,54%);min-width:320px;min-height:118px;padding:13px 17px 16px;'
    + 'border:1px solid #8a6a20;border-radius:17px 5px 20px 7px;transform-origin:50% 100%;'
    + 'transition:filter .4s ease,opacity .35s ease;filter:drop-shadow(0 14px 18px rgba(0,0,0,.52));}'
    + '.ctv-body:before{content:"\\25CC";position:absolute;top:-18px;right:18px;width:28px;height:28px;display:grid;place-items:center;'
    + 'border:1px solid currentColor;border-radius:50%;font:20px Georgia,serif;opacity:.82;transform:rotate(12deg);'
    + 'background:inherit;box-shadow:0 0 16px currentColor;pointer-events:none;}'
    + '.ctv-body:after{content:"";position:absolute;left:28px;bottom:-10px;width:43px;height:18px;background:inherit;'
    + 'border-right:1px solid currentColor;border-bottom:1px solid currentColor;border-radius:0 0 0 18px;'
    + 'transform:skewX(-28deg) rotate(8deg);box-shadow:7px 5px 0 -5px currentColor;pointer-events:none;}'
    + '.ctv-head{position:relative;z-index:1;display:flex;align-items:center;gap:12px;margin-bottom:8px;}'
    + '.ctv-eye{position:relative;flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:2px solid #0a0503;overflow:hidden;'
    + 'background:radial-gradient(circle at 35% 30%,#fff6d8,#8a6840 55%,#1c1108 85%);box-shadow:0 0 0 2px #8a6a20,0 0 14px rgba(232,200,144,.35);}'
    + '.ctv-iris{position:absolute;inset:7px;border-radius:50%;overflow:hidden;border:2px solid rgba(0,0,0,.5);box-shadow:0 0 0 2px #e8c890;}'
    + '.ctv-pupil{position:absolute;left:50%;top:50%;width:8px;height:16px;border-radius:50%;background:#fff;'
    + 'box-shadow:0 0 8px 2px rgba(255,255,255,.8);transform:translate(-50%,-50%);animation:ctv-blink 4s infinite;}'
    + '@keyframes ctv-blink{0%,92%,100%{transform:translate(-50%,-50%) scaleY(1)}95%{transform:translate(-50%,-50%) scaleY(.06)}}'
    + '.ctv-voice{font-family:"PhysiusDialogue",Georgia,serif;font-size:1.25rem;letter-spacing:.08em;text-transform:lowercase;'
    + 'color:#d4af65;text-shadow:2px 2px 0 rgba(0,0,0,.35),0 0 12px currentColor;}'
    + '.ctv-line{position:relative;z-index:1;min-height:3.2em;font-family:"PhysiusDialogue",Georgia,serif;'
    + 'font-size:clamp(1.02rem,1.6vw,1.38rem);line-height:1.42;white-space:pre-line;color:#eee9dc;'
    + 'text-shadow:0 1px 0 rgba(0,0,0,.35);}'
    + '.ctv-line em{color:#d4af65;font-style:normal;font-weight:700;letter-spacing:.12em;}'
    + '.ctv-line:after{content:"\\258C";opacity:0;animation:ctv-cursor-haunt 1s steps(1,end) infinite;}'
    + '@keyframes ctv-cursor-haunt{0%,45%{opacity:0}46%,100%{opacity:.75}}'
    + '.ctv-physius{background:#33332f;border-color:#92928a;color:#d4af65;'
    + 'box-shadow:0 12px 28px rgba(0,0,0,.62),inset 0 0 0 1px rgba(238,232,210,.17);'
    + 'animation:ctv-physius-hover 9s ease-in-out infinite;}'
    + '.ctv-physius:before{content:"\\2609";color:#d4af65;border-radius:2px 12px 2px 2px;}'
    + '.ctv-physius .ctv-line{color:#eee9dc;}'
    + '@keyframes ctv-physius-hover{0%,100%{transform:rotate(0) translateY(0)}50%{transform:rotate(-.5deg) translateY(-4px)}}'
    + '@keyframes ctv-physius-arrive{from{opacity:0;transform:translate(42vw,18vh) rotate(18deg) scale(.55);filter:blur(14px) brightness(2)}'
    + '45%{opacity:1;transform:translate(-18px,-14px) rotate(-5deg) scale(1.05);filter:blur(0) brightness(1.4)}'
    + 'to{opacity:1;transform:translate(0) rotate(0) scale(1);filter:none}}'
    + '@keyframes ctv-physius-withdraw{to{opacity:0;transform:translate(38vw,-12vh) rotate(-14deg) scale(.45);filter:blur(9px)}}'
    + '.ctv-aura{position:absolute;inset:-10px;pointer-events:none;z-index:-1;border:1px dotted rgba(212,175,101,.35);'
    + 'border-radius:50%;animation:ctv-hermetic-turn 18s linear infinite;}'
    + '.ctv-aura i{position:absolute;display:block;width:5px;height:5px;border-radius:50%;background:#d4af65;'
    + 'box-shadow:0 0 10px #d4af65;animation:ctv-aura-drift 4s ease-in-out infinite;}'
    + '.ctv-aura i:nth-child(1){left:12%;top:22%;animation-delay:-.7s}'
    + '.ctv-aura i:nth-child(2){right:18%;top:58%;animation-delay:-2.2s}'
    + '.ctv-aura i:nth-child(3){left:61%;bottom:3%;animation-delay:-3.4s}'
    + '@keyframes ctv-aura-drift{0%,100%{transform:translate(0,0) scale(.6);opacity:.2}50%{transform:translate(12px,-15px) scale(1.5);opacity:1}}'
    + '@keyframes ctv-hermetic-turn{to{transform:rotate(360deg)}}'
    + '.pv-box{left:0;right:0;margin:0 auto;top:14%;width:min(560px,86%);}'
    + '.pv-box.pv-side{left:auto;right:22px;top:auto;bottom:22px;margin:0;width:min(430px,44%);}'
    + '.pv-box.pv-arrive{animation:ctv-physius-arrive 1.25s cubic-bezier(.18,1.35,.32,1) both;}'
    + '.pv-box.pv-gone{animation:ctv-physius-withdraw .9s cubic-bezier(.65,0,.95,.25) forwards;pointer-events:none;}'
    + '.pv-gate{display:flex;gap:10px;margin-top:12px;justify-content:flex-end;flex-wrap:wrap;}'
    + '.ctv-response{min-width:44px;min-height:44px;padding:8px 20px;font:1.15rem "VT323",monospace;color:#e8c890;'
    + 'background:rgba(30,20,12,.9);border:1px solid rgba(212,175,101,.6);cursor:pointer;}'
    + '.ctv-response:hover{border-color:#e8c890;}'
    + '.pv-more{min-width:64px;color:#d4af65;font-size:1.3rem;animation:pv-more-pulse 1.6s ease-in-out infinite;margin-right:auto;}'
    + '@keyframes pv-more-pulse{0%,100%{box-shadow:0 0 0 1px rgba(212,175,101,.25),0 0 10px rgba(212,175,101,.18)}50%{box-shadow:0 0 0 2px rgba(212,175,101,.5),0 0 22px rgba(212,175,101,.42)}}'
    + '.pv-part-plate{position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:890;width:min(430px,86%);'
    + 'display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 12px;'
    + 'background:linear-gradient(#17100a,#0b0603);border:1px solid #8a6a20;color:#e8c890;'
    + 'font:1.05rem "VT323",monospace;letter-spacing:.06em;}'
    + '.pv-bell{position:fixed;right:22px;bottom:22px;z-index:880;width:52px;height:52px;border-radius:50%;'
    + 'background:#2a2a26;border:2px solid #d4af65;color:#d4af65;font-size:1.35rem;cursor:pointer;'
    + 'box-shadow:0 8px 22px rgba(0,0,0,.55),inset 0 0 12px rgba(212,175,101,.14);display:none;}'
    + '.pv-bell:hover{filter:brightness(1.2);} .pv-bell.pv-show{display:block;}'
    + '.pv-bell.pv-ring{animation:pv-ring 1.6s ease-in-out infinite;}'
    + '@keyframes pv-ring{0%,100%{transform:rotate(0)}25%{transform:rotate(9deg)}75%{transform:rotate(-9deg)}}';
  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  /* the script beats. Every paint step drives the REAL lesson plan — the
     desk's own texture subsections — and every box hands the traveller an
     explicit proceed. Paint steps hide the box (a part plate names the
     subsection and carries the DONE button); the box re-emerges on DONE. */
  var STEPS = [
    { id: 'intro', say: 'The desk you’re standing at is where you will work — the doll is its body, the sheets its skin. I’ll walk you through the first layers.', proceed: 'OKAY' },
    { id: 'ego', say: 'This first layer is going to be the skin of your poppet — this represents your\n*EGO*.\n\nSo that’s basically what you *feel* like you are. Let’s start easy: draw the head.', part: ['body', 0], partLabel: 'paint — the skin · the head' },
    { id: 'ego-chest', say: 'The head is done. Now the chest — the body of the poppet.', part: ['body', 1], partLabel: 'paint — the skin · the chest' },
    { id: 'ego-rest', say: 'The rest of the skin works the same way: pelvis, arms, legs, hands, feet — every part of you, on the record.\n\nPaint as much of the skin as you want to. When you’re satisfied with the *EGO*, press DONE and I’ll come back.', part: ['body', 2], partLabel: 'paint — the skin · the rest of you' },
    { id: 'persona-ask', say: 'Ready to move onto the next layer?', choices: [{ t: 'YES', v: 'persona-go' }, { t: 'NOT YET', v: 'persona-wait' }], bell: true },
    { id: 'persona', say: 'This layer is for your *PERSONA* — how you want others to see you. The projection of yourself to others.\n\nLet’s start with the hair.', part: ['face', 2], partLabel: 'paint — the persona · the hair' },
    { id: 'persona-free', say: 'Nice hair.\n\nTake it from here — clothes, glasses, whatever the persona wears. When the poppet is ready for its page, press DONE.', part: ['clothes', 0], partLabel: 'paint — the persona · the cloth', free: true },
    { id: 'finale-ask', say: 'This one looks ready. Shall we put it on the page?', choices: [{ t: 'YES', v: 'finish' }, { t: 'NOT YET', v: 'persona-wait' }], bell: true }
  ];

  var state = {
    active: false, stepIdx: -1, waiting: false, stallTimer: null, hooks: null,
    box: null, line: null, btns: null, bell: null, boxed: false
  };

  /* ── the part plate: the box leaves the desk to the traveller ──
     A small plate names the texture subsection and carries the DONE button
     that says the part is finished; pressing it re-emerges the box. */
  var plate = null;
  function clearPlate() {
    clearTimeout(state.stallTimer);
    if (plate && plate.parentNode) plate.parentNode.removeChild(plate);
    plate = null;
  }
  function enterPaintMode(step) {
    clearPlate();
    if (state.box) state.box.classList.add('pv-gone');   // she withdraws, flight and all
    plate = document.createElement('div');
    plate.className = 'pv-part-plate';
    var label = document.createElement('span');
    label.textContent = step.partLabel || 'paint the part';
    var done = document.createElement('button');
    done.type = 'button';
    done.className = 'ctv-response';
    done.textContent = 'DONE';
    done.addEventListener('click', function () {
      clearPlate();
      goStep(state.stepIdx + 1);
    });
    plate.appendChild(label);
    plate.appendChild(done);
    document.body.appendChild(plate);
    state.hinted = false;
    armStallHint(step);
  }
  function armStallHint(step) {
    clearTimeout(state.stallTimer);
    state.stallTimer = setTimeout(function () {
      if (!plate) return;
      var hint = document.createElement('div');
      hint.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:870;background:rgba(34,34,31,.94);border:1px solid #92928a;color:#d4af65;font:700 .68rem/1 "Courier New",monospace;letter-spacing:.14em;padding:8px 14px;';
      hint.textContent = 'TAKE YOUR TIME — PAINT THE PART, ANY INK ON THE SHEET COUNTS';
      document.body.appendChild(hint);
      setTimeout(function () { if (hint.parentNode) hint.parentNode.removeChild(hint); }, 6000);
    }, 45000);
  }

  /* Physius speaks in authored paragraphs: a blank line (\n\n) in the script
     is a BEAT — the box finishes its line, waits for the traveller's ▸, and
     only then speaks the next paragraph in a fresh line. The final page still
     ends in the authored proceed/choices; the ▸ pages carry nothing else. */
  function splitPages(text) {
    var pages = String(text).split(/\n{2,}/)
      .map(function (s) { return s.replace(/^\n+|\n+$/g, ''); })
      .filter(function (s) { return s.length; });
    return pages.length ? pages : [String(text)];
  }

  function say(text, opts) {
    opts = opts || {};
    clearInterval(state.typer);   // a retold line never fights a stale typer
    state.pages = splitPages(text);
    state.pageIdx = 0;
    state.finalOpts = opts;
    if (!state.boxed) makeBox(opts.side);
    else if (opts.side !== undefined) boxSide(opts.side);
    state.box.classList.remove('pv-gone');   // re-arrive on every say
    clearPlate();
    showPage();
  }

  function showPage() {
    var opts = state.finalOpts;
    var last = state.pageIdx >= state.pages.length - 1;
    state.btns.innerHTML = '';
    state.btns.style.display = 'none';
    state.line.textContent = '';
    typewrite(state.line, state.pages[state.pageIdx], function () {
      if (!last) {
        // mid-speech beat: the ▸ is the only gate — no choices, no proceed
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'ctv-response pv-more';
        more.textContent = '▸';
        more.title = 'continue';
        more.addEventListener('click', function () {
          state.pageIdx += 1;
          showPage();
        });
        state.btns.style.display = 'flex';
        state.btns.appendChild(more);
        return;
      }
      state.btns.style.display = (opts.choices || opts.proceed) ? 'flex' : 'none';
      (opts.choices || []).forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'ctv-response'; b.textContent = c.t;
        b.addEventListener('click', function () { choose(c.v); });
        state.btns.appendChild(b);
      });
      if (opts.proceed) {
        // every box ends in an explicit proceed — the traveller never
        // guesses that ink is the gate
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'ctv-response'; b.textContent = opts.proceed;
        b.addEventListener('click', function () { if (opts.onProceed) opts.onProceed(); });
        state.btns.appendChild(b);
      }
      if (opts.done) opts.done();
    });
  }
  function typewrite(node, text, done) {
    var i = 0, out = '';
    state.emOn = false;   // emphasis markers always open a fresh pair
    clearInterval(state.typer);
    state.typer = setInterval(function () {
      if (i >= text.length) { clearInterval(state.typer); if (done) done(); return; }
      var ch = text[i++];
      if (ch === '*') { // toggle emphasis marker
        out += state.emOn ? '</em>' : '<em>'; state.emOn = !state.emOn;
      } else out += ch;
      node.innerHTML = out;
    }, 18);
  }

  function makeBox(side) {
    // never stack boxes: a second start removes the first node's corpse.
    if (state.box && state.box.parentNode) state.box.parentNode.removeChild(state.box);
    state.box = document.createElement('div');
    state.box.className = 'ctv-body ctv-physius pv-box pv-arrive' + (side ? ' pv-side' : '');
    state.box.innerHTML = '<div class="ctv-aura" aria-hidden="true"><i></i><i></i><i></i></div>'
      + '<div class="ctv-head"><span class="ctv-eye" aria-hidden="true"><span class="ctv-iris"><span class="ctv-pupil"></span></span></span>'
      + '<span class="ctv-voice">mistress physius</span></div>'
      + '<div class="pv-line ctv-line"></div>'
      + '<div class="pv-gate"></div>';
    document.body.appendChild(state.box);
    state.line = state.box.querySelector('.pv-line');
    state.btns = state.box.querySelector('.pv-gate');
    state.boxed = true;
    // the arrive flight is a one-shot: hand the plate back to its hover
    setTimeout(function () { state.box.classList.remove('pv-arrive'); }, 1400);
  }
  function boxSide(side) { if (state.box) state.box.classList.toggle('pv-side', !!side); }

  function makeBell() {
    if (state.bell) return;
    state.bell = document.createElement('button');
    state.bell.type = 'button';
    state.bell.className = 'pv-bell';
    state.bell.textContent = '🔔';
    state.bell.title = 'Summon Physius';
    state.bell.addEventListener('click', onBell);
    document.body.appendChild(state.bell);
  }
  function bell(show, ring) {
    makeBell();
    state.bell.classList.toggle('pv-show', !!show);
    state.bell.classList.toggle('pv-ring', !!ring);
  }

  function onBell() {
    if (!state.active) { start(); return; }
    var step = STEPS[state.stepIdx];
    if (!step) return;
    if (step.id === 'persona-ask') goStep(STEPS.findIndex(function (s) { return s.id === 'persona'; }));
    else if (step.id === 'finale-ask') finish();
    else goStep(STEPS.findIndex(function (s) { return s.id === 'persona-ask'; }));
  }

  function choose(v) {
    if (v === 'begin') {
      say('Great! Let’s begin.\n\nThe poppet is based on the hermetic tradition of a homunculus — a little human, made by hand.\n\nThis was a precursor to creating the two parts of the immortal truth: the elixir of life, and the philosopher’s stone. You would bathe the homunculus within the elixir to test your theories. This works in a similar way — but about your *Self*. Each layer of the poppet represents a different part of you. I will explain as we go.', { proceed: 'OKAY', onProceed: function () { goStep(0); } });
    } else if (v === 'decline') {
      say('Take the time you need. The bell will call me when you’re ready to begin.', { done: function () { bell(true, false); boxSide(true); state.active = true; state.stepIdx = -1; } });
    } else if (v === 'persona-go') { goStep(STEPS.findIndex(function (s) { return s.id === 'persona'; })); }
    else if (v === 'persona-wait') { say('No rush. The bell is right there.', { done: function () { bell(true, false); } }); }
    else if (v === 'finish') { finish(); }
  }

  function goStep(i) {
    state.stepIdx = i;
    var step = STEPS[i];
    if (!step) { finish(); return; }
    clearTimeout(state.stallTimer);
    clearInterval(state.poll);
    bell(!!step.bell, false);
    if (step.part) {
      // the desk takes over: open the texture subsection, let the line be
      // read, THEN the box leaves and the part plate appears — order
      // matters, say() clears any plate and hiding early swallows the text.
      // NOTE: no setDollPaint(true) here — that call closes the sheet
      // overlay (setDollPaint shuts popOverlay), and the sheet IS the
      // painting surface now. The overlay's own DOLL → button still offers
      // the 3D doll whenever wanted.
      if (state.hooks.setLessonPart) state.hooks.setLessonPart(step.part[0], step.part[1]);
      say(step.say, { done: function () { setTimeout(function () { enterPaintMode(step); }, 2400); } });
      return;
    }
    if (step.free && state.hooks.setLessonFree) state.hooks.setLessonFree();
    say(step.say, {
      choices: step.choices || null,
      proceed: step.proceed || null,
      // an OKAY with no explicit destination simply hands the traveller
      // to the next beat
      onProceed: step.onProceed || (step.proceed ? function () { goStep(i + 1); } : null)
    });
  }
  function finish() {
    clearTimeout(state.stallTimer);
    clearInterval(state.poll);
    bell(false, false);
    // guided once: the gate checks this flag, not the keepsake count, so a
    // poppet kept elsewhere (tutorial rite) never silently skips guidance.
    try { localStorage.setItem('poppet.guided.v1', '1'); } catch (e) {}
    say('Then let’s send it home.');
    if (state.hooks.keep) setTimeout(function () { state.hooks.keep(); }, 1400);
    state.active = false;
  }

  function start() {
    state.active = true;
    var who = typeof state.hooks.name === 'function' ? state.hooks.name() : (state.hooks.name || 'traveller');
    say('Ah, hello! Welcome to my lab, ' + who + '.\n\nSince this is your first time here, I will help you create a poppet. This process will take a minimum of 15 minutes, and requires drawing!\n\nAfter you’ve finished, you can edit your poppet in the future — but don’t start unless you have the time to finish. You will hurt poor little ' + who + '’s feelings.', {
      choices: [{ t: 'YES', v: 'begin' }, { t: 'NO', v: 'decline' }]
    });
  }

  /* first-launch popup: centred; later Physius lines sit at the side */
  function maybeStart(hooks) {
    state.hooks = hooks;
    var trigger = hooks.shouldRun();
    if (!trigger) return;
    makeBox(false);
    start();
  }

  window.PoppetGuide = { maybeStart: maybeStart, bell: bell, isActive: function () { return state.active; } };
})();
