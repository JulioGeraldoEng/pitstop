// Verifica login
if (!localStorage.getItem('usuarioLogado')) {
    window.location.href = '../login/login.html';
}

let clienteSelecionadoId = null;
let dadosUltimoRelatorio = []; // Mantendo por enquanto, pode ser removido se não usar para exportar PDF

// Funções auxiliares que estavam faltando (manter)
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
    const btnBuscarRecebimentos = document.getElementById('buscarRecebimentos');
    const btnLimparBuscaRecebimentos = document.getElementById('limparBuscaRecebimentos');
    const tabelaContasReceber = document.getElementById('tabela-contas-receber').querySelector('tbody');
    const mensagem = document.getElementById('mensagem');
    const inputCliente = document.getElementById('cliente');
    const statusRecebimentoInput = document.getElementById('statusRecebimento');
    const dataVencimentoInicioInput = document.getElementById('dataVencimentoInicio');
    const dataVencimentoFimInput = document.getElementById('dataVencimentoFim');
    const dataPagamentoInicioInput = document.getElementById('dataPagamentoInicio');
    const dataPagamentoFimInput = document.getElementById('dataPagamentoFim');

    // Inicialmente oculta a mensagem e a tabela de resultados
    mensagem.style.display = 'none';
    document.getElementById('tabela-recebimentos').style.display = 'none';

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

    // Buscar recebimentos
    btnBuscarRecebimentos.addEventListener('click', async () => {
        const status = statusRecebimentoInput.value;
        const dataVencimentoInicio = dataVencimentoInicioInput.value;
        const dataVencimentoFim = dataVencimentoFimInput.value;
        const dataPagamentoInicio = dataPagamentoInicioInput.value;
        const dataPagamentoFim = dataPagamentoFimInput.value;

        const validarData = (data, campo) => {
            if (data && !/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
                exibirMensagem(`Formato de ${campo} inválido (use dd/mm/aaaa)`, 'red');
                return false;
            }
            return true;
        };

        if (!validarData(dataVencimentoInicio, 'vencimento inicial')) return;
        if (!validarData(dataVencimentoFim, 'vencimento final')) return;
        if (!validarData(dataPagamentoInicio, 'data de pagamento inicial')) return;
        if (!validarData(dataPagamentoFim, 'data de pagamento final')) return;

        try {
            btnBuscarRecebimentos.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
            btnBuscarRecebimentos.disabled = true;
            exibirMensagem('');

            const filtros = {
                cliente: inputCliente.value.trim(),
                status,
                dataVencimentoInicio,
                dataVencimentoFim,
                dataPagamentoInicio,
                dataPagamentoFim
            };

            const recebimentos = await window.electronAPI.buscarRecebimentos(filtros);

            const divTabelaRecebimentos = document.getElementById('tabela-recebimentos');
            divTabelaRecebimentos.style.display = 'none';
            tabelaContasReceber.innerHTML = '';

            if (recebimentos && recebimentos.length > 0) {
                recebimentos.forEach(recebimento => {
                    const tr = document.createElement('tr');
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
                        <td><button class="btn-acao">Ações</button></td>
                    `;
                    tabelaContasReceber.appendChild(tr);
                });

                // Exibir a tabela
                divTabelaRecebimentos.style.display = 'block';
                exibirMensagem(`${recebimentos.length} contas a receber encontradas.`, 'green');

                // Preencher dados para PDF (adaptar se necessário, ou remover)
                dadosUltimoRelatorio = recebimentos; // Atualiza com os dados de recebimento
                // Se você quiser exportar um PDF de recebimentos, precisará criar uma função preencherPDFRecebimentos
                // e adaptar os dados aqui.
                // preencherPDFRecebimentos(recebimentos, { ...filtros ... });

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

    // Limpar filtros de recebimentos
    btnLimparBuscaRecebimentos.addEventListener('click', () => {
        limparRelatorioRecebimentos();
    });
});

function limparRelatorioRecebimentos() {
    document.getElementById('cliente').value = '';
    document.getElementById('statusRecebimento').value = '';
    document.getElementById('dataVencimentoInicio').value = '';
    document.getElementById('dataVencimentoFim').value = '';
    document.getElementById('dataPagamentoInicio').value = '';
    document.getElementById('dataPagamentoFim').value = '';
    document.getElementById('tabela-contas-receber').querySelector('tbody').innerHTML = '';
    exibirMensagem('');
    document.getElementById('tabela-recebimentos').style.display = 'none';
    clienteSelecionadoId = null;
}

// Autocomplete de clientes (manter)
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

// Oculta sugestões ao clicar fora (manter)
document.addEventListener('click', (e) => {
    if (!sugestoes.contains(e.target) && e.target !== inputCliente) {
        sugestoes.innerHTML = '';
        sugestoes.style.display = 'none';
    }
});

// Exibe mensagem colorida (manter)
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