// pixi-layer.js — LiberOS GPU room atmosphere.
//
// Ownership: Pixi paints the room the machine stands in (wall, floor, table,
// light, dust). The physical tube glass is a noninteractive CSS pane inside
// .screen, so room lighting stays on the shared canvas and the DOM stays
// authoritative for copy, controls, focus, and persistence.
//
// The shared canvas is inert. Room atmosphere uses one custom fragment shader
// and batched scene drawing; it does not own a separate tube renderer or RAF.
(function (global) {
  'use strict';

  function mountTubeGlass() {
    var doc = global.document;
    var host = doc && doc.querySelector('.screen');
    if (!host) {
      if (doc && doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mountTubeGlass, { once: true });
      return;
    }
    if (host.querySelector('.crt-tube-glass')) return;
    var glass = doc.createElement('div');
    glass.className = 'crt-tube-glass';
    glass.setAttribute('aria-hidden', 'true');
    host.appendChild(glass);
  }
  mountTubeGlass();

  // Run 5: the external register is pixel art end-to-end. Keep the class on
  // the document root so CSS fallback furniture and the Pixi canvas share one
  // visual contract without rasterising semantic text or controls.
  if (global.document && global.document.documentElement) global.document.documentElement.classList.add('pixel-register');
  if (!global.PIXI || global.__liberPixi) return;
  global.__liberPixi = true;

  var PIXI = global.PIXI;
  var REDUCED = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var DPR = Math.min(global.devicePixelRatio || 1, 2);
  // Run 3 foundation: room geometry is authored against a 64px logical
  // register, then scaled to the live viewport. DOM copy remains fluid; only
  // external scene marks and seams use this snap so the pixel-art layer keeps
  // a consistent hand without forcing the monitor into a low-resolution box.
  var PIXEL_GRID = 64;
  // Render external surfaces at a deliberately lower internal resolution and
  // enlarge them with nearest-neighbour CSS. Four CSS pixels become one art
  // pixel: chunky enough to design against, still faithful to the existing
  // proportions and composition.
  var PIXEL_SCALE = 6;
  function snap64(value) { return Math.round(value / PIXEL_GRID) * PIXEL_GRID; }
  function logicalSize(value) { return Math.max(1, Math.ceil(value / PIXEL_SCALE)); }

  // ── room identity ──────────────────────────────────────────────────────
  // The palette is READ, not restated. src/pixi-palette.js pulls the room's
  // authored --house-* values (or derives the whole room from the keeper's
  // authored accent), so this file owns no hex codes at all. It used to carry
  // a six-colour map per room, and several entries contradicted the register:
  // buddy was painted purple against an authored seal red, learn green
  // against an authored stamp red, divination violet against an authored
  // chalk-on-deep-red-felt.
  // Resolved inside mount(), deliberately not here. This file is parsed before
  // DOMContentLoaded, and src/house.js builds .house-scene ON DOMContentLoaded,
  // so reading the palette at parse time found no authored room on any page:
  // every room then had its whole palette derived from one accent hex, which is
  // why rooms that should look nothing alike came out looking alike.
  var PAL = global.LiberPalette;
  var ROOM = null;
  var TRAITS = null;
  // When the player uses the desktop's "look behind" affordance, the DOM room
  // scene becomes the revealed wall/floor. The room layer fades out so it does
  // not paint a second room over that scene. This is view state, not persisted
  // feature state.
  var roomGaze = false;
  var roomLayer = null;
  var roomHost = null;
  var layerRoot = null;
  var invalidateRoom = null;
  var roomOpacity = 1;
  var roomOpacityFrom = 1;
  var roomOpacityTarget = 1;
  var roomOpacityStarted = 0;

  function prefersReducedMotion() {
    return global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)').matches
      : REDUCED;
  }

  function setRoomGaze(open) {
    roomGaze = !!open;
    roomOpacityFrom = roomOpacity;
    roomOpacityTarget = roomGaze ? 0 : 1;
    roomOpacityStarted = performance.now();
    if (prefersReducedMotion()) roomOpacity = roomOpacityTarget;
    if (layerRoot) layerRoot.alpha = roomOpacity;
    if (invalidateRoom) invalidateRoom();
  }

  global.addEventListener('liber:crt-room-gaze', function (e) {
    setRoomGaze(!!(e && e.detail && e.detail.open));
  });
  // True when the house has already painted this room. Then the GPU layer must
  // not paint a room of its own over the top of it — see mount().
  var AUTHORS_ROOM = false;

  // The keeper's `material` descriptor from data/personas.data.js is real
  // design input, not decoration: it says what the air in their room is made
  // of. Wax and flame send embers up; wet slate and foam settle downward;
  // rubble stays where it was put. This is what makes one room's dust read
  // differently from another's without anyone authoring a particle system.
  // Order matters and is deliberate: the most physical descriptor wins. "tin
  // painted red" is shavings before it is paint, and "painted marquee wood,
  // bulb studs" is a fairground bulb before it is pigment, so the paint test
  // has to sit below both or games and toybox collapse into the same air.
  function traitsFor(material) {
    var m = String(material || '').toLowerCase();
    if (/wax|flame|sealed/.test(m)) return { density: 0.70, drift: 1.55, sway: 0.55, kind: 'ember' };
    if (/tin|pinewood|shaving/.test(m)) return { density: 0.98, drift: 0.45, sway: 0.95, kind: 'shaving' };
    if (/marquee|bulb|stud/.test(m)) return { density: 1.00, drift: 0.85, sway: 1.05, kind: 'spark' };
    if (/water|foam|wet|slate|tide/.test(m)) return { density: 1.15, drift: -0.45, sway: 1.45, kind: 'foam' };
    if (/rubble|gravel|die-cut|soil/.test(m)) return { density: 1.10, drift: 0.15, sway: 0.35, kind: 'grit' };
    if (/canvas|thread|petal|worn/.test(m)) return { density: 1.06, drift: 0.28, sway: 1.00, kind: 'pollen' };
    if (/vellum|paper|card|index|clasp/.test(m)) return { density: 0.86, drift: 0.30, sway: 0.60, kind: 'paper' };
    if (/glove|cotton|foil|alkaline/.test(m)) return { density: 0.94, drift: 0.62, sway: 0.90, kind: 'motes' };
    if (/chisel|stone|inlay/.test(m)) return { density: 0.80, drift: 0.24, sway: 0.30, kind: 'dust' };
    // chalk hangs. it barely moves and it does not blow around.
    if (/felt|chalk/.test(m)) return { density: 0.74, drift: 0.08, sway: 0.18, kind: 'chalk' };
    if (/pigment|tile|mosaic|paint/.test(m)) return { density: 1.02, drift: 0.75, sway: 1.15, kind: 'pigment' };
    if (/wood|grain|lamplit/.test(m)) return { density: 0.92, drift: 0.20, sway: 0.50, kind: 'dust' };
    return { density: 1.00, drift: 0.35, sway: 0.75, kind: 'dust' };
  }

  // ── helpers ────────────────────────────────────────────────────────────
  function hash(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }
  function toUnit(hex) {
    return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
  }

  // A soft radial falloff drawn as concentric alpha rings. Cheap to tessellate
  // once, and visually indistinguishable from a gradient at these alphas.
  function softGlow(g, x, y, r, hex, alpha) {
    var rings = 18;
    for (var i = rings; i >= 1; i--) {
      var t = i / rings;
      g.circle(x, y, r * t).fill({ color: hex, alpha: alpha * (1 - t) * (1 - t) + alpha * 0.04 });
    }
  }

  function tier(density) {
    var area = global.innerWidth * global.innerHeight;
    var size = area > 2200000 ? 1 : area > 900000 ? 0.78 : 0.52;
    // The room already has authored star/register surfaces. Pixi supplies
    // only a sparse foreground air layer; thousands of dots turn the void
    // into a competing starfield and bury the machine's silhouette.
    var base = REDUCED ? 28 : 80;
    return Math.max(220, Math.round(base * size * density * (tier.patina || 1)));
  }

  // Patina: presence deepens the room. Ported verbatim from the retired
  // dust.js so the density tier keeps responding to visits and artifacts
  // (thresholds mirror src/shadow.js).
  function patina() {
    try {
      var s = (global.Liber && global.Liber.state) ? global.Liber.state.get() : {};
      var n = Object.keys(s.visited || {}).length;
      var kinds = ['divination', 'iching', 'games', 'sea', 'buddy', 'learn', 'council'];
      for (var i = 0; i < kinds.length; i++) {
        if (Array.isArray(s[kinds[i]])) n += s[kinds[i]].length;
      }
      var tiers = [2, 6, 12], level = 0;
      for (var j = 0; j < tiers.length; j++) if (n >= tiers[j]) level = j + 1;
      return 1 + level * 0.32;
    } catch (e) {
      return 1;
    }
  }

  // ── shaders ────────────────────────────────────────────────────────────
  // Uniform member names are prefixed uCrt* so they can never collide with
  // Pixi's own injected globals (uInputSize, uOutputFrame, ...). Copied
  // declaration-for-declaration from the built-in filter convention.
  var VERTEX = [
    'in vec2 aPosition;',
    'out vec2 vTextureCoord;',
    'uniform vec4 uInputSize;',
    'uniform vec4 uOutputFrame;',
    'uniform vec4 uOutputTexture;',
    'vec4 filterVertexPosition( void )',
    '{',
    '    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;',
    '    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;',
    '    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;',
    '    return vec4(position, 0.0, 1.0);',
    '}',
    'vec2 filterTextureCoord( void )',
    '{',
    '    return aPosition * (uOutputFrame.zw * uInputSize.zw);',
    '}',
    'void main(void)',
    '{',
    '    gl_Position = filterVertexPosition();',
    '    vTextureCoord = filterTextureCoord();',
    '}'
  ].join('\n');

  var FRAGMENT = [
    'in vec2 vTextureCoord;',
    'out vec4 finalColor;',
    'uniform sampler2D uTexture;',
    '',
    // Resolution arrives through our own uniform. Declaring uInputSize here
    // as well fails to link: Pixi compiles the vertex at highp and the
    // fragment at whatever the device supports, so the same uniform cannot
    // be declared in both stages.
    'uniform vec2  uCrtRes;',
    '',
    'uniform float uCrtTime;',
    'uniform float uCrtCurve;',
    'uniform float uCrtScan;',
    'uniform float uCrtMask;',
    'uniform float uCrtAberr;',
    'uniform float uCrtGrain;',
    'uniform float uCrtVig;',
    'uniform float uCrtRoll;',
    'uniform float uCrtBloom;',
    'uniform float uCrtBright;',
    'uniform float uCrtPitch;',
    'uniform vec3  uCrtTint;',
    '',
    'float hash(vec2 p)',
    '{',
    '    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);',
    '}',
    '',
    'void main(void)',
    '{',
    '    vec2 res = max(uCrtRes, vec2(1.0));',
    '    vec2 px = 1.0 / res;',
    '    vec2 uv = vTextureCoord;',
    '',
    '    // Barrel curvature. `cc` is the signed distance from the tube centre.',
    '    vec2 cc = uv - 0.5;',
    '    float r2 = dot(cc, cc);',
    '    uv = uv + cc * (uCrtCurve * r2);',
    '',
    '    // Outside the glass is dead glass.',
    '    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {',
    '        finalColor = vec4(0.0, 0.0, 0.0, 1.0);',
    '        return;',
    '    }',
    '',
    '    float ab = uCrtAberr * (0.25 + r2 * 3.0);',
    '    vec3 col;',
    '    col.r = texture(uTexture, uv + vec2(px.x * ab, 0.0)).r;',
    '    col.g = texture(uTexture, uv).g;',
    '    col.b = texture(uTexture, uv - vec2(px.x * ab, 0.0)).b;',
    '',
    '    // Cheap bloom: saturated wide taps lifted out of the room frame.',
    '    vec3 wide = texture(uTexture, uv + vec2(px.x * 5.0, 0.0)).rgb',
    '              + texture(uTexture, uv - vec2(px.x * 5.0, 0.0)).rgb',
    '              + texture(uTexture, uv + vec2(0.0, px.y * 5.0)).rgb',
    '              + texture(uTexture, uv - vec2(0.0, px.y * 5.0)).rgb;',
    '    col += max(wide * 0.25 - 0.22, 0.0) * uCrtBloom;',
    '',
    '    // Keep the room pass scan pattern in logical pixels, not raw GPU pixels.',
    '    // Its explicit pitch prevents a one-pixel moire when the device scale changes.',
    '    float row = uv.y * res.y / max(uCrtPitch, 1.0);',
    '    float comb = 0.5 + 0.5 * cos(row * 3.14159265);',
    '    col *= mix(1.0, 0.62 + 0.38 * comb, uCrtScan);',
    '',
    '    // Aperture grille: three-phase mask along the column axis.',
    '    float colx = uv.x * res.x / max(uCrtPitch, 1.0);',
    '    vec3 mask;',
    '    mask.r = 0.5 + 0.5 * cos(colx * 2.0943951);',
    '    mask.g = 0.5 + 0.5 * cos(colx * 2.0943951 + 2.0943951);',
    '    mask.b = 0.5 + 0.5 * cos(colx * 2.0943951 + 4.1887902);',
    '    col *= mix(vec3(1.0), 0.62 + 0.76 * mask, uCrtMask);',
    '',
    '    // Rolling refresh band sweeping down the glass.',
    '    float band = fract(uCrtTime * 0.07);',
    '    float bd = abs(uv.y - band);',
    '    bd = min(bd, 1.0 - bd);',
    '    col += uCrtRoll * exp(-bd * bd * 3600.0) * 0.085;',
    '',
    '    // Live grain — regenerated every frame, which is the whole point.',
    '    float n = hash(uv * res + vec2(uCrtTime * 137.0, uCrtTime * 61.0));',
    '    col += (n - 0.5) * uCrtGrain;',
    '',
    '    // Vignette, weighted by the same curvature term.',
    '    float vig = 1.0 - uCrtVig * r2 * 1.85;',
    '    col *= clamp(vig, 0.0, 1.0);',
    '',
    '    col *= uCrtTint * uCrtBright;',
    '',
    '    finalColor = vec4(max(col, vec3(0.0)), 1.0);',
    '}'
  ].join('\n');

  var glProgram = null;
  function getProgram() {
    if (!glProgram) glProgram = PIXI.GlProgram.from({ vertex: VERTEX, fragment: FRAGMENT });
    return glProgram;
  }

  // Assign a fresh array rather than mutating in place: UniformGroup only
  // re-uploads on assignment, so an in-place write stays on the GPU as the
  // old value.
  function setRes(filter, w, h) {
    filter.resources.crtUniforms.uniforms.uCrtRes = new Float32Array([w, h]);
  }

  function makeFilter(preset) {
    var filter = new PIXI.Filter({
      glProgram: getProgram(),
      resources: {
        crtUniforms: {
          uCrtRes: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uCrtTime: { value: 0, type: 'f32' },
          uCrtCurve: { value: preset.curve, type: 'f32' },
          uCrtScan: { value: preset.scan, type: 'f32' },
          uCrtMask: { value: preset.mask, type: 'f32' },
          uCrtAberr: { value: preset.aberr, type: 'f32' },
          uCrtGrain: { value: preset.grain, type: 'f32' },
          uCrtVig: { value: preset.vig, type: 'f32' },
          uCrtRoll: { value: preset.roll, type: 'f32' },
          uCrtBloom: { value: preset.bloom, type: 'f32' },
          uCrtBright: { value: preset.bright, type: 'f32' },
          uCrtPitch: { value: preset.pitch || 3.2, type: 'f32' },
          uCrtTint: { value: new Float32Array(ROOM.tint), type: 'vec3<f32>' }
        }
      }
    });
    return filter;
  }

  // ── software rasterised motes ──────────────────────────────────────────
  function makeDotTexture(renderer) {
    var g = new PIXI.Graphics();
    for (var i = 16; i >= 1; i--) {
      var t = i / 16;
      g.circle(32, 32, 31 * t).fill({ color: 0xffffff, alpha: 0.055 + (1 - t) * (1 - t) * 0.62 });
    }
    try {
      return renderer.generateTexture({ target: g, resolution: 1 });
    } catch (e) {
      return renderer.generateTexture(g);
    }
  }

  // ── the room ───────────────────────────────────────────────────────────
  var app = null, renderer = null, dot = null, filter = null;
  var dimension = { w: 0, h: 0 };
  var roomRoot = null, lightRoot = null, moteRoot = null, layers = [], rt = {};
  // The tube's own position, kept so the motes can be lit by it each frame.
  var anchor = { x: 0, y: 0, r: 1 };
  var presenter = null, motePresenter = null, damp = null, clearQuad = null;
  var mounted = false, frames = 0, moteCount = 0;
  var pointer = { x: 0.5, y: 0.5 }, eased = { x: 0.5, y: 0.5 };
  // Keep only a short phosphor memory. At 0.78, sparse motes left a
  // room-wide constellation of ghost trails and overwhelmed the live scene.
  // Ambient motes should not leave a second starfield in phosphor memory.
  // The screen shader supplies the CRT persistence; the room air is cleared
  // each frame and stays subordinate to the authored scene.
  var DAMP = 0.0;
  // The room's light level this frame. A real CRT is never at a constant
  // brightness, and a room lit by one should not be either.
  var flicker = 1;

  // Where the machine actually is. The lamp's authored --house-lamp-x/y is in
  // machine units against a band that src/house.js measures; the honest way to
  // place a pool of light under the monitor is to ask the monitor where it is.
  function lampAnchor(w, h, viewport) {
    var m = document.querySelector('.machine');
    if (m) {
      var r = m.getBoundingClientRect();
      if (r.width > 0) {
        return {
          x: (r.left - viewport.x + r.width / 2) / PIXEL_SCALE,
          y: Math.min(h * PIXEL_SCALE * 0.95, r.top - viewport.y + r.height * 0.92) / PIXEL_SCALE
        };
      }
    }
    return { x: w * 0.5, y: h * 0.82 };
  }

  // Where the tube actually is. Both light anchors are measured off the live
  // DOM rather than assumed, so the light keeps landing on the machine when the
  // window changes shape. `r` is the tube's half-diagonal, used as the natural
  // radius scale for everything that falls off with distance from the screen.
  function screenAnchor(w, h, viewport) {
    var s = document.querySelector('.screen');
    var r = s ? s.getBoundingClientRect() : null;
    if (!r || r.width < 8) {
      var m = document.querySelector('.machine');
      r = m ? m.getBoundingClientRect() : null;
      if (r && r.width > 8) {
        return {
          x: (r.left - viewport.x + r.width / 2) / PIXEL_SCALE,
          y: (r.top - viewport.y + r.height * 0.42) / PIXEL_SCALE,
          r: Math.max(35, Math.min(w, h) * 0.42),
          onScreen: false
        };
      }
      return { x: w * 0.5, y: h * 0.4, r: Math.max(35, Math.min(w, h) * 0.42), onScreen: false };
    }
    return {
      x: (r.left - viewport.x + r.width / 2) / PIXEL_SCALE,
      y: (r.top - viewport.y + r.height / 2) / PIXEL_SCALE,
      r: Math.max(35, Math.sqrt(r.width * r.width + r.height * r.height) / 2 / PIXEL_SCALE),
      onScreen: true
    };
  }

  // ── the room, where the house did not author one ────────────────────────
  // Built only when there is no .house-scene. Where the house HAS painted the
  // room (wall, floor, ceiling, window, furniture, in the room's own palette),
  // building this would put a second, generic room on top of an authored one.
  // That is what the first attempt did to seven rooms.
  function buildRoomBase(w, h, lamp) {
    var root = new PIXI.Container({ label: 'room-base' });
    var horizon = snap64(h * 0.585);

    // THE WALL. Previously one flat rect plus two glows at alpha 0.022 and
    // 0.016 — authored at a strength no eye can resolve, which is why the room
    // read as a dead void behind the machine. A wall in a dark room is not one
    // value: it is bright where the lamp reaches, cold where it does not, and
    // dirty where it meets the floor. Banded top to bottom so the room has a
    // tonal range for the machine's silhouette to sit against.
    var wall = new PIXI.Graphics();
    wall.rect(0, 0, w, h).fill(ROOM.wallBase);
    var bands = 22;
    for (var i = 0; i < bands; i++) {
      var t = i / bands;
      // the ceiling is the darkest part of a lamp-lit room, the skirting the dirtiest
      var lift = Math.max(0, 1 - Math.abs(t - 0.46) * 2.1);
      wall.rect(0, snap64(t * horizon), w, Math.ceil(horizon / bands) + 1)
        .fill({ color: ROOM.lampCore, alpha: 0.008 + lift * 0.022 });
      if (t < 0.22) wall.rect(0, snap64(t * horizon), w, Math.ceil(horizon / bands) + 1)
        .fill({ color: 0x000000, alpha: (0.22 - t) * 0.5 });
    }
    // the lamp actually reaching the wall, on the lamp's own side
    softGlow(wall, lamp.x, lamp.y - h * 0.28, Math.min(w, h) * 0.62, ROOM.lampCore, 0.030);
    // and the cold that is left over everywhere else
    softGlow(wall, w * 0.06, h * 0.20, Math.min(w, h) * 0.42, ROOM.glass || ROOM.brass, 0.020);
    root.addChild(wall);

    // THE DESK the machine stands on. There was no desk: the machine floated,
    // and COVENANT § nothing floats is the first thing an eye checks.
    var desk = new PIXI.Graphics();
    desk.rect(0, horizon, w, h - horizon).fill({ color: ROOM.floor, alpha: 0.96 });
    // the boards run away from the eye: a lighter wedge, not a cut-out one
    desk.poly([-w * 0.30, h * 1.04, w * 1.30, h * 1.04, w * 0.80, horizon, w * 0.20, horizon])
      .fill({ color: ROOM.floorLit, alpha: 0.16 });
    // the front edge of the desk catches the lamp: one lit band, lamp side only
    desk.poly([w * 0.16, horizon, w * 0.84, horizon, w * 0.855, horizon + h * 0.022, w * 0.145, horizon + h * 0.022])
      .fill({ color: ROOM.floorLit, alpha: 0.5 });
    // the near boards, warmer where the tube throws down onto them
    softGlow(desk, w * 0.5, h * 0.94, Math.min(w, h) * 0.52, ROOM.lampCore, 0.024);
    root.addChild(desk);

    // THE MACHINE'S WEIGHT. A blurred ellipse under the case, offset away from
    // the lamp, and the darkest shape in the room.
    var contact = new PIXI.Graphics();
    for (var c = 12; c >= 1; c--) {
      var ct = c / 12;
      contact.ellipse(w * 0.5, h * 0.865, w * 0.30 * ct, h * 0.036 * ct)
        .fill({ color: 0x000000, alpha: 0.055 * (1 - ct) + 0.02 });
    }
    root.addChild(contact);

    // THE LAMP, as an object rather than as an implication: a shade, a hot
    // filament under it, and the cone it throws. COVENANT § light is declared.
    var fitting = new PIXI.Graphics();
    var lx = lamp.x, ly = Math.max(h * 0.06, lamp.y - h * 0.34);
    fitting.rect(Math.round(lx), 0, 1, Math.round(ly - h * 0.028)).fill({ color: 0x000000, alpha: 0.34 });
    fitting.poly([lx - w * 0.052, ly, lx + w * 0.052, ly, lx + w * 0.020, ly - h * 0.042, lx - w * 0.020, ly - h * 0.042])
      .fill({ color: 0x120c08, alpha: 0.95 });
    // the shade's own rim, lit from beneath by what it holds
    fitting.rect(snap64(lx - w * 0.052), snap64(ly - 1), snap64(w * 0.104), 2)
      .fill({ color: ROOM.lampCore, alpha: 0.5 });
    softGlow(fitting, lx, ly + h * 0.006, Math.min(w, h) * 0.055, ROOM.lampCore, 0.09);
    root.addChild(fitting);

    // the beam hanging in dust: barely there, and missed when absent
    var cone = new PIXI.Graphics();
    for (var k = 0; k < 7; k++) {
      var kt = k / 6;
      var spread = w * (0.055 + kt * 0.20);
      cone.poly([lx - w * 0.034, ly, lx + w * 0.034, ly, lx + spread, h * 1.02, lx - spread, h * 1.02])
        .fill({ color: ROOM.lampCore, alpha: 0.006 * (1 - kt * 0.7) });
    }
    cone.blendMode = 'add';
    root.addChild(cone);

    // the skirting, and the join where wall meets desk
    var seams = new PIXI.Graphics();
    seams.rect(0, horizon - 2, w, 2).fill({ color: 0x000000, alpha: 0.42 });
    seams.rect(snap64(w * 0.16), horizon, snap64(w * 0.68), 1).fill({ color: ROOM.lampCore, alpha: 0.16 });
    root.addChild(seams);

    // VIGNETTE. The machine is the subject; the corners are not.
    var vig = new PIXI.Graphics();
    for (var v = 10; v >= 1; v--) {
      var vt = v / 10;
      vig.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0 });
      vig.ellipse(w * 0.5, h * 0.52, w * (0.52 + vt * 0.5), h * (0.52 + vt * 0.5))
        .fill({ color: 0x000000, alpha: 0.03 });
    }
    root.addChild(vig);

    return root;
  }

  // ── the light ───────────────────────────────────────────────────────────
  // Built everywhere, and the only thing drawn where the house authored a room.
  // The tube is the room's light source, so the brightest thing in the room is
  // the machine and everything falls off with distance from it. Composited with
  // screen blending on authored rooms, so it adds light to the room instead of
  // covering it. `gain` keeps it from washing out a room that already has an
  // authored lamp of its own.
  function buildLight(w, h, lamp, screen) {
    // Where the house authored a room it already has a lamp, a substrate and
    // its own palette, so a broad wash here is not atmosphere — it is a lift.
    // At gain 0.34 it measured as a ~14-point addition to every room cell and
    // cost toybox 11 points of tonal spread, because an already-bright room
    // cannot absorb more light without its highlights clipping. So on authored
    // rooms the wash is only a suggestion and the AIR carries the atmosphere:
    // motes are small and additive, so they read clearly without moving any
    // region's mean. Where the house authored nothing, this layer is the room
    // and the light is the point, so it runs at full strength.
    var gain = AUTHORS_ROOM ? 0.10 : 0.11;
    var root = new PIXI.Container({ label: 'light' });

    var spill = new PIXI.Graphics();
    // Halo hugging the glass, the air lit around the machine, then a wider wash
    // in the room's own authored lamp colour. Radii are multiples of the tube's
    // own half-diagonal, so the light scales with the machine instead of with
    // the window — a light source does not get wider because the window did.
    softGlow(spill, screen.x, screen.y, screen.r * 0.90, ROOM.lampCore, 0.26 * gain);
    softGlow(spill, screen.x, screen.y, screen.r * 1.70, ROOM.lampCore, 0.20 * gain);
    softGlow(spill, screen.x, screen.y, screen.r * 2.80, ROOM.lampWash.color, 0.13 * gain);
    spill.blendMode = 'add';
    root.addChild(spill);

    // Where the light lands: a wide, low pool on the desk under the machine.
    var pool = new PIXI.Graphics();
    softGlow(pool, lamp.x, lamp.y, Math.min(w, h) * 0.46, ROOM.lampCore, 0.18 * gain);
    softGlow(pool, lamp.x, lamp.y + h * 0.06, Math.min(w, h) * 0.30, ROOM.lampWash.color, 0.15 * gain);
    softGlow(pool, lamp.x, lamp.y - h * 0.04, Math.min(w, h) * 0.20, ROOM.brass, 0.13 * gain);
    pool.blendMode = 'add';
    root.addChild(pool);

    // Volumetric shafts leaning out of the tube. These were authored at alpha
    // 0.016, which is invisible at every resolution — the beams existed in the
    // scene graph and reached nobody's eye. Dust in the beam reads at 0.03+.
    var shafts = new PIXI.Graphics();
    for (var i = 0; i < 5; i++) {
      var k = i - 2;
      var bx = lamp.x + k * w * 0.1;
      var by = lamp.y - h * 0.01;
      var tx = bx + k * w * 0.12;
      var ta = w * 0.055, tb = w * 0.085;
      shafts.poly([bx - ta * 0.3, by, bx + ta * 0.3, by, tx + tb, -h * 0.08, tx - tb, -h * 0.08])
        .fill({ color: i % 2 ? ROOM.lampCore : ROOM.brass, alpha: (0.030 + (1 - Math.abs(k) / 2.5) * 0.032) * gain });
    }
    shafts.blendMode = 'add';
    root.addChild(shafts);

    return root;
  }

  function buildMotes(w, h, count) {
    if (count <= 0) return { layers: [], count: 0 };
    // The keeper's material decides how the air in this room behaves.
    //
    // The scale figures are deliberately small. The first pass ran these at
    // 0.34 / 0.62 / 1.05, which puts a 64px soft blob at 67px for the nearest
    // layer; with ~1900 of them that is roughly 28% of the frame covered in soft
    // haze. It measured as a 12-17 point lift on every room's mean luminance and
    // as a 10-point LOSS of tonal spread, because haze raises the floor faster
    // than it raises the ceiling. Dust should be fine and crisp: it adds sparkle
    // (spread up) instead of fog (spread down), at a fraction of the coverage.
    var spec = [
      // A 64px soft dot becomes a physical object surprisingly quickly:
      // the old 0.62 far tier was a 40px glowing orb on a 1280px room.
      // Air should register as flecks and brief glints, never as a second
      // prop competing with the machine.
      { share: 0.55, scale: 0.045, alpha: 0.10, drift: 0.30 * TRAITS.drift, sway: 0.55 * TRAITS.sway },
      { share: 0.30, scale: 0.085, alpha: 0.16, drift: 0.55 * TRAITS.drift, sway: 0.85 * TRAITS.sway },
      { share: 0.15, scale: 0.15, alpha: 0.26, drift: 0.95 * TRAITS.drift, sway: 1.25 * TRAITS.sway }
    ];
    var out = [];
    var total = 0;
    for (var s = 0; s < spec.length; s++) {
      var n = Math.max(1, Math.round(count * spec[s].share));
      var container = new PIXI.ParticleContainer({
        texture: dot,
        dynamicProperties: { position: true, color: true }
      });
      container.label = 'motes-' + s;
      var items = [];
      for (var i = 0; i < n; i++) {
        var seed = s * 977 + i * 13;
        var tint = i % 9 === 0 ? ROOM.lampCore : (i % 5 === 0 ? ROOM.glass : ROOM.brass);
        var particle = new PIXI.Particle({
          texture: dot,
          x: hash(seed + 1) * w,
          y: hash(seed + 2) * h,
          scaleX: spec[s].scale,
          scaleY: spec[s].scale,
          anchorX: 0.5,
          anchorY: 0.5,
          tint: tint,
          alpha: spec[s].alpha * (0.5 + hash(seed + 3) * 0.5)
        });
        container.addParticle(particle);
        items.push({
          p: particle,
          base: particle.alpha,
          phase: hash(seed + 4) * Math.PI * 2,
          rate: 0.0004 + hash(seed + 5) * 0.0011,
          drift: spec[s].drift * (0.5 + hash(seed + 6)),
          sway: spec[s].sway * (0.6 + hash(seed + 7))
        });
      }
      total += n;
      out.push({ container: container, items: items, spec: spec[s] });
    }
    return { layers: out, count: total };
  }

  function dispose(targets) {
    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && !targets[i].destroyed) targets[i].destroy({ children: true });
    }
  }

  function build(context) {
    var viewport = context.viewport;
    var cssWidth = viewport.width;
    var cssHeight = viewport.height;
    var w = logicalSize(cssWidth);
    var h = logicalSize(cssHeight);
    if (w < 2 || h < 2) return;

    var keep = { moteCount: moteCount };
    dispose([roomRoot, moteRoot]);
    for (var k in rt) { if (rt[k] && !rt[k].destroyed) rt[k].destroy(true); }
    rt = {};

    dimension.w = w; dimension.h = h;
    var lamp = lampAnchor(w, h, viewport);
    anchor = screenAnchor(w, h, viewport);
    roomRoot = new PIXI.Container({ label: 'room' });
    // Where the house authored a room, this layer draws light and nothing else.
    if (!AUTHORS_ROOM) roomRoot.addChild(buildRoomBase(w, h, lamp));
    lightRoot = buildLight(w, h, lamp, anchor);
    roomRoot.addChild(lightRoot);
    // The cast already owns its own air while the tutorial is present. Keep a
  // tiny room residue there so the CRT still belongs to the room without
  // stacking two particle fields behind the dialogue.
  // Room-wide motes were competing with the authored wallpaper/register and
  // remained visually loud even at low counts. The cast owns bounded air;
  // the room layer owns light, CRT glass, and the material field only.
  var airCount = 0;
  var built = buildMotes(w, h, airCount);
    moteRoot = new PIXI.Container({ label: 'mote-field' });
    for (var i = 0; i < built.layers.length; i++) moteRoot.addChild(built.layers[i].container);
    layers = built.layers;
    moteCount = built.count || keep.moteCount;

    rt.content = PIXI.RenderTexture.create({ width: w, height: h, resolution: 1 });
    rt.phosphor = PIXI.RenderTexture.create({ width: w, height: h, resolution: 1 });
    rt.content.source.scaleMode = 'nearest';
    rt.phosphor.source.scaleMode = 'nearest';
    setRes(filter, w, h);

    if (!presenter) {
      presenter = new PIXI.Sprite(rt.content);
      presenter.filters = [filter];
    } else {
      presenter.texture = rt.content;
    }
    presenter.position.set(0, 0);
    presenter.width = cssWidth; presenter.height = cssHeight;
    presenter.blendMode = 'normal';
    if (!presenter.parent) context.root.addChild(presenter);

    if (!motePresenter) motePresenter = new PIXI.Sprite(rt.phosphor);
    else motePresenter.texture = rt.phosphor;
    // phosphor is accumulated LIGHT, so it adds. Composited normally it is a
    // black quad (the damp pass) and it paints the whole room out.
    motePresenter.blendMode = 'add';
    motePresenter.width = cssWidth; motePresenter.height = cssHeight;

    if (!damp) {
      damp = new PIXI.Sprite(PIXI.Texture.WHITE);
      damp.tint = 0x000000;
      damp.alpha = 1 - DAMP;
    }
    damp.width = cssWidth; damp.height = cssHeight;

    // The phosphor buffer starts empty; clear it explicitly so a resize or a
    // first frame never shows stale trails at the wrong scale.
    renderer.render({ container: clearQuad, target: rt.phosphor, clear: true });
  }

  function drift(now, dt) {
    var w = dimension.w, h = dimension.h;
    for (var l = 0; l < layers.length; l++) {
      var layer = layers[l];
      var container = layer.container;
      var items = layer.items;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var p = it.p;
        p.y -= it.drift * dt * 0.006;
        p.x += Math.sin(now * it.rate + it.phase) * it.sway * dt * 0.004;
        if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
        if (p.x < -8) p.x = w + 8;
        if (p.x > w + 8) p.x = -8;
        // Dust is only visible where there is light. Falling off with distance
        // from the tube is what makes the field read as air caught in a beam
        // rather than an even sprinkle of dots across the frame — and it is the
        // cheapest honest depth cue available.
        var dx = (p.x - anchor.x) / anchor.r;
        var dy = (p.y - anchor.y) / anchor.r;
        var near = 1 / (1 + (dx * dx + dy * dy) * 0.6);
        p.alpha = it.base * (0.16 + 0.84 * near) * (0.55 + 0.45 * Math.sin(now * it.rate * 2.4 + it.phase)) * flicker;
      }
      container.update();
    }
  }

  function updateRoomOpacity(now, context) {
    if (context.reducedMotion) {
      roomOpacity = roomOpacityTarget;
      context.root.alpha = roomOpacity;
      return;
    }
    if (roomOpacity === roomOpacityTarget) return;
    var t = Math.min(1, Math.max(0, (now - roomOpacityStarted) / 550));
    var easedT = t * t * (3 - 2 * t);
    roomOpacity = roomOpacityFrom + (roomOpacityTarget - roomOpacityFrom) * easedT;
    context.root.alpha = roomOpacity;
  }

  function frame(now, deltaMS, context) {
    if (!mounted) return;
    var elapsed = Number.isFinite(deltaMS) ? Math.max(0, deltaMS) : now - (frame.last || now);
    var dt = Math.min(50, elapsed);
    frame.last = now;

    if (context.pointer.insideHost) {
      pointer.x = context.pointer.x / Math.max(context.viewport.width, 1);
      pointer.y = context.pointer.y / Math.max(context.viewport.height, 1);
    }
    eased.x += (pointer.x - eased.x) * 0.045;
    eased.y += (pointer.y - eased.y) * 0.045;

    // The tube is a live CRT, so the light it throws is not constant: a slow
    // breath plus the refresh's own faster ripple. This is the difference
    // between a light that was placed in the room and a machine that is lit.
    flicker = REDUCED
      ? 1
      : 0.90 + 0.060 * Math.sin(now * 0.0011) + 0.035 * Math.sin(now * 0.0173) + 0.020 * Math.sin(now * 0.041);
    if (lightRoot) lightRoot.alpha = flicker;
    updateRoomOpacity(now, context);

    if (!REDUCED) drift(now, dt);

    // Depth parallax: nearer motes move more than the room behind them.
    roomRoot.position.set((eased.x - 0.5) * -10, (eased.y - 0.5) * -7);
    for (var l = 0; l < layers.length; l++) {
      var depth = (l + 1) / layers.length;
      layers[l].container.position.set((eased.x - 0.5) * -22 * depth, (eased.y - 0.5) * -15 * depth);
    }

    filter.resources.crtUniforms.uniforms.uCrtTime = now * 0.001;
    frames++;
  }

  function renderFrame() {
    if (!mounted || !renderer || !roomRoot || !rt.content) return;
    // The shared runtime owns the final canvas render. Keep the room's
    // offscreen phosphor and camera passes inside its named layer instead.
    renderer.render({ container: damp, target: rt.phosphor, clear: false });
    renderer.render({ container: moteRoot, target: rt.phosphor, clear: false });
    // The shared layer retains the room's six-to-one pixel register by
    // upscaling this logical target with nearest-neighbour sampling.
    renderer.render({ container: roomRoot, target: rt.content, clear: true });
  }


  // ── boot ───────────────────────────────────────────────────────────────
  async function mount() {
    // Resolved here rather than at parse time — see the note at the top of this
    // file. src/house.js builds .house-scene on DOMContentLoaded, so a palette
    // read at parse time never found the authored room.
    ROOM = PAL ? PAL.room() : null;
    if (!ROOM) return;
    TRAITS = traitsFor(ROOM.persona.material);
    // If the house authored a room, this layer lights it and must not paint a
    // room over it. The shared canvas takes the former atmosphere canvas's
    // room-local z slot: above .house-scene and below .machine.
    AUTHORS_ROOM = !!ROOM.authored;

    if (!global.LiberPixiRuntime) {
      global.__liberPixiError = 'LiberPixiRuntime must be loaded before the room layer';
      return;
    }
    try {
      roomLayer = await global.LiberPixiRuntime.registerLayer({
        id: 'room-atmosphere',
        owner: 'src/pixi-layer.js',
        host: document.querySelector('.room'),
        order: 10,
        logicalScale: PIXEL_SCALE,
        animated: !REDUCED,
        onMount: function (context) {
          REDUCED = !!context.reducedMotion;
          app = context.app;
          renderer = app.renderer;
          roomHost = document.querySelector('.room');
          if (!roomHost) throw new Error('Room atmosphere requires a .room host');
          if (!app.canvas) throw new Error('Shared Pixi runtime has no canvas for room atmosphere');
          app.canvas.classList.toggle('pixi-room-light-only', AUTHORS_ROOM);
          if (app.canvas.parentNode !== roomHost) roomHost.insertBefore(app.canvas, roomHost.firstChild);
          layerRoot = context.root;
          invalidateRoom = context.invalidate;
          roomOpacity = roomGaze ? 0 : 1;
          roomOpacityFrom = roomOpacity;
          roomOpacityTarget = roomOpacity;
          roomOpacityStarted = performance.now();
          context.root.alpha = roomOpacity;
          dot = makeDotTexture(renderer);
          clearQuad = new PIXI.Container();
          filter = makeFilter({
            curve: 0.05, scan: 0.08, mask: 0.02,
            aberr: 0.28, grain: 0.022, vig: 0.5, roll: 0.20, bloom: 0.24, bright: 1,
            pitch: 4.2
          });
          tier.patina = patina();
          mounted = true;
        },
        onResize: function (context) {
          if (!mounted) return;
          REDUCED = !!context.reducedMotion;
          build(context);
          if (REDUCED) frame(performance.now(), 0, context);
        },
        onUpdate: function (context, deltaMS) {
          frame(performance.now(), deltaMS, context);
        },
        onRender: function () {
          renderFrame();
        },
        onDispose: function () {
          mounted = false;
          dispose([roomRoot, moteRoot, motePresenter, damp, clearQuad]);
          for (var k in rt) { if (rt[k] && !rt[k].destroyed) rt[k].destroy(true); }
          if (dot && !dot.destroyed) dot.destroy(true);
          roomRoot = null;
          lightRoot = null;
          moteRoot = null;
          motePresenter = null;
          damp = null;
          clearQuad = null;
          layers = [];
          rt = {};
          roomHost = null;
          layerRoot = null;
          invalidateRoom = null;
          roomLayer = null;
          renderer = null;
          app = null;
        }
      });
    } catch (e) {
      global.__liberPixiError = String((e && e.message) || e);
      return;
    }

    app = roomLayer.app;
    renderer = app.renderer;
    frame.last = performance.now();

    // Published for verification. `palette` is the resolved room colour, so a
    // harness can assert that the authored --house-* values actually reached the
    // GPU rather than trusting that the resolver was called.
    global.LiberPixi = {
      renderer: renderer.name,
      room: ROOM.id,
      persona: ROOM.persona.id,
      contract: {
        renderer: 'pixi-room',
        grid: PIXEL_GRID,
        pixelScale: PIXEL_SCALE,
        ownership: AUTHORS_ROOM ? 'light-only' : 'scene',
        domForeground: true,
        pointerEvents: 'none'
      },
      authoredRoom: ROOM.authored,
      lightsAuthoredRoom: AUTHORS_ROOM,
      palette: ROOM,
      material: ROOM.persona.material,
      air: TRAITS.kind,
      moteCount: moteCount,
      trails: !REDUCED,
      reduced: REDUCED,
      frames: function () { return frames; },
      app: app,
      // The desktop's look-behind view owns the revealed room. Keep this
      // explicit so the affordance remains correct even when the GPU layer
      // mounts after the button was used.
      setRoomGaze: setRoomGaze,
      roomGaze: function () { return roomGaze; }
    };
  }

  // Wait for the page to settle so the GPU layer never races an existing
  // interaction surface during navigation. Ornament yields to behaviour.
  function boot() { global.setTimeout(mount, 160); }
  if (document.readyState === 'complete') boot();
  else global.addEventListener('load', boot, { once: true });
})(window);
