(function (global) {
  'use strict';

  var FLOW = 'desktop-opening-v2';
  var LEGACY_FLOW = 'craft-first-v1';
  var ORDER = [
    'opening-y-01', 'opening-y-02', 'opening-y-03', 'opening-y-04',
    'opening-y-05', 'opening-y-06', 'opening-y-07', 'summoning-verse',
    'wanderlust-arrival', 'y-asks-who', 'wanderlust-names-herself',
    'manat-manifestation', 'fates-threefold', 'morrigan-threefold',
    'wanderlust-returns', 'y-asks-why', 'vacui-extracts', 'vacui-anomalies',
    'wanderlust-finds-machine', 'wanderlust-fourth-wall',
    'wanderlust-invites-travellers', 'time-travel-action',
    'wanderlust-praise', 'y-celebrates', 'wanderlust-first-making',
    'first-rite', 'post-rite-compliment', 'y-accepts',
    'wanderlust-mutual-care', 'mutual-care-promise', 'y-care-reply',
    'wanderlust-parting-words', 'final-inscription'
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

  function cursorAt(index, migrated, hasKeep) {
    var patch = patchAt(index);
    if (migrated) {
      patch = Object.assign(patch, {
        tutorialPaused: false,
        tutorialRitualLine: 0,
        tutorialStage: null,
        tutorialResidue: null,
        tutorialPromise: null,
        tutorialTimeTravelDone: false,
        tutorialFinaleShown: false,
        keysNamed: false
      });
    }
    return {
      blocked: false,
      id: index === ORDER.length ? null : ORDER[index],
      index: index,
      migrated: !!migrated,
      hasKeep: !!hasKeep,
      patch: patch
    };
  }

  function blocked(reason, id) {
    return {
      blocked: true,
      reason: reason,
      id: id || null,
      index: null,
      migrated: false,
      patch: null
    };
  }

  function foldedWords(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function promiseMatches(value, alias) {
    var expected = foldedWords('I will be nice to little ' + String(alias == null ? '' : alias));
    var typed = foldedWords(value);
    if (!expected || typed === expected) return !!expected;
    if (typed.indexOf(expected) !== 0) return false;
    return /^\s*[.!?…]+$/.test(typed.slice(expected.length));
  }

  function resolveCursor(state, hasKeep) {
    var saved = state && typeof state === 'object' ? state : {};
    if (saved.tutorialDone) return cursorAt(ORDER.length, false, hasKeep);

    if (saved.tutorialFlow === FLOW) {
      if (saved.tutorialBeatId === null && saved.tutorialBeat === ORDER.length) {
        return cursorAt(ORDER.length, false, hasKeep);
      }
      var currentIndex = ORDER.indexOf(saved.tutorialBeatId);
      return currentIndex < 0
        ? blocked('unknown tutorial beat ID', saved.tutorialBeatId)
        : cursorAt(currentIndex, false, hasKeep);
    }

    var legacyCursor = saved.tutorialFlow === LEGACY_FLOW ||
      (saved.tutorialFlow == null && (
        saved.tutorialBeatId != null ||
        Number.isInteger(saved.tutorialBeat) ||
        saved.tutorialStage != null ||
        saved.keysNamed === true
      ));
    if (legacyCursor) return cursorAt(0, true, hasKeep);
    if (saved.tutorialFlow != null) {
      return blocked('unknown tutorial flow marker', saved.tutorialFlow);
    }
    return cursorAt(0, false, hasKeep);
  }

  global.LiberTutorialFlow = {
    FLOW: FLOW,
    LEGACY_FLOW: LEGACY_FLOW,
    ORDER: ORDER.slice(),
    patchAt: patchAt,
    promiseMatches: promiseMatches,
    resolveCursor: resolveCursor
  };
})(window);
