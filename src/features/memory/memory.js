// memory.js — the Memory room: a sand tray, a crate of toys, four machines,
// and three empty photographs waiting to become a story.
//
// Based on sandplay therapy (Dora Kalff's "free and protected space"; the
// studies panel says so in the room). The 3d floor: a heightfield basin
// (sand.js), figures and furniture (figures.js), tools as brushes over the
// field, and machines that transform one figure at a time.
//
// Diegetic rule: the room's interface is the room's furniture. The toys sit
// IN the crate; the tools stand on the floor and are picked up by clicking
// them; the machines take a figure that is dragged to their door. The DOM
// layer keeps only the status line, the photo rite, and a screen-reader
// index of the crate's contents.
//
// The room remembers: the tray, its figures and the hung photographs persist
// to the journal's state and are rebuilt on return.
//
// Degrades to a flat note without WebGL; reduced motion stills the camera.

import * as THREE from '../../../vendor/three.module.js';
import { requestVisibleFrame } from '../../three-shared.js';
import { createSand, HALF } from './sand.js?v=tool3';
import {
  TOYS, MACHINES, buildFigure, makeMachine, randomizeFigure, shadowDoubleOf,
  makeCrate, makeToolMesh, woodTexture,
} from './figures.js?v=plastic14';

(function () {
  'use strict';

  const fieldEl = document.getElementById('mem-field');
  if (!fieldEl) return;

  const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sub = document.getElementById('mem-sub');
  const labelsEl = document.getElementById('mem-labels');
  const stringEl = document.getElementById('mem-string');

  function say(line) { if (sub) sub.textContent = line; }

  /* ── state ─────────────────────────────────────────────────────────── */

  const S = {
    placed: [],          // figure groups in the tray
    photos: [],          // { dataUrl, label, at }
    tool: 'hand',
    paintColor: '#b03030',
    picking: null,       // { fig } while naming
    busy: false,         // a machine is chewing
    done: false,         // story completed and saved
  };

  function st() { return (window.Liber && window.Liber.state) || null; }
  function getState() { try { return (st() && st().get()) || {}; } catch (e) { return {}; } }
  function player() { return getState().travellerAlias || 'traveller'; }
  function thunk() { try { window.Liber && window.Liber.sound && window.Liber.sound.play('thunk'); } catch (e) {} }
  function chime() { try { window.Liber && window.Liber.sound && window.Liber.sound.play('chime'); } catch (e) {} }

  /* ── the scene ─────────────────────────────────────────────────────── */

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (e) {
    const note = document.getElementById('mem-flatnote');
    if (note) note.hidden = false;
    return;
  }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  fieldEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120e0a);
  scene.fog = new THREE.Fog(0x120e0a, 20, 46);

  const camera = new THREE.PerspectiveCamera(48, 4 / 3, 0.1, 80);
  const WIDE = new URLSearchParams(location.search).has('wide');

  // ── light: the hanging bulb over the tray, the window's cold witness ──
  // lifted ambient and a warm bounce fill: the room is cozy, not cave-dark
  const ambient = new THREE.AmbientLight(0x584a38, 1.5);
  scene.add(ambient);
  // 185 (from 560): tuned to match the flicker loop and setLamp — the tray's
  // highlights no longer clip to pure white under the one warm sun of the room
  const lamp = new THREE.SpotLight(0xffd9a0, 185, 44, Math.PI / 2.2, 0.8, 1.4);
  lamp.position.set(7.7, 2.92, -5.3);   // at the floor lamp's bulb, aimed across the whole tray
  lamp.target.position.set(-0.3, 0, 0.3);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.0006;
  lamp.shadow.normalBias = 0.028;
  lamp.shadow.camera.near = 0.6;
  lamp.shadow.camera.far = 22;
  scene.add(lamp, lamp.target);
  // a warm bounce off the boards, so furniture sides never go dead black
  const bounce = new THREE.PointLight(0xb89058, 90, 30, 2.0);
  bounce.position.set(-2, 3.2, -3);
  scene.add(bounce);
  const windowLight = new THREE.DirectionalLight(0x8a9ac4, 0.7);
  windowLight.position.set(-7, 5, -9);
  scene.add(windowLight);
  // a soft fill from the front, where the player stands: it washes the
  // sides the lamp's key leaves black, so shadows keep their shape but
  // lose their cruelty. it casts none of its own — the lamp stays the
  // only storyteller of shadow — and it dims to a whisper at night.
  const fill = new THREE.DirectionalLight(0xd6c6a6, 1.0);
  fill.position.set(1.8, 6.2, 11.5);        // above and behind the camera's home
  fill.target.position.set(0, 0.6, -1.5);   // down the same axis the eye looks
  fill.castShadow = false;
  scene.add(fill, fill.target);
  const machineWash = new THREE.SpotLight(0xc8b498, 135, 26, Math.PI / 3.5, 0.75, 1.7);
  machineWash.position.set(0, 6.5, -2.0);
  machineWash.target.position.set(0, 1.2, -7.6);
  scene.add(machineWash, machineWash.target);

  // the desk lamp: a giant toy task-lamp stands at the tray's corner, its
  // arm arched over the sand — the room's one warm light, made visible
  const deskLamp = new THREE.Group();
  {
    const redM = new THREE.MeshStandardMaterial({ color: 0xc04838, roughness: 0.32, metalness: 0.05 });
    redM.emissive = new THREE.Color(0xc04838).multiplyScalar(0.22);
    const creamM = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.42, metalness: 0.05 });
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const limb = (a, b, r0, r1, m) => {
      const dir = new THREE.Vector3().subVectors(b, a);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, dir.length(), 10), m);
      seg.position.copy(a).addScaledVector(dir, 0.5);
      seg.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
      return seg;
    };
    // base: two stepped pucks and a switch button
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.32, 0.42, 22), redM);
    base.position.y = 0.21;
    const step = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.86, 0.2, 18), creamM);
    step.position.y = 0.52;
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 12), creamM);
    knob.position.set(0.62, 0.7, 0.36);
    knob.userData.knob = true;   // the switch: click it to light the room or dim it
    deskLamp.userData.knob = knob;
    deskLamp.add(base, step, knob);
    // the arm: base joint, elbow, head — chunky, toy-like, cream ball joints
    // it sweeps left, over the tray, from its post beside the rocking horse
    const foot = V(0, 0.58, 0), elbow = V(-1.1, 2.75, 0.35), head = V(-2.3, 3.1, 0.7);
    deskLamp.add(limb(foot, elbow, 0.21, 0.17, redM), limb(elbow, head, 0.17, 0.14, redM));
    const joint1 = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), creamM);
    joint1.position.copy(foot);
    const joint2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), creamM);
    joint2.position.copy(elbow);
    deskLamp.add(joint1, joint2);
    // the head: a big cream shade that looks where it shines
    const headG = new THREE.Group();
    headG.position.copy(head);
    headG.quaternion.setFromUnitVectors(V(0, -1, 0), V(-0.91, -0.31, 0.29).normalize());
    const shadeM = creamM.clone();
    shadeM.side = THREE.DoubleSide;
    shadeM.emissive = new THREE.Color(0xe8dcc0).multiplyScalar(0.16);   // the inner face glows a little
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 1.15, 0.9, 18, 1, true), shadeM);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.085, 8, 20), redM);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.45;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), redM);
    cap.position.y = 0.47;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xffe8c0, emissive: 0xffd9a0, emissiveIntensity: 2.6, roughness: 0.4 })
    );
    bulb.position.y = -0.18;
    headG.add(shade, rim, cap, bulb);
    deskLamp.add(headG);
    deskLamp.userData.bulb = bulb;
    deskLamp.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    bulb.castShadow = false;   // the light must not occlude itself
  }
  deskLamp.position.set(9.6, -0.18, -6.8);   // all the way to the room's top-right corner, by the hearth
  deskLamp.rotation.y = 0.36;   // turned so the arm and light sweep across the whole sandbox
  scene.add(deskLamp);
  // the switch: a click on the knob lights the room or leaves it to the night
  let lampOn = true;
  function setLamp(on, silent) {
    lampOn = !!on;
    deskLamp.userData.bulb.material.emissiveIntensity = lampOn ? 2.6 : 0.04;
    lamp.intensity = lampOn ? 185 : 0;
    fill.intensity = lampOn ? 1.0 : 0.22;   // night keeps a little front light
    if (!silent) { thunk(); say(lampOn ? 'the lamp clicks on. the sand warms.' : 'the lamp clicks off. the night leans in.'); saveSoon(); }
  }

  // ── the room shell: floorboards, plaster wall, one window ────────────
  const floorTex = woodTexture('#46362a', '#241812', 46);
  floorTex.repeat.set(4, 4);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 30),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: floorTex, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.18;
  floor.receiveShadow = true;
  scene.add(floor);
  // toy-room wallpaper: warm cream stripes with faint painted dots
  const wallTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#d6c29a'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#c6ae82';
    for (let sx = 0; sx < 256; sx += 64) x.fillRect(sx, 0, 30, 256);
    for (let dy = 16; dy < 256; dy += 48) {
      for (let dx = (dy / 48) % 2 ? 16 : 40; dx < 256; dx += 48) {
        x.fillStyle = 'rgba(255, 244, 214, 0.5)';
        x.beginPath(); x.arc(dx, dy, 3.2, 0, 6.3); x.fill();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(7, 2.5);
    return t;
  })();
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 12),
    new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.98 })
  );
  wall.position.set(0, 5.8, -10.5);
  wall.receiveShadow = true;
  scene.add(wall);
  // a row of painted toy blocks along the wall — the border of a playroom
  const blocksTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#d6c29a'; x.fillRect(0, 0, 512, 64);
    const cols = ['#c05038', '#3a6ac0', '#d8a838', '#4a8a4a'];
    for (let i = 0; i < 8; i++) {
      const bx = i * 64 + 6;
      x.fillStyle = cols[i % 4];
      x.fillRect(bx, 6, 52, 52);
      x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 3;
      x.strokeRect(bx, 6, 52, 52);
      x.fillStyle = '#fff6e0';
      x.font = 'bold 34px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26], bx + 26, 34);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(5, 1);
    return t;
  })();
  const blocks = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.62), new THREE.MeshStandardMaterial({ map: blocksTex, roughness: 0.95 }));
  blocks.position.set(0, 4.55, -10.43);
  scene.add(blocks);
  // skirting
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 0.12), new THREE.MeshStandardMaterial({ color: 0x4a3c2c, roughness: 0.9 }));
  skirt.position.set(0, 0.07, -10.44);
  scene.add(skirt);
  // no window: the toy room is a closed world, lit by its one lamp
  // ── the room's life: rug, hearth, shelf, curtains, moon, pictures ────
  {
    // a woven rug under the tray, damping the boards' glare
    const rugTex = (() => {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 128;
      const x = c.getContext('2d');
      x.fillStyle = '#4a3038'; x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 128; i += 8) {
        x.fillStyle = i % 16 ? 'rgba(180,120,80,0.16)' : 'rgba(40,20,24,0.25)';
        x.fillRect(0, i, 128, 4);
      }
      x.strokeStyle = 'rgba(216,184,119,0.35)';
      x.lineWidth = 5;
      x.strokeRect(8, 8, 112, 112);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 8.5), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0.4, -0.172, 0.6);
    rug.receiveShadow = true;
    scene.add(rug);

    // the hearth corner behind the crate: ember bed, logs, a warm light
    const hearth = new THREE.PointLight(0xb8643a, 55, 16, 2.1);
    hearth.position.set(10.5, 2.4, -8.0);
    scene.add(hearth);
    const firewood = new THREE.Group();
    const logM = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.95 });
    for (const [dx, dy, rz] of [[-0.14, 0, 0.12], [0.14, 0, -0.12], [0, 0.14, 0]]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.9, 7), logM);
      log.rotation.set(0, 0, Math.PI / 2 + rz);
      log.position.set(dx, dy + 0.1, dx * 0.4);
      firewood.add(log);
    }
    const emberBed = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshStandardMaterial({ color: 0x68280f, emissive: 0xd85a1a, emissiveIntensity: 1.1, roughness: 1 }));
    emberBed.scale.y = 0.4;
    emberBed.position.y = 0.12;
    firewood.add(emberBed);
    const hearthSlab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 1.7), new THREE.MeshStandardMaterial({ color: 0x3a3438, roughness: 0.95 }));
    hearthSlab.position.y = 0.03;
    firewood.add(hearthSlab);
    firewood.position.set(10.2, -0.18, -7.8);
    firewood.rotation.y = -0.5;
    scene.add(firewood);

    // a shelf on the back wall, left of the machines, with jars and paper
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.09, 0.6), new THREE.MeshStandardMaterial({ color: 0x54402a, roughness: 0.85 }));
    shelf.position.set(-8.9, 3.0, -10.15);
    scene.add(shelf);
    const jarGlass = new THREE.MeshPhysicalMaterial({ color: 0x9ab0a0, roughness: 0.15, transparent: true, opacity: 0.45 });
    for (const [jx, jh, jr] of [[-0.8, 0.34, 0.11], [-0.45, 0.26, 0.09], [0.55, 0.3, 0.1]]) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(jr, jr * 0.86, jh, 10), jarGlass);
      jar.position.set(-8.9 + jx, 3.05 + jh / 2, -10.15);
      scene.add(jar);
    }
    const stack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.3), new THREE.MeshStandardMaterial({ color: 0xa8886a, roughness: 0.95 }));
    stack.position.set(-8.55, 3.17, -10.15);
    scene.add(stack);

    // small frames on the wall right of the machines — not bare plaster
    const tiny = new THREE.MeshStandardMaterial({ color: 0x50381e, roughness: 0.7 });
    for (const [px, pw] of [[4.6, 0.5], [5.5, 0.34]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(pw, pw * 1.25, 0.05), tiny);
      f.position.set(px, 3.4, -10.4);
      scene.add(f);
    }
  }

  // the desk lamp is the room's one lamp now — no cords on the ceiling

  // ── the room's furniture: oversized pieces at toybox scale — the room
  //    is a child's playroom, and the tray is the table in it ────────────
  {
    const pineM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTexture('#8a6a42', '#5a3c20', 44), roughness: 0.9 });
    const pineDark = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTexture('#6a4c2e', '#3e2812', 0), roughness: 0.92 });
    const clothM = new THREE.MeshStandardMaterial({ color: 0x7a4a3a, roughness: 1 });

    // a low toy chest against the left wall, lid thrown open
    const chest = new THREE.Group();
    const chestB = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 1.3), pineM);
    chestB.position.y = 0.55;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.09, 1.3), pineDark);
    lid.position.set(0, 1.16, -0.55);
    lid.rotation.x = -1.1;
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 1.1, -0.62);
    lid.position.set(0, 0.04, 0.62);
    lidPivot.add(lid);
    lidPivot.rotation.x = -1.05;
    chest.add(chestB, lidPivot);
    for (const [cx2, cz2] of [[-1.5, -0.55], [1.5, -0.55], [-1.5, 0.55], [1.5, 0.55]]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), pineDark);
      knob.position.set(cx2, 0.85, cz2);
      chest.add(knob);
    }
    chest.position.set(-7.9, -0.18, -1.5);
    chest.rotation.y = 0.35;
    scene.add(chest);

    // a rocking horse mid-rock beside the hearth
    const horse = new THREE.Group();
    const bodyH = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.6, 4, 10), clothM);
    bodyH.rotation.z = Math.PI / 2;
    bodyH.position.y = 1.05;
    const headH = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 9), clothM);
    headH.position.set(0.55, 1.4, 0);
    const snoutH = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.22, 8), clothM);
    snoutH.rotation.z = Math.PI / 2.4;
    snoutH.position.set(0.72, 1.33, 0);
    const maneM = new THREE.MeshStandardMaterial({ color: 0x3a281a, roughness: 1 });
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.16), maneM);
    mane.position.set(0.42, 1.55, 0);
    for (const [hx, hz, s] of [[0.45, 0, 1], [-0.4, 0.28, 1], [-0.4, -0.28, 1], [0.42, 0.24, 1], [0.42, -0.24, 1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.75, 7), pineDark);
      leg.position.set(hx, 0.6, hz);
      leg.rotation.x = s * 0.18;
      horse.add(leg);
    }
    // the rockers: two long arcs of boxes
    for (const s of [-0.3, 0.3]) {
      for (let i = 0; i < 7; i++) {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.09), pineDark);
        const a = (i - 3) * 0.16;
        seg.position.set(0.62 - Math.sin(a) * 0.9, 0.18 + Math.cos(a) * 0.12, s);
        seg.rotation.z = -a;
        horse.add(seg);
      }
    }
    horse.add(bodyH, headH, snoutH, mane);
    horse.position.set(7.9, -0.18, -4.6);
    horse.rotation.y = -0.55;
    horse.rotation.z = 0.06;
    scene.add(horse);

    // a little table with a tiny tea set, back-left of the tray
    const table = new THREE.Group();
    const tTop = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.08, 18), pineM);
    tTop.position.y = 0.95;
    table.add(tTop);
    const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.95, 9), pineDark);
    tLeg.position.y = 0.475;
    table.add(tLeg);
    for (const a of [0, 2.1, 4.2]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.4 }));
      cup.position.set(Math.cos(a) * 0.45, 1.04, Math.sin(a) * 0.45);
      table.add(cup);
    }
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xc8bca8, roughness: 0.4 }));
    pot.position.set(0, 1.09, 0);
    table.add(pot);
    table.position.set(-5.7, -0.18, -5.05);   // behind the tray, left of the blocks
    table.rotation.y = 0.4;
    scene.add(table);

    // stacked building blocks in the corner, one toppling
    const blocks = new THREE.Group();
    const blockCols = [0xb8563a, 0x4a6a9a, 0x5a7a46, 0xb08a3c];
    let bi = 0;
    for (const [bx, by, bz, s] of [[0, 0.2, 0, 0.4], [0, 0.6, 0, 0.4], [0.05, 1.0, 0.02, 0.4], [0.5, 0.2, 0.3, 0.4], [0.5, 0.6, 0.3, 0.4], [0.48, 1.0, 0.28, 0.4], [-0.42, 0.2, -0.3, 0.4]]) {
      const col = blockCols[bi % 4];
      const block = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, emissive: col, emissiveIntensity: 0.06 }));
      // painted faces: a brighter top so stacks read as toys from above
      block.material.color.offsetHSL(0, 0.05, 0.02);
      block.position.set(bx, by, bz);
      block.rotation.y = (bi * 0.7) % 0.4 - 0.2;
      blocks.add(block);
      bi++;
    }
    blocks.position.set(-3.3, -0.18, -5.15);   // behind the tray, where the eye lands
    blocks.rotation.y = 0.5;
    scene.add(blocks);

    // a rag rug in front of the tray, tied and frayed — clear of the cabinet
    const rag = new THREE.Mesh(new THREE.CircleGeometry(1.7, 20), new THREE.MeshStandardMaterial({ color: 0x6a5a6e, roughness: 1 }));
    rag.rotation.x = -Math.PI / 2;
    rag.position.set(1.2, -0.165, 7.4);
    rag.scale.x = 1.3;
    scene.add(rag);
  }

  // dust in the lamplight: a soft, slow field above the tray
  const dust = (() => {
    const n = 110;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 11;
      pos[i * 3 + 1] = 0.4 + Math.random() * 4.6;
      pos[i * 3 + 2] = -5 + Math.random() * 11;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xd8c8a0, size: 0.045, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return pts;
  })();

  // ── the tray ─────────────────────────────────────────────────────────
  const sand = createSand();
  sand.basin.position.set(0, 0, 0.4);
  sand.mesh.position.copy(sand.basin.position);
  scene.add(sand.basin);
  scene.add(sand.mesh);

  // ── the machines along the back wall ─────────────────────────────────
  function labelSprite(text, color) {
    // the machines' name plates: big enough to read from the sofa
    const c = document.createElement('canvas');
    c.width = 512; c.height = 72;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(12,9,6,0.94)';
    x.fillRect(0, 0, 512, 72);
    x.strokeStyle = color; x.lineWidth = 5;
    x.strokeRect(5, 5, 502, 62);
    x.fillStyle = color;
    x.font = '700 40px "Fira Code", Menlo, Consolas, monospace';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text.toUpperCase(), 256, 38);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 0.44),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
  }
  const machineRigs = MACHINES.map((m, i) => {
    const rig = makeMachine(m.key, m.accent);
    rig.position.set(-5.7 + i * 3.6, 0, -7.6);   // wider lane: the machines grew
    scene.add(rig);
    const plate = labelSprite(m.label, '#' + m.accent.toString(16).padStart(6, '0'));
    // a badge on the machine's chest, not a sign floating above it — the
    // polaroids own the sky, the machines wear their names
    plate.position.set(rig.position.x, 2.95, rig.position.z + 1.05);
    scene.add(plate);
    return Object.assign({ rig }, m);
  });

  // ── the saved photographs: strung polaroids on a wire under the room's
  //    name plate — the tray keeps its story in view, the machines keep
  //    the whole back wall ─────────────────────────────────────────────

  // ── the crate of toys, right of the tray ─────────────────────────────
  const crate = makeCrate(player());
  crate.group.scale.setScalar(1.35);   // the toybox grew: it is furniture now, not a prop
  crate.group.traverse((n) => { if (n.isMesh) n.castShadow = false; });   // its shadow must not fall across the sand
  crate.group.position.set(6.9, -0.18, 1.1);   // pulled toward the camera, where the stencil reads
  crate.group.rotation.y = -0.7;   // front slats and stencil face the camera
  scene.add(crate.group);

  // ── the tools, as objects: stick leaning on the crate, shovel stuck in
  //    the sand, brush jar and bucket on the boards ──────────────────────
  const toolMeshes = {};
  const BENCH_Y = 0.55;   // the crate's bench top, in room space
  {
    // the tools are the giant toys, standing in the sand's quiet back-left
    // corner — in frame, pickable, out of the play. homes ride the sand's
    // own height, so they stand true no matter how the tray was left
  const TOOL_HOMES = {
    stick: { x: -2.55, z: 3.35, yOff: 0.12, ry: 0.65 },
    shovel: { x: -1.35, z: 3.75, yOff: 0.0, ry: -0.55 },
    brush: { x: -0.05, z: 3.35, yOff: 0.02, ry: 0.6 },
    bucket: { x: 3.6, z: 3.55, yOff: 0.02, ry: -0.4 },
  };
  for (const key of ['stick', 'shovel', 'brush', 'bucket']) {
      const h = TOOL_HOMES[key];
      const mesh = makeToolMesh(key);
      mesh.position.set(h.x, sand.groundAt(h.x, h.z) + h.yOff, h.z);
      mesh.rotation.set(0, h.ry, key === 'stick' ? 0.1 : (key === 'shovel' ? 0.04 : 0));
      scene.add(mesh);
      toolMeshes[key] = mesh;
    }
  }

  // ── camera: a slow drift around a fixed eye point ────────────────────
  // the eye sits right-of-centre and high enough to look INTO the raised
  // toy crate; while a machine chews, the camera leans toward it so the
  // transformation reads without hunting for it
  const HOME = new THREE.Vector3(2.2, 6.0, 9.7);   // pulled back: the tool bench shares the frame
  const LOOK = new THREE.Vector3(2.1, 0.95, -1.5);
  const FOCUS = new THREE.Vector3();    // the busy machine, while one chews
  let focusK = 0;                       // eased lean toward FOCUS
  function tickCamera(t) {
    if (REDUCED) { camera.position.copy(HOME); camera.lookAt(LOOK); return; }
    const a = Math.sin(t * 0.05) * 0.07;
    const b = Math.sin(t * 0.037 + 2) * 0.2;
    camera.position.set(HOME.x + a, HOME.y + Math.sin(t * 0.043) * 0.09, HOME.z + b);
    const look = new THREE.Vector3().copy(LOOK);
    if (focusK > 0.001 && S.busy) {
      look.lerp(FOCUS, focusK * 0.62);
      camera.position.x += FOCUS.x * 0.16 * focusK;
      camera.position.z -= 0.5 * focusK;
    }
    camera.lookAt(look);
  }

  /* ── picking + dragging + tool work ────────────────────────────────── */

  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.0);

  // the rendered viewport inside the glass (pillarboxed 4:3); pointer and
  // label math must use it, not the whole canvas, or edge hits skew
  const VP = { x: 0, y: 0, w: 1, h: 1 };

  function rayFromEvent(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = (((e.clientX - r.left) - VP.x) / VP.w) * 2 - 1;
    pointerNDC.y = 1 - 2 * (((e.clientY - r.top) - VP.y) / VP.h);
    raycaster.setFromCamera(pointerNDC, camera);
    return raycaster;
  }
  function groundPoint(e) {
    const rc = rayFromEvent(e);
    const p = new THREE.Vector3();
    if (!rc.ray.intersectPlane(groundPlane, p)) return null;
    return p;
  }
  function ownerOf(hits, pool) {
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node && pool.indexOf(node) < 0) node = node.parent;
    return node;
  }
  function figureAt(e) { return ownerOf(rayFromEvent(e).intersectObjects(S.placed, true), S.placed); }
  function crateToyAt(e) { return ownerOf(rayFromEvent(e).intersectObjects(crate.toys, true), crate.toys); }
  function toolAt(e) {
    const hits = rayFromEvent(e).intersectObjects(Object.values(toolMeshes), true);
    const node = ownerOf(hits, Object.values(toolMeshes));
    return node ? node.userData.tool : null;
  }
  function machineAt(e) {
    const rc = rayFromEvent(e);
    const rigs = machineRigs.map((m) => m.rig);
    const node = ownerOf(rc.intersectObjects(rigs, true), rigs);
    return node ? machineRigs.find((m) => m.rig === node) : null;
  }

  // labels: one div per placed figure, projected each frame
  function labelOf(fig) { return labelsEl.querySelector('[data-for="' + fig.userData.id + '"]'); }
  function ensureLabel(fig) {
    let el = labelOf(fig);
    if (!el) {
      el = document.createElement('div');
      el.className = 'mem-label';
      el.dataset.for = fig.userData.id;
      labelsEl.appendChild(el);
    }
    el.textContent = fig.userData.name || '';
    el.style.display = fig.userData.name ? '' : 'none';
    return el;
  }
  function removeLabel(fig) {
    const el = labelOf(fig);
    if (el) el.remove();
  }
  function projectLabels() {
    const r = renderer.domElement.getBoundingClientRect();
    const host = labelsEl.getBoundingClientRect();
    for (const fig of S.placed) {
      const el = ensureLabel(fig);
      if (el.style.display === 'none') continue;
      const box = new THREE.Box3().setFromObject(fig);
      const top = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y + 0.18, (box.min.z + box.max.z) / 2);
      top.project(camera);
      const x = (top.x * 0.5 + 0.5) * VP.w + VP.x + (r.left - host.left);
      const y = (0.5 - top.y * 0.5) * VP.h + VP.y + (r.top - host.top);
      el.style.left = x.toFixed(1) + 'px';
      el.style.top = y.toFixed(1) + 'px';
      el.style.display = (top.z < 1) ? '' : 'none';
      el.classList.toggle('picked', S.picking && S.picking.fig === fig && !S.picking.adding);
    }
  }

  function addToTray(fig, x, z) {
    fig.position.set(x, 0, z);
    settleFigure(fig);
    scene.add(fig);
    S.placed.push(fig);
    ensureLabel(fig);
    thunk();
    return fig;
  }
  function placeFigure(kind, name, x, z) {
    const fig = buildFigure(kind);
    fig.userData.name = name || '';
    addToTray(fig,
      x != null ? x : (Math.random() - 0.5) * 1.6,
      z != null ? z : 0.4 + (Math.random() - 0.5) * 1.6);
    return fig;
  }

  function settleFigure(fig) {
    const s = fig.userData.scale || 1;
    fig.scale.setScalar(s);
    const h = sand.groundAt(fig.position.x, fig.position.z);
    const box = new THREE.Box3().setFromObject(fig);
    fig.position.y = h - box.min.y * 0.15;   // feet pressed slightly in
  }

  function liftFigure(fig) {
    const i = S.placed.indexOf(fig);
    if (i < 0) return;
    S.placed.splice(i, 1);
    removeLabel(fig);
    scene.remove(fig);
  }

  // some hosts (embedded browsers, kiosk shells, automation) refuse prompt();
  // a refused prompt must never eat the toy you just carried out of the crate
  function renameFigure(fig, after) {
    S.picking = { fig, adding: false };
    const prev = fig.userData.name || '';
    let name = null;
    try {
      name = window.prompt(fig.userData.kind === 'poppet'
        ? 'the poppet answers to your own name. change it, if the story needs a different one:'
        : 'name this figure (leave empty to leave it unnamed):', prev);
    } catch (err) {
      // this browser cannot ask: keep the toy, keep it unnamed, keep moving
      S.picking = null;
      if (after) after();
      return;
    }
    S.picking = null;
    if (name === null) return;
    fig.userData.name = name.trim();
    if (fig.userData.kind === 'poppet' && !fig.userData.name) fig.userData.name = player();
    ensureLabel(fig);
    if (fig.userData.name) say('"' + fig.userData.name + '" it is.');
    saveSoon();
    if (after) after();
  }

  /* ── machines ──────────────────────────────────────────────────────── */

  function useMachine(machine, fig) {
    if (S.busy || !fig) return;
    S.busy = true;
    // a watchdog: the busy flag lives on the chew animation's own rAF
    // chain, so a throttled tab or a dying rAF would leave the room
    // latched forever. this gate opens no matter what.
    clearTimeout(useMachine.watch);
    useMachine.watch = setTimeout(() => { S.busy = false; focusK = 0; }, 8000);
    const lampM = machine.rig.userData.lamp;
    const bulbM = machine.rig.userData.bulb;
    const door = machine.rig.userData.door;
    const home = fig.position.clone();
    const target = machine.rig.position.clone(); target.y = 0;
    FOCUS.set(target.x, 1.3, target.z);   // machines stand taller now
    const t0 = performance.now();
    const DUR = REDUCED ? 240 : 900;
    say(machine.label + ' takes ' + (fig.userData.name || 'the figure') + '…');

    function step(t) {
      const k = Math.min(1, (t - t0) / DUR);
      fig.position.lerpVectors(home, target, k);
      if (k < 1) return requestAnimationFrame(step);
      // inside: light, chew — and each machine moves in its own way
      lampM.intensity = 14; bulbM.material.emissiveIntensity = 2.2; door.material.opacity = 0.5;
      focusK = 0.95;
      const movers = [];
      machine.rig.traverse((n) => {
        if (!n.userData || (!n.userData.stomp && !n.userData.spin && !n.userData.tumble)) return;
        movers.push({ node: n, mode: n.userData.stomp ? 'stomp' : (n.userData.tumble ? 'tumble' : 'spin'), base: n.position.y, rot: n.rotation.clone() });
      });
      const anim = { stop: false };
      if (movers.length && !REDUCED) {
        (function tickMachines(now) {
          if (anim.stop) return;
          const et = (now - t0) * 0.001;
          for (const m of movers) {
            if (m.mode === 'stomp') {
              const s = Math.max(0, Math.sin(et * 6.5));
              m.node.position.y = m.node.userData.stomp.bottom + (m.node.userData.stomp.top - m.node.userData.stomp.bottom) * s;
            } else if (m.mode === 'tumble') {
              m.node.rotation.x = m.rot.x + et * 5.0;
              m.node.rotation.z = m.rot.z + et * 3.7;
            } else {
              m.node.rotation.z = m.rot.z + (m.node.userData.spinRate || 2) * et;
            }
          }
          requestAnimationFrame(tickMachines);
        })(t0);
      }
      setTimeout(() => {
        let produced = null;
        if (machine.key === 'shrinkifier') { fig.userData.scale = (fig.userData.scale || 1) / 2; }
        if (machine.key === 'biggifier') { fig.userData.scale = Math.min(3.5, (fig.userData.scale || 1) * 2); }
        if (machine.key === 'shadowmaker') { produced = shadowDoubleOf(fig); }
        if (machine.key === 'randomizer') { randomizeFigure(fig); }
        settleFigure(fig);
        if (produced) {
          produced.position.copy(fig.position).add(new THREE.Vector3(1.0, 0, 0.4));
          settleFigure(produced);
          scene.add(produced);
          S.placed.push(produced);
          ensureLabel(produced);
        }
        lampM.intensity = 0; bulbM.material.emissiveIntensity = 0; door.material.opacity = 0.28;
        anim.stop = true;
        for (const m of movers) m.node.position.y = m.base;   // rams settle
        thunk();
        // walk out — back into the tray, where it was picked up
        const t1 = performance.now();
        const exit = fig.userData.__return ? fig.userData.__return.clone() : home.clone();
        fig.userData.__return = null;
        (function stepOut(t2) {
          const k2 = Math.min(1, (t2 - t1) / (REDUCED ? 240 : 700));
          fig.position.lerpVectors(target, exit, k2);
          if (k2 < 1) return requestAnimationFrame(stepOut);
          settleFigure(fig);
          say(machine.say + '.');
          S.busy = false;
          clearTimeout(useMachine.watch);   // the normal exit beats the watchdog
          focusK = 0;
          saveSoon();
        })(t1);
      }, REDUCED ? 160 : 700);
    }
    requestAnimationFrame(step);
  }

  /* ── the tray remembers: serialize / restore ───────────────────────── */

  let saveTimer = null;
  function saveSoon() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 1200);
  }
  function thumbOf(dataUrl, w) {
    try {
      const img = new Image();
      img.src = dataUrl;
      // draw synchronously from the already-decoded data URL is not
      // guaranteed; use a canvas of the same size and accept the async
      const c = document.createElement('canvas');
      c.width = w || 360; c.height = Math.round((w || 360) * 0.75);
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.62);
    } catch (e) { return dataUrl; }
  }
  function saveNow() {
    if (!st()) return;
    saveTimer = null;
    try {
      const payload = {
        ts: Date.now(),
        figScaleEpoch: 2,
        figures: S.placed.map((f) => ({
          kind: f.userData.kind, name: f.userData.name || '',
          scale: f.userData.scale || 1, shadowed: !!f.userData.shadowed,
          tipped: !!f.userData.tipped,
          x: +f.position.x.toFixed(2), z: +f.position.z.toFixed(2),
          ry: +f.rotation.y.toFixed(2),
        })),
        sand: sand.serialize(),
        lampOn: lampOn,
        photos: S.photos.map((p) => ({ label: p.label || '', img: thumbOf(p.dataUrl) })),
      };
      st().set({ memory: payload });
    } catch (e) { /* a full shelf is not a broken room */ }
  }
  function restore() {
    const mem = getState().memory;
    if (!mem) return;
    try {
      if (mem.sand) sand.deserialize(mem.sand);
      // the toys grew: one-size bump for trays saved before the change
      const bump = mem.figScaleEpoch === 2 ? 1 : 1.35;
      for (const f of (mem.figures || [])) {
        const fig = buildFigure(f);
        fig.userData.name = f.name || '';
        fig.userData.scale = Math.min(3.5, (f.scale || 1) * bump);
        addToTray(fig, f.x, f.z);
        if (f.ry) fig.rotation.y = f.ry;
        if (f.tipped) setTipped(fig, true);   // some toys were pushed over
        settleFigure(fig);   // after tipping, so it rests on its side
      }
      if (bump !== 1) saveSoon();   // write the grown sizes back once
      for (const p of (mem.photos || []).slice(0, 3)) {
        S.photos.push({ dataUrl: p.img, label: p.label || '', at: mem.ts || Date.now() });
      }
      if (mem.lampOn === false) setLamp(false, true);
      buildString();
      if ((mem.figures || []).length || (mem.photos || []).length) {
        say('the tray is as you left it. the sand kept its shape.');
      }
    } catch (e) { /* a half-remembered tray still opens */ }
  }

  /* ── pointer wiring ────────────────────────────────────────────────── */

  let drag = null;       // { fig, offset, home } | { crateToy, key, label } | { dig: true }
  let pouring = false;   // shovel/bucket/brush actively working
  let downXY = null;

  // the stick's honest work: a push that lays a toy down in the sand.
  // a toy stays tipped until it is poked again — and the tray remembers.
  const TOPPLE_TIP = 1.05;   // radians — laid on its side, not thrown
  function setTipped(fig, on) {
    fig.rotation.x = on ? TOPPLE_TIP : 0;
    fig.userData.tipped = on;
  }

  // ── the working tool: it leaves its place and rides the pointer, blade
  //    to the sand, until it is put down again ───────────────────────────
  let toolActive = false;
  function toolFollow(p) {
    const held = toolMeshes[S.tool];
    if (!held || !p) return;
    if (S.tool === 'shovel') {
      held.position.set(p.x, sand.groundAt(p.x, p.z) + 0.16, p.z);
      held.rotation.set(-0.5, 0, 0);              // blade dips to the work
    } else if (S.tool === 'bucket') {
      held.position.set(p.x - 0.12, sand.groundAt(p.x, p.z) + 0.3, p.z);
      held.rotation.set(-0.75, 0, -0.42);         // mouth down, scooping
    } else if (S.tool === 'brush') {
      held.position.set(p.x - 0.14, sand.groundAt(p.x, p.z) + 0.1, p.z);
      held.rotation.set(-1.15, 0, 0.35);          // bristles to the grain
    }
  }
  const TOOL_HOMES = {
    stick: { x: -2.55, z: 3.35, yOff: 0.12, ry: 0.65 },
    shovel: { x: -1.35, z: 3.75, yOff: 0.0, ry: -0.55 },
    brush: { x: -0.05, z: 3.35, yOff: 0.02, ry: 0.6 },
    bucket: { x: 3.6, z: 3.55, yOff: 0.02, ry: -0.4 },
  };
  function toolRest() {
    // home = the toy line-up in the sand's back-left corner, standing on
    // whatever height the sand now has there
    const held = toolMeshes[S.tool];
    const h = TOOL_HOMES[S.tool];
    if (!held || !h) return;
    held.position.set(h.x, sand.groundAt(h.x, h.z) + h.yOff, h.z);
    held.rotation.set(0, h.ry, S.tool === 'stick' ? 0.1 : (S.tool === 'shovel' ? 0.04 : 0));
  }
  // armed: the toy stands itself up on the tray's near rim, handle ready —
  // dismissed: it flops back down into the sand
  function toolArm(key, armed) {
    const held = toolMeshes[key];
    if (!held || key === 'hand') return;
    if (armed) {
      if (key === 'shovel') { held.position.set(0.5, 0.6, 5.55); held.rotation.set(-0.06, -0.1, 0.22); }
      else if (key === 'brush') { held.position.set(-1.4, 0.35, 5.5); held.rotation.set(-0.9, 0, 0.1); }
      else if (key === 'bucket') { held.position.set(-2.9, 0.58, 5.5); held.rotation.set(0, 0, -0.06); }
      else { held.position.set(2.7, 0.6, 5.5); held.rotation.set(0, 0.1, 0.18); }
    } else {
      const was = S.tool; S.tool = key;
      toolRest();
      S.tool = was;
    }
  }
  // the work itself: strong strokes — real volume, moved in a pass or two
  function applyTool(p) {
    if (!p) return;
    toolFollow(p);
    if (S.tool === 'shovel') {
      // the shovel's work is subtraction now: blade down, sand out —
      // no carried load, no heap; it opens the tray down to its floor
      sand.scoop(p.x, p.z, 0.9, 0.05);
    } else if (S.tool === 'bucket') {
      // the bucket scoops like the shovel, then pours what it lifted
      const digging = !pouring || !drag;
      if (digging) { sand.dig(p.x, p.z, 0.72, 0.06); drag = { dig: true, last: p.clone() }; }
      else { sand.pour(p.x, p.z, 0.62, 0.05); }
      S.bucketPouring = !digging;
      workSand(true);   // the pail empties as it pours, fills as it scoops
    } else if (S.tool === 'brush') {
      const c = new THREE.Color(S.paintColor);
      sand.setPaint(p.x, p.z, 0.75, [c.r * 255, c.g * 255, c.b * 255]);
    }
    sand.rebuild();
  }
  // held props: the bucket's pour stream (the shovel carries nothing now)
  let streamMesh = null;
  function workSand(on) {
    const held = toolMeshes[S.tool];
    if (S.tool === 'bucket' && held) {
      if (!streamMesh) { streamMesh = held.children.find((m) => m.userData.stream); }
      if (streamMesh) streamMesh.visible = on && !!S.bucketPouring;   // stream only while pouring
    }
  }

  // a tool, picked up: it hops in the hand
  function toolHop(key) {
    const mesh = toolMeshes[key];
    if (!mesh || REDUCED) return;
    const t0 = performance.now();
    const baseY = mesh.position.y;
    (function hop(t) {
      const k = Math.min(1, (t - t0) / 340);
      mesh.position.y = baseY + Math.sin(k * Math.PI) * 0.22;
      if (k < 1) requestAnimationFrame(hop); else mesh.position.y = baseY;
    })(t0);
  }

  fieldEl.addEventListener('pointerdown', (e) => {
    if (S.busy) return;
    downXY = [e.clientX, e.clientY];
    const fig = figureAt(e);
    if (fig) {
      if (S.tool === 'stick') {
        // the stick from the yard: a click is a push. the toy tips over —
        // click it again and it stands back up
        setTipped(fig, !fig.userData.tipped);
        settleFigure(fig);
        thunk();
        const tdef = TOYS.find((t) => t.key === fig.userData.kind);
        say(fig.userData.tipped
          ? (fig.userData.name || 'the ' + ((tdef && tdef.label) || 'figure') + ' is pushed over. it lies in the sand.')
          : (fig.userData.name || 'the figure') + ' is set upright again.');
        saveSoon();
        return;
      }
      const p = groundPoint(e) || fig.position;
      drag = { fig, offset: new THREE.Vector3().subVectors(fig.position, p), home: fig.position.clone() };
      try { fieldEl.setPointerCapture(e.pointerId); } catch (err) {}
      fieldEl.classList.add('mem-drag');
      return;
    }
    const toy = crateToyAt(e);
    if (toy) {
      // take a toy out of the crate: it rides the pointer until dropped
      const def = TOYS.find((t) => t.key === toy.userData.crateKey);
      const fig = buildFigure(def.key);
      fig.userData.name = def.named ? player() : '';
      fig.position.copy(groundPoint(e) || new THREE.Vector3(0, 0, 2));
      scene.add(fig);
      S.placed.push(fig);
      drag = { fig, isNew: true, fromCrate: def, offset: new THREE.Vector3(0, 0, 0), home: null };
      try { fieldEl.setPointerCapture(e.pointerId); } catch (err) {}
      fieldEl.classList.add('mem-drag');
      say(def.named ? player() + ' comes out of the crate.' : 'carrying the ' + def.label + '…');
      return;
    }
    // the lamp's switch comes first: even a tool left in front of the knob
    // must not swallow the click — but the crate, nearer the camera, still wins
    if (deskLamp.userData.knob) {
      const kHits = rayFromEvent(e).intersectObjects([deskLamp.userData.knob, crate.group], true);
      if (kHits.length && kHits[0].object === deskLamp.userData.knob) { setLamp(!lampOn); return; }
    }
    const toolKey = toolAt(e);
    if (toolKey) { setTool(toolKey); toolHop(toolKey); return; }
    const machine = machineAt(e);
    if (machine) {
      const target = fig || nearestFigure(machine.rig.position);
      if (target) { useMachine(machine, target); }
      else say('drag a figure to the chamber, or move it near and press the machine.');
      return;
    }
    const p = groundPoint(e);
    if (!p) return;
    if (S.tool === 'stick') {
      // no toy under the stick: drag the sand flat instead
      sand.flatten(p.x, p.z, 0.8, 0.32, 0.25);
      sand.rebuild();
      say('the sand smooths.');
      saveSoon();
      return;
    }
    if (S.tool === 'hand') { say('drag a figure, take a toy from the crate, or pick up a tool.'); return; }
    pouring = true;
    toolActive = true;
    workSand(true);
    fieldEl.classList.add(S.tool === 'brush' ? 'mem-paint' : 'mem-pour');
    try { fieldEl.setPointerCapture(e.pointerId); } catch (err) {}
    applyTool(p);
  });

  fieldEl.addEventListener('pointermove', (e) => {
    if (drag && drag.fig) {
      const p = groundPoint(e);
      if (!p) return;
      p.add(drag.offset);
      // x stays over the tray's width; z may leave it — the machine lane
      // behind the basin is part of the room, and the machines want figures
      p.x = Math.max(-HALF + 0.3, Math.min(HALF - 0.3, p.x));
      p.z = Math.max(-7.3, Math.min(HALF - 0.3, p.z));
      drag.fig.position.x = p.x;
      drag.fig.position.z = p.z;
      settleFigure(drag.fig);
      return;
    }
    if (pouring) applyTool(groundPoint(e));
    if (toolActive) toolFollow(groundPoint(e));
  });

  function endPointer(e) {
    if (toolActive) { toolActive = false; workSand(false); toolRest(); }
    if (drag && drag.dig) { drag = null; saveSoon(); return; }
    if (pouring) saveSoon();   // tool work reshapes the tray; the tray remembers
    if (drag && drag.fig) {
      const fig = drag.fig;
      settleFigure(fig);
      // dropped at a machine? feed it.
      const m = machineRigs.find((mm) => Math.hypot(fig.position.x - mm.rig.position.x, fig.position.z - mm.rig.position.z) < 2.2);   // the machines grew
      const overTray = Math.abs(fig.position.x) <= HALF && fig.position.z >= -HALF - 0.01 && fig.position.z <= HALF + 0.01;
      if (m && !S.busy) {
        fig.userData.__return = drag.home ? drag.home.clone() : new THREE.Vector3(0, 0, 0.4);
        useMachine(m, fig);
      } else if (!overTray) {
        if (drag.isNew) {
          // a toy carried out of the crate and set down off the sand: back it goes
          liftFigure(fig);
          say('back in the crate it goes.');
        } else {
          fig.position.copy(drag.home);
          settleFigure(fig);
        }
      } else {
        // kept: name it if it came from the crate unnamed
        if (drag.isNew && !drag.fromCrate.named && !fig.userData.name) {
          // the save rides the rename's own completion: a host without a
          // prompt still writes the new toy to the shelf
          renameFigure(fig, saveSoon);
        } else {
          ensureLabel(fig);
        }
        saveSoon();
      }
      drag = null;
    }
    pouring = false;
    drag = null;
    fieldEl.classList.remove('mem-paint', 'mem-pour', 'mem-drag');
  }
  fieldEl.addEventListener('pointerup', endPointer);
  fieldEl.addEventListener('pointercancel', endPointer);
  fieldEl.addEventListener('pointerleave', () => { if (pouring) endPointer(); });

  // a click (no drag) on a placed figure names it
  fieldEl.addEventListener('click', (e) => {
    if (downXY && Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 8) return;
    const fig = figureAt(e);
    if (fig && S.tool === 'hand') renameFigure(fig);   // the tools work; only the hand names
  });

  function nearestFigure(p) {
    let best = null, bestD = 1.2;
    for (const fig of S.placed) {
      const d = Math.hypot(fig.position.x - p.x, fig.position.z - p.z);
      if (d < bestD) { bestD = d; best = fig; }
    }
    return best;
  }

  /* ── the crate's index: a keyboard/screen-reader path to the same toys ─ */

  function buildToyIndex() {
    const itemsEl = document.getElementById('mem-toy-items');
    if (!itemsEl) return;   // the crate in the scene is the only toy list now
    itemsEl.innerHTML = '';
    for (const def of TOYS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mem-toy';
      b.setAttribute('aria-label', def.label + ' — place in the tray');
      const nm = document.createElement('span');
      nm.className = 't-name';
      nm.textContent = def.named ? player() : def.label;
      b.appendChild(nm);
      b.addEventListener('click', () => {
        const name = def.named ? player() : '';
        const fig = placeFigure(def.key, name);
        if (!def.named) renameFigure(fig);
        else say(player() + ' stands in the sand.');
      });
      itemsEl.appendChild(b);
    }
  }

  /* ── the tool rail (the keyboard twin of the floor tools) ──────────── */

  const TOOLS = [
    { key: 'hand',   label: 'hand',   sub: 'move', icon: '<path d="M8 12 V6 a1.6 1.6 0 0 1 3.2 0 V12 M11.2 12 V5 a1.6 1.6 0 0 1 3.2 0 V12 M14.4 12 V7 a1.6 1.6 0 0 1 3.2 0 V13.5 M17.6 13.5 c2 1.2 2 4-0.2 5.6 c-1.8 1.3-4.4 1.5-6.4 0.4 L8 17.5 c-1.4-0.8-1.2-2.8 0.4-3.2"/>' },
    { key: 'stick',  label: 'stick',  sub: 'push over', icon: '<path d="M5 19 L17 5 M17 5 l2.2-1 M17 5 l1 2.2" />' },
    { key: 'shovel', label: 'shovel', sub: 'dig out', icon: '<path d="M6 4 v6 M4.5 10 h3 M6 10 c0 4 1 6 3.4 7.4 M12 20 l6-6 M18 14 l-2-2 M12 20 l-2-2"/>' },
    { key: 'brush',  label: 'brush',  sub: 'paint', icon: '<path d="M6 20 c3 0 4-1.6 4-3.4 c0-1.2 1-2 2.2-2 L18 9 l-3-3 L9.4 11.8 c-0.9 0.9-1 2.4-2 2.8 c-0.8 0.4-1.4 1-1.4 2"/>' },
    { key: 'bucket', label: 'bucket', sub: 'scoop · pour', icon: '<path d="M5 9 h12 l-1.6 9 a2 2 0 0 1-2 1.6 H8.6 a2 2 0 0 1-2-1.6 Z M7 9 a5 5 0 0 1 8 0 M9 13 c1 1.4 3 1.4 4 0"/>' },
  ];
  function buildTools() {
    const rail = document.getElementById('mem-tools');
    if (!rail) return;
    rail.innerHTML = '';
    for (const t of TOOLS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mem-tool' + (S.tool === t.key ? ' on' : '');
      b.dataset.tool = t.key;
      b.setAttribute('aria-label', t.label + ' — ' + t.sub);
      b.setAttribute('aria-pressed', S.tool === t.key ? 'true' : 'false');
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">' + t.icon + '</svg>'
        + '<span>' + t.label + '</span><span class="t-sub">' + t.sub + '</span>';
      b.addEventListener('click', () => { setTool(t.key); toolHop(t.key); });
      rail.appendChild(b);
    }
  }
  function setTool(key) {
    S.tool = key;
    for (const k of ['stick', 'shovel', 'brush', 'bucket']) toolArm(k, k === key);
    const rail = document.getElementById('mem-tools');
    for (const b of rail.querySelectorAll('.mem-tool')) {
      const on = b.dataset.tool === key;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    const pal = document.getElementById('mem-palette');
    if (key === 'brush') pal.removeAttribute('hidden');
    else pal.setAttribute('hidden', '');
    say({
      hand: 'your hands: drag the figures where they belong.',
      stick: 'the stick from the yard: click a toy to push it over — click again to set it up.',
      shovel: 'the shovel: hold and drag to scrape the sand away. it digs down now.',
      brush: 'the brush: paint the sand. choose a colour below.',
      bucket: 'the bucket: hold to scoop sand up; keep the stroke going to pour it out.',
    }[key] || '');
  }

  const PAINTS = ['#b03030', '#2a5aaa', '#2a7a3a', '#e3c78a', '#7a3aaa', '#101010', '#ece4d2'];
  function buildPalette() {
    const pal = document.getElementById('mem-palette');
    if (!pal) return;
    pal.innerHTML = '';
    for (const c of PAINTS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mem-paint' + (S.paintColor === c ? ' on' : '');
      b.style.background = c;
      b.style.color = c;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', S.paintColor === c ? 'true' : 'false');
      b.setAttribute('aria-label', 'paint ' + c);
      b.addEventListener('click', () => {
        S.paintColor = c;
        for (const bb of pal.querySelectorAll('.mem-paint')) {
          const on = bb === b;
          bb.classList.toggle('on', on);
          bb.setAttribute('aria-checked', on ? 'true' : 'false');
        }
      });
      pal.appendChild(b);
    }
  }

  /* ── the camera / photographs ──────────────────────────────────────── */

  const photoWrap = document.getElementById('mem-photo');
  const photoImg = document.getElementById('mem-photo-img');
  const photoTitle = document.getElementById('mem-photo-title');
  const photoActions = document.getElementById('mem-photo-actions');
  const photoLabelRow = document.getElementById('mem-photo-label-row');
  const photoLabel = document.getElementById('mem-photo-label');
  const photoStory = document.getElementById('mem-photo-story');
  let pendingShot = null;
  let snapCamera = null;   // the tray-portrait camera, built on first shot

  function snapshot() {
    // the photograph is a tray-portrait, not a room snapshot: a second
    // camera stages the basin from a low storyteller's angle, and the
    // room itself steps out of the frame
    if (!snapCamera) {
      snapCamera = new THREE.PerspectiveCamera(40, 4 / 3, 0.1, 60);
    }
    snapCamera.position.set(-3.2, 3.9, 9.4);
    snapCamera.lookAt(0.1, 0.2, 0.4);
    snapCamera.aspect = 4 / 3;
    snapCamera.updateProjectionMatrix();
    // step the room out of the frame — direct children only, so the kept
    // figures, the basin, and the lights that dress the tray stay; figures
    // only count if they stand in the sand (a stray behind the basin would
    // otherwise hang in the void)
    const inTray = S.placed.filter((f) => Math.abs(f.position.x) <= HALF && Math.abs(f.position.z) <= HALF);
    const keep = [sand.basin, sand.mesh, ambient, lamp, lamp.target].concat(inTray);
    const hidden = [];
    for (const n of scene.children) {
      if (keep.indexOf(n) >= 0) continue;
      if ((n.isMesh || n.isGroup || n.isPoints || n.isLight) && n.visible) {
        n.visible = false;
        hidden.push(n);
      }
    }
    renderer.render(scene, snapCamera);
    let out = null;
    try { out = renderer.domElement.toDataURL('image/jpeg', 0.82); } catch (e) {}
    for (const n of hidden) n.visible = true;
    return out;
  }

  // reopening a hung photograph: the print, and what you wrote on it
  function openSaved(i) {
    const p = S.photos[i];
    if (!p) return;
    photoTitle.textContent = '— ' + (i === 0 ? 'the first' : i === 1 ? 'the second' : 'the third') + ' · ' + (p.label || 'untitled') + ' —';
    photoImg.src = p.dataUrl;
    photoImg.hidden = false;
    photoActions.style.display = 'none';
    photoLabelRow.hidden = true;
    photoStory.innerHTML = '';
    photoWrap.hidden = false;
    photoWrap.removeAttribute('inert');
  }

  function openPhotoUI() {
    if (!photoWrap) return;
    photoWrap.hidden = false;
    photoWrap.removeAttribute('inert');
    photoTitle.textContent = S.photos.length >= 2 ? '— the last frame —' : '— keep this picture? —';
    photoImg.src = pendingShot;
    photoImg.hidden = false;
    photoActions.style.display = '';
    photoLabelRow.hidden = true;
    photoStory.innerHTML = '';
  }

  function closePhotoUI() {
    if (!photoWrap) return;
    photoWrap.hidden = true;
    photoWrap.setAttribute('inert', '');
    pendingShot = null;
  }

  function hangInFrame(i, dataUrl) {
    const slot = stringEl.children[i];
    if (!slot) return;
    const img = slot.querySelector('img');
    if (!img) return;
    img.src = dataUrl;
    slot.classList.remove('empty');
  }

  function buildString() {
    if (!stringEl) return;
    stringEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('div');
      slot.className = 'mem-polaroid empty';
      slot.innerHTML = '<img alt=""/><span class="p-label"></span>';
      slot.addEventListener('click', () => openSaved(i));
      stringEl.appendChild(slot);
    }
    for (let i = 0; i < 3; i++) {
      const p = S.photos[i];
      if (!p) break;
      const slot = stringEl.children[i];
      slot.querySelector('img').src = p.dataUrl;
      slot.querySelector('.p-label').textContent = p.label || '';
      slot.classList.remove('empty');
    }
  }

  function labelPolaroid(i, label) {
    const slot = stringEl && stringEl.children[i];
    if (!slot) return;
    slot.querySelector('.p-label').textContent = label || '';
  }

  function hangPhoto(dataUrl, label) {
    S.photos.push({ dataUrl: dataUrl, label: label, at: Date.now() });
    const i = S.photos.length - 1;
    hangInFrame(i, dataUrl);
    labelPolaroid(i, label);
    chime();
    saveSoon();
  }

  function showStory() {
    photoTitle.textContent = '— the story of the tray —';
    photoImg.hidden = true;
    photoActions.style.display = 'none';
    photoLabelRow.hidden = true;
    const frames = S.photos.map((p, i) =>
      '<span class="frame"><b>' + ['first', 'second', 'third'][i] + ' · ' + (p.label || 'untitled') + '</b>'
      + '<img src="' + p.dataUrl + '" alt=""/></span>'
    ).join('');
    photoStory.innerHTML = frames
      + '<button type="button" class="mem-btn" id="mem-story-keep">keep it in the journal</button>';
    photoWrap.hidden = false;
    photoWrap.removeAttribute('inert');
    document.getElementById('mem-story-keep').addEventListener('click', saveStory);
  }

  function saveStory() {
    if (!st() || !S.photos.length) return;
    const payload = {
      kind: 'memory',
      name: 'a story in three frames',
      glyph: '▤',
      frames: S.photos.map((p) => ({ img: p.dataUrl, label: p.label })),
      figures: S.placed.map((f) => ({ kind: f.userData.kind, name: f.userData.name, scale: f.userData.scale, shadowed: !!f.userData.shadowed })),
      ts: Date.now(),
    };
    st().addArtifact('journal', payload);
    S.done = true;
    say('the tray settles onto the shelf. the room keeps it.');
    closePhotoUI();
    chime();
    S.photos = [];
    saveSoon();
  }

  document.getElementById('mem-shutter').addEventListener('click', () => {
    if (S.busy) return;
    pendingShot = snapshot();
    if (!pendingShot) { say('the camera jams. (the canvas refused its pixels.)'); return; }
    thunk();
    openPhotoUI();
  });
  document.getElementById('mem-photo-retake').addEventListener('click', () => { pendingShot = null; closePhotoUI(); });
  document.getElementById('mem-photo-close').addEventListener('click', closePhotoUI);
  document.getElementById('mem-photo-save').addEventListener('click', () => {
    if (!pendingShot) return;
    const soFar = S.photos.length;
    hangPhoto(pendingShot, '');
    pendingShot = null;
    if (soFar < 2) {
      photoTitle.textContent = '— write it on the back —';
      photoImg.src = S.photos[soFar].dataUrl;
      photoImg.hidden = false;
      photoActions.style.display = 'none';
      photoLabelRow.hidden = false;
      photoStory.innerHTML = '';
      photoLabel.value = '';
      photoLabel.focus();
    } else {
      showStory();
    }
  });
  photoLabel.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const i = S.photos.length - 1;
    if (i >= 0) {
      S.photos[i].label = photoLabel.value.trim();
      labelPolaroid(i, S.photos[i].label);
      if (i === 2) showStory();
      else closePhotoUI();
      saveSoon();
    }
  });

  /* ── studies, new tray, exit ───────────────────────────────────────── */

  const raison = document.getElementById('mem-raison');
  document.getElementById('mem-studies-btn').addEventListener('click', () => {
    raison.hidden = false; raison.removeAttribute('inert');
  });
  document.getElementById('mem-raison-close').addEventListener('click', () => {
    raison.hidden = true; raison.setAttribute('inert', '');
  });
  raison.addEventListener('click', (e) => { if (e.target === raison) { raison.hidden = true; raison.setAttribute('inert', ''); } });

  document.getElementById('mem-new').addEventListener('click', () => {
    if (S.busy) return;
    for (const fig of S.placed.slice()) liftFigure(fig);
    sand.reset();
    sand.rebuild();
    S.photos = [];
    buildString();
    say('the tray is empty again. the wall keeps what hung there.');
    thunk();
  });

  document.getElementById('mem-exit').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else location.href = 'desktop.html';
  });

  /* ── the frame loop ────────────────────────────────────────────────── */

  const clock = new THREE.Timer();
  function loop() {
    requestVisibleFrame(loop); // skip frames while the tab hides — no clock jump on return
    clock.update();
    const t = clock.getElapsed();
    tickCamera(t);
    // the bulb breathes; the room's light is never quite still
    if (!REDUCED) {
      const flicker = 1 + Math.sin(t * 11.3) * 0.012 + Math.sin(t * 4.7 + 1) * 0.02;
      lamp.intensity = (lampOn ? 185 : 0) * flicker;
      deskLamp.userData.bulb.material.emissiveIntensity = (lampOn ? 2.6 : 0.04) * flicker;
      dust.rotation.y = Math.sin(t * 0.05) * 0.05;
      dust.position.y = Math.sin(t * 0.11) * 0.08;
    }
    for (const m of machineRigs) {
      if (m.rig.userData.lamp.intensity > 0 && !S.busy) {
        m.rig.userData.lamp.intensity = 0;
        m.rig.userData.bulb.material.emissiveIntensity = 0;
      }
    }
    projectLabels();
    renderer.render(scene, camera);
  }

  /* ── resize ────────────────────────────────────────────────────────── */

  function resize() {
    // the room fills the glass — the scene is wide and the pillarbox only
    // ever cropped the crate out of the frame
    const w = fieldEl.clientWidth, h = fieldEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    VP.x = 0; VP.y = 0; VP.w = w; VP.h = h;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(fieldEl);
  resize();

  /* ── boot ──────────────────────────────────────────────────────────── */

  sand.rebuild();
  buildToyIndex();
  buildTools();
  buildPalette();
  setTool('hand');
  buildString();
  restore();
  if (!getState().memory) say('the tray is damp and waiting. take a toy from the crate.');
  loop();

  // probe hook for acceptance passes
  window.__memoryRoom = { S, sand, placeFigure, scene, camera, crate, toolMeshes };
})();
