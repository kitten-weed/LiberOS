import {readKeepsakes} from './keepsake.js?v=rite-meta2';

function showRestoreError(error) {
  console.error('poppet keepsake entry failed', String(error).slice(0, 160));
  const hint = document.getElementById('mode-hint');
  if (hint) {
    hint.setAttribute('role', 'alert');
    hint.textContent = 'KEEP RESTORE FAILED — THE SAVED WORK WAS LEFT UNCHANGED';
  }
}

async function enterWorkshop() {
  if (window.top === window) {
    const shelf = readKeepsakes();
    if (!shelf.length) {
      location.replace('desktop.html?first-making=1');
      return;
    }
  }
  try {
    await import('./main.js?v=rite-draw10');
  } catch (error) {
    showRestoreError(error);
  }
}

try {
  await enterWorkshop();
} catch (error) {
  showRestoreError(error);
}
