// figures.js — the toys, the crate they live in, the tools, and the machines.
//
// Everything is sculpted from three.js primitives but built to be *looked at*:
// two-tone cloth, lathed glass, an extruded coffin, yarn hair, a stencilled
// crate. The room (memory.js) sets userData { id, kind, name, scale } on each
// placed figure.
//
// The poppet is the player: it is always named, and the name is the
// traveller's own (state.travellerAlias), never a toy-box label.
import * as THREE from '../../../vendor/three.module.js';

// warm toy-plastic palette; the randomizer leans on it
export const TOY_COLORS = [0xb8563a, 0x4a6a9a, 0x5a7a46, 0xb08a3c, 0x7a4a7a, 0x9a9a9a, 0x3a7a7a, 0xa86a4a];

function mat(hex, opts) {
  return new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.72, metalness: 0.04 }, opts || {}));
}
function pickColor(rng) {
  return TOY_COLORS[Math.floor(rng() * TOY_COLORS.length) % TOY_COLORS.length];
}

// clayMind: the hand-molded look. Two passes, done once per toy build:
//   1. jitter every vertex a hair (deterministic per position, so shared
//      geometries still weld — no torn seams),
//   2. swap every material for matte, slightly uneven clay.
// The result reads as thumb-pressed plasticine rather than injection-moulded
// plastic — the therapy-table feel.
let claySeed = 3;
function clayMind(fig) {
  const seedBase = (claySeed = (claySeed * 1103515245 + 12345) & 0x7fffffff);
  const jit = (v, axis) => {
    const s = Math.sin(v * 12.9898 + axis * 78.233 + seedBase * 0.001) * 43758.5453;
    return (s - Math.floor(s) - 0.5);
  };
  fig.traverse((node) => {
    if (node.isMesh && node.geometry) {
      const geo = node.geometry;
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        pos.setXYZ(i,
          x + jit(x, 1) * 0.016,
          y + jit(y, 2) * 0.016,
          z + jit(z, 3) * 0.016);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      if (node.material && node.material.color && !node.material.map && !node.material.transparent) {
        const c = node.material.color;
        node.material = new THREE.MeshStandardMaterial({
          color: c.getHex(),
          roughness: 0.93 + (jit(seedBase, 4) * 0.04),
          metalness: 0.0,
          flatShading: false,
        });
      }
    }
  });
  return fig;
}

// a small painted-wood grain texture, shared by crate and basin furniture
export function woodTexture(base, streak, plank) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  // grain streaks: soft horizontal wavering lines
  for (let i = 0; i < 46; i++) {
    const y0 = Math.random() * 256;
    x.strokeStyle = streak;
    x.globalAlpha = 0.10 + Math.random() * 0.14;
    x.lineWidth = 0.8 + Math.random() * 1.8;
    x.beginPath();
    x.moveTo(0, y0);
    for (let px = 0; px <= 256; px += 16) x.lineTo(px, y0 + Math.sin(px * 0.05 + i) * 2.4);
    x.stroke();
  }
  x.globalAlpha = 1;
  // plank grooves
  if (plank) {
    x.fillStyle = 'rgba(0,0,0,0.34)';
    for (let py = 0; py < 256; py += plank) x.fillRect(0, py, 256, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ── the toys ──────────────────────────────────────────────────────────── */

// two figures of the same simple doll construction, one broad, one slight
function humanoid({ broad }) {
  const g = new THREE.Group();
  const skin = mat(0xd8b098);
  const shirt = mat(broad ? 0x4a6a9a : 0x9a5a6a);
  const pants = mat(0x30323a);
  const hairM = mat(broad ? 0x2a2018 : 0x5a3a22, { roughness: 0.9 });

  // legs
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.3, 3, 8), pants);
    leg.position.set(s * (broad ? 0.09 : 0.07), 0.2, 0);
    g.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.16), mat(0x1c1a18));
    shoe.position.set(s * (broad ? 0.09 : 0.07), 0.03, 0.02);
    g.add(shoe);
  }
  if (broad) {
    const hips = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), pants);
    hips.scale.set(1.15, 0.72, 0.9);
    hips.position.y = 0.42;
    g.add(hips);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 10), mat(0x201c18));
    belt.position.y = 0.5;
    g.add(belt);
  } else {
    // the dress: a cone from waist to knee
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 0.34, 12), shirt);
    skirt.position.y = 0.36;
    g.add(skirt);
  }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.24, 4, 10), shirt);
  torso.position.y = 0.7;
  torso.scale.z = broad ? 1.18 : 0.92;
  g.add(torso);
  // shoulders + arms
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 7), shirt);
    shoulder.position.set(s * (broad ? 0.18 : 0.15), 0.85, 0);
    g.add(shoulder);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.22, 3, 8), skin);
    arm.position.set(s * (broad ? 0.21 : 0.175), 0.68, 0);
    arm.rotation.z = s * (broad ? 0.22 : 0.12);
    g.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), skin);
    hand.position.set(s * (broad ? 0.25 : 0.205), 0.53, 0);
    g.add(hand);
  }
  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), skin);
  neck.position.y = 0.915;
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12), skin);
  head.position.y = 1.06;
  head.scale.z = 0.94;
  g.add(head);
  // hair: a cap over the skull; hers comes down at the back
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
  hair.position.y = 1.075;
  g.add(hair);
  if (!broad) {
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), hairM);
    back.scale.set(1, 1.5, 0.6);
    back.position.set(0, 0.97, -0.1);
    g.add(back);
    // her hair gathered into a bun
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), hairM);
    bun.position.set(0, 1.19, -0.11);
    g.add(bun);
  }
  // a whisper of a nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 6), skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.05, 0.15);
  g.add(nose);
  // the face: bead eyes, ears, a painted smile — toys must meet your gaze
  const dark = mat(0x1a1410, { roughness: 0.35 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), dark);
    eye.position.set(s * 0.062, 1.095, 0.132);
    g.add(eye);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), skin);
    ear.position.set(s * 0.152, 1.04, 0);
    g.add(ear);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.008, 5, 12, Math.PI), mat(0x8a4a3a));
  smile.rotation.z = Math.PI;
  smile.rotation.x = 0.12;
  smile.position.set(0, 1.015, 0.148);
  g.add(smile);
  return g;
}

function canine() {
  const g = new THREE.Group();
  const fur = mat(0x8a6a42, { roughness: 0.85 });
  const dark = mat(0x5f4526, { roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.4, 4, 10), fur);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.32;
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), fur);
  chest.position.set(0.2, 0.33, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 10), fur);
  head.position.set(0.37, 0.47, 0);
  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.1, 3, 8), dark);
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(0.5, 0.44, 0);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), mat(0x14100c));
  nose.position.set(0.56, 0.45, 0);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.016, 6, 14), mat(0x8a2a20));
  collar.rotation.y = Math.PI / 2;
  collar.position.set(0.29, 0.42, 0);
  const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 8), mat(0xd2a052, { metalness: 0.7, roughness: 0.3 }));
  tag.rotation.x = Math.PI / 2;
  tag.position.set(0.29, 0.33, 0);
  // the face: bead eyes and a cream chest blaze
  const bead = mat(0x14100c, { roughness: 0.35 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 6), bead);
    eye.position.set(0.42, 0.5, s * 0.062);
    g.add(eye);
  }
  const blaze = new THREE.Mesh(new THREE.SphereGeometry(0.075, 9, 7), mat(0xd8c8a8, { roughness: 0.9 }));
  blaze.scale.set(0.7, 1.2, 0.5);
  blaze.position.set(0.235, 0.3, 0);
  g.add(blaze);
  g.add(body, chest, head, snout, nose, collar, tag);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 5), dark);
    ear.position.set(0.33, 0.6, s * 0.07);
    ear.rotation.x = s * 0.32;
    g.add(ear);
    // a curl of tail: two segments
  }
  const tailA = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.2, 6), fur);
  tailA.position.set(-0.36, 0.42, 0);
  tailA.rotation.z = 1.0;
  const tailB = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 0.16, 6), fur);
  tailB.position.set(-0.44, 0.53, 0);
  tailB.rotation.z = 2.1;
  g.add(tailA, tailB);
  for (const [x, z] of [[0.24, 0.09], [0.24, -0.09], [-0.2, 0.09], [-0.2, -0.09]]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.16, 3, 7), fur);
    leg.position.set(x, 0.12, z);
    g.add(leg);
  }
  return g;
}

function feline() {
  const g = new THREE.Group();
  const fur = mat(0x9a8a6a, { roughness: 0.88 });
  const dark = mat(0x6f6248, { roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.32, 4, 10), fur);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.27;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), fur);
  head.position.set(0.28, 0.4, 0);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 7), mat(0xc4b896));
  muzzle.scale.set(1, 0.7, 0.9);
  muzzle.position.set(0.36, 0.375, 0);
  // tabby bands, whiskers, pink ears, a bead nose — unmistakably a cat
  const tabby = mat(0x5f5238, { roughness: 0.9 });
  for (const [bx, br] of [[0.1, 1], [-0.02, 1.05], [-0.14, 0.92]]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.013, 6, 14), tabby);
    band.rotation.y = Math.PI / 2;
    band.position.set(bx, 0.27, 0);
    band.scale.setScalar(br);
    g.add(band);
  }
  for (const s of [-1, 1]) {
    for (const wy of [0.385, 0.365]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.13, 4), tabby);
      wh.rotation.z = Math.PI / 2 - s * 0.06;
      wh.rotation.y = s * 0.5;
      wh.position.set(0.36, wy, s * 0.075);
      g.add(wh);
    }
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.055, 4), mat(0xd8a090));
    inner.position.set(0.262, 0.505, s * 0.055);
    inner.rotation.y = s * 0.5;
    g.add(inner);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), mat(0xc87a6a));
  nose.position.set(0.352, 0.352, 0);
  g.add(nose);
  g.add(body, head, muzzle);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.095, 4), dark);
    ear.position.set(0.26, 0.51, s * 0.055);
    ear.rotation.y = s * 0.5;
    g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), mat(0x2a4428, { emissive: 0x1c321a, emissiveIntensity: 0.5 }));
    eye.position.set(0.34, 0.43, s * 0.05);
    g.add(eye);
  }
  // the tail curls up and forward, a question mark
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 16, Math.PI * 1.3), fur);
  tail.position.set(-0.26, 0.36, 0);
  tail.rotation.y = Math.PI / 2;
  tail.rotation.z = 0.4;
  g.add(tail);
  for (const [x, z] of [[0.18, 0.07], [0.18, -0.07], [-0.15, 0.07], [-0.15, -0.07]]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.14, 3, 7), fur);
    leg.position.set(x, 0.1, z);
    g.add(leg);
  }
  return g;
}

function house() {
  const g = new THREE.Group();
  const wall = mat(0xcfc0a0, { roughness: 0.85 });
  const roofM = mat(0x84402f, { roughness: 0.8 });
  const trim = mat(0x6a4a2e);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.34, 0.52), wall);
  base.position.y = 0.17;
  // the roof: two slabs meeting at a ridge that runs front-to-back
  const slabGeo = new THREE.BoxGeometry(0.44, 0.03, 0.6);
  const roofL = new THREE.Mesh(slabGeo, roofM);
  roofL.position.set(-0.155, 0.485, 0);
  roofL.rotation.z = 0.62;
  const roofR = new THREE.Mesh(slabGeo, roofM);
  roofR.position.set(0.155, 0.485, 0);
  roofR.rotation.z = -0.62;
  // gable triangles filling the ends under the slabs
  for (const s of [-1, 1]) {
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-0.32, 0);
    gableShape.lineTo(0.32, 0);
    gableShape.lineTo(0, 0.3);
    gableShape.closePath();
    const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(gableShape, { depth: 0.03, bevelEnabled: false }), wall);
    gable.position.set(0, 0.34, s * 0.245);
    if (s < 0) gable.rotation.y = Math.PI;
    g.add(gable);
  }
  // chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.09), mat(0x8a4a3a, { roughness: 0.95 }));
  chimney.position.set(0.18, 0.62, -0.1);
  // door with a frame
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, 0.02), trim);
  door.position.set(0, 0.11, 0.265);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), mat(0xd2a052, { metalness: 0.8, roughness: 0.3 }));
  knob.position.set(0.05, 0.11, 0.28);
  // a round attic window in the front gable, and a doorstep
  const attTrim = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.013, 6, 14), trim);
  attTrim.position.set(0, 0.445, 0.268);
  const attGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.012, 12), mat(0x7aa0b8, { roughness: 0.25, metalness: 0.1 }));
  attGlass.rotation.x = Math.PI / 2;
  attGlass.position.set(0, 0.445, 0.265);
  const attBar = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.02), trim);
  attBar.position.set(0, 0.445, 0.268);
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.07), mat(0x8a7452, { roughness: 0.9 }));
  step.position.set(0, 0.02, 0.295);
  g.add(base, roofL, roofR, chimney, door, knob, attTrim, attGlass, attBar, step);
  for (const s of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.02), mat(0x7aa0b8, { roughness: 0.25, metalness: 0.1 }));
    win.position.set(s * 0.18, 0.2, 0.265);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.012), trim);
    frame.position.set(s * 0.18, 0.2, 0.258);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.024), trim);
    crossV.position.copy(win.position);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.024), trim);
    crossH.position.copy(win.position);
    g.add(frame, win, crossV, crossH);
  }
  return g;
}

// the poppet — a soft cloth doll; the player's name rides its userData
function poppet() {
  const g = new THREE.Group();
  const cloth = mat(0xc89a6a, { roughness: 0.95 });
  const yarn = mat(0x8a4a2a, { roughness: 1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.3, 4, 10), cloth);
  body.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), cloth);
  head.position.y = 0.96;
  // yarn curls sewn around the crown
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const curl = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 6), yarn);
    curl.position.set(Math.cos(a) * 0.13, 1.07 + Math.sin(i * 2.1) * 0.02, Math.sin(a) * 0.13);
    g.add(curl);
  }
  // button eyes
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 8), mat(0x201812));
    eye.rotation.x = Math.PI / 2;
    eye.position.set(s * 0.065, 0.98, 0.165);
    g.add(eye);
  }
  // blush cheeks and a faded heart patch sewn on the belly
  for (const s of [-1, 1]) {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), mat(0xd88a6a, { roughness: 0.95 }));
    blush.scale.set(1, 0.6, 0.35);
    blush.position.set(s * 0.11, 0.925, 0.152);
    g.add(blush);
  }
  const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 10), mat(0xa85a4a, { roughness: 0.95 }));
  patch.rotation.x = Math.PI / 2;
  patch.position.set(0, 0.55, 0.162);
  g.add(patch);
  const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.014), mat(0x5a3a24));
  stitch.position.set(0, 0.9, 0.172);
  const stitchV = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.03, 0.014), mat(0x5a3a24));
  stitchV.position.set(0, 0.915, 0.172);
  // a frayed seam patch on the shoulder
  const shoulderPatch = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.008, 8), mat(0x8a5a3a, { roughness: 1 }));
  shoulderPatch.rotation.x = Math.PI / 2;
  shoulderPatch.position.set(0.14, 0.62, 0.155);
  shoulderPatch.rotation.z = 0.5;
  g.add(shoulderPatch);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.2, 3, 8), cloth);
    arm.position.set(s * 0.23, 0.58, 0);
    arm.rotation.z = s * 0.72;
    g.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.16, 3, 8), cloth);
    leg.position.set(s * 0.085, 0.14, 0);
    g.add(leg);
  }
  g.add(body, head, stitch, stitchV);
  return g;
}

function cross() {
  const g = new THREE.Group();
  const woodM = mat(0xffffff, { roughness: 0.8, map: woodTexture('#6a4a2e', '#3a2414', 0) });
  const vert = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.82, 0.08), woodM);
  vert.position.y = 0.41;
  const horiz = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.08), woodM);
  horiz.position.y = 0.58;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.16), woodM);
  base.position.y = 0.025;
  g.add(vert, horiz, base);
  return g;
}

function cellphone() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.46, 0.055), mat(0x26262e, { roughness: 0.4, metalness: 0.3 }));
  shell.position.y = 0.23;
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.37, 0.012),
    new THREE.MeshPhysicalMaterial({ color: 0x9ac8d8, roughness: 0.12, metalness: 0.1, emissive: 0x2a4a58, emissiveIntensity: 0.35 })
  );
  screen.position.set(0, 0.25, 0.03);
  const camDot = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 8), mat(0x0a0a0e));
  camDot.rotation.x = Math.PI / 2;
  camDot.position.set(0.06, 0.42, 0.03);
  // speaker slit and a side button: it reads as hardware, not a black tile
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.008), mat(0x3a3a44));
  slit.position.set(0, 0.425, 0.031);
  const sideBtn = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 0.024), mat(0x3a3a44));
  sideBtn.position.set(0.125, 0.3, 0);
  g.add(shell, screen, camDot, slit, sideBtn);
  return g;
}

function coffin() {
  const g = new THREE.Group();
  const woodM = mat(0xffffff, { roughness: 0.75, map: woodTexture('#4a3020', '#241408', 0) });
  // the classic shoulders-and-taper silhouette, extruded
  const s = new THREE.Shape();
  s.moveTo(-0.15, -0.32);
  s.lineTo(0.15, -0.32);
  s.lineTo(0.15, 0.02);
  s.lineTo(0.23, 0.14);
  s.lineTo(0.14, 0.36);
  s.lineTo(-0.14, 0.36);
  s.lineTo(-0.23, 0.14);
  s.lineTo(-0.15, 0.02);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.23, 0);
  const box = new THREE.Mesh(geo, woodM);
  // the lid sits proud, slightly ajar
  const lidGeo = geo.clone();
  lidGeo.scale(1.06, 0.55, 1.04);
  lidGeo.translate(0, 0.15, 0);
  const lid = new THREE.Mesh(lidGeo, mat(0xffffff, { roughness: 0.7, map: woodTexture('#5a3c26', '#2c1a0a', 0) }));
  g.add(box, lid);
  // a thin brass cross-band around the box, like a real casket
  const bandM = new THREE.MeshStandardMaterial({ color: 0x9a7a3a, metalness: 0.75, roughness: 0.4 });
  const bandV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.44), bandM);
  bandV.position.set(0, 0.33, 0);
  const bandH = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.44), bandM);
  bandH.position.set(0, 0.33, 0);
  g.add(bandV, bandH);
  // brass handles at head and foot
  for (const z of [-0.24, 0.3]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 10, Math.PI), mat(0xd2a052, { metalness: 0.85, roughness: 0.3 }));
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, 0.12, z);
    g.add(handle);
  }
  return g;
}

function bottle() {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x3a6a4a, roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.82, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const profile = [
    [0.0, 0.0], [0.115, 0.0], [0.135, 0.03], [0.14, 0.2], [0.13, 0.32],
    [0.08, 0.42], [0.05, 0.5], [0.048, 0.62], [0.06, 0.64], [0.06, 0.67], [0.0, 0.67],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 16), glass);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.035, 10), mat(0xc8a050, { metalness: 0.75, roughness: 0.35 }));
  cap.position.y = 0.685;
  // a paper label soaked half off
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.142, 0.142, 0.12, 16, 1, true),
    mat(0xe0d4b0, { roughness: 0.9, side: THREE.DoubleSide })
  );
  label.position.y = 0.17;
  // a foil ring where the neck meets the cap
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.009, 6, 12), mat(0xc8a050, { metalness: 0.75, roughness: 0.35 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.635;
  g.add(body, cap, label, ring);
  return g;
}

function cigarette() {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.5, 10), mat(0xe8e2d2, { roughness: 0.6 }));
  paper.rotation.z = Math.PI / 2;
  paper.position.y = 0.034;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0345, 0.0345, 0.07, 10), mat(0xc8924a));
  band.rotation.z = Math.PI / 2;
  band.position.set(0.1, 0.034, 0);
  const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.12, 10), mat(0xd8a850, { roughness: 0.85 }));
  filter.rotation.z = Math.PI / 2;
  filter.position.set(0.31, 0.034, 0);
  const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.05, 8), mat(0x8a8a86, { roughness: 1 }));
  ash.rotation.z = Math.PI / 2;
  ash.position.set(-0.27, 0.034, 0);
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6a30 }));
  ember.position.set(-0.3, 0.034, 0);
  // a curl of smoke above the ember, three stacked wisps
  for (let i = 0; i < 3; i++) {
    const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.018 - i * 0.003, 6, 5), new THREE.MeshBasicMaterial({ color: 0xb8b0a4, transparent: true, opacity: 0.32 - i * 0.07 }));
    wisp.position.set(-0.34 - i * 0.015, 0.075 + i * 0.045, 0);
    g.add(wisp);
  }
  g.add(paper, band, filter, ash, ember);
  return g;
}

// a shade tree: bark-trunk with flaring roots, a lobed canopy of two
// greens, and ripe dots that make it a fruit tree
function tree() {
  const g = new THREE.Group();
  const bark = mat(0xffffff, { roughness: 0.92, map: woodTexture('#6a4a30', '#3c2814', 0) });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.13, 0.42, 9), bark);
  trunk.position.y = 0.21;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.5;
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 5), bark);
    root.rotation.z = Math.PI / 2;
    root.rotation.y = -a;
    root.position.set(Math.cos(a) * 0.13, 0.045, Math.sin(a) * 0.13);
    g.add(root);
  }
  const leafA = mat(0x4a7a3a, { roughness: 0.95 });
  const leafB = mat(0x5f8f46, { roughness: 0.95 });
  for (const [lx, ly, lz, r, lm] of [
    [0, 0.56, 0, 0.24, leafA], [-0.14, 0.48, 0.06, 0.17, leafB],
    [0.13, 0.5, -0.07, 0.16, leafB], [0.02, 0.72, -0.02, 0.15, leafA],
  ]) {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), lm);
    lobe.position.set(lx, ly, lz);
    g.add(lobe);
  }
  for (const [fx, fy, fz] of [[-0.19, 0.56, 0.08], [0.16, 0.62, 0.12], [0.08, 0.46, 0.18], [-0.05, 0.74, 0.12]]) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 6), mat(0xc04838, { roughness: 0.5 }));
    fruit.position.set(fx, fy, fz);
    g.add(fruit);
  }
  g.add(trunk);
  return g;
}

// a snake at rest: two flattened coils, the neck rising off the top one,
// bead eyes and a forked tongue, pale diamond marks down the spine
function snake() {
  const g = new THREE.Group();
  const skin = mat(0x5a7a3c, { roughness: 0.6 });
  const mark = mat(0x42582c, { roughness: 0.65 });
  for (const [cy, r, sq] of [[0.06, 0.17, 0.55], [0.14, 0.13, 0.6]]) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(r, 0.055, 8, 18), skin);
    coil.rotation.x = Math.PI / 2;
    coil.scale.z = sq;
    coil.position.y = cy;
    g.add(coil);
  }
  for (const a of [0.6, 2.1, 3.6, 5.0]) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), mark);
    d.scale.set(1, 0.5, 1.4);
    d.position.set(Math.cos(a) * 0.17, 0.075, Math.sin(a) * 0.09);
    g.add(d);
  }
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.18, 4, 8), skin);
  neck.position.set(0.13, 0.27, 0.05);
  neck.rotation.z = -0.5;
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), skin);
  head.scale.set(1.25, 0.8, 0.95);
  head.position.set(0.21, 0.41, 0.05);
  g.add(head);
  const bead = mat(0x14100c, { roughness: 0.35 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), bead);
    eye.position.set(0.24, 0.435, 0.05 + s * 0.035);
    g.add(eye);
  }
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.008), mat(0xc04838));
  tongue.position.set(0.3, 0.39, 0.05);
  g.add(tongue);
  for (const s of [-1, 1]) {
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.007, 0.007), mat(0xc04838));
    fork.rotation.y = s * 0.4;
    fork.position.set(0.345, 0.39, 0.05 + s * 0.011);
    g.add(fork);
  }
  return g;
}

// a songbird: round red-brown body, pale chest, folded wings, three tail
// feathers, matchstick legs — unmistakably a bird at rest
function bird() {
  const g = new THREE.Group();
  const feather = mat(0x8a4a5a, { roughness: 0.85 });
  const dark = mat(0x4a2a34, { roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), feather);
  body.scale.set(1.15, 1, 0.95);
  body.position.y = 0.26;
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0xd8885a, { roughness: 0.9 }));
  chest.scale.set(1, 0.9, 0.7);
  chest.position.set(0.07, 0.2, 0.07);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), feather);
  head.position.set(0.13, 0.44, 0);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 6), mat(0xe0a83a, { roughness: 0.5 }));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.24, 0.43, 0);
  g.add(body, chest, head, beak);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), mat(0x14100c, { roughness: 0.3 }));
    eye.position.set(0.185, 0.46, s * 0.05);
    g.add(eye);
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.095, 9, 7), dark);
    wing.scale.set(1.5, 0.75, 0.35);
    wing.rotation.z = 0.25;
    wing.position.set(-0.02, 0.3, s * 0.115);
    g.add(wing);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.12, 6), mat(0xb08a3c));
    leg.position.set(0.02, 0.07, s * 0.05);
    g.add(leg);
  }
  for (let i = -1; i <= 1; i++) {
    const tf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.05), dark);
    tf.rotation.z = 0.5 + i * 0.1;
    tf.rotation.y = i * 0.18;
    tf.position.set(-0.19, 0.24 + i * 0.02, i * 0.035);
    g.add(tf);
  }
  return g;
}

// a white picket fence with its gate standing ajar — a boundary you can
// open: five pointed pickets, two rails, an end post, brass hinges
function fence() {
  const g = new THREE.Group();
  const white = mat(0xffffff, { roughness: 0.8, map: woodTexture('#d8cdb4', '#a89a78', 0) });
  const brass = mat(0x8a7a5a, { metalness: 0.7, roughness: 0.4 });
  for (let i = 0; i < 5; i++) {
    const px = -0.32 + i * 0.16;
    const picket = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.03), white);
    picket.position.set(px, 0.21, 0);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.08, 4), white);
    tip.rotation.y = Math.PI / 4;
    tip.position.set(px, 0.46, 0);
    g.add(picket, tip);
  }
  for (const ry of [0.12, 0.3]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.05, 0.025), white);
    rail.position.set(0, ry, -0.02);
    g.add(rail);
  }
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.48, 0.09), white);
  post.position.set(0.42, 0.24, 0);
  g.add(post);
  // the gate: its own little frame, swung open on the end post
  const gate = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.026), white);
    bar.position.set(i * 0.1, 0.19, 0);
    gate.add(bar);
  }
  for (const gy of [0.28, 0.1]) {
    const gRail = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.045, 0.022), white);
    gRail.position.set(0.1, gy, -0.018);
    gate.add(gRail);
  }
  gate.position.set(0.44, 0, 0.03);
  gate.rotation.y = -0.85;
  g.add(gate);
  for (const hy of [0.12, 0.3]) {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), brass);
    hinge.rotation.x = Math.PI / 2;
    hinge.position.set(0.42, hy, 0.02);
    g.add(hinge);
  }
  return g;
}

// an arched footbridge: seven deck planks walking a parabola, railing
// posts at the ends and crest, rails segmenting along the arch
function bridge() {
  const g = new THREE.Group();
  const woodM = mat(0xffffff, { roughness: 0.85, map: woodTexture('#8a6a44', '#4a341c', 24) });
  const L = 0.86;
  const deckY = (t) => 0.16 + (1 - t * t) * 0.16;
  for (let i = 0; i < 7; i++) {
    const t = (i / 6 - 0.5) * 2;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.3), woodM);
    plank.position.set(t * (L / 2), deckY(t), 0);
    plank.rotation.z = -t * 0.36;
    g.add(plank);
  }
  const railSeg = (t0, t1, s) => {
    const y = (t) => deckY(t) + 0.16;
    const x0 = t0 * (L / 2), x1 = t1 * (L / 2);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x1 - x0, y(t1) - y(t0)) + 0.02, 0.025, 0.025), woodM);
    seg.position.set((x0 + x1) / 2, (y(t0) + y(t1)) / 2, s * 0.15);
    seg.rotation.z = Math.atan2(y(t1) - y(t0), x1 - x0);
    g.add(seg);
  };
  for (const s of [-1, 1]) {
    for (const t of [-1, -0.5, 0.5, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.16, 6), woodM);
      post.position.set(t * (L / 2), deckY(t) + 0.08, s * 0.15);
      g.add(post);
    }
    railSeg(-1, -0.5, s);
    railSeg(-0.5, 0.5, s);
    railSeg(0.5, 1, s);
  }
  return g;
}

// registry — the list, in box order; poppet's name is filled at boot
export const TOYS = [
  { key: 'man',        label: 'generic male figure',   build: () => humanoid({ broad: true }) },
  { key: 'woman',      label: 'generic female figure', build: () => humanoid({ broad: false }) },
  { key: 'poppet',     label: 'the poppet',            build: poppet, named: true },
  { key: 'canine',     label: 'canine',                build: canine },
  { key: 'feline',     label: 'feline',                build: feline },
  { key: 'house',      label: 'house',                 build: house },
  { key: 'tree',       label: 'tree',                  build: tree },
  { key: 'snake',      label: 'snake',                 build: snake },
  { key: 'bird',       label: 'bird',                  build: bird },
  { key: 'fence',      label: 'picket fence',          build: fence },
  { key: 'bridge',     label: 'bridge',                build: bridge },
  { key: 'cross',      label: 'cross',                 build: cross },
  { key: 'cellphone',  label: 'cellphone',             build: cellphone },
  { key: 'coffin',     label: 'coffin',                build: coffin },
  { key: 'bottle',     label: 'bottle',                build: bottle },
  { key: 'cigarette',  label: 'cigarette',             build: cigarette },
];

// build one figure; kindOrEntry is a toy key or a serialized figure entry
export function buildFigure(kindOrEntry) {
  const entry = typeof kindOrEntry === 'string' ? { kind: kindOrEntry } : (kindOrEntry || {});
  const def = TOYS.find((t) => t.key === entry.kind) || TOYS[0];
  const g = clayMind(def.build());   // every figure leaves the toybox hand-molded
  g.userData = Object.assign(g.userData, {
    id: entry.id || (def.key + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e4)),
    kind: def.key,
    name: entry.name != null ? entry.name : '',
    scale: typeof entry.scale === 'number' ? entry.scale : 1,
    shadowed: !!entry.shadowed,
  });
  return g;
}

/* ── the shadowmaker's look, reusable (build + restore) ────────────────── */

export function applyShadowLook(fig) {
  fig.traverse((node) => {
    if (node.isMesh && node.geometry) {
      const geo = node.geometry.clone();
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        if (Math.random() < 0.22) {
          pos.setXYZ(i,
            pos.getX(i) + (Math.random() - 0.5) * 0.08,
            pos.getY(i) + (Math.random() - 0.5) * 0.06,
            pos.getZ(i) + (Math.random() - 0.5) * 0.08);
        }
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      node.geometry = geo;
      node.material = new THREE.MeshStandardMaterial({
        color: 0x0a0a10, roughness: 0.35, metalness: 0.4,
        emissive: 0x2a1a3a, emissiveIntensity: 0.5,
        flatShading: true,
      });
    }
  });
  return fig;
}

export function shadowDoubleOf(fig) {
  const clone = fig.clone(true);
  applyShadowLook(clone);
  clone.userData = Object.assign({}, fig.userData, {
    id: 'shadow-' + Date.now() + '-' + Math.floor(Math.random() * 1e4),
    name: (fig.userData.name || fig.userData.kind || 'figure') + "'s shadow",
    kind: fig.userData.kind,
    scale: fig.userData.scale || 1,
    shadowed: true,
  });
  return clone;
}

/* ── the randomizer ────────────────────────────────────────────────────── */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomizeFigure(fig) {
  const rng = mulberry32((Math.random() * 1e9) | 0);
  const color = pickColor(rng);
  fig.traverse((node) => {
    if (node.isMesh && node.material && node.material.color) {
      if (node.material.transparent) return;      // glass stays glass
      if (node.material.map) return;              // grained wood stays wood
      const c = node.material.color;
      const isDark = c.r + c.g + c.b < 0.75;
      if (!isDark) node.material = mat(color);
    }
  });
  const sy = 0.8 + rng() * 0.5;
  const sxz = 0.8 + rng() * 0.5;
  fig.scale.set(fig.scale.x * sxz, fig.scale.y * sy, fig.scale.z * sxz);
  fig.userData.scale = (fig.userData.scale || 1) * sy;
  return fig;
}

/* ── the machines ──────────────────────────────────────────────────────── */

// Four chambers along the back wall, each with its own silhouette so the
// sandplayer reads them at a glance:
//   shrinkifier — a low press with a stomping piston ram under a funnel
//   biggifier   — a tall boiler with an expanding ring stack, chains, a wheel
//   shadowmaker — a ragged dark booth, split roof, smouldering pipe
//   randomizer  — a patchwork barrel drum that spins on its axle
// Shared contract with the room: userData.door (glass), userData.lamp
// (PointLight), userData.bulb (emissive sphere) — memory.js lights these
// while a machine chews.
export function makeMachine(kind, accent) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x35302a, roughness: 0.55, metalness: 0.45 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x211d18, roughness: 0.6, metalness: 0.4 });
  const accentM = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.35, metalness: 0.55 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.3, metalness: 0.8 });

  // shared door: frame + glass, the glass brightens while the machine chews
  function mkDoor(w, h, y, z) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.07), accentM);
    frame.position.set(0, y, z - 0.03);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x9ab0c0, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.28 })
    );
    glass.position.set(0, y, z);
    g.userData.door = glass;
    g.add(frame, glass);
    return glass;
  }
  // shared lamp: housing + emissive bulb, hung over the face
  function mkLamp(x, y, z) {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.16, 8), steelDark);
    housing.position.set(x, y + 0.08, z);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 10, 8),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0, roughness: 0.3 })
    );
    bulb.position.set(x, y, z);
    const lamp = new THREE.PointLight(accent, 0, 4.5, 1.8);
    lamp.position.set(x, y - 0.55, z + 0.55);
    g.userData.bulb = bulb;
    g.userData.lamp = lamp;
    g.add(housing, bulb, lamp);
  }
  // shared feet
  for (const [x, z] of [[-0.62, 0.45], [0.62, 0.45], [-0.62, -0.45], [0.62, -0.45]]) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.12, 8), steelDark);
    foot.position.set(x, 0.02, z);
    g.add(foot);
  }

  if (kind === 'shrinkifier') {
    // a squat industrial press: tapered body, stomping ram under a funnel
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 1.3), steel);
    body.position.y = 0.75;
    g.add(body);
    mkDoor(0.72, 0.86, 0.72, 0.7);
    // the press head: rails, a heavy ram, and the funnel that feeds it
    const columnL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 0.2), steelDark);
    columnL.position.set(-0.55, 1.95, 0);
    const columnR = columnL.clone(); columnR.position.x = 0.55;
    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.34, 0.6), steel);
    cross.position.y = 2.72;
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.14, 0.55, 4, 1, true), accentM);
    funnel.rotation.y = Math.PI / 4;
    funnel.position.y = 2.36;
    const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.3, 4), steelDark);
    ram.rotation.y = Math.PI / 4;
    ram.position.y = 1.94;
    ram.userData.stomp = { top: 2.42, bottom: 1.62 };
    g.add(columnL, columnR, cross, funnel, ram);
    mkLamp(0, 3.06, 0.44);   // clear of the funnel, clear of the name plate
  } else if (kind === 'biggifier') {
    // a tall boiler: expansion rings up the body, a breathing stack, a wheel
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 1.15), steel);
    body.position.y = 1.12;
    g.add(body);
    mkDoor(0.86, 1.5, 1.05, 0.62);
    // rings: the boiler swells as it climbs — kept above the name plate
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.1, 0.05, 7, 20), i % 2 ? brass : accentM);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2.85 + i * 0.18;
      g.add(ring);
    }
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.75, 10), steelDark);
    stack.position.y = 3.62;
    const stackLip = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.14, 10), accentM);
    stackLip.position.y = 4.03;
    g.add(stack, stackLip);
    // the pressure wheel: spokes inside a brass rim
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 6, 16), brass);
    wheel.position.set(0, 0.9, 0.72);
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.56, 0.05), steelDark);
      spoke.rotation.z = (i * Math.PI) / 4;
      spoke.position.copy(wheel.position);
      spoke.position.z += 0.02;
      g.add(spoke);
    }
    wheel.userData.spin = 'axle';
    g.add(wheel);
    // rivet seams down the corners
    for (const sx of [-0.72, 0.72]) {
      for (let i = 0; i < 6; i++) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), steelDark);
        rivet.position.set(sx, 0.35 + i * 0.34, 0.44);
        g.add(rivet);
      }
    }
    mkLamp(0, 2.56, 0.52);   // on the body's face, clear of the rings and plate
  } else if (kind === 'shadowmaker') {
    // a ragged dark booth: the whole thing leans out of true, roof split,
    // smoke pipe smouldering, purple light leaking under its skirt
    const lean = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 1.1), new THREE.MeshStandardMaterial({ color: 0x18141c, roughness: 0.75, metalness: 0.25 }));
    lean.position.y = 1.2;
    lean.rotation.z = -0.05;
    lean.rotation.x = 0.04;
    g.add(lean);
    mkDoor(0.8, 1.5, 1.15, 0.62);
    g.userData.door.material.color.set(0x3a2a4a);   // smoked glass
    // the split roof: two mismatched slabs, one slipped
    const roofA = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 1.3), steelDark);
    roofA.position.set(-0.36, 2.36, 0);
    roofA.rotation.z = 0.1;
    const roofB = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 1.3), steelDark);
    roofB.position.set(0.44, 2.44, 0.05);
    roofB.rotation.z = -0.14;
    g.add(roofA, roofB);
    // the pipe: a bent stack breathing purple haze
    const pipeA = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.5, 8), steelDark);
    pipeA.position.set(0.5, 2.75, -0.25);
    pipeA.rotation.z = -0.35;
    const pipeB = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), steelDark);
    pipeB.position.set(0.38, 3.02, -0.25);
    pipeB.rotation.z = 0.5;
    g.add(pipeA, pipeB);
    // jagged fins down the back, like torn paper shadows
    for (let i = 0; i < 5; i++) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.6 + (i % 2) * 0.25, 4), new THREE.MeshStandardMaterial({ color: 0x241a30, roughness: 0.9, flatShading: true }));
      fin.position.set(-0.35 + i * 0.19, 0.55, -0.68);
      fin.rotation.x = Math.PI;
      fin.rotation.z = (i % 2 ? 0.18 : -0.12);
      g.add(fin);
    }
    // the skirt-light: a thin emissive strip that haunts the floor
    const haunt = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.05, 1.16), new THREE.MeshStandardMaterial({ color: 0x2a1a3a, emissive: 0x7a3aaa, emissiveIntensity: 0.4, roughness: 0.6 }));
    haunt.position.y = 0.13;
    g.add(haunt);
    mkLamp(0, 2.62, 0.42);
    g.userData.lamp.color.set(0x9a5ad0);   // purple, not accent-gold
  } else {
    // the randomizer: a big patchwork drum that spins on its axle,
    // a hopper on top, a dice-tray foot, a crank on the side
    const axleY = 1.15;
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.8, 8), steelDark);
    axle.rotation.z = Math.PI / 2;
    axle.position.y = axleY;
    // frame legs holding the axle, clear of the drum's sweep
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, axleY + 0.12, 1.0), steelDark);
      leg.position.set(s * 0.95, (axleY + 0.12) / 2, 0);
      g.add(leg);
    }
    const drum = new THREE.Group();
    drum.position.y = axleY;
    // the barrel: six flat panels wrapped as a true hexagonal shell, so the
    // faces meet at raised seams instead of clipping through one another —
    // three green, three steel, and every seam reads as a welded corner
    const panels = [accentM, steel, accentM, steelDark, accentM, steel];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const panel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.51, 0.51, 1.06, 6, 1, true, a - Math.PI / 6, Math.PI / 3),
        panels[i]
      );
      panel.rotation.x = Math.PI / 2;
      drum.add(panel);
    }
    for (let i = 0; i < 6; i++) {
      const va = (i / 6) * Math.PI * 2 + Math.PI / 6;   // the hexagon's corners
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 1.1), steelDark);
      seam.position.set(Math.cos(va) * 0.44, Math.sin(va) * 0.44, 0);
      seam.rotation.z = va + Math.PI / 2;
      drum.add(seam);
    }
    // band rims left and right, hugging the shell
    for (const s of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.05, 7, 22), brass);
      band.position.z = s * 0.56;
      drum.add(band);
    }
    // porthole: the door, right on the drum's face
    const port = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14),
      new THREE.MeshStandardMaterial({ color: 0x9ab0c0, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.28 })
    );
    port.rotation.x = Math.PI / 2;
    port.position.z = 0.56;
    drum.add(port);
    g.userData.door = port;
    drum.userData.spin = 'axle';
    g.add(axle, drum);
    // hopper: a square funnel feeding the drum
    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.44, 0.5, 4, 1, true), accentM);
    hopper.rotation.y = Math.PI / 4;
    hopper.position.set(-0.18, 2.0, 0);
    g.add(hopper);
    // crank
    const crankArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.08), steelDark);
    crankArm.position.set(0.95, axleY + 0.2, 0);
    const crankKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), brass);
    crankKnob.rotation.x = Math.PI / 2;
    crankKnob.position.set(0.95, axleY + 0.36, 0.08);
    g.add(crankArm, crankKnob);
    // dice tray: a shallow tray with two fat dice, always mid-tumble
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.72), steelDark);
    tray.position.set(0, 0.1, 0.72);
    g.add(tray);
    for (const [dx, dz] of [[-0.16, -0.1], [0.14, 0.12]]) {
      const die = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), accentM);
      die.position.set(dx, 0.24, dz);
      die.rotation.set(Math.random(), Math.random(), Math.random());
      die.userData.tumble = true;
      g.add(die);
    }
    mkLamp(0, 2.4, 0.44);   // clear of the hopper and the name plate
    g.userData.lamp.position.set(0, 1.15, 1.1);   // wash the drum, not the hopper
  }

  g.userData.body = g;
  // the machines are furniture: wider and taller, but the depth stays
  // honest — uniform scaling made them bulky into the walkway
  g.scale.set(1.35, 1.4, 1.0);
  g.traverse((n) => {
    if (n.isMesh && n !== g.userData.door) { n.castShadow = true; n.receiveShadow = true; }
  });
  return g;
}

export const MACHINES = [
  { key: 'shrinkifier', label: 'shrinkifier', accent: 0x4a8ac8, say: 'reduces a figure by half' },
  { key: 'biggifier',   label: 'biggifier',   accent: 0xd8703a, say: 'doubles a figure' },
  { key: 'shadowmaker', label: 'shadowmaker', accent: 0x7a3aaa, say: 'prints a glitched double' },
  { key: 'randomizer',  label: 'randomizer',  accent: 0x4aa85a, say: 'rolls the figure again' },
];

/* ── the toy crate ─────────────────────────────────────────────────────── */

// the actual box of toys: a slatted wooden crate on a sturdy bench, low
// enough that the camera looks DOWN into it and the toys read as objects,
// not silhouettes. Returns { group, toys } — toys are the pick targets.
export function makeCrate(playerName) {
  const g = new THREE.Group();
  const W = 2.5, D = 1.5, H = 0.95, BENCH_H = 0.72;
  const plankTex = woodTexture('#7a5a36', '#3a2a16', 34);
  const plankM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: plankTex, roughness: 0.85 });
  const postM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTexture('#5a4026', '#2c1c0c', 0), roughness: 0.9 });
  const benchM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTexture('#6a4c2e', '#3a2812', 40), roughness: 0.9 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTexture('#4a3420', '#241608', 0), roughness: 0.95 });

  // the bench: four legs, rails, a top — everything on it sits at BENCH_H
  const top = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.09, D + 0.4), benchM);
  top.position.y = BENCH_H - 0.045;
  g.add(top);
  for (const [lx, lz] of [[-W / 2 - 0.14, -D / 2 - 0.12], [W / 2 + 0.14, -D / 2 - 0.12], [-W / 2 - 0.14, D / 2 + 0.12], [W / 2 + 0.14, D / 2 + 0.12]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, BENCH_H - 0.09, 0.13), benchM);
    leg.position.set(lx, (BENCH_H - 0.09) / 2, lz);
    g.add(leg);
    const stretcher = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, D + 0.1), darkM);
    stretcher.position.set(lx, 0.16, 0);
    g.add(stretcher);
  }
  const floorBoard = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, D), plankM);
  floorBoard.position.y = BENCH_H + 0.03;
  g.add(floorBoard);
  // a false bottom a hand's width up, so the toys stand proud of the slats
  const falseBottom = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.05, D - 0.1), darkM);
  falseBottom.position.y = BENCH_H + 0.32;
  g.add(falseBottom);
  // corner posts
  for (const [x, z] of [[-W / 2 + 0.07, -D / 2 + 0.07], [W / 2 - 0.07, -D / 2 + 0.07], [-W / 2 + 0.07, D / 2 - 0.07], [W / 2 - 0.07, D / 2 - 0.07]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, H, 0.11), postM);
    post.position.set(x, BENCH_H + H / 2, z);
    g.add(post);
  }
  // slats on the two visible sides (front + left), gaps between
  const slat = (w, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, 0.05), plankM);
    m.position.set(x, y, z);
    m.rotation.y = ry || 0;
    g.add(m);
    return m;
  };
  for (let i = 0; i < 3; i++) {
    slat(W - 0.16, 0, BENCH_H + 0.12 + i * 0.26, D / 2);          // front face
    slat(D - 0.16, -W / 2, BENCH_H + 0.12 + i * 0.26, 0, Math.PI / 2);  // left face
    slat(D - 0.16, W / 2, BENCH_H + 0.12 + i * 0.26, 0, Math.PI / 2);   // right face
  }
  // a top rail around the crate rim, and ball caps on the corner posts
  for (const [rx, rz, rw, rd] of [[0, D / 2, W + 0.1, 0.08], [-W / 2, 0, 0.08, D + 0.1], [W / 2, 0, 0.08, D + 0.1]]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.07, rd), plankM);
    rail.position.set(rx, BENCH_H + H + 0.02, rz);
    g.add(rail);
  }
  for (const [x, z] of [[-W / 2 + 0.07, -D / 2 + 0.07], [W / 2 - 0.07, -D / 2 + 0.07], [-W / 2 + 0.07, D / 2 - 0.07], [W / 2 - 0.07, D / 2 - 0.07]]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), postM);
    cap.position.set(x, BENCH_H + H + 0.07, z);
    g.add(cap);
  }
  // the plaque: a carved board screwed to the front — TOYS, and whose.
  // crate-sign size: it reads from across the room
  const c = document.createElement('canvas');
  c.width = 768; c.height = 270;
  const x = c.getContext('2d');
  x.fillStyle = '#b89258'; x.fillRect(0, 0, 768, 270);
  for (let i = 0; i < 26; i++) {
    const y0 = Math.random() * 270;
    x.strokeStyle = 'rgba(122,90,50,0.35)';
    x.lineWidth = 1 + Math.random() * 2;
    x.beginPath(); x.moveTo(0, y0);
    for (let px = 0; px <= 768; px += 32) x.lineTo(px, y0 + Math.sin(px * 0.02 + i) * 3);
    x.stroke();
  }
  x.strokeStyle = '#4a3014'; x.lineWidth = 12; x.strokeRect(12, 12, 744, 246);
  x.strokeStyle = 'rgba(74,48,20,0.5)'; x.lineWidth = 4; x.strokeRect(32, 32, 704, 206);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#3a2410';
  // 100/50 (from 112/60): long aliases clipped at the plaque's inner border
  x.font = '700 100px "Fira Code", Menlo, Consolas, monospace';
  x.fillText('TOYS', 384, 100);
  x.font = '500 50px "Fira Code", Menlo, Consolas, monospace';
  x.fillText((playerName || 'somebody') + "'s", 384, 198);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.84, 0.07),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 })
  );
  plaque.position.set(0, BENCH_H + 0.66, D / 2 + 0.06);
  g.add(plaque);
  // brass pins at the corners, like it was hung with real screws
  const pinM = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.35, metalness: 0.7 });
  for (const [px, py] of [[-1.02, 0.28], [1.02, 0.28], [-1.02, -0.28], [1.02, -0.28]]) {
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), pinM);
    pin.position.set(px, BENCH_H + 0.66 + py, D / 2 + 0.1);
    g.add(pin);
  }

  // the jumble: every toy, half scale, standing loosely in rows inside —
  // upright, yawed to vary, so each is identifiable from above
  const toys = [];
  const jx = [-0.95, -0.62, -0.3, 0.04, 0.38, 0.72, 1.04, -0.8, -0.15, 0.52, 0.88, -0.65, 0.05, -0.48, 0.25, 0.38];
  const jz = [-0.46, 0.34, -0.38, 0.28, -0.44, 0.38, -0.34, 0.04, -0.06, 0.02, 0.32, -0.44, -0.62, -0.01, 0.0, 0.31];
  TOYS.forEach((def, i) => {
    const toy = def.build();
    toy.scale.setScalar(0.62);
    toy.position.set(jx[i % jx.length] * (W / 2.4), BENCH_H + 0.34, jz[i % jz.length]);
    toy.rotation.y = (i * 1.9) % (Math.PI * 2);
    toy.userData = Object.assign(toy.userData, { crateKey: def.key, crateLabel: def.label, named: !!def.named });
    g.add(toy);
    toys.push(toy);
  });
  g.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  return { group: g, toys };
}

/* ── the tools, as objects on the floor ────────────────────────────────── */

export function makeToolMesh(key) {
  const g = new THREE.Group();
  // the tools are plastic toys: glossy, bright, unmistakable. a little
  // self-glow so the iconic colors still read in the tray's warm shadow
  const plastic = (hex) => {
    const m = mat(hex, { roughness: 0.32, metalness: 0.05 });
    m.emissive = new THREE.Color(hex).multiplyScalar(0.3);
    return m;
  };
  if (key === 'stick') {
    // a stick from the yard: bark, a whittled point, a knot, and a forked
    // twig at the top — the same honest push, found rather than bought
    const bark = mat(0xffffff, { roughness: 0.9, map: woodTexture('#7a5a38', '#46301a', 0) });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.042, 1.55, 8), bark);
    shaft.position.y = 0.78;
    g.add(shaft);
    // the point: the lower end whittled to a tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.16, 8), bark);
    tip.rotation.x = Math.PI;
    tip.position.y = -0.06;
    g.add(tip);
    // a knot where a side branch was pruned
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 7, 6), mat(0x4a341e, { roughness: 0.95 }));
    knot.position.set(0.03, 0.62, 0.012);
    knot.scale.set(1, 0.7, 0.7);
    g.add(knot);
    // the fork: two twigs splitting off the crown
    const forkA = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.02, 0.4, 7), bark);
    forkA.position.set(0.09, 1.68, 0);
    forkA.rotation.z = -0.5;
    const forkB = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.017, 0.34, 7), bark);
    forkB.position.set(-0.08, 1.66, 0.03);
    forkB.rotation.z = 0.52;
    forkB.rotation.x = -0.14;
    g.add(forkA, forkB);
    g.userData.stand = 'lean';
  } else if (key === 'shovel') {
    // the classic sandbox spade, blown up chunky: a wide red scoop with a
    // mouth, a foot-plate, face ribs, a fat yellow shaft and a T-grip a
    // mitten could hold
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.11), plastic(0xc04838));
    blade.position.y = 0.25;
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.09, 0.13), plastic(0xa83a2e));
    lip.position.y = 0.065;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.17), plastic(0xa83a2e));
    plate.position.y = 0.45;
    for (const rx of [-0.1, 0.1]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.125), plastic(0xa83a2e));
      rib.position.set(rx, 0.25, 0);
      g.add(rib);
    }
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.06, 0.92, 10), plastic(0xe0b83a));
    shaft.position.y = 0.93;
    const collar = new THREE.Mesh(new THREE.SphereGeometry(0.066, 10, 8), plastic(0xe0b83a));
    collar.position.y = 1.4;
    const gripA = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.54, 10), plastic(0xe0b83a));
    gripA.rotation.z = Math.PI / 2;
    gripA.position.y = 1.5;
    const gripB = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.15, 10), plastic(0xe0b83a));
    gripB.position.y = 1.53;
    g.add(blade, lip, plate, shaft, collar, gripA, gripB);
    g.userData.stand = 'stuck';   // it stands blade-down in the sand
  } else if (key === 'brush') {
    // a painter's brush set down mid-stroke: the whole brush LIES at a
    // diagonal — orange head and tip on the sand, fat blue handle rising
    // past a silver ferrule — with its rinse jar standing alongside. the
    // diagonal silhouette is what makes a brush read as a brush.
    const body = new THREE.Group();
    body.rotation.z = -0.78;   // the working diagonal, baked into the parts
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), plastic(0xd8823a));
    head.scale.set(1.3, 0.95, 0.95);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.24, 10), plastic(0xc06a2a));
    tip.rotation.z = Math.PI / 2;   // points down-axis, into the sand
    tip.position.x = -0.22;
    const bind = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 7, 14), plastic(0xa8561e));
    bind.rotation.y = Math.PI / 2;
    bind.position.x = -0.04;
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.24, 12), mat(0xc8ccd0, { metalness: 0.7, roughness: 0.3 }));
    ferrule.rotation.z = Math.PI / 2;
    ferrule.position.x = 0.18;
    const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.52, 6, 12), plastic(0x3a6ac0));
    handle.rotation.z = Math.PI / 2;
    handle.position.x = 0.56;
    for (const rx of [0.46, 0.62]) {
      const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.016, 7, 16), plastic(0x2c5098));
      ridge.rotation.y = Math.PI / 2;
      ridge.position.x = rx;
      body.add(ridge);
    }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), plastic(0x3a6ac0));
    bulb.position.x = 0.9;
    body.add(head, tip, bind, ferrule, handle, bulb);
    body.position.y = 0.2;   // the head rides just above the sand
    // the rinse jar, standing beside the lying brush
    const jar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.12, 0.26, 14),
      new THREE.MeshPhysicalMaterial({ color: 0xe8e2d2, roughness: 0.25, transparent: true, opacity: 0.55 })
    );
    jar.position.set(0.42, 0.13, 0.3);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.03, 14), mat(0x7ab0c8, { roughness: 0.15 }));
    water.position.set(0.42, 0.22, 0.3);
    g.add(body, jar, water);
  } else if (key === 'bucket') {
    // the classic pail: bright blue, white rim, yellow bail handle
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.32, 14, 1, true), plastic(0x4a90d0));
    body.material.side = THREE.DoubleSide;
    body.position.y = 0.16;
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 14), plastic(0x2f66a8));
    bottom.position.y = 0.015;
    // it is a bucket of sand — heaped to the rim, so it reads as one, not a black pot
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.175, 0.2, 14), mat(0xc9a86a, { roughness: 0.95 }));
    fill.position.y = 0.23;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.016, 7, 18), plastic(0xe8e4da));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.32;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.014, 7, 18, Math.PI), plastic(0xe0b83a));
    handle.position.y = 0.32;
    // the pour: a stream that only shows while the bucket tips
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.05, 0.5, 8), mat(0xc9a86a, { roughness: 0.95 }));
    stream.position.set(0.26, 0.02, 0.1);
    stream.rotation.z = -0.85;
    stream.userData.stream = true;
    stream.visible = false;
    g.add(body, bottom, fill, rim, handle, stream);
    g.rotation.z = -0.1;
  }
  g.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  // the tools are the giant toys of the room — roughly three times a figure
  // (the bucket sat at 4.2 and swallowed the tray's centre; 2.6 reads as a
  // pail you could still carry)
  const SCALES = { stick: 2.2, shovel: 2.4, brush: 1.6, bucket: 2.6 };
  g.scale.setScalar(SCALES[key] || 2.4);
  g.userData.tool = key;
  return g;
}
