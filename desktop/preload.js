// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendLogin: (credentials) => ipcRenderer.invoke('login-attempt', credentials),
  
  // Clientes
  getClientes: () => ipcRenderer.invoke('get-clientes'),
  salvarCliente: (cliente) => ipcRenderer.invoke('salvar-cliente', cliente),
  buscarClientesPorNome: (nome) => ipcRenderer.invoke('buscar-clientes-por-nome', nome),

  // Produtos
  getProdutos: () => ipcRenderer.invoke('get-produtos'),
  salvarProduto: (produto) => ipcRenderer.invoke('salvar-produto', produto),
  buscarProdutosPorNome: (nome) => ipcRenderer.invoke('buscar-produtos-por-nome', nome),

  // Vendas
  registrarVenda: (dados) => ipcRenderer.invoke('registrar-venda', dados),
  buscarVendas: (filtros) => ipcRenderer.invoke('buscarVendas', filtros),

  // Adicione outras APIs aqui se houver
  // Ex: apagarProduto: (id) => ipcRenderer.invoke('apagar-produto', id),
  // Ex: atualizarProduto: (produto) => ipcRenderer.invoke('atualizar-produto', produto),
  
});