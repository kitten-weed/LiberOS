// ── VANIR · the mind layer ───────────────────────────────────────────────────
// Lexicon + reframes distilled from the annotated CBT dataset
// (Shreevastava & Foltz, "Detecting Cognitive Distortions from
//  Patient-Therapist Interactions", 2,530 patient statements).
//
// Class balance in the source data (dominant distortion):
//   No Distortion 933 · Mind Reading 239 · Overgeneralization 239
//   Magnification 195 · Labeling 165 · Personalization 153
//   Fortune-telling 143 · Emotional Reasoning 134 · Mental filter 122
//   Should statements 107 · All-or-nothing thinking 100
// (Secondary distortion appears on ~416 rows; Fortune-telling and
//  Mind Reading are the most common shadows.)

// Human-facing names + the dataset's exact labels.
export const DISTORTIONS = {
  allOrNothing: {
    key: 'allOrNothing',
    name: 'All-or-Nothing Thinking',
    dataset: 'All-or-nothing thinking',
    whisper: 'Only two shores exist. You stand on neither.',
    balm: 'The water holds every depth between the banks. Name the middle ground you are standing in — it is almost never truly “all” or “nothing.”',
  },
  overgeneralization: {
    key: 'overgeneralization',
    name: 'Overgeneralizing',
    dataset: 'Overgeneralization',
    whisper: 'One drowning becomes every drowning.',
    balm: 'One event is one event, not a law of the river. Ask: is “always / never / everyone” literally true, or did one wave feel like the whole sea?',
  },
  mentalFilter: {
    key: 'mentalFilter',
    name: 'Mental Filter',
    dataset: 'Mental filter',
    whisper: 'You strain the river and drink only the ink.',
    balm: 'Your mind has hoisted a filter that catches only the dark. Deliberately gather the evidence it let slip past — the positives you screened out.',
  },
  shouldStatements: {
    key: 'shouldStatements',
    name: 'Should Statements',
    dataset: 'Should statements',
    whisper: 'You row toward a shore that was never yours.',
    balm: '“Should” is an iron rule you never chose. Trade it for a preference: “I would like…” — and notice the guilt loosen its grip.',
  },
  labeling: {
    key: 'labeling',
    name: 'Labeling',
    dataset: 'Labeling',
    whisper: 'You have carved a name into your own hull.',
    balm: 'A label is a tombstone for a behavior. You are a whole person who did a thing — return the name to the deed, and judge the deed alone.',
  },
  personalization: {
    key: 'personalization',
    name: 'Personalization',
    dataset: 'Personalization',
    whisper: 'You have taken the oars of a storm.',
    balm: 'You are not the author of every current. Weigh honestly: what part was yours, what part belonged to others, to chance, to the weather.',
  },
  magnification: {
    key: 'magnification',
    name: 'Magnifying / Minimizing',
    dataset: 'Magnification',
    whisper: 'A ripple, seen from beneath, is a mountain.',
    balm: 'The lens bends both ways — flaws grow, strengths shrink. Estimate the true scale: will this matter in a week? A year? What is genuinely in your control?',
  },
  emotionalReasoning: {
    key: 'emotionalReasoning',
    name: 'Emotional Reasoning',
    dataset: 'Emotional Reasoning',
    whisper: 'You mistake the fog for the shore.',
    balm: 'A feeling is weather, not terrain. It is real, and it is evidence of nothing but itself. Let it pass through without steering by it.',
  },
  mindReading: {
    key: 'mindReading',
    name: 'Mind Reading',
    dataset: 'Mind Reading',
    whisper: 'You claim to hear the drowned speak.',
    balm: 'You cannot hear another’s thoughts from the water. List what you actually know vs. what you inferred — then ask them, or hold the question open.',
  },
  fortuneTelling: {
    key: 'fortuneTelling',
    name: 'Fortune-telling',
    dataset: 'Fortune-telling',
    whisper: 'You have already wrecked on a reef that is not there.',
    balm: 'You are prophesying a wreck that has not happened. What is the actual likelihood? Even in the worst case — how would you steer then?',
  },
};

// Cue phrases mined from the "Distorted part" column of the dataset.
// Distinctive, high-precision surface cues per class (from log-odds
// mining + manual inspection). Ordered by specificity; first strong
// hit wins ties. Kept deliberately small — this is a folk detector,
// not a classifier.
export const CUES = [
  // most distinctive first
  ['emotionalReasoning', /\bi (?:just )?feel(?: like)?\b.{0,40}\b(?:so|therefore|must|that means|which means|it must)\b/i],
  ['emotionalReasoning', /\b(?:if i feel|i feel it|it feels (?:so )?(?:true|certain|real)|i know (?:because )?i feel)\b/i],
  ['mindReading',        /\b(?:they|he|she|everyone|everybody|people|they all)(?:'ll| will| won)?(?:'?t| don'?t| doesn'?t| wouldn'?t| wouldn'?t| will| must)? (?:think|thinks|care|know|understand|notice|judge|believe|hate|dislike|laugh)\b/i],
  ['mindReading',        /\b(?:i think|i bet|i assume|i can tell|they probably think|he must think|she must think|they must think)\b.{0,30}\b(?:i am|i'?m|about me|of me)\b/i],
  ['overgeneralization', /\b(?:always|never|everyone|everybody|no one|nobody|nothing ever|constantly|every single time|all men|all women|all people)\b/i],
  ['allOrNothing',       /\b(?:either.{0,30}or|if i(?:'m| am) not.{0,40}then|total (?:failure|disaster)|complete (?:failure|idiot)|not perfect.{0,20}worthless|all or nothing)\b/i],
  ['allOrNothing',       /\b(?:everything is ruined|nothing (?:works|matters|goes right))\b/i],
  ['fortuneTelling',     /\b(?:what'?s the point|it'?s (?:no use|hopeless)|will (?:never|always) (?:fail|be awful)|going to (?:fail|be a disaster|fall apart)|i(?:'ll| will) (?:end up|never) )\b/i],
  ['fortuneTelling',     /\b(?:something (?:bad|terrible|awful) (?:is going|will) (?:to )?happen|i(?:'ll| will) panic and|it(?:'ll| will) go (?:badly|wrong|horribly))\b/i],
  ['shouldStatements',   /\b(?:i|you|he|she|they|people) (?:really )?(?:should|shouldn'?t|must|mustn'?t|ought (?:to|n'?t)|have to|has to|supposed to|need to) (?:be|have|feel|do|always|never)\b/i],
  ['shouldStatements',   /\b(?:i should be|supposed to (?:be|feel)|i shouldn'?t feel)\b/i],
  ['labeling',           /\b(?:i am|i'?m|he is|she is|they are|it makes me) (?:such )?(?:a )?(?:total |complete |utter |pathetic |useless |stupid |worthless |failure|loser|idiot|broken|disaster|mess|selfish|lazy|awful|terrible|horrible|bad (?:person|mother|father|friend|partner|son|daughter|employee))\b/i],
  ['labeling',           /\b(?:i'?m just (?:a|an) |i am just )\w+\b/i],
  ['personalization',    /\b(?:it'?s (?:all )?my (?:fault|blame)|i must have (?:caused|done something)|because of me|if i (?:hadn'?t|had) .{0,30}(?:wouldn'?t|wouldn'?t have)|they(?:'re| are) (?:only|just) (?:upset|angry|mad) because of me)\b/i],
  ['magnification',      /\b(?:if .{0,40}(?:then )?(?:my|my whole|my entire) (?:life|career|future)|ruin(?:ed|s)? everything|end of the world|can'?t (?:handle|cope|bear|take) (?:this|it)|the worst thing (?:that could|ever))\b/i],
  ['mentalFilter',       /\b(?:nothing but|all i (?:can )?(?:see|notice|think about) (?:is|are)|the only thing .{0,30}(?:is|was) (?:the bad|what'?s wrong)|can'?t stop focusing on)\b/i],
];

// Map from dataset label → key (for any future import of the CSV itself).
export const DATASET_LABEL_TO_KEY = Object.fromEntries(
  Object.values(DISTORTIONS).map((d) => [d.dataset, d.key]),
);

// The eight fixed Socratic questions, verbatim.
export const QUESTIONS = [
  'What is the evidence this thought is true?',
  'What is the evidence this thought is not true?',
  'Are there alternative ways you can think to view this?',
  'What are the implications if the thought is true?',
  'What is most upsetting about this thought?',
  'What is most realistic?',
  'What can you do about it?',
  'What would you tell a good friend in the same situation?',
];
