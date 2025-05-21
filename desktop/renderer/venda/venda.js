let itensVenda = [];
let clienteSelecionadoId = null;
let produtoSelecionadoId = null;
let precoSelecionado = null;

let sugestoesClienteDiv;
let sugestoesProdutoDiv;

document.addEventListener('DOMContentLoaded', () => {
  const inputCliente = document.getElementById('cliente');
  const inputProduto = document.getElementById('produto');
  const quantidadeInput = document.getElementById('quantidade');
  const mensagem = document.getElementById('mensagem');
  const btnAdicionar = document.getElementById('adicionar');
  const btnFinalizar = document.getElementById('finalizar');
  const vencimentoInput = document.getElementById('vencimento');

  if (!inputCliente || !inputProduto || !quantidadeInput || !mensagem || !btnAdicionar || !btnFinalizar || !vencimentoInput) {
    console.error('Erro ao carregar elementos do DOM.');
    return;
  }

  sugestoesClienteDiv = criarOuObterSugestoesDiv(inputCliente);
  sugestoesProdutoDiv = criarOuObterSugestoesDiv(inputProduto);

  resetarCamposVenda();

  // Autocompletar clientes
  inputCliente.addEventListener('input', async () => {
    const termo = inputCliente.value.trim();
    clienteSelecionadoId = null;
    limparSugestoes(sugestoesClienteDiv);
    if (termo.length < 2) return;

    try {
      const clientes = await window.electronAPI.buscarClientesPorNome(termo);
      if (clientes.length === 0) return;

      clientes.forEach(cliente => {
        const div = document.createElement('div');
        div.textContent = `${cliente.nome} (${cliente.observacao || 'Sem observação'})`;
        div.classList.add('sugestao');
        div.onclick = () => {
          inputCliente.value = cliente.nome;
          clienteSelecionadoId = cliente.id;
          limparSugestoes(sugestoesClienteDiv);
        };
        sugestoesClienteDiv.appendChild(div);
      });
      posicionarSugestoes(inputCliente, sugestoesClienteDiv);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      exibirMensagem('Erro ao buscar clientes.', 'red');
    }
  });

  // Autocompletar produtos
  inputProduto.addEventListener('input', async () => {
    const termo = inputProduto.value.trim();
    produtoSelecionadoId = null;
    precoSelecionado = null;
    limparSugestoes(sugestoesProdutoDiv);
    if (termo.length < 2) return;

    try {
      const produtos = await window.electronAPI.buscarProdutosPorNome(termo);
      if (produtos.length === 0) return;

      produtos.forEach(prod => {
        const div = document.createElement('div');
        div.textContent = `${prod.nome} - R$ ${parseFloat(prod.preco).toFixed(2).replace('.', ',')}`;
        div.classList.add('sugestao');
        div.onclick = () => {
          inputProduto.value = prod.nome;
          produtoSelecionadoId = prod.id;
          precoSelecionado = parseFloat(prod.preco);
          limparSugestoes(sugestoesProdutoDiv);
        };
        sugestoesProdutoDiv.appendChild(div);
      });
      posicionarSugestoes(inputProduto, sugestoesProdutoDiv);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      exibirMensagem('Erro ao buscar produtos.', 'red');
    }
  });

  // Adicionar item à venda
  btnAdicionar.addEventListener('click', () => {
    const quantidade = parseInt(quantidadeInput.value);
    const vencimento = vencimentoInput.value;
    if (!produtoSelecionadoId || isNaN(quantidade) || quantidade < 1) {
      exibirMensagem('Preencha produto válido e quantidade.', 'red');
      return;
    }

    if (itensVenda.length === 0) {
      inputCliente.setAttribute('disabled', 'true');
      limparSugestoes(sugestoesClienteDiv);
    }

    const item = {
      produto_id: produtoSelecionadoId,
      nome: inputProduto.value,
      quantidade,
      preco_unitario: precoSelecionado,
      vencimento
    };

    itensVenda.push(item);
    atualizarLista();
    exibirMensagem('');
    inputProduto.value = '';
    quantidadeInput.value = '1';
    produtoSelecionadoId = null;
    precoSelecionado = null;
    limparSugestoes(sugestoesProdutoDiv);
  });

  // Finalizar venda
  btnFinalizar.addEventListener('click', async () => {
    if (!clienteSelecionadoId || itensVenda.length === 0) {
      exibirMensagem('Selecione cliente e adicione pelo menos um item.', 'red');
      return;
    }

    const total = itensVenda.reduce((sum, item) => sum + item.quantidade * item.preco_unitario, 0);
    const hoje = new Date();
    const data = hoje.toISOString().split('T')[0];
    const vencimento = vencimentoInput.value;

    const dadosVenda = {
      cliente_id: clienteSelecionadoId,
      total,
      data,
      vencimento,
      itens: itensVenda
    };

    try {
      const resultado = await window.electronAPI.registrarVenda(dadosVenda);
      if (resultado.success) {
        exibirMensagem('Venda registrada com sucesso!', 'green');
        resetarCamposVenda();
      } else {
        exibirMensagem(resultado.message || 'Erro ao registrar venda.', 'red');
      }
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      exibirMensagem('Erro interno ao registrar venda.', 'red');
    }
  });
});

// Máscara de data no campo vencimento
const vencimentoInput = document.getElementById('vencimento');
vencimentoInput.addEventListener('input', () => {
  let valor = vencimentoInput.value.replace(/\D/g, '');
  if (valor.length > 2 && valor.length <= 4) {
    valor = valor.replace(/(\d{2})(\d{1,2})/, '$1/$2');
  } else if (valor.length > 4) {
    valor = valor.replace(/(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3');
  }
  vencimentoInput.value = valor;
});

// Atualiza tabela de itens e trata reativação de campos
function atualizarLista() {
  const tabela = document.getElementById('itens');
  const totalVenda = document.getElementById('totalVenda');
  const inputCliente = document.getElementById('cliente');
  tabela.innerHTML = '';
  let total = 0;

  itensVenda.forEach((item, index) => {
    const subtotal = item.quantidade * item.preco_unitario;
    total += subtotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${item.preco_unitario.toFixed(2).replace('.', ',')}</td>
      <td>R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
      <td>${item.vencimento}</td>
      <td>
        <button class="btn-remover" title="Remover item" data-index="${index}">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    tabela.appendChild(tr);
  });

  totalVenda.textContent = itensVenda.length > 0
    ? `Total da Venda: R$ ${total.toFixed(2).replace('.', ',')}`
    : '';

  const vencimento = document.getElementById('vencimento').value;
  const vencimentoDisplay = document.getElementById('vencimentoDisplay');

  if (itensVenda.length > 0 && vencimentoDisplay) {
    vencimentoDisplay.textContent = `Vencimento: ${vencimento || 'Não informado'}`;
  } else if (vencimentoDisplay) {
    vencimentoDisplay.textContent = '';
  }

  document.querySelectorAll('.btn-remover').forEach(btn => {
    btn.onclick = (e) => {
      const index = e.currentTarget.dataset.index;
      if (confirm('Deseja remover este item?')) {
        itensVenda.splice(index, 1);
        atualizarLista();
      }
    };
  });

  if (itensVenda.length === 0) {
    inputCliente.removeAttribute('disabled');
    forceRedraw(inputCliente);
    inputCliente.focus();
    clienteSelecionadoId = null;
  }
}

// Força re-renderização visual do campo (corrige bug de foco visual no Electron)
function forceRedraw(element) {
  element.style.visibility = 'hidden';
  element.offsetHeight;
  element.style.visibility = 'visible';
}

// Exibe mensagem colorida
function exibirMensagem(texto, cor) {
  const mensagem = document.getElementById('mensagem');
  if (mensagem) {
    mensagem.textContent = texto;
    mensagem.style.color = cor;
  }
}

// Utilitários de sugestão/autocomplete
function criarOuObterSugestoesDiv(inputElement) {
  let box = document.getElementById(`sugestoes-${inputElement.id}`);
  if (!box) {
    box = document.createElement('div');
    box.id = `sugestoes-${inputElement.id}`;
    document.body.appendChild(box);
  }
  box.classList.add('sugestoes-box');
  box.style.position = 'absolute';
  box.style.display = 'none';
  box.style.zIndex = '1000';
  return box;
}

function limparSugestoes(box) {
  box.innerHTML = '';
  box.style.display = 'none';
}

function posicionarSugestoes(input, box) {
  const rect = input.getBoundingClientRect();
  box.style.left = `${rect.left + window.scrollX}px`;
  box.style.top = `${rect.bottom + window.scrollY}px`;
  box.style.width = `${rect.width}px`;
  box.style.display = 'block';
}

// Reseta todos os campos da venda
function resetarCamposVenda() {
  const inputCliente = document.getElementById('cliente');
  const inputProduto = document.getElementById('produto');
  const quantidadeInput = document.getElementById('quantidade');
  const vencimentoInput = document.getElementById('vencimento');
  const totalVendaDisplay = document.getElementById('totalVenda');
  const mensagemDisplay = document.getElementById('mensagem');
  const vencimentoDisplay = document.getElementById('vencimentoDisplay');

  inputCliente.removeAttribute('disabled');
  forceRedraw(inputCliente);
  inputCliente.value = '';
  clienteSelecionadoId = null;

  inputProduto.value = '';
  quantidadeInput.value = '1';
  produtoSelecionadoId = null;
  precoSelecionado = null;
  vencimentoInput.value = '';

  itensVenda = [];
  atualizarLista();

  if (totalVendaDisplay) totalVendaDisplay.textContent = '';
  if (mensagemDisplay) mensagemDisplay.textContent = '';
  if (vencimentoDisplay) vencimentoDisplay.textContent = '';

  if (sugestoesClienteDiv) limparSugestoes(sugestoesClienteDiv);
  if (sugestoesProdutoDiv) limparSugestoes(sugestoesProdutoDiv);
}

// Navegação (se precisar no futuro)
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}
