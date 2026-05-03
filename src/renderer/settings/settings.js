let currentLang = 'zh';

const I18N = {
  zh: {
    title: '🐱 猫猫设置',
    save: '保存', saved: '已保存 ✓',
    sec_nickname: '称呼',
    catName_label: '我该叫猫猫', catName_ph: '猫猫',
    userName_label: '猫猫怎么叫我', userName_ph: '主人',
    alertMsg_label: '提醒消息', alertMsg_ph: 'Claude 需要你了喵~',
    reminderMsg_label: '休息消息', reminderMsg_ph: '休息一下喝点水~',
    sec_appearance: '外观', catSize_label: '猫猫大小',
    sec_assets: '素材管理',
    main_label: '主动画', badge_required: '必填',
    other_label: '其他素材', badge_optional: '可选',
    play_label: '玩耍动画', feed_label: '喂食动画',
    pet_label: '摸头动画', sound_label: '叫声',
    upload_main: '+ 上传图片 / GIF / 视频',
    upload_other: '+ 上传', upload_sound: '+ 上传 MP3 / WAV',
    upload_fail: '上传失败，请重试',
    sec_break: '休息提醒', break_enabled: '开启提醒',
    break_interval: '提醒间隔', break_pre: '每', break_post: '分钟',
    hook_installed: 'Hook 已安装 ✓', hook_not_installed: '未安装',
    hook_install: '安装', hook_uninstall: '卸载',
  },
  en: {
    title: '🐱 Cat Settings',
    save: 'Save', saved: 'Saved ✓',
    sec_nickname: 'Names',
    catName_label: 'Call my cat', catName_ph: 'Cat',
    userName_label: 'Cat calls me', userName_ph: 'Human',
    alertMsg_label: 'Alert message', alertMsg_ph: 'Claude needs you~',
    reminderMsg_label: 'Break message', reminderMsg_ph: 'Time for a break~',
    sec_appearance: 'Appearance', catSize_label: 'Cat size',
    sec_assets: 'Assets',
    main_label: 'Main animation', badge_required: 'Required',
    other_label: 'Other assets', badge_optional: 'Optional',
    play_label: 'Play anim', feed_label: 'Feed anim',
    pet_label: 'Pet anim', sound_label: 'Sound',
    upload_main: '+ Upload image / GIF / video',
    upload_other: '+ Upload', upload_sound: '+ Upload MP3 / WAV',
    upload_fail: 'Upload failed, please retry',
    sec_break: 'Break Reminder', break_enabled: 'Enable reminders',
    break_interval: 'Interval', break_pre: 'Every', break_post: 'minutes',
    hook_installed: 'Hook installed ✓', hook_not_installed: 'Not installed',
    hook_install: 'Install', hook_uninstall: 'Uninstall',
  },
};

function t(key) {
  return (I18N[currentLang] || I18N.zh)[key] || key;
}

function applyLanguageStatic(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  document.getElementById('lang-zh').classList.toggle('active', lang === 'zh');
  document.getElementById('lang-en').classList.toggle('active', lang === 'en');
}

async function applyLanguage(lang) {
  window.settingsAPI.setConfig('language', lang);
  applyLanguageStatic(lang);
  await refreshHookStatus();
  await refreshAllAssets();
}

async function init() {
  const config = await window.settingsAPI.getConfig();
  currentLang = config.language || 'zh';

  document.getElementById('catName').value = config.catName || '';
  document.getElementById('userName').value = config.userName || '';
  document.getElementById('alertMessage').value = config.alertMessage || '';
  document.getElementById('reminderMessage').value = config.reminderMessage || '';
  document.getElementById('breakEnabled').checked = config.breakEnabled;
  document.getElementById('breakInterval').value = config.breakInterval;
  const sz = config.catSize || 120;
  document.getElementById('catSize').value = sz;
  document.getElementById('catSizeLabel').textContent = sz + 'px';

  applyLanguageStatic(currentLang);
  await refreshHookStatus();
  await refreshAllAssets();
  bindEvents();
}

function bindEvents() {
  document.getElementById('lang-zh').addEventListener('click', () => applyLanguage('zh'));
  document.getElementById('lang-en').addEventListener('click', () => applyLanguage('en'));

  document.getElementById('save-btn').addEventListener('click', () => {
    window.settingsAPI.setConfig('catName', document.getElementById('catName').value);
    window.settingsAPI.setConfig('userName', document.getElementById('userName').value);
    window.settingsAPI.setConfig('alertMessage', document.getElementById('alertMessage').value);
    window.settingsAPI.setConfig('reminderMessage', document.getElementById('reminderMessage').value);
    const btn = document.getElementById('save-btn');
    btn.textContent = t('saved');
    btn.disabled = true;
    setTimeout(() => { btn.textContent = t('save'); btn.disabled = false; }, 1500);
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
    labelEl.textContent = t('hook_installed');
    btnEl.textContent = t('hook_uninstall');
  } else {
    statusEl.className = 'hook-status not-installed';
    labelEl.textContent = t('hook_not_installed');
    btnEl.textContent = t('hook_install');
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
    if (key === 'main') area.textContent = t('upload_main');
    else if (key === 'sound') area.textContent = t('upload_sound');
    else area.textContent = t('upload_other');
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
    area.textContent = t('upload_fail');
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
