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
      mensagem.textContent = 'Produto cadastrado com sucesso!';
      mensagem.style.color = 'green';
      document.getElementById('produtoForm').reset();
    } else {
      mensagem.textContent = result.message || 'Erro ao cadastrar produto.';
      mensagem.style.color = 'red';
    }
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    mensagem.textContent = 'Erro interno.';
    mensagem.style.color = 'red';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const inputNome = document.getElementById('nome');
  const sugestoesDiv = document.createElement('div');
  sugestoesDiv.id = 'sugestoes';
  sugestoesDiv.style.position = 'absolute';
  sugestoesDiv.style.background = 'white';
  sugestoesDiv.style.border = '1px solid #ccc';
  sugestoesDiv.style.zIndex = '1000';
  sugestoesDiv.style.display = 'none';
  document.body.appendChild(sugestoesDiv);

  inputNome.addEventListener('input', async () => {
    const texto = inputNome.value.trim();
    sugestoesDiv.innerHTML = '';
    sugestoesDiv.style.display = 'none';

    if (texto.length < 2) return;

    const produtos = await window.electronAPI.buscarProdutosPorNome(texto);

    if (produtos.length > 0) {
      produtos.forEach(prod => {
        const item = document.createElement('div');
        item.textContent = prod.nome;
        item.style.padding = '5px';
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          inputNome.value = prod.nome;
          sugestoesDiv.style.display = 'none';
        });
        sugestoesDiv.appendChild(item);
      });

      const rect = inputNome.getBoundingClientRect();
      sugestoesDiv.style.left = `${rect.left + window.scrollX}px`;
      sugestoesDiv.style.top = `${rect.bottom + window.scrollY}px`;
      sugestoesDiv.style.width = `${rect.width}px`;
      sugestoesDiv.style.display = 'block';
    }
  });

  document.addEventListener('click', (e) => {
    if (!sugestoesDiv.contains(e.target) && e.target !== inputNome) {
      sugestoesDiv.style.display = 'none';
    }
  });
});

function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}
