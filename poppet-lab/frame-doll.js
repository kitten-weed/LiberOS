import * as THREE from '../vendor/three.module.js';

const PARTS = {
  face: ['head', 'face_eyes', 'face_face', 'face_hair'],
  eyes: ['head', 'face_eyes', 'face_face', 'face_hair'],
  hair: ['head', 'face_eyes', 'face_face', 'face_hair'],
  chest: ['chest', 'waistBall', 'neck'],
  arm: ['armLU', 'armLL', 'armRU', 'armRL', 'hand_haL', 'hand_haR'],
  hand: ['armLL', 'armRL', 'hand_haL', 'hand_haR'],
  leg: ['legLU', 'legLL', 'legRU', 'legRL', 'foot_ftL', 'foot_ftR'],
  foot: ['legLL', 'legRL', 'foot_ftL', 'foot_ftR']
};

const ALIASES = {
  haL: 'hand_haL',
  haR: 'hand_haR',
  ftL: 'foot_ftL',
  ftR: 'foot_ftR'
};

function visible(mesh) {
  for (let node = mesh; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
}

function frameMeshes(doll, target) {
  if (!doll || !doll.body || typeof doll.body.traverse !== 'function' ||
      typeof doll.M !== 'function') {
    throw new TypeError('doll framing requires its body and mesh registry');
  }
  const registry = doll.M();
  if (!registry || typeof registry !== 'object') {
    throw new TypeError('doll mesh registry is unavailable');
  }
  const meshes = new Set();
  const addTree = root => {
    if (!root || typeof root.traverse !== 'function') return;
    root.traverse(object => {
      if (object.isMesh && visible(object) && !object.userData.glyph &&
          !object.userData.ring && !object.userData.stageFurniture &&
          !object.userData.thought) {
        meshes.add(object);
      }
    });
  };

  if (target === 'all' || target === 'clothes') {
    addTree(doll.body);
    Object.keys(registry).forEach(key => {
      const mesh = registry[key];
      if (mesh && mesh.userData && (mesh.userData.faceZone || mesh.userData.hull)) addTree(mesh);
    });
  } else {
    const names = PARTS[target] || [ALIASES[target] || target];
    names.forEach(name => addTree(registry[name]));
  }
  return Array.from(meshes);
}

function worldBounds(meshes) {
  const bounds = new THREE.Box3();
  let count = 0;
  for (const mesh of meshes) {
    if (!mesh.geometry) continue;
    mesh.updateWorldMatrix(true, false);
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const local = mesh.geometry.boundingBox;
    if (!local || local.isEmpty()) continue;
    const localValues = [
      local.min.x, local.min.y, local.min.z,
      local.max.x, local.max.y, local.max.z
    ];
    if (!localValues.every(Number.isFinite)) {
      throw new RangeError('doll geometry has non-finite bounds');
    }
    const world = local.clone().applyMatrix4(mesh.matrixWorld);
    const worldValues = [
      world.min.x, world.min.y, world.min.z,
      world.max.x, world.max.y, world.max.z
    ];
    if (!worldValues.every(Number.isFinite)) {
      throw new RangeError('doll geometry has non-finite world bounds');
    }
    if (world.isEmpty()) continue;
    bounds.union(world);
    count++;
  }
  if (!count || bounds.isEmpty()) throw new RangeError('doll framing target has no visible geometry');
  const size = bounds.getSize(new THREE.Vector3());
  if (!(size.lengthSq() > 0)) throw new RangeError('doll framing target has empty bounds');
  return bounds;
}

export function dollFrameGoal(camera, doll, target, margin = 0.1) {
  if (!camera || !camera.isPerspectiveCamera) {
    throw new TypeError('doll framing requires a PerspectiveCamera');
  }
  if (!Number.isFinite(margin) || margin < 0 || margin >= 0.45) {
    throw new RangeError('doll framing margin must be in [0, 0.45)');
  }
  const values = [
    camera.fov, camera.aspect, camera.near, camera.far, camera.zoom,
    camera.position.x, camera.position.y, camera.position.z,
    camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w,
    camera.up.x, camera.up.y, camera.up.z
  ];
  if (!values.every(Number.isFinite) || camera.fov <= 0 || camera.fov >= 180 ||
      camera.aspect <= 0 || camera.near <= 0 || camera.far <= camera.near ||
      camera.zoom <= 0) {
    throw new RangeError('doll framing camera has invalid projection values');
  }
  if (doll.body && typeof doll.body.updateWorldMatrix === 'function') {
    doll.body.updateWorldMatrix(true, true);
  }
  const meshes = frameMeshes(doll, target);
  const bounds = worldBounds(meshes);
  const look = bounds.getCenter(new THREE.Vector3());
  camera.updateWorldMatrix(true, false);
  const forward = camera.getWorldDirection(new THREE.Vector3()).negate();
  const worldUp = camera.up.clone();
  if (camera.parent) worldUp.transformDirection(camera.parent.matrixWorld);
  const right = new THREE.Vector3().crossVectors(worldUp, forward);
  if (forward.lengthSq() < 1e-12 || right.lengthSq() < 1e-12) {
    throw new RangeError('doll framing camera view basis is degenerate');
  }
  right.normalize();
  const up = new THREE.Vector3().crossVectors(forward, right);
  if (up.lengthSq() < 1e-12) {
    throw new RangeError('doll framing camera view basis is degenerate');
  }
  up.normalize();
  const usable = 1 - 2 * margin;
  const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.zoom;
  const tanX = tanY * camera.aspect;
  if (!Number.isFinite(tanX) || !Number.isFinite(tanY) || tanX <= 0 || tanY <= 0) {
    throw new RangeError('doll framing camera has invalid field of view');
  }
  let distance = 0;
  const corners = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).sub(look);
        const depth = point.dot(forward);
        corners.push({point, depth});
        distance = Math.max(
          distance,
          depth + camera.near * 1.05,
          depth + Math.abs(point.dot(right)) / (tanX * usable),
          depth + Math.abs(point.dot(up)) / (tanY * usable)
        );
      }
    }
  }
  if (!Number.isFinite(distance) || distance <= 0) {
    throw new RangeError('doll framing produced an invalid camera distance');
  }
  for (const corner of corners) {
    const depth = distance - corner.depth;
    if (depth < camera.near * 1.05 || depth > camera.far) {
      throw new RangeError('doll framing target exceeds camera clipping planes');
    }
  }
  const worldPosition = look.clone().addScaledVector(forward, distance);
  const pos = camera.parent
    ? camera.parent.worldToLocal(worldPosition.clone())
    : worldPosition;
  return {pos, look, distance};
}
