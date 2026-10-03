import * as THREE from '../vendor/three.module.js';

function pointKey(x, y) {
  return x + ',' + y;
}

function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
        point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

function simplify(points) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i + points.length - 1) % points.length];
    const point = points[i], next = points[(i + 1) % points.length];
    const ax = point[0] - prev[0], ay = point[1] - prev[1];
    const bx = next[0] - point[0], by = next[1] - point[1];
    if (ax * by - ay * bx !== 0) result.push(point);
  }
  return result.length >= 3 ? result : points;
}

export function traceSilhouettes(imageData, width, height, threshold = 24) {
  if (!imageData || !imageData.data || imageData.data.length < width * height * 4 ||
      !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new TypeError('drawing image data and dimensions are required');
  }
  const filled = (x, y) => x >= 0 && y >= 0 && x < width && y < height &&
    imageData.data[(y * width + x) * 4 + 3] >= threshold;
  const edges = [];
  const starts = new Map();
  function add(x1, y1, x2, y2, direction) {
    const edge = {x1, y1, x2, y2, direction, used: false};
    const key = pointKey(x1, y1);
    if (!starts.has(key)) starts.set(key, []);
    starts.get(key).push(edge);
    edges.push(edge);
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!filled(x, y)) continue;
      if (!filled(x, y - 1)) add(x, y, x + 1, y, 0);
      if (!filled(x + 1, y)) add(x + 1, y, x + 1, y + 1, 1);
      if (!filled(x, y + 1)) add(x + 1, y + 1, x, y + 1, 2);
      if (!filled(x - 1, y)) add(x, y + 1, x, y, 3);
    }
  }
  if (edges.length > 50000) throw new Error('drawing outline is too complex');
  const loops = [];
  const turnPriority = [1, 0, 3, 2];
  for (const first of edges) {
    if (first.used) continue;
    const points = [[first.x1, first.y1]];
    let edge = first;
    let closed = false;
    for (let guard = 0; guard <= edges.length; guard++) {
      edge.used = true;
      points.push([edge.x2, edge.y2]);
      if (edge.x2 === first.x1 && edge.y2 === first.y1) {
        closed = true;
        break;
      }
      const options = starts.get(pointKey(edge.x2, edge.y2)) || [];
      let next = null;
      for (const turn of turnPriority) {
        next = options.find(candidate => !candidate.used &&
          (candidate.direction - edge.direction + 4) % 4 === turn);
        if (next) break;
      }
      if (!next) break;
      edge = next;
    }
    if (!closed) continue;
    points.pop();
    const polygon = simplify(points);
    const area = signedArea(polygon);
    if (polygon.length >= 3 && Math.abs(area) >= 1) loops.push({points: polygon, area});
  }
  const outers = loops.filter(loop => loop.area > 0).map(loop => ({...loop, holes: []}));
  const holes = loops.filter(loop => loop.area < 0);
  holes.forEach(hole => {
    const parent = outers
      .filter(outer => pointInPolygon(hole.points[0], outer.points))
      .sort((a, b) => Math.abs(a.area) - Math.abs(b.area))[0];
    if (parent) parent.holes.push(hole);
  });
  return outers;
}

function pathFromContour(THREEApi, contour, width, height) {
  const path = new THREEApi.Path();
  contour.forEach((point, index) => {
    const x = point[0] / width - 0.5;
    const y = 0.5 - point[1] / height;
    if (index === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.closePath();
  return path;
}

export function buildDrawingGeometries(imageData, width, height, opts = {}) {
  const api = opts.THREE || THREE;
  const contours = traceSilhouettes(imageData, width, height, opts.threshold);
  return contours.map(contour => {
    const shape = new api.Shape();
    const outer = contour.points;
    outer.forEach((point, index) => {
      const x = point[0] / width - 0.5;
      const y = 0.5 - point[1] / height;
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
    contour.holes.forEach(hole => shape.holes.push(pathFromContour(api, hole.points, width, height)));
    const uvGenerator = {
      generateTopUV(_geometry, vertices, a, b, c) {
        return [a, b, c].map(index =>
          new api.Vector2(vertices[index * 3] + 0.5, vertices[index * 3 + 1] + 0.5));
      },
      generateSideWallUV(_geometry, vertices, a, b, c, d) {
        return [a, b, c, d].map(index =>
          new api.Vector2(vertices[index * 3] + 0.5, vertices[index * 3 + 1] + 0.5));
      }
    };
    const geometry = new api.ExtrudeGeometry(shape, {
      depth: opts.depth || 0.025,
      bevelEnabled: false,
      curveSegments: 1,
      UVGenerator: uvGenerator
    });
    geometry.computeVertexNormals();
    return geometry;
  });
}

function asCanvas(source) {
  if (source && source.getContext) return source;
  if (typeof document === 'undefined') throw new Error('drawing canvas support is unavailable');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function createDrawingMesh(THREEApi, source, options = {}) {
  const canvas = asCanvas(source);
  const context = canvas.getContext('2d', {willReadFrequently: true});
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const geometries = buildDrawingGeometries(imageData, canvas.width, canvas.height, {
    THREE: THREEApi,
    threshold: 24,
    depth: 0.025
  });
  const group = new THREEApi.Group();
  const texture = geometries.length ? new THREEApi.CanvasTexture(canvas) : null;
  if (texture && THREEApi.SRGBColorSpace) texture.colorSpace = THREEApi.SRGBColorSpace;
  const front = texture && new THREEApi.MeshStandardMaterial({
    map: texture, transparent: true, alphaTest: 0.08, side: THREEApi.DoubleSide,
    roughness: 0.76, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.18
  });
  const side = texture && new THREEApi.MeshStandardMaterial({
    color: options.sideColor || 0x735b42, roughness: 0.7, metalness: 0.08,
    transparent: true, opacity: options.opacity == null ? 0.96 : options.opacity,
    side: THREEApi.DoubleSide
  });
  geometries.forEach(geometry => {
    const mesh = new THREEApi.Mesh(geometry, [side, front]);
    mesh.scale.setScalar(options.size || 0.26);
    mesh.renderOrder = 8;
    group.add(mesh);
  });
  return {group, geometries, texture, materials: [front, side].filter(Boolean), contourCount: geometries.length};
}

export function disposeDrawingMeshes(drawingSet) {
  if (!drawingSet) return;
  drawingSet.geometries.forEach(geometry => geometry.dispose());
  drawingSet.materials.forEach(material => material.dispose());
  if (drawingSet.texture) drawingSet.texture.dispose();
  if (drawingSet.group.parent) drawingSet.group.parent.remove(drawingSet.group);
}
