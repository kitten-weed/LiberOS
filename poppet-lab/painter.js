/* Paint utilities: proper scanline flood fill, lazy-nezumi input smoothing,
   and the expanded painting overlay (bigger canvas, same tools, same inks).
   Shared by the lab desk view and the overlay painter. */

/* ── lazy-nezumi smoothing: the cursor is the intent, the brush lags behind ── */
export function makeLazyBrush(opts) {
  const o = opts || {};
  return {
    x: null, y: null,
    has: false,
    pos(x, y, dt) {
      const k = 1 - Math.exp(-dt / (o.laziness || 0.14));   // frame-rate independent ease
      if (!this.has) { this.x = x; this.y = y; this.has = true; return { x: this.x, y: this.y, jump: true }; }
      this.x += (x - this.x) * k;
      this.y += (y - this.y) * k;
      return { x: this.x, y: this.y, jump: false };
    },
    reset() { this.has = false; this.x = this.y = null; }
  };
}

/* stamp a soft-edged round daub */
export function daub(ctx, x, y, r, color, hardness) {
  const rr = Math.max(0.5, r);
  const cv = ctx.canvas;
  if (rr <= 2.5) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const S = Math.ceil(rr * 2) + 2;
  if (S > cv.width || S > cv.height) { ctx.fillStyle = color; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2); return; }
  const c2 = document.createElement('canvas');
  c2.width = c2.height = S;
  const g = c2.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, rr * (hardness !== undefined ? hardness : 0.55), S / 2, S / 2, rr);
  gr.addColorStop(0, color);
  gr.addColorStop(1, 'transparent');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(S / 2, S / 2, rr, 0, Math.PI * 2);
  g.fill();
  ctx.drawImage(c2, x - S / 2, y - S / 2);
}

/* even spacing between stamps along a segment */
export function spacedStamps(fromX, fromY, toX, toY, step) {
  const dx = toX - fromX, dy = toY - fromY;
  const d = Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(d / (step || 2)));
  const out = [];
  for (let i = 1; i <= n; i++) out.push({ x: fromX + dx * i / n, y: fromY + dy * i / n });
  return out;
}

/* ── a real flood fill: scanline seed fill with tolerance, on raw pixels ── */
export function floodFillAt(ctx, sx, sy, hex, tolerance) {
  const cv = ctx.canvas;
  const w = cv.width, h = cv.height;
  sx = Math.floor(sx); sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return false;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const idx = (sy * w + sx) * 4;
  const tr = d[idx], tg = d[idx + 1], tb = d[idx + 2], ta = d[idx + 3];
  const nr = parseInt(hex.slice(1, 3), 16), ng = parseInt(hex.slice(3, 5), 16), nb = parseInt(hex.slice(5, 7), 16);
  if (Math.abs(tr - nr) + Math.abs(tg - ng) + Math.abs(tb - nb) < 6 && Math.abs(ta - 255) < 6) return false;
  const tol = (tolerance !== undefined ? tolerance : 40);
  const tol2 = tol * tol * 3;
  const seen = new Uint8Array(w * h);
  const stack = [sy * w + sx];
  seen[sy * w + sx] = 1;
  let touched = 0;
  while (stack.length) {
    const p = stack.pop();
    const py = (p / w) | 0, px0 = p - py * w;
    // walk the span left/right
    let l = px0, r = px0;
    const rowOff = py * w * 4;
    while (l > 0 && match(l - 1 + py * w)) l--;
    while (r < w - 1 && match(r + 1 + py * w)) r++;
    for (let x = l; x <= r; x++) {
      const o = (rowOff + x * 4) | 0;
      d[o] = nr; d[o + 1] = ng; d[o + 2] = nb; d[o + 3] = 255;
      touched++;
      if (py > 0 && !seen[p - w] && match(p - w)) { seen[p - w] = 1; stack.push(p - w); }
      if (py < h - 1 && !seen[p + w] && match(p + w)) { seen[p + w] = 1; stack.push(p + w); }
    }
  }
  function match(p) {
    const o = p * 4;
    const dr = d[o] - tr, dg = d[o + 1] - tg, db = d[o + 2] - tb, da = d[o + 3] - ta;
    return dr * dr + dg * dg + db * db + da * da * 0.25 <= tol2;
  }
  if (touched) ctx.putImageData(img, 0, 0);
  return touched > 0;
}

/* keep fills inside one atlas panel (so woad never escapes the arm into the floor) */
export function floodFillRegionAt(ctx, sx, sy, hex, regionRect, tolerance) {
  const cv = ctx.canvas;
  const x0 = Math.floor(regionRect[0] * cv.width), y0 = Math.floor(regionRect[1] * cv.height);
  const x1 = Math.floor((regionRect[0] + regionRect[2]) * cv.width);
  const y1 = Math.floor((regionRect[1] + regionRect[3]) * cv.height);
  sx = Math.floor(sx); sy = Math.floor(sy);
  if (sx < x0 || sy < y0 || sx >= x1 || sy >= y1) {
    // seed outside the rect: clamp it in, fill still bounded
    sx = Math.max(x0, Math.min(x1 - 1, sx));
    sy = Math.max(y0, Math.min(y1 - 1, sy));
  }
  const tmp = document.createElement('canvas');
  tmp.width = x1 - x0; tmp.height = y1 - y0;
  const tg = tmp.getContext('2d', { willReadFrequently: true });
  tg.drawImage(cv, x0, y0, tmp.width, tmp.height, 0, 0, tmp.width, tmp.height);
  const ok = floodFillAt(tg, sx - x0, sy - y0, hex, tolerance);
  if (!ok) return false;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, tmp.width, tmp.height);
  ctx.clip();
  ctx.drawImage(tmp, x0, y0);
  ctx.restore();
  return true;
}

/* hex → rgba color utils shared with the overlay picker */
export function hexInk(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return alpha === undefined ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
