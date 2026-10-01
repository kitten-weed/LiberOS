/* Keepsakes — the lab's memory. Each save stores the painted atlas pixels,
   the pattern cloth, the specimen's full proportions, what it wore, the ink,
   the brush size and the moment of its making. Home reads the same store and
   lets the saved specimens orbit the living poppet. */

const KEYP = 'poppet.keepsakes.v1';

export function loadKeepsakes() {
  try {
    const raw = localStorage.getItem(KEYP);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (err) { return []; }
}
function store(list) {
  try { localStorage.setItem(KEYP, JSON.stringify(list)); } catch (err) { /* full or blocked */ }
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
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1024;
  const g = cv.getContext('2d');
  return new Promise(function (res) {
    const im = new Image();
    im.onload = function () { g.drawImage(im, 0, 0, cv.width, cv.height); res(cv); };
    im.onerror = function () { res(cv); };
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

/* save the current specimen — returns the keepsake count afterwards.
   Everything useful about the moment travels with it. */
export function saveKeepsake(atlasCv, clothCv, spec) {
  try { localStorage.setItem('poppet.keepsake.fresh', String(Date.now())); } catch (err) { /* non-fatal */ }
  const list = loadKeepsakes();
  list.push({
    n: list.reduce(function (m, k) { return Math.max(m, k.n || 0); }, 0) + 1,   // stays unique past the 8-cap
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
    thoughts: spec.thoughts || null,      // the five thought sheets, one dataURL each
    atlas: cvToData(atlasCv, 512),
    cloth: clothCv ? cvToData(clothCv, 512) : null
  });
  if (list.length > 8) list.shift();   // the shelf holds eight
  store(list);
  return list.length;
}

/* Mirror a keepsake into the ship's buddy array, so every surface that
   reads the buddy (journal, constellation, home rug) sees the same poppet.
   Goes through window.Liber.state when available (correct slot); falls back
   to the legacy direct write. Single source of truth for both the lab
   (keepdrop) and the tutorial rite. */
export function mirrorKeepsakeToBuddy(n, name, idPrefix) {
  if (!n) return false;
  try {
    const w = (typeof window !== 'undefined') ? window : {};
    const st = w.Liber && w.Liber.state;
    if (st && typeof st.get === 'function' && typeof st.set === 'function') {
      const g = st.get() || {};
      const arr = Array.isArray(g.buddy) ? g.buddy.slice() : [];
      if (!arr.some(function (e) { return e && e.kind === 'poppet' && e.keepsakeN === n; })) {
        arr.push({ id: (idPrefix || 'poppet-keep') + '-' + n, kind: 'poppet', name: name || ('Poppet Nº ' + n), keepsakeN: n, ts: Date.now() });
        st.set({ buddy: arr });
      }
      return true;
    }
  } catch (err) { /* fall through to legacy */ }
  try {
    const raw = localStorage.getItem('liber_vacui_v1__keep');
    const st = raw ? JSON.parse(raw) : {};
    const arr = Array.isArray(st.buddy) ? st.buddy : [];
    if (!arr.some(function (e) { return e && e.kind === 'poppet' && e.keepsakeN === n; })) {
      arr.push({ id: (idPrefix || 'poppet-keep') + '-' + n, kind: 'poppet', name: name || ('Poppet Nº ' + n), keepsakeN: n, ts: Date.now() });
      st.buddy = arr;
      localStorage.setItem('liber_vacui_v1__keep', JSON.stringify(st));
    }
    return true;
  } catch (err) { return false; }
}

export const KEYP_KEY = KEYP;

/* home side: count + async materialize. The fresh flag covers the walk-across
   race: lab just wrote, home reads before the tab's storage flushed its events. */
export function keepsakeCount() { return loadKeepsakes().length; }
export function materializeKeepsake(k) {
  return imgToCanvas(k.atlas).then(function (atlasCv) {
    const clothCvP = k.cloth ? imgToCanvas(k.cloth) : Promise.resolve(null);
    return clothCvP.then(function (clothCv) {
      return { atlasCv: atlasCv, clothCv: clothCv };
    });
  });
}
