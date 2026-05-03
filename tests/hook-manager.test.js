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
