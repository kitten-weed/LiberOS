// vanir-boot.js — mounts the VANIR crossing inside the machine's screen.
// The page supplies the stock machine shell; this only feeds the tube.
//   #app          the WebGL canvas container (absolute, fills .screen)
//   #stage etc.   HUD layers, created by hud.js into #app
// Exit destination: data-vanir-exit on <body> (defaults to ../../index.html).
import { createCrossing } from './crossing.js?v=sea2';
import { createHud } from './hud.js';
import { analyzePassage } from './detect.js';

const app = document.getElementById('app');

const crossing = createCrossing(app);
const hud = createHud({
  onThought: () => {
    // the jar is sealed; a breath, then the questions begin
    setTimeout(() => hud.questionRite(), 1200);
  },
  onFinished: (state) => {
    state.findings = analyzePassage({ thought: state.thought, answers: state.answers });
    // the final leg: a long row to the far shore while reframes drift past
    crossing.sailTo('shore', () => hud.dispositionRite());
    hud.spawnReframes(state.findings, 15000);
  },
  onDispose: (keep, state) => {
    if (keep) hud.saveToShelf(state);
    else crossing.releaseJar();
  },
});

hud.setSceneApi(crossing);
document.getElementById('shelf-toggle').addEventListener('click', () => hud.toggleShelf());
hud.scheduleGlitch();

// Boot: ask the traveler's name, then begin. (The greeting seeds from the
// demo name until the house passes a real one.)
hud.begin('traveler');
