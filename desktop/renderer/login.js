// Sistema de login - lógica para Electron (desktop/renderer/login.js)
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuario = document.getElementById('usuario').value;
  const senha = document.getElementById('senha').value;

  // Exemplo simples: autenticação local fixa
  if (usuario === 'admin' && senha === '1234') {
    window.location.href = 'cliente.html';
  } else {
    alert('Usuário ou senha inválidos');
  }
});