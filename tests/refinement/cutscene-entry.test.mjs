import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic} from './harness.mjs';

async function loadCutscene({query, state}) {
  const r = makeRealm();
  const listeners = new Map();
  const bodyClasses = new Set();
  const opened = [];
  const replacements = [];
  const desktop = {inert: false};
  r.window.location = {
    pathname: '/desktop.html',
    search: query,
    hash: '',
    href: 'http://localhost/desktop.html' + query
  };
  r.window.history = {
    replaceState(_state, _title, url) { replacements.push(url); }
  };
  r.window.Liber = {state: {get: () => state, on() {}}};
  r.window.CutsceneV2Data = {BEATS: [], RITUAL: [], PRODUCTION: []};
  r.window.LiberPoppetRite = {
    open(options) {
      opened.push(options);
      return {ready: false};
    },
    requestDismiss() { return true; }
  };
  r.window.document.body = {
    classList: {
      add(name) { bodyClasses.add(name); },
      remove(name) { bodyClasses.delete(name); }
    }
  };
  r.window.document.getElementById = id => id === 'desktop' ? desktop : null;
  r.window.document.querySelector = () => null;
  r.window.document.addEventListener = (name, callback) => listeners.set(name, callback);
  await runClassic('src/cutscene.js', r);
  listeners.get('DOMContentLoaded')();
  return {r, opened, replacements, bodyClasses, desktop};
}

test('first-making request cannot skip the existing name gate', async () => {
  const result = await loadCutscene({
    query: '?first-making=1',
    state: {tutorialDone: true, tutorialPaused: false, enterRiteDone: false}
  });
  assert.equal(result.opened.length, 0);
});

test('completed tutorial opens the existing rite only for an explicit request', async () => {
  const state = {tutorialDone: true, tutorialPaused: false, enterRiteDone: true};
  const ordinary = await loadCutscene({query: '', state});
  assert.equal(ordinary.opened.length, 0);

  const requested = await loadCutscene({query: '?first-making=1', state});
  assert.equal(requested.opened.length, 1);
  assert.equal(requested.desktop.inert, true);
  requested.opened[0].onKeep({ok: true}, 'home');
  assert.deepEqual(requested.replacements, ['/desktop.html']);
  assert.equal(requested.desktop.inert, false);
});

test('completed alternate first-making entry returns to desktop through the single keep callback', async () => {
  const requested = await loadCutscene({
    query: '?first-making=1',
    state: {tutorialDone: true, tutorialPaused: false, enterRiteDone: true}
  });
  requested.opened[0].onKeep({ok: true}, 'workshop');
  assert.equal(requested.r.window.location.href, 'http://localhost/desktop.html?first-making=1');
  assert.deepEqual(requested.replacements, ['/desktop.html']);
  assert.equal(requested.desktop.inert, false);
});
