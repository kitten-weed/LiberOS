// sound.js — WebAudio-synthesized UI sounds (plan 2026-09-04 WS4).
// No audio files, no network: the OS is offline, forever. One well-tuned
// set of timbres for the machine's hand — a per-material timbre map was
// considered and deliberately not done.
//
// API: window.Liber.sound = { init, play(kind), setEnabled(bool), isEnabled() }
// Kinds: 'click' (button press) · 'thunk' (heavy / destructive) ·
//        'chime' (artifact saved / kept) · 'tick' (faint ritual line-fall) ·
//        'tink' (bright letter landing in the summoning).
// The context is created lazily and resumes on the first user gesture
// (autoplay-safe). Every path is guarded: a missing or blocked
// AudioContext can never break the room. The press sound is delegated —
// one listener here, so no app JS needs to know about it.

(function (global) {
  'use strict';

  var ctx = null;

  function state() {
    return (global.Liber && global.Liber.state) ? global.Liber.state : null;
  }

  function isEnabled() {
    var s = state();
    return !s || s.get().sounds !== false; // default: on
  }

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }

  function resume() {
    var c = ensureCtx();
    if (c && c.state === 'suspended') {
      try { c.resume(); } catch (e) { /* stays silent this visit */ }
    }
  }

  function init() {
    // Autoplay policy: the context may only leave 'suspended' after a
    // user gesture. Listen wide, resume cheaply — one long visit.
    document.addEventListener('pointerdown', resume, true);
    document.addEventListener('keydown', resume, true);
  }

  // ── voices ──────────────────────────────────────────────────────────
  // Rest law: slow attacks (no startle), consonant intervals (fifths,
  // octaves — restful, never tense), low-mid warmth, long smooth decays,
  // quiet overall. A soft wooden tick, a low earthen thud, a warm bell
  // with an airy sheen. Nothing above ~600 Hz leads.

  // click — a soft wooden tick: lowpassed noise tap with a low round
  // knock beneath. Quiet, gone in 60 ms.
  function click(c) {
    var t = c.currentTime;

    var len = Math.floor(c.sampleRate * 0.03);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    var noise = c.createBufferSource();
    noise.buffer = buf;
    var bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520;
    bp.Q.value = 0.9;
    var ng = c.createGain();
    ng.gain.setValueAtTime(0.1, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    noise.connect(bp).connect(ng).connect(c.destination);
    noise.start(t);

    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.04);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // thunk — a low earthen thud: slow soft drop with a warm soil body.
  // Weight without harshness; settles over a third of a second.
  function thunk(c) {
    var t = c.currentTime;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.4);

    var len = Math.floor(c.sampleRate * 0.16);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var noise = c.createBufferSource();
    noise.buffer = buf;
    var lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    var ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    noise.connect(lp).connect(ng).connect(c.destination);
    noise.start(t);
  }

  // chime — a warm keeping bell: root, fifth, and octave rising gently
  // in turn, each decaying long and smooth, with a faint airy sheen on
  // top that arrives last and leaves first. Consonance throughout.
  function chime(c) {
    var t = c.currentTime;
    var partials = [
      { f: 196.0, detune: -3, g: 0.1,  d: 1.9, at: 0 },
      { f: 294.0, detune: 2,  g: 0.06, d: 2.1, at: 0.09 },
      { f: 392.0, detune: -2, g: 0.045, d: 2.2, at: 0.18 },
      { f: 784.0, detune: 4,  g: 0.012, d: 1.1, at: 0.3 }
    ];
    for (var i = 0; i < partials.length; i++) {
      var p = partials[i];
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = p.f;
      osc.detune.value = p.detune;
      g.gain.setValueAtTime(0.0001, t + p.at);
      g.gain.exponentialRampToValueAtTime(p.g, t + p.at + 0.045);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p.at + p.d);
      osc.connect(g).connect(c.destination);
      osc.start(t + p.at);
      osc.stop(t + p.at + p.d + 0.05);
    }
  }

  // tick — a faint line-fall tick for the summoning ritual: one soft
  // high blip, barely there, gone in 50 ms. Never leads the room.
  function tick(c) {
    var t = c.currentTime;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.03);
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // tink — a bright letter landing for the summoning: one glassy blip,
  // higher than the tick, barely there, gone in 60 ms.
  function tink(c) {
    var t = c.currentTime;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.04);
    g.gain.setValueAtTime(0.03, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // tone — one soft sine for instruments (weaver plucks, wheel chords,
  // motif cells). Freq in Hz, clamped to the rest law (nothing leads
  // above ~600 Hz); every path guarded like the rest.
  function tone(c, freq, dur, gain) {
    var t = c.currentTime;
    var f = Math.max(55, Math.min(620, +freq || 220));
    var d = Math.max(0.1, Math.min(2.5, +dur || 0.5));
    var g0 = Math.max(0.001, Math.min(0.2, gain == null ? 0.06 : +gain));
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(g0, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + d + 0.05);
  }

  function playTone(freq, dur, gain) {
    if (!isEnabled()) return;
    var c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') {
      resume();
      if (c.state === 'suspended') return;
    }
    try { tone(c, freq, dur, gain); } catch (e) { /* never break the room */ }
  }

  // ── public surface ──────────────────────────────────────────────────

  function play(kind) {
    if (!isEnabled()) return;
    var c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') {
      resume();
      if (c.state === 'suspended') return; // no gesture yet — stay silent
    }
    try {
      if (kind === 'thunk') thunk(c);
      else if (kind === 'chime') chime(c);
      else if (kind === 'tick') tick(c);
      else if (kind === 'tink') tink(c);
      else click(c);
    } catch (e) { /* never break the room for a sound */ }
  }

  function setEnabled(on) {
    var s = state();
    if (s) s.set({ sounds: !!on });
  }

  global.Liber = global.Liber || {};
  global.Liber.sound = { init: init, play: play, tone: playTone, setEnabled: setEnabled, isEnabled: isEnabled };

  // Delegated press sound — every button in the OS clicks when pressed.
  document.addEventListener('click', function (e) {
    try {
      var t = e.target;
      var btn = (t && t.closest) ? t.closest('button') : null;
      if (!btn || btn.disabled) return;
      play('click');
    } catch (err) { /* never break the room for a sound */ }
  });

  init();
})(window);
