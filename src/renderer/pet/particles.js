const particlesContainer = document.getElementById('particles');

const PARTICLE_EMOJI = {
  play: '✨',
  feed: '🍣',
  pet: '💕',
};

function spawnParticles(action) {
  const emoji = PARTICLE_EMOJI[action] || '✨';
  for (let i = 0; i < 6; i++) {
    setTimeout(() => _spawnOne(emoji), i * 80);
  }
}

function _spawnOne(emoji) {
  const el = document.createElement('span');
  el.textContent = emoji;
  el.style.cssText = `
    position: absolute;
    font-size: 18px;
    left: ${20 + Math.random() * 60}%;
    bottom: 50%;
    pointer-events: none;
    animation: particle-float 1s ease-out forwards;
    opacity: 1;
  `;
  particlesContainer.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes particle-float {
    0%   { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-60px) scale(0.6); opacity: 0; }
  }
`;
document.head.appendChild(styleEl);
