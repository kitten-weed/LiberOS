import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRealm, loadModule, plain} from './harness.mjs';

function answerFixture(data, optionIndex) {
  return Object.fromEntries(data.QUESTIONS.map(question => [
    question.id, question.options[optionIndex].id
  ]));
}

function resultRecord(data, answers) {
  const scores = data.scoreAnswers(answers);
  const [closest] = data.suggestions(scores);
  const palette = data.paletteFor(scores);
  return {
    version: data.ONBOARDING_VERSION,
    scoreVersion: data.SCORING_VERSION,
    paletteVersion: data.PALETTE_VERSION,
    phase: 'suggestions',
    questionIndex: data.QUESTIONS.length - 1,
    answers,
    resultId: closest.id,
    templateId: null,
    selectionMode: null,
    paletteId: palette.id,
    chapterPaletteIds: data.chapterPaletteIds(palette),
    receiptText: data.personalityReceipt(scores),
    confirmed: false
  };
}

test('each option has an explicit semantic score and opposite fixtures do not cancel', async () => {
  const data = await loadModule('src/first-rite-data.js', makeRealm());
  assert.equal(data.QUESTIONS.length, 10);
  assert.equal(new Set(data.QUESTIONS.map(question => question.id)).size, 10);
  for (const question of data.QUESTIONS) {
    assert.equal(question.options.length, 4);
    assert.deepEqual(plain(question.options.map(option => option.score)), [2, 1, -1, -2]);
    assert.equal(new Set(question.options.map(option => option.id)).size, 4);
  }

  const allA = answerFixture(data, 0);
  const allD = answerFixture(data, 3);
  const high = data.scoreAnswers(allA);
  const low = data.scoreAnswers(allD);
  assert.deepEqual(plain(high), {
    openness: 2, conscientiousness: 2, extraversion: 2, agreeableness: 2, stability: 2
  });
  assert.deepEqual(plain(low), {
    openness: -2, conscientiousness: -2, extraversion: -2, agreeableness: -2, stability: -2
  });
  for (const factor of data.FACTORS) assert.ok(high[factor] > low[factor], factor);

  const mixedAnswers = {...allA, 'known-path': 'd'};
  const mixed = data.scoreAnswers(mixedAnswers);
  assert.equal(mixed.openness, 0);
  assert.equal(mixed.conscientiousness, 2);
  assert.equal(mixed.extraversion, 2);
  assert.equal(mixed.agreeableness, 2);
  assert.equal(mixed.stability, 2);
  assert.throws(() => data.scoreAnswers({}), /all ten questions/);
  assert.throws(() => data.scoreAnswers({...allA, 'unknown-question': 'a'}), /all ten questions/);
  assert.throws(() => data.scoreAnswers({...allA, 'locked-drawer': 'not-an-answer'}), /unknown answer/);
});

test('the chart manifest and chapter palettes preserve universal cores and personalized accents', async () => {
  const data = await loadModule('src/first-rite-data.js', makeRealm());
  assert.equal(data.CHART_MANIFEST.length, 25);
  assert.equal(new Set(data.CHART_MANIFEST.map(swatch => swatch.id)).size, 25);
  assert.equal(new Set(data.CHART_MANIFEST.map(swatch => swatch.hex)).size, 25);
  assert.equal(data.CHART_MANIFEST.find(swatch => swatch.id === 'r1c4').hex, '#253fae');
  assert.equal(data.CHART_MANIFEST.find(swatch => swatch.id === 'r2c2').hex, '#fdfc0a');
  assert.equal(data.CHART_MANIFEST.find(swatch => swatch.id === 'r3c5').hex, '#e23037');
  assert.equal(data.CHART_MANIFEST.find(swatch => swatch.id === 'r5c5').hex, '#090804');
  assert.equal(data.CHART_MANIFEST.find(swatch => swatch.id === 'r4c3').name, 'Warm Gray');
  assert.equal(data.CHART_MANIFEST.find(swatch => swatch.id === 'r4c4').name, 'Lavender Gray');
  assert.match(data.CHART_MANIFEST.find(swatch => swatch.id === 'r4c2').samplingNote, /red field/);

  const highPalette = data.paletteFor(data.scoreAnswers(answerFixture(data, 0)));
  const lowPalette = data.paletteFor(data.scoreAnswers(answerFixture(data, 3)));
  const chartIds = new Set(data.CHART_MANIFEST.map(swatch => swatch.id));
  for (const chapterId of Object.keys(data.CHAPTER_ACCENT_RULES)) {
    const high = highPalette.chapters[chapterId];
    const low = lowPalette.chapters[chapterId];
    assert.equal(high.inks.length, 6);
    assert.equal(new Set(high.inks.map(ink => ink.id)).size, 6);
    assert.equal(new Set(high.inks.map(ink => ink.hex)).size, 6);
    assert.deepEqual(high.inks.slice(0, 4).map(ink => ink.id), data.CORE_INK_IDS);
    assert.deepEqual(low.inks.slice(0, 4).map(ink => ink.id), data.CORE_INK_IDS);
    assert.equal(high.accents.length, 2);
    assert.ok(high.inks.every(ink => chartIds.has(ink.id)));
    assert.ok(high.accents.every(ink => ink.role === 'accent' && !data.CORE_INK_IDS.includes(ink.id)));
    assert.notDeepEqual(high.accents.map(ink => ink.id), low.accents.map(ink => ink.id),
      chapterId + ' accents should respond to the answer fixture');
    assert.ok(high.inks.every(ink => ink.name && /^#[0-9a-f]{6}$/i.test(ink.hex)));
  }
  assert.deepEqual(
    Object.values(highPalette.chapters).map(chapter => chapter.inks.slice(0, 4).map(ink => ink.hex)),
    Array.from({length: 4}, () => highPalette.chapters.face.inks.slice(0, 4).map(ink => ink.hex))
  );
  assert.throws(() => data.paletteFor({openness: 0}), /complete finite trait scores/);
});

test('personality receipt follows mixed answers without chart judgements or diagnostic claims', async () => {
  const data = await loadModule('src/first-rite-data.js', makeRealm());
  const allA = answerFixture(data, 0);
  const allD = answerFixture(data, 3);
  const mixed = {...allA, 'known-path': 'd'};
  const brightReceipt = data.personalityReceipt(data.scoreAnswers(allA));
  const quietReceipt = data.personalityReceipt(data.scoreAnswers(allD));
  const mixedReceipt = data.personalityReceipt(data.scoreAnswers(mixed));
  assert.ok(brightReceipt.startsWith('From these answers,'));
  assert.notEqual(brightReceipt, quietReceipt);
  assert.match(mixedReceipt, /comfortable moving between familiar routes and new turns/);
  assert.equal((mixedReceipt.match(/[.!?]+(?=\s|$)/g) || []).length, 4);
  assert.doesNotMatch(brightReceipt + quietReceipt + mixedReceipt,
    /spiritual|intellect|deceit|malice|depressed|diagnos|IQ|morality/i);
});

test('the closest matches are deterministic, while legacy onboarding upgrades answers to v2', async () => {
  const data = await loadModule('src/first-rite-data.js', makeRealm());
  const answers = answerFixture(data, 1);
  const scores = data.scoreAnswers(answers);
  const first = data.suggestions(scores);
  assert.deepEqual(plain(data.suggestions(scores)), plain(first));
  assert.equal(first.length, 3);
  assert.equal(first[0].id, data.ARCHETYPES.find(item => item.id === first[0].id).id);

  const legacy = {
    version: 1,
    phase: 'making',
    questionIndex: 9,
    answers: answerFixture(data, 0),
    resultId: 'salt-cartographer',
    templateId: 'bell-ringer',
    paletteId: 'openness-high',
    confirmed: true
  };
  assert.equal(data.validateOnboarding(legacy), true);
  const upgraded = data.migrateOnboarding(legacy);
  assert.equal(upgraded.version, data.ONBOARDING_VERSION);
  assert.deepEqual(plain(upgraded.answers), plain(legacy.answers));
  assert.deepEqual(plain(upgraded.chapterPaletteIds), plain(data.chapterPaletteIds(
    data.paletteFor(data.scoreAnswers(legacy.answers)))));
  assert.equal(upgraded.resultId, data.suggestions(data.scoreAnswers(legacy.answers))[0].id);
  assert.equal(upgraded.receiptText, data.personalityReceipt(data.scoreAnswers(legacy.answers)));
  assert.equal(upgraded.selectionMode, 'template');
  assert.equal(data.validateOnboarding(upgraded), true);
});

test('blank is an explicit v2 selection and never masquerades as a ranked template', async () => {
  const data = await loadModule('src/first-rite-data.js', makeRealm());
  const base = resultRecord(data, answerFixture(data, 0));
  const blankSuggestion = {...base, selectionMode: 'blank'};
  assert.equal(data.validateOnboarding(blankSuggestion), true);
  const blankMaking = {...blankSuggestion, phase: 'making', confirmed: true};
  assert.equal(data.validateOnboarding(blankMaking), true);
  assert.equal(data.validateOnboarding({...blankMaking, templateId: 'salt-cartographer'}), false);
  assert.equal(data.validateOnboarding({...base, resultId: 'clinical-label'}), false);
  assert.equal(data.validateOnboarding({...base, answers: {...base.answers, 'unknown-question': 'a'}}), false);
  assert.throws(() => data.migrateOnboarding({...base, version: 99}), /malformed/);
});

test('template marks use the matching face and clothing chapter palette', async () => {
  const data = await loadModule('src/first-rite-data.js', makeRealm());
  const answers = answerFixture(data, 0);
  const palettes = data.paletteFor(data.scoreAnswers(answers));
  const faceColors = [];
  const clothingColors = [];
  function context(colors) {
    return {
      strokeStyle: '#000000',
      fillStyle: '#000000',
      save() {},
      restore() {},
      clearRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() { colors.push(this.strokeStyle); },
      arc() {},
      rect() {},
      clip() {},
      fill() { colors.push(this.fillStyle); }
    };
  }
  const faceMaps = Object.fromEntries(['hair', 'eyes', 'face'].map(kind => [kind, {
    ctx: context(faceColors), cv: {width: 256, height: 256}, tex: {needsUpdate: false}
  }]));
  const parts = new Set(data.TEMPLATES[0].marks.hull.map(([part]) => part));
  const doll = {
    faceMaps,
    hullCtx: context(clothingColors),
    hullCanvas: {width: 512, height: 256},
    hullTex: {needsUpdate: false},
    hullRects: Object.fromEntries(Array.from(parts, part => [part, [0, 0, 1, 1]])),
    setParams() {},
    rebuild() {},
    setFaceShell() {},
    setHulls() {}
  };
  data.applyTemplate(doll, data.TEMPLATES[0], palettes);
  const faceSet = new Set(palettes.chapters.face.inks.map(ink => ink.hex));
  const clothesSet = new Set(palettes.chapters.clothes.inks.map(ink => ink.hex));
  assert.ok(faceColors.length && faceColors.every(hex => faceSet.has(hex)));
  assert.ok(clothingColors.length && clothingColors.every(hex => clothesSet.has(hex)));
  assert.ok(faceColors.some(hex => palettes.chapters.face.accents.some(ink => ink.hex === hex)));
  assert.ok(clothingColors.some(hex => palettes.chapters.clothes.accents.some(ink => ink.hex === hex)));
});
