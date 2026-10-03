export const FACTORS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'stability'];
export const ONBOARDING_VERSION = 2;
export const SCORING_VERSION = 2;
export const PALETTE_VERSION = 2;
export const PALETTE_ID = 'historical-colour-chart-v2';

function options(entries) {
  return entries.map(([label, score], index) => ({
    id: String.fromCharCode(97 + index),
    label,
    score
  }));
}

export const QUESTIONS = [
  { id: 'locked-drawer', factor: 'openness', prompt: 'A drawer in the old machine clicks open by itself. What do you do?', options: options([
    ['Look for what is hidden inside', 2], ['Listen for a moment, then peek', 1],
    ['Check whether it belongs to the machine', -1], ['Close it and leave the mystery alone', -2]
  ]) },
  { id: 'known-path', factor: 'openness', prompt: 'A familiar path has grown a new, strange turn.', options: options([
    ['Take the turn before it disappears', 2], ['Try it if someone comes along', 1],
    ['Stay on the path I know', -1], ['Keep to the marked route', -2]
  ]) },
  { id: 'small-task', factor: 'conscientiousness', prompt: 'A small job is waiting beside the door.', options: options([
    ['Finish it before anything else', 2], ['Make a little start now', 1],
    ['Do it when the moment feels right', -1], ['Let it wait; another thing will call', -2]
  ]) },
  { id: 'packing', factor: 'conscientiousness', prompt: 'There is room for one more thing in the travel bag.', options: options([
    ['Make a list, then pack it neatly', 2], ['Pack it after a quick check', 1],
    ['Toss it in and see what happens', -1], ['Leave space for whatever turns up', -2]
  ]) },
  { id: 'gathering', factor: 'extraversion', prompt: 'A gathering is already humming in the next room.', options: options([
    ['Go in and find the liveliest circle', 2], ['Join after I know someone there', 1],
    ['Listen from the doorway first', -1], ['Keep the quiet room company', -2]
  ]) },
  { id: 'long-evening', factor: 'extraversion', prompt: 'After a long evening with others, what sounds best?', options: options([
    ['Stay for one more story', 2], ['Leave after saying goodnight', 1],
    ['Find a little quiet to recharge', -1], ['Slip away and be alone awhile', -2]
  ]) },
  { id: 'lost-button', factor: 'agreeableness', prompt: 'Someone drops a button and does not notice.', options: options([
    ['Pick it up and catch them', 2], ['Point it out if we cross paths', 1],
    ['Leave it where it fell', -1], ['Keep walking; they may not want help', -2]
  ]) },
  { id: 'shared-table', factor: 'agreeableness', prompt: 'There is one chair left at a crowded table.', options: options([
    ['Make room and ask who needs it', 2], ['Offer it to someone nearby', 1],
    ['Take it before it goes', -1], ['Keep my place; others can ask', -2]
  ]) },
  { id: 'storm-glass', factor: 'stability', prompt: 'Stormlight flickers behind the glass. What is closest to your first response?', options: options([
    ['Pause and see what the storm does', 2], ['Steady one small thing, then decide', 1],
    ['Take a little distance before deciding', -1], ['Wait to decide until the storm has passed', -2]
  ]) },
  { id: 'missed-train', factor: 'stability', prompt: 'The train leaves just before you reach the platform. What now?', options: options([
    ['Pause; the next route can wait one breath', 2], ['Feel the sting, then look for another route', 1],
    ['Take a moment away from the platform', -1], ['Let the plan go for today', -2]
  ]) }
];

export const ARCHETYPES = [
  { id: 'lantern-tender', name: 'Lantern Tender', line: 'Keeps a little light for the way back.', profile: [1.4, 1.2, -0.2, 1.2, 1.4], template: 'lantern-tender' },
  { id: 'moss-listener', name: 'Moss Listener', line: 'Notices what grows in the quiet.', profile: [1.5, -0.6, -1.3, 1.1, 0.3], template: 'moss-listener' },
  { id: 'bell-ringer', name: 'Bell Ringer', line: 'Makes room for a new voice.', profile: [0.8, 0.2, 1.6, 1.1, 0.2], template: 'bell-ringer' },
  { id: 'salt-cartographer', name: 'Salt Cartographer', line: 'Finds a route by feel and keeps moving.', profile: [1.3, -0.5, 0.8, 0.1, -0.8], template: 'salt-cartographer' },
  { id: 'thread-keeper', name: 'Thread Keeper', line: 'Ties loose ends into something useful.', profile: [-0.4, 1.7, -0.1, 0.9, 0.6], template: 'thread-keeper' },
  { id: 'night-gardener', name: 'Night Gardener', line: 'Lets a new thing grow at its own pace.', profile: [1.7, -1.1, -0.8, 0.1, -1.2], template: 'night-gardener' }
];

export const TEMPLATES = [
  {
    id: 'lantern-tender', name: 'Lantern Tender', line: 'Keeps a little light for the way back.',
    proportions: { head: 0.46, chest: 1.08, waist: 0.56, hips: 1.05, arml: 0.96, armt: 1.02, legl: 1.03, legt: 1.05, flop: 0.38 },
    marks: { hair: [[[0.16, 0.9], [0.27, 0.85], [0.41, 0.89], [0.57, 0.86], [0.8, 0.92]]], eyes: [[[0.3, 0.5], [0.39, 0.5]], [[0.61, 0.5], [0.7, 0.5]]], face: [[[0.43, 0.08], [0.5, 0.12], [0.57, 0.08]]], hull: [['armLU', 0.5, 0.28], ['legRU', 0.5, 0.72]] }
  },
  {
    id: 'moss-listener', name: 'Moss Listener', line: 'Notices what grows in the quiet.',
    proportions: { head: 0.5, chest: 0.91, waist: 0.62, hips: 1.13, arml: 1.06, armt: 0.94, legl: 0.96, legt: 1.11, flop: 0.51 },
    marks: { hair: [[[0.12, 0.9], [0.28, 0.86], [0.42, 0.89], [0.58, 0.86], [0.76, 0.9], [0.88, 0.87]]], eyes: [[[0.3, 0.49], [0.4, 0.51]], [[0.6, 0.51], [0.7, 0.49]]], face: [[[0.42, 0.11], [0.5, 0.08], [0.58, 0.11]]], hull: [['armRU', 0.5, 0.32], ['legLL', 0.5, 0.65]] }
  },
  {
    id: 'bell-ringer', name: 'Bell Ringer', line: 'Makes room for a new voice.',
    proportions: { head: 0.4, chest: 1.13, waist: 0.5, hips: 0.93, arml: 1.11, armt: 1.08, legl: 0.98, legt: 0.94, flop: 0.33 },
    marks: { hair: [[[0.14, 0.9], [0.28, 0.86], [0.36, 0.91]], [[0.64, 0.91], [0.72, 0.86], [0.86, 0.9]]], eyes: [[[0.29, 0.5], [0.4, 0.5]], [[0.6, 0.5], [0.71, 0.5]]], face: [[[0.42, 0.08], [0.5, 0.12], [0.58, 0.08]]], hull: [['armLL', 0.5, 0.42], ['legRL', 0.5, 0.56]] }
  },
  {
    id: 'salt-cartographer', name: 'Salt Cartographer', line: 'Finds a route by feel and keeps moving.',
    proportions: { head: 0.43, chest: 0.96, waist: 0.45, hips: 1.08, arml: 1.03, armt: 0.93, legl: 1.12, legt: 1.09, flop: 0.56 },
    marks: { hair: [[[0.18, 0.89], [0.31, 0.86], [0.48, 0.91], [0.68, 0.85], [0.83, 0.89]]], eyes: [[[0.31, 0.49], [0.4, 0.51]], [[0.6, 0.51], [0.69, 0.49]]], face: [[[0.45, 0.06], [0.5, 0.1], [0.55, 0.06]]], hull: [['armLU', 0.5, 0.68], ['legRU', 0.5, 0.29]] }
  },
  {
    id: 'thread-keeper', name: 'Thread Keeper', line: 'Ties loose ends into something useful.',
    proportions: { head: 0.41, chest: 1.02, waist: 0.57, hips: 1.1, arml: 0.97, armt: 1.11, legl: 0.99, legt: 1.02, flop: 0.41 },
    marks: { hair: [[[0.15, 0.92], [0.3, 0.86], [0.46, 0.9], [0.61, 0.86], [0.84, 0.92]]], eyes: [[[0.3, 0.5], [0.4, 0.5]], [[0.6, 0.5], [0.7, 0.5]]], face: [[[0.43, 0.12], [0.5, 0.07], [0.57, 0.12]]], hull: [['armRL', 0.5, 0.32], ['legLU', 0.5, 0.67]] }
  },
  {
    id: 'night-gardener', name: 'Night Gardener', line: 'Lets a new thing grow at its own pace.',
    proportions: { head: 0.48, chest: 0.94, waist: 0.66, hips: 0.97, arml: 1.09, armt: 0.95, legl: 1.04, legt: 0.98, flop: 0.48 },
    marks: { hair: [[[0.11, 0.92], [0.23, 0.85], [0.39, 0.9], [0.55, 0.85], [0.74, 0.89], [0.9, 0.86]]], eyes: [[[0.31, 0.5], [0.4, 0.49]], [[0.6, 0.49], [0.69, 0.5]]], face: [[[0.43, 0.06], [0.5, 0.11], [0.57, 0.06]]], hull: [['armRU', 0.5, 0.64], ['legLL', 0.5, 0.34]] }
  }
];

export const CHART_SOURCE = Object.freeze({
  title: 'User-supplied historical 5×5 colour chart',
  sampling: 'Representative sRGB hues authored from an uncalibrated, textured photograph.',
  use: 'Artistic palette source only; neither the colours nor their historical labels assess a person.'
});

const HISTORICAL_MEANINGS = [
  'High Spirituality', 'Devotion mixed with Affection', 'Devotion to a Noble Ideal', 'Pure Religious Feeling', 'Selfish Religious Feeling',
  'Religious Feeling tinged with Fear', 'Highest Intellect', 'Strong Intellect', 'Low type of Intellect', 'Pride',
  'Sympathy', 'Love for Humanity', 'Unselfish Affection', 'Selfish Affection', 'Pure Affection',
  'Adaptability', 'Jealousy', 'Deceit', 'Fear', 'Depression',
  'Selfishness', 'Avarice', 'Anger', 'Sensuality', 'Malice'
];

export const CHART_MANIFEST = [
  ['Lavender Mist', '#ada4cc'], ['Indigo', '#231856'], ['Periwinkle', '#6c88d9'], ['Royal Blue', '#253fae'], ['Night-sky Blue', '#243568'],
  ['Storm Blue', '#273765'], ['Sun Yellow', '#fdfc0a'], ['Warm Ochre', '#e9a42b'], ['Golden Earth', '#d67735'], ['Copper Red', '#e14131'],
  ['Moss Green', '#91b870'], ['Rose Violet', '#c79ec6'], ['Blush', '#e27f90'], ['Deep Rose', '#66191f'], ['Poppy Red', '#e23037'],
  ['Olive', '#75763c'], ['Patterned Vermilion', '#7d3d2b'], ['Warm Gray', '#939389'], ['Lavender Gray', '#a294b1'], ['Dark Plum', '#543b48'],
  ['Umber', '#764941'], ['Rust', '#992623'], ['Deep Rust', '#b32727'], ['Garnet', '#a22e2f'], ['Near-black', '#090804']
].map(([name, hex], index) => {
  const row = Math.floor(index / 5) + 1;
  const column = index % 5 + 1;
  const notes = row === 1 && column === 5
    ? 'Patterned blue-and-dark cell; the representative hue follows its blue field.'
    : row === 4 && column === 2
      ? 'Patterned red-on-olive cell; the representative hue follows its red field.'
      : null;
  return Object.freeze({
    id: 'r' + row + 'c' + column,
    row,
    column,
    name,
    hex,
    symbolism: HISTORICAL_MEANINGS[index],
    source: CHART_SOURCE.title,
    samplingNote: notes
  });
});

export const CORE_INK_IDS = Object.freeze(['r1c4', 'r2c2', 'r3c5', 'r5c5']);

export const CHAPTER_ACCENT_RULES = Object.freeze({
  face: {
    label: 'Face',
    intent: 'expression, curiosity, and social energy',
    slots: [
      {weights: {openness: 0.65, extraversion: 0.35}, low: 'r1c2', balanced: 'r1c1', high: 'r1c3'},
      {weights: {extraversion: 0.55, agreeableness: 0.45}, low: 'r4c5', balanced: 'r3c3', high: 'r3c2'}
    ]
  },
  clothes: {
    label: 'Clothes',
    intent: 'outward style, intentionality, and spontaneity',
    slots: [
      {weights: {conscientiousness: 0.65, openness: 0.35}, low: 'r5c1', balanced: 'r4c1', high: 'r2c3'},
      {weights: {conscientiousness: 0.5, openness: 0.3, extraversion: 0.2}, low: 'r3c4', balanced: 'r5c2', high: 'r2c5'}
    ]
  },
  personal: {
    label: 'Personal unconscious',
    intent: 'quiet attention, inward imagination, and connection',
    slots: [
      {weights: {openness: 0.55, stability: 0.25, agreeableness: 0.2}, low: 'r2c1', balanced: 'r4c3', high: 'r1c1'},
      {weights: {agreeableness: 0.55, extraversion: -0.25, openness: 0.2}, low: 'r1c2', balanced: 'r3c4', high: 'r3c1'}
    ]
  },
  shadow: {
    label: 'Shadow & surrender',
    intent: 'sensitivity, uncertainty, and emotional intensity as expression',
    slots: [
      {weights: {stability: 0.6, openness: 0.25, agreeableness: 0.15}, low: 'r4c4', balanced: 'r4c5', high: 'r1c2'},
      {weights: {stability: 0.5, extraversion: 0.3, conscientiousness: 0.2}, low: 'r2c1', balanced: 'r5c3', high: 'r5c4'}
    ]
  }
});

const CHART_BY_ID = new Map(CHART_MANIFEST.map(swatch => [swatch.id, swatch]));
const CORE_SWATCHES = CORE_INK_IDS.map(id => CHART_BY_ID.get(id));

function checkedScores(scores) {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores) ||
      Object.keys(scores).length !== FACTORS.length || FACTORS.some(factor =>
    !Number.isFinite(scores[factor]) || scores[factor] < -2 || scores[factor] > 2)) {
    throw new TypeError('complete finite trait scores between -2 and 2 are required');
  }
  return scores;
}

function accentBand(scores, weights) {
  const terms = Object.entries(weights);
  const magnitude = terms.reduce((sum, [, weight]) => sum + Math.abs(weight), 0);
  const signal = terms.reduce((sum, [factor, weight]) => sum + scores[factor] * weight, 0) / magnitude;
  return signal > 0.4 ? 'high' : signal < -0.4 ? 'low' : 'balanced';
}

export function paletteFor(scores) {
  checkedScores(scores);
  const chapters = Object.fromEntries(Object.entries(CHAPTER_ACCENT_RULES).map(([id, rule]) => {
    const accents = rule.slots.map(slot => {
      const swatch = CHART_BY_ID.get(slot[accentBand(scores, slot.weights)]);
      if (!swatch) throw new Error('chapter accent is missing from the chart manifest');
      return {...swatch, role: 'accent'};
    });
    const inks = CORE_SWATCHES.map(swatch => ({...swatch, role: 'core'})).concat(accents);
    if (inks.length !== 6 || new Set(inks.map(ink => ink.id)).size !== 6 ||
        new Set(inks.map(ink => ink.hex)).size !== 6) {
      throw new Error('each chapter palette must contain six distinct chart swatches');
    }
    return [id, {id, label: rule.label, intent: rule.intent, core: inks.slice(0, 4), accents, inks}];
  }));
  return {id: PALETTE_ID, version: PALETTE_VERSION, chapters};
}

export function chapterPaletteIds(palette) {
  if (!palette || !palette.chapters) throw new TypeError('chapter palettes are required');
  return Object.fromEntries(Object.keys(CHAPTER_ACCENT_RULES).map(id => {
    const chapter = palette.chapters[id];
    if (!chapter || !Array.isArray(chapter.inks)) throw new Error('chapter palette is incomplete: ' + id);
    return [id, chapter.inks.map(ink => ink.id)];
  }));
}

export function scoreAnswers(answerIds) {
  if (!answerIds || typeof answerIds !== 'object' || Array.isArray(answerIds)) {
    throw new TypeError('answers must be an object keyed by question ID');
  }
  const ids = Object.keys(answerIds);
  if (ids.length !== QUESTIONS.length || QUESTIONS.some(q => !Object.hasOwn(answerIds, q.id))) {
    throw new Error('all ten questions must be answered exactly once');
  }
  const totals = Object.fromEntries(FACTORS.map(factor => [factor, 0]));
  const counts = Object.fromEntries(FACTORS.map(factor => [factor, 0]));
  // Each option carries its own authored semantic score; no question reverses
  // the meaning of its choices by position or hidden direction multiplier.
  QUESTIONS.forEach(question => {
    const option = question.options.find(item => item.id === answerIds[question.id]);
    if (!option) throw new Error('unknown answer for ' + question.id);
    totals[question.factor] += option.score;
    counts[question.factor]++;
  });
  return Object.fromEntries(FACTORS.map(factor => [
    factor,
    Math.round((totals[factor] / counts[factor]) * 100) / 100
  ]));
}

export function suggestions(scores) {
  checkedScores(scores);
  // Profiles are authored reference vectors, not population norms; catalog order breaks exact ties.
  return ARCHETYPES.map((item, index) => ({
    ...item,
    distance: item.profile.reduce((sum, value, i) => {
      const delta = value - scores[FACTORS[i]];
      return sum + delta * delta;
    }, 0),
    order: index
  })).sort((a, b) => a.distance - b.distance || a.order - b.order)
    .slice(0, 3).map(({distance, ...item}) => item);
}

function tendencyBand(score) {
  return score > 0.4 ? 'positive' : score < -0.4 ? 'negative' : 'balanced';
}

export function personalityReceipt(scores) {
  checkedScores(scores);
  const openness = tendencyBand(scores.openness);
  const conscientiousness = tendencyBand(scores.conscientiousness);
  const extraversion = tendencyBand(scores.extraversion);
  const agreeableness = tendencyBand(scores.agreeableness);
  const stability = tendencyBand(scores.stability);
  const open = openness === 'balanced'
    ? 'comfortable moving between familiar routes and new turns as the moment asks'
    : openness === 'positive'
      ? 'drawn to new turns and hidden possibilities'
      : 'more at ease with a known route, while leaving room for surprises';
  const organised = conscientiousness === 'balanced'
    ? 'shift between a little structure and room to improvise'
    : conscientiousness === 'positive'
      ? 'like giving a task a little structure before it grows'
      : 'often leave a task open for the next thing that calls';
  const social = extraversion === 'balanced'
    ? 'make room for both company and quiet, depending on the day'
    : extraversion === 'positive'
      ? 'often find another story or lively circle worth joining'
      : 'often make space for quiet after time with others';
  const cooperative = agreeableness === 'balanced'
    ? 'balance offering a hand with keeping your own space'
    : agreeableness === 'positive'
      ? 'notice chances to make a little more room for someone'
      : 'tend to keep your own boundaries clear before offering help';
  const uncertainty = stability === 'balanced'
    ? 'may steady one small thing or take a little distance before choosing'
    : stability === 'positive'
      ? 'often pause and choose a next step when something unexpected happens'
      : 'may take a moment away and let a change settle before deciding';
  return 'From these answers, you seem ' + open + '. With plans, you ' +
    organised + '; around other people, you ' + social + '. You may ' + cooperative +
    '. When something unexpected happens, you ' + uncertainty + '.';
}

function trace(ctx, canvas, points, color, width) {
  if (!points.length) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width * canvas.width;
  ctx.beginPath();
  ctx.moveTo(points[0][0] * canvas.width, points[0][1] * canvas.height);
  points.slice(1).forEach(point => ctx.lineTo(point[0] * canvas.width, point[1] * canvas.height));
  if (points.length === 1) {
    ctx.arc(points[0][0] * canvas.width, points[0][1] * canvas.height, width * canvas.width / 2, 0, Math.PI * 2);
  } else ctx.stroke();
  ctx.restore();
}

function paletteInks(palette, chapter) {
  const inks = Array.isArray(palette) ? palette : palette && palette.chapters &&
    palette.chapters[chapter] && palette.chapters[chapter].inks;
  if (!Array.isArray(inks) || inks.length !== 6 ||
      inks.some(ink => !ink || typeof ink.hex !== 'string')) {
    throw new TypeError('a six-ink ' + chapter + ' palette is required');
  }
  return inks;
}

export function applyTemplate(doll, template, palette) {
  if (!doll || !template) throw new TypeError('a doll and template are required');
  const faceInks = paletteInks(palette, 'face');
  const clothingInks = paletteInks(palette, 'clothes');
  for (const kind of ['hair', 'eyes', 'face']) {
    const map = doll.faceMaps[kind];
    map.ctx.clearRect(0, 0, map.cv.width, map.cv.height);
    (template.marks[kind] || []).forEach((points, index) =>
      trace(map.ctx, map.cv, points, faceInks[(index + 4) % faceInks.length].hex, 0.055));
    map.tex.needsUpdate = true;
  }
  doll.hullCtx.clearRect(0, 0, doll.hullCanvas.width, doll.hullCanvas.height);
  template.marks.hull.forEach(([part, x, y], index) => {
    const rect = doll.hullRects[part];
    if (!rect) throw new Error('template references an unknown clothing hull');
    const ctx = doll.hullCtx;
    const px = (rect[0] + x * rect[2]) * doll.hullCanvas.width;
    const py = y * doll.hullCanvas.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect[0] * doll.hullCanvas.width, 0, rect[2] * doll.hullCanvas.width, doll.hullCanvas.height);
    ctx.clip();
    ctx.fillStyle = clothingInks[(index + 4) % clothingInks.length].hex;
    ctx.beginPath();
    ctx.arc(px, py, doll.hullCanvas.width / 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  doll.hullTex.needsUpdate = true;
  const params = Object.assign({}, template.proportions, {
    pose: 'stand',
    showRig: false,
    worn: {robe:false,dress:false,top:false,hoodie:false,pants:false,bralet:false},
    thoughts: {fears:[],wishes:[],likes:[],dislikes:[],thoughts:[]}
  });
  doll.setParams(params);
  doll.rebuild('stand');
  doll.setFaceShell(true);
  doll.setHulls(true);
  return params;
}

function validAnswers(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return false;
  const keys = Object.keys(answers);
  if (keys.some(id => !QUESTIONS.some(question => question.id === id))) return false;
  return QUESTIONS.every(question => !Object.hasOwn(answers, question.id) ||
    question.options.some(option => option.id === answers[question.id]));
}

function validRecordShell(record) {
  return !!record && typeof record === 'object' && !Array.isArray(record) &&
    ['questions', 'suggestions', 'making', 'kept'].includes(record.phase) &&
    Number.isInteger(record.questionIndex) && record.questionIndex >= 0 &&
    record.questionIndex < QUESTIONS.length && validAnswers(record.answers);
}

function validateV1(record) {
  if (!validRecordShell(record)) return false;
  try {
    if (record.phase !== 'questions' && Object.keys(record.answers).length !== QUESTIONS.length) return false;
    if (record.phase !== 'questions' &&
        (typeof record.resultId !== 'string' || typeof record.paletteId !== 'string')) return false;
    if (record.templateId != null && !TEMPLATES.some(item => item.id === record.templateId)) return false;
    if (record.phase === 'making' || record.phase === 'kept') {
      if (!record.confirmed || !record.templateId) return false;
    }
    return true;
  } catch (_) {
    return false;
  }
}

function sameChapterPaletteIds(saved, expected) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return false;
  return Object.keys(CHAPTER_ACCENT_RULES).every(id =>
    Array.isArray(saved[id]) && saved[id].length === 6 &&
    saved[id].every((swatchId, index) => swatchId === expected[id][index]));
}

function validateV2(record) {
  if (!validRecordShell(record) || record.scoreVersion !== SCORING_VERSION ||
      record.paletteVersion !== PALETTE_VERSION) return false;
  if (record.phase !== 'questions' && Object.keys(record.answers).length !== QUESTIONS.length) return false;
  if (record.phase === 'questions') return true;
  try {
    const scores = scoreAnswers(record.answers);
    const ranked = suggestions(scores);
    const palette = paletteFor(scores);
    if (record.resultId !== ranked[0].id || record.paletteId !== palette.id ||
        record.receiptText !== personalityReceipt(scores) ||
        !sameChapterPaletteIds(record.chapterPaletteIds, chapterPaletteIds(palette))) return false;
    if (record.selectionMode == null) {
      if (record.templateId != null) return false;
    } else if (record.selectionMode === 'template') {
      if (record.templateId == null || !ranked.some(item => item.template === record.templateId)) return false;
    } else if (record.selectionMode === 'blank') {
      if (record.templateId != null) return false;
    } else {
      return false;
    }
    if (record.phase === 'suggestions') return record.confirmed === false;
    if (!record.confirmed || !record.selectionMode) return false;
    return true;
  } catch (_) {
    return false;
  }
}

export function validateOnboarding(record) {
  if (!record || typeof record !== 'object') return false;
  if (record.version === 1) return validateV1(record);
  if (record.version === ONBOARDING_VERSION) return validateV2(record);
  return false;
}

export function migrateOnboarding(record) {
  if (!validateOnboarding(record)) throw new TypeError('saved first-rite answers are malformed');
  if (record.version === ONBOARDING_VERSION) {
    return {...record, answers: {...record.answers}};
  }
  const answers = {...record.answers};
  const migrated = {
    version: ONBOARDING_VERSION,
    scoreVersion: SCORING_VERSION,
    paletteVersion: PALETTE_VERSION,
    phase: record.phase,
    questionIndex: record.questionIndex,
    answers,
    resultId: null,
    templateId: null,
    selectionMode: null,
    paletteId: null,
    chapterPaletteIds: null,
    receiptText: null,
    confirmed: false
  };
  if (record.phase === 'questions') return migrated;

  const scores = scoreAnswers(answers);
  const ranked = suggestions(scores);
  const palette = paletteFor(scores);
  const rankedTemplate = templateId =>
    ranked.some(item => item.template === templateId) &&
    TEMPLATES.some(item => item.id === templateId);
  const preserveChoice = !!record.templateId && rankedTemplate(record.templateId);
  migrated.resultId = ranked[0].id;
  migrated.paletteId = palette.id;
  migrated.chapterPaletteIds = chapterPaletteIds(palette);
  migrated.receiptText = personalityReceipt(scores);
  if ((record.phase === 'making' || record.phase === 'kept') && record.confirmed && preserveChoice) {
    migrated.phase = 'making';
    migrated.templateId = record.templateId;
    migrated.selectionMode = 'template';
    migrated.confirmed = true;
  } else if (record.phase === 'suggestions' && preserveChoice) {
    migrated.templateId = record.templateId;
    migrated.selectionMode = 'template';
  } else {
    migrated.phase = 'suggestions';
  }
  return migrated;
}
