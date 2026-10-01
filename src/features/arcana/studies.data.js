// studies.data.js — what this room rests on. In the house's citations shape
// (mirrors data/citations.data.js): claimedFor names the parts of the room
// that rest on each source. Rendered verbatim in the studies window.
window.LIBER_ARCANA_DATA = window.LIBER_ARCANA_DATA || {};
window.LIBER_ARCANA_DATA.studies = [
  {
    id: 'jonauskaite-2025',
    topic: "free association norms — the word game's dictionary",
    category: 'published-research',
    source: 'Jonauskaite, D., et al. (2025). Free Association Database for a 62-Word Dataset Including Emotion and Colour Terms in English, Estonian, French, German, Italian, Lithuanian and Spanish (Data from 14 Countries). Open Psychology Data, 13. https://doi.org/10.5334/jopd.140 (CC-BY 4.0)',
    claimedFor: [
      'the word game\u2019s cue list and every associate\u2019s production probability',
      'the link graph between cues (which words people put next to which)',
      'the \u2018crowd\u2019 measure in the reading — how close a chain runs to the shared norm'
    ],
    note: 'Empirical English free-association data: 62 cues (26 common nouns, 20 emotion words, 16 colour terms), several hundred responses per cue. The word game starts from these cues, and every hit it scores is a real association recorded in this dataset — the game invents no links of its own.'
  },
  {
    id: 'vezzoli-2007',
    topic: "Jung's word association method — the reading's lens",
    category: 'published-research',
    source: 'Vezzoli, C., Bressi, C., Tricarico, G., Boato, P., Cattaneo, C., & Visentin, U. (2007). Methodological evolution and clinical application of C.G. Jung\u2019s Word Association Experiment: A follow-up study. Journal of Analytical Psychology, 52(1), 89\u2013108. https://doi.org/10.1111/j.1468-5922.2007.00642.x',
    claimedFor: [
      'the reading\u2019s method: reaction time, repetition, and interpretation as the classic complex indicators',
      'the re-presentation pass (each word asked again, from the chain\u2019s memory)',
      'the probe questions — one per marked junction, drawn from the indicators'
    ],
    note: 'A follow-up study of Jung\u2019s Word Association Experiment: its value here is the discipline of the indicators. In the clinic a complex marker is a hesitation, a stimulus repetition, or an interpretation instead of an association. This room borrows the markers, not the clinic: it reads a game, not a person, and says so.'
  }
];
