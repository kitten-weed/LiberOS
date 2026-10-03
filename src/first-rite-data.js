export const FACTORS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'stability'];

const answers = (labels) => labels.map((label, index) => ({
  id: String.fromCharCode(97 + index),
  label,
  value: [-2, -1, 1, 2][index]
}));

export const QUESTIONS = [
  { id: 'locked-drawer', factor: 'openness', direction: 1, prompt: 'A drawer in the old machine clicks open by itself. What do you do?', options: answers(['Look for what is hidden inside', 'Listen for a moment, then peek', 'Check whether it belongs to the machine', 'Close it and leave the mystery alone']) },
  { id: 'known-path', factor: 'openness', direction: -1, prompt: 'A familiar path has grown a new, strange turn.', options: answers(['Take the turn before it disappears', 'Try it if someone comes along', 'Stay on the path I know', 'Keep to the marked route']) },
  { id: 'small-task', factor: 'conscientiousness', direction: 1, prompt: 'A small job is waiting beside the door.', options: answers(['Finish it before anything else', 'Make a little start now', 'Do it when the moment feels right', 'Let it wait; another thing will call']) },
  { id: 'packing', factor: 'conscientiousness', direction: -1, prompt: 'There is room for one more thing in the travel bag.', options: answers(['Make a list, then pack it neatly', 'Pack it after a quick check', 'Toss it in and see what happens', 'Leave space for whatever turns up']) },
  { id: 'gathering', factor: 'extraversion', direction: 1, prompt: 'A gathering is already humming in the next room.', options: answers(['Go in and find the liveliest circle', 'Join after I know someone there', 'Listen from the doorway first', 'Keep the quiet room company']) },
  { id: 'long-evening', factor: 'extraversion', direction: -1, prompt: 'After a long evening with others, what sounds best?', options: answers(['Stay for one more story', 'Leave after saying goodnight', 'Find a little quiet to recharge', 'Slip away and be alone awhile']) },
  { id: 'lost-button', factor: 'agreeableness', direction: 1, prompt: 'Someone drops a button and does not notice.', options: answers(['Pick it up and catch them', 'Point it out if we cross paths', 'Leave it where it fell', 'Keep walking; they may not want help']) },
  { id: 'shared-table', factor: 'agreeableness', direction: -1, prompt: 'There is one chair left at a crowded table.', options: answers(['Make room and ask who needs it', 'Offer it to someone nearby', 'Take it before it goes', 'Keep my place; others can ask']) },
  { id: 'storm-glass', factor: 'stability', direction: 1, prompt: 'Stormlight flickers behind the glass. What helps first?', options: answers(['Take a slow breath and look again', 'Find one small thing I can steady', 'Call out for someone I trust', 'Move away until the feeling settles']) },
  { id: 'missed-train', factor: 'stability', direction: -1, prompt: 'The train leaves just before you reach the platform.', options: answers(['Pause, then work out the next route', 'Feel the sting and keep moving', 'Ask someone what to do next', 'Let the day take a different shape']) }
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

export const PALETTES = {
  'openness-high': [{name:'Ochre',hex:'#d69b35'},{name:'Night ink',hex:'#242235'},{name:'Moss',hex:'#6f9361'},{name:'Blue glass',hex:'#547f9d'},{name:'Plum',hex:'#93607e'},{name:'Paper',hex:'#e7d8af'}],
  'openness-low': [{name:'Rust',hex:'#a95036'},{name:'Coal',hex:'#292324'},{name:'Olive',hex:'#8b8a4f'},{name:'Lake',hex:'#4e7982'},{name:'Lilac',hex:'#93789b'},{name:'Linen',hex:'#e4d4b8'}],
  'conscientiousness-high': [{name:'Ink',hex:'#28231f'},{name:'Brick',hex:'#a74737'},{name:'Citrine',hex:'#c69d3f'},{name:'Fern',hex:'#668a58'},{name:'Slate',hex:'#5b7488'},{name:'Bone',hex:'#e6d8bc'}],
  'conscientiousness-low': [{name:'Umber',hex:'#51382d'},{name:'Coral',hex:'#c76d51'},{name:'Saffron',hex:'#d5a84e'},{name:'Sage',hex:'#7c9a77'},{name:'Denim',hex:'#5a789b'},{name:'Chalk',hex:'#e7dfc5'}],
  'extraversion-high': [{name:'Garnet',hex:'#a63642'},{name:'Black tea',hex:'#2b2722'},{name:'Gold',hex:'#d3a742'},{name:'Leaf',hex:'#52825b'},{name:'Cobalt',hex:'#466b9b'},{name:'Cream',hex:'#e9dcb8'}],
  'extraversion-low': [{name:'Mulberry',hex:'#744358'},{name:'Charcoal',hex:'#26272a'},{name:'Honey',hex:'#c29a52'},{name:'Pine',hex:'#426d5d'},{name:'Mist',hex:'#648a9b'},{name:'Parchment',hex:'#e4d8c2'}],
  'agreeableness-high': [{name:'Rosewood',hex:'#a35555'},{name:'Sepia',hex:'#4b3932'},{name:'Marigold',hex:'#cca045'},{name:'Meadow',hex:'#6e956c'},{name:'Harbor',hex:'#557f92'},{name:'Ivory',hex:'#e9deca'}],
  'agreeableness-low': [{name:'Oxide',hex:'#98503d'},{name:'Iron',hex:'#343638'},{name:'Brass',hex:'#b79751'},{name:'Juniper',hex:'#527d6b'},{name:'Storm',hex:'#5d718e'},{name:'Canvas',hex:'#e2d3b4'}],
  'stability-high': [{name:'Cedar',hex:'#8f4938'},{name:'Inkstone',hex:'#292a31'},{name:'Wheat',hex:'#c7a659'},{name:'Olive leaf',hex:'#728957'},{name:'Dusk blue',hex:'#577a94'},{name:'Wool',hex:'#e7dcc6'}],
  'stability-low': [{name:'Wine',hex:'#824956'},{name:'Burnt sugar',hex:'#4b352e'},{name:'Amber',hex:'#d09d46'},{name:'Lichen',hex:'#7b9166'},{name:'Blue hour',hex:'#4f7188'},{name:'Cotton',hex:'#e5d7bd'}]
};

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
  // Two responses per factor are averaged on an authored -2..2 scale; reverse-keyed scenes flip direction.
  QUESTIONS.forEach(question => {
    const option = question.options.find(item => item.id === answerIds[question.id]);
    if (!option) throw new Error('unknown answer for ' + question.id);
    totals[question.factor] += option.value * question.direction;
    counts[question.factor]++;
  });
  return Object.fromEntries(FACTORS.map(factor => [
    factor,
    Math.round((totals[factor] / counts[factor]) * 100) / 100
  ]));
}

export function suggestions(scores) {
  if (!scores || FACTORS.some(factor => !Number.isFinite(scores[factor]))) {
    throw new TypeError('complete finite trait scores are required');
  }
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

export function paletteFor(scores) {
  // Strongest absolute factor selects the creative palette; FACTORS order breaks ties.
  const dominant = FACTORS.reduce((best, factor) =>
    Math.abs(scores[factor]) > Math.abs(scores[best]) ? factor : best, FACTORS[0]);
  const direction = scores[dominant] < 0 ? 'low' : 'high';
  const id = dominant + '-' + direction;
  const inks = PALETTES[id];
  if (!inks || inks.length !== 6 || new Set(inks.map(ink => ink.hex)).size !== 6) {
    throw new Error('first-rite palette must contain six distinct inks');
  }
  return {id, inks: inks.map(ink => ({...ink}))};
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

export function applyTemplate(doll, template, inks) {
  if (!doll || !template || !Array.isArray(inks) || inks.length !== 6) {
    throw new TypeError('a doll, template, and six-ink palette are required');
  }
  for (const kind of ['hair', 'eyes', 'face']) {
    const map = doll.faceMaps[kind];
    map.ctx.clearRect(0, 0, map.cv.width, map.cv.height);
    (template.marks[kind] || []).forEach((points, index) =>
      trace(map.ctx, map.cv, points, inks[index % 3].hex, 0.055));
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
    ctx.fillStyle = inks[(index + 3) % inks.length].hex;
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

export function validateOnboarding(record) {
  if (!record || record.version !== 1 || !record.answers ||
      !['questions', 'suggestions', 'making', 'kept'].includes(record.phase) ||
      !Number.isInteger(record.questionIndex) || record.questionIndex < 0 ||
      record.questionIndex >= QUESTIONS.length) return false;
  try {
    if (Object.keys(record.answers).length) {
      const partial = {};
      QUESTIONS.forEach(q => {
        if (Object.hasOwn(record.answers, q.id)) {
          if (!q.options.some(option => option.id === record.answers[q.id])) throw new Error('invalid');
          partial[q.id] = record.answers[q.id];
        }
      });
      if (Object.keys(partial).length !== Object.keys(record.answers).length) return false;
    }
    if (record.phase !== 'questions' && Object.keys(record.answers).length !== QUESTIONS.length) return false;
    if (record.phase !== 'questions') {
      const scores = scoreAnswers(record.answers);
      const ranked = suggestions(scores);
      const palette = paletteFor(scores);
      if (record.resultId !== ranked[0].id || record.paletteId !== palette.id) return false;
      if (record.templateId != null && !ranked.some(item => item.template === record.templateId)) return false;
    }
    if (record.phase === 'making' || record.phase === 'kept') {
      if (!record.confirmed || !record.templateId ||
          !TEMPLATES.some(item => item.id === record.templateId)) return false;
    }
    return true;
  } catch (_) {
    return false;
  }
}
