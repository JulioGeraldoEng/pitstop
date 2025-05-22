// Redireciona se não estiver logado
if (!localStorage.getItem('usuarioLogado')) {
  window.location.href = '../login/login.html';
}

document.getElementById('clienteForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const observacao = document.getElementById('observacao').value.trim();
  const mensagem = document.getElementById('mensagem');

  const telefoneLimpo = telefone.replace(/\D/g, '');

  if (!nome) {
    mensagem.textContent = 'O nome é obrigatório.';
    mensagem.style.color = 'red';
    return;
  }

  if (telefoneLimpo.length < 10) {
    mensagem.textContent = 'Telefone inválido. Use com DDD (ex: (14) 99999-8888).';
    mensagem.style.color = 'red';
    return;
  }

  try {
    const resultado = await window.electronAPI.salvarCliente({
      nome,
      telefone: telefoneLimpo,
      observacao
    });

    if (resultado.success) {
      mensagem.textContent = 'Cliente cadastrado com sucesso!';
      mensagem.style.color = 'green';
      document.getElementById('clienteForm').reset();
    } else {
      mensagem.textContent = resultado.message || 'Erro ao salvar cliente.';
      mensagem.style.color = 'red';
    }
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
    mensagem.textContent = 'Erro interno. Verifique o console.';
    mensagem.style.color = 'red';
  }
});

// ===================== FORMATAÇÃO DINÂMICA DO TELEFONE =====================
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

// Aplica formatação ao input de telefone principal
document.addEventListener('DOMContentLoaded', () => {
  const inputTelefone = document.getElementById('telefone');
  inputTelefone.addEventListener('input', formatarTelefone);

  // Autocomplete por nome
  const inputNome = document.getElementById('nome');
  const sugestoes = document.createElement('div');
  sugestoes.id = 'sugestoes-clientes';
  sugestoes.style.position = 'absolute';
  sugestoes.style.background = 'white';
  sugestoes.style.border = '1px solid #ccc';
  sugestoes.style.zIndex = '1000';
  sugestoes.style.display = 'none';
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
      div.style.padding = '5px';
      div.style.cursor = 'pointer';
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

  // Botão Clientes Cadastrados
  const btnClientes = document.getElementById('btnClientesCadastrados');
  if (btnClientes) {
    btnClientes.addEventListener('click', async () => {
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

        // Aplica formatação nos inputs da tabela
        document.querySelectorAll('.telefone-tabela').forEach(input => {
          input.addEventListener('input', formatarTelefone);
        });

      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar clientes.</td></tr>';
      }
    });
  }
});

// Formata telefone recebido do banco para exibição
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

// Ações da Tabela
window.atualizarClienteTabela = async (id, btn) => {
  const row = btn.closest('tr');
  const nome = row.querySelector('td:nth-child(2) input').value.trim();
  const telefone = row.querySelector('td:nth-child(3) input').value.trim().replace(/\D/g, '');
  const observacao = row.querySelector('td:nth-child(4) input').value.trim();

  if (!nome || telefone.length < 10) {
    alert('Preencha corretamente o nome e o telefone.');
    return;
  }

  try {
    const resultado = await window.electronAPI.atualizarCliente({ id, nome, telefone, observacao });
    if (resultado.success) {
      alert('Cliente atualizado com sucesso!');
    } else {
      alert(resultado.message || 'Erro ao atualizar cliente.');
    }
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    alert('Erro interno ao atualizar.');
  }
};

window.excluirClienteTabela = async (id, btn) => {
  if (!confirm('Deseja realmente excluir este cliente?')) return;

  try {
    const resultado = await window.electronAPI.excluirCliente(id);
    if (resultado.success) {
      btn.closest('tr').remove();
      alert('Cliente excluído com sucesso!');
    } else {
      alert(resultado.message || 'Erro ao excluir cliente.');
    }
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    alert('Erro interno ao excluir.');
  }
};

// Funções auxiliares
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}
