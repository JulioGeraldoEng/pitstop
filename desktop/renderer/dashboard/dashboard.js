function irPara(pagina) {
    window.location.href = pagina;
}

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = '../login/login.html';
}

if (!localStorage.getItem('usuarioLogado')) {
    window.location.href = '../login/login.html';
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const vendasHoje = await window.electronAPI.contarVendasHoje();
    const vendasMes = await window.electronAPI.contarVendasMes();
    const vendasTotal = await window.electronAPI.contarVendasTotal();

    document.getElementById('vendas-hoje').textContent = vendasHoje;
    document.getElementById('vendas-mes').textContent = vendasMes;
    document.getElementById('vendas-total').textContent = vendasTotal;

    const dadosStatus = await window.electronAPI.buscarVendasPorStatus();
    console.log('Tipo de dadosStatus:', typeof dadosStatus);
    console.log('Conteúdo de dadosStatus:', dadosStatus);
    const container = document.getElementById('status-vendas');
    container.innerHTML = '';

    if (!Array.isArray(dadosStatus)) {
      container.innerHTML = '<p>Dados de status inválidos.</p>';
      return;
    }

    if (!dadosStatus || dadosStatus.length === 0) {
      container.innerHTML = '<p>Nenhum dado de status encontrado.</p>';
      return;
    }

  dadosStatus.forEach(({ status, total }) => {
    const container = document.getElementById('status-vendas');

    // Mapear status para ícones Font Awesome
    const icones = {
      pago: '<i class="fas fa-check-circle" style="color: #28a745; margin-right: 8px;"></i>',      // ✔️ verde
      pendente: '<i class="fas fa-exclamation-triangle" style="color: #ffc107; margin-right: 8px;"></i>', // ⚠️ amarelo
      cancelado: '<i class="fas fa-times-circle" style="color: #dc3545; margin-right: 8px;"></i>',    // ❌ vermelho
      atrasado: '<i class="fas fa-clock" style="color: #e4751b; margin-right: 8px;"></i>'            // ⏰ laranja
    };

    const statusFormatado = status.trim().toLowerCase();

    const card = document.createElement('div');
    card.className = `card-status ${statusFormatado}`;

    const iconeHtml = icones[statusFormatado] || '';

    card.innerHTML = `
      <h4>${iconeHtml}${status.charAt(0).toUpperCase() + status.slice(1)}</h4>
      <p>${total} venda(s)</p>
    `;

    container.appendChild(card);
  });


  } catch (error) {
    console.error('Erro ao buscar dados de vendas:', error);
  }
});