// build-assoc-data.node.js — ONE-TIME build tool (run with node, not shipped).
//
//   node src/features/arcana/build-assoc-data.node.js /path/to/DATA_ENGLISH.csv
//
// Reads the raw CSV of Jonauskaite et al. (2025), "Free Association Database
// for a 62-Word Dataset Including Emotion and Colour Terms" — Open Psychology
// Data 13, DOI 10.5334/jopd.140 — and emits assoc.data.js: a file://-safe
// runtime mirror holding, per cue, the number of responses and the associates
// with their production probabilities p (count / responses).
//
// The CSV lives outside the repository (source data, CC-BY); only the reduced
// mirror ships. Re-run this tool if the source CSV is updated.
'use strict';

const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) { console.error('usage: node build-assoc-data.node.js DATA_ENGLISH.csv'); process.exit(1); }

// ── a small honest CSV reader (quoted fields, CRLF, BOM) ─────────────────
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], field = '', i = 0, q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        q = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const rows = parseCSV(fs.readFileSync(src, 'utf8'));
const header = rows[0];
// Columns 0..15 are metadata (Quote_ID … Association_number); cues follow.
const CUE_START = 16;
const cues = header.slice(CUE_START)
  .map(h => h.trim().toLowerCase())
  .filter(h => h && !/blank/i.test(h));

const KIND = {};
const NOUNS = ['basket','cheese','cloud','liquid','nail','cat','dog','horse','domestic','hood','routine','symbol','corridor','peace','ladder','elephant','dizzy','poison','hay','mathematics','giraffe','squirrel','echo','bean','mouse','tiger'];
const EMOTIONS = ['interest','amusement','pride','joy','contentment','admiration','love','relief','compassion','pleasure','sadness','guilt','regret','shame','disappointment','fear','disgust','contempt','hate','anger'];
NOUNS.forEach(w => KIND[w] = 'object');
EMOTIONS.forEach(w => KIND[w] = 'emotion');
['yellow','orange','black','red','grey','blue','brown','white','green','pink','purple','turquoise','beige','lilac','violet','maroon'].forEach(w => KIND[w] = 'colour');

// responses that mean "no response" in the raw data
const VOID = new Set(['na', 'n/a', '', 'none', 'nothing', 'nil', '?', 'can\'t say', 'cant say', 'can´t say', 'i don\'t know', 'no idea', 'dont know', 'unknown', 'no word', 'no response']);

function norm(w) {
  return String(w || '').toLowerCase().trim()
    .replace(/^[\s"'`]+|[\s"'`.!?;:]+$/g, '')
    .replace(/\s+/g, ' ');
}

const tables = {};
for (const cue of cues) {
  const col = header.findIndex((h, idx) => idx >= CUE_START && h.trim().toLowerCase() === cue);
  if (col < 0) continue;
  const counts = new Map();
  let n = 0;
  for (let r = 1; r < rows.length; r++) {
    const raw = norm(rows[r][col]);
    if (VOID.has(raw)) continue;
    n++;
    counts.set(raw, (counts.get(raw) || 0) + 1);
  }
  const assoc = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([w, c]) => ({ w, p: +(c / n).toFixed(3) }));
  tables[cue] = { kind: KIND[cue] || 'object', n, assoc };
}

// sanity
console.log('cues:', cues.length, '| rows:', rows.length - 1);
for (const probe of ['cat', 'dog', 'love', 'fear', 'yellow', 'corridor']) {
  const t = tables[probe];
  console.log(probe, 'n=' + t.n, 'top:', t.assoc.slice(0, 3).map(a => a.w + ' ' + a.p).join(', '));
}

const out = `// assoc.data.js — runtime mirror of the Jonauskaite et al. (2025) free-association
// database, reduced from DATA_ENGLISH.csv by build-assoc-data.node.js.
//
// SOURCE (do not edit by hand): Jonauskaite, D., et al. (2025). Free Association
// Database for a 62-Word Dataset Including Emotion and Colour Terms in English,
// Estonian, French, German, Italian, Lithuanian and Spanish (Data from 14
// Countries). Open Psychology Data, 13, 10.5334/jopd.140. CC-BY 4.0.
//
// Each cue: n = valid responses collected; assoc = top associates with p, the
// empirical production probability (responses / n) in the English survey.
window.LIBER_ARCANA_DATA = window.LIBER_ARCANA_DATA || {};
window.LIBER_ARCANA_DATA.assoc = ${JSON.stringify(tables, null, 0)};
`;

const dest = path.join(__dirname, 'assoc.data.js');
fs.writeFileSync(dest, out);
console.log('wrote', dest, (fs.statSync(dest).size / 1024).toFixed(1) + 'kb');
