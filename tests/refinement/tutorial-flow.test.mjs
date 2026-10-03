import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic, plain} from './harness.mjs';

const FLOW = 'desktop-opening-v2';
const ORDER = [
  'opening-y-01', 'opening-y-02', 'opening-y-03', 'opening-y-04',
  'opening-y-05', 'opening-y-06', 'opening-y-07', 'summoning-verse',
  'wanderlust-arrival', 'y-asks-who', 'wanderlust-names-herself',
  'manat-manifestation', 'fates-threefold', 'morrigan-threefold',
  'wanderlust-returns', 'y-asks-why', 'vacui-extracts', 'vacui-anomalies',
  'wanderlust-finds-machine', 'wanderlust-fourth-wall',
  'wanderlust-invites-travellers', 'time-travel-action',
  'wanderlust-praise', 'y-celebrates', 'wanderlust-first-making',
  'first-rite', 'post-rite-compliment', 'y-accepts',
  'wanderlust-mutual-care', 'mutual-care-promise', 'y-care-reply',
  'wanderlust-parting-words', 'final-inscription'
];

async function flowRealm() {
  const realm = makeRealm();
  await runClassic('src/tutorial-flow.js', realm);
  return {realm, flow: realm.window.LiberTutorialFlow};
}

test('the replacement script preserves the exact authored opening, actions, and summoning verse', async () => {
  const realm = makeRealm();
  await runClassic('src/cutscene-v2.data.js', realm);
  const {BEATS, RITUAL, PRODUCTION} = realm.window.CutsceneV2Data;
  const text = plain(BEATS.map(beat => beat.text || ''));
  assert.deepEqual(plain(BEATS.map(beat => beat.id)), ORDER);
  assert.deepEqual(text, [
    'Ugh.. What just happened.',
    'Whoa.. That\'s.. me.. Looking back at the screen?',
    'I just typed in my name and then.. what..',
    'I can\'t tell you how I know this but, <name>, I am you.',
    'There\'s something written on the side of the wall in here..',
    '"The Liber Vacui has temporarily borrowed a piece of your soul, it will return it stronger!"',
    'Wait, there\'s something else written here too..',
    '',
    'OH! It\'s good to be back!!',
    'Who are you?',
    'Oh.. I dunno, I\'ve been called a lot of things over the years.',
    'The Banu Aws understood my power, their stories still buried beneath the sand.',
    'I spilled my secrets of imagination and archetype to the greeks.',
    'I instill bravery, power, and courage in those fated to suffer.',
    'But you can call me Wanderlust. For that is truly what fate is, the external drive to pursue something greater.',
    'Why am I here?',
    'The Vacui, yes, a powerful artifact indeed. This machine is able to extract minute portions of the soul into itself.',
    'Although due to some.. anomalous properties it can draw from the imaginary and real simultaneously.',
    'It looks like you\'ve found it..',
    'Hmm.. Javascript web applet made by some.. aspiring psychologist... That won\'t do.',
    'Let\'s get some travellers who have used this in different times and pull them in here.',
    '',
    'WHOO! Good job little buddy!!',
    'YAY!',
    'There\'s a lot of travellers in here now.. Let\'s make you a body so you can start enjoying their apps!',
    '',
    'You look amazing, you can revisit Physius\'s lab later to see more.',
    'Okay I will!',
    'And you and big <name> at the computer better get along. Be nice to each other.',
    '',
    'And I will be nice to you! <name>',
    'Aww. Okay, lets finish this up. Before we go I will leave you with some parting words',
    'I appear the same but different'
  ]);
  assert.deepEqual(plain(RITUAL), [
    {text: 'I summon you from somewhere else…', effect: 'pink-cracks'},
    {text: 'To find the pieces of ourselves', effect: 'starfield'},
    {text: 'With violet eyes and sun like skin…', effect: 'warm-weather'},
    {text: 'Come to the void and sing again…', effect: 'chatbox-construct'}
  ]);
  assert.equal(BEATS[12].threefold, true);
  assert.equal(BEATS[13].threefold, true);
  assert.equal(BEATS[12].form, 'fates');
  assert.equal(BEATS[13].form, 'morrigan');
  assert.equal(BEATS[21].kind, 'time-travel');
  assert.equal(BEATS[25].kind, 'rite');
  assert.equal(BEATS[29].kind, 'promise');
  assert.equal(BEATS[32].kind, 'finale');
  assert.deepEqual(plain(PRODUCTION.map(beat => beat.id)), ORDER);
  assert.ok(!BEATS.some(beat => beat.kind === 'rat' || beat.speaker === 'rat' ||
    /object-relational theory|RAT —/.test(beat.text || '')));
});

test('new cursors resume by stable semantic ID and never reinterpret ordinals', async () => {
  const {flow} = await flowRealm();
  assert.equal(flow.FLOW, FLOW);
  assert.deepEqual(plain(flow.ORDER), ORDER);
  const current = flow.resolveCursor({
    tutorialFlow: FLOW,
    tutorialBeat: 0,
    tutorialBeatId: 'time-travel-action'
  }, false);
  assert.equal(current.index, 21);
  assert.equal(current.migrated, false);
  assert.deepEqual(plain(flow.resolveCursor(current.patch, false).patch), plain(current.patch));
  const unknown = flow.resolveCursor({
    tutorialFlow: FLOW,
    tutorialBeat: 3,
    tutorialBeatId: 'old-ordinal-3'
  }, false);
  assert.equal(unknown.blocked, true);
  assert.equal(unknown.patch, null);
  assert.throws(() => flow.patchAt(-1), {name: 'RangeError'});
  assert.throws(() => flow.patchAt(ORDER.length + 1), {name: 'RangeError'});
});

test('unfinished legacy tutorials restart once without clearing the name, quiz, keeps, or artifacts', async () => {
  const {flow} = await flowRealm();
  const legacy = {
    tutorialFlow: 'craft-first-v1',
    tutorialBeat: 23,
    tutorialBeatId: 'beat-024',
    tutorialDone: false,
    tutorialPaused: true,
    tutorialRitualLine: 3,
    tutorialStage: 'old-stage',
    tutorialResidue: {old: true},
    tutorialPromise: {old: true},
    tutorialTimeTravelDone: true,
    keysNamed: true,
    travellerAlias: 'Robin',
    enterRiteDone: true,
    firstRite: {version: 1, answers: {'locked-drawer': 'a'}},
    buddy: [{id: 'kept-poppet'}],
    relations: [{from: 'kept-poppet', to: 'buddy'}]
  };
  const migrated = flow.resolveCursor(legacy, true);
  assert.equal(migrated.blocked, false);
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.index, 0);
  assert.equal(migrated.id, ORDER[0]);
  assert.equal(migrated.hasKeep, true);
  assert.deepEqual(plain(migrated.patch), {
    tutorialFlow: FLOW,
    tutorialBeat: 0,
    tutorialBeatId: ORDER[0],
    tutorialPaused: false,
    tutorialRitualLine: 0,
    tutorialStage: null,
    tutorialResidue: null,
    tutorialPromise: null,
    tutorialTimeTravelDone: false,
    tutorialFinaleShown: false,
    keysNamed: false
  });
  assert.equal(flow.resolveCursor(migrated.patch, true).migrated, false);
  for (const key of ['travellerAlias', 'enterRiteDone', 'firstRite', 'buddy', 'relations']) {
    assert.equal(key in migrated.patch, false, key + ' must remain untouched');
  }
});

test('completed legacy tutorials remain complete and unknown future flows fail closed', async () => {
  const {flow} = await flowRealm();
  const completed = flow.resolveCursor({
    tutorialFlow: 'craft-first-v1',
    tutorialBeat: 24,
    tutorialDone: true,
    keysNamed: true
  }, true);
  assert.equal(completed.blocked, false);
  assert.equal(completed.index, ORDER.length);
  assert.equal(completed.patch.tutorialBeatId, null);
  assert.equal(completed.patch.keysNamed, undefined);
  const unknown = flow.resolveCursor({tutorialFlow: 'desktop-opening-v3'}, false);
  assert.equal(unknown.blocked, true);
});

test('promise matching permits only case, whitespace, and terminal punctuation differences', async () => {
  const {flow} = await flowRealm();
  assert.equal(flow.promiseMatches('I will be nice to little Robin', 'Robin'), true);
  assert.equal(flow.promiseMatches('  i   WILL be nice to LITTLE   robin... ', 'Robin'), true);
  assert.equal(flow.promiseMatches('I will be nice to little Robin !', 'Robin'), true);
  assert.equal(flow.promiseMatches('I will be nice to little Robin and everyone', 'Robin'), false);
  assert.equal(flow.promiseMatches('I will be nice to little Rowan', 'Robin'), false);
  assert.equal(flow.promiseMatches('I will be nice to little Robin', 'Rory'), false);
  assert.equal(flow.promiseMatches('I will be nice to little Robin.', 'Robin!'), false);
});
