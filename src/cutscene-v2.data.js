// cutscene-v2.data.js — Liber Vacui tutorial V3.
// Dialogue is authored exactly as supplied by the V3 script. This file is
// content only; src/cutscene.js owns timing, bodies, gates, and effects.
(function (global) {
  'use strict';

  // The four lines escalate through four changes to the SCREEN, exactly as the
  // V3 script lists them: hairline cracks in the bezel, stars populating the
  // monitor, a distant warm colour entering the CRT, and a new chatbox
  // building itself out of the fractures. (An earlier pass had the last two
  // effects on the wrong lines, so the warm light never arrived and the
  // chatbox assembled one line early.)
  var RITUAL = [
    { text: 'I summon you from somewhere else…', effect: 'pink-cracks' },
    { text: 'To find the pieces of ourselves', effect: 'starfield' },
    { text: 'With violet eyes and sun like skin…', effect: 'warm-weather' },
    { text: 'Come to the void and sing again…', effect: 'chatbox-construct' }
  ];

  // kind: dialogue | arrival | ritual | poppet-app | poppet-door |
  // poppet-draw | poppet-keep | artifact | breach | finale.
  // Every dialogue beat receives the existing progress gate. Angle-bracket
  // responses remain player choices; >> remains a simple progress response.
  var BEATS = [
    { id: 'beat-001', speaker: 'liber-vacui', kind: 'dialogue', text: 'Oh hello <name>!', response: '>>', effect: 'opening-disturbance' },
    { id: 'beat-006', speaker: 'liber-vacui', kind: 'dialogue', text: 'We are just starting this journey. We can cast a spell and summon some help.', response: 'a spell?' },
    { id: 'beat-007', speaker: 'liber-vacui', kind: 'dialogue', text: 'Yes. On the next screen I will conjure up some text, type it and my friend out here in the imaginary world will come assist us.', response: 'okay..' },
    { id: 'beat-008', speaker: 'liber-vacui', kind: 'ritual', text: '', response: '' },
    { id: 'beat-009', speaker: 'wanderlust', kind: 'arrival', text: 'Oh, a new traveller! How exciting! Hello <you>, how are you?', tone: 'jovial', effect: 'infection', grand: true },
    { id: 'beat-010', speaker: 'liber-vacui', kind: 'dialogue', text: 'Scared, it\'s dark and cold.', response: '>>', tone: 'still' },
    { id: 'beat-011', speaker: 'wanderlust', kind: 'dialogue', text: 'OH! You\'re so right, let me fix that.', response: '>>', effect: 'infection', tone: 'jovial' },
    { id: 'beat-012', speaker: 'liber-vacui', kind: 'dialogue', text: 'Nothing happened', response: '>>', tone: 'still' },
    { id: 'beat-013', speaker: 'wanderlust', kind: 'dialogue', text: 'Oh. A fresh slate, how exciting. Let’s move the Vacui through time and get you some friends. I do love these guys.', response: '>>', effect: 'room-cycle', tone: 'suspicious' },
    { id: 'beat-014', speaker: 'wanderlust', kind: 'dialogue', text: 'WHOA.', response: '>>', tone: 'still' },
    { id: 'beat-015', speaker: 'wanderlust', kind: 'dialogue', text: 'Well we better make a poppet first and see what happens', response: '>>', tone: 'suspicious', auto: true },
    { id: 'beat-016', kind: 'handoff', text: '', response: '' },
    { id: 'beat-017', speaker: 'wanderlust', kind: 'arrival', text: 'OH! Aren’t you just precious!', tone: 'jovial', effect: 'finale-envelope', wait: 1400 },
    { id: 'beat-018', speaker: 'liber-vacui', kind: 'dialogue', text: 'Yay!', response: '>>', tone: 'jovial' },
    { id: 'beat-019', speaker: 'wanderlust', kind: 'dialogue', text: 'Oh and monosyllabic too. Little <name> why don’t you ask for some more travellers?', response: '>>', tone: 'jovial' },
    { id: 'beat-020', speaker: 'wanderlust', kind: 'dialogue', text: 'WOW! That was amazing!', response: '>>', tone: 'jovial' },
    { id: 'beat-021', speaker: 'liber-vacui', kind: 'dialogue', text: 'THANKS!', response: '>>', tone: 'jovial' },
    { id: 'beat-022', speaker: 'wanderlust', kind: 'dialogue', text: 'No worries, buddy.', response: '>>', tone: 'jovial' },
    { id: 'beat-002', speaker: 'liber-vacui', kind: 'dialogue', text: 'I am literally you.', response: 'no you\u2019re not..', effect: 'name-loosen' },
    { id: 'beat-003', speaker: 'liber-vacui', kind: 'dialogue', text: 'Okay let me explain. In this artifact, the liber vacui, the imaginary and real are the same thing.', response: 'so I am playing pretend?', effect: 'floor-inscription' },
    { id: 'beat-004', speaker: 'liber-vacui', kind: 'dialogue', text: 'You could look at it that way, if you want. You actually prefer to define yourself with research backed terminology.', response: 'why are you saying \u2018you\u2019' },
    { id: 'beat-005', speaker: 'liber-vacui', kind: 'dialogue', text: 'For instance, that is object-relational theory. By yourself identifying uh.. itself.. with..', response: 'this is confusing' },
    { id: 'beat-006-close', speaker: 'liber-vacui', kind: 'dialogue', text: 'You\u2019re right. After all, we are just starting this journey.', response: '>>' },
    { id: 'beat-023', speaker: 'wanderlust', kind: 'dialogue', text: 'I think it’s time I let you explore. More changes are to come', response: '>>', tone: 'suspicious' },
    { id: 'beat-024', kind: 'rat', text: '', response: '' },
    { id: 'beat-025', speaker: 'wanderlust', kind: 'dialogue', text: 'The fourth wall breaks. RAT — thank you for the watch. Go carefully.', response: '>>', tone: 'still' },
    { id: 'beat-026', speaker: 'rat', kind: 'dialogue', text: 'Understood. I built this; I can let it go. Good luck in there.', response: '>>', tone: 'still', effect: 'skulks-away' },
    { id: 'beat-027', speaker: 'wanderlust', kind: 'dialogue', text: 'Before you continue, let me leave you with some parting words:', response: '>>', tone: 'suspicious' },
    { id: 'beat-028', speaker: 'liber-vacui', kind: 'finale', text: 'I ARISE THE SAME BUT DIFFERENT', response: '' }
  ];

  // Production metadata is deliberately derived from the authored rows. The
  // prose above remains the source of truth; this table only gives the stage
  // controller a deterministic visual contract for each line.
  var PRODUCTION = BEATS.map(function (beat) {
    var action = beat.kind === 'ritual' || beat.kind.indexOf('poppet') === 0 || beat.kind === 'artifact';
    var response = beat.response || '';
    var mode = action ? 'action-lock' : (response && response !== '>>' ? 'choice' : 'advance');
    var effect = beat.effect || 'voice-pulse';
    var speaker = beat.speaker || 'liber-vacui';
    var anchor = speaker === 'wanderlust' ? 'upper-right' : speaker === 'riason' ? 'left-middle' : speaker === 'physius' ? 'lower-left' : speaker === 'arcana' ? 'right-middle' : speaker === 'vanir' ? 'far-right' : 'near-focus';
    var surface = beat.kind === 'ritual' ? 'ritual' :
      (beat.kind.indexOf('poppet') === 0 ? 'poppet-worktable' :
      (beat.kind === 'artifact' ? 'relation-card' :
      (beat.kind === 'breach' || beat.kind === 'finale' ? 'full-machine' : 'cast-box')));
    var authority = beat.authority || (beat.kind === 'ritual' ? 'machine' : speaker);
    return {
      id: beat.id,
      speaker: speaker,
      text: beat.text || '',
      response: response,
      effect: effect,
      mode: mode,
      anchor: anchor,
      authority: authority,
      surface: surface,
      timing: {
        enter: beat.enterHold || (beat.kind === 'arrival' ? 520 : 0),
        hold: beat.holdMs || (beat.kind === 'arrival' ? 1700 : 0),
        handoff: beat.handoffMs || (beat.kind === 'ritual' ? 450 : 0)
      },
      carry: beat.carry || {
        residue: beat.consequence || effect,
        relationship: beat.kind === 'artifact' ? 'attempted-relation' : null
      },
      enter: beat.enter || ('body:' + speaker),
      hold: beat.hold || (beat.kind === 'ritual' ? 'until-action-complete' : 'line-complete'),
      exit: beat.exit || (effect === 'shrink-to-themes' ? 'suction' : effect === 'skulks-away' ? 'withdraw' : 'settle'),
      consequence: beat.consequence || effect,
      nextMode: beat.nextMode || (mode === 'action-lock' ? 'advance' : 'dialogue')
    };
  });

  global.CutsceneV2Data = { RITUAL: RITUAL, BEATS: BEATS, PRODUCTION: PRODUCTION };
})(window);
