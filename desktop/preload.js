// preload.js
const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electronAPI', {
  sendLogin: (credentials) => ipcRenderer.invoke('login-attempt', credentials),
  
  // Clientes
  getClientes: () => ipcRenderer.invoke('get-clientes'),
  salvarCliente: (cliente) => ipcRenderer.invoke('salvar-cliente', cliente),
  buscarClientesPorNome: (nome) => ipcRenderer.invoke('buscar-clientes-por-nome', nome),
  atualizarCliente: (cliente) => ipcRenderer.invoke('atualizar-cliente', cliente),
  excluirCliente: (id) => ipcRenderer.invoke('excluir-cliente', id),

  // Produtos
  salvarProduto: (produto) => ipcRenderer.invoke('salvar-produto', produto),
  buscarProdutosPorNome: (nome) => ipcRenderer.invoke('buscar-produtos-por-nome', nome),
  buscarTodosProdutos: () => ipcRenderer.invoke('buscar-todos-produtos'),
  atualizarProduto: (produto) => ipcRenderer.invoke('atualizar-produto', produto),
  excluirProduto: (id) => ipcRenderer.invoke('excluir-produto', id),

  // Vendas
  registrarVenda: (dados) => ipcRenderer.invoke('registrar-venda', dados),
  buscarVendas: (filtros) => ipcRenderer.invoke('buscarVendas', filtros),
  exportarParaPDF: (htmlContent) => ipcRenderer.invoke('exportar-para-pdf', htmlContent),


  // Adicione outras APIs aqui se houver
  // Ex: apagarProduto: (id) => ipcRenderer.invoke('apagar-produto', id),
  // Ex: atualizarProduto: (produto) => ipcRenderer.invoke('atualizar-produto', produto),
  
});