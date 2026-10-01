/* The desk is the interface — everything diagetic, everything labeled, everything BIG.
   Two columns of oversized buttons on the left: ACTIONS (CANVAS · DOLL DRAW ·
   KEEPSAKE) beside LAYERS (BODY · FACE & HAIR · CLOTHES · THOUGHTS — each tints
   the room its color while active). What remains on the table itself: the chunky
   brass SETTINGS gear (press it for proportions · brush · tools), the burn plate,
   the view locks, and the spec plaque. The KEEPSAKE button sits grayed until every
   layer carries ink — then it glows, and keeping it flies the poppet home. */
import * as THREE from '../vendor/three.module.js';

export function V(x, y, z) { return new THREE.Vector3(x, y, z); }

const LABEL_DPI = 5;   // px per world unit at 100 — crisp labels, cheap canvases

function labelTexture(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * LABEL_DPI);
  cv.height = Math.round(h * LABEL_DPI);
  const g = cv.getContext('2d');
  g.scale(LABEL_DPI, LABEL_DPI);
  draw(g, cv.width, cv.height);
  const tex = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function paperMat(tex) {
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 });
}
function labelMat(lines, opts) {
  const o = opts || {};
  const w = o.w || 100, h = o.h || 40;
  return paperMat(labelTexture(w, h, function (g) {
    g.fillStyle = o.bg || '#e8dcc0';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = o.frame || 'rgba(90, 66, 34, 0.8)';
    g.lineWidth = 1.4;
    g.strokeRect(1.2, 1.2, w - 2.4, h - 2.4);
    g.fillStyle = o.color || '#3a2c18';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const lh = (o.lineHeight || 11);
    let y = h / 2 - ((lines.length - 1) * lh) / 2 + 0.5;
    lines.forEach(function (ln, i) {
      g.font = (i === 0 ? '600 ' : '') + (o.sizes ? o.sizes[i] : (o.size || 10)) + 'px Germania, Georgia, serif';
      g.fillStyle = i === 0 ? (o.headColor || o.color || '#6a4a1a') : (o.color || '#3a2c18');
      g.fillText(ln, w / 2, y);
      y += lh;
    });
  }));
}
function tagit(mesh, tag, val) {
  mesh.userData[tag] = val;
  mesh.userData.pi = -1;
  return mesh;
}

export function buildDesk(scene, opts) {
  const O = opts || {};
  const desk = new THREE.Group();
  scene.add(desk);
  const handle = { desk, buttons: {}, panelButtons: {}, tools: {}, inks: [], basin: null, easels: {}, plaque: null, gear: null, trayPos: null, dial: null, dialPickables: null };
  /* the table is bare wood — the texture map lives inside CANVAS (the expand
     overlay). Painting happens on the poppet itself, and in the overlay. */

  /* ── the brass ── */
  const brass = new THREE.MeshStandardMaterial({ color: 0xa8862e, roughness: 0.38, metalness: 0.75 });
  handle.baseBrass = brass;

  /* ── the two big columns: ACTIONS (right) beside LAYERS (left) ──
     Four rows, paired: CANVAS|BODY · DOLL DRAW|FACE & HAIR · KEEPSAKE|CLOTHES · —|THOUGHTS */
  const ROWS_Z = [0.72, 0.24, -0.24, -0.72];
  const ACTIONS_X = -1.12, LAYERS_X = -1.86;

  /* small column headers */
  [['ACTIONS', ACTIONS_X], ['LAYERS', LAYERS_X]].forEach(function (hd) {
    const lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.055),
      labelMat([hd[0]], { w: 130, h: 12, size: 10, bg: 'rgba(0,0,0,0)', frame: 'rgba(0,0,0,0)', color: '#d9cba8' })
    );
    lbl.rotation.x = -Math.PI / 2;
    lbl.position.set(hd[1], 0.002, 1.04);
    desk.add(lbl);
  });

  /* ── the ACTIONS column: CANVAS · DOLL DRAW · KEEPSAKE — enlarged ── */
  const panelRow = new THREE.Group();
  panelRow.position.set(ACTIONS_X, 0, 0);
  desk.add(panelRow);
  [['canvas', 'CANVAS', 'walk the atlas, part by part', 0],
   ['doll', 'DOLL DRAW', 'paint right on the poppet', 1],
   ['keepsake', 'KEEPSAKE', 'save what is made', 2]].forEach(function (pb) {
    const z = ROWS_Z[pb[3]];
    const plate = tagit(new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.09, 0.4), brass), 'panelBtn', pb[0]);
    plate.position.set(0, 0.045, z);
    panelRow.add(plate);
    const face = tagit(new THREE.Mesh(
      new THREE.PlaneGeometry(0.68, 0.34),
      labelMat([pb[1], pb[2]], { w: 150, h: 74, sizes: [17, 9.5], lineHeight: 20, bg: '#b8933a', color: '#241708', headColor: '#241708' })
    ), 'panelBtn', pb[0]);
    face.rotation.x = -Math.PI / 2;
    face.position.set(0, 0.0911, z);
    panelRow.add(face);
    handle.panelButtons[pb[0]] = { plate: plate, face: face };
  });
  handle.panelPickables = Object.keys(handle.panelButtons).map(function (k) { return handle.panelButtons[k].plate; })
    .concat(Object.keys(handle.panelButtons).map(function (k) { return handle.panelButtons[k].face; }));
  // world rect of the CANVAS button — clicks inside it launch the walkthrough
  handle.canvasRect = { x: ACTIONS_X, z: ROWS_Z[0], w: 0.86, d: 0.52 };

  /* ── the KEEPSAKE gate: grayed until every layer carries ink ──
     Locked: dark iron plate, gray label. Ready: glowing brass, warm label. */
  const kc = handle.panelButtons.keepsake;
  const kcPlateMat = new THREE.MeshStandardMaterial({ color: 0x3c3630, roughness: 0.72, metalness: 0.25, emissive: 0xaa6a00, emissiveIntensity: 0 });
  kc.plate.material = kcPlateMat;
  const kcTexLocked = labelTexture(150, 74, function (g) {
    g.fillStyle = '#4a443c'; g.fillRect(0, 0, 150, 74);
    g.strokeStyle = 'rgba(20, 14, 8, 0.7)'; g.lineWidth = 1.4; g.strokeRect(1.2, 1.2, 147.6, 71.6);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 17px Germania, Georgia, serif'; g.fillStyle = '#8a8276';
    g.fillText('KEEPSAKE', 75, 27);
    g.font = '9.5px Germania, Georgia, serif'; g.fillStyle = '#6a6458';
    g.fillText('draw on every layer first', 75, 47);
  });
  const kcTexReady = labelTexture(150, 74, function (g) {
    g.fillStyle = '#b8933a'; g.fillRect(0, 0, 150, 74);
    g.strokeStyle = 'rgba(40, 24, 6, 0.8)'; g.lineWidth = 1.4; g.strokeRect(1.2, 1.2, 147.6, 71.6);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 17px Germania, Georgia, serif'; g.fillStyle = '#241708';
    g.fillText('KEEPSAKE', 75, 27);
    g.font = '9.5px Germania, Georgia, serif'; g.fillStyle = '#3a2c14';
    g.fillText('save what is made', 75, 47);
  });
  const kcTexWarn = labelTexture(150, 74, function (g) {
    g.fillStyle = '#5a2418'; g.fillRect(0, 0, 150, 74);
    g.strokeStyle = '#c03a2b'; g.lineWidth = 2; g.strokeRect(1.2, 1.2, 147.6, 71.6);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 15px Germania, Georgia, serif'; g.fillStyle = '#f0c0a0';
    g.fillText('DRAW ON EVERY', 75, 28);
    g.fillText('LAYER FIRST', 75, 48);
  });
  kc.face.material = paperMat(kcTexLocked);
  handle.keepsakeReady = false;
  let kcFlashT = null;
  handle.setKeepsakeReady = function (ready) {
    if (handle.keepsakeReady === ready) return;
    handle.keepsakeReady = ready;
    kcPlateMat.color.setHex(ready ? 0xd4af37 : 0x3c3630);
    kcPlateMat.roughness = ready ? 0.3 : 0.72;
    kcPlateMat.metalness = ready ? 0.8 : 0.25;
    kc.face.material.map = ready ? kcTexReady : kcTexLocked;
    kc.face.material.needsUpdate = true;
    clearTimeout(kcFlashT);
  };
  handle.flashKeepsakeLocked = function () {
    kc.face.material.map = kcTexWarn;
    kc.face.material.needsUpdate = true;
    clearTimeout(kcFlashT);
    kcFlashT = setTimeout(function () {
      kc.face.material.map = handle.keepsakeReady ? kcTexReady : kcTexLocked;
      kc.face.material.needsUpdate = true;
    }, 1700);
  };
  handle.updateKeepsake = function (t) {
    kcPlateMat.emissiveIntensity = handle.keepsakeReady ? (0.55 + Math.sin(t * 2.6) * 0.3) : 0;
  };

  /* ── the colored LAYERS column: BODY · FACE & HAIR · CLOTHES · THOUGHTS ──
     Each button is COLOR-CODED and tints the room while its layer is active. */
  const layers = [
    { key: 'body', lines: ['BODY'], sub: 'the skin of the poppet', col: '#8a5a3c' },
    { key: 'face', lines: ['FACE & HAIR'], sub: 'eyes · face · hair', col: '#d9a44a' },
    { key: 'clothes', lines: ['CLOTHES'], sub: 'over the limbs', col: '#6f88c8' },
    { key: 'thoughts', lines: ['THOUGHTS'], sub: 'fears · wishes · more', col: '#7fb069' }
  ];
  const layerRow = new THREE.Group();
  layerRow.position.set(LAYERS_X, 0, 0);
  desk.add(layerRow);
  layers.forEach(function (L2, i) {
    const z = ROWS_Z[i];
    const tint = new THREE.MeshStandardMaterial({ color: new THREE.Color(L2.col), roughness: 0.42, metalness: 0.45 });
    const plate = tagit(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.4), tint), 'layerBtn', L2.key);
    plate.position.set(0, 0.035, z);
    layerRow.add(plate);
    const face = tagit(new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.34),
      labelMat(L2.lines.concat([L2.sub]), { w: 122, h: 74, sizes: [14, 8.5], lineHeight: 17, bg: L2.col, color: '#f4ecd8', headColor: '#f8f2e2', frame: 'rgba(20, 12, 4, 0.5)' })
    ), 'layerBtn', L2.key);
    face.rotation.x = -Math.PI / 2;
    face.position.set(0, 0.0711, z);
    layerRow.add(face);
    handle.buttons[L2.key] = { plate: plate, face: face, color: L2.col };
  });
  handle.layerPickables = layers.map(function (L2) { return handle.buttons[L2.key].plate; })
    .concat(layers.map(function (L2) { return handle.buttons[L2.key].face; }));

  /* ── the SETTINGS gear: a chunky brass gear ticking over on the table.
     Press it — it spins and opens the slider menu (proportions · brush · tools). ── */
  const gear = new THREE.Group();
  gear.position.set(0.98, 0, -0.42);
  desk.add(gear);
  const gearIron = new THREE.MeshStandardMaterial({ color: 0x2c2018, roughness: 0.62, metalness: 0.55 });
  const gearBrass = new THREE.MeshStandardMaterial({ color: 0xa8862e, roughness: 0.36, metalness: 0.8 });
  const gearDark = new THREE.MeshStandardMaterial({ color: 0x6a5218, roughness: 0.5, metalness: 0.7 });
  const baseDisc = tagit(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.37, 0.06, 28), gearIron), 'gear', true);
  baseDisc.position.y = 0.03;
  gear.add(baseDisc);
  const wheel = tagit(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 24), gearBrass), 'gear', true);
  wheel.position.y = 0.095;
  gear.add(wheel);
  for (let ti = 0; ti < 10; ti++) {
    const ang = (ti / 10) * Math.PI * 2;
    const tooth = tagit(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.05, 0.055), gearBrass), 'gear', true);
    tooth.position.set(Math.cos(ang) * 0.29, 0.095, Math.sin(ang) * 0.29);
    tooth.rotation.y = -ang;
    gear.add(tooth);
  }
  const hub = tagit(new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.1, 12), gearDark), 'gear', true);
  hub.position.y = 0.13;
  gear.add(hub);
  const hubCap = tagit(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), gearBrass), 'gear', true);
  hubCap.position.y = 0.185;
  gear.add(hubCap);
  const gearLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.07),
    labelMat(['SETTINGS GEAR — PRESS'], { w: 170, h: 16, size: 10, bg: 'rgba(0,0,0,0)', frame: 'rgba(0,0,0,0)', color: '#d9cba8' })
  );
  gearLbl.rotation.x = -Math.PI / 2;
  gearLbl.position.set(0, 0.002, 0.5);
  gear.add(gearLbl);
  handle.gearPickables = [baseDisc, wheel, hub, hubCap].concat(gear.children.filter(function (m) { return m.userData.gear; }));
  let gearV = 0.24, gearBoost = 0;
  handle.gear = {
    group: gear,
    spin: function () { gearBoost = 9; },
    tick: function (dt) {
      gearBoost *= Math.pow(0.015, dt);
      gear.rotation.y += (0.24 + gearBoost) * dt;
    }
  };

  /* ── view locks: two slim brass plates — TABLE / POPPET ── */
  const viewRow = new THREE.Group();
  viewRow.position.set(0.35, 0, 1.06);
  desk.add(viewRow);
  handle.viewButtons = {};
  [['table', 'TABLE', 'the worktop'], ['poppet', 'POPPET', 'the specimen']].forEach(function (vb, i) {
    const plate = tagit(new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.045, 0.11), brass), 'viewBtn', vb[0]);
    plate.position.set(i === 0 ? -0.12 : 0.12, 0.025, 0);
    viewRow.add(plate);
    const face = tagit(new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.08),
      labelMat([vb[1], vb[2]], { w: 64, h: 28, sizes: [10, 7], lineHeight: 9, bg: '#b8933a', color: '#241708', headColor: '#241708' })
    ), 'viewBtn', vb[0]);
    face.rotation.x = -Math.PI / 2;
    face.position.set(i === 0 ? -0.12 : 0.12, 0.0481, 0);
    viewRow.add(face);
    handle.viewButtons[vb[0]] = { plate: plate, face: face };
  });
  const viewLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.055),
    labelMat(['VIEW — PRESS TO LOCK'], { w: 110, h: 14, size: 10, bg: 'rgba(0,0,0,0)', frame: 'rgba(0,0,0,0)', color: '#d9cba8' })
  );
  viewLbl.rotation.x = -Math.PI / 2;
  viewLbl.position.set(0, 0.002, -0.1);
  viewRow.add(viewLbl);
  handle.viewPickables = [handle.viewButtons.table.plate, handle.viewButtons.poppet.plate];

  /* ── the burn plate: dark iron, red-lettered, ENLARGED — the one prop that stays ── */
  const burnPlate = new THREE.Group();
  burnPlate.position.set(1.72, 0, 0.95);
  desk.add(burnPlate);
  const ironPad = tagit(new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.215, 0.045, 28),
    new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.6, metalness: 0.5 })
  ), 'burn', true);
  ironPad.position.y = 0.022;
  burnPlate.add(ironPad);
  const ironLbl = tagit(new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.12),
    labelMat(['BURN'], { w: 130, h: 50, size: 22, bg: '#1c1410', color: '#c03a2b', frame: '#7a351a' })
  ), 'burn', true);
  ironLbl.rotation.x = -Math.PI / 2;
  ironLbl.position.y = 0.0471;
  burnPlate.add(ironLbl);
  burnPlate.userData.burn = true;
  burnPlate.userData.pi = -1;
  handle.burnPlate = burnPlate;
  handle.burnPickables = [ironPad, ironLbl];

  /* the right side of the table stays clear — the cloth bolt and the thought
     sheets live on the CANVAS overlay now, not on easels */
  handle.easels = {};

  /* ── the spec plaque: engraved brass on the front apron — main.js engraves it ── */
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.21),   // matches the 900×112 engraving canvas
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.3 })
  );
  plaque.position.set(0.85, -0.075, 1.206);   // recessed 6mm into the trim face — kissing faces flicker
  desk.add(plaque);
  handle.plaque = plaque;

  /* ── desk frame trim around the whole worktop ── */
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x241a10, roughness: 0.85 });
  const trimG = new THREE.BoxGeometry(4.42, 0.06, 0.05);
  [[0, 1.17], [0, -1.17]].forEach(function (p) {
    const t = new THREE.Mesh(trimG, trimMat);
    t.position.set(p[0], -0.075, p[1]);
    desk.add(t);
  });
  [[2.21, 0], [-2.21, 0]].forEach(function (p) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 2.4), trimMat);
    t.position.set(p[0], -0.075, p[1]);
    desk.add(t);
  });

  return handle;
}
