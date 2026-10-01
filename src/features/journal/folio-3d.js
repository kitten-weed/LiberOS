// journal-folio-3d.js — the recto corner in three.js, photoreal pass.
//
// The DOM page IS the paper (its rules, ink and editor stay authoritative).
// three.js owns only what lies ON it: five pencil-sized instruments resting
// across the bottom corner — four lacquered hex pencils and one classic
// blocky highlighter — each a real object with a soft contact shadow. A
// click (raycast) arms a pen: it rocks up on its tip, and the highlighter's
// cap slides off while armed. Riason murmurs a line in the chosen ink.
//
// WebGL failure leaves the DOM pens in charge; the room degrades, never
// breaks. prefers-reduced-motion freezes the idle life and the rock.
import * as THREE from '../../../vendor/three.module.js';
import { requestVisibleFrame } from '../../three-shared.js';

(function () {
  'use strict';

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function boot() {
    var host = document.getElementById('journal-note');
    if (!host) return;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    var canvas = renderer.domElement;
    // The page's own layers (editor, text) stay clickable: the canvas paints
    // the pens, but picking is bound at the desk level so a click anywhere
    // tries the raycast first and otherwise falls through to writing.
    // The canvas overhangs the page's foot (see resize) so the instruments
    // can lie half off the page, onto the desk, instead of clipping.
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;z-index:1;pointer-events:none;display:block;';
    host.insertBefore(canvas, host.firstChild);
    // the study mounts inside .folio-stage; the app inside .journal-app —
    // either way the class hides the DOM fallback pens
    var stage = document.querySelector('.folio-stage') || document.querySelector('.journal-app');
    if (stage) stage.classList.add('folio-3d-live');
    var desk = stage || host;

    var scene = new THREE.Scene();

    /* ── camera: fitted to the page, gently tilted like a reader's eye ──── */
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    var camDist = 17.0;
    var camTilt = 4.2; // how far back the eye sits (z), for soft parallax

    /* ── environment for lacquer, brass and plastic ─────────────────────── */
    var pmrem = new THREE.PMREMGenerator(renderer);
    var envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x8a7250);
    var envWarm = new THREE.PointLight(0xffe0b0, 260, 30);
    envWarm.position.set(2, 6, 3);
    envScene.add(envWarm);
    var envCool = new THREE.PointLight(0x8a90b8, 50, 30);
    envCool.position.set(-5, 3, -4);
    envScene.add(envCool);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose(); // the env is baked; the generator's render targets can go

    /* ── light rig: the banker's lamp overhead ──────────────────────────── */
    scene.add(new THREE.AmbientLight(0xcdb48c, 0.95));
    var key = new THREE.SpotLight(0xffd9a0, 320, 40, Math.PI / 3.6, 0.5, 1.7);
    key.position.set(-2.0, 9.5, 3.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key, key.target);
    var bounce = new THREE.DirectionalLight(0xe8d0a8, 0.45);
    bounce.position.set(3, 4, 4);
    scene.add(bounce);

    /* ── invisible shadow-catcher: the DOM page stays the paper ─────────── */
    // Longer than the page so an instrument half off the foot still casts
    // its shadow onto the desk boards.
    var catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 13),
      new THREE.ShadowMaterial({ opacity: 0.30 })
    );
    catcher.rotation.x = -Math.PI / 2;
    catcher.position.set(0, 0, 0.9);
    catcher.receiveShadow = true;
    scene.add(catcher);

    /* ── shared materials ───────────────────────────────────────────────── */
    var brass = new THREE.MeshStandardMaterial({ color: 0xd2a052, roughness: 0.28, metalness: 0.92 });
    var graphite = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.42, metalness: 0.15 });
    var woodTip = new THREE.MeshStandardMaterial({ color: 0xdcb878, roughness: 0.62 });

    /* ── pencil: hex barrel, wood cone, graphite, ferrule, eraser ───────── */
    function makePencil(bodyHex, darkHex) {
      var g = new THREE.Group();
      var barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 2.62, 6),
        new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.32, metalness: 0.05, envMapIntensity: 0.75 })
      );
      barrel.rotation.z = Math.PI / 2;
      barrel.castShadow = true;
      var tip = new THREE.Mesh(new THREE.ConeGeometry(0.098, 0.4, 16), woodTip);
      // pointing LEFT (-x): the cone's +y axis rotated to -x
      tip.rotation.z = Math.PI / 2;
      tip.position.x = -1.51;
      tip.castShadow = true;
      var lead = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.11, 10), graphite);
      lead.rotation.z = Math.PI / 2;
      lead.position.x = -1.765;
      var ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.104, 0.104, 0.2, 16), brass);
      ferrule.rotation.z = Math.PI / 2;
      ferrule.position.x = 1.41;
      ferrule.castShadow = true;
      var band = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.01, 8, 20), new THREE.MeshStandardMaterial({ color: 0x9a7228, roughness: 0.35, metalness: 0.9 }));
      band.rotation.y = Math.PI / 2;
      band.position.x = 1.32;
      var eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.096, 0.17, 16), new THREE.MeshStandardMaterial({ color: 0xe8b8b0, roughness: 0.95 }));
      eraser.rotation.z = Math.PI / 2;
      eraser.position.x = 1.6;
      eraser.castShadow = true;
      g.add(barrel, tip, lead, ferrule, band, eraser);
      return g;
    }

    /* ── highlighter: the classic blocky felt-tip, chunky and saturated ── */
    function makeHighlighter() {
      var g = new THREE.Group();
      var bodyMat = new THREE.MeshPhysicalMaterial({
        color: 0xffd400, roughness: 0.36, metalness: 0.0,
        envMapIntensity: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.3
      });
      var body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.46), bodyMat);
      body.castShadow = true;
      // top-face chamfer strips: darker long edges sell the molded plastic
      var edgeMat = new THREE.MeshStandardMaterial({ color: 0xa8840c, roughness: 0.5 });
      [-0.21, 0.21].forEach(function (zEdge) {
        var strip = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.045, 0.03), edgeMat);
        strip.position.set(0, 0.19, zEdge);
        body.add(strip);
      });
      // the paper label band every classic highlighter wears
      var label = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.435, 0.475),
        new THREE.MeshStandardMaterial({ color: 0xf0e6c8, roughness: 0.85 })
      );
      label.position.set(0.34, 0, 0);
      body.add(label);
      var inkLine = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.485), new THREE.MeshStandardMaterial({ color: 0xcf9a06, roughness: 0.7 }));
      inkLine.position.set(0.34, 0.21, 0);
      body.add(inkLine);
      var buttCap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.48), new THREE.MeshStandardMaterial({ color: 0xc09c0e, roughness: 0.45 }));
      buttCap.position.x = 1.24;
      buttCap.castShadow = true;
      var collar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.49), new THREE.MeshStandardMaterial({ color: 0x9a7c0a, roughness: 0.5 }));
      collar.position.x = -1.04;
      var nibSeat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.34), new THREE.MeshStandardMaterial({ color: 0xb08c0c, roughness: 0.55 }));
      nibSeat.position.x = -1.22;
      var chisel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.2), new THREE.MeshStandardMaterial({ color: 0xcf9f10, roughness: 0.6 }));
      chisel.position.set(-1.46, 0.01, 0);
      chisel.rotation.z = -0.1;
      chisel.castShadow = true;
      // cap: solid near-black plastic with a brass pocket clip, seated over
      // the body's left end
      var cap = new THREE.Group();
      var capShell = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.52, 0.56),
        new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.35, envMapIntensity: 0.25 })
      );
      capShell.castShadow = true;
      var capClip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.045), new THREE.MeshStandardMaterial({ color: 0xd2a052, roughness: 0.3, metalness: 0.85 }));
      capClip.position.set(0.05, 0.04, 0.29);
      var clipFoot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.09), capClip.material);
      clipFoot.position.set(0.05, -0.1, 0.26);
      cap.add(capShell, capClip, clipFoot);
      cap.position.set(-1.08, 0, 0);
      g.add(body, buttCap, collar, nibSeat, chisel, cap);
      g.userData.cap = cap;
      return g;
    }

    /* ── contact shadows: soft smears anchored low, stretching up-page ──
       The lamp sits low and in front, so each instrument throws a soft
       shadow that starts under it and climbs the page away from the
       reader. Built from stacked radial blobs (every one fading to zero at
       its rim) so no hard edge can ever show. Synced to its pen: position,
       yaw, and fade as the pen lifts. */
    function blob(x, x0, y0, rx, ry, alpha) {
      var gr = x.createRadialGradient(x0, y0, 1, x0, y0, rx);
      gr.addColorStop(0, 'rgba(28, 16, 6, ' + alpha + ')');
      gr.addColorStop(1, 'rgba(28, 16, 6, 0)');
      x.save();
      x.translate(x0, y0);
      x.scale(1, ry / rx);
      x.translate(-x0, -y0);
      x.fillStyle = gr;
      x.beginPath();
      x.arc(x0, y0, rx, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    function contactShadow(len) {
      var c = document.createElement('canvas');
      c.width = 256; c.height = 200;
      var x = c.getContext('2d');
      // tight dark core directly under the barrel (canvas bottom third)
      blob(x, 128, 148, 96, 17, 0.26);
      // the penumbra climbing: two fainter, wider blobs above it
      blob(x, 128, 108, 108, 26, 0.10);
      blob(x, 128, 58, 116, 40, 0.05);
      var tex = new THREE.CanvasTexture(c);
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(len * 1.05, len * 0.82),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 1 })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.012;
      m.renderOrder = 1;
      return m;
    }

    /* ── the five instruments, resting across the bottom corner ─────────── */
    var pens = [];
    // All five instruments lie across the bottom band, tips facing the top
    // of the page. Yaw −π/2 maps the nib's local −x end to up-page (−z);
    // the ±14° scatter keeps the row casually put down, not aligned.
    var PENS = [
      { id: 'hl', color: 0xf5d800, dark: 0xb8a020, hl: true, say: 'bright enough to find later. good.', sayCss: '#a8901a', pos: [1.35, 4.75], rot: -Math.PI / 2 + 0.1 },
      { id: 'red', color: 0xb03030, dark: 0x701c1c, say: 'red :O corrections i see..', sayCss: '#b03030', pos: [-1.55, 4.95], rot: -Math.PI / 2 - 0.16 },
      { id: 'blue', color: 0x2a5aaa, dark: 0x1a3870, say: 'blue calms me.', sayCss: '#2a5aaa', pos: [-0.35, 5.1], rot: -Math.PI / 2 + 0.08 },
      { id: 'green', color: 0x2a7a3a, dark: 0x1a5026, say: 'geen. yes, geen.', sayCss: '#2a7a3a', pos: [2.75, 5.0], rot: -Math.PI / 2 - 0.24 },
      { id: 'violet', color: 0x7a3aaa, dark: 0x502672, say: 'urple. for the strange parts.', sayCss: '#7a3aaa', pos: [-2.8, 4.8], rot: -Math.PI / 2 + 0.2 }
    ];
    var baseY = { pencil: 0.1, hl: 0.22 };
    PENS.forEach(function (def, idx) {
      var obj = def.hl ? makeHighlighter() : makePencil(def.color, def.dark);
      var y = def.hl ? baseY.hl : baseY.pencil;
      obj.position.set(def.pos[0], y, def.pos[1]);
      obj.rotation.y = def.rot;
      if (!def.hl) obj.rotation.z = (idx % 2 ? -1 : 1) * 0.01;
      obj.userData.def = def;
      obj.userData.homeY = y;
      obj.userData.homeRot = obj.rotation.y;
      obj.userData.phase = Math.random() * Math.PI * 2;
      var sh = contactShadow(def.hl ? 3.0 : 3.3);
      // anchored slightly down-page of the barrel so the tail climbs past it
      sh.position.set(def.pos[0], 0.012, def.pos[1] + 0.52);
      sh.rotation.z = -def.rot;
      scene.add(sh);
      obj.userData.shadow = sh;
      pens.push(obj);
      scene.add(obj);
    });

    /* ── interaction: raycast picking, armed rocking, cap slide ─────────── */
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();
    var armed = null;
    var hover = null;
    var sayEl = document.getElementById('journal-pen-say');
    var sayTimer = null;

    function penSay(def) {
      if (!sayEl) return;
      sayEl.textContent = def.say;
      sayEl.style.color = def.sayCss;
      sayEl.classList.add('show');
      clearTimeout(sayTimer);
      sayTimer = setTimeout(function () { sayEl.classList.remove('show'); }, 4200);
    }

    function pickAt(e) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(pens, true);
      if (!hits.length) return null;
      var node = hits[0].object;
      while (node && pens.indexOf(node) < 0) node = node.parent;
      return node;
    }

    // picking rides the desk (the canvas itself is pointer-transparent so
    // the editor stays the writing surface everywhere else; binding at the
    // desk level also catches the pen halves that lie off the page)
    desk.addEventListener('pointermove', function (e) {
      if (e.target.closest && e.target.closest('button, a, input, textarea, .journal-pop, .study-note')) { hover = null; return; }
      hover = pickAt(e);
      host.style.cursor = hover ? 'pointer' : '';
    });
    desk.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('button, a, input, textarea, .journal-pop, .smark-hl, .study-note')) return;
      var hit = pickAt(e);
      if (!hit) return;
      e.preventDefault();
      var def = hit.userData.def;
      if (armed === hit) {
        armed = null;
        if (def.hl && hit.userData.cap) hit.userData.cap.userData.reseat = true;
        return;
      }
      armed = hit;
      pens.forEach(function (p) {
        if (p.userData.def.hl && p.userData.cap && p !== hit) p.userData.cap.userData.reseat = true;
      });
      if (def.hl && hit.userData.cap) hit.userData.cap.userData.slideOff = true;
      penSay(def);
    });

    /* ── frame loop: idle life + armed rocking + cap slide ──────────────── */
    var clock = new THREE.Timer();
    var still = 0; // consecutive frames with nothing left to move

    function tickFrame() {
      requestVisibleFrame(tickFrame); // skip frames while the tab hides — no clock jump on return
      clock.update();
      var t = clock.getElapsed();
      // under reduced motion the desk can come fully to rest; stop repainting
      // the same frame until something (hover, arm, resize) wakes it again
      var moving = !REDUCED;

      pens.forEach(function (p) {
        var d = p.userData;
        var isArmed = armed === p;
        var isHover = hover === p;
        var targetLift = isArmed ? 0.14 : (isHover ? 0.045 : 0);
        d.lift = d.lift === undefined ? 0 : d.lift + (targetLift - d.lift) * 0.14;
        if (Math.abs(targetLift - d.lift) > 0.0004) moving = true;
        var breathe = REDUCED ? 0 : Math.sin(t * 1.3 + d.phase) * 0.003;
        var rock = isArmed && !REDUCED ? Math.sin(t * 2.6) * 0.045 : 0;
        p.position.y = d.homeY + d.lift + breathe;
        p.rotation.x = rock;
        p.rotation.y = d.homeRot + (isHover && !isArmed ? Math.sin(t * 1.8 + d.phase) * 0.012 : 0);

        // the smear rides its pen: position + yaw + fade as it lifts
        if (d.shadow) {
          d.shadow.position.x = p.position.x;
          d.shadow.position.z = p.position.z + 0.52;
          d.shadow.rotation.z = -p.rotation.y;
          d.shadow.material.opacity = Math.max(0, 1 - d.lift * 4.5);
        }

        var cap = d.cap;
        if (cap) {
          var target = (isArmed || (cap.userData.slideT || 0) > 0.02) && !cap.userData.reseat ? 1 : 0;
          cap.userData.slideT = cap.userData.slideT || 0;
          cap.userData.slideT += (target - cap.userData.slideT) * 0.12;
          if (Math.abs(target - cap.userData.slideT) > 0.0004) moving = true;
          if (target === 0 && Math.abs(cap.userData.slideT) < 0.01) { cap.userData.slideT = 0; cap.userData.reseat = false; }
          var s = cap.userData.slideT;
          cap.position.set(-1.32 - s * 0.5, -s * 0.05, s * 0.42);
          cap.rotation.z = s * 0.9;
          cap.rotation.x = s * 0.22;
        }
      });

      if (moving) still = 0; else still++;
      if (moving || still < 3) renderer.render(scene, camera);
    }

    /* ── sizing: the visible world IS the recto page, plus the desk's foot ─
       The camera is fitted so the page fills the canvas exactly as before,
       but the canvas runs ~20% taller than the page: the extra strip below
       the page's bottom edge is real desk, and the instruments straddle it. */
    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      still = -1; // the frame changed under us — repaint before resting again
      var over = Math.round(h * 0.22); // px of canvas past the page's foot
      renderer.setSize(w, h + over, false);
      canvas.style.height = (h + over) + 'px';
      camera.aspect = w / (h + over);
      // keep the page's pixels-per-world unchanged; only the foot extends
      var halfH = 5.1 * (h + over) / h;
      camDist = halfH / Math.tan((camera.fov * Math.PI / 180) / 2);
      camera.position.set(0, camDist - camTilt * 0.25, camTilt);
      camera.lookAt(0, 0, 0.35 + 5.1 * over / h);
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
    resize();
    tickFrame();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
