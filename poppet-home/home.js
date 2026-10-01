/* Poppet Home — a little room for a little poppet.
   The doll is rig-driven here (no body physics — only the head keeps a spring),
   walks where you point, idles on its bones (sway, look, wave, stretch, tap),
   startles when poked, chases a yarn ball. The room keeps its layout — hearth
   left, window right, shelf, bed — but is dressed: wood-and-weave textures,
   a real fire with smoke, curtained window with stars, wainscot, beams, dust.
   Artifacts kept from the ship's rooms appear as per-traveller 3D tokens:
   unbound ones orbit the poppet, related ones perch on the furniture. */
import * as THREE from '../vendor/three.module.js';
import { V } from '../poppet-lab/lab.js?v=lab51';
import { consumeDrop } from '../poppet-lab/keepdrop.js?v=lab51';

const tmpWP = new THREE.Vector3();

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
if (renderer.shadowMap) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
}
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14100a);
scene.fog = new THREE.Fog(0x14100a, 11, 17);
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 60);

scene.add(new THREE.HemisphereLight(0xffe2b8, 0x241708, 1.0));
const key = new THREE.DirectionalLight(0xffdca8, 1.0);
key.position.set(2, 3.2, 2.6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -4.5; key.shadow.camera.right = 4.5;
key.shadow.camera.top = 4.5; key.shadow.camera.bottom = -4.5;
key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
key.shadow.bias = -0.002;
scene.add(key);
const glow = new THREE.PointLight(0xff9a50, 0.9, 5, 2);   // the hearth
glow.position.set(-1.9, 0.6, -1.1);
glow.castShadow = true;
glow.shadow.mapSize.set(512, 512);
glow.shadow.bias = -0.004;
scene.add(glow);

/* ── tiny procedural textures: wood planks, plaster, weave, stone ── */
function texCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv;
}
function canvasTex(cv, rx, ry) {
  const t = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx || 1, ry || 1);
  t.anisotropy = 4;
  return t;
}
function woodTexture(base, plank, rx, ry, w, h) {
  const cv = texCanvas(w || 256, h || 256);
  const g = cv.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, cv.width, cv.height);
  const pw = cv.width / 4;   // 4 planks across
  for (let p = 0; p < 4; p++) {
    const shade = 0.86 + ((p * 7919) % 23) / 23 * 0.24;
    g.fillStyle = shadeColor(plank, shade);
    g.fillRect(p * pw + 1, 0, pw - 2, cv.height);
    // grain streaks
    g.strokeStyle = 'rgba(30,18,8,0.16)';
    g.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const yy = ((p * 131 + i * 97) % cv.height);
      g.beginPath();
      g.moveTo(p * pw + 3, yy);
      g.bezierCurveTo(p * pw + pw * 0.3, yy + 6, p * pw + pw * 0.6, yy - 5, p * pw + pw - 3, yy + 2);
      g.stroke();
    }
    // plank seam + nail dots
    g.fillStyle = 'rgba(18,10,4,0.75)';
    g.fillRect(p * pw, 0, 1.5, cv.height);
    g.fillStyle = 'rgba(30,20,10,0.6)';
    g.fillRect(p * pw + 5, 9, 2, 2);
    g.fillRect(p * pw + 5, cv.height - 11, 2, 2);
  }
  return canvasTex(cv, rx, ry);
}
function shadeColor(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const gg = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return 'rgb(' + r + ',' + gg + ',' + b + ')';
}
function weaveTexture(base, weft, rx, ry) {
  const cv = texCanvas(128, 128);
  const g = cv.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) {
    g.fillStyle = weft;
    g.fillRect(0, y + 1, 128, 2);
  }
  for (let x = 0; x < 128; x += 4) {
    g.fillStyle = 'rgba(0,0,0,0.10)';
    g.fillRect(x + 1, 0, 2, 128);
  }
  return canvasTex(cv, rx, ry);
}
function plasterTexture(base, rx, ry) {
  const cv = texCanvas(256, 256);
  const g = cv.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const a = 0.03 + Math.random() * 0.05;
    g.fillStyle = Math.random() > 0.5 ? 'rgba(255,240,210,' + a + ')' : 'rgba(40,24,10,' + a + ')';
    g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  return canvasTex(cv, rx, ry);
}
function stoneTexture(rx, ry) {
  const cv = texCanvas(256, 256);
  const g = cv.getContext('2d');
  g.fillStyle = '#6b6258';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 42) {
    const off = (y / 42) % 2 ? 32 : 0;
    for (let x = -64; x < 256; x += 64) {
      const f = 0.82 + Math.random() * 0.34;
      g.fillStyle = shadeColor('#6b6258', f);
      g.fillRect(x + off + 2, y + 2, 60, 38);
      g.strokeStyle = 'rgba(25,20,14,0.8)';
      g.strokeRect(x + off + 2, y + 2, 60, 38);
    }
  }
  for (let i = 0; i < 500; i++) {
    g.fillStyle = 'rgba(20,16,10,' + (0.02 + Math.random() * 0.06) + ')';
    g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }
  return canvasTex(cv, rx, ry);
}
function starTexture() {
  const cv = texCanvas(256, 256);
  const g = cv.getContext('2d');
  for (let i = 0; i < 42; i++) {
    const a = 0.35 + Math.random() * 0.65;
    g.fillStyle = 'rgba(255,255,240,' + a + ')';
    const r = 0.6 + Math.random() * 1.3;
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 256, r, 0, Math.PI * 2);
    g.fill();
  }
  return canvasTex(cv, 1, 1);
}

/* ── the room: same layout, much richer ── */
const room = new THREE.Group();
scene.add(room);
const floorTex = woodTexture('#6b4a2a', '#6b4a2a', 2.2, 2.2);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 8),
  new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.88, metalness: 0.02 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
room.add(floor);
// rug: layered woven circles with fringe
const rugGroup = new THREE.Group();
rugGroup.position.set(0, 0, 0.35);
room.add(rugGroup);
const rugOuter = new THREE.Mesh(new THREE.CircleGeometry(1.12, 40),
  new THREE.MeshStandardMaterial({ map: weaveTexture('#7a3a2a', 'rgba(220,170,120,0.20)', 8, 8), roughness: 0.96 }));
rugOuter.rotation.x = -Math.PI / 2;
rugOuter.position.y = 0.006;
rugOuter.receiveShadow = true;
rugGroup.add(rugOuter);
const rugMid = new THREE.Mesh(new THREE.CircleGeometry(0.82, 40),
  new THREE.MeshStandardMaterial({ map: weaveTexture('#96482e', 'rgba(240,200,150,0.16)', 6, 6), roughness: 0.96 }));
rugMid.rotation.x = -Math.PI / 2;
rugMid.position.y = 0.009;
rugGroup.add(rugMid);
const rugInner = new THREE.Mesh(new THREE.CircleGeometry(0.48, 36),
  new THREE.MeshStandardMaterial({ map: weaveTexture('#b25a34', 'rgba(255,225,180,0.2)', 4, 4), roughness: 0.96 }));
rugInner.rotation.x = -Math.PI / 2;
rugInner.position.y = 0.012;
rugGroup.add(rugInner);
// fringe: soft scraggly threads all round — kept subtle so it never reads as a dashed ring
{
  const frMat = new THREE.MeshStandardMaterial({ color: 0xa8825c, roughness: 0.98 });
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const len = 0.028 + Math.random() * 0.03;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.003, len), frMat);
    const rr = 1.13 + Math.random() * 0.05;
    m.position.set(Math.cos(a) * rr, 0.007, Math.sin(a) * rr);
    m.rotation.y = -a + (Math.random() - 0.5) * 0.5;
    m.rotation.z = (Math.random() - 0.5) * 0.25;
    rugGroup.add(m);
  }
}
// walls: warm plaster upper, wood wainscot lower, baseboard
const wallTex = plasterTexture('#8a6a44', 2.2, 1);
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.94 });
const wainMat = new THREE.MeshStandardMaterial({ map: woodTexture('#54381e', '#54381e', 3, 1), roughness: 0.85 });
const baseMat = new THREE.MeshStandardMaterial({ color: 0x2e1e0e, roughness: 0.9 });
function wallSet(w, h, pos, rotY) {
  const grp = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.PlaneGeometry(w, h - 0.95), wallMat);
  upper.position.y = 0.95 + (h - 0.95) / 2;
  upper.receiveShadow = true;
  grp.add(upper);
  const wain = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.72), wainMat);
  wain.position.y = 0.59;
  wain.receiveShadow = true;
  grp.add(wain);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.055, 0.035), new THREE.MeshStandardMaterial({ map: woodTexture('#6a4a26', '#6a4a26', 2, 1), roughness: 0.8 }));
  rail.position.y = 0.975;
  rail.position.z = 0.018;
  grp.add(rail);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, 0.04), baseMat);
  base.position.y = 0.1;
  base.position.z = 0.02;
  grp.add(base);
  // vertical wainscot battens
  for (let x = -w / 2 + 0.55; x < w / 2; x += 0.85) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.72, 0.022), new THREE.MeshStandardMaterial({ color: 0x3c2812, roughness: 0.85 }));
    b.position.set(x, 0.59, 0.012);
    grp.add(b);
  }
  grp.position.copy(pos);
  if (rotY) grp.rotation.y = rotY;
  room.add(grp);
  return grp;
}
const wallB = wallSet(8, 3.6, V(0, 0, -2.5), 0);
const wallL = wallSet(8, 3.6, V(-2.5, 0, 0), Math.PI / 2);
const wallR = wallSet(8, 3.6, V(2.5, 0, 0), -Math.PI / 2);
// ceiling beams
const beamMat = new THREE.MeshStandardMaterial({ map: woodTexture('#4a3018', '#4a3018', 3, 1), roughness: 0.9 });
[[-1.8], [0], [1.8]].forEach(function (b) {
  const beam = new THREE.Mesh(new THREE.BoxGeometry(8, 0.18, 0.3), beamMat);
  beam.position.set(0, 3.44, b[0]);
  room.add(beam);
});

/* ── the hearth: stone chimney breast, arched firebox, logs, layered flames ── */
const hearth = new THREE.Group();
hearth.position.set(-2.35, 0, -1.15);
hearth.rotation.y = Math.PI / 2;
room.add(hearth);
const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(1.4, 1.4), roughness: 0.97 });
const hearthBack = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.7, 0.2), stoneMat);
hearthBack.position.set(0, 1.35, -0.16);
hearthBack.castShadow = true;
hearthBack.receiveShadow = true;
hearth.add(hearthBack);
// chimney breast rises to the beams
const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 0.34), stoneMat);
chimney.position.set(0, 3.0, -0.22);
hearth.add(chimney);
const hearthL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 0.6), stoneMat);
hearthL.position.set(-0.85, 0.8, 0.1);
hearthL.castShadow = true;
hearth.add(hearthL);
const hearthR = hearthL.clone();
hearthR.position.x = 0.85;
hearth.add(hearthR);
const hearthTop = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.42, 0.6), stoneMat);
hearthTop.position.set(0, 1.72, 0.1);
hearth.add(hearthTop);
const mantel = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.66), new THREE.MeshStandardMaterial({ map: woodTexture('#4a3018', '#4a3018', 1, 1), roughness: 0.8 }));
mantel.position.set(0, 1.97, 0.12);
mantel.castShadow = true;
hearth.add(mantel);
// hearth stone slab
const slab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.9), stoneMat);
slab.position.set(0, 0.025, 0.28);
slab.receiveShadow = true;
hearth.add(slab);
// firebox interior soot
const firebox = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.1, 0.06), new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 1 }));
firebox.position.set(0, 0.62, -0.05);
hearth.add(firebox);
// andirons + crossed logs
const logMat = new THREE.MeshStandardMaterial({ map: woodTexture('#4a2c14', '#4a2c14', 1, 1), roughness: 0.95 });
function log(dx, dz, rz) {
  const l = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.7, 8), logMat);
  l.rotation.z = rz;
  l.position.set(dx, 0.13, dz);
  l.castShadow = true;
  hearth.add(l);
  return l;
}
log(-0.14, 0.02, Math.PI / 2 - 0.12);
log(0.14, 0.1, Math.PI / 2 + 0.14);
log(0, 0.02, Math.PI / 2 + 0.02).position.y = 0.22;
// andiron posts
[[-0.42], [0.42]].forEach(function (a) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.24, 6), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.6 }));
  post.position.set(a[0], 0.14, 0.3);
  hearth.add(post);
});
const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6a20 });
const embers = [];
for (let i = 0; i < 9; i++) {
  const e = new THREE.Mesh(new THREE.SphereGeometry(0.035 + Math.random() * 0.02, 8, 6), emberMat);
  e.position.set(-0.4 + Math.random() * 0.8, 0.06 + Math.random() * 0.08, -0.02 + Math.random() * 0.16);
  e.userData.flick = Math.random() * Math.PI * 2;
  hearth.add(e);
  embers.push(e);
}
// layered flame planes — three crossed, soft-alpha cards that sway
const flameMat = new THREE.MeshBasicMaterial({
  map: flameTexture(), transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.95
});
const flames = [];
[[0, 0, 0.36], [Math.PI / 2.4, 0.06, 0.3], [Math.PI / 1.6, -0.05, 0.26]].forEach(function (f) {
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), flameMat.clone());
  fl.position.set(f[1], 0.33, f[2] * 0.4);
  fl.rotation.y = f[0];
  fl.userData.seed = Math.random() * 7;
  hearth.add(fl);
  flames.push(fl);
});
function flameTexture() {
  const cv = texCanvas(64, 128);
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 96, 4, 32, 80, 70);
  gr.addColorStop(0, 'rgba(255,240,190,0.95)');
  gr.addColorStop(0.3, 'rgba(255,150,50,0.8)');
  gr.addColorStop(0.62, 'rgba(210,60,18,0.4)');
  gr.addColorStop(1, 'rgba(120,20,4,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 128);
  // lick the top narrower
  g.globalCompositeOperation = 'destination-in';
  const shape = g.createLinearGradient(0, 0, 0, 128);
  shape.addColorStop(0, 'rgba(0,0,0,0.15)');
  shape.addColorStop(0.45, 'rgba(0,0,0,0.95)');
  shape.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = shape;
  g.fillRect(0, 0, 64, 128);
  const t = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlow('#ff8a30'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
}));  fireGlow.position.set(0, 0.34, 0.12);
fireGlow.scale.setScalar(1.3);
hearth.add(fireGlow);
// smoke wisps — pale sprites rising, fading, resetting
const smokeSprites = [];
for (let i = 0; i < 5; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: smokeTexture(), transparent: true, opacity: 0, depthWrite: false
  }));
  s.position.set(0, 1.4, 0);
  s.scale.setScalar(0.22);
  s.userData.t = Math.random();          // normalized life
  s.userData.drift = (Math.random() - 0.5) * 0.16;
  hearth.add(s);
  smokeSprites.push(s);
}
function smokeTexture() {
  const cv = texCanvas(64, 64);
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 3, 32, 32, 30);
  gr.addColorStop(0, 'rgba(190,185,180,0.55)');
  gr.addColorStop(0.55, 'rgba(160,155,150,0.22)');
  gr.addColorStop(1, 'rgba(140,135,130,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}
// mantel props: candle + little framed portrait of the poppet itself
const candle = new THREE.Group();
candle.position.set(0.55, 2.02, 0.12);
hearth.add(candle);
const cstick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.02, 8), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.5, metalness: 0.4 }));
candle.add(cstick);
const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.6 }));
wax.position.y = 0.06;
candle.add(wax);
const cflame = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlow('#ffcf7a'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
}));
cflame.position.y = 0.15;
cflame.scale.setScalar(0.09);
candle.add(cflame);
const cLight = new THREE.PointLight(0xffc070, 0.25, 1.6, 2);
cLight.position.y = 0.16;
candle.add(cLight);

/* ── window: moonlight, curtains, twinkling stars ── */
const winGroup = new THREE.Group();
winGroup.position.set(1.25, 0, 0);
room.add(winGroup);
const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.42, 0.1), new THREE.MeshStandardMaterial({ map: woodTexture('#3c2812', '#3c2812', 1, 1), roughness: 0.8 }));
winFrame.position.set(0, 1.72, -2.47);
winGroup.add(winFrame);
// frame bevel strips
[[0, 0.74, 1.3, 0.09], [0, -0.74, 1.3, 0.09], [-0.56, 0, 0.09, 1.55], [0.56, 0, 0.09, 1.55], [0, 0, 0.05, 1.4], [0, 0, 1.16, 0.05]].forEach(function (s) {
  const strip = new THREE.Mesh(new THREE.BoxGeometry(s[2], s[3], 0.06), new THREE.MeshStandardMaterial({ color: 0x241708, roughness: 0.85 }));
  strip.position.set(s[0] + 0, 1.72 + (s[1] || 0), -2.42);
  winGroup.add(strip);
});
const moonPane = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.3), new THREE.MeshBasicMaterial({
  map: nightTexture(), transparent: true, opacity: 0.95
}));
moonPane.position.set(0, 1.72, -2.43);
winGroup.add(moonPane);
function nightTexture() {
  const cv = texCanvas(128, 160);
  const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 160);
  gr.addColorStop(0, '#0c1330');
  gr.addColorStop(0.7, '#182448');
  gr.addColorStop(1, '#243055');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 160);
  // moon with halo
  const mg = g.createRadialGradient(88, 42, 3, 88, 42, 26);
  mg.addColorStop(0, 'rgba(235,240,255,1)');
  mg.addColorStop(0.32, 'rgba(220,228,250,0.95)');
  mg.addColorStop(0.5, 'rgba(180,195,235,0.25)');
  mg.addColorStop(1, 'rgba(150,170,220,0)');
  g.fillStyle = mg;
  g.fillRect(40, 0, 96, 90);
  g.fillStyle = 'rgba(200,210,240,0.2)';
  for (let i = 0; i < 3; i++) g.fillRect(30 + Math.random() * 80, 10 + Math.random() * 130, 1 + Math.random() * 14, 1);
  // stars
  const st = starTexture();
  g.drawImage(st.image, 0, 60, 128, 100);
  return canvasTex(cv, 1, 1);
}
const moonBeam = new THREE.PointLight(0x9ab0e0, 0.55, 5, 2);
moonBeam.position.set(0, 1.85, -2.1);
winGroup.add(moonBeam);
// curtains: two cloth panels, slightly gathered, held by a rod
const curtainMat = new THREE.MeshStandardMaterial({
  map: weaveTexture('#5a3a5a', 'rgba(220,190,220,0.14)', 2, 3), roughness: 0.95, side: THREE.DoubleSide
});
function curtain(side) {
  const g = new THREE.PlaneGeometry(0.4, 1.75, 10, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin(x * 18 + side) * 0.035);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, curtainMat);
  m.position.set(side * 0.78, 1.68, -2.38);
  m.castShadow = true;
  winGroup.add(m);
  return m;
}
curtain(1);
curtain(-1);
const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.1, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.4, metalness: 0.7 }));
rod.rotation.z = Math.PI / 2;
rod.position.set(0, 2.6, -2.36);
winGroup.add(rod);

/* ── shelf with props ── */
const shelfMat = new THREE.MeshStandardMaterial({ map: woodTexture('#4a3018', '#4a3018', 1, 1), roughness: 0.85 });
const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.32), shelfMat);
shelf.position.set(-1.2, 1.5, -2.36);
shelf.castShadow = true;
shelf.receiveShadow = true;
room.add(shelf);
const bookMats = [
  new THREE.MeshStandardMaterial({ color: 0x6a3428, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0x34486a, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0x5a6a3a, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0x8a5a28, roughness: 0.9 })
];
[[-1.7, 0], [-1.58, 1], [-1.47, 2], [-1.37, 3], [-0.62, 1], [-0.52, 3]].forEach(function (b, i) {
  const bk = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26 + (i % 3) * 0.03, 0.19), bookMats[b[1]]);
  bk.position.set(b[0], 1.65 + (i % 3) * 0.015, -2.36);
  bk.rotation.z = i === 3 ? -0.18 : 0;   // one leans
  bk.castShadow = true;
  room.add(bk);
});
const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 12), new THREE.MeshPhysicalMaterial({ color: 0x9ac0a8, roughness: 0.2, transparent: true, opacity: 0.5 }));
jar.position.set(-1.05, 1.64, -2.36);
room.add(jar);
// small potted plant on the shelf end
const plant = new THREE.Group();
plant.position.set(-0.85, 1.53, -2.36);
room.add(plant);
const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.09, 10), new THREE.MeshStandardMaterial({ color: 0x9a5a34, roughness: 0.9 }));
plant.add(pot);
for (let i = 0; i < 6; i++) {
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.14, 5), new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.9 }));
  const a = i * Math.PI / 3;
  leaf.position.set(Math.cos(a) * 0.02, 0.13, Math.sin(a) * 0.02);
  leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
  plant.add(leaf);
}

/* ── a small bed in the corner, dressed ── */
const bed = new THREE.Group();
bed.position.set(1.85, 0, -1.5);
bed.rotation.y = -0.5;
room.add(bed);
const bedMat = new THREE.MeshStandardMaterial({ map: woodTexture('#4a331c', '#4a331c', 1, 1), roughness: 0.85 });
const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 1.3), bedMat);
bedFrame.position.y = 0.1;
bed.add(bedFrame);
// posts + headboard
[[-0.32, -0.6], [0.32, -0.6], [-0.32, 0.6], [0.32, 0.6]].forEach(function (p) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.5, 8), bedMat);
  post.position.set(p[0], 0.3, p[1]);
  post.castShadow = true;
  bed.add(post);
});
const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.06), bedMat);
headboard.position.set(0, 0.5, -0.62);
bed.add(headboard);
const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.1, 1.2),
  new THREE.MeshStandardMaterial({ map: weaveTexture('#d8cba8', 'rgba(120,100,70,0.12)', 3, 4), roughness: 0.95 }));
mattress.position.y = 0.24;
mattress.castShadow = true;
bed.add(mattress);
const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.26),
  new THREE.MeshStandardMaterial({ map: weaveTexture('#e8dcc0', 'rgba(160,140,110,0.12)', 2, 2), roughness: 0.95 }));
pillow.position.set(0, 0.33, -0.42);
pillow.rotation.x = 0.06;
bed.add(pillow);
const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.78),
  new THREE.MeshStandardMaterial({ map: weaveTexture('#5a6a8a', 'rgba(200,210,240,0.12)', 3, 3), roughness: 0.95 }));
blanket.position.set(0, 0.3, 0.22);
blanket.castShadow = true;
bed.add(blanket);
// folded throw at the foot — where related keeps perch
const throwFold = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.3),
  new THREE.MeshStandardMaterial({ map: weaveTexture('#8a4a3a', 'rgba(240,200,170,0.14)', 2, 2), roughness: 0.95 }));
throwFold.position.set(0, 0.31, 0.52);
bed.add(throwFold);

/* ── dust motes drifting in the lamplight ── */
const dust = [];
{
  const dGeo = new THREE.BufferGeometry();
  const dN = 60;
  const dPos = new Float32Array(dN * 3);
  for (let i = 0; i < dN; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 5;
    dPos[i * 3 + 1] = 0.2 + Math.random() * 2.6;
    dPos[i * 3 + 2] = (Math.random() - 0.5) * 4.4 - 0.2;
  }
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dMat = new THREE.PointsMaterial({
    color: 0xffe8c0, size: 0.02, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  const pts = new THREE.Points(dGeo, dMat);
  room.add(pts);
  dust.push(pts);
}

/* ── the poppet: rig-driven here, physics only in its head ── */
const HP = {
  head: 0.44, chest: 1.02, waist: 0.5, hips: 1.05,
  arml: 1, armt: 1.08, legl: 0.95, legt: 1.15, flop: 0.32,
  pose: 'stand', showRig: false,
  worn: { robe: false, dress: false, top: false, hoodie: false, pants: false, bralet: false }   // starts bare, like the lab's
};
const atlasCv = document.createElement('canvas');
atlasCv.width = atlasCv.height = 1024;
const { createDoll } = await import('../poppet-lab/doll.js?v=lab51');
const doll = createDoll(scene, atlasCv, null, { rng: null, brush: function () { return { ink: '#2b2016', size: 10 }; } });
doll.state.groundOn = false;      // the lab's floor ring does not belong in the living room
doll.setParams(HP);
doll.rebuild('stand');
doll.setKinematic(true);          // bones, not physics — the head keeps a spring
const arrived = consumeDrop(doll, camera);   // kept in the lab? drop onto the rug
doll.setHome(0, 0.35);   // lives on the rug

/* the poppet keeps its lab self: adopt the latest keepsake's proportions,
   clothes and painted atlas so the doll that fell in is the doll that was made. */
function adoptKept() {
  const list = keepsakeMod.loadKeepsakes();
  if (!list.length) return false;
  const k = list[list.length - 1];
  try {
    if (k.P) Object.assign(HP, k.P);
    HP.worn = Object.assign({ robe: false, dress: false, top: false, hoodie: false, pants: false, bralet: false }, k.worn || {});
    doll.setParams(HP);
    if (k.atlas) {
      const im = new Image();
      im.onload = function () {
        const g = doll.bodyCtx;
        g.clearRect(0, 0, atlasCv.width, atlasCv.height);
        g.drawImage(im, 0, 0, atlasCv.width, atlasCv.height);
        doll.bodyTex.needsUpdate = true;
      };
      im.src = k.atlas;
    }
    doll.rebuild(k.pose || 'stand');
    doll.setKinematic(true);   // rebuild() drops back to pose targets; re-arm
    hideRings();               // rebuild() also rebuilds the lab rings — hide again
    return true;
  } catch (err) { return false; }
}
// no lab rings in the living room
function hideRings() {
  const rg = doll.M().rings;
  if (!rg) return;
  Object.keys(rg).forEach(function (k) { rg[k].visible = false; });
}
hideRings();

/* ══════════════════════════════════════════════════════════════════
   the keeps: every kept thing, as a per-traveller 3D token.
   unbound tokens orbit the poppet; keeps already related to it perch
   on the furniture (shelf, window ledge, bed foot). Clicking a token
   opens its card — with the fields its own game kept — and unbound
   tokens offer "relate this", which opens the desktop's orbit rail.
   ══════════════════════════════════════════════════════════════════ */
const keepsakeMod = await import('../poppet-lab/keepsake.js?v=lab51');
adoptKept();   // now that the keepsake store is loaded: become the poppet that was kept
doll.body.scale.setScalar(0.55);   // room scale: head against the bed and hearth, not the walls
const keepGroup = new THREE.Group();      // orbit group, rides the poppet
scene.add(keepGroup);
const tokens = [];                        // { id, store, data, traveller, obj, bound, perch, phase, ... }
const ARCANA = { ink: '#8cc85f', gold: '#e3c78a', cyan: '#79dac8' };

function parentState() {
  // seated in the ship's bezel: the desktop is the same origin — read it live
  try {
    if (window.parent && window.parent !== window && window.parent.Liber && window.parent.Liber.state) {
      return window.parent.Liber.state;
    }
  } catch (err) { /* cross-origin or standalone */ }
  return null;
}
function snapKeeps() {
  const ps = parentState();
  if (ps) {
    const s = ps.get();
    return { s: s, relations: s.relations || [], hasParent: true };
  }
  return { s: {}, relations: [], hasParent: false };
}
// what each kept store becomes in the room
const TRAVELLERS = {
  crossing: 'vanir', divination: 'arcana', games: 'whimsy wow', sea: 'vanir',
  garden: 'ruby', dreams: 'insightful inquiry', journal: 'the mad scribe',
  abstract: 'physius', learn: 'riason', methodology: 'riason',
  graveyard: 'pete', council: 'wanderlust', buddy: 'wanderlust'
};
const STORE_LABEL = {
  crossing: 'vanir', divination: 'arcana', games: 'whimsy wow', sea: 'the sea',
  garden: 'the garden', dreams: 'dreams', journal: 'the journal', abstract: 'the abstract',
  learn: 'lessons', methodology: 'methodology', graveyard: 'the graveyard',
  council: 'the council', buddy: 'the buddy', poppet: 'the lab'
};
const isBound = (function () {
  const rels = snapKeeps().relations;
  return function (id) {
    for (let i = 0; i < rels.length; i++) {
      if (rels[i] && rels[i].from === id && (rels[i].to || 'buddy') === 'buddy') return true;
    }
    return false;
  };
})();

/* token builders — one shape per traveller */
function mat(color, opts) {
  return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.75 }, opts || {}));
}
function buildJarToken(d) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.2, 12),
    new THREE.MeshPhysicalMaterial({ color: 0xaac8b8, roughness: 0.12, transparent: true, opacity: 0.34 }));
  g.add(glass);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.05, 12), glass.material);
  neck.position.y = 0.125;
  g.add(neck);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.045, 10), mat(0xa87848, { roughness: 0.9 }));
  cork.position.y = 0.165;
  g.add(cork);
  // the sealed thought inside: a little rolled paper
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.13, 8),
    new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }));
  paper.rotation.z = 0.5;
  paper.position.y = -0.03;
  g.add(paper);
  // wax seal color from the whisper, if it kept one
  if (d && d.thought && /lose|fade|forget/i.test(String(d.thought).slice(0, 60))) cork.material = mat(0x8a3040, { roughness: 0.7 });
  return g;
}
function buildTicketToken(d) {
  const g = new THREE.Group();
  const cv = texCanvas(128, 64);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#e8d5a0';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#b03a2a';
  ctx.fillRect(0, 0, 128, 10);
  ctx.fillStyle = '#3a2c18';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText('WHIMSY WOW', 12, 30);
  ctx.font = '10px Georgia, serif';
  ctx.fillText(String((d && (d.name || d.label)) || 'admit one').slice(0, 18), 12, 46);
  ctx.fillStyle = '#3a2c18';
  for (let x = 104; x < 128; x += 7) {   // perforations
    ctx.beginPath();
    ctx.arc(x, 32, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(58,44,24,0.7)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(106, 4); ctx.lineTo(106, 60); ctx.stroke();
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.1),
    new THREE.MeshStandardMaterial({ map: canvasTex(cv, 1, 1), roughness: 0.9 }));
  g.add(t);
  return g;
}
function buildArcanaToken(d) {
  const g = new THREE.Group();
  const glyph = (d && d.g) ? String(d.g) : ((d && d.number !== undefined) ? String(d.number) : '✶');
  const cv = texCanvas(96, 128);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#12100c';
  ctx.fillRect(0, 0, 96, 128);
  ctx.strokeStyle = ARCANA.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 88, 120);
  ctx.fillStyle = ARCANA.gold;
  ctx.font = '9px monospace';
  ctx.fillText(String((d && d.name) || 'arcana').toUpperCase().slice(0, 12), 8, 16);
  ctx.fillStyle = ARCANA.ink;
  ctx.font = '34px monospace';
  ctx.fillText(glyph.slice(0, 3), 30, 78);
  ctx.fillStyle = ARCANA.cyan;
  ctx.font = '8px monospace';
  ctx.fillText(d && d.orientation === 'reversed' ? 'REVERSED' : 'UPRIGHT', 18, 112);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.23),
    new THREE.MeshStandardMaterial({ map: canvasTex(cv, 1, 1), roughness: 0.85, emissive: 0x1a2410, emissiveIntensity: 0.5 }));
  g.add(card);
  return g;
}
function buildBottleToken(d) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.22, 10),
    new THREE.MeshPhysicalMaterial({ color: 0x6a9a8a, roughness: 0.15, transparent: true, opacity: 0.42 }));
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.09, 8), body.material);
  neck.position.y = 0.15;
  g.add(neck);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.04, 8), mat(0xa87848, { roughness: 0.9 }));
  cork.position.y = 0.2;
  g.add(cork);
  const note = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 6),
    new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }));
  note.rotation.z = -0.35;
  note.position.y = -0.02;
  g.add(note);
  if (d && d.intensity !== undefined) {   // the sea's feeling tints the glass
    const k = Math.max(0, Math.min(1, Number(d.intensity) || 0));
    body.material.color.setRGB(0.42 + k * 0.3, 0.6 - k * 0.2, 0.55 - k * 0.2);
  }
  return g;
}
function buildCloudToken(d) {
  const g = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xcfd4e6, roughness: 1, transparent: true, opacity: 0.92 });
  const puffs = [[0, 0, 0, 0.09], [0.07, 0.02, 0.01, 0.07], [-0.07, 0.015, -0.01, 0.065], [0.01, 0.05, 0, 0.06]];
  puffs.forEach(function (p) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(p[3], 10, 8), cloudMat);
    s.position.set(p[0], p[1], p[2]);
    g.add(s);
  });
  for (let i = 0; i < 4; i++) {
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.014), new THREE.MeshBasicMaterial({ color: 0xfff0b0 }));
    st.position.set((Math.random() - 0.5) * 0.16, -0.02 - Math.random() * 0.05, (Math.random() - 0.5) * 0.1);
    g.add(st);
  }
  return g;
}
function buildBookToken(d) {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.22), mat(0x5a3a28, { roughness: 0.85 }));
  g.add(cover);
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.036, 0.2), mat(0xe8dcc0, { roughness: 0.95 }));
  pages.position.y = 0.006;
  g.add(pages);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.054, 0.22), mat(0x8a5a28, { roughness: 0.8 }));
  spine.position.x = -0.075;
  g.add(spine);
  if (d && d.title) {   // the title pressed into the cover — a gold strip
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.03), mat(0xc9962e, { roughness: 0.4, metalness: 0.6 }));
    strip.position.set(0.005, 0.028, -0.04);
    g.add(strip);
  }
  return g;
}
function buildLabToken(k) {
  // the framed portrait from before — a saved poppet, painted by hand
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g2 = cv.getContext('2d');
  g2.fillStyle = '#efe6cd';
  g2.fillRect(0, 0, 128, 128);
  g2.strokeStyle = '#c9962e';
  g2.lineWidth = 7;
  g2.strokeRect(4, 4, 120, 120);
  const im = new Image();
  im.onload = function () {
    g2.drawImage(im, 12, 12, 104, 104);
    tex.needsUpdate = true;
  };
  im.src = k.atlas;
  const tex = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
}
function buildStoneToken(d) {
  const g = new THREE.Group();
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), mat(0x5a5a62, { roughness: 0.55, flatShading: true }));
  stone.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  g.add(stone);
  return g;
}
/* photo-backed tokens: a kept photo / screenshot becomes the token's face */
function photoTokenTexture(src) {
  if (!src) return null;
  const tex = new THREE.Texture();
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  const im = new Image();
  im.onload = function () { tex.image = im; tex.needsUpdate = true; };
  im.src = src;
  return tex;
}
function buildMemoryToken(d) {   // a polaroid on the string — its face is the kept photo
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.18), mat(0xf2ead8, { roughness: 0.9 }));
  g.add(frame);
  const f = d && Array.isArray(d.frames) && d.frames[0];
  const tex = f && f.img ? photoTokenTexture(f.img) : null;
  if (tex) {
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.125, 0.125), new THREE.MeshBasicMaterial({ map: tex }));
    photo.rotation.x = -Math.PI / 2;
    photo.position.set(0, 0.006, -0.012);
    g.add(photo);
  }
  return g;
}
function buildGameToken(d) {   // a cartridge card whose face is the moment, if one was shot
  const g = new THREE.Group();
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.14), mat(0x1a1610, { roughness: 0.6 }));
  g.add(card);
  const tex = d && d.shot ? photoTokenTexture(d.shot) : null;
  if (tex) {
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.11), new THREE.MeshBasicMaterial({ map: tex }));
    scr.rotation.x = -Math.PI / 2;
    scr.position.y = 0.007;
    g.add(scr);
  } else {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.03), new THREE.MeshBasicMaterial({ color: 0xc9962e }));
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.y = 0.007;
    g.add(stripe);
  }
  return g;
}
function buildGardenToken() {   // a potted sprout — ruby keeps what is still growing
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 10), mat(0x9a5a34, { roughness: 0.9 }));
  g.add(pot);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.07, 6), mat(0x4a6a30, { roughness: 0.9 }));
  stem.position.y = 0.06;
  g.add(stem);
  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(0x6a9a4a, { roughness: 0.95 }));
  bud.position.y = 0.11;
  bud.scale.y = 0.75;
  g.add(bud);
  return g;
}
function tokenBuilderFor(store, d) {
  if (store === 'journal') {
    if (d && d.kind === 'memory') return buildMemoryToken;
    if (d && d.kind === 'game') return buildGameToken;
    return buildBookToken;
  }
  if (store === 'garden') return buildGardenToken;
  return TOKEN_BUILDERS[store] || buildStoneToken;
}
const TOKEN_BUILDERS = {
  crossing: buildJarToken, sea: buildBottleToken, divination: buildArcanaToken,
  games: buildTicketToken, dreams: buildCloudToken, journal: buildBookToken,
  abstract: buildArcanaToken, learn: buildBookToken, methodology: buildBookToken,
  garden: buildGardenToken, graveyard: buildStoneToken, buddy: buildStoneToken
};

/* per-game card fields — each traveller's keep speaks in its own tongue */
function esc(s) {
  return String(s == null ? '' : s).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; });
}
function cardRows(store, d) {
  const quote = function (s) { return s ? '<div class="kc-quote">' + esc(String(s).slice(0, 180)) + '</div>' : ''; };
  switch (store) {
    case 'crossing':
      return quote(d.thought) +
        (Array.isArray(d.findings) && d.findings.length ? '<div class="kc-row"><span>DISTORTIONS</span>' + d.findings.length + ' named</div>' : '') +
        (d.label ? '<div class="kc-row"><span>SEAL</span>' + esc(d.label) + '</div>' : '');
    case 'divination': {
      const rows = '';
      return quote(d.reading || d.interpretation) +
        '<div class="kc-row"><span>DRAW</span>' + esc(d.name || '—') + (d.orientation ? ' · ' + esc(d.orientation) : '') + '</div>' +
        (d.question ? '<div class="kc-row"><span>ASKED</span>' + esc(String(d.question).slice(0, 60)) + '</div>' : '');
    }
    case 'games':
      return quote(d.result || d.summary || (d.game ? 'a round of ' + d.game : '')) +
        (d.game ? '<div class="kc-row"><span>GAME</span>' + esc(d.game) + '</div>' : '');
    case 'sea':
      return quote(d.text) +
        (d.intensity !== undefined ? '<div class="kc-row"><span>TIDE</span>' + esc(d.intensity) + '</div>' : '');
    case 'dreams':
      return quote(d.text) +
        (d.title ? '<div class="kc-row"><span>DREAM</span>' + esc(d.title) + '</div>' : '');
    case 'journal':
      return quote(d.text || d.body || d.excerpt) +
        (d.title ? '<div class="kc-row"><span>ENTRY</span>' + esc(d.title) + '</div>' : '');
    default:
      return quote(d.text || d.thought || d.reading || d.title || d.result);
  }
}
function labRows(d) {
  const made = new Date(d.when);
  const wornList = Object.keys(d.worn || {}).filter(function (w) { return d.worn[w]; });
  const lessonBit = d.lesson ? (d.lesson.layer + ' · step ' + d.lesson.step + '/' + d.lesson.of + (d.lesson.part ? ' · ' + d.lesson.part : '')) : null;
  function coverageSummary(cov) {
    if (!cov) return 'unrecorded';
    const keys = Object.keys(cov);
    const painted = keys.filter(function (k) { return cov[k] > 0.04; });
    if (!painted.length) return 'bare clay';
    return painted.length + ' part' + (painted.length > 1 ? 's' : '') + ' · ' + painted.slice(0, 3).join(', ') + (painted.length > 3 ? '…' : '');
  }
  return '<div class="kc-row"><span>MADE</span>' + made.toLocaleDateString() + ' ' + made.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</div>' +
    '<div class="kc-row"><span>HEIGHT</span>' + (d.heightHeads ? d.heightHeads + ' heads' : 'unrecorded') + '</div>' +
    '<div class="kc-row"><span>BUILD</span>head ' + Math.round((d.P.head || 1) * 100) + '% · chest ' + Math.round((d.P.chest || 1) * 100) + '% · hips ' + Math.round((d.P.hips || 1) * 100) + '%</div>' +
    '<div class="kc-row"><span>POSE</span>' + (d.pose || 'stand') + '</div>' +
    '<div class="kc-row"><span>WEARING</span>' + (wornList.length ? wornList.join(', ') : 'bare clay') + '</div>' +
    '<div class="kc-row"><span>PAINTED</span>' + coverageSummary(d.coverage) + '</div>' +
    (lessonBit ? '<div class="kc-row"><span>LESSON</span>' + lessonBit + '</div>' : '');
}

/* perch spots for keeps already related to the poppet */
const PERCHES = [
  { pos: V(-0.75, 1.56, -2.36), kind: 'shelf' },
  { pos: V(-1.5, 1.56, -2.36), kind: 'shelf' },
  { pos: V(1.72, 2.2, -2.32), kind: 'ledge' },
  { pos: V(0.9, 2.2, -2.32), kind: 'ledge' },
  { pos: V(1.78, 0.38, -1.06), kind: 'bed' },
  { pos: V(2.0, 0.38, -1.3), kind: 'bed' }
];
let perchUsed = 0;

function buildTokens() {
  tokens.forEach(function (k) {
    if (k.obj && k.obj.parent) k.obj.parent.remove(k.obj);
  });
  tokens.length = 0;
  perchUsed = 0;
  const snap = snapKeeps();
  const rels = snap.relations;
  const boundOf = {};
  rels.forEach(function (r) { if ((r.to || 'buddy') === 'buddy') boundOf[r.from] = true; });
  // 1. the ship's stores (when seated in the desktop)
  if (snap.hasParent) {
    Object.keys(TRAVELLERS).forEach(function (store) {
      const arr = snap.s[store] || [];
      arr.forEach(function (e) {
        if (!e || !e.id) return;
        if (store === 'journal' && e.kind === 'dream' && e.ref) return;   // dream mirror, not a second thing
        addToken(store, e, !!boundOf[e.id]);
      });
    });
  }
  // 2. lab keepsakes, always (standalone and seated)
  keepsakeMod.loadKeepsakes().forEach(function (k) {
    addToken('poppet', k, false);
  });
  document.getElementById('keep-count').textContent = tokens.length ?
    tokens.length + ' KEEP' + (tokens.length > 1 ? 'S' : '') : 'NO KEEPS YET';
}
function addToken(store, entry, bound) {
  const isLab = store === 'poppet';
  const d = isLab ? entry : entry;
  const obj = isLab ? buildLabToken(d) : tokenBuilderFor(store, d)(d);
  const scale = isLab ? (0.3 + (d.heightHeads ? Math.min(0.16, d.heightHeads * 0.05) : 0.08)) : 1;
  if (obj.isSprite) obj.scale.setScalar(scale);
  else obj.scale.setScalar(1.15);
  const tok = {
    id: isLab ? 'poppet-' + (d.n || d.when) : entry.id,
    store: store,
    data: d,
    traveller: isLab ? 'the lab' : (TRAVELLERS[store] || 'wanderlust'),
    name: isLab ? d.name : (entry.name || entry.title || entry.label || 'a kept thing'),
    obj: obj,
    bound: bound,
    perch: null,
    phase: (tokens.length / 7) * Math.PI * 2,
    yOff: 0.34 + (tokens.length % 3) * 0.26,
    dir: tokens.length % 2 ? 1 : -1,
    radius: 0.62 + (tokens.length % 3) * 0.2,
    speed: 0.2 + (tokens.length % 4) * 0.045,
    summon: null,
    __scale: scale
  };
  if (bound) {
    // a keep already related to the poppet settles onto the furniture
    const p = PERCHES[perchUsed % PERCHES.length];
    perchUsed++;
    tok.perch = p;
    tok.obj.position.copy(p.pos);
    scene.add(tok.obj);
    if (!obj.isSprite) {
      obj.rotation.y = p.kind === 'bed' ? -0.5 + Math.random() * 0.2 : Math.PI + (Math.random() - 0.5) * 0.4;
    }
  } else {
    // flat keeps (cards, photos, tickets) ride a holder tilted up a little,
    // so they tumble like floating cards instead of spinning like plates
    const CARD_LIKE = { journal: 1, games: 1, divination: 1, abstract: 1, learn: 1, methodology: 1 };
    let holder = obj;
    if (!obj.isSprite && CARD_LIKE[store]) {
      holder = new THREE.Group();
      obj.rotation.x = -1.05;
      holder.add(obj);
    }
    keepGroup.add(holder);
    tok.obj = holder;
  }
  tokens.push(tok);
}

/* the info card */
const ctxCard = document.getElementById('keep-card');
function showContext(tok) {
  const d = tok.data;
  let inner;
  if (tok.store === 'poppet') {
    inner = '<div class="kc-tag">THE LAB</div><b>' + (d.name || 'a poppet') + '</b>' + labRows(d);
  } else {
    inner = '<div class="kc-tag kc-tag-' + tok.store + '">' + (STORE_LABEL[tok.store] || tok.store).toUpperCase() + '</div>' +
      '<b>' + String(tok.name || 'a kept thing') + '</b>' + cardRows(tok.store, d) +
      (tok.bound ? '<div class="kc-row"><span>RELATED</span>it stays with the poppet</div>' : '');
  }
  const relatable = !tok.bound && tok.store !== 'poppet';
  inner += (relatable ? '<button type="button" class="kc-relate">relate this</button>' : '') +
    '<div class="kc-btns"><button type="button" class="kc-open">open it</button>' +
    '<button type="button" class="kc-close">close</button></div>';
  ctxCard.innerHTML = inner;
  const rb = ctxCard.querySelector('.kc-relate');
  if (rb) {
    rb.addEventListener('click', function () {
      try { if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'poppet-home-poke' }, '*'); } catch (err) { /* standalone */ }
      ctxCard.classList.remove('open');
    });
  }
  const ob = ctxCard.querySelector('.kc-open');
  if (ob) ob.addEventListener('click', function () { ctxCard.classList.remove('open'); showArtifact(tok); });
  ctxCard.classList.add('open');
}
ctxCard.addEventListener('click', function (e) {
  if (e.target.classList.contains('kc-close')) ctxCard.classList.remove('open');
});

/* ── the artifact window: the keep read in full, dressed for its traveller ── */
const artView = document.getElementById('artifact-view');
const SHEET_CLASS = {
  vanir: 'vanir', arcana: 'arcana', 'whimsy wow': 'whimsy', 'insightful inquiry': 'insight',
  ruby: 'ruby', 'the mad scribe': 'scribe', riason: 'riason', pete: 'petey', wanderlust: 'wander'
};
function artBody(store, d) {
  switch (store) {
    case 'crossing': {
      let out = '<div class="av-section"><span class="av-label">THE SEALED THOUGHT</span><div class="av-text">' + esc(d.thought || '—') + '</div></div>';
      if (Array.isArray(d.findings) && d.findings.length) {
        out += '<div class="av-section"><span class="av-label">THE DISTORTIONS NAMED IN IT</span>' +
          d.findings.map(function (f) {
            return '<div class="av-finding"><b>' + esc(f.name) + '</b>' +
              (f.whisper ? '<div class="whisper">' + esc(f.whisper) + '</div>' : '') +
              (f.balm ? '<div class="balm">' + esc(f.balm) + '</div>' : '') + '</div>';
          }).join('') + '</div>';
      }
      if (Array.isArray(d.answers) && d.answers.some(Boolean)) {
        out += '<div class="av-section"><span class="av-label">THE ANSWERS GIVEN AT THE FAR SHORE</span>' +
          d.answers.map(function (a, i) {
            return a ? '<div class="av-qa"><span class="q">ANSWER ' + (i + 1) + '</span>' + esc(a) + '</div>' : '';
          }).join('') + '</div>';
      }
      if (d.keywordsMatched) out += '<div class="av-keywords">the tide matched: ' + esc([].concat(d.keywordsMatched).join(', ')) + '</div>';
      if (d.label) out += '<div class="av-keywords">seal: ' + esc(d.label) + '</div>';
      return out;
    }
    case 'divination':
      return '<div class="av-glyph">' + esc(d.g || '✶') + '</div>' +
        '<div class="av-orientation">' + esc((d.name || 'the draw') + ' · ' + (d.orientation || 'upright')) + '</div>' +
        (d.question ? '<div class="av-section"><span class="av-label">THE QUESTION</span><div class="av-qa">' + esc(d.question) + '</div></div>' : '') +
        '<div class="av-section"><span class="av-label">THE READING</span><div class="av-text">' + esc(d.reading || d.interpretation || '—') + '</div></div>';
    case 'sea': {
      let out = '<div class="av-section"><span class="av-label">RELEASED TO THE DEEP</span><div class="av-text">' + esc(d.text || '—') + '</div></div>';
      if (d.intensity !== undefined) out += '<div class="av-keywords">felt at tide ' + esc(d.intensity) + '</div>';
      if (d.keywordsMatched) out += '<div class="av-keywords">the tide matched: ' + esc([].concat(d.keywordsMatched).join(', ')) + '</div>';
      return out;
    }
    case 'games':
      return '<div class="av-section"><span class="av-label">THE ROUND</span><div class="av-text">' + esc(d.result || '—') + '</div></div>' +
        (d.shot ? '<div class="av-section"><span class="av-label">THE MOMENT</span><img class="av-shot" src="' + d.shot + '" alt=""/></div>' : '') +
        (d.game || d.name ? '<div class="av-keywords">' + esc(d.game || d.name) + '</div>' : '');
    case 'dreams':
      return '<div class="av-section"><span class="av-label">THE DREAM</span><div class="av-text">' + esc(d.text || '—') + '</div></div>';
    case 'journal': {
      if (d.kind === 'memory' && Array.isArray(d.frames)) {
        return '<div class="av-section"><span class="av-label">THE THREE FRAMES</span><div class="av-polaroids">' +
          d.frames.map(function (f) {
            return '<div class="av-polaroid"><img src="' + f.img + '" alt=""/><i>' + esc(f.label || 'untitled') + '</i></div>';
          }).join('') + '</div></div>' +
          (Array.isArray(d.figures) && d.figures.length ?
            '<div class="av-section"><span class="av-label">THE SCENE</span><div class="av-text">' +
            d.figures.map(function (f) { return esc(f.name || f.kind); }).join(' · ') + '</div></div>' : '');
      }
      if (d.kind === 'game' && d.shot) {
        return (d.result ? '<div class="av-section"><span class="av-label">THE ROUND</span><div class="av-text">' + esc(d.result) + '</div></div>' : '') +
          '<div class="av-section"><span class="av-label">THE MOMENT</span><img class="av-shot" src="' + d.shot + '" alt=""/></div>';
      }
      return '<div class="av-section"><span class="av-label">THE ENTRY</span><div class="av-text">' + esc(d.text || d.body || d.excerpt || '—') + '</div></div>';
    }
    default:
      return '<div class="av-section"><span class="av-label">THE KEEP</span><div class="av-text">' +
        esc(d.text || d.thought || d.reading || d.title || d.result || '—') + '</div></div>';
  }
}
let artOpen = false;
function showArtifact(tok) {
  const d = tok.data;
  const cls = tok.store === 'poppet' ? 'scribe' : (SHEET_CLASS[tok.traveller] || 'scribe');
  const kindLabel = tok.store === 'poppet' ? 'THE LAB' : (STORE_LABEL[tok.store] || tok.store).toUpperCase();
  const when = new Date(d.when || d.ts || Date.now());
  let body;
  if (tok.store === 'poppet') {
    body = '<div class="av-section"><span class="av-label">THE POPPET AS KEPT</span>' + labRows(d) + '</div>' +
      (d.atlas ? '<div class="av-section"><span class="av-label">THE PAINT</span><img class="av-shot" style="max-width:220px;image-rendering:auto" src="' + d.atlas + '" alt=""/></div>' : '');
  } else {
    body = artBody(tok.store, d);
  }
  artView.innerHTML = '<div class="av-sheet ' + cls + '">' +
    '<button type="button" class="av-close" title="close">✕</button>' +
    '<span class="av-kind">' + kindLabel + '</span>' +
    '<h2>' + esc(tok.name || 'a kept thing') + '</h2>' +
    '<span class="av-date">KEPT ' + when.toLocaleDateString() + ' · ' + when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span>' +
    body +
    '<div class="av-actions">' +
    (!tok.bound && tok.store !== 'poppet' ? '<button type="button" class="av-relate">RELATE THIS</button>' : '') +
    '<button type="button" class="av-back">BACK TO THE ROOM</button>' +
    '</div></div>';
  const relate = artView.querySelector('.av-relate');
  if (relate) relate.addEventListener('click', function () {
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'poppet-home-poke' }, '*'); } catch (err) { /* standalone */ }
    hideArtifact();
  });
  artView.querySelectorAll('.av-close, .av-back').forEach(function (b) { b.addEventListener('click', hideArtifact); });
  artView.hidden = false;
  artOpen = true;
}
function hideArtifact() {
  artView.hidden = true;
  artOpen = false;
}
artView.addEventListener('click', function (e) { if (e.target === artView) hideArtifact(); });
window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && artOpen) hideArtifact(); });

/* rebuild when the ship's state changes — new keeps arrive mid-visit */
(function watchState() {
  const ps = parentState();
  if (ps && ps.on) {
    try {
      ps.on('change', function () { buildTokens(); });
    } catch (err) { /* older API */ }
  }
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf('liber_vacui_v1') === 0) buildTokens();
  });
})();

/* ── the yarn ball: click the floor to roll it, the poppet chases ── */
const yarn = new THREE.Mesh(
  new THREE.SphereGeometry(0.075, 18, 14),
  new THREE.MeshStandardMaterial({ color: 0xb85a6a, roughness: 0.9 })
);
{
  const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 8), new THREE.MeshBasicMaterial({ color: 0x8a3a4a, wireframe: true }));
  yarn.add(wrap);
}
yarn.position.set(1.3, 0.075, 0.9);
yarn.castShadow = true;
scene.add(yarn);
const yarnState = { rolling: false, v: null };

/* ── interaction: floor click = walk there, doll click = startle, yarn drag = play ── */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const FLOOR_MIN = new THREE.Vector2(-2.1, -1.9), FLOOR_MAX = new THREE.Vector2(2.1, 2.3);
const walk = { target: null, t: 0, from: null };
let orbiting = false, theta = 0.5, phi = 1.22, dist = 4.6;
let px = 0, py = 0;
const camTarget = V(0, 0.52, 0);
let mood = 'idle';       // idle | walk | poke | chase
let moodT = 0;
let pokeCount = 0;
let pokeCool = 0;
const tmpC = V(0, 0, 0);

function place() {
  camera.position.set(
    camTarget.x + dist * Math.sin(phi) * Math.sin(theta),
    camTarget.y + dist * Math.cos(phi),
    camTarget.z + dist * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(camTarget);
}
function cast(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  ray.setFromCamera(ndc, camera);
  return ray;
}

canvas.addEventListener('pointerdown', function (e) {
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
  px = e.clientX; py = e.clientY;
  const ray = cast(e);
  // tokens — click one to read what its traveller kept
  let best = null, bestD = 1e9;
  tokens.forEach(function (k) {
    k.obj.getWorldPosition(tmpWP);
    const scr = tmpWP.clone().project(camera);
    const r = canvas.getBoundingClientRect();
    const sx = (scr.x * 0.5 + 0.5) * r.width + r.left, sy = (-scr.y * 0.5 + 0.5) * r.height + r.top;
    const d = Math.hypot(e.clientX - sx, e.clientY - sy);
    if (d < 40 && d < bestD) { bestD = d; best = k; }
  });
  if (best) {
    if (!best.bound) {
      // unbound: it glides down for a visit AND the poppet wanders over curious
      best.summon = {
        t: 0, hold: 0,
        from: best.obj.position.clone(),
        to: new THREE.Vector3(best.obj.position.x * 0.45, 0.3, best.obj.position.z * 0.45 + 0.25)
      };
      const dxs = best.obj.position.x, dzs = best.obj.position.z;
      walk.target = new THREE.Vector2(Math.max(FLOOR_MIN.x, Math.min(FLOOR_MAX.x, dxs * 0.5)), Math.max(FLOOR_MIN.y, Math.min(FLOOR_MAX.y, dzs * 0.55)));
      walk.from = { x: doll.body.position.x, z: doll.body.position.z };
      walk.t = 0;
      mood = 'walk';
      moodT = 0;
      doll.dropPose('point');
      idleHold = 2.2;
    }
    showArtifact(best);   // the themed window: the keep read in full
    return;
  }
  // yarn first — grab and fling
  const yh = ray.intersectObject(yarn, false)[0];
  if (yh) {
    mood = 'chase';
    moodT = 0;
    yarnState.rolling = true;
    yarnState.v = null;
    return;
  }
  // the doll — a startle, not a grapple: the head takes the hit on its spring
  const dh = ray.intersectObjects(doll.body.children, false)[0];
  if (dh && dh.object.userData.pi !== undefined) {
    mood = 'poke';
    moodT = 0;
    if (pokeCool <= 0) {
      pokeCount++;
      pokeCool = 0.35;
      doll.bumpHead((Math.random() - 0.5) * 0.5, 0.45 + Math.random() * 0.25, (Math.random() - 0.5) * 0.4);
      doll.dropPose(Math.random() > 0.5 ? 'shy' : 'cross');
      idleHold = 1.6;
      try { if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'poppet-home-poke', pokes: pokeCount }, '*'); } catch (err) { /* standalone */ }
    }
    return;
  }
  // floor — walk target
  const fh = ray.intersectObject(floor, false)[0];
  if (fh) {
    const p = fh.point;
    walk.target = new THREE.Vector2(
      Math.max(FLOOR_MIN.x, Math.min(FLOOR_MAX.x, p.x)),
      Math.max(FLOOR_MIN.y, Math.min(FLOOR_MAX.y, p.z))
    );
    walk.from = { x: doll.body.position.x, z: doll.body.position.z };
    walk.t = 0;
    mood = 'walk';
    moodT = 0;
  }
  orbiting = true;
});
canvas.addEventListener('pointermove', function (e) {
  if (orbiting) {
    theta -= (e.clientX - px) * 0.006;
    phi = Math.max(0.5, Math.min(1.5, phi - (e.clientY - py) * 0.005));
    px = e.clientX; py = e.clientY;
  }
});
function release() { orbiting = false; }
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', function (e) {
  e.preventDefault();
  dist = Math.max(2.4, Math.min(9, dist + e.deltaY * 0.004));
}, { passive: false });

/* ── moods, on the bones ── */
let nextIdle = 3;
let currentIdle = null;
let idleHold = 0;
const IDLES = ['sway', 'look', 'wave', 'stretch', 'tap'];
function pickIdle() {
  currentIdle = IDLES[Math.floor(Math.random() * IDLES.length)];
  if (currentIdle === 'sway') doll.dropPose('hip');
  else if (currentIdle === 'look') doll.dropPose('stand');
  else if (currentIdle === 'wave') doll.dropPose('wave');
  else if (currentIdle === 'stretch') doll.dropPose('point');
  else if (currentIdle === 'tap') doll.dropPose('shy');
}
pickIdle();
function backToStand() {
  doll.dropPose('stand');
  currentIdle = null;
  hideRings();
}
function stepWalk(dt) {
  walk.t = Math.min(1, walk.t + dt * 0.5);
  const ease = walk.t * walk.t * (3 - 2 * walk.t);
  const x = walk.from.x + (walk.target.x - walk.from.x) * ease;
  const z = walk.from.z + (walk.target.y - walk.from.z) * ease;
  doll.setHome(x, z);
  // face the travel direction
  const vx = walk.target.x - walk.from.x, vz = walk.target.y - walk.from.z;
  if (Math.abs(vx) > 0.02 || Math.abs(vz) > 0.02) doll.setYaw(Math.atan2(-vx, -vz));
  if (walk.t >= 1) {
    doll.setGait(0);
    doll.setYaw(0);
    mood = 'idle';
    moodT = 0;
    nextIdle = 1.2 + Math.random() * 2.5;
  }
}
function stepChase(dt) {
  if (!yarnState.v) yarnState.v = V((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5) * 1.4);
  yarnState.v.multiplyScalar(1 - dt * 0.8);
  yarn.position.addScaledVector(yarnState.v, dt);
  yarn.position.x = Math.max(-2, Math.min(2, yarn.position.x));
  yarn.position.z = Math.max(-1.8, Math.min(2.2, yarn.position.z));
  yarn.position.y = 0.075;
  yarn.rotation.z -= yarnState.v.length() * dt * 2;
  const dh0 = doll.home();
  const bx = dh0.x, bz = dh0.z;
  const dx = yarn.position.x - bx, dz = yarn.position.z - bz;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d > 0.55) {
    const t = Math.min(1, (d - 0.55) / Math.max(0.3, d));
    const stepx = dx / d * Math.min(d - 0.55, 1.2) * t, stepz = dz / d * Math.min(d - 0.55, 1.2) * t;
    doll.setHome(bx + stepx, bz + stepz);
    if (d > 0.9) doll.setYaw(Math.atan2(-dx, -dz));
  } else {
    doll.setGait(0);
    doll.setYaw(0);
    mood = 'idle';
    moodT = 0;
    nextIdle = 1 + Math.random() * 2;
  }
}

/* ── loop ── */
function resize() {
  const r = canvas.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return; // a hidden frame reports 0 — keep the last good size
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(1, r.height);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
place();

let last = performance.now();
let tSec = 0;
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tSec += dt;
  moodT += dt;
  if (pokeCool > 0) pokeCool -= dt;
  stepDrop(dt);   // the kept poppet's fall (no-op once landed)
  // moods
  if (idleHold > 0) idleHold -= dt;
  if (mood === 'walk') {
    // gait ramps in, holds to travel, settles out
    doll.setGait(Math.min(1, doll.state.gait + dt * 2.4));
    stepWalk(dt);
    if (moodT > 8) { doll.setGait(0); mood = 'idle'; }
  } else if (mood === 'chase') {
    doll.setGait(Math.min(1, doll.state.gait + dt * 2.8));
    stepChase(dt);
    if (moodT > 10) { doll.setGait(0); mood = 'idle'; }
  } else if (mood === 'idle') {
    if (idleHold <= 0 && moodT > nextIdle) {
      pickIdle();
      moodT = 0;
      nextIdle = 4 + Math.random() * 5;
    }
    if (currentIdle === 'sway' && moodT > 3.4) backToStand();
    else if (currentIdle === 'wave' && moodT > 3.2) backToStand();
    else if (currentIdle === 'stretch' && moodT > 3.0) backToStand();
    else if (currentIdle === 'tap' && moodT > 3.6) backToStand();
    else if (currentIdle === 'look' && moodT > 2.4) { currentIdle = null; hideRings(); }
  } else if (mood === 'poke') {
    if (moodT > 2.2) { mood = 'idle'; moodT = 0; nextIdle = 2 + Math.random() * 3; }
  }
  // hearth: embers flick, flames sway, glow breathes, smoke rises
  embers.forEach(function (e2) {
    e2.userData.flick += dt * (2 + Math.random());
    e2.scale.setScalar(0.8 + Math.sin(e2.userData.flick) * 0.25);
  });
  flames.forEach(function (fl, i) {
    fl.rotation.z = Math.sin(tSec * 9 + fl.userData.seed) * 0.09 + Math.sin(tSec * 15.7 + i) * 0.04;
    fl.scale.y = 1 + Math.sin(tSec * 7.3 + fl.userData.seed * 2) * 0.13;
  });
  fireGlow.material.opacity = 0.5 + Math.sin(tSec * 7.3) * 0.12 + Math.sin(tSec * 13.7) * 0.06;
  glow.intensity = 0.95 + Math.sin(tSec * 8.1) * 0.14;
  smokeSprites.forEach(function (s) {
    s.userData.t += dt * 0.22;
    if (s.userData.t >= 1) { s.userData.t = 0; s.userData.drift = (Math.random() - 0.5) * 0.16; }
    const lt = s.userData.t;
    s.position.set(s.userData.drift * lt * 8, 1.25 + lt * 1.7, 0.05 + lt * 0.25);
    s.scale.setScalar(0.18 + lt * 0.5);
    s.material.opacity = 0.3 * Math.sin(Math.min(1, lt) * Math.PI);
  });
  cflame.scale.setScalar(0.08 + Math.sin(tSec * 11 + 1) * 0.012);
  cLight.intensity = 0.22 + Math.sin(tSec * 9.5) * 0.05;
  // stars twinkle: the night pane shimmers very slightly
  moonPane.material.opacity = 0.92 + Math.sin(tSec * 2.2) * 0.03;
  doll.physicsFrame(dt);   // kinematic inside — the head spring rides along
  // tokens: unbound ones orbit the poppet; related ones hold their perch
  const hp = doll.home();
  keepGroup.position.set(hp.x, 0, hp.z);
  tokens.forEach(function (k) {
    if (k.bound) {
      if (k.obj.isSprite) {
        // portrait keeps bob gently on their perch
        k.obj.position.set(k.perch.pos.x, k.perch.pos.y + 0.09 + Math.sin(tSec * 1.4 + k.phase) * 0.015, k.perch.pos.z);
      }
      return;
    }
    k.phase += k.dir * k.speed * dt;
    const rr = k.radius + Math.sin(k.phase * 1.7) * 0.06;
    if (k.summon && k.summon.t < 1) {
      k.summon.t = Math.min(1, k.summon.t + dt * 0.55);
      const e = k.summon.t * k.summon.t * (3 - 2 * k.summon.t);
      k.obj.position.set(
        k.summon.from.x + (k.summon.to.x - k.summon.from.x) * e,
        k.summon.from.y + (k.summon.to.y - k.summon.from.y) * e + Math.sin(e * Math.PI) * 0.25,
        k.summon.from.z + (k.summon.to.z - k.summon.from.z) * e
      );
      if (k.obj.isSprite) k.obj.scale.setScalar(k.__scale * (1 + Math.sin(e * Math.PI) * 0.45));
      if (k.summon.t >= 1) {
        k.summon.hold = (k.summon.hold || 0) + dt;
        if (k.summon.hold > 2.6) { k.summon = null; k.backT = 0; }
      }
    } else if (k.backT !== undefined && k.backT < 1) {
      // glide back to orbit after a visit
      k.backT = Math.min(1, k.backT + dt * 0.4);
      const e = k.backT * k.backT * (3 - 2 * k.backT);
      const rr2 = k.radius + Math.sin(k.phase * 1.7) * 0.06;
      const tx = Math.cos(k.phase) * rr2, ty = k.yOff + Math.sin(k.phase * 1.3) * 0.09, tz = Math.sin(k.phase) * rr2;
      k.obj.position.set(
        k.obj.position.x + (tx - k.obj.position.x) * e,
        k.obj.position.y + (ty - k.obj.position.y) * e,
        k.obj.position.z + (tz - k.obj.position.z) * e
      );
      if (k.backT >= 1) delete k.backT;
    } else {
      k.obj.position.set(
        Math.cos(k.phase) * rr,
        k.yOff + Math.sin(k.phase * 1.3) * 0.09,
        Math.sin(k.phase) * rr
      );
      if (k.obj.isSprite) {
        const pulse = 0.94 + Math.sin(k.phase * 2.2) * 0.06;
        k.obj.scale.setScalar(k.__scale * pulse);
      } else {
        k.obj.rotation.y += dt * 0.7;
      }
    }
  });
  place();
  renderer.render(scene, camera);
}
requestAnimationFrame(function t0(n) { last = n; requestAnimationFrame(tick); });

/* ── the arrival: a kept poppet falls into the house ── */
let dropT = arrived ? 0 : -1;
const dropV = { pos: null, spin: 0 };
if (arrived) {
  doll.body.position.y = 4.85;   // the fall carries the whole group; the rig poses inside it
  /* the announcement plate — slides in while the poppet falls */
  const ann = document.createElement('div');
  ann.id = 'drop-announce';
  ann.textContent = 'YOUR POPPET HAS COME HOME';
  ann.style.cssText = 'position:fixed;left:50%;top:-70px;transform:translateX(-50%);' +
    'padding:10px 22px;background:#e8dcc0;border:1px solid #6a4a1a;color:#3a2c18;' +
    'font-family:Germania, Georgia, serif;letter-spacing:0.28em;font-size:0.78rem;' +
    'z-index:40;transition:top 0.7s cubic-bezier(0.22, 1, 0.36, 1);';
  document.body.appendChild(ann);
  requestAnimationFrame(function () { ann.style.top = '26px'; });
  setTimeout(function () { ann.style.top = '-70px'; }, 4200);
  setTimeout(function () { if (ann.parentNode) ann.remove(); }, 5000);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlow('#ffd9a0'), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  halo.scale.setScalar(1.3);
  scene.add(halo);
  window.__homeDrop = { halo: halo, announce: ann };
  dropV.spin = 2.4;
}
function stepDrop(dt) {
  if (dropT < 0) return;
  dropT += dt;
  const b = doll.body;
  if (b.position.y > 0.001) {
    b.position.y = Math.max(0, b.position.y - (2.2 + b.position.y * 0.6) * dt);
    b.rotation.y += dropV.spin * dt;
    dropV.spin = Math.max(0, 2.4 - dropT * 3.2);
    if (window.__homeDrop) window.__homeDrop.halo.position.set(0, b.position.y + 1.0, 0.35);
  } else if (dropT < 2.4) {
    b.rotation.y = 0;
    if (window.__homeDrop) {
      const f = Math.max(0, 1 - (dropT - 0.4) / 1.1);
      window.__homeDrop.halo.material.opacity = 0.85 * f;
      window.__homeDrop.halo.scale.setScalar(1.3 + (1 - f) * 0.9);
      if (f <= 0) { scene.remove(window.__homeDrop.halo); window.__homeDrop = null; }
    }
    dropT = 99;
  }
}

function makeGlow(color) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, color);
  gr.addColorStop(0.4, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

buildTokens();
window.__home = {
  doll: doll, scene: scene, camera: camera, yarn: yarn, HP: HP,
  state: function () { return mood; }, hideRings: hideRings,
  tokens: tokens, rebuildTokens: buildTokens, room: room
};
