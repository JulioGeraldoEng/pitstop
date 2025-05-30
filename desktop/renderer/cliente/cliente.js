// Redireciona se não estiver logado
if (!localStorage.getItem('usuarioLogado')) {
  window.location.href = '../login/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('clienteForm');
  const inputTelefone = document.getElementById('telefone');
  const inputNome = document.getElementById('nome');
  const mensagem = document.getElementById('mensagem');

  // Formata dinamicamente o número de telefone conforme digitado
  inputTelefone.addEventListener('input', formatarTelefone);

  // Configura autocomplete para o campo de nome
  configurarAutocompleteNome(inputNome);

  // Lida com o envio do formulário de cadastro
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = inputNome.value.trim();
    const telefone = inputTelefone.value.trim().replace(/\D/g, '');
    const observacao = document.getElementById('observacao').value.trim();

    if (!nome) {
      exibirMensagem('O nome é obrigatório.', 'red');
      return;
    }

    if (telefone.length < 10) {
      exibirMensagem('Telefone inválido. Use com DDD (ex: (14) 99999-8888).', 'red');
      return;
    }

    try {
      const resultado = await window.electronAPI.salvarCliente({ nome, telefone, observacao });
      if (resultado.success) {
        exibirMensagem('Cliente cadastrado com sucesso!', 'green');
        form.reset();
      } else {
        exibirMensagem(resultado.message || 'Erro ao salvar cliente.', 'red');
      }
    } catch (error) {
      exibirMensagem('Erro. Telefone já cadastrado.', 'red');
    }
  });

  // Botão para listar clientes cadastrados
  const btnClientes = document.getElementById('btnClientesCadastrados');
  if (btnClientes) {
    btnClientes.addEventListener('click', carregarClientes);
  }

  // Função para exibir mensagens ao usuário
  function exibirMensagem(texto, cor) {
    mensagem.textContent = texto;
    mensagem.style.color = cor;
  }
});

// ===================== FORMATAÇÃO DE TELEFONE =====================
function formatarTelefone(event) {
  const input = event.target;
  let valor = input.value.replace(/\D/g, '');

  if (valor.length > 11) valor = valor.slice(0, 11);

  if (valor.length >= 2 && valor.length <= 6) {
    valor = `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
  } else if (valor.length > 6 && valor.length <= 10) {
    valor = `(${valor.slice(0, 2)}) ${valor.slice(2, 6)}-${valor.slice(6)}`;
  } else if (valor.length === 11) {
    valor = `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;
  }

  input.value = valor;
}

// ===================== AUTOCOMPLETE =====================
function configurarAutocompleteNome(inputNome) {
  const sugestoes = document.createElement('div');
  sugestoes.id = 'sugestoes-clientes';
  Object.assign(sugestoes.style, {
    position: 'absolute',
    background: 'white',
    border: '1px solid #ccc',
    zIndex: '1000',
    display: 'none',
  });
  document.body.appendChild(sugestoes);

  inputNome.addEventListener('input', async () => {
    const termo = inputNome.value.trim();
    sugestoes.innerHTML = '';
    sugestoes.style.display = 'none';

    if (termo.length < 2) return;

    const clientes = await window.electronAPI.buscarClientesPorNome(termo);
    if (clientes.length === 0) return;

    clientes.forEach(cliente => {
      const div = document.createElement('div');
      div.textContent = cliente.nome;
      Object.assign(div.style, { padding: '5px', cursor: 'pointer' });
      div.addEventListener('click', () => {
        inputNome.value = cliente.nome;
        sugestoes.style.display = 'none';
      });
      sugestoes.appendChild(div);
    });

    const rect = inputNome.getBoundingClientRect();
    sugestoes.style.left = `${rect.left + window.scrollX}px`;
    sugestoes.style.top = `${rect.bottom + window.scrollY}px`;
    sugestoes.style.width = `${rect.width}px`;
    sugestoes.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (!sugestoes.contains(e.target) && e.target !== inputNome) {
      sugestoes.style.display = 'none';
    }
  });
}

// ===================== LISTAGEM DE CLIENTES =====================
async function carregarClientes() {
  const container = document.getElementById('clientesContainer');
  container.style.display = 'block';

  const tbody = document.querySelector('#tabelaClientes tbody');
  tbody.innerHTML = '';

  try {
    const clientes = await window.electronAPI.getClientes();

    if (clientes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Nenhum cliente cadastrado.</td></tr>';
      return;
    }

    clientes.forEach(cliente => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${cliente.id}</td>
        <td><input type="text" value="${cliente.nome}" /></td>
        <td><input type="text" value="${formatarTelefoneTexto(cliente.telefone)}" class="telefone-tabela" /></td>
        <td><input type="text" value="${cliente.observacao || ''}" /></td>
        <td>
          <button class="btn-alterar" onclick="atualizarClienteTabela(${cliente.id}, this)"><i class="fas fa-edit"></i></button>
          <button class="btn-remover" onclick="excluirClienteTabela(${cliente.id}, this)"><i class="fas fa-trash-alt"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.telefone-tabela').forEach(input => {
      input.addEventListener('input', formatarTelefone);
    });

  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar clientes.</td></tr>';
  }
}

// ===================== FUNÇÕES DE TABELA =====================
// Formata telefone para exibição
function formatarTelefoneTexto(telefone) {
  const valor = telefone.replace(/\D/g, '');
  if (valor.length === 11) {
    return `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;
  }
  if (valor.length === 10) {
    return `(${valor.slice(0, 2)}) ${valor.slice(2, 6)}-${valor.slice(6)}`;
  }
  return telefone;
}

// Atualiza cliente
function atualizarClienteTabela(id, btn) {
  const row = btn.closest('tr');
  const nome = row.querySelector('td:nth-child(2) input').value.trim();
  const telefone = row.querySelector('td:nth-child(3) input').value.trim().replace(/\D/g, '');
  const observacao = row.querySelector('td:nth-child(4) input').value.trim();
  const mensagem = document.getElementById('mensagem');

  window.electronAPI.atualizarCliente({ id, nome, telefone, observacao })
    .then(resultado => {
      if (resultado.success) {
        mensagem.textContent = 'Cliente atualizado com sucesso!';
        mensagem.style.color = 'green';
        setTimeout(() => location.reload(), 2000);
      } else {
        mensagem.textContent = resultado.message || 'Erro ao atualizar cliente.';
        mensagem.style.color = 'orange';
      }
    })
    .catch(error => {
      console.error('Erro ao atualizar cliente:', error);
      mensagem.textContent = 'Erro interno ao atualizar.';
      mensagem.style.color = 'red';
    });
}

// Exclui cliente
function excluirClienteTabela(id) {
  const mensagem = document.getElementById('mensagem');

  window.electronAPI.excluirCliente(id)
    .then(resultado => {
      if (resultado.success) {
        mensagem.textContent = 'Cliente excluído com sucesso.';
        mensagem.style.color = 'red';
        setTimeout(() => location.reload(), 2000);
      } else {
        mensagem.textContent = resultado.message || 'Erro ao excluir cliente.';
        mensagem.style.color = 'orange';
      }
    })
    .catch(error => {
      console.error('Erro ao excluir cliente:', error);
      mensagem.textContent = 'Erro interno ao excluir.';
      mensagem.style.color = 'red';
    });
}

// ===================== NAVEGAÇÃO =====================
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}
