// Verifica login
if (!localStorage.getItem('usuarioLogado')) {
  window.location.href = '../login/login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  const btnBuscar = document.getElementById('buscar');
  const btnLimpar = document.getElementById('limpar');
  const tabelaVendas = document.getElementById('tabela-vendas').querySelector('tbody');
  const mensagem = document.getElementById('mensagem');
  const totalRelatorio = document.getElementById('totalRelatorio');

  // Adiciona máscara aos campos de data
  document.querySelectorAll('input[type="text"][placeholder="dd/mm/aaaa"]').forEach(input => {
    input.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 2) {
        value = value.substring(0, 2) + '/' + value.substring(2);
      }
      if (value.length > 5) {
        value = value.substring(0, 5) + '/' + value.substring(5, 9);
      }
      e.target.value = value.substring(0, 10);
    });
  });

  // Função para formatar data
  function formatarData(data) {
    if (!data) return '-';
    
    // Se já estiver no formato dd/mm/yyyy
    if (typeof data === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      return data;
    }
    
    // Tentar converter de outros formatos
    const dateObj = new Date(data);
    if (isNaN(dateObj.getTime())) return 'Data inválida';
    
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ano = dateObj.getFullYear();
    
    return `${dia}/${mes}/${ano}`;
  }

  // Buscar vendas
  btnBuscar.addEventListener('click', async () => {
    const cliente = document.getElementById('cliente').value.trim();
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;
    const vencimentoInicio = document.getElementById('vencimentoInicio').value;
    const vencimentoFim = document.getElementById('vencimentoFim').value;

    // Validação básica das datas
    const validarData = (data, campo) => {
      if (data && !/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
        mensagem.textContent = `Formato de ${campo} inválido (use dd/mm/aaaa)`;
        mensagem.style.color = 'red';
        return false;
      }
      return true;
    };

    if (!validarData(dataInicio, 'data inicial')) return;
    if (!validarData(dataFim, 'data final')) return;
    if (!validarData(vencimentoInicio, 'vencimento inicial')) return;
    if (!validarData(vencimentoFim, 'vencimento final')) return;

    try {
      // Mostra loading
      btnBuscar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
      btnBuscar.disabled = true;
      mensagem.textContent = '';
      mensagem.style.color = '';

      const filtros = {
        cliente,
        dataInicio,
        dataFim,
        vencimentoInicio,
        vencimentoFim
      };

      // Chama a API para buscar as vendas
      const vendas = await window.electronAPI.buscarVendas(filtros);

      // Limpa a tabela
      tabelaVendas.innerHTML = '';

      // Preenche a tabela com os resultados
      if (vendas && vendas.length > 0) {
        let totalGeral = 0;
        
        vendas.forEach(venda => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${venda.id || '-'}</td>
            <td>${venda.cliente || '-'}</td>
            <td>${formatarData(venda.data)}</td>
            <td>${formatarData(venda.vencimento)}</td>
            <td>R$ ${venda.total ? venda.total.toFixed(2).replace('.', ',') : '0,00'}</td>
          `;
          tabelaVendas.appendChild(tr);
          
          if (venda.total) {
            totalGeral += parseFloat(venda.total);
          }
        });

        totalRelatorio.textContent = `Total Geral: R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
        mensagem.textContent = `${vendas.length} vendas encontradas.`;
        mensagem.style.color = 'green';
      } else {
        mensagem.textContent = 'Nenhuma venda encontrada com os filtros informados.';
        mensagem.style.color = 'blue';
        totalRelatorio.textContent = '';
      }
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      mensagem.textContent = 'Erro ao conectar com o banco de dados. Verifique sua conexão.';
      mensagem.style.color = 'red';
      totalRelatorio.textContent = '';
    } finally {
      btnBuscar.innerHTML = '<i class="fas fa-search"></i> Buscar';
      btnBuscar.disabled = false;
    }
  });

  // Limpar filtros
  btnLimpar.addEventListener('click', () => {
    document.getElementById('cliente').value = '';
    document.getElementById('dataInicio').value = '';
    document.getElementById('dataFim').value = '';
    document.getElementById('vencimentoInicio').value = '';
    document.getElementById('vencimentoFim').value = '';
    tabelaVendas.innerHTML = '';
    mensagem.textContent = '';
    totalRelatorio.textContent = '';
  });
});

const inputCliente = document.getElementById('cliente');
const sugestoes = document.getElementById('sugestoesCliente');

// Posiciona a caixa de sugestões
function posicionarSugestoes(input, box) {
  const rect = input.getBoundingClientRect();
  box.style.left = `${rect.left + window.scrollX}px`;
  box.style.top = `${rect.bottom + window.scrollY}px`;
  box.style.width = `${rect.width}px`;
  box.style.display = 'block';
}

inputCliente.addEventListener('input', async () => {
  const termo = inputCliente.value.trim();
  sugestoes.innerHTML = '';
  sugestoes.style.display = 'none';

  if (termo.length < 2) return;

  try {
    const resultados = await window.electronAPI.buscarClientesPorNome(termo);

    if (resultados.length === 0) {
      const div = document.createElement('div');
      div.textContent = 'Nenhum cliente encontrado';
      sugestoes.appendChild(div);
    } else {
      resultados.forEach(cliente => {
        const div = document.createElement('div');
        div.textContent = cliente.nome;
        div.addEventListener('click', () => {
          inputCliente.value = cliente.nome;
          sugestoes.innerHTML = '';
          sugestoes.style.display = 'none';
        });
        sugestoes.appendChild(div);
      });
    }

    posicionarSugestoes(inputCliente, sugestoes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
  }
});

// Oculta ao clicar fora
document.addEventListener('click', (e) => {
  if (!sugestoes.contains(e.target) && e.target !== inputCliente) {
    sugestoes.innerHTML = '';
    sugestoes.style.display = 'none';
  }
});

// Navegação
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}