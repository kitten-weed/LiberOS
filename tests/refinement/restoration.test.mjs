import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, loadModule, plain} from './harness.mjs';

const image = name => 'data:image/png;base64,' + Buffer.from(name).toString('base64');

function fixture() {
  const r = makeRealm();
  const writes = [];
  function surface(name, width = 16, height = 16) {
    const ctx = {
      canvas: {width, height},
      clearRect() { writes.push('clear:' + name); },
      drawImage(source) { writes.push('draw:' + name + ':' + (source.source || source.src)); }
    };
    return {ctx, target: {getContext: () => ctx}};
  }
  const body = surface('body', 32, 32);
  const cloth = surface('cloth');
  const hull = surface('hull');
  const faces = Object.fromEntries(['eyes', 'face', 'hair'].map(name => [name, surface('face:' + name)]));
  const thoughts = Object.fromEntries(
    ['fears', 'wishes', 'likes', 'dislikes', 'thoughts'].map(name => [name, surface('thought:' + name)])
  );
  const textures = Object.fromEntries(
    ['fears', 'wishes', 'likes', 'dislikes', 'thoughts'].map(name => [name, {needsUpdate: false}])
  );
  const calls = [];
  const doll = {
    bodyCtx: body.ctx,
    bodyTex: {needsUpdate: false},
    clothCtx: cloth.ctx,
    clothTex: {needsUpdate: false},
    faceMaps: Object.fromEntries(Object.entries(faces).map(([name, s]) => [name, {
      cv: s.ctx.canvas, ctx: s.ctx, tex: {needsUpdate: false}
    }])),
    hullCanvas: hull.ctx.canvas,
    hullCtx: hull.ctx,
    hullTex: {needsUpdate: false},
    setParams(params) { calls.push(['setParams', params]); },
    rebuild(pose) { calls.push(['rebuild', pose]); },
    setFaceShell(on) { calls.push(['faceShell', on]); },
    setHulls(on) { calls.push(['hulls', on]); },
    markHullPainted() { calls.push(['hullPainted']); }
  };
  r.context.Image = class {};
  return {r, writes, body, cloth, hull, faces, thoughts, textures, calls, doll};
}

function controlledImages(r) {
  const pending = [];
  r.context.Image = class {
    set src(value) {
      this.source = value;
      pending.push(() => {
        this.width = 16;
        this.height = 16;
        this.onload();
      });
    }
  };
  return pending;
}

function validRecord(extra = {}) {
  return {
    n: 4,
    name: 'the kept name',
    atlas: image('atlas'),
    P: {
      head: 0.49,
      pose: 'sit',
      worn: {robe: true},
      thoughts: {fears: ['quiet'], wishes: ['warmth']}
    },
    pose: 'sit',
    worn: {robe: true},
    cloth: image('cloth'),
    face: {eyes: image('eyes'), face: image('face'), hair: image('hair')},
    hull: image('hull'),
    thoughts: {
      fears: image('thought-fears'),
      wishes: image('thought-wishes'),
      likes: image('thought-likes'),
      dislikes: image('thought-dislikes'),
      thoughts: image('thought-thoughts')
    },
    ...extra
  };
}

test('workshop restore applies saved brush metadata before control synchronization and preserves legacy defaults', async () => {
  async function restore(record) {
    const f = fixture();
    f.r.storage.setItem('poppet.keepsakes.v1', JSON.stringify([record]));
    f.r.context.Image = class {
      set src(value) {
        this.source = value;
        queueMicrotask(() => {
          this.width = 16;
          this.height = 16;
          this.onload();
        });
      }
    };
    const {readKeepsakes} = await loadModule('poppet-lab/keepsake.js', f.r);
    const {restoreKeptDoll} = await loadModule('poppet-lab/restore-kept.js', f.r);
    const brushes = {body: {ink: '#default', size: 7}};
    const synchronized = [];
    Object.assign(f.r.context, {
      readKeepsakes,
      restoreKeptDoll,
      doll: f.doll,
      P: {},
      thoughtCvs: Object.fromEntries(Object.entries(f.thoughts).map(([key, surface]) => [key, surface.target])),
      thoughtTexs: f.textures,
      brushes,
      specimenName: 'not restored',
      gen: 0,
      labReady: false,
      mirrorPending: () => null,
      captureKeepsake() {},
      createKeepCommit() {},
      THOUGHT_KINDS: Object.keys(f.thoughts),
      rebuildThoughtGlyphs() {},
      syncEditControls() {
        synchronized.push({ink: brushes.body.ink, size: brushes.body.size});
      }
    });
    const source = await fs.readFile(new URL('../../poppet-lab/main.js', import.meta.url), 'utf8');
    const declaration = source.match(/^async function restoreExistingKeep\(\) \{[\s\S]*?^\}/m);
    assert.ok(declaration, 'workshop restore function exists');
    vm.runInContext(declaration[0], f.r.context);
    await vm.runInContext('restoreExistingKeep()', f.r.context);
    vm.runInContext('syncEditControls()', f.r.context);
    return {brushes, synchronized};
  }

  const supplied = await restore(validRecord({ink: '#aabbcc', brush: 23}));
  assert.deepEqual(supplied.synchronized, [{ink: '#aabbcc', size: 23}]);
  assert.equal(supplied.brushes.body.ink, '#aabbcc');
  assert.equal(supplied.brushes.body.size, 23);

  const legacy = await restore(validRecord());
  assert.deepEqual(legacy.synchronized, [{ink: '#default', size: 7}]);
  assert.equal(legacy.brushes.body.ink, '#default');
  assert.equal(legacy.brushes.body.size, 7);
});

test('all supplied images decode before any destination is changed', async () => {
  const f = fixture();
  const pending = controlledImages(f.r);
  const {restoreKeptDoll} = await loadModule('poppet-lab/restore-kept.js', f.r);
  const params = {head: 0.42, pose: 'stand'};
  const waiting = restoreKeptDoll({
    doll: f.doll,
    record: validRecord(),
    params,
    thoughtCanvases: Object.fromEntries(Object.entries(f.thoughts).map(([k, v]) => [k, v.target])),
    thoughtTextures: f.textures,
    isCurrent: () => true
  });

  assert.equal(pending.length, 11);
  for (const release of pending.slice(0, -1)) {
    release();
    await Promise.resolve();
    assert.deepEqual(f.writes, []);
  }
  pending.at(-1)();
  const result = await waiting;
  assert.equal(result.status, 'restored');
  assert.ok(f.writes.some(value => value.startsWith('draw:thought:thoughts:')));
  assert.ok(f.writes.includes('draw:body:' + image('atlas')));
  assert.equal(params.head, 0.49);
  assert.deepEqual(plain(params.thoughts), {fears: ['quiet'], wishes: ['warmth']});
  assert.ok(f.calls.some(call => call[0] === 'rebuild' && call[1] === 'sit'));
  assert.equal(f.doll.bodyTex.needsUpdate, true);
  assert.equal(f.textures.thoughts.needsUpdate, true);
  assert.equal(result.name, 'the kept name');
});

test('older records may omit optional paint sheets without clearing existing canvases', async () => {
  const f = fixture();
  f.r.context.Image = class {
    set src(value) {
      this.source = value;
      queueMicrotask(() => {
        this.width = 16;
        this.height = 16;
        this.onload();
      });
    }
  };
  const {restoreKeptDoll} = await loadModule('poppet-lab/restore-kept.js', f.r);
  const result = await restoreKeptDoll({
    doll: f.doll,
    record: {n: 1, name: 'older', atlas: image('atlas'), P: {}},
    params: {pose: 'stand'},
    thoughtCanvases: {},
    isCurrent: () => true
  });
  assert.equal(result.status, 'restored');
  assert.deepEqual(f.writes, ['clear:body', 'draw:body:' + image('atlas')]);
});

test('legacy aura sheets fill only absent fears and thoughts images', async () => {
  const f = fixture();
  f.r.context.Image = class {
    set src(value) {
      this.source = value;
      queueMicrotask(() => {
        this.width = 16;
        this.height = 16;
        this.onload();
      });
    }
  };
  const {restoreKeptDoll} = await loadModule('poppet-lab/restore-kept.js', f.r);
  const result = await restoreKeptDoll({
    doll: f.doll,
    record: {
      n: 2,
      atlas: image('atlas'),
      aura3: image('old-fears'),
      aura4: image('old-thoughts'),
      thoughts: {fears: image('new-fears')},
      P: {thoughts: {fears: ['text is not a sheet']}}
    },
    params: {},
    thoughtCanvases: Object.fromEntries(Object.entries(f.thoughts).map(([k, v]) => [k, v.target])),
    thoughtTextures: f.textures,
    isCurrent: () => true
  });
  assert.equal(result.status, 'restored');
  assert.ok(f.writes.includes('draw:thought:fears:' + image('new-fears')));
  assert.ok(f.writes.includes('draw:thought:thoughts:' + image('old-thoughts')));
  assert.equal(f.writes.some(value => value.includes(image('old-fears'))), false);
});

test('a present image that cannot decode rejects without mutating the doll', async () => {
  const f = fixture();
  const broken = image('broken');
  f.r.context.Image = class {
    set src(value) {
      this.source = value;
      queueMicrotask(() => value === broken ? this.onerror() : this.onload());
    }
  };
  const {restoreKeptDoll} = await loadModule('poppet-lab/restore-kept.js', f.r);
  const params = {head: 0.42};
  await assert.rejects(restoreKeptDoll({
    doll: f.doll,
    record: validRecord({face: {face: broken}}),
    params,
    thoughtCanvases: {},
    isCurrent: () => true
  }), /decode|image/i);
  assert.deepEqual(f.writes, []);
  assert.equal(params.head, 0.42);
  assert.equal(f.calls.length, 0);
});

test('late decoded record cannot overwrite a replaced view', async () => {
  const f = fixture();
  const pending = controlledImages(f.r);
  const {restoreKeptDoll} = await loadModule('poppet-lab/restore-kept.js', f.r);
  let current = true;
  const waiting = restoreKeptDoll({
    doll: f.doll,
    record: {n: 1, P: {}, atlas: image('atlas')},
    params: {},
    thoughtCanvases: {},
    isCurrent: () => current
  });
  await Promise.resolve();
  current = false;
  pending[0]();
  assert.equal((await waiting).status, 'cancelled');
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.calls, []);
});
