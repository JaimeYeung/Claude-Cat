const catWrap = document.getElementById('cat-wrap');
const catDisplay = document.getElementById('cat-display');
const interactionBtns = document.getElementById('interaction-btns');

// ─── Asset loading ────────────────────────────────────────────────────────────

let config = {};

async function loadConfig() {
  config = await window.catAPI.getConfig();
}

async function getAssetUrl(key) {
  const p = await window.catAPI.getAssetPath(key);
  return p ? `file://${p}` : null;
}

function renderMedia(url, loop = true) {
  const ext = url ? url.split('.').pop().toLowerCase() : '';
  catDisplay.innerHTML = '';

  if (!url) {
    const img = document.createElement('img');
    img.src = '../../assets/placeholder.png';
    catDisplay.appendChild(img);
    return;
  }

  if (ext === 'mp4') {
    const video = document.createElement('video');
    video.src = url;
    video.autoplay = true;
    video.muted = true;
    video.loop = loop;
    video.playsInline = true;
    catDisplay.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = url;
    catDisplay.appendChild(img);
  }
}

// ─── State machine ────────────────────────────────────────────────────────────

// Priority: alert(3) > interaction(2) > random(1) > main(0)
const STATE = { MAIN: 0, RANDOM: 1, INTERACTION: 2, ALERT: 3 };
let currentState = STATE.MAIN;
let randomTimer = null;

async function enterMain() {
  currentState = STATE.MAIN;
  const url = await getAssetUrl('main');
  renderMedia(url, true);
  scheduleRandom();
}

function scheduleRandom() {
  clearTimeout(randomTimer);
  const delayMs = (5 + Math.random() * 10) * 60 * 1000; // 5–15 min
  randomTimer = setTimeout(playRandom, delayMs);
}

async function playRandom() {
  if (currentState > STATE.RANDOM) { scheduleRandom(); return; }
  const url = await getAssetUrl('random-0');
  if (!url) { scheduleRandom(); return; }

  currentState = STATE.RANDOM;
  renderMedia(url, false);

  const el = catDisplay.firstChild;
  const onEnd = () => enterMain();
  if (el?.tagName === 'VIDEO') {
    el.addEventListener('ended', onEnd, { once: true });
  } else {
    setTimeout(onEnd, 3000);
  }
}

async function playInteraction(action) {
  if (currentState >= STATE.INTERACTION) return;
  currentState = STATE.INTERACTION;

  const url = await getAssetUrl(`interact.${action}`);
  if (url) {
    renderMedia(url, false);
    const el = catDisplay.firstChild;
    const onEnd = () => enterMain();
    if (el?.tagName === 'VIDEO') {
      el.addEventListener('ended', onEnd, { once: true });
    } else {
      setTimeout(onEnd, 3000);
    }
  } else {
    spawnParticles(action);
    setTimeout(() => enterMain(), 1200);
  }
}

function triggerAlert() {
  currentState = STATE.ALERT;
  catWrap.classList.add('jumping');
  catWrap.addEventListener('animationend', () => {
    catWrap.classList.remove('jumping');
    if (currentState === STATE.ALERT) currentState = STATE.MAIN;
  }, { once: true });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

(async () => {
  await loadConfig();
  await enterMain();

  window.catAPI.onAlert(() => {
    triggerAlert();
    showBubble('alert', config.userName);
    playAlertSound();
  });

  window.catAPI.onReminder(() => {
    triggerAlert();
    showBubble('reminder', config.userName);
  });
})();

async function playAlertSound() {
  const url = await getAssetUrl('sound');
  if (url) {
    const audio = new Audio(url);
    audio.play().catch(() => {});
  }
}

// ─── Mouse-through ─────────────────────────────────────────────────────────────

document.addEventListener('mousemove', (e) => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  window.catAPI.setIgnoreMouseEvents(!el?.closest('#cat-wrap'));
});

// ─── Dragging ──────────────────────────────────────────────────────────────────

let dragging = false;
let dragStartScreen = { x: 0, y: 0 };
let winStartPos = { x: 0, y: 0 };

catWrap.addEventListener('mousedown', async (e) => {
  if (e.button !== 0) return;
  dragging = true;
  dragStartScreen = { x: e.screenX, y: e.screenY };
  winStartPos = await window.catAPI.getWindowPosition();
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.screenX - dragStartScreen.x;
  const dy = e.screenY - dragStartScreen.y;
  window.catAPI.setWindowPosition(winStartPos.x + dx, winStartPos.y + dy);
});

document.addEventListener('mouseup', async (e) => {
  if (!dragging || e.button !== 0) return;
  dragging = false;
  const pos = await window.catAPI.getWindowPosition();
  window.catAPI.savePosition(pos.x, pos.y);
});

// ─── Hover + interactions ──────────────────────────────────────────────────────

catWrap.addEventListener('mouseenter', () => {
  interactionBtns.classList.remove('hidden');
  hideBubble();
});

catWrap.addEventListener('mouseleave', () => {
  interactionBtns.classList.add('hidden');
});

interactionBtns.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) playInteraction(btn.dataset.action);
});

catWrap.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.catAPI.openSettings();
});
