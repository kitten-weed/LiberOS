import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic, plain} from './harness.mjs';

const root = new URL('../../', import.meta.url);
const fixture = JSON.parse(await fs.readFile(
  new URL('./fixtures/baseline.json', import.meta.url), 'utf8'));

function paragraphs(html) {
  return [...html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)]
    .map(match => match[1].replace(/\s+/g, ' ').trim());
}

function links(html) {
  return [...html.matchAll(/<a\s+href="([^"]+)"/g)].map(match => match[1]);
}

function group(letter, name) {
  const match = letter.match(new RegExp(
    '<div class="boot-letter-group boot-letter-' + name + '">([\\s\\S]*?)<\\/div>'
  ));
  assert.ok(match, 'missing ' + name + ' warning group');
  return match[1];
}

test('warning preserves every original paragraph and resource link in order', async () => {
  const html = await fs.readFile(new URL('index.html', root), 'utf8');
  const letter = html.match(/id="boot-letter">([\s\S]*?)<label class="boot-consent"/)?.[1];
  assert.ok(letter);
  assert.deepEqual(paragraphs(letter), paragraphs(fixture.warningHtml));
  assert.deepEqual(links(letter), links(fixture.warningHtml));
  assert.match(html, /I understand the risks, and wish to proceed/);
  assert.match(html, /id="boot-start"[^>]*disabled/);
});

test('warning groups its unchanged paragraphs by meaning and retains one scroll region', async () => {
  const html = await fs.readFile(new URL('index.html', root), 'utf8');
  const css = await fs.readFile(new URL('styles/boot.css', root), 'utf8');
  const letter = html.match(/id="boot-letter">([\s\S]*?)<label class="boot-consent"/)?.[1];
  assert.ok(letter);
  const expected = paragraphs(fixture.warningHtml);
  assert.deepEqual(paragraphs(group(letter, 'introduction')), expected.slice(0, 2));
  assert.deepEqual(paragraphs(group(letter, 'safety')), expected.slice(2, 6));
  assert.deepEqual(paragraphs(group(letter, 'closing')), expected.slice(6, 8));
  assert.equal([...letter.matchAll(/class="boot-letter-group boot-letter-/g)].length, 3);
  assert.match(css, /\.boot-warning-card\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.boot-warning \.boot-letter\s*\{[^}]*overflow:\s*visible/s);
});

test('retained prompt banks keep their exact questions under the Riason Journal key', async () => {
  const realm = makeRealm();
  await runClassic('data/prompts.data.js', realm);
  const actual = plain(realm.window.LiberPrompts);
  for (const [name, questions] of Object.entries(fixture.LiberPrompts)) {
    const key = name === 'the mad scribe' ? 'riasonJournal' : name;
    assert.deepEqual(actual[key], questions, key + ' prompt text changed');
  }
  assert.equal(Object.hasOwn(actual, 'the mad scribe'), false);
  assert.equal(Object.hasOwn(actual, 'riasonJournal'), true);
});

test('the active tutorial, pinned cursor identity, and cutscene build marker remain wired', async () => {
  const desktop = await fs.readFile(new URL('desktop.html', root), 'utf8');
  const state = await fs.readFile(new URL('src/state.js', root), 'utf8');
  assert.match(desktop, /src\/tutorial-flow\.js/);
  assert.match(desktop, /src\/cutscene-v2\.data\.js/);
  assert.match(desktop, /src\/cutscene\.js/);
  assert.match(state, /const CUTSCENE_BUILD = 'handshake1'/);
});
