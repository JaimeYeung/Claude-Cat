const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  catName: '猫猫',
  userName: '主人',
  breakInterval: 45,
  breakEnabled: true,
  hookInstalled: false,
  hookPort: 7777,
  lastBreakReminder: null,
  petX: 100,
  petY: 100,
  catSize: 120,
  language: 'zh',
  alertMessage: 'Claude 需要你了喵~',
  reminderMessage: '休息一下喝点水~',
};

class Config {
  constructor(userDataPath) {
    this._filePath = path.join(userDataPath, 'config.json');
    this._data = null;
  }

  load() {
    try {
      const raw = fs.readFileSync(this._filePath, 'utf8');
      this._data = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      this._data = { ...DEFAULTS };
    }
    return this._data;
  }

  get(key) {
    if (!this._data) this.load();
    return this._data[key];
  }

  set(key, value) {
    if (!this._data) this.load();
    this._data[key] = value;
    this._persist();
  }

  getAll() {
    if (!this._data) this.load();
    return { ...this._data };
  }

  _persist() {
    fs.mkdirSync(path.dirname(this._filePath), { recursive: true });
    fs.writeFileSync(this._filePath, JSON.stringify(this._data, null, 2));
  }
}

module.exports = Config;
