(function (global) {
  'use strict';

  var FLOW = 'craft-first-v1';
  var ORDER = [
    'beat-001', 'beat-006', 'beat-007', 'beat-008', 'beat-009', 'beat-010',
    'beat-011', 'beat-012', 'beat-013', 'beat-014', 'beat-015', 'beat-016',
    'beat-017', 'beat-018', 'beat-019', 'beat-020', 'beat-021', 'beat-022',
    'beat-002', 'beat-003', 'beat-004', 'beat-005', 'beat-006-close',
    'beat-023', 'beat-024', 'beat-025', 'beat-026', 'beat-027', 'beat-028'
  ];

  function patchAt(index) {
    if (!Number.isInteger(index) || index < 0 || index > ORDER.length) {
      throw new RangeError('tutorial cursor out of range');
    }
    return {
      tutorialFlow: FLOW,
      tutorialBeat: index,
      tutorialBeatId: index === ORDER.length ? null : ORDER[index]
    };
  }

  function cursorAt(index) {
    return {
      blocked: false,
      id: index === ORDER.length ? null : ORDER[index],
      index: index,
      patch: patchAt(index)
    };
  }

  function blocked(reason, id) {
    return {
      blocked: true,
      reason: reason,
      id: id || null,
      index: null,
      patch: null
    };
  }

  function resolveCursor(state, hasKeep) {
    var saved = state && typeof state === 'object' ? state : {};
    if (saved.tutorialDone) return cursorAt(ORDER.length);

    if (saved.tutorialFlow === FLOW) {
      if (saved.tutorialBeatId === null && saved.tutorialBeat === ORDER.length) {
        return cursorAt(ORDER.length);
      }
      var currentIndex = ORDER.indexOf(saved.tutorialBeatId);
      return currentIndex < 0
        ? blocked('unknown tutorial beat ID', saved.tutorialBeatId)
        : cursorAt(currentIndex);
    }
    if (saved.tutorialBeatId != null || saved.tutorialFlow != null) {
      return blocked('unknown tutorial flow marker', saved.tutorialBeatId);
    }

    var legacyIndex = Number.isInteger(saved.tutorialBeat) && saved.tutorialBeat >= 0
      ? saved.tutorialBeat : 0;
    if (legacyIndex > 28) {
      return blocked('legacy tutorial cursor is outside the authored flow');
    }
    if (legacyIndex === 28) return cursorAt(ORDER.length);
    if (!hasKeep && legacyIndex >= 15) return cursorAt(ORDER.indexOf('beat-016'));
    if (!hasKeep && legacyIndex >= 1 && legacyIndex <= 4) {
      return cursorAt(ORDER.indexOf('beat-006'));
    }

    var originalId = 'beat-' + String(legacyIndex + 1).padStart(3, '0');
    var newIndex = ORDER.indexOf(originalId);
    return newIndex < 0
      ? blocked('legacy tutorial beat has no stable identity', originalId)
      : cursorAt(newIndex);
  }

  global.LiberTutorialFlow = {
    FLOW: FLOW,
    ORDER: ORDER.slice(),
    patchAt: patchAt,
    resolveCursor: resolveCursor
  };
})(window);
