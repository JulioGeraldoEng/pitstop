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

// Funções auxiliares
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}