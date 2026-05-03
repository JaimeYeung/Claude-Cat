let pendingUploadKey = null;

async function init() {
  const config = await window.settingsAPI.getConfig();

  document.getElementById('catName').value = config.catName || '';
  document.getElementById('userName').value = config.userName || '';
  document.getElementById('breakEnabled').checked = config.breakEnabled;
  document.getElementById('breakInterval').value = config.breakInterval;
  const sz = config.catSize || 120;
  document.getElementById('catSize').value = sz;
  document.getElementById('catSizeLabel').textContent = sz + 'px';

  await refreshHookStatus();
  await refreshAllAssets();
  bindEvents();
}

function bindEvents() {
  document.getElementById('save-btn').addEventListener('click', () => {
    window.settingsAPI.setConfig('catName', document.getElementById('catName').value);
    window.settingsAPI.setConfig('userName', document.getElementById('userName').value);
    const btn = document.getElementById('save-btn');
    btn.textContent = '已保存 ✓';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = '保存'; btn.disabled = false; }, 1500);
  });

  document.getElementById('catSize').addEventListener('input', async (e) => {
    const size = parseInt(e.target.value, 10);
    document.getElementById('catSizeLabel').textContent = size + 'px';
    await window.settingsAPI.resizePet(size);
  });

  document.getElementById('breakEnabled').addEventListener('change', (e) => {
    window.settingsAPI.setConfig('breakEnabled', e.target.checked);
  });

  document.getElementById('breakInterval').addEventListener('blur', (e) => {
    const val = parseInt(e.target.value, 10);
    if (val > 0) window.settingsAPI.setConfig('breakInterval', val);
  });

  document.querySelectorAll('.upload-area').forEach(area => {
    area.addEventListener('click', async (e) => {
      if (e.target.classList.contains('file-delete')) return;
      const key = area.dataset.key;
      const filters = key === 'sound'
        ? [{ name: 'Audio', extensions: ['mp3', 'wav'] }]
        : [{ name: 'Media', extensions: ['png', 'gif', 'jpg', 'jpeg', 'mp4'] }];
      const filePath = await window.settingsAPI.openFileDialog(filters);
      if (!filePath) return;
      await uploadWithProgress(key, area, filePath);
    });
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

async function uploadWithProgress(key, area, filePath) {
  let pct = 0;
  renderProgress(area, pct);
  const timer = setInterval(() => {
    pct = Math.min(90, pct + 15);
    renderProgress(area, pct);
  }, 80);

  try {
    await window.settingsAPI.uploadAsset(key, filePath);
    clearInterval(timer);
    renderProgress(area, 100);
    await new Promise(r => setTimeout(r, 350));
    await refreshAsset(key);
  } catch (err) {
    clearInterval(timer);
    area.className = 'upload-area upload-error';
    area.textContent = '上传失败，请重试';
    console.error('Upload failed:', err);
  }
}

function renderProgress(area, pct) {
  area.className = 'upload-area uploading';
  area.innerHTML = `
    <div class="upload-progress-bar">
      <div class="upload-progress-fill" style="width:${pct}%"></div>
    </div>
    <span>${pct}%</span>
  `;
}

init();
