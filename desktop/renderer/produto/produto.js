// Verifica se está logado
if (!localStorage.getItem('usuarioLogado')) {
  window.location.href = '../login/login.html';
}

document.getElementById('produtoForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const preco = parseFloat(document.getElementById('preco').value.replace(',', '.'));
  const quantidade = parseInt(document.getElementById('quantidade').value);
  const mensagem = document.getElementById('mensagem');

  if (!nome || isNaN(preco) || preco <= 0 || isNaN(quantidade) || quantidade < 0) {
    mensagem.textContent = 'Preencha os campos corretamente.';
    mensagem.style.color = 'red';
    return;
  }

  try {
    const result = await window.electronAPI.salvarProduto({ nome, preco, quantidade });

    if (result.success) {
      mensagem.textContent = '✅ Produto cadastrado com sucesso!';
      mensagem.style.color = 'green';
      document.getElementById('produtoForm').reset();
    } else {
      mensagem.textContent = result.message || '❌ Erro ao cadastrar produto.';
      mensagem.style.color = 'red';
    }
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    mensagem.textContent = 'Erro interno.';
    mensagem.style.color = 'red';
  }
});

function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}
