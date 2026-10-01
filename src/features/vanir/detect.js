// ── VANIR · the ferryman's eye ───────────────────────────────────────────────
// Detects suspected cognitive distortions in the user's thought + answers,
// and assembles the ghostly "reframe" cards shown during rowing passages.
// This is deliberately lightweight & local — a lexicon/signal detector with
// a little ordinal regression, not a network service.
import { DISTORTIONS, CUES } from './dict.js';

const byKey = (k) => DISTORTIONS[k] ?? null;

// Evidence weights, informed by the dataset's class balance. Mind Reading
// and Overgeneralization are the two largest distortion classes (239 each),
// so their cue surface is richest. All weights are hand-tuned priors.
const WEIGHTS = {
  cue: 1.0,        // explicit cue phrase hit
  absolute: 0.45,  // absolutist words (always, never, everyone…)
  feeling: 0.4,    // feeling-first phrasing
  selfLabel: 0.5,  // "I am a …" constructions
  questiony: -0.2, // genuine questions are usually less distorted
  hedges: -0.15,   // hedged statements are usually less distorted
  length: 0.0,     // set below: log-length bonus up to +0.3
};

const RE_ABS = /\b(?:always|never|everyone|everybody|no one|nobody|nothing|anything|everything|all of them|constantly|every time)\b/gi;
const RE_FEEL = /\b(?:i (?:just )?feel|feels like|it feels|feeling that|i sense)\b/gi;
const RE_SELFLABEL = /\b(?:i am|i'?m)\s+(?:such\s+)?(?:a\s+|an\s+)?\w+/gi;
const RE_HEDGE = /\b(?:maybe|perhaps|sometimes|occasionally|i wonder|it seems|sort of|kind of|might|could be)\b/gi;

function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

/** Score one text blob. Returns Map<key, {score, cues[]}> of hits. */
export function scoreText(text) {
  const hits = new Map();
  if (!text || !text.trim()) return hits;
  const t = text.trim();
  const bump = (key, w, cue) => {
    const h = hits.get(key) ?? { score: 0, cues: [] };
    h.score += w;
    if (cue) h.cues.push(cue);
    hits.set(key, h);
  };

  for (const [key, re] of CUES) {
    const m = t.match(re);
    if (m) bump(key, WEIGHTS.cue + 0.25 * Math.min(m.length, 3), m[0].toLowerCase().slice(0, 60));
  }
  bump('*', countMatches(t, RE_ABS) * WEIGHTS.absolute, null); // '*' = generic absolutist signal
  bump('*', countMatches(t, RE_FEEL) * WEIGHTS.feeling, null);
  const labels = countMatches(t, RE_SELFLABEL);
  if (labels && /\b(?:failure|loser|worthless|stupid|idiot|broken|mess|disaster|selfish|lazy|pathetic|awful|terrible|horrible|bad)\b/i.test(t)) {
    bump('labeling', WEIGHTS.selfLabel, 'self-label');
  }
  if (/\?\s*$/.test(t)) bump('*', WEIGHTS.questiony, null);
  bump('*', countMatches(t, RE_HEDGE) * WEIGHTS.hedges, null);
  bump('*', Math.min(Math.log1p(t.length) / 8, 0.3), null);
  return hits;
}

/**
 * Full passage analysis: thought + eight answers → ordered findings.
 * Returns [{ key, name, whisper, balm, score, cues, where }] sorted by score.
 * `where` says which inputs betrayed it (for the artifact read-out).
 */
export function analyzePassage({ thought, answers = [] }) {
  const blobs = [];
  if (thought && thought.trim()) blobs.push({ where: 'thought', text: thought });
  answers.forEach((a, i) => { if (a && a.trim()) blobs.push({ where: `a${i + 1}`, text: a }); });
  if (!blobs.length) return [];

  const perClass = new Map();
  for (const b of blobs) {
    for (const [key, h] of scoreText(b.text)) {
      if (key === '*') continue;
      const cur = perClass.get(key) ?? { score: 0, cues: [], where: [] };
      cur.score += h.score;
      cur.cues.push(...h.cues);
      cur.where.push(b.where);
      perClass.set(key, cur);
    }
  }

  // Strong absolutist residue with no named class → most often
  // overgeneralization in the dataset (44× "always", 44× "never" in its rows).
  const starScore = scoreText(blobs.map((b) => b.text).join(' ')).get('*')?.score ?? 0;
  if (starScore >= 0.9 && !perClass.has('overgeneralization') && !perClass.has('allOrNothing')) {
    perClass.set('overgeneralization', {
      score: starScore,
      cues: ['absolutist language'],
      where: blobs.map((b) => b.where),
    });
  }
  const findings = [...perClass.entries()]
    .map(([key, h]) => ({ key, ...byKey(key), ...h, name: byKey(key).name, whisper: byKey(key).whisper, balm: byKey(key).balm }))
    .filter((f) => f.score >= 0.8)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return findings;
}

/** Short line for the ticket/summary: "Mind Reading · Fortune-telling" */
export function findingsLabel(findings) {
  return findings.length ? findings.map((f) => f.name).join(' · ') : 'No distortion found';
}
