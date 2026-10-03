import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, loadModule, plain} from './harness.mjs';

const DRAWING_IDS = [
  'personal-unconscious-1', 'personal-unconscious-2',
  'shadow-surrender-1', 'shadow-surrender-2'
];
const LAYERS = ['personal-unconscious', 'personal-unconscious', 'shadow-surrender', 'shadow-surrender'];

function pixelCanvas(width = 128, height = 128) {
  let w = width, h = height;
  let pixels = new Uint8ClampedArray(w * h * 4);
  const canvas = {};
  const context = {
    get canvas() { return canvas; },
    getImageData(x = 0, y = 0, imageWidth = w, imageHeight = h) {
      const data = new Uint8ClampedArray(imageWidth * imageHeight * 4);
      for (let row = 0; row < imageHeight; row++) {
        const from = ((y + row) * w + x) * 4;
        data.set(pixels.subarray(from, from + imageWidth * 4), row * imageWidth * 4);
      }
      return {data, width: imageWidth, height: imageHeight};
    },
    putImageData(image, x = 0, y = 0) {
      for (let row = 0; row < image.height; row++) {
        const to = ((y + row) * w + x) * 4;
        pixels.set(image.data.subarray(row * image.width * 4, (row + 1) * image.width * 4), to);
      }
    },
    clearRect(x, y, clearWidth, clearHeight) {
      for (let row = y; row < Math.min(h, y + clearHeight); row++) {
        pixels.fill(0, (row * w + x) * 4, (row * w + Math.min(w, x + clearWidth)) * 4);
      }
    },
    drawImage(source) {
      if (source.pixels) pixels.set(source.pixels.subarray(0, pixels.length));
    },
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    save() {}, restore() {}, rect() {}, clip() {}, arc() {}, fill() {}
  };
  Object.defineProperties(canvas, {
    width: {get: () => w, set: value => { w = value; pixels = new Uint8ClampedArray(w * h * 4); }},
    height: {get: () => h, set: value => { h = value; pixels = new Uint8ClampedArray(w * h * 4); }}
  });
  canvas.getContext = () => context;
  canvas.toDataURL = () => 'data:image/png;base64,' + Buffer.from(JSON.stringify({
    width: w,
    height: h,
    pixels: Buffer.from(pixels).toString('base64')
  })).toString('base64');
  canvas.setPixel = (x, y, color) => pixels.set(color, (y * w + x) * 4);
  canvas.pixels = () => pixels;
  return canvas;
}

function paintRing(canvas, color) {
  for (let y = 4; y < 24; y++) {
    for (let x = 4; x < 24; x++) {
      if (x < 10 || x > 17 || y < 10 || y > 17) canvas.setPixel(x, y, [...color, 255]);
    }
  }
  for (let y = 7; y < 11; y++) {
    for (let x = 28; x < 32; x++) canvas.setPixel(x, y, [...color, 255]);
  }
}

test('transparent thought slips extrude separate coloured silhouettes with real holes', async () => {
  const realm = makeRealm();
  const THREE = await loadModule('vendor/three.module.js', realm);
  const drawings = await loadModule('poppet-lab/rite-drawings.js', realm);
  const width = 36, height = 30, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 3; y < 23; y++) {
    for (let x = 3; x < 23; x++) {
      if (x < 9 || x > 16 || y < 9 || y > 16) data[(y * width + x) * 4 + 3] = 255;
    }
  }
  for (let y = 8; y < 12; y++) {
    for (let x = 28; x < 32; x++) data[(y * width + x) * 4 + 3] = 255;
  }
  const contours = drawings.traceSilhouettes({data}, width, height);
  assert.equal(contours.length, 2, 'disconnected strokes become independent shapes');
  assert.equal(contours[0].holes.length, 1, 'transparent interior is retained as a hole');
  assert.equal(contours[1].holes.length, 0);

  const geometries = drawings.buildDrawingGeometries({data}, width, height, {THREE, depth: 0.04});
  assert.equal(geometries.length, 2);
  for (const geometry of geometries) {
    geometry.computeBoundingBox();
    assert.ok(Math.abs(geometry.boundingBox.max.z - geometry.boundingBox.min.z - 0.04) < 1e-6);
  }
  const ringMesh = new THREE.Mesh(geometries[0], new THREE.MeshBasicMaterial({side: THREE.DoubleSide}));
  const intersects = (x, y) => new THREE.Raycaster(
    new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1)
  ).intersectObject(ringMesh).length;
  assert.ok(intersects(7 / width - 0.5, 6 / height * -1 + 0.5) > 0, 'inked ring surface is solid');
  assert.equal(intersects(12 / width - 0.5, 12 / height * -1 + 0.5), 0, 'the hole remains empty through the extrusion');
});

test('a new stroke touching a ring keeps the connected extrusion and its hole', async () => {
  const realm = makeRealm();
  const drawings = await loadModule('poppet-lab/rite-drawings.js', realm);
  const width = 128, height = 128, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 40; y <= 88; y++) {
    for (let x = 40; x <= 98; x++) {
      if ((x <= 75 && (x < 48 || x > 67 || y < 48 || y > 80)) ||
          (x >= 75 && y >= 60 && y <= 68)) {
        data[(y * width + x) * 4 + 3] = 255;
      }
    }
  }
  const contours = drawings.traceSilhouettes({data}, width, height);
  assert.equal(contours.length, 1, 'the touching line joins the ring as one silhouette');
  assert.equal(contours[0].holes.length, 1, 'the original transparent hole survives the new stroke');
});

test('saved colored drawings round-trip into four head-attached extruded meshes', async () => {
  const realm = makeRealm();
  realm.context.document.createElement = () => pixelCanvas();
  realm.context.Image = class {
    set src(value) {
      const payload = JSON.parse(Buffer.from(value.split(',')[1], 'base64').toString());
      this.width = payload.width;
      this.height = payload.height;
      this.pixels = new Uint8ClampedArray(Buffer.from(payload.pixels, 'base64'));
      queueMicrotask(() => this.onload());
    }
  };
  const THREE = await loadModule('vendor/three.module.js', realm);
  const {createDoll} = await loadModule('poppet-lab/doll.js?v=rite-draw6', realm);
  const kit = await loadModule('poppet-lab/paint-kit.js?v=kit3', realm);
  const keepsakes = await loadModule('poppet-lab/keepsake.js?v=rite-draw3', realm);
  const {restoreKeptDoll} = await loadModule('poppet-lab/restore-kept.js?v=rite-draw3', realm);
  const scene = new THREE.Scene();
  const atlas = pixelCanvas(32, 32);
  const makeDoll = canvas => {
    const doll = createDoll(scene, canvas, null, {rng: () => 0.5, brush: () => ({ink: '#2b2016', size: 10})});
    doll.setParams(kit.defaultProportions());
    doll.rebuild('stand');
    doll.setFaceShell(true);
    doll.setHulls(true);
    return doll;
  };
  const doll = makeDoll(atlas);
  const sources = DRAWING_IDS.map((id, index) => {
    const canvas = pixelCanvas();
    paintRing(canvas, [[214, 155, 53], [90, 145, 80], [80, 110, 180], [165, 80, 120]][index]);
    return {id, layer: LAYERS[index], canvas};
  });
  assert.equal(doll.setRiteDrawings(sources), 4);
  const originalOrbit = doll.M().head.children.at(-1);
  assert.equal(originalOrbit.parent, doll.M().head);
  assert.equal(originalOrbit.children.length, 4);
  const headRadius = doll.M().head.geometry.parameters.radius;
  const orbitDistances = originalOrbit.children.map((drawing, index) => {
    const center = drawing.position.clone().add(originalOrbit.position);
    const size = index < 2 ? 0.24 : 0.20;
    assert.ok(center.length() - size * Math.SQRT1_2 > headRadius,
      'each colored silhouette clears the head surface instead of hiding inside it');
    return center.length();
  });
  assert.ok(orbitDistances[0] < orbitDistances[2] && orbitDistances[1] < orbitDistances[3],
    'shadow slips orbit slightly farther from the head than personal slips');
  const sourceTexture = originalOrbit.children[0].children[0].material[1].map;
  assert.equal(sourceTexture.image, sources[0].canvas);
  assert.deepEqual(Array.from(sources[0].canvas.getContext('2d').getImageData(5, 5, 1, 1).data), [214, 155, 53, 255]);

  const snapshot = keepsakes.snapshotRiteDrawings(doll);
  const saved = keepsakes.saveKeepsake(atlas, null, {P: kit.defaultProportions(), riteDrawings: snapshot});
  const record = keepsakes.readKeepsakes()[0];
  assert.deepEqual(plain(record.riteDrawings), plain(saved.record.riteDrawings));

  const restoredAtlas = pixelCanvas(32, 32);
  const restoredDoll = makeDoll(restoredAtlas);
  const restored = await restoreKeptDoll({doll: restoredDoll, record, params: kit.defaultProportions()});
  assert.equal(restored.status, 'restored');
  assert.equal(restored.riteDrawingCount, 4);
  assert.deepEqual(Array.from(restoredDoll.getRiteDrawings(), drawing => drawing.id), DRAWING_IDS);
  const restoredDrawings = restoredDoll.getRiteDrawings();
  assert.deepEqual(
    Array.from(restoredDrawings[0].canvas.getContext('2d').getImageData(5, 5, 1, 1).data),
    [214, 155, 53, 255]
  );
  const restoredOrbit = restoredDoll.M().head.children.at(-1);
  assert.equal(restoredOrbit.parent, restoredDoll.M().head);
  assert.equal(restoredOrbit.children.length, 4);
  const restoredGeometries = [];
  restoredOrbit.traverse(object => { if (object.geometry) restoredGeometries.push(object.geometry); });
  assert.ok(restoredGeometries.length > 4, 'disconnected marks rebuild as multiple extruded parts');
  assert.equal(restoredOrbit.children[0].children[0].material[1].map.image, restoredDrawings[0].canvas);

  const oldGeometries = new Set(restoredGeometries);
  let disposed = 0;
  oldGeometries.forEach(geometry => geometry.addEventListener('dispose', () => disposed++));
  restoredDoll.rebuild('sit');
  assert.equal(disposed, oldGeometries.size, 'rebuilding disposes the old drawing geometry');
  assert.deepEqual(Array.from(restoredDoll.getRiteDrawings(), drawing => drawing.id), DRAWING_IDS);
  assert.equal(restoredDoll.M().head.children.at(-1).parent, restoredDoll.M().head);
});
