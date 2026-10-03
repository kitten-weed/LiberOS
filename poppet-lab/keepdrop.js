/* The keeping — the lab hands its poppet over to the house.
   LAB SIDE: the live scene shrinks toward the middle distance, a gearcase
   vignette closes in, a scan-line sweep rolls, then dark. Runs after the
   keepsake data is already in localStorage; then the page walks to home.
   HOME SIDE: home reads poppet.keepdrop.v1 and drops the poppet onto the rug. */

const DROP_KEY = 'poppet.keepdrop.v1';

/* ── lab side: the transition ─────────────────────────────────────────────── */
export function beginKeeping(durationMs) {
  const DUR = durationMs || 3200;
  if (document.getElementById('keep-veil')) return;

  const veil = document.createElement('div');
  veil.id = 'keep-veil';
  veil.style.cssText = 'position:fixed;inset:0;z-index:60;pointer-events:none;' +
    'background:radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 22%, rgba(8,4,2,0.94) 78%);' +
    'opacity:0;transition:opacity ' + Math.round(DUR * 0.55) + 'ms ease-in;';
  document.body.appendChild(veil);

  const sweep = document.createElement('div');
  sweep.id = 'keep-sweep';
  sweep.style.cssText = 'position:fixed;left:0;right:0;top:-14%;height:14%;z-index:61;pointer-events:none;' +
    'background:linear-gradient(to bottom, rgba(0,0,0,0), rgba(255,214,140,0.16), rgba(0,0,0,0));' +
    'opacity:0;';
  document.body.appendChild(sweep);

  /* r1: draw inward · r2: vignette · r3: sweep · r4: fade to black */
  const t0 = performance.now();
  let stopped = false;
  function frame(now) {
    if (stopped) return;
    const t = Math.min(1, (now - t0) / DUR);
    if (t < 0.45) {
      const e = t / 0.45;                                 // shrink toward middle distance
      window.__lab && window.__lab.camera && (window.__lab.__keepZoom = e);
    }
    if (t >= 0.1 && t < 0.62) veil.style.opacity = String((t - 0.1) / 0.52);
    if (t >= 0.3 && t < 0.8) {
      sweep.style.opacity = '1';
      sweep.style.top = (-14 + (t - 0.3) / 0.5 * 114) + '%';
    }
    if (t >= 0.78) veil.style.opacity = String(Math.min(1, (t - 0.78) / 0.22));
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  setTimeout(function () {
    stopped = true;
    try { localStorage.setItem(DROP_KEY, String(Date.now())); } catch (err) { /* non-fatal */ }
    /* standalone: the home room page. Seated in the ship's bezel (sigil.html
       frames the lab): hand the poppet to the parent desktop instead — it
       embeds the home room and will land the drop on its own rug. */
    let seated = false;
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'poppet-kept' }, '*');
        seated = true;
      }
    } catch (err) { /* cross-origin or standalone */ }
    if (!seated) location.href = '../desktop.html';
  }, DUR + 120);
}

/* main.js reads this each frame and lerps the camera distance — the lab itself
   never knows about the transition's internals beyond this one number. */
export function keepZoom(t) {
  return Math.max(0, Math.min(1, t));
}

/* ── home side: the poppet arrives ────────────────────────────────────────── */
/* home.js calls this once its doll exists; returns true if it dropped in. */
export function consumeDrop(doll, camera) {
  let raw = null;
  try { raw = localStorage.getItem(DROP_KEY); } catch (err) { /* no drop */ }
  if (!raw) return false;
  try { localStorage.removeItem(DROP_KEY); } catch (err) { /* keep it anyway */ }
  if (!doll || !doll.body) return false;

  doll.body.position.y = 5.2;
  const fresh = 'poppet.keepsake.fresh';
  try {
    if (localStorage.getItem(fresh)) {
      localStorage.setItem('poppet.dropannounce', '1');
      localStorage.removeItem(fresh);
    }
  } catch (err) { /* non-fatal */ }
  return true;
}
