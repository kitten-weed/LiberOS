export function createMemorySaver({capture, commit, onError, clock = globalThis}) {
  if (![capture, commit, onError].every(fn => typeof fn === 'function')) {
    throw new TypeError('memory saver requires capture, commit and onError');
  }
  let timer = null;
  let dirty = false;

  function flush({memoryPatch, write} = {}) {
    if (timer !== null) {
      clock.clearTimeout(timer);
      timer = null;
    }
    if (!dirty && memoryPatch === undefined && write === undefined) return true;
    dirty = true;
    try {
      const payload = memoryPatch === undefined ? capture() : memoryPatch;
      const saved = (write === undefined ? commit : write)(payload);
      if (saved !== true) throw new Error('memory commit rejected');
      dirty = false;
      return true;
    } catch (error) {
      onError(error);
      return false;
    }
  }

  return {
    schedule() {
      dirty = true;
      if (timer !== null) clock.clearTimeout(timer);
      timer = clock.setTimeout(() => {
        timer = null;
        flush();
      }, 1200);
    },
    flush,
    get pending() { return dirty; }
  };
}
