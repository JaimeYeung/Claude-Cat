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
