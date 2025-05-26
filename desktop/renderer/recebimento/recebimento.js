// Verifica login
if (!localStorage.getItem('usuarioLogado')) {
    window.location.href = '../login/login.html';
}

let clienteSelecionadoId = null;
// let dadosUltimoRelatorio = []; // Removido pois não foi usado na última versão

// Funções auxiliares
function converterParaNumero(valor) {
    if (valor === null || valor === undefined || valor === '') return 0; // Trata string vazia como 0
    if (typeof valor === 'number') {
        return valor;
    }
    const valorLimpo = valor.toString()
        .replace(/\./g, '')       // Remove pontos de milhar
        .replace(',', '.');      // Substitui vírgula decimal por ponto
    const numero = parseFloat(valorLimpo);
    return isNaN(numero) ? 0 : numero;
}

function formatarMoeda(valor) {
    const numero = converterParaNumero(valor);
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Função para formatar data para exibição (dd/mm/aaaa)
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


// Função auxiliar para formatar data para ISO (YYYY-MM-DD) para envio ao backend
function formatarDataParaISO(data) {
    if (!data || !/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return null;
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
}

// Função para máscara de data (dd/mm/aaaa)
function formatarInputDataComBarras(event) {
    let valor = event.target.value.replace(/\D/g, ''); // Remove não dígitos
    const len = valor.length;

    if (len > 8) valor = valor.substring(0, 8); // Limita a 8 dígitos (ddmmyyyy)

    if (len > 4) { // Acima de ddmmy
        valor = `${valor.substring(0, 2)}/${valor.substring(2, 4)}/${valor.substring(4)}`;
    } else if (len > 2) { // Acima de dd
        valor = `${valor.substring(0, 2)}/${valor.substring(2)}`;
    }
    event.target.value = valor;
}

// Função para máscara de moeda (para inputs)
function formatarInputMoeda(event) {
    let valor = event.target.value.replace(/\D/g, '');
    if (valor === "") {
        event.target.value = "";
        return;
    }
    
    // Converte para número (ex: "12345" -> 123.45)
    valor = (parseFloat(valor) / 100).toFixed(2); 
    
    // Formata para o padrão BRL (ex: "123.45" -> "123,45")
    const partes = valor.split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // Milhar
    event.target.value = partes.join(',');
}


document.addEventListener('DOMContentLoaded', async () => {
    const btnBuscarRecebimentos = document.getElementById('buscarRecebimentos');
    const btnLimparBuscaRecebimentos = document.getElementById('limparBuscaRecebimentos');
    const tabelaContasReceber = document.getElementById('tabela-contas-receber').querySelector('tbody');
    const mensagem = document.getElementById('mensagem');
    const inputCliente = document.getElementById('cliente');
    const statusRecebimentoInput = document.getElementById('statusRecebimento');

    mensagem.style.display = 'none';
    document.getElementById('tabela-recebimentos').style.display = 'none';

    btnBuscarRecebimentos.addEventListener('click', async () => {
        // (código de busca existente, sem alterações nesta parte)
        const status = statusRecebimentoInput.value;
        try {
            btnBuscarRecebimentos.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
            btnBuscarRecebimentos.disabled = true;
            exibirMensagem('');
            const divTabelaRecebimentos = document.getElementById('tabela-recebimentos');
            divTabelaRecebimentos.style.display = 'none';

            const filtros = {
                cliente: inputCliente.value.trim(),
                status
            };
            const recebimentos = await window.electronAPI.buscarRecebimentos(filtros);
            tabelaContasReceber.innerHTML = '';

            if (recebimentos && recebimentos.length > 0) {
                recebimentos.forEach(recebimento => {
                    const tr = document.createElement('tr');
                    tr.dataset.valorTotal = recebimento.valor_total; // Armazena o valor total na linha
                    tr.innerHTML = `
                        <td>${recebimento.id || '-'}</td>
                        <td>${recebimento.venda_id || '-'}</td>
                        <td>${recebimento.cliente || '-'}</td>
                        <td>${formatarData(recebimento.data_vencimento)}</td>
                        <td>R$ ${formatarMoeda(recebimento.valor_total)}</td>
                        <td>R$ ${formatarMoeda(recebimento.valor_pago)}</td>
                        <td>${formatarData(recebimento.data_pagamento)}</td>
                        <td>${recebimento.status || '-'}</td>
                        <td>${recebimento.forma_pagamento || '-'}</td>
                        <td><button class="btn-acao" data-recebimento-id="${recebimento.id}">Ações</button></td>
                    `;
                    tabelaContasReceber.appendChild(tr);
                });
                 divTabelaRecebimentos.style.display = 'block';
                 exibirMensagem(`${recebimentos.length} contas a receber encontradas.`, 'green');
            } else {
                exibirMensagem('Nenhuma conta a receber encontrada com os filtros informados.', 'blue');
            }
        } catch (error) {
            console.error('Erro ao buscar recebimentos:', error);
            exibirMensagem('Erro ao conectar com o banco de dados. Verifique sua conexão.', 'red');
        } finally {
            btnBuscarRecebimentos.innerHTML = '<i class="fas fa-search"></i> Buscar';
            btnBuscarRecebimentos.disabled = false;
        }
    });

    tabelaContasReceber.addEventListener('click', async (event) => {
        if (event.target.classList.contains('btn-acao')) {
            const recebimentoId = event.target.dataset.recebimentoId;
            if (recebimentoId) {
                const botaoAcoes = event.target;
                const linhaTabela = botaoAcoes.closest('tr');
                const colunaStatus = linhaTabela.querySelector('td:nth-child(8)');
                const colunaValorPago = linhaTabela.querySelector('td:nth-child(6)');
                
                const valorTotalOriginal = parseFloat(linhaTabela.dataset.valorTotal || 0);
                const valorPagoAtualTexto = colunaValorPago.textContent.replace('R$', '').trim();
                const statusAtualTextoOriginal = colunaStatus.textContent.trim();
                const statusAtualParaComparacao = statusAtualTextoOriginal.toLowerCase();

                // Limpar células para edição
                colunaStatus.innerHTML = '';
                colunaValorPago.innerHTML = '';

                // --- Input para Valor Pago ---
                const inputValorPago = document.createElement('input');
                inputValorPago.type = 'text';
                inputValorPago.classList.add('input-valor-pago-edit'); // Para estilização e seleção
                inputValorPago.value = formatarMoeda(valorPagoAtualTexto); // Formata para exibição no input
                inputValorPago.addEventListener('input', formatarInputMoeda); // Aplica máscara de moeda
                colunaValorPago.appendChild(inputValorPago);
                
                const spanValorRestante = document.createElement('span');
                spanValorRestante.classList.add('valor-restante-info');
                spanValorRestante.style.display = 'block'; // Para que apareça abaixo
                spanValorRestante.style.fontSize = '0.8em';
                spanValorRestante.style.marginTop = '5px';

                const calcularEExibirRestante = () => {
                    const valorPagoEditado = converterParaNumero(inputValorPago.value);
                    const restante = valorTotalOriginal - valorPagoEditado;
                    if (restante < 0) {
                         spanValorRestante.textContent = `Troco: R$ ${formatarMoeda(Math.abs(restante))}`;
                         spanValorRestante.style.color = 'blue';
                    } else if (restante === 0 && valorPagoEditado > 0) { // Se pagou tudo
                        spanValorRestante.textContent = `Total pago. Restante: R$ ${formatarMoeda(restante)}`;
                        spanValorRestante.style.color = 'green';
                    } else if (valorPagoEditado > 0 && valorPagoEditado < valorTotalOriginal) { // Pago parcial
                        spanValorRestante.textContent = `Restante: R$ ${formatarMoeda(restante)}`;
                         spanValorRestante.style.color = 'orange';
                    } else { // Nenhum valor pago ou valor inválido
                        spanValorRestante.textContent = `Restante: R$ ${formatarMoeda(valorTotalOriginal)}`;
                        spanValorRestante.style.color = 'red';
                    }
                };
                inputValorPago.addEventListener('keyup', calcularEExibirRestante); // ou 'input'
                colunaValorPago.appendChild(spanValorRestante);
                calcularEExibirRestante(); // Calcula na primeira vez


                // --- Dropdown para Status ---
                const dropdownContainer = document.createElement('div');
                dropdownContainer.classList.add('status-dropdown-container');
                const selectStatus = document.createElement('select');
                selectStatus.classList.add('status-dropdown');
                selectStatus.innerHTML = `
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="atrasado">Atrasado</option>
                    <option value="cancelado">Cancelado</option>
                `;
                selectStatus.value = statusAtualParaComparacao;
                dropdownContainer.appendChild(selectStatus);

                let dataPagamentoInput = null;
                let formaPagamentoSelect = null;

                const atualizarCamposPagamento = (statusSelecionado) => {
                    const dataInputExistente = dropdownContainer.querySelector('input[type="text"].data-pagamento-edit');
                    const formaSelectExistenteAntigo = dropdownContainer.querySelector('select.forma-pagamento-edit');
                    
                    if (dataInputExistente) dataInputExistente.remove();
                    if (formaSelectExistenteAntigo) formaSelectExistenteAntigo.remove();
                    dataPagamentoInput = null;
                    formaPagamentoSelect = null;

                    if (statusSelecionado.toLowerCase() === 'pago') {
                        inputValorPago.value = formatarMoeda(valorTotalOriginal); // Auto-preenche valor pago com total
                        calcularEExibirRestante(); // Recalcula restante

                        dataPagamentoInput = document.createElement('input');
                        dataPagamentoInput.type = 'text';
                        dataPagamentoInput.classList.add('data-pagamento-edit');
                        dataPagamentoInput.placeholder = 'Data Pagamento (dd/mm/aaaa)';
                        dataPagamentoInput.maxLength = 10;
                        dataPagamentoInput.addEventListener('input', formatarInputDataComBarras); // Máscara de data

                        formaPagamentoSelect = document.createElement('select');
                        formaPagamentoSelect.classList.add('forma-pagamento-edit');
                        formaPagamentoSelect.innerHTML = `
                            <option value="">Selecione Forma</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="cartao_credito">Cartão de Crédito</option>
                            <option value="cartao_debito">Cartão de Débito</option>
                            <option value="pix">Pix</option>
                            <option value="boleto">Boleto</option>
                        `;
                        dropdownContainer.appendChild(dataPagamentoInput);
                        dropdownContainer.appendChild(formaPagamentoSelect);
                    }
                };

                selectStatus.addEventListener('change', (e) => {
                    atualizarCamposPagamento(e.target.value);
                });
                atualizarCamposPagamento(selectStatus.value);
                colunaStatus.appendChild(dropdownContainer);
                
                const novoBotaoSalvar = botaoAcoes.cloneNode(true);
                novoBotaoSalvar.textContent = 'Salvar';
                botaoAcoes.parentNode.replaceChild(novoBotaoSalvar, botaoAcoes);

                novoBotaoSalvar.onclick = async () => {
                    const novoStatus = selectStatus.value;
                    const dataPagamentoValor = dataPagamentoInput ? dataPagamentoInput.value : null;
                    const formaPagamentoValor = formaPagamentoSelect ? formaPagamentoSelect.value : null;
                    
                    let valorPagoParaEnviar = converterParaNumero(inputValorPago.value);

                    if (novoStatus.toLowerCase() === 'pago') {
                        valorPagoParaEnviar = valorTotalOriginal; // Se status é 'pago', valor pago é o total
                        if (!dataPagamentoValor) {
                            exibirMensagem("Para status 'Pago', informe a Data de Pagamento.", 'red'); return;
                        }
                        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataPagamentoValor)) {
                            exibirMensagem("Formato de Data de Pagamento inválido. Use dd/mm/aaaa.", 'red'); return;
                        }
                        if (!formaPagamentoValor) {
                            exibirMensagem("Para status 'Pago', selecione a Forma de Pagamento.", 'red'); return;
                        }
                    } else if (novoStatus.toLowerCase() !== 'cancelado' && valorPagoParaEnviar > valorTotalOriginal) {
                        exibirMensagem("Valor pago não pode ser maior que o valor total, a menos que o status seja 'Pago' (para troco).", 'red');
                        return;
                    }


                    const resultado = await window.electronAPI.atualizarStatusRecebimento({
                        recebimentoId: parseInt(recebimentoId),
                        novoStatus: novoStatus.toLowerCase(),
                        dataPagamento: formatarDataParaISO(dataPagamentoValor),
                        formaPagamento: formaPagamentoValor,
                        novoValorPago: valorPagoParaEnviar // Envia o novo valor pago
                    });

                    if (resultado && resultado.success) {
                        exibirMensagem("Status do recebimento atualizado com sucesso!", 'green');
                        document.getElementById('buscarRecebimentos').click();
                    } else {
                        exibirMensagem(resultado.message || "Erro ao atualizar o status do recebimento.", 'red');
                    }
                };
            }
        }
    });

    btnLimparBuscaRecebimentos.addEventListener('click', () => {
        limparRelatorioRecebimentos();
    });
});

function limparRelatorioRecebimentos() {
    document.getElementById('cliente').value = '';
    document.getElementById('statusRecebimento').value = '';
    document.getElementById('tabela-contas-receber').querySelector('tbody').innerHTML = '';
    exibirMensagem('');
    document.getElementById('tabela-recebimentos').style.display = 'none';
    clienteSelecionadoId = null;
}

// Autocomplete e outras funções (manter o que já estava funcionando e foi corrigido)
const inputClienteElement = document.getElementById('cliente'); // Usar a variável correta
const sugestoesClienteElement = document.getElementById('sugestoesCliente');

function posicionarSugestoes(input, box) {
    const rect = input.getBoundingClientRect();
    box.style.left = `${rect.left + window.scrollX}px`;
    box.style.top = `${rect.bottom + window.scrollY}px`;
    box.style.width = `${rect.width}px`;
    box.style.display = 'block';
}

inputClienteElement.addEventListener('input', async function() {
    clienteSelecionadoId = null;
    const termo = this.value.trim();
    sugestoesClienteElement.innerHTML = '';
    sugestoesClienteElement.style.display = 'none';

    if (termo.length < 2) return;
    try {
        const resultados = await window.electronAPI.buscarClientesPorNome(termo);
        if (resultados.length === 0) {
            const div = document.createElement('div');
            div.textContent = 'Nenhum cliente encontrado';
            sugestoesClienteElement.appendChild(div);
        } else {
            resultados.forEach(cliente => {
                const div = document.createElement('div');
                div.textContent = `${cliente.nome} (${cliente.observacao || 'Sem observação'})`;
                div.addEventListener('click', () => {
                    this.value = cliente.nome;
                    clienteSelecionadoId = cliente.id;
                    sugestoesClienteElement.innerHTML = '';
                    sugestoesClienteElement.style.display = 'none';
                });
                sugestoesClienteElement.appendChild(div);
            });
        }
        posicionarSugestoes(this, sugestoesClienteElement);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
    }
});

document.addEventListener('click', (e) => {
    if (sugestoesClienteElement && !sugestoesClienteElement.contains(e.target) && e.target !== inputClienteElement) {
        sugestoesClienteElement.innerHTML = '';
        sugestoesClienteElement.style.display = 'none';
    }
});

function exibirMensagem(texto, cor) {
    const mensagemElement = document.getElementById('mensagem');
    if (mensagemElement) {
        if (texto) {
            mensagemElement.textContent = texto;
            mensagemElement.style.color = cor;
            mensagemElement.style.display = 'block';
        } else {
            mensagemElement.textContent = '';
            mensagemElement.style.display = 'none';
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