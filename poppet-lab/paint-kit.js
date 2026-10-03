/* paint-kit.js — the shared first-making vocabulary: inks, brush sizes,
   a fresh set of bare-clay proportions per call, and the four-sheet
   worksurface set over a doll's own canvases (face / hair / body atlas /
   clothes hull). Used by the tutorial rite and the alt workshop so a stroke
   means the same thing in both. The lab keeps its own literals: its P is
   re-randomized per specimen (freshP), which a shared-live import would corrupt. */
import { makeWorksurface } from './surface.js?v=lab53';

export const INKS = ['#2b2016', '#b03a2a', '#c9962e', '#7fb069'];
export const SIZES = [6, 10, 18];

export function defaultProportions() {
  return {
    head: 0.42, chest: 1, waist: 0.55, hips: 1,
    arml: 1, armt: 1, legl: 1, legt: 1, flop: 0.45,
    pose: 'stand', showRig: false,
    worn: { robe: false, dress: false, top: false, hoodie: false, pants: false, bralet: false },
    thoughts: { fears: [], wishes: [], likes: [], dislikes: [], thoughts: [] }
  };
}

export function inkName(hex) {
  return { '#2b2016': 'ink', '#b03a2a': 'blood', '#c9962e': 'gold', '#7fb069': 'moss' }[hex] || 'ink';
}

function canvasPanelsFromUvRects(rects) {
  return Object.fromEntries(Object.entries(rects).map(([name, rect]) => [
    name,
    [rect[0], 1 - rect[1] - rect[3], rect[2], rect[3]]
  ]));
}

function canvasPanelFromMeshUv(mesh) {
  const uv = mesh && mesh.geometry && mesh.geometry.attributes.uv;
  if (!uv || !uv.count) throw new Error('poppet paint surface has no UV geometry');
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    minU = Math.min(minU, uv.getX(i));
    maxU = Math.max(maxU, uv.getX(i));
    minV = Math.min(minV, uv.getY(i));
    maxV = Math.max(maxV, uv.getY(i));
  }
  return [minU, 1 - maxV, maxU - minU, maxV - minV];
}

/* One worksurface per doll canvas. ws.el is set (the display canvas for
   pointer mapping) — without it pos() collapses to 0,0 and every stroke
   lands in a corner. */
export function buildSheetSet(doll, atlasCv) {
  function one(surf) {
    let made;
    if (surf === 'face' || surf === 'eyes') {
      const fm = surf === 'eyes' ? doll.faceMaps.eyes : doll.faceMaps.face;
      const mesh = doll.M()['face_' + surf];
      made = makeWorksurface({
        cv: fm.cv, tex: fm.tex, key: surf,
        panels: { [surf]: canvasPanelFromMeshUv(mesh) }
      });
    } else if (surf === 'hair') {
      const hm = doll.faceMaps.hair;
      const mesh = doll.M().face_hair;
      made = makeWorksurface({
        cv: hm.cv, tex: hm.tex, key: 'hair',
        panels: { hair: canvasPanelFromMeshUv(mesh) }
      });
    } else if (surf === 'clothes') {
      made = makeWorksurface({
        cv: doll.hullCanvas, tex: doll.hullTex, key: 'clothes',
        panels: canvasPanelsFromUvRects(doll.hullRects)
      });
    } else {
      made = makeWorksurface({
        cv: atlasCv, tex: doll.bodyTex, key: 'body',
        panels: canvasPanelsFromUvRects(doll.ATLAS)
      });
    }
    made.ws.el = made.ws.cv;
    return made;
  }
  return { eyes: one('eyes'), face: one('face'), hair: one('hair'), body: one('body'), clothes: one('clothes') };
}
