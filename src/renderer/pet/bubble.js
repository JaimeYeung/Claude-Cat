const bubble = document.getElementById('bubble');

function showBubble(message) {
  bubble.textContent = message;
  bubble.classList.remove('hidden');
}

function hideBubble() {
  bubble.classList.add('hidden');
}
