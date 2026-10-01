// poppet-readback.js — the poppet is read back, at last.
//
// THE SEAM THIS CLOSES. poppet.js has always saved a four-layer entry into
// state.buddy: { kind:'poppet', layers:{outline,clothes,traits,others},
// primary:{...}, bound, tags, ts }. Nothing in the app has ever read
// `layers` back. The project's own Sept-19 audit called it "a seance in the
// pitch, a form in the build" — the app asked you to make a soul and then
// never mentioned it again. This file is the read half.
//
// It composites the four layers in their authored order, each at the opacity
// poppet.js declares for it (outline 1, clothes 1, traits .72, others .45 —
// the shadow layer is ephemeral, which is why it is the faintest and why it
// is drawn last), and hangs the result in the centre of the desktop where the
// glyph is. The poppet IS the sigil, so it belongs at the centre.
//
// One painter: a 2D canvas composites the layers. The retired Pixi path
// duplicated this pixel-for-pixel with a whole extra WebGL context; the
// honest renderer for a static four-sprite draw is the 2D one.

(function (global) {
  'use strict';

  if (global.LiberPoppetReadback) return;

  // The authored stacking order and per-layer opacity. Kept in the same order
  // poppet.js declares, so a layer added there shows up here in its place.
  var ORDER = [
    { key: 'outline', alpha: 1 },
    { key: 'clothes', alpha: 1 },
    { key: 'traits', alpha: 0.72 },
    { key: 'others', alpha: 0.45 }
  ];

  function state() {
    return (global.Liber && global.Liber.state && global.Liber.state.get()) || {};
  }

  // The most recently kept poppet. Earlier ones are not deleted — the app is
  // forgiving by design — so "latest" is by timestamp, not by array position.
  function latestPoppet() {
    var all = state().buddy || [];
    var best = null;
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (!e || e.kind !== 'poppet' || !e.layers) continue;
      if (!best || (Number(e.ts) || 0) > (Number(best.ts) || 0)) best = e;
    }
    return best;
  }

  function layersOf(entry) {
    var out = [];
    for (var i = 0; i < ORDER.length; i++) {
      var src = entry.layers[ORDER[i].key];
      if (src) out.push({ key: ORDER[i].key, alpha: ORDER[i].alpha, src: src });
    }
    return out;
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  // ── the 2D path ─────────────────────────────────────────────────────────
  async function paintCanvas(host, entry) {
    var layers = layersOf(entry);
    if (!layers.length) return false;
    var cv = document.createElement('canvas');
    cv.className = 'poppet-readback-canvas';
    cv.setAttribute('aria-hidden', 'true');
    var imgs = await Promise.all(layers.map(function (l) { return loadImage(l.src); }));
    var first = null;
    for (var i = 0; i < imgs.length; i++) if (imgs[i]) { first = imgs[i]; break; }
    if (!first) return false;
    cv.width = first.naturalWidth || 320;
    cv.height = first.naturalHeight || 420;
    var c = cv.getContext('2d');
    for (var j = 0; j < imgs.length; j++) {
      if (!imgs[j]) continue;
      c.globalAlpha = layers[j].alpha;
      c.drawImage(imgs[j], 0, 0, cv.width, cv.height);
    }
    c.globalAlpha = 1;
    host.appendChild(cv);
    return true;
  }

  // (the Pixi path retired: a one-shot four-sprite composite earns no
  // second WebGL context. The 2D canvas below is the single painter.)

  var api = {
    entry: null,
    host: null,
    // Whether a poppet has been kept at all. The desktop keeps its glyph when
    // none has: an empty centre is correct before the first sitting.
    exists: function () { return !!latestPoppet(); },
    read: function () { return latestPoppet(); },
    layerCount: function () {
      var e = latestPoppet();
      return e ? layersOf(e).length : 0;
    },
    mount: async function (host) {
      host = host || document.getElementById('poppet-readback') ||
        document.querySelector('.poppet-readback');
      if (!host) return false;
      var entry = latestPoppet();
      if (!entry) { host.setAttribute('data-poppet', 'none'); return false; }
      api.entry = entry;
      api.host = host;
      host.textContent = '';
      var ok = await paintCanvas(host, entry);
      host.setAttribute('data-poppet', ok ? 'read' : 'unreadable');
      host.setAttribute('data-poppet-layers', String(layersOf(entry).length));
      if (ok) host.setAttribute('data-poppet-name', entry.name || '');
      return ok;
    }
  };

  global.LiberPoppetReadback = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { api.mount(); });
  } else {
    api.mount();
  }
})(window);
