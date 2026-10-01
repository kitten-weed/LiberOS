// room-shell.js — shared interaction contract for room overlays.
// Features own what an overlay means and how it clears pending state. This
// module owns the interaction that should never drift between rooms: backdrop
// dismissal and Escape-to-close for the topmost open overlay.
(function (global) {
  'use strict';

  var registry = [];

  function find(id) {
    for (var i = 0; i < registry.length; i++) {
      if (registry[i].id === id) return registry[i];
    }
    return null;
  }

  function bindOverlay(id, close) {
    var overlay = document.getElementById(id);
    if (!overlay || typeof close !== 'function') return;

    var existing = find(id);
    if (existing) {
      existing.close = close;
      return;
    }

    var item = { id: id, overlay: overlay, close: close };
    registry.push(item);
    overlay.dataset.shellBound = '1';
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        close();
        event.stopPropagation();
      }
    });
    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        close();
        event.stopPropagation();
      }
    });
  }

  function bindRoomOverlays(config) {
    config = config || {};
    var overlays = config.overlays || [];
    for (var i = 0; i < overlays.length; i++) {
      var item = overlays[i];
      if (item) bindOverlay(item.id, item.close);
    }
  }

  // Enter-to-confirm for the room's save prompts (plan 2026-09-06 §4):
  // marks registry items as confirm prompts. Rooms keep ownership of what
  // confirming means; this owns the key.
  function bindConfirmKey(ids) {
    for (var i = 0; i < ids.length; i++) {
      var item = find(ids[i]);
      if (item) item.confirm = true;
    }
  }

  function isEditable(target) {
    if (!target || !target.tagName) return false;
    if (target.tagName === 'TEXTAREA' || target.isContentEditable) return true;
    return target.tagName === 'INPUT' && target.type !== 'range';
  }

  // One listener serves every overlay registered by the current room. Reverse
  // order makes nested prompts win over the room help panel beneath them.
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      for (var i = registry.length - 1; i >= 0; i--) {
        var item = registry[i];
        if (item.overlay.classList.contains('open') && typeof item.close === 'function') {
          item.close();
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
      }
      return;
    }
    // Enter confirms the topmost open save prompt — from anywhere in the
    // room, because focus usually rests on the button that opened it.
    // Native behavior wins when focus is already inside the prompt.
    if (event.key !== 'Enter' || event.shiftKey || event.altKey ||
      event.ctrlKey || event.metaKey) return;
    for (var j = registry.length - 1; j >= 0; j--) {
      var cand = registry[j];
      var open = cand.overlay.classList.contains('open') && !cand.overlay.hasAttribute('inert');
      if (!open) continue;
      if (!cand.confirm) return; // a help/raison panel sits above — not a prompt
      if (cand.overlay.contains(event.target)) return;
      if (isEditable(event.target)) return;
      var keep = cand.overlay.querySelector('[id*="-keep"]');
      if (keep && typeof keep.click === 'function') {
        event.preventDefault();
        keep.click();
      }
      return;
    }
  });

  global.LiberRoomShell = global.LiberRoomShell || {
    bindOverlay: bindOverlay,
    bindRoomOverlays: bindRoomOverlays,
    bindConfirmKey: bindConfirmKey
  };
})(window);
