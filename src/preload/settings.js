const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('config:get-all'),
  setConfig: (key, value) => ipcRenderer.send('config:set', key, value),
  uploadAsset: (key, filePath) => ipcRenderer.invoke('assets:upload', key, filePath),
  deleteAsset: (key) => ipcRenderer.invoke('assets:delete', key),
  getAssetPath: (key) => ipcRenderer.invoke('assets:get', key),
  openFileDialog: (filters) => ipcRenderer.invoke('dialog:open-file', filters),
  getHookStatus: () => ipcRenderer.invoke('hook:status'),
  installHook: () => ipcRenderer.invoke('hook:install'),
  uninstallHook: () => ipcRenderer.invoke('hook:uninstall'),
});
