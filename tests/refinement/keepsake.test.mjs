import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, loadModule, runClassic, plain} from './harness.mjs';

const image = 'data:image/png;base64,c3ludGhldGlj';

function canvas(value = image) {
  return {
    width: 16,
    height: 16,
    toDataURL() {
      return typeof value === 'function' ? value() : value;
    }
  };
}

function spec(extra = {}) {
  return {P: {}, name: 'test poppet', ...extra};
}

test('missing shelf is empty while corrupt and non-array shelves remain untouched', async () => {
  const absent = makeRealm();
  const module = await loadModule('poppet-lab/keepsake.js', absent);
  assert.deepEqual(plain(module.readKeepsakes()), []);

  for (const raw of ['not json', '{"n":1}']) {
    const r = makeRealm({'poppet.keepsakes.v1': raw});
    const k = await loadModule('poppet-lab/keepsake.js', r);
    assert.throws(() => k.readKeepsakes(), /keepsake|shelf/i);
    assert.equal(r.storage.getItem('poppet.keepsakes.v1'), raw);
  }
});

test('strict shelf rejects malformed records and duplicate snapshot identities without rewriting bytes', async () => {
  const invalid = [
    [{n: 1}],
    [{n: 1, atlas: 42}],
    [{n: 1, atlas: image}, {n: 1, atlas: image}],
    [{n: 1, atlas: image, face: {eyes: ''}}],
    [{n: 1, atlas: image, thoughts: {wishes: 7}}],
    [{n: 1, atlas: image, cloth: 'not-an-image'}],
    [{n: 1, atlas: image, brush: 49}],
    [{n: 1, atlas: image, riteDrawings: {version: 1, squares: []}}],
    [{n: 1, atlas: image, riteDrawings: {version: 1, squares: [
      {id: 'shadow-surrender-1', source: image},
      {id: 'personal-unconscious-2', source: image},
      {id: 'shadow-surrender-1', source: image},
      {id: 'shadow-surrender-2', source: image}
    ]}}]
  ];
  for (const records of invalid) {
    const raw = JSON.stringify(records);
    const r = makeRealm({'poppet.keepsakes.v1': raw});
    const k = await loadModule('poppet-lab/keepsake.js', r);
    assert.throws(() => k.readKeepsakes(), /keepsake|shelf/i);
    assert.equal(r.storage.getItem('poppet.keepsakes.v1'), raw);
  }
});

test('primary write returns a record and capped count while snapshot numbers stay unique', async () => {
  const r = makeRealm();
  const k = await loadModule('poppet-lab/keepsake.js', r);
  let saved;
  for (let i = 0; i < 9; i++) {
    saved = k.saveKeepsake(canvas(), null, spec({name: 'kept ' + i}));
  }
  assert.deepEqual(Object.keys(saved).sort(), ['count', 'record']);
  assert.equal(saved.record.n, 9);
  assert.equal(saved.count, 8);
  const shelf = k.readKeepsakes();
  assert.deepEqual(plain(shelf.map(record => record.n)), [2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(r.storage.getItem('poppet.keepsake.fresh'), null);
});

test('primary storage and canvas encoding failures are explicit', async () => {
  const r = makeRealm();
  const k = await loadModule('poppet-lab/keepsake.js', r);
  r.storage.deny = key => key === 'poppet.keepsakes.v1';
  assert.throws(() => k.saveKeepsake(canvas(), null, spec()), /storage|keepsake|quota|rejection/i);
  assert.equal(r.storage.getItem('poppet.keepsakes.v1'), null);

  r.storage.deny = () => false;
  assert.throws(() => k.saveKeepsake(canvas(() => {
    throw new Error('encoder failure');
  }), null, spec()));
  assert.deepEqual(plain(k.readKeepsakes()), []);
});

test('face and hull snapshot encoding errors are not converted to absent sheets', async () => {
  const r = makeRealm();
  const k = await loadModule('poppet-lab/keepsake.js', r);
  const doll = {faceMaps: {eyes: {cv: {width: 1, toDataURL() { throw new Error('face failed'); }}}}};
  assert.throws(() => k.snapshotDollSheets(doll), /face failed/);
});

test('rite drawing snapshots preserve all four stable square identities in a saved record', async () => {
  const r = makeRealm();
  const k = await loadModule('poppet-lab/keepsake.js?v=rite-draw3', r);
  const ids = [
    'personal-unconscious-1', 'personal-unconscious-2',
    'shadow-surrender-1', 'shadow-surrender-2'
  ];
  const riteDrawings = k.snapshotRiteDrawings({
    getRiteDrawings: () => ids.map((id, index) => ({
      id,
      canvas: canvas('data:image/png;base64,' + Buffer.from('square-' + index).toString('base64'))
    }))
  });
  assert.deepEqual(plain(riteDrawings.squares.map(square => square.id)), ids);

  const saved = k.saveKeepsake(canvas(), null, spec({riteDrawings}));
  assert.deepEqual(plain(saved.record.riteDrawings), plain(riteDrawings));
  assert.deepEqual(plain(k.readKeepsakes()[0].riteDrawings), plain(riteDrawings));
  assert.throws(() => k.snapshotRiteDrawings({
    getRiteDrawings: () => [{id: ids[1], canvas: canvas()}]
  }), /drawings are incomplete/);
});

test('keepsake materialization rejects malformed or undecodable paint', async () => {
  const r = makeRealm();
  const k = await loadModule('poppet-lab/keepsake.js', r);
  await assert.rejects(k.materializeKeepsake({atlas: 'not-an-image'}), /image/i);
  r.context.Image = class {
    set src(value) {
      this.source = value;
      queueMicrotask(() => this.onerror());
    }
  };
  await assert.rejects(k.materializeKeepsake({atlas: image}), /decode/i);
});

test('mirror targets the embedded parent slot, preserves an existing name, and has no legacy fallback', async () => {
  const r = makeRealm({'liber_vacui_slot': 'play'});
  await runClassic('src/state.js', r);
  let parentState = {buddy: [{id: 'old-keep', kind: 'poppet', keepsakeN: 3, name: 'old name'}]};
  const calls = [];
  const canonical = {
    get: () => parentState,
    trySet(patch) {
      calls.push(patch);
      parentState = Object.assign({}, parentState, patch);
      return true;
    }
  };
  r.window.parent = {Liber: {state: canonical}};
  const k = await loadModule('poppet-lab/keepsake.js', r);
  assert.equal(k.mirrorKeepsakeToBuddy(3, 'new name'), true);
  assert.equal(parentState.buddy.length, 1);
  assert.equal(parentState.buddy[0].name, 'old name');
  assert.equal(calls.length, 0);
  assert.equal(r.window.Liber.state.get().buddy.length, 0);

  r.window.parent = {};
  assert.equal(k.mirrorKeepsakeToBuddy(4, 'unavailable'), false);
  assert.equal(r.storage.getItem('liber_vacui_v1__keep'), null);
});

test('standalone mirror uses the active state slot and durable failure stays failure', async () => {
  const r = makeRealm({'liber_vacui_slot': 'play'});
  await runClassic('src/state.js', r);
  const k = await loadModule('poppet-lab/keepsake.js', r);
  assert.equal(k.mirrorKeepsakeToBuddy(2, 'the kept poppet'), true);
  assert.equal(r.window.Liber.state.get().buddy[0].keepsakeN, 2);
  assert.equal(JSON.parse(r.storage.getItem('liber_vacui_v1__play')).buddy[0].id, 'poppet-keep-2');
  assert.equal(r.storage.getItem('liber_vacui_v1__keep'), null);

  r.storage.deny = key => key === 'liber_vacui_v1__play';
  assert.equal(k.mirrorKeepsakeToBuddy(4, 'failed mirror'), false);
  assert.equal(r.storage.getItem('liber_vacui_v1__keep'), null);
});

test('keep coordinator holds primary payload and mirror patch across retry', async () => {
  const r = makeRealm();
  await runClassic('src/state.js', r);
  const k = await loadModule('poppet-lab/keepsake.js', r);
  const {createKeepCommit, keepEditsLocked} = await loadModule('poppet-lab/keep-commit.js', r);
  let captures = 0;
  const coordinator = createKeepCommit({
    capture() {
      captures++;
      return {atlasCv: canvas(), clothCv: null, spec: spec({name: 'one drawing'})};
    }
  });
  assert.equal(keepEditsLocked(false, coordinator), false);
  r.storage.deny = key => key === 'liber_vacui_v1__keep';
  const failed = coordinator.commit({tutorialBeatId: 'beat-017'});
  assert.equal(failed.ok, false);
  assert.equal(failed.stage, 'mirror');
  assert.equal(failed.record.n, 1);
  assert.equal(coordinator.pending.record.name, 'one drawing');
  assert.equal(keepEditsLocked(false, coordinator), true);
  r.storage.deny = () => false;
  assert.equal(keepEditsLocked(true, coordinator), true);
  const saved = coordinator.commit({tutorialBeatId: 'different'});
  assert.equal(saved.ok, true);
  assert.equal(saved.record.n, 1);
  assert.equal(captures, 1);
  assert.equal(k.readKeepsakes().length, 1);
  assert.equal(r.window.Liber.state.get().tutorialBeatId, 'beat-017');
  assert.equal(coordinator.commit().record.n, 1);
  assert.equal(keepEditsLocked(false, null), false);
});

test('primary keep failure remains editable because no pending mirror payload exists', async () => {
  const realm = makeRealm();
  const {createKeepCommit, keepEditsLocked} = await loadModule('poppet-lab/keep-commit.js', realm);
  const coordinator = createKeepCommit({
    capture() {
      throw new Error('primary storage unavailable');
    }
  });
  const result = coordinator.commit();
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'primary');
  assert.equal(keepEditsLocked(false, coordinator), false);
});

test('reload recovery mirrors the exact pending record and rejects a replaced payload', async () => {
  const r = makeRealm();
  await runClassic('src/state.js', r);
  const k = await loadModule('poppet-lab/keepsake.js', r);
  const {createKeepCommit} = await loadModule('poppet-lab/keep-commit.js', r);
  const pending = k.saveKeepsake(canvas(), null, spec({name: 'recovered'}));
  const recovered = createKeepCommit({
    capture() {
      throw new Error('recovery must not recapture');
    },
    pending
  });
  assert.equal(recovered.commit().ok, true);
  assert.equal(r.window.Liber.state.get().buddy[0].keepsakeN, pending.record.n);

  const stale = createKeepCommit({capture() {}, pending});
  r.storage.setItem('poppet.keepsakes.v1', JSON.stringify([
    {...pending.record, name: 'different record'}
  ]));
  const conflict = stale.commit();
  assert.equal(conflict.ok, false);
  assert.equal(conflict.stage, 'mirror');
  assert.equal(r.window.Liber.state.get().buddy.length, 1);
});
