// journal.js — riason's folio. Three drawers (buddies, artifacts, knots)
// as index tab-cards on the verso; the note page as the recto leaf. Marks
// (ink colours, highlighter + attached notes) persist per item. The bell
// summons riason: first time he teaches through the recall ritual, after
// that straight to the teaching lines. No shared imports.

(function () {
  var list = document.getElementById('journal-list');
  var drawers = document.getElementById('journal-drawers');
  var titleEl = document.getElementById('journal-note-title');
  var dateEl = document.getElementById('journal-note-date');
  var intentEl = document.getElementById('journal-intention');
  var editor = document.getElementById('journal-editor');
  var toolsEl = document.getElementById('journal-tools');
  var polaroid = document.getElementById('journal-polaroid');
  var pop = document.getElementById('journal-pop');
  var popText = document.getElementById('journal-pop-text');
  var popNote = document.getElementById('journal-pop-note');
  var exit = document.getElementById('journal-exit'); // PORT: now the ribbon
  var findEl = document.getElementById('journal-find');
  var slipEl = document.getElementById('journal-slip');
  var spineEl = document.getElementById('journal-spine');
  var bindingEl = document.querySelector('.journal-binding');
  var summonEl = document.getElementById('journal-summon');
  var chatEl = document.getElementById('journal-chat');
  var chatTextEl = document.getElementById('journal-chat-text');
  var chatGateEl = document.getElementById('journal-chat-gate');
  var chatSkipEl = document.getElementById('journal-chat-skip');
  var recallEl = document.getElementById('journal-recall');
  var recallLineEl = document.getElementById('journal-recall-line');
  var recallSkipEl = document.getElementById('journal-recall-skip');

  function isTypingTarget(el) {
    return !!(el && (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName)));
  }

  function st() { return (window.Liber && window.Liber.state) || null; }
  function getS() { return (st() && st().get()) || {}; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(ts) {
    if (!ts) return '— —';
    var d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  }

  // artifact kinds gathered under the artifacts drawer (old shapes and
  // methods included so earlier saves still open).
  var KINDS = [
    { kind: 'divination', label: 'cards', get: function (s) { return (s.divination || []).concat(s.iching || []); }, name: function (a) { return a.name || 'a card'; } },
    { kind: 'games', label: 'games', get: function (s) { return s.games || []; }, name: function (a) { return a.name || 'a game'; } },
    { kind: 'learn', label: 'lessons', get: function (s) { return s.learn || []; }, name: function (a) { return a.topic || 'a lesson'; } },
    { kind: 'abstract', label: 'shapes', get: function (s) { return s.abstract || []; }, name: function (a) { return a.label || 'a shape'; } },
    { kind: 'sea', label: 'releases', get: function (s) { return s.sea || []; }, name: function (a) { return (a.text || 'a release').slice(0, 60); } },
    { kind: 'garden', label: 'seeds', get: function (s) { return s.garden || []; }, name: function (a) { return a.name || 'a seed'; } },
    { kind: 'dreams', label: 'dreams', get: function (s) { return s.dreams || []; }, name: function (a) { return a.title || 'a dream'; } },
    { kind: 'methodology', label: 'methods', get: function (s) { return s.methodology || []; }, name: function (a) { return a.topic || a.name || 'a method'; } },
    { kind: 'journal', label: 'kept in journal', get: function (s) { return s.journal || []; }, name: function (a) { return a.name || a.text || a.excerpt || a.kind || 'kept'; } }
  ];

  function getSigs() {
    var s = getS();
    return ((s.buddy || []).filter(function (e) { return e && (e.kind === 'stone' || e.kind === 'poppet'); }));
  }
  function getSealed() {
    var s = getS();
    return ((s.buddy || []).filter(function (e) { return !e || (e.kind !== 'stone' && e.kind !== 'poppet'); }));
  }

  function artifactById(id) {
    var s = getS();
    for (var i = 0; i < KINDS.length; i++) {
      var arr = KINDS[i].get(s);
      for (var j = 0; j < arr.length; j++) {
        if (arr[j] && arr[j].id === id) return { kind: KINDS[i].kind, data: arr[j] };
      }
    }
    var stones = getSigs();
    for (var k = 0; k < stones.length; k++) {
      if (stones[k] && stones[k].id === id) return { kind: 'stone', data: stones[k] };
    }
    return null;
  }

  function artifactName(id) {
    var hit = artifactById(id);
    if (!hit) return '';
    if (hit.kind === 'stone') return hit.data.name || hit.data.intention || 'the poppet';
    for (var i = 0; i < KINDS.length; i++) {
      if (KINDS[i].kind === hit.kind) return KINDS[i].name(hit.data) || hit.data.name || hit.kind;
    }
    return hit.data.name || hit.data.title || hit.data.label || hit.kind;
  }

  function relationTargetName(rel) {
    if (!rel || (rel.to || 'buddy') === 'buddy') {
      var buddies = getSigs();
      if (buddies.length === 1) return (buddies[0].name || 'the buddy') + ' (buddy)';
      return 'the buddy';
    }
    return artifactName(rel.to) || 'a kept thing';
  }

  function relationLabel(rel) {
    if (!rel) return 'a kept thing relates to the buddy';
    return (artifactName(rel.from) || 'a kept thing') + ' '
      + (rel.verb || 'relates to') + ' ' + relationTargetName(rel);
  }

  function relationKey(rel, idx) {
    return [
      rel && rel.from || '',
      rel && rel.to || 'buddy',
      rel && rel.verb || 'relates to',
      rel && rel.ts || idx
    ].join('|');
  }

  function bodyOf(type, d) {
    d = d || {};
    if (type === 'stone') {
      if (d.kind === 'poppet') return 'poppet · ' + (d.name || 'unnamed');
      return d.intention || '(no intention recorded)';
    }
    if (type === 'sea') return d.text || '';
    if (type === 'buddy') return d.confession || d.intention || d.name || '';
    if (type === 'dreams') return ((d.title ? d.title + ' — ' : '') + (d.text || '')).trim();
    if (type === 'divination') return [d.question, d.reading, d.name].filter(Boolean).join(' — ');
    if (type === 'games') return (d.result && d.result.lines) || d.result || d.name || '';
    if (type === 'garden') return d.name || '';
    if (type === 'learn') return d.topic || '';
    if (type === 'abstract') return d.label || '';
    if (type === 'methodology') return d.topic || d.name || '';
    if (type === 'journal') return d.text || d.excerpt || d.name || d.kind || '';
    if (type === 'relation') return relationLabel(d);
    return d.name || d.title || d.text || '';
  }

  // where a kept thing was made — the slip out of the book goes home
  var HOME = {
    stone: ['sigil.html', 'the poppet'],
    buddy: ['buddy.html', 'the lamp'],
    divination: ['divination.html', 'the felt table'],
    iching: ['divination.html', 'the felt table'],
    games: ['games.html', 'the midway'],
    learn: ['learn.html', 'the shelf'],
    abstract: ['sigil.html', 'the bench'],
    sea: ['vanir.html', 'the water'],
    garden: ['garden.html', 'the glasshouse'],
    dreams: ['dreams.html', 'the fog'],
    methodology: ['learn.html', 'the shelf'],
    relation: ['desktop.html', 'the constellation']
  };

  function slipFor(type) { return HOME[type] || null; }

  function isUnread(type, id) {
    if (type === 'stone' || type === 'relation' || type === 'buddy') return false;
    var s = getS();
    return !((s.read || {})[id]);
  }

  function markRead(item) {
    if (!st() || item.type === 'stone' || item.type === 'relation' || item.type === 'buddy') return;
    var reg = (getS().read || {});
    if (reg[item.id]) return;
    reg[item.id] = Date.now();
    st().set({ read: reg });
  }

  function unreadCount() {
    var s = getS();
    var reg = s.read || {};
    var n = 0, total = 0;
    for (var k = 0; k < KINDS.length; k++) {
      var arr = KINDS[k].get(s);
      total += arr.length;
      for (var m = 0; m < arr.length; m++) if (arr[m] && !reg[arr[m].id]) n++;
    }
    return { unread: n, total: total };
  }

  // PORT: the bound edge is fixed leather; no width write — the tally
  // carries the count. The caps still brighten with knots.
  function updateSpine() {
    var c = unreadCount();
    if (bindingEl) {
      var rels = (getS().relations || []).length;
      bindingEl.setAttribute('data-relations', String(rels === 0 ? 0 : rels < 4 ? 1 : rels < 8 ? 2 : 3));
    }
    if (spineEl) {
      spineEl.setAttribute('data-unread', String(c.unread));
      var tally = spineEl.querySelector('.journal-spine-tally');
      if (tally) {
        tally.textContent = c.total > 0 ? ('all ' + c.total + (c.unread > 0 ? ' · ' + c.unread + ' unopened' : '')) : '—';
        tally.setAttribute('aria-label', c.total > 0
          ? 'all drawers: ' + c.total + ' kept items, ' + c.unread + ' unopened'
          : 'the book is empty');
        tally.title = c.total > 0
          ? 'all drawers: ' + c.total + ' kept items, ' + c.unread + ' unopened'
          : 'the book is empty';
      }
    }
  }

  var tab = 'buddy';
  var current = null; // { tab, type, id, idx }
  var saveTimer = null;

  // ── pens ──────────────────────────────────────────────────────────────

  var PENS = [
    { id: 'hl', name: 'highlighter', hl: true, color: '#f0dc5a', say: 'bright enough to find later. good.' },
    { id: 'red', name: 'red', color: '#b03030', say: 'red :O corrections i see..' },
    { id: 'blue', name: 'blue', color: '#2a5aaa', say: 'blue calms me.' },
    { id: 'green', name: 'green', color: '#2a7a3a', say: 'geen. yes, geen.' },
    { id: 'violet', name: 'violet', color: '#7a3aaa', say: 'urple. for the strange parts.' }
  ];
  var activePen = null;

  // PORT: each pen drawn laid down — barrel, cap on a pivot group, nib
  // exposed past the cap rim. The highlighter's cap slides aside when armed.
  function penSvg(p) {
    var ink = p.color, cap;
    if (p.hl) {
      cap = '<g class="pen-cap" style="transform-origin: 14px 22px;">'
          + '<rect x="6" y="2" width="16" height="13" rx="2.5" fill="' + ink + '" stroke="#5a4a10"/>'
          + '<rect x="6" y="2" width="16" height="4" rx="2" fill="rgba(255,255,255,0.35)" stroke="none"/>'
          + '</g>';
      return '<svg width="52" height="52" viewBox="-14 -8 52 52" aria-hidden="true">'
        + '<rect x="8" y="15" width="12" height="20" rx="1.5" fill="' + ink + '" stroke="#5a4a10"/>'
        + '<path d="M8 35h12l-6 7z" fill="#e8e0c8" stroke="#5a4a10"/>'
        + '<rect x="10.5" y="41" width="7" height="4.5" fill="' + ink + '" stroke="#5a4a10" stroke-width="0.6"/>'
        + cap
        + '</svg>';
    }
    cap = '<g class="pen-cap" style="transform-origin: 11px 24px;">'
        + '<rect x="4.5" y="14" width="13" height="11" rx="2" fill="' + ink + '" stroke="#2a1a08"/>'
        + '<rect x="6" y="14" width="10" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" stroke="none"/>'
        + '</g>';
    return '<svg width="48" height="52" viewBox="-12 -6 48 52" aria-hidden="true">'
      + '<rect x="7" y="16" width="8" height="19" rx="1" fill="' + ink + '" stroke="#2a1a08"/>'
      + '<path d="M7 35h8l-4 7z" fill="#e0c9a0" stroke="#2a1a08"/>'
      + '<path d="M9.8 42l1.2 3 1.2-3z" fill="#2a2a2a"/>'
      + cap
      + '</svg>';
  }

  // riason's murmur — one sketched line in the chosen ink, then it fades.
  var sayEl = document.getElementById('journal-pen-say');
  var sayTimer = null;
  function penSay(p) {
    if (!sayEl) return;
    sayEl.textContent = p.say;
    sayEl.style.color = p.color === '#f0dc5a' ? '#a8901a' : p.color;
    sayEl.classList.add('show');
    clearTimeout(sayTimer);
    sayTimer = setTimeout(function () { sayEl.classList.remove('show'); }, 4200);
  }

  function buildTools() {
    if (!toolsEl) return;
    toolsEl.innerHTML = '';
    PENS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'journal-pen';
      b.dataset.pen = p.id;
      b.setAttribute('aria-label', p.name + ' pen — ' + p.say);
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-describedby', 'journal-pen-say');
      b.innerHTML = penSvg(p);
      b.addEventListener('click', function () {
        if (activePen === p.id) { setPen(null); return; }
        setPen(p.id);
        penSay(p);
        applyPenToSelection();
      });
      toolsEl.appendChild(b);
    });
  }

  function setPen(id) {
    activePen = id;
    var btns = toolsEl ? toolsEl.querySelectorAll('.journal-pen') : [];
    for (var i = 0; i < btns.length; i++) {
      var on = PENS[i] && PENS[i].id === id;
      btns[i].classList.toggle('active', !!on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function penById(id) {
    for (var i = 0; i < PENS.length; i++) if (PENS[i].id === id) return PENS[i];
    return null;
  }

  function currentRange() {
    try {
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      var r = sel.getRangeAt(0);
      if (!editor.contains(r.commonAncestorContainer)) return null;
      return r;
    } catch (e) { return null; }
  }

  // wrap the range in a mark span; extractContents fallback covers ranges
  // that split text nodes (surroundContents would throw).
  function wrapRange(range, pen) {
    if (!range || range.collapsed) return null;
    var span = document.createElement('span');
    span.className = 'smark' + (pen.hl ? ' smark-hl' : '');
    if (pen.hl) span.setAttribute('data-hl', '1');
    else span.setAttribute('data-c', pen.color);
    span.style.color = pen.hl ? '' : pen.color;
    try {
      range.surroundContents(span);
    } catch (e) {
      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
      } catch (e2) { return null; }
    }
    return span;
  }

  function applyPenToSelection() {
    var pen = penById(activePen);
    if (!pen || !current) { if (!current) setPen(null); return; }
    var sp = wrapRange(currentRange(), pen);
    if (sp) scheduleSave(false);
    else setPen(null);
  }

  // ── lists ─────────────────────────────────────────────────────────────

  function itemLabel(type, d) {
    if (type === 'stone') {
      return (d.kind === 'poppet' ? (d.name || 'unnamed poppet') : (d.intention || '(no intention)')).substring(0, 60);
    }
    if (type === 'relation') return relationLabel(d);
    return String(d.name || d.title || d.topic || d.label || (d.text || '').slice(0, 60) || type).substring(0, 60);
  }

  function metaOf(type, d) {
    if (type === 'stone') return (d.kind === 'poppet' ? 'poppet' : (d.element || 'earth')) + (d.ts ? ' · ' + fmtDate(d.ts) : '');
    if (type === 'relation') return d.ts ? 'relation · ' + fmtDate(d.ts) : 'desktop relation';
    return type + (d.ts ? ' · ' + fmtDate(d.ts) : '');
  }

  function collect(tabName) {
    var s = getS();
    if (tabName === 'buddy') {
      var out = [];
      var stones = getSigs();
      for (var i = 0; i < stones.length; i++) out.push({ type: 'stone', id: stones[i].id, idx: i, data: stones[i] });
      var sealed = getSealed();
      for (var j = 0; j < sealed.length; j++) out.push({ type: 'buddy', id: sealed[j].id, data: sealed[j] });
      return out;
    }
    if (tabName === 'relations') {
      var rels = s.relations || [];
      var listR = [];
      for (var r = 0; r < rels.length; r++) {
        listR.push({ type: 'relation', id: relationKey(rels[r], r), idx: r, data: rels[r] });
      }
      return listR;
    }
    var arts = [];
    for (var k = 0; k < KINDS.length; k++) {
      var arr = KINDS[k].get(s);
      for (var m = 0; m < arr.length; m++) arts.push({ type: KINDS[k].kind, id: arr[m].id, data: arr[m] });
    }
    return arts;
  }

  function hasMarks(d) {
    return !!(d && ((d.marks && d.marks.length) || d.annotation || d.journalNote || d.satchelNote || d.note));
  }

  // the margin note a row confesses on hover: a mark's attached note,
  // else the opening of the annotation itself.
  function marginalOf(d) {
    if (!d) return '';
    if (d.marks && d.marks.length) {
      for (var i = 0; i < d.marks.length; i++) {
        if (d.marks[i] && d.marks[i].note) return String(d.marks[i].note).slice(0, 60);
      }
    }
    var t = d.annotation || d.journalNote || d.satchelNote || d.note || '';
    t = String(t).replace(/\s+/g, ' ').trim();
    return t.length > 46 ? t.slice(0, 46) + '…' : t;
  }

  function renderTabs() {
    if (!drawers) return;
    var btns = drawers.querySelectorAll('.journal-tab');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-tab') === tab;
      btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }

  function renderList() {
    if (!list) return;
    renderTabs();
    updateSpine();
    var needle = (findEl && findEl.value || '').trim().toLowerCase();
    var items = collect(tab);
    if (needle) {
      var filtered = [];
      for (var f = 0; f < items.length; f++) {
        var itF = items[f];
        var hay = (itemLabel(itF.type, itF.data) + ' ' + metaOf(itF.type, itF.data) + ' ' + String(bodyOf(itF.type, itF.data) || '')).toLowerCase();
        if (hay.indexOf(needle) >= 0) filtered.push(itF);
      }
      items = filtered;
    }
    var html = '';
    if (!items.length) {
      var hint = tab === 'buddy' ? 'make a buddy first.' : (tab === 'relations' ? 'bind an artifact on the desktop first.' : (needle ? 'nothing answers to that.' : 'save something first.'));
      // an empty state must offer its own next action: the buddy drawer
      // is the one a first-timer hits, and the workshop is where buddies
      // are made — hand them the door, not just the diagnosis.
      var cta = '';
      if (tab === 'buddy' && !needle) {
        hint = 'make a buddy first — the workshop paints them.';
        cta = '<button type="button" class="journal-empty-cta" id="journal-empty-cta">open the workshop</button>';
      }
      list.innerHTML = '<div class="journal-empty">the drawer is empty.<br/>' + hint + cta + '</div>';
      if (cta) {
        var ctaBtn = document.getElementById('journal-empty-cta');
        if (ctaBtn) ctaBtn.addEventListener('click', function () { location.href = 'sigil.html'; });
      }
      return;
    }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var ribbon = isUnread(it.type, it.id) ? '<span class="journal-ribbon" aria-label="unopened"></span>' : '';
      var dot = hasMarks(it.data) ? '<span class="journal-ann-dot" aria-hidden="true">✎</span>' : '';
      var marginal = hasMarks(it.data) ? ' data-marginal="' + esc(marginalOf(it.data)) + '"' : '';
      var cur = (current && current.type === it.type && current.id === it.id) ? ' current' : '';
      html += '<div class="journal-list-item' + cur + '" tabindex="0" role="button"' + marginal + ' data-type="' + esc(it.type) + '" data-id="' + esc(it.id || '') + '" data-i="' + (it.idx == null ? '' : it.idx) + '">'
            + ribbon + dot + esc(itemLabel(it.type, it.data))
            + '<div class="meta">' + esc(metaOf(it.type, it.data)) + '</div></div>';
    }
    list.innerHTML = html;
    var rows = list.querySelectorAll('.journal-list-item');
    for (var m = 0; m < rows.length; m++) {
      rows[m].addEventListener('click', function () {
        openNote(tab, this.getAttribute('data-type'), this.getAttribute('data-id'), this.getAttribute('data-i'));
      });
      rows[m].addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); }
      });
    }
  }

  // ── the note page ─────────────────────────────────────────────────────

  function resolveItem(type, id, idx) {
    if (type === 'stone') {
      var stones = getSigs();
      var si = -1;
      for (var a = 0; a < stones.length; a++) { if (stones[a].id === id) { si = a; break; } }
      if (si < 0 && idx !== '' && idx != null) si = parseInt(idx, 10);
      if (si < 0 || !stones[si]) return null;
      return { type: 'stone', id: stones[si].id, idx: si, data: stones[si] };
    }
    if (type === 'relation') {
      var rels = getS().relations || [];
      var ri = (idx !== '' && idx != null) ? parseInt(idx, 10) : -1;
      if (ri >= 0 && rels[ri] && (relationKey(rels[ri], ri) === id || rels[ri].from === id)) {
        return { type: 'relation', id: relationKey(rels[ri], ri), idx: ri, data: rels[ri] };
      }
      for (var r = 0; r < rels.length; r++) {
        if (relationKey(rels[r], r) === id || rels[r].from === id) {
          return { type: 'relation', id: relationKey(rels[r], r), idx: r, data: rels[r] };
        }
      }
      return null;
    }
    var hit = artifactById(id);
    if (!hit) return null;
    return { type: hit.kind, id: id, data: hit.data };
  }

  function baseTextOf(item) {
    var d = item.data;
    // satchelNote is the old name of the page's own note; earlier saves still open.
    return (d && (d.annotation || d.journalNote || d.satchelNote || d.note)) || '';
  }

  // rebuild the editor from stored {text, marks}; marks outside the text
  // are dropped (offsets invalidated by edits never resurrect).
  function paintEditor(text, marks) {
    if (!editor) return;
    editor.innerHTML = '';
    text = String(text || '');
    marks = (marks || []).slice().sort(function (a, b) { return a.s - b.s; });
    var pos = 0;
    function addText(t) { if (t) editor.appendChild(document.createTextNode(t)); }
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (m == null || m.s < pos || m.e > text.length || m.e <= m.s) continue;
      addText(text.slice(pos, m.s));
      var span = document.createElement('span');
      span.className = 'smark' + (m.h ? ' smark-hl' : '');
      if (m.h) span.setAttribute('data-hl', '1');
      else span.setAttribute('data-c', m.c || '');
      if (!m.h && m.c) span.style.color = m.c;
      if (m.note) span.setAttribute('data-note', m.note);
      span.textContent = text.slice(m.s, m.e);
      editor.appendChild(span);
      pos = m.e;
    }
    addText(text.slice(pos));
  }

  // derive {text, marks} from the live DOM; spans carry their own data.
  function readEditor() {
    if (!editor) return { text: '', marks: [] };
    var text = '';
    var marks = [];
    function walk(node) {
      if (node.nodeType === 3) {
        text += node.nodeValue;
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.classList && node.classList.contains('smark')) {
        var start = text.length;
        var note = node.getAttribute('data-note') || '';
        var hl = node.getAttribute('data-hl') === '1';
        var c = node.getAttribute('data-c') || '';
        for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
        if (text.length > start) marks.push({ s: start, e: text.length, c: c, h: hl ? 1 : 0, note: note });
        return;
      }
      if (node.tagName === 'BR') { text += '\n'; return; }
      for (var j = 0; j < node.childNodes.length; j++) walk(node.childNodes[j]);
      if (node.tagName === 'DIV' || node.tagName === 'P') text += '\n';
    }
    for (var k = 0; k < editor.childNodes.length; k++) walk(editor.childNodes[k]);
    return { text: text.replace(/\n+$/, ''), marks: marks };
  }

  function titleOf(item) {
    var d = item.data;
    if (item.type === 'stone') return d.kind === 'poppet'
      ? 'poppet · ' + (d.name || 'unnamed')
      : 'a buddy · ' + (d.element || 'earth');
    if (item.type === 'relation') return relationLabel(d);
    if (item.type === 'buddy') return 'a sealed chat';
    return String(d.name || d.title || d.topic || d.label || item.type || 'kept').substring(0, 40);
  }

  function openNote(tabName, type, id, idx) {
    var item = resolveItem(type, id, idx);
    if (!item) return;
    tab = tabName;
    current = { tab: tab, type: item.type, id: item.id, idx: item.idx };
    hidePop();
    if (titleEl) titleEl.textContent = titleOf(item);
    if (dateEl) dateEl.textContent = item.data.ts ? fmtDate(item.data.ts) : '— —';
    if (intentEl) intentEl.textContent = bodyOf(item.type, item.data);
    if (polaroid) {
      if (item.data.shot) { polaroid.src = item.data.shot; polaroid.hidden = false; }
      else { polaroid.removeAttribute('src'); polaroid.hidden = true; }
    }
    paintEditor(baseTextOf(item), item.data.marks);
    markRead(item);
    if (slipEl) {
      var home = slipFor(item.type);
      if (home) { slipEl.hidden = false; slipEl.textContent = 'slip out to ' + home[1]; }
      else slipEl.hidden = true;
    }
    renderList();
  }

  function persist(chime) {
    if (!st() || !current) return;
    var got = readEditor();
    var item = resolveItem(current.type, current.id, current.idx);
    if (!item) return;
    if (current.type === 'stone') {
      var s = getS();
      var stones = getSigs();
      var sealed = getSealed();
      if (item.idx >= 0 && stones[item.idx]) {
        stones[item.idx] = Object.assign({}, stones[item.idx], { annotation: got.text, marks: got.marks });
        st().set({ buddy: stones.concat(sealed) });
      }
    } else if (current.type === 'relation') {
      var rels = (getS().relations || []).slice();
      var ri = item.idx;
      if (ri != null && rels[ri] && relationKey(rels[ri], ri) === current.id) {
        rels[ri] = Object.assign({}, rels[ri], { note: got.text, marks: got.marks });
      }
      st().set({ relations: rels });
    } else {
      if (st().updateArtifact) st().updateArtifact(current.type, current.id, { annotation: got.text, journalNote: got.text, marks: got.marks });
    }
    if (chime && window.Liber && window.Liber.sound) { try { window.Liber.sound.play('chime'); } catch (e) {} }
  }

  function scheduleSave(chime) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveTimer = null; persist(!!chime); renderList(); }, chime ? 0 : 800);
  }

  // ── highlight popover ─────────────────────────────────────────────────

  var popMark = null;

  function hidePop() {
    if (pop) pop.hidden = true;
    popMark = null;
  }

  function showPop(span, x, y) {
    if (!pop || !span) return;
    popMark = span;
    if (popText) popText.textContent = span.textContent;
    if (popNote) popNote.value = span.getAttribute('data-note') || '';
    pop.hidden = false;
    // PORT: the cabinet is display:contents (the folio arrangement), so pin
    // the scrap against the whole open book instead.
    var cab = bindingEl || document.querySelector('.journal-binding');
    var cr = cab ? cab.getBoundingClientRect() : { left: 0, top: 0, width: 300 };
    pop.style.left = Math.max(8, Math.min(x - cr.left - 110, (cr.width || 300) - 230)) + 'px';
    pop.style.top = Math.max(8, (y - cr.top) + 14) + 'px';
    if (popNote) popNote.focus();
  }

  function wirePop() {
    var save = document.getElementById('journal-pop-save');
    var clear = document.getElementById('journal-pop-clear');
    var close = document.getElementById('journal-pop-close');
    if (save) save.addEventListener('click', function () {
      if (popMark && popNote) {
        if (popNote.value.trim()) popMark.setAttribute('data-note', popNote.value.trim());
        else popMark.removeAttribute('data-note');
        scheduleSave(false);
      }
      hidePop();
    });
    if (clear) clear.addEventListener('click', function () {
      if (popMark) {
        var parent = popMark.parentNode;
        while (popMark.firstChild) parent.insertBefore(popMark.firstChild, popMark);
        parent.removeChild(popMark);
        scheduleSave(false);
      }
      hidePop();
    });
    if (close) close.addEventListener('click', hidePop);
  }

  // ── riason: the bell, the recall, the teaching ═════════════════════════
  // First summon, you type his line back — that's how the book learns your
  // hand. Then he teaches, in the tutorial's grammar: voice label,
  // typewriter line, response gate, visible skip. Resummons skip the
  // ritual and go straight to the teaching.

  var RECALL_LINE = 'the drawers yawn, the index calls — file it here within these walls.';

  function recalledBefore() {
    try { return localStorage.getItem('liber_vacui_journal_recalled__' + (st() && st().getSlot ? st().getSlot() : 'keep')) === '1'; } catch (e) { return false; }
  }
  function markRecalled() {
    try { localStorage.setItem('liber_vacui_journal_recalled__' + (st() && st().getSlot ? st().getSlot() : 'keep'), '1'); } catch (e) {}
  }

  var TEACHING = [
    'i keep this book. you keep the rooms — i only file what they send me.',
    'the tab-cards at the bound edge are the drawers: buddies, artifacts, knots. turn a card, choose an entry, and it opens on the leaf.',
    'the pens lie at the page foot. pick one up and it arms; mark a passage, and your mark is kept with the entry.',
    'click a highlight you have made to pin a note on it. the red ribbons are entries that arrived since you last opened the book.',
    'the ribbon above is the way out. it does not close the book — it marks your page. ring when you need me.'
  ];

  var chat = {
    queue: [], idx: 0, typing: null, open: false,
    text: '', shown: 0, lastTick: 0
  };
  var CPS = 40; // the tutorial's typewriter speed

  function chatShow() {
    if (!chatEl) return;
    chatEl.hidden = false;
    chat.open = true;
    if (summonEl) summonEl.setAttribute('aria-expanded', 'true');
  }
  function chatHide() {
    if (chatEl) chatEl.hidden = true;
    chat.open = false;
    chat.queue = [];
    chat.idx = 0;
    if (chat.typing) { cancelAnimationFrame(chat.typing); chat.typing = null; }
    if (summonEl) summonEl.setAttribute('aria-expanded', 'false');
  }
  function chatType(line) {
    chat.text = line;
    chat.shown = 0;
    chat.lastTick = 0;
    if (chatTextEl) chatTextEl.textContent = '';
    if (chatGateEl) chatGateEl.hidden = true;
    if (chat.typing) cancelAnimationFrame(chat.typing);
    var step = function tick(ts) {
      if (!chat.open) return;
      if (!chat.lastTick) chat.lastTick = ts;
      var want = Math.min(chat.text.length, Math.floor((ts - chat.lastTick) / 1000 * CPS));
      if (want !== chat.shown) {
        chat.shown = want;
        if (chatTextEl) chatTextEl.textContent = chat.text.slice(0, chat.shown);
      }
      if (chat.shown >= chat.text.length) {
        chat.typing = null;
        if (chatGateEl) chatGateEl.hidden = false;
        return;
      }
      chat.typing = requestAnimationFrame(step);
    };
    chat.typing = requestAnimationFrame(step);
  }
  function chatAdvance() {
    if (!chat.open) return;
    if (chat.typing) { // gate skips the typewriter first — equal access
      cancelAnimationFrame(chat.typing);
      chat.typing = null;
      chat.shown = chat.text.length;
      if (chatTextEl) chatTextEl.textContent = chat.text;
      if (chatGateEl) chatGateEl.hidden = false;
      return;
    }
    chat.idx += 1;
    if (chat.idx < chat.queue.length) chatType(chat.queue[chat.idx]);
    else chatHide();
  }
  function chatTeach(lines) {
    chat.queue = lines.slice();
    chat.idx = 0;
    chatShow();
    chatType(chat.queue[0]);
  }

  // the recall ritual: type the line back — case and punctuation don't
  // matter. riason writes it once; your progress is tracked separately
  // from his hand and underlined as it lands.
  var recallTarget = '';
  var recallPos = 0;
  var recallAnimating = false;

  function beginRecall() {
    if (!recallEl || !recallLineEl) { chatTeach(TEACHING); return; }
    recallTarget = RECALL_LINE;
    recallPos = 0;
    recallEl.hidden = false;
    recallLineEl.textContent = '';
    if (summonEl) summonEl.setAttribute('aria-expanded', 'true');
    setTimeout(recallTypeFirst, 700);
  }
  function recallTypeFirst() {
    // he writes it once, in his own hand — then waits for yours
    var n = 0;
    recallAnimating = true;
    var iv = setInterval(function () {
      if (recallEl.hidden) { clearInterval(iv); recallAnimating = false; return; }
      n += 1;
      recallLineEl.textContent = recallTarget.slice(0, n);
      if (n >= recallTarget.length) {
        clearInterval(iv);
        recallAnimating = false;
        renderRecallProgress();
      }
    }, 34);
  }
  function renderRecallProgress() {
    if (!recallLineEl || !recallTarget) return;
    var done = esc(recallTarget.slice(0, recallPos));
    var rest = esc(recallTarget.slice(recallPos));
    recallLineEl.innerHTML = '<span class="journal-recall-done">' + done + '</span>' + rest;
  }
  function onRecallKey(e) {
    if (recallEl.hidden) return;
    if (e.key === 'Escape') { skipRecall(); return; }
    if (e.key === 'Enter') { e.preventDefault(); return; } // no Enter skip: the line must be typed
    if (e.key.length !== 1) return; // modifiers, shift, etc.
    var want = recallTarget[recallPos];
    if (want == null) return;
    if (e.key.toLowerCase() === String(want).toLowerCase()) {
      recallPos += 1;
      if (!recallAnimating) renderRecallProgress();
      if (recallPos >= recallTarget.length) finishRecall();
    }
  }
  function finishRecall() {
    markRecalled();
    setTimeout(function () {
      recallEl.hidden = true;
      chatTeach(TEACHING);
    }, 650);
  }
  function skipRecall() {
    // skipping is equal access — the ritual is never a lock
    recallEl.hidden = true;
    markRecalled();
    chatTeach(TEACHING);
  }

  // ── boot ──────────────────────────────────────────────────────────────

  function openHash() {
    try {
      var h = (location.hash || '').replace(/^#/, '');
      if (!h) return;
      var hit = artifactById(h);
      if (hit) {
        var stones = getSigs();
        var isStone = hit.kind === 'stone';
        openNote(isStone ? 'buddy' : 'artifacts', hit.kind, h, null);
        return;
      }
      var rels = getS().relations || [];
      for (var i = 0; i < rels.length; i++) {
        if (rels[i].from === h) { openNote('relations', 'relation', h, null); break; }
      }
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildTools();
    renderList();

    var tabs = drawers ? drawers.querySelectorAll('.journal-tab') : [];
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener('click', function () {
        if (current) persist(true);
        hidePop();
        tab = this.getAttribute('data-tab');
        current = null;
        if (titleEl) titleEl.textContent = '— — —';
        if (dateEl) dateEl.textContent = '— —';
        if (intentEl) intentEl.textContent = '';
        if (polaroid) { polaroid.removeAttribute('src'); polaroid.hidden = true; }
        if (slipEl) slipEl.hidden = true;
        if (editor) editor.innerHTML = '';
        renderList();
      });
    }

    if (editor) {
      editor.addEventListener('input', function () { scheduleSave(false); });
      editor.addEventListener('blur', function () { if (current) persist(true); });
      editor.addEventListener('click', function (e) {
        var hl = e.target && e.target.closest ? e.target.closest('.smark-hl') : null;
        if (hl && editor.contains(hl)) showPop(hl, e.clientX, e.clientY);
        else hidePop();
      });
      editor.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); persist(true); }
      });
    }
    wirePop();

    // PORT: the ribbon IS the exit — mark your page, leave the room.
    // Explicit desktop: history.back() inherits boot/gate redirects.
    if (exit) exit.addEventListener('click', function () {
      try { if (current) persist(true); } catch (e) {}
      location.href = 'desktop.html';
    });

    if (slipEl) slipEl.addEventListener('click', function () {
      if (!current) return;
      try { persist(true); } catch (e) {}
      var home = slipFor(current.type);
      if (home) location.href = home[0];
    });

    if (findEl) {
      findEl.addEventListener('input', function () { renderList(); });
      findEl.addEventListener('keydown', function (e) { if (e.key === 'Escape') { findEl.value = ''; renderList(); } });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((recallEl && !recallEl.hidden) || (chatEl && !chatEl.hidden)) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return;
      e.preventDefault();
      if (findEl) findEl.focus();
    });

    var raison = document.getElementById('journal-raison');
    var raisonClose = document.getElementById('journal-raison-close');
    function openRaison() {
      if (raison) { raison.classList.add('open'); raison.removeAttribute('inert'); }
    }
    function closeRaison() {
      if (raison) { raison.classList.remove('open'); raison.setAttribute('inert', ''); }
    }
    if (raisonClose) raisonClose.addEventListener('click', closeRaison);
    if (raison) raison.addEventListener('click', function (e) { if (e.target === raison) closeRaison(); });
    if (window.LiberRoomShell) window.LiberRoomShell.bindRoomOverlays({ overlays: [
      { id: 'journal-raison', close: closeRaison }
    ] });

    // riason wiring: chat controls, the bell, the keyboard paths
    if (chatGateEl) chatGateEl.addEventListener('click', chatAdvance);
    if (chatTextEl) chatTextEl.addEventListener('click', chatAdvance);
    if (chatSkipEl) chatSkipEl.addEventListener('click', chatHide);
    if (recallSkipEl) recallSkipEl.addEventListener('click', skipRecall);

    if (summonEl) summonEl.addEventListener('click', function () {
      if (chat.open) { chatHide(); return; }
      try { if (current) persist(true); } catch (e) {}
      if (recalledBefore()) chatTeach(TEACHING);
      else beginRecall();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (recallEl && !recallEl.hidden) { skipRecall(); return; }
        if (chat.open) { chatHide(); return; }
        if (raison && raison.classList.contains('open')) { closeRaison(); return; }
      }
      if ((e.key === 'Enter' || e.key === ' ') && chat.open && !isTypingTarget(e.target)
        && e.target !== chatGateEl && e.target !== chatSkipEl) {
        e.preventDefault();
        chatAdvance();
      }
    });
    window.addEventListener('keydown', onRecallKey, true);

    if (st()) st().on('change', function () { renderList(); });
    window.addEventListener('hashchange', openHash);
    openHash();
  });
})();
