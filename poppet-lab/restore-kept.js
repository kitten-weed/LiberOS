const FACE_KINDS = ['eyes', 'face', 'hair'];
const THOUGHT_KINDS = ['fears', 'wishes', 'likes', 'dislikes', 'thoughts'];

function decodeImage(source) {
  if (typeof source !== 'string' || !/^data:image\//.test(source)) {
    return Promise.reject(new Error('saved paint is not an image'));
  }
  return new Promise(function (resolve, reject) {
    const image = new Image();
    image.onload = function () { resolve(image); };
    image.onerror = function () { reject(new Error('saved paint could not be decoded')); };
    image.src = source;
  });
}

function imageSources(record) {
  const sources = [{key: 'atlas', source: record && record.atlas}];
  if (record.cloth != null) sources.push({key: 'cloth', source: record.cloth});
  FACE_KINDS.forEach(function (kind) {
    if (record.face && record.face[kind] != null) {
      sources.push({key: 'face:' + kind, source: record.face[kind]});
    }
  });
  if (record.hull != null) sources.push({key: 'hull', source: record.hull});
  THOUGHT_KINDS.forEach(function (kind) {
    const modern = record.thoughts && record.thoughts[kind];
    const legacy = kind === 'fears' ? record.aura3 : (kind === 'thoughts' ? record.aura4 : null);
    const source = modern != null ? modern : legacy;
    if (source != null) sources.push({key: 'thought:' + kind, source: source});
  });
  return sources;
}

function canvasTarget(ctx, key) {
  if (!ctx || !ctx.canvas || typeof ctx.clearRect !== 'function' ||
      typeof ctx.drawImage !== 'function' || ctx.canvas.width < 1 || ctx.canvas.height < 1) {
    throw new Error('saved paint destination is unavailable: ' + key);
  }
  return {ctx: ctx, width: ctx.canvas.width, height: ctx.canvas.height};
}

function writeImage(target, texture, image) {
  if (!target) return;
  target.ctx.clearRect(0, 0, target.width, target.height);
  target.ctx.drawImage(image, 0, 0, target.width, target.height);
  if (texture) texture.needsUpdate = true;
}

export async function restoreKeptDoll({
  doll,
  record,
  params,
  thoughtCanvases = {},
  thoughtTextures = {},
  isCurrent = () => true
}) {
  if (!doll || !record || !params) throw new TypeError('kept doll restoration requires a doll, record, and params');

  const sources = imageSources(record);
  const decoded = await Promise.all(sources.map(async function (entry) {
    return [entry.key, await decodeImage(entry.source)];
  }));
  if (!isCurrent()) return {status: 'cancelled'};

  const images = new Map(decoded);
  const destinations = [];
  const bodyTarget = canvasTarget(doll.bodyCtx, 'atlas');
  destinations.push({key: 'atlas', target: bodyTarget, texture: doll.bodyTex});
  if (images.has('cloth')) {
    destinations.push({
      key: 'cloth',
      target: canvasTarget(doll.clothCtx, 'cloth'),
      texture: doll.clothTex
    });
  }
  FACE_KINDS.forEach(function (kind) {
    const key = 'face:' + kind;
    if (images.has(key)) {
      const face = doll.faceMaps && doll.faceMaps[kind];
      destinations.push({
        key: key,
        target: canvasTarget(face && face.ctx, key),
        texture: face && face.tex
      });
    }
  });
  if (images.has('hull')) {
    destinations.push({
      key: 'hull',
      target: canvasTarget(doll.hullCtx, 'hull'),
      texture: doll.hullTex
    });
  }
  THOUGHT_KINDS.forEach(function (kind) {
    const key = 'thought:' + kind;
    const canvas = thoughtCanvases[kind];
    if (!images.has(key) || !canvas) return;
    const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
    destinations.push({
      key: key,
      target: canvasTarget(ctx, key),
      texture: thoughtTextures[kind]
    });
  });

  const savedParams = record.P && typeof record.P === 'object' ? record.P : {};
  Object.assign(params, savedParams);
  params.pose = record.pose || savedParams.pose || params.pose || 'stand';
  params.worn = Object.assign(
    {},
    params.worn || {},
    savedParams.worn || {},
    record.worn || {}
  );
  doll.setParams(params);
  doll.rebuild(params.pose);

  destinations.forEach(function (destination) {
    writeImage(destination.target, destination.texture, images.get(destination.key));
  });
  if (images.has('hull')) {
    if (typeof doll.markHullPainted === 'function') doll.markHullPainted();
    if (typeof doll.setHulls === 'function') doll.setHulls(true);
  }
  if (FACE_KINDS.some(kind => images.has('face:' + kind)) &&
      typeof doll.setFaceShell === 'function') {
    doll.setFaceShell(true);
  }

  return {status: 'restored', name: record.name || null, record: record};
}
