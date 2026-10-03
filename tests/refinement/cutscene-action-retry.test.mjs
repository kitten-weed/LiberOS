import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic} from './harness.mjs';

function actionBeat(id, kind) {
  return {id, speaker: 'machine', kind, text: '', response: ''};
}

function productionFor(beat) {
  return {
    id: beat.id,
    speaker: 'machine',
    text: '',
    response: '',
    mode: 'action-lock',
    authority: 'machine',
    surface: 'full-machine',
    timing: {},
    carry: {residue: 'test'},
    nextMode: 'action'
  };
}

function fakeNode(tagName, document, createdClasses) {
  const listeners = new Map();
  const classes = new Set();
  const attributes = {};
  const node = {
    tagName: String(tagName).toUpperCase(),
    id: '',
    dataset: {},
    style: {setProperty() {}, removeProperty() {}},
    children: [],
    parentNode: null,
    hidden: false,
    disabled: false,
    value: '',
    textContent: '',
    attributes,
    addEventListener(name, callback) {
      const callbacks = listeners.get(name) || [];
      callbacks.push(callback);
      listeners.set(name, callbacks);
    },
    dispatch(name, event = {}) {
      for (const callback of listeners.get(name) || []) callback(event);
    },
    click() { this.dispatch('click', {}); },
    focus() { document.activeElement = this; },
    closest() { return null; },
    setAttribute(name, value) {
      attributes[name] = String(value);
      if (name === 'id') this.id = String(value);
    },
    removeAttribute(name) { delete attributes[name]; },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter(item => item !== child);
      child.parentNode = null;
      return child;
    },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    contains(child) {
      return child === this || this.children.some(item => item.contains(child));
    },
    querySelectorAll(selector) {
      const selectors = selector.split(',').map(value => value.trim());
      const descendants = [];
      function visit(parent) {
        for (const child of parent.children) {
          descendants.push(child);
          visit(child);
        }
      }
      visit(this);
      return descendants.filter(child => selectors.some(value => {
        if (value[0] === '.') {
          const speakerMatch = /^\.([^[]+)\[data-speaker="([^"]+)"\]$/.exec(value);
          return speakerMatch
            ? child.classList.contains(speakerMatch[1]) && child.dataset.speaker === speakerMatch[2]
            : child.classList.contains(value.slice(1));
        }
        if (value[0] === '#') return child.id === value.slice(1);
        return child.tagName.toLowerCase() === value;
      }));
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    get className() { return Array.from(classes).join(' '); },
    set className(value) {
      classes.clear();
      const names = String(value).split(/\s+/).filter(Boolean);
      names.forEach(name => classes.add(name));
      if (names.length === 1) createdClasses.push(names[0]);
    },
    get classList() {
      return {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        contains(name) { return classes.has(name); },
        toggle(name, force) {
          const enabled = force === undefined ? !classes.has(name) : !!force;
          if (enabled) classes.add(name); else classes.delete(name);
          return enabled;
        }
      };
    },
    get isConnected() {
      let parent = this;
      while (parent) {
        if (parent === document.body) return true;
        parent = parent.parentNode;
      }
      return false;
    },
    get innerHTML() { return this._innerHTML || ''; },
    set innerHTML(value) {
      this._innerHTML = String(value);
      this.children.length = 0;
      if (this.classList.contains('ctv-body')) {
        const head = fakeNode('div', document, createdClasses);
        head.className = 'ctv-head';
        const voice = fakeNode('div', document, createdClasses);
        voice.className = 'ctv-voice';
        const line = fakeNode('div', document, createdClasses);
        line.className = 'ctv-line';
        line.setAttribute('aria-live', 'polite');
        head.appendChild(voice);
        this.appendChild(head);
        this.appendChild(line);
        return;
      }
      if (this.id !== 'cutscene' || !this._innerHTML.includes('ctv-response-rail')) return;
      const world = fakeNode('div', document, createdClasses);
      world.className = 'ctv-world';
      const glow = fakeNode('div', document, createdClasses);
      glow.className = 'ctv-world-glow';
      const floor = fakeNode('div', document, createdClasses);
      floor.className = 'ctv-world-floor';
      world.appendChild(glow);
      world.appendChild(floor);
      const stage = fakeNode('div', document, createdClasses);
      stage.className = 'ctv-stage';
      const cast = fakeNode('div', document, createdClasses);
      cast.className = 'ctv-cast';
      const rail = fakeNode('div', document, createdClasses);
      rail.className = 'ctv-response-rail';
      stage.appendChild(cast);
      stage.appendChild(rail);
      this.appendChild(world);
      this.appendChild(stage);
    }
  };
  return node;
}

function actionRealm({beats, failKey, initialState}) {
  const realm = makeRealm();
  const createdClasses = [];
  const timers = [];
  const intervals = new Map();
  let timerId = 0;
  const setTimeout = (callback, delay = 0) => {
    const timer = {id: ++timerId, callback, delay, cancelled: false};
    timers.push(timer);
    return timer.id;
  };
  const clearTimeout = id => {
    const timer = timers.find(item => item.id === id);
    if (timer) timer.cancelled = true;
  };
  const setInterval = (callback, delay = 0) => {
    const timer = {id: ++timerId, callback, delay, cancelled: false};
    intervals.set(timer.id, timer);
    return timer.id;
  };
  const clearInterval = id => {
    const timer = intervals.get(id);
    if (timer) timer.cancelled = true;
  };
  realm.context.setTimeout = realm.window.setTimeout = setTimeout;
  realm.context.clearTimeout = realm.window.clearTimeout = clearTimeout;
  realm.context.setInterval = realm.window.setInterval = setInterval;
  realm.context.clearInterval = realm.window.clearInterval = clearInterval;
  realm.window.matchMedia = () => ({matches: true});

  const document = realm.document = realm.window.document = realm.context.document;
  document.documentElement = fakeNode('html', document, createdClasses);
  document.body = fakeNode('body', document, createdClasses);
  document.activeElement = null;
  const stage = fakeNode('div', document, createdClasses);
  stage.className = 'screen-stage';
  const machine = fakeNode('div', document, createdClasses);
  machine.className = 'machine';
  const screen = fakeNode('div', document, createdClasses);
  screen.className = 'screen';
  document.body.appendChild(machine);
  document.body.appendChild(screen);
  document.body.appendChild(stage);
  document.createElement = tag => fakeNode(tag, document, createdClasses);
  document.querySelector = selector => {
    if (selector === '.screen-stage') return stage;
    if (selector === '.machine') return machine;
    if (selector === '.screen') return screen;
    return document.body.querySelector(selector);
  };
  document.querySelectorAll = selector => document.body.querySelectorAll(selector);
  document.getElementById = id => document.body.querySelector('#' + id);
  const state = {
    tutorialDone: false,
    tutorialPaused: false,
    tutorialFlow: 'test-opening',
    tutorialBeat: 0,
    tutorialBeatId: beats[0].id,
    tutorialPromise: null,
    tutorialTimeTravelDone: false,
    tutorialFinaleShown: false,
    tutorialResidue: null,
    keysNamed: false,
    travellerAlias: 'Robin',
    ...(initialState || {})
  };
  let failOnce = !!failKey;
  const failures = [];
  realm.window.Liber = {state: {
    get() { return state; },
    trySet(patch) {
      if (failOnce && failKey && patch[failKey] !== undefined) {
        failOnce = false;
        failures.push({...patch});
        return false;
      }
      Object.assign(state, patch);
      return true;
    },
    diagnose(event, detail) { failures.push({event, detail}); }
  }};
  realm.window.LiberTutorialFlow = {
    FLOW: 'test-opening',
    ORDER: beats.map(beat => beat.id),
    patchAt(index) {
      return {
        tutorialFlow: 'test-opening',
        tutorialBeat: index,
        tutorialBeatId: index === beats.length ? null : beats[index].id
      };
    }
  };
  realm.window.LiberTutorialFlow.promiseMatches = (value, alias) => {
    const fold = input => String(input).replace(/\s+/g, ' ').trim().toLowerCase();
    const expected = fold('I will be nice to little ' + alias);
    const typed = fold(value);
    return typed === expected || (typed.startsWith(expected) && /^\s*[.!?…]+$/.test(typed.slice(expected.length)));
  };
  realm.window.CutsceneV2Data = {
    BEATS: beats,
    PRODUCTION: beats.map(beat => productionFor(beat)),
    RITUAL: []
  };

  return {
    realm,
    state,
    failures,
    timers,
    createdClasses,
    runTravelTimer() {
      const timer = timers.find(item => !item.cancelled && item.delay === 480);
      assert.ok(timer, 'reduced-motion travel completion timer exists');
      timer.cancelled = true;
      timer.callback();
    },
    runTypewrite() {
      let guard = 0;
      while (guard++ < 10) {
        const timer = [...intervals.values()].find(item => !item.cancelled);
        if (!timer) return;
        for (let count = 0; !timer.cancelled && count < 500; count++) timer.callback();
        assert.ok(timer.cancelled, 'the active typewriter completed');
      }
      assert.fail('typewriter intervals did not settle');
    },
    click(selector) {
      const node = document.body.querySelector(selector);
      assert.ok(node, selector + ' exists');
      node.click();
      return node;
    }
  };
}

test('failed time-travel checkpoint exposes a focusable retry without replaying travel or unlocking apps', async () => {
  const beats = [actionBeat('time-travel-action', 'time-travel'), actionBeat('next-time-travel', 'time-travel')];
  const fixture = actionRealm({beats, failKey: 'tutorialTimeTravelDone'});
  await runClassic('src/cutscene.js', fixture.realm);
  fixture.realm.window.Cutscene.open(0);

  fixture.click('.ctv-time-travel-switch');
  fixture.runTravelTimer();
  const root = fixture.realm.document.getElementById('cutscene');
  const rail = root.querySelector('.ctv-response-rail');
  const retryPanel = root.querySelector('.ctv-checkpoint-failure');
  const retry = retryPanel && retryPanel.querySelector('.ctv-checkpoint-retry');
  assert.ok(retryPanel && retryPanel.parentNode === root, 'retry is outside the hidden response rail');
  assert.equal(retryPanel.hidden, false);
  assert.equal(rail.hidden, true, 'the action ownership lock remains in force');
  assert.ok(retry && !retry.disabled);
  assert.equal(fixture.realm.document.activeElement, retry, 'retry receives keyboard focus');
  assert.equal(fixture.state.tutorialTimeTravelDone, false);
  assert.equal(fixture.state.tutorialDone, false);
  assert.equal(fixture.state.keysNamed, false);
  assert.equal(fixture.createdClasses.filter(name => name === 'ctv-montage').length, 1);

  retry.click();
  assert.equal(fixture.state.tutorialTimeTravelDone, true);
  assert.equal(fixture.state.tutorialBeatId, 'next-time-travel');
  assert.equal(fixture.state.tutorialDone, false);
  assert.equal(fixture.state.keysNamed, false);
  assert.equal(root.querySelector('.ctv-checkpoint-failure'), null);
  assert.ok(root.querySelector('.ctv-time-travel-switch'), 'the next checkpoint owns its own activation');
  assert.equal(fixture.createdClasses.filter(name => name === 'ctv-montage').length, 1,
    'retry persists the completed action without replaying its room-cycle scene');
});

test('failed promise persistence keeps apps locked until an explicit retry stores the exact promise', async () => {
  const beats = [
    actionBeat('mutual-care-promise', 'promise'),
    actionBeat('time-travel-action', 'time-travel'),
    actionBeat('next-time-travel', 'time-travel')
  ];
  const fixture = actionRealm({beats, failKey: 'tutorialPromise'});
  await runClassic('src/cutscene.js', fixture.realm);
  fixture.realm.window.Cutscene.open(0);

  const form = fixture.click('.ctv-promise-form');
  const input = form.querySelector('.ctv-promise-input');
  const status = form.parentNode.querySelector('.ctv-action-status');
  input.value = 'I will be kind to little Robin';
  form.dispatch('submit', {preventDefault() {}});
  assert.match(status.textContent, /not the promise/);
  assert.equal(fixture.state.tutorialPromise, null);
  assert.equal(fixture.state.tutorialDone, false);

  input.value = '  i   WILL be nice to LITTLE   robin... ';
  form.dispatch('submit', {preventDefault() {}});
  const root = fixture.realm.document.getElementById('cutscene');
  const retryPanel = root.querySelector('.ctv-checkpoint-failure');
  const retry = retryPanel && retryPanel.querySelector('.ctv-checkpoint-retry');
  assert.ok(retryPanel && retryPanel.parentNode === root);
  assert.equal(root.querySelector('.ctv-response-rail').hidden, true);
  assert.equal(fixture.realm.document.activeElement, retry);
  assert.equal(fixture.state.tutorialPromise, null);
  assert.equal(fixture.state.tutorialDone, false);
  assert.equal(fixture.state.keysNamed, false);

  retry.click();
  assert.equal(fixture.state.tutorialPromise.accepted, true);
  assert.equal(fixture.state.tutorialPromise.alias, 'Robin');
  assert.equal(fixture.state.tutorialBeatId, 'time-travel-action');
  assert.equal(fixture.state.tutorialDone, false);
  assert.equal(fixture.state.keysNamed, false);
  assert.ok(root.querySelector('.ctv-time-travel-switch'));
});

test('finale reveal and its checkpoint must succeed before unlock, and saved finales resume without replay', async () => {
  const finale = {...actionBeat('final-inscription', 'finale'), text: 'I appear the same but different'};
  const fixture = actionRealm({
    beats: [finale],
    failKey: 'tutorialFinaleShown',
    initialState: {
      tutorialPromise: {version: 1, accepted: true, alias: 'Robin', acceptedAt: 1}
    }
  });
  let revealCalls = 0;
  fixture.realm.window.LiberTraveROM = {
    revealAll() {
      revealCalls++;
      if (revealCalls === 1) throw new Error('synthetic TraveROM failure');
    }
  };
  await runClassic('src/cutscene.js', fixture.realm);
  fixture.realm.window.Cutscene.open(0);
  fixture.runTypewrite();

  let root = fixture.realm.document.getElementById('cutscene');
  let retry = root.querySelector('.ctv-checkpoint-retry');
  assert.ok(retry);
  assert.match(root.querySelector('.ctv-checkpoint-status').textContent, /console could not wake/);
  assert.equal(retry.parentNode.attributes['aria-label'], 'retry the finale');
  assert.equal(fixture.state.tutorialFinaleShown, false);
  assert.equal(fixture.state.tutorialDone, false);
  assert.equal(fixture.state.keysNamed, false);
  assert.ok(fixture.failures.some(item => item.event === 'tutorial-traveller-reveal-failed'));

  retry.click();
  root = fixture.realm.document.getElementById('cutscene');
  retry = root.querySelector('.ctv-checkpoint-retry');
  assert.ok(retry, 'failed finale checkpoint save exposes a separate retry');
  assert.equal(revealCalls, 2, 'retry after a reveal failure retries the reveal exactly once');
  assert.equal(fixture.state.tutorialFinaleShown, false);
  assert.equal(fixture.state.tutorialDone, false);
  assert.equal(fixture.state.keysNamed, false);

  retry.click();
  assert.equal(revealCalls, 2, 'checkpoint retry does not reveal travellers a second time');
  assert.equal(fixture.state.tutorialFinaleShown, true);
  assert.equal(fixture.state.tutorialDone, false);
  assert.equal(fixture.state.keysNamed, false);
  assert.equal(root.querySelector('.ctv-checkpoint-failure'), null);

  const resumed = actionRealm({
    beats: [finale],
    initialState: {...fixture.state}
  });
  let resumedRevealCalls = 0;
  resumed.realm.window.LiberTraveROM = {revealAll() { resumedRevealCalls++; }};
  await runClassic('src/cutscene.js', resumed.realm);
  resumed.realm.window.Cutscene.open(0);
  assert.equal(resumedRevealCalls, 0, 'reload resumes after the durable reveal marker');
  assert.equal(resumed.state.tutorialDone, true);
  assert.equal(resumed.state.keysNamed, true);
});

test('threefold Wanderlust dialogue shares one line across linked plates and keeps one advance owner', async () => {
  const fates = {
    ...actionBeat('fates-threefold', 'dialogue'),
    speaker: 'wanderlust',
    text: 'I spilled my secrets to the Greeks.',
    response: '>>',
    form: 'fates',
    threefold: true
  };
  const fixture = actionRealm({beats: [fates]});
  await runClassic('src/cutscene.js', fixture.realm);
  fixture.realm.window.Cutscene.open(0);
  fixture.runTypewrite();

  const root = fixture.realm.document.getElementById('cutscene');
  const linked = root.querySelectorAll('.ctv-linked-voice');
  const lines = [root.querySelector('.ctv-line'), ...root.querySelectorAll('.ctv-linked-line')];
  assert.equal(linked.length, 2);
  assert.deepEqual(lines.map(line => line.textContent), Array(3).fill(fates.text));
  assert.ok(linked.every(plate => plate.attributes['aria-hidden'] === 'true'));
  const advances = root.querySelectorAll('.ctv-response');
  assert.equal(advances.length, 1);
  assert.equal(advances[0].textContent, '>>');
  assert.equal(advances[0].disabled, false);
});
