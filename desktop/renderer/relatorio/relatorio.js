// Verifica login
if (!localStorage.getItem('usuarioLogado')) {
  window.location.href = '../login/login.html';
}

let clienteSelecionadoId = null;


document.addEventListener('DOMContentLoaded', async () => {
  const btnBuscar = document.getElementById('buscar');
  const btnLimpar = document.getElementById('limpar');
  const tabelaVendas = document.getElementById('tabela-vendas').querySelector('tbody');
  const mensagem = document.getElementById('mensagem');
  const totalRelatorio = document.getElementById('totalRelatorio');
  const resumoRelatorioDiv = document.getElementById('resumo-relatorio');

  // Inicialmente oculta a mensagem e a tabela de resultados
  mensagem.style.display = 'none';
  document.getElementById('tabela-relatorio').style.display = 'none';
  resumoRelatorioDiv.style.display = 'none';

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
        exibirMensagem(`Formato de ${campo} inválido (use dd/mm/aaaa)`, 'red');
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
      exibirMensagem(''); // Limpa a mensagem anterior

      const filtros = {
        cliente: inputCliente.value.trim(),  
        clienteId: clienteSelecionadoId,
        dataInicio,
        dataFim,
        vencimentoInicio,
        vencimentoFim
      };

      // Chama a API para buscar as vendas
      const vendas = await window.electronAPI.buscarVendas(filtros);

      // Limpa a tabela
      const divTabela = document.getElementById('tabela-relatorio');
      divTabela.style.display = 'none';
      tabelaVendas.innerHTML = '';
      resumoRelatorioDiv.style.display = 'none';

      // Preenche a tabela com os resultados
      if (vendas && vendas.length > 0) {
        let totalGeral = 0;
        
        vendas.forEach(venda => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${venda.id || '-'}</td>
            <td>${venda.cliente || '-'}</td>
            <td>${venda.observacao || '-'}</td>
            <td>${formatarData(venda.data)}</td>
            <td>${formatarData(venda.vencimento)}</td>
            <td>R$ ${venda.total ? venda.total.toFixed(2).replace('.', ',') : '0,00'}</td>
          `;
          tabelaVendas.appendChild(tr);
          divTabela.style.display = 'block';
          
          if (venda.total) {
            totalGeral += parseFloat(venda.total);
          }
        });

        totalRelatorio.textContent = `Total Geral: R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
        resumoRelatorioDiv.style.display = 'block';
        exibirMensagem(`${vendas.length} vendas encontradas.`, 'green');
      } else {
        resumoRelatorioDiv.style.display = 'none';
        exibirMensagem('Nenhuma venda encontrada com os filtros informados.', 'blue');
        totalRelatorio.textContent = '';
      }
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      resumoRelatorioDiv.style.display = 'none';
      exibirMensagem('Erro ao conectar com o banco de dados. Verifique sua conexão.', 'red');
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
    exibirMensagem(''); // Limpa e oculta a mensagem
    totalRelatorio.textContent = '';
    document.getElementById('tabela-relatorio').style.display = 'none';
    resumoRelatorioDiv.style.display = 'none';
    clienteSelecionadoId = null; // limpa o ID selecionado
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
  clienteSelecionadoId = null; // limpa o ID sempre que o texto for alterado
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
        div.textContent = `${cliente.nome} (${cliente.observacao || 'Sem observação'})`;
        div.addEventListener('click', () => {
          inputCliente.value = cliente.nome;
          clienteSelecionadoId = cliente.id;
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

// Exibe mensagem colorida e controla a visibilidade
function exibirMensagem(texto, cor) {
  const mensagem = document.getElementById('mensagem');
  if (mensagem) {
    if (texto) {
      mensagem.textContent = texto;
      mensagem.style.color = cor;
      mensagem.style.display = 'block'; // Mostra a mensagem
    } else {
      mensagem.textContent = '';
      mensagem.style.display = 'none'; // Oculta a mensagem se não houver texto
    }
  }
}

// Navegação
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}

