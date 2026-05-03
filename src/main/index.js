const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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

  ipcMain.handle('assets:upload', (_, key, filePath) => {
    const result = assets.save(key, filePath);
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('cat:reload');
    }
    return result;
  });
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

  ipcMain.handle('dialog:open-file', (_, filters) => {
    return dialog.showOpenDialog({ properties: ['openFile'], filters })
      .then(result => result.canceled ? null : result.filePaths[0]);
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
    height: 580,
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
