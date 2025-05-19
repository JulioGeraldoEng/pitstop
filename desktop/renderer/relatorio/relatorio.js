// relatorio.js

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('button').addEventListener('click', buscarRelatorio);
});

async function buscarRelatorio() {
  const cliente = document.getElementById('clienteFiltro').value.trim();
  const dataInicioVenda = document.getElementById('dataInicioVenda').value;
  const dataFimVenda = document.getElementById('dataFimVenda').value;
  const dataInicioVenc = document.getElementById('dataInicioVenc').value;
  const dataFimVenc = document.getElementById('dataFimVenc').value;

  const filtros = {
    cliente,
    dataInicioVenda,
    dataFimVenda,
    dataInicioVenc,
    dataFimVenc
  };

  try {
    const vendas = await window.electronAPI.buscarRelatorio(filtros);
    renderizarResultados(vendas);
  } catch (error) {
    console.error('Erro ao buscar relatório:', error);
  }
}

function renderizarResultados(vendas) {
  const container = document.getElementById('resultadoRelatorio');
  container.innerHTML = '';

  if (vendas.length === 0) {
    container.textContent = 'Nenhuma venda encontrada com os filtros selecionados.';
    return;
  }

  const tabela = document.createElement('table');
  tabela.classList.add('tabela-venda');

  tabela.innerHTML = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Cliente</th>
        <th>Data da Venda</th>
        <th>Vencimento</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${vendas.map(v => `
        <tr>
          <td>${v.id}</td>
          <td>${v.cliente}</td>
          <td>${v.data}</td>
          <td>${v.data_vencimento}</td>
          <td>R$ ${parseFloat(v.total).toFixed(2).replace('.', ',')}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  container.appendChild(tabela);
}


function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}

