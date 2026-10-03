import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, loadModule, runClassic} from './harness.mjs';

async function sourceBlock(file, pattern) {
  const source = await fs.readFile(new URL('../../' + file, import.meta.url), 'utf8');
  const match = source.match(pattern);
  assert.ok(match, 'expected production block to exist');
  return match[0];
}

test('corrupt home shelf preserves the token projection and reports failures during startup and storage events', async () => {
  const raw = '{not a keepsake shelf';
  const r = makeRealm({'poppet.keepsakes.v1': raw});
  const hint = {textContent: 'click the floor and it walks there'};
  const projected = {id: 'already-visible-token'};
  const tokens = [projected];
  const {readKeepsakes} = await loadModule('poppet-lab/keepsake.js', r);
  r.context.readKeepsakes = readKeepsakes;
  r.context.tokens = tokens;
  r.context.parentState = () => null;
  r.context.console = {error() {}};
  r.context.restoreGeneration = 0;
  r.context.restoreErrorHintOriginal = null;
  r.context.restoredKeepsakeN = null;
  r.context.doll = {setKinematic() {}, M: () => ({rings: null})};
  r.context.hideRings = () => {};
  r.context.HP = {};
  r.context.snapKeeps = () => ({relations: [], s: {}, hasParent: false});
  r.context.restoreKeptDoll = async () => { throw new Error('should not restore corrupt data'); };
  r.context.document.querySelector = selector => selector === '.hint' ? hint : null;
  r.context.document.getElementById = () => { throw new Error('corrupt projection must stop before rendering'); };

  const definitions = [
    await sourceBlock('poppet-home/home.js', /^function reportRestoreError\(error\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-home/home.js', /^function clearRestoreError\(\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-home/home.js', /^async function adoptKept\(\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-home/home.js', /^function buildTokens\(\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-home/home.js', /^\(function watchState\(\) \{[\s\S]*?^\}\)\(\);/m)
  ];
  vm.runInContext(definitions.join('\n'), r.context);

  assert.doesNotThrow(() => vm.runInContext('buildTokens()', r.context));
  assert.deepEqual(tokens, [projected]);
  assert.equal(hint.textContent, 'the saved paint could not be read. nothing has been replaced.');
  assert.equal(r.storage.getItem('poppet.keepsakes.v1'), raw);

  assert.doesNotThrow(() => r.handlers.get('storage')({key: 'poppet.keepsakes.v1'}));
  assert.deepEqual(tokens, [projected]);
  assert.equal(hint.textContent, 'the saved paint could not be read. nothing has been replaced.');
  assert.equal(r.storage.getItem('poppet.keepsakes.v1'), raw);

  const validShelf = JSON.stringify([{n: 1, atlas: 'data:image/png;base64,c3ludGhldGlj'}]);
  r.storage.setItem('poppet.keepsakes.v1', validShelf);
  r.context.restoreKeptDoll = async () => ({status: 'restored'});
  const count = {textContent: ''};
  r.context.document.getElementById = id => id === 'keep-count' ? count : null;
  assert.doesNotThrow(() => vm.runInContext('buildTokens()', r.context));
  assert.equal(hint.textContent, 'the saved paint could not be read. nothing has been replaced.');
  assert.equal(await vm.runInContext('adoptKept()', r.context), true);
  assert.notEqual(hint.textContent, 'the saved paint could not be read. nothing has been replaced.');
  assert.equal(r.storage.getItem('poppet.keepsakes.v1'), validShelf);
});

test('photo naming hides review actions and reopening review restores them without removing close', async () => {
  const r = makeRealm();
  const listeners = {};
  const photoWrap = {hidden: true, removeAttribute() {}, setAttribute() {}};
  const photoImg = {hidden: true};
  const photoTitle = {textContent: ''};
  const photoActions = {style: {display: ''}};
  const photoLabelRow = {hidden: true};
  const photoLabel = {value: '', focused: false, focus() { this.focused = true; }};
  const photoStory = {innerHTML: ''};
  const close = {parentNode: null, focused: false, focus() { this.focused = true; }};
  const title = {parentNode: null};
  const header = {children: [title, close]};
  title.parentNode = close.parentNode = header;
  const save = {addEventListener(_event, callback) { listeners.save = callback; }};
  r.context.document.getElementById = id => id === 'mem-photo-save' ? save : null;
  const photos = [];
  Object.assign(r.context, {
    S: {photos},
    pendingShot: 'data:image/png;base64,c3ludGhldGlj',
    photoWrap,
    photoImg,
    photoTitle,
    photoActions,
    photoLabelRow,
    photoLabel,
    photoStory,
    photoClose: close,
    syncModalOwnership() {},
    hangPhoto(dataUrl, label) { photos.push({dataUrl, label}); }
  });

  const handler = await sourceBlock(
    'src/features/memory/memory.js',
    /^  document\.getElementById\('mem-photo-save'\)\.addEventListener\('click', \(\) => \{[\s\S]*?^  \}\);/m
  );
  vm.runInContext(handler, r.context);
  listeners.save();

  assert.equal(photoActions.style.display, 'none');
  assert.equal(photoLabelRow.hidden, false);
  assert.equal(photoLabel.focused, true);
  assert.equal(header.children.includes(close), true);

  const openReview = await sourceBlock(
    'src/features/memory/memory.js',
    /^  function openPhotoUI\(\) \{[\s\S]*?^  \}/m
  );
  r.context.pendingShot = 'data:image/png;base64,bmV3';
  vm.runInContext(openReview, r.context);
  vm.runInContext('openPhotoUI()', r.context);
  assert.equal(photoActions.style.display, '');
  assert.equal(photoLabelRow.hidden, true);
  r.context.photoTitle.textContent = 'a changed title';
  assert.equal(header.children.includes(close), true);
});

test('rite instruction and tool text meet minimum sizes without clipping', async () => {
  const css = await fs.readFile(new URL('../../styles/poppet-rite.css', import.meta.url), 'utf8');
  function rule(selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = css.match(new RegExp('(?:^|\\n)' + escaped + '\\s*\\{([^}]*)\\}', 'm'));
    assert.ok(match, 'missing CSS rule ' + selector);
    return match[1];
  }
  function declaration(block, property) {
    const match = block.match(new RegExp('(?:^|;)\\s*' + property + '\\s*:\\s*([^;]+)', 'i'));
    return match && match[1].trim();
  }
  function px(block, property) {
    const value = declaration(block, property);
    assert.ok(value, 'missing ' + property);
    return Number.parseFloat(value);
  }

  const line = rule('.rite-line');
  const progress = rule('.rite-progress');
  const tool = rule('.rite-tool');
  const tab = rule('.rite-tab');
  const retry = rule('.rite-retry');
  const close = rule('.rite-x');
  assert.ok(px(line, 'font-size') >= 16);
  assert.ok(px(progress, 'font-size') >= 14);
  assert.ok(px(tool, 'font-size') >= 16);
  assert.ok(px(tab, 'font-size') >= 16);
  assert.ok(px(retry, 'font-size') >= 16);
  assert.equal(declaration(close, 'font-family'), 'inherit');
  for (const block of [line, progress]) {
    assert.notEqual(declaration(block, 'overflow'), 'hidden');
    assert.notEqual(declaration(block, 'text-overflow'), 'ellipsis');
    assert.notEqual(declaration(block, 'white-space'), 'nowrap');
  }
});

test('mirror retry freezes workshop edits and a successful keep stays locked against double input', async () => {
  const r = makeRealm({'liber_vacui_slot': 'play'});
  await runClassic('src/state.js', r);
  const keepsakes = await loadModule('poppet-lab/keepsake.js', r);
  const {createKeepCommit, keepEditsLocked} = await loadModule('poppet-lab/keep-commit.js', r);
  let captures = 0;
  const coordinator = createKeepCommit({
    capture() {
      captures++;
      return {
        atlasCv: r.context.document.createElement('canvas'),
        clothCv: null,
        spec: {name: 'held drawing', P: {}, ink: '#123456', brush: 8}
      };
    },
    idPrefix: 'poppet-lab'
  });
  const controls = [{disabled: false}, {disabled: false}];
  const tools = [{disabled: false}, {disabled: false}];
  const props = [{disabled: false}];
  const popOverlay = {locked: false, setLocked(value) { this.locked = value; }};
  let beganKeeping = 0;
  Object.assign(r.context, {
    keepBusy: false,
    keepCommit: coordinator,
    keepEditsLocked,
    labReady: true,
    desk: {flashKeepsakeLocked() {}, setKeepsakeReady() {}},
    popOverlay,
    sliderEls: {props, size: controls[0], tools},
    updateLessonCard() {},
    updatePlaque() {},
    diagnoseKeepError() {},
    hint() {},
    syncLedger() {},
    beginKeeping() { beganKeeping++; },
    window: Object.assign(r.window, {__labDirty: true}),
    localStorage: r.storage,
    console: {error() {}}
  });
  const definitions = [
    await sourceBlock('poppet-lab/main.js', /^function editsLocked\(\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-lab/main.js', /^function hasPendingMirror\(\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-lab/main.js', /^function keepsakeReady\(\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-lab/main.js', /^function syncEditControls\(\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-lab/main.js', /^function pressKeepsake\(\) \{[\s\S]*?^\}/m)
  ];
  vm.runInContext(definitions.join('\n'), r.context);

  r.storage.deny = key => key === 'liber_vacui_v1__play';
  vm.runInContext('pressKeepsake()', r.context);
  assert.equal(r.context.keepBusy, false);
  assert.equal(coordinator.pending.record.name, 'held drawing');
  assert.equal(vm.runInContext('editsLocked()', r.context), true);
  assert.equal(popOverlay.locked, true);
  assert.equal(props[0].disabled, true);
  assert.equal(controls[0].disabled, true);
  assert.ok(tools.every(tool => tool.disabled));
  assert.equal(popOverlay.locked, true, 'CANVAS overlay must receive the lock');

  let mutationAttempts = 0;
  let undoAttempts = 0;
  let sliderBuilds = 0;
  let burnAttempts = 0;
  Object.assign(r.context, {
    activeLayer: 'body',
    markDirty() { mutationAttempts++; },
    getSheet() { mutationAttempts++; return null; },
    brushes: {body: {ink: '#123456', size: 8}},
    buildSliderMenu() { sliderBuilds++; },
    sheetUndo() { undoAttempts++; },
    startBurn() { burnAttempts++; }
  });
  const guardedEdits = [
    await sourceBlock('poppet-lab/main.js', /^function paintProxy\(sheet, x, y\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-lab/main.js', /^function bucketAt\(p\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-lab/main.js', /^function setLayer\(key\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-lab/main.js', /^function stampHull\(x, y\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-lab/main.js', /^function openSliderMenu\(noSync\) \{[\s\S]*?^\}/m),
    await sourceBlock('poppet-lab/main.js', /^window\.addEventListener\('keydown', function \(e\) \{[\s\S]*?^\}\);/m)
  ];
  vm.runInContext(guardedEdits.join('\n'), r.context);
  vm.runInContext("paintProxy('thoughts:thoughts', 1, 1); bucketAt({sheet: 'clothes', x: 1, y: 1}); setLayer('thoughts'); stampHull(1, 1); openSliderMenu();", r.context);
  r.handlers.get('keydown')({
    metaKey: true,
    ctrlKey: false,
    shiftKey: false,
    key: 'z',
    preventDefault() {}
  });
  assert.equal(mutationAttempts, 0, 'paint, thought, garment, and bucket edits must not reach their mutators');
  assert.equal(r.context.activeLayer, 'body');
  assert.equal(sliderBuilds, 0);
  assert.equal(undoAttempts, 0);

  let pointerDown;
  let picked = {object: {userData: {}}};
  let paintAttempts = 0;
  r.context.canvas = {
    addEventListener(name, callback) {
      if (name === 'pointerdown') pointerDown = callback;
    },
    setPointerCapture() {},
    classList: {add() {}}
  };
  r.context.pick = () => picked;
  r.context.deskPickables = () => [];
  r.context.paintProxy = () => { paintAttempts++; };
  r.context.labReady = true;
  r.context.px = r.context.py = r.context.idle = 0;
  r.context.ghost = {last: null, sheet: null, hullPart: null};
  r.context.undoArmed = false;
  const pointerHandler = await sourceBlock(
    'poppet-lab/main.js',
    /^canvas\.addEventListener\('pointerdown', function \(e\) \{[\s\S]*?^\}\);/m
  );
  vm.runInContext(pointerHandler, r.context);
  pointerDown({pointerId: 1, clientX: 10, clientY: 10});
  assert.equal(paintAttempts, 0);
  picked = {object: {userData: {burn: true}}};
  pointerDown({pointerId: 3, clientX: 10, clientY: 10});
  assert.equal(burnAttempts, 0, 'burn must not start through the pending-mirror pointer path');

  r.storage.deny = () => false;
  picked = {object: {userData: {panelBtn: 'keepsake'}}};
  pointerDown({pointerId: 2, clientX: 10, clientY: 10});
  assert.equal(r.context.keepBusy, true);
  assert.equal(r.context.keepCommit, null);
  assert.equal(r.context.window.__labDirty, false);
  assert.equal(beganKeeping, 1);
  assert.equal(captures, 1);
  assert.equal(keepsakes.readKeepsakes().length, 1);
  assert.equal(r.window.Liber.state.get().buddy[0].keepsakeN, 1);
  vm.runInContext('pressKeepsake()', r.context);
  assert.equal(beganKeeping, 1);
  assert.equal(captures, 1);
  assert.equal(keepsakes.readKeepsakes().length, 1);
});
