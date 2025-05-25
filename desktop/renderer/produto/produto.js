// Verifica se está logado
if (!localStorage.getItem('usuarioLogado')) {
  window.location.href = '../login/login.html';
}

// Submissão do formulário de cadastro
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

// Autocomplete do campo nome
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

  // Evento para exibir produtos na tabela
  document.getElementById('btnProdutosCadastrados').addEventListener('click', carregarProdutosNaTabela);
});

// Carrega produtos na tabela HTML
async function carregarProdutosNaTabela() {
  const container = document.getElementById('produtosContainer');
  const tabelaBody = document.querySelector('#tabelaProdutos tbody');
  tabelaBody.innerHTML = ''; // Limpa a tabela

  try {
    const produtos = await window.electronAPI.buscarTodosProdutos();

    if (produtos.length === 0) {
      tabelaBody.innerHTML = '<tr><td colspan="5">Nenhum produto cadastrado.</td></tr>';
    } else {
      produtos.forEach(prod => {
        const row = document.createElement('tr');
        row.dataset.id = prod.id;

        row.innerHTML = `
          <td>${prod.id}</td>
          <td><input type="text" value="${prod.nome}" /></td>
          <td><input type="number" value="${prod.preco}" step="0.01" /></td>
          <td><input type="number" value="${prod.quantidade}" /></td>
          <td>
            <button class="btn-alterar" onclick="atualizarProdutoTabela(${prod.id}, this)"><i class="fas fa-edit"></i></button>
            <button class="btn-remover" onclick="excluirProdutoTabela(${prod.id}, this)"><i class="fas fa-trash-alt"></i></button>
          </td>
        `;

        tabelaBody.appendChild(row);
      });
    }

    container.style.display = 'block';

  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    tabelaBody.innerHTML = '<tr><td colspan="5">Erro ao listar produtos.</td></tr>';
  }
}

// Ações da Tabela
// Atualiza produto na tabela
function atualizarProdutoTabela(id, btn) {
  const row = btn.closest('tr');
  const nome = row.querySelector('td:nth-child(2) input').value.trim();
  const preco = parseFloat(row.querySelector('td:nth-child(3) input').value);
  const quantidade = parseInt(row.querySelector('td:nth-child(4) input').value);

  window.electronAPI.atualizarProduto({ id, nome, preco, quantidade })
    .then((resultado) => {
      if (resultado.success) {
        mensagem.textContent = 'Produto atualizado com sucesso!';
        mensagem.style.color = 'green';
        setTimeout(() => {
          location.reload();
        }, 2000);
      } else {
        mensagem.textContent = resultado.message || 'Erro ao atualizar produto.';
        mensagem.style.color = 'orange';
      }
    })
    .catch((erro) => {
      console.error('Erro ao atualizar produto:', erro);
      mensagem.textContent = 'Erro interno ao atualizar.';
      mensagem.style.color = 'red';
    });
}

// Exclui produto da tabela
function excluirProdutoTabela(id) {  
  window.electronAPI.excluirProduto(id)
    .then((resultado) => {
      if (resultado.success) {
        mensagem.textContent = 'Produto excluído com sucesso.';
        mensagem.style.color = 'red';
        setTimeout(() => {
          location.reload();
        }, 2000);
      } else {
        mensagem.textContent = resultado.message || 'Erro ao excluir produto.';
        mensagem.style.color = 'orange';
      }
    })
    .catch((erro) => {
      console.error('Erro ao excluir produto:', erro);
      mensagem.textContent = 'Erro interno ao excluir.';
      mensagem.style.color = 'red';
    });
}

// Função para navegar entre páginas
function irPara(pagina) {
  window.location.href = pagina;
}

// Logout
function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}