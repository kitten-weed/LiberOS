// forge-3d.js — the forgework's apparatus in three.js.
//
// Two small scenes, one module, study + app shared:
//   1. THE PLATE RACK (bay 2): four zinc plates standing in a steel rack.
//      Active plate slides forward; laid plates carry their numeral etched
//      bright; sealed plates sit dark. A click raycasts through to
//      window.LiberForgeHooks.onPickPlate — the DOM legend stays the
//      authoritative control.
//   2. VESSEL 04 (bay 3): glass cylinder with brass mouth/foot rings on a
//      dark plinth. The live composite (the four comp canvases, already
//      alpha-correct) streams onto a plate of paper inside the jar. An
//      ember light flickers during the plate-commit transfer only.
//
// WebGL failure leaves the CSS jar and the DOM rack legend in charge —
// the room degrades, never breaks. prefers-reduced-motion freezes flicker
// and easing; state still jumps to its final position.
import * as THREE from '../../../vendor/three.module.js';
import { requestVisibleFrame } from '../../three-shared.js';

(function () {
  'use strict';

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hooks = window.LiberForgeHooks = window.LiberForgeHooks || {};

  function makeRenderer(host, alpha) {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: !!alpha, antialias: true });
    } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    var canvas = renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;';
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(canvas);
    return renderer;
  }

  function warmEnv(renderer) {
    var pmrem = new THREE.PMREMGenerator(renderer);
    var env = new THREE.Scene();
    env.background = new THREE.Color(0x1c1f26);
    var warm = new THREE.PointLight(0xbcd0e8, 120, 24);
    warm.position.set(2, 5, 4);
    env.add(warm);
    var cool = new THREE.PointLight(0x6a7a90, 26, 24);
    cool.position.set(-4, 2, -3);
    env.add(cool);
    var tex = pmrem.fromScene(env, 0.05).texture;
    pmrem.dispose(); // the env is baked; the generator's render targets can go
    return tex;
  }

  /* ══ 1. the plate rack ══════════════════════════════════════════════ */

  var KEYS = ['outline', 'clothes', 'traits', 'others'];
  var NUM = { outline: 'I', clothes: 'II', traits: 'III', others: 'IV' };

  function bootRack() {
    var host = document.getElementById('forge-rack3d');
    if (!host) return;
    var renderer = makeRenderer(host, true);
    if (!renderer) return;
    var scene = new THREE.Scene();
    scene.environment = warmEnv(renderer);

    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0.3, 6.4, 0.02);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0x8a94a2, 0x0e1014, 1.0));
    var key = new THREE.SpotLight(0xd9e4f2, 140, 30, Math.PI / 3.4, 0.6, 1.8);
    key.position.set(-3, 6, 5);
    scene.add(key, key.target);
    var ember = new THREE.PointLight(0x7a90b8, 18, 14);
    ember.position.set(2.6, 0.2, 2.2);
    scene.add(ember);

    // the machine bed
    var bed = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 0.18, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.72, metalness: 0.35 })
    );
    bed.position.y = -0.09;
    scene.add(bed);

    // the rack frame stands behind the plate row (a thin dark lip at the
    // strip's top edge from the straight-down lens, never over the plates)
    var steel = new THREE.MeshStandardMaterial({ color: 0x525a64, roughness: 0.38, metalness: 0.85 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.5, metalness: 0.7 });
    [-3.1, 3.1].forEach(function (x) {
      var post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.2, 0.3), steel);
      post.position.set(x, 1.0, -1.15);
      scene.add(post);
      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.9), dark);
      foot.position.set(x, 0.05, -1.15);
      scene.add(foot);
    });
    [0.42, 1.06, 1.7].forEach(function (y) {
      var rail = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.09, 0.22), steel);
      rail.position.set(0, y, -1.2);
      scene.add(rail);
    });

    // zinc plates with etched numerals
    var zinc = new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.34, metalness: 0.82, envMapIntensity: 0.9 });
    var plates = [];
    function plateTexture(key, st) {
      var c = document.createElement('canvas');
      c.width = 256; c.height = 320;
      var x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, 0, 320);
      if (st === 'sealed') { g.addColorStop(0, '#3e4146'); g.addColorStop(1, '#2c2e33'); }
      else if (st === 'laid') { g.addColorStop(0, '#b6bec4'); g.addColorStop(1, '#848c94'); }
      else { g.addColorStop(0, '#9aa2a8'); g.addColorStop(1, '#6f777f'); }
      x.fillStyle = g; x.fillRect(0, 0, 256, 320);
      x.strokeStyle = 'rgba(255,255,255,0.05)';
      for (var i = 0; i < 40; i++) { x.beginPath(); x.moveTo(0, i * 8 + 4); x.lineTo(256, i * 8 + 1); x.stroke(); }
      x.textAlign = 'center';
      x.fillStyle = st === 'laid' ? '#f4e6c4' : (st === 'sealed' ? '#4c5058' : '#3a3e46');
      x.font = '86px "Deutsch Gothic", Georgia, serif';
      x.fillText(NUM[key], 128, 176);
      x.font = '16px monospace';
      x.fillStyle = st === 'sealed' ? 'rgba(160,170,180,0.35)' : 'rgba(40,44,50,0.6)';
      x.fillText('FORGE 04 · ' + key.toUpperCase(), 128, 250);
      x.strokeStyle = st === 'laid' ? 'rgba(160,180,205,0.85)' : 'rgba(30,32,36,0.7)';
      x.lineWidth = 5; x.strokeRect(10, 10, 236, 300);
      var tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    KEYS.forEach(function (key, i) {
      var m = new THREE.MeshStandardMaterial({ map: plateTexture(key, 'open'), roughness: 0.42, metalness: 0.6 });
      var plate = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.6, 0.045), m);
      // the table is seen straight down through the closed glass lid:
      // plates lie flat, faces up, in a row beside the platen
      plate.rotation.x = -Math.PI / 2;
      plate.position.set(-2.34 + i * 1.56, 0.07, 0);
      plate.userData = { key: key, baseY: 0.07, state: 'open', tex: m.map };
      scene.add(plate);
      plates.push(plate);
    });

    // picking rides the host (canvas is pointer-transparent)
    var ray = new THREE.Raycaster();
    var ptr = new THREE.Vector2();
    var hover = null;
    function pickAt(e) {
      var r = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      var hits = ray.intersectObjects(plates, false);
      return hits.length ? hits[0].object : null;
    }
    host.addEventListener('pointermove', function (e) {
      if (e.target.closest && e.target.closest('button, a, input, textarea')) { hover = null; return; }
      hover = pickAt(e);
      host.style.cursor = hover ? 'pointer' : '';
    });
    host.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('button, a, input, textarea')) return;
      var hit = pickAt(e);
      if (hit && hooks.onPickPlate) hooks.onPickPlate(hit.userData.key);
    });

    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // straight-down view: fit the rack row (≈7.6 wide) at any aspect
      var t = Math.tan(camera.fov * Math.PI / 360);
      var dist = Math.max(3.95 / (t * camera.aspect), 2.15 / t) + 0.28;
      camera.position.set(0, dist, 0.02);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
    resize();

    var clock = new THREE.Timer();
    (function frame() {
      requestVisibleFrame(frame); // skip frames while the tab hides — no clock jump on return
      clock.update();
      var t = clock.getElapsed();
      plates.forEach(function (p, i) {
        var d = p.userData;
        var isActive = d.key === (hooks.state && hooks.state.active);
        var lift = isActive ? 0.17 : (hover === p ? 0.08 : 0);
        p.position.y = d.baseY + (REDUCED ? lift : d.lift === undefined ? 0 : (d.lift += (lift - d.lift) * 0.14));
        if (REDUCED) d.lift = lift;
        // the numeral drifts a hair in-plane, like a plate nudged on the bed
        p.rotation.z = (i % 2 ? -1 : 1) * (REDUCED ? 0 : Math.sin(t * 0.7 + i * 1.7) * 0.003);
      });
      ember.intensity = 18 + (REDUCED ? 0 : Math.sin(t * 2.2) * 2.5);
      renderer.render(scene, camera);
    })();

    // state in: {active, saved:{}, unlocked:{}}
    hooks.applyRack = function (st) {
      plates.forEach(function (p) {
        var d = p.userData;
        var state = st.saved[d.key] ? 'laid' : (st.unlocked[d.key] ? 'open' : 'sealed');
        if (state !== d.state) {
          d.state = state;
          var nm = p.material;
          var nt = plateTexture(d.key, state);
          nm.map = nt;           // rebind first — the mesh must never sample a dead texture
          nm.needsUpdate = true;
          if (d.tex && d.tex !== nt) d.tex.dispose();
          d.tex = nt;
        }
      });
    };

    // the blackletter loads after first paint — restamp the numerals once it lands
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        plates.forEach(function (p) {
          var d = p.userData;
          var nt = plateTexture(d.key, d.state);
          p.material.map = nt;   // rebind first — dispose only the orphaned texture
          p.material.needsUpdate = true;
          if (d.tex && d.tex !== nt) d.tex.dispose();
          d.tex = nt;
        });
      });
    }
  }

  /* ══ 2. vessel 04 ═══════════════════════════════════════════════════ */

  function bootVessel() {
    var host = document.getElementById('vessel-jar3d');
    if (!host) return;
    var renderer = makeRenderer(host, true);
    if (!renderer) return;
    var scene = new THREE.Scene();
    scene.environment = warmEnv(renderer);

    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
    camera.position.set(0.25, 0.55, 3.4);
    camera.lookAt(0, -0.02, 0);

    scene.add(new THREE.HemisphereLight(0x767e8a, 0x08090b, 0.85));
    var key = new THREE.SpotLight(0xd9e4f2, 130, 20, Math.PI / 3.2, 0.55, 1.8);
    key.position.set(-1.8, 3.4, 2.6);
    scene.add(key, key.target);

    // the hearth under the foot — sleeps cool; only the flame wakes it
    var ember = new THREE.PointLight(0x6a7890, 8, 7);
    ember.position.set(0.5, -1.05, 0.9);
    scene.add(ember);

    // ══ the chamber the vessel stands in ══
    // dark stone floor with a faint reflection of the jar
    var floor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 48),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.55, metalness: 0.35 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.62;
    scene.add(floor);
    // back wall of charred brick courses, just off focus behind the jar
    (function wall() {
      var cvs = document.createElement('canvas');
      cvs.width = 256; cvs.height = 256;
      var x = cvs.getContext('2d');
      x.fillStyle = '#191009'; x.fillRect(0, 0, 256, 256);
      for (var r = 0; r < 16; r++) {
        for (var c = 0; c < 9; c++) {
          var off = (r % 2) * 14;
          var v = 12 + Math.sin(r * 7.3 + c * 3.1) * 10;
          x.fillStyle = 'rgb(' + (26 + v) + ',' + (16 + v * 0.6) + ',' + (11 + v * 0.4) + ')';
          x.fillRect(c * 30 + off - 28, r * 16, 27, 13);
        }
      }
      x.fillStyle = 'rgba(0,0,0,0.35)';
      for (var g = 0; g < 90; g++) x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      var tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2.4, 1.4);
      var w = new THREE.Mesh(
        new THREE.PlaneGeometry(11, 6.4),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.05 })
      );
      w.position.set(0, 0.9, -2.4);
      scene.add(w);
    })();
    // the work lamp hanging over the vessel: cord, shade, warm bulb glow
    var lampGlow = new THREE.PointLight(0xd9e4f2, 36, 9, 1.5);
    lampGlow.position.set(0, 1.72, 0.35);
    scene.add(lampGlow);
    var lampCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 0.3, 28, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x272b32, roughness: 0.5, metalness: 0.75, side: THREE.DoubleSide })
    );
    lampCone.position.set(0, 1.86, 0.35);
    scene.add(lampCone);
    var bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xe4ecf6 })
    );
    bulb.position.set(0, 1.72, 0.35);
    scene.add(bulb);
    var cordMat = new THREE.MeshBasicMaterial({ color: 0x0a0c0f });
    [0.9, 1.6].forEach(function (h) {
      var cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, h, 6), cordMat);
      cord.position.set(0, 1.86 + h / 2, 0.35);
      scene.add(cord);
    });
    // bench props, half in shadow: a crucible and a spare gear
    var crucible = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.11, 0.24, 20),
      new THREE.MeshStandardMaterial({ color: 0x33383f, roughness: 0.8, metalness: 0.15 })
    );
    crucible.position.set(-1.15, -1.46, 0.6);
    scene.add(crucible);
    var gear = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.045, 10, 12),
      new THREE.MeshStandardMaterial({ color: 0x525a64, roughness: 0.4, metalness: 0.85 })
    );
    gear.rotation.x = -Math.PI / 2 + 0.25;
    gear.position.set(1.05, -1.5, 0.75);
    scene.add(gear);
    // floor vent grill under the plinth — the incinerator's throat
    var grill = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.02, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x0d0f13, roughness: 0.6, metalness: 0.6 })
    );
    grill.position.set(0, -1.58, 1.15);
    scene.add(grill);

    // ══ the flame: a living procedural fire, rising from the grill ══
    var flameCanvas = document.createElement('canvas');
    flameCanvas.width = 64; flameCanvas.height = 128;
    var flameCtx = flameCanvas.getContext('2d');
    var flameTex = new THREE.CanvasTexture(flameCanvas);
    flameTex.colorSpace = THREE.SRGBColorSpace;
    var flameMat = new THREE.MeshBasicMaterial({
      map: flameTex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    var flame = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.42), flameMat);
    flame.position.set(0, -0.98, 1.32);
    scene.add(flame);
    var flameCore = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.8), flameMat);
    flameCore.position.set(0, -1.18, 1.34);
    scene.add(flameCore);
    var flame2 = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.42), flameMat);
    flame2.position.copy(flame.position);
    flame2.rotation.y = Math.PI / 2;
    scene.add(flame2);

    // the sparks: little lives that leap from the fire and cool as they rise
    var embers = [];
    var sparkGeo = new THREE.SphereGeometry(0.016, 6, 5);
    for (var ei = 0; ei < 26; ei++) {
      var spark = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({
        color: 0xff7020, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      spark.userData = { birth: -1, dur: 1, vx: 0, s: 1, bx: 0 };
      spark.position.set(0, -1.56, 1.15);
      scene.add(spark);
      embers.push(spark);
    }

    // plinth + jar
    var plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.98, 1.06, 0.16, 40),
      new THREE.MeshStandardMaterial({ color: 0x16191e, roughness: 0.6, metalness: 0.3 })
    );
    plinth.position.y = -0.98;
    scene.add(plinth);

    var H = 1.7, R = 0.78;
    var glass = new THREE.MeshPhysicalMaterial({
      color: 0xdfe8ee, roughness: 0.06, metalness: 0,
      transparent: true, opacity: 0.13, side: THREE.DoubleSide,
      clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2
    });
    var jar = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.96, H, 48, 1, false), glass);
    jar.position.y = -0.06;
    scene.add(jar);
    var inner = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 0.93, R * 0.9, H * 0.94, 40),
      new THREE.MeshBasicMaterial({ color: 0xaebdc6, transparent: true, opacity: 0.05, side: THREE.BackSide })
    );
    inner.position.y = -0.07;
    scene.add(inner);

    var steelRing = new THREE.MeshStandardMaterial({ color: 0x9aa3ae, roughness: 0.3, metalness: 0.9 });
    var steelRingDark = new THREE.MeshStandardMaterial({ color: 0x5f6873, roughness: 0.42, metalness: 0.85 });
    var mouth = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.055, 14, 48), steelRing);
    mouth.rotation.x = Math.PI / 2;
    mouth.position.y = H / 2 - 0.1;
    scene.add(mouth);
    var lip = new THREE.Mesh(new THREE.TorusGeometry(R + 0.015, 0.03, 12, 48), steelRingDark);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = H / 2 - 0.02;
    scene.add(lip);
    var foot = new THREE.Mesh(new THREE.TorusGeometry(R * 0.96, 0.05, 14, 48), steelRingDark);
    foot.rotation.x = Math.PI / 2;
    foot.position.y = -H / 2 - 0.02;
    scene.add(foot);

    // the paper of the work, standing inside
    var compCv = document.createElement('canvas');
    compCv.width = 1080; compCv.height = 1224;
    var compCtx = compCv.getContext('2d');
    var compTex = new THREE.CanvasTexture(compCv);
    compTex.colorSpace = THREE.SRGBColorSpace;
    var paper = new THREE.Mesh(
      new THREE.BoxGeometry(1.06, 1.2, 0.012),
      new THREE.MeshStandardMaterial({ map: compTex, color: 0xf5e6cc, roughness: 0.85, metalness: 0 })
    );
    paper.position.set(0, -0.1, 0.06);
    scene.add(paper);

    var SOURCES = [
      ['poppet-c-outline', 1],
      ['poppet-c-clothes', 1],
      ['poppet-c-traits', 1],
      ['poppet-c-others', 1]
    ];
    function redrawComposite() {
      compCtx.clearRect(0, 0, 1080, 1224);
      SOURCES.forEach(function (s) {
        var cv = document.getElementById(s[0]);
        if (cv) compCtx.drawImage(cv, 0, 0);
      });
      compTex.needsUpdate = true;
    }

    var flicker = 0;
    var inferno = 0;
    hooks.transferBeat = function () { if (!REDUCED) flicker = 1; };
    hooks.incinerateBeat = function () { if (!REDUCED) inferno = 1; };
    hooks.setDream = function (on) {
      paper.material.color.set(on ? 0xb8a8e8 : 0xf5e6cc);
      ember.color.set(on ? 0x8a6ae0 : 0x6a7890);
      key.color.set(on ? 0xc8b0ff : 0xd9e4f2);
      lampGlow.color.set(on ? 0xc8b0ff : 0xd9e4f2);
      bulb.material.color.set(on ? 0xd0c0ff : 0xe4ecf6);
    };

    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // fit the jar (≈2.3 tall incl. rings and plinth, ≈2.3 wide with the
      // plinth) — same portrait-safe fit as the rack
      var t = Math.tan(camera.fov * Math.PI / 360);
      var dist = Math.max(1.3 / t, 1.25 / (t * camera.aspect)) + 0.62;
      camera.position.set(0.25, 0.35, dist);
      camera.lookAt(0, -0.08, 0);
      camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
    resize();

    var clock = new THREE.Timer();
    var lastDraw = 0;
    (function frame() {
      requestVisibleFrame(frame); // skip frames while the tab hides — no clock jump on return
      clock.update();
      var t = clock.getElapsed();
      if (t - lastDraw > 0.25) { lastDraw = t; redrawComposite(); }
      if (flicker > 0) flicker = Math.max(0, flicker - 0.016);
      // the fire catches fast and dies slow, like a real hearth
      if (inferno > 0) inferno = Math.min(1, inferno + 0.055);
      else inferno = Math.max(0, inferno - 0.0075);
      var f = REDUCED ? 0 : (Math.sin(t * 30) * 0.5 + Math.sin(t * 7.3) * 0.5) * flicker;
      var g2 = REDUCED ? 0 : inferno * (0.82 + Math.sin(t * 6.1) * 0.1 + Math.sin(t * 13.7) * 0.08);
      ember.intensity = 8 + f * 26 + g2 * 60 + (REDUCED ? 0 : Math.sin(t * 1.4) * 0.8);
      // the hearth sleeps cool; the flame wakes it orange
      ember.color.setRGB(0.42 + g2 * 0.58, 0.47 + g2 * 0.13, 0.56 - g2 * 0.31);
      // the incinerator's throat glows through the floor vent
      grill.material.emissive.setRGB(g2 * 0.9, g2 * 0.28, g2 * 0.04);
      // ── the living flame: procedural fire, billboards facing the lens ──
      if (g2 > 0.01 && !REDUCED) {
        flameMat.opacity = Math.min(1, g2 * 1.35);
        var fc = flameCtx;
        fc.clearRect(0, 0, 64, 128);
        for (var li = 0; li < 10; li++) {
          var lp = li / 9;
          var lw = 3.5 + lp * 19 + Math.sin(t * 11 + li * 2.1 + 4) * 2.4;
          var lx = 32 + Math.sin(t * (3.1 + lp * 4.5) + li * 1.7) * (2 + lp * 10);
          var ly = 126 - lp * (104 + Math.sin(t * 6.5 + li * 0.8) * 10);
          var heat = 1 - lp;
          var grad = fc.createRadialGradient(lx, ly, 0, lx, ly, Math.max(1, lw));
          grad.addColorStop(0, 'rgba(255,' + Math.round(150 + 90 * heat) + ',' + Math.round(40 + 70 * heat * heat) + ',' + (0.5 * (0.5 + heat * 0.5)).toFixed(3) + ')');
          grad.addColorStop(1, 'rgba(140,30,5,0)');
          fc.fillStyle = grad;
          fc.beginPath(); fc.arc(lx, ly, Math.max(1, lw), 0, Math.PI * 2); fc.fill();
        }
        flameTex.needsUpdate = true;
        flame.lookAt(camera.position.x, flame.position.y, camera.position.z);
        flameCore.lookAt(camera.position.x, flameCore.position.y, camera.position.z);
        var sc = 1.0 + Math.sin(t * 7.5) * 0.1 + Math.sin(t * 13.7) * 0.06;
        flame.scale.set(sc, 0.92 + g2 * 0.5 + Math.sin(t * 9.1) * 0.07, 1);
        flame2.scale.copy(flame.scale);
        flameCore.scale.set(sc, 0.85 + g2 * 0.35 + Math.sin(t * 11.3) * 0.05, 1);
        embers.forEach(function (e) {
          var u = e.userData;
          if (u.birth < 0 || (t - u.birth) / u.dur >= 1) {
            if (u.birth >= 0 && Math.random() > g2 * 0.5) { u.birth = -1; e.material.opacity = 0; return; }
            u.birth = t;
            u.vx = (Math.random() - 0.5) * 0.16;
            u.dur = 1.5 + Math.random() * 1.2;
            u.s = 0.6 + Math.random() * 0.9;
            u.bx = (Math.random() - 0.5) * 0.44;
          }
          var life = Math.min(1, Math.max(0, (t - u.birth) / u.dur));
          e.position.x = u.bx + Math.sin(t * 2.2 + u.s * 21) * 0.06 + life * u.vx * 2.5;
          e.position.y = -1.56 + life * (0.9 + u.s * 0.8);
          var flick = 0.55 + Math.sin(t * 17 + u.s * 40) * 0.3;
          e.material.opacity = Math.min(1, g2 * 1.3) * (1 - life) * flick;
          var hs = 1 - life * 0.55;
          e.material.color.setRGB(1, 0.28 + 0.5 * hs, 0.06);
          var es = u.s * (0.7 + life * 0.5);
          e.scale.set(es, es, es);
        });
      } else {
        flameMat.opacity = 0;
        embers.forEach(function (e) { e.material.opacity = 0; });
      }
      renderer.render(scene, camera);
    })();

    // composite canvases change silently — a light poke keeps the texture honest
    if (window.MutationObserver) {
      var probe = document.getElementById('poppet-comp');
      if (probe) new MutationObserver(function () { lastDraw = -1; }).observe(probe, { attributes: true, subtree: true, childList: true });
    }
  }

  function boot() {
    bootRack();
    bootVessel();
    var stage = document.querySelector('.forge-stage');
    if (stage) stage.classList.add('forge-3d-live');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
