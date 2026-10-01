(function (window, document) {
  'use strict';

  if (!window || !document || window.LiberPixiRuntime) return;

  const layers = new Map();
  const pendingIds = new Set();
  const observedElements = new Set();
  const eventCleanup = [];
  let app = null;
  let initializationPromise = null;
  let resizeObserver = null;
  let tickerCallback = null;
  let status = 'idle';
  let applicationCount = 0;
  let frameCount = 0;
  let released = false;
  let bfcacheSuspended = false;
  let renderingTick = false;
  let dirty = false;
  let pointerState = null;
  let motionPreference = null;
  let runtimeError = null;

  function errorMessage(error) {
    return error && error.message ? error.message : String(error || 'Unknown Pixi runtime error');
  }

  function failRuntime(error) {
    const failure = error instanceof Error ? error : new Error(errorMessage(error));
    runtimeError = failure;
    if (!released) status = 'error';
    window.__liberPixiRuntimeError = errorMessage(failure);
    if (app && app.ticker) app.ticker.stop();
    return failure;
  }

  function rectFor(element) {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function validHost(host) {
    if (!host || host.nodeType !== 1 || host.ownerDocument !== document) {
      throw new TypeError('Pixi layer host must be an element in this document');
    }
    if (!host.isConnected) {
      throw new TypeError('Pixi layer host must be connected to the document');
    }
    const rect = rectFor(host);
    if (!Object.values(rect).every(Number.isFinite) || rect.width < 0 || rect.height < 0) {
      throw new TypeError('Pixi layer host has an invalid rectangle');
    }
  }

  function validateSpec(spec) {
    if (!spec || typeof spec !== 'object') throw new TypeError('Pixi layer spec must be an object');
    if (typeof spec.id !== 'string' || !spec.id.trim()) throw new TypeError('Pixi layer id is required');
    if (typeof spec.owner !== 'string' || !spec.owner.trim()) throw new TypeError(`Pixi layer "${spec.id}" owner is required`);
    if (!Number.isFinite(spec.order)) throw new TypeError(`Pixi layer "${spec.id}" order must be a finite number`);
    if (spec.logicalScale !== undefined && (!Number.isFinite(spec.logicalScale) || spec.logicalScale <= 0)) {
      throw new TypeError(`Pixi layer "${spec.id}" logicalScale must be a positive number`);
    }
    for (const callback of ['onMount', 'onResize', 'onUpdate', 'onRender', 'onDispose']) {
      if (spec[callback] !== undefined && typeof spec[callback] !== 'function') {
        throw new TypeError(`Pixi layer "${spec.id}" ${callback} must be a function`);
      }
    }
    if (spec.ownCanvas !== undefined && typeof spec.ownCanvas !== 'boolean') {
      throw new TypeError(`Pixi layer "${spec.id}" ownCanvas must be a boolean`);
    }
    validHost(spec.host);
    return {
      id: spec.id.trim(),
      owner: spec.owner.trim(),
      host: spec.host,
      order: spec.order,
      logicalScale: spec.logicalScale === undefined ? 1 : spec.logicalScale,
      animated: spec.animated === true,
      active: spec.active !== false,
      ownCanvas: spec.ownCanvas === true,
      onMount: spec.onMount || null,
      onResize: spec.onResize || null,
      onUpdate: spec.onUpdate || null,
      onRender: spec.onRender || null,
      onDispose: spec.onDispose || null,
    };
  }

  function currentPointer(record) {
    const rect = record.hostRect;
    if (!pointerState) return { x: 0, y: 0, insideHost: false };
    const x = pointerState.x - rect.left;
    const y = pointerState.y - rect.top;
    return {
      x,
      y,
      insideHost: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height,
    };
  }

  function makeContext(record) {
    const viewport = record.viewport || {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      scaleX: 1,
      scaleY: 1,
    };
    return {
      app: record.app || app,
      root: record.root,
      viewport: { ...viewport },
      pointer: currentPointer(record),
      reducedMotion: !!(motionPreference && motionPreference.matches),
      invalidate: function () {
        return invalidate(record);
      },
    };
  }

  function runCallback(record, callbackName, ...args) {
    const callback = record[callbackName];
    if (!callback) return;
    callback(makeContext(record), ...args);
  }

  function contractLayers() {
    return Object.freeze([...layers.values()]
      .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
      .map((record) => Object.freeze({
        id: record.id,
        owner: record.owner,
        order: record.order,
        active: record.active,
        hostRect: Object.freeze({ ...record.hostRect }),
      })));
  }

  const contract = {};
  Object.defineProperties(contract, {
    status: { enumerable: true, get: () => status },
    applicationCount: { enumerable: true, get: () => applicationCount },
    canvasCount: {
      enumerable: true,
      get: () => document.querySelectorAll('canvas.pixi-runtime-canvas').length,
    },
    tickerRunning: {
      enumerable: true,
      get: () => !!(app && app.ticker && app.ticker.started),
    },
    frameCount: { enumerable: true, get: () => frameCount },
    layers: { enumerable: true, get: contractLayers },
  });
  Object.freeze(contract);

  function isSuspended() {
    return released || bfcacheSuspended || document.hidden;
  }

  function hasAnimatedLayer() {
    return [...layers.values()].some((record) => record.active && record.animated);
  }

  function reconcileTicker() {
    if (!app || !app.ticker || status !== 'ready' || released) return;
    if (hasAnimatedLayer() && !isSuspended()) {
      if (!app.ticker.started) app.ticker.start();
    } else if (app.ticker.started) {
      app.ticker.stop();
    }
  }

  function renderLayers() {
    if (released) return false;
    try {
      for (const record of layers.values()) {
        if (!record.active) continue;
        if (record.ownCanvas) {
          // Own-canvas layers paint themselves: onRender composes the stage,
          // then the record's own renderer blits it. The shared application is
          // not involved.
          const instance = record.app;
          if (!instance) continue;
          instance.stage.sortChildren();
          runCallback(record, 'onRender');
          instance.render();
        } else {
          runCallback(record, 'onRender');
        }
      }
      frameCount++;
      return true;
    } catch (error) {
      failRuntime(error);
      return false;
    }
  }

  function invalidate(record) {
    if (record && (layers.get(record.id) !== record || !record.active)) return false;
    if (record && record.ownCanvas) {
      if (isSuspended() || renderingTick) return true;
      return renderLayers();
    }
    if (!app || status !== 'ready' || released) return false;
    if (isSuspended() || renderingTick) {
      dirty = true;
      return true;
    }
    if (!renderLayers()) return false;
    try {
      app.render();
      dirty = false;
      return true;
    } catch (error) {
      failRuntime(error);
      return false;
    }
  }

  function tick(ticker) {
    if (status !== 'ready' || released || isSuspended()) return;
    renderingTick = true;
    try {
      for (const record of layers.values()) {
        if (record.active && record.animated) runCallback(record, 'onUpdate', ticker.deltaMS);
      }
      renderLayers();
      dirty = false;
    } catch (error) {
      failRuntime(error);
    } finally {
      renderingTick = false;
    }
  }

  function opaqueBackground(element) {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.99) return false;
    const color = style.backgroundColor;
    if (!color || color === 'transparent') return false;
    const channels = color.match(/[\d.]+/g);
    if (!channels || channels.length < 3) return false;
    const alpha = channels.length >= 4 ? Number(channels[3]) : 1;
    return alpha >= 0.99;
  }

  function opaqueAncestorsBetween(lower) {
    const occluders = new Set();
    for (const foreground of layers.values()) {
      // Own-canvas layers are clipped by their own element, not by the mask,
      // so they neither need occluders nor provide them.
      if (foreground.ownCanvas) continue;
      if (foreground === lower || foreground.order <= lower.order || !lower.host.contains(foreground.host)) continue;
      let ancestor = foreground.host.parentElement;
      while (ancestor && ancestor !== lower.host) {
        if (opaqueBackground(ancestor)) occluders.add(ancestor);
        ancestor = ancestor.parentElement;
      }
    }
    return [...occluders];
  }

  function clippedRect(rect, hostRect) {
    const left = Math.max(rect.left, hostRect.left);
    const top = Math.max(rect.top, hostRect.top);
    const right = Math.min(rect.left + rect.width, hostRect.left + hostRect.width);
    const bottom = Math.min(rect.top + rect.height, hostRect.top + hostRect.height);
    if (right <= left || bottom <= top) return null;
    return {
      x: left - hostRect.left,
      y: top - hostRect.top,
      width: right - left,
      height: bottom - top,
    };
  }

  function radiusLength(value, size) {
    const text = String(value || '').trim();
    const amount = Number.parseFloat(text);
    if (!Number.isFinite(amount)) return 0;
    return Math.max(0, text.endsWith('%') ? amount * size / 100 : amount);
  }

  function radiusScale(width, height, radii) {
    const ratio = (size, sum) => sum > 0 ? size / sum : 1;
    return Math.min(
      1,
      ratio(width, radii[0].x + radii[1].x),
      ratio(width, radii[3].x + radii[2].x),
      ratio(height, radii[0].y + radii[3].y),
      ratio(height, radii[1].y + radii[2].y),
    );
  }

  function elementRadii(element, width, height) {
    const style = window.getComputedStyle(element);
    const corner = (value) => {
      const parts = value.trim().split(/\s+/);
      const x = radiusLength(parts[0], width);
      const y = radiusLength(parts[1] || parts[0], height);
      return x && y ? { x, y } : { x: 0, y: 0 };
    };
    const radii = [
      corner(style.borderTopLeftRadius),
      corner(style.borderTopRightRadius),
      corner(style.borderBottomRightRadius),
      corner(style.borderBottomLeftRadius),
    ];
    const scale = radiusScale(width, height, radii);
    return radii.map((radius) => ({ x: radius.x * scale, y: radius.y * scale }));
  }

  function occlusionShape(element, hostRect) {
    const rect = rectFor(element);
    const clipped = clippedRect(rect, hostRect);
    if (!clipped) return null;

    const left = rect.left - hostRect.left;
    const top = rect.top - hostRect.top;
    const right = left + rect.width;
    const bottom = top + rect.height;
    const clippedRight = clipped.x + clipped.width;
    const clippedBottom = clipped.y + clipped.height;
    const atLeft = Math.abs(clipped.x - left) < 0.01;
    const atTop = Math.abs(clipped.y - top) < 0.01;
    const atRight = Math.abs(clippedRight - right) < 0.01;
    const atBottom = Math.abs(clippedBottom - bottom) < 0.01;
    const corners = elementRadii(element, rect.width, rect.height);
    const square = { x: 0, y: 0 };
    const radii = [
      atLeft && atTop ? corners[0] : square,
      atRight && atTop ? corners[1] : square,
      atRight && atBottom ? corners[2] : square,
      atLeft && atBottom ? corners[3] : square,
    ];
    const scale = radiusScale(clipped.width, clipped.height, radii);
    return {
      ...clipped,
      radii: radii.map((radius) => ({ x: radius.x * scale, y: radius.y * scale })),
    };
  }

  function drawRoundedPath(graphics, shape) {
    const { x, y, width, height } = shape;
    const [topLeft, topRight, bottomRight, bottomLeft] = shape.radii;
    const kappa = 0.5522847498307936;

    graphics.moveTo(x + topLeft.x, y)
      .lineTo(x + width - topRight.x, y);
    if (topRight.x && topRight.y) {
      graphics.bezierCurveTo(
        x + width - topRight.x + topRight.x * kappa, y,
        x + width, y + topRight.y - topRight.y * kappa,
        x + width, y + topRight.y,
      );
    } else {
      graphics.lineTo(x + width, y);
    }
    graphics.lineTo(x + width, y + height - bottomRight.y);
    if (bottomRight.x && bottomRight.y) {
      graphics.bezierCurveTo(
        x + width, y + height - bottomRight.y + bottomRight.y * kappa,
        x + width - bottomRight.x + bottomRight.x * kappa, y + height,
        x + width - bottomRight.x, y + height,
      );
    } else {
      graphics.lineTo(x + width, y + height);
    }
    graphics.lineTo(x + bottomLeft.x, y + height);
    if (bottomLeft.x && bottomLeft.y) {
      graphics.bezierCurveTo(
        x + bottomLeft.x - bottomLeft.x * kappa, y + height,
        x, y + height - bottomLeft.y + bottomLeft.y * kappa,
        x, y + height - bottomLeft.y,
      );
    } else {
      graphics.lineTo(x, y + height);
    }
    graphics.lineTo(x, y + topLeft.y);
    if (topLeft.x && topLeft.y) {
      graphics.bezierCurveTo(
        x, y + topLeft.y - topLeft.y * kappa,
        x + topLeft.x - topLeft.x * kappa, y,
        x + topLeft.x, y,
      );
    } else {
      graphics.lineTo(x, y);
    }
    graphics.closePath();
  }

  function createRecordApplication(spec) {
    if (!window.PIXI || typeof window.PIXI.Application !== 'function') {
      return Promise.reject(new Error('PixiJS must be loaded before registering a layer'));
    }
    if (released || status === 'released') return Promise.reject(new Error('Pixi runtime has been released'));
    if (status === 'error') return Promise.reject(runtimeError || new Error(window.__liberPixiRuntimeError));
    return (async () => {
      const width = Math.max(1, Math.round(window.innerWidth || document.documentElement.clientWidth));
      const height = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight));
      const instance = new window.PIXI.Application();
      try {
        await instance.init({
          width,
          height,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          autoStart: false,
          sharedTicker: false,
          backgroundAlpha: 0,
          preference: 'webgl',
          antialias: true,
        });
      } catch (error) {
        destroyApp(instance);
        throw error;
      }
      if (released || status === 'released') {
        destroyApp(instance);
        throw new Error('Pixi runtime was released during initialization');
      }
      if (!instance.canvas || !instance.renderer || !instance.ticker) {
        destroyApp(instance);
        throw new Error('PixiJS initialized without a renderer, canvas, or ticker');
      }
      instance.stage.sortableChildren = true;
      instance.stage.eventMode = 'none';
      instance.canvas.classList.add('pixi-runtime-canvas', 'pixi-own-canvas');
      instance.canvas.setAttribute('aria-hidden', 'true');
      instance.canvas.tabIndex = -1;
      // Own-canvas layers live inside their host element, host-sized: the
      // browser clips them and the host's own stacking position decides what
      // paints over them. The shared page canvas keeps its fixed overlay.
      Object.assign(instance.canvas.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        touchAction: 'none',
        zIndex: '0',
      });
      return instance;
    })();
  }

  function mountRecordCanvas(record) {
    const instance = record.app;
    if (!instance || !instance.canvas) return;
    if (instance.canvas.parentNode !== record.host) record.host.appendChild(instance.canvas);
  }

  function updateRecordCanvas(record) {
    const instance = record.app;
    if (!instance || !instance.canvas) return;
    // The canvas is positioned inside its offsetParent (the host itself when
    // the host is positioned, as .traverom-stage is), so express the host's
    // page position relative to that parent rather than pasting page
    // coordinates into a locally-positioned box.
    const parent = instance.canvas.offsetParent;
    let offsetX = 0;
    let offsetY = 0;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      offsetX = parentRect.left;
      offsetY = parentRect.top;
    }
    instance.canvas.style.left = `${record.hostRect.left - offsetX}px`;
    instance.canvas.style.top = `${record.hostRect.top - offsetY}px`;
    const width = Math.max(1, Math.round(record.hostRect.width));
    const height = Math.max(1, Math.round(record.hostRect.height));
    if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
      instance.canvas.style.display = 'none';
      record.renderedSize = null;
      return;
    }
    instance.canvas.style.display = 'block';
    const current = record.renderedSize;
    if (!current || current.width !== width || current.height !== height) {
      record.renderedSize = { width, height };
      instance.renderer.resize(width, height);
    }
  }

  function destroyRecordApp(record) {
    const instance = record.app;
    record.app = null;
    record.renderedSize = null;
    if (instance) destroyApp(instance);
  }

  function updateMask(record) {
    if (record.ownCanvas || !record.mask) return;
    const { width, height } = record.viewport;
    record.mask.clear();
    if (width <= 0 || height <= 0) return;
    record.mask.rect(0, 0, width, height).fill(0xffffff);
    const holes = opaqueAncestorsBetween(record)
      .map((element) => occlusionShape(element, record.hostRect))
      .filter(Boolean);
    for (const hole of holes) drawRoundedPath(record.mask, hole);
    if (holes.length) record.mask.cut();
  }

  function updateObserverTargets() {
    if (!resizeObserver) return;
    const wanted = new Set();
    for (const record of layers.values()) {
      wanted.add(record.host);
      if (record.ownCanvas) continue;
      for (const occluder of opaqueAncestorsBetween(record)) wanted.add(occluder);
    }
    for (const element of observedElements) {
      if (!wanted.has(element)) {
        resizeObserver.unobserve(element);
        observedElements.delete(element);
      }
    }
    for (const element of wanted) {
      if (!observedElements.has(element)) {
        resizeObserver.observe(element);
        observedElements.add(element);
      }
    }
  }

  function updateLayerGeometry(record) {
    record.hostRect = rectFor(record.host);
    if (record.ownCanvas) {
      // Host-local coordinates: the canvas is the host, so layers address it
      // from (0,0) instead of page coordinates.
      record.viewport = {
        x: 0,
        y: 0,
        width: record.hostRect.width,
        height: record.hostRect.height,
        scaleX: 1,
        scaleY: 1,
      };
      updateRecordCanvas(record);
      return;
    }
    record.viewport = {
      x: record.hostRect.left,
      y: record.hostRect.top,
      width: record.hostRect.width,
      height: record.hostRect.height,
      scaleX: 1,
      scaleY: 1,
    };
    record.root.position.set(record.hostRect.left, record.hostRect.top);
    record.mask.position.set(0, 0);
  }

  function refreshLayers(notifyResize) {
    for (const record of layers.values()) updateLayerGeometry(record);
    updateObserverTargets();
    for (const record of layers.values()) {
      if (!record.ownCanvas) updateMask(record);
    }
    if (notifyResize) {
      for (const record of layers.values()) {
        try {
          runCallback(record, 'onResize');
        } catch (error) {
          failRuntime(error);
          return;
        }
      }
    }
    invalidate();
  }

  function resizeRenderer() {
    if (!app || status !== 'ready' || released) return;
    const width = Math.max(1, Math.round(window.innerWidth || document.documentElement.clientWidth));
    const height = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight));
    try {
      app.renderer.resize(width, height);
      refreshLayers(true);
    } catch (error) {
      failRuntime(error);
    }
  }

  function pointerChanged(event) {
    pointerState = { x: event.clientX, y: event.clientY };
    invalidate();
  }

  function pointerLeft() {
    pointerState = null;
    invalidate();
  }

  function visibilityChanged() {
    reconcileTicker();
    if (!document.hidden && dirty) invalidate();
  }

  function pageHidden(event) {
    if (event.persisted) {
      bfcacheSuspended = true;
      reconcileTicker();
      return;
    }
    release();
  }

  function pageShown() {
    if (!bfcacheSuspended || released) return;
    bfcacheSuspended = false;
    refreshLayers(true);
    reconcileTicker();
    if (dirty) invalidate();
  }

  function motionChanged() {
    invalidate();
  }

  function addListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    eventCleanup.push(() => target.removeEventListener(type, handler, options));
  }

  function bindLifecycle() {
    if (resizeObserver || eventCleanup.length) return;
    if (typeof window.ResizeObserver === 'function') {
      resizeObserver = new window.ResizeObserver(() => refreshLayers(true));
    }
    motionPreference = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    addListener(window, 'resize', resizeRenderer, { passive: true });
    addListener(window, 'pointermove', pointerChanged, { passive: true });
    addListener(window, 'pointerleave', pointerLeft, { passive: true });
    addListener(document, 'visibilitychange', visibilityChanged);
    addListener(window, 'pagehide', pageHidden);
    addListener(window, 'pageshow', pageShown);
    if (motionPreference) {
      if (typeof motionPreference.addEventListener === 'function') {
        addListener(motionPreference, 'change', motionChanged);
      } else if (typeof motionPreference.addListener === 'function') {
        motionPreference.addListener(motionChanged);
        eventCleanup.push(() => motionPreference.removeListener(motionChanged));
      }
    }
  }

  function destroyApp(instance) {
    if (!instance) return;
    const renderer = instance.renderer;
    const canvas = renderer ? renderer.canvas : null;
    try {
      if (instance.ticker) instance.ticker.stop();
    } catch (error) {
      window.__liberPixiRuntimeCleanupError = errorMessage(error);
    }
    if (renderer) {
      try {
        instance.destroy({ removeView: true }, { children: true });
      } catch (error) {
        window.__liberPixiRuntimeCleanupError = errorMessage(error);
      }
    }
    if (canvas && canvas.parentNode) canvas.remove();
  }

  function initializeApplication() {
    if (status === 'error') return Promise.reject(runtimeError || new Error(window.__liberPixiRuntimeError));
    if (released || status === 'released') return Promise.reject(new Error('Pixi runtime has been released'));
    if (status === 'ready' && app) return Promise.resolve(app);
    if (initializationPromise) return initializationPromise;

    status = 'initializing';
    initializationPromise = (async () => {
      let instance = null;
      try {
        if (!window.PIXI || typeof window.PIXI.Application !== 'function') {
          throw new Error('PixiJS must be loaded before registering a layer');
        }
        const width = Math.max(1, Math.round(window.innerWidth || document.documentElement.clientWidth));
        const height = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight));
        instance = new window.PIXI.Application();
        app = instance;
        applicationCount++;
        await instance.init({
          width,
          height,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          autoStart: false,
          sharedTicker: false,
          backgroundAlpha: 0,
          preference: 'webgl',
          antialias: true,
        });
        if (released) {
          destroyApp(instance);
          app = null;
          throw new Error('Pixi runtime was released during initialization');
        }
        if (!instance.canvas || !instance.renderer || !instance.ticker) {
          throw new Error('PixiJS initialized without a renderer, canvas, or ticker');
        }
        instance.stage.sortableChildren = true;
        instance.stage.eventMode = 'none';
        instance.canvas.classList.add('pixi-runtime-canvas');
        instance.canvas.setAttribute('aria-hidden', 'true');
        instance.canvas.tabIndex = -1;
        Object.assign(instance.canvas.style, {
          position: 'fixed',
          left: '0',
          top: '0',
          width: '100vw',
          height: '100vh',
          display: 'block',
          pointerEvents: 'none',
          touchAction: 'none',
          zIndex: '1',
        });
        (document.body || document.documentElement).appendChild(instance.canvas);
        bindLifecycle();
        if (resizeObserver) updateObserverTargets();
        tickerCallback = tick;
        instance.ticker.add(tickerCallback);
        instance.ticker.stop();
        status = 'ready';
        return instance;
      } catch (error) {
        destroyApp(instance);
        app = null;
        if (!released) failRuntime(error);
        throw runtimeError || error;
      }
    })();
    return initializationPromise;
  }

  function createRecord(spec) {
    const root = new window.PIXI.Container();
    // Own-canvas layers sit inside their host element, exactly host-sized, so
    // the browser clips them; no occlusion mask is needed (or meaningful).
    const mask = spec.ownCanvas ? null : new window.PIXI.Graphics();
    if (mask) {
      root.addChild(mask);
      root.mask = mask;
    }
    root.zIndex = spec.order;
    root.label = spec.id;
    root.visible = spec.active;
    const record = {
      ...spec,
      root,
      mask,
      app: null,
      renderedSize: null,
      viewport: null,
      hostRect: { left: 0, top: 0, width: 0, height: 0 },
      handle: null,
    };
    const handle = Object.freeze({
      id: record.id,
      root,
      get app() { return record.ownCanvas ? record.app : app; },
      invalidate: () => invalidate(record),
      setActive: (active) => setActive(record, active),
      dispose: () => disposeLayer(record),
    });
    record.handle = handle;
    return record;
  }

  function setActive(record, active) {
    if (layers.get(record.id) !== record || released) return false;
    record.active = !!active;
    record.root.visible = record.active;
    try {
      runCallback(record, 'onResize');
    } catch (error) {
      failRuntime(error);
      return false;
    }
    reconcileTicker();
    invalidate();
    return true;
  }

  function disposeLayer(record) {
    if (layers.get(record.id) !== record) return false;
    try {
      runCallback(record, 'onDispose');
    } catch (error) {
      failRuntime(error);
    }
    record.root.mask = null;
    record.root.destroy({ children: true });
    layers.delete(record.id);
    destroyRecordApp(record);
    refreshLayers(false);
    reconcileTicker();
    return true;
  }

  function registerLayer(spec) {
    let normalized;
    try {
      normalized = validateSpec(spec);
      if (layers.has(normalized.id) || pendingIds.has(normalized.id)) {
        throw new Error(`Duplicate Pixi layer id "${normalized.id}"`);
      }
      if (status === 'error') throw runtimeError || new Error(window.__liberPixiRuntimeError);
      if (released || status === 'released') throw new Error('Pixi runtime has been released');
    } catch (error) {
      return Promise.reject(error);
    }

    pendingIds.add(normalized.id);
    return initializeApplication().then(async () => {
      validHost(normalized.host);
      const record = createRecord(normalized);
      layers.set(record.id, record);
      try {
        if (record.ownCanvas) {
          record.app = await createRecordApplication(normalized);
          mountRecordCanvas(record);
          record.app.stage.addChild(record.root);
        } else {
          app.stage.addChild(record.root);
        }
        for (const layer of layers.values()) updateLayerGeometry(layer);
        updateObserverTargets();
        for (const layer of layers.values()) updateMask(layer);
        runCallback(record, 'onMount');
        runCallback(record, 'onResize');
        record.handle.root.visible = record.active;
        reconcileTicker();
        invalidate();
        return record.handle;
      } catch (error) {
        record.root.mask = null;
        record.root.destroy({ children: true });
        layers.delete(record.id);
        destroyRecordApp(record);
        refreshLayers(false);
        throw failRuntime(error);
      }
    }).catch((error) => {
      pendingIds.delete(normalized.id);
      throw error;
    }).finally(() => {
      pendingIds.delete(normalized.id);
    });
  }

  function release() {
    if (released) return false;
    released = true;
    bfcacheSuspended = false;
    if (app && app.ticker) {
      if (tickerCallback) app.ticker.remove(tickerCallback);
      app.ticker.stop();
    }
    for (const record of [...layers.values()]) {
      try {
        runCallback(record, 'onDispose');
      } catch (error) {
        window.__liberPixiRuntimeError = errorMessage(error);
      }
      record.root.mask = null;
      if (record.ownCanvas) destroyRecordApp(record);
    }
    layers.clear();
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    observedElements.clear();
    while (eventCleanup.length) eventCleanup.pop()();
    if (app) destroyApp(app);
    app = null;
    tickerCallback = null;
    status = 'released';
    return true;
  }

  const runtime = {};
  Object.defineProperties(runtime, {
    app: { enumerable: true, get: () => app },
    contract: { enumerable: true, value: contract },
    registerLayer: { enumerable: true, value: registerLayer },
    getLayer: {
      enumerable: true,
      value: (id) => {
        const record = layers.get(id);
        return record ? record.handle : null;
      },
    },
    release: { enumerable: true, value: release },
  });
  Object.freeze(runtime);
  window.LiberPixiRuntime = runtime;
})(window, document);
