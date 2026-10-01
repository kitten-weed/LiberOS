// constellation.js — SYSTEM 04 · the evolving constellation
// Every desktop icon is a procedural render of real state, drawn in
// layers: base form → material → earned complexity. Zero fixed image
// assets; no Math.random anywhere — every scintilla is seeded from
// state, so the same state draws the same pixels. Release is not
// erasure even optically: unbinding leaves a ghost line.
//
// Owns: desktop only (src/constellation.js). Reads s.* (relations,
// buddy, visited, artifact arrays) and never writes state.

(function () {
  var svg = document.getElementById('constellation-svg');
  var empty = document.getElementById('constellation-empty');
  var mini = document.getElementById('constellation-mini');
  var miniVerb = document.getElementById('constellation-mini-verb');
  var miniSave = document.getElementById('constellation-mini-save');
  var miniLabel = document.getElementById('constellation-mini-label');
  var miniClose = document.getElementById('constellation-mini-close');
  var miniRelease = document.getElementById('constellation-mini-release');
  if (!svg) return;

  // ── material constants (patina thresholds mirror src/shadow.js) ────
  var PATINA_TIERS = [2, 6, 12];
  var W = 600, H = 400;
  // P0 desktop projection: the buddy anchors the middle/right two-thirds
  // of the glass; the left third belongs to the Influence column (planet +
  // notes). All hit-testing (svgPoint, elementFromPoint) is rect-relative,
  // so only this seat moves — stoneRender below draws at CX/CY too.
  // The saved Poppet is the galaxy's fixed barycenter, never a hanging satellite.
  var CX = W / 2, CY = H / 2;

  // ── deterministic hash: the renderer's only source of surprise ────
  // (state → same pixels; two artifacts that differ only in id still
  // get distinct grain without a random call anywhere)
  function hash32(str) {
    var h = 2166136261 >>> 0;
    var s = String(str == null ? '' : str);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function seededPick(str, mod) { return hash32(str) % mod; }
  function f2(n) { return Math.round(n * 100) / 100; }

  function getState() {
    return (window.Liber && window.Liber.state && window.Liber.state.get()) || {};
  }
  function esc(s) {
    return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function stoneOf(list) { return (list || []).filter(function (e) { return e && (e.kind === 'stone' || e.kind === 'poppet'); }); }
  function sealedOf(list) { return (list || []).filter(function (e) { return !e || (e.kind !== 'stone' && e.kind !== 'poppet'); }); }

  function allArtifacts() {
    var s = getState();
    var all = [];
    var c = s.buddy || [];
    for (var q = 0; q < c.length; q++) {
      // the stone itself is the carved centre, not an orbit — it is
      // drawn once, by stoneRender, with everything it has earned.
      if (c[q] && (c[q].kind === 'stone' || c[q].kind === 'poppet')) continue;
      all.push({ kind: 'buddy', label: c[q].name || c[q].intention || 'sealed words', data: c[q] });
    }
    var d = s.divination || [];
    for (var i = 0; i < d.length; i++) all.push({ kind: 'divination', label: d[i].name, data: d[i] });
    var g = s.games || [];
    for (var j = 0; j < g.length; j++) all.push({ kind: 'games', label: g[j].name, data: g[j] });
    var l = s.learn || [];
    for (var k = 0; k < l.length; k++) all.push({ kind: 'learn', label: l[k].topic, data: l[k] });
    var ab = s.abstract || [];
    for (var m = 0; m < ab.length; m++) all.push({ kind: 'abstract', label: ab[m].label || 'abstract', data: ab[m] });
    var se = s.sea || [];
    for (var n = 0; n < se.length; n++) all.push({ kind: 'sea', label: se[n].text || 'sea', data: se[n] });
    var gd = s.garden || [];
    for (var p = 0; p < gd.length; p++) all.push({ kind: 'garden', label: gd[p].name || 'a planted seed', data: gd[p] });
    var dr = s.dreams || [];
    for (var dr2 = 0; dr2 < dr.length; dr2++) all.push({ kind: 'dreams', label: dr[dr2].title || 'a recorded dream', data: dr[dr2] });
    var mt = s.methodology || [];
    for (var mt2 = 0; mt2 < mt.length; mt2++) all.push({ kind: 'methodology', label: mt[mt2].topic || mt[mt2].name || 'method', data: mt[mt2] });
    return all;
  }

  function findAnyById(id) {
    var s = getState();
    var kinds = ['buddy', 'divination', 'games', 'learn', 'abstract', 'sea', 'garden', 'dreams', 'methodology', 'council', 'journal', 'iching'];
    for (var k = 0; k < kinds.length; k++) {
      var arr = s[kinds[k]] || [];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i].id === id) {
          var label = arr[i].name || arr[i].title || arr[i].topic || arr[i].label || (arr[i].text || '').slice(0, 24) || kinds[k];
          return { kind: kinds[k], label: label, data: arr[i] };
        }
      }
    }
    return null;
  }

  function relationsFor(fromId) {
    var s = getState();
    return (s.relations || []).filter(function (r) { return r.from === fromId; });
  }

  function positionFor(i, total, cx, cy, rx, ry) {
    var a = (i / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  }

  // ── earned state ───────────────────────────────────────────────────
  // The marks the stone has earned: one per kept artifact type (five
  // in the pitch's ledger, eleven drawn — every kind that exists).
  var KIND_MARKS = ['games', 'sea', 'divination', 'garden', 'dreams', 'learn', 'abstract', 'methodology', 'journal', 'council', 'iching'];

  function keptKinds(s) {
    var kept = [];
    for (var i = 0; i < KIND_MARKS.length; i++) {
      var arr = s[KIND_MARKS[i]];
      if (Array.isArray(arr) && arr.length > 0) kept.push(KIND_MARKS[i]);
    }
    return kept;
  }

  function patinaTier(s) {
    var visits = Object.keys(s.visited || {}).length;
    var artifacts = 0;
    var kinds = ['divination', 'iching', 'games', 'sea', 'buddy', 'learn', 'council', 'garden', 'dreams', 'abstract', 'methodology', 'journal'];
    for (var i = 0; i < kinds.length; i++) {
      if (Array.isArray(s[kinds[i]])) artifacts += s[kinds[i]].length;
    }
    var n = visits + artifacts;
    var level = 0;
    for (var t = 0; t < PATINA_TIERS.length; t++) { if (n >= PATINA_TIERS[t]) level = t + 1; }
    return level;
  }

  // A relation is annotated when the journal wrote a margin note on it,
  // two-way when the far endpoint has tied a knot back.
  function relNote(rel) {
    return rel && typeof rel.note === 'string' && rel.note.length > 0;
  }
  function relTwoWay(rel) {
    if (!rel || !rel.from || !rel.to || rel.to === 'buddy') return false;
    var rels = (getState().relations || []);
    for (var i = 0; i < rels.length; i++) {
      if (rels[i].from === rel.to && (rels[i].to || 'buddy') === rel.from) return true;
    }
    return false;
  }
  // Three edge textures: a fresh relation is rope, an annotated one a
  // brace, a long-lived one a filament. Age is earned, not wall-clock:
  // the edge matured when three more keeps arrived after it was tied.
  function edgeClass(rel, s) {
    var keptAt = rel.ts || 0;
    var later = 0;
    var kinds = ['divination', 'iching', 'games', 'sea', 'buddy', 'learn', 'council', 'garden', 'dreams', 'abstract', 'methodology', 'journal'];
    for (var k = 0; k < kinds.length; k++) {
      var arr = s[kinds[k]];
      if (!Array.isArray(arr)) continue;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && (arr[i].ts || 0) > keptAt) later++;
      }
    }
    if (later >= 6) return 'filament';
    if (relNote(rel) || relTwoWay(rel)) return 'brace';
    return 'rope';
  }

  // Ghosts: relations that once were. releaseArtifact/ unbind drop the
  // edge, but the graveyard keeps the body — the stone remembers.
  function ghostVerbs(s) {
    var out = [];
    var gy = s.graveyard || [];
    for (var i = 0; i < gy.length; i++) {
      var g = gy[i];
      if (g && g.entry && g.entry.id) out.push(g.entry.id);
    }
    return out;
  }

  var selectedArtifact = null;
  var lastSig = null;

  // ── constellation weaver: the desktop as instrument ─────────────
  // Unlocked through riason (five binds). Toggle the web playable:
  // pluck an orbit and it hums its verb; drag one artifact onto
  // another to re-tie the knot (same bind engine, spatial UI — the
  // verb stays editable afterwards in the mini-menu). Binds are real
  // and signposted as edits: this is the only game that writes.
  var weaving = false;
  var WEAVE_SCALE = [196.0, 220.0, 246.9, 293.7, 329.6, 392.0];

  // The orbit is a CSS animation on the rendered <g> — rebuilding the SVG
  // restarts it from zero. Cycling the dial writes `visited` on every press,
  // which reset the orbit each time (user report). Skip the rebuild unless
  // something the drawing actually depends on changed. The morph beat is
  // exempt: while it plays, redraws are held so both endpoints morph in
  // place instead of being replaced mid-beat.
  function drawSig(s) {
    return [stoneOf(s.buddy).length, sealedOf(s.buddy).length, (s.divination || []).length, (s.games || []).length,
      (s.learn || []).length, (s.abstract || []).length, (s.sea || []).length, (s.garden || []).length, (s.dreams || []).length,
      (s.methodology || []).length, (s.journal || []).length,
      s.relations.length, s.tutorialDone ? 1 : 0].join('|')
      + ':' + (s.relations || []).map(function (r) { return r.from + '>' + (r.to || 'buddy') + '>' + r.verb + '>' + (r.note ? 'n' : ''); }).join(',')
      + ':' + JSON.stringify(s.unlocks || {}) + ':' + (s.unlocksSeen || []).join(',')
      + ':' + (s.graveyard || []).length
      // patina tier is drawn (tint, grain, precession) — its inputs
      // (visits + artifact counts) must sit in the signature or a tier
      // change short-circuits and the stone keeps yesterday's weather.
      + ':' + patinaTier(s);
  }

  // ── mark library — carve-paths in a 24×24 box, centered ────────────
  // Each kept artifact type carves its own mark into the stone.
  var STONE_MARKS = {
    games:       '<path d="M12 4 A8 8 0 1 1 11.9 4 M12 4 l0 0.01 M12 20 l0 0.01 M4 12 l0 0.01 M20 12 l0 0.01 M7 7 l0 0.01 M17 17 l0 0.01 M7 17 l0 0.01 M17 7 l0 0.01" />',
    sea:         '<path d="M4 9 q4 -3 8 0 t8 0 M4 15 q4 -3 8 0 t8 0" />',
    divination:  '<path d="M12 3 l2.2 6.2 L20 12 l-5.8 2.8 L12 21 l-2.2 -6.2 L4 12 l5.8 -2.8 Z" />',
    garden:      '<path d="M12 20 V8 M12 8 q-4 -1 -5 -5 q5 0 5 5 M12 10 q4 -1 5 -5 q-5 0 -5 5" />',
    dreams:      '<path d="M5 17 q7 4 14 -6 M5 17 q5 1 9 -3 M19 11 q1 -4 -2 -7" />',
    learn:       '<path d="M4 6 h9 v13 h-9 z M13 8 h7 v11 h-7 M4 6 l3 -2 h9 l-3 2" />',
    abstract:    '<path d="M5 12 a3.4 3.4 0 1 1 0.01 0 M14 7 l6 4 -6 4 z" />',
    methodology: '<path d="M6 4 v16 M6 4 h8 a3 3 0 0 1 0 8 h-8 M14 12 a3 3 0 0 1 0 8 h-8" />',
    journal:     '<path d="M7 8 v-2 a3 3 0 0 1 6 0 v2 M4 8 h12 v11 h-12 z M4 12 h12" />',
    council:     '<path d="M12 4 v5 M12 15 v5 M4 12 h5 M15 12 h5 M6.5 6.5 l3 3 M14.5 14.5 l3 3 M17.5 6.5 l-3 3 M9.5 14.5 l-3 3" />',
    iching:      '<path d="M6 5 h12 M6 8 h12 M6 12 l0 0.01 M10 12 l0 0.01 M14 12 l0 0.01 M18 12 l0 0.01 M6 16 h12 M6 19 h12" />'
  };

  var MARK_FALLBACK = STONE_MARKS.abstract;

  function stoneMarkPaths(kinds) {
    var html = '';
    for (var i = 0; i < kinds.length; i++) {
      var d = STONE_MARKS[kinds[i]] || MARK_FALLBACK;
      html += '<g class="constellation-stone-mark" data-mark-kind="' + kinds[i] + '">' + d + '</g>';
    }
    return html;
  }

  // Deterministic grain: N short nicks seeded from the stone's id —
  // a thumbmark, not noise. Two stones never share the same field.
  function grainPaths(seed, count, r) {
    var h = hash32(seed);
    var html = '';
    for (var i = 0; i < count; i++) {
      h = (h * 1103515245 + 12345) >>> 0;
      var a = ((h >>> 8) % 628) / 100;
      h = (h * 1103515245 + 12345) >>> 0;
      var rr = r * (0.35 + ((h >>> 8) % 100) / 220);
      var x1 = Math.cos(a) * rr, y1 = Math.sin(a) * rr;
      h = (h * 1103515245 + 12345) >>> 0;
      var a2 = a + 0.25 + ((h >>> 9) % 40) / 100;
      var x2 = Math.cos(a2) * (rr + 1.4), y2 = Math.sin(a2) * (rr + 1.4);
      html += '<path d="M' + f2(12 + x1) + ' ' + f2(12 + y1) + ' L' + f2(12 + x2) + ' ' + f2(12 + y2) + '" />';
    }
    return html;
  }

  function facetPaths(k, seed) {
    var h = hash32(seed);
    var html = '';
    for (var i = 0; i < k; i++) {
      h = (h * 1103515245 + 12345) >>> 0;
      var a1 = ((h >>> 8) % 628) / 100;
      h = (h * 1103515245 + 12345) >>> 0;
      var a2 = a1 + 0.9 + ((h >>> 9) % 50) / 100;
      var r1 = 12, r2 = 5.5;
      html += '<path d="M' + f2(12 + Math.cos(a1) * r1) + ' ' + f2(12 + Math.sin(a1) * r1)
        + ' L' + f2(12 + Math.cos(a1) * r2) + ' ' + f2(12 + Math.sin(a1) * r2)
        + ' L' + f2(12 + Math.cos(a2) * r2) + ' ' + f2(12 + Math.sin(a2) * r2)
        + ' L' + f2(12 + Math.cos(a2) * r1) + ' ' + f2(12 + Math.sin(a2) * r1) + ' Z" />';
    }
    return html;
  }

  // ── the buddy stone: born smooth ───────────────────────────────────
  // base form (smooth disc) → material (carves + grain, warmed per
  // patina tier) → earned complexity (facets from relations, rings
  // from bonds, ghosts from releases).
  function stoneRender(s) {
    var stones = stoneOf(s.buddy);
    var stone = stones[0] || {};
    var tier = patinaTier(s);
    var kinds = keptKinds(s);
    var rels = s.relations || [];
    var toBuddy = rels.filter(function (r) { return (r.to || 'buddy') === 'buddy'; });
    var ghosts = ghostVerbs(s);
    var seed = stone.id || 'stone';

    // A poppet is not a carved stone: it is a made body held by thread.
    // Keep the same hit target and relation geometry, but let the saved
    // composite be the thing the sky actually sees.
    if (stone.kind === 'poppet') {
      var layers = stone.layers || {};
      var recent = stone.ts && Date.now() - stone.ts < 9000;
      var poppetHtml = '<g class="constellation-poppet constellation-poppet-centered' + (toBuddy.length ? ' is-bound' : '') + (recent ? ' is-recent' : '') + '" data-poppet-id="' + esc(seed) + '">';

      poppetHtml += '<circle class="poppet-relation-halo" cx="' + CX + '" cy="' + CY + '" r="42" fill="none" stroke="rgba(255,105,180,.52)" stroke-width="1" stroke-dasharray="2 6"/>';

      poppetHtml += '<ellipse cx="' + CX + '" cy="' + (CY + 28) + '" rx="27" ry="7" fill="rgba(5,2,12,.42)" class="poppet-shadow"/>';
      poppetHtml += '<g class="poppet-composite" transform="translate(' + (CX - 30) + ' ' + (CY - 30) + ')" style="transform-origin:' + CX + 'px ' + CY + 'px">';
      var poppetLayerOrder = [['outline', 1], ['clothes', 1], ['traits', 0.72], ['others', 0.45]];
      for (var pli = 0; pli < poppetLayerOrder.length; pli++) {
        var pk = poppetLayerOrder[pli][0];
        if (layers[pk]) poppetHtml += '<image class="poppet-layer poppet-layer-' + pk + '" href="' + esc(layers[pk]) + '" x="0" y="0" width="60" height="68" opacity="' + poppetLayerOrder[pli][1] + '" preserveAspectRatio="xMidYMid meet"/>';
      }
      poppetHtml += '<circle cx="30" cy="30" r="31" fill="none" stroke="rgba(232,209,174,.55)" stroke-width="1" stroke-dasharray="2 4" class="poppet-seam-halo"/>';
      poppetHtml += '</g></g>';
      return poppetHtml;
    }

    // patina deepens the carving and warms the tint (0..3)
    var tint = ['#c8a868', '#cf9d52', '#d49044', '#d88438'][tier];
    var carveOp = [0.55, 0.7, 0.82, 0.95][tier];
    var grainN = [0, 3, 6, 9][tier];

    var r = 24;
    var html = '';
    html += '<g class="constellation-stone" data-patina-tier="' + tier + '">';
    html += '<circle cx="' + CX + '" cy="' + CY + '" r="' + r + '" fill="' + tint + '" fill-opacity="0.92" stroke="#f0e0c0" stroke-width="1.1"/>';
    html += '<g class="constellation-stone-grain" stroke="rgba(30,12,4,' + carveOp * 0.5 + ')" stroke-width="0.7" fill="none">' + grainPaths('grain:' + seed, grainN, r) + '</g>';
    html += '<g class="constellation-stone-carves" fill="none" stroke="rgba(40,16,6,' + carveOp + ')" stroke-width="1.25" stroke-linecap="round">';
    html += stoneMarkPaths(kinds);
    html += '</g>';
    html += '<g class="constellation-stone-facets" fill="rgba(255,220,160,' + (0.10 + tier * 0.05) + ')" stroke="rgba(60,30,10,' + (carveOp * 0.6) + ')" stroke-width="0.6">'
      + facetPaths(Math.min(toBuddy.length, 8), 'facets:' + seed) + '</g>';
    // one ring per bound relation, satellites for two-way/annotated
    for (var i = 0; i < toBuddy.length; i++) {
      var ringR = 30 + i * 4.5;
      var rel = toBuddy[i];
      var fancy = relTwoWay(rel) || relNote(rel);
      html += '<circle class="constellation-stone-ring" data-rel-from="' + esc(rel.from) + '" cx="' + CX + '" cy="' + CY + '" r="' + ringR
        + '" fill="none" stroke="rgba(255,220,170,' + (fancy ? 0.75 : 0.5) + ')" stroke-width="' + (fancy ? 1.2 : 0.8)
        + '" stroke-dasharray="' + (fancy ? '3 2' : '5 4') + '"/>';
    }
    for (var g2 = 0; g2 < ghosts.length; g2++) {
      var gr = 30 + g2 * 4.5 + toBuddy.length * 4.5;
      html += '<path class="constellation-ghost-line" data-ghost-of="' + esc(ghosts[g2]) + '" d="M' + (CX - gr) + ' ' + CY + ' A' + gr + ' ' + gr + ' 0 0 1 ' + (CX + gr) + ' ' + CY + '" fill="none" stroke="rgba(220,200,170,0.28)" stroke-width="0.7" stroke-dasharray="2 5"/>';
    }
    html += '<text x="' + CX + '" y="' + (CY + 7) + '" text-anchor="middle" fill="#2a1408" font-size="20" font-weight="700" style="pointer-events:none;">★</text>';
    html += '</g>';
    return html;
  }

  // ── artifact glyph: layered, seeded, orbiting ──────────────────────
  var GLYPH_BASE = {
    buddy:      '<circle cx="12" cy="12" r="7" />',
    divination: '<path d="M12 3 l7 5 -2.6 9 h-8.8 L5 8 Z M12 3 v9" />',
    games:      '<path d="M6 9 a3.2 3.2 0 1 1 0.01 0 M18 9 a3.2 3.2 0 1 1 0.01 0 M8 16 h8" />',
    learn:      '<path d="M5 5 h10 v13 h-10 z M15 7 h4 v11 h-4" />',
    abstract:   '<path d="M5 14 a4 4 0 1 1 0.01 0 M12 5 l7 3 -7 3 z" />',
    sea:        '<path d="M4 10 q4 -3.4 8 0 t8 0 M4 15 q4 -3.4 8 0 t8 0" />',
    garden:     '<path d="M12 20 V9 M12 9 q-4.5 -1 -5.5 -6 q5.5 0 5.5 6 M12 11 q4.5 -1 5.5 -6 q-5.5 0 -5.5 6" />',
    dreams:     '<path d="M6 16 q6 4 12 -5 M6 16 q4.4 0.6 8 -3 M18 11 q1.4 -4 -2 -7" />',
    methodology: '<path d="M6 4 v16 M6 4 h9 a3.4 3.4 0 0 1 0 8 h-9 M15 12 a3.4 3.4 0 0 1 0 8 h-9" />',
    journal:    '<path d="M8 8 v-2 a4 4 0 0 1 8 0 v2 M4 8 h16 v12 h-16 z M4 13 h16" />',
    council:    '<path d="M12 3 v6 M12 15 v6 M3 12 h6 M15 12 h6 M5.6 5.6 l4 4 M14.4 14.4 l4 4 M18.4 5.6 l-4 4 M9.6 14.4 l-4 4" />',
    iching:     '<path d="M5 4 h14 M5 7 h14 M5 11 l0 0.01 M9.6 11 l0 0.01 M14.3 11 l0 0.01 M19 11 l0 0.01 M5 15 h14 M5 18 h14" />'
  };

  function materialFor(kind) {
    var map = { buddy: 'sigil', divination: 'chalk', games: 'marquee', learn: 'index', abstract: 'ink', sea: 'water', garden: 'loam', dreams: 'fog', methodology: 'vellum', journal: 'vellum', council: 'gold', iching: 'vellum' };
    return map[kind] || 'ink';
  }

  function glyphFor(kind, seed) {
    var d = GLYPH_BASE[kind];
    if (!d) {
      var h = hash32('glyph:' + kind + ':' + seed);
      var pick = [GLYPH_BASE.abstract, GLYPH_BASE.divination, GLYPH_BASE.methodology][h % 3];
      d = pick || GLYPH_BASE.abstract;
    }
    return d;
  }

  function artifactRender(art, p, bound, id, orbitCount, ringDefs) {
    var seed = id;
    var tier = patinaTier(getState());
    var h = hash32('rot:' + seed);
    var rot = ((h >>> 8) % 360);
    var body = glyphFor(art.kind, seed);
    // §09 wanderlust grammar: the shared resolver decides the accent.
    // Stored keywordsMatched evidence wins; fresh scan covers legacy keeps.
    var W = (window.Liber && window.Liber.wanderlustAccent) || null;
    var wm = null;
    try {
      if (W && W.matchArtifact) {
        wm = W.matchArtifact(art.data || {});
        var ev = art.data && art.data.keywordsMatched;
        if (ev && Array.isArray(ev.words) && ev.words.length && !wm.wanderlust) {
          wm = { wanderlust: true, words: ev.words, accents: wm.accents, dominant: ev.dominant || wm.dominant, accent: wm.accent };
        }
      }
    } catch (e) { wm = null; }
    var wcls = (wm && wm.wanderlust) ? ' is-wander' : '';
    var mcls = ' material-' + materialFor(art.kind);
    var wacc = (wm && (wm.wanderlust || wm.dominant)) ? wm.accent : null;
    var html = '';
    html += '<g class="constellation-glyph' + mcls + (bound ? ' is-bound' : '') + wcls + '" data-glyph-id="' + esc(id) + '"' + (wacc ? ' data-wander-accent="' + esc(wacc) + '"' : '') + ' transform="translate(' + f2(p.x) + ' ' + f2(p.y) + ')">';
    html += '<g transform="rotate(' + rot + ')">';
    html += '<g class="constellation-glyph-shape" fill="none" stroke="' + (wacc ? esc(wacc) : 'rgba(240,224,192,0.9)') + '" stroke-width="1.3" stroke-linejoin="round" transform="translate(-12 -12)">' + body + '</g>';
    html += '</g>';
    // earned orbits: one ring per relation where this glyph is the far
    // endpoint; inner facets for notes; satellites for two-way.
    for (var i = 0; i < ringDefs.length; i++) {
      var rd = ringDefs[i];
      html += '<circle class="constellation-glyph-ring" data-rel-from="' + esc(rd.from) + '" r="' + rd.r + '" fill="none" stroke="rgba(240,224,192,' + rd.op + ')" stroke-width="' + rd.w + '" stroke-dasharray="' + rd.dash + '"/>';
    }
    if (wacc) {
      html += '<circle class="constellation-wander-road" r="16.5" fill="none" stroke="' + esc(wacc) + '" stroke-width="0.9" stroke-dasharray="2 5" opacity="0.7" style="pointer-events:none;"/>';
    }
    html += '</g>';
    return html;
  }

  // ── main render ────────────────────────────────────────────────────
  // Three edge textures, drawn as presentation on the line: a fresh
  // relation is rope, an annotated or two-way one a brace, a long-lived
  // one a filament.
  function edgeStroke(ec, color, width) {
    if (ec === 'brace') return 'stroke="' + color + '" stroke-width="' + width + '" stroke-dasharray="9 3" stroke-linecap="square"';
    if (ec === 'filament') return 'stroke="' + color + '" stroke-width="' + (parseFloat(width) + 0.4).toFixed(2) + '" style="filter: drop-shadow(0 0 3px rgba(255,180,220,0.85));"';
    return 'stroke="' + color + '" stroke-width="' + width + '" stroke-dasharray="4 5" stroke-linecap="round"';
  }

  function render() {
    if (morphHold) return;
    var s = getState();
    var sky = document.getElementById('constellation');
    var sig = drawSig(s);
    if (sky) {
      sky.classList.toggle('is-bound', stoneOf(s.buddy).length > 0);
      sky.classList.toggle('is-relational', (s.relations || []).length > 0);
      sky.classList.toggle('is-crowded', allArtifacts().length > 3);
    }
    if (sig === lastSig) return;
    lastSig = sig;
    ensureWeaverUI();
    var sigils = stoneOf(s.buddy);
    var artifacts = allArtifacts();
    var relations = s.relations || [];
    var bary = document.getElementById('astral-barycenter');
    if (bary) {
      bary.classList.toggle('is-bound', sigils.length > 0);
      var cap = bary.querySelector('.barycenter-caption');
      if (cap) cap.textContent = sigils.length > 0 ? 'BARYCENTER // HELD BY RELATION' : 'BARYCENTER // UNBOUND';
    }

    if (!s.tutorialDone) {
      if (empty) {
        empty.style.display = '';
        empty.setAttribute('data-empty-state', 'pre');
        empty.innerHTML = '— no visitor is seated —<div class="constellation-empty-sub">open TraveROM and choose a cartridge.</div>';
      }
      svg.innerHTML = '';
      return;
    }
    if (sigils.length === 0) {
      if (empty) {
        empty.style.display = '';
        empty.setAttribute('data-empty-state', 'cast');
        var sealedWait = sealedOf(s.buddy).length;
        empty.innerHTML = '— no visitor is seated —<div class="constellation-empty-sub">open TraveROM and choose a cartridge.</div>';
      }
      svg.innerHTML = '<text x="' + CX + '" y="216" text-anchor="middle" fill="none" stroke="rgba(255,200,100,0.28)" stroke-width="1.2" font-size="48" style="pointer-events:none;">★</text>';
      return;
    }
    if (empty) {
      if (artifacts.length === 0) {
        empty.style.display = '';
        empty.setAttribute('data-empty-state', 'buddy');
        empty.innerHTML = '— something entered orbit —<div class="constellation-empty-sub">the barycenter is holding.</div>';
      } else if (relations.length === 0) {
        empty.style.display = '';
        empty.setAttribute('data-empty-state', 'bind');
        empty.innerHTML = '— a work is circling —<div class="constellation-empty-sub">bind it to the seated visitor when you are ready.</div>';
      } else {
        empty.style.display = 'none';
        empty.setAttribute('data-empty-state', 'bound');
      }
    }

    var orbitR = Math.min(W, H) * 0.32;
    var sigilPos = { x: CX, y: CY };
    var html = '';

    var boundIndices = [];
    for (var i = 0; i < artifacts.length; i++) {
      var artId = artifacts[i].data && artifacts[i].data.id ? artifacts[i].data.id : null;
      if (artId && relationsFor(artId).some(function (r) { return (r.to || 'buddy') === 'buddy'; })) boundIndices.push(i);
    }

    // WS5 competence made visible: as the relation web grows, every edge
    // draws itself thicker and surer (capped).
    var edgeWidth = (1.6 + Math.min(relations.length, 8) * 0.45).toFixed(2);
    var edgeOpacity = Math.min(0.5 + relations.length * 0.06, 0.9).toFixed(2);

    var tier = patinaTier(s);
    var PRECESS = [180, 120, 80, 55];
    var precessDur = PRECESS[Math.min(tier, 3)] + 's';
    var precessStyle = 'animation-duration: ' + precessDur + ';';
    html += '<g class="constellation-orbit constellation-precess" data-tier="' + tier + '" style="' + precessStyle + ' --precess-dur: ' + precessDur + ';">';

    // edges mature: rope → brace → filament
    for (var rr = 0; rr < relations.length; rr++) {
      var rel = relations[rr];
      var toId = rel.to || 'buddy';
      if (toId !== 'buddy') {
        var bIdx = -1;
        for (var bi2 = 0; bi2 < artifacts.length; bi2++) {
          if (artifacts[bi2].data && artifacts[bi2].data.id === toId) { bIdx = bi2; break; }
        }
        if (bIdx < 0) continue;
        var pB = positionFor(bIdx, artifacts.length, CX, CY, orbitR, orbitR * 0.7);
        var aIdx2 = -1;
        for (var bi3 = 0; bi3 < artifacts.length; bi3++) {
          if (artifacts[bi3].data && artifacts[bi3].data.id === rel.from) { aIdx2 = bi3; break; }
        }
        if (aIdx2 < 0) continue;
        var pA = positionFor(aIdx2, artifacts.length, CX, CY, orbitR, orbitR * 0.7);
        html += '<line class="constellation-edge edge-' + edgeClass(rel, s) + '" x1="' + f2(pA.x) + '" y1="' + f2(pA.y) + '" x2="' + f2(pB.x) + '" y2="' + f2(pB.y)
          + '" ' + edgeStroke(edgeClass(rel, s), 'rgba(255,105,180,' + edgeOpacity + ')', edgeWidth) + '/>';
        continue;
      }
      var aIdx = -1;
      for (var bi = 0; bi < artifacts.length; bi++) {
        if (artifacts[bi].data && artifacts[bi].data.id === rel.from) { aIdx = bi; break; }
      }
      if (aIdx < 0) continue;
      var ap = positionFor(aIdx, artifacts.length, CX, CY, orbitR, orbitR * 0.7);
      var verb = (rel.verb || '').toString();
      var mx = (ap.x + sigilPos.x) / 2;
      var my = (ap.y + sigilPos.y) / 2;
      var ec = edgeClass(rel, s);
      // §09 relation accent blends both endpoint travellers. The edge keeps
      // its texture (rope/brace/filament) and weight; only the hue may shift
      // toward the blended traveller colour when both endpoints agree.
      var edgeColor = 'rgba(255,105,180,' + edgeOpacity + ')';
      try {
        var RW = (window.Liber && window.Liber.wanderlustAccent) || null;
        if (RW && RW.matchRelation) {
          var fromArt = null;
          for (var fa = 0; fa < artifacts.length; fa++) {
            if (artifacts[fa].data && artifacts[fa].data.id === rel.from) { fromArt = artifacts[fa].data; break; }
          }
          var blend = RW.matchRelation(verb, fromArt, null);
          if (blend && blend !== RW.FALLBACK) edgeColor = blend;
        }
      } catch (e) { /* the pink edge is the standing default */ }
      html += '<line class="constellation-edge edge-' + ec + '" data-edge-from="' + esc(rel.from) + '" data-edge-to="buddy" x1="' + f2(ap.x) + '" y1="' + f2(ap.y) + '" x2="' + f2(sigilPos.x) + '" y2="' + f2(sigilPos.y)
        + '" ' + edgeStroke(ec, edgeColor, edgeWidth) + '/>';
      if (verb && verb !== 'relates to') {
        html += '<text class="constellation-label" x="' + f2(mx) + '" y="' + f2(my - 4) + '" text-anchor="middle" fill="rgba(255,205,225,0.92)" font-size="9" font-family="Georgia, serif" stroke="rgba(10,5,8,0.85)" stroke-width="2.5" paint-order="stroke" style="pointer-events: none;">' + esc(verb) + '</text>';
      }
    }

    if (relations.length === 0 && artifacts.length > 0) {
      var fp0 = positionFor(0, artifacts.length, CX, CY, orbitR, orbitR * 0.7);
      html += '<line x1="' + f2(fp0.x) + '" y1="' + f2(fp0.y) + '" x2="' + f2(sigilPos.x) + '" y2="' + f2(sigilPos.y) + '" stroke="rgba(255,105,180,0.35)" stroke-width="1.2" stroke-dasharray="3 6" style="pointer-events:none;"/>';
    }

    for (var bi4 = 0; bi4 < artifacts.length; bi4++) {
      var art = artifacts[bi4];
      var p = positionFor(bi4, artifacts.length, CX, CY, orbitR, orbitR * 0.7);
      var id = art.data && art.data.id ? art.data.id : 'a' + bi4;
      var isBound = boundIndices.indexOf(bi4) !== -1;
      var fullLbl = (art.label || '').toString();
      var lbl = fullLbl;
      if (lbl.length > 18) lbl = lbl.substring(0, 16) + '..';
      var pillW = Math.max(22, lbl.length * 5.6 + 12);
      var pillY = p.y + 13;

      var ringDefs = [];
      var kids = (s.relations || []).filter(function (r) { return (r.to || 'buddy') === id; });
      var inboundBuddy = relationsFor(id).filter(function (r) { return (r.to || 'buddy') === 'buddy'; });
      var nRings = kids.length + inboundBuddy.length;
      for (var ri = 0; ri < nRings; ri++) {
        var op = 0.45 + Math.min(ri, 4) * 0.09;
        ringDefs.push({ from: ri < kids.length ? kids[ri].from : id, r: 13 + ri * 3.2, op: f2(op), w: ri === 0 ? 1 : 0.8, dash: ri % 2 ? '4 3' : '2 4' });
      }

      html += '<g><title>' + esc(fullLbl || ('artifact ' + (bi4 + 1))) + '</title>';
      html += artifactRender(art, p, isBound, id, artifacts.length, ringDefs);
      // the clickable body stays a circle (contract surface)
      html += '<circle class="constellation-artifact" data-artifact-id="' + esc(id) + '" cx="' + f2(p.x) + '" cy="' + f2(p.y) + '" r="9" fill="rgba(20,8,12,0.01)" stroke="rgba(240,224,192,0.35)" stroke-width="' + (isBound ? 1.1 : 0.6) + '" style="cursor: pointer;" />';
      if (isBound) {
        html += '<circle cx="' + f2(p.x) + '" cy="' + f2(p.y) + '" r="9" fill="none" stroke="rgba(255,105,180,0.55)" stroke-width="1.4" style="pointer-events:none;"/>';
      }
      html += '<rect class="constellation-label" x="' + (p.x - pillW / 2).toFixed(1) + '" y="' + pillY.toFixed(1) + '" width="' + pillW.toFixed(1) + '" height="15" rx="7.5" fill="rgba(10,5,8,0.82)" stroke="rgba(200,184,144,0.25)" stroke-width="0.6" style="pointer-events: none;"/>';
      html += '<text class="constellation-label" x="' + f2(p.x) + '" y="' + (pillY + 11).toFixed(1) + '" text-anchor="middle" fill="#e8dcc0" font-size="9" font-family="Georgia, serif" style="pointer-events: none;">' + esc(lbl) + '</text>';
      html += '</g>';
      if (kids.length) {
        html += '<circle cx="' + f2(p.x) + '" cy="' + f2(p.y) + '" r="16" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="0.7" stroke-dasharray="2 3" style="pointer-events:none;"/>';
        for (var ki = 0; ki < kids.length; ki++) {
          var ka = (ki / Math.max(kids.length, 1)) * Math.PI * 2 - Math.PI / 2;
          var kx = p.x + Math.cos(ka) * 16, ky = p.y + Math.sin(ka) * 16;
          var kid = findAnyById(kids[ki].from);
          var kidLabel = kid ? kid.label : 'kept';
          var kidId = kids[ki].from;
          html += '<circle class="constellation-artifact constellation-satellite" data-artifact-id="' + esc(kidId) + '" cx="' + f2(kx) + '" cy="' + f2(ky) + '" r="4.5" fill="rgba(240,224,192,0.95)" stroke="#fff" stroke-width="0.5" style="cursor: pointer; filter: drop-shadow(0 0 4px rgba(240,224,192,0.5));"><title>' + esc(kidLabel) + '</title></circle>';
        }
      }
    }

    html += '</g>';

    if (sigils.length > 0 && relations.length === 0) {
      html += '<ellipse cx="' + CX + '" cy="' + CY + '" rx="' + orbitR + '" ry="' + (orbitR * 0.7) + '" fill="none" stroke="rgba(200,184,144,0.3)" stroke-width="1" stroke-dasharray="5 6" style="pointer-events:none;"/>';
    }

    html += '<circle class="constellation-sigil-halo" cx="' + sigilPos.x + '" cy="' + sigilPos.y + '" r="44" fill="none" stroke="rgba(255,200,100,0.16)" stroke-width="3" stroke-dasharray="2 8"/>';
    html += '<circle class="constellation-sigil-halo" cx="' + sigilPos.x + '" cy="' + sigilPos.y + '" r="36" fill="none" stroke="rgba(255,200,100,0.55)" stroke-width="1.5" stroke-dasharray="2 6"/>';
    html += stoneRender(s);
    html += '<circle class="constellation-sigil" id="constellation-sigil" cx="' + sigilPos.x + '" cy="' + sigilPos.y + '" r="22" fill="rgba(20,8,12,0.01)" stroke="none" style="cursor: pointer;"/>';
    html += '<text x="' + sigilPos.x + '" y="' + (sigilPos.y + 6) + '" text-anchor="middle" fill="rgba(20,8,12,0.01)" font-size="22" font-weight="700" style="pointer-events: none;">★</text>';
    html += '<text x="' + sigilPos.x + '" y="' + (sigilPos.y + 40) + '" text-anchor="middle" fill="#c8b890" font-size="8" font-family="serif" font-style="italic" style="pointer-events: none;">buddy</text>';

    if (artifacts.length > 0) {
      var boundCount = boundIndices.length;
      // Counts belong to rooms/status, never to the astronomical glass.
      // The sky keeps only its moving artifacts and ghost grammar.
    }

    function svgPoint(e) {
      var r = svg.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (600 / r.width), y: (e.clientY - r.top) * (400 / r.height) };
    }

    svg.innerHTML = html;

    // §09 one-time reveal: newly rendered wander glyphs bloom once, quietly
    // on replay. The keep already landed; this is garnish after the fact.
    try {
      var WW = (window.Liber && window.Liber.wanderlustAccent) || null;
      if (WW && WW.reveal) {
        var wanders = svg.querySelectorAll('.constellation-glyph.is-wander');
        for (var wi = 0; wi < wanders.length; wi++) {
          var gid = wanders[wi].getAttribute('data-glyph-id');
          WW.reveal(gid, wanders[wi].getAttribute('data-wander-accent'));
        }
      }
    } catch (e) { /* the glyphs stand without the bloom */ }

    ensureWeaverUI();
    var sigilEl = document.getElementById('constellation-sigil');
    if (sigilEl) sigilEl.addEventListener('click', openSigilApp);
    var artEls = svg.querySelectorAll('.constellation-artifact');
    for (var ai = 0; ai < artEls.length; ai++) {
      (function (el) {
        var downPos = null, downId = null, dragLine = null, dragging = false;
        el.addEventListener('pointerdown', function (e) {
          if (!weaving) return;
          downPos = svgPoint(e);
          downId = el.getAttribute('data-artifact-id');
          dragging = false;
          try { el.setPointerCapture(e.pointerId); } catch (err) {}
        });
        el.addEventListener('pointermove', function (e) {
          if (!weaving || !downPos) return;
          var p2 = svgPoint(e);
          if (!dragging && Math.hypot(p2.x - downPos.x, p2.y - downPos.y) > 8) {
            dragging = true;
            dragLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            dragLine.setAttribute('stroke', 'rgba(232,200,144,0.9)');
            dragLine.setAttribute('stroke-width', '1.2');
            dragLine.setAttribute('x1', downPos.x); dragLine.setAttribute('y1', downPos.y);
            dragLine.setAttribute('x2', p2.x); dragLine.setAttribute('y2', p2.y);
            svg.appendChild(dragLine);
          } else if (dragging && dragLine) {
            dragLine.setAttribute('x2', p2.x); dragLine.setAttribute('y2', p2.y);
          }
        });
        var endWeave = function (e) {
          if (!weaving || !downPos) { downPos = null; return; }
          var wasDrag = dragging;
          var fromId = downId;
          if (dragLine && dragLine.parentNode) dragLine.parentNode.removeChild(dragLine);
          dragLine = null; downPos = null; dragging = false;
          if (!wasDrag) { pluck(el, fromId); return; }
          var target = null;
          try {
            var t = document.elementFromPoint(e.clientX, e.clientY);
            var node = t && t.closest ? t.closest('.constellation-artifact') : null;
            if (node && node !== el) target = node.getAttribute('data-artifact-id');
          } catch (err2) {}
          if (target && window.Liber && window.Liber.state && window.Liber.state.bindRelation) {
            try {
              window.Liber.state.bindRelation(fromId, 'relates to', target);
              if (window.Liber.sound) window.Liber.sound.play('chime');
              shootingStar(fromId, target);
            } catch (err3) {}
          }
        };
        el.addEventListener('pointerup', endWeave);
        el.addEventListener('pointercancel', endWeave);
        el.addEventListener('click', function () {
          if (weaving) return;
          var id2 = el.getAttribute('data-artifact-id');
          var found = null;
          for (var q = 0; q < artifacts.length; q++) {
            if (artifacts[q].data && artifacts[q].data.id === id2) { found = artifacts[q]; break; }
          }
          if (!found) found = findAnyById(id2);
          if (found) openMini(found);
        });
      })(artEls[ai]);
    }
  }

  function openSigilApp() {
    window.location.href = 'sigil.html';
  }

  var miniText = document.getElementById('constellation-mini-text');
  var miniOpen = document.getElementById('constellation-mini-open');

  function roomFor(kind, data) {
    if (kind === 'buddy') return (data && (data.kind === 'stone' || data.kind === 'poppet')) ? 'sigil.html' : 'desktop.html#liberchat';
    var pages = { crossing: 'vanir.html', divination: 'divination.html', games: 'games.html', sea: 'vanir.html', dreams: 'dreams.html', journal: 'journal.html' };
    if (kind === 'journal') return 'journal.html';
    return pages[kind] || 'desktop.html';
  }

  function contentOf(kind, d) {
    d = d || {};
    if (kind === 'sea') return d.text || '';
    if (kind === 'buddy') return d.confession || d.intention || d.name || '';
    if (kind === 'dreams') return ((d.title ? d.title + ' — ' : '') + (d.text || d.dream || '')).trim();
    if (kind === 'divination') return [d.question, d.reading, d.name].filter(Boolean).join(' — ');
    if (kind === 'games') return (d.result && d.result.lines) || d.result || d.name || '';
    if (kind === 'garden') return d.name || '';
    if (kind === 'learn') return d.topic || '';
    if (kind === 'abstract') return d.label || '';
    if (kind === 'methodology') return d.topic || d.name || '';
    if (kind === 'journal') return d.text || d.excerpt || d.name || '';
    if (kind === 'council') return d.name || d.text || '';
    return d.name || d.title || d.text || '';
  }

  function paintTargets(selfId) {
    var sel = document.getElementById('constellation-mini-target');
    if (!sel) return;
    sel.innerHTML = '';
    var optB = document.createElement('option');
    optB.value = 'buddy';
    optB.textContent = 'the buddy';
    sel.appendChild(optB);
    var arts = allArtifacts();
    for (var i = 0; i < arts.length; i++) {
      var a = arts[i];
      if (!a.data || !a.data.id || a.data.id === selfId) continue;
      var o = document.createElement('option');
      o.value = a.data.id;
      var l = (a.label || a.kind || 'artifact').toString();
      if (l.length > 28) l = l.slice(0, 26) + '..';
      o.textContent = l + ' (' + a.kind + ')';
      sel.appendChild(o);
    }
  }

  function affinityOk() {
    try {
      var a = window.Liber && window.Liber.affinity;
      return a ? !!a.unlocked('weaver') : false;
    } catch (e) { return false; }
  }

  function weaverInvite() {
    try {
      var a2 = window.Liber && window.Liber.affinity;
      if (!a2) return null;
      var inv = a2.invites() || [];
      for (var i = 0; i < inv.length; i++) {
        if (inv[i].id === 'weaver') return inv[i];
      }
    } catch (e2) {}
    return null;
  }

  function weaverNote(text, who, sticky, inviteId) {
    var host = document.getElementById('desktop');
    if (!host) return null;
    var note = document.createElement('div');
    note.className = 'weaver-note';
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    var w = document.createElement('span');
    w.className = 'weaver-note-who';
    w.textContent = who || 'riason';
    var m = document.createElement('span');
    m.textContent = text;
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'weaver-note-x';
    x.textContent = '×';
    x.setAttribute('aria-label', 'dismiss');
    x.addEventListener('click', function () {
      if (inviteId) {
        try { window.Liber.affinity.seen(inviteId); } catch (e) {}
      }
      if (note.parentNode) note.parentNode.removeChild(note);
    });
    note.appendChild(w);
    note.appendChild(m);
    note.appendChild(x);
    host.appendChild(note);
    if (!sticky) {
      setTimeout(function () {
        if (note.parentNode) note.parentNode.removeChild(note);
      }, 6000);
    }
    return note;
  }

  function ensureWeaverUI() {
    var host = document.getElementById('desktop');
    if (!host) return;
    var inv = weaverInvite();
    if (inv && !document.getElementById('weaver-note')) {
      var n = weaverNote(inv.invite, 'riason', true, 'weaver');
      if (n) n.id = 'weaver-note';
    }
    var t = document.getElementById('weaver-toggle');
    if (!t) {
      t = document.createElement('button');
      t.type = 'button';
      t.className = 'weaver-toggle';
      t.id = 'weaver-toggle';
      t.addEventListener('click', toggleWeave);
      host.appendChild(t);
    }
    t.textContent = weaving ? 'stop weaving' : 'weave';
    t.classList.toggle('on', weaving);
  }

  function toggleWeave() {
    var affinity = window.Liber && window.Liber.affinity;
    if (affinity && typeof affinity.check === 'function') affinity.check();
    if (!affinityOk()) {
      var state = window.Liber && window.Liber.state;
      var binds = state ? ((state.get() || {}).relations || []).length : 0;
      var remaining = Math.max(0, 5 - binds);
      var message = remaining
        ? 'the weaver opens after five saved relations. progress: ' + binds + ' of 5; bind ' + remaining + ' more kept ' + (remaining === 1 ? 'thing' : 'things') + ' to the buddy or to another artifact.'
        : 'five relations are saved. return to the desktop to find riason’s weaver invitation.';
      weaverNote(message, 'riason', false, null);
      return;
    }
    weaving = !weaving;
    ensureWeaverUI();
    if (window.Liber && window.Liber.sound) {
      try { window.Liber.sound.play(weaving ? 'chime' : 'click'); } catch (e) {}
    }
  }

  function verbFor(id) {
    try {
      var rels = relationsFor(id) || [];
      if (rels.length) return rels[rels.length - 1].verb || 'relates to';
    } catch (e) {}
    return 'unbound';
  }

  function freqFor(verb) {
    var h = 0;
    for (var i = 0; i < verb.length; i++) h = ((h * 31) + verb.charCodeAt(i)) >>> 0;
    return WEAVE_SCALE[h % WEAVE_SCALE.length];
  }

  function pluck(el, id) {
    if (window.Liber && window.Liber.sound && window.Liber.sound.tone) {
      try { window.Liber.sound.tone(freqFor(verbFor(id)), 0.7, 0.07); } catch (e) {}
    }
    try {
      var r0 = parseFloat(el.getAttribute('r') || '9');
      var t0 = null;
      var anim = function (t) {
        if (!t0) t0 = t;
        var k = (t - t0) / 350;
        if (k >= 1 || !document.body.contains(el)) { el.setAttribute('r', r0); return; }
        el.setAttribute('r', r0 + 7 * Math.sin(k * Math.PI));
        requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
    } catch (err) {}
  }

  function shootingStar(fromId, toId) {
    try {
      var a = svg.querySelector('.constellation-artifact[data-artifact-id="' + fromId + '"]');
      var b = svg.querySelector('.constellation-artifact[data-artifact-id="' + toId + '"]');
      if (!a || !b) return;
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', a.getAttribute('cx')); line.setAttribute('y1', a.getAttribute('cy'));
      line.setAttribute('x2', b.getAttribute('cx')); line.setAttribute('y2', b.getAttribute('cy'));
      line.setAttribute('stroke', 'rgba(255,240,210,0.95)');
      line.setAttribute('stroke-width', '1.4');
      svg.appendChild(line);
      var t0 = null;
      var fade = function (t) {
        if (!t0) t0 = t;
        var k = (t - t0) / 700;
        if (k >= 1 || !line.parentNode) {
          if (line.parentNode) line.parentNode.removeChild(line);
          return;
        }
        line.setAttribute('opacity', 1 - k);
        requestAnimationFrame(fade);
      };
      requestAnimationFrame(fade);
    } catch (e) {}
  }

  var morphHold = false;

  function morphBeat(selector) {
    var el = svg.querySelector(selector);
    if (!el) return;
    var start = null;
    var DUR = 640;
    var r0 = 9;
    var step = function (t) {
      if (!start) start = t;
      var k = (t - start) / DUR;
      if (k >= 1 || !el.parentNode) {
        el.setAttribute('r', r0);
        el.removeAttribute('filter');
        return;
      }
      var e = 0.5 - Math.cos(Math.PI * Math.min(k, 1)) / 2;
      el.setAttribute('r', r0 + 9 * e);
      el.setAttribute('filter', 'drop-shadow(0 0 ' + f2(6 * e) + 'px rgba(255,200,120,0.9))');
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function pulseEdge(selector) {
    var el = svg.querySelector(selector);
    if (!el) return;
    try {
      var len = el.getTotalLength ? el.getTotalLength() : 0;
      if (!len) return;
      el.setAttribute('stroke-dasharray', len);
      el.setAttribute('stroke-dashoffset', len);
      var start = null;
      var step = function (t) {
        if (!start) start = t;
        var k = (t - start) / 620;
        if (k >= 1 || !el.parentNode) { el.removeAttribute('stroke-dashoffset'); return; }
        el.setAttribute('stroke-dashoffset', String(len * (1 - k)));
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } catch (e) {}
  }

  window.ConstellationMorph = function (fromId) {
    var s = getState();
    var rels = (s.relations || []).filter(function (r) { return r.from === fromId; });
    var fresh = rels.length ? '.constellation-edge[data-edge-from="' + fromId + '"]' : null;
    morphHold = true;
    morphBeat('.constellation-artifact[data-artifact-id="' + fromId + '"]');
    morphBeat('#constellation-sigil');
    if (fresh) pulseEdge(fresh);
    // while the beat plays, redraws are held; render() resumes at the end
    setTimeout(function () {
      morphHold = false;
      lastSig = null;
      render();
    }, 700);
  };

  function openMini(artifact) {
    selectedArtifact = artifact;
    if (!mini) return;
    if (miniLabel) miniLabel.textContent = artifact.label || artifact.data && artifact.data.name || 'artifact';
    if (miniText) miniText.textContent = contentOf(artifact.kind, artifact.data);
    if (miniOpen) miniOpen.onclick = function () { window.location.href = roomFor(artifact.kind, artifact.data); };
    var satBtn = document.getElementById('constellation-mini-journal');
    if (satBtn) satBtn.onclick = function () {
      var aid = artifact.data && artifact.data.id ? artifact.data.id : '';
      window.location.href = 'journal.html' + (aid ? '#' + aid : '');
    };
    var existing = relationsFor(artifact.data.id);
    var buddyRel = null;
    for (var e = 0; e < existing.length; e++) {
      if ((existing[e].to || 'buddy') === 'buddy') { buddyRel = existing[e]; break; }
    }
    if (miniVerb) {
      miniVerb.value = buddyRel ? (buddyRel.verb || '') : (existing.length ? (existing[0].verb || '') : '');
      miniVerb.setAttribute('aria-label', 'how does this relate?');
    }
    paintTargets(artifact.data.id);
    var otherRel = null;
    for (var f = 0; f < existing.length; f++) {
      if ((existing[f].to || 'buddy') !== 'buddy') { otherRel = existing[f]; break; }
    }
    var tsel = document.getElementById('constellation-mini-target');
    if (tsel && otherRel) {
      try { tsel.value = otherRel.to; } catch (e2) {}
      if (miniVerb && !buddyRel) miniVerb.value = otherRel.verb || '';
    }
    mini.removeAttribute('inert');
    mini.classList.add('open');
    setTimeout(function () { if (miniVerb) miniVerb.focus(); }, 100);
  }

  function closeMini() {
    if (!mini) return;
    mini.classList.remove('open');
    mini.setAttribute('inert', '');
    selectedArtifact = null;
  }

  function saveMini() {
    if (!selectedArtifact) return;
    var verb = (miniVerb && miniVerb.value || '').trim() || 'relates to';
    var tsel = document.getElementById('constellation-mini-target');
    var target = tsel ? tsel.value : 'buddy';
    if (!target) target = 'buddy';
    if (window.Liber && window.Liber.state) {
      window.Liber.state.unbindRelation(selectedArtifact.data.id, target);
      var note = null;
      if (target === 'buddy' && window.LiberPoppetBind) {
        var door = null;
        try { door = window.LiberPoppetBind(); } catch (e) { door = null; }
        if (door) note = 'door:' + door;
      }
      var rel = window.Liber.state.bindRelation(selectedArtifact.data.id, verb, target);
      if (rel && note && window.Liber.state.setRelationNote) window.Liber.state.setRelationNote(selectedArtifact.data.id, note);
      if (miniSave) miniSave.textContent = target === 'buddy' ? 'bind to buddy' : 'bind to artifact';
    }
    if (window.Liber && window.Liber.sound) window.Liber.sound.play('chime');
    var morphId = selectedArtifact.data.id;
    closeMini();
    if (window.ConstellationMorph) window.ConstellationMorph(morphId);
    else render();
  }

  if (miniClose) miniClose.addEventListener('click', closeMini);
  if (miniSave)  miniSave.addEventListener('click', saveMini);
  if (miniVerb)  miniVerb.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveMini(); if (e.key === 'Escape') closeMini(); });

  function releaseMini() {
    if (!selectedArtifact) return;
    var id = selectedArtifact.data.id;
    var kind = selectedArtifact.kind;
    var data = selectedArtifact.data;
    if (window.Liber && window.Liber.state) {
      if (window.Liber.state.releaseArtifact) window.Liber.state.releaseArtifact(kind, id);
      if (window.Liber.state.unbindRelation) window.Liber.state.unbindRelation(id);
      try {
        var st = window.Liber.state.get() || {};
        var rels = (st.relations || []).filter(function (r) { return (r.to || 'buddy') !== id; });
        var grave = (st.graveyard || []).slice();
        grave.push({ kind: kind, entry: data, buriedAt: Date.now(), from: 'released' });
        window.Liber.state.set({ relations: rels, graveyard: grave });
      } catch (e) {}
    }
    if (window.Liber && window.Liber.sound) window.Liber.sound.play('thunk');
    closeMini();
    render();
  }

  if (miniRelease) miniRelease.addEventListener('click', releaseMini);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  // Bfcache restore: the DOM is the old snapshot; state.js resyncs first
  // (it loads earlier), then redraw from the fresh state so the cast made
  // on the casting stone appears without a full reload.
  window.addEventListener('pageshow', function () { render(); });

  // Redraw on any state change — reset ("start over") clears the stone in
  // place, and without this the desktop kept showing the old star.
  if (window.Liber && window.Liber.state && window.Liber.state.on) {
    window.Liber.state.on('change', render);
  }

  window.ConstellationRefresh = function () { render(); };
})();
