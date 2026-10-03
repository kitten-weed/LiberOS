// state.js — localStorage-backed state + simple pub/sub
// Persists across the four states. Each page reads/writes here.

(function (global) {
  'use strict';

  const SLOT_KEY = 'liber_vacui_slot';
  const SLOTS = ['play', 'keep', 'show'];
  var slot = 'keep';
  try { slot = localStorage.getItem(SLOT_KEY) || 'keep'; } catch (e) { slot = 'keep'; }
  if (SLOTS.indexOf(slot) < 0) slot = 'keep';
  const KEY = 'liber_vacui_v1__' + slot;
  const LEGACY_KEY = 'liber_vacui_v1';
  const CUTSCENE_BUILD = 'handshake1';

  const DEFAULT = {
    cutsceneBuild: CUTSCENE_BUILD,
    state: 'boot',           // boot | loading | desktop
    tutorialDone: false,
    tutorialPaused: false,
    tutorialRitualLine: 0,
    tutorialStage: null,
    firstRite: null,          // versioned opening quiz and specimen-choice recovery
    enterRiteDone: false,
    keysNamed: false,      // Wanderlust named the console in the opening;
                           // the dock stays quiet until then (crt-bay.js)
    travellerAlias: '',      // optional local name for the chat traveller,
                           // chosen in the handshake close (pitch §07 D→name)
    buddy: [],              // buddy artifacts: stone casts (kind stone) + sealed chats (kind sealed)
    relations: [],           // sigil <- artifact edges
    divination: [],          // cards drawn from arcana
    games: [],               // saved game artifacts
    learn: [],               // promoted lessons
    abstract: [],            // abstract creations
    sea: [],                 // sea artifacts
    seaTide: { releases: 0, level: 0 },    // ROOM 06 brass tide clock: the waterline memory across visits
    graveyard: [],          // buried artifacts, awaiting the dig
    crossing: [],           // vanir artifacts: sealed thoughts kept from the crossing
    journal: [],            // journal items
    methodology: [],        // methodology artifacts
    council: [],            // council artifacts
    garden: [],             // ruby's garden — planted seeds / flowers in bloom
    tree: null,              // ruby's glasshouse tree — one plant, grown between visits (garden/tree.js)
                             //   read-only here: the room and the window box mirror it, never write it
    dreams: [],             // recorded dreams, kept for interpretation
    daily: null,            // the day's small works { date: 'YYYY-MM-DD', done: [ids] }
    theme: 'corrupted',      // current skin of the machine
    crt: { intensity: 0.4, off: false },   // the tube's bloom; per-room material reads it (see liberdev/crt-decision.md)
    resolution: 'auto',      // the machine's held width, one of src/stage.js's steps ('auto' = largest that fits)
    shadowUnlocked: false,   // has the user entered the extc password
    shadowOn: false,         // is shadow overdrive active
    tutorialResidue: null,   // material evidence left by a safely completed tutorial breach
    sounds: true,            // synthesized UI sounds (WS4, src/sound.js)
    visited: {},             // visitor id -> last visited
    sessionStart: 0,         // ts of the current visit's start (WS5 session arc)
    arcShownFor: 0,          // sessionStart the sea-arc line was shown for (once per visit)
    bests: {},               // per-booth personal bests { boothId: value } (WS5)
    ambient: null,           // per-visit ambient prompt bookkeeping { seed, fired: [] }
    chat: null,              // liberchat: exchanges per persona { sigil: 2, games: 6, ... }
    affinity: null,          // relationship-kept scores per traveller { whimsy: n, ... }
    unlocks: null,           // affinity unlocks { toybox: true, ... }
    unlocksSeen: null,       // invite lines already shown [ids]
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw && slot === 'keep') raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return Object.assign({}, DEFAULT);
      const parsed = JSON.parse(raw);
      // A legacy save that still carries pre-migration keys (sigils, cohort)
      // is a returning visitor, not a new build — read before the deletes below.
      var legacyKeys = Array.isArray(parsed.sigils) || Array.isArray(parsed.cohort);
      if (Array.isArray(parsed.cohort) && (!Array.isArray(parsed.buddy) || parsed.buddy.length === 0)) {
        parsed.buddy = parsed.cohort;
        delete parsed.cohort;
      }
      if (Array.isArray(parsed.sigils) && parsed.sigils.length) {
        var stone = parsed.sigils.map(function (e) { return Object.assign({}, e, { kind: 'stone' }); });
        parsed.buddy = stone.concat(Array.isArray(parsed.buddy) ? parsed.buddy : []);
        delete parsed.sigils;
      } else {
        delete parsed.sigils;
      }
      if (Array.isArray(parsed.buddy)) {
        parsed.buddy = parsed.buddy.map(function (e) { return (e && !e.kind) ? Object.assign({}, e, { kind: 'sealed' }) : e; });
      }
      if (Array.isArray(parsed.relations)) {
        parsed.relations = parsed.relations.map(function (r) { return (r && r.to === 'sigil') ? Object.assign({}, r, { to: 'buddy' }) : r; });
      }
      // The book was called the satchel. The name changed; what was filed in it
      // did not — the shelf behind the CRT counts these, and a rename that
      // empties the shelf is a rename that ate someone's keeps.
      if (Array.isArray(parsed.satchel) && parsed.satchel.length &&
          (!Array.isArray(parsed.journal) || parsed.journal.length === 0)) {
        parsed.journal = parsed.satchel;
      }
      delete parsed.satchel;
      // A legacy save (flagged above) skips the shelve: the migration just
      // rescued those keeps, and burying them now would eat them. The build
      // stamp still advances so the next load takes the normal path.
      if (parsed.cutsceneBuild !== CUTSCENE_BUILD) {
        parsed.cutsceneBuild = CUTSCENE_BUILD;
        var retours = ['walkJournal', 'walkSea', 'walkAbstract', 'walkDivination', 'walkDreams', 'walkGarden', 'walkGames', 'walkMethod', 'walkThemes', 'walkRelation', 'walkTrash', 'walkSigil', 'walkLearn'];
        for (var ri = 0; ri < retours.length; ri++) delete parsed[retours[ri]];
        if (!legacyKeys) {
          var shelve = ['buddy', 'relations', 'divination', 'games', 'learn', 'abstract', 'sea', 'garden', 'dreams'];
          var grave = Array.isArray(parsed.graveyard) ? parsed.graveyard.slice() : [];
          var now = Date.now(), k, i;
          for (k = 0; k < shelve.length; k++) {
            var arr = parsed[shelve[k]];
            if (Array.isArray(arr) && arr.length) {
              for (i = 0; i < arr.length; i++) grave.push({ kind: shelve[k], entry: arr[i], buriedAt: now });
              parsed[shelve[k]] = [];
            }
          }
          parsed.graveyard = grave;
          parsed.tutorialDone = false;
          parsed.tutorialStage = null;
        }
      }
      // The toybox retired to archive/toybox/ and memory took its dock slot;
      // old saves may still carry its ledger entries. They are ghosts — no
      // page renders them — so they are swept here, once per load.
      if (parsed.visited && typeof parsed.visited === 'object') {
        var v = parsed.visited;
        if ('toybox' in v) { delete v.toybox; }
      }
      if (parsed.unlocks && typeof parsed.unlocks === 'object' && 'toybox' in parsed.unlocks) {
        delete parsed.unlocks.toybox;
      }
      return Object.assign({}, DEFAULT, parsed);
    } catch (e) {
      return Object.assign({}, DEFAULT);
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      diag('save', { ok: 1 });
    } catch (e) {
      // Session still works for the visit; the failure is recorded below.
      diag('save-fail', { err: String(e).slice(0, 120) });
    }
  }

  // Diagnostic ring for wrapper debugging — keep, it caught the bfcache clobber.
  function diag(event, extra) {
    try {
      const raw = localStorage.getItem('liber_diag');
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(Object.assign({ t: Date.now(), e: event, sig: (state.buddy || []).filter(function (e) { return e && e.kind === 'stone'; }).length }, extra || {}));
      while (arr.length > 60) arr.shift();
      localStorage.setItem('liber_diag', JSON.stringify(arr));
    } catch (e) { /* never break the room */ }
  }

  const subscribers = {};
  let state = load();

  function get() { return state; }

  function set(patch) {
    diag('set', { k: Object.keys(patch).join(',') });
    state = Object.assign({}, state, patch);
    save(state);
    emit('change', state);
  }

  function trySet(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      diag('save-fail', { op: 'trySet', err: 'invalid patch' });
      return false;
    }
    const next = Object.assign({}, state, patch);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (error) {
      diag('save-fail', { err: String(error).slice(0, 120), op: 'trySet' });
      return false;
    }
    state = next;
    diag('save', { ok: 1, op: 'trySet' });
    emit('change', state);
    return true;
  }

  function stableJson(value) {
    if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
    if (value && typeof value === 'object') {
      return '{' + Object.keys(value).sort().map(function (key) {
        return JSON.stringify(key) + ':' + stableJson(value[key]);
      }).join(',') + '}';
    }
    return JSON.stringify(value);
  }

  function tryAddArtifact(kind, entry, extraPatch) {
    const collections = [
      'buddy', 'divination', 'games', 'learn', 'abstract', 'sea',
      'graveyard', 'crossing', 'journal', 'methodology', 'council',
      'garden', 'dreams'
    ];
    if (collections.indexOf(kind) < 0 || !Array.isArray(state[kind]) ||
        !entry || typeof entry !== 'object' || Array.isArray(entry) ||
        typeof entry.id !== 'string' || !entry.id.trim() ||
        !Number.isFinite(entry.ts)) {
      diag('artifact-fail', { op: 'tryAddArtifact', kind: String(kind).slice(0, 40), err: 'invalid target or identity' });
      return null;
    }
    if (extraPatch !== undefined &&
        (!extraPatch || typeof extraPatch !== 'object' || Array.isArray(extraPatch))) {
      diag('artifact-fail', { op: 'tryAddArtifact', kind: kind, err: 'invalid patch' });
      return null;
    }

    let prepared;
    try {
      const encoded = JSON.stringify(entry);
      if (typeof encoded !== 'string') throw new Error('entry is not serializable');
      prepared = JSON.parse(encoded);
    } catch (error) {
      diag('artifact-fail', { op: 'tryAddArtifact', kind: kind, err: String(error).slice(0, 120) });
      return null;
    }

    const current = state[kind];
    const existing = current.find(function (item) {
      return item && item.id === prepared.id;
    });
    if (existing) {
      let identical = false;
      try { identical = stableJson(existing) === stableJson(prepared); } catch (error) { identical = false; }
      if (!identical) {
        diag('artifact-fail', { op: 'tryAddArtifact', kind: kind, err: 'conflicting identity' });
        return null;
      }
      if (extraPatch === undefined || Object.keys(extraPatch).length === 0) return existing;
      const repeatPatch = Object.assign({}, extraPatch);
      repeatPatch[kind] = current.slice();
      return trySet(repeatPatch) ? existing : null;
    }

    const artifacts = current.slice();
    artifacts.push(prepared);
    const patch = Object.assign({}, extraPatch || {});
    patch[kind] = artifacts;
    if (!trySet(patch)) return null;
    emit('artifact', { kind: kind, entry: prepared });
    return prepared;
  }

  function on(event, fn) {
    if (!subscribers[event]) subscribers[event] = [];
    subscribers[event].push(fn);
    return () => {
      const arr = subscribers[event];
      if (arr) {
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
      }
    };
  }

  function emit(event, payload) {
    const arr = subscribers[event];
    if (!arr) return;
    for (const fn of arr) {
      try { fn(payload); } catch (e) { /* don't let one subscriber break the others */ }
    }
  }

  function reset() {
    state = Object.assign({}, DEFAULT);
    save(state);
    emit('change', state);
  }

  function addArtifact(kind, data) {
    var entry = Object.assign({ id: kind + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), ts: Date.now() }, data);
    var arr = state[kind] ? state[kind].slice() : [];
    arr.push(entry);
    state = Object.assign({}, state);
    state[kind] = arr;
    save(state);
    emit('change', state);
    emit('artifact', { kind: kind, entry: entry });
    return entry;
  }

  // Amend an existing artifact in place (associations added to a dream,
  // a flower painted further). ts (the making date) is kept; updated moves.
  function updateArtifact(kind, id, patch) {
    if (!state[kind]) return null;
    var arr = state[kind].slice();
    var idx = -1;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] && arr[i].id === id) { idx = i; break; }
    }
    if (idx < 0) return null;
    var entry = Object.assign({}, arr[idx], patch, { updated: Date.now() });
    arr[idx] = entry;
    state = Object.assign({}, state);
    state[kind] = arr;
    save(state);
    emit('change', state);
    emit('artifact', { kind: kind, entry: entry });
    return entry;
  }

  function bindRelation(fromId, verb, toId) {
    var to = toId || 'buddy';
    var relationVerb = verb || 'relates to';
    var relations = (state.relations || []).slice();
    if (relations.some(function (r) { return r.from === fromId && (r.verb || 'relates to') === relationVerb && ((r.to || 'buddy') === to); })) return null;
    var rel = { from: fromId, to: to, verb: relationVerb, ts: Date.now() };
    relations.push(rel);
    return trySet({ relations: relations }) ? rel : null;
  }

  function unbindRelation(fromId, toId) {
    if (toId) {
      state.relations = (state.relations || []).filter(function (r) { return !(r.from === fromId && (r.to || 'buddy') === toId); });
    } else {
      state.relations = (state.relations || []).filter(function (r) { return r.from !== fromId; });
    }
    state = Object.assign({}, state);
    save(state);
    emit('change', state);
  }

  // Relation margin notes — the journal writes here; the ledger reads here.
  function setRelationNote(fromId, note) {
    var relations = (state.relations || []).slice();
    var touched = false;
    for (var i = 0; i < relations.length; i++) {
      if (relations[i].from === fromId) {
        relations[i] = Object.assign({}, relations[i], { note: String(note || '') });
        touched = true;
      }
    }
    if (!touched) return null;
    state = Object.assign({}, state, { relations: relations });
    save(state);
    emit('change', state);
    return true;
  }

  function childrenOf(artifactId) {
    return (state.relations || []).filter(function (r) { return (r.to || 'buddy') === artifactId; });
  }

  // ── buddy tags + name sanitization ──────────────────────────────────
  // Tags: Jungian individuation concepts chosen when the stone is named.
  // Stored on the stone entry as tags:[]. Sanitization strips leading
  // ownership/wish prefixes so prompts can speak grammatically:
  // "My animus" -> core "animus", display "your animus".
  var BUDDY_TAGS = ['shadow', 'anima', 'animus', 'persona', 'self', 'ego',
    'trickster', 'wise old', 'great mother', 'puer', 'senex', 'hero',
    'maiden', 'mother', 'father', 'child', 'sage', 'ruler', 'creator',
    'lover', 'jester', 'caregiver', 'explorer', 'rebel', 'magician',
    'innocent', 'orphan', 'warrior', 'syzygy', 'individuation'];

  function sanitizeBuddyCore(raw) {
    var t = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
    if (!t) return '';
    var low = t.toLowerCase();
    var prefixes = ['i want my ', 'i want a ', 'i want the ', 'i want ',
      'i wish for my ', 'i wish for ', 'i wish ', 'i need my ', 'i need ',
      'my own ', 'my ', 'a ', 'an ', 'the ', "i'm ", 'i am ', 'i feel ',
      'being ', 'to be '];
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < prefixes.length; i++) {
        if (low.indexOf(prefixes[i]) === 0) {
          t = t.slice(prefixes[i].length).replace(/^\s+/, '');
          low = t.toLowerCase();
          changed = true;
          break;
        }
      }
    }
    return t.trim();
  }

  function displayBuddyName(raw) {
    var core = sanitizeBuddyCore(raw);
    if (!core) return 'your buddy';
    // Short noun-like cores get a possessive; long intention sentences stay.
    var words = core.split(/\s+/);
    if (core.length <= 32 && words.length <= 3) {
      if (/^your\s+/i.test(core) || /^our\s+/i.test(core)) return core;
      return 'your ' + core;
    }
    return core;
  }

  function getBuddyTags() {
    var stones = (state.buddy || []).filter(function (e) { return e && e.kind === 'stone'; });
    if (!stones.length) return [];
    return Array.isArray(stones[0].tags) ? stones[0].tags.slice() : [];
  }

  function setBuddyTags(tags) {
    var all = (state.buddy || []).slice();
    var idx = -1;
    for (var i = 0; i < all.length; i++) {
      if (all[i] && all[i].kind === 'stone') { idx = i; break; }
    }
    if (idx < 0) return null;
    var clean = [];
    for (var j = 0; j < (tags || []).length; j++) {
      var t = String(tags[j] || '').toLowerCase().trim();
      if (t && BUDDY_TAGS.indexOf(t) >= 0 && clean.indexOf(t) < 0) clean.push(t);
      else if (t && BUDDY_TAGS.indexOf(t) < 0 && t.length <= 24 && clean.indexOf(t) < 0 && /^[a-z][a-z \-']*$/.test(t)) clean.push(t);
    }
    all[idx] = Object.assign({}, all[idx], { tags: clean });
    state = Object.assign({}, state, { buddy: all });
    save(state);
    emit('change', state);
    return clean;
  }

  function releaseArtifact(kind, id) {
    if (!state[kind]) return false;
    var found = state[kind].some(function (a) { return a.id === id; });
    if (!found) return false;
    state[kind] = state[kind].filter(function (a) { return a.id !== id; });
    state = Object.assign({}, state);
    save(state);
    emit('change', state);
    return true;
  }

  function replaceSigil(sigil) {
    var sealed = (state.buddy || []).filter(function (e) { return !e || e.kind !== 'stone'; });
    state.buddy = [Object.assign({}, sigil, { kind: 'stone' })].concat(sealed);
    state = Object.assign({}, state);
    save(state);
    emit('change', state);
  }

  // WebKit's page cache (bfcache) restores a page with the JS snapshot it
  // had when hidden — including this module's in-memory state. If another
  // page wrote since, memory is stale and the next set() clobbers the
  // newer disk state (reported: cast -> back -> the cast is gone).
  // Resync on EVERY pageshow: WKWebView reports persisted=false on restores
  // of tauri:// pages, so gating on it skips the one path that needs this.
  window.addEventListener('pageshow', function (e) {
    diag('pageshow', { p: e.persisted ? 1 : 0 });
    state = load();
    emit('change', state);
  });

  global.Liber = global.Liber || {};
  function getSlot() { return slot; }
  function setSlot(id) {
    if (SLOTS.indexOf(id) < 0) return;
    try { localStorage.setItem(SLOT_KEY, id); } catch (e) { return; }
    window.location.reload();
  }

  global.Liber.state = { get, set, trySet, tryAddArtifact, diagnose: diag, on, reset, addArtifact, updateArtifact, bindRelation, unbindRelation, releaseArtifact, replaceSigil, getSlot, setSlot, setRelationNote, childrenOf, sanitizeBuddyCore, displayBuddyName, getBuddyTags, setBuddyTags, BUDDY_TAGS };
})(window);
