// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// ---- Lógica movida para cá (antes ficava no renderer.js) ----
// Listener direto para mudar a cor do body.
// Esta lógica será executada automaticamente em qualquer janela que usar este preload.js
ipcRenderer.on('change-body-color', (_event, colorValue) => {
  // Garante que o DOM esteja pronto antes de manipular document.body
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) { // Verifica se body existe
        document.body.style.backgroundColor = colorValue;
      } else {
        console.error('preload.js: document.body não encontrado após DOMContentLoaded para change-body-color.');
      }
    });
  } else {
    // O DOM já está carregado
    if (document.body) { // Verifica se body existe
      document.body.style.backgroundColor = colorValue;
    } else {
      console.error('preload.js: document.body não encontrado (DOM já carregado) para change-body-color.');
    }
  }
});

// Listener direto para exibir mensagens de erro.
// Esta lógica também será executada automaticamente.
ipcRenderer.on('show-error-message', (_event, message) => {
  // alert() está disponível globalmente no contexto do renderer
  alert(message);
});
// ---- Fim da lógica movida ----

// Suas APIs existentes expostas para o processo de renderização
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
  exportarParaPDF: (htmlContent) => ipcRenderer.invoke('exportarParaPDF', htmlContent),

  // Recebimentos
  buscarRecebimentos: (filtros) => ipcRenderer.invoke('buscarRecebimentos', filtros),
  atualizarStatusRecebimento: (data) => ipcRenderer.invoke('atualizarStatusRecebimento', data),

  // Configurações
  lerArquivoBase64: (caminhoRelativo) => ipcRenderer.invoke('ler-arquivo-base64', caminhoRelativo),
  sincronizarStatusAtrasadosBanco: () => ipcRenderer.invoke('sincronizar-status-atrasados-banco')

  // As funções onChangeBodyColor e onShowError foram removidas daqui
  // porque a lógica delas agora é tratada diretamente pelos listeners ipcRenderer.on acima.
  // Não há mais necessidade de chamá-las a partir do renderer.js para este comportamento.
});