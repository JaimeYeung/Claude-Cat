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
