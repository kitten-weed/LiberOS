// poppet-loop.js — create -> relate -> bind -> prompt.
//
// The read half lives in poppet-readback.js. This is the rest of the loop, and
// it deliberately invents no storage: Liber.state.bindRelation(fromId, verb,
// 'buddy') already existed, already dedupes, and already writes
// {from,to,verb,ts}. The gap was never the record. The gap was that nothing
// ever offered to make one against the poppet.
//
// THE SHAPE, per the author: the artifacts orbit the poppet unrelated until
// they are added. Clicking the poppet opens what is in orbit; choosing one
// drops it into the centre, where the poppet consumes it; the traveller whose
// room that artifact came from then speaks, through the machine, and the line
// can be kept to the journal.
//
// WHO SPEAKS is resolved from the artifact's own store, not from a guess: a
// thing kept in the sea is Vanir's, a thing kept in the garden is Ruby's. Where
// a store has no traveller of its own the summoner answers, because Wanderlust
// owns the Vacui and is the one who gave the voiceless a voice.

(function (global) {
  'use strict';

  if (global.LiberPoppetLoop) return;

  // Store -> traveller. Keyed to the stores KEEP_KINDS already declares.
  var OWNER = {
    crossing: 'vanir',
    divination: 'arcana',
    games: 'whimsy wow',
    learn: 'riason',
    sea: 'vanir',
    garden: 'ruby',
    dreams: 'insightful inquiry',
    journal: 'the mad scribe',
    abstract: 'physius',
    methodology: 'riason',
    graveyard: 'pete',
    council: 'wanderlust',
    buddy: 'wanderlust'
  };

  var STORES = Object.keys(OWNER);

  // AWAITING THE AUTHOR'S APPROVAL, like the prompt banks. A relation needs a
  // verb and the store had no vocabulary for one; 'relates to' is the neutral
  // default already in state.js. These are in-world and deliberately plain.
  var VERBS = ['carries', 'refuses', 'remembers', 'protects', 'owes', 'buried'];

  function st() { return global.Liber && global.Liber.state; }
  function snap() { var s = st(); return (s && s.get()) || {}; }

  function boundIds() {
    var rels = snap().relations || [];
    var out = {};
    for (var i = 0; i < rels.length; i++) {
      if (rels[i] && (rels[i].to || 'buddy') === 'buddy') out[rels[i].from] = true;
    }
    return out;
  }

  // Everything kept, anywhere, that is not already related to the poppet. The
  // poppet itself is excluded: a soul does not orbit itself.
  function inOrbit() {
    var s = snap(), bound = boundIds(), out = [];
    for (var i = 0; i < STORES.length; i++) {
      var store = STORES[i], arr = s[store] || [];
      for (var j = 0; j < arr.length; j++) {
        var e = arr[j];
        if (!e || !e.id || bound[e.id]) continue;
        // Dream keeps in the Journal are mirrors of the Dream artifact, not
        // a second thing to orbit beside it.
        if (store === 'journal' && e.kind === 'dream' && e.ref) continue;
        if (e.kind === 'poppet') continue;
        out.push({
          id: e.id,
          store: store,
          name: e.name || e.title || e.label || ('a kept thing from ' + store),
          traveller: OWNER[store] || 'wanderlust',
          ts: Number(e.ts) || 0
        });
      }
    }
    out.sort(function (a, b) { return b.ts - a.ts; });
    return out;
  }

  function promptFor(traveller) {
    var banks = global.LiberPrompts || {};
    var bank = banks[traveller] || banks.wanderlust;
    if (!bank || !bank.length) return null;
    // Weighted by how much has been related: the further in, the further down
    // the bank, so the questions deepen as the work does rather than at random.
    var depth = (snap().relations || []).length;
    return bank[Math.min(bank.length - 1, depth) % bank.length];
  }

  var api = {
    owners: OWNER,
    verbs: VERBS,
    inOrbit: inOrbit,
    promptFor: promptFor,

    // The bind itself. Returns what was recorded and who answers, so a caller
    // (or a gate) can assert the whole loop ran rather than just the write.
    relate: function (artifactId, verb) {
      var s = st();
      if (!s || !s.bindRelation) return null;
      var all = inOrbit(), item = null;
      for (var i = 0; i < all.length; i++) if (all[i].id === artifactId) { item = all[i]; break; }
      if (!item) return null;
      var rel = s.bindRelation(item.id, verb || 'relates to', 'buddy');
      if (!rel) return null;                      // already related; dedupe held
      var line = promptFor(item.traveller);
      api.last = { relation: rel, artifact: item, traveller: item.traveller, prompt: line };
      api.render(api.last);
      return api.last;
    },

    // Keep the line. The journal is the book of kept things, so it goes there
    // as an entry of its own with the relation that produced it attached.
    keepToJournal: function (spoken) {
      var s = st();
      spoken = spoken || api.last;
      if (!s || !spoken || !spoken.prompt) return null;
      var cur = snap(), arr = (cur.journal || []).slice();
      var entry = {
        id: 'spoken-' + Date.now(),
        kind: 'spoken',
        name: spoken.traveller + ' asked',
        traveller: spoken.traveller,
        body: spoken.prompt,
        from: spoken.artifact && spoken.artifact.id,
        verb: spoken.relation && spoken.relation.verb,
        ts: Date.now()
      };
      arr.push(entry);
      s.set({ journal: arr });
      return entry;
    },

    dismiss: function () {
      var host = document.getElementById('poppet-spoken');
      if (!host) return;
      host.removeAttribute('data-spoken');
      host.textContent = '';
    },

    // The console line. The traveller possesses the machine while their app
    // runs, so the prompt arrives as the machine speaking, not as a dialog.
    render: function (spoken) {
      var host = document.getElementById('poppet-spoken');
      if (!host || !spoken) return;
      host.setAttribute('data-spoken', 'yes');
      host.setAttribute('data-traveller', spoken.traveller || '');
      host.setAttribute('role', 'region');
      host.setAttribute('aria-label', 'relation saved with optional reflection');
      host.setAttribute('aria-live', 'polite');
      host.textContent = '';
      var summary = document.createElement('span');
      summary.className = 'poppet-spoken-summary';
      summary.textContent = 'linked: ' + (spoken.artifact && spoken.artifact.name || 'a kept thing')
        + ' — ' + (spoken.relation && spoken.relation.verb || 'relates to') + ' — the buddy';
      var who = document.createElement('b');
      who.className = 'poppet-spoken-who';
      who.textContent = spoken.traveller;
      var label = document.createElement('span');
      label.className = 'poppet-spoken-label';
      label.textContent = 'optional reflection';
      var line = document.createElement('span');
      line.className = 'poppet-spoken-line';
      line.textContent = spoken.prompt || '';
      var keep = document.createElement('button');
      keep.type = 'button';
      keep.className = 'poppet-spoken-keep';
      keep.textContent = 'keep prompt';
      keep.setAttribute('aria-label', 'keep this optional reflection in the Journal');
      keep.addEventListener('click', function () {
        if (api.keepToJournal(spoken)) {
          keep.disabled = true;
          keep.textContent = 'kept';
        }
      });
      var skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'poppet-spoken-skip';
      skip.textContent = 'skip';
      skip.setAttribute('aria-label', 'skip this optional reflection');
      skip.addEventListener('click', function () { api.dismiss(); });
      host.appendChild(summary);
      host.appendChild(who);
      host.appendChild(label);
      host.appendChild(line);
      host.appendChild(keep);
      host.appendChild(skip);
    },

    // The orbit list. Not a modal: a rail of what is already circling, opened
    // by touching the thing it circles.
    open: function () {
      var rail = document.getElementById('poppet-orbit');
      if (!rail) return;
      var items = inOrbit();
      rail.textContent = '';
      rail.setAttribute('data-open', 'yes');
      rail.setAttribute('data-count', String(items.length));
      rail.setAttribute('role', 'group');
      rail.setAttribute('aria-label', 'kept things that can be related to the buddy');
      var readback = document.getElementById('poppet-readback');
      if (readback) readback.setAttribute('aria-expanded', 'true');
      var heading = document.createElement('div');
      heading.className = 'poppet-orbit-heading';
      heading.textContent = 'unlinked keeps — choose one to relate to the buddy';
      rail.appendChild(heading);
      if (!items.length) {
        var none = document.createElement('i');
        none.className = 'poppet-orbit-none';
        none.textContent = 'no unlinked keeps yet. save an artifact in another room first.';
        rail.appendChild(none);
        return;
      }
      for (var i = 0; i < Math.min(items.length, 8); i++) {
        (function (item) {
          var row = document.createElement('div');
          row.className = 'poppet-orbit-row';
          row.setAttribute('data-store', item.store);
          row.setAttribute('data-artifact', item.id);
          row.setAttribute('role', 'group');
          row.setAttribute('aria-label', 'relation for ' + item.name);
          var name = document.createElement('span');
          name.className = 'poppet-orbit-name';
          name.textContent = item.name;
          var verb = document.createElement('select');
          verb.className = 'poppet-orbit-verb';
          verb.setAttribute('aria-label', 'choose a verb for ' + item.name);
          var placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'choose a verb';
          placeholder.selected = true;
          verb.appendChild(placeholder);
          for (var v = 0; v < VERBS.length; v++) {
            var option = document.createElement('option');
            option.value = VERBS[v];
            option.textContent = VERBS[v];
            verb.appendChild(option);
          }
          var bind = document.createElement('button');
          bind.type = 'button';
          bind.className = 'poppet-orbit-bind';
          bind.textContent = 'relate';
          bind.setAttribute('aria-label', 'relate ' + item.name + ' to the buddy');
          bind.disabled = true;
          verb.addEventListener('change', function () { bind.disabled = !verb.value; });
          bind.addEventListener('click', function () {
            if (!verb.value) return;
            var chosenVerb = verb.value;
            row.setAttribute('data-consumed', 'yes');
            bind.disabled = true;
            // The fall: it drops to the centre and the poppet takes it
            setTimeout(function () {
              var linked = api.relate(item.id, chosenVerb);
              if (linked) {
                api.open();
              } else {
                row.removeAttribute('data-consumed');
                bind.disabled = !verb.value;
                if (heading) heading.textContent = 'that keep is no longer available here. close and reopen the orbit to refresh it.';
              }
            }, prefersReduced() ? 0 : 420);
          });
          row.appendChild(name);
          row.appendChild(verb);
          row.appendChild(bind);
          rail.appendChild(row);
        })(items[i]);
      }
    },

    close: function () {
      var rail = document.getElementById('poppet-orbit');
      if (rail) rail.setAttribute('data-open', 'no');
      var readback = document.getElementById('poppet-readback');
      if (readback) readback.setAttribute('aria-expanded', 'false');
    }
  };

  function prefersReduced() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function wire() {
    var host = document.getElementById('poppet-readback');
    if (!host) return;
    // Only a poppet that exists can be touched. Before the first sitting the
    // centre is empty and touching it would promise something untrue.
    var rb = global.LiberPoppetReadback;
    if (!rb || !rb.exists()) return;
    host.setAttribute('role', 'button');
    host.setAttribute('tabindex', '0');
    host.setAttribute('aria-label', 'relate a kept thing to the poppet');
    host.setAttribute('aria-expanded', 'false');
    host.removeAttribute('aria-hidden');
    host.style.pointerEvents = 'auto';
    host.addEventListener('click', function () {
      var rail = document.getElementById('poppet-orbit');
      if (rail && rail.getAttribute('data-open') === 'yes') api.close(); else api.open();
    });
    host.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var rail = document.getElementById('poppet-orbit');
        if (rail && rail.getAttribute('data-open') === 'yes') api.close(); else api.open();
      }
    });
  }

  global.LiberPoppetLoop = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(wire, 350); });
  } else {
    setTimeout(wire, 350);
  }
})(window);
