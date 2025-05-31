// esqueci-senha.js
document.getElementById('formEsqueciSenha').addEventListener('submit', async (e) => {
  e.preventDefault();

  const usuario = document.getElementById('usuario').value.trim();
  const chaveMestra = document.getElementById('chaveMestra').value.trim();
  const novaSenha = document.getElementById('novaSenha').value.trim();
  const confirmarSenha = document.getElementById('confirmarSenha').value.trim();
  const mensagem = document.getElementById('mensagem');

  if (!usuario || !chaveMestra || !novaSenha || !confirmarSenha) {
    mensagem.textContent = 'Preencha todos os campos.';
    return;
  }

  if (novaSenha.length < 4) {
    mensagem.textContent = 'A nova senha deve ter pelo menos 4 caracteres';
    return;
  }

  if (novaSenha !== confirmarSenha) {
    mensagem.textContent = 'As senhas não coincidem';
    return;
  }

  try {
    const resultado = await window.electronAPI.redefinirSenha({ usuario, chaveMestra, novaSenha });
    mensagem.textContent = resultado.message || 'Erro desconhecido';
    mensagem.style.color = resultado.success ? 'green' : 'red';
    } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    mensagem.textContent = 'Erro ao conectar com o sistema.';
    }

  if (resultado.success) document.getElementById('formEsqueciSenha').reset();
});
