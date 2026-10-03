import vm from 'node:vm';
import {setImmediate as nextTurn} from 'node:timers/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic} from './harness.mjs';

test('dismissed loading rite cannot remount when imports resolve', async () => {
  const r = makeRealm(), pending = [], calls = {ready: 0, error: 0, dismiss: 0};
  const stage = {
    children: [],
    appendChild(node) { node.parentNode = this; this.children.push(node); },
    removeChild(node) {
      this.children.splice(this.children.indexOf(node), 1);
      node.parentNode = null;
    }
  };
  r.window.document.querySelector = selector => selector === '.screen-stage' ? stage : null;
  r.window.document.createElement = () => ({
    innerHTML: '',
    classList: {add() {}, remove() {}, contains() { return false; }},
    setAttribute() {},
    removeAttribute() {},
    querySelector() { return null; }
  });
  r.context.confirm = () => true;
  await runClassic('src/poppet-rite.js', r, {
    importModuleDynamically: specifier => new Promise(resolve => {
      const kit = specifier.includes('paint-kit');
      const mod = new vm.SyntheticModule(kit ? ['INKS', 'SIZES'] : [], function () {
        if (kit) {
          this.setExport('INKS', ['#2b2016']);
          this.setExport('SIZES', [6, 10, 18]);
        }
      }, {context: r.context});
      pending.push(async () => {
        await mod.link(() => { throw new Error('unexpected synthetic import'); });
        await mod.evaluate();
        resolve(mod);
      });
    })
  });
  const session = r.window.LiberPoppetRite.open({
    onReady: () => calls.ready++,
    onError: () => calls.error++,
    onDismiss: () => calls.dismiss++
  });
  assert.ok(session);
  assert.equal(r.window.LiberPoppetRite.open(), session);
  assert.equal(stage.children.length, 1);
  await nextTurn();
  assert.equal(pending.length, 8);
  assert.equal(typeof r.window.LiberPoppetRite.requestDismiss, 'function');
  assert.equal(r.window.LiberPoppetRite.requestDismiss(), true);
  assert.equal(r.window.LiberPoppetRite.requestDismiss(), false);
  for (const release of pending) await release();
  await nextTurn();
  assert.deepEqual(calls, {ready: 0, error: 0, dismiss: 1});
  assert.equal(stage.children.length, 0);
});

test('failed rite setup stays open with an explicit retry instead of dismissing', async () => {
  const r = makeRealm(), calls = {error: 0, dismiss: 0}, stage = {
    children: [],
    appendChild(node) { node.parentNode = this; this.children.push(node); },
    removeChild(node) {
      this.children.splice(this.children.indexOf(node), 1);
      node.parentNode = null;
    }
  };
  let retryHandler = null;
  const shell = {
    innerHTML: '',
    classList: {add() {}, remove() {}, contains() { return false;}},
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    querySelector(selector) {
      return selector === '.rite-retry'
        ? {addEventListener(_event, handler) { retryHandler = handler; }}
        : null;
    }
  };
  r.window.document.querySelector = selector => selector === '.screen-stage' ? stage : null;
  r.window.document.createElement = () => shell;
  r.context.console = {error() {}};
  r.context.confirm = () => true;
  let importAttempts = 0;
  await runClassic('src/poppet-rite.js', r, {
    importModuleDynamically() {
      importAttempts++;
      return Promise.reject(new Error('blocked synthetic import'));
    }
  });
  const session = r.window.LiberPoppetRite.open({
    onError: () => calls.error++,
    onDismiss: () => calls.dismiss++
  });
  await nextTurn();
  assert.equal(calls.error, 1);
  assert.equal(calls.dismiss, 0);
  assert.match(shell.innerHTML, /the first rite could not start\. try again\./);
  assert.equal(stage.children.length, 1);
  assert.equal(typeof retryHandler, 'function');

  retryHandler();
  await nextTurn();
  assert.equal(calls.error, 2);
  assert.equal(importAttempts, 16);
  assert.equal(stage.children.length, 1);
  assert.equal(r.window.LiberPoppetRite.requestDismiss(), true);
  assert.equal(calls.dismiss, 1);
  assert.equal(stage.children.length, 0);
  assert.equal(session.closed, true);
});
