// Espera o DOM carregar completamente antes de executar o script
document.addEventListener('DOMContentLoaded', () => {
    const tabelaSelecionada = document.getElementById('tabela-selecionada');

    // Associa os eventos de busca aos gatilhos (botão e mudança no select)
    document.getElementById('btnBuscar').addEventListener('click', carregarTabelaSelecionada);
    tabelaSelecionada.addEventListener('change', carregarTabelaSelecionada);

    // Configura o gerenciador de eventos para os botões de ação na tabela
    configurarEventosDeAcaoDaTabela();
    
    // Carrega a tabela selecionada por padrão ao iniciar
    carregarTabelaSelecionada(); 
});

/**
 * Carrega e exibe a tabela selecionada no dropdown, com todas as linhas em modo de edição.
 */
async function carregarTabelaSelecionada() {
    const tabela = document.getElementById('tabela-selecionada').value;
    const thead = document.getElementById('cabecalho-tabela');
    const tbody = document.querySelector('#tabela-dados tbody');

    // Validações para garantir que os elementos do DOM existem
    if (!tabela || !thead || !tbody) {
        console.error("Elementos essenciais da tabela não foram encontrados no DOM.");
        return;
    }

    thead.innerHTML = '';
    tbody.innerHTML = `<tr><td colspan="100%">Carregando dados...</td></tr>`;

    try {
        const dados = await window.electronAPI.buscarDados(tabela);

        // Limpa novamente para garantir que a mensagem de "carregando" suma
        tbody.innerHTML = ''; 

        if (!dados || dados.length === 0) {
            thead.innerHTML = ''; // Limpa o cabeçalho se não houver dados
            tbody.innerHTML = `<tr><td colspan="100%">Nenhum registro encontrado para a tabela '${tabela}'.</td></tr>`;
            return;
        }

        // --- Cria os Cabeçalhos da Tabela Dinamicamente ---
        const campos = Object.keys(dados[0]); // Pega as chaves (nomes das colunas) do primeiro registro
        campos.forEach(campo => {
            const th = document.createElement('th');
            // Formata o nome do campo para exibição (ex: 'data_vencimento' -> 'Data vencimento')
            th.textContent = campo.charAt(0).toUpperCase() + campo.slice(1).replace(/_/g, ' ');
            thead.appendChild(th);
        });
        const thAcoes = document.createElement('th');
        thAcoes.textContent = 'Ações';
        thead.appendChild(thAcoes);

        // --- Cria as Linhas da Tabela já em Modo de Edição ---
        dados.forEach(dado => {
            const tr = document.createElement('tr');
            tr.dataset.id = dado.id; // Armazena o ID na linha para fácil acesso
            tr.dataset.tabela = tabela; // Armazena o nome da tabela

            campos.forEach(campo => {
                const td = document.createElement('td');
                const valor = dado[campo] === null ? '' : dado[campo];
                // O campo 'id' será um input desabilitado para não ser alterado
                const desabilitado = (campo.toLowerCase() === 'id') ? 'disabled' : '';
                td.innerHTML = `<input type="text" class="form-control-tabela" value="${valor}" data-coluna="${campo}" ${desabilitado}>`;
                tr.appendChild(td);
            });

            // Adiciona a célula com os botões de ação 'Salvar' e 'Excluir'
            const tdAcoes = document.createElement('td');
            tdAcoes.innerHTML = `
                <button class="btn-salvar" title="Salvar Alterações">
                    <i class="fas fa-save"></i>
                </button>
                <button class="btn-remover" title="Excluir Registro">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            tr.appendChild(tdAcoes);
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(`Erro ao carregar dados da tabela ${tabela}:`, error);
        thead.innerHTML = ''; // Limpa o cabeçalho em caso de erro
        tbody.innerHTML = `<tr><td colspan="100%">Erro ao carregar dados da tabela <strong>${tabela}</strong>.</td></tr>`;
    }
}

/**
 * Configura um único listener no corpo da tabela para gerenciar cliques nos botões de ação.
 */
function configurarEventosDeAcaoDaTabela() {
    const tbody = document.querySelector('#tabela-dados tbody');
    if (!tbody) return;

    tbody.addEventListener('click', async (event) => {
        const botaoClicado = event.target.closest('button');
        if (!botaoClicado) return; // Se o clique não foi em um botão, sai da função

        const linha = botaoClicado.closest('tr');
        if (!linha) return; // Segurança extra

        const tabela = linha.dataset.tabela;
        const id = linha.dataset.id;

        // Lógica para o botão SALVAR
        if (botaoClicado.classList.contains('btn-salvar')) {
            const dadoAtualizado = { id: parseInt(id, 10) };
            
            // Coleta os valores de todos os inputs da linha
            linha.querySelectorAll('input[data-coluna]').forEach(input => {
                const coluna = input.dataset.coluna;
                dadoAtualizado[coluna] = input.value;
            });

            console.log(`Salvando dados para a tabela '${tabela}':`, dadoAtualizado);
            
            try {
                const resultado = await window.electronAPI.atualizarDado({ tabela, dado: dadoAtualizado });
                if (resultado && resultado.success) {
                    await window.electronAPI.showDialog({ type: 'info', title: 'Sucesso', message: 'Registro atualizado com sucesso!' });
                } else {
                    await window.electronAPI.showDialog({ type: 'error', title: 'Erro', message: `Falha ao atualizar o registro: ${resultado ? resultado.message : 'Erro desconhecido'}` });
                }
            } catch (error) {
                console.error("Erro no IPC ao atualizar dado:", error);
                await window.electronAPI.showDialog({ type: 'error', title: 'Erro Crítico', message: `Ocorreu um erro ao salvar: ${error.message}` });
            }
            carregarTabelaSelecionada(); // Recarrega a tabela para confirmar a alteração
        }

        // Lógica para o botão EXCLUIR
        if (botaoClicado.classList.contains('btn-remover')) {
            if (confirm(`Tem certeza que deseja excluir o registro com ID ${id} da tabela '${tabela}'?`)) {
                try {
                    await window.electronAPI.excluirDado({ tabela, id });
                    linha.remove(); // Remove a linha da interface imediatamente para feedback visual
                    await window.electronAPI.showDialog({ type: 'info', title: 'Sucesso', message: 'Registro excluído!' });
                } catch(error) {
                    console.error("Erro no IPC ao excluir dado:", error);
                    await window.electronAPI.showDialog({ type: 'error', title: 'Erro', message: `Ocorreu um erro ao excluir: ${error.message}` });
                }
            }
        }
    });
}