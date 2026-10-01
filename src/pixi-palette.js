// pixi-palette.js — the single colour resolver for the GPU layer.
//
// Why this file exists: the previous GPU work carried its own hand-written
// palette — a six-colour map per room, plus a per-speaker map for the cutscene.
// Both were inventions. Neither read the palette the room already declared, and
// several actively contradicted it. Buddy is authored as seal red (#8a2a20) and
// was painted purple. Learn is authored as stamp red (#aa3030) and was painted
// green. Riason is authored as brass on vellum (#aa7838) and his cutscene plate
// was painted light blue. Physius is copper on grey stone (#aa5a18) and was
// painted lavender. Arcana is chalk on deep red felt (#f4e8d2) and was painted
// purple.
//
// There is already exactly one source of truth for every one of these values:
//
//   · the room's own palette, declared on .house-scene as --house-wall,
//     --house-floor, --house-lamp-core, --house-accent, --house-brass,
//     --house-glass. Eight rooms declare it; styles/house.css holds the
//     default. CSS paints the room with it, and now so does the GPU.
//   · the cutscene cast's material, declared in styles/cutscene.css per
//     `.ctv-<speaker>` as a background, a border and an ink colour. Read
//     live, off the element the author already styled.
//
// So this resolver reads rather than restates. Rooms that declare a house get
// their authored wall/floor/lamp/accent verbatim. Rooms that do not declare one
// fall back to the accent in the persona register (one authored hex per
// character) and derive the rest of the room from it in HSL, which keeps every
// room unmistakably its own hue without anybody inventing hex codes.
//
// file://-safe IIFE. No imports, no fetch, no Math.random.
(function (global) {
  'use strict';
  if (global.LiberPalette) return;

  var doc = global.document;

  // ── colour plumbing ────────────────────────────────────────────────────
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function parseRGBA(str) {
    if (!str) return null;
    var s = String(str).trim();
    var hex = /^#([0-9a-f]{3,8})$/i.exec(s);
    if (hex) {
      var h = hex[1];
      if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), 1];
      if (h.length >= 6) return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
      return null;
    }
    var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i.exec(s);
    if (!m) return null;
    return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  }

  function rgbToHsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    h = ((h % 1) + 1) % 1;
    s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    if (!s) { var v = Math.round(l * 255); return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    function hue(t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return [Math.round(hue(h + 1 / 3) * 255), Math.round(hue(h) * 255), Math.round(hue(h - 1 / 3) * 255)];
  }

  function toInt(c) { return ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255); }
  function shade(hex, hShift, sMul, lSet) {
    var c = parseRGBA(hex) || [0, 0, 0, 1];
    var hsl = rgbToHsl(c);
    return toInt(hslToRgb(hsl[0] + hShift, hsl[1] * sMul, lSet));
  }

  // ── reading the authored values ────────────────────────────────────────
  function readVar(el, name) {
    if (!el) return '';
    try { return (getComputedStyle(el).getPropertyValue(name) || '').trim(); } catch (e) { return ''; }
  }

  function styleOf(el) { try { return getComputedStyle(el); } catch (e) { return null; } }

  // Every colour an authored declaration mentions, in source order. Computed
  // gradients come back normalised to rgb()/rgba(), so this recovers the
  // material palette a room or a cast plate was actually painted with.
  function colorsIn(str) {
    if (!str) return [];
    var out = [];
    var re = /rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi;
    var m;
    while ((m = re.exec(str))) {
      var c = parseRGBA(m[0]);
      // fully transparent stops carry no material information
      if (c && c[3] > 0.02) out.push(c);
    }
    return out;
  }

  // ── the register, when the page actually loads it ──────────────────────
  function register() {
    return (global.LIBER_DATA && global.LIBER_DATA.personas) || null;
  }

  // page → persona id. The register keys by room; a few pages share a keeper
  // (the desktop and the loading screen are the index persona's lamplit wood,
  // settings and about belong to the index, cohort to the machine itself).
  var PAGE_PERSONA = {
    sigil: 'sigil', journal: 'journal', sea: 'sea', buddy: 'buddy',
    games: 'games', divination: 'divination', learn: 'learn', garden: 'garden',
    dreams: 'dreams', themes: 'themes', trash: 'trash', toybox: 'toybox',
    memory: 'memory',
    index: 'index', desktop: 'index', loading: 'index',
    settings: 'index', about: 'index', cohort: 'index'
  };

  // The register's own accents, mirrored ONLY for the pages that do not load
  // it (everything except the desktop). These are the authored hexes from
  // data/personas.data.js — one value per character, not a palette design.
  var ACCENT_FALLBACK = {
    sigil: 0xaa5a18, journal: 0xaa7838, sea: 0x2a8a8a, buddy: 0x8a2a20,
    games: 0xd4af37, divination: 0xf4e8d2, learn: 0xaa3030, garden: 0xb5763c,
    dreams: 0xa48ad4, themes: 0xff69b4, trash: 0x8a6840, toybox: 0xd88a3c,
    memory: 0xd8b877,
    index: 0x8a7838
  };

  // The same mirror for `material`, and for the same reason — it is the field
  // that decides what a room's air is made of, so a room that cannot read the
  // register must still be able to say its dust is embers and not dust.
  var MATERIAL_FALLBACK = {
    sigil: 'grey chiseled stone, copper inlay',
    journal: 'indexed vellum over brass clasps',
    sea: 'wet slate, waterline foam edge',
    buddy: 'black wax, sealed; faint flame flicker',
    games: 'painted marquee wood, bulb studs',
    divination: 'deep red felt, chalk-dusted rim',
    learn: 'index card, ink-stamped corner',
    garden: 'worn canvas, embroidered thread, pressed petals',
    dreams: 'white cotton gloves, alkaline paper, foil question mark',
    themes: 'pigment tile mosaic',
    trash: 'die-cut rubble, gravel edge',
    toybox: 'pinewood shavings, tin painted red',
    memory: 'damp sand, weathered tray wood',
    index: 'warm dark wood, lamplit grain'
  };

  function personaFor(pageId) {
    var key = PAGE_PERSONA[pageId] || 'index';
    var reg = register();
    var entry = reg && reg[key];
    return {
      id: key,
      name: (entry && entry.name) || '',
      opinion: (entry && entry.opinion) || '',
      material: (entry && entry.material) || MATERIAL_FALLBACK[key] || '',
      accent: (entry && entry.accent) || null
    };
  }

  function pageId() {
    var declared = doc && doc.body && doc.body.getAttribute('data-room');
    if (declared) return declared;
    var m = String((global.location && global.location.pathname) || '').match(/([^/]+)\.html?$/);
    return m ? m[1] : 'index';
  }

  // ── the room ───────────────────────────────────────────────────────────
  // Prefers the room's authored house palette; otherwise derives a coherent
  // room from the keeper's authored accent.
  function room() {
    var house = doc && doc.querySelector('.house-scene');
    var css = house ? styleOf(house) : null;
    var id = pageId();
    var persona = personaFor(id);

    var accentHex = persona.accent || null;
    var wall = css ? readVar(house, '--house-wall') : '';
    var wallHi = css ? readVar(house, '--house-wall-hi') : '';
    var wallLo = css ? readVar(house, '--house-wall-lo') : '';
    var floor = css ? readVar(house, '--house-floor') : '';
    var floorLit = css ? readVar(house, '--house-floor-lit') : '';
    var lampCore = css ? readVar(house, '--house-lamp-core') : '';
    var lampWash = css ? readVar(house, '--house-lamp-wash') : '';
    var brass = css ? readVar(house, '--house-brass') : '';
    var glass = css ? readVar(house, '--house-glass') : '';
    var houseAccent = css ? readVar(house, '--house-accent') : '';

    var authored = !!(wall || houseAccent);

    if (!authored) {
      // Derive the whole room from the one authored hex. Every value is a
      // function of the keeper's accent, so no two rooms can drift apart.
      var hex = accentHex || ('#' + (ACCENT_FALLBACK[persona.id] || ACCENT_FALLBACK.index).toString(16).padStart(6, '0'));
      wall = '#' + shade(hex, 0, 0.40, 0.13).toString(16).padStart(6, '0');
      wallHi = '#' + shade(hex, 0, 0.34, 0.19).toString(16).padStart(6, '0');
      wallLo = '#' + shade(hex, 0, 0.44, 0.045).toString(16).padStart(6, '0');
      floor = '#' + shade(hex, -0.02, 0.40, 0.08).toString(16).padStart(6, '0');
      floorLit = '#' + shade(hex, -0.012, 0.44, 0.16).toString(16).padStart(6, '0');
      // A lamp core keeps its warmth. Desaturating here produced washed-out
      // beige lamps on the low-saturation accents (index, garden), which read
      // as grey rather than lit.
      lampCore = '#' + shade(hex, 0.04, 1.18, 0.80).toString(16).padStart(6, '0');
      lampWash = 'rgba(' + parseRGBA(hex).slice(0, 3).join(', ') + ', 0.18)';
      brass = '#' + shade(hex, -0.033, 0.62, 0.42).toString(16).padStart(6, '0');
      // Keep the ambient glass in the keeper's own warm register. A large
      // hue rotation here made the fallback room throw a cyan second light
      // source against the brass/red machine, which read as a separate effect
      // rather than reflected CRT atmosphere.
      glass = '#' + shade(hex, 0.0, 0.18, 0.10).toString(16).padStart(6, '0');
      houseAccent = hex;
    }

    var acc = parseRGBA(houseAccent) || parseRGBA(accentHex) || [200, 170, 120, 1];
    var lw = parseRGBA(lampWash) || acc;
    var grain = css ? parseRGBA(readVar(house, '--house-grain')) : null;

    return {
      id: id,
      persona: persona,
      authored: authored,
      wall: toInt(parseRGBA(wallHi) || acc),
      wallBase: toInt(parseRGBA(wall) || acc),
      wallLo: toInt(parseRGBA(wallLo) || acc),
      floor: toInt(parseRGBA(floor) || acc),
      floorLit: toInt(parseRGBA(floorLit) || acc),
      lampCore: toInt(parseRGBA(lampCore) || acc),
      lampWash: { color: toInt(lw), alpha: lw[3] === undefined ? 0.18 : lw[3] },
      brass: toInt(parseRGBA(brass) || acc),
      glass: toInt(parseRGBA(glass) || acc),
      accent: toInt(acc),
      grain: grain ? grain[3] : 0.02,
      // The machine's own light, normalised so the camera shader can tint the
      // frame toward whoever owns the room.
      tint: [
        clamp(0.55 + acc[0] / 255 * 0.5, 0, 1),
        clamp(0.55 + acc[1] / 255 * 0.5, 0, 1),
        clamp(0.55 + acc[2] / 255 * 0.5, 0, 1)
      ]
    };
  }

  // ── the cast ───────────────────────────────────────────────────────────
  // Read off the authored .ctv-<speaker> element the cutscene stylesheet
  // already paints. ink = its colour, edge = its border, material = every
  // colour its background mentions, in source order (ground first).
  var SPEAKER_PERSONA = {
    wanderlust: 'themes', riason: 'journal', physius: 'sigil',
    arcana: 'divination', vanir: 'sea'
  };

  // Authored materials from styles/cutscene.css, used only when the element is
  // not on the page (the fallback path must still look like the character).
  var CAST_FALLBACK = {
    'liber-vacui': { ink: 0xf1c879, edge: 0xff8fb8, ground: [0x2a1717, 0x0b0605] },
    wanderlust: { ink: 0xff8ab8, edge: 0xff69b4, ground: [0x2a0f24, 0x16060f] },
    riason: { ink: 0x2f526c, edge: 0x77b9ca, ground: [0xe6d9b8, 0xd5c49a] },
    physius: { ink: 0xd4af65, edge: 0x92928a, ground: [0x33332f, 0x252521] },
    arcana: { ink: 0xf4e8d2, edge: 0xd4af65, ground: [0x211018, 0x0d070c] },
    vanir: { ink: 0xb8e0d8, edge: 0x2a8a8a, ground: [0x0d2a2e, 0x061417] }
  };

  function castProfile(speaker, node) {
    var cs = node ? styleOf(node) : null;
    var fb = CAST_FALLBACK[speaker] || CAST_FALLBACK['liber-vacui'];
    var persona = SPEAKER_PERSONA[speaker] ? personaFor(SPEAKER_PERSONA[speaker]) : null;

    var ink = cs ? parseRGBA(cs.color) : null;
    var edge = cs ? parseRGBA(cs.borderTopColor) : null;
    var line = node ? node.querySelector('.ctv-line') : null;
    var lineInk = line ? parseRGBA((styleOf(line) || {}).color) : null;
    var mat = cs ? colorsIn(cs.backgroundImage) : [];
    if (!mat.length && cs) mat = colorsIn(cs.backgroundColor);

    var ground = mat.length >= 2 ? [mat[0], mat[1]] : (mat.length === 1 ? [mat[0], mat[0]] : [parseRGBA('#' + fb.ground[0].toString(16)), parseRGBA('#' + fb.ground[1].toString(16))]);

    var accentPersona = persona && persona.accent ? parseRGBA(persona.accent) : null;

    return {
      speaker: speaker,
      ink: toInt(lineInk || ink || parseRGBA('#' + fb.ink.toString(16))),
      label: toInt(ink || parseRGBA('#' + fb.ink.toString(16))),
      edge: toInt(edge || accentPersona || parseRGBA('#' + fb.edge.toString(16))),
      // Authored accent from the register, when the page has it.
      accent: toInt(accentPersona || edge || parseRGBA('#' + fb.edge.toString(16))),
      ground: toInt(ground[0]),
      groundLit: toInt(ground[1]),
      material: persona ? persona.material : '',
      opinion: persona ? persona.opinion : '',
      authoredCss: !!cs
    };
  }

  global.LiberPalette = {
    room: room,
    castProfile: castProfile,
    personaFor: personaFor,
    pageId: pageId,
    _internals: { parseRGBA: parseRGBA, toInt: toInt, colorsIn: colorsIn, shade: shade, rgbToHsl: rgbToHsl, hslToRgb: hslToRgb }
  };
})(window);
