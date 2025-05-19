// Verifica login
if (!localStorage.getItem('usuarioLogado')) {
  window.location.href = '../login/login.html';
}

let itensVenda = [];
document.getElementById('cliente').removeAttribute('disabled');
let clienteSelecionadoId = null;
let produtoSelecionadoId = null;
let precoSelecionado = null;

document.addEventListener('DOMContentLoaded', async () => {
  const inputCliente = document.getElementById('cliente');
  const inputProduto = document.getElementById('produto');
  const quantidadeInput = document.getElementById('quantidade');
  const listaItens = document.getElementById('itens');
  const mensagem = document.getElementById('mensagem');
  const btnAdicionar = document.getElementById('adicionar');
  const btnFinalizar = document.getElementById('finalizar');
  document.getElementById('cliente').removeAttribute('disabled');
  document.getElementById('cliente').value = '';
  clienteSelecionadoId = null;


  // Autocompletar clientes
  const sugestoesCliente = criarSugestoes(inputCliente);
  inputCliente.addEventListener('input', async () => {
    const termo = inputCliente.value.trim();
    clienteSelecionadoId = null;
    limparSugestoes(sugestoesCliente);

    if (termo.length < 2) return;
    const clientes = await window.electronAPI.buscarClientesPorNome(termo);

    clientes.forEach(cliente => {
      const div = document.createElement('div');
      div.textContent = cliente.nome;
      div.classList.add('sugestao');
      div.onclick = () => {
        inputCliente.value = cliente.nome;
        clienteSelecionadoId = cliente.id;
        limparSugestoes(sugestoesCliente);
      };
      sugestoesCliente.appendChild(div);
    });
    posicionarSugestoes(inputCliente, sugestoesCliente);
  });

  // Autocompletar produtos
  const sugestoesProduto = criarSugestoes(inputProduto);
  inputProduto.addEventListener('input', async () => {
    const termo = inputProduto.value.trim();
    produtoSelecionadoId = null;
    precoSelecionado = null;
    limparSugestoes(sugestoesProduto);

    if (termo.length < 2) return;
    const produtos = await window.electronAPI.buscarProdutosPorNome(termo);

    produtos.forEach(prod => {
      const div = document.createElement('div');
      div.textContent = `${prod.nome} - R$ ${parseFloat(prod.preco).toFixed(2).replace('.', ',')}`;
      div.classList.add('sugestao');
      div.onclick = () => {
        inputProduto.value = prod.nome;
        produtoSelecionadoId = prod.id;
        precoSelecionado = parseFloat(prod.preco);
        limparSugestoes(sugestoesProduto);
      };
      sugestoesProduto.appendChild(div);
    });
    posicionarSugestoes(inputProduto, sugestoesProduto);
  });

  // Adicionar item à venda
  btnAdicionar.addEventListener('click', () => {
    const quantidade = parseInt(quantidadeInput.value);

    if (!produtoSelecionadoId || isNaN(quantidade) || quantidade < 1) {
      mensagem.textContent = 'Preencha produto válido e quantidade.';
      mensagem.style.color = 'red';
      return;
    }

    // Bloqueia o campo cliente após o primeiro item ser adicionado
    if (itensVenda.length === 0) {
      const clienteInput = document.getElementById('cliente');
      clienteInput.setAttribute('disabled', 'true');
    }

    const item = {
      produto_id: produtoSelecionadoId,
      nome: inputProduto.value,
      quantidade,
      preco_unitario: precoSelecionado
    };

    itensVenda.push(item);
    atualizarLista();
    mensagem.textContent = '';
    inputProduto.value = '';
    quantidadeInput.value = '1';
    produtoSelecionadoId = null;
    precoSelecionado = null;
  });


  // Finalizar venda
  btnFinalizar.addEventListener('click', async () => {
    if (!clienteSelecionadoId || itensVenda.length === 0) {
      mensagem.textContent = 'Selecione cliente e adicione pelo menos um item.';
      mensagem.style.color = 'red';
      return;
    }

    const total = itensVenda.reduce((sum, item) => sum + item.quantidade * item.preco_unitario, 0);
    const agora = new Date();
    const dataHora = agora.toLocaleString('pt-BR');
    const vencimento = document.getElementById('vencimento').value;

    const dadosVenda = {
      cliente_id: clienteSelecionadoId,
      total,
      data: dataHora,
      vencimento,
      itens: itensVenda
    };

    try {
      const resultado = await window.electronAPI.registrarVenda(dadosVenda);
      if (resultado.success) {
        mensagem.textContent = 'Venda registrada com sucesso!';
        mensagem.style.color = 'green';
        itensVenda = [];
        atualizarLista();

        // 🔁 Resetar campos para nova venda
        document.getElementById('cliente').removeAttribute('disabled');
        document.getElementById('cliente').value = '';
        clienteSelecionadoId = null;

        document.getElementById('produto').value = '';
        document.getElementById('quantidade').value = '1';
        produtoSelecionadoId = null;
        precoSelecionado = null;
      } else {
        mensagem.textContent = 'Erro ao registrar venda.';
        mensagem.style.color = 'red';
      }
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      mensagem.textContent = 'Erro interno.';
      mensagem.style.color = 'red';
    }
  });

  function atualizarLista() {
    const tabela = document.getElementById('itens');
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
        <td>
          <button class="btn-remover" title="Remover item" data-index="${index}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      `;
      tabela.appendChild(tr);
    });

    const totalVenda = document.getElementById('totalVenda');
    totalVenda.textContent = itensVenda.length > 0
      ? `Total da Venda: R$ ${total.toFixed(2).replace('.', ',')}`
      : '';

    document.querySelectorAll('.btn-remover').forEach(btn => {
      btn.onclick = (e) => {
        const index = e.currentTarget.dataset.index;
        if (confirm('Deseja remover este item?')) {
          itensVenda.splice(index, 1);
          atualizarLista();
        }
      };
    });
  }
});

// Utilitários de autocompletar
function criarSugestoes(input) {
  const box = document.createElement('div');
  box.className = 'sugestoes-box';
  box.style.position = 'absolute';
  box.style.background = '#fff';
  box.style.border = '1px solid #ccc';
  box.style.display = 'none';
  box.style.zIndex = '999';
  document.body.appendChild(box);
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

function resetarCamposVenda() {
  document.getElementById('cliente').removeAttribute('disabled');
  document.getElementById('cliente').value = '';
  clienteSelecionadoId = null;

  document.getElementById('produto').value = '';
  document.getElementById('quantidade').value = '1';
  produtoSelecionadoId = null;
  precoSelecionado = null;
  
  itensVenda = [];
  atualizarLista();
}


// Navegação
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}
