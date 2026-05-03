# Cat Gatekeeper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a macOS desktop pet app (Electron) where a cat lives on the desktop, alerts the user when Claude Code needs input, supports custom cat assets, personalized names, and timed break reminders.

**Architecture:** Electron app with a transparent always-on-top pet window and a normal settings window. Main process runs an HTTP server on port 7777 that receives Claude Code hook calls and sends IPC messages to the renderer. All assets and config are stored in `~/Library/Application Support/CatGatekeeper/`.

**Tech Stack:** Electron ^32, electron-builder ^24, Jest ^29, Node.js built-in `http` module (no Express).

---

## File Map

```
cat-gatekeeper/
├── package.json                  - deps, scripts, jest config, electron-builder config
├── src/
│   ├── main/
│   │   ├── index.js              - App entry: creates windows, wires IPC, manages lifecycle
│   │   ├── server.js             - HTTP server on port 7777, /cat-gatekeeper endpoint
│   │   ├── hook-manager.js       - Read/write/merge ~/.claude/settings.json
│   │   ├── config.js             - Read/write userData/config.json with defaults
│   │   ├── assets.js             - Copy/retrieve/delete files in userData/assets/
│   │   └── reminder.js           - Break reminder setInterval logic
│   ├── renderer/
│   │   ├── pet/
│   │   │   ├── index.html        - Pet window shell (transparent body)
│   │   │   ├── pet.js            - Animation state machine, drag
│   │   │   ├── bubble.js         - Frosted glass alert bubble
│   │   │   └── particles.js      - Emoji particle effects for interactions
│   │   └── settings/
│   │       ├── index.html        - Settings window shell
│   │       ├── settings.js       - Form logic, uploads, hook status
│   │       └── settings.css      - Settings panel styles
│   └── preload/
│       ├── pet.js                - contextBridge API for pet window
│       └── settings.js           - contextBridge API for settings window
├── assets/
│   └── placeholder.png           - Default cat placeholder (128x128 orange cat emoji render)
└── tests/
    ├── config.test.js
    ├── server.test.js
    ├── hook-manager.test.js
    ├── assets.test.js
    └── reminder.test.js
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `src/main/index.js` (skeleton)
- Create: `assets/placeholder.png` (download a placeholder)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "cat-gatekeeper",
  "version": "1.0.0",
  "description": "Desktop cat that watches Claude Code for you",
  "main": "src/main/index.js",
  "scripts": {
    "start": "electron .",
    "test": "jest",
    "build": "electron-builder"
  },
  "devDependencies": {
    "electron": "^32.0.0",
    "electron-builder": "^24.0.0",
    "jest": "^29.0.0"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"]
  },
  "build": {
    "appId": "com.catgatekeeper.app",
    "productName": "Cat Gatekeeper",
    "directories": { "output": "dist" },
    "mac": {
      "target": "dmg",
      "category": "public.app-category.utilities"
    },
    "files": ["src/**/*", "assets/**/*"]
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create minimal main process entry**

Create `src/main/index.js`:

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 400, height: 300 });
  win.loadURL('data:text/html,<h1>Cat Gatekeeper</h1>');
});
```

- [ ] **Step 4: Create directory structure**

```bash
mkdir -p src/main src/renderer/pet src/renderer/settings src/preload assets tests
```

- [ ] **Step 5: Add placeholder image**

Download a small placeholder PNG (any 128x128 image works for now):

```bash
curl -s "https://via.placeholder.com/128/FF8C00/FFFFFF?text=Cat" -o assets/placeholder.png
```

If no internet: create an empty file — it will be replaced with a real image later.

- [ ] **Step 6: Verify app launches**

```bash
npm start
```

Expected: A small Electron window appears with "Cat Gatekeeper". Close it.

- [ ] **Step 7: Commit**

```bash
git init
echo "node_modules\ndist\n.superpowers" > .gitignore
git add .
git commit -m "feat: project scaffold"
```

---

### Task 2: Config Module

**Files:**
- Create: `src/main/config.js`
- Create: `tests/config.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/config.test.js`:

```javascript
const path = require('path');
const fs = require('fs');
const os = require('os');
const Config = require('../src/main/config');

let tmpDir;
let config;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-test-'));
  config = new Config(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

test('returns defaults when no config file exists', () => {
  config.load();
  expect(config.get('catName')).toBe('猫猫');
  expect(config.get('userName')).toBe('主人');
  expect(config.get('breakInterval')).toBe(45);
  expect(config.get('breakEnabled')).toBe(true);
  expect(config.get('hookPort')).toBe(7777);
});

test('set persists value to disk', () => {
  config.load();
  config.set('catName', '橘子');
  const config2 = new Config(tmpDir);
  config2.load();
  expect(config2.get('catName')).toBe('橘子');
});

test('getAll returns copy of config', () => {
  config.load();
  const all = config.getAll();
  expect(all.catName).toBe('猫猫');
  all.catName = 'mutated';
  expect(config.get('catName')).toBe('猫猫');
});

test('load merges saved values with defaults', () => {
  fs.writeFileSync(
    path.join(tmpDir, 'config.json'),
    JSON.stringify({ catName: '咪咪' })
  );
  config.load();
  expect(config.get('catName')).toBe('咪咪');
  expect(config.get('userName')).toBe('主人');
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -- tests/config.test.js
```

Expected: `Cannot find module '../src/main/config'`

- [ ] **Step 3: Implement config.js**

Create `src/main/config.js`:

```javascript
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- tests/config.test.js
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/config.js tests/config.test.js
git commit -m "feat: config module with persistence"
```

---

### Task 3: Notify Server

**Files:**
- Create: `src/main/server.js`
- Create: `tests/server.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/server.test.js`:

```javascript
const http = require('http');
const NotifyServer = require('../src/main/server');

let server;

afterEach(async () => {
  if (server) await server.stop();
  server = null;
});

test('starts on preferred port', async () => {
  server = new NotifyServer();
  const port = await server.start(7790);
  expect(port).toBe(7790);
  expect(server.port).toBe(7790);
});

test('falls back to next port if preferred is in use', async () => {
  const blocker = http.createServer().listen(7791, '127.0.0.1');
  await new Promise(r => blocker.once('listening', r));

  server = new NotifyServer();
  const port = await server.start(7791);
  expect(port).toBe(7792);

  await new Promise(r => blocker.close(r));
});

test('calls onNotify when GET /cat-gatekeeper received', async () => {
  server = new NotifyServer();
  await server.start(7793);

  let notified = false;
  server.onNotify = () => { notified = true; };

  await new Promise((resolve, reject) => {
    http.get('http://localhost:7793/cat-gatekeeper', (res) => {
      expect(res.statusCode).toBe(200);
      resolve();
    }).on('error', reject);
  });

  expect(notified).toBe(true);
});

test('returns 404 for unknown paths', async () => {
  server = new NotifyServer();
  await server.start(7794);

  const status = await new Promise((resolve, reject) => {
    http.get('http://localhost:7794/unknown', (res) => resolve(res.statusCode))
      .on('error', reject);
  });

  expect(status).toBe(404);
});

test('stop() closes the server', async () => {
  server = new NotifyServer();
  await server.start(7795);
  await server.stop();

  await expect(
    new Promise((_, reject) =>
      http.get('http://localhost:7795/cat-gatekeeper', reject).on('error', reject)
    )
  ).rejects.toThrow();

  server = null;
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -- tests/server.test.js
```

Expected: `Cannot find module '../src/main/server'`

- [ ] **Step 3: Implement server.js**

Create `src/main/server.js`:

```javascript
const http = require('http');

class NotifyServer {
  constructor() {
    this._server = null;
    this.port = null;
    this.onNotify = null;
  }

  start(preferredPort = 7777) {
    return new Promise((resolve, reject) => {
      this._tryPort(preferredPort, preferredPort + 5, resolve, reject);
    });
  }

  _tryPort(port, maxPort, resolve, reject) {
    if (port > maxPort) {
      reject(new Error(`No available ports in range ${maxPort - 5}–${maxPort}`));
      return;
    }

    const server = http.createServer((req, res) => {
      if (req.url === '/cat-gatekeeper') {
        res.writeHead(200);
        res.end('ok');
        if (this.onNotify) this.onNotify();
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        this._tryPort(port + 1, maxPort, resolve, reject);
      } else {
        reject(err);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      this._server = server;
      this.port = port;
      resolve(port);
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (!this._server) { resolve(); return; }
      this._server.close(() => {
        this._server = null;
        this.port = null;
        resolve();
      });
    });
  }
}

module.exports = NotifyServer;
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- tests/server.test.js
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/server.js tests/server.test.js
git commit -m "feat: HTTP notify server with port fallback"
```

---

### Task 4: Hook Manager

**Files:**
- Create: `src/main/hook-manager.js`
- Create: `tests/hook-manager.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/hook-manager.test.js`:

```javascript
const path = require('path');
const fs = require('fs');
const os = require('os');
const HookManager = require('../src/main/hook-manager');

let tmpDir;
let settingsPath;
let manager;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-test-'));
  settingsPath = path.join(tmpDir, 'settings.json');
  manager = new HookManager(settingsPath);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

test('install writes hook to empty settings file', () => {
  manager.install(7777);
  const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  expect(saved.hooks.Notification).toHaveLength(1);
  expect(saved.hooks.Notification[0].hooks[0].command).toContain('7777');
  expect(saved.hooks.Notification[0].hooks[0].command).toContain('/cat-gatekeeper');
});

test('install merges with existing hooks', () => {
  fs.writeFileSync(settingsPath, JSON.stringify({
    hooks: {
      Notification: [{
        matcher: '',
        hooks: [{ type: 'command', command: 'echo other-hook' }]
      }]
    }
  }));
  manager.install(7777);
  const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  expect(saved.hooks.Notification).toHaveLength(2);
  expect(saved.hooks.Notification[0].hooks[0].command).toBe('echo other-hook');
});

test('install replaces existing cat-gatekeeper hook (port update)', () => {
  manager.install(7777);
  manager.install(7778);
  const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const catHooks = saved.hooks.Notification.filter(e =>
    e.hooks[0].command.includes('/cat-gatekeeper')
  );
  expect(catHooks).toHaveLength(1);
  expect(catHooks[0].hooks[0].command).toContain('7778');
});

test('uninstall removes only cat-gatekeeper hook', () => {
  fs.writeFileSync(settingsPath, JSON.stringify({
    hooks: {
      Notification: [
        { matcher: '', hooks: [{ type: 'command', command: 'echo other' }] }
      ]
    }
  }));
  manager.install(7777);
  manager.uninstall();
  const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  expect(saved.hooks.Notification).toHaveLength(1);
  expect(saved.hooks.Notification[0].hooks[0].command).toBe('echo other');
});

test('uninstall removes hooks key when no hooks remain', () => {
  manager.install(7777);
  manager.uninstall();
  const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  expect(saved.hooks).toBeUndefined();
});

test('isInstalled returns true after install, false after uninstall', () => {
  expect(manager.isInstalled()).toBe(false);
  manager.install(7777);
  expect(manager.isInstalled()).toBe(true);
  manager.uninstall();
  expect(manager.isInstalled()).toBe(false);
});

test('works when settings.json does not exist', () => {
  expect(() => manager.install(7777)).not.toThrow();
  expect(manager.isInstalled()).toBe(true);
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -- tests/hook-manager.test.js
```

Expected: `Cannot find module '../src/main/hook-manager'`

- [ ] **Step 3: Implement hook-manager.js**

Create `src/main/hook-manager.js`:

```javascript
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- tests/hook-manager.test.js
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/hook-manager.js tests/hook-manager.test.js
git commit -m "feat: hook manager — install/uninstall Claude Code notification hook"
```

---

### Task 5: Asset Manager

**Files:**
- Create: `src/main/assets.js`
- Create: `tests/assets.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/assets.test.js`:

```javascript
const path = require('path');
const fs = require('fs');
const os = require('os');
const AssetManager = require('../src/main/assets');

let tmpDir;
let srcFile;
let assets;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'assets-test-'));
  srcFile = path.join(tmpDir, 'mycat.gif');
  fs.writeFileSync(srcFile, 'fake gif data');
  assets = new AssetManager(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

test('save copies file and returns destination path', () => {
  const dest = assets.save('main', srcFile);
  expect(fs.existsSync(dest)).toBe(true);
  expect(fs.readFileSync(dest, 'utf8')).toBe('fake gif data');
  expect(path.extname(dest)).toBe('.gif');
});

test('getPath returns path for saved asset', () => {
  assets.save('main', srcFile);
  const p = assets.getPath('main');
  expect(p).not.toBeNull();
  expect(fs.existsSync(p)).toBe(true);
});

test('getPath returns null for unknown key', () => {
  expect(assets.getPath('nonexistent')).toBeNull();
});

test('delete removes file and returns true', () => {
  assets.save('main', srcFile);
  const result = assets.delete('main');
  expect(result).toBe(true);
  expect(assets.getPath('main')).toBeNull();
});

test('delete returns false when asset does not exist', () => {
  expect(assets.delete('nonexistent')).toBe(false);
});

test('save overwrites existing asset with same key', () => {
  assets.save('main', srcFile);
  const newSrc = path.join(tmpDir, 'newcat.png');
  fs.writeFileSync(newSrc, 'png data');
  assets.save('main', newSrc);
  const p = assets.getPath('main');
  expect(path.extname(p)).toBe('.png');
  expect(fs.readFileSync(p, 'utf8')).toBe('png data');
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/assets.test.js
```

Expected: `Cannot find module '../src/main/assets'`

- [ ] **Step 3: Implement assets.js**

Create `src/main/assets.js`:

```javascript
const fs = require('fs');
const path = require('path');

class AssetManager {
  constructor(userDataPath) {
    this._dir = path.join(userDataPath, 'assets');
    fs.mkdirSync(this._dir, { recursive: true });
  }

  save(key, sourcePath) {
    const ext = path.extname(sourcePath);
    // Remove any existing asset with this key (different extension)
    this._removeByKey(key);
    const dest = path.join(this._dir, `${key}${ext}`);
    fs.copyFileSync(sourcePath, dest);
    return dest;
  }

  getPath(key) {
    const files = fs.readdirSync(this._dir);
    const match = files.find(f =>
      path.basename(f, path.extname(f)) === key
    );
    return match ? path.join(this._dir, match) : null;
  }

  delete(key) {
    return this._removeByKey(key);
  }

  _removeByKey(key) {
    const existing = this.getPath(key);
    if (existing) {
      fs.unlinkSync(existing);
      return true;
    }
    return false;
  }
}

module.exports = AssetManager;
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm test -- tests/assets.test.js
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/assets.js tests/assets.test.js
git commit -m "feat: asset manager — store cat media files in userData"
```

---

### Task 6: Transparent Pet Window

**Files:**
- Modify: `src/main/index.js`
- Create: `src/preload/pet.js`
- Create: `src/renderer/pet/index.html`

- [ ] **Step 1: Create pet preload script**

Create `src/preload/pet.js`:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('catAPI', {
  onAlert: (cb) => ipcRenderer.on('cat:alert', cb),
  onReminder: (cb) => ipcRenderer.on('cat:reminder', cb),
  setIgnoreMouseEvents: (ignore) =>
    ipcRenderer.send('set-ignore-mouse', ignore),
  getConfig: () => ipcRenderer.invoke('config:get-all'),
  getAssetPath: (key) => ipcRenderer.invoke('assets:get', key),
  setWindowPosition: (x, y) => ipcRenderer.send('window:set-position', x, y),
  getWindowPosition: () => ipcRenderer.invoke('window:get-position'),
  savePosition: (x, y) => ipcRenderer.send('config:set', 'petX', x, y),
  openSettings: () => ipcRenderer.send('open-settings'),
});
```

- [ ] **Step 2: Create pet window HTML**

Create `src/renderer/pet/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: transparent;
      overflow: hidden;
      user-select: none;
    }
    #pet-root {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 8px;
    }
    #cat-wrap {
      position: relative;
      width: 120px;
      height: 120px;
      cursor: grab;
    }
    #cat-wrap:active { cursor: grabbing; }
    #cat-display {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #cat-display img,
    #cat-display video {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      pointer-events: none;
    }
    #bubble {
      position: absolute;
      bottom: calc(100% + 12px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 14px;
      padding: 10px 16px;
      font-size: 13px;
      color: white;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      pointer-events: none;
    }
    #bubble::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: rgba(255, 255, 255, 0.25);
    }
    #bubble.hidden { display: none; }
    #interaction-btns {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 6px;
    }
    #interaction-btns.hidden { display: none; }
    #interaction-btns button {
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      color: white;
      font-size: 11px;
      padding: 4px 8px;
      cursor: pointer;
      font-weight: 600;
    }
    #interaction-btns button:hover {
      background: rgba(255, 255, 255, 0.35);
    }
    #particles {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: visible;
    }
    @keyframes cat-jump {
      0%   { transform: translateY(0); }
      20%  { transform: translateY(-24px); }
      40%  { transform: translateY(0); }
      60%  { transform: translateY(-12px); }
      80%  { transform: translateY(0); }
      100% { transform: translateY(0); }
    }
    .jumping { animation: cat-jump 0.7s ease-in-out; }
  </style>
</head>
<body>
  <div id="pet-root">
    <div id="cat-wrap">
      <div id="cat-display">
        <img id="cat-placeholder" src="../../assets/placeholder.png" alt="cat">
      </div>
      <div id="bubble" class="hidden"></div>
      <div id="interaction-btns" class="hidden">
        <button data-action="play">玩耍</button>
        <button data-action="feed">喂食</button>
        <button data-action="pet">摸头</button>
      </div>
      <div id="particles"></div>
    </div>
  </div>
  <script src="pet.js"></script>
  <script src="bubble.js"></script>
  <script src="particles.js"></script>
</body>
</html>
```

- [ ] **Step 3: Rewrite index.js with proper pet window**

Replace `src/main/index.js`:

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Config = require('./config');
const AssetManager = require('./assets');
const HookManager = require('./hook-manager');
const NotifyServer = require('./server');
const BreakReminder = require('./reminder');

let petWindow;
let settingsWindow;
let config;
let assets;
let hookManager;
let server;
let reminder;

async function bootstrap() {
  config = new Config(app.getPath('userData'));
  config.load();
  assets = new AssetManager(app.getPath('userData'));
  hookManager = new HookManager();

  server = new NotifyServer();
  const port = await server.start(config.get('hookPort'));
  config.set('hookPort', port);
  server.onNotify = () => {
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('cat:alert');
    }
  };

  hookManager.install(port);
  config.set('hookInstalled', true);

  petWindow = createPetWindow();
  registerIPC();

  reminder = new BreakReminder({
    onRemind: () => {
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('cat:reminder');
      }
    },
  });
  if (config.get('breakEnabled')) {
    reminder.start(config.get('breakInterval'));
  }
}

function createPetWindow() {
  const win = new BrowserWindow({
    width: 200,
    height: 200,
    x: config.get('petX'),
    y: config.get('petY'),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/pet.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '../renderer/pet/index.html'));
  win.setIgnoreMouseEvents(true, { forward: true });
  return win;
}

function registerIPC() {
  ipcMain.on('set-ignore-mouse', (_, ignore) => {
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  ipcMain.on('window:set-position', (_, x, y) => {
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.setPosition(Math.round(x), Math.round(y));
    }
  });

  ipcMain.handle('window:get-position', () => {
    if (petWindow && !petWindow.isDestroyed()) {
      const [x, y] = petWindow.getPosition();
      return { x, y };
    }
    return { x: 0, y: 0 };
  });

  ipcMain.on('config:set', (_, key, value) => config.set(key, value));
  ipcMain.handle('config:get-all', () => config.getAll());

  ipcMain.handle('assets:upload', (_, key, filePath) => assets.save(key, filePath));
  ipcMain.handle('assets:get', (_, key) => assets.getPath(key));
  ipcMain.handle('assets:delete', (_, key) => assets.delete(key));

  ipcMain.handle('hook:status', () => hookManager.isInstalled());
  ipcMain.handle('hook:install', () => {
    hookManager.install(server.port);
    config.set('hookInstalled', true);
  });
  ipcMain.handle('hook:uninstall', () => {
    hookManager.uninstall();
    config.set('hookInstalled', false);
  });

  ipcMain.on('open-settings', () => {
    if (!settingsWindow || settingsWindow.isDestroyed()) {
      settingsWindow = createSettingsWindow();
    } else {
      settingsWindow.focus();
    }
  });
}

function createSettingsWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 560,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/settings.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '../renderer/settings/index.html'));
  return win;
}

app.whenReady().then(bootstrap);

app.on('before-quit', async (event) => {
  event.preventDefault();
  hookManager.uninstall();
  config.set('hookInstalled', false);
  if (reminder) reminder.stop();
  await server.stop();
  app.exit(0);
});
```

- [ ] **Step 4: Verify pet window appears**

```bash
npm start
```

Expected: A transparent window with the placeholder cat image (or broken image icon — that's fine for now). The terminal cat emoji should appear on screen. If you see a white square, transparency is working. Close with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/main/index.js src/preload/pet.js src/renderer/pet/index.html
git commit -m "feat: transparent pet window with always-on-top"
```

---

### Task 7: Mouse-Through + Drag

**Files:**
- Create: `src/renderer/pet/pet.js` (drag logic)
- Create: `src/renderer/pet/bubble.js` (stub)
- Create: `src/renderer/pet/particles.js` (stub)

- [ ] **Step 1: Create bubble.js stub**

Create `src/renderer/pet/bubble.js`:

```javascript
// Bubble implementation in Task 9
```

- [ ] **Step 2: Create particles.js stub**

Create `src/renderer/pet/particles.js`:

```javascript
// Particles implementation in Task 11
function spawnParticles(type) {
  // stub
}
```

- [ ] **Step 3: Create pet.js with mouse-through and drag**

Create `src/renderer/pet/pet.js`:

```javascript
const catWrap = document.getElementById('cat-wrap');
const interactionBtns = document.getElementById('interaction-btns');

// --- Mouse-through: ignore mouse on transparent areas ---
document.addEventListener('mousemove', (e) => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const overClickable = el && (
    el.closest('#cat-wrap') !== null
  );
  window.catAPI.setIgnoreMouseEvents(!overClickable);
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
});

catWrap.addEventListener('mouseleave', () => {
  interactionBtns.classList.add('hidden');
});

// --- Right-click: open settings ---
catWrap.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.catAPI.openSettings();
});
```

- [ ] **Step 4: Verify drag and hover work**

```bash
npm start
```

Manual checks:
1. Hover over cat → three buttons appear (玩耍, 喂食, 摸头)
2. Move mouse off cat → buttons disappear
3. Drag cat to new position → cat moves with mouse
4. Right-click → settings window should appear (may show blank if not built yet)
5. Click on desktop through the transparent area → the window behind should receive the click

- [ ] **Step 5: Commit**

```bash
git add src/renderer/pet/pet.js src/renderer/pet/bubble.js src/renderer/pet/particles.js
git commit -m "feat: mouse-through transparency and cat dragging"
```

---

### Task 8: Animation State Machine

**Files:**
- Modify: `src/renderer/pet/pet.js`

The state machine has four states: `main`, `random`, `interaction`, `alert`. Higher-priority states interrupt lower ones.

- [ ] **Step 1: Add animation loading and state machine to pet.js**

Replace the contents of `src/renderer/pet/pet.js` with:

```javascript
const catWrap = document.getElementById('cat-wrap');
const catDisplay = document.getElementById('cat-display');
const interactionBtns = document.getElementById('interaction-btns');

// ─── Asset loading ───────────────────────────────────────────────────────────

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
    const img = document.createElement('img');
    img.src = '../../assets/placeholder.png';
    catDisplay.appendChild(img);
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

// ─── State machine ───────────────────────────────────────────────────────────

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
  if (currentState > STATE.RANDOM) {
    scheduleRandom();
    return;
  }
  const url = await getAssetUrl('random-0'); // first random clip
  if (!url) { scheduleRandom(); return; }

  currentState = STATE.RANDOM;
  renderMedia(url, false);

  const el = catDisplay.firstChild;
  const onEnd = () => { enterMain(); };
  if (el?.tagName === 'VIDEO') {
    el.addEventListener('ended', onEnd, { once: true });
  } else {
    setTimeout(onEnd, 3000); // GIF: return after 3s
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
  }, { once: true });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

(async () => {
  await loadConfig();
  await enterMain();

  window.catAPI.onAlert(() => {
    triggerAlert();
    showBubble('alert', config.userName);
    playAlertSound();
  });

  window.catAPI.onReminder(() => {
    triggerAlert();
    showBubble('reminder', config.userName);
  });
})();

async function playAlertSound() {
  const url = await getAssetUrl('sound');
  if (url) {
    const audio = new Audio(url);
    audio.play().catch(() => {});
  }
}

// ─── Mouse-through ────────────────────────────────────────────────────────────

document.addEventListener('mousemove', (e) => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  window.catAPI.setIgnoreMouseEvents(!el?.closest('#cat-wrap'));
});

// ─── Dragging ─────────────────────────────────────────────────────────────────

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

// ─── Hover + interactions ────────────────────────────────────────────────────

catWrap.addEventListener('mouseenter', () => {
  interactionBtns.classList.remove('hidden');
  hideBubble();
});

catWrap.addEventListener('mouseleave', () => {
  interactionBtns.classList.add('hidden');
});

interactionBtns.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) playInteraction(btn.dataset.action);
});

catWrap.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.catAPI.openSettings();
});
```

Note: `showBubble`, `hideBubble`, and `spawnParticles` are defined in bubble.js and particles.js (Tasks 9 and 11). They will be available as globals since all scripts load in the same renderer context.

- [ ] **Step 2: Verify app runs without errors**

```bash
npm start
```

Expected: Cat displays, right-click → settings (empty), hover → 3 buttons, buttons click without crashing. Open DevTools (View → Toggle Developer Tools in Electron) to check for console errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/pet/pet.js
git commit -m "feat: animation state machine (main/random/interaction/alert)"
```

---

### Task 9: Alert Bubble

**Files:**
- Modify: `src/renderer/pet/bubble.js`

- [ ] **Step 1: Implement bubble.js**

Replace `src/renderer/pet/bubble.js`:

```javascript
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
```

- [ ] **Step 2: Verify bubble appears on simulated alert**

```bash
npm start
```

Open DevTools console in the pet window and run:
```javascript
window.catAPI.onAlert(() => {}) // already registered
// Simulate manually:
document.getElementById('bubble').textContent = '主人，Claude 需要你了喵~';
document.getElementById('bubble').classList.remove('hidden');
```

Expected: Frosted glass bubble appears above the cat. Move mouse over the cat → bubble disappears.

To trigger a real alert, in a separate terminal:
```bash
curl http://localhost:7777/cat-gatekeeper
```

Expected: Cat jumps, bubble appears with text "主人，Claude 需要你了喵~".

- [ ] **Step 3: Commit**

```bash
git add src/renderer/pet/bubble.js
git commit -m "feat: frosted glass alert bubble"
```

---

### Task 10: Interaction Buttons + Particle Effects

**Files:**
- Modify: `src/renderer/pet/particles.js`

- [ ] **Step 1: Implement particles.js**

Replace `src/renderer/pet/particles.js`:

```javascript
const particlesContainer = document.getElementById('particles');

const PARTICLE_CONFIG = {
  play:  { emoji: '✨', count: 6, spread: 50 },
  feed:  { emoji: '🍣', count: 3, spread: 30 },
  pet:   { emoji: '💕', count: 5, spread: 40 },
};

function spawnParticles(action) {
  const cfg = PARTICLE_CONFIG[action];
  if (!cfg) return;

  for (let i = 0; i < cfg.count; i++) {
    const el = document.createElement('span');
    el.textContent = cfg.emoji;
    el.style.cssText = `
      position: absolute;
      font-size: 18px;
      pointer-events: none;
      bottom: 60px;
      left: ${50 + (Math.random() - 0.5) * cfg.spread}%;
      transform: translateX(-50%);
      animation: particle-float 1.2s ease-out forwards;
      animation-delay: ${i * 80}ms;
    `;
    particlesContainer.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// Inject keyframe if not already present
if (!document.getElementById('particle-style')) {
  const style = document.createElement('style');
  style.id = 'particle-style';
  style.textContent = `
    @keyframes particle-float {
      0%   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-60px) scale(0.5); }
    }
  `;
  document.head.appendChild(style);
}
```

- [ ] **Step 2: Verify particle effects**

```bash
npm start
```

Hover cat → click 玩耍 → sparkles fly up from cat body.
Click 喂食 → sushi emoji floats up.
Click 摸头 → hearts float up.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/pet/particles.js
git commit -m "feat: emoji particle effects for cat interactions"
```

---

### Task 11: Break Reminder

**Files:**
- Create: `src/main/reminder.js`
- Create: `tests/reminder.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/reminder.test.js`:

```javascript
const BreakReminder = require('../src/main/reminder');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('calls onRemind after interval', () => {
  const onRemind = jest.fn();
  const r = new BreakReminder({ onRemind });
  r.start(1); // 1 minute
  expect(onRemind).not.toHaveBeenCalled();
  jest.advanceTimersByTime(60 * 1000);
  expect(onRemind).toHaveBeenCalledTimes(1);
});

test('calls onRemind repeatedly', () => {
  const onRemind = jest.fn();
  const r = new BreakReminder({ onRemind });
  r.start(1);
  jest.advanceTimersByTime(3 * 60 * 1000);
  expect(onRemind).toHaveBeenCalledTimes(3);
});

test('stop() prevents further calls', () => {
  const onRemind = jest.fn();
  const r = new BreakReminder({ onRemind });
  r.start(1);
  jest.advanceTimersByTime(60 * 1000);
  r.stop();
  jest.advanceTimersByTime(60 * 1000);
  expect(onRemind).toHaveBeenCalledTimes(1);
});

test('restart() resets interval with new duration', () => {
  const onRemind = jest.fn();
  const r = new BreakReminder({ onRemind });
  r.start(10);
  r.restart(1);
  jest.advanceTimersByTime(60 * 1000);
  expect(onRemind).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tests/reminder.test.js
```

Expected: `Cannot find module '../src/main/reminder'`

- [ ] **Step 3: Implement reminder.js**

Create `src/main/reminder.js`:

```javascript
class BreakReminder {
  constructor({ onRemind }) {
    this._onRemind = onRemind;
    this._timer = null;
  }

  start(intervalMinutes) {
    this.stop();
    this._timer = setInterval(
      () => this._onRemind(),
      intervalMinutes * 60 * 1000
    );
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  restart(intervalMinutes) {
    this.start(intervalMinutes);
  }
}

module.exports = BreakReminder;
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm test -- tests/reminder.test.js
```

Expected: 4 tests pass.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: All tests across all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/main/reminder.js tests/reminder.test.js
git commit -m "feat: break reminder timer"
```

---

### Task 12: Settings Panel

**Files:**
- Create: `src/preload/settings.js`
- Create: `src/renderer/settings/index.html`
- Create: `src/renderer/settings/settings.js`
- Create: `src/renderer/settings/settings.css`

- [ ] **Step 1: Create settings preload**

Create `src/preload/settings.js`:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('config:get-all'),
  setConfig: (key, value) => ipcRenderer.send('config:set', key, value),
  uploadAsset: (key, filePath) => ipcRenderer.invoke('assets:upload', key, filePath),
  deleteAsset: (key) => ipcRenderer.invoke('assets:delete', key),
  getAssetPath: (key) => ipcRenderer.invoke('assets:get', key),
  getHookStatus: () => ipcRenderer.invoke('hook:status'),
  installHook: () => ipcRenderer.invoke('hook:install'),
  uninstallHook: () => ipcRenderer.invoke('hook:uninstall'),
});
```

- [ ] **Step 2: Create settings.css**

Create `src/renderer/settings/settings.css`:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f5f7;
  color: #1a1a2e;
  font-size: 13px;
}
.panel {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  margin: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.panel-title {
  padding: 12px 16px;
  font-weight: 700;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; }
.section:last-child { border-bottom: none; }
.section-label {
  font-size: 10px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.field { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.field:last-child { margin-bottom: 0; }
.field label { width: 90px; color: #666; flex-shrink: 0; }
.field input[type="text"],
.field input[type="number"] {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  background: #fafafa;
}
.field input:focus { outline: none; border-color: #999; }
.upload-area {
  border: 1.5px dashed #ddd;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  color: #bbb;
  cursor: pointer;
  transition: border-color 0.2s;
}
.upload-area:hover { border-color: #aaa; color: #888; }
.upload-area.has-file {
  border: 1.5px solid #b7e4b7;
  background: #f0f9f0;
  color: #2d7d2d;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
}
.upload-area.has-file .file-name { flex: 1; font-weight: 600; font-size: 12px; }
.upload-area.has-file .file-delete {
  background: none; border: none; color: #aaa; cursor: pointer; font-size: 14px;
}
.row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.row:last-child { margin-bottom: 0; }
.row-label { width: 90px; color: #666; flex-shrink: 0; }
.badge {
  font-size: 9px; font-weight: 700; padding: 2px 6px;
  border-radius: 4px;
}
.badge-required { background: #ff3b30; color: white; }
.badge-optional { background: #e5e5ea; color: #888; }
.hook-status {
  border-radius: 6px; padding: 8px 12px;
  display: flex; align-items: center; justify-content: space-between;
}
.hook-status.installed { background: #f0f9f0; border: 1px solid #b7e4b7; color: #2d7d2d; }
.hook-status.not-installed { background: #fff9f0; border: 1px solid #ffd9a0; color: #996600; }
.hook-status button {
  border: none; border-radius: 4px; padding: 4px 10px;
  font-size: 11px; font-weight: 700; cursor: pointer;
}
.hook-status.installed button { background: #2d7d2d; color: white; }
.hook-status.not-installed button { background: #996600; color: white; }
.reminder-row { display: flex; align-items: center; gap: 8px; }
.reminder-row input[type="number"] { width: 60px; text-align: center; }
toggle-row { display: flex; align-items: center; justify-content: space-between; }
input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
```

- [ ] **Step 3: Create settings HTML**

Create `src/renderer/settings/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cat Gatekeeper 设置</title>
  <link rel="stylesheet" href="settings.css">
</head>
<body>
  <div class="panel">
    <div class="panel-title">
      <span>🐱 猫猫设置</span>
    </div>

    <!-- 称呼 -->
    <div class="section">
      <div class="section-label">称呼</div>
      <div class="field">
        <label>我该叫猫猫</label>
        <input type="text" id="catName" placeholder="猫猫">
      </div>
      <div class="field">
        <label>猫猫怎么叫我</label>
        <input type="text" id="userName" placeholder="主人">
      </div>
    </div>

    <!-- 素材管理 -->
    <div class="section">
      <div class="section-label">素材管理</div>

      <div class="row">
        <span class="row-label">主动画</span>
        <span class="badge badge-required">必填</span>
      </div>
      <div id="upload-main" class="upload-area" data-key="main" style="margin-bottom:12px">
        + 上传图片 / GIF / 视频
      </div>

      <div class="row">
        <span class="row-label">其他素材</span>
        <span class="badge badge-optional">可选</span>
      </div>
      <div class="row">
        <span class="row-label">玩耍动画</span>
        <div id="upload-interact.play" class="upload-area" data-key="interact.play" style="flex:1">+ 上传</div>
      </div>
      <div class="row">
        <span class="row-label">喂食动画</span>
        <div id="upload-interact.feed" class="upload-area" data-key="interact.feed" style="flex:1">+ 上传</div>
      </div>
      <div class="row">
        <span class="row-label">摸头动画</span>
        <div id="upload-interact.pet" class="upload-area" data-key="interact.pet" style="flex:1">+ 上传</div>
      </div>
      <div class="row">
        <span class="row-label">叫声</span>
        <div id="upload-sound" class="upload-area" data-key="sound" style="flex:1">+ 上传 MP3 / WAV</div>
      </div>
    </div>

    <!-- Claude Code -->
    <div class="section">
      <div class="section-label">Claude Code</div>
      <div id="hook-status" class="hook-status not-installed">
        <span id="hook-label">未安装</span>
        <button id="hook-btn">安装</button>
      </div>
    </div>

    <!-- 休息提醒 -->
    <div class="section">
      <div class="section-label">休息提醒</div>
      <div class="field">
        <label>开启提醒</label>
        <input type="checkbox" id="breakEnabled">
      </div>
      <div class="field">
        <label>提醒间隔</label>
        <div class="reminder-row">
          <span>每</span>
          <input type="number" id="breakInterval" min="1" max="480" value="45">
          <span>分钟</span>
        </div>
      </div>
    </div>
  </div>

  <input type="file" id="file-input" style="display:none" accept="image/*,video/mp4,.gif,.mp3,.wav">
  <script src="settings.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create settings.js**

Create `src/renderer/settings/settings.js`:

```javascript
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
  // Text inputs: save on blur
  ['catName', 'userName'].forEach(id => {
    document.getElementById(id).addEventListener('blur', (e) => {
      window.settingsAPI.setConfig(id, e.target.value);
    });
  });

  // Checkbox: save immediately
  document.getElementById('breakEnabled').addEventListener('change', (e) => {
    window.settingsAPI.setConfig('breakEnabled', e.target.checked);
  });

  // Number input: save on blur
  document.getElementById('breakInterval').addEventListener('blur', (e) => {
    const val = parseInt(e.target.value, 10);
    if (val > 0) window.settingsAPI.setConfig('breakInterval', val);
  });

  // Upload areas: click to open file picker
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

  // File input: handle selection
  document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !pendingUploadKey) return;
    await window.settingsAPI.uploadAsset(pendingUploadKey, file.path);
    await refreshAsset(pendingUploadKey);
    e.target.value = '';
    pendingUploadKey = null;
  });

  // Hook button
  document.getElementById('hook-btn').addEventListener('click', async () => {
    const installed = (await window.settingsAPI.getHookStatus());
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
```

- [ ] **Step 5: Verify settings panel**

```bash
npm start
```

Right-click the cat → settings panel opens. Check:
1. Cat name and user name fields are editable, changes persist after re-open
2. Upload areas are clickable and open file picker
3. Hook section shows status (installed/not installed)
4. Break reminder toggle and interval are editable

- [ ] **Step 6: Commit**

```bash
git add src/preload/settings.js src/renderer/settings/
git commit -m "feat: settings panel with all configuration options"
```

---

### Task 13: App Lifecycle + Position Persistence

**Files:**
- Verify: `src/main/index.js` (already written in Task 6)

This task verifies the app lifecycle behavior works end-to-end.

- [ ] **Step 1: Verify hook auto-installs on start**

```bash
npm start
cat ~/.claude/settings.json
```

Expected: `settings.json` contains a Notification hook with `/cat-gatekeeper` in the command.

- [ ] **Step 2: Verify hook is removed on quit**

Quit the app (Cmd+Q or close all windows). Then:

```bash
cat ~/.claude/settings.json
```

Expected: The cat-gatekeeper hook entry is gone. Other existing hooks (if any) remain intact.

- [ ] **Step 3: Verify position persists**

```bash
npm start
```

Drag the cat to a new corner of the screen. Quit. Restart:

```bash
npm start
```

Expected: Cat appears at the position you left it.

- [ ] **Step 4: Verify alert end-to-end**

With the app running, in another terminal:

```bash
curl http://localhost:7777/cat-gatekeeper
```

Expected: Cat jumps, frosted glass bubble appears. Move mouse over cat → bubble disappears.

- [ ] **Step 5: Commit**

```bash
git add -p  # review any untracked changes
git commit -m "feat: verify app lifecycle — hook install/uninstall and position persistence"
```

---

### Task 14: Build DMG

**Files:**
- Verify: `package.json` (build config already added in Task 1)

- [ ] **Step 1: Verify electron-builder config**

Check `package.json` contains:

```json
"build": {
  "appId": "com.catgatekeeper.app",
  "productName": "Cat Gatekeeper",
  "directories": { "output": "dist" },
  "mac": {
    "target": "dmg",
    "category": "public.app-category.utilities"
  },
  "files": ["src/**/*", "assets/**/*"]
}
```

- [ ] **Step 2: Build the DMG**

```bash
npm run build
```

Expected: `dist/Cat Gatekeeper-1.0.0.dmg` created. The build takes 1-3 minutes.

- [ ] **Step 3: Install and test the built app**

Double-click `dist/Cat Gatekeeper-1.0.0.dmg` → drag to Applications → open.

If macOS shows "can't be opened because it is from an unidentified developer":
Right-click the app → Open → Open (bypasses Gatekeeper for first launch).

Expected: App runs from Applications folder. All features work (hook installs, cat displays, settings open).

- [ ] **Step 4: Update .gitignore**

```bash
echo "dist/" >> .gitignore
```

- [ ] **Step 5: Final commit**

```bash
git add .gitignore
git commit -m "chore: add dist/ to gitignore"
git tag v1.0.0
```

---

## Self-Review Notes

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Transparent always-on-top cat window | Task 6 |
| Mouse-through transparent areas | Task 7 |
| Drag to reposition | Task 7 |
| Claude Code notification hook | Tasks 3, 4 |
| Auto-install hook on start | Task 6 (index.js) |
| Auto-uninstall hook on quit | Task 6 (index.js) |
| Alert: jump + frosted glass bubble | Tasks 8, 9 |
| Bubble stays until hover | Task 9 |
| Sound on alert (if uploaded) | Task 8 |
| Break reminder timer | Task 11 |
| Personalized bubble text | Tasks 8, 9 |
| Right-click → settings | Tasks 7, 12 |
| Upload main animation (required) | Task 12 |
| Upload optional assets | Task 12 |
| Interaction buttons on hover | Tasks 7, 8 |
| Particle effects fallback | Task 10 |
| Dedicated interaction animations | Task 8 |
| Random animation playback | Task 8 |
| Cat name + user name settings | Task 12 |
| Hook status in settings | Task 12 |
| macOS DMG packaging | Task 14 |

All spec requirements are covered.
