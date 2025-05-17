// Verifica login
if (!localStorage.getItem('usuarioLogado')) {
  window.location.href = '../login/login.html';
}

// Armazena os itens temporariamente
let itensVenda = [];

document.addEventListener('DOMContentLoaded', async () => {
  const selectCliente = document.getElementById('cliente');
  const selectProduto = document.getElementById('produto');
  const listaItens = document.getElementById('itens');
  const mensagem = document.getElementById('mensagem');
  const btnAdicionar = document.getElementById('adicionar');
  const btnFinalizar = document.getElementById('finalizar');

  // Popula clientes
  try {
    const clientes = await window.electronAPI.getClientes();
    clientes.forEach(cliente => {
      const opt = document.createElement('option');
      opt.value = cliente.id;
      opt.textContent = cliente.nome;
      selectCliente.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar clientes:', err);
  }

  // Popula produtos
  let produtosDisponiveis = [];
  try {
    produtosDisponiveis = await window.electronAPI.getProdutos();

    produtosDisponiveis.forEach(produto => {
      const opt = document.createElement('option');
      opt.value = produto.id;
      opt.textContent = `${produto.nome} - R$ ${Number(produto.preco).toFixed(2).replace('.', ',')}`;
      selectProduto.appendChild(opt);
    });


  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
  }

  // Adiciona item
  btnAdicionar.addEventListener('click', () => {
    const produtoId = selectProduto.value;
    const quantidade = parseInt(document.getElementById('quantidade').value);

    if (!produtoId || quantidade < 1) {
      mensagem.textContent = 'Selecione um produto e uma quantidade válida.';
      mensagem.style.color = 'red';
      return;
    }

    const produto = produtosDisponiveis.find(p => p.id == produtoId);

    if (!produto) {
      mensagem.textContent = 'Produto inválido ou não carregado.';
      mensagem.style.color = 'red';
      return;
    }

    const precoUnitario = parseFloat(produto.preco);

    const item = {
      produto_id: parseInt(produtoId),
      nome: produto.nome,
      quantidade,
      preco_unitario: precoUnitario
    };

    itensVenda.push(item);
    atualizarLista();
    mensagem.textContent = '';
  });


  // Finalizar venda
  btnFinalizar.addEventListener('click', async () => {
    const clienteId = selectCliente.value;
    if (!clienteId || itensVenda.length === 0) {
      mensagem.textContent = 'Selecione o cliente e adicione pelo menos um item.';
      mensagem.style.color = 'red';
      return;
    }

    const total = itensVenda.reduce((sum, item) => sum + item.quantidade * item.preco_unitario, 0);

    const dadosVenda = {
      cliente_id: parseInt(clienteId),
      total,
      itens: itensVenda
    };

    try {
      const resultado = await window.electronAPI.registrarVenda(dadosVenda);
      if (resultado.success) {
        mensagem.textContent = 'Venda registrada com sucesso!';
        mensagem.style.color = 'green';
        itensVenda = [];
        atualizarLista();
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

    // Atualiza o total
    const totalVenda = document.getElementById('totalVenda');
    totalVenda.textContent = itensVenda.length > 0 
      ? `Total da Venda: R$ ${total.toFixed(2).replace('.', ',')}` 
      : '';

    // Eventos de remoção com confirmação
    document.querySelectorAll('.btn-remover').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = e.currentTarget.dataset.index;
        const confirmar = confirm('Deseja realmente remover este item da venda?');
        if (confirmar) {
          itensVenda.splice(index, 1);
          atualizarLista();
        }
      });
    });
  }
});

// Navegação
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}
