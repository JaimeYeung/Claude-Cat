const fs = require('fs');
const path = require('path');

class AssetManager {
  constructor(userDataPath) {
    this._dir = path.join(userDataPath, 'assets');
    fs.mkdirSync(this._dir, { recursive: true });
  }

  save(key, sourcePath) {
    const ext = path.extname(sourcePath);
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
