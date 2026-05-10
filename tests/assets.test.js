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

test('save copies file and returns destination path', async () => {
  const dest = await assets.save('main', srcFile);
  expect(fs.existsSync(dest)).toBe(true);
  expect(fs.readFileSync(dest, 'utf8')).toBe('fake gif data');
  expect(path.extname(dest)).toBe('.gif');
});

test('getPath returns path for saved asset', async () => {
  await assets.save('main', srcFile);
  const p = assets.getPath('main');
  expect(p).not.toBeNull();
  expect(fs.existsSync(p)).toBe(true);
});

test('getPath returns null for unknown key', () => {
  expect(assets.getPath('nonexistent')).toBeNull();
});

test('delete removes file and returns true', async () => {
  await assets.save('main', srcFile);
  const result = assets.delete('main');
  expect(result).toBe(true);
  expect(assets.getPath('main')).toBeNull();
});

test('delete returns false when asset does not exist', () => {
  expect(assets.delete('nonexistent')).toBe(false);
});

test('save overwrites existing asset with same key', async () => {
  await assets.save('main', srcFile);
  const newSrc = path.join(tmpDir, 'newcat.png');
  fs.writeFileSync(newSrc, 'png data');
  await assets.save('main', newSrc);
  const p = assets.getPath('main');
  expect(path.extname(p)).toBe('.png');
  expect(fs.readFileSync(p, 'utf8')).toBe('png data');
});
