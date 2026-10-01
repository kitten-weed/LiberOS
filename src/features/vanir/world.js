// ── VANIR · the water & the world ────────────────────────────────────────────
import * as THREE from '../../../vendor/three.module.js';

// Inky palette. The underworld is not black — it is deep ink with a bruised
// violet memory of sky. One blue light burns on the raft.
export const PALETTE = {
  void: 0x05060a,
  ink: 0x0a0e18,
  water: 0x070b14,
  bruise: 0x141024,
  fogColor: 0x080a12,
  torch: 0x3fa8ff,
  torchDim: 0x16324f,
  bone: 0x9aa0a6,
  boneDark: 0x3a3f45,
};

export function makeFog() {
  return new THREE.FogExp2(PALETTE.fogColor, 0.011);
}

// ── water ────────────────────────────────────────────────────────────────────
// One large plane, displaced in the vertex shader with layered value noise,
// tinted by the same noise in the fragment shader. Nothing else moves.
const WATER_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vPos;
  varying float vElev;
  varying float vFoam;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }
  float waves(vec2 p){
    float t = uTime;
    float e = 0.0;
    e += vnoise(p*0.14 + vec2(t*0.10, t*0.06)) * 0.55;
    e += vnoise(p*0.38 - vec2(t*0.16, t*0.05)) * 0.25;
    e += vnoise(p*0.90 + vec2(t*0.28, -t*0.20)) * 0.10;
    e += sin(p.x*0.9 + t*0.6) * sin(p.y*0.7 - t*0.43) * 0.06;
    return e;
  }

  void main(){
    vec3 pos = position;
    float e = waves(pos.xy);          // plane is XY, rotated flat below
    pos.z += e;
    vElev = e;
    vFoam = smoothstep(0.62, 0.92, e);
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const WATER_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3  uDeep;
  uniform vec3  uCrest;
  uniform vec3  uBruise;
  uniform vec3  uCam;
  uniform float uFogDensity;
  uniform vec3  uFogColor;
  varying vec3  vPos;
  varying float vElev;
  varying float vFoam;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }

  void main(){
    // faint blue bioluminescence on wave crests
    vec3 col = mix(uDeep, uCrest, smoothstep(0.15, 0.85, vElev));
    // a bruise of sky far away — the only hint of a world above
    float horizonBand = smoothstep(18.0, 90.0, length(vPos.xz - uCam.xz));
    col = mix(col, uBruise, horizonBand * 0.35);

    // micro sparkle
    float sp = hash(floor(vPos.xz*6.0) + floor(uTime*2.0));
    col += vec3(0.05, 0.09, 0.14) * step(0.995, sp) * vFoam;

    // manual exponential fog toward the camera distance
    float d = length(vPos - uCam);
    float f = 1.0 - exp(-uFogDensity*uFogDensity*d*d);
    col = mix(col, uFogColor, clamp(f, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function makeWater() {
  const geo = new THREE.PlaneGeometry(600, 600, 190, 190);
  const uniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(PALETTE.water) },
    uCrest: { value: crestsColor() },
    uBruise: { value: new THREE.Color(PALETTE.bruise) },
    uCam: { value: new THREE.Vector3() },
    uFogDensity: { value: 0.011 },
    uFogColor: { value: new THREE.Color(PALETTE.fogColor) },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    uniforms,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  mesh.frustumCulled = false;
  return {
    mesh,
    update(t) {
      uniforms.uTime.value = t;
      uniforms.uCam.value.copy(cameraHolder.position);
    },
    uniforms,
  };
}

// The water shader wants the camera position; a tiny indirection avoids a
// circular import between world.js and scene.js.
export const cameraHolder = { position: new THREE.Vector3() };

function crestsColor() { return new THREE.Color(0x26495f); }

// ── low-poly skull ───────────────────────────────────────────────────────────
// Sculpted from primitives, fused into one geometry per part. Cranium from a
// squashed icosphere, brow ridge, two dark socket pits, cheek wedge, jaw.
export function makeSkull() {
  const parts = [];
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xb8b0a1, roughness: 0.85, flatShading: true });
  const socketMat = new THREE.MeshBasicMaterial({ color: 0x020204 });
  // (materials returned via skullMaterials() for the instanced mesh)

  // cranium
  const cr = new THREE.IcosahedronGeometry(0.42, 1);
  cr.scale(1.0, 0.92, 1.15);
  parts.push({ geo: cr, mat: boneMat });

  // brow ridge — flattened box across the face plane
  const brow = new THREE.BoxGeometry(0.56, 0.1, 0.24);
  brow.translate(0, 0.1, 0.32);
  parts.push({ geo: brow, mat: boneMat });

  // face block
  const face = new THREE.BoxGeometry(0.4, 0.28, 0.34);
  face.translate(0, -0.08, 0.26);
  parts.push({ geo: face, mat: boneMat });

  // cheeks
  for (const x of [-0.22, 0.22]) {
    const ch = new THREE.BoxGeometry(0.12, 0.16, 0.2);
    ch.translate(x, -0.1, 0.24);
    parts.push({ geo: ch, mat: boneMat });
  }

  // jaw — narrow wedge hanging under
  const jaw = new THREE.BoxGeometry(0.34, 0.12, 0.3);
  jaw.translate(0, -0.28, 0.2);
  parts.push({ geo: jaw, mat: boneMat });

  // teeth — small boxes under the face block
  for (let i = 0; i < 5; i++) {
    const th = new THREE.BoxGeometry(0.045, 0.07, 0.03);
    th.translate((i - 2) * 0.075, -0.24, 0.4);
    parts.push({ geo: th, mat: boneMat });
  }

  // eye sockets — dark pits sunk into the face
  for (const x of [-0.16, 0.16]) {
    const sk = new THREE.SphereGeometry(0.1, 8, 6);
    sk.scale(1.25, 1.0, 0.6);
    sk.translate(x, 0.02, 0.38);
    parts.push({ geo: sk, mat: socketMat });
  }

  // nasal aperture
  const nose = new THREE.ConeGeometry(0.05, 0.12, 4);
  nose.rotateX(Math.PI / 2);
  nose.translate(0, -0.12, 0.44);
  parts.push({ geo: nose, mat: socketMat });

  // fuse into one geometry; bone and socket parts bake vertex colors so a
  // single vertexColors material renders the whole skull
  const geos = parts.map((p) => {
    // polyhedra/spheres arrive non-indexed already; converting again warns
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const c = p.mat === boneMat ? [0.72, 0.69, 0.63] : [0.008, 0.008, 0.016];
    for (let i = 0; i < n; i++) { col[i*3] = c[0]; col[i*3+1] = c[1]; col[i*3+2] = c[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  const merged = mergeGeometries(geos);
  return merged;
}

// minimal geometry merge (position/normal/uv/color; non-indexed)
function mergeGeometries(geos) {
  let total = 0;
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of list) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const hasColor = list.some((g) => g.attributes.color);
  const col = hasColor ? new Float32Array(total * 3) : null;
  let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    if (col) {
      if (g.attributes.color) col.set(g.attributes.color.array, o * 3);
      else for (let i = 0; i < g.attributes.position.count; i++) { col[(o + i) * 3] = 1; col[(o + i) * 3 + 1] = 1; col[(o + i) * 3 + 2] = 1; }
    }
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (g_uv_ok(list)) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
// uv only if EVERY part has it, or the attribute count mismatches the draw range
function g_uv_ok(list) { return list.every((g) => g.attributes.uv); }

// ── skull debris field ───────────────────────────────────────────────────────
// Two rings of floating skulls around the raft's path: a few near (bobbing),
// many far (dark silhouettes). All share one InstancedMesh with 2 materials.
export function makeSkullField({ count = 90 } = {}) {
  const geo = makeSkull();
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.85, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, boneMat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const items = [];
  for (let i = 0; i < count; i++) {
    const ring = i < count * 0.3 ? 0 : 1;
    const r = ring === 0 ? 5 + Math.random() * 9 : 14 + Math.random() * 30;
    const a = Math.random() * Math.PI * 2;
    items.push({
      r, a,
      x: Math.cos(a) * r,
      z: Math.sin(a) * r - 40,
      y: 0.05 + Math.random() * 0.5,
      s: 0.5 + Math.random() * 1.6,
      spin: (Math.random() - 0.5) * 0.2,
      bob: Math.random() * Math.PI * 2,
      ring,
    });
  }
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  return {
    mesh,
    items,
    update(t) {
      for (let i = bobCount(items); i--;) {
        const it = items[i];
        e.set(Math.sin(t * 0.5 + it.bob) * 0.3, it.a + t * it.spin, Math.sin(t * 0.5 + it.bob) * 0.18);
        q.setFromEuler(e);
        p.set(it.x, it.y + Math.sin(t * 0.7 + it.bob) * 0.08, it.z);
        s.setScalar(it.s);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
function bobCount(items) { return items.length; }

// ── fog banks ────────────────────────────────────────────────────────────────
// Big soft billboards drifting at distance; they sell depth far better than
// fog density alone, and the water shader fogs them anyway.
export function makeFogBanks({ count = 10 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(120,140,170,0.16)');
  grad.addColorStop(0.6, 'rgba(80,95,120,0.07)');
  grad.addColorStop(1, 'rgba(60,70,90,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);

  const group = new THREE.Group();
  const banks = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const r = 22 + Math.random() * 30;
    const a = Math.random() * Math.PI * 2;
    s.position.set(Math.cos(a) * r, 0.6 + Math.random() * 1.4, Math.sin(a) * r - 40);
    s.scale.set(14 + Math.random() * 18, 3 + Math.random() * 3, 1);
    banks.push({ s, a, r, drift: 0.02 + Math.random() * 0.04 });
    group.add(s);
  }
  return {
    group,
    update(t) {
      for (const b of banks) {
        b.a += b.drift * 0.016;
        b.s.position.x = Math.cos(b.a) * b.r;
        b.s.position.z = Math.sin(b.a) * b.r - 40;
        b.s.material.opacity = 0.35 + Math.sin(t * 0.3 + b.r) * 0.15;
      }
    },
  };
}

// ── drowned ruins ────────────────────────────────────────────────────────────
// Broken columns and arch stubs rising from the water, far off. Silhouette
// material — dark against the bruise, catching a whisper of blue.
export function makeRuins({ count = 14 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 1, flatShading: true });
  const mats = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group();
    const kind = Math.random();
    if (kind < 0.6) {
      // column: stacked drums, slightly toppled
      const h = 2 + Math.random() * 5;
      let y = 0;
      let tilt = 0;
      const drums = 2 + (Math.random() * 3 | 0);
      for (let d = 0; d < drums; d++) {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5 - d * 0.06, 0.56 - d * 0.06, h / drums, 7), mat);
        tilt += (Math.random() - 0.5) * 0.16;
        drum.position.set(Math.sin(tilt) * y, y + h / (drums * 2), 0);
        drum.rotation.z = tilt;
        y += h / drums;
        g.add(drum);
      }
    } else if (kind < 0.85) {
      // arch stub: two columns + fallen lintel
      for (const x of [-1.1, 1.1]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 3 + Math.random() * 2, 7), mat);
        col.position.set(x, 1.6, 0);
        col.rotation.z = (Math.random() - 0.5) * 0.12;
        g.add(col);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 0.7), mat);
      lintel.position.set(0.6, 0.4, 0.4);
      lintel.rotation.z = 0.5 + Math.random() * 0.3;
      g.add(lintel);
    } else {
      // obelisk
      const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.7, 5 + Math.random() * 4, 4), mat);
      ob.position.y = 2.5;
      ob.rotation.z = (Math.random() - 0.5) * 0.1;
      g.add(ob);
    }
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const r = 34 + Math.random() * 26;
    g.position.set(Math.cos(a) * r, -0.4, Math.sin(a) * r - 45);
    g.rotation.y = Math.random() * Math.PI * 2;
    group.add(g);
    mats.push(g);
  }
  return { group, update() {} };
}

// ── the dead moon ────────────────────────────────────────────────────────────
// A pale, wounded disc hanging low. It gives the eye something to anchor on
// and lights nothing — the underworld has no sun.
export function makeDeadMoon() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 118, 4, 128, 128, 120);
  g.addColorStop(0, 'rgba(205,215,225,0.9)');
  g.addColorStop(0.35, 'rgba(150,160,175,0.55)');
  g.addColorStop(0.75, 'rgba(70,80,95,0.22)');
  g.addColorStop(1, 'rgba(20,25,35,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  // craters
  for (let i = 0; i < 14; i++) {
    const x = 40 + Math.random() * 176, y = 30 + Math.random() * 140, r = 3 + Math.random() * 12;
    const cg = ctx.createRadialGradient(x, y, 1, x, y, r);
    cg.addColorStop(0, 'rgba(30,35,45,0.35)');
    cg.addColorStop(1, 'rgba(30,35,45,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(46, 46, 1);
  s.position.set(-60, 26, -160);
  return { mesh: s, update() {} };
}

// ── the void above ───────────────────────────────────────────────────────────
export function makeSky() {
  const geo = new THREE.SphereGeometry(400, 24, 16);
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform float uTime;
      varying vec3 vDir;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float noise(vec3 p){
        vec3 i = floor(p), f = fract(p);
        f = f*f*(3.0-2.0*f);
        float n = mix(
          mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y),
          f.z);
        return n;
      }
      void main(){
        float h = vDir.y * 0.5 + 0.5;
        vec3 col = mix(vec3(0.016, 0.018, 0.031), vec3(0.05, 0.04, 0.09), h);
        float cl = noise(vDir * 3.0 + vec3(0.0, uTime * 0.008, 0.0));
        cl *= noise(vDir * 7.0 - vec3(uTime * 0.012, 0.0, 0.0));
        col += vec3(0.06, 0.05, 0.10) * smoothstep(0.35, 0.75, cl) * smoothstep(-0.1, 0.4, vDir.y);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, update(t) { uniforms.uTime.value = t; } };
}

// ── the glyph field ──────────────────────────────────────────────────────────
// ASCII "stars": rune/digit/punct glyphs scattered across a slow-turning dome.
// They flicker — and every few seconds a handful of them glitch-swap letters,
// like a terminal losing its grip on the sky.
const GLYPHS = '.·:∴∴+*×|=/\\<>[]{}01ⅬⅠΨΩΔΣΞφθλπ#§%&$@?!~^';
function glyphAtlas() {
  const chars = [...GLYPHS];
  const N = Math.ceil(Math.sqrt(chars.length));
  const CELL = 64;
  const c = document.createElement('canvas');
  c.width = c.height = N * CELL;
  const ctx = c.getContext('2d');
  ctx.font = '42px "SF Mono", Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  chars.forEach((ch, i) => {
    const x = (i % N) * CELL + CELL / 2;
    const y = ((i / N) | 0) * CELL + CELL / 2 + 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ch, x, y);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex, N, count: chars.length };
}

export function makeStarfield({ count = 700 } = {}) {
  const atlas = glyphAtlas();
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const aIdx = new Float32Array(count);   // atlas glyph per star
  const aSeed = new Float32Array(count);  // flicker/glitch seed
  const aSize = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // dome distribution: high band above the horizon, some below it too
    const az = Math.random() * Math.PI * 2;
    const el = (Math.random() * 0.85 + 0.02) * (Math.random() < 0.85 ? 1 : -0.4);
    const R = 240;
    pos[i * 3] = Math.cos(az) * Math.cos(el) * R;
    pos[i * 3 + 1] = Math.sin(el) * R * 0.8 + 4;
    pos[i * 3 + 2] = Math.sin(az) * Math.cos(el) * R;
    aIdx[i] = (Math.random() * atlas.count) | 0;
    aSeed[i] = Math.random() * 100;
    aSize[i] = 2.6 + Math.random() * 3.2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aIdx', new THREE.BufferAttribute(aIdx, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));

  const uniforms = {
    uTime: { value: 0 },
    uMap: { value: atlas.tex },
    uGrid: { value: atlas.N },
    uCount: { value: atlas.count },
    uGlitch: { value: 0 },
    uPx: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aIdx;
      attribute float aSeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uGlitch;
      uniform float uPx;
      varying float vIdx;
      varying float vAlpha;
      varying float vTint;
      void main(){
        vIdx = aIdx;
        // slow, individual flicker
        float fl = sin(uTime * (0.4 + fract(aSeed) * 0.9) + aSeed * 7.0);
        vAlpha = 0.22 + 0.3 * smoothstep(-0.2, 1.0, fl);
        // rare hard blink
        if (fract(sin(floor(uTime * 2.0 + aSeed) * 91.17) * 43758.5) > 0.985) vAlpha *= 0.1;
        vTint = fract(aSeed * 0.731);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPx * (0.8 + 0.4 * fract(aSeed * 0.29));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uMap;
      uniform float uGrid;
      uniform float uCount;
      uniform float uTime;
      uniform float uGlitch;
      varying float vIdx;
      varying float vAlpha;
      varying float vTint;
      void main(){
        // occasional glyph-swap: stars change letter during a glitch pulse
        float idx = vIdx;
        if (uGlitch > 0.5 && fract(sin(vIdx * 12.9 + floor(uTime * 9.0)) * 43758.5) > 0.7) {
          idx = fract(idx * 0.618 + uTime) * uCount;
        }
        vec2 cell = vec2(mod(idx, uGrid), floor(idx / uGrid));
        vec2 uv = (cell + gl_PointCoord) / uGrid;
        vec4 g = texture2D(uMap, uv);
        // cool bone-blue range; a few runes lean violet
        vec3 col = mix(vec3(0.62, 0.72, 0.86), vec3(0.75, 0.70, 0.92), vTint);
        gl_FragColor = vec4(col * g.r, g.r * vAlpha);
      }
    `,
  });
  const mesh = new THREE.Points(geo, mat);
  mesh.frustumCulled = false;
  let lastGlitch = -10;
  return {
    mesh,
    update(t) {
      uniforms.uTime.value = t;
      // glitch pulses: 0.4s every ~7–16s
      if (t - lastGlitch > 7 + (Math.sin(t * 0.13) * 0.5 + 0.5) * 9) {
        lastGlitch = t;
        uniforms.uGlitch.value = 1;
      }
      if (uniforms.uGlitch.value > 0 && t - lastGlitch > 0.4) uniforms.uGlitch.value = 0;
      mesh.rotation.y = t * 0.004; // the dome turns, almost imperceptibly
    },
  };
}
