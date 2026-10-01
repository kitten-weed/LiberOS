/* Poppet Lab — dioramic scene: lab table, background, needle spike, jar + bomb for the burn ceremony */
import * as THREE from '../vendor/three.module.js';

export function V(x, y, z) { return new THREE.Vector3(x, y, z); }

export function buildScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
  // house grade (2026-10-01): ACES rolloff + warm VOID, matching the other rooms.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0a08);
  scene.fog = new THREE.Fog(0x0d0a08, 8.5, 17);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);

  scene.add(new THREE.HemisphereLight(0xcfd6e2, 0x1a140e, 0.75));
  const key = new THREE.DirectionalLight(0xffe8c8, 1.05);
  key.position.set(2.4, 3.8, 2.6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ab0d0, 0.55);
  rim.position.set(-2.8, 2.4, -2.6);
  scene.add(rim);
  const lamp = new THREE.PointLight(0xffc890, 0.0, 5.5, 2);   // burn glow, ramps up
  lamp.position.set(0, 2.2, 0);
  scene.add(lamp);

  const lab = new THREE.Group();
  scene.add(lab);

  /* ── the lab table ── */
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2c1c, roughness: 0.85, metalness: 0.04 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x2a1d11, roughness: 0.9, metalness: 0.03 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 2.3), woodMat);
  top.position.y = -0.12;
  lab.add(top);
  // plank seams
  for (let i = -2; i <= 2; i++) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 2.28), woodDark);
    seam.position.set(i * 0.87, -0.058, 0);
    lab.add(seam);
  }
  const legG = new THREE.BoxGeometry(0.16, 1.7, 0.16);
  [[-1.95, -0.9], [1.95, -0.9], [-1.95, 0.9], [1.95, 0.9]].forEach(function (p) {
    const leg = new THREE.Mesh(legG, woodDark);
    leg.position.set(p[0], -1.03, p[1]);
    lab.add(leg);
  });

  /* ── background wall: brick + pegboard + shelves ── */
  const brickTex = makeBrickTexture();
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 5.2),
    new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95, color: 0x8a8078 })
  );
  wall.position.set(0, 1.6, -2.2);
  lab.add(wall);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12.4, 9),   // wide enough for the sealed circle to ring the table
    new THREE.MeshStandardMaterial({ color: 0x191512, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.88;
  lab.add(floor);

  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x33261a, roughness: 0.88 });
  const shelfG = new THREE.BoxGeometry(1.7, 0.055, 0.42);
  const propGlass = new THREE.MeshStandardMaterial({ color: 0x6a8f7a, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.55 });
  const propBook = new THREE.MeshStandardMaterial({ color: 0x4a2c20, roughness: 0.9 });
  const propBook2 = new THREE.MeshStandardMaterial({ color: 0x2c3448, roughness: 0.9 });
  [[-1.55, 1.62], [1.55, 1.62]].forEach(function (p, si) {
    const s = new THREE.Mesh(shelfG, shelfMat);
    s.position.set(p[0], p[1], -1.92);
    lab.add(s);
    // little props
    for (let b = 0; b < 3; b++) {
      const bk = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.2), b === 1 ? propBook2 : propBook);
      bk.position.set(p[0] - 0.6 + b * 0.12, p[1] + 0.16, -1.9);
      lab.add(bk);
    }
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.24, 12), propGlass);
    jar.position.set(p[0] + 0.45, p[1] + 0.15, -1.9);
    lab.add(jar);
    if (si === 0) {
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshStandardMaterial({ color: 0xcfc3a8, roughness: 0.8 }));
      skull.position.set(p[0] + 0.1, p[1] + 0.17, -1.88);
      skull.scale.set(1, 0.9, 1.1);
      lab.add(skull);
    }
  });

  /* ── the needle spike: poppet is impaled on this ── */
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.35, metalness: 0.85 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xa8862e, roughness: 0.4, metalness: 0.75 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.1, 24), brassMat);
  base.position.y = -0.01;   // flush on the tabletop (top surface at y −0.06)
  lab.add(base);
  const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.05, 1.1, 10), spikeMat);
  spike.position.y = 0.6;
  lab.add(spike);          // cone tip: CylinderGeometry(topR < bottomR) → top at y 1.15
  const SPIKE_TIP_Y = 1.15;

  /* ── the glass jar (dropped by BURN) ── */
  const jarGlass = new THREE.MeshPhysicalMaterial({
    color: 0xbfd8cf, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.22,
    side: THREE.DoubleSide, depthWrite: false
  });
  const jar = new THREE.Group();
  const jarWall = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 2.3, 36, 1, true), jarGlass);
  jarWall.position.y = 1.15;
  jar.add(jarWall);
  const jarFloor = new THREE.Mesh(new THREE.CircleGeometry(0.78, 36), jarGlass);
  jarFloor.rotation.x = -Math.PI / 2;
  jar.add(jarFloor);
  const jarLip = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.022, 8, 36), new THREE.MeshStandardMaterial({ color: 0x8fa8a0, roughness: 0.3, metalness: 0.2 }));
  jarLip.rotation.x = Math.PI / 2;
  jarLip.position.y = 2.3;
  jar.add(jarLip);
  jar.visible = false;
  scene.add(jar);

  /* ── the bomb: sphere + fuse, drops in, explodes ── */
  const bomb = new THREE.Group();
  const bombBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 24, 18),
    new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.45, metalness: 0.35 })
  );
  bomb.add(bombBall);
  const bombCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, 0.09, 12),
    new THREE.MeshStandardMaterial({ color: 0x6a6f78, roughness: 0.4, metalness: 0.8 })
  );
  bombCollar.position.y = 0.3;
  bomb.add(bombCollar);
  const fuse = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.22, 6),
    new THREE.MeshStandardMaterial({ color: 0xb8a888, roughness: 0.95 })
  );
  fuse.position.y = 0.44;
  fuse.rotation.z = 0.3;
  bomb.add(fuse);
  const fuseSpark = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('#ffd070'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  fuseSpark.position.set(0.066, 0.56, 0);
  fuseSpark.scale.setScalar(0.22);
  fuseSpark.visible = false;
  bomb.add(fuseSpark);
  bomb.visible = false;
  scene.add(bomb);

  /* ── blast effect pool ── */
  const blasts = [];
  for (let i = 0; i < 26; i++) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(i % 3 === 0 ? '#ff9a40' : (i % 3 === 1 ? '#ffd070' : '#ff5020')),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    spr.visible = false;
    scene.add(spr);
    blasts.push({ spr, v: V(0, 0, 0), life: 0, max: 1, size: 1 });
  }
  const smokePool = [];
  for (let i = 0; i < 18; i++) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('#545058'), transparent: true, depthWrite: false, opacity: 0.4
    }));
    spr.visible = false;
    scene.add(spr);
    smokePool.push({ spr, v: V(0, 0, 0), life: 0, max: 1, size: 1 });
  }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('#fff0c0'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  flash.visible = false;
  scene.add(flash);

  /* ── burn residue: a scorch ring, an ash heap, and dying embers ──
     Scorch + ash persist between ceremonies (the table remembers each burn);
     embers are a small flickering pool that dies out after each blast. */
  const charMat = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.95 });
  const charMat2 = new THREE.MeshStandardMaterial({ color: 0x241c14, roughness: 0.9 });
  const scorch = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 26),
    new THREE.MeshStandardMaterial({ map: makeScorchTexture(), transparent: true, opacity: 0, roughness: 1, depthWrite: false })
  );
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.set(0, -0.055, 0);   // a hair above the tabletop (top surface y −0.06)
  scorch.visible = false;
  scene.add(scorch);

  const ashHeap = new THREE.Group();
  ashHeap.position.set(0, -0.052, 0);   // just above the tabletop
  ashHeap.visible = false;
  scene.add(ashHeap);
  const ashGeoCache = [new THREE.IcosahedronGeometry(1, 0), new THREE.TetrahedronGeometry(1, 0)];
  function spawnAsh() {
    ashHeap.clear();
    const gray = new THREE.Color(0x3a3632);
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(ashGeoCache[i % 2], i % 3 === 0 ? charMat : charMat2);
      const r = Math.pow(Math.random(), 0.7) * 0.34;
      const a = Math.random() * Math.PI * 2;
      const s = 0.02 + Math.random() * 0.06;
      m.position.set(Math.cos(a) * r, Math.random() * 0.012, Math.sin(a) * r);
      m.scale.set(s * (0.6 + Math.random()), s * 0.45, s * (0.6 + Math.random()));
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      ashHeap.add(m);
    }
    for (let i = 0; i < 7; i++) {
      const chip = new THREE.Mesh(ashGeoCache[i % 2], charMat);
      const r = 0.42 + Math.random() * 0.55;
      const a = Math.random() * Math.PI * 2;
      const s = 0.014 + Math.random() * 0.03;
      chip.position.set(Math.cos(a) * r, 0.004, Math.sin(a) * r);
      chip.scale.set(s * (0.7 + Math.random()), s * 0.4, s * (0.7 + Math.random()));
      chip.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      ashHeap.add(chip);
    }
    ashHeap.visible = true;
  }

  const embers = [];
  for (let i = 0; i < 14; i++) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(i % 2 ? '#ff8a30' : '#ffcf60'),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    spr.visible = false;
    scene.add(spr);
    embers.push({ spr, t: 0, dur: 1, pos: V(0, 0, 0), drift: V(0, 0, 0) });
  }
  function sparkEmbers() {
    embers.forEach(function (e, i) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.42;
      e.pos.set(Math.cos(a) * r, -0.035, Math.sin(a) * r);
      e.drift.set((Math.random() - 0.5) * 0.12, 0.16 + Math.random() * 0.22, (Math.random() - 0.5) * 0.12);
      e.t = 0;
      // a few embers are 'coals': they stay low in the ash and gutter for a long time
      if (i % 3 === 0) {
        e.drift.set((Math.random() - 0.5) * 0.02, 0.01, (Math.random() - 0.5) * 0.02);
        e.dur = 7 + Math.random() * 5;
      } else {
        e.dur = 1.8 + Math.random() * 2.6;
      }
      e.spr.visible = true;
    });
  }

  /* ── void ambiance: drifting dust motes and far hanging lanterns —
     the camera pans, so the dark has to be alive ── */
  const dustMotes = [];
  for (let i = 0; i < 42; i++) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(i % 4 === 0 ? '#c8b48a' : '#8a94a8'),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.16 + Math.random() * 0.14
    }));
    spr.visible = true;
    spr.scale.setScalar(0.02 + Math.random() * 0.05);
    const a = Math.random() * Math.PI * 2;
    const rad = 1.2 + Math.random() * 4.2;
    const mote = {
      spr: spr,
      v: V((Math.random() - 0.5) * 0.06, 0.012 + Math.random() * 0.024, (Math.random() - 0.5) * 0.06),
      home: V(Math.cos(a) * rad, -0.4 + Math.random() * 3.6, Math.sin(a) * rad * 0.7 - 0.6),
      sway: Math.random() * Math.PI * 2
    };
    spr.position.copy(mote.home);
    scene.add(spr);
    dustMotes.push(mote);
  }
  const lanterns = [];
  [[-3.4, 2.5, -1.6, '#ffb060'], [3.8, 2.9, -2.0, '#ffa050'], [2.6, 3.3, 1.8, '#ffc080']].forEach(function (lp) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(lp[3]), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5
    }));
    spr.position.set(lp[0], lp[1], lp[2]);
    spr.scale.setScalar(0.5);
    scene.add(spr);
    // the wire it hangs from
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 4.4, 4),
      new THREE.MeshBasicMaterial({ color: 0x0d0b09 })
    );
    wire.position.set(lp[0], lp[1] + 2.2, lp[2]);
    scene.add(wire);
    lanterns.push({ spr: spr, seed: Math.random() * 7 });
  });

  /* ── hermetic furnishing: the sealed circle, the planetary band, the sheen,
     the spiritus orb — quiet geometry, nothing that clutters the worktop ── */
  function sigilTexture(w, h, draw) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }
  // the seal: a broad ring of small marks that circles the whole table
  const sealTex = sigilTexture(1024, 1024, function (g, w, h) {
    const c = w / 2;
    g.strokeStyle = 'rgba(196, 152, 74, 0.9)';
    g.lineWidth = 7;
    g.beginPath(); g.arc(c, c, 470, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3;
    g.beginPath(); g.arc(c, c, 430, 0, Math.PI * 2); g.stroke();
    // runic ticks between the rings — every 15°, longer every 90°
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12, long = i % 6 === 0;
      const r0 = long ? 402 : 420, r1 = 452;
      g.lineWidth = long ? 5 : 2.5;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
      g.stroke();
      // a small glyph — circle, cross, or triangle
      const gr = long ? 372 : 384;
      const gx = c + Math.cos(a) * gr, gy = c + Math.sin(a) * gr;
      g.lineWidth = 2.5;
      g.beginPath();
      if (i % 3 === 0) { g.arc(gx, gy, 9, 0, Math.PI * 2); }
      else if (i % 3 === 1) { g.moveTo(gx - 9, gy); g.lineTo(gx + 9, gy); g.moveTo(gx, gy - 9); g.lineTo(gx, gy + 9); }
      else { g.moveTo(gx, gy - 10); g.lineTo(gx + 9, gy + 7); g.lineTo(gx - 9, gy + 7); g.closePath(); }
      g.stroke();
    }
  });
  const sealMat = new THREE.MeshBasicMaterial({ map: sealTex, transparent: true, opacity: 0.8, depthWrite: false });
  const seal = new THREE.Mesh(new THREE.RingGeometry(2.9, 3.32, 96), sealMat);
  seal.rotation.x = -Math.PI / 2;
  seal.position.y = -1.872;   // drawn on the floor (y −1.88), ringing the whole table
  seal.renderOrder = -1;
  scene.add(seal);

  // the planetary band: an ochre strip of chevrons and sigils on the back wall
  const bandTex = sigilTexture(1024, 128, function (g, w, h) {
    g.fillStyle = 'rgba(122, 86, 30, 0.55)';
    g.fillRect(0, h * 0.36, w, h * 0.28);
    g.strokeStyle = 'rgba(196, 152, 74, 0.85)';
    g.lineWidth = 3;
    g.strokeRect(0, h * 0.36, w, h * 0.28);
    for (let i = 0; i < 16; i++) {
      const x = (i + 0.5) * (w / 16);
      g.save();
      g.translate(x, h / 2);
      g.strokeStyle = 'rgba(210, 170, 96, 0.9)';
      g.lineWidth = 3;
      g.beginPath();
      if (i % 4 === 0) { g.arc(0, 0, 12, 0, Math.PI * 2); g.moveTo(18, 0); g.lineTo(30, 0); }
      else if (i % 4 === 1) { g.moveTo(-12, -12); g.lineTo(0, 12); g.lineTo(12, -12); }
      else if (i % 4 === 2) { g.moveTo(-12, 10); g.lineTo(0, -10); g.lineTo(12, 10); }
      else { g.arc(0, 0, 12, Math.PI * 0.2, Math.PI * 1.8); g.moveTo(0, -12); g.lineTo(0, 12); }
      g.stroke();
      g.restore();
    }
  });
  const band = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 0.83),
    new THREE.MeshBasicMaterial({ map: bandTex, transparent: true, opacity: 0.7, depthWrite: false })
  );
  band.position.set(0, 2.75, -2.19);   // on the brick wall (z −2.2), above the shelves
  scene.add(band);

  // the sheen: one slow breath of light across the worktop
  const sheenTex = sigilTexture(512, 512, function (g, w, h) {
    const gr = g.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w * 0.48);
    // many stops — a coarse gradient bands into rings on dark wood
    gr.addColorStop(0, 'rgba(255, 226, 170, 0.5)');
    gr.addColorStop(0.22, 'rgba(255, 226, 170, 0.34)');
    gr.addColorStop(0.45, 'rgba(255, 226, 170, 0.2)');
    gr.addColorStop(0.68, 'rgba(255, 226, 170, 0.09)');
    gr.addColorStop(0.85, 'rgba(255, 226, 170, 0.03)');
    gr.addColorStop(1, 'rgba(255, 226, 170, 0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const sheen = new THREE.Mesh(
    new THREE.PlaneGeometry(4.3, 2.3),
    new THREE.MeshBasicMaterial({ map: sheenTex, transparent: true, opacity: 0.12, depthWrite: false })
  );
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.y = -0.03;   // a breath above the worktop, under the poppet
  sheen.renderOrder = -1;
  scene.add(sheen);

  // the spiritus: a sealed glass orb with a warm mote, drifting above the back
  const spiritus = new THREE.Group();
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 24, 18),
    new THREE.MeshPhysicalMaterial({ color: 0xcfe0d8, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.22 })
  );
  spiritus.add(orb);
  const orbCap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.02, 10), new THREE.MeshStandardMaterial({ color: 0xa8862e, roughness: 0.35, metalness: 0.75 }));
  orbCap.position.y = 0.09;
  spiritus.add(orbCap);
  const moteSpr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('#ffd9a0'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9
  }));
  moteSpr.scale.setScalar(0.09);
  spiritus.add(moteSpr);
  spiritus.position.set(-1.35, 1.55, -2.0);   // drifting near the wall, out of the working light
  scene.add(spiritus);

  function sparkBurst(origin, power) {
    let used = 0;
    blasts.forEach(function (b) {
      if (used >= power || b.life > 0) return;
      used++;
      b.life = b.max = 0.7 + Math.random() * 0.7;
      b.size = 0.14 + Math.random() * 0.3;
      b.spr.visible = true;
      b.spr.position.copy(origin).add(V((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2));
      const az = Math.random() * Math.PI * 2, el = Math.random() * Math.PI;
      const sp = 2.2 + Math.random() * 3;
      b.v.set(Math.sin(el) * Math.cos(az), Math.cos(el) * 0.9 + 0.5, Math.sin(el) * Math.sin(az)).multiplyScalar(sp);
    });
    for (let i = 0; i < 7; i++) {
      const s = smokePool[i];
      if (s.life > 0) continue;
      s.life = s.max = 1.6 + Math.random() * 1.2;
      s.size = 0.4 + Math.random() * 0.5;
      s.spr.visible = true;
      s.spr.position.copy(origin).add(V((Math.random() - 0.5) * 0.4, Math.random() * 0.3, (Math.random() - 0.5) * 0.4));
      s.v.set((Math.random() - 0.5) * 0.7, 0.5 + Math.random() * 0.6, (Math.random() - 0.5) * 0.7);
    }
    flash.visible = true;
    flash.position.copy(origin);
    flash.scale.setScalar(2.2);
    flash.material.opacity = 0.95;
  }

  let tGlow = 0;
  function updateFX(dt) {
    tGlow += dt;
    blasts.forEach(function (b) {
      if (b.life <= 0) return;
      b.life -= dt;
      if (b.life <= 0) { b.spr.visible = false; return; }
      b.v.y -= 3.2 * dt;
      b.spr.position.addScaledVector(b.v, dt);
      const f = b.life / b.max;
      b.spr.material.opacity = f;
      b.spr.scale.setScalar(b.size * (0.5 + (1 - f) * 1.1));
    });
    smokePool.forEach(function (s) {
      if (s.life <= 0) return;
      s.life -= dt;
      if (s.life <= 0) { s.spr.visible = false; return; }
      s.v.y += 0.12 * dt;
      s.spr.position.addScaledVector(s.v, dt);
      const f = s.life / s.max;
      s.spr.material.opacity = 0.34 * f;
      s.spr.scale.setScalar(s.size * (1.6 - f * 0.8));
    });
    if (flash.visible) {
      flash.material.opacity -= dt * 3.4;
      if (flash.material.opacity <= 0) flash.visible = false;
    }
    embers.forEach(function (e) {
      if (!e.spr.visible) return;
      e.t += dt;
      if (e.t >= e.dur) { e.spr.visible = false; return; }
      e.pos.addScaledVector(e.drift, dt);
      e.drift.y -= 0.03 * dt;   // gentle rise, faltering
      e.spr.position.copy(e.pos);
      const f = e.t / e.dur;
      const flicker = 0.55 + 0.45 * Math.sin(e.t * 21 + e.pos.x * 9);
      e.spr.material.opacity = Math.min(1, (1 - f) * 1.6) * (0.4 + 0.6 * flicker);
      e.spr.scale.setScalar(0.05 + (1 - f) * 0.05);
    });
    for (let i = 0; i < dustMotes.length; i++) {
      const m = dustMotes[i];
      m.sway += dt * 0.5;
      m.spr.position.x += (m.v.x + Math.sin(m.sway) * 0.014) * dt * 8;
      m.spr.position.y += m.v.y * dt * 8;
      m.spr.position.z += (m.v.z + Math.cos(m.sway * 0.7) * 0.01) * dt * 8;
      if (m.spr.position.y > 3.4) m.spr.position.y = -0.5;   // motes rise and recycle
      if (Math.abs(m.spr.position.x - m.home.x) > 2.2) m.spr.position.x = m.home.x;
      if (Math.abs(m.spr.position.z - m.home.z) > 1.8) m.spr.position.z = m.home.z;
    }
    for (let i = 0; i < lanterns.length; i++) {
      const l = lanterns[i];
      l.spr.material.opacity = 0.42 + Math.sin(tGlow + l.seed) * 0.07 + Math.sin(tGlow * 2.7 + l.seed * 2) * 0.04;
      l.spr.scale.setScalar(0.46 + Math.sin(tGlow * 1.3 + l.seed) * 0.05);
    }
    if (lamp.intensity > 0) lamp.intensity = Math.max(0, lamp.intensity - dt * 2.4);
    // the hermetic furniture breathes: sheen sweeps, orb drifts, seal answers the burn
    tHermetic += dt;
    sheen.material.opacity = 0.09 + Math.sin(tHermetic * 0.07) * 0.05;
    sheen.rotation.z = tHermetic * 0.02;
  spiritus.position.y = 1.55 + Math.sin(tHermetic * 0.55) * 0.06;
  spiritus.position.x = -1.35 + Math.sin(tHermetic * 0.21) * 0.1;
    moteSpr.material.opacity = 0.7 + Math.sin(tHermetic * 1.7) * 0.25;
    const ritual = Math.min(1, lamp.intensity / 2.5);
    sealMat.opacity = 0.8 + ritual * Math.sin(tHermetic * 6) * 0.2;
  }
  let tHermetic = 0;

  return {
    renderer, scene, camera, lab, lamp, sparkBurst, updateFX,
    spike, jar, bomb, fuseSpark, SPIKE_TIP_Y,
    spawnAsh, sparkEmbers, scorch, seal, spiritus, band
  };
}

/* ── textures ── */
function makeScorchTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 6, 128, 128, 124);
  gr.addColorStop(0, 'rgba(8, 6, 4, 0.85)');
  gr.addColorStop(0.45, 'rgba(16, 12, 8, 0.5)');
  gr.addColorStop(0.78, 'rgba(24, 16, 10, 0.18)');
  gr.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  // faint cracks radiating outward
  g.strokeStyle = 'rgba(6, 4, 3, 0.5)';
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2;
    g.lineWidth = 1 + Math.random() * 1.6;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * 8, 128 + Math.sin(a) * 8);
    g.lineTo(128 + Math.cos(a) * (34 + Math.random() * 52), 128 + Math.sin(a) * (34 + Math.random() * 52));
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function makeBrickTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#4a4038';
  g.fillRect(0, 0, 512, 256);
  const bw = 64, bh = 26;
  for (let y = 0; y < 256 / bh; y++) {
    for (let x = -1; x < 512 / bw; x++) {
      const ox = y % 2 ? bw / 2 : 0;
      const v = 0.85 + Math.random() * 0.3;
      const r = Math.floor(96 * v), gr = Math.floor(74 * v), b = Math.floor(62 * v);
      g.fillStyle = 'rgb(' + r + ',' + gr + ',' + b + ')';
      g.fillRect(x * bw + ox + 2, y * bh + 2, bw - 4, bh - 4);
    }
  }
  g.fillStyle = 'rgba(20, 14, 10, 0.35)';
  for (let i = 0; i < 60; i++) {
    g.fillRect(Math.random() * 512, Math.random() * 256, 20 + Math.random() * 60, 2 + Math.random() * 10);
  }
  const tex = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.6, 1);
  return tex;
}
function makeGlowTexture(color) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, color);
  gr.addColorStop(0.35, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
