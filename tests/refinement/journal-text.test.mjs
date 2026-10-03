import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, runClassic} from './harness.mjs';

test('spoken body survives and an empty edit stays empty', async () => {
  const r = makeRealm();
  await runClassic('src/features/journal/entry-text.js', r);
  const text = r.window.LiberJournalText;
  const entry = {
    kind: 'spoken',
    name: 'riason asked',
    body: 'what did writing help you notice?'
  };
  assert.equal(text(entry), entry.body);
  assert.equal(text({...entry, text: 'my revised wording'}), 'my revised wording');
  assert.equal(text({...entry, text: ''}), '');
  assert.equal(text({...entry, text: null}), entry.body);
  assert.equal(text({body: '<img src=x onerror=alert(1)>'}), '<img src=x onerror=alert(1)>');
  assert.throws(() => text({body: {unexpected: true}}), /string/i);
});
