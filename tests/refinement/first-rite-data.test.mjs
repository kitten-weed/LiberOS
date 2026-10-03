import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, loadModule} from './harness.mjs';

test('first-rite questions are complete, deterministic, and tied to six labelled inks', async () => {
  const realm = makeRealm();
  const data = await loadModule('src/first-rite-data.js', realm);

  assert.equal(data.QUESTIONS.length, 10);
  assert.equal(new Set(data.QUESTIONS.map(question => question.id)).size, 10);
  for (const question of data.QUESTIONS) {
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options.map(option => option.id)).size, 4);
  }

  const answers = Object.fromEntries(data.QUESTIONS.map(question => [question.id, question.options[1].id]));
  const scores = data.scoreAnswers(answers);
  assert.deepEqual(data.scoreAnswers(answers), scores);
  const first = data.suggestions(scores);
  assert.deepEqual(data.suggestions(scores), first);
  assert.equal(first.length, 3);
  assert.equal(first[0].id, data.ARCHETYPES.find(item => item.id === first[0].id).id);

  const palette = data.paletteFor(scores);
  assert.equal(palette.inks.length, 6);
  assert.equal(new Set(palette.inks.map(ink => ink.hex)).size, 6);
  assert.equal(new Set(palette.inks.map(ink => ink.name)).size, 6);
  assert.ok(palette.inks.every(ink => ink.name && /^#[0-9a-f]{6}$/i.test(ink.hex)));
  assert.throws(() => data.scoreAnswers({}), /all ten questions/);
  assert.throws(() => data.scoreAnswers({...answers, 'unknown-question': 'a'}), /all ten questions/);
});

test('onboarding accepts partial answers but only validates complete derived choices', async () => {
  const realm = makeRealm();
  const data = await loadModule('src/first-rite-data.js', realm);
  const question = data.QUESTIONS[0];
  const partial = {
    version: 1,
    phase: 'questions',
    questionIndex: 0,
    answers: {[question.id]: question.options[0].id}
  };
  assert.equal(data.validateOnboarding(partial), true);
  assert.equal(data.validateOnboarding({...partial, answers: {[question.id]: 'not-an-answer'}}), false);

  const answers = Object.fromEntries(data.QUESTIONS.map(entry => [entry.id, entry.options[0].id]));
  const scores = data.scoreAnswers(answers);
  const [closest] = data.suggestions(scores);
  const palette = data.paletteFor(scores);
  const suggestions = {
    version: 1,
    phase: 'suggestions',
    questionIndex: 9,
    answers,
    resultId: closest.id,
    paletteId: palette.id,
    templateId: null,
    confirmed: false
  };
  assert.equal(data.validateOnboarding(suggestions), true);
  assert.equal(data.validateOnboarding({...suggestions, resultId: 'clinical-label'}), false);

  const making = {...suggestions, phase: 'making', templateId: closest.template, confirmed: true};
  assert.equal(data.validateOnboarding(making), true);
  assert.equal(data.validateOnboarding({...making, confirmed: false}), false);
});
