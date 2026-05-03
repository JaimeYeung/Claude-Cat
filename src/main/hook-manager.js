const fs = require('fs');
const path = require('path');
const os = require('os');

const CAT_HOOK_MARKER = '/cat-gatekeeper';

class HookManager {
  constructor(settingsPath = null) {
    this._settingsPath = settingsPath ||
      path.join(os.homedir(), '.claude', 'settings.json');
  }

  _read() {
    try {
      return JSON.parse(fs.readFileSync(this._settingsPath, 'utf8'));
    } catch {
      return {};
    }
  }

  _write(data) {
    fs.mkdirSync(path.dirname(this._settingsPath), { recursive: true });
    fs.writeFileSync(this._settingsPath, JSON.stringify(data, null, 2));
  }

  _isCatHook(entry) {
    return Array.isArray(entry.hooks) &&
      entry.hooks.some(h => typeof h.command === 'string' &&
        h.command.includes(CAT_HOOK_MARKER));
  }

  install(port) {
    const settings = this._read();
    if (!settings.hooks) settings.hooks = {};
    if (!Array.isArray(settings.hooks.Notification)) {
      settings.hooks.Notification = [];
    }

    settings.hooks.Notification = settings.hooks.Notification
      .filter(e => !this._isCatHook(e));

    settings.hooks.Notification.push({
      matcher: '',
      hooks: [{
        type: 'command',
        command: `curl -s http://localhost:${port}/cat-gatekeeper || true`,
      }],
    });

    this._write(settings);
  }

  uninstall() {
    const settings = this._read();
    if (!Array.isArray(settings.hooks?.Notification)) return;

    settings.hooks.Notification = settings.hooks.Notification
      .filter(e => !this._isCatHook(e));

    if (settings.hooks.Notification.length === 0) {
      delete settings.hooks.Notification;
    }
    if (settings.hooks && Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    this._write(settings);
  }

  isInstalled() {
    const settings = this._read();
    return Array.isArray(settings.hooks?.Notification) &&
      settings.hooks.Notification.some(e => this._isCatHook(e));
  }
}

module.exports = HookManager;
