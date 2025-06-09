// ===================== [ VERIFICAÇÃO DE LOGIN ] =====================
if (!localStorage.getItem('usuarioLogado')) {
  window.location.href = '../login/login.html';
}

// ===================== [ DOMContentLoaded ] =====================
document.addEventListener('DOMContentLoaded', () => {
  const btnConnect = document.getElementById('btnWhatsapp');
  const btnRestart = document.getElementById('btnRestartSession');
  const btnSendLateSales = document.getElementById('btnSendLateSales');
  const qrcodeContainer = document.getElementById('qrcode-container');
  const loadingMessage = document.getElementById('loadingMessage');

  // ✅ Corrigida a porta aqui
  const socket = io('http://localhost:21465');

  // ===================== [ CONECTAR WHATSAPP - QR CODE ] =====================
  async function conectarWhatsApp() {
    try {
      loadingMessage.style.display = 'block';
      loadingMessage.textContent = 'Aguardando QR Code...';
      qrcodeContainer.style.display = 'none';
      qrcodeContainer.innerHTML = '';

      const restartResponse = await fetch('http://localhost:21465/restart-session', {
        method: 'POST',
      });

      const restartResult = await restartResponse.json();
      if (!restartResponse.ok) {
        throw new Error(restartResult.error || 'Erro ao reiniciar a sessão do WhatsApp.');
      }

      // Nada mais a fazer — QR Code virá por WebSocket
    } catch (error) {
      console.error('Erro ao conectar com WPPConnect:', error);
      await window.electronAPI.showDialog({
        type: 'error',
        title: 'WhatsApp',
        message: 'Erro ao conectar com o servidor WPPConnect.',
      });
      loadingMessage.style.display = 'none';
    }
  }

  // ===================== [ ESCUTA O QR CODE POR WEBSOCKET ] =====================
  socket.on('qrCode', (qrBase64) => {
    qrcodeContainer.innerHTML = `
      <h3 style="text-align: center;">Escaneie o QR Code abaixo:</h3>
      <img src="${qrBase64}" style="display: block; margin: 0 auto; max-width: 100%;" />
    `;
    qrcodeContainer.style.display = 'block';
    loadingMessage.style.display = 'none';
  });

  socket.on('status', (data) => {
    if (data.statusSession === 'inChat') {
      loadingMessage.style.display = 'none';
      qrcodeContainer.innerHTML = `<h3 style="text-align: center; color: green;">WhatsApp conectado com sucesso.</h3>`;
    }
  });

  // ===================== [ REINICIAR SESSÃO - MANUAL ] =====================
  async function reiniciarSessao() {
    try {
      loadingMessage.textContent = 'Reiniciando sessão...';
      loadingMessage.style.display = 'block';

      const response = await fetch('http://localhost:21465/restart-session', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao reiniciar sessão.');
      }
      await window.electronAPI.showDialog({
        type: 'info',
        title: 'WhatsApp',
        message: 'Sessão reiniciada com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao reiniciar sessão:', error);
      await window.electronAPI.showDialog({
        type: 'error',
        title: 'WhatsApp',
        message: 'Erro ao reiniciar sessão do WhatsApp.',
      });
    } finally {
      loadingMessage.style.display = 'none';
      loadingMessage.textContent = 'Aguardando QR Code...';
    }
  }

  // ===================== [ ENVIAR MENSAGENS DE COBRANÇA ] =====================
  async function enviarMensagens() {
    try {
      const clientesAtrasados = await window.electronAPI.getClientesAtrasados();

      if (!clientesAtrasados || clientesAtrasados.length === 0) {
        await window.electronAPI.showDialog({
          type: 'warning',
          title: 'WhatsApp',
          message: 'Nenhum cliente com vendas atrasadas encontrado.',
        });
        return;
      }

      const response = await fetch('http://localhost:21465/enviar-atrasadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientes: clientesAtrasados }),
      });

      const result = await response.json();
      await window.electronAPI.showDialog({
        type: 'info',
        title: 'WhatsApp',
        message: result.message || 'Mensagens enviadas com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao enviar mensagens:', error);
      await window.electronAPI.showDialog({
          type: 'error',
          title: 'WhatsApp',
          message: 'Erro ao enviar mensagens para clientes com vendas atrasadas.',
        });
    }
  }

  // ===================== [ EVENTOS DOS BOTÕES ] =====================
  btnConnect?.addEventListener('click', conectarWhatsApp);
  btnRestart?.addEventListener('click', reiniciarSessao);
  btnSendLateSales?.addEventListener('click', enviarMensagens);
});

// ===================== [ FUNÇÕES GERAIS ] =====================
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}
