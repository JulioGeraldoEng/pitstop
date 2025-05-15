const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: (credenciais) => ipcRenderer.invoke('login', credenciais)
});
