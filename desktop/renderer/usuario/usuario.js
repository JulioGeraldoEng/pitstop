// cadastro.js
document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const usuario = document.getElementById('novoUsuario').value.trim();
  const senha = document.getElementById('novaSenha').value.trim();
  const mensagemCadastro = document.getElementById('mensagem-cadastro');

  if (!usuario || !senha) {
    mensagemCadastro.textContent = 'Preencha todos os campos';
    mensagemCadastro.style.color = 'red';
    return;
  }

  const resultado = await window.electronAPI.cadastrarUsuario(usuario, senha);

  if (resultado.success) {
    mensagemCadastro.textContent = 'Usuário cadastrado com sucesso!';
    mensagemCadastro.style.color = 'green';
    document.getElementById('cadastroForm').reset();
  } else {
    mensagemCadastro.textContent = resultado.message || 'Erro ao cadastrar.';
    mensagemCadastro.style.color = 'red';
  }
});
