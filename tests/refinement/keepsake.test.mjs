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

function firstRiteV2(selectionMode = 'template') {
  const core = [
    {id: 'r1c4', name: 'Royal Blue', hex: '#253fae'},
    {id: 'r2c2', name: 'Sun Yellow', hex: '#fdfc0a'},
    {id: 'r3c5', name: 'Poppy Red', hex: '#e23037'},
    {id: 'r5c5', name: 'Near-black', hex: '#090804'}
  ];
  const accents = {
    face: [['r1c1', 'Lavender Mist', '#ada4cc'], ['r3c3', 'Blush', '#e27f90']],
    clothes: [['r5c1', 'Umber', '#764941'], ['r2c3', 'Warm Ochre', '#e9a42b']],
    personal: [['r2c1', 'Storm Blue', '#273765'], ['r4c3', 'Warm Gray', '#939389']],
    shadow: [['r4c4', 'Lavender Gray', '#a294b1'], ['r5c3', 'Deep Rust', '#b32727']]
  };
  const chapterPalettes = Object.fromEntries(Object.entries(accents).map(([chapter, entries]) => [
    chapter,
    core.concat(entries.map(([id, name, hex]) => ({id, name, hex})))
  ]));
  return {
    version: 2,
    scoreVersion: 2,
    paletteVersion: 2,
    resultId: 'lantern-tender',
    templateId: selectionMode === 'template' ? 'lantern-tender' : null,
    selectionMode,
    paletteId: 'historical-colour-chart-v2',
    chapterPaletteIds: Object.fromEntries(Object.entries(chapterPalettes).map(([chapter, inks]) => [
      chapter, inks.map(ink => ink.id)
    ])),
    chapterPalettes,
    receiptText: 'From these answers, you seem drawn to a new turn.'
  };
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

test('keepsakes preserve v1 first-rite metadata and validate v2 chapter palettes including blank', async () => {
  const old = {
    version: 1,
    resultId: 'salt-cartographer',
    templateId: 'salt-cartographer',
    paletteId: 'openness-high',
    inks: [
      {name: 'Ochre', hex: '#d69b35'}, {name: 'Night ink', hex: '#242235'},
      {name: 'Moss', hex: '#6f9361'}, {name: 'Blue glass', hex: '#547f9d'},
      {name: 'Plum', hex: '#93607e'}, {name: 'Paper', hex: '#e7d8af'}
    ]
  };
  const oldRealm = makeRealm();
  const oldKeepsakes = await loadModule('poppet-lab/keepsake.js', oldRealm);
  const oldSaved = oldKeepsakes.saveKeepsake(canvas(), null, spec({firstRite: old}));
  assert.deepEqual(plain(oldSaved.record.firstRite), old);
  assert.deepEqual(plain(oldKeepsakes.readKeepsakes()[0].firstRite), old);

  const r = makeRealm();
  const k = await loadModule('poppet-lab/keepsake.js', r);
  const blank = firstRiteV2('blank');
  const saved = k.saveKeepsake(canvas(), null, spec({firstRite: blank}));
  assert.deepEqual(plain(saved.record.firstRite), blank);
  assert.deepEqual(plain(k.readKeepsakes()[0].firstRite), blank);

  const malformed = firstRiteV2('blank');
  malformed.chapterPalettes.clothes[0] = {id: 'different-core', name: 'Other Blue', hex: '#253fae'};
  const invalidRealm = makeRealm({'poppet.keepsakes.v1': JSON.stringify([
    {n: 1, atlas: image, firstRite: malformed}
  ])});
  const invalidReader = await loadModule('poppet-lab/keepsake.js', invalidRealm);
  assert.throws(() => invalidReader.readKeepsakes(), /first-rite record is malformed/);
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
  const failed = coordinator.commit({tutorialBeatId: 'post-rite-compliment'});
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
  assert.equal(r.window.Liber.state.get().tutorialBeatId, 'post-rite-compliment');
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
