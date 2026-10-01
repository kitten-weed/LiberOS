// ── VANIR · the checkpoints ──────────────────────────────────────────────────
// Stations along the waterway where the ferry moors and the rite pauses.
// Each is a silhouette landmark + a mooring lantern (cool flame) so the
// stop reads at a glance. All sit at z < 0, ahead of the traveler.
import * as THREE from '../../../vendor/three.module.js';

export const STATIONS = [
  { key: 'threshold',  name: 'The Threshold',   z: -60,  sub: 'where the living water ends' },
  { key: 'reflection', name: 'The Mirror Shoals', z: -130, sub: 'where answers pool like glass' },
  { key: 'mirror',     name: 'The House of Mirrors', z: -200, sub: 'where every face is borrowed' },
  { key: 'ledger',     name: 'The Ledger Hall',  z: -270, sub: 'where what is owed is read aloud' },
  { key: 'shore',      name: 'The Far Shore',    z: -340, sub: 'where jars are kept or given to the deep' },
];

export function makeStationMesh(key) {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0f16, roughness: 1, flatShading: true });
  const darker = new THREE.MeshStandardMaterial({ color: 0x080a10, roughness: 1, flatShading: true });
  const bone = new THREE.MeshStandardMaterial({ color: 0x39404a, roughness: 0.9, flatShading: true });

  if (key === 'threshold') {
    // a drowned torii: two pillars, two crossbeams
    const pg = new THREE.CylinderGeometry(0.28, 0.38, 7, 6);
    for (const x of [-2.6, 2.6]) {
      const p = new THREE.Mesh(pg, dark);
      p.position.set(x, 2.6, 0);
      p.rotation.z = (x < 0 ? 1 : -1) * 0.03;
      g.add(p);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.42, 0.5), dark);
    top.position.y = 6.3;
    g.add(top);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.3, 0.4), darker);
    mid.position.y = 5.2;
    g.add(mid);
  } else if (key === 'reflection') {
    // broken ring of standing stones on a shoal
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const h = i % 3 === 0 ? 0.6 : 2.2 + Math.random() * 2;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, h, 5), darker);
      st.position.set(Math.cos(a) * 3.4, h / 2 - 0.3, Math.sin(a) * 3.4);
      st.rotation.z = (Math.random() - 0.5) * 0.2;
      g.add(st);
    }
  } else if (key === 'mirror') {
    // a ruined facade with doorways — the House of Mirrors
    const face = new THREE.Mesh(new THREE.BoxGeometry(9, 8, 0.8), dark);
    face.position.y = 2.6;
    g.add(face);
    for (const x of [-2.4, 0, 2.4]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4.2, 0.3), darker);
      door.position.set(x, 1.6, 0.45);
      g.add(door);
      // a sliver of mirrored glass leaning beside each door
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 2.6),
        new THREE.MeshPhongMaterial({ color: 0x6a86a0, shininess: 100, specular: 0xbfe0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }),
      );
      glass.position.set(x + 1.1, 1.4, 1.1);
      glass.rotation.y = 0.3 + Math.random() * 0.2;
      glass.rotation.z = (Math.random() - 0.5) * 0.1;
      g.add(glass);
    }
  } else if (key === 'ledger') {
    // a gallows-tree hall: crooked posts and hanging slates
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 9, 7), dark);
    trunk.position.y = 3.4;
    trunk.rotation.z = 0.08;
    g.add(trunk);
    for (const [x, z, r] of [[-1.4, 0.3, 0.5], [1.2, -0.4, -0.4]]) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 4.2, 5), dark);
      branch.position.set(x, 6.2, z);
      branch.rotation.z = r;
      g.add(branch);
    }
    for (let i = 0; i < 6; i++) {
      const slate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.04), bone);
      slate.position.set(-2 + i * 0.8, 3.4 - (i % 2) * 0.6, 0.4);
      slate.rotation.z = (Math.random() - 0.5) * 0.25;
      g.add(slate);
    }
  } else if (key === 'shore') {
    // the far shore: a black beach, a door, two lantern posts
    const beach = new THREE.Mesh(new THREE.CylinderGeometry(16, 18, 1.2, 24), darker);
    beach.position.y = -0.7;
    g.add(beach);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5, 0.4), dark);
    door.position.set(0, 2.2, -2);
    g.add(door);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 0.6), dark);
    lintel.position.set(0, 4.8, -2);
    g.add(lintel);
    for (const x of [-4.5, 4.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.6, 5), dark);
      post.position.set(x, 1, -1);
      g.add(post);
    }
  }

  return g;
}

// mooring lantern: post + cool flame + light — the ferry's "stop here" cue
export function makeLantern() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.1, 1.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.7, metalness: 0.6, flatShading: true }),
  );
  post.position.y = 0.8;
  g.add(post);
  const cage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.11, 0.3, 6, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.6, metalness: 0.8, flatShading: true, side: THREE.DoubleSide }),
  );
  cage.position.y = 1.62;
  g.add(cage);
  const flameMat = new THREE.SpriteMaterial({
    map: (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const gr = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
      gr.addColorStop(0, 'rgba(214,236,255,0.95)');
      gr.addColorStop(0.4, 'rgba(120,185,255,0.4)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })(),
    transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const flame = new THREE.Sprite(flameMat);
  flame.scale.setScalar(0.85);
  flame.position.y = 1.64;
  g.add(flame);
  const light = new THREE.PointLight(0x5aa8e8, 9, 14, 1.8);
  light.position.y = 1.7;
  g.add(light);
  return { g, flame, flameMat, light };
}
