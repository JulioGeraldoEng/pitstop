// ===================== [ VERIFICAÇÃO DE LOGIN ] =====================
if (!localStorage.getItem('usuarioLogado')) {
  window.location.href = '../login/login.html';
}

// ===================== [ VARIÁVEIS GLOBAIS ] =====================
let clienteSelecionadoId = null;
let dadosUltimoRelatorio = [];

const inputCliente = document.getElementById('cliente');
const sugestoes = document.getElementById('sugestoesCliente');
const tabelaVendas = document.getElementById('tabela-vendas').querySelector('tbody');
const totalRelatorio = document.getElementById('totalRelatorio');
const resumoRelatorioDiv = document.getElementById('resumo-relatorio');

// ===================== [ FUNÇÕES UTILITÁRIAS ] =====================
function converterParaNumero(valor) {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;

  const valorLimpo = valor.toString().replace(/\./g, '').replace(',', '.');
  const numero = parseFloat(valorLimpo);
  return isNaN(numero) ? 0 : numero;
}

function formatarMoeda(valor) {
  const numero = converterParaNumero(valor);
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(data) {
  if (!data) return '-';
  if (typeof data === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(data)) return data;

  const dateObj = new Date(data);
  if (isNaN(dateObj.getTime())) return 'Data inválida';

  const dia = String(dateObj.getDate()).padStart(2, '0');
  const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
  const ano = dateObj.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function exibirMensagem(texto, cor) {
  const mensagem = document.getElementById('mensagem');
  if (mensagem) {
    mensagem.textContent = texto || '';
    mensagem.style.color = cor || '';
    mensagem.style.display = texto ? 'block' : 'none';
  }
}

// ===================== [ DOMContentLoaded ] =====================
document.addEventListener('DOMContentLoaded', async () => {
  const btnBuscar = document.getElementById('buscar');
  const btnLimpar = document.getElementById('limpar');
  const mensagem = document.getElementById('mensagem');
  const divTabela = document.getElementById('tabela-relatorio');

  // Oculta elementos inicialmente
  mensagem.style.display = 'none';
  divTabela.style.display = 'none';
  resumoRelatorioDiv.style.display = 'none';

  aplicarMascaraData();
  configurarEventosBusca(btnBuscar);
  configurarEventoLimpar(btnLimpar);
});

// ===================== [ MÁSCARA DE DATA ] =====================
function aplicarMascaraData() {
  document.querySelectorAll('input[type="text"][placeholder="dd/mm/aaaa"]').forEach(input => {
    input.addEventListener('input', function (e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 2) value = value.substring(0, 2) + '/' + value.substring(2);
      if (value.length > 5) value = value.substring(0, 5) + '/' + value.substring(5, 9);
      e.target.value = value.substring(0, 10);
    });
  });
}

// ===================== [ EVENTO DE BUSCA ] =====================
function configurarEventosBusca(botao) {
  botao.addEventListener('click', async () => {
    const filtros = {
      cliente: inputCliente.value.trim(),
      clienteId: clienteSelecionadoId,
      dataInicio: document.getElementById('dataInicio').value,
      dataFim: document.getElementById('dataFim').value,
      vencimentoInicio: document.getElementById('vencimentoInicio').value,
      vencimentoFim: document.getElementById('vencimentoFim').value
    };

    if (!validarFiltrosData(filtros)) return;

    try {
      botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
      botao.disabled = true;
      exibirMensagem('');

      const vendas = await window.electronAPI.buscarVendas(filtros);
      processarResultados(vendas, filtros);

    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      exibirMensagem('Erro ao conectar com o banco de dados. Verifique sua conexão.', 'red');
    } finally {
      botao.innerHTML = '<i class="fas fa-search"></i> Buscar';
      botao.disabled = false;
    }
  });
}

// ===================== [ EVENTO DE LIMPEZA ] =====================
function configurarEventoLimpar(botao) {
  botao.addEventListener('click', limparRelatorio);
}

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

// ===================== [ VALIDAÇÃO DE DATAS ] =====================
function validarFiltrosData({ dataInicio, dataFim, vencimentoInicio, vencimentoFim }) {
  const validarData = (data, campo) => {
    if (data && !/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      exibirMensagem(`Formato de ${campo} inválido (use dd/mm/aaaa)`, 'red');
      return false;
    }
    return true;
  };

  return (
    validarData(dataInicio, 'data inicial') &&
    validarData(dataFim, 'data final') &&
    validarData(vencimentoInicio, 'vencimento inicial') &&
    validarData(vencimentoFim, 'vencimento final')
  );
}

// ===================== [ PROCESSAMENTO DOS RESULTADOS ] =====================
function processarResultados(vendas, filtros) {
  const divTabela = document.getElementById('tabela-relatorio');
  const tabelaVendas = document.getElementById('tabela-vendas').querySelector('tbody');
  const resumoRelatorioDiv = document.getElementById('resumo-relatorio');
  const totalRelatorio = document.getElementById('totalRelatorio');
  tabelaVendas.innerHTML = '';
  resumoRelatorioDiv.style.display = 'none';

  if (vendas && vendas.length > 0) {
    let totalGeral = 0;

    vendas.forEach(venda => {
      const valor = converterParaNumero(venda.total_venda);
      totalGeral += valor;

      const trVenda = document.createElement('tr');
      trVenda.classList.add('venda-principal');
      trVenda.innerHTML = `
        <td>${venda.venda_id || '-'}</td>
        <td>${venda.cliente || '-'}</td>
        <td>${venda.observacao || '-'}</td>
        <td>${formatarData(venda.data)}</td>
        <td>${formatarData(venda.vencimento)}</td>
        <td>R$ ${formatarMoeda(valor)}</td>
        <td></td> <td></td> <td></td> `;
      tabelaVendas.appendChild(trVenda);

      if (venda.itens && venda.itens.length > 0) {
        venda.itens.forEach(item => {
          const trItem = document.createElement('tr');
          trItem.classList.add('item-venda');
          trItem.innerHTML = `
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>${item.nome_produto || '-'}</td>
            <td>${item.quantidade || '-'}</td>
            <td>R$ ${formatarMoeda(item.preco_unitario)}</td>
          `;
          tabelaVendas.appendChild(trItem);
        });
      } else {
        const trItem = document.createElement('tr');
        trItem.classList.add('item-venda', 'sem-itens');
        trItem.innerHTML = `<td colspan="9">Nenhum item vendido nesta venda.</td>`;
        tabelaVendas.appendChild(trItem);
      }
    });

    divTabela.style.display = 'block';
    resumoRelatorioDiv.style.display = 'block';
    totalRelatorio.textContent = `Total Geral: R$ ${formatarMoeda(totalGeral)}`;
    exibirMensagem(`${vendas.length} vendas encontradas.`, 'green');

    dadosUltimoRelatorio = vendas;
    preencherPDF(vendas, filtros);

  } else {
    exibirMensagem('Nenhuma venda encontrada com os filtros informados.', 'blue');
  }
}

// ===================== [ AUTOCOMPLETE DE CLIENTES ] =====================
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
      sugestoes.innerHTML = '<div>Nenhum cliente encontrado</div>';
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

document.addEventListener('click', (e) => {
  if (!sugestoes.contains(e.target) && e.target !== inputCliente) {
    sugestoes.innerHTML = '';
    sugestoes.style.display = 'none';
  }
});

// ===================== [ EXPORTAÇÃO PARA PDF ] =====================
document.getElementById('exportarPdf').addEventListener('click', async (e) => {
  e.preventDefault();

  if (dadosUltimoRelatorio.length === 0) {
    exibirMensagem('Nenhum dado disponível para exportar. Realize uma busca primeiro.', 'red');
    return;
  }

  try {
    const divRelatorio = document.getElementById('tabela-relatorio').cloneNode(true);
    const titulo = divRelatorio.querySelector('h2');
    const tabela = divRelatorio.querySelector('table');
    const resumo = document.getElementById('resumo-relatorio').cloneNode(true);

    divRelatorio.style.margin = '0';
    divRelatorio.style.padding = '0';
    divRelatorio.style.boxShadow = 'none';
    if (titulo) {
      titulo.style.margin = '0 0 5px 0';
      titulo.style.padding = '0';
    }
    tabela.style.marginTop = '0';
    tabela.style.width = '100%';

    const htmlParaPDF = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            h2 { color: #0078d7; margin: 0 0 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 0; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #0078d7; color: white; }
            .resumo { margin-top: 15px; font-weight: bold; }
          </style>
        </head>
        <body>
          ${titulo?.outerHTML || '<h2>Relatório de Vendas</h2>'}
          ${tabela.outerHTML}
          ${resumo.outerHTML}
        </body>
      </html>
    `;

    const caminho = await window.electronAPI.exportarParaPDF(htmlParaPDF);
    exibirMensagem(`PDF salvo com sucesso em: ${caminho}`, 'green');
    //alert(`PDF salvo com sucesso em: ${caminho}`);

  } catch (error) {
    console.error('Erro ao salvar PDF:', error);
    exibirMensagem('Erro ao salvar PDF. Verifique o console para detalhes.', 'red');
  }
});

// ===================== [ PREENCHIMENTO DE DADOS PARA PDF ] =====================
function preencherPDF(vendas, filtros) {
  const divFiltros = document.getElementById('pdf-filtros');
  const tbodyPDF = document.querySelector('#pdf-tabela tbody');
  const totalPDF = document.getElementById('pdf-total');

  tbodyPDF.innerHTML = '';
  divFiltros.innerHTML = '';
  totalPDF.textContent = '';

  const filtrosTexto = [
    filtros.clienteNome && `Cliente: ${filtros.clienteNome}`,
    filtros.dataInicio && `Data Inicial: ${filtros.dataInicio}`,
    filtros.dataFim && `Data Final: ${filtros.dataFim}`,
    filtros.vencimentoInicio && `Vencimento Inicial: ${filtros.vencimentoInicio}`,
    filtros.vencimentoFim && `Vencimento Final: ${filtros.vencimentoFim}`
  ].filter(Boolean).join('; ');

  divFiltros.textContent = `Filtros aplicados: ${filtrosTexto}`;

  let totalGeral = 0;

  vendas.forEach(venda => {
    const valor = converterParaNumero(venda.total);
    totalGeral += valor;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${venda.id || '-'}</td>
      <td>${venda.cliente || '-'}</td>
      <td>${venda.observacao || '-'}</td>
      <td>${formatarData(venda.data)}</td>
      <td>${formatarData(venda.vencimento)}</td>
      <td>R$ ${formatarMoeda(valor)}</td>
    `;
    tbodyPDF.appendChild(tr);
  });

  totalPDF.textContent = `Total Geral: R$ ${formatarMoeda(totalGeral)}`;
}

// ===================== [ NAVEGAÇÃO / LOGOUT ] =====================
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}
