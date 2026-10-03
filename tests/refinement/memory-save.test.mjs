import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, loadModule, runClassic, plain} from './harness.mjs';

function fakeClock() {
  let next = 0, now = 0;
  const timers = new Map();
  return {
    setTimeout(fn, delay) {
      const id = ++next;
      timers.set(id, {fn, at: now + delay});
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    get size() { return timers.size; },
    advance(ms) {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at > now) continue;
        timers.delete(id);
        timer.fn();
      }
    }
  };
}

test('immediate flush captures the latest title and cancels the debounced write', async () => {
  const realm = makeRealm(), clock = fakeClock(), written = [];
  const {createMemorySaver} = await loadModule('src/features/memory/save-controller.js', realm);
  let label = '';
  const saver = createMemorySaver({
    clock,
    capture: () => ({photos: [{label, img: 'synthetic'}]}),
    commit: payload => { written.push(payload); return true; },
    onError: error => { throw error; }
  });

  saver.schedule();
  clock.advance(1100);
  label = 'the Copper Key';
  saver.schedule();
  clock.advance(1199);
  assert.equal(written.length, 0);
  assert.equal(saver.flush(), true);
  assert.equal(written[0].photos[0].label, 'the Copper Key');
  assert.equal(clock.size, 0);
  clock.advance(5000);
  assert.equal(written.length, 1);
  assert.equal(saver.pending, false);
  assert.equal(saver.flush(), true);
  assert.equal(written.length, 1);
});

test('rejected and thrown commits retain pending work and report failure', async () => {
  const realm = makeRealm(), clock = fakeClock(), errors = [];
  const {createMemorySaver} = await loadModule('src/features/memory/save-controller.js', realm);
  let reject = true;
  const saver = createMemorySaver({
    clock,
    capture: () => ({photos: [{label: 'still here', img: 'synthetic'}]}),
    commit: () => reject ? false : true,
    onError: error => errors.push(error)
  });

  saver.schedule();
  clock.advance(1200);
  assert.equal(saver.pending, true);
  assert.equal(errors.length, 1);
  assert.equal(saver.flush({write: () => { throw new Error('synthetic rejection'); }}), false);
  assert.equal(saver.pending, true);
  assert.equal(errors.length, 2);
  assert.equal(clock.size, 0);
  reject = false;
  assert.equal(saver.flush(), true);
  assert.equal(saver.pending, false);
});

test('story and cleared tray commit atomically and retry without duplicate artifact', async () => {
  const realm = makeRealm(), clock = fakeClock();
  await runClassic('src/state.js', realm);
  const state = realm.window.Liber.state;
  const original = {
    figScaleEpoch: 2,
    figures: [],
    sand: [],
    lampOn: true,
    photos: [
      {label: 'first', img: 'synthetic-1'},
      {label: 'second', img: 'synthetic-2'},
      {label: 'third', img: 'synthetic-3'}
    ]
  };
  state.set({memory: original});
  const entry = {
    id: 'journal-memory-synthetic',
    kind: 'memory',
    name: 'a story in three frames',
    frames: original.photos,
    ts: 1
  };
  const {createMemorySaver} = await loadModule('src/features/memory/save-controller.js', realm);
  const saver = createMemorySaver({
    clock,
    capture: () => original,
    commit: payload => state.trySet({memory: payload}),
    onError: () => {}
  });
  const options = {
    memoryPatch: {...original, photos: []},
    write: payload => Boolean(state.tryAddArtifact('journal', entry, {memory: payload}))
  };

  realm.storage.deny = key => key === 'liber_vacui_v1__keep';
  assert.equal(saver.flush(options), false);
  assert.equal(state.get().journal.length, 0);
  assert.equal(state.get().memory.photos.length, 3);
  realm.storage.deny = () => false;
  assert.equal(saver.flush(options), true);
  assert.equal(saver.flush(options), true);
  const disk = JSON.parse(realm.storage.getItem('liber_vacui_v1__keep'));
  assert.equal(disk.journal.length, 1);
  assert.deepEqual(disk.journal[0].frames, original.photos);
  assert.deepEqual(plain(state.get().memory.photos), []);
});
