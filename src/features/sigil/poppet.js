// poppet.js — THE FORGEWORK: Physius's forge-press table (full redesign).
// Ported 1:1 from the approved poppet-forgework-study.html. The poppet room
// is two views: the table seen straight down (parchment platen, numeral
// rail built into its top edge, 3D plate bed) and the vessel pip (3D jar,
// the well deck beneath). Grey industrial palette; Germania voice; Deutsch
// blackletter numerals. The three.js apparatus lives in forge-3d.js and
// speaks through window.LiberForgeHooks. Save shape kind:'poppet' and the
// tutor embed (window.LiberPoppet.mountTutor) are preserved exactly.

(function () {
  'use strict';

/* ── the status strip + the plate-commit transfer beat ────────────────── */
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var TITLES = { outline: 'the outline', clothes: 'the clothes', traits: 'the traits', others: 'the others' };
  var lastKept = -1;
  function stepStatus() {
    var kept = ['outline', 'clothes', 'traits', 'others'].filter(function (k) {
      var d = document.querySelector('[data-door-state="' + k + '"]');
      return d && d.textContent === '✓';
    });
    var n = kept.length;
    var pips = document.getElementById('forge-pips');
    if (pips) {
      var html = '';
      for (var i = 0; i < 4; i++) html += '<span class="pip' + (i < n ? ' on' : '') + '">●</span>';
      pips.innerHTML = html;
    }
    var count = document.getElementById('forge-count');
    if (count) count.textContent = '0' + n + ' / 04';
    var next = document.getElementById('forge-next');
    if (next) {
      if (n >= 4) next.textContent = 'four plates laid — keep it';
      else next.textContent = TITLES[kept.length ? ['outline','clothes','traits','others'][n] : 'outline'] + ' on the platen';
    }
    // the transfer: the sheet's ghost flies platen → vessel
    if (!REDUCED && lastKept >= 0 && n > lastKept) {
      var sheet = document.querySelector('.poppet-sheet');
      var jar = document.querySelector('.vessel-jar');
      if (sheet && jar) {
        var sr = sheet.getBoundingClientRect(), jr = jar.getBoundingClientRect();
        var fly = document.createElement('div');
        fly.className = 'forge-transfer';
        fly.style.left = (sr.left + sr.width / 2 - 42) + 'px';
        fly.style.top = (sr.top + 40) + 'px';
        fly.style.setProperty('--fly-x', (jr.left + jr.width / 2 - sr.left - sr.width / 2) + 'px');
        fly.style.setProperty('--fly-y', (jr.top + jr.height / 2 - sr.top - 40) + 'px');
        document.body.appendChild(fly);
        setTimeout(function () { fly.remove(); }, 700);
      }
    }
    lastKept = n;
  }
  var progressEl = document.getElementById('poppet-progress');
  if (progressEl && window.MutationObserver) {
    new MutationObserver(stepStatus).observe(progressEl, { childList: true, characterData: true, subtree: true });
  }

/* ══ the engine ═════════════════════════════════════════════════════════
   LAYERS/ORDER/DOLL/SEAMS (chibi), stitch strokes, the enclosure-fill
   engine, seeded pen scatter, template modes, guides, undo, drafts,
   lay piece + auto-fill, save shape kind:'poppet', tags, binds, keyboard,
   incinerator, 3D hooks. The tutor embed (window.LiberPoppet.mountTutor)
   is preserved exactly. */

  /* Kandinsky's own colour doctrine (Concerning the Spiritual in Art,
     1911), themed to each plate's Jungian act. His meanings, verbatim
     in spirit: white = joy/silence-before-birth, black = grief/closing,
     grey = hopelessness unmoved, blue = spiritual depth calling man from
     the infinite, light blue = faith, green = stillness (bulwark), red =
     confidence/self-assurance, orange = ringing with health, yellow =
     piercing vitality (prickly), violet = consumed sorrow (sickness),
     pink = younger red, brown = dull hardship. PORT: palette arrays +
     sub copy are the only data deltas; every swatch stays a plain
     button — no control logic changes. */
  var LAYERS = {
    outline: { idx: 0, title: 'outline', sub: 'foundation colors — the looking: blues, whites, blacks, greys', arch: 'the ego · the act of looking', opacity: 1, ghost: false, blind: false,
      palette: [
        ['#2440C4', 'pure religious feeling · dark blue'],
        ['#3A66C8', 'resting upon faith · medium blue'],
        ['#7EB8E8', 'the infinite calling · light blue'],
        ['#121A24', 'selfish religious feeling · black'],
        ['#E8E8F0', 'the joy of silence, before birth · white'],
        ['#8C8C8C', 'hopelessness that never moves · grey'],
        ['#6A5A48', 'the soundless earth · brown'],
        ['#B2B2C2', 'fear · pale grey'],
        ['#5A5F6A', 'thought turned inward · steel']
      ] },
    clothes: { idx: 1, title: 'clothes', sub: 'the dressing: yellows, oranges, reds, pinks — vitality made visible', arch: 'the persona · the act of dressing', opacity: 1, ghost: false, blind: false,
      palette: [
        ['#F0C830', 'piercing, prickling vitality · yellow'],
        ['#F8E06A', 'prattling chatter of colour · light yellow'],
        ['#E87020', 'ringing with strength and health · orange'],
        ['#C43A28', 'self-assurance, the earthly · red'],
        ['#D84858', 'younger red, festive joy · red-pink'],
        ['#E8E8F0', 'white'],
        ['#F6C6D9', 'pastel rose'],
        ['#FF8FB8', 'neon pink'],
        ['#F8E5A6', 'pastel lamp'],
        ['#F1C879', 'lamp gold'],
        ['#7FD7D0', 'pastel tide']
      ] },
    traits: { idx: 2, title: 'traits', sub: 'the listening: greens, deep blues, the still middle', arch: 'the personal unconscious · the act of listening', opacity: 0.72, ghost: false, blind: false,
      palette: [
        ['#79B879', 'self-assertion, contentment · green'],
        ['#9BAF5A', 'restful bulwark · olive green'],
        ['#4A6B3A', 'deep hermetic green'],
        ['#2E4A2E', 'green crossed with black, stubborn · ink green'],
        ['#1A3A6A', 'sinking toward black, the eternal longing · deep blue'],
        ['#2440C4', 'the infinite within · dark blue'],
        ['#C9E4A5', 'pale spore'],
        ['#8A9A5A', 'moss at the threshold']
      ] },
    others: { idx: 3, title: 'others', sub: 'the shadow: violets, sorrow consumed — no figure to follow', arch: 'the shadow · the act of surrender', opacity: 0.45, ghost: true, blind: true,
      palette: [
        ['#BE8FBE', 'love for humanity · violet'],
        ['#A99BFF', 'ghost violet'],
        ['#7A4A9A', 'sick-humankind colour, sorrow consumed · deep violet'],
        ['#5F4B87', 'mourning withdrawn · plum'],
        ['#3A2A55', 'night violet'],
        ['#E8D8F8', 'pale wisp'],
        ['#C0A8D8', 'lavender grey, the dusk of feeling']
      ] }
  };
  var ORDER = ['outline', 'clothes', 'traits', 'others'];
  var ROT = { outline: 0, clothes: 90, traits: 180, others: 270 };

  var W = 1080, H = 1224;
  var open = 'outline', tool = 'pen', ink = '#8C8C8C', drawing = false, last = null, undoStack = [], undoStacks = {}, tplOn = true;
  var inkByLayer = {}, restoredOpen = 'outline';
  var bitmap = {}, drafts = {}, saved = {}, primary = {};
  var strokeSeed = 17;

  /* FACE SPOTS: the traits plate is the doll's face, so it is drawn in
     named places — eyes, brows, mouth, blush, one free mark. Drawing in a
     spot's region and laying the piece records that region as a discrete
     face part (entry.face), which the desktop doll can then ANIMATE:
     eyes blink, brows lift, the mouth moves when the poppet speaks. */
  var FACE_SPOTS = [
    { id: 'browL', label: 'left brow', nx: 0.42, ny: 0.15, r: 0.05 },
    { id: 'browR', label: 'right brow', nx: 0.58, ny: 0.15, r: 0.05 },
    { id: 'eyeL', label: 'left eye', nx: 0.42, ny: 0.235, r: 0.055 },
    { id: 'eyeR', label: 'right eye', nx: 0.58, ny: 0.235, r: 0.055 },
    { id: 'blushL', label: 'left blush', nx: 0.33, ny: 0.295, r: 0.042 },
    { id: 'blushR', label: 'right blush', nx: 0.67, ny: 0.295, r: 0.042 },
    { id: 'mouth', label: 'mouth', nx: 0.5, ny: 0.325, r: 0.06 },
    { id: 'mark', label: 'free mark', nx: 0.5, ny: 0.205, r: 0.065 }
  ];
  var faceSpots = {};
  var spotSelected = null;
  function faceSpotHasInk(sp) {
    var ctx = drawCtx();
    if (!ctx) return false;
    var half = Math.round(sp.r * W * 0.8);
    var cx = Math.round(sp.nx * W), cy = Math.round(sp.ny * H);
    try {
      var d = ctx.getImageData(Math.max(0, cx - half), Math.max(0, cy - half), half * 2, half * 2).data;
      for (var i = 3; i < d.length; i += 16) if (d[i] > 40) return true;
    } catch (e) {}
    return false;
  }
  function harvestFaceSpots() {
    var src = bitmap.traits;
    if (!src) return;
    var img = new Image();
    img.onload = function () {
      FACE_SPOTS.forEach(function (sp) {
        var half = Math.round(sp.r * W * 0.8);
        var cx = Math.round(sp.nx * W), cy = Math.round(sp.ny * H);
        var c = document.createElement('canvas');
        c.width = half * 2; c.height = half * 2;
        var cc = c.getContext('2d', { willReadFrequently: true });
        cc.drawImage(img, cx - half, cy - half, half * 2, half * 2, 0, 0, half * 2, half * 2);
        var has = false;
        try {
          var d = cc.getImageData(0, 0, half * 2, half * 2).data;
          for (var i = 3; i < d.length; i += 16) if (d[i] > 40) { has = true; break; }
        } catch (e) {}
        if (has) faceSpots[sp.id] = { nx: sp.nx, ny: sp.ny, r: sp.r, ink: primary.traits || ink, src: c.toDataURL() };
        else delete faceSpots[sp.id];
      });
    };
    img.src = src;
  }

  function handNoise() {
    strokeSeed = (strokeSeed * 1664525 + 1013904223) >>> 0;
    return ((strokeSeed >>> 8) % 1000) / 1000 - 0.5;
  }
  function stableId(prefix) {
    strokeSeed = (strokeSeed * 1664525 + 1013904223) >>> 0;
    return prefix + '-' + Date.now() + '-' + strokeSeed.toString(36);
  }
  function $(id) { return document.getElementById(id); }
  function st() { return (window.Liber && window.Liber.state) || null; }
  function aliasOf() { try { var g = st().get() || {}; return g.travellerAlias || 'traveller'; } catch (e) { return 'traveller'; } }
  function snd(k) { if (window.Liber && window.Liber.sound) { try { window.Liber.sound.play(k); } catch (e) {} } }

  function drawCv() { return $('poppet-draw'); }
  function drawCtx() { var c = drawCv(); return c ? c.getContext('2d', { willReadFrequently: true }) : null; }

  /* the little one: a chibi paper doll — great round head, small soft
     body, mitten hands, stub feet (the maker's own figure). */
  var DOLL = {
    head: { x: .5, y: .235, rotation: 0, path: [['M', .305, .235], ['C', .305, .140, .3923, .043, .5, .043], ['C', .6077, .043, .695, .140, .695, .235], ['C', .695, .330, .6077, .427, .5, .427], ['C', .3923, .427, .305, .330, .305, .235], ['Z']] },
    body: [['M', .415, .435], ['C', .360, .465, .330, .520, .330, .578], ['C', .330, .635, .395, .672, .5, .672], ['C', .605, .672, .670, .635, .670, .578], ['C', .670, .520, .640, .465, .585, .435], ['C', .562, .425, .438, .425, .415, .435], ['Z']],
    leftArm: [['M', .400, .448], ['C', .330, .472, .270, .520, .242, .570], ['C', .222, .602, .216, .632, .226, .646], ['C', .230, .666, .246, .672, .260, .664], ['C', .266, .680, .284, .684, .296, .674], ['C', .306, .688, .324, .684, .332, .670], ['C', .372, .642, .404, .592, .422, .542], ['C', .434, .504, .424, .464, .400, .448], ['Z']],
    rightArm: [['M', .600, .448], ['C', .670, .472, .730, .520, .758, .570], ['C', .778, .602, .784, .632, .774, .646], ['C', .770, .666, .754, .672, .740, .664], ['C', .734, .680, .716, .684, .704, .674], ['C', .694, .688, .676, .684, .668, .670], ['C', .628, .642, .596, .592, .578, .542], ['C', .566, .504, .576, .464, .600, .448], ['Z']],
    leftLeg: [['M', .424, .658], ['C', .412, .700, .402, .756, .396, .794], ['C', .392, .830, .404, .856, .432, .858], ['C', .456, .858, .470, .838, .472, .806], ['C', .476, .760, .482, .708, .488, .664], ['Z']],
    rightLeg: [['M', .576, .658], ['C', .588, .700, .598, .756, .604, .794], ['C', .608, .830, .596, .856, .568, .858], ['C', .544, .858, .530, .838, .528, .806], ['C', .524, .760, .518, .708, .512, .664], ['Z']],
    leftEar: [['M', .296, .180], ['C', .258, .190, .258, .278, .300, .290]],
    rightEar: [['M', .704, .180], ['C', .742, .190, .742, .278, .700, .290]],
    leftEarIn: [['M', .287, .205], ['C', .272, .215, .272, .258, .288, .266]],
    rightEarIn: [['M', .713, .205], ['C', .728, .215, .728, .258, .712, .266]],
    joints: [[.5, .235], [.438, .447], [.562, .447], [.280, .608], [.720, .608], [.442, .796], [.558, .796]]
  };
  var SEAMS = {
    neck: [['M', .430, .447], ['Q', .50, .470, .570, .447]],
    lower: [['M', .348, .628], ['Q', .50, .664, .662, .625]],
    belly: [['M', .362, .545], ['Q', .50, .585, .638, .545]]
  };

  function drawCommands(c, commands, scaleX, scaleY) {
    commands.forEach(function (cmd) {
      var op = cmd[0], x = cmd[1] * scaleX, y = cmd[2] * scaleY;
      if (op === 'M') c.moveTo(x, y);
      else if (op === 'L') c.lineTo(x, y);
      else if (op === 'Q') c.quadraticCurveTo(cmd[1] * scaleX, cmd[2] * scaleY, cmd[3] * scaleX, cmd[4] * scaleY);
      else if (op === 'C') c.bezierCurveTo(cmd[1] * scaleX, cmd[2] * scaleY, cmd[3] * scaleX, cmd[4] * scaleY, cmd[5] * scaleX, cmd[6] * scaleY);
      else if (op === 'Z') c.closePath();
    });
  }
  function drawHead(c, scaleX, scaleY) {
    c.save();
    c.translate(DOLL.head.x * scaleX, DOLL.head.y * scaleY);
    c.rotate(DOLL.head.rotation);
    c.translate(-DOLL.head.x * scaleX, -DOLL.head.y * scaleY);
    drawCommands(c, DOLL.head.path, scaleX, scaleY);
    c.restore();
  }
  function drawDollGeometry(c, fill, stroke, lineWidth, dash) {
    var sx = W, sy = H;
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = lineWidth || 2;
    if (dash) c.setLineDash(dash);
    if (fill) {
      c.fillStyle = fill;
      c.strokeStyle = fill;
      c.beginPath(); drawCommands(c, DOLL.body, sx, sy); c.fill();
      c.beginPath(); drawHead(c, sx, sy); c.fill();
      c.lineWidth = 2;
      c.beginPath(); drawCommands(c, DOLL.leftArm, sx, sy); c.fill(); c.stroke();
      c.beginPath(); drawCommands(c, DOLL.rightArm, sx, sy); c.fill(); c.stroke();
      c.beginPath(); drawCommands(c, DOLL.leftLeg, sx, sy); c.fill(); c.stroke();
      c.beginPath(); drawCommands(c, DOLL.rightLeg, sx, sy); c.fill(); c.stroke();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.beginPath(); drawHead(c, sx, sy); c.stroke();
      ['body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'leftEar', 'rightEar', 'leftEarIn', 'rightEarIn'].forEach(function (key) { c.beginPath(); drawCommands(c, DOLL[key], sx, sy); c.stroke(); });
    }
    c.restore();
  }
  function traceDoll(c, options) {
    options = options || {};
    var mode = options.mode || 'pattern';
    var stroke = options.stroke || (open === 'others' ? 'rgba(255,250,255,.95)' : 'rgba(102,72,48,.72)');
    var detail = options.detail !== false;
    var fill = options.fill || 'rgba(180,170,160,.35)';
    if (mode === 'blind') {
      c.save(); c.strokeStyle = stroke; c.lineWidth = 2; c.setLineDash([2, 10]);
      c.beginPath(); c.moveTo(.5 * W, .14 * H); c.lineTo(.5 * W, .92 * H); c.stroke(); c.setLineDash([]);
      DOLL.joints.forEach(function (p) { c.beginPath(); c.arc(p[0] * W, p[1] * H, 4, 0, Math.PI * 2); c.stroke(); });
      c.restore(); return;
    }
    if (mode === 'stuffed') {
      c.save(); c.globalCompositeOperation = 'destination-over'; drawDollGeometry(c, fill, null, 0); c.restore();
      drawDollGeometry(c, null, options.stroke || 'rgba(120,100,90,.7)', 2.2, [6, 5]);
      if (detail) {
        c.save(); c.globalCompositeOperation = 'destination-over'; c.fillStyle = 'rgba(15,5,18,.18)';
        c.beginPath(); c.ellipse(.5 * W, .978 * H, .19 * W, .014 * H, 0, 0, Math.PI * 2); c.fill(); c.restore();
        c.save(); c.strokeStyle = options.stroke || 'rgba(120,100,90,.7)'; c.lineWidth = 1.8; c.setLineDash([5, 6]);
        ['neck', 'lower', 'belly'].forEach(function (key) { c.beginPath(); drawCommands(c, SEAMS[key], W, H); c.stroke(); });
        c.setLineDash([]); c.fillStyle = 'rgba(255,245,216,.16)';
        for (var gi = 0; gi < 26; gi++) { c.beginPath(); c.arc((.31 + ((gi * 37) % 380) / 1000) * W, (.43 + ((gi * 23) % 490) / 1000) * H, 1.2 + (gi % 3) * .35, 0, Math.PI * 2); c.fill(); }
        c.restore();
      }
      return;
    }
    if (mode === 'clothes') {
      c.save(); c.globalAlpha = .22; drawDollGeometry(c, null, stroke, 2, [3, 8]); c.restore();
      c.save(); c.strokeStyle = stroke; c.lineWidth = 2; c.setLineDash([5, 6]);
      c.beginPath(); c.moveTo(.435 * W, .452 * H); c.quadraticCurveTo(.500 * W, .478 * H, .565 * W, .452 * H); c.stroke();
      c.beginPath(); c.moveTo(.360 * W, .530 * H); c.quadraticCurveTo(.500 * W, .572 * H, .640 * W, .530 * H); c.stroke();
      c.beginPath(); c.moveTo(.352 * W, .640 * H); c.quadraticCurveTo(.500 * W, .682 * H, .658 * W, .638 * H); c.stroke();
      c.setLineDash([]); c.restore(); return;
    }
    if (mode === 'traits') {
      c.save(); c.strokeStyle = stroke; c.lineWidth = 2; c.setLineDash([2, 9]);
      c.beginPath(); c.moveTo(.5 * W, .14 * H); c.lineTo(.5 * W, .93 * H); c.stroke();
      c.beginPath(); c.arc(.41 * W, .53 * H, .12 * W, .18 * H, Math.PI * 1.5); c.stroke();
      c.beginPath(); c.arc(.63 * W, .68 * H, .10 * W, Math.PI * .1, Math.PI * 1.1); c.stroke(); c.setLineDash([]);
      DOLL.joints.slice(1, 5).forEach(function (p) { c.beginPath(); c.arc(p[0] * W, p[1] * H, 4, 0, Math.PI * 2); c.fillStyle = stroke; c.fill(); }); c.restore(); return;
    }
    c.save(); c.globalAlpha = .42; c.fillStyle = 'rgba(150,108,70,.42)';
    c.beginPath(); drawCommands(c, DOLL.body, W, H); c.fill(); c.beginPath(); drawHead(c, W, H); c.fill(); c.restore();
    drawDollGeometry(c, null, stroke, 4.5, [14, 5]);
    c.save(); c.strokeStyle = 'rgba(72,48,30,.56)'; c.lineWidth = 1.5; c.setLineDash([4, 7]);
    ['neck', 'lower', 'belly'].forEach(function (key) { c.beginPath(); drawCommands(c, SEAMS[key], W, H); c.stroke(); });
    c.setLineDash([2, 8]); c.beginPath(); c.moveTo(.50 * W, .13 * H); c.lineTo(.50 * W, .92 * H); c.stroke(); c.setLineDash([]);
    DOLL.joints.forEach(function (p) { c.beginPath(); c.arc(p[0] * W, p[1] * H, 3.4, 0, Math.PI * 2); c.stroke(); }); c.restore();
  }
  function paintTemplate() {
    var t = $('poppet-tpl');
    if (!t) return;
    var c = t.getContext('2d', { willReadFrequently: true });
    c.clearRect(0, 0, W, H);
    if (!tplOn) return;
    c.save();
    c.translate(0, -4);
    var guideMode = open === 'others' ? 'blind' : (open === 'clothes' ? 'clothes' : (open === 'traits' ? 'traits' : 'pattern'));
    traceDoll(c, { mode: guideMode, stroke: open === 'others' ? 'rgba(255,250,255,.95)' : (open === 'clothes' ? 'rgba(91,55,70,.62)' : (open === 'traits' ? 'rgba(201,228,165,.78)' : 'rgba(72,48,30,.92)')) });
    c.restore();
    var template = $('poppet-tpl');
    if (template) {
      template.style.opacity = open === 'others' ? '1' : '.95';
      template.style.mixBlendMode = open === 'others' ? 'screen' : 'multiply';
      template.style.filter = open === 'others' ? 'brightness(1.8)' : (open === 'outline' ? 'contrast(1.16)' : 'none');
    }
  }
  function pos(e) {
    var c = drawCv(), r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  function stroke(a, b) {
    var ctx = drawCtx();
    if (!ctx) return;
    var ax = a.x + handNoise() * 1.1, ay = a.y + handNoise() * 1.1;
    var bx = b.x + handNoise() * 1.1, by = b.y + handNoise() * 1.1;
    if (tool === 'eraser') {
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 36; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.restore();
      return;
    }
    ctx.save();
    ctx.strokeStyle = ink; ctx.lineCap = 'butt'; ctx.lineJoin = 'round'; ctx.lineWidth = 8.5;
    ctx.setLineDash([10, 5]); ctx.lineDashOffset = -((strokeSeed >>> 4) % 5);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = 'rgba(45,26,18,.58)';
    var len = Math.max(1, Math.hypot(bx - ax, by - ay));
    var steps = Math.max(1, Math.floor(len / 13));
    for (var si = 0; si <= steps; si++) {
      var t = si / steps, hx = ax + (bx - ax) * t, hy = ay + (by - ay) * t;        ctx.beginPath(); ctx.arc(hx, hy, 2.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function pushUndo() { try { var c = drawCv(); undoStack.push(c.toDataURL()); if (undoStack.length > 25) undoStack.shift(); } catch (e) {} }
  function doUndo() {
    if (!undoStack.length) return;
    var img = new Image();
    img.onload = function () { var ctx = drawCtx(); ctx.clearRect(0, 0, W, H); ctx.drawImage(img, 0, 0, W, H); };
    img.src = undoStack.pop();
  }
  function canvasBlank() {
    var c = drawCv();
    if (!c) return true;
    try {
      var ctx = c.getContext('2d', { willReadFrequently: true });
      var d = ctx.getImageData(0, 0, W, H).data;
      for (var i = 3; i < d.length; i += 4) { if (d[i] !== 0) return false; }
      return true;
    } catch (e) { return false; }
  }
  function stashDraft() {
    if (!open || canvasBlank()) return;
    try { drafts[open] = drawCv().toDataURL(); } catch (e) { return; }
  }
  function paleInkRGB(color) {
    var r = 128, g = 128, b = 128;
    if (/^#[0-9a-f]{6}$/i.test(color)) {
      r = parseInt(color.slice(1, 3), 16); g = parseInt(color.slice(3, 5), 16); b = parseInt(color.slice(5, 7), 16);
    }
    r = Math.round(r + (255 - r) * .56); g = Math.round(g + (255 - g) * .56); b = Math.round(b + (255 - b) * .56);
    return [r, g, b];
  }
  function paleInk(color) {
    var c = paleInkRGB(color);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',.78)';
  }
  function fillOutlineBody(ctx) {
    traceDoll(ctx, { mode: 'stuffed', fill: paleInk(ink), stroke: ink + 'aa', detail: true });
  }
  /* ── the fill: stitches close within reason, the piece fills on lay ──
     A region counts as enclosed when the marks wall it off — small gaps
     (≤ a few pixels) are bridged by flood-filling a dilated copy of the
     stitches. The fill itself is pixel-flooded from the borders and
     painted only where the paper is still bare, so it always sits
     underneath the stitching. */
  function computeEnclosure(bridge) {
    var src = drawCv();
    if (!src) return null;
    var ctx = src.getContext('2d', { willReadFrequently: true });
    var dd = ctx.getImageData(0, 0, W, H).data;
    // dilated mask of the stitches: the union of shifted copies bridges gaps
    var mask = document.createElement('canvas');
    mask.width = W; mask.height = H;
    var mc = mask.getContext('2d', { willReadFrequently: true });
    var offs = bridge ? [-3, 0, 3] : [0];
    for (var oy = 0; oy < offs.length; oy++) for (var ox = 0; ox < offs.length; ox++) mc.drawImage(src, offs[ox], offs[oy]);
    var md = mc.getImageData(0, 0, W, H).data;
    var N = W * H;
    var reached = new Uint8Array(N);
    var stack = [];
    for (var x = 0; x < W; x++) { stack.push(x); stack.push((H - 1) * W + x); }
    for (var y = 0; y < H; y++) { stack.push(y * W); stack.push(y * W + W - 1); }
    while (stack.length) {
      var i = stack.pop();
      if (reached[i]) continue;
      if (md[i * 4 + 3] > 40) continue;
      reached[i] = 1;
      var cx = i % W;
      if (cx > 0) stack.push(i - 1);
      if (cx < W - 1) stack.push(i + 1);
      if (i >= W) stack.push(i - W);
      if (i < N - W) stack.push(i + W);
    }
    var count = 0;
    for (var j = 0; j < N; j++) {
      if (!reached[j] && md[j * 4 + 3] <= 40 && dd[j * 4 + 3] < 20) count++;
    }
    return { reached: reached, count: count };
  }
  function paintFill(rgb) {
    var res = computeEnclosure(true);
    if (!res || !res.count) return false;
    var ctx = drawCtx();
    if (!ctx) return false;
    var img = ctx.getImageData(0, 0, W, H);
    var d = img.data;
    var st = res.reached;
    for (var j = 0; j < st.length; j++) {
      if (!st[j] && d[j * 4 + 3] < 20) {
        var p = j * 4;
        d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = 235;
      }
    }
    ctx.putImageData(img, 0, 0);
    return true;
  }
  function autoFillLayer(k, ctx) {
    if (paintFill(paleInkRGB(ink))) return true;
    if (k === 'outline') { fillOutlineBody(ctx); return true; }
    return false;
  }
  /* the ink tray: the plate's pens scattered loose on the bench — pick a
     pen up and its ink is chosen (the journal's grammar). The scatter is
     seeded, so a plate's pens always land in the same spots. */
  function inkPenSvg(color) {
    return '<svg viewBox="0 0 22 40" width="30" height="55">'
      + '<rect x="6.5" y="1" width="9" height="26" rx="2" fill="' + color + '" stroke="rgba(10,6,3,0.9)" stroke-width="1.2"/>'
      + '<rect x="8" y="27" width="6" height="3" fill="#dfe4ec"/>'
      + '<path d="M7 30h8l-4 9z" fill="#e0c9a0" stroke="rgba(10,6,3,0.9)" stroke-width="1"/>'
      + '<path d="M10.4 36.4l1.6 2.6 1.6-2.6z" fill="#2a2a2a"/>'
      + '</svg>';
  }
  function buildPalette(key) {
    var tray = $('poppet-palette');
    if (!tray) return;
    tray.innerHTML = '';
    var pens = [];
    var seed = 7 + LAYERS[key].idx * 131;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    LAYERS[key].palette.forEach(function (sw, i) {
      var unit = document.createElement('div');
      unit.className = 'forge-ink';
      unit.title = sw[1];
      unit.style.animation = 'forge-drift' + (i % 3) + ' ' + (5 + rnd() * 4).toFixed(2) + 's ease-in-out ' + (rnd() * -6).toFixed(2) + 's infinite alternate';
      var pen = document.createElement('button');
      pen.type = 'button'; pen.className = 'forge-inkpen'; pen.innerHTML = inkPenSvg(sw[0]);
      pen.title = sw[1]; pen.setAttribute('aria-label', 'pick up the pen: ' + sw[1]);
      pen.style.rotate = (rnd() * 20 - 10).toFixed(1) + 'deg';
      /* organized bench: loose rows, each pen nudged off its slot */
      var row = Math.floor(i / 6), col = i % 6, perRow = Math.min(6, LAYERS[key].palette.length);
      unit.style.left = (4 + col * (86 / Math.max(1, perRow - 1)) + (rnd() * 7 - 3.5)).toFixed(1) + '%';
      unit.style.top = (8 + row * 44 + (rnd() * 10 - 5)).toFixed(1) + '%';
      function choose() {
        ink = sw[0]; inkByLayer[key] = ink;
        for (var j = 0; j < pens.length; j++) {
          pens[j].pen.setAttribute('aria-pressed', 'false');
          pens[j].unit.classList.remove('armed');
        }
        pen.setAttribute('aria-pressed', 'true');
        unit.classList.add('armed');
      }
      pen.addEventListener('click', choose);
      pens.push({ pen: pen, unit: unit });
      unit.appendChild(pen);
      tray.appendChild(unit);
    });
    var first = pens[0];
    if (first) { first.pen.setAttribute('aria-pressed', 'true'); first.unit.classList.add('armed'); }
    ink = inkByLayer[key] || LAYERS[key].palette[0][0];
  }
  function buildSpotPicker() {
    var tray = $('poppet-spots');
    if (!tray) return;
    if (open !== 'traits') { tray.hidden = true; tray.innerHTML = ''; return; }
    tray.hidden = false;
    tray.innerHTML = '';
    var label = document.createElement('span');
    label.className = 'forge-spots-label';
    label.textContent = 'face spots';
    tray.appendChild(label);
    FACE_SPOTS.forEach(function (sp) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'forge-spot';
      chip.setAttribute('data-spot', sp.id);
      chip.setAttribute('aria-pressed', spotSelected === sp.id ? 'true' : 'false');
      chip.innerHTML = '<i></i>' + sp.label;
      chip.title = 'draw inside the ' + sp.label + ' region, then lay the piece';
      if (faceSpots[sp.id] || faceSpotHasInk(sp)) chip.classList.add('has-ink');
      chip.addEventListener('click', function () {
        spotSelected = spotSelected === sp.id ? null : sp.id;
        buildSpotPicker();
        paintGuides('traits');
        snd('tick');
      });
      tray.appendChild(chip);
    });
  }
  function paintGuides(key) {
    var L = LAYERS[key];
    var guides = [$('poppet-g1'), $('poppet-g2'), $('poppet-g3')];
    guides.forEach(function (g) { if (g) { var c = g.getContext('2d', { willReadFrequently: true }); c.clearRect(0, 0, W, H); } });
    var gi = 0;
    ORDER.forEach(function (k) {
      if (LAYERS[k].idx >= L.idx || !bitmap[k]) return;
      var g = guides[gi++];
      if (!g) return;
      var img = new Image(), cc = g.getContext('2d', { willReadFrequently: true });
      img.onload = function () { cc.clearRect(0, 0, W, H); cc.globalAlpha = 0.4; cc.drawImage(img, 0, 0, W, H); cc.globalAlpha = 1; };
      img.src = bitmap[k];
    });
    // the face spots: dashed stencils on the top guide while traits is open
    if (key === 'traits' && guides[gi]) {
      var gc = guides[gi].getContext('2d', { willReadFrequently: true });
      FACE_SPOTS.forEach(function (sp) {
        gc.save();
        gc.strokeStyle = spotSelected === sp.id ? 'rgba(232,240,248,0.95)' : 'rgba(201,228,165,0.5)';
        gc.lineWidth = spotSelected === sp.id ? 4 : 2.4;
        gc.setLineDash(spotSelected === sp.id ? [] : [10, 12]);
        gc.beginPath();
        gc.ellipse(sp.nx * W, sp.ny * H, sp.r * W, sp.r * W * 0.82, 0, 0, Math.PI * 2);
        gc.stroke();
        if (spotSelected === sp.id) {
          gc.fillStyle = 'rgba(232,240,248,0.14)';
          gc.fill();
        }
        gc.restore();
      });
    }
  }
  function loadOntoDraw(key) {
    var ctx = drawCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    var source = drafts[key] || bitmap[key];
    if (source) {
      var src = source, img = new Image();
      img.onload = function () { if ((drafts[key] || bitmap[key]) === src) ctx.drawImage(img, 0, 0, W, H); };
      img.src = src;
    }
  }
  function layerUnlocked(key) {
    var idx = LAYERS[key] && LAYERS[key].idx;
    if (idx == null) return false;
    if (tutorMounted && tutorOptions && tutorOptions.isolated) return true;
    for (var i = 0; i < idx; i++) if (!saved[ORDER[i]]) return false;
    return true;
  }
  function switchLayer(key, silent) {
    if (!LAYERS[key] || !layerUnlocked(key)) return;
    if (key !== open) stashDraft();
    open = key;
    var L = LAYERS[key];
    $('poppet-ed-title').textContent = L.title;
    $('poppet-ed-sub').textContent = L.sub;
    $('poppet-ed-arch').textContent = L.arch;
    $('poppet-hint').textContent = L.blind
      ? 'no pattern — your marks stay visible.'
      : 'draw the layer, then lay the piece.';
    var editor = $('poppet-editor');
    if (editor) {
      if (key === 'others') editor.classList.add('is-others');
      else editor.classList.remove('is-others');
      editor.setAttribute('data-material', key);
    }
    $('poppet-worktable').setAttribute('data-layer', key);
    $('poppet-worktable').setAttribute('data-active', key);
    buildSpotPicker();
    var surface = document.querySelector('.poppet-surface');
    if (surface) surface.setAttribute('data-material', key);
    var stackEl = $('poppet-stack');
    if (stackEl) { stackEl.classList.remove('poppet-arrive'); void stackEl.offsetWidth; stackEl.classList.add('poppet-arrive'); }
    var plates = document.querySelectorAll('.poppet-plate');
    for (var pi = 0; pi < plates.length; pi++) plates[pi].classList.toggle('active', plates[pi].getAttribute('data-layer') === key);
    buildPalette(key);
    undoStack = undoStacks[key] || (undoStacks[key] = []);
    loadOntoDraw(key);
    paintGuides(key);
    paintTemplate();
    refreshDoors();
    if (!silent) snd('tick');
  }
  function blitOne(id, key, alpha) {
    var cv = $(id);
    if (!cv) return;
    var c = cv.getContext('2d', { willReadFrequently: true });
    c.clearRect(0, 0, W, H);
    if (!bitmap[key]) return;
    var src = bitmap[key], img = new Image();
    img.onload = function () {
      if (bitmap[key] !== src) return;
      c.save();
      if (alpha != null) c.globalAlpha = alpha;
      c.drawImage(img, 0, 0, W, H);
      c.restore();
    };
    img.src = src;
  }
  function blitComposites() {
    blitOne('poppet-c-outline', 'outline', 1);
    blitOne('poppet-c-clothes', 'clothes', 1);
    blitOne('poppet-c-traits', 'traits', LAYERS.traits.opacity);
    blitOne('poppet-c-others', 'others', LAYERS.others.opacity);
    var comp = $('poppet-comp');
    if (comp) {
      ORDER.forEach(function (k) { comp.classList.toggle('has-' + k, !!bitmap[k]); });
      comp.classList.toggle('is-complete', ORDER.every(function (k) { return saved[k]; }));
    }
    var g = document.querySelector('#poppet-comp .poppet-ghost');
    if (g) g.classList.toggle('saved', !!saved.others);
  }
  function refreshIcon() {
    ORDER.forEach(function (k) {
      var q = $('poppet-q-' + k);
      if (q) q.setAttribute('fill', saved[k] ? primary[k] : 'transparent');
    });
  }
  function refreshDoors() {
    ORDER.forEach(function (k) {
      var doors = document.querySelectorAll('.poppet-door[data-layer="' + k + '"]');
      for (var i = 0; i < doors.length; i++) {
        var unlocked = layerUnlocked(k);
        doors[i].classList.toggle('saved', !!saved[k]);
        doors[i].classList.toggle('active', open === k);
        doors[i].classList.toggle('locked', !unlocked);
        doors[i].disabled = !unlocked;
        doors[i].setAttribute('aria-disabled', unlocked ? 'false' : 'true');
        doors[i].setAttribute('aria-pressed', open === k ? 'true' : 'false');
        doors[i].setAttribute('aria-label', k + (saved[k] ? ', laid piece' : unlocked ? ', available' : ', sealed until the previous layer is laid'));
      }
      var stEl = document.querySelector('[data-door-state="' + k + '"]');
      if (stEl) {
        stEl.textContent = saved[k] ? '✓' : (layerUnlocked(k) ? '—' : 'sealed');
        stEl.setAttribute('aria-hidden', 'true');
      }
    });
    var bench = $('poppet-worktable');
    if (bench) bench.setAttribute('data-active', open);
    var all = ORDER.every(function (k) { return saved[k]; });
    var keptCount = ORDER.filter(function (k) { return saved[k]; }).length;
    var app = $('poppet-app');
    if (app) app.setAttribute('data-kept-count', keptCount);
    var sv = $('poppet-save-desktop'), dc = $('poppet-discard');
    var progress = $('poppet-progress');
    var next = ORDER.filter(function (k) { return !saved[k]; })[0];
    if (progress) {
      progress.textContent = all
        ? '4/4 — ready to keep'
        : keptCount + '/4 — next: ' + (LAYERS[next] ? LAYERS[next].title : next);
      progress.setAttribute('aria-label', all
        ? 'all four layers are laid; the poppet is ready to keep'
        : keptCount + ' of 4 layers are laid. Next: ' + (LAYERS[next] ? LAYERS[next].title : next));
    }
    if (sv) {
      sv.disabled = !all;
      sv.setAttribute('aria-describedby', 'poppet-progress');
      sv.setAttribute('aria-label', all
        ? 'keep completed poppet on desktop'
        : 'keep on desktop unavailable until all four layers are laid');
      sv.title = all ? 'keep the completed poppet on desktop' : 'lay all four layers before keeping the poppet';
    }
    // the seal: only a finished poppet, and never inside the tutor lesson
    var sealBtn = $('poppet-seal');
    if (sealBtn) {
      sealBtn.hidden = !(all && !tutorMounted);
      sealBtn.setAttribute('aria-label', all ? 'seal the poppet — it dissolves to the desktop' : 'seal the poppet once all four layers are laid');
    }
    // the incinerator burns only unsaved work — any mark on any plate
    var inc = $('poppet-incinerator');
    if (inc) {
      var anyMark = ORDER.some(function (k) { return bitmap[k] || drafts[k]; });
      inc.disabled = !anyMark;
      inc.title = anyMark ? 'scrap this poppet — only before it is saved' : 'nothing to scrap yet';
    }
    if (dc) dc.disabled = !all;
    var t = $('poppet-title');
    if (t) t.textContent = 'poppet · ' + aliasOf();
    // the 3D rack mirrors the legend (study + app)
    var fh = window.LiberForgeHooks;
    if (fh && fh.applyRack) {
      var unl = {};
      ORDER.forEach(function (k) { unl[k] = layerUnlocked(k); });
      fh.applyRack({ active: open, saved: saved, unlocked: unl });
    }
  }

  function showClothPiece() {
    var bench = document.querySelector('.forge-platen') || document.querySelector('.poppet-sheet');
    if (!bench || !bitmap.clothes) return;
    var old = bench.querySelector('.poppet-cloth-piece');
    if (old) old.remove();
    var piece = document.createElement('div');
    piece.className = 'poppet-cloth-piece';
    piece.dataset.bitmap = bitmap.clothes;
    piece.style.setProperty('--cloth-image', 'url("' + bitmap.clothes + '")');
    piece.style.backgroundImage = 'url("' + bitmap.clothes + '")';
    piece.style.backgroundSize = '100% 100%';
    piece.style.backgroundPosition = 'center';
    // waits on the table beside the platen until it is dragged onto the doll
    piece.style.left = '4%';
    piece.style.bottom = '7%';
    piece.style.width = '22%';
    piece.style.height = '26%';
    piece.setAttribute('aria-label', 'laid clothing piece — drag it onto the poppet');
    piece.title = 'drag onto the poppet to dress it';
    piece.tabIndex = 0;
    bench.appendChild(piece);
    var drag = false, ox = 0, oy = 0;
    piece.addEventListener('pointerdown', function (e) {
      drag = true; piece.setPointerCapture(e.pointerId);
      var r = piece.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top;
      piece.classList.add('is-held');
    });
    piece.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var host = piece.parentElement || bench;
      var hr = host.getBoundingClientRect();
      piece.style.left = Math.max(0, Math.min(hr.width - piece.offsetWidth, e.clientX - hr.left - ox)) + 'px';
      piece.style.top = Math.max(0, Math.min(hr.height - piece.offsetHeight, e.clientY - hr.top - oy)) + 'px';
    });
    piece.addEventListener('pointerup', function (e) {
      drag = false; piece.releasePointerCapture(e.pointerId); piece.classList.remove('is-held');
      var stack = $('poppet-stack'), sr = stack && stack.getBoundingClientRect();
      var pr = piece.getBoundingClientRect();
      var cx = pr.left + pr.width / 2, cy = pr.top + pr.height / 2;
      if (stack && piece.parentElement === bench && cx > sr.left && cx < sr.right && cy > sr.top && cy < sr.bottom) {
        stack.appendChild(piece);
        piece.classList.add('is-placed');
        piece.style.left = '0'; piece.style.top = '0'; piece.style.width = '100%'; piece.style.height = '100%';
        piece.style.backgroundImage = 'url("' + piece.dataset.bitmap + '")';
        piece.style.backgroundSize = '100% 100%'; piece.style.backgroundColor = 'transparent';
        snd('chime');
      }
    });
  }

  function layPiece() {
    if (!open) return;
    var k = open;
    if (canvasBlank() && !drafts[k] && !bitmap[k]) return;
    pushUndo();
    var ctx = drawCtx();
    if (ctx) autoFillLayer(k, ctx);
    try { bitmap[k] = drawCv().toDataURL(); delete drafts[k]; } catch (e) { return; }
    // the platen is stripped once the piece is taken — the next plate starts clean
    var dctx = drawCtx(); if (dctx) dctx.clearRect(0, 0, W, H);
    if (k === 'outline') {
      var laidStack = $('poppet-stack');
      if (laidStack) { laidStack.classList.remove('poppet-outline-inflate'); void laidStack.offsetWidth; laidStack.classList.add('poppet-outline-inflate'); }
    }
    primary[k] = ink;
    saved[k] = true;
    if (k === 'traits') { harvestFaceSpots(); buildSpotPicker(); }
    if (tutorOptions && typeof tutorOptions.onPieceLaid === 'function') {
      try { tutorOptions.onPieceLaid(k, { bitmap: bitmap[k], primary: primary[k] }); } catch (e) {}
    }
    if (tutorOptions && ORDER.every(function (layer) { return saved[layer]; }) && typeof tutorOptions.onComplete === 'function') {
      try { tutorOptions.onComplete({ layers: bitmap, primary: primary }); } catch (e) {}
    }
    if (k === 'clothes') showClothPiece();
    paintGuides(k);
    blitComposites();
    refreshIcon();
    refreshDoors();
    stepStatus();
    // the transfer beat: ember flicker in the vessel (additive motion;
    // the strip already stepped — no information lives only in this)
    var fh2 = window.LiberForgeHooks;
    if (fh2 && fh2.transferBeat) fh2.transferBeat();
    snd('chime');
    // the press hands you the next plate: walk the sequence yourself only to revisit
    if (!tutorMounted) {
      var nxt = null;
      for (var ni = 0; ni < ORDER.length; ni++) { if (!saved[ORDER[ni]]) { nxt = ORDER[ni]; break; } }
      if (nxt) switchLayer(nxt);
    }
  }

  function saveToDesktop() {
    var s = st();
    if (!s) return;
    var g = s.get() || {};
    var arr = (g.buddy || []).slice();
    var entry = {
      id: stableId('poppet'),
      kind: 'poppet',
      name: aliasOf(),
      layers: { outline: bitmap.outline || null, clothes: bitmap.clothes || null, traits: bitmap.traits || null, others: bitmap.others || null },
      face: (function () { var f = {}; FACE_SPOTS.forEach(function (sp) { if (faceSpots[sp.id]) f[sp.id] = faceSpots[sp.id]; }); return f; })(),
      primary: { outline: primary.outline, clothes: primary.clothes, traits: primary.traits, others: primary.others },
      activeLayer: open,
      bound: boundDoor,
      tags: tagsFor(),
      ts: Date.now()
    };
    arr.push(entry);
    s.set({ buddy: arr });
    var app = $('poppet-app');
    if (app) { app.classList.remove('poppet-saved-flash'); void app.offsetWidth; app.classList.add('poppet-saved-flash'); }
    var saveButton = $('poppet-save-desktop');
    if (saveButton) {
      saveButton.setAttribute('aria-label', 'poppet transferred to desktop');
      if (!saveButton.dataset.keptT) {
        saveButton.dataset.keptT = '1';
        var oldLabel = saveButton.textContent;
        saveButton.textContent = 'kept ✓';
        setTimeout(function () { saveButton.textContent = oldLabel; delete saveButton.dataset.keptT; }, 1800);
      }
    }
    snd('chime');
  }

  // ── the seal: the finished poppet leaves the forge ────────────────────
  // All four plates laid, a golden seal appears in the action band. One
  // press: the poppet is kept, the room dissolves through a closing iris
  // around a stamped quadrant mark, and the desktop receives it.
  function sealPoppet() {
    if (tutorMounted) return;
    if (!ORDER.every(function (k) { return saved[k]; })) return;
    saveToDesktop();
    var ov = document.createElement('div');
    ov.className = 'forge-seal-overlay';
    var q = {
      outline: 'M40 3 A37 37 0 0 0 3 40 L40 40 Z',
      clothes: 'M40 3 A37 37 0 0 1 77 40 L40 40 Z',
      traits: 'M3 40 L40 40 L40 77 A37 37 0 0 1 3 40 Z',
      others: 'M77 40 L40 40 L40 77 A37 37 0 0 0 77 40 Z'
    };
    var s = '';
    for (var qi = 0; qi < ORDER.length; qi++) {
      var kk = ORDER[qi];
      s += '<path d="' + q[kk] + '" fill="' + (primary[kk] || 'transparent') + '"/>';
    }
    ov.innerHTML =
      '<div class="fso-iris" aria-hidden="true"></div>' +
      '<div class="fso-seal" role="status" aria-label="the poppet is sealed">' +
      '  <svg viewBox="0 0 80 80" aria-hidden="true">' +
      '    <circle cx="40" cy="40" r="39" fill="#0b0710"/>' + s +
      '    <path d="M40 3 V77 M3 40 H77" stroke="#dfe4ec" stroke-width="4" fill="none"/>' +
      '    <circle cx="40" cy="40" r="37" fill="none" stroke="#d4af65" stroke-width="2.5"/>' +
      '    <circle cx="40" cy="40" r="39" fill="none" stroke="#8a6a2a" stroke-width="1"/>' +
      '  </svg><span>sealed</span></div>';
    document.body.appendChild(ov);
    try { sessionStorage.setItem('liber_desk_arrive', '1'); } catch (e) {}
    function go() { window.location.href = '../desktop.html'; }
    if (REDUCED) setTimeout(go, 250); else setTimeout(go, 1550);
  }
  function discardAll() {
    ORDER.forEach(function (k) { delete bitmap[k]; delete drafts[k]; delete primary[k]; saved[k] = false; });
    var inc = $('poppet-incinerator');
    if (inc) { inc.dataset.armed = ''; inc.textContent = 'incinerate'; inc.classList.remove('is-armed'); }
    var ctx = drawCtx();
    if (ctx) ctx.clearRect(0, 0, W, H);
    var cloth = document.querySelector('.poppet-cloth-piece');
    if (cloth) cloth.remove();
    undoStacks = {};
    undoStack = [];
    paintGuides(open);
    blitComposites(); refreshIcon(); refreshDoors(); stepStatus();
    snd('thunk');
    var bench = $('poppet-worktable');
    if (bench) { bench.classList.remove('poppet-shake'); void bench.offsetWidth; bench.classList.add('poppet-shake'); }
  }

  function trimRoomCopy() {
    ['#poppet-subtitle'].forEach(function (sel) {
      var e = document.querySelector(sel); if (e) e.remove();
    });
  }

  var TAGS = (window.Liber && window.Liber.state && window.Liber.state.BUDDY_TAGS) || ['shadow', 'persona', 'ego', 'self'];
  var tagOn = {}, boundDoor = null;
  function tagsFor() {
    var out = [];
    for (var i = 0; i < TAGS.length; i++) if (tagOn[TAGS[i]]) out.push(TAGS[i]);
    return out;
  }
  function refreshMinimenuState() {
    var chips = document.querySelectorAll('.poppet-chip');
    for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', !!tagOn[chips[i].textContent]);
    var binds = document.querySelectorAll('#poppet-binds button');
    for (var j = 0; j < binds.length; j++) binds[j].classList.toggle('on', binds[j].getAttribute('data-bind') === boundDoor);
  }
  window.LiberPoppetBind = function () { return boundDoor; };
  function buildMinimenu() {
    var chips = $('poppet-chips');
    if (!chips) return;
    chips.innerHTML = '';
    TAGS.slice(0, 8).forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'poppet-chip'; b.textContent = t;
      b.addEventListener('click', function () {
        tagOn[t] = !tagOn[t];
        b.classList.toggle('on', !!tagOn[t]);
        var editor = $('poppet-editor');
        if (editor) editor.classList.toggle('tag-' + t, !!tagOn[t]);
      });
      chips.appendChild(b);
    });
    var binds = document.querySelectorAll('#poppet-binds button');
    for (var i = 0; i < binds.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          var d = b.getAttribute('data-bind');
          boundDoor = (boundDoor === d) ? null : d;
          for (var j = 0; j < binds.length; j++) binds[j].classList.toggle('on', binds[j].getAttribute('data-bind') === boundDoor);
          refreshMinimenuState();
        });
      })(binds[i]);
    }
  }
  function loadKept() {
    var s = st();
    if (!s) return;
    var g = s.get() || {};
    var list = g.buddy || [];
    for (var i = list.length - 1; i >= 0; i--) {
      var e = list[i];
      if (e && e.kind === 'poppet' && e.layers) {
        ORDER.forEach(function (k) {
          if (e.layers[k]) { bitmap[k] = e.layers[k]; saved[k] = true; }
          if (e.primary && e.primary[k]) primary[k] = e.primary[k];
        });
        restoredOpen = LAYERS[e.activeLayer] ? e.activeLayer : 'outline';
        if (e.bound) boundDoor = e.bound;
        if (e.tags) e.tags.forEach(function (tag) { tagOn[tag] = true; });
        blitComposites(); refreshIcon(); refreshDoors();
        if (bitmap.clothes) showClothPiece();
        refreshMinimenuState();
        return;
      }
      if (e && e.kind === 'stone' && e.bitmap && !e.layers) {
        bitmap.outline = e.bitmap; saved.outline = true; primary.outline = '#8C8C8C';
        blitComposites(); refreshIcon(); refreshDoors();
        return;
      }
    }
    refreshDoors();
  }

  function wireWorktable() {
    var doors = document.querySelectorAll('.poppet-door[data-layer]');
    for (var i = 0; i < doors.length; i++) {
      (function (d) { d.addEventListener('click', function () { switchLayer(d.getAttribute('data-layer')); }); })(doors[i]);
    }
    var tools = document.querySelectorAll('.poppet-tool[data-tool]');
    for (var t = 0; t < tools.length; t++) {
      (function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-tool');
          if (k === 'undo') { doUndo(); return; }
          if (k === 'clear') { pushUndo(); var ctx = drawCtx(); ctx.clearRect(0, 0, W, H); return; }
          tool = k;
          for (var j = 0; j < tools.length; j++) tools[j].setAttribute('aria-pressed', tools[j] === b ? 'true' : 'false');
        });
      })(tools[t]);
    }
    var tpl = $('poppet-template-btn');
    if (tpl) tpl.addEventListener('click', function () {
      tplOn = !tplOn;
      tpl.setAttribute('aria-pressed', tplOn ? 'true' : 'false');
      paintTemplate();
    });
    var c = drawCv();
    if (c) {
      c.addEventListener('pointerdown', function (e) {
        if (!layerUnlocked(open)) return;
        var stack = $('poppet-stack');
        if (stack) stack.classList.remove('poppet-arrive');
        pushUndo(); drawing = true; last = pos(e); try { c.setPointerCapture(e.pointerId); } catch (err) {}
      });
      c.addEventListener('pointermove', function (e) { if (!drawing) return; var p = pos(e); stroke(last, p); last = p; });
      c.addEventListener('pointerup', function (e) { drawing = false; try { c.releasePointerCapture(e.pointerId); } catch (err) {} });
      c.addEventListener('pointercancel', function () { drawing = false; });
    }
    var keep = $('poppet-keep');
    if (keep) keep.addEventListener('click', layPiece);
    var sv = $('poppet-save-desktop');
    if (sv) sv.addEventListener('click', saveToDesktop);
    var sealBtn = $('poppet-seal');
    if (sealBtn) sealBtn.addEventListener('click', sealPoppet);
    var dc = $('poppet-discard');
    if (dc) dc.addEventListener('click', discardAll);
    var drawerToggle = $('poppet-drawer-toggle');
    if (drawerToggle) drawerToggle.addEventListener('click', function () {
      var rail = document.querySelector('.poppet-rail');
      var openDrawer = rail && !rail.classList.contains('is-open');
      if (rail) rail.classList.toggle('is-open', openDrawer);
      drawerToggle.setAttribute('aria-expanded', openDrawer ? 'true' : 'false');
    });
    var dream = $('poppet-dream');
    if (dream) dream.addEventListener('click', function () {
      var on = dream.getAttribute('aria-pressed') !== 'true';
      dream.setAttribute('aria-pressed', on ? 'true' : 'false');
      var comp = $('poppet-comp');
      if (comp) comp.classList.toggle('dream', on);
      var fh3 = window.LiberForgeHooks;
      if (fh3 && fh3.setDream) fh3.setDream(on);
    });
    // the incinerator: first click arms it, second click scraps the piece
    var inc = $('poppet-incinerator');
    if (inc) {
      inc.addEventListener('click', function () {
        if (inc.disabled) return;
        if (inc.dataset.armed !== '1') {
          inc.dataset.armed = '1';
          inc.textContent = 'strike the flame?';
          inc.classList.add('is-armed');
          return;
        }
        inc.dataset.armed = '';
        inc.textContent = 'incinerate';
        inc.classList.remove('is-armed');
        discardAll();
        var fh4 = window.LiberForgeHooks;
        if (fh4 && fh4.incinerateBeat) fh4.incinerateBeat();
      });
      document.addEventListener('click', function (e) {
        if (inc.dataset.armed === '1' && !inc.contains(e.target)) {
          inc.dataset.armed = '';
          inc.textContent = 'incinerate';
          inc.classList.remove('is-armed');
        }
      });
    }
    document.addEventListener('keydown', function (e) {
      if (!document.body.classList.contains('poppet-room')) return;
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      var key = e.key.toLowerCase();
      var index = {'1':'outline','2':'clothes','3':'traits','4':'others'}[key];
      if (index && layerUnlocked(index)) { e.preventDefault(); switchLayer(index); return; }
      if (key === 'z') { e.preventDefault(); doUndo(); return; }
      if (key === 'e') { e.preventDefault(); var er = document.querySelector('.poppet-tool[data-tool="eraser"]'); if (er) er.click(); return; }
      if (key === 'p') { e.preventDefault(); var pn = document.querySelector('.poppet-tool[data-tool="pen"]'); if (pn) pn.click(); return; }
      if (e.key === ' ' && document.activeElement === drawCv()) { e.preventDefault(); layPiece(); }
    });
  }


  // ── tutorial embed (src/cutscene.js) ─────────────────────────────────
  // The cutscene asks for the REAL worktable, mounted over the chat cast.
  // init() stays page-only; mountTutor() is the embed door. The builder
  // emits the forge markup so the rework sheet dresses it identically.
  var tutorMounted = false;
  var tutorOptions = null;

  function buildTutorApp() {
    var host = document.createElement('div');
    host.className = 'poppet-app forge-stage';
    host.id = 'poppet-app';
    host.dataset.version = 'forge-v1';
    host.innerHTML = [
      '<div class="poppet-worktable" id="poppet-worktable">',
      '  <div class="forge-tableview">',
      '    <div class="forge-lid" aria-hidden="true"></div>',
      '    <div class="forge-rackband">',
      '      <div class="poppet-plates forge-plates-dom" id="poppet-doors" role="group" aria-label="the plate sequence">',
      '        <button class="poppet-plate poppet-door" type="button" data-layer="outline"><span class="plate-num">I</span><b>outline</b><span class="plate-state poppet-door-state" data-door-state="outline">—</span></button>',
      '        <button class="poppet-plate poppet-door" type="button" data-layer="clothes"><span class="plate-num">II</span><b>clothes</b><span class="plate-state poppet-door-state" data-door-state="clothes">—</span></button>',
      '        <button class="poppet-plate poppet-door" type="button" data-layer="traits"><span class="plate-num">III</span><b>traits</b><span class="plate-state poppet-door-state" data-door-state="traits">—</span></button>',
      '        <button class="poppet-plate poppet-door is-others-plate" type="button" data-layer="others"><span class="plate-num">IV</span><b>others</b><span class="plate-state poppet-door-state" data-door-state="others">—</span></button>',
      '      </div>',
      '      <div class="forge-doctrine"><span class="poppet-arch" id="poppet-ed-arch"></span><small id="poppet-ed-sub"></small></div>',
      '      <div class="forge-rack3d" id="forge-rack3d" aria-hidden="true"></div>',
      '    </div>',
      '    <section class="forge-platen" aria-label="the platen">',
      '      <div class="poppet-sheet">',
      '        <span class="forge-grip" aria-hidden="true">grip here →</span>',
      '        <div class="poppet-clamp" aria-hidden="true"><i></i><i></i></div>',
      '        <div class="poppet-stack" id="poppet-stack">',
      '          <div class="poppet-surface" aria-hidden="true" style="position:absolute;inset:0;"></div>',
      '          <canvas class="poppet-guide" id="poppet-g1" width="1080" height="1224"></canvas>',
      '          <canvas class="poppet-guide" id="poppet-g2" width="1080" height="1224"></canvas>',
      '          <canvas class="poppet-guide" id="poppet-g3" width="1080" height="1224"></canvas>',
      '          <canvas class="poppet-template" id="poppet-tpl" width="1080" height="1224"></canvas>',
      '          <canvas class="poppet-draw" id="poppet-draw" width="1080" height="1224" aria-label="the plate — draw here" tabindex="0"></canvas>',
      '        </div>',
      '        <span class="forge-presstag" aria-hidden="true">PRESS · III — CLAMP FEED SETTLE</span>',
      '      </div>',
      '    </section>',
      '  </div>',
      '  <section class="forge-vessel" aria-label="vessel four — pip inspection feed">',
      '    <span class="vessel-lens">PIP · VESSEL 04 · LOCKED LENS</span>',
      '    <div class="vessel-jar">',
      '      <div class="poppet-comp" id="poppet-comp">',
      '        <canvas id="poppet-c-outline" width="1080" height="1224"></canvas>',
      '        <canvas id="poppet-c-clothes" width="1080" height="1224"></canvas>',
      '        <canvas id="poppet-c-traits" width="1080" height="1224"></canvas>',
      '        <div class="poppet-ghost"><canvas id="poppet-c-others" width="1080" height="1224"></canvas></div>',
      '      </div>',
      '      <div id="vessel-jar3d" aria-hidden="true"></div>',
      '      <div class="vessel-jar-css" aria-hidden="true"><div class="vessel-foot"></div></div>',
      '    </div>',
      '    <div class="vessel-plinth" aria-hidden="true"></div>',
      '    <div class="vessel-controls">',
      '      <button class="vessel-dream" type="button" id="poppet-dream" aria-pressed="false">as dreams see it</button>',
      '      <button class="vessel-incinerator" type="button" id="poppet-incinerator" aria-describedby="poppet-progress">incinerate</button>',
      '    </div>',
      '    <section class="forge-plates" aria-label="the well — instruments and inks">',
      '      <div class="forge-well">',
      '        <span class="forge-well-label">THE WELL</span>',
      '        <div class="forge-ehead"><b id="poppet-ed-title">outline</b></div>',
      '        <div class="poppet-tools" role="group" aria-label="instruments">',
      '          <div class="forge-toolrow"><button class="poppet-tool" type="button" data-tool="pen" aria-pressed="true" aria-label="the needle — draw"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 20l1.2-4.4L16.6 4.2l3.2 3.2L8.4 18.8 4 20z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14.6 6.2l3.2 3.2" stroke="currentColor" stroke-width="1.4"/></svg></button></div>',
      '          <div class="forge-toolrow"><button class="poppet-tool" type="button" data-tool="eraser" aria-pressed="false" aria-label="unpick — eraser"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 15l6-6 7 7-3 3H8l-3-4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 19h11" stroke="currentColor" stroke-width="1.4"/></svg></button></div>',
      '          <div class="forge-toolrow"><button class="poppet-tool" type="button" data-tool="undo" aria-label="unpick the last stitch — undo"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 6L4 10l4 4M4 10h9a5 5 0 0 1 0 10h-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></div>',
      '          <div class="forge-toolrow"><button class="poppet-tool" type="button" data-tool="clear" aria-label="unravel this piece — clear the layer"><svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="1.5"/></svg></button></div>',
      '          <div class="forge-toolrow"><button class="poppet-tool" type="button" id="poppet-template-btn" aria-pressed="true" aria-label="the pattern — template on/off"><svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button></div>',
      '        </div>',
      '        <div class="poppet-palette" id="poppet-palette" role="group" aria-label="inks"></div>',
      '        <div class="forge-spots" id="poppet-spots" role="group" aria-label="face spots" hidden></div>',
      '        <button class="poppet-keep" type="button" id="poppet-keep">lay place</button>',
      '        <p class="forge-hint" id="poppet-hint">draw the layer, then lay the piece.</p>',
      '      </div>',
      '    </section>',
      '  </section>',
      '  <div class="forge-statusband">',
      '    <div class="forge-status">',
      '      <span class="forge-count" id="forge-count">0 / 04</span>',
      '      <span class="forge-pips" id="forge-pips" aria-hidden="true"></span>',
      '      <span class="forge-next" id="forge-next">the outline waits on the platen</span>',
      '      <span id="poppet-progress" class="forge-count" role="status" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);"></span>',
      '    </div>',
      '  </div>',
      '  <div class="forge-actionsband">',
      '    <div class="forge-actions">',
      '      <button class="poppet-save-desktop" type="button" id="poppet-save-desktop" aria-describedby="poppet-progress" disabled>keep on desktop</button>',
      '      <button class="poppet-seal" type="button" id="poppet-seal" hidden>seal</button>',
      '      <button class="poppet-discard" type="button" id="poppet-discard" disabled>unravel</button>',
      '      <button class="poppet-drawer-toggle" type="button" id="poppet-drawer-toggle" aria-expanded="false" aria-label="open the table drawer">⌄</button>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="poppet-rail">',
      '  <div class="poppet-minimenu">',
      '    <div class="poppet-label">tags on this piece</div>',
      '    <div class="poppet-chips" id="poppet-chips"></div>',
      '    <div class="poppet-label">bind to…</div>',
      '    <div class="poppet-binds" id="poppet-binds">',
      '      <button type="button" data-bind="outline">outline &amp; shape</button>',
      '      <button type="button" data-bind="clothes">clothes</button>',
      '      <button type="button" data-bind="traits">nonconforming traits</button>',
      '      <button type="button" data-bind="others">others&rsquo; view</button>',
      '    </div>',
      '    <div class="poppet-label">the home-screen mark</div>',
      '    <div class="poppet-icon-live">',
      '      <svg viewBox="0 0 80 80" width="64" height="64" aria-label="home screen icon" id="poppet-icon">',
      '        <circle cx="40" cy="40" r="37" fill="#0b0710"/>',
      '        <path id="poppet-q-outline" d="M40 3 A37 37 0 0 0 3 40 L40 40 Z" fill="transparent"/>',
      '        <path id="poppet-q-clothes" d="M40 3 A37 37 0 0 1 77 40 L40 40 Z" fill="transparent"/>',
      '        <path id="poppet-q-traits" d="M3 40 L40 40 L40 77 A37 37 0 0 1 3 40 Z" fill="transparent"/>',
      '        <path id="poppet-q-others" d="M77 40 L40 40 L40 77 A37 37 0 0 0 77 40 Z" fill="transparent"/>',
      '        <path d="M40 3 V77 M3 40 H77" stroke="#dfe4ec" stroke-width="5"/>',
      '        <circle cx="40" cy="40" r="37" fill="none" stroke="#dfe4ec" stroke-width="3"/>',
      '      </svg>',
      '    </div>',
      '  </div>',
      '</div>',
      '<span id="poppet-title" hidden></span>'
    ].join('\n');
    return host;
  }

  function mountTutor(options) {
    if (tutorMounted) return null;
    tutorOptions = options || {};
    var existing = $('poppet-app');
    if (existing && existing.dataset.version !== 'forge-v1') existing.remove();
    if (!$('poppet-app') && !$('poppet-worktable')) document.body.appendChild(buildTutorApp());
    tutorMounted = true;
    trimRoomCopy();
    wireWorktable();
    buildMinimenu();
    // Demonstrations begin from a clean in-memory draft. The room's saved
    // Poppet is never hydrated into the tutor and cannot be damaged by a
    // canceled lesson. Persistence happens only through the explicit save
    // method returned below.
    if (!tutorOptions.isolated) loadKept();
    switchLayer('outline', true);
    var t = $('poppet-title');
    if (t) t.textContent = 'poppet · ' + aliasOf();
    var subtitle = $('poppet-subtitle');
    if (subtitle) { subtitle.textContent = ''; subtitle.hidden = true; }
    return {
      bench: $('poppet-app') || $('poppet-worktable'),
      door: function (key) {
        switchLayer(key);
        if (tutorOptions && typeof tutorOptions.onLayerReady === 'function') {
          try { tutorOptions.onLayerReady(key); } catch (e) {}
        }
      },
      swatch: function (i) {
        var tray = $('poppet-palette');
        if (!tray) return;
        var all = tray.querySelectorAll('.forge-inkpen');
        if (all[i]) all[i].click();
      },
      ink: function () { return ink; },
      strokePath: function (pts) {
        drawing = true;
        pushUndo();
        var prev = pts[0], p;
        for (var i = 1; i < pts.length; i++) { p = pts[i]; stroke(prev, p); prev = p; }
        drawing = false;
      },
      keep: layPiece,
      save: function () {
        saveToDesktop();
        if (tutorOptions && typeof tutorOptions.onSaved === 'function') {
          try { tutorOptions.onSaved({ layers: bitmap, primary: primary }); } catch (e) {}
        }
      },
      savedAll: function () { return ORDER.every(function (k) { return saved[k]; }); },
      exit: function () {
        if (tutorOptions && typeof tutorOptions.onExit === 'function') {
          try { tutorOptions.onExit(); } catch (e) {}
        }
        tutorMounted = false;
        tutorOptions = null;
      }
    };
  }

  window.LiberPoppet = { mountTutor: mountTutor };

  function init() {
    if (!$('poppet-worktable') || tutorMounted) return;
    trimRoomCopy();
    if (window.Cursor && window.Cursor.hide) window.Cursor.hide();
    wireWorktable();
    buildMinimenu();
    loadKept();
    switchLayer(restoredOpen, true);
    // editor-head ids live in the well header row of the study markup
    var t = $('poppet-title');
    if (t) t.textContent = 'poppet · ' + aliasOf();
    var subtitle = $('poppet-subtitle');
    if (subtitle) { subtitle.textContent = ''; subtitle.hidden = true; }
    // the 3D rack raycasts picks back through the DOM legend — the legend
    // remains the authoritative control; forge-3d.js asks for state on boot
    window.LiberForgeHooks = window.LiberForgeHooks || {};
    window.LiberForgeHooks.onPickPlate = function (key) {
      var d = document.querySelector('.poppet-door[data-layer="' + key + '"]');
      if (d && !d.disabled) d.click();
    };
    window.LiberForgeHooks.requestState = function () { refreshDoors(); };
    lastKept = -1;
    stepStatus();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
