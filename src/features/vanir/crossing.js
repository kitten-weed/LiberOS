// ── VANIR · the crossing ─────────────────────────────────────────────────────
// Scene controller: renderer, camera, orchestration of water/raft/ferryman,
// the bob of the hull, the sway of the torch. Exposes a tiny API the UI uses.
import * as THREE from '../../../vendor/three.module.js';
import { makeWater, makeSkullField, makeSky, makeFog, makeFogBanks, makeRuins, makeDeadMoon, makeStarfield, cameraHolder } from './world.js?v=fx1';
import { STATIONS, makeStationMesh, makeLantern } from './stations.js';
import { makeRaft, makeFerryman } from './raft.js';
import { requestVisibleFrame, safeRenderer } from '../../three-shared.js';

export function createCrossing(container) {
  // No WebGL, no crossing: hand back a still scene — every HUD call checks
  // for the pieces it needs, so the rite above the water still completes.
  const renderer = safeRenderer({ antialias: true });
  if (!renderer) {
    return {
      setRowing() {},
      sealJar() {},
      releaseJar() {},
      sailTo(key, onArrive) { if (onArrive) onArrive(); },
      stations: [],
    };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // the renderer lives inside the CRT's screen box, not the window
  const fitToScreen = () => {
    const r = container.getBoundingClientRect();
    renderer.setSize(Math.max(2, r.width), Math.max(2, r.height), false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  };

  const scene = new THREE.Scene();
  scene.fog = makeFog();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(56, 4 / 3, 0.1, 500);
  camera.position.set(0, 2.45, 4.4);
  fitToScreen();

  // almost no ambient — the torch does the lighting; a whisper of cool fill
  // keeps the hull and the ferryman from dissolving into the void
  scene.add(new THREE.AmbientLight(0x223344, 0.85));
  const fill = new THREE.DirectionalLight(0x51637f, 0.65);
  fill.position.set(2.5, 4, 6);
  scene.add(fill);
  const moonless = new THREE.DirectionalLight(0x111426, 0.6);
  moonless.position.set(-4, 10, -6);
  scene.add(moonless);

  const water = makeWater();
  scene.add(water.mesh);
  const sky = makeSky();
  scene.add(sky.mesh);
  const skulls = makeSkullField({ count: 90 });
  scene.add(skulls.mesh);
  const fogBanks = makeFogBanks();
  scene.add(fogBanks.group);
  const ruins = makeRuins();
  scene.add(ruins.group);
  const moon = makeDeadMoon();
  scene.add(moon.mesh);
  const stars = makeStarfield();
  scene.add(stars.mesh);

  const raft = makeRaft();
  scene.add(raft.group);
  const ferryman = makeFerryman();
  raft.group.add(ferryman.group);

  // ── the stations of the crossing ──
  const stationRigs = STATIONS.map((st) => {
    const mesh = makeStationMesh(st.key);
    mesh.position.set(0, 0, st.z);
    scene.add(mesh);
    const lantern = makeLantern();
    lantern.g.position.set(2.6, 0, st.z + 3.2);
    scene.add(lantern.g);
    return { ...st, mesh, lantern };
  });

  let rowing = false;
  let rowSpeed = 0;
  let boatZ = 0;          // the raft's true z position
  let targetZ = null;     // when set, the ferry is sailing toward this z
  let arriveCb = null;    // called when the ferry moors
  const FAST = new URLSearchParams(location.search).has('fast'); // test harness: short legs
  const sailSpeed = FAST ? 0.24 : 0.055;
  const clock = new THREE.Timer();

  function tick() {
    clock.update();
    const t = clock.getElapsed();

    // voyage: sail toward targetZ, then moor
    if (targetZ !== null && boatZ > targetZ) {
      rowing = true;
      boatZ -= sailSpeed;
      if (boatZ <= targetZ) {
        boatZ = targetZ;
        targetZ = null;
        rowing = false;
        const cb = arriveCb; arriveCb = null;
        if (cb) cb();
      }
    }
    rowSpeed += ((rowing ? 1 : 0) - rowSpeed) * 0.02;

    raft.group.position.z = boatZ;
    // keep water/sky/fog wrapping around the raft so the voyage feels endless
    skulls.mesh.position.z = boatZ;
    water.mesh.position.z = boatZ;
    sky.mesh.position.set(0, 0, boatZ);
    fogBanks.group.position.z = boatZ;
    ruins.group.position.z = boatZ;
    moon.mesh.position.z = boatZ - 160;

    // hull bob & sway — the waterline sits well below the planks
    raft.group.position.y = Math.sin(t * 0.9) * 0.028 + Math.sin(t * 1.7 + 1) * 0.012;
    raft.group.rotation.z = Math.sin(t * 0.7) * 0.012 + rowSpeed * 0.008;
    raft.group.rotation.x = Math.sin(t * 1.1 + 2) * 0.01 + rowSpeed * 0.012;

    // camera rides *on* the raft: fixed distance fore of the stern bench,
    // inheriting every bob so the deck never slides away beneath you
    const cx = Math.sin(t * 0.23) * 0.16;
    camera.position.x += (cx - camera.position.x) * 0.03;
    camera.position.y = raft.group.position.y + 1.62 + Math.sin(t * 0.8) * 0.03 - rowSpeed * 0.05;
    camera.position.z = boatZ + 2.55;
    camera.lookAt(0, 0.72, boatZ - 3.2); // look down-deck, past the jar

    stars.update(t);

    // station lanterns flicker as you pass
    for (const st of stationRigs) {
      st.lantern.flameMat.opacity = 0.65 + Math.sin(t * 5.1 + st.z) * 0.18;
      st.lantern.light.intensity = 9 + Math.sin(t * 6.3 + st.z) * 1.6;
    }

    // raft life: torch, embers, jar, ferryman
    raft.update(t);
    ferryman.update(t, rowing);
    skulls.update(t);
    water.update(t);
    sky.update(t);
    fogBanks.update(t);
    ruins.update(t);
    moon.update(t);
    cameraHolder.position.copy(camera.position);

    renderer.render(scene, camera);
    requestVisibleFrame(tick); // skip frames while the tab hides — no clock jump on return
  }
  tick();
  window.__vanir = { renderer, scene, camera }; // debug hook

  window.addEventListener('resize', fitToScreen);
  if (window.ResizeObserver) new ResizeObserver(fitToScreen).observe(container);

  return {
    setRowing(v) { rowing = v; },
    sealJar: (text) => raft.sealJar(text),
    releaseJar: () => raft.releaseJar(),
    // sail to the next checkpoint; onArrive fires once the ferry moors
    sailTo(key, onArrive) {
      const st = stationRigs.find((s) => s.key === key);
      if (!st) { if (onArrive) onArrive(); return; }
      targetZ = st.z + 5.5; // moor just short of the landmark
      arriveCb = onArrive;
    },
    stations: stationRigs,
  };
}
