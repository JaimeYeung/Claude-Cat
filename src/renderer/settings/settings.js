let pendingUploadKey = null;

async function init() {
  const config = await window.settingsAPI.getConfig();

  document.getElementById('catName').value = config.catName || '';
  document.getElementById('userName').value = config.userName || '';
  document.getElementById('breakEnabled').checked = config.breakEnabled;
  document.getElementById('breakInterval').value = config.breakInterval;

  await refreshHookStatus();
  await refreshAllAssets();
  bindEvents();
}

function bindEvents() {
  ['catName', 'userName'].forEach(id => {
    document.getElementById(id).addEventListener('blur', (e) => {
      window.settingsAPI.setConfig(id, e.target.value);
    });
  });

  document.getElementById('breakEnabled').addEventListener('change', (e) => {
    window.settingsAPI.setConfig('breakEnabled', e.target.checked);
  });

  document.getElementById('breakInterval').addEventListener('blur', (e) => {
    const val = parseInt(e.target.value, 10);
    if (val > 0) window.settingsAPI.setConfig('breakInterval', val);
  });

  document.querySelectorAll('.upload-area').forEach(area => {
    area.addEventListener('click', (e) => {
      if (e.target.classList.contains('file-delete')) return;
      pendingUploadKey = area.dataset.key;
      const input = document.getElementById('file-input');
      input.accept = area.dataset.key === 'sound'
        ? '.mp3,.wav,audio/*'
        : 'image/*,video/mp4,.gif';
      input.click();
    });
  });

  document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !pendingUploadKey) return;
    await window.settingsAPI.uploadAsset(pendingUploadKey, file.path);
    await refreshAsset(pendingUploadKey);
    e.target.value = '';
    pendingUploadKey = null;
  });

  document.getElementById('hook-btn').addEventListener('click', async () => {
    const installed = await window.settingsAPI.getHookStatus();
    if (installed) {
      await window.settingsAPI.uninstallHook();
    } else {
      await window.settingsAPI.installHook();
    }
    await refreshHookStatus();
  });
}

async function refreshHookStatus() {
  const installed = await window.settingsAPI.getHookStatus();
  const statusEl = document.getElementById('hook-status');
  const labelEl = document.getElementById('hook-label');
  const btnEl = document.getElementById('hook-btn');

  if (installed) {
    statusEl.className = 'hook-status installed';
    labelEl.textContent = 'Hook 已安装 ✓';
    btnEl.textContent = '卸载';
  } else {
    statusEl.className = 'hook-status not-installed';
    labelEl.textContent = '未安装';
    btnEl.textContent = '安装';
  }
}

async function refreshAllAssets() {
  const keys = ['main', 'interact.play', 'interact.feed', 'interact.pet', 'sound'];
  for (const key of keys) {
    await refreshAsset(key);
  }
}

async function refreshAsset(key) {
  const filePath = await window.settingsAPI.getAssetPath(key);
  const area = document.getElementById(`upload-${key}`);
  if (!area) return;

  if (filePath) {
    const filename = filePath.split('/').pop();
    area.className = 'upload-area has-file';
    if (key === 'main') area.style.marginBottom = '12px';
    area.innerHTML = `
      <span>✓</span>
      <span class="file-name">${filename}</span>
      <button class="file-delete" data-key="${key}">✕</button>
    `;
    area.querySelector('.file-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.settingsAPI.deleteAsset(key);
      await refreshAsset(key);
    });
  } else {
    area.className = 'upload-area';
    if (key === 'main') area.style.marginBottom = '12px';
    area.textContent = key === 'sound' ? '+ 上传 MP3 / WAV' : '+ 上传';
    if (key === 'main') area.textContent = '+ 上传图片 / GIF / 视频';
  }
}

init();
