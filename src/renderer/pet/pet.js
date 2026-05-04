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

let repeatAlertTimer = null;

function scheduleRepeatAlert() {
  clearTimeout(repeatAlertTimer);
  repeatAlertTimer = setTimeout(() => {
    const bubble = document.getElementById('bubble');
    if (!bubble.classList.contains('hidden')) {
      triggerAlert();
      playAlertSound();
      scheduleRepeatAlert();
    }
  }, 3 * 60 * 1000);
}

function clearRepeatAlert() {
  clearTimeout(repeatAlertTimer);
  repeatAlertTimer = null;
}

function applyPetLanguage(lang) {
  document.querySelectorAll('#interaction-btns button').forEach(btn => {
    btn.textContent = btn.dataset[lang] || btn.textContent;
  });
}

(async () => {
  await loadConfig();
  const initSize = config.catSize || 120;
  catWrap.style.width = initSize + 'px';
  catWrap.style.height = initSize + 'px';
  applyPetLanguage(config.language || 'zh');
  await enterMain();

  window.catAPI.onAlert(() => {
    triggerAlert();
    showBubble(`${config.userName}，${config.alertMessage}`);
    playAlertSound();
    scheduleRepeatAlert();
  });

  window.catAPI.onReminder(() => {
    triggerAlert();
    showBubble(`${config.userName}，${config.reminderMessage}`);
  });

  window.catAPI.onReload(() => {
    if (currentState <= STATE.MAIN) enterMain();
  });

  window.catAPI.onResize((size) => {
    catWrap.style.width = size + 'px';
    catWrap.style.height = size + 'px';
  });

  window.catAPI.onLanguage((lang) => applyPetLanguage(lang));
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
  const overCat = !!el?.closest('#cat-wrap');
  const r = interactionBtns.getBoundingClientRect();
  const overBtns = !interactionBtns.classList.contains('hidden') &&
    e.clientX >= r.left && e.clientX <= r.right &&
    e.clientY >= r.top  && e.clientY <= r.bottom;
  window.catAPI.setIgnoreMouseEvents(!overCat && !overBtns);
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

let hideButtonsTimer = null;

catWrap.addEventListener('mouseenter', () => {
  clearTimeout(hideButtonsTimer);
  interactionBtns.classList.remove('hidden');
  hideBubble();
  clearRepeatAlert();
});

catWrap.addEventListener('mouseleave', () => {
  hideButtonsTimer = setTimeout(() => interactionBtns.classList.add('hidden'), 300);
});

interactionBtns.addEventListener('mouseenter', () => clearTimeout(hideButtonsTimer));
interactionBtns.addEventListener('mouseleave', () => {
  hideButtonsTimer = setTimeout(() => interactionBtns.classList.add('hidden'), 100);
});

interactionBtns.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) playInteraction(btn.dataset.action);
});

catWrap.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.catAPI.openSettings();
});
