const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('riftDesktop', Object.freeze({
  openExternal(rawUrl) {
    if (typeof rawUrl !== 'string' || !navigator.userActivation?.isActive) return Promise.resolve(false);
    return ipcRenderer.invoke('rift:open-external', rawUrl);
  },
}));
