import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, loadModule} from './harness.mjs';

test('cropped and whole-sheet views share redraw and pointer transforms', async () => {
  const realm = makeRealm();
  const {makeWorksurface} = await loadModule('poppet-lab/surface.js?v=lab53', realm);
  const drawn = [];
  const context = {
    clearRect() {},
    fillRect() {},
    drawImage(...args) { drawn.push(args); }
  };
  const sheet = {
    width: 512,
    height: 256,
    getContext: () => context
  };
  const display = {
    getBoundingClientRect: () => ({left: 100, top: 40, width: 258, height: 258})
  };
  const surface = makeWorksurface({cv: sheet, el: display, key: 'clothes'});
  const fit = surface.fitBox(512, 512);
  assert.equal(sheet.width, 512);
  assert.equal(sheet.height, 256);
  assert.equal(fit.dw, 512);
  assert.equal(fit.dh, 256);
  assert.equal(fit.oy, 128);
  const center = surface.pos({clientX: 229, clientY: 169});
  assert.equal(center.x, 256);
  assert.equal(center.y, 128);
  assert.ok(surface.pos({clientX: 229, clientY: 44}).y < 0);
  surface.redraw(context, 512, 512);
  assert.deepEqual(drawn[0].slice(1), [0, 0, 512, 256, 0, 128, 512, 256]);

  surface.setCrop([0.25, 0.5, 0.5, 0.25], 'armLU');
  const crop = surface.pos({clientX: 229, clientY: 169});
  assert.equal(crop.x, 256);
  assert.equal(crop.y, 160);
  assert.equal(crop.inside, true);
  const outside = surface.pos({clientX: 229, clientY: 99});
  assert.equal(outside.inside, false);
  assert.equal(surface.contains(outside.x, outside.y), false);
  surface.redraw(context, 512, 512);
  assert.deepEqual(drawn[1].slice(1), [128, 128, 256, 64, 0, 192, 512, 128]);
});
