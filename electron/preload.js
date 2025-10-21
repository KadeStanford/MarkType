const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath) => ipcRenderer.invoke('native:readFile', filePath),
  saveFile: (filePath, contents) => ipcRenderer.invoke('native:saveFile', filePath, contents),
});
