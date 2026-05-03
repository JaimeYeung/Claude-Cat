const bubble = document.getElementById('bubble');

const MESSAGES = {
  alert: (userName) => `${userName}，Claude 需要你了喵~`,
  reminder: (userName) => `${userName}，休息一下喝点水~`,
};

function showBubble(type, userName = '主人') {
  bubble.textContent = MESSAGES[type](userName);
  bubble.classList.remove('hidden');
}

function hideBubble() {
  bubble.classList.add('hidden');
}
