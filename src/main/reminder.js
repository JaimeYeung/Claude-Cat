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
