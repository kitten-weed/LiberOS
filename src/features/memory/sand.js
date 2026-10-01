// sand.js — the tray: a heightfield of sand in a wooden basin.
//
// The height map is a square grid (default 96×96 over a 10×10 tray). Tools
// are just brushes over the heights and the paint layer:
//   stick      push figures down; the sand ridges up around them
//   shovel     dig a hollow here, heap what came out where you next drag
//   brush      paint the sand; colour rides a second, vertex-coloured layer
//   bucket     pour sand, piling it where you hold
// Figures are not part of the field; the room manages them, and this module
// only tells them what ground height to sit at and how far to sink.
import * as THREE from '../../../vendor/three.module.js';
import { woodTexture } from './figures.js';

export const TRAY = 10;          // world units across
export const HALF = TRAY / 2;

export function createSand({ N = 96 } = {}) {
  // ── field state ───────────────────────────────────────────────────────
  const base = new Float32Array(N * N);      // resting height (0..1 of DEPTH)
  const DEPTH = 1.25;                        // the sand grew deeper with the toys
  const paint = new Uint8Array(N * N * 3);   // painted colour per cell (0 = unpainted)
  let shovelLoad = 0;                        // sand currently on the shovel

  const idx = (ix, iz) => iz * N + ix;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function gridToWorld(ix, iz) {
    return [ -HALF + (ix / (N - 1)) * TRAY, -HALF + (iz / (N - 1)) * TRAY ];
  }
  function worldToGrid(x, z) {
    return [
      clamp(Math.round(((x + HALF) / TRAY) * (N - 1)), 0, N - 1),
      clamp(Math.round(((z + HALF) / TRAY) * (N - 1)), 0, N - 1),
    ];
  }
  function heightAt(ix, iz) { return base[idx(ix, iz)] * DEPTH; }
  function sample(x, z) {
    const [ix, iz] = worldToGrid(x, z);
    return heightAt(ix, iz);
  }
  // bilinear sit-height for figures (they stand on the smooth field)
  function groundAt(x, z) {
    const fx = clamp(((x + HALF) / TRAY) * (N - 1), 0, N - 1.001);
    const fz = clamp(((z + HALF) / TRAY) * (N - 1), 0, N - 1.001);
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const tx = fx - ix, tz = fz - iz;
    const h00 = heightAt(ix, iz), h10 = heightAt(ix + 1, iz);
    const h01 = heightAt(ix, iz + 1), h11 = heightAt(ix + 1, iz + 1);
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  }

  function addHeight(ix, iz, dh) {
    const i = idx(ix, iz);
    const v = clamp(base[i] + dh, 0.02, 1.0);
    const applied = v - base[i];
    base[i] = v;
    return applied;
  }

  // a soft circular brush, falloff (0..1 radius fraction)
  function brush(x, z, radius, fn) {
    const [cx, cz] = worldToGrid(x, z);
    const r = Math.max(1, Math.round((radius / TRAY) * (N - 1)));
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.sqrt(dx * dx + dz * dz) / r;
        if (d > 1) continue;
        const ix = cx + dx, iz = cz + dz;
        if (ix < 0 || iz < 0 || ix >= N || iz >= N) continue;
        const w = (1 - d) * (1 - d);   // smooth falloff
        fn(ix, iz, w);
      }
    }
  }

  // ── the tools ─────────────────────────────────────────────────────────
  function dig(x, z, radius, rate) {
    let total = 0;
    brush(x, z, radius, (ix, iz, w) => { total -= addHeight(ix, iz, -rate * w); });
    shovelLoad = Math.min(1, shovelLoad + total / (radius * radius * 2));
  }
  // scoop: dig with no load taken — it just opens the sand down to its
  // floor, the way a blade or a pail mouth scrapes a hole
  function scoop(x, z, radius, rate) {
    brush(x, z, radius, (ix, iz, w) => { addHeight(ix, iz, -rate * w); });
  }
  function heap(x, z, radius, rate) {
    if (shovelLoad <= 0) return;
    brush(x, z, radius, (ix, iz, w) => { addHeight(ix, iz, rate * w * shovelLoad * 2.2); });
    shovelLoad = Math.max(0, shovelLoad - 0.02);
  }
  function pour(x, z, radius, rate) {
    brush(x, z, radius, (ix, iz, w) => { addHeight(ix, iz, rate * w); });
  }
  function flatten(x, z, radius, target, rate) {
    brush(x, z, radius, (ix, iz, w) => {
      const i = idx(ix, iz);
      base[i] += (clamp(target, 0.02, 1) - base[i]) * Math.min(1, rate * w);
    });
  }
  function setPaint(x, z, radius, rgb) {
    brush(x, z, radius, (ix, iz, w) => {
      if (w < 0.25) return;
      const i = idx(ix, iz) * 3;
      paint[i] = rgb[0]; paint[i + 1] = rgb[1]; paint[i + 2] = rgb[2];
    });
  }
  function clearPaint() { paint.fill(0); }

  // the stick around a figure: a ring of sand pushed up, a bowl pressed in
  function seatFigure(x, z, radius, sink) {
    brush(x, z, radius, (ix, iz, w) => {
      const d = w;                      // 1 at centre → 0 at rim
      const bowl = -sink * d * 0.7;
      const ring = sink * Math.exp(-Math.pow((d - 0.85) / 0.28, 2)) * 0.55;
      addHeight(ix, iz, (bowl + ring) * 0.5);
    });
  }
  function unseatFigure(x, z, radius) {
    flatten(x, z, radius, null, 0);     // no-op guard (kept for symmetry)
  }

  function reset() {
    base.fill(0.32);
    clearPaint();
    shovelLoad = 0;
  }
  reset();

  function deserialize(data) {
    if (!data || !data.h || data.N !== N) { reset(); return; }
    try {
      const bin = atob(data.h);
      for (let i = 0; i < base.length && i < bin.length; i++) base[i] = bin.charCodeAt(i) / 255;
      if (data.paint) {
        const pb = atob(data.paint);
        for (let i = 0; i < paint.length && i < pb.length; i++) paint[i] = pb.charCodeAt(i);
      }
    } catch (e) { reset(); }
  }

  // ── the mesh ──────────────────────────────────────────────────────────
  const geo = new THREE.PlaneGeometry(TRAY, TRAY, N - 1, N - 1);
  geo.rotateX(-Math.PI / 2);
  const colors = new Float32Array(N * N * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // a faint grain rides the colour map; the bump pass makes ripples catch the lamp
  const grainTex = woodTexture('#c9a86a', '#a8864a', 0);
  grainTex.repeat.set(3, 3);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0.0,
    map: grainTex, bumpMap: grainTex, bumpScale: 0.016,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;

  const cSandA = new THREE.Color(0xd2ac6e);
  const cSandB = new THREE.Color(0xb48a4c);
  const cSpark = new THREE.Color(0xf2e0b4);
  const cCrevice = new THREE.Color(0x5a4426);
  const cTmp = new THREE.Color();
  const pos = geo.attributes.position;

  function rebuild() {
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const vi = iz * N + ix;
        pos.setY(vi, heightAt(ix, iz));
        const i3 = vi * 3;
        const p0 = paint[i3], p1 = paint[i3 + 1], p2 = paint[i3 + 2];
        if (p0 || p1 || p2) {
          cTmp.setRGB(p0 / 255, p1 / 255, p2 / 255);
        } else {
          // gentle speckle so the field never looks vacuum-formed
          const sp = ((ix * 7 + iz * 13) % 11) / 11;
          cTmp.copy(cSandA).lerp(cSandB, sp * 0.55);
          if (sp > 0.93) cTmp.lerp(cSpark, 0.5);   // a quartz glint, here and there
        }
        // crevice shading: hollows collect darkness, ridges stay bright —
        // this is what makes digs and heaps read as shape, not noise
        let lo = 2, hi = -2;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = Math.min(N - 1, Math.max(0, ix + dx));
          const nz = Math.min(N - 1, Math.max(0, iz + dz));
          const h = base[idx(nx, nz)];
          if (h < lo) lo = h;
          if (h > hi) hi = h;
        }
        const self = base[idx(ix, iz)];
        const dep = Math.max(0, (hi - self) - (self - lo)) * 1.6;
        cTmp.lerp(cCrevice, Math.min(0.46, dep));
        colors[i3] = cTmp.r; colors[i3 + 1] = cTmp.g; colors[i3 + 2] = cTmp.b;
      }
    }
    pos.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
  }

  // the basin: a toy tray — honey-painted wood, rounded corner posts, a
  // painted band around the rim, all on a slim cabinet so the sand sits at
  // table height. Made to be played with, not to disappear.
  const basin = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTexture('#c09050', '#8a5c28', 42), roughness: 0.72 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTexture('#7a5430', '#4e3218', 42), roughness: 0.85 });
  const paintBand = new THREE.MeshStandardMaterial({ color: 0xc85a32, roughness: 0.5 });   // toy-tray terracotta
  const t = 0.28, wallH = 0.62, CABINET_H = 0.72;
  // the cabinet body under the box
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(TRAY + t * 2, CABINET_H, TRAY + t * 2), woodDark);
  cabinet.position.y = -0.1 - CABINET_H / 2;
  basin.add(cabinet);
  // a recessed apron on the facing sides, so the box reads as a raised tray
  for (const [x, z, w, d] of [
    [0, HALF + t / 2, TRAY * 0.74, 0.06], [0, -HALF - t / 2, TRAY * 0.74, 0.06],
    [-HALF - t / 2, 0, 0.06, TRAY * 0.74], [HALF + t / 2, 0, 0.06, TRAY * 0.74],
  ]) {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(w, CABINET_H * 0.72, d), woodDark);
    apron.position.set(x, -0.1 - CABINET_H / 2, z);
    basin.add(apron);
  }
  const floor = new THREE.Mesh(new THREE.BoxGeometry(TRAY + t * 2, 0.16, TRAY + t * 2), wood);
  floor.position.y = -0.1;
  const mkWall = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wood);
    m.position.set(x, wallH / 2 - 0.06, z);
    // the painted band: a stripe of colour along every rim
    const band = new THREE.Mesh(new THREE.BoxGeometry(d > w ? t + 0.05 : w, 0.09, d > w ? d : t + 0.05), paintBand);
    band.position.set(x, wallH - 0.1, z);
    basin.add(band);
    return m;
  };
  // rounded corner posts: the tray's corners are dowels, like a real toy box
  for (const [px, pz] of [[-HALF - t / 2, -HALF - t / 2], [HALF + t / 2, -HALF - t / 2], [-HALF - t / 2, HALF + t / 2], [HALF + t / 2, HALF + t / 2]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, wallH + 0.12, 12), woodDark);
    post.position.set(px, wallH / 2 - 0.02, pz);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), paintBand);
    cap.position.set(px, wallH + 0.05, pz);
    basin.add(post, cap);
  }
  basin.add(
    floor,
    mkWall(TRAY + t * 2, t, 0, -HALF - t / 2),
    mkWall(TRAY + t * 2, t, 0, HALF + t / 2),
    mkWall(t, TRAY, -HALF - t / 2, 0),
    mkWall(t, TRAY, HALF + t / 2, 0)
  );
  basin.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });

  return {
    mesh, basin, N, DEPTH,
    rebuild, reset, clearPaint, deserialize,
    sample, groundAt,
    dig, heap, pour, scoop, flatten, setPaint, seatFigure,
    shovelLoad: () => shovelLoad,
    serialize() {
      // lossy: 0..255 heights (quantized) — enough to re-hang the scene
      const h = new Uint8Array(N * N);
      for (let i = 0; i < base.length; i++) h[i] = Math.round(base[i] * 255);
      return { N, h: btoa(String.fromCharCode(...h)), paint: btoa(String.fromCharCode(...paint)) };
    },
  };
}
