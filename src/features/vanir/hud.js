// ── VANIR · the interface ────────────────────────────────────────────────────
// All DOM: stage text, the thought rite, the console of questions, ghostly
// reframes during rowing, the disposition rite, the artifact, the shelf.
import { QUESTIONS } from './dict.js';
import { analyzePassage } from './detect.js';

// stations where the ferry moors for a pair of questions
const MOORINGS = ['threshold', 'reflection', 'mirror', 'ledger'];

const $ = (sel) => document.querySelector(sel);
// every HUD layer lives inside the CRT's screen box (#app), not the body
const hudRoot = () => document.getElementById('app') || document.body;

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

// Hardened: escape user-controlled text before interpolating into artifact HTML.
// st.thought / st.answers come from free-text inputs (stored XSS); findings names
// come from the static detect.js table but are escaped anyway for defense in depth.
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function createHud({ onThought, onFinished, onDispose }) {
  const app = $('#app');
  const stage = $('#stage');
  const stageText = $('#stage-text');
  const stageSub = $('#stage-sub');

  let sceneApi = null;
  const state = {
    name: 'traveler',
    thought: '',
    answers: [],
    findings: [],
  };

  // ── stage text ─────────────────────────────────────────────────────────────
  function showStage(text, sub = '', hold = 3800) {
    return new Promise((resolve) => {
      stageText.classList.remove('show');
      stageSub.classList.remove('show');
      setTimeout(() => {
        stageText.textContent = text;
        stageSub.textContent = sub;
        stageText.classList.add('show');
        if (sub) stageSub.classList.add('show');
        setTimeout(() => resolve(), hold);
      }, 900);
    });
  }

  // ── the thought rite ───────────────────────────────────────────────────────
  function thoughtRite() {
    hideStage(); // the intro letter must not linger behind the form
    const form = el('div', 'thought-form');
    const label = el('label', 'thought-label', 'enter the thought you carry');
    const input = el('input', 'thought-input');
    input.type = 'text';
    input.id = 'vanir-thought';
    label.htmlFor = input.id;
    label.id = 'thought-label';
    input.setAttribute('aria-labelledby', label.id);
    input.placeholder = 'enter the thought you carry';
    input.maxLength = 140;
    const btn = el('button', 'thought-seal', 'seal it in the jar');
    form.append(label, input, btn);
    hudRoot().appendChild(form);
    setTimeout(() => input.focus(), 400);

    const seal = () => {
      const text = input.value.trim();
      if (!text) {
        input.placeholder = 'the jar will not seal an empty thought…';
        return;
      }
      btn.disabled = true;
      input.disabled = true;
      jumbleIntoJar(form, text).then(() => {
        form.remove();
        state.thought = text;
        // early read of the thought alone — reframes drift during the legs;
        // re-analyzed with the answers at the far shore
        state.findings = analyzePassage({ thought: text, answers: [] });
        sceneApi?.sealJar(text);
        onThought(text);
      });
    };
    btn.addEventListener('click', seal);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') seal(); });
  }

  // scramble the thought's letters, then draw them toward the jar on the raft
  function jumbleIntoJar(form, text) {
    return new Promise((resolve) => {
      const rect = form.getBoundingClientRect();
      const j = el('div', 'jumble');
      j.style.left = `${rect.left + rect.width / 2}px`;
      j.style.top = `${rect.top}px`;
      hudRoot().appendChild(j);

      const chars = [...text].slice(0, 80);
      const spans = chars.map((c, i) => {
        const s = el('span', null, c === ' ' ? '&nbsp;' : c);
        s.style.transform = `translate(${(Math.random() - 0.5) * 90}px, ${(Math.random() - 0.5) * 70}px)`;
        s.style.opacity = '0';
        j.appendChild(s);
        return s;
      });
      requestAnimationFrame(() => {
        spans.forEach((s, i) => {
          s.style.opacity = '0.9';
          s.style.transitionDelay = `${i * 18}ms`;
          s.style.transform = 'translate(0,0)';
        });
      });

      // jar occupies lower-left of the tube; pull letters there
      const b = (hudRoot().getBoundingClientRect());
      const jarTarget = { x: b.left + b.width * 0.36, y: b.top + b.height * 0.66 };
      setTimeout(() => {
        spans.forEach((s, i) => {
          s.style.transitionDelay = `${i * 14}ms`;
          s.style.transform = `translate(${jarTarget.x - rect.left - rect.width / 2}px, ${jarTarget.y - rect.top}px) scale(0.15)`;
          s.style.opacity = '0';
          s.style.filter = 'blur(2px)';
        });
        setTimeout(() => { j.remove(); resolve(); }, 2400);
      }, 1500);
    });
  }

  // fade the big stage text out (transition end of a passage)
  function hideStage() {
    stageText.classList.remove('show');
    stageSub.classList.remove('show');
  }

  // ── the eight questions, asked at moorings along the waterway ──────────────
  // two questions per station: the ferry sails, moors, the station is named,
  // then the console fades in. one reframe ghost drifts past on each leg.
  function questionRite() {
    hideStage();
    const con = el('div', null);
    con.id = 'console';
    con.classList.add('veiled');
    con.innerHTML = `
      <div id="q-count"></div>
      <h2 id="q-text"></h2>
      <textarea id="q-input" rows="3" placeholder="speak, and the water listens…"></textarea>
      <button id="q-next">continue</button>`;
    hudRoot().appendChild(con);
    let i = 0;
    const input = con.querySelector('#q-input');
    input.setAttribute('aria-labelledby', 'q-text');
    const render = () => {
      con.querySelector('#q-count').textContent = `question ${i + 1} of ${QUESTIONS.length}`;
      con.querySelector('#q-text').textContent = QUESTIONS[i];
      input.value = '';
      input.placeholder = 'speak, and the water listens…';
      input.removeAttribute('aria-invalid');
      input.focus();
    };
    const next = () => {
      const said = input.value.trim();
      if (!said) { // the water takes no silence: reprompt, do not advance
        input.setAttribute('aria-invalid', 'true');
        input.placeholder = 'the water heard nothing. say something.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      state.answers.push(said);
      i += 1;
      if (i < QUESTIONS.length) advance();
      else { con.remove(); onFinished(state); }
    };

    const FAST = new URLSearchParams(location.search).has('fast');
    async function advance() {
      if (i % 2 === 0) {
        con.classList.add('veiled');
        const leg = i / 2;
        await sailAndAnnounce(MOORINGS[leg], leg);
      } else if (FAST) {
        await new Promise((r) => setTimeout(r, 60)); // short beats in test harness
      } else {
        await new Promise((r) => setTimeout(r, 15000)); // rowing passage
      }
      con.classList.remove('veiled');
      render();
    }

    con.querySelector('#q-next').addEventListener('click', next);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); next(); }
    });
    advance();
  }

  // sail to a station; on mooring, name it; drift one reframe on the way
  function sailAndAnnounce(key, leg) {
    return new Promise((resolve) => {
      const st = sceneApi?.stations?.find((s) => s.key === key);
      const arrived = () => {
        if (!st) { resolve(); return; }
        showStage(st.name, st.sub, 3200).then(() => { hideStage(); resolve(); });
      };
      if (!sceneApi?.sailTo) { arrived(); return; }
      if (state.findings.length) spawnReframe(state.findings[leg % state.findings.length]);
      showStage('', 'the ferryman rows…', 600000); // sub only, until arrival
      sceneApi.sailTo(key, arrived);
    });
  }

  // ── ghostly reframes while rowing ──────────────────────────────────────────
  function spawnReframe(f) {
    if (!f) return;
    const g = el('div', 'ghost-reframe');
    g.innerHTML = `<h4>${f.name}</h4>${f.whisper}<br><br>${f.balm}`;
    g.style.left = `${12 + Math.random() * 56}vw`;
    g.style.top = `${18 + Math.random() * 30}vh`;
    hudRoot().appendChild(g);
    setTimeout(() => g.remove(), 15500);
  }

  function spawnReframes(findings, durationMs) {
    const n = Math.min(findings.length, 3);
    for (let k = 0; k < n; k++) {
      setTimeout(() => spawnReframe(findings[k]), 1200 + k * (durationMs / (n + 1)));
    }
  }

  // ── disposition ────────────────────────────────────────────────────────────
  function dispositionRite() {
    hideStage();
    const d = el('div', null);
    d.id = 'disposition';
    d.innerHTML = `
      <div class="disposition-title">The far shore. The jar is in your hands.</div>
      <div class="disposition-sub">what you keep becomes an artifact, and is remembered. what you cast out is gone for good.</div>
      <div class="disposition-actions">
        <button class="disposition-btn" id="dp-keep">save as artifact</button>
        <button class="disposition-btn" id="dp-throw">throw it overboard</button>
      </div>`;
    hudRoot().appendChild(d);
    requestAnimationFrame(() => d.classList.add('show'));
    d.querySelector('#dp-keep').addEventListener('click', () => finish(true, d));
    d.querySelector('#dp-throw').addEventListener('click', () => {
      if (!window.confirm('gone for good? what you cast out cannot be brought back across.')) return;
      finish(false, d);
    });
  }

  function finish(keep, d) {
    d.classList.remove('show');
    setTimeout(() => d.remove(), 1600);
    onDispose(keep, state);
    if (!keep) {
      showStage('The water accepts it. It is gone.', '', 4200).then(() => resetRite());
    } else {
      showStage('It is yours now. An artifact of the crossing.', '', 4200).then(() => openArtifact());
    }
  }

  // ── artifact ───────────────────────────────────────────────────────────────
  function artifactHTML(st) {
    const f = st.findings.length
      ? `<ul>${st.findings.map((x) => `<li><em>${esc(x.name)}</em> — ${esc(x.whisper)}<br><span style="color:var(--bone-dim);font-size:0.85em">${esc(x.balm)}</span></li>`).join('')}</ul>`
      : '<p>No distortion found in the dark.</p>';
    const answers = st.answers.map((a, i) => a ? `<p><span style="color:var(--bone-dim);font-size:0.8em">${QUESTIONS[i]}</span><br>${esc(a)}</p>` : '').join('');
    return `
      <h2>Artifact of the Crossing</h2>
      <div class="artifact-section"><h3>The Thought</h3><p><em>“${esc(st.thought)}”</em></p></div>
      <div class="artifact-section"><h3>Suspected Distortions</h3>${f}</div>
      <div class="artifact-section"><h3>The Answers</h3>${answers}</div>`;
  }

  function openArtifact() {
    const a = el('div', null);
    a.id = 'artifact';
    a.innerHTML = `<div class="artifact-card">${artifactHTML(state)}</div>`;
    hudRoot().appendChild(a);
    requestAnimationFrame(() => a.classList.add('show'));
    a.addEventListener('click', () => {
      a.classList.remove('show');
      setTimeout(() => { a.remove(); resetRite(); }, 1600);
    });
  }

  // ── shelf ──────────────────────────────────────────────────────────────────
  const SHELF_KEY = 'vanir.shelf.v1';
  function loadShelf() {
    try { return JSON.parse(localStorage.getItem(SHELF_KEY)) ?? []; } catch { return []; }
  }
  function saveShelf(items) {
    localStorage.setItem(SHELF_KEY, JSON.stringify(items.slice(-40)));
  }

  function toggleShelf() {
    let s = $('#shelf');
    if (!s) {
      s = el('div', null);
      s.id = 'shelf';
      hudRoot().appendChild(s);
    }
    if (s.classList.contains('open')) { s.classList.remove('open'); return; }
    const items = loadShelf();
    s.innerHTML = `<h2>Artifacts (${items.length})</h2>` + (items.length
      ? items.slice().reverse().map((it, idx) =>
        `<div class="shelf-item" data-i="${items.length - 1 - idx}">
           <div class="t">“${esc(it.thought)}”</div>
           <div class="d">${esc(it.label)} · ${esc(new Date(it.date).toLocaleDateString())}</div>
         </div>`).join('')
      : '<div class="shelf-empty">The shelf is empty. Save a jar and it will rest here.</div>');
    s.querySelectorAll('.shelf-item').forEach((n) => {
      n.addEventListener('click', () => {
        const it = loadShelf()[Number(n.dataset.i)];
        const a = el('div', null);
        a.id = 'artifact';
        a.innerHTML = `<div class="artifact-card">${artifactHTML(it)}</div>`;
        hudRoot().appendChild(a);
        requestAnimationFrame(() => a.classList.add('show'));
        s.classList.remove('open');
        a.addEventListener('click', () => a.remove(), { once: true });
      });
    });
    s.classList.add('open');
  }

  function saveToShelf(st) {
    const label = st.findings.length ? st.findings.map((x) => x.name).join(' · ') : 'No distortion found';
    const items = loadShelf();
    items.push({
      thought: st.thought,
      answers: st.answers,
      findings: st.findings,
      label: label,
      date: Date.now(),
    });
    saveShelf(items);
    // the keep is also a ship artifact: it orbits the poppet on the home
    // desktop and binds in relations like any other room's save
    try {
      if (window.Liber && window.Liber.state && window.Liber.state.addArtifact) {
        window.Liber.state.addArtifact('crossing', {
          name: 'a sealed thought',
          label: label,
          thought: st.thought,
          findings: st.findings,
          answers: st.answers,
          ts: Date.now(),
        });
      }
    } catch (e) { /* the shelf holds it even if the ship does not */ }
  }

  // ── loop reset ─────────────────────────────────────────────────────────────
  function resetRite() {
    state.thought = '';
    state.answers = [];
    state.findings = [];
    sceneApi?.releaseJar();
    $('#shelf-toggle')?.classList.remove('cinema');
    document.body.classList.remove('cinema');
    begin();
  }

  // ── emergency exit: the life preserver ──────────────────────────────────
  // Small preserver in the bottom-right corner. Opens a confirm; leaving
  // sinks the traveler out of the underworld and reloads a fresh crossing.
  function initExit() {
    $('#exit-toggle')?.addEventListener('click', confirmLeave);
  }

  function confirmLeave() {
    let c = $('#exit-confirm');
    if (!c) {
      c = el('div', null);
      c.id = 'exit-confirm';
      c.innerHTML = `
        <div class="exit-card">
          <div class="exit-title">Leave the crossing?</div>
          <div class="exit-text">the ferryman will row on without you. any crossing not yet kept is lost to the water.</div>
          <div class="exit-actions">
            <button class="disposition-btn" id="exit-yes">leave the underworld</button>
            <button class="disposition-btn dim" id="exit-no">stay aboard</button>
          </div>
        </div>`;
      hudRoot().appendChild(c);
      requestAnimationFrame(() => c.classList.add('ready'));
      c.querySelector('#exit-yes').addEventListener('click', () => {
        try { localStorage.setItem('vanir.exited.v1', String(Date.now())); } catch {}
        const dest = document.querySelector('[data-vanir-exit]')?.dataset.vanirExit || '../../index.html';
        window.location.href = dest;
      });
      c.querySelector('#exit-no').addEventListener('click', () => {
        c.classList.remove('show');
      });
    }
    c.classList.add('show');
  }

  // ── glitch pulses ──────────────────────────────────────────────────────────
  function scheduleGlitch() {
    setTimeout(() => {
      $('#glitch')?.classList.add('pulse');
      setTimeout(() => $('#glitch')?.classList.remove('pulse'), 320);
      scheduleGlitch();
    }, 9000 + Math.random() * 20000);
  }

  initExit();

  // ── summon: brief instructions, on demand ───────────────────────────────
  function showSummon(card, open) {
    card.hidden = !open;
    card.inert = !open;
    card.classList.toggle('show', open);
    if (open) card.querySelector('.summon-close').focus();
    else document.getElementById('summon-toggle').focus();
  }

  $('#summon-toggle')?.addEventListener('click', () => {
    let c = $('#summon-card');
    if (!c) {
      c = el('div', null);
      c.id = 'summon-card';
      c.hidden = true;
      c.inert = true;
      c.innerHTML = `
        <h3>The Crossing, Briefly</h3>
        <ol>
          <li><em>Speak a thought.</em> <span class="dim">It is sealed in the jar on the raft.</span></li>
          <li><em>Answer the eight questions.</em> <span class="dim">The ferry rows between stations as you do.</span></li>
          <li><em>Watch the water.</em> <span class="dim">Suspected distortions surface as ghostly reframes on the way.</span></li>
          <li><em>At the far shore, choose.</em> <span class="dim">Save as artifact, or throw it overboard — forever.</span></li>
        </ol>
        <button class="summon-close">return to the water</button>`;
      hudRoot().appendChild(c);
      c.querySelector('.summon-close').addEventListener('click', () => showSummon(c, false));
    }
    showSummon(c, c.hidden);
  });

  // ── boot sequence ──────────────────────────────────────────────────────────
  async function begin(name) {
    state.name = name || 'traveler';
    document.body.classList.add('cinema');
    await showStage(`You have two tickets, ${state.name}.`, 'the ferryman waits', 3600);
    // this is the line that sits behind the thought form — drop the fade so
    // the form never opens over live text (hideStage() alone lets the 2.8s
    // CSS fade linger under the input)
    stageText.classList.remove('show');
    stageText.textContent = '';
    stageSub.classList.remove('show');
    stageSub.textContent = '';
    thoughtRite();
  }

  return {
    begin,
    questionRite,
    spawnReframes,
    dispositionRite,
    toggleShelf,
    saveToShelf,
    setSceneApi(api) { sceneApi = api; },
    get state() { return state; },
    scheduleGlitch,
  };
}
