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

  const telefoneLimpo = telefone.replace(/\D/g, ''); // remove tudo que não for número

  if (!nome) {
    mensagem.textContent = 'O nome é obrigatório.';
    mensagem.style.color = 'red';
    return;
  }

  if (telefoneLimpo.length < 10) {
    mensagem.textContent = 'Telefone inválido. Use com DDD (ex: 14999998888).';
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

document.addEventListener('DOMContentLoaded', () => {
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
});

// Funções auxiliares
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}