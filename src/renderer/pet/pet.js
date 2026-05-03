const catWrap = document.getElementById('cat-wrap');
const interactionBtns = document.getElementById('interaction-btns');

// --- Mouse-through: pass through transparent areas ---
document.addEventListener('mousemove', (e) => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  window.catAPI.setIgnoreMouseEvents(!el?.closest('#cat-wrap'));
});

// --- Dragging ---
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

// --- Hover: show/hide interaction buttons ---
catWrap.addEventListener('mouseenter', () => {
  interactionBtns.classList.remove('hidden');
  hideBubble();
});

catWrap.addEventListener('mouseleave', () => {
  interactionBtns.classList.add('hidden');
});

// --- Right-click: open settings ---
catWrap.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.catAPI.openSettings();
});
