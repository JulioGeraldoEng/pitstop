const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendLogin: (credentials) => ipcRenderer.invoke('login-attempt', credentials),

  getClientes: () => ipcRenderer.invoke('get-clientes'),
  getProdutos: () => ipcRenderer.invoke('get-produtos'),
  registrarVenda: (dados) => ipcRenderer.invoke('registrar-venda', dados),
  
  // Adicione esta linha para debug
  fixInputs: () => {
    document.querySelectorAll('input').forEach(input => {
      input.disabled = false;
      input.readOnly = false;
    });
  }
});