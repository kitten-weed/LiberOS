import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic} from './harness.mjs';

async function makeLoop() {
  const realm = makeRealm();
  await runClassic('src/state.js', realm);
  realm.window.Liber.state.set({
    dreams: [{id: 'dream-one', title: 'The Copper Key', ts: 1}]
  });
  await runClassic('data/prompts.data.js', realm);
  await runClassic('src/poppet-loop.js', realm);
  return realm;
}

test('a rejected bind consumes nothing and creates no spoken result', async () => {
  const realm = await makeLoop();
  realm.storage.deny = key => key === 'liber_vacui_v1__keep';
  const loop = realm.window.LiberPoppetLoop;
  assert.equal(loop.relate('dream-one', 'remembers'), null);
  assert.equal(realm.window.Liber.state.get().relations.length, 0);
  assert.equal(loop.last, undefined);
  assert.equal(loop.inOrbit()[0].id, 'dream-one');
});

test('reflection retries retain one entry identity and exact question', async () => {
  const realm = await makeLoop();
  const loop = realm.window.LiberPoppetLoop;
  const spoken = loop.relate('dream-one', 'remembers', {deferRender: true});
  realm.storage.deny = key => key === 'liber_vacui_v1__keep';
  assert.equal(loop.keepToJournal(spoken), null);
  const heldId = spoken.pendingEntry.id;
  assert.equal(realm.window.Liber.state.get().journal.length, 0);
  realm.storage.deny = () => false;
  const kept = loop.keepToJournal(spoken);
  assert.equal(kept.id, heldId);
  assert.equal(kept.body, spoken.prompt);
  assert.equal(loop.keepToJournal(spoken).id, heldId);
  assert.equal(realm.window.Liber.state.get().journal.length, 1);
});
