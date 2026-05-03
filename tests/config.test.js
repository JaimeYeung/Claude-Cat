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
