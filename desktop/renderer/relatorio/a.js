document.getElementById('exportarPdf').addEventListener('click', async (e) => {
  e.preventDefault();

  if (dadosUltimoRelatorio.length === 0) {
    exibirMensagem('Nenhum dado disponível para exportar. Realize uma busca primeiro.', 'red');
    return;
  }

  const dataGeracao = obterDataAtualFormatadaParaPDF(); // Certifique-se que esta função está definida

  // =========================================================================================
  // COLE A SUA STRING BASE64 COMPLETA AQUI
  // =========================================================================================  
  const iconeSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...';

  try {
    // ... (o resto da sua lógica de clonar tabela e resumo) ...
    const tabelaOriginal = document.getElementById('tabela-vendas').cloneNode(true);
    const resumoOriginal = document.getElementById('resumo-relatorio').cloneNode(true);

    // ... (Limpeza de classes e estilos inline da tabelaOriginal) ...
    tabelaOriginal.querySelectorAll('tr, td, th').forEach(el => {
        el.classList.remove('venda-principal', 'item-venda', 'sem-itens');
        el.style.cssText = ''; 
    });
    tabelaOriginal.querySelectorAll('td, th').forEach(cell => cell.style.textAlign = 'left');


    // Construção do HTML para o PDF
    const htmlParaPDF = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Vendas - PitStop</title>
          <style>
            /* Seus estilos para o PDF aqui, como no exemplo anterior */
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              padding: 0;
              font-size: 10pt;
            }
            .pdf-header-custom {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1.5px solid #444;
              padding-bottom: 12px;
              margin-bottom: 25px;
            }
            .pdf-header-custom img.logo-pdf {
              max-height: 45px;
              max-width: 150px;
            }
            .pdf-header-custom .titulo-loja-pdf {
              font-size: 22px;
              font-weight: bold;
              color: #2c3e50;
              text-align: center;
              flex-grow: 1;
              margin: 0 15px;
            }
            .pdf-header-custom .data-geracao-pdf {
              font-size: 9pt;
              color: #555;
              text-align: right;
              white-space: nowrap;
            }
            h2.titulo-relatorio-pdf {
              color: #34495e;
              margin: 0 0 18px 0;
              text-align: center;
              font-size: 16pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 0;
            }
            th, td {
              border: 1px solid #c9c9c9;
              padding: 6px 8px;
              text-align: left;
              word-wrap: break-word;
            }
            th {
              background-color: #0078d7;
              color: white;
              font-weight: bold;
              font-size: 9.5pt;
            }
            td {
                font-size: 9pt;
            }
            .resumo-pdf {
              margin-top: 25px;
              padding: 12px;
              border: 1px solid #e0e0e0;
              background-color: #fdfdfd;
              font-size: 10pt;
              text-align: right;
            }
            .resumo-pdf p {
              margin: 0;
              font-weight: bold;
              color: #28a745;
            }
          </style>
        </head>
        <body>
          <div class="pdf-header-custom">
            <img src="${iconeSrc}" alt="Logo PitStop" class="logo-pdf">
            <div class="titulo-loja-pdf">PitStop</div>
            <div class="data-geracao-pdf">Gerado em:<br>${dataGeracao}</div>
          </div>
          <h2 class="titulo-relatorio-pdf">Relatório de Vendas</h2>
          ${tabelaOriginal.outerHTML}
          <div class="resumo-pdf">
            ${resumoOriginal.innerHTML}
          </div>
        </body>
      </html>
    `;

    const caminho = await window.electronAPI.exportarParaPDF(htmlParaPDF);
    exibirMensagem(`PDF salvo com sucesso em: ${caminho}`, 'green');

  } catch (error) {
    console.error('Erro ao salvar PDF:', error);
    exibirMensagem('Erro ao salvar PDF. Verifique o console para detalhes.', 'red');
  }
});