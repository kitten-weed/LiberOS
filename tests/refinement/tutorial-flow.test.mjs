import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic, plain} from './harness.mjs';

const ORDER = [
  'beat-001', 'beat-006', 'beat-007', 'beat-008', 'beat-009', 'beat-010',
  'beat-011', 'beat-012', 'beat-013', 'beat-014', 'beat-015', 'beat-016',
  'beat-017', 'beat-018', 'beat-019', 'beat-020', 'beat-021', 'beat-022',
  'beat-002', 'beat-003', 'beat-004', 'beat-005', 'beat-006-close',
  'beat-023', 'beat-024', 'beat-025', 'beat-026', 'beat-027', 'beat-028'
];
const FLOW = 'craft-first-v1';

async function baseline() {
  return JSON.parse(await fs.readFile(new URL('./fixtures/baseline.json', import.meta.url), 'utf8'));
}

async function flowRealm() {
  const r = makeRealm();
  await runClassic('src/tutorial-flow.js', r);
  return {r, flow: r.window.LiberTutorialFlow};
}

test('the craft-first order preserves every retained beat and ritual line by original identity', async () => {
  const fixture = await baseline();
  const r = makeRealm();
  await runClassic('src/cutscene-v2.data.js', r);
  const data = r.window.CutsceneV2Data;
  assert.deepEqual(plain(data.RITUAL), fixture.CutsceneV2Data.RITUAL);
  assert.equal(data.BEATS.length, ORDER.length);
  assert.deepEqual(plain(data.BEATS.map(beat => beat.id)), ORDER);

  const expectedClose = 'You\u2019re right. After all, we are just starting this journey.';
  for (let i = 0; i < fixture.CutsceneV2Data.BEATS.length; i++) {
    const id = 'beat-' + String(i + 1).padStart(3, '0');
    const actual = plain(data.BEATS.find(beat => beat.id === id));
    delete actual.id;
    const expected = plain(fixture.CutsceneV2Data.BEATS[i]);
    if (id === 'beat-006') {
      expected.text = 'We are just starting this journey. We can cast a spell and summon some help.';
    }
    assert.deepEqual(actual, expected, id + ' changed outside the approved text split');
  }
  const close = data.BEATS.find(beat => beat.id === 'beat-006-close');
  assert.deepEqual(plain(close), {
    id: 'beat-006-close',
    speaker: 'liber-vacui',
    kind: 'dialogue',
    text: expectedClose,
    response: '>>'
  });
  assert.equal(data.BEATS[1].response, 'a spell?');
  assert.deepEqual(
    plain(data.PRODUCTION.map(beat => beat.id)),
    ORDER
  );
});

test('legacy numeric cursors resolve by original beat identity and protect craft-first exceptions', async () => {
  const {flow} = await flowRealm();
  assert.equal(flow.FLOW, FLOW);
  assert.deepEqual(plain(flow.ORDER), ORDER);
  for (let index = 0; index < 28; index++) {
    const id = 'beat-' + String(index + 1).padStart(3, '0');
    assert.equal(flow.resolveCursor({tutorialBeat: index}, true).index, ORDER.indexOf(id));
  }
  for (const index of [1, 2, 3, 4]) {
    assert.equal(flow.resolveCursor({tutorialBeat: index}, false).id, 'beat-006');
  }
  const partial = flow.resolveCursor({tutorialBeat: 7, tutorialRitualLine: 2}, false);
  assert.equal(partial.id, 'beat-008');
  assert.equal('tutorialRitualLine' in partial.patch, false);
  assert.equal(flow.resolveCursor({tutorialBeat: 23}, false).id, 'beat-016');
  assert.equal(flow.resolveCursor({tutorialBeat: 28}, true).index, ORDER.length);
  assert.equal(flow.resolveCursor({tutorialBeat: 28}, false).index, ORDER.length);
  assert.equal(flow.resolveCursor({tutorialDone: true, tutorialBeat: 28}, false).index, ORDER.length);
});

test('stable IDs win over numeric positions, cursor patches are idempotent, and unknown IDs block', async () => {
  const {flow} = await flowRealm();
  const current = flow.resolveCursor({
    tutorialFlow: FLOW,
    tutorialBeat: 0,
    tutorialBeatId: 'beat-014'
  }, true);
  assert.equal(current.index, 9);
  assert.deepEqual(
    plain(flow.resolveCursor(current.patch, true).patch),
    plain(current.patch)
  );
  const unknown = flow.resolveCursor({
    tutorialFlow: FLOW,
    tutorialBeat: 3,
    tutorialBeatId: 'beat-999'
  }, true);
  assert.equal(unknown.blocked, true);
  assert.equal(unknown.patch, null);
  const rangeError = {name: 'RangeError', message: 'tutorial cursor out of range'};
  assert.throws(() => flow.patchAt(-1), rangeError);
  assert.throws(() => flow.patchAt(ORDER.length + 1), rangeError);
});
