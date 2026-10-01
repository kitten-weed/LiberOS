// ── VANIR · the raft & its souls ─────────────────────────────────────────────
// Second pass: proper low-poly assets.
//  · plank raft with lashings and gunwale ropes
//  · blue torch: brazier, layered flame, rising embers
//  · glass jar: lathe profile, cork, wax seal, captive light
//  · the ferryman: lathe robe, hood with a void face, IK-driven arms rowing
import * as THREE from '../../../vendor/three.module.js';

// Soft radial glow texture — bare sprite quads render as solid squares.
export function glowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const woodMat = new THREE.MeshStandardMaterial({ color: 0x2e2113, roughness: 0.9, flatShading: true });
const ropeMat = new THREE.MeshStandardMaterial({ color: 0x2b2115, roughness: 1, flatShading: true });
const ironMat = new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.55, metalness: 0.85, flatShading: true });

// ── the raft ─────────────────────────────────────────────────────────────────

// ── the glass jar ──────────────────────────────────────────────────────────────
// A big, material jar riding the deck: real glass shading, cork, wax seal,
// and the traveler's thought sealed inside as a swarm of glowing letters.
function letterTexture(ch) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = 'italic 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(140,200,255,0.9)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(226,242,255,0.96)';
  ctx.fillText(ch, 32, 34);
  ctx.fillText(ch, 32, 34); // double for stronger glow
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const letterTexCache = new Map();
function getLetterTex(ch) {
  if (!letterTexCache.has(ch)) letterTexCache.set(ch, letterTexture(ch));
  return letterTexCache.get(ch);
}

function makeJar() {
  const jar = new THREE.Group();
  // true jar profile: base → belly → shoulder → neck → lip
  const jarPts = [
    new THREE.Vector2(0.001, 0), new THREE.Vector2(0.1, 0.005), new THREE.Vector2(0.155, 0.04),
    new THREE.Vector2(0.175, 0.1), new THREE.Vector2(0.168, 0.17), new THREE.Vector2(0.128, 0.22),
    new THREE.Vector2(0.095, 0.25), new THREE.Vector2(0.09, 0.285), new THREE.Vector2(0.106, 0.3),
    new THREE.Vector2(0.106, 0.325), new THREE.Vector2(0.092, 0.33),
  ];
  const glassMat = new THREE.MeshPhongMaterial({
    color: 0xaecbe0, transparent: true, opacity: 0.3,
    shininess: 110, specular: 0xbfe0ff, flatShading: false,
  });
  const body = new THREE.Mesh(new THREE.LatheGeometry(jarPts, 20), glassMat);
  jar.add(body);
  // inner wall (backside) so the glass reads as a volume
  const inner = new THREE.Mesh(new THREE.LatheGeometry(jarPts, 20), new THREE.MeshPhongMaterial({
    color: 0x86a8c2, transparent: true, opacity: 0.14, shininess: 40,
    side: THREE.BackSide, depthWrite: false,
  }));
  inner.scale.setScalar(0.94);
  jar.add(inner);

  const cork = new THREE.Mesh(
    new THREE.CylinderGeometry(0.082, 0.088, 0.06, 10),
    new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 1, flatShading: true }),
  );
  cork.position.y = 0.35;
  jar.add(cork);

  const seal = new THREE.Mesh(new THREE.TorusGeometry(0.093, 0.014, 5, 12), ropeMat);
  seal.rotation.x = Math.PI / 2;
  seal.position.y = 0.315;
  jar.add(seal);

  // the thought's heart: a small bright mote the letters orbit
  const mote = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.026, 1),
    new THREE.MeshBasicMaterial({ color: 0xeaf6ff }),
  );
  mote.position.y = 0.12;
  jar.add(mote);

  const moteMat = new THREE.SpriteMaterial({
    map: glowTexture('rgba(235,246,255,0.95)', 'rgba(159,212,255,0.35)'),
    transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const moteHalo = new THREE.Sprite(moteMat);
  moteHalo.scale.setScalar(0.32);
  moteHalo.position.y = 0.12;
  jar.add(moteHalo);

  const moteLight = new THREE.PointLight(0xbfe0ff, 4.5, 5, 2.0);
  moteLight.position.y = 0.14;
  jar.add(moteLight);

  // the letters of the sealed thought, swirling inside the glass
  const letterGroup = new THREE.Group();
  jar.add(letterGroup);
  let letters = [];

  function sealLetters(text) {
    // clear old
    for (const l of letters) letterGroup.remove(l.sprite);
    letters = [];
    const chars = [...text.replace(/\s+/g, ' ').trim()].filter((ch) => ch !== ' ').slice(0, 34);
    chars.forEach((ch, i) => {
      const mat = new THREE.SpriteMaterial({
        map: getLetterTex(ch), transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const scale = 0.05 + Math.random() * 0.025;
      sprite.scale.setScalar(scale);
      letterGroup.add(sprite);
      letters.push({
        sprite,
        r: 0.035 + Math.random() * 0.06,
        y: 0.04 + Math.random() * 0.15,
        speed: 0.3 + Math.random() * 0.7,
        phase: (i / chars.length) * Math.PI * 2 + Math.random() * 0.5,
        bob: Math.random() * Math.PI * 2,
        op: 0.7 + Math.random() * 0.3,
      });
    });
  }

  function update(t) {
    for (const l of letters) {
      const a = t * l.speed + l.phase;
      l.sprite.position.set(Math.cos(a) * l.r, l.y + Math.sin(t * 1.3 + l.bob) * 0.012, Math.sin(a) * l.r * 0.7);
      l.sprite.material.opacity = l.op * (0.75 + Math.sin(t * 2 + l.phase) * 0.25);
    }
    mote.position.y = 0.12 + Math.sin(t * 2.2) * 0.012;
    mote.rotation.y = t * 0.8;
    moteHalo.position.y = mote.position.y;
    moteMat.opacity = 0.65 + Math.sin(t * 2.4) * 0.25;
    moteHalo.scale.setScalar(0.32 + Math.sin(t * 1.7) * 0.05);
    moteLight.intensity = 4.5 + Math.sin(t * 3.1) * 1.2;
  }

  return { jar, sealLetters, update };
}

export function makeRaft() {
  const group = new THREE.Group();

  // planks run fore–aft with hand-cut variance
  const plankGeo = new THREE.BoxGeometry(0.24, 0.09, 4.5);
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(plankGeo, woodMat);
    p.position.set((i - 4) * 0.255 + (Math.random() - 0.5) * 0.015, (i % 2) * 0.012 + 0.22, (Math.random() - 0.5) * 0.06);
    p.scale.z = 0.92 + Math.random() * 0.1;
    p.rotation.y = (Math.random() - 0.5) * 0.02;
    group.add(p);
  }
  // bow & stern cants (angled end planks)
  for (const [z, rz] of [[-2.28, 0.5], [2.28, -0.5]]) {
    const cant = new THREE.Mesh(plankGeo, woodMat);
    cant.scale.set(0.85, 1, 0.55);
    cant.position.set(0, 0.34, z);
    cant.rotation.x = rz;
    group.add(cant);
  }
  // cross-beams
  const beamGeo = new THREE.BoxGeometry(2.4, 0.1, 0.2);
  for (const z of [-1.25, 0.15, 1.45]) {
    const b = new THREE.Mesh(beamGeo, woodMat);
    b.position.set(0, 0.45, z);
    group.add(b);
  }
  // rope lashings where beams meet outer planks
  const lashGeo = new THREE.TorusGeometry(0.1, 0.024, 5, 10);
  for (const z of [-1.25, 0.15, 1.45]) {
    for (const x of [-1.02, 1.02]) {
      const l = new THREE.Mesh(lashGeo, ropeMat);
      l.position.set(x, 0.44, z);
      l.rotation.x = Math.PI / 2;
      l.rotation.z = Math.random() * Math.PI;
      group.add(l);
    }
  }
  // gunwale ropes
  const railGeo = new THREE.CylinderGeometry(0.028, 0.028, 4.7, 5);
  for (const x of [-1.06, 1.06]) {
    const r = new THREE.Mesh(railGeo, ropeMat);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, 0.37, 0);
    group.add(r);
  }

  // ── the blue torch ─────────────────────────────────────────────────────────
  const torch = new THREE.Group();
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.045, 1.5, 6), woodMat);
  staff.position.y = 0.75;
  torch.add(staff);

  // brazier bowl (lathe)
  const bowlPts = [
    new THREE.Vector2(0.02, 0), new THREE.Vector2(0.11, 0.02), new THREE.Vector2(0.14, 0.09),
    new THREE.Vector2(0.15, 0.14), new THREE.Vector2(0.12, 0.15),
  ];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 10), ironMat);
  bowl.position.y = 1.5;
  torch.add(bowl);

  // flame: outer shroud + hot core, both additive
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x6fc2ff, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 7), flameMat);
  flame.position.y = 1.72;
  torch.add(flame);

  const flameCoreMat = new THREE.MeshBasicMaterial({
    color: 0xd9efff, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.17, 6), flameCoreMat);
  flameCore.position.y = 1.68;
  torch.add(flameCore);

  const glowMat = new THREE.SpriteMaterial({
    map: glowTexture('rgba(170,216,255,0.9)', 'rgba(63,168,255,0.3)'),
    transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(3.2);
  glow.position.y = 1.66;
  torch.add(glow);

  // embers: sparks crawling up out of the bowl
  const emberCount = 26;
  const emberPos = new Float32Array(emberCount * 3);
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberMat = new THREE.PointsMaterial({
    color: 0x8ecdfc, size: 0.045, map: glowTexture('rgba(255,255,255,1)', 'rgba(160,210,255,0.5)'),
    transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending,
    depthWrite: false, sizeAttenuation: true,
  });
  const embers = new THREE.Points(emberGeo, emberMat);
  const emberSeeds = Array.from({ length: emberCount }, () => ({
    speed: 0.25 + Math.random() * 0.4,
    phase: Math.random(),
    x: (Math.random() - 0.5) * 0.14,
    z: (Math.random() - 0.5) * 0.14,
    sway: Math.random() * Math.PI * 2,
  }));
  torch.add(embers);

  const light = new THREE.PointLight(0x3fa8ff, 18, 24, 1.6);
  light.position.y = 1.7;
  torch.add(light);

  torch.position.set(0.92, 0.54, -0.85);
  group.add(torch);

  // dim cool deck light so the planks read against the void
  const deckLight = new THREE.PointLight(0x46648a, 6.5, 11, 1.6);
  deckLight.position.set(0, 2.2, 0.6);
  group.add(deckLight);

  // ── the jar (big, material, letter-swarm) ──
  const jarRig = makeJar();
  jarRig.jar.position.set(-0.62, 0.46, 1.05);
  jarRig.jar.scale.setScalar(1.9); // reads from the camera
  jarRig.jar.visible = false;      // sealed only once the thought is given
  group.add(jarRig.jar);

  // ── per-frame life (called by crossing) ────────────────────────────────────
  function update(t) {
    const f = 1 + Math.sin(t * 11.3) * 0.12 + Math.sin(t * 23.7) * 0.08 + (Math.random() - 0.5) * 0.08;
    light.intensity = 18 * f;
    flame.scale.set(1 + Math.sin(t * 9.1) * 0.12, 0.9 + Math.sin(t * 13.7) * 0.18, 1 + Math.sin(t * 7.7) * 0.1);
    flame.rotation.y = t * 2.4;
    flameCore.scale.set(1 + Math.sin(t * 12.3) * 0.15, 0.85 + Math.sin(t * 17.1) * 0.25, 1);
    glowMat.opacity = 0.42 + f * 0.06;

    // embers rise, sway, respawn
    for (let i = 0; i < emberSeeds.length; i++) {
      const s = emberSeeds[i];
      const life = (t * s.speed + s.phase) % 1;
      emberPos[i * 3 + 0] = s.x + Math.sin(t * 1.7 + s.sway) * 0.06 * life;
      emberPos[i * 3 + 1] = 1.62 + life * 0.9;
      emberPos[i * 3 + 2] = s.z + Math.cos(t * 1.3 + s.sway) * 0.05 * life;
    }
    emberGeo.attributes.position.needsUpdate = true;
    emberMat.opacity = 0.55 + Math.sin(t * 3.7) * 0.2;

    deckLight.intensity = 6.5 + Math.sin(t * 2.9) * 0.5;

    jarRig.jar.position.y = 0.46 + Math.sin(t * 1.31) * 0.01;
    jarRig.jar.rotation.y = Math.sin(t * 0.4) * 0.06;
    if (jarRig.jar.visible) jarRig.update(t);
  }

  return {
    group, torch, flame, flameCore, glowMat, light, update,
    sealJar: (text) => { jarRig.jar.visible = true; jarRig.sealLetters(text); },
    releaseJar: () => { jarRig.jar.visible = false; },
  };
}

// ── the ferryman ─────────────────────────────────────────────────────────────
// A vague, glitchy shadow. Lathe robe, hood with a void face that sometimes
// turns to look at you, arms solved with two-bone IK so the rowing reads.
export function makeFerryman() {
  const group = new THREE.Group();
  const baseX = 0, baseZ = -1.32;
  group.position.set(baseX, 0.9, baseZ);

  const cloakMat = new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 1, metalness: 0, flatShading: true });

  // robe: flared base, cinched waist, shoulder ledge
  const robePts = [
    new THREE.Vector2(0.02, 0), new THREE.Vector2(0.46, 0.02), new THREE.Vector2(0.4, 0.1),
    new THREE.Vector2(0.3, 0.42), new THREE.Vector2(0.235, 0.78), new THREE.Vector2(0.21, 1.02),
    new THREE.Vector2(0.24, 1.14), new THREE.Vector2(0.225, 1.22), new THREE.Vector2(0.16, 1.28),
  ];
  const robe = new THREE.Mesh(new THREE.LatheGeometry(robePts, 9), cloakMat);
  group.add(robe);

  // shoulder hunch
  for (const side of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), cloakMat);
    sh.position.set(side * 0.17, 1.16, 0.02);
    sh.scale.set(1.15, 0.8, 1);
    group.add(sh);
  }

  // head group: hood dome + void face + static + eyes (turnable)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.24, 0);
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62),
    cloakMat,
  );
  hood.scale.set(1, 1.15, 1.05);
  hood.position.y = 0.12;
  headGroup.add(hood);
  // hood cowl lip
  const cowl = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 5, 10), cloakMat);
  cowl.rotation.x = Math.PI / 2 - 0.35;
  cowl.position.y = 0.16;
  headGroup.add(cowl);

  // the void where a face would be (faces −z = travel direction)
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const faceVoid = new THREE.Mesh(new THREE.CircleGeometry(0.105, 12), voidMat);
  faceVoid.position.set(0, 0.16, -0.12);
  faceVoid.rotation.y = Math.PI;
  headGroup.add(faceVoid);

  // static glitch over the face
  const headCanvas = document.createElement('canvas');
  headCanvas.width = 24; headCanvas.height = 24;
  const hctx = headCanvas.getContext('2d');
  const headTex = new THREE.CanvasTexture(headCanvas);
  headTex.magFilter = THREE.NearestFilter;
  const staticMat = new THREE.MeshBasicMaterial({ map: headTex, transparent: true, opacity: 0.3 });
  const staticPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.19), staticMat);
  staticPlane.position.set(0, 0.16, -0.125);
  staticPlane.rotation.y = Math.PI;
  headGroup.add(staticPlane);

  // ember eyes — only lit when he turns to look at you
  const eyeMat = new THREE.SpriteMaterial({
    map: glowTexture('rgba(220,240,255,1)', 'rgba(120,190,255,0.4)'),
    transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const eyes = [];
  for (const x of [-0.045, 0.045]) {
    const e = new THREE.Sprite(eyeMat);
    e.scale.setScalar(0.05);
    e.position.set(x, 0.17, -0.13);
    headGroup.add(e);
    eyes.push(e);
  }
  group.add(headGroup);

  // oars: pivot at the oarlock, tapered shaft, oval blade
  const oars = [];
  const shaftGeo = new THREE.CylinderGeometry(0.024, 0.032, 2.4, 6);
  const bladeGeo = new THREE.CylinderGeometry(0.085, 0.05, 0.66, 7);
  for (const side of [-1, 1]) {
    const oar = new THREE.Group();
    const shaft = new THREE.Mesh(shaftGeo, woodMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = side * 0.3;
    oar.add(shaft);
    const blade = new THREE.Mesh(bladeGeo, woodMat);
    blade.scale.z = 0.3;
    blade.rotation.z = side > 0 ? -0.06 : Math.PI + 0.06;
    blade.position.set(side * 1.52, -0.02, 0);
    oar.add(blade);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), woodMat);
    knob.position.x = -side * 0.85;
    oar.add(knob);
    oar.position.set(side * 0.3, 1.0, -0.15);
    oar.rotation.y = side * 1.15;
    oar.userData.side = side;
    group.add(oar);
    oars.push(oar);
  }

  // arms: two-bone IK — shoulder → elbow → hand gripping the oar
  const L1 = 0.42, L2 = 0.4;
  const armMat = cloakMat;
  const upGeo = new THREE.CylinderGeometry(0.05, 0.043, L1, 6);
  const foreGeo = new THREE.CylinderGeometry(0.042, 0.036, L2, 6);
  const hands = [];
  const arms = oars.map(() => {
    const upper = new THREE.Mesh(upGeo, armMat);
    const fore = new THREE.Mesh(foreGeo, armMat);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), armMat);
    group.add(upper, fore, hand);
    hands.push(hand);
    return { upper, fore };
  });

  const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _b = new THREE.Vector3();
  const _e = new THREE.Vector3(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
  const _mid = new THREE.Vector3(), _dir = new THREE.Vector3();

  // place a bone mesh between two points; geo is built at lenGeo length
  function placeBone(mesh, a, bVec, lenGeo) {
    _dir.subVectors(bVec, a);
    const len = _dir.length();
    mesh.position.copy(a).addScaledVector(_dir, 0.5);
    mesh.quaternion.setFromUnitVectors(_up, _dir.clone().normalize());
    mesh.scale.set(1, len / lenGeo, 1);
  }

  let glitch = 0;
  let headTimer = 6 + Math.random() * 8;   // seconds until first look
  let headState = 'away';                  // away | turning | looking | returning
  let headTurn = 0;                        // 0 = away, 1 = facing you

  function update(t, rowing) {
    // ── rowing cycle ──
    const cyc = rowing ? t * 1.6 : t * 0.22;
    for (const oar of oars) {
      const side = oar.userData.side;
      const ph = cyc + (side > 0 ? Math.PI : 0);
      const pull = Math.sin(ph);
      oar.rotation.x = pull * 0.5;                       // stroke fore/aft
      oar.rotation.z = side * (0.16 + Math.cos(ph) * 0.3); // blade digs & lifts
    }

    // ── IK arms onto the oars ──
    for (let i = 0; i < oars.length; i++) {
      const oar = oars[i];
      const side = oar.userData.side;
      oar.updateWorldMatrix(true, false);
      _q.setFromEuler(oar.rotation);
      _v.set(-side * 0.55, 0.05, 0).applyQuaternion(_q).add(oar.position); // grip, ferry-local
      const S = _e.set(side * 0.17, 1.16, 0.06); // shoulder
      _n.subVectors(_v, S);
      let d = _n.length();
      const maxD = L1 + L2 - 0.03, minD = 0.28;
      if (d > maxD) { _n.multiplyScalar(maxD / d); d = maxD; _v.copy(S).add(_n); }
      if (d < minD) { _n.multiplyScalar(minD / (d || 1e-5)); d = minD; _v.copy(S).add(_n); }
      _n.divideScalar(d);
      const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
      _b.set(side * 0.9, -0.55, 0.1);
      _b.addScaledVector(_n, -_b.dot(_n)).normalize();
      const E = new THREE.Vector3().copy(S).addScaledVector(_n, a).addScaledVector(_b, h);
      placeBone(arms[i].upper, S, E, L1);
      placeBone(arms[i].fore, E, _v, L2);
      hands[i].position.copy(_v);
    }

    // ── body life ──
    robe.rotation.z = Math.sin(cyc) * 0.035;
    robe.scale.y = 1 + Math.sin(cyc * 0.9) * 0.015;

    // ── glitch: hard jitters, rare ──
    if (glitch > 0) {
      glitch -= 1;
      group.position.x = baseX + (Math.random() - 0.5) * 0.06;
      group.position.z = baseZ + (Math.random() - 0.5) * 0.06;
      staticMat.opacity = 0.75;
    } else {
      group.position.x = baseX;
      group.position.z = baseZ;
      staticMat.opacity = 0.3 + Math.sin(t * 1.1) * 0.08;
      if (Math.random() < 0.006) glitch = 2 + (Math.random() * 3 | 0);
    }

    // ── the look: now and then he turns to face you ──
    headTimer -= 1 / 60;
    if (headState === 'away' && headTimer <= 0) { headState = 'turning'; }
    if (headState === 'turning') {
      headTurn = Math.min(1, headTurn + 0.045);
      if (headTurn >= 1) { headState = 'looking'; headTimer = 2.2; }
    } else if (headState === 'looking') {
      if (headTimer <= 0) headState = 'returning';
    } else if (headState === 'returning') {
      headTurn = Math.max(0, headTurn - 0.045);
      if (headTurn <= 0) { headState = 'away'; headTimer = 14 + Math.random() * 14; }
    }
    headGroup.rotation.y = headTurn * Math.PI;
    const eyeGlow = headTurn * (0.5 + Math.sin(t * 9) * 0.3);
    eyeMat.opacity = eyeGlow;
    // static only visible from the front; from behind it reads as faint noise
    staticMat.opacity = headState === 'looking' ? 0.75 : 0.12 + Math.sin(t * 1.1) * 0.05;

    // head static redraw @ ~12fps
    if ((t * 60 | 0) % 5 === 0) {
      hctx.clearRect(0, 0, 24, 24);
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
          if (Math.random() < 0.2) {
            const v = Math.random();
            hctx.fillStyle = `rgba(${v * 50}, ${v * 60}, ${v * 80}, ${0.2 + Math.random() * 0.5})`;
            hctx.fillRect(x, y, 1, 1);
          }
        }
      }
      headTex.needsUpdate = true;
    }
  }

  return { group, oars, update };
}
