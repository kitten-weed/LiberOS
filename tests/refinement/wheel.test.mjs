import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic} from './harness.mjs';

test('each shipped wheel wedge uses opaque ink with at least 4.5:1 contrast', async () => {
  const realm = makeRealm();
  await runClassic('src/features/games/booths/wheel.js', realm);
  for (const wedge of realm.context.WHEEL_EMOTIONS) {
    const hex = realm.context.wheelLabelInk(wedge.hex);
    const luminance = color => {
      const rgb = color.match(/[a-f0-9]{2}/gi).map(value => parseInt(value, 16) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    };
    const foreground = luminance(hex);
    const background = luminance(wedge.hex);
    assert.ok((Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05) >= 4.5, wedge.name);
  }
});
