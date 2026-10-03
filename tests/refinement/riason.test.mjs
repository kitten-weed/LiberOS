import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic, plain} from './harness.mjs';

const root = new URL('../../', import.meta.url);

test('Journal keeps its original question bank under Riason without changing other banks', async () => {
  const baseline = JSON.parse(await fs.readFile(
    new URL('./fixtures/baseline.json', import.meta.url), 'utf8'));
  const r = makeRealm();
  await runClassic('src/state.js', r);
  await runClassic('data/prompts.data.js', r);
  await runClassic('src/poppet-loop.js', r);

  const banks = plain(r.window.LiberPrompts);
  const expectedBanks = plain(baseline.LiberPrompts);
  expectedBanks.riasonJournal = expectedBanks['the mad scribe'];
  delete expectedBanks['the mad scribe'];
  assert.deepEqual(banks, expectedBanks);
  assert.equal(r.window.LiberPoppetLoop.owners.journal, 'riason');
});

test('Journal and learn artifacts select their retained Riason banks at equal relation depth', async () => {
  const baseline = JSON.parse(await fs.readFile(
    new URL('./fixtures/baseline.json', import.meta.url), 'utf8'));
  for (const store of ['journal', 'learn']) {
    const r = makeRealm();
    await runClassic('src/state.js', r);
    await runClassic('data/prompts.data.js', r);
    await runClassic('src/poppet-loop.js', r);
    const journalBank = baseline.LiberPrompts['the mad scribe'];
    const learnBank = baseline.LiberPrompts.riason;
    const depth = 3;
    r.window.Liber.state.set({
      [store]: [{id: store + '-item', name: 'kept item', ts: 10}],
      relations: Array.from({length: depth}, (_, i) => ({
        from: 'existing-' + i, to: 'buddy', verb: 'carries', ts: i + 1
      }))
    });

    const result = r.window.LiberPoppetLoop.relate(store + '-item', 'remembers', {deferRender: true});
    assert.equal(result.traveller, 'riason');
    assert.equal(result.prompt, (store === 'journal' ? journalBank : learnBank)[depth + 1]);
  }
});

function element() {
  const attributes = new Map();
  const listeners = new Map();
  const node = {
    tagName: 'DIV',
    hidden: false,
    value: '',
    textContent: '',
    childNodes: [],
    style: {},
    classList: {
      add() {},
      remove() {},
      contains() { return false; },
      toggle() {}
    },
    addEventListener(name, fn) { listeners.set(name, fn); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || null; },
    removeAttribute(name) { attributes.delete(name); },
    querySelectorAll() { return []; },
    appendChild(child) { this.childNodes.push(child); return child; },
    contains() { return true; },
    focus() {}
  };
  Object.defineProperty(node, 'innerHTML', {
    get() { return node._html || ''; },
    set(value) { node._html = String(value); node.childNodes = []; }
  });
  node.listeners = listeners;
  return node;
}

async function openJournalEntry(state, id) {
  const nodes = new Map([
    'journal-list', 'journal-drawers', 'journal-note-title', 'journal-note-date',
    'journal-intention', 'journal-editor', 'journal-polaroid', 'journal-pop',
    'journal-slip'
  ].map(id => [id, element()]));
  const r = makeRealm();
  r.window.location.hash = '#' + id;
  r.context.location = r.window.location;
  r.window.document.readyState = 'complete';
  r.window.document.getElementById = id => nodes.get(id) || null;
  r.window.document.querySelector = () => null;
  r.window.document.createTextNode = text => ({nodeType: 3, nodeValue: String(text)});
  r.window.document.createElement = () => element();
  let ready;
  r.window.document.addEventListener = (name, fn) => { if (name === 'DOMContentLoaded') ready = fn; };
  await runClassic('src/state.js', r);
  r.window.Liber.state.set(state);
  await runClassic('src/features/journal/entry-text.js', r);
  await runClassic('src/features/journal/journal.js', r);
  ready();
  return {state: r.window.Liber.state, nodes};
}

test('viewing a legacy spoken entry normalizes only its displayed attribution', async () => {
  const entry = {
    id: 'spoken-legacy',
    kind: 'spoken',
    name: 'the mad scribe asked',
    traveller: 'the mad scribe',
    body: 'what did writing help you notice?',
    ts: 10
  };
  const before = JSON.stringify(entry);
  const opened = await openJournalEntry({journal: [entry]}, entry.id);
  assert.equal(opened.nodes.get('journal-note-title').textContent, 'riason asked');
  assert.equal(opened.nodes.get('journal-intention').textContent, entry.body);
  assert.equal(JSON.stringify(opened.state.get().journal[0]), before);
});

test('dream copies show honest provenance and only return to an existing source', async () => {
  const source = {id: 'dream-source', title: 'the tide mark', text: 'a kept image', ts: 1};
  const copy = {id: 'dream-copy', kind: 'dream', ref: source.id, text: source.text, ts: 2};
  const opened = await openJournalEntry({dreams: [source], journal: [copy]}, copy.id);
  assert.match(opened.nodes.get('journal-list').innerHTML, /book copy/);
  assert.equal(opened.nodes.get('journal-slip').hidden, false);
  assert.equal(opened.nodes.get('journal-slip').textContent, 'slip out to the fog');
  assert.deepEqual(plain(opened.state.get().dreams), [source]);
  assert.deepEqual(plain(opened.state.get().journal), [copy]);

  const missing = {id: 'orphan-copy', kind: 'dream', ref: 'removed-source', text: 'kept copy', ts: 3};
  const orphan = await openJournalEntry({journal: [missing]}, missing.id);
  assert.match(orphan.nodes.get('journal-list').innerHTML, /book copy · source unavailable/);
  assert.equal(orphan.nodes.get('journal-slip').hidden, true);
  assert.deepEqual(plain(orphan.state.get().dreams), []);
  assert.deepEqual(plain(orphan.state.get().journal), [missing]);
});
