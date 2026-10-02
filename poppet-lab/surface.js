/* surface.js — the shared worksurface. ONE canvas-backed sheet that the expand
   overlay paints through and DOLL DRAW mode paints through, so a stroke lands
   in exactly the same pixels either way:
     body      → the skin atlas (1024², one panel per body part)
     face      → the face shell canvas (256²: eyes / face / hair panels)
     clothes   → the hull canvas (512×256, one vertical strip per limb tube)
     thoughts  → one sheet per thought kind (fears · wishes · likes · dislikes · thoughts)
   Key format: 'body' | 'face:eyes' | 'face:face' | 'face:hair' |
               'clothes' | 'thoughts:fears' | … | 'cloth' | 'aura3' | 'aura4' */
import { daub, spacedStamps, floodFillAt, floodFillRegionAt } from './painter.js?v=lab53';

export function makeWorksurface(opts) {
  const o = opts || {};
  const cv = o.cv;
  const ws = {
    key: o.key || 'body',
    cv: cv,
    ctx: cv.getContext('2d', { willReadFrequently: true }),
    tex: o.tex,
    el: o.el || null,           // the DISPLAY canvas the sheet is shown on (for pos())
    transparent: !!o.checker || !!o.transparent,   // opaque sheets erase back to bg, not to alpha
    panels: o.panels || null,   // { name: [u, v, w, h] } in canvas-y coords
    outline: null,              // the hot panel (the lesson's current part)
    bg: o.bg || '#ead9b4',
    checker: !!o.checker,       // transparent sheets draw over a loom checker
    undo: [],
    onchange: o.onchange || null
  };
  function curPanelRect() {
    if (!ws.panels) return null;
    if (ws.key.indexOf('face:') === 0) return ws.panels[ws.key.slice(5)] || null;
    return ws.panels[ws.key] || null;
  }
  function pushUndo() {
    ws.undo.push(ws.ctx.getImageData(0, 0, cv.width, cv.height));
    if (ws.undo.length > 5) ws.undo.shift();
  }
  const api = {
    ws: ws,
    get key() { return ws.key; },
    get ctx() { return ws.ctx; },
    get cv() { return cv; },
    get tex() { return ws.tex; },
    setKey(k) { ws.key = k; ws.outline = ws.panels && ws.panels[k] ? k : null; },
    setPanels(p) { ws.panels = p; },
    setOutline(k) { ws.outline = k; },
    pushUndo: pushUndo,
    undo() {
      const u = ws.undo.pop();
      if (!u) return false;
      ws.ctx.putImageData(u, 0, 0);
      if (ws.tex) ws.tex.needsUpdate = true;
      return true;
    },
    /* pointer event → canvas pixels (accounting for the letterbox fit) */
    pos(e) {
      if (!ws.el) return { x: 0, y: 0 };   // doll-side slates aren't displayed
      const r = ws.el.getBoundingClientRect();
      const fit = Math.min(r.width / cv.width, r.height / cv.height);
      const dw = cv.width * fit, dh = cv.height * fit;
      const ox = (r.width - dw) / 2, oy = (r.height - dh) / 2;
      return {
        x: ((e.clientX - r.left) - ox) / fit,
        y: ((e.clientY - r.top) - oy) / fit
      };
    },
    panelAt(x, y) {
      if (!ws.panels) return null;
      if (ws.key.indexOf('face:') === 0) {
        const want = ws.key.slice(5);
        const r = ws.panels[want];
        if (r && x >= r[0] * cv.width && x <= (r[0] + r[2]) * cv.width && y >= r[1] * cv.height && y <= (r[1] + r[3]) * cv.height) return want;
        return null;
      }
      const u = x / cv.width, v = y / cv.height;
      const keys = Object.keys(ws.panels);
      for (let i = 0; i < keys.length; i++) {
        const r = ws.panels[keys[i]];
        if (u >= r[0] && u <= r[0] + r[2] && v >= r[1] && v <= r[1] + r[3]) return keys[i];
      }
      return null;
    },
    /* panel rect → CSS % over the letterboxed canvas, canvas-y (for HTML overlays) */
    d2c(key) {
      let r = null;
      if (ws.panels && ws.panels[key]) r = ws.panels[key];
      else if (key === 'cloth') r = [0, 0, 1, 1];
      else if (key === 'aura3' || key === 'aura4') r = [0, 0, 1, 1];
      if (!r) return null;
      return {
        left: r[0] * 100 + '%',
        top: r[1] * 100 + '%',   // canvas-y — the same space the panels were authored in
        width: r[2] * 100 + '%',
        height: r[3] * 100 + '%'
      };
    },
    stamp(x, y, r, hex) {
      daub(ws.ctx, x, y, r, hex);
      if (ws.tex) ws.tex.needsUpdate = true;
    },
    stampLine(x0, y0, x1, y1, r, hex, erase) {
      const ctx = ws.ctx;
      if (erase) {
        ctx.save();
        if (ws.transparent) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = '#000';
        } else {
          ctx.fillStyle = ws.bg;   // opaque sheet: erase to paper
        }
        spacedStamps(x0, y0, x1, y1, Math.max(1, r / 2)).forEach(function (s) {
          ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
      } else {
        spacedStamps(x0, y0, x1, y1, Math.max(1, r / 3)).forEach(function (s) {
          daub(ws.ctx, s.x, s.y, r, hex);
        });
      }
      if (ws.tex) ws.tex.needsUpdate = true;
    },
    eraseDot(x, y, r) {
      const ctx = ws.ctx;
      ctx.save();
      if (ws.transparent) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
      } else {
        ctx.fillStyle = ws.bg;   // opaque sheet: erasing restores the paper, never black
      }
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (ws.tex) ws.tex.needsUpdate = true;
    },
    /* the bucket — flood one panel, or the whole sheet when there are no panels */
    fillAt(x, y, hex, tol) {
      const reg = api.panelAt(x, y);
      const rect = reg ? ws.panels[reg] : [0, 0, 1, 1];
      floodFillRegionAt(ws.ctx, x, y, hex, rect, tol === undefined ? 40 : tol);
      if (ws.tex) ws.tex.needsUpdate = true;
      if (api.onFill) api.onFill(reg, hex);
      return reg;
    },
    fillPanel(key, hex) {
      const r = ws.panels && ws.panels[key];
      if (r) floodFillRegionAt(ws.ctx, (r[0] + r[2] / 2) * cv.width, (r[1] + r[3] / 2) * cv.height, hex, r, 80);
      else floodFillAt(ws.ctx, cv.width / 2, cv.height / 2, hex, 80);
      if (ws.tex) ws.tex.needsUpdate = true;
      if (api.onFill) api.onFill(key, hex);
    },
    fillAll(hex, weave) {
      if (weave && api.weave) api.weave(hex);
      else { ws.ctx.fillStyle = hex; ws.ctx.fillRect(0, 0, cv.width, cv.height); }
      if (ws.tex) ws.tex.needsUpdate = true;
      if (api.onFill) api.onFill(null, hex);
    },
    /* the loom weave wash — optional, set by the owner for cloth-like sheets */
    weave: null,
    /* redraw the overlay canvas: content + panel outlines + labels + hot panel */
    redraw(g, W, H) {
      g.clearRect(0, 0, W, H);
      const fit = Math.min(W / cv.width, H / cv.height);
      const dw = cv.width * fit, dh = cv.height * fit;
      const ox = (W - dw) / 2, oy = (H - dh) / 2;
      if (ws.checker) {
        g.save();
        g.beginPath(); g.rect(ox, oy, dw, dh); g.clip();
        g.fillStyle = '#cfc2a0'; g.fillRect(ox, oy, dw, dh);
        g.fillStyle = '#d8cba8';
        const cs = Math.max(6, 12 * fit * cv.width / 256);   // loom blocks, canvas-scaled
        for (let y = 0; y < dw; y += cs * 2) {
          for (let x = 0; x < dw; x += cs * 2) {
            g.fillRect(ox + x + cs, oy + y, cs, cs);
            g.fillRect(ox + x, oy + y + cs, cs, cs);
          }
        }
        g.restore();
      } else {
        g.fillStyle = '#efe6cd';
        g.fillRect(ox, oy, dw, dh);
      }
      g.drawImage(cv, ox, oy, dw, dh);
      if (ws.panels) {
        g.strokeStyle = 'rgba(90, 66, 34, 0.5)';
        g.lineWidth = 2;
        g.font = '600 ' + Math.max(13, Math.min(26, 1024 / 46)) + 'px "House Font", Germania, Georgia, serif';
        g.fillStyle = 'rgba(90, 66, 34, 0.62)';
        const keys = Object.keys(ws.panels);
        const labelAll = keys.length <= 24;
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i], r = ws.panels[k];
          const x = ox + r[0] * cv.width * fit, y = oy + r[1] * cv.height * fit;
          const w = r[2] * cv.width * fit, h = r[3] * cv.height * fit;
          g.strokeRect(x, y, w, h);
          if (labelAll && w > 40 && h > 22) g.fillText(k.replace(/b$/, ''), x + 6, y + Math.min(24, h * 0.4));
        }
      }
      const hot = !ws.outline ? null : (ws.outline === 'clothes' ? [0, 0, 1, 1] : (ws.panels && ws.panels[ws.outline] || null));
      if (hot) {
        g.strokeStyle = '#a8862e';
        g.lineWidth = 8;
        g.strokeRect(ox + hot[0] * cv.width * fit - 3, oy + hot[1] * cv.height * fit - 3, hot[2] * cv.width * fit + 6, hot[3] * cv.height * fit + 6);
      }
    },
    fitBox(W, H) {
      const fit = Math.min(W / cv.width, H / cv.height);
      const dw = cv.width * fit, dh = cv.height * fit;
      return { ox: (W - dw) / 2, oy: (H - dh) / 2, fit: fit, dw: dw, dh: dh };
    },
    clearUndo() { ws.undo = []; }
  };
  return api;
}
