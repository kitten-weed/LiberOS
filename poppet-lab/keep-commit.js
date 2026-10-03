import {readKeepsakes, saveKeepsake, mirrorKeepsakeToBuddy} from './keepsake.js';

export function keepEditsLocked(busy, coordinator) {
  return !!busy || !!(coordinator && coordinator.pending);
}

export function createKeepCommit({capture, idPrefix = 'poppet-keep', pending = null}) {
  if (typeof capture !== 'function') throw new TypeError('keep commit requires a capture function');
  let held = pending;
  let done = null;
  let heldPatch = null;

  return {
    get pending() {
      return held;
    },
    commit(mirrorPatch = {}) {
      if (done) return done;
      if (!held) {
        try {
          const {atlasCv, clothCv, spec} = capture();
          held = saveKeepsake(atlasCv, clothCv, spec);
          heldPatch = Object.assign({}, mirrorPatch);
        } catch (error) {
          return {ok: false, stage: 'primary', error};
        }
      }
      if (heldPatch === null) heldPatch = Object.assign({}, mirrorPatch);
      try {
        const saved = readKeepsakes().find(record => record.n === held.record.n);
        if (!saved || JSON.stringify(saved) !== JSON.stringify(held.record)) {
          throw new Error('pending keepsake payload no longer matches the shelf');
        }
        if (!mirrorKeepsakeToBuddy(
          held.record.n,
          held.record.name,
          idPrefix,
          heldPatch
        )) {
          throw new Error('keepsake book mark could not be kept');
        }
      } catch (error) {
        return {
          ok: false,
          stage: 'mirror',
          error,
          record: held.record,
          count: held.count
        };
      }
      done = {ok: true, record: held.record, count: held.count};
      return done;
    }
  };
}
