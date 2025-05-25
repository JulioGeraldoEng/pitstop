// Verifica login
if (!localStorage.getItem('usuarioLogado')) {
  window.location.href = '../login/login.html';
}

let clienteSelecionadoId = null;
let dadosUltimoRelatorio = [];

// Funções auxiliares que estavam faltando
function converterParaNumero(valor) {
  if (!valor) return 0;
  
  if (typeof valor === 'number') {
    return valor;
  }
  
  // Remove pontos de milhar e substitui vírgula decimal por ponto
  const valorLimpo = valor.toString()
    .replace(/\./g, '')
    .replace(',', '.');
  
  const numero = parseFloat(valorLimpo);
  return isNaN(numero) ? 0 : numero;
}

function formatarMoeda(valor) {
  const numero = converterParaNumero(valor);
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

document.addEventListener('DOMContentLoaded', async () => {
  const btnBuscar = document.getElementById('buscar');
  const btnLimpar = document.getElementById('limpar');
  const tabelaVendas = document.getElementById('tabela-vendas').querySelector('tbody');
  const mensagem = document.getElementById('mensagem');
  const totalRelatorio = document.getElementById('totalRelatorio');
  const resumoRelatorioDiv = document.getElementById('resumo-relatorio');
  const inputCliente = document.getElementById('cliente');

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
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;
    const vencimentoInicio = document.getElementById('vencimentoInicio').value;
    const vencimentoFim = document.getElementById('vencimentoFim').value;

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
      btnBuscar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
      btnBuscar.disabled = true;
      exibirMensagem('');

      const filtros = {
        cliente: inputCliente.value.trim(),
        clienteId: clienteSelecionadoId,
        dataInicio,
        dataFim,
        vencimentoInicio,
        vencimentoFim
      };

      const vendas = await window.electronAPI.buscarVendas(filtros);

      const divTabela = document.getElementById('tabela-relatorio');
      divTabela.style.display = 'none';
      tabelaVendas.innerHTML = '';
      resumoRelatorioDiv.style.display = 'none';

      if (vendas && vendas.length > 0) {
        let totalGeral = 0;

        vendas.forEach(venda => {
          const valorNumerico = converterParaNumero(venda.total);
          totalGeral += valorNumerico;

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${venda.id || '-'}</td>
            <td>${venda.cliente || '-'}</td>
            <td>${venda.observacao || '-'}</td>
            <td>${formatarData(venda.data)}</td>
            <td>${formatarData(venda.vencimento)}</td>
            <td>R$ ${formatarMoeda(valorNumerico)}</td>
          `;
          tabelaVendas.appendChild(tr);
        });

        // Exibir os elementos
        divTabela.style.display = 'block';
        resumoRelatorioDiv.style.display = 'block';
        totalRelatorio.textContent = `Total Geral: R$ ${formatarMoeda(totalGeral)}`;
        exibirMensagem(`${vendas.length} vendas encontradas.`, 'green');

        // Preencher dados para PDF
        dadosUltimoRelatorio = vendas;
        preencherPDF(vendas, {
          clienteNome: inputCliente.value.trim(),
          dataInicio,
          dataFim,
          vencimentoInicio,
          vencimentoFim
        });

      } else {
        exibirMensagem('Nenhuma venda encontrada com os filtros informados.', 'blue');
      }
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      exibirMensagem('Erro ao conectar com o banco de dados. Verifique sua conexão.', 'red');
    } finally {
      btnBuscar.innerHTML = '<i class="fas fa-search"></i> Buscar';
      btnBuscar.disabled = false;
    }
  });

  // Limpar filtros
  btnLimpar.addEventListener('click', () => {
    limparRelatorio();
  });
});

function limparRelatorio() {
  document.getElementById('cliente').value = '';
  document.getElementById('dataInicio').value = '';
  document.getElementById('dataFim').value = '';
  document.getElementById('vencimentoInicio').value = '';
  document.getElementById('vencimentoFim').value = '';
  tabelaVendas.innerHTML = '';
  exibirMensagem('');
  totalRelatorio.textContent = '';
  document.getElementById('tabela-relatorio').style.display = 'none';
  resumoRelatorioDiv.style.display = 'none';
  clienteSelecionadoId = null;
}
// Autocomplete de clientes
const inputCliente = document.getElementById('cliente');
const sugestoes = document.getElementById('sugestoesCliente');

function posicionarSugestoes(input, box) {
  const rect = input.getBoundingClientRect();
  box.style.left = `${rect.left + window.scrollX}px`;
  box.style.top = `${rect.bottom + window.scrollY}px`;
  box.style.width = `${rect.width}px`;
  box.style.display = 'block';
}

inputCliente.addEventListener('input', async () => {
  clienteSelecionadoId = null;
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

// Oculta sugestões ao clicar fora
document.addEventListener('click', (e) => {
  if (!sugestoes.contains(e.target) && e.target !== inputCliente) {
    sugestoes.innerHTML = '';
    sugestoes.style.display = 'none';
  }
});

// Exibe mensagem colorida
function exibirMensagem(texto, cor) {
  const mensagem = document.getElementById('mensagem');
  if (mensagem) {
    if (texto) {
      mensagem.textContent = texto;
      mensagem.style.color = cor;
      mensagem.style.display = 'block';
    } else {
      mensagem.textContent = '';
      mensagem.style.display = 'none';
    }
  }
}


function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = '../login/login.html';
}

function irPara(pagina) {
    window.location.href = pagina;
}
