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