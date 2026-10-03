import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic, plain} from './harness.mjs';

test('failed durable write does not mutate or emit success', async () => {
  const r = makeRealm();
  await runClassic('src/state.js', r);
  const s = r.window.Liber.state;
  const before = s.get();
  let changed = 0;
  s.on('change', () => changed++);
  r.storage.deny = key => key === 'liber_vacui_v1__keep';
  assert.equal(s.trySet({journal: [{id: 'synthetic-q', body: 'kept question'}]}), false);
  assert.equal(s.get(), before);
  assert.equal(changed, 0);
});

test('bind is durable and keeps its schema and dedupe behavior', async () => {
  const r = makeRealm();
  await runClassic('src/state.js', r);
  const s = r.window.Liber.state;
  const rel = s.bindRelation('dream-test', 'remembers', 'buddy');
  assert.deepEqual(Object.keys(plain(rel)).sort(), ['from', 'to', 'ts', 'verb']);
  assert.equal(rel.to, 'buddy');
  assert.equal(s.bindRelation('dream-test', 'remembers', 'buddy'), null);
  r.storage.deny = key => key === 'liber_vacui_v1__keep';
  assert.equal(s.bindRelation('another-test', 'carries', 'buddy'), null);
  assert.equal(s.get().relations.length, 1);
});

for (const slot of ['play', 'keep', 'show']) {
  test('durable journal and Memory write is atomic in ' + slot, async () => {
    const key = 'liber_vacui_v1__' + slot;
    const r = makeRealm({'liber_vacui_slot': slot});
    await runClassic('src/state.js', r);
    const s = r.window.Liber.state;
    s.set({dreams: [{id: 'dream-preserved', title: 'unchanged', ts: 1}]});
    const entry = {id: 'journal-prepared', kind: 'spoken', body: 'the exact question', ts: 2};
    let artifacts = 0;
    let changed = 0;
    s.on('artifact', () => artifacts++);
    s.on('change', () => changed++);
    const before = plain(s.get());

    r.storage.deny = deniedKey => deniedKey === key;
    assert.equal(s.tryAddArtifact('journal', entry, {memory: {photos: []}}), null);
    assert.deepEqual(plain(s.get()), before);
    assert.equal(artifacts, 0);
    assert.equal(changed, 0);

    r.storage.deny = () => false;
    assert.equal(s.tryAddArtifact('journal', entry, {memory: {photos: []}}).id, entry.id);
    assert.equal(s.tryAddArtifact('journal', entry, {memory: {photos: []}}).id, entry.id);
    assert.equal(s.get().journal.length, 1);
    assert.equal(artifacts, 1);
    assert.equal(s.tryAddArtifact('journal', {...entry, body: 'different'}), null);

    const disk = JSON.parse(r.storage.getItem(key));
    assert.equal(disk.journal[0].body, entry.body);
    assert.deepEqual(disk.memory, {photos: []});
    assert.equal(disk.dreams[0].id, 'dream-preserved');
  });
}

test('pageshow false reloads newer disk data without shelving collections', async () => {
  const key = 'liber_vacui_v1__keep';
  const r = makeRealm();
  await runClassic('src/state.js', r);
  const s = r.window.Liber.state;
  r.storage.setItem(key, JSON.stringify({
    ...plain(s.get()),
    cutsceneBuild: 'handshake1',
    journal: [{id: 'newer-journal', body: 'newer question', ts: 1}],
    dreams: [{id: 'newer-dream', title: 'unchanged', ts: 1}]
  }));
  r.handlers.get('pageshow')({persisted: false});
  assert.equal(s.get().journal[0].id, 'newer-journal');
  assert.equal(s.get().dreams[0].id, 'newer-dream');
  assert.deepEqual(plain(s.get().graveyard), []);
});
