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