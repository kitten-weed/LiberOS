/* The poppet doll itself: meshes, garments, verlet physics, mesh sync, painting targets.
   Limb tubes SPAN +Y from their root joint — shoulders read on the torso, forearms
   and shins bridge elbow→wrist and knee→foot. Doll starts bare. */
import * as THREE from '../vendor/three.module.js';
import { V } from './lab.js?v=lab53';
import { IDX, N, TOTAL, POSES, dims, fkPose, fkConfig, buildSticks } from './rig.js?v=lab53';

export function weaveFill(ctx, w, h, base) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120, 96, 60, 0.10)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 4) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
  for (let x = 0; x < w; x += 4) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
}

const ATLAS = {
  head:   [0.015, 0.015, 0.30, 0.30],
  chest:  [0.35,  0.015, 0.31, 0.30],
  pelvis: [0.685, 0.015, 0.30, 0.30],
  waistBall: [0.35, 0.35, 0.12, 0.12],
  shLb:   [0.015, 0.35, 0.07, 0.07], shRb: [0.095, 0.35, 0.07, 0.07],
  elLb:   [0.015, 0.43, 0.05, 0.05], elRb: [0.075, 0.43, 0.05, 0.05],
  hpLb:   [0.135, 0.35, 0.07, 0.07], hpRb: [0.215, 0.35, 0.07, 0.07],
  knLb:   [0.135, 0.43, 0.05, 0.05], knRb: [0.195, 0.43, 0.05, 0.05],
  haL:    [0.015, 0.50, 0.09, 0.09], haR:  [0.115, 0.50, 0.09, 0.09],
  ftL:    [0.215, 0.50, 0.11, 0.09], ftR:  [0.335, 0.50, 0.11, 0.09],
  armLU:  [0.015, 0.61, 0.115, 0.37], armLL: [0.14,  0.61, 0.10, 0.37],
  armRU:  [0.25,  0.61, 0.115, 0.37], armRL: [0.375, 0.61, 0.10, 0.37],
  legLU:  [0.49,  0.61, 0.115, 0.37], legLL: [0.615, 0.61, 0.10, 0.37],
  legRU:  [0.73,  0.61, 0.115, 0.37], legRL: [0.855, 0.61, 0.10, 0.37]
};

/* region key per mesh — the bucket floods exactly these panels */
const REGION_OF = {
  head: 'head', chest: 'chest', pelvis: 'pelvis', waistBall: 'waistBall', neck: 'waistBall',
  armLU: 'armLU', armLL: 'armLL', armRU: 'armRU', armRL: 'armRL',
  legLU: 'legLU', legLL: 'legLL', legRU: 'legRU', legRL: 'legRL',
  hand_haL: 'haL', hand_haR: 'haR', foot_akL: 'ftL', foot_akR: 'ftR',
  j_shL: 'shLb', j_shR: 'shRb', j_elL: 'elLb', j_elR: 'elRb',
  j_hpL: 'hpLb', j_hpR: 'hpRb', j_knL: 'knLb', j_knR: 'knRb'
};
const SECTIONS = {
  head: ['head'],
  torso: ['chest', 'pelvis', 'waistBall'],
  arms: ['armLU', 'armLL', 'armRU', 'armRL', 'shLb', 'shRb', 'elLb', 'elRb', 'haL', 'haR'],
  legs: ['legLU', 'legLL', 'legRU', 'legRL', 'hpLb', 'hpRb', 'knLb', 'knRb', 'ftL', 'ftR']
};

function mapRegion(geo, rect) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, rect[0] + uv.getX(i) * rect[2], rect[1] + uv.getY(i) * rect[3]);
  }
  uv.needsUpdate = true;
}
/* spans +Y: root joint at origin, far joint at (0, len, 0) — matches segXform's +Y aim */
function spanGeo(len, wTop, wBot) {
  const g = new THREE.CylinderGeometry(wTop, wBot, len, 16);
  g.translate(0, len / 2, 0);
  return g;
}

export function createDoll(scene, bodyCv, bodyGuides, hooks) {
  const bodyCtx = bodyCv.getContext('2d');
  weaveFill(bodyCtx, bodyCv.width, bodyCv.height, '#ead9b4');
  const bodyTex = new THREE.CanvasTexture(bodyCv);
  if (THREE.SRGBColorSpace) bodyTex.colorSpace = THREE.SRGBColorSpace;
  bodyTex.anisotropy = 4;

  const clothCv = (hooks && hooks.clothCv) || document.createElement('canvas');
  clothCv.width = 256; clothCv.height = 192;
  const clothCtx = clothCv.getContext('2d');
  weaveFill(clothCtx, clothCv.width, clothCv.height, '#e6d7b2');
  const clothTex = new THREE.CanvasTexture(clothCv);
  if (THREE.SRGBColorSpace) clothTex.colorSpace = THREE.SRGBColorSpace;
  clothTex.wrapS = THREE.RepeatWrapping;
  clothTex.wrapT = THREE.ClampToEdgeWrapping;
  clothTex.anisotropy = 4;

  const bodyMat = new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.82, metalness: 0.02 });
  const bodyDark = new THREE.MeshStandardMaterial({ map: bodyTex, color: 0xd8c39a, roughness: 0.86, metalness: 0.02 });
  const jointMat = new THREE.MeshStandardMaterial({ map: bodyTex, color: 0xc9b28a, roughness: 0.9 });
  const clothMat = new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, transparent: true });

  /* ── FACE & HAIR layer: three transparent sheets mapped on a shell sphere
     that hovers just outside the head — eyes, face, hair each get their own
     canvas, texture and UV zone of the shell ── */
  function makeFaceMap() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const tex = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return { cv: cv, ctx: ctx, tex: tex };
  }
  const faceMaps = { eyes: makeFaceMap(), face: makeFaceMap(), hair: makeFaceMap() };

  /* ── CLOTHES layer: one transparent hull canvas, sliced into vertical strips —
     each limb's tube maps to its own strip. Invisible until it carries ink. ── */
  const HULL_KEYS = ['armLU', 'armRU', 'armLL', 'armRL', 'legLU', 'legRU', 'legLL', 'legRL'];
  const HULL_RECTS = {};
  HULL_KEYS.forEach(function (k, i) { HULL_RECTS[k] = [i / 8, 0, 1 / 8, 1]; });
  const hullCv = document.createElement('canvas');
  hullCv.width = 512; hullCv.height = 256;
  const hullCtx = hullCv.getContext('2d', { willReadFrequently: true });   // stays transparent
  const hullTex = new THREE.CanvasTexture(hullCv);
  if (THREE.SRGBColorSpace) hullTex.colorSpace = THREE.SRGBColorSpace;
  let hullInk = false;   // flipped the first time the hull is painted

  /* ── THOUGHTS layer: extruded glyph geometry per thought kind ── */
  const GLYPH_SHAPES = {
    fears: function (s) { const p = new THREE.Shape(); p.moveTo(0, s); p.lineTo(s, 0); p.lineTo(0, -s); p.lineTo(-s, 0); p.closePath(); return p; },   // diamond
    wishes: function (s) { const p = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? s * 0.45 : s; if (i === 0) p.moveTo(Math.cos(a) * r, Math.sin(a) * r); else p.lineTo(Math.cos(a) * r, Math.sin(a) * r); } p.closePath(); return p; },   // star
    likes: function (s) { const p = new THREE.Shape(); p.absarc(0, -s * 0.35, s * 0.62, Math.PI * 1.15, Math.PI * 1.85); p.absarc(-s * 0.5, s * 0.3, s * 0.4, 0, Math.PI * 2); p.absarc(s * 0.5, s * 0.3, s * 0.4, 0, Math.PI * 2); return p; },   // heart-ish
    dislikes: function (s) { const p = new THREE.Shape(); p.moveTo(-s, -s); p.lineTo(s, s); p.lineTo(-s, s); p.lineTo(s, -s); p.closePath(); return p; },   // crossed
    thoughts: function (s) { const p = new THREE.Shape(); p.absarc(0, 0, s * 0.8, 0, Math.PI * 2); const h = new THREE.Path(); h.absarc(s * 0.55, s * 0.55, s * 0.24, 0, Math.PI * 2); h.absarc(s * 0.95, s * 0.95, s * 0.13, 0, Math.PI * 2); p.holes.push(h); return p; }   // thought bubble
  };
  const THOUGHT_INK = { fears: '#b03a2a', wishes: '#c9962e', likes: '#7fb069', dislikes: '#8a6a9e', thoughts: '#79b8c9' };
  function drawGlyphShape(g, kind, x, y, s) {
    g.save();
    g.translate(x, y);
    g.strokeStyle = '#f4ecd8';
    g.fillStyle = 'rgba(244, 236, 216, 0.9)';
    g.lineWidth = Math.max(2, s * 0.16);
    if (kind === 'fears') { g.beginPath(); g.moveTo(0, -s); g.lineTo(s, 0); g.lineTo(0, s); g.lineTo(-s, 0); g.closePath(); g.stroke(); }
    else if (kind === 'wishes') { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? s * 0.45 : s; if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r); else g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.stroke(); }
    else if (kind === 'likes') { g.beginPath(); g.arc(0, s * 0.28, s * 0.55, Math.PI, 0); g.lineTo(s * 0.55, 0); g.lineTo(0, -s * 0.62); g.lineTo(-s * 0.55, 0); g.closePath(); g.stroke(); }
    else if (kind === 'dislikes') { g.beginPath(); g.moveTo(-s, -s); g.lineTo(s, s); g.moveTo(s, -s); g.lineTo(-s, s); g.stroke(); }
    else { g.beginPath(); g.arc(0, 0, s * 0.62, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(s * 0.7, -s * 0.7, s * 0.18, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(s * 1.05, -s * 1.05, s * 0.09, 0, Math.PI * 2); g.stroke(); }
    g.restore();
  }
  const body = new THREE.Group();
  scene.add(body);
  const D = { P: null, cur: null };
  let M = {}, garments = {}, ringSet = [];
  let overlaySet = [];        // face shell + hulls — scene children, rebuilt with the doll
  let glyphGroups = {};       // kind → { group, meshes } — the orbiting thought glyphs
  let glyphSpin = 0;
  let pts = [], sticks = [], anchors = [], poseTarget = null;
  let spikeP = null, spikeOff = 0;
  const home = { x: 0, z: 0 };   // walk offset for the home-screen doll
  const state = { posture: 1, returning: 0, pinTimer: 0, grabbed: -1, faceOn: false, hullOn: false, glyphLayer: null, groundOn: true };
  const dragPoint = V(0, 0, 0);
  const dragPlane = new THREE.Plane();
  let dragActive = false;
  let homeFeet = [null, null];
  const GRAV = -2.7;
  const rng = hooks && hooks.rng ? hooks.rng : Math.random;
  const tmpA = V(0, 0, 0), tmpB = V(0, 0, 0);
  const tmpHome = V(0, 0, 0);
  const qTmp = new THREE.Quaternion();
  const YAXIS = V(0, 1, 0);
  const qClothX90 = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2);

  function buildMeshes() {
    while (body.children.length) {
      const ch = body.children.pop();
      ch.geometry.dispose();
    }
    ringSet.forEach(function (m) { scene.remove(m); if (m.geometry) m.geometry.dispose(); });
    ringSet = [];
    overlaySet.forEach(function (o) {
      scene.remove(o.group || o);
      if (o.geometry) o.geometry.dispose();
    });
    overlaySet = [];
    glyphGroups = {};
    garments = {};
    M = {};
    const Dc = dims(D.P);
    D.cur = Dc;

    function seg(name, a, b, geo, mat, rect) {
      if (rect) mapRegion(geo, rect);
      const m = new THREE.Mesh(geo, mat);
      m.userData.pi = IDX[b];
      m.userData.a = a; m.userData.b = b;
      m.userData.baseLen = geo.parameters.height;
      m.userData.bodyPart = true;
      body.add(m);
      M[name] = m;
      return m;
    }
    const R = Dc.R, P = D.P;
    // torso lathes
    const pelvisH = Dc.torsoH * 0.56, chestH = Dc.torsoH * 0.5;
    const pelvisProf = [
      [0.001, 0], [0.60 * R * P.hips, 0.04], [Dc.hipsW * 0.98, 0.16], [0.54 * R * P.hips, 0.38],
      [Dc.waistK * R * 2 * 0.9, 0.82], [Dc.waistK * R * 2, 1.0]
    ].map(function (p) { return new THREE.Vector2(p[0], p[1] * pelvisH); });
    const chestProf = [
      [Dc.waistK * R * 2, 0], [Dc.waistK * R * 2 * 1.05, 0.1], [0.5 * R * P.chest, 0.3],
      [Dc.chestW, 0.55], [0.56 * R * P.chest, 0.82], [0.30 * R, 0.96], [0.24 * R, 1.0]
    ].map(function (p) { return new THREE.Vector2(p[0], p[1] * chestH); });
    M.pelvis = new THREE.Mesh(new THREE.LatheGeometry(pelvisProf, 40), bodyMat);
    mapRegion(M.pelvis.geometry, ATLAS.pelvis);
    M.pelvis.userData.pi = IDX.pelvis;
    M.pelvis.userData.lathe = { from: IDX.pelvis, to: IDX.waist };
    M.pelvis.userData.baseLen = pelvisH;
    M.pelvis.userData.bodyPart = true;
    body.add(M.pelvis);
    M.chest = new THREE.Mesh(new THREE.LatheGeometry(chestProf, 40), bodyMat);
    mapRegion(M.chest.geometry, ATLAS.chest);
    M.chest.userData.pi = IDX.chest;
    M.chest.userData.lathe = { from: IDX.waist, to: IDX.neck };
    M.chest.userData.baseLen = chestH;
    M.chest.userData.bodyPart = true;
    body.add(M.chest);
    M.waistBall = new THREE.Mesh(new THREE.SphereGeometry(Dc.waistK * R * 2 * 0.72, 20, 16), bodyMat);
    mapRegion(M.waistBall.geometry, ATLAS.waistBall);
    M.waistBall.userData.pi = IDX.waist;
    M.waistBall.userData.bodyPart = true;
    body.add(M.waistBall);
    M.neck = new THREE.Mesh(spanGeo(Dc.neckLen + 0.02, R * 0.26, R * 0.3), bodyDark);
    mapRegion(M.neck.geometry, ATLAS.waistBall);
    M.neck.userData.pi = IDX.neck;
    M.neck.userData.a = 'neck'; M.neck.userData.b = 'head';
    M.neck.userData.fixedLen = Dc.neckLen + 0.02;
    M.neck.userData.baseLen = Dc.neckLen + 0.02;
    M.neck.userData.bodyPart = true;
    body.add(M.neck);
    M.head = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 30), bodyMat);
    mapRegion(M.head.geometry, ATLAS.head);
    M.head.userData.pi = IDX.head;
    M.head.userData.bodyPart = true;
    body.add(M.head);

    // limbs — tubes span root→far joint; every chain is complete
    seg('armLU', IDX.shL, IDX.elL, spanGeo(Dc.upLen, Dc.armW * 1.15, Dc.armW * 0.9), bodyMat, ATLAS.armLU);
    seg('armRU', IDX.shR, IDX.elR, spanGeo(Dc.upLen, Dc.armW * 1.15, Dc.armW * 0.9), bodyMat, ATLAS.armRU);
    seg('armLL', IDX.elL, IDX.haL, spanGeo(Dc.foreLen, Dc.armW * 0.85, Dc.armW * 0.75), bodyDark, ATLAS.armLL);
    seg('armRL', IDX.elR, IDX.haR, spanGeo(Dc.foreLen, Dc.armW * 0.85, Dc.armW * 0.75), bodyDark, ATLAS.armRL);
    seg('legLU', IDX.hpL, IDX.knL, spanGeo(Dc.thighLen, Dc.legW * 1.18, Dc.legW * 0.85), bodyMat, ATLAS.legLU);
    seg('legRU', IDX.hpR, IDX.knR, spanGeo(Dc.thighLen, Dc.legW * 1.18, Dc.legW * 0.85), bodyMat, ATLAS.legRU);
    seg('legLL', IDX.knL, IDX.akL, spanGeo(Dc.shinLen, Dc.legW * 0.8, Dc.legW * 0.65), bodyDark, ATLAS.legLL);
    seg('legRL', IDX.knR, IDX.akR, spanGeo(Dc.shinLen, Dc.legW * 0.8, Dc.legW * 0.65), bodyDark, ATLAS.legRL);
    ['haL', 'haR'].forEach(function (k) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(Dc.handR, 16, 12), bodyMat);
      mapRegion(m.geometry, ATLAS[k]);
      m.scale.set(1, 1.15, 0.9);
      m.userData.pi = IDX[k];
      m.userData.bodyPart = true;
      body.add(m); M['hand_' + k] = m;
    });
    ['akL', 'akR'].forEach(function (k) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), bodyMat);
      mapRegion(m.geometry, ATLAS[k === 'akL' ? 'ftL' : 'ftR']);
      m.userData.pi = IDX[k];
      m.userData.foot = true;
      m.userData.bodyPart = true;
      body.add(m); M['foot_' + k] = m;
    });
    [['shL', IDX.shL, 0.11, 'shLb'], ['shR', IDX.shR, 0.11, 'shRb'], ['elL', IDX.elL, 0.062, 'elLb'], ['elR', IDX.elR, 0.062, 'elRb'],
     ['hpL', IDX.hpL, 0.09, 'hpLb'], ['hpR', IDX.hpR, 0.09, 'hpRb'], ['knL', IDX.knL, 0.068, 'knLb'], ['knR', IDX.knR, 0.068, 'knRb']].forEach(function (j) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(Dc.headD * j[2], 14, 12), jointMat);
      mapRegion(m.geometry, ATLAS[j[3]]);
      m.userData.pi = j[1];
      m.userData.bodyPart = true;
      body.add(m); M['j_' + j[0]] = m;
    });

    buildGarments(Dc);
    buildRings(Dc);
    buildFaceShell(Dc);
    buildHulls(Dc);
    Object.keys(GLYPH_SHAPES).forEach(function (kind) { buildGlyphs(kind, Dc); });
  }

  /* ── the face shell: a sphere hovering just outside the head, three zones.
     Three nested partial spheres — hair (crown), eyes (band), face (bowl) —
     each maps its full UV square to its own rect of the face canvas, so a
     raycast hit tells you exactly which zone you're painting. ── */
  const FACE_RECTS = {
    hair: [0.02, 0.05, 0.96, 0.28],
    eyes: [0.02, 0.38, 0.96, 0.24],
    face: [0.02, 0.67, 0.96, 0.31]
  };
  const FACE_BANDS = [
    ['hair', 0.0, 0.395],
    ['eyes', 0.405, 0.19],
    ['face', 0.605, 0.395]
  ];   // hairline gaps — coincident seams z-fight, shared radii sort-flicker
  function buildFaceShell(Dc) {
    const order = { hair: 4, eyes: 5, face: 6 };
    FACE_BANDS.forEach(function (fb) {
      const g = new THREE.SphereGeometry(Dc.R * 1.28, 36, 20, 0, Math.PI * 2, fb[1] * Math.PI, fb[2] * Math.PI);
      mapRegion(g, FACE_RECTS[fb[0]]);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: faceMaps[fb[0]].tex, transparent: true, roughness: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      m.userData.pi = IDX.head;
      m.userData.bodyPart = true;
      m.userData.faceZone = fb[0];
      m.renderOrder = order[fb[0]];   // stable draw order kills the shell flicker
      m.visible = state.faceOn;
      scene.add(m);
      overlaySet.push(m);
      M['face_' + fb[0]] = m;
    });
  }

  /* ── the clothes hulls: transparent tubes around each limb, own strips ── */
  function buildHulls(Dc) {
    const hullMat = new THREE.MeshStandardMaterial({
      map: hullTex, transparent: true, opacity: hullInk ? 0.85 : 0.14,
      roughness: 0.9, side: THREE.DoubleSide, depthWrite: false
    });
    const parts = [
      ['armLU', Dc.upLen, Dc.armW * 1.15, Dc.armW * 0.9], ['armRU', Dc.upLen, Dc.armW * 1.15, Dc.armW * 0.9],
      ['armLL', Dc.foreLen, Dc.armW * 0.85, Dc.armW * 0.75], ['armRL', Dc.foreLen, Dc.armW * 0.85, Dc.armW * 0.75],
      ['legLU', Dc.thighLen, Dc.legW * 1.18, Dc.legW * 0.85], ['legRU', Dc.thighLen, Dc.legW * 1.18, Dc.legW * 0.85],
      ['legLL', Dc.shinLen, Dc.legW * 0.8, Dc.legW * 0.65], ['legRL', Dc.shinLen, Dc.legW * 0.8, Dc.legW * 0.65]
    ];
    parts.forEach(function (pp) {
      const key = pp[0];
      const seg = M[key];
      const g = spanGeo(pp[1] * 1.08, pp[2] * 1.34, pp[3] * 1.26);
      mapRegion(g, HULL_RECTS[key]);   // this tube shows only its own strip of the hull canvas
      const m = new THREE.Mesh(g, hullMat);
      m.userData.pi = seg.userData.pi;
      m.userData.hull = key;
      m.renderOrder = 7;   // above the face shells (4–6), one stable layer
      m.visible = state.hullOn;
      seg.add(m);   // rides the limb's transform
      overlaySet.push(m);
      M['hull_' + key] = m;
    });
  }

  /* ── the thought glyphs: small extruded signs orbiting the poppet ── */
  function buildGlyphs(kind, Dc) {
    const old = glyphGroups[kind];
    if (old) {
      scene.remove(old.group);
      old.meshes.forEach(function (m) { m.geometry.dispose(); });
      if (old.mat) old.mat.dispose();
    }
    const group = new THREE.Group();
    scene.add(group);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(THOUGHT_INK[kind]), emissive: new THREE.Color(THOUGHT_INK[kind]),
      emissiveIntensity: 0.75, roughness: 0.35, transparent: true, opacity: 0.92
    });
    const meshes = [];
    for (let i = 0; i < 7; i++) {
      const geo = new THREE.ExtrudeGeometry(GLYPH_SHAPES[kind](0.055), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
      const m = new THREE.Mesh(geo, mat);
      m.userData.thought = kind;
      m.userData.glyph = true;
      m.userData.pi = -1;
      m.visible = state.glyphLayer === kind;
      group.add(m);
      meshes.push(m);
    }
    glyphGroups[kind] = { group: group, meshes: meshes, mat: mat };
  }

  /* per-frame: orbit + bob the glyphs; the face shell and hull ride their parts */
  function syncOverlays() {
    glyphSpin += 0.0035;
    const cx = spikeP ? spikeP.x : home.x, cz = spikeP ? spikeP.z : home.z;
    const kinds = Object.keys(glyphGroups);
    for (let ki = 0; ki < kinds.length; ki++) {
      const G = glyphGroups[kinds[ki]];
      const radius = 0.5 + ki * 0.1;
      for (let i = 0; i < G.meshes.length; i++) {
        const a = glyphSpin * (ki % 2 ? -1 : 1) + (i / G.meshes.length) * Math.PI * 2;
        const m = G.meshes[i];
        m.position.set(
          cx + Math.cos(a) * radius,
          0.6 + ((i * 7 + ki * 3) % 9) * 0.13 + Math.sin(glyphSpin * 9 + i) * 0.02,
          cz + Math.sin(a) * radius
        );
        m.rotation.y = -a + Math.PI / 2;
      }
    }
  }
  function setGlyphLayer(kind) {
    state.glyphLayer = kind || null;
    Object.keys(glyphGroups).forEach(function (k) {
      glyphGroups[k].group.visible = state.glyphLayer === k;
    });
  }
  function hullPainted() {
    if (hullInk) return true;
    const d = hullCtx.getImageData(0, 0, hullCv.width, hullCv.height).data;
    for (let i = 3; i < d.length; i += 64) {
      if (d[i] > 40) { hullInk = true; break; }
    }
    return hullInk;
  }
  function markHullPainted() { hullInk = true; if (M.hull_armLU) M.hull_armLU.material.opacity = 0.85; }

  function buildRings(Dc) {
    M.rings = {};
    function ring(name, radius, tube, color, opacity) {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube || 0.006, 8, 60),
        new THREE.MeshBasicMaterial({ color: color || 0xc03a2b, transparent: true, opacity: opacity || 0.6 })
      );
      m.rotation.x = Math.PI / 2;
      scene.add(m);
      M.rings[name] = m;
      ringSet.push(m);
      return m;
    }
    ring('head', Dc.R * 1.03, 0.008);
    ring('shoulder', Dc.shX * 1.12);
    ring('waist', Dc.waistK * Dc.R * 2 + 0.075);
    ring('hip', Dc.hipsW + 0.02);
    ring('wisp3', 0.55, 0.004, 0xc9a13c, 0.22);
    ring('wisp4', 0.85, 0.004, 0xc9a13c, 0.22);
    if (D.P.showRig) {
      const axis = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, TOTAL * 1.04, 6),
        new THREE.MeshBasicMaterial({ color: 0xc03a2b, transparent: true, opacity: 0.35 })
      );
      axis.position.y = TOTAL * 0.52;
      scene.add(axis);
      M.rings.axis = axis;
      ringSet.push(axis);
      const ground = ring('ground', 0.85, 0.006, 0xc03a2b, 0.45);
      ground.position.y = 0.006;
    }
  }

  function clothPiece(name, from, to, baseLen, geo) {
    const m = new THREE.Mesh(geo, clothMat);
    m.userData.pi = IDX[to];
    m.userData.cloth = { from: from, to: to };
    m.userData.baseLen = baseLen;
    m.userData.garment = true;
    body.add(m);
    return m;
  }
  function clothRing(name, at, rx, tube) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(rx, tube, 12, 30), clothMat);
    m.userData.pi = IDX[at];
    m.userData.clothRing = { at: at };
    m.userData.garment = true;
    m.rotation.x = Math.PI / 2;
    body.add(m);
    return m;
  }

  function buildGarments(Dc) {
    const I = IDX, R = Dc.R, P = D.P;
    const spineRest = Dc.torsoH * 1.02;
    const collar = spineRest;
    garments.dress = { pieces: [], rings: [] };
    {
      const hemY = Dc.torsoH * 0.05;
      const prof = [
        [Dc.hipsW * 1.02, hemY], [Dc.hipsW * 0.98, hemY + Dc.torsoH * 0.12],
        [Dc.waistK * R * 2 * 1.02, Dc.torsoH * 0.52], [Dc.waistK * R * 2 * 1.04, Dc.torsoH * 0.55],
        [Dc.chestW * 0.98, Dc.torsoH * 0.85], [0.56 * R * P.chest, Dc.torsoH * 0.98], [0.30 * R, collar]
      ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      garments.dress.pieces.push(clothPiece('dressBody', I.pelvis, I.neck, spineRest, new THREE.LatheGeometry(prof, 44)));
      garments.dress.rings.push({ mesh: clothRing('dressCollar', I.neck, 0.34 * R, R * 0.07) });
    }
    garments.robe = { pieces: [], rings: [] };
    {
      const hemY = -(Dc.legLen * 0.82);
      const prof = [
        [Dc.hipsW * 1.28, hemY], [Dc.hipsW * 1.16, hemY + Dc.torsoH * 0.3],
        [Dc.waistK * R * 2 * 1.02, Dc.torsoH * 0.52], [Dc.chestW, Dc.torsoH * 0.85],
        [0.58 * R * P.chest, Dc.torsoH * 0.98], [0.34 * R, collar]
      ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      garments.robe.pieces.push(clothPiece('robeBody', I.pelvis, I.neck, spineRest - hemY, new THREE.LatheGeometry(prof, 44)));
      garments.robe.rings.push({ mesh: clothRing('robeCollar', I.neck, 0.38 * R, R * 0.08) });
    }
    garments.top = { pieces: [], rings: [] };
    {
      const hemY = Dc.torsoH * 0.42;
      const prof = [
        [Dc.waistK * R * 2 * 1.08, hemY], [Dc.chestW, Dc.torsoH * 0.85],
        [0.56 * R * P.chest, Dc.torsoH * 0.98], [0.30 * R, collar]
      ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      garments.top.pieces.push(clothPiece('topBody', I.pelvis, I.neck, spineRest - hemY, new THREE.LatheGeometry(prof, 44)));
    }
    garments.hoodie = { pieces: [], rings: [], hood: null };
    {
      const hemY = -(Dc.torsoH * 0.14);
      const prof = [
        [Dc.hipsW * 0.98, hemY], [Dc.waistK * R * 2 * 1.06, Dc.torsoH * 0.52],
        [Dc.chestW * 1.04, Dc.torsoH * 0.85], [0.6 * R * P.chest, Dc.torsoH * 0.98], [0.26 * R, collar]
      ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      garments.hoodie.pieces.push(clothPiece('hoodBody', I.pelvis, I.neck, spineRest - hemY, new THREE.LatheGeometry(prof, 44)));
      const hood = new THREE.Mesh(new THREE.TorusGeometry(R * 0.95, R * 0.3, 14, 26, Math.PI * 1.15), clothMat);
      hood.rotation.z = Math.PI - Math.PI * 0.075;
      hood.userData.pi = I.neck;
      hood.userData.hood = true;
      hood.userData.garment = true;
      body.add(hood);
      garments.hoodie.hood = hood;
    }
    garments.pants = { pieces: [], rings: [] };
    [I.hpL, I.hpR].forEach(function (hp, li) {
      const kn = li === 0 ? I.knL : I.knR;
      const ak = li === 0 ? I.akL : I.akR;
      garments.pants.pieces.push(clothPiece('pantU' + li, hp, kn, Dc.thighLen, spanGeo(Dc.thighLen, Dc.legW * 1.9, Dc.legW * 1.7)));
      garments.pants.pieces.push(clothPiece('pantL' + li, kn, ak, Dc.shinLen, spanGeo(Dc.shinLen, Dc.legW * 1.65, Dc.legW * 1.5)));
    });
    garments.pants.rings.push({ mesh: clothRing('pantBand', I.pelvis, Dc.hipsW * 0.92, R * 0.09) });
    garments.bralet = { pieces: [], rings: [], straps: [] };
    garments.bralet.rings.push({ mesh: clothRing('braBand', I.chest, Dc.shX * 0.96, R * 0.095) });
    [I.shL, I.shR].forEach(function (sh) {
      const strap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.035, R * 0.035, 1, 8), clothMat);
      strap.userData.pi = sh;
      strap.userData.strap = { from: I.chest, to: sh };
      strap.userData.garment = true;
      body.add(strap);
      garments.bralet.straps.push(strap);
    });
    // doll starts bare — nothing worn until the player says so
    applyWorn();
  }

  function applyWorn() {
    Object.keys(garments).forEach(function (g) {
      const vis = !!D.P.worn[g];
      const G = garments[g];
      G.pieces.forEach(function (m) { m.visible = vis; });
      (G.rings || []).forEach(function (r) { r.mesh.visible = vis; });
      if (G.hood) G.hood.visible = vis;
      (G.straps || []).forEach(function (s) { s.visible = vis; });
    });
  }
  /* layer II desk view: every garment shown as a ghost so the cloth can be painted */
  function setGhostGarments(on) {
    clothMat.opacity = on ? 0.94 : 1;
    Object.keys(garments).forEach(function (g) {
      const G = garments[g];
      const vis = on ? true : !!D.P.worn[g];
      G.pieces.forEach(function (m) { m.visible = vis; });
      (G.rings || []).forEach(function (r) { r.mesh.visible = vis; });
      if (G.hood) G.hood.visible = vis;
      (G.straps || []).forEach(function (s) { s.visible = vis; });
    });
  }

  function dropPose(name) {
    const target = fkPose(name, D.P);
    if (spikeP) {
      // slide the whole pose onto the needle — x/z to the spike, y so the
      // pelvis sits on the tip; posture targets agree with the kinematic anchors
      const dy = spikeP.y - target[IDX.pelvis].y;
      target.forEach(function (p) { p.x += spikeP.x; p.y += dy; p.z += spikeP.z; });
    }
    // the home (walk) offset is applied live in substep, not baked here
    poseTarget = target.map(function (p) { return p.clone(); });
    pts = target.map(function (p) {
      return { p: p.clone(), prev: p.clone(), r: 0.06, pinned: false };
    });
    const Dc = dims(D.P);
    pts[IDX.head].r = Dc.R * 0.9;
    [IDX.shL, IDX.shR].forEach(function (i) { pts[i].r = Dc.headD * 0.1; });
    [IDX.haL, IDX.haR].forEach(function (i) { pts[i].r = Dc.headD * 0.1; });
    [IDX.knL, IDX.knR].forEach(function (i) { pts[i].r = Dc.headD * 0.08; });
    [IDX.akL, IDX.akR].forEach(function (i) { pts[i].r = Dc.headD * 0.08; });
    const bs = buildSticks(target, spikeP);
    sticks = bs.sticks;
    anchors = bs.anchors;
    homeFeet = [target[IDX.akL].clone(), target[IDX.akR].clone()];
    state.pinTimer = 1.4;
    state.grabbed = -1;
  }

  function setSpike(on, topY) {
    spikeP = on ? V(0, topY, 0) : null;
    if (pts.length) dropPose(D.P.pose);
  }

  function substep(dt) {
    const P = D.P, flop = P.flop;
    const damp = 0.9955 - flop * 0.012;
    const supportScale = 0.12 + 0.95 * state.posture - flop * 0.15 * state.posture;
    for (let i = 0; i < N; i++) {
      const pt = pts[i];
      if (pt.pinned || i === state.grabbed) continue;
      const vx = (pt.p.x - pt.prev.x) * damp;
      const vy = (pt.p.y - pt.prev.y) * damp;
      const vz = (pt.p.z - pt.prev.z) * damp;
      pt.prev.copy(pt.p);
      pt.p.x += vx;
      pt.p.y += vy + GRAV * dt * dt;
      pt.p.z += vz;
    }
    if (dragActive && state.grabbed >= 0) {
      const pt = pts[state.grabbed];
      pt.prev.copy(pt.p);
      pt.p.lerp(dragPoint, 0.55);
    }
    if (spikeP) {
      // grab-lift reads wrong on the needle: pelvis/waist ride the tip via anchors
    } else {
      const homeK = (1 - flop) * 0.16;
      if (homeK > 0.005) {
        [0, 1].forEach(function (f) {
          const i = f === 0 ? IDX.akL : IDX.akR;
          if (i === state.grabbed || !homeFeet[f]) return;
          tmpHome.copy(homeFeet[f]);
          if (home.x || home.z) { tmpHome.x += home.x; tmpHome.z += home.z; }
          pts[i].p.lerp(tmpHome, homeK);
        });
      }
    }
    if (state.grabbed < 0 && poseTarget) {
      const k = (spikeP ? 0.016 : 0.022) + (state.returning > 0 ? 0.05 * state.posture : 0);
      for (let i = 0; i < N; i++) {
        if (i === IDX.pelvis || i === IDX.waist) continue;
        tmpHome.copy(poseTarget[i]);
        if (!spikeP && (home.x || home.z)) { tmpHome.x += home.x; tmpHome.z += home.z; }
        pts[i].p.lerp(tmpHome, k);
      }
    }
    const iter = 10;
    for (let k = 0; k < iter; k++) {
      for (let s = 0; s < sticks.length; s++) {
        const st = sticks[s];
        if (st.balance) {
          // ankle stance eases back to the home spread — weight on the needle
          const L = pts[IDX.akL], Rr = pts[IDX.akR];
          L.p.x += (st.balance.xL - L.p.x) * 0.04;
          Rr.p.x += (st.balance.xR - Rr.p.x) * 0.04;
          continue;
        }
        const a = pts[st.a], b = pts[st.b];
        let dx = b.p.x - a.p.x, dy = b.p.y - a.p.y, dz = b.p.z - a.p.z;
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        let k2 = st.soft ? st.k * supportScale : st.k;
        let diff = (dist - st.rest) / dist * 0.5 * k2;
        const freeA = !(a.pinned || st.a === state.grabbed);
        const freeB = !(b.pinned || st.b === state.grabbed);
        const wA = freeA ? (freeB ? 1 : 0) : 0;
        const wB = freeB ? (freeA ? 1 : 0) : 0;
        const tot = wA + wB || 1;
        a.p.x += dx * diff * 2 * (wA / tot);
        a.p.y += dy * diff * 2 * (wA / tot);
        a.p.z += dz * diff * 2 * (wA / tot);
        b.p.x -= dx * diff * 2 * (wB / tot);
        b.p.y -= dy * diff * 2 * (wB / tot);
        b.p.z -= dz * diff * 2 * (wB / tot);
      }
      for (let i = 0; i < N; i++) {
        const pt = pts[i];
        if (pt.pinned || i === state.grabbed) continue;
        if (pt.p.y < pt.r) {
          pt.p.y = pt.r;
          pt.prev.x += (pt.p.x - pt.prev.x) * 0.55;
          pt.prev.z += (pt.p.z - pt.prev.z) * 0.55;
        }
      }
    }
    anchors.forEach(function (a) {
      if (a.i === state.grabbed) return;
      let target;
      if (a.parent === -1) target = spikeP;
      else if (a.parent === -2) target = tmpB.copy(spikeP).add(a.off);
      else target = tmpB.copy(pts[a.parent].p).add(a.off);
      tmpA.copy(target).sub(pts[a.i].p);
      pts[a.i].p.add(tmpA);
      pts[a.i].prev.add(tmpA);
    });
  }

  function segXform(m, ai, bi, maxStretch) {
    const a = pts[ai].p, b = pts[bi].p;
    tmpA.subVectors(b, a);
    const len = tmpA.length() || 1e-6;
    tmpA.divideScalar(len);
    qTmp.setFromUnitVectors(YAXIS, tmpA);
    m.position.copy(a);
    m.quaternion.copy(qTmp);
    const sy = Math.min(maxStretch || 1.18, len / m.userData.baseLen);
    const sxz = Math.max(0.8, Math.min(1.22, 1 / Math.sqrt(Math.max(0.55, sy))));
    m.scale.set(sxz, sy, sxz);
  }
  function neckXform() {
    const a = pts[IDX.neck].p, b = pts[IDX.head].p;
    tmpA.subVectors(b, a);
    const len = tmpA.length() || 1e-6;
    tmpA.divideScalar(len);
    qTmp.setFromUnitVectors(YAXIS, tmpA);
    M.neck.position.copy(a);
    M.neck.quaternion.copy(qTmp);
    M.neck.scale.set(1, 1, 1);
  }

  function syncMeshes() {
    if (!pts.length) return;
    const I = IDX;
    ['armLU', 'armRU', 'armLL', 'armRL', 'legLU', 'legRU', 'legLL', 'legRL'].forEach(function (k) {
      segXform(M[k], M[k].userData.a, M[k].userData.b, 1.18);
    });
    M.head.position.copy(pts[I.head].p);
    neckXform();
    const pc = M.pelvis.userData.lathe, cc = M.chest.userData.lathe;
    segXform(M.pelvis, pc.from, pc.to, 1.14);
    segXform(M.chest, cc.from, cc.to, 1.14);
    M.waistBall.position.copy(pts[I.waist].p);
    ['haL', 'haR'].forEach(function (k) { M['hand_' + k].position.copy(pts[IDX[k]].p); });
    ['akL', 'akR'].forEach(function (k) {
      const m = M['foot_' + k];
      const ak = pts[IDX[k]].p;
      m.position.copy(ak);
      m.position.y -= D.cur.headD * 0.02;
      m.position.z += D.cur.headD * 0.05;
      tmpA.subVectors(pts[IDX[k] === I.akL ? I.knL : I.knR].p, ak).normalize();
      qTmp.setFromUnitVectors(YAXIS, tmpA);
      m.quaternion.copy(qTmp);
      m.scale.set(D.cur.headD * 0.115, D.cur.headD * 0.075, D.cur.headD * 0.19);
    });
    ['shL', 'shR', 'elL', 'elR', 'hpL', 'hpR', 'knL', 'knR'].forEach(function (k) {
      M['j_' + k].position.copy(pts[IDX[k]].p);
    });
    // face shell rides a little outside the head, along the neck→head line
    if (M.face_hair) {
      tmpA.subVectors(pts[I.head].p, pts[I.neck].p).normalize();
      ['face_hair', 'face_eyes', 'face_face'].forEach(function (k) {
        if (!M[k]) return;
        M[k].position.copy(pts[I.head].p).addScaledVector(tmpA, D.cur.R * 0.3);
        M[k].quaternion.slerp(qTmp.setFromUnitVectors(YAXIS, tmpA), 0.25);
      });
    }
    syncOverlays();
    Object.keys(garments).forEach(function (g) {
      const G = garments[g];
      if (!D.P.worn[g]) return;
      G.pieces.forEach(function (m) {
        segXform(m, m.userData.cloth.from, m.userData.cloth.to, 1.14);
      });
      (G.rings || []).forEach(function (r) {
        const at = r.mesh.userData.clothRing.at;
        r.mesh.position.copy(pts[at].p);
        tmpA.subVectors(pts[at === I.pelvis ? I.waist : I.chest].p, pts[at === I.pelvis ? I.pelvis : I.waist].p).normalize();
        qTmp.setFromUnitVectors(YAXIS, tmpA);
        r.mesh.quaternion.copy(qTmp).multiply(qClothX90);
      });
      if (G.hood) {
        const np = pts[I.neck].p, hp = pts[I.head].p;
        G.hood.position.copy(np).lerp(hp, 0.42);
        G.hood.position.z -= D.cur.R * 0.34;
        tmpA.subVectors(hp, np).normalize();
        qTmp.setFromUnitVectors(YAXIS, tmpA);
        G.hood.quaternion.copy(qTmp).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI - Math.PI * 0.075));
      }
      (G.straps || []).forEach(function (s) {
        const su = s.userData.strap;
        segXform(s, su.from, su.to, 1.3);
        s.scale.x = s.scale.z = 1;
      });
    });
    const rg = M.rings;
    const cx = spikeP ? spikeP.x : 0, cz = spikeP ? spikeP.z : 0;
    if (rg.head) {
      rg.head.position.copy(pts[I.head].p);
      rg.shoulder.position.copy(pts[I.chest].p);
      rg.waist.position.copy(pts[I.waist].p);
      rg.hip.position.copy(pts[I.pelvis].p);
      if (rg.ground) { rg.ground.visible = state.groundOn !== false && !spikeP; rg.ground.position.set(cx, 0.006, cz); }
      if (rg.axis) rg.axis.visible = !!D.P.showRig && !spikeP;
    }
    rg.wisp3.position.set(cx, 0, cz);
    rg.wisp4.position.set(cx, 0, cz);
  }

  const kB = V(0, 0, 0), kQ = new THREE.Quaternion(), kE = new THREE.Euler(0, 0, 0);
  function kinFrame(dt) {
    if (!pts.length || !poseTarget) return;
    // the group may be scaled (the home room keeps a smaller poppet) — points
    // live in group-local space, so the world `home` offset divides by that scale
    const gs = body.scale.x || 1;
    const homeX = (home.x || 0) / gs, homeZ = (home.z || 0) / gs, yaw = state.yaw || 0;
    const Dc = dims(D.P);
    const gait = state.gait || 0;
    state.breathT += dt;
    const t = state.breathT;
    // pose config for this frame: idle sway + breath on the base pose
    const base = POSES[(D.P && D.P.pose) || 'stand'] || POSES.stand;
    const cfg = {
      armL: { az: (base.armL.az || 0.42) + Math.sin(t * 1.4) * 0.05 + Math.sin(t * 2.8) * 0.02,
        ax: (base.armL.ax || 0.06) + Math.sin(t * 1.1 + 1) * 0.04, el: base.armL.el || 0.18, ey: base.armL.ey || 0 },
      armR: { az: (base.armR.az || 0.42) + Math.sin(t * 1.4 + 0.9) * 0.05 + Math.sin(t * 2.8 + 1.3) * 0.02,
        ax: (base.armR.ax || 0.06) + Math.sin(t * 1.1) * 0.04, el: base.armR.el || 0.18, ey: base.armR.ey || 0 },
      legL: { hx: base.legL ? (base.legL.hx || 0.03) : 0.03 },
      legR: { hx: base.legR ? (base.legR.hx || 0.03) : 0.03 },
      lean: (base.lean || 0) + Math.sin(t * 0.7) * 0.022,
      tilt: (base.tilt || 0) + Math.sin(t * 0.53 + 2) * 0.03
    };
    if (gait > 0.01) {
      // stride cycle: legs scissor, arms counter-swing, the body bobs and lists
      const c = t * 5.2;
      const sw = Math.sin(c), sw2 = Math.sin(c + Math.PI);
      cfg.legL.hx += sw * 0.5 * gait;
      cfg.legR.hx += sw2 * 0.5 * gait;
      cfg.armL.ax += sw2 * 0.5 * gait;
      cfg.armR.ax += sw * 0.5 * gait;
      cfg.lean += 0.05 * gait;
      cfg.tilt += sw * 0.04 * gait;
    }
    const target = fkConfig(cfg, D.P);
    const Dk = dims(D.P);
    const bob = (gait > 0.01 ? Math.abs(Math.cos(t * 5.2)) * 0.05 * gait : Math.sin(t * 1.6) * 0.012);
    const breath = Math.sin(t * 1.6) * 0.008;
    const baseY = Dk.hipY + bob + breath;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    for (let i = 0; i < N; i++) {
      kB.copy(target[i]);
      kB.y += (i === IDX.pelvis || i === IDX.waist || i === IDX.chest || i === IDX.neck || i === IDX.head) ? baseY - Dk.hipY : 0;
      const x = kB.x, z = kB.z;
      kB.x = homeX + x * cosY + z * sinY;
      kB.z = homeZ - x * sinY + z * cosY;
      pts[i].p.lerp(kB, 0.5);
      pts[i].prev.copy(pts[i].p);
    }
    // ── head spring: the one physical thing left ──
    // pulled home (k), damped, with a light droop weight so it rests with a nod
    const kSpring = 14, kDamp = 5.2;
    state.headV.x += -kSpring * state.headOff.x * dt;
    state.headV.y += (-kSpring * state.headOff.y + 1.6) * dt;
    state.headV.z += -kSpring * state.headOff.z * dt;
    state.headV.multiplyScalar(Math.exp(-kDamp * dt));
    state.headOff.addScaledVector(state.headV, dt);
    const lim = Dc.R * 0.55;
    if (state.headOff.length() > lim) { state.headOff.setLength(lim); state.headV.multiplyScalar(0.55); }
    if (state.headV.lengthSq() < 0.0016 && state.headOff.lengthSq() < 0.0004) {
      state.headV.multiplyScalar(0.6); state.headOff.multiplyScalar(0.82);   // settle clean
    }
    const hp = pts[IDX.head].p;
    hp.add(state.headOff);
    pts[IDX.head].prev.copy(hp);
    syncMeshes();
  }

  function physicsFrame(dt) {
    if (state.kinematic) { kinFrame(dt); return; }
    if (!pts.length) return;
    const want = state.grabbed >= 0 ? 0 : 1;
    state.posture += (want - state.posture) * Math.min(1, dt * 5);
    if (state.returning > 0) state.returning -= dt * 0.55;
    if (state.pinTimer > 0) {
      state.pinTimer -= dt;
      pts[IDX.akL].pinned = true;
      pts[IDX.akR].pinned = true;
      if (state.pinTimer <= 0 && state.grabbed < 0) {
        pts[IDX.akL].pinned = pts[IDX.akR].pinned = false;
      }
    }
    acc += dt;
    const step = 1 / 120;
    let n = 0;
    while (acc > step && n < 6) { substep(step); acc -= step; n++; }
    syncMeshes();
  }
  let acc = 0;

  /* kinematic home mode — see physicsFrame's branch below */
  state.kinematic = false;
  state.gait = 0;        // 0 stand .. 1 full stride
  state.yaw = 0;         // facing, radians (yaw spin is applied around home.x/z)
  state.breathT = Math.random() * 6;
  state.headV = V(0, 0, 0);
  state.headOff = V(0, 0, 0);

  /* painting */
  function stampAt(ctx, x, y, b) {
    ctx.fillStyle = b.ink;
    ctx.beginPath();
    ctx.arc(x, y, b.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  function uvStamp(hit) {
    if (!hit.uv) return false;
    const x = hit.uv.x * bodyCv.width;
    const y = (1 - hit.uv.y) * bodyCv.height;
    stampAt(bodyCtx, x, y, hooks.brush());
    bodyTex.needsUpdate = true;
    return true;
  }
  function uvStampCloth(hit, brush) {
    if (!hit.uv) return false;
    const x = hit.uv.x * clothCtx.canvas.width;
    const y = (1 - hit.uv.y) * clothCtx.canvas.height;
    stampAt(clothCtx, x, y, brush);
    clothTex.needsUpdate = true;
    return true;
  }
  function fillRegionWeave(region, hex) {
    const rect = ATLAS[region];
    if (!rect) return;
    const x = Math.floor(rect[0] * bodyCv.width), y = Math.floor(rect[1] * bodyCv.height);
    const w = Math.floor(rect[2] * bodyCv.width), h = Math.floor(rect[3] * bodyCv.height);
    if (w <= 0 || h <= 0) return;
    bodyCtx.save();
    bodyCtx.beginPath();
    bodyCtx.rect(x, y, w, h);
    bodyCtx.clip();
    bodyCtx.fillStyle = hex;
    bodyCtx.fillRect(x, y, w, h);
    bodyCtx.strokeStyle = 'rgba(120, 96, 60, 0.10)';
    bodyCtx.lineWidth = 1;
    for (let yy = y; yy < y + h; yy += 4) { bodyCtx.beginPath(); bodyCtx.moveTo(x, yy + 0.5); bodyCtx.lineTo(x + w, yy + 0.5); bodyCtx.stroke(); }
    for (let xx = x; xx < x + w; xx += 4) { bodyCtx.beginPath(); bodyCtx.moveTo(xx + 0.5, y); bodyCtx.lineTo(xx + 0.5, y + h); bodyCtx.stroke(); }
    bodyCtx.restore();
  }
  function floodFillRegion(region, hex) {
    fillRegionWeave(region, hex);
    bodyTex.needsUpdate = true;
  }
  function floodFill(hex) {
    Object.keys(M).forEach(function (k) {
      const m = M[k];
      if (k === 'rings' || !m.isMesh || !m.visible || m.userData.garment) return;
      const region = REGION_OF[k];
      if (region) fillRegionWeave(region, hex);
    });
    bodyTex.needsUpdate = true;
  }
  function floodSection(section, hex) {
    (SECTIONS[section] || []).forEach(function (region) {
      const rect = ATLAS[region];
      const x = Math.floor(rect[0] * bodyCv.width), y = Math.floor(rect[1] * bodyCv.height);
      const w = Math.floor(rect[2] * bodyCv.width), h = Math.floor(rect[3] * bodyCv.height);
      bodyCtx.save();
      bodyCtx.beginPath();
      bodyCtx.rect(x, y, w, h);
      bodyCtx.clip();
      bodyCtx.fillStyle = hex;
      bodyCtx.fillRect(x, y, w, h);
      bodyCtx.restore();
    });
    bodyTex.needsUpdate = true;
  }

  /* the burn: detach every visible piece (plus the construction rings) for flinging,
     clone materials so charring never repaints the shared atlas material */
  function killForBurn() {
    const pieces = [];
    overlaySet.forEach(function (o) { o.visible = false; if (o.group) o.group.visible = false; });   // shell, hulls, glyphs stand down
    body.children.slice().forEach(function (m) {
      if (!m.visible) { m.geometry.dispose(); return; }   // hidden garments die quietly
      m.material = Array.isArray(m.material) ? m.material.map(function (mt) { return mt.clone(); }) : m.material.clone();
      m.userData.flingV = V((Math.random() - 0.5) * 5, 2 + Math.random() * 3.5, (Math.random() - 0.5) * 5);
      m.userData.flingW = V((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
      m.userData.flingT = 1;
      scene.add(m);   // reparents out of the doll group
      pieces.push(m);
    });
    ringSet.forEach(function (m) {
      scene.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) m.material.dispose();
    });
    ringSet = [];
    M = {};
    garments = {};
    pts = [];
    poseTarget = null;
    return pieces;
  }

  return {
    body, M: function () { return M; }, ATLAS: ATLAS, SECTIONS: SECTIONS, REGION_OF: REGION_OF,
    P: D.P, dims: function () { return D.cur; },
    pts: function () { return pts; },
    state: state,
    dragPlane: dragPlane,
    setParams: function (p) { D.P = p; },
    rebuild: function (poseName) { buildMeshes(); dropPose(poseName || D.P.pose); },
    dropPose: dropPose,
    setSpike: setSpike,
    physicsFrame: physicsFrame,
    setKinematic: function (on) { state.kinematic = !!on; },
    setGait: function (g) { state.gait = Math.max(0, Math.min(1, g)); },
    setYaw: function (a) { state.yaw = a; },
    bumpHead: function (vx, vy, vz) {
      if (!pts.length) return;
      state.headV.x += vx; state.headV.y += vy; state.headV.z += vz;
    },
    dragPoint: dragPoint,
    setDrag: function (on) { dragActive = on; },
    setHome: function (x, z) { home.x = x; home.z = z; },
    home: function () { return home; },
    uvStamp: uvStamp,
    uvStampCloth: uvStampCloth,
    faceMaps: faceMaps,
    hullCanvas: hullCv,
    hullCtx: hullCtx,
    hullTex: hullTex,
    hullRects: HULL_RECTS,
    hullPainted: hullPainted,
    markHullPainted: markHullPainted,
    thoughtInk: THOUGHT_INK,
    setFaceShell: function (on) { state.faceOn = !!on; overlaySet.forEach(function (o) { if (o.userData && o.userData.faceZone) o.visible = state.faceOn; }); },
    setHulls: function (on) { state.hullOn = !!on; overlaySet.forEach(function (o) { if (o.userData && o.userData.hull) o.visible = state.hullOn; }); },
    setGlyphLayer: setGlyphLayer,
    glyphGroups: function () { return glyphGroups; },
    floodFill: floodFill,
    floodFillRegion: floodFillRegion,
    applyWorn: applyWorn,
    setGhostGarments: setGhostGarments,
    killForBurn: killForBurn,
    floodSection: floodSection,
    bodyCtx: bodyCtx, bodyTex: bodyTex, clothCtx: clothCtx, clothTex: clothTex, bodyCv: bodyCv,
    bodyMat: bodyMat, bodyDark: bodyDark, jointMat: jointMat, clothMat: clothMat,
    garments: function () { return garments; }
  };
}
