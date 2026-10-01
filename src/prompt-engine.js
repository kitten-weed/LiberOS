// prompt-engine.js — deterministic, fully offline emergent prompts.
// Listens for relation bindings and composes reflective prompts from
// template + interpretation banks. No network, no Math.random in choices.
// Data source: window.LIBER_DATA (assigned by data/prompt-templates.data.js
// and data/tarot.data.js — file://-safe script wrappers, no fetch).

(function () {
  'use strict';

  function data(name) {
    return (window.LIBER_DATA && window.LIBER_DATA[name]) || null;
  }

  var TEMPLATES = (data('promptTemplates') && data('promptTemplates').templates) || [];
  var CARDS = (data('tarot') && data('tarot').cards) || [];

  // xmur3 string hash + mulberry32 PRNG: same relation → same choices, forever.
  function hashSeed(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h ^= h >>> 16) >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length) % arr.length];
  }

  var FAMILY_FALLBACK = 'any';

  // WS5 "the buddy becomes louder": artifacts+relations drive a tier that
  // gates the intimate template variants. Kept inline (self-contained — this
  // file also runs in scripts/verify-prompt-engine.mjs without gamification.js).
  // Thresholds mirror src/gamification.js presence().
  var BUDDY_TIERS = [2, 6, 12];
  function buddyLevel(s) {
    var kinds = ['divination', 'iching', 'games', 'sea', 'buddy', 'learn', 'council', 'garden', 'dreams'];
    var count = 0;
    for (var i = 0; i < kinds.length; i++) {
      if (Array.isArray(s && s[kinds[i]])) count += s[kinds[i]].length;
    }
    count += ((s && s.relations) || []).length;
    var level = 0;
    for (var j = 0; j < BUDDY_TIERS.length; j++) {
      if (count >= BUDDY_TIERS[j]) level = j + 1;
    }
    return level;
  }

  function verbFamily(verb) {
    var v = (verb || '').toLowerCase();
    if (!v) return FAMILY_FALLBACK;
    if (/protect|guard|shield|defend/.test(v)) return 'protect';
    if (/threat|harm|attack|hurt|wound|endanger/.test(v)) return 'threat';
    if (/mirror|reflect|resemble/.test(v)) return 'mirror';
    if (/carry|hold|bear|keep/.test(v)) return 'carry';
    if (/refuse|deny|reject|block/.test(v)) return 'refuse';
    return FAMILY_FALLBACK;
  }

  function templatesForFamily(family, level) {
    var gated = [];
    var generic = [];
    for (var i = 0; i < TEMPLATES.length; i++) {
      var t = TEMPLATES[i];
      if (t.minBuddy && (level || 0) < t.minBuddy) continue;
      var verbs = t.verbs || ['any'];
      if (verbs.indexOf('any') !== -1) generic.push(t);
      else if (verbs.indexOf(family) !== -1) gated.push(t);
    }
    return gated.length ? gated : (generic.length ? generic : []);
  }

  function state() {
    return (window.Liber && window.Liber.state) ? window.Liber.state : null;
  }

  function allArtifacts(s) {
    var kinds = ['divination', 'iching', 'games', 'sea', 'buddy', 'journal', 'learn', 'council', 'garden', 'dreams'];
    var out = [];
    for (var i = 0; i < kinds.length; i++) {
      var arr = s[kinds[i]];
      if (Array.isArray(arr)) out = out.concat(arr);
    }
    return out;
  }

  function artifactById(s, id) {
    var arr = allArtifacts(s);
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] && arr[i].id === id) return arr[i];
    }
    return null;
  }

  function cardFor(entry) {
    var name = ((entry && (entry.name || entry.title)) || '').toLowerCase();
    for (var i = 0; i < CARDS.length; i++) {
      if (CARDS[i].name === name) return CARDS[i];
    }
    return null;
  }

  function buddyName(s) {
    var st = state();
    var raw = '';
    var sig = (((s && s.buddy) || []).filter(function (e) { return e && e.kind === 'stone'; }))[0];
    var intent = sig && typeof sig.intention === 'string' ? sig.intention.trim() : '';
    raw = intent || 'your buddy';
    try {
      if (st && st.displayBuddyName) return st.displayBuddyName(raw);
    } catch (e) {}
    return raw || 'your buddy';
  }

  function buddyTags(s) {
    try {
      var st = state();
      if (st && st.getBuddyTags) {
        var t = st.getBuddyTags();
        if (t && t.length) return t;
      }
    } catch (e) {}
    var sig2 = (((s && s.buddy) || []).filter(function (e) { return e && e.kind === 'stone'; }))[0];
    if (sig2 && Array.isArray(sig2.tags) && sig2.tags.length) return sig2.tags.slice();
    return [];
  }

  function tagPhrase(s) {
    var tags = buddyTags(s);
    if (!tags.length) return '';
    if (tags.length === 1) return 'as ' + tags[0];
    return 'as ' + tags.slice(0, -1).join(', ') + ' and ' + tags[tags.length - 1];
  }

  function intention(s) {
    var sig = (((s && s.buddy) || []).filter(function (e) { return e && e.kind === 'stone'; }))[0];
    return (sig && typeof sig.intention === 'string' && sig.intention.trim()) || 'the intention you cast';
  }

  function fillSlots(text, slots, rng) {
    var out = text;
    for (var key in slots) {
      if (!Object.prototype.hasOwnProperty.call(slots, key)) continue;
      var values = slots[key];
      if (!Array.isArray(values) || !values.length) values = [key === 'buddy' ? 'your buddy' : 'it'];
      var value = values.length > 1 ? pick(rng, values) : values[0];
      out = out.split('{' + key + '}').join(value);
    }
    return out;
  }

  function unresolvedTokens(text) {
    return /\{[a-z]+\}/.test(text) || /\{\}/.test(text);
  }

  // salt (optional): a second caller (src/gamification.js ambient prompts)
  // composes the same relation with a different seed so the machine can
  // speak first without repeating itself.
  function compose(relation, salt) {
    var s = state() ? state().get() : {};
    var family = verbFamily(relation.verb);
    var candidates = templatesForFamily(family, buddyLevel(s));
    if (!candidates.length) return null;

    var seedStr = (relation.from || '') + '|' + (relation.verb || '');
    if (salt) seedStr += '|' + salt;
    var rng = mulberry32(hashSeed(seedStr));

    var entry = artifactById(s, relation.from);
    var card = cardFor(entry);
    var fragments = (card && card.upright && card.upright.length) ? card.upright.slice() : [];
    var artifactLabel = (entry && (entry.name || entry.title)) || 'this artifact';
    var tags = buddyTags(s);
    var tagP = tagPhrase(s);

    var slots = {
      interpretation: fragments.length ? fragments : [artifactLabel],
      buddy: [buddyName(s)],
      artifact: [artifactLabel],
      verb: [relation.verb || 'relates to'],
      intention: [intention(s)],
      tags: [tags.length ? tags.join(', ') : 'the unmarked'],
      tagphrase: [tagP || 'in its own shape'],
    };

    var template = pick(rng, candidates);
    var text = fillSlots(template.text, slots, rng);
    if (unresolvedTokens(text)) return null;
    text = text.charAt(0).toUpperCase() + text.slice(1);
    text = text.replace(/([.?!]\s+)([a-z])/g, function (m, p1, p2) { return p1 + p2.toUpperCase(); });
    text = text.replace(/\s+/g, ' ').trim();
    if (!/[.?!]$/.test(text)) text += '.';

    return {
      id: 'prompt-' + hashSeed(seedStr + '|' + template.id).toString(36),
      text: text,
      templateId: template.id,
      relationFrom: relation.from,
      verb: relation.verb || 'relates to',
      ts: Date.now(),
    };
  }

  var listeners = [];

  function emit(prompt) {
    listeners.forEach(function (fn) {
      try { fn(prompt); } catch (e) { console.warn('prompt listener failed', e); }
    });
    try {
      document.dispatchEvent(new CustomEvent('liber:prompt', { detail: prompt }));
    } catch (e) { console.warn('prompt event failed', e); }
  }

  function generate() {
    var st = state();
    if (!st) return [];
    var s = st.get();
    var relations = s.relations || [];
    var existing = s.prompts || [];
    var seen = {};
    for (var i = 0; i < existing.length; i++) {
      seen[existing[i].relationFrom + '|' + existing[i].verb + '|' + (existing[i].relationTo || 'buddy')] = true;
    }
    var fresh = [];
    for (var j = 0; j < relations.length; j++) {
      var rel = relations[j];
      var key = rel.from + '|' + (rel.verb || 'relates to') + '|' + (rel.to || 'buddy');
      if (seen[key]) continue;
      var prompt = compose(rel);
      if (!prompt) continue;
      prompt.relationTo = rel.to || 'buddy';
      fresh.push(prompt);
      seen[key] = true;
    }
    if (fresh.length) {
      st.set({ prompts: existing.concat(fresh) });
      for (var k = 0; k < fresh.length; k++) emit(fresh[k]);
    }
    return fresh;
  }

  function onPrompt(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  window.Liber = window.Liber || {};
  window.Liber.prompts = { compose: compose, generate: generate, onPrompt: onPrompt };

  if (window.Liber.state && window.Liber.state.on) {
    window.Liber.state.on('change', function () {
      try { generate(); } catch (e) { console.warn('prompt engine failed', e); }
    });
  }
})();
