import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {makeRealm, loadModule} from './harness.mjs';

function trackedCanvas(width = 256, height = 256) {
  const marks = [];
  const canvas = {width, height, marks};
  canvas.toDataURL = () => 'data:image/png;base64,' +
    Buffer.from(JSON.stringify({width, height, marks})).toString('base64');
  const context = new Proxy({
    canvas,
    fillStyle: '#000',
    getImageData(_x, _y, sampleWidth = width, sampleHeight = height) {
      return {data: new Uint8ClampedArray(sampleWidth * sampleHeight * 4), width: sampleWidth, height: sampleHeight};
    }
  }, {
    get(target, key) {
      if (key in target) return target[key];
      return () => {};
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    }
  });
  context.createRadialGradient = () => ({addColorStop() {}});
  context.clearRect = (x, y, w, h) => {
    if (x === 0 && y === 0 && w >= width && h >= height) marks.length = 0;
  };
  context.drawImage = (source, x = 0, y = 0, w = source.width, h = source.height) => {
    for (const mark of source.marks || []) {
      marks.push({
        ...mark,
        x: x + mark.x * w / source.width,
        y: y + mark.y * h / source.height,
        radius: mark.radius == null ? undefined : mark.radius * w / source.width
      });
    }
  };
  context.beginPath = () => { context.currentArc = null; };
  context.arc = (x, y, radius) => { context.currentArc = {x, y, radius}; };
  context.fill = () => { if (context.currentArc) marks.push(context.currentArc); };
  context.stroke = () => { marks.push({stroke: true, color: context.strokeStyle}); };
  canvas.getContext = () => context;
  return canvas;
}

function uvBounds(mesh) {
  const uv = mesh.geometry.attributes.uv;
  const bounds = {minU: Infinity, maxU: -Infinity, minV: Infinity, maxV: -Infinity};
  for (let i = 0; i < uv.count; i++) {
    bounds.minU = Math.min(bounds.minU, uv.getX(i));
    bounds.maxU = Math.max(bounds.maxU, uv.getX(i));
    bounds.minV = Math.min(bounds.minV, uv.getY(i));
    bounds.maxV = Math.max(bounds.maxV, uv.getY(i));
  }
  return bounds;
}

async function actualDoll() {
  const realm = makeRealm();
  realm.context.document.createElement = tag => {
    if (tag !== 'canvas') throw new Error(`unexpected element: ${tag}`);
    return trackedCanvas();
  };
  realm.context.Image = class {
    set src(value) {
      this.source = value;
      const payload = JSON.parse(Buffer.from(value.split(',')[1], 'base64').toString());
      this.width = payload.width;
      this.height = payload.height;
      this.marks = payload.marks;
      queueMicrotask(() => this.onload());
    }
  };
  const T = await loadModule('vendor/three.module.js', realm);
  const {createDoll} = await loadModule('poppet-lab/doll.js?v=rite-draw6', realm);
  const kit = await loadModule('poppet-lab/paint-kit.js?v=kit3', realm);
  const scene = new T.Scene();
  const atlas = trackedCanvas(1024, 1024);
  const doll = createDoll(scene, atlas, null, {
    rng: () => 0.5,
    brush: () => ({ink: '#2b2016', size: 10})
  });
  doll.setParams(kit.defaultProportions());
  doll.rebuild('stand');
  doll.setFaceShell(true);
  doll.setHulls(true);
  return {realm, T, scene, atlas, doll, kit};
}

test('live craft and home entry points invalidate the changed doll modules', async () => {
  const paths = [
    'desktop.html',
    'src/poppet-rite.js',
    'poppet-lab/main.js',
    'poppet-home/home.js',
    'poppet-lab/entry.js',
    'poppet-lab.html',
    'poppet-home.html',
    'sigil.html'
  ];
  const sources = await Promise.all(paths.map(path =>
    fs.readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
  ));
  assert.match(sources[0], /src\/poppet-rite\.js\?v=rite25/);
  assert.match(sources[0], /styles\/poppet-rite\.css\?v=rite19/);
  assert.match(sources[1], /\.\.\/poppet-lab\/doll\.js\?v=rite-draw6/);
  assert.match(sources[2], /\.\/doll\.js\?v=rite-draw6/);
  assert.match(sources[3], /\.\.\/poppet-lab\/doll\.js\?v=rite-draw6/);
  assert.match(sources[4], /\.\/main\.js\?v=rite-draw10/);
  assert.match(sources[5], /poppet-lab\/entry\.js\?v=rite-draw10/);
  assert.match(sources[6], /poppet-home\/home\.js\?v=home26/);
  assert.match(sources[7], /poppet-lab\.html\?embed=frame&v=rite-draw10/);
  assert.ok(sources[2].includes('const canvasResizeObserver = new ResizeObserver(resize);'));
  assert.ok(sources[2].includes('canvasResizeObserver.observe(canvas);'));
  assert.ok(sources[7].includes("frame.addEventListener('load', function ()"));
  assert.ok(sources[7].includes("frame.contentWindow.dispatchEvent(new frame.contentWindow.Event('resize'));"));
});

async function actualRite({fresh = false} = {}) {
  const realm = makeRealm();
  if (!fresh) {
    realm.storage.setItem('poppet.keepsakes.v1', JSON.stringify([
      {n: 1, atlas: 'data:image/png;base64,c3ludGhldGlj'}
    ]));
  }
  let canonicalState = {};
  realm.window.Liber = {state: {
    get() { return canonicalState; },
    trySet(patch) { canonicalState = Object.assign({}, canonicalState, patch); return true; }
  }};
  const physicsFrames = [];
  const renderedParts = [];
  const rendererInstances = [];
  const dolls = [];
  const rafCallbacks = new Map();
  let rafId = 0;

  function node(tagName) {
    const listeners = new Map();
    const classes = new Set();
    const element = {
      tagName: tagName.toUpperCase(),
      id: '',
      children: [],
      dataset: {},
      style: {},
      hidden: false,
      disabled: false,
      clientWidth: 420,
      clientHeight: 282,
      addEventListener(name, fn) {
        const list = listeners.get(name) || [];
        list.push(fn);
        listeners.set(name, list);
      },
      removeEventListener(name, fn) {
        listeners.set(name, (listeners.get(name) || []).filter(item => item !== fn));
      },
      dispatch(name, event = {}) {
        for (const fn of listeners.get(name) || []) fn(event);
      },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      removeAttribute(name) { delete this.attributes[name]; },
      attributes: {},
      appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
        return child;
      },
      insertBefore(child, before) {
        const index = this.children.indexOf(before);
        this.children.splice(index < 0 ? this.children.length : index, 0, child);
        child.parentNode = this;
        return child;
      },
      removeChild(child) {
        const index = this.children.indexOf(child);
        if (index >= 0) this.children.splice(index, 1);
        child.parentNode = null;
        return child;
      },
      focus() {},
      setPointerCapture() {},
      contains(child) {
        if (child === this) return true;
        return this.children.some(item => item.contains(child));
      },
      getBoundingClientRect() {
        return {left: 0, top: 0, width: this.clientWidth, height: this.clientHeight};
      },
      get className() { return [...classes].join(' '); },
      set className(value) {
        classes.clear();
        String(value).split(/\s+/).filter(Boolean).forEach(name => classes.add(name));
      },
      get innerHTML() { return this._innerHTML || ''; },
      set innerHTML(value) {
        this._innerHTML = String(value);
        this.children.length = 0;
        const tags = /<([a-z][\w-]*)\b([^>]*)>/gi;
        for (const match of this._innerHTML.matchAll(tags)) {
          const [, tagName, sourceAttributes] = match;
          const child = node(tagName);
          const attribute = name => new RegExp('\\b' + name + '="([^"]*)"').exec(sourceAttributes)?.[1];
          child.className = attribute('class') || '';
          child.id = attribute('id') || '';
          child.disabled = /\sdisabled(?:\s|>|$)/.test(sourceAttributes);
          for (const data of sourceAttributes.matchAll(/\bdata-([\w-]+)="([^"]*)"/g)) {
            const key = data[1].replace(/-([a-z])/g, (_all, letter) => letter.toUpperCase());
            child.dataset[key] = data[2];
          }
          for (const attr of sourceAttributes.matchAll(/\b(aria-[\w-]+|role)="([^"]*)"/g)) {
            child.setAttribute(attr[1], attr[2]);
          }
          const style = attribute('style');
          if (style) child.style.cssText = style;
          this.appendChild(child);
        }
      },
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); },
        toggle(name, force) {
          const enabled = force === undefined ? !classes.has(name) : !!force;
          if (enabled) classes.add(name); else classes.delete(name);
          return enabled;
        }
      },
      querySelectorAll(selector) {
        const selectors = selector.split(',').map(value => value.trim());
        const descendants = [];
        function visit(parent) {
          for (const child of parent.children) {
            descendants.push(child);
            visit(child);
          }
        }
        visit(this);
        return descendants.filter(child => selectors.some(value => {
          if (value[0] === '.') {
            const className = /^\.([\w-]+)/.exec(value)?.[1];
            return className && child.classList.contains(className) &&
              (!value.includes('[data-tool]') || child.dataset.tool !== undefined);
          }
          if (value[0] === '#') return child.id === value.slice(1);
          return value === child.tagName.toLowerCase();
        }));
      },
      querySelector(selector) {
        return this.querySelectorAll(selector)[0] || (selector === '.rite-retry' ? node('button') : null);
      }
    };
    if (tagName === 'canvas') {
      const canvas = trackedCanvas(1, 1);
      const getContext = canvas.getContext;
      Object.assign(canvas, element);
      canvas.getContext = getContext;
      canvas.toDataURL = () => 'data:image/png;base64,c3ludGhldGlj';
      return canvas;
    }
    return element;
  }

  const stage = node('div');
  realm.context.window.addEventListener = () => {};
  realm.context.window.removeEventListener = () => {};
  realm.context.document.querySelector = selector => selector === '.screen-stage' ? stage : null;
  realm.context.document.createElement = tag => node(tag);
  realm.context.document.hidden = false;
  realm.context.window.devicePixelRatio = 1;
  realm.context.window.confirm = () => true;
  realm.context.window.removeEventListener = () => {};
  realm.context.requestAnimationFrame = fn => {
    const id = ++rafId;
    rafCallbacks.set(id, fn);
    return id;
  };
  realm.context.cancelAnimationFrame = id => rafCallbacks.delete(id);

  const resolveThree = await loadModule('vendor/three.module.js', realm);
  class PreviewRenderer {
    constructor(options) {
      this.domElement = options.canvas;
      this.frames = [];
      rendererInstances.push(this);
    }
    setPixelRatio() {}
    setSize() {}
    render(scene) {
      scene.updateMatrixWorld(true);
      const positions = [];
      scene.traverse(object => {
        if (object.isMesh && object.visible && object.userData.bodyPart) {
          positions.push(object.position.toArray().map(value => value.toFixed(3)).join(','));
        }
      });
      const unique = new Set(positions).size;
      this.frames.push({uniquePartPositions: unique, partCount: positions.length});
      renderedParts.push({uniquePartPositions: unique, partCount: positions.length});
    }
    dispose() {}
  }

  const importedModules = new Map();
  let moduleQueue = Promise.resolve();
  function importModule(specifier, referencingModule) {
    const job = moduleQueue.then(async () => {
      const url = new URL(specifier, referencingModule.identifier || riteUrl.href);
      if (importedModules.has(url.href)) return importedModules.get(url.href);
      const namespace = await loadModule(url, realm);
      const exports = Object.fromEntries(Object.keys(namespace).map(key => [key, namespace[key]]));
      if (url.pathname.endsWith('/three.module.js')) exports.WebGLRenderer = PreviewRenderer;
      if (url.pathname.endsWith('/doll.js')) {
        const createDoll = exports.createDoll;
        exports.createDoll = function (...args) {
          const doll = createDoll(...args);
          dolls.push(doll);
          const physicsFrame = doll.physicsFrame.bind(doll);
          doll.physicsFrame = function (dt) {
            physicsFrames.push(dt);
            return physicsFrame(dt);
          };
          return doll;
        };
      }
      const module = new vm.SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
      }, {context: realm.context, identifier: url.href});
      const pending = Promise.resolve().then(async () => {
        await module.link(() => { throw new Error('unexpected synthetic module dependency'); });
        await module.evaluate();
        return module;
      });
      importedModules.set(url.href, pending);
      return pending;
    });
    moduleQueue = job.catch(() => {});
    return job;
  }

  const riteUrl = new URL('../../src/poppet-rite.js', import.meta.url);
  const source = await fs.readFile(riteUrl, 'utf8');
  vm.runInContext(source, realm.context, {
    filename: riteUrl.href,
    importModuleDynamically: importModule
  });

  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('rite setup did not finish')), 2000);
    const session = realm.window.LiberPoppetRite.open({
      onReady(value) { clearTimeout(timeout); resolve(value); },
      onError(error) { clearTimeout(timeout); reject(error); }
    });
    if (!session) {
      clearTimeout(timeout);
      reject(new Error('rite session did not open'));
    }
  });
  const session = await ready;
  return {
    realm, session, physicsFrames, renderedParts, rendererInstances, rafCallbacks, dolls,
    get state() { return canonicalState; },
    close() { realm.window.LiberPoppetRite.close(); }
  };
}

function assertUvCanSampleCanvasPoint(mesh, canvas, x, y) {
  const b = uvBounds(mesh);
  const u = x / canvas.width;
  const v = 1 - y / canvas.height;
  assert.ok(u >= b.minU && u <= b.maxU, `paint u=${u} outside mesh UV ${b.minU}..${b.maxU}`);
  assert.ok(v >= b.minV && v <= b.maxV, `paint v=${v} outside mesh UV ${b.minV}..${b.maxV}`);
}

function positionAtUv(mesh, u, v) {
  const geometry = mesh.geometry;
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  const indices = geometry.index;
  const vertex = index => ({
    u: uvs.getX(index),
    v: uvs.getY(index),
    x: positions.getX(index),
    y: positions.getY(index),
    z: positions.getZ(index)
  });
  const count = indices ? indices.count : positions.count;

  for (let i = 0; i < count; i += 3) {
    const a = vertex(indices ? indices.getX(i) : i);
    const b = vertex(indices ? indices.getX(i + 1) : i + 1);
    const c = vertex(indices ? indices.getX(i + 2) : i + 2);
    const denominator = (b.v - c.v) * (a.u - c.u) + (c.u - b.u) * (a.v - c.v);
    if (Math.abs(denominator) < 1e-12) continue;
    const wa = ((b.v - c.v) * (u - c.u) + (c.u - b.u) * (v - c.v)) / denominator;
    const wb = ((c.v - a.v) * (u - c.u) + (a.u - c.u) * (v - c.v)) / denominator;
    const wc = 1 - wa - wb;
    if (wa < -1e-6 || wb < -1e-6 || wc < -1e-6) continue;
    return {
      x: wa * a.x + wb * b.x + wc * c.x,
      y: wa * a.y + wb * b.y + wc * c.y,
      z: wa * a.z + wb * b.z + wc * c.z
    };
  }
  throw new Error(`no face-shell triangle covers UV ${u},${v}`);
}

test('asymmetric rite brush marks map into the live doll material UVs', async () => {
  const {atlas, doll, kit} = await actualDoll();
  const sheets = kit.buildSheetSet(doll, atlas);
  const cases = [
    {surface: 'body', panel: 'chest', mesh: doll.M().chest},
    {surface: 'body', panel: 'armLU', mesh: doll.M().armLU},
    {surface: 'face', panel: 'face', mesh: doll.M().face_face},
    {surface: 'eyes', panel: 'eyes', mesh: doll.M().face_eyes},
    {surface: 'hair', panel: 'hair', mesh: doll.M().face_hair},
    {surface: 'clothes', panel: 'armLU', mesh: doll.M().hull_armLU}
  ];

  for (const item of cases) {
    const sheet = sheets[item.surface];
    const rect = sheet.ws.panels && sheet.ws.panels[item.panel];
    assert.ok(rect, `${item.surface} sheet exposes its visible paint region`);
    const x = (rect[0] + rect[2] * 0.23) * sheet.cv.width;
    const y = (rect[1] + rect[3] * 0.71) * sheet.cv.height;
    const before = sheet.cv.marks.length;
    const textureVersion = sheet.tex.version;

    sheet.stamp(x, y, 5, '#b03a2a');

    assert.equal(sheet.cv.marks.length, before + 1, `${item.surface} recorded the brush mark`);
    assert.ok(sheet.tex.version > textureVersion, `${item.surface} live material texture was dirtied`);
    assert.equal(item.mesh.material.map, sheet.tex, `${item.surface} paints the texture used by its living mesh`);
    assertUvCanSampleCanvasPoint(item.mesh, sheet.cv, x, y);
  }
});

test('all authored template marks land inside their real mesh-derived face and hull crops', async () => {
  const {realm, atlas, doll, kit} = await actualDoll();
  const {TEMPLATES} = await loadModule('src/first-rite-data.js?v=rite-data3', realm);
  const sheets = kit.buildSheetSet(doll, atlas);
  for (const template of TEMPLATES) {
    for (const [key, points] of [
      ['hair', template.marks.hair.flat()],
      ['eyes', template.marks.eyes.flat()],
      ['face', template.marks.face.flat()]
    ]) {
      const rect = sheets[key].ws.panels[key];
      for (const [x, y] of points) {
        assert.ok(x >= rect[0] && x <= rect[0] + rect[2], `${template.id} ${key} stroke is inside its UV crop`);
        assert.ok(y >= rect[1] && y <= rect[1] + rect[3], `${template.id} ${key} stroke is inside its UV crop`);
      }
    }
    for (const [part, x, y] of template.marks.hull) {
      const rect = doll.hullRects[part];
      assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1, `${template.id} hull mark is inside ${part}`);
      assert.ok(rect[0] >= 0 && rect[0] + rect[2] <= 1, `${template.id} references a valid hull strip`);
    }
  }
});

test('first rite exposes face, eight clothing, and four drawing targets in four chapters', async t => {
  const app = await actualRite();
  t.after(app.close);
  const steps = app.realm.window.LiberPoppetRite.steps;
  assert.equal(steps.length, 15);
  assert.deepEqual(Array.from(steps.slice(0, 3), step => [step.id, step.surf, step.panel]), [
    ['hair', 'hair', 'hair'],
    ['eyes', 'eyes', 'eyes'],
    ['mouth', 'face', 'face']
  ]);
  assert.deepEqual(Array.from(steps.slice(3, 11), step => step.panel),
    ['armLU', 'armRU', 'armLL', 'armRL', 'legLU', 'legRU', 'legLL', 'legRL']);
  assert.ok(steps.slice(3, 11).every(step => step.surf === 'clothes'));
  assert.ok(steps.slice(11).every(step => step.surf === 'drawing'));
  assert.ok(steps.every(step => step.surf !== 'body'));
  assert.equal(app.session.shell.querySelectorAll('.rite-chapter').length, 4);
  assert.equal(app.session.shell.querySelectorAll('.rite-tab').length, 0);
});

test('fresh first rite persists ten answers, offers three specimens, and requires each manual keep', async t => {
  const app = await actualRite({fresh: true});
  t.after(app.close);
  assert.equal(app.state.firstRite.phase, 'questions');
  for (let index = 0; index < 10; index++) {
    app.session.shell.querySelectorAll('.rite-answer')[0].dispatch('click');
    app.session.shell.querySelector('#rite-footer').querySelector('#rite-next').dispatch('click');
  }

  assert.equal(app.state.firstRite.phase, 'suggestions');
  assert.equal(app.session.suggestions.length, 3);
  assert.equal(app.session.suggestions[0].id, app.state.firstRite.resultId);
  assert.equal(app.session.palette.inks.length, 6);
  assert.equal(new Set(app.session.palette.inks.map(ink => ink.hex)).size, 6);
  assert.equal(app.session.shell.querySelectorAll('.rite-niche').length, 3);
  assert.equal(app.session.shell.querySelectorAll('.rite-well').length, 6);
  const selected = app.session.shell.querySelectorAll('.rite-niche')[2];
  selected.dispatch('click');
  assert.equal(app.state.firstRite.templateId, selected.dataset.template);
  app.session.shell.querySelector('#rite-footer').querySelector('#rite-next').dispatch('click');

  assert.equal(app.state.firstRite.phase, 'making');
  assert.equal(app.state.firstRite.confirmed, true);
  assert.equal(app.session.resolved.hair, undefined, 'template pre-paint never completes a step');
  assert.ok(app.session.sheets.hair.cv.marks.length > 0, 'the selected specimen actually arrives pre-painted');
  app.session.shell.querySelectorAll('.rite-chapter')[1].dispatch('click');
  assert.equal(app.session.idx, 0, 'chapter markers cannot skip the unresolved face steps');

  const canvas = app.session.shell.querySelector('#rite-sheet-wrap').children.find(child => child.tagName === 'CANVAS');
  canvas.dispatch('pointerdown', {preventDefault() {}, pointerId: 1, clientX: 210, clientY: 141});
  canvas.dispatch('pointerup');
  assert.equal(app.session.resolved.hair, true, 'a valid paint action resolves the current part');
  app.session.shell.querySelector('#rite-footer').querySelector('#rite-accept').dispatch('click');
  assert.equal(app.session.resolved.hair, true, 'the explicit keep control also resolves the current part');
  app.session.shell.querySelector('#rite-footer').querySelector('#rite-next').dispatch('click');
  assert.equal(app.session.idx, 1, 'manual next moves exactly one substep');
  app.session.shell.querySelectorAll('.rite-chapter')[1].dispatch('click');
  assert.equal(app.session.idx, 1, 'chapter markers cannot pass another unresolved part');
});

test('the actual rite pointer path paints only the visible face crop onto the living head', async t => {
  const app = await actualRite();
  t.after(app.close);
  const canvas = app.session.shell.querySelector('#rite-sheet-wrap').children.find(child => child.tagName === 'CANVAS');
  const sheet = app.session.sheets.hair;
  const doll = app.dolls[0];
  const hairVersion = sheet.tex.version;
  const eyesVersion = app.session.sheets.eyes.tex.version;
  canvas.dispatch('pointerdown', {preventDefault() {}, pointerId: 1, clientX: 210, clientY: 10});
  canvas.dispatch('pointerup');
  assert.equal(app.session.strokes, 0, 'letterbox clicks do not resolve the part');
  assert.equal(app.session.resolved.hair, undefined);

  canvas.dispatch('pointerdown', {preventDefault() {}, pointerId: 1, clientX: 210, clientY: 141});
  canvas.dispatch('pointerup');

  assert.equal(app.session.strokes, 1, 'the real rite pointer handler accepted one stroke');
  assert.ok(sheet.tex.version > hairVersion, 'the live hair texture was dirtied');
  assert.equal(app.session.sheets.eyes.tex.version, eyesVersion, 'a neighboring face region was not changed');
  assert.equal(doll.M().face_hair.material.map, sheet.tex);
  const mark = sheet.cv.marks.at(-1);
  const point = positionAtUv(doll.M().face_hair, mark.x / sheet.cv.width, 1 - mark.y / sheet.cv.height);
  assert.ok(point.z > 0.05, 'the painted point belongs to the visible hair surface');
});

test('face, eyes, and hair paint land on the front of the living head', async () => {
  const {T, scene, atlas, doll, kit} = await actualDoll();
  const sheets = kit.buildSheetSet(doll, atlas);
  const R = doll.dims().R;
  scene.updateMatrixWorld(true);

  for (const [surface, panel, meshKey] of [
    ['face', 'face', 'face_face'],
    ['eyes', 'eyes', 'face_eyes'],
    ['hair', 'hair', 'face_hair']
  ]) {
    const mesh = doll.M()[meshKey];
    const sheet = sheets[surface];
    const rect = sheet.ws.panels[panel];
    const x = (rect[0] + rect[2] * 0.5) * sheet.cv.width;
    const y = (rect[1] + rect[3] * 0.5) * sheet.cv.height;
    sheet.stamp(x, y, 5, '#c9962e');

    assert.equal(mesh.parent, doll.body, `${surface} shell follows the doll's world transform`);
    assert.ok(mesh.position.distanceTo(doll.M().head.position) < 1e-6, `${surface} shell is centered on the head`);
    assert.equal(mesh.material.emissiveMap, sheet.tex, `${surface} pigment remains visible in shadow`);
    assert.equal(mesh.material.emissiveIntensity, 0.3, `${surface} pigment uses a restrained lift`);

    const point = positionAtUv(mesh, x / sheet.cv.width, 1 - y / sheet.cv.height);
    const local = new T.Vector3(point.x, point.y, point.z);
    assert.ok(local.z > R * 0.4, `${surface} mark lies on the camera-facing head surface`);
    assert.ok(
      Math.abs(local.length() - R * 1.015) < R * 0.015,
      `${surface} mark stays close enough to the head to read as paint, not a floating shell`
    );

    const headCenter = doll.M().head.localToWorld(new T.Vector3(0, 0, 0));
    const paintPoint = mesh.localToWorld(local);
    assert.ok(
      Math.abs(paintPoint.distanceTo(headCenter) - R * 1.015) < R * 0.015,
      `${surface} mark survives the actual doll scene transform`
    );
  }
});

test('the transparent clothing hull lifts ink without lighting its clear canvas', async () => {
  const {doll} = await actualDoll();
  const hull = doll.M().hull_armLU;
  assert.equal(hull.material.map, doll.hullTex);
  assert.equal(hull.material.emissiveMap, doll.hullTex);
  assert.equal(hull.material.emissiveIntensity, 0.3);
});

test('rebuilding the living doll releases its previous Three.js resources', async () => {
  const {scene, doll} = await actualDoll();
  for (let cycle = 0; cycle < 8; cycle++) {
    const oldGeometries = new Set();
    const oldMaterials = new Set();
    const disposedGeometries = new Set();
    const disposedMaterials = new Set();
    let oldGlyphs = 0;
    scene.traverse(object => {
      if (object.geometry) {
        oldGeometries.add(object.geometry);
        object.geometry.addEventListener('dispose', () => disposedGeometries.add(object.geometry));
      }
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!material) continue;
        oldMaterials.add(material);
        material.addEventListener('dispose', () => disposedMaterials.add(material));
      }
      if (object.userData && object.userData.glyph) oldGlyphs++;
    });
    assert.equal(oldGlyphs, 35, `cycle ${cycle}: one active group of seven glyph meshes per thought kind`);

    doll.rebuild('stand');

    assert.equal(disposedGeometries.size, oldGeometries.size, `cycle ${cycle}: removed geometries release renderer resources`);
    assert.equal(disposedMaterials.size, oldMaterials.size, `cycle ${cycle}: removed materials release renderer resources`);
    let liveGlyphs = 0;
    scene.traverse(object => {
      if (object.userData && object.userData.glyph) liveGlyphs++;
    });
    assert.equal(liveGlyphs, 35, `cycle ${cycle}: rebuild replaces rather than accumulates hidden thought glyphs`);
  }
});

test('paint on every living poppet sheet survives a keepsake read and real-doll restoration', async () => {
  const first = await actualDoll();
  const sheets = first.kit.buildSheetSet(first.doll, first.atlas);
  const surfaces = [
    {key: 'body', panel: 'chest', meshKey: 'chest', mesh: first.doll.M().chest},
    {key: 'face', panel: 'face', meshKey: 'face_face', mesh: first.doll.M().face_face},
    {key: 'eyes', panel: 'eyes', meshKey: 'face_eyes', mesh: first.doll.M().face_eyes},
    {key: 'hair', panel: 'hair', meshKey: 'face_hair', mesh: first.doll.M().face_hair},
    {key: 'clothes', panel: 'armLU', meshKey: 'hull_armLU', mesh: first.doll.M().hull_armLU}
  ];

  for (const item of surfaces) {
    const sheet = sheets[item.key];
    const rect = sheet.ws.panels[item.panel];
    const x = (rect[0] + rect[2] * 0.31) * sheet.cv.width;
    const y = (rect[1] + rect[3] * 0.67) * sheet.cv.height;
    sheet.stamp(x, y, 5, '#b03a2a');
    assert.equal(item.mesh.material.map.image, sheet.cv, `${item.key} mesh samples its painted canvas`);
    assert.ok(sheet.cv.marks.length > 0, `${item.key} keeps the asymmetric brush mark`);
  }

  const keepsakes = await loadModule('poppet-lab/keepsake.js?v=rite-draw3', first.realm);
  const paint = keepsakes.snapshotDollSheets(first.doll);
  keepsakes.saveKeepsake(first.atlas, first.doll.clothCtx.canvas, {
    name: 'test poppet',
    P: first.kit.defaultProportions(),
    face: paint.face,
    hull: paint.hull
  });
  const record = keepsakes.readKeepsakes()[0];
  assert.ok(record.atlas.startsWith('data:image/'));
  assert.ok(record.face.face.startsWith('data:image/'));
  assert.ok(record.hull.startsWith('data:image/'));

  const T = first.T;
  const restoredScene = new T.Scene();
  const restoredAtlas = trackedCanvas(1024, 1024);
  const {createDoll} = await loadModule('poppet-lab/doll.js?v=rite-draw6', first.realm);
  const restoredDoll = createDoll(restoredScene, restoredAtlas, null, {
    rng: () => 0.5,
    brush: () => ({ink: '#2b2016', size: 10})
  });
  const params = first.kit.defaultProportions();
  restoredDoll.setParams(params);
  restoredDoll.rebuild('stand');
  restoredDoll.setFaceShell(true);
  restoredDoll.setHulls(true);

  const {restoreKeptDoll} = await loadModule('poppet-lab/restore-kept.js?v=rite-draw3', first.realm);
  const restored = await restoreKeptDoll({doll: restoredDoll, record, params});
  assert.equal(restored.status, 'restored');

  const restoredSheets = first.kit.buildSheetSet(restoredDoll, restoredAtlas);
  for (const item of surfaces) {
    const sheet = restoredSheets[item.key];
    const mesh = restoredDoll.M()[item.meshKey];
    assert.ok(sheet.cv.marks.length > 0, `${item.key} mark remains after actual restoration`);
    assert.equal(mesh.material.map, sheet.tex, `${item.key} restored canvas remains bound to the living mesh`);
    assert.equal(mesh.material.map.image, sheet.cv);
  }
});

test('the rite keeps its actual articulated companion framed across piece changes', async () => {
  const {realm, T, scene, doll} = await actualDoll();
  const {dollFrameGoal} = await loadModule('poppet-lab/frame-doll.js?v=frame1', realm);
  const source = await fs.readFile(new URL('../../src/poppet-rite.js', import.meta.url), 'utf8');
  assert.match(source, /MOD\.framing\.dollFrameGoal\(s\.pvCamera,\s*doll,\s*'all',\s*0\.1\)/);

  const camera = new T.PerspectiveCamera(38, 1, 0.05, 60);
  const goal = dollFrameGoal(camera, doll, 'all', 0.1);
  camera.position.copy(goal.pos);
  camera.lookAt(goal.look);
  scene.updateMatrixWorld(true);

  for (const mesh of Object.values(doll.M()).filter(value => value && value.isMesh && value.visible)) {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const point = new T.Vector3(x, y, z).project(camera);
          assert.ok(Math.abs(point.x) <= 0.8 + 1e-6, `${mesh.name} exceeds the full-doll horizontal margin`);
          assert.ok(Math.abs(point.y) <= 0.8 + 1e-6, `${mesh.name} exceeds the full-doll vertical margin`);
        }
      }
    }
  }
});

test('the actual rite synchronizes the articulated doll before preview rendering', async () => {
  const rite = await actualRite();
  try {
    assert.deepEqual(rite.physicsFrames, [0], 'initial doll pose is synchronized before framing');
    const frame = [...rite.rafCallbacks.entries()].at(-1);
    assert.ok(frame, 'rite schedules its actual preview loop');
    rite.rafCallbacks.delete(frame[0]);
    frame[1](performance.now() + 50);

    assert.deepEqual(rite.physicsFrames, [0, 0.05], 'each preview frame advances the real doll');
    assert.ok(rite.renderedParts.length > 0, 'the actual preview renderer received a frame');
    assert.ok(rite.renderedParts[0].partCount > 10, 'the preview contains the real body-part meshes');
    assert.ok(
      rite.renderedParts[0].uniquePartPositions > 8,
      'the articulated body parts are distributed before rendering rather than collapsed at the origin'
    );
  } finally {
    rite.close();
  }
});

test('crafting uses the shipped House Font and keeps its working surfaces tactile', async () => {
  const css = await fs.readFile(new URL('../../styles/poppet-rite.css', import.meta.url), 'utf8');
  const html = await fs.readFile(new URL('../../desktop.html', import.meta.url), 'utf8');
  assert.match(css, /@font-face\s*\{[^}]*font-family:\s*'House Font'[^}]*url\('\.\.\/assets\/fonts\/House%20Font\.ttf'\)/s);
  assert.match(css, /#poppet-rite\s*\{[^}]*font-family:\s*'House Font'/s);
  assert.match(css, /\.rite-sheet-wrap\s*\{[^}]*box-shadow:/s);
  assert.match(html, /styles\/poppet-rite\.css\?v=rite\d+/);
});
