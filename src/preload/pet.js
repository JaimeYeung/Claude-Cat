const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('catAPI', {
  onAlert: (cb) => ipcRenderer.on('cat:alert', cb),
  onReminder: (cb) => ipcRenderer.on('cat:reminder', cb),
  onReload: (cb) => ipcRenderer.on('cat:reload', cb),
  setIgnoreMouseEvents: (ignore) =>
    ipcRenderer.send('set-ignore-mouse', ignore),
  getConfig: () => ipcRenderer.invoke('config:get-all'),
  getAssetPath: (key) => ipcRenderer.invoke('assets:get', key),
  setWindowPosition: (x, y) => ipcRenderer.send('window:set-position', x, y),
  getWindowPosition: () => ipcRenderer.invoke('window:get-position'),
  savePosition: (x, y) => {
    ipcRenderer.send('config:set', 'petX', x);
    ipcRenderer.send('config:set', 'petY', y);
  },
  openSettings: () => ipcRenderer.send('open-settings'),
});
