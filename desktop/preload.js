const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendLogin: (credentials) => ipcRenderer.invoke('login-attempt', credentials),

  getClientes: () => ipcRenderer.invoke('get-clientes'),
  getProdutos: () => ipcRenderer.invoke('get-produtos'),
  registrarVenda: (dados) => ipcRenderer.invoke('registrar-venda', dados),
  salvarCliente: (cliente) => ipcRenderer.invoke('salvar-cliente', cliente),
  salvarProduto: (produto) => ipcRenderer.invoke('salvar-produto', produto),
  buscarProdutosPorNome: (nome) => ipcRenderer.invoke('buscar-produtos-por-nome', nome),
  buscarClientesPorNome: (nome) => ipcRenderer.invoke('buscar-clientes-por-nome', nome),
  buscarRelatorio: (filtros) => ipcRenderer.invoke('buscar-relatorio', filtros),

  // Adicione esta linha para debug
  fixInputs: () => {
    document.querySelectorAll('input').forEach(input => {
      input.disabled = false;
      input.readOnly = false;
    });
  }
});