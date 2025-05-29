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

// DECLARE A VARIÁVEL statusVendaFiltroInput AQUI, NO ESCOPO GLOBAL DO SCRIPT:
const statusVendaFiltroInput = document.getElementById('statusVendaFiltro'); // <<-- MOVIDA PARA CÁ

// ===================== [ FUNÇÕES UTILITÁRIAS ] =====================
// ... (suas funções utilitárias como converterParaNumero, formatarMoeda, etc. permanecem as mesmas) ...
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
    // Para depuração, descomente a linha abaixo e verifique o console do navegador
    console.log('DEBUG formatarData - Entrada:', typeof data, data);

    if (!data) return '-';

    // Caso 1: Se a string já estiver no formato dd/mm/aaaa, retorna diretamente.
    if (typeof data === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
        // console.log('DEBUG formatarData - Caso 1: Já formatado dd/mm/yyyy');
        return data;
    }

    // Caso 2: Se for uma string que começa com YYYY-MM-DD.
    // Esta é uma tentativa de pegar a data "nominal" diretamente da string,
    // antes que o construtor new Date() aplique qualquer lógica de fuso horário
    // que possa ser inconsistente entre navegadores para este formato.
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}/.test(data)) {
        const datePart = data.substring(0, 10); // Pega somente a parte YYYY-MM-DD
        const [anoStr, mesStr, diaStr] = datePart.split('-');

        // Valida se as partes são numéricas e fazem sentido
        const ano = parseInt(anoStr, 10);
        const mes = parseInt(mesStr, 10); // Mês aqui é 1-12
        const dia = parseInt(diaStr, 10); // Dia aqui é 1-31

        if (!isNaN(ano) && !isNaN(mes) && !isNaN(dia) &&
            mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
            // console.log('DEBUG formatarData - Caso 2: Parse manual de YYYY-MM-DD string');
            return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
        }
    }
    
    // Caso 3: Para todos os outros formatos de entrada (timestamps, strings de data completas, etc.)
    // ou se o parse manual do Caso 2 falhar em extrair componentes válidos.
    // Aqui, usamos new Date() e, crucialmente, getUTC...() para os componentes.
    // Isso assume que se a 'data' é um momento específico no tempo (ex: meia-noite UTC de um dia X),
    // queremos exibir os componentes desse dia X em UTC, não no fuso local.
    try {
        const dateObj = new Date(data);
        
        // Verifica se a conversão para Date resultou em uma data válida
        if (isNaN(dateObj.getTime())) {
            // console.log('DEBUG formatarData - Caso 3: new Date() resultou em data inválida');
            return 'Data inválida';
        }

        const ano = dateObj.getUTCFullYear();
        const mes = String(dateObj.getUTCMonth() + 1).padStart(2, '0'); // getUTCMonth() é 0-11
        const dia = String(dateObj.getUTCDate()).padStart(2, '0');
        
        // console.log('DEBUG formatarData - Caso 3: Usando componentes UTC ->', `${dia}/${mes}/${ano}`);
        return `${dia}/${mes}/${ano}`;
    } catch (e) {
        // console.log('DEBUG formatarData - Exceção ao processar data no Caso 3:', e);
        return 'Data inválida'; // Em caso de erro na conversão
    }
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
  const mensagem = document.getElementById('mensagem'); // mensagem já é global no seu exemplo, mas ok
  const divTabela = document.getElementById('tabela-relatorio');
  // const statusVendaFiltroInput = document.getElementById('statusVendaFiltro'); // <<-- REMOVA DESTE ESCOPO LOCAL

  mensagem.style.display = 'none';
  divTabela.style.display = 'none';
  if (resumoRelatorioDiv) resumoRelatorioDiv.style.display = 'none'; // Adicionado if para segurança

  aplicarMascaraData();
  configurarEventosBusca(btnBuscar); // statusVendaFiltroInput agora é global e acessível
  configurarEventoLimpar(btnLimpar); // statusVendaFiltroInput agora é global e acessível
});

// ===================== [ MÁSCARA DE DATA ] =====================
// ... (sua função aplicarMascaraData permanece a mesma) ...
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
  botao.addEventListener('click', async (event) => {
    event.preventDefault(); 

    const filtros = {
      cliente: inputCliente.value.trim(), // inputCliente é global
      clienteId: clienteSelecionadoId,
      dataInicio: document.getElementById('dataInicio').value,
      dataFim: document.getElementById('dataFim').value,
      vencimentoInicio: document.getElementById('vencimentoInicio').value,
      vencimentoFim: document.getElementById('vencimentoFim').value,
      // statusVendaFiltroInput agora é acessível pois está no escopo global do script
      status: statusVendaFiltroInput ? statusVendaFiltroInput.value : ""
    };

    // console.log("FRONTEND - Filtros que serão enviados:", JSON.stringify(filtros, null, 2)); // Para depuração

    if (!validarFiltrosData(filtros)) return;

    try {
      botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
      botao.disabled = true;
      exibirMensagem('');

      const vendas = await window.electronAPI.buscarVendas(filtros);
      // console.log("FRONTEND - Dados BRUTOS recebidos de buscarVendas:", vendas);

      processarResultados(vendas, filtros);

    } catch (error) {
      console.error('FRONTEND - ERRO ao buscar/processar vendas:', error);
      exibirMensagem('Erro ao buscar dados. Verifique o console (F12) e o terminal do backend.', 'red');
      
      if (tabelaVendas) tabelaVendas.innerHTML = '';
      const divTabela = document.getElementById('tabela-relatorio');
      const resumoRelatorioDivLocal = document.getElementById('resumo-relatorio');
      const totalRelatorioLocal = document.getElementById('totalRelatorio');

      if(divTabela) divTabela.style.display = 'none';
      if(resumoRelatorioDivLocal) resumoRelatorioDivLocal.style.display = 'none';
      if(totalRelatorioLocal) totalRelatorioLocal.textContent = '';

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
  if (inputCliente) inputCliente.value = ''; // Verifica se existe antes de usar
  document.getElementById('dataInicio').value = '';
  document.getElementById('dataFim').value = '';
  document.getElementById('vencimentoInicio').value = '';
  document.getElementById('vencimentoFim').value = '';
  if (statusVendaFiltroInput) statusVendaFiltroInput.value = ''; // statusVendaFiltroInput agora é global
  
  if (tabelaVendas) tabelaVendas.innerHTML = '';
  exibirMensagem('');
  if (totalRelatorio) totalRelatorio.textContent = '';
  
  const tabelaRelatorioDiv = document.getElementById('tabela-relatorio'); // Renomeado para evitar conflito com a var global resumoRelatorioDiv
  if (tabelaRelatorioDiv) tabelaRelatorioDiv.style.display = 'none';
  
  // resumoRelatorioDiv já é uma constante global
  if (resumoRelatorioDiv) resumoRelatorioDiv.style.display = 'none'; 
  
  clienteSelecionadoId = null;
  dadosUltimoRelatorio = []; // Limpa os dados do último relatório também
}

// ===================== [ VALIDAÇÃO DE DATAS ] =====================
// ... (sua função validarFiltrosData permanece a mesma) ...
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
// ... (sua função processarResultados permanece a mesma, mas certifique-se de que as
//      variáveis globais como divTabela, resumoRelatorioDiv, totalRelatorio são usadas corretamente
//      ou obtidas dentro da função se não forem globais)
function processarResultados(vendas, filtros) {
  const divTabelaLocal = document.getElementById('tabela-relatorio'); // Use vars locais para clareza
  const tabelaVendasLocal = document.getElementById('tabela-vendas').querySelector('tbody');
  const resumoRelatorioDivLocal = document.getElementById('resumo-relatorio');
  const totalRelatorioLocal = document.getElementById('totalRelatorio');
  
  if (!tabelaVendasLocal || !resumoRelatorioDivLocal || !totalRelatorioLocal || !divTabelaLocal) {
      console.error("Elementos do DOM para resultados não encontrados!");
      return;
  }

  tabelaVendasLocal.innerHTML = '';
  resumoRelatorioDivLocal.style.display = 'none';

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
        <td>${venda.status_pagamento || '-'}</td>
        <td></td>                               
        <td></td>                                
        <td></td>                               
      `;
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
            <td></td>
            <td>${item.nome_produto || '-'}</td>          
            <td>${item.quantidade || '-'}</td>            
            <td>R$ ${formatarMoeda(item.preco_unitario)}</td> `;
          tabelaVendas.appendChild(trItem);
        });
      } else {
        const trItem = document.createElement('tr');
        trItem.classList.add('item-venda', 'sem-itens');
        trItem.innerHTML = `
          <td colspan="10">Nenhum item vendido nesta venda.</td>`;
        tabelaVendas.appendChild(trItem);
      }
    });

    divTabelaLocal.style.display = 'block';
    resumoRelatorioDivLocal.style.display = 'block';
    totalRelatorioLocal.textContent = `Total Geral: R$ ${formatarMoeda(totalGeral)}`;
    exibirMensagem(`${vendas.length} vendas encontradas.`, 'green');

    dadosUltimoRelatorio = vendas; // Armazena os dados do último relatório para uso posterior

  } else {
    exibirMensagem('Nenhuma venda encontrada com os filtros informados.', 'blue');
    divTabelaLocal.style.display = 'none'; // Oculta a tabela se não houver resultados
    resumoRelatorioDivLocal.style.display = 'none'; // Oculta o resumo
    totalRelatorioLocal.textContent = ''; // Limpa o total
  }
}


// ===================== [ AUTOCOMPLETE DE CLIENTES ] =====================
// ... (seu código de autocomplete permanece o mesmo, mas use inputCliente (global) e sugestoes (global)) ...
function posicionarSugestoes(input, box) {
  const rect = input.getBoundingClientRect();
  box.style.left = `${rect.left + window.scrollX}px`;
  box.style.top = `${rect.bottom + window.scrollY}px`;
  box.style.width = `${rect.width}px`;
  box.style.display = 'block';
}

inputCliente.addEventListener('input', async () => { // inputCliente é global
  clienteSelecionadoId = null;
  const termo = inputCliente.value.trim();
  sugestoes.innerHTML = ''; // sugestoes é global
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

document.addEventListener('click', (e) => { // sugestoes e inputCliente são globais
  if (sugestoes && inputCliente && !sugestoes.contains(e.target) && e.target !== inputCliente) {
    sugestoes.innerHTML = '';
    sugestoes.style.display = 'none';
  }
});

// ===================== [ EXPORTAÇÃO PARA PDF - Função Modificada ] =====================
// No seu arquivo relatorio.js

// Função para obter a data atual formatada para o PDF (coloque no escopo global do script ou passe como argumento)
function obterDataAtualFormatadaParaPDF() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const mesPorExtenso = meses[hoje.getMonth()]; // getMonth() retorna 0-11
  const ano = hoje.getFullYear();
  return `${dia} de ${mesPorExtenso} de ${ano}`;
}

document.getElementById('exportarPdf').addEventListener('click', async (e) => {
  e.preventDefault();

  if (dadosUltimoRelatorio.length === 0) {
    exibirMensagem('Nenhum dado disponível para exportar. Realize uma busca primeiro.', 'red');
    return;
  }

  const dataGeracao = obterDataAtualFormatadaParaPDF();
  let iconeSrc = ""; // Inicializa como string vazia ou um placeholder

  try {
    // =========================================================================================
    // CARREGAR O CONTEÚDO BASE64 DO ARQUIVO
    // Ajuste o caminho se a sua pasta 'assets' não estiver na raiz do app.getAppPath()
    // Ex: se estiver em 'renderer/assets/icon/pitstop_icon.b64'
    const caminhoRelativoIcone = 'renderer/assets/icon/pitstop_icon.b64'; // Caminho RELATIVO à raiz do app
    const base64CompletaDoIcone = await window.electronAPI.lerArquivoBase64(caminhoRelativoIcone);

    if (base64CompletaDoIcone) {
      iconeSrc = base64CompletaDoIcone;
    } else {
      console.warn(`Ícone não carregado de: ${caminhoRelativoIcone}. Usando placeholder ou sem ícone.`);
      // Você pode definir um ícone placeholder em Base64 aqui se quiser, ou deixar vazio.
      // iconeSrc = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // Pixel transparente
    }
    // =========================================================================================

    const tabelaOriginal = document.getElementById('tabela-vendas').cloneNode(true);
    const resumoOriginal = document.getElementById('resumo-relatorio').cloneNode(true);

    // ... (Limpeza de classes e estilos da tabelaOriginal como antes) ...
    tabelaOriginal.querySelectorAll('tr, td, th').forEach(el => {
        el.classList.remove('venda-principal', 'item-venda', 'sem-itens');
        el.style.cssText = ''; 
    });
    tabelaOriginal.querySelectorAll('td, th').forEach(cell => {
        cell.style.textAlign = 'left';
    });

    const htmlParaPDF = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Vendas - PitStop</title>
          <style>
            /* Seu CSS para o PDF como definido anteriormente */
            body { font-family: Arial, sans-serif; margin: 25px; padding: 0; font-size: 10pt; }
            .pdf-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .pdf-header .logo-img-container { flex-shrink: 0; }
            .pdf-header .logo-img-container img { max-height: 35px; max-width: 120px; }
            .pdf-header .loja-info { flex-grow: 1; text-align: center; }
            .pdf-header .loja-info h1 { margin: 0; font-size: 20px; font-weight: bold; color: #2c3e50; }
            .pdf-header .data-geracao { flex-shrink: 0; }
            .pdf-header .data-geracao p { margin: 0; font-size: 9pt; color: #555; text-align: right; white-space: nowrap; }
            h2.titulo-relatorio { color: #0078d7; text-align: center; margin-top: 0; margin-bottom: 15px; font-size: 16pt; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th, td { border: 1px solid #c0c0c0; padding: 5px 7px; text-align: left; font-size: 9pt; word-wrap: break-word; }
            th { background-color: #0078d7; color: white; font-weight: bold; font-size: 9.5pt; }
            .resumo-pdf { margin-top: 20px; padding: 10px; border: 1px solid #e0e0e0; background-color: #f9f9f9; text-align: right; }
            .resumo-pdf p { margin: 0; font-weight: bold; color: #28a745; font-size: 10pt; }
          </style>
        </head>
        <body>
          <div class="pdf-header">
            <div class="logo-img-container">
              ${iconeSrc ? `<img src="${iconeSrc}" alt="Logo PitStop">` : ''}
            </div>
            <div class="loja-info">
              <h1>PitStop</h1>
            </div>
            <div class="data-geracao">
              <p>Gerado em:<br>${dataGeracao}</p>
            </div>
          </div>
          <h2 class="titulo-relatorio">Relatório de Vendas</h2>
          ${tabelaOriginal.outerHTML}
          <div class="resumo-pdf">
            ${resumoOriginal.innerHTML} 
          </div>
        </body>
      </html>
    `;

    const resultadoExportacao = await window.electronAPI.exportarParaPDF(htmlParaPDF);
    
    if (resultadoExportacao && typeof resultadoExportacao === 'string') { // Supondo que retorna o caminho em sucesso
        exibirMensagem(`PDF salvo com sucesso em: ${resultadoExportacao}`, 'green');
    } else if (resultadoExportacao && resultadoExportacao.cancelled) {
        exibirMensagem('Exportação para PDF cancelada.', 'blue');
    } else {
        // Se resultadoExportacao for null ou um objeto de erro do backend que não foi throw
        // ou se a API exportarParaPDF já trata o erro e retorna uma mensagem
        if (resultadoExportacao && resultadoExportacao.message) {
             exibirMensagem(resultadoExportacao.message, 'red');
        } else {
             exibirMensagem('Falha ao exportar PDF ou exportação cancelada.', 'red');
        }
    }

  } catch (error) {
    console.error('Erro ao gerar ou salvar PDF:', error);
    // Se o backend lançar um erro, ele será pego aqui.
    // A mensagem de erro pode vir do 'throw error' no backend.
    exibirMensagem(error.message || 'Erro ao gerar PDF. Verifique o console.', 'red');
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

// ===================== [ COMPARTILHAR VENDAS NO WHATSAPP ] =====================
document.getElementById('btnCompartilharWhatsApp').addEventListener('click', () => {
  if (!dadosUltimoRelatorio || dadosUltimoRelatorio.length === 0) {
    exibirMensagem('Nenhuma venda carregada para compartilhar. Realize uma busca primeiro.', 'red');
    return;
  }

  dadosUltimoRelatorio.forEach((venda, index) => {
    if (!venda.cliente || !venda.telefone) return;

    const nome = venda.cliente;
    const telefone = venda.telefone.replace(/\D/g, '');
    const status = venda.status_pagamento || 'Sem status';
    const vencimento = formatarData(venda.vencimento);
    const dataVenda = formatarData(venda.data);
    const total = formatarMoeda(venda.total_venda);
    const itens = venda.itens || [];

    let listaProdutos = itens.map((item, i) => {
      const nomeProduto = item.nome_produto || 'Produto';
      const quantidade = item.quantidade || 1;
      const preco = formatarMoeda(item.preco_unitario);
      return `${i + 1}. ${nomeProduto} - ${quantidade}x R$ ${preco}`;
    }).join('\n');

    if (!listaProdutos) {
      listaProdutos = 'Nenhum item vendido.';
    }

    const mensagem = `
Olá ${nome}, tudo bem?

Segue o resumo da sua compra na PitStop:

🧾 Venda realizada em: ${dataVenda}
📅 Vencimento: ${vencimento}
💳 Status: ${status}

📦 Produtos:
${listaProdutos}

💰 Total: R$ ${total}

Agradecemos pela preferência!
PitStop Automação
`.trim();

    const mensagemCodificada = encodeURIComponent(mensagem);
    const link = `https://wa.me/${telefone}?text=${mensagemCodificada}`;

    // Abre com atraso para evitar bloqueio de pop-ups
    setTimeout(() => {
      window.open(link, '_blank');
    }, index * 1000); // 1 segundo entre cada aba
  });

  exibirMensagem('Mensagens preparadas para envio no WhatsApp.', 'green');
});

// ===================== [ NAVEGAÇÃO / LOGOUT ] =====================
function irPara(pagina) {
  window.location.href = pagina;
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = '../login/login.html';
}