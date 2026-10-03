import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, loadModule} from './harness.mjs';

const PARTS = ['face', 'eyes', 'hair', 'chest', 'arm', 'hand', 'leg', 'foot', 'clothes'];
const TARGETS = {
  face: ['head', 'face_eyes', 'face_face', 'face_hair'],
  eyes: ['head', 'face_eyes', 'face_face', 'face_hair'],
  hair: ['head', 'face_eyes', 'face_face', 'face_hair'],
  chest: ['chest', 'waistBall', 'neck'],
  arm: ['armLU', 'armLL', 'armRU', 'armRL', 'hand_haL', 'hand_haR'],
  hand: ['armLL', 'armRL', 'hand_haL', 'hand_haR'],
  leg: ['legLU', 'legLL', 'legRU', 'legRL', 'foot_ftL', 'foot_ftR'],
  foot: ['legLL', 'legRL', 'foot_ftL', 'foot_ftR'],
  clothes: null,
  all: null
};
const DIMENSIONS = {
  head: [0.7, 0.7, 0.7],
  face_eyes: [0.8, 0.28, 0.12],
  face_face: [0.75, 0.48, 0.12],
  face_hair: [0.8, 0.3, 0.12],
  chest: [0.7, 0.65, 0.38],
  waistBall: [0.25, 0.25, 0.25],
  neck: [0.2, 0.3, 0.2],
  armLU: [0.2, 0.55, 0.2],
  armLL: [0.18, 0.5, 0.18],
  armRU: [0.2, 0.55, 0.2],
  armRL: [0.18, 0.5, 0.18],
  hand_haL: [0.22, 0.22, 0.22],
  hand_haR: [0.22, 0.22, 0.22],
  legLU: [0.25, 0.65, 0.25],
  legLL: [0.22, 0.58, 0.22],
  legRU: [0.25, 0.65, 0.25],
  legRL: [0.22, 0.58, 0.22],
  foot_ftL: [0.32, 0.18, 0.42],
  foot_ftR: [0.32, 0.18, 0.42]
};
const POSITIONS = {
  head: [0, 1.7, 0],
  face_eyes: [0, 1.76, 0.3],
  face_face: [0, 1.62, 0.3],
  face_hair: [0, 1.88, 0],
  chest: [0, 1.1, 0],
  waistBall: [0, 0.78, 0],
  neck: [0, 1.4, 0],
  armLU: [-0.48, 1.25, 0],
  armLL: [-0.6, 0.75, 0],
  armRU: [0.48, 1.25, 0],
  armRL: [0.6, 0.75, 0],
  hand_haL: [-0.67, 0.42, 0],
  hand_haR: [0.67, 0.42, 0],
  legLU: [-0.2, 0.4, 0],
  legLL: [-0.2, -0.25, 0],
  legRU: [0.2, 0.4, 0],
  legRL: [0.2, -0.25, 0],
  foot_ftL: [-0.2, -0.62, 0],
  foot_ftR: [0.2, -0.62, 0]
};

function makeFixture(T, aspect) {
  const scene = new T.Scene();
  const body = new T.Group();
  scene.add(body);
  const registry = {};
  Object.keys(DIMENSIONS).forEach(name => {
    const mesh = new T.Mesh(
      new T.BoxGeometry(...DIMENSIONS[name]),
      new T.MeshBasicMaterial()
    );
    mesh.name = name;
    mesh.position.set(...POSITIONS[name]);
    mesh.userData.bodyPart = !name.startsWith('face_');
    if (name.startsWith('face_')) mesh.userData.faceZone = name.slice(5);
    body.add(mesh);
    registry[name] = mesh;
  });
  const hiddenParent = new T.Group();
  hiddenParent.visible = false;
  const hiddenRing = new T.Mesh(
    new T.BoxGeometry(80, 80, 80),
    new T.MeshBasicMaterial()
  );
  hiddenRing.userData.ring = true;
  hiddenParent.add(hiddenRing);
  body.add(hiddenParent);
  const camera = new T.PerspectiveCamera(35, aspect, 0.01, 40);
  camera.position.set(0, 1.4, 3);
  camera.lookAt(0, 1.4, 0);
  scene.add(camera);
  scene.updateMatrixWorld(true);
  return {scene, body, camera, doll: {body, M: () => registry}};
}

function assertFramed(T, camera, meshes, margin = 0.1) {
  camera.updateMatrixWorld(true);
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          const point = new T.Vector3(x, y, z).project(camera);
          assert.ok(Math.abs(point.x) <= 1 - 2 * margin + 1e-6, `${mesh.name} exceeds horizontal fit`);
          assert.ok(Math.abs(point.y) <= 1 - 2 * margin + 1e-6, `${mesh.name} exceeds vertical fit`);
          assert.ok(point.z >= -1 && point.z <= 1, `${mesh.name} exceeds camera clipping planes`);
        }
      }
    }
  }
}

test('all nine rite pieces and whole-doll views preserve the framing margin', async () => {
  const realm = makeRealm();
  const T = await loadModule('vendor/three.module.js', realm);
  const {dollFrameGoal} = await loadModule('poppet-lab/frame-doll.js', realm);
  for (const aspect of [240 / 280, 1, 1.5]) {
    for (const target of PARTS.concat('all')) {
      const fixture = makeFixture(T, aspect);
      const goal = dollFrameGoal(fixture.camera, fixture.doll, target, 0.1);
      fixture.camera.position.copy(goal.pos);
      fixture.camera.lookAt(goal.look);
      fixture.scene.updateMatrixWorld(true);
      assert.ok(goal.distance > 0);
      const names = TARGETS[target] || Object.keys(DIMENSIONS);
      assertFramed(T, fixture.camera, names.map(name => fixture.doll.M()[name]));
    }
  }
});

test('body, face overlays, aliases, and visible children frame actual geometry', async () => {
  const realm = makeRealm();
  const T = await loadModule('vendor/three.module.js', realm);
  const {dollFrameGoal} = await loadModule('poppet-lab/frame-doll.js', realm);
  const fixture = makeFixture(T, 1.5);
  fixture.body.scale.set(1.35, 1.2, 0.85);
  fixture.body.rotation.y = 0.28;
  fixture.scene.updateMatrixWorld(true);
  for (const target of ['clothes', 'armLL', 'haL', 'ftR', 'face']) {
    const goal = dollFrameGoal(fixture.camera, fixture.doll, target, 0.1);
    fixture.camera.position.copy(goal.pos);
    fixture.camera.lookAt(goal.look);
    fixture.scene.updateMatrixWorld(true);
    assert.ok(goal.distance > 0);
  }
});

test('invalid camera, margin, empty targets, and clipped geometry fail explicitly', async () => {
  const realm = makeRealm();
  const T = await loadModule('vendor/three.module.js', realm);
  const {dollFrameGoal} = await loadModule('poppet-lab/frame-doll.js', realm);
  const fixture = makeFixture(T, 1);
  assert.throws(() => dollFrameGoal(fixture.camera, fixture.doll, 'head', -0.1), {name: 'RangeError'});
  assert.throws(() => dollFrameGoal(fixture.camera, fixture.doll, 'head', 0.45), {name: 'RangeError'});
  fixture.camera.aspect = 0;
  assert.throws(() => dollFrameGoal(fixture.camera, fixture.doll, 'head'), {name: 'RangeError'});
  fixture.camera.aspect = 1;
  assert.throws(() => dollFrameGoal(fixture.camera, fixture.doll, 'missing'), {name: 'RangeError'});
  const empty = {body: new T.Group(), M: () => ({})};
  assert.throws(() => dollFrameGoal(fixture.camera, empty, 'all'), {name: 'RangeError'});
  fixture.camera.far = 0.02;
  assert.throws(() => dollFrameGoal(fixture.camera, fixture.doll, 'all'), {name: 'RangeError'});
});
