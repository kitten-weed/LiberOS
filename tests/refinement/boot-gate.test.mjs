import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic} from './harness.mjs';

async function runGate(consent, storageReadFails = false) {
  const realm = makeRealm(consent === undefined ? {} : {liber_vacui_consent: consent});
  const redirects = [];
  let stopped = 0;
  const location = {
    pathname: '/poppet-lab.html',
    search: '',
    replace(url) { redirects.push(url); }
  };
  realm.window.location = location;
  realm.window.stop = () => { stopped++; };
  realm.context.location = location;
  if (storageReadFails) {
    realm.storage.getItem = () => { throw new Error('synthetic storage rejection'); };
  }
  await runClassic('src/boot-gate.js', realm);
  return {redirects, stopped};
}

test('boot gate only accepts the explicit consent marker', async () => {
  assert.deepEqual(await runGate('1'), {redirects: [], stopped: 0});
  assert.deepEqual(await runGate(null), {
    redirects: ['index.html?gate=1&from=poppet-lab.html'],
    stopped: 1
  });
  assert.deepEqual(await runGate('0'), {
    redirects: ['index.html?gate=1&from=poppet-lab.html'],
    stopped: 1
  });
  assert.deepEqual(await runGate(undefined, true), {
    redirects: ['index.html?gate=1&from=poppet-lab.html'],
    stopped: 1
  });
});
