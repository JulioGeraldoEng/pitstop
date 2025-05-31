// alterar-senha.js
document.getElementById('formAlterarSenha').addEventListener('submit', async (e) => {
  e.preventDefault();

  const usuario = document.getElementById('usuario').value.trim();
  const senhaAtual = document.getElementById('senhaAtual').value.trim();
  const novaSenha = document.getElementById('novaSenha').value.trim();
  const confirmar = document.getElementById('confirmarNovaSenha').value.trim();
  const mensagem = document.getElementById('mensagem');

  if (!usuario || !senhaAtual || !novaSenha || !confirmar) {
    mensagem.textContent = 'Preencha todos os campos.';
    return;
  }

  if (novaSenha.length < 4) {
    mensagem.textContent = 'A nova senha deve ter pelo menos 4 caracteres';
    return;
  }

  if (novaSenha !== confirmar) {
    mensagem.textContent = 'As novas senhas não coincidem';
    return;
  }

  try {
    const resultado = await window.electronAPI.alterarSenha({ usuario, senhaAtual, novaSenha });
    mensagem.textContent = resultado.message;
    mensagem.style.color = resultado.success ? 'green' : 'red';
    if (resultado.success) document.getElementById('formAlterarSenha').reset();
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    mensagem.textContent = 'Erro ao processar solicitação';
  }
});
