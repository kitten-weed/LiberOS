import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeRealm, runClassic} from './harness.mjs';

const root = new URL('../../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

function rule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(escaped + '\\s*\\{').exec(source);
  assert.ok(match, 'missing CSS rule ' + selector);
  const start = match.index;
  const open = source.indexOf('{', start);
  assert.notEqual(open, -1, 'missing CSS block ' + selector);
  const end = source.indexOf('}', open);
  assert.notEqual(end, -1, 'unterminated CSS rule ' + selector);
  return source.slice(start, end + 1);
}

test('arcana menu keeps its three choices and readable controls within the menu window', async () => {
  const html = await read('divination.html');
  const css = await read('src/features/arcana/arcana.css');
  assert.equal((html.match(/class="menu-opt"/g) || []).length, 3);
  assert.match(rule(css, '.win-menu'), /max-height:\s*calc\(100%\s*-\s*32px\)/);
  assert.match(rule(css, '.menu-title'), /font-size:\s*16px/);
  assert.match(rule(css, '.menu-title'), /line-height:\s*1\.1/);
  assert.match(rule(css, '.menu-opt'), /font-size:\s*16px/);
  assert.match(rule(css, '.menu-opt'), /min-height:\s*44px/);
});

test('arcana scene ownership preserves live controls and restores the work window', async () => {
  const viz = await read('src/features/arcana/viz.js');
  const css = await read('src/features/arcana/arcana.css');
  assert.match(viz, /function suspendSceneWork\(\)/);
  assert.match(viz, /function restoreSceneWork\(\)/);
  assert.match(viz, /suspendSceneWork\(\)/);
  assert.match(viz, /restoreSceneWork\(\)/);
  assert.match(css, /\.arc-win\.scene-suspended\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.arc-doc \.act\s*\{[^}]*pointer-events:\s*auto/s);
  assert.match(viz, /className = 'act act-skip on'/);
});

test('arcana questions and readings have opaque backing and visible keyboard focus', async () => {
  const css = await read('src/features/arcana/arcana.css');
  assert.match(rule(css, '.arc-q'), /background:\s*#080a08/);
  assert.match(rule(css, '.arc-win-body'), /background:\s*#080a08/);
  assert.match(rule(css, '.rd-line'), /font-size:\s*16px/);
  assert.match(css, /\.wg-input:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--blue\)/s);
  assert.match(css, /\.jq-input:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--blue\)/s);
});

test('arcana tarot discard returns one card and keep exhausts the session-local 78-card deck', async () => {
  const realm = makeRealm();
  const cards = Array.from({length: 78}, (_, i) => ({
    id: 'card-' + i,
    name: 'card ' + i,
    up: 'upright ' + i,
    rev: 'reversed ' + i,
    glyph: 'x',
    n: i + 1
  }));
  const nodes = new Map();
  function node() {
    return {
      listeners: {},
      addEventListener(name, fn) { this.listeners[name] = fn; },
      click() { if (this.listeners.click) this.listeners.click(); },
      focus() {}
    };
  }
  for (const id of ['arc-win-work', 'arc-work-body', 'arc-slate', 'arc-cut', 'arc-deck-left']) nodes.set(id, node());
  realm.context.document.getElementById = id => nodes.get(id) || null;
  realm.window.LIBER_ARCANA_DATA = {tarot: cards, games: {}};
  const choices = [];
  const kept = [];
  realm.window.ARCANA_SHELL = {
    WM: {close() {}, open() {}},
    slate: () => ({value: () => 'a bounded question'}),
    play() {},
    readingCite: () => '',
    saveArtifact: entry => kept.push(entry),
    openKeep(title, body, onKeep, onDiscard) { choices.push({title, body, onKeep, onDiscard}); }
  };
  let selected = 0, randomCall = 0;
  realm.context.Math = Object.create(Math);
  realm.context.Math.random = () => randomCall++ % 2 === 0 ? (selected + 0.1) / cards.length : 0.5;
  await runClassic('src/features/arcana/tarot.js', realm);
  realm.window.LIBER_ARCANA_DATA.games.tarot.start();

  nodes.get('arc-cut').click();
  assert.match(choices.at(-1).body, /card 0/);
  choices.at(-1).onDiscard();
  selected = 0;
  nodes.get('arc-cut').click();
  assert.match(choices.at(-1).body, /card 0/);
  choices.at(-1).onKeep();

  for (selected = 1; selected < cards.length; selected++) {
    nodes.get('arc-cut').click();
    choices.at(-1).onKeep();
  }
  assert.equal(kept.length, cards.length);
  assert.equal(new Set(kept.map(entry => entry.name)).size, cards.length);
  const choiceCount = choices.length;
  nodes.get('arc-cut').click();
  assert.equal(choices.length, choiceCount);
  assert.match(nodes.get('arc-deck-left').textContent, /deck is out/);
  assert.match(await read('src/features/arcana/tarot.js'), /Math\.random\(\)\s*<\s*0\.22/);
});
