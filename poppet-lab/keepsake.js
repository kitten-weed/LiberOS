/* Keepsakes — the lab's memory. Each save stores the painted atlas pixels,
   the pattern cloth, the specimen's full proportions, what it wore, the ink,
   the brush size and the moment of its making. Home reads the same store and
   lets the saved specimens orbit the living poppet. */

const KEYP = 'poppet.keepsakes.v1';
const RITE_DRAWING_IDS = [
  'personal-unconscious-1', 'personal-unconscious-2',
  'shadow-surrender-1', 'shadow-surrender-2'
];

export function loadKeepsakes() {
  try {
    const raw = localStorage.getItem(KEYP);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (err) { return []; }
}

function validateKeepsake(record) {
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const image = value => typeof value === 'string' && /^data:image\//.test(value);
  if (!object(record) || !Number.isInteger(record.n) || record.n < 1 ||
      !image(record.atlas)) throw new Error('keepsake record is malformed');
  for (const key of ['P', 'worn', 'face', 'thoughts'])
    if (record[key] != null && !object(record[key]))
      throw new Error('keepsake ' + key + ' is malformed');
  for (const key of ['name', 'pose', 'ink'])
    if (record[key] != null && typeof record[key] !== 'string')
      throw new Error('keepsake ' + key + ' is malformed');
  if (record.brush != null && (!Number.isInteger(record.brush) || record.brush < 2 || record.brush > 48))
    throw new Error('keepsake brush is malformed');
  for (const key of ['cloth', 'hull', 'aura3', 'aura4'])
    if (record[key] != null && !image(record[key]))
      throw new Error('keepsake ' + key + ' is malformed');
  for (const [field, keys] of [
    ['face', ['eyes', 'face', 'hair']],
    ['thoughts', ['fears', 'wishes', 'likes', 'dislikes', 'thoughts']]
  ]) {
    for (const key of keys) {
      if (record[field]?.[key] != null && !image(record[field][key]))
        throw new Error('keepsake ' + field + ' sheet is malformed');
    }
    if (record.riteDrawings != null) {
      const drawings = record.riteDrawings;
      if (!object(drawings) || drawings.version !== 1 || !Array.isArray(drawings.squares) ||
          drawings.squares.length !== RITE_DRAWING_IDS.length) {
        throw new Error('keepsake rite drawings are malformed');
      }
      drawings.squares.forEach(function (square, index) {
        if (!object(square) || square.id !== RITE_DRAWING_IDS[index] || !image(square.source)) {
          throw new Error('keepsake rite drawing is malformed');
        }
      });
    }
    if (record.firstRite != null) {
      if (!object(record.firstRite) || record.firstRite.version !== 1 ||
          typeof record.firstRite.resultId !== 'string' ||
          typeof record.firstRite.templateId !== 'string' ||
          typeof record.firstRite.paletteId !== 'string' ||
          !Array.isArray(record.firstRite.inks) || record.firstRite.inks.length !== 6 ||
          new Set(record.firstRite.inks.map(ink => ink && ink.hex)).size !== 6 ||
          record.firstRite.inks.some(ink => !object(ink) || typeof ink.name !== 'string' || !/^#[0-9a-f]{6}$/i.test(ink.hex))) {
        throw new Error('keepsake first-rite record is malformed');
      }
    }
  }
}

export function readKeepsakes() {
  let raw;
  try {
    raw = localStorage.getItem(KEYP);
  } catch (cause) {
    throw new Error('keepsake shelf is unreadable', {cause});
  }
  if (raw === null) return [];

  let list;
  try {
    list = JSON.parse(raw);
  } catch (cause) {
    throw new Error('keepsake shelf is unreadable', {cause});
  }
  if (!Array.isArray(list)) throw new Error('keepsake shelf is malformed');
  const numbers = new Set();
  for (const record of list) {
    validateKeepsake(record);
    if (numbers.has(record.n)) throw new Error('keepsake identity is duplicated');
    numbers.add(record.n);
  }
  return list;
}

function cvToData(cv, max) {
  if (!max || cv.width <= max) return cv.toDataURL('image/png');
  const s = max / cv.width;
  const c2 = document.createElement('canvas');
  c2.width = max; c2.height = Math.round(cv.height * s);
  c2.getContext('2d').drawImage(cv, 0, 0, c2.width, c2.height);
  return c2.toDataURL('image/png');
}
function imgToCanvas(dataUrl) {
  if (typeof dataUrl !== 'string' || !/^data:image\//.test(dataUrl)) {
    return Promise.reject(new Error('saved paint is not an image'));
  }
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1024;
  const g = cv.getContext('2d');
  return new Promise(function (res, rej) {
    const im = new Image();
    im.onload = function () { g.drawImage(im, 0, 0, cv.width, cv.height); res(cv); };
    im.onerror = function () { rej(new Error('saved paint could not be decoded')); };
    im.src = dataUrl;
  });
}

/* how much of each atlas panel carries ink — a per-part painted coverage map,
   so a keepsake remembers WHAT was decorated, not just that it was */
export function atlasCoverage(ctx, ATLAS, creamHex) {
  const cr = creamHex || '#ead9b4';
  const cR = parseInt(cr.slice(1, 3), 16), cG = parseInt(cr.slice(3, 5), 16), cB = parseInt(cr.slice(5, 7), 16);
  const out = {};
  const keys = Object.keys(ATLAS);
  for (let ki = 0; ki < keys.length; ki++) {
    const r = ATLAS[keys[ki]];
    const x0 = Math.floor(r[0] * ctx.canvas.width), y0 = Math.floor(r[1] * ctx.canvas.height);
    const w = Math.max(1, Math.floor(r[2] * ctx.canvas.width)), h = Math.max(1, Math.floor(r[3] * ctx.canvas.height));
    const d = ctx.getImageData(x0, y0, Math.min(w, ctx.canvas.width - x0), Math.min(h, ctx.canvas.height - y0)).data;
    let inked = 0, total = 0;
    for (let i = 0; i < d.length; i += 16) {   // sample every 4th pixel
      total++;
      const isCream = Math.abs(d[i] - cR) < 26 && Math.abs(d[i + 1] - cG) < 26 && Math.abs(d[i + 2] - cB) < 26;
      if (d[i + 3] > 40 && !isCream) inked++;
    }
    out[keys[ki]] = total ? Math.round(inked / total * 100) / 100 : 0;
  }
  return out;
}

/* Snapshot a doll's paint-only sheets (face trio + hull) for the keepsake.
   Takes the doll object (faceMaps/hullCanvas); returns dataURLs or nulls.
   Keeps the rug's doll wearing the same paint the maker laid down. */
export function snapshotDollSheets(doll) {
  const out = { face: null, hull: null };
  if (doll && doll.faceMaps) {
    out.face = {};
    for (const z of ['eyes', 'face', 'hair']) {
      const m = doll.faceMaps[z];
      out.face[z] = m ? cvToData(m.cv, 256) : null;
    }
  }

  if (doll && doll.hullCanvas) out.hull = cvToData(doll.hullCanvas, 512);
  return out;
}

export function snapshotRiteDrawings(doll) {
  if (!doll || typeof doll.getRiteDrawings !== 'function') return null;
  const drawings = doll.getRiteDrawings();
  if (!drawings.length) return null;
  const ids = [
    'personal-unconscious-1', 'personal-unconscious-2',
    'shadow-surrender-1', 'shadow-surrender-2'
  ];
  if (drawings.length !== 4 || drawings.some((entry, index) =>
    !entry || entry.id !== ids[index] || !entry.canvas)) {
    throw new Error('first-rite drawings are incomplete');
  }
  return {
    version: 1,
    squares: drawings.map((entry, index) => ({
      id: ids[index],
      source: cvToData(entry.canvas, 128)
    }))
  };
}

/* Save one specimen snapshot; the caller coordinates its durable mirror. */
export function saveKeepsake(atlasCv, clothCv, spec) {
  const list = readKeepsakes();
  const record = {
    n: list.reduce(function (m, k) { return Math.max(m, k.n); }, 0) + 1,
    when: Date.now(),
    name: spec.name || ('Poppet Nº ' + (list.length + 1)),
    P: JSON.parse(JSON.stringify(spec.P)),
    pose: spec.pose || 'stand',
    worn: JSON.parse(JSON.stringify(spec.worn || {})),
    ink: spec.ink || '#2b2016',
    brush: spec.brush || 10,
    heightHeads: spec.heightHeads || null,
    lesson: spec.lesson || null,          // where in the guided sequence it was saved
    coverage: spec.coverage || null,      // per-part painted coverage (0..1)
    aura3: spec.aura3 || null,            // close-aura sheet snapshot (dataURL)
    aura4: spec.aura4 || null,            // far-aura sheet snapshot
    face: spec.face || null,              // face trio snapshots {eyes,face,hair}
    hull: spec.hull || null,              // clothes hull snapshot
    thoughts: spec.thoughts || null,      // the five thought sheets, one dataURL each
    riteDrawings: spec.riteDrawings || null,
    firstRite: spec.firstRite || null,
    atlas: cvToData(atlasCv, 512),
    cloth: clothCv ? cvToData(clothCv, 512) : null
  };
  validateKeepsake(record);
  const next = list.concat(record);
  if (next.length > 8) next.shift();
  localStorage.setItem(KEYP, JSON.stringify(next));
  return {record, count: next.length};
}

function reportMirrorFailure(state, error) {
  const detail = {
    op: 'mirrorKeepsakeToBuddy',
    err: String(error).slice(0, 120)
  };
  try {
    const target = state || (typeof window !== 'undefined' && window.Liber && window.Liber.state);
    if (target && typeof target.diagnose === 'function') {
      target.diagnose('keep-mirror-fail', detail);
      return;
    }
  } catch (diagnosticError) {
    console.error('keepsake mirror diagnostic failed', String(diagnosticError).slice(0, 120));
  }
  console.error('keepsake mirror failed', detail.err);
}

export function mirrorKeepsakeToBuddy(n, name, idPrefix, mirrorPatch = {}) {
  let canonicalState = null;
  try {
    const w = typeof window !== 'undefined' ? window : null;
    if (!w || !Number.isInteger(n) || n < 1) throw new Error('keepsake identity is invalid');
    const canonicalWindow = w.parent !== w ? w.parent : w;
    canonicalState = canonicalWindow.Liber && canonicalWindow.Liber.state;
    if (!canonicalState || typeof canonicalState.get !== 'function' ||
        typeof canonicalState.trySet !== 'function') {
      throw new Error('canonical state is unavailable');
    }
    if (!mirrorPatch || typeof mirrorPatch !== 'object' || Array.isArray(mirrorPatch)) {
      throw new Error('mirror patch is invalid');
    }
    const current = canonicalState.get() || {};
    if (!Array.isArray(current.buddy)) throw new Error('canonical buddy shelf is malformed');
    const nextBuddy = current.buddy.slice();
    if (!nextBuddy.some(entry => entry && entry.kind === 'poppet' && entry.keepsakeN === n)) {
      nextBuddy.push({
        id: (idPrefix || 'poppet-keep') + '-' + n,
        kind: 'poppet',
        name: name || ('Poppet Nº ' + n),
        keepsakeN: n,
        ts: Date.now()
      });
    } else if (Object.keys(mirrorPatch).length === 0) {
      return true;
    }
    const patch = Object.assign({}, mirrorPatch, {buddy: nextBuddy});
    if (!canonicalState.trySet(patch)) throw new Error('canonical state rejected the mirror');
    return true;
  } catch (error) {
    reportMirrorFailure(canonicalState, error);
    return false;
  }
}

export const KEYP_KEY = KEYP;

/* home side: count + async materialize. The fresh flag covers the walk-across
   race: lab just wrote, home reads before the tab's storage flushed its events. */
export function keepsakeCount() { return loadKeepsakes().length; }
export function materializeKeepsake(k) {
  if (!k || typeof k !== 'object') return Promise.reject(new TypeError('keepsake record is required'));
  return Promise.all([
    imgToCanvas(k.atlas),
    k.cloth ? imgToCanvas(k.cloth) : Promise.resolve(null)
  ]).then(function (canvases) {
    return {atlasCv: canvases[0], clothCv: canvases[1]};
  });
}
