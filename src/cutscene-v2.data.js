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

  // The stable IDs in this script are the source of truth for the new
  // desktop-opening-v2 cursor. Manifestations reuse Wanderlust's one plate.
  var BEATS = [
    { id: 'opening-y-01', speaker: 'liber-vacui', kind: 'dialogue', text: 'Ugh.. What just happened.', response: '>>', effect: 'opening-reflection' },
    { id: 'opening-y-02', speaker: 'liber-vacui', kind: 'dialogue', text: 'Whoa.. That\'s.. me.. Looking back at the screen?', response: '>>', effect: 'partial-recognition' },
    { id: 'opening-y-03', speaker: 'liber-vacui', kind: 'dialogue', text: 'I just typed in my name and then.. what..', response: '>>' },
    { id: 'opening-y-04', speaker: 'liber-vacui', kind: 'dialogue', text: 'I can\'t tell you how I know this but, <name>, I am you.', response: '>>', effect: 'inside-screen-reveal' },
    { id: 'opening-y-05', speaker: 'liber-vacui', kind: 'dialogue', text: 'There\'s something written on the side of the wall in here..', response: '>>', effect: 'wall-inscription' },
    { id: 'opening-y-06', speaker: 'liber-vacui', kind: 'dialogue', text: '"The Liber Vacui has temporarily borrowed a piece of your soul, it will return it stronger!"', response: '>>', effect: 'soul-inscription' },
    { id: 'opening-y-07', speaker: 'liber-vacui', kind: 'dialogue', text: 'Wait, there\'s something else written here too..', response: '>>', effect: 'wall-inscription' },
    { id: 'summoning-verse', speaker: 'liber-vacui', kind: 'ritual', text: '', response: '' },
    { id: 'wanderlust-arrival', speaker: 'wanderlust', kind: 'dialogue', text: 'OH! It\'s good to be back!!', response: '>>', tone: 'jovial', effect: 'wanderlust-arrival' },
    { id: 'y-asks-who', speaker: 'liber-vacui', kind: 'dialogue', text: 'Who are you?', response: '>>' },
    { id: 'wanderlust-names-herself', speaker: 'wanderlust', kind: 'dialogue', text: 'Oh.. I dunno, I\'ve been called a lot of things over the years.', response: '>>', tone: 'jovial', form: 'wanderlust' },
    { id: 'manat-manifestation', speaker: 'wanderlust', kind: 'dialogue', text: 'The Banu Aws understood my power, their stories still buried beneath the sand.', response: '>>', tone: 'still', form: 'manat' },
    { id: 'fates-threefold', speaker: 'wanderlust', kind: 'dialogue', text: 'I spilled my secrets of imagination and archetype to the greeks.', response: '>>', tone: 'still', form: 'fates', threefold: true },
    { id: 'morrigan-threefold', speaker: 'wanderlust', kind: 'dialogue', text: 'I instill bravery, power, and courage in those fated to suffer.', response: '>>', tone: 'still', form: 'morrigan', threefold: true },
    { id: 'wanderlust-returns', speaker: 'wanderlust', kind: 'dialogue', text: 'But you can call me Wanderlust. For that is truly what fate is, the external drive to pursue something greater.', response: '>>', tone: 'jovial', form: 'wanderlust' },
    { id: 'y-asks-why', speaker: 'liber-vacui', kind: 'dialogue', text: 'Why am I here?', response: '>>' },
    { id: 'vacui-extracts', speaker: 'wanderlust', kind: 'dialogue', text: 'The Vacui, yes, a powerful artifact indeed. This machine is able to extract minute portions of the soul into itself.', response: '>>', tone: 'still' },
    { id: 'vacui-anomalies', speaker: 'wanderlust', kind: 'dialogue', text: 'Although due to some.. anomalous properties it can draw from the imaginary and real simultaneously.', response: '>>', tone: 'still' },
    { id: 'wanderlust-finds-machine', speaker: 'wanderlust', kind: 'dialogue', text: 'It looks like you\'ve found it..', response: '>>', tone: 'suspicious' },
    { id: 'wanderlust-fourth-wall', speaker: 'wanderlust', kind: 'dialogue', text: 'Hmm.. Javascript web applet made by some.. aspiring psychologist... That won\'t do.', response: '>>', tone: 'suspicious', effect: 'code-tendrils' },
    { id: 'wanderlust-invites-travellers', speaker: 'wanderlust', kind: 'dialogue', text: 'Let\'s get some travellers who have used this in different times and pull them in here.', response: '>>', tone: 'jovial' },
    { id: 'time-travel-action', speaker: 'wanderlust', kind: 'time-travel', text: '', response: '' },
    { id: 'wanderlust-praise', speaker: 'wanderlust', kind: 'dialogue', text: 'WHOO! Good job little buddy!!', response: '>>', tone: 'jovial' },
    { id: 'y-celebrates', speaker: 'liber-vacui', kind: 'dialogue', text: 'YAY!', response: '>>', tone: 'jovial' },
    { id: 'wanderlust-first-making', speaker: 'wanderlust', kind: 'dialogue', text: 'There\'s a lot of travellers in here now.. Let\'s make you a body so you can start enjoying their apps!', response: '>>', tone: 'jovial' },
    { id: 'first-rite', speaker: 'wanderlust', kind: 'rite', text: '', response: '' },
    { id: 'post-rite-compliment', speaker: 'wanderlust', kind: 'dialogue', text: 'You look amazing, you can revisit Physius\'s lab later to see more.', response: '>>', tone: 'jovial' },
    { id: 'y-accepts', speaker: 'liber-vacui', kind: 'dialogue', text: 'Okay I will!', response: '>>', tone: 'jovial' },
    { id: 'wanderlust-mutual-care', speaker: 'wanderlust', kind: 'dialogue', text: 'And you and big <name> at the computer better get along. Be nice to each other.', response: '>>', tone: 'still' },
    { id: 'mutual-care-promise', speaker: 'wanderlust', kind: 'promise', text: '', response: '' },
    { id: 'y-care-reply', speaker: 'liber-vacui', kind: 'dialogue', text: 'And I will be nice to you! <name>', response: '>>', tone: 'jovial' },
    { id: 'wanderlust-parting-words', speaker: 'wanderlust', kind: 'dialogue', text: 'Aww. Okay, lets finish this up. Before we go I will leave you with some parting words', response: '>>', tone: 'jovial' },
    { id: 'final-inscription', kind: 'finale', text: 'I appear the same but different', response: '' }
  ];

  // Production metadata is deliberately derived from the authored rows. The
  // prose above remains the source of truth; this table only gives the stage
  // controller a deterministic visual contract for each line.
  var PRODUCTION = BEATS.map(function (beat) {
    var action = beat.kind === 'ritual' || beat.kind === 'rite' ||
      beat.kind === 'time-travel' || beat.kind === 'promise' || beat.kind === 'finale';
    var response = beat.response || '';
    var mode = action ? 'action-lock' : (response && response !== '>>' ? 'choice' : 'advance');
    var effect = beat.effect || 'voice-pulse';
    var speaker = beat.speaker || 'liber-vacui';
    var anchor = speaker === 'wanderlust' ? 'upper-right' : speaker === 'riason' ? 'left-middle' : speaker === 'physius' ? 'lower-left' : speaker === 'arcana' ? 'right-middle' : speaker === 'vanir' ? 'far-right' : 'near-focus';
    var surface = beat.kind === 'ritual' ? 'ritual' :
      (beat.kind === 'rite' ? 'poppet-worktable' :
      (beat.kind === 'time-travel' || beat.kind === 'promise' || beat.kind === 'finale'
        ? 'full-machine' : 'cast-box'));
    var authority = beat.authority ||
      (beat.kind === 'ritual' || beat.kind === 'time-travel' || beat.kind === 'promise' || beat.kind === 'finale'
        ? 'machine' : speaker);
    return {
      id: beat.id,
      speaker: speaker,
      text: beat.text || '',
      response: response,
      kind: beat.kind,
      form: beat.form || null,
      threefold: !!beat.threefold,
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
      hold: beat.hold || (beat.kind === 'ritual' ? 'until-action-complete' :
        beat.kind === 'time-travel' ? 'until-activation' :
        beat.kind === 'promise' ? 'until-submission' :
        beat.kind === 'rite' ? 'until-keep' :
        beat.kind === 'finale' ? 'until-inscription' : 'line-complete'),
      exit: beat.exit || (effect === 'shrink-to-themes' ? 'suction' : effect === 'skulks-away' ? 'withdraw' : 'settle'),
      consequence: beat.consequence || effect,
      nextMode: beat.nextMode || (mode === 'action-lock' ? 'action' : 'dialogue')
    };
  });

  global.CutsceneV2Data = { RITUAL: RITUAL, BEATS: BEATS, PRODUCTION: PRODUCTION };
})(window);
