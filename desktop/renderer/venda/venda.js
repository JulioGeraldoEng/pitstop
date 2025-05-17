// 🔒 Verifica se o usuário está logado
const usuarioLogado = localStorage.getItem('usuarioLogado');
if (!usuarioLogado) {
  window.location.href = 'login/login.html';
}

const clienteSelect = document.getElementById('cliente');
const produtoSelect = document.getElementById('produto');
const quantidadeInput = document.getElementById('quantidade');
const itensUl = document.getElementById('itens');
const mensagem = document.getElementById('mensagem');

let itensVenda = [];

// Carrega clientes e produtos
window.api.getClientes().then(clientes => {
  clientes.forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = c.nome;
    clienteSelect.appendChild(option);
  });
});

window.api.getProdutos().then(produtos => {
  produtos.forEach(p => {
    const option = document.createElement('option');
    option.value = JSON.stringify(p);
    option.textContent = `${p.nome} - R$ ${p.preco}`;
    produtoSelect.appendChild(option);
  });
});

// Adiciona item à venda
document.getElementById('adicionar').addEventListener('click', () => {
  const produto = JSON.parse(produtoSelect.value);
  const quantidade = parseInt(quantidadeInput.value);

  if (quantidade < 1) return;

  const item = {
    produto_id: produto.id,
    nome: produto.nome,
    preco: produto.preco,
    quantidade
  };

  itensVenda.push(item);
  atualizarLista();
});

// Finaliza a venda
document.getElementById('finalizar').addEventListener('click', async () => {
  if (itensVenda.length === 0) return;

  const cliente_id = clienteSelect.value;

  const sucesso = await window.api.registrarVenda({
    cliente_id,
    itens: itensVenda
  });

  if (sucesso) {
    mensagem.textContent = '✅ Venda registrada com sucesso!';
    itensVenda = [];
    atualizarLista();
  } else {
    mensagem.textContent = '❌ Erro ao registrar venda.';
  }
});

// Atualiza a lista de itens no HTML
function atualizarLista() {
  itensUl.innerHTML = '';
  itensVenda.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.nome} x${item.quantidade} - R$ ${(item.preco * item.quantidade).toFixed(2)}`;
    itensUl.appendChild(li);
  });
}

// 🔓 Botão de logout
document.getElementById('sair').addEventListener('click', () => {
  localStorage.removeItem('usuarioLogado');
  window.location.href = 'login/login.html';
});

function irPara(pagina) {
    window.location.href = pagina;
}

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = '../login/login.html';
}

if (!localStorage.getItem('usuarioLogado')) {
    window.location.href = '../login/login.html';
}
