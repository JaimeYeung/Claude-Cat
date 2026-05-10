const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

class AssetManager {
  constructor(userDataPath) {
    this._dir = path.join(userDataPath, 'assets');
    fs.mkdirSync(this._dir, { recursive: true });
  }

  async save(key, sourcePath) {
    const ext = path.extname(sourcePath).toLowerCase();
    this._removeByKey(key);

    if (ext === '.mov') {
      const dest = path.join(this._dir, `${key}.webm`);
      await this._ffmpegConvert(sourcePath, dest);
      return dest;
    }

    const dest = path.join(this._dir, `${key}${ext}`);
    fs.copyFileSync(sourcePath, dest);
    return dest;
  }

  _ffmpegConvert(input, output) {
    return new Promise((resolve, reject) => {
      const args = [
        '-y', '-i', input,
        '-an',
        '-c:v', 'libvpx-vp9',
        '-pix_fmt', 'yuva420p',
        '-b:v', '0',
        '-crf', '30',
        '-deadline', 'good',
        '-row-mt', '1',
        '-auto-alt-ref', '0',
        output,
      ];
      execFile(ffmpegPath, args, (err) => {
        if (err) reject(err);
        else resolve(output);
      });
    });
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
