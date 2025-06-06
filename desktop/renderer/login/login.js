// Função para desbloquear campos
function unlockFields() {
  const username = document.getElementById('usuario');
  const password = document.getElementById('senha');

  if (username && password) {
    username.removeAttribute('disabled');
    username.removeAttribute('readonly');
    password.removeAttribute('disabled');
    password.removeAttribute('readonly');

    username.style.pointerEvents = 'auto';
    password.style.pointerEvents = 'auto';
  }
}

// Função para mostrar mensagem de status
function showStatus(message, isSuccess) {
  const statusElement = document.getElementById('loginStatus') || 
                       document.createElement('div');
  statusElement.id = 'loginStatus';
  statusElement.textContent = message;
  statusElement.style.color = isSuccess ? 'green' : 'red';
  statusElement.style.marginTop = '10px';
  statusElement.style.textAlign = 'center';
  
  if (!document.getElementById('loginStatus')) {
    document.getElementById('loginForm').appendChild(statusElement);
  }
}

// Desbloqueia ao carregar
document.addEventListener('DOMContentLoaded', () => {
  unlockFields();

  // Adiciona estilos dinâmicos para feedback visual
  const style = document.createElement('style');
  style.textContent = `
    .shake {
      animation: shake 0.5s;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(style);
});

// Handler do envio do formulário de login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  unlockFields();

  const username = document.getElementById('usuario');
  const password = document.getElementById('senha');
  const form = document.getElementById('loginForm');

  if (!username.value || !password.value) {
    showStatus('Preencha todos os campos', false);
    return;
  }

  try {
    showStatus('Verificando credenciais...', true);

    const result = await window.electronAPI.sendLogin({
      username: username.value,
      password: password.value
    });

    if (result.success) {
      localStorage.setItem('usuarioLogado', result.userId);
      showStatus('Login bem-sucedido! Redirecionando...', true);
      setTimeout(() => {
        window.location.href = '../dashboard/dashboard.html'; // ✅ Redirecionamento corrigido
      }, 1000);
    } else {
      showStatus('Usuário ou senha incorretos', false);
      password.value = '';
      password.focus();
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 500);
    }
  } catch (error) {
    console.error('Login error:', error);
    showStatus('Erro ao conectar com o servidor', false);
  } finally {
    unlockFields();
  }
});

// Navegação (se precisar no futuro)
function irPara(pagina) {
  window.location.href = pagina;
}

// Monitoramento contínuo de campos (segurança extra)
setInterval(unlockFields, 1000);
