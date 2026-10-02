/* Poppet rig — verlet points, FK pose targets, sticks, spike pinning.
   Fix log (rig7):
   - taperedGeo spans +Y (down toward the far joint) — limbs no longer render on the wrong side
   - shoulders FK'd to the TOP of the torso (spine 0.88), arms welded shoulder→shoulder
   - real neck length: chest top 1.0 → neck → head sphere above it
   - spike pins: pelvis+waist kinematic on the needle, braced by ankle/shoulder chains */
import * as THREE from '../vendor/three.module.js';
import { V } from './lab.js?v=lab53';

export const IDX = { head: 0, neck: 1, chest: 2, waist: 3, pelvis: 4,
  shL: 5, shR: 6, elL: 7, elR: 8, haL: 9, haR: 10,
  hpL: 11, hpR: 12, knL: 13, knR: 14, akL: 15, akR: 16 };
export const N = 17;
export const TOTAL = 2.5;

export const POSES = {
  stand:  { armL: { az: 0.42, ax: 0.06, el: 0.18 }, armR: { az: 0.42, ax: 0.06, el: 0.18 }, legL: { hx: 0.03 }, legR: { hx: 0.03 }, lean: 0, tilt: 0 },
  wave:   { armL: { az: 0.45, ax: 0.1, el: 0.2 }, armR: { az: 2.35, ax: -0.25, el: 0.55 }, legL: { hx: 0.03 }, legR: { hx: 0.03 }, lean: -0.02, tilt: 0.06 },
  hip:    { armL: { az: 0.45, ax: 0.08, el: 0.2 }, armR: { az: 0.95, ax: 0.12, ey: -0.55, el: -1.45 }, legL: { hx: 0.03 }, legR: { hx: 0.03 }, lean: 0.04, tilt: -0.04 },
  clasp:  { armL: { az: 0.5, ax: 0.62, ey: 0.5, el: 0.95 }, armR: { az: 0.5, ax: 0.62, ey: -0.5, el: 0.95 }, legL: { hx: 0.03 }, legR: { hx: 0.03 }, lean: 0, tilt: 0 },
  point:  { armL: { az: 0.45, ax: 0.1, el: 0.2 }, armR: { az: 0.5, ax: -1.42, el: 0.06 }, legL: { hx: 0.03 }, legR: { hx: 0.03 }, lean: -0.03, tilt: 0 },
  cross:  { armL: { az: 0.52, ax: 0.6, ey: -0.75, el: 1.5 }, armR: { az: 0.52, ax: 0.6, ey: 0.75, el: 1.5 }, legL: { hx: 0.03 }, legR: { hx: 0.03 }, lean: 0, tilt: 0 },
  stride: { armL: { az: 0.5, ax: -0.55, el: 0.35 }, armR: { az: 0.5, ax: 0.5, el: 0.3 }, legL: { hx: 0.42 }, legR: { hx: -0.34 }, lean: 0.05, tilt: 0 },
  shy:    { armL: { az: 0.3, ax: 0.4, ey: 0.32, el: 1.62 }, armR: { az: 0.3, ax: 0.4, ey: -0.32, el: 1.62 }, legL: { hx: 0.03 }, legR: { hx: -0.05 }, lean: -0.035, tilt: 0.1 }
};

/* Deterministic per-instance RNG so every reborn doll is its own creature */
export function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Dimensions — each slider touches ONLY its own part.
   armt arms the shoulders so wide arms don't poke through a narrow chest. */
export function dims(P) {
  const headD = P.head * TOTAL, R = headD / 2;
  const rest = TOTAL - headD;
  const legLen = rest * 0.42 * P.legl;
  const footH = rest * 0.12;
  const hipY = legLen + footH * 0.32;
  const torsoH = rest * 0.46;
  const chestW = 0.60 * R * P.chest;
  const hipsW = 0.66 * R * P.hips;
  return {
    headD, R, rest, legLen, footH, hipY, torsoH,
    upLen: headD * 0.37 * P.arml, foreLen: headD * 0.33 * P.arml,
    thighLen: legLen * 0.52, shinLen: legLen * 0.48,
    armW: headD * 0.078 * P.armt, handR: headD * 0.09 * Math.sqrt(P.armt),
    legW: headD * 0.125 * P.legt,
    chestW, hipsW,
    shX: chestW + headD * 0.075 * P.armt,
    hipW: hipsW * 0.62,
    waistK: 0.34 - 0.10 * P.waist,
    neckLen: headD * 0.13
  };
}

export function fkPose(name, P) {
  const pose = POSES[name] || POSES.stand;
  return fkConfig(pose, P);
}

/* fkConfig — the same forward-kinematics as fkPose, but fed a raw pose config
   object instead of a name. The home's kinematic layer composes procedural
   motion (breath, sway, the stride cycle) as config deltas and poses the doll
   every frame without touching the physics rig. */
export function fkConfig(pose, P) {
  const D = dims(P);
  const out = new Array(N);
  const lean = pose.lean || 0;
  function spine(frac) {
    const p = V(0, D.hipY + D.torsoH * frac, 0);
    if (lean) {
      const a = lean * frac;
      const dy = p.y - D.hipY;
      p.set(p.x + dy * Math.sin(a), D.hipY + dy * Math.cos(a), p.z);
    }
    return p;
  }
  out[IDX.pelvis] = V(0, D.hipY, 0);
  out[IDX.waist] = spine(0.52);
  out[IDX.chest] = spine(1.0);                                  // top of the torso
  out[IDX.neck] = spine(1.0).add(V(0, D.neckLen, 0));           // true neck stub above it
  out[IDX.head] = out[IDX.neck].clone().add(V(0, D.R + 0.015, 0));  // head sphere rides above the neck

  function arm(side, cfg) {
    const sh = spine(0.88).add(V(side * D.shX, 0, 0));          // pinned to the TOP of the torso
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(cfg.ax || 0, cfg.ey || 0, side * (cfg.az || 0), 'ZYX'));
    const upDir = V(0, -1, 0).applyQuaternion(q);
    const el = sh.clone().add(upDir.clone().multiplyScalar(D.upLen));
    const q2 = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), cfg.el || 0);
    const foreDir = upDir.clone().applyQuaternion(q2);
    const ha = el.clone().add(foreDir.clone().multiplyScalar(D.foreLen));
    return { sh, el, ha };
  }
  const aL = arm(-1, pose.armL), aR = arm(1, pose.armR);
  out[IDX.shL] = aL.sh; out[IDX.elL] = aL.el; out[IDX.haL] = aL.ha;
  out[IDX.shR] = aR.sh; out[IDX.elR] = aR.el; out[IDX.haR] = aR.ha;

  function leg(side, cfg) {
    const hp = V(side * D.hipW, D.hipY + D.torsoH * 0.13, 0);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-(cfg.hx || 0), 0, side * 0.13, 'ZYX'));
    const thDir = V(0, -1, 0).applyQuaternion(q);
    const kn = hp.clone().add(thDir.clone().multiplyScalar(D.thighLen));
    const q2 = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.max(0, (cfg.hx || 0)) * 0.5);
    const shDir = thDir.clone().applyQuaternion(q2);
    const ak = kn.clone().add(shDir.clone().multiplyScalar(D.shinLen));
    return { hp, kn, ak };
  }
  const lL = leg(-1, pose.legL), lR = leg(1, pose.legR);
  out[IDX.hpL] = lL.hp; out[IDX.knL] = lL.kn; out[IDX.akL] = lL.ak;
  out[IDX.hpR] = lR.hp; out[IDX.knR] = lR.kn; out[IDX.akR] = lR.ak;
  return out;
}

export function buildSticks(target, spikeP) {
  function d(a, b) { return target[a].distanceTo(target[b]); }
  const I = IDX;
  const anchors = [
    { i: I.shL, parent: I.shR, off: target[I.shL].clone().sub(target[I.shR]) },
    { i: I.shR, parent: I.shL, off: target[I.shR].clone().sub(target[I.shL]) },
    { i: I.head, parent: I.neck, off: target[I.head].clone().sub(target[I.neck]) }
  ];
  if (spikeP) {
    anchors.unshift(
      { i: I.pelvis, parent: -1, off: V(0, 0, 0) },
      { i: I.waist, parent: -2, off: V(0, target[I.waist].y - target[I.pelvis].y, 0) }
    );
  }
  const raw = [
    // spine — the neck is a real segment now
    [I.pelvis, I.waist, 1], [I.waist, I.chest, 1], [I.chest, I.neck, 1], [I.neck, I.head, 1],
    // shoulder girdle — welded across, anchored to the top of the torso by bracing
    [I.shL, I.shR, 1],
    // arms — every bone present: shoulder→elbow→wrist
    [I.shL, I.elL, 1], [I.elL, I.haL, 1],
    [I.shR, I.elR, 1], [I.elR, I.haR, 1],
    // pelvis girdle
    [I.hpL, I.hpR, 1],
    // legs — thigh→knee→shin→ankle
    [I.hpL, I.knL, 1], [I.knL, I.akL, 1],
    [I.hpR, I.knR, 1], [I.knR, I.akR, 1],
    // soft posture cage
    [I.chest, I.shL, 0.85, true], [I.chest, I.shR, 0.85, true],
    [I.chest, I.hpL, 0.5, true], [I.chest, I.hpR, 0.5, true],
    [I.pelvis, I.chest, 0.7, true],
    [I.shL, I.waist, 0.45, true], [I.shR, I.waist, 0.45, true],
    [I.hpL, I.akL, 0.5, true], [I.hpR, I.akR, 0.5, true]
  ];
  if (!spikeP) {
    raw.push(
      [I.head, I.pelvis, 0.55, true],
      [I.neck, I.pelvis, 0.9, true],
      [I.pelvis, I.shL, 0.3, true], [I.pelvis, I.shR, 0.3, true]
    );
  }
  const sticks = raw.map(function (s) {
    return { a: s[0], b: s[1], rest: d(s[0], s[1]), k: s[2], soft: !!s[3] };
  });
  if (spikeP) {
    // bracing on the needle: straighten the spine without fighting the balance solver
    sticks.push({ a: I.chest, b: I.pelvis, rest: d(I.chest, I.pelvis), k: 0.55, soft: true });
    sticks.push({ a: I.neck, b: I.waist, rest: d(I.neck, I.waist), k: 0.5, soft: true });
    sticks.push({ a: I.head, b: I.chest, rest: d(I.head, I.chest), k: 0.5, soft: true });
    const massTop = Math.max(target[I.shL].y, target[I.head].y);
    const massBot = target[I.akL].y;
    const yTip = spikeP.y;
    const massK = Math.max(0, Math.min(0.5, (massTop - yTip) / (massTop - massBot + 1e-6)));
    sticks.push({ a: I.akL, b: I.akR, rest: d(I.akL, I.akR), k: 1, soft: false });
    sticks.push({ a: I.hpL, b: I.akL, rest: d(I.hpL, I.akL), k: 0.6, soft: true });
    sticks.push({ a: I.hpR, b: I.akR, rest: d(I.hpR, I.akR), k: 0.6, soft: true });
    // ankle stance eases home so the weight reads as resting on the needle
    sticks.push({ a: I.akL, b: I.akR, rest: d(I.akL, I.akR), k: 1, soft: false, balance: { xL: target[I.akL].x, xR: target[I.akR].x } });
  }
  return { anchors, sticks };
}
