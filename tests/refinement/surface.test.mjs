import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, loadModule} from './harness.mjs';

function fakeElement() {
  const attributes = {};
  const classes = new Set();
  const children = [];
  const listeners = {};
  const ctx = {
    clearRect() {}, fillRect() {}, drawImage() {}, strokeRect() {},
    save() {}, restore() {}, beginPath() {}, arc() {}, fill() {}
  };
  const node = {
    style: {},
    children,
    listeners,
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, on) {
        if (on === undefined ? !classes.has(name) : on) classes.add(name);
        else classes.delete(name);
      }
    },
    addEventListener(type, listener) { listeners[type] = listener; },
    appendChild(child) { children.push(child); return child; },
    getAttribute(name) { return attributes[name] || null; },
    setAttribute(name, value) { attributes[name] = value; },
    getBoundingClientRect() { return {left: 0, top: 0, width: 512, height: 512}; },
    getContext() { return ctx; },
    setPointerCapture() {},
    querySelectorAll() { return children; }
  };
  let html = '';
  Object.defineProperty(node, 'innerHTML', {
    get() { return html; },
    set(value) { html = value; if (value === '') children.length = 0; }
  });
  return node;
}

function pixelCanvas(start) {
  let pixels = Uint8ClampedArray.from(start);
  const ctx = {
    getImageData: () => ({data: pixels.slice(), width: 1, height: 1}),
    putImageData: image => { pixels = image.data.slice(); }
  };
  return {
    canvas: {width: 1, height: 1, getContext: () => ctx},
    pixels: () => [...pixels]
  };
}

test('one worksurface undo restores the previous actual sheet buffer', async () => {
  const realm = makeRealm();
  const {makeWorksurface} = await loadModule('poppet-lab/surface.js', realm);
  let pixels = Uint8ClampedArray.from([1, 2, 3, 255]);
  const ctx = {
    getImageData: () => ({data: pixels.slice(), width: 1, height: 1}),
    putImageData: image => { pixels = image.data.slice(); }
  };
  const cv = {width: 1, height: 1, getContext: () => ctx};
  const tex = {};
  const sheet = makeWorksurface({cv, tex});

  sheet.pushUndo();
  pixels = Uint8ClampedArray.from([200, 150, 10, 255]);

  assert.equal(sheet.undo(), true);
  assert.deepEqual([...pixels], [1, 2, 3, 255]);
  assert.equal(tex.needsUpdate, true);
  assert.equal(sheet.undo(), false);
});

test('letterboxed pointer positions and active atlas panels map to source pixels', async () => {
  const realm = makeRealm();
  const {makeWorksurface} = await loadModule('poppet-lab/surface.js', realm);
  const {mapOverlayPoint} = await loadModule('poppet-lab/poppet.js', realm);
  const ctx = {
    getImageData: () => ({data: new Uint8ClampedArray(0), width: 512, height: 256}),
    putImageData() {}
  };
  const rect = {left: 0, top: 0, width: 512, height: 512};
  const cv = {
    width: 512,
    height: 256,
    getContext: () => ctx,
    getBoundingClientRect: () => rect
  };
  const sheet = makeWorksurface({
    cv,
    el: {getBoundingClientRect: () => rect},
    panels: {head: [0.25, 0.75, 0.5, 0.25]}
  });

  const center = sheet.pos({clientX: 256, clientY: 256});
  const top = sheet.pos({clientX: 256, clientY: 0});
  assert.equal(center.x, 256);
  assert.equal(center.y, 128);
  assert.equal(top.x, 256);
  assert.equal(top.y, -128);
  assert.equal(sheet.panelAt(256, 224), 'head');
  assert.equal(sheet.panelAt(256, 180), null);
  const zoomed = mapOverlayPoint(
    {clientX: 256, clientY: 256},
    rect,
    {sx: 128, sy: 160, sw: 256, sh: 128},
    cv.width,
    cv.height
  );
  assert.equal(zoomed.x, 256);
  assert.equal(zoomed.y, 224);
  assert.equal(sheet.panelAt(zoomed.x, zoomed.y), 'head');
});

test('the CANVAS overlay uses the same sheet object and undo history as DOLL DRAW', async () => {
  const realm = makeRealm();
  const root = fakeElement();
  const selectors = {
    '#poppet-sub': fakeElement(),
    '.poppet-inks': fakeElement(),
    '#poppet-ink-name': fakeElement(),
    '.poppet-size': fakeElement(),
    '.poppet-size-v': fakeElement(),
    '.poppet-undo': fakeElement(),
    '.poppet-wash': fakeElement(),
    '.poppet-cv': fakeElement(),
    '.poppet-doll-btn': fakeElement(),
    '.poppet-x': fakeElement(),
    '.poppet-prog': fakeElement(),
    '.poppet-prompt': fakeElement(),
    '#poppet-phase': fakeElement(),
    '#poppet-prev': fakeElement(),
    '#poppet-next': fakeElement()
  };
  const tools = ['brush', 'bucket', 'erase'].map(tool => {
    const button = fakeElement();
    button.setAttribute('data-tool', tool);
    return button;
  });
  root.querySelector = selector => selectors[selector] || null;
  root.querySelectorAll = selector => selector === '[data-tool]' ? tools : [];
  realm.context.document.createElement = tag => tag === 'div' ? root : fakeElement();
  realm.context.document.body = fakeElement();

  const {makeWorksurface} = await loadModule('poppet-lab/surface.js', realm);
  const {buildPoppetOverlay} = await loadModule('poppet-lab/poppet.js', realm);
  const sharedBuffer = pixelCanvas([1, 2, 3, 255]);
  const fallbackBuffer = pixelCanvas([4, 5, 6, 255]);
  const shared = makeWorksurface({cv: sharedBuffer.canvas, tex: {}});
  let selectedTool = 'brush';
  let changes = 0;
  const overlay = buildPoppetOverlay(fakeElement(), {
    ink: () => '#2b2016',
    brush: () => 10,
    getTool: () => selectedTool,
    setTool: tool => { selectedTool = tool; },
    getSurface: key => key === 'body' ? shared : null,
    canEdit: () => true,
    setInk() {},
    setSize() {},
    washSheet() {},
    weaveFor: () => null,
    onChange: () => { changes++; },
    doll: {bodyCv: fallbackBuffer.canvas, bodyTex: {}, ATLAS: {}}
  });

  overlay.open('body', 0);
  shared.pushUndo();
  sharedBuffer.canvas.getContext().putImageData({
    data: Uint8ClampedArray.from([200, 150, 10, 255])
  }, 0, 0);

  assert.equal(overlay.surface('body'), shared);
  overlay.setTool('bucket');
  assert.equal(selectedTool, 'bucket');
  assert.equal(overlay.st.tool, 'bucket');
  selectedTool = 'erase';
  overlay.syncBrush();
  assert.equal(overlay.st.tool, 'erase');
  assert.equal(tools[2].getAttribute('aria-pressed'), 'true');
  overlay.setLocked(true);
  assert.equal(selectors['.poppet-cv'].inert, true);
  assert.equal(selectors['.poppet-undo'].disabled, true);
  assert.equal(selectors['.poppet-size'].disabled, true);
  assert.equal(selectors['.poppet-x'].disabled, undefined);
  overlay.setLocked(false);
  selectors['.poppet-undo'].listeners.click();
  assert.equal(changes, 1);
  assert.deepEqual(sharedBuffer.pixels(), [1, 2, 3, 255]);
  assert.deepEqual(fallbackBuffer.pixels(), [4, 5, 6, 255]);
});
