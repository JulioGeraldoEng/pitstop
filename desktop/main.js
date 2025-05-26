const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Caminho absoluto para a pasta 'db' e o arquivo do banco
const pastaDB = path.join(__dirname, 'db');
const dbPath = path.join(pastaDB, 'pitstop.db');

// Garante que a pasta 'db' exista antes de tentar acessar o arquivo do banco
if (!fs.existsSync(pastaDB)) {
  fs.mkdirSync(pastaDB, { recursive: true });
}

const dbExiste = fs.existsSync(dbPath);
const db = new sqlite3.Database(dbPath);


// Variável para armazenar a janela principal
let mainWindow;

// Função de inicialização do banco de dados (chamada apenas uma vez)
function initializeDatabase() {
  if (!dbExiste) {
    console.log("🔧 Banco não encontrado. Criando novo banco de dados...");
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL UNIQUE,
        senha TEXT NOT NULL
      )`);
      db.run(`INSERT INTO usuarios (usuario, senha) VALUES ('admin', '1234')`);
      db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT UNIQUE,
        observacao TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        quantidade INTEGER DEFAULT 0
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS vendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        data TEXT NOT NULL,
        data_vencimento TEXT,
        total REAL NOT NULL,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS itens_venda (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venda_id INTEGER,
        produto_id INTEGER,
        nome_produto TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        preco_unitario REAL NOT NULL,
        FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS recebimentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venda_id INTEGER,
        data_vencimento TEXT,
        valor_total REAL NOT NULL,
        valor_pago REAL DEFAULT 0,
        data_pagamento TEXT,
        status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'pago', 'atrasado', 'cancelado'
        forma_pagamento TEXT,
        FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE
      )`);
      console.log("✅ Banco criado com sucesso.");
    });
  } else {
    console.log("📂 Banco já existente. Nenhuma alteração feita.");
  }
}

// Função para criar a janela principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 640,
    icon: path.join(__dirname, 'renderer', 'assets', 'icon', 'pitstop_icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Carrega a página de login ou dashboard
  mainWindow.loadFile('renderer/login/login.html'); // Certifique-se de que este é o caminho correto

  // Abre as DevTools (opcional)
  // mainWindow.webContents.openDevTools();

  // Limpa a referência à janela quando ela é fechada
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}


// ===========================================================================
// IPC Main Handlers - REGISTRAR APENAS UMA VEZ AO INICIAR O APP
// ===========================================================================

// Login
ipcMain.handle('login-attempt', async (event, { username, password }) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT id FROM usuarios WHERE usuario = ? AND senha = ?",
      [username, password],
      (err, row) => {
        if (err) {
          console.error('Erro no banco de dados:', err);
          return resolve({
            success: false,
            message: 'Erro no servidor. Tente novamente.'
          });
        }

        if (row) {
          resolve({
            success: true,
            userId: row.id
          });
        } else {
          resolve({
            success: false,
            message: 'Usuário ou senha incorretos'
          });
        }
      }
    );
  });
});

// Handler para autocomplete de clientes por nome
ipcMain.handle('buscar-clientes-por-nome', async (event, termo) => {
  return new Promise((resolve) => {
    db.all("SELECT id, nome, observacao FROM clientes WHERE nome LIKE ?", [`%${termo}%`], (err, rows) => {
      resolve(err ? [] : rows);
    });
  });
});

ipcMain.handle('salvar-cliente', async (event, cliente) => {
  return new Promise((resolve, reject) => {
    const { nome, telefone, observacao } = cliente;
    db.run(`INSERT INTO clientes (nome, telefone, observacao) VALUES (?, ?, ?)`,
      [nome, telefone, observacao],
      function (err) {
        if (err) {
          console.error('Erro ao salvar cliente:', err.message);
          return reject({ success: false, message: 'Erro ao salvar cliente.' });
        }
        resolve({ success: true, id: this.lastID, message: 'Cliente salvo com sucesso!' });
      }
    );
  });
});

ipcMain.handle('get-clientes', async () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT id, nome, telefone, observacao FROM clientes ORDER BY nome`, (err, rows) => {
      if (err) {
        console.error('Erro ao buscar todos os clientes:', err.message);
        return reject([]);
      }
      resolve(rows);
    });
  });
});

// Atualizar cliente
ipcMain.handle('atualizar-cliente', async (event, cliente) => {
  return new Promise((resolve, reject) => {
    const { id, nome, telefone, observacao } = cliente;
    const query = `UPDATE clientes SET nome = ?, telefone = ?, observacao = ? WHERE id = ?`;
    db.run(query, [nome, telefone, observacao, id], function (err) {
      if (err) {
        console.error('Erro ao atualizar cliente:', err.message);
        return resolve({ success: false, message: 'Erro ao atualizar cliente.' });
      }
      resolve({ success: this.changes > 0 });
    });
  });
});

// Excluir cliente
ipcMain.handle('excluir-cliente', async (event, id) => {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM clientes WHERE id = ?`;
    db.run(query, [id], function (err) {
      if (err) {
        console.error('Erro ao excluir cliente:', err.message);
        return resolve({ success: false, message: 'Erro ao excluir cliente.' });
      }
      resolve({ success: this.changes > 0 });
    });
  });
});




// Produtos
ipcMain.handle('buscar-produtos-por-nome', async (event, termo) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT id, nome, preco FROM produtos WHERE nome LIKE ? LIMIT 10`;
    db.all(query, [`%${termo}%`], (err, rows) => {
      if (err) {
        console.error('Erro ao buscar produtos:', err.message);
        return reject([]);
      }
      resolve(rows);
    });
  });
});

ipcMain.handle('salvar-produto', async (event, produto) => {
  return new Promise((resolve, reject) => {
    const { nome, preco, quantidade } = produto;
    db.run(`INSERT INTO produtos (nome, preco, quantidade) VALUES (?, ?, ?)`,
      [nome, preco, quantidade],
      function (err) {
        if (err) {
          console.error('Erro ao salvar produto:', err.message);
          return reject({ success: false, message: 'Erro ao salvar produto.' });
        }
        resolve({ success: true, id: this.lastID, message: 'Produto salvo com sucesso!' });
      }
    );
  });
});

ipcMain.handle('buscar-todos-produtos', async () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT id, nome, preco, quantidade FROM produtos ORDER BY nome`, (err, rows) => {
      if (err) {
        console.error('Erro ao buscar todos os produtos:', err.message);
        return reject([]); // ou resolve([]) se preferir
      }
      resolve(rows);
    });
  });
});

ipcMain.handle('atualizar-produto', async (event, produto) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('UPDATE produtos SET nome = ?, preco = ?, quantidade = ? WHERE id = ?');
    stmt.run([produto.nome, produto.preco, produto.quantidade, produto.id], function (err) {
      if (err) {
        console.error('Erro ao atualizar produto:', err.message);
        return resolve({ success: false, message: 'Erro ao atualizar produto.' });
      }
      resolve({ success: this.changes > 0 });
    });
  });
});

ipcMain.handle('excluir-produto', async (event, id) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('DELETE FROM produtos WHERE id = ?');
    stmt.run(id, function (err) {
      if (err) {
        console.error('Erro ao excluir produto:', err.message);
        return resolve({ success: false, message: 'Erro ao excluir produto.' });
      }
      resolve({ success: this.changes > 0 });
    });
  });
});

// Registrar venda
ipcMain.handle('registrar-venda', async (event, dadosVenda) => {
    return new Promise((resolve, reject) => {
        const { cliente_id, total, data: dataLocal, vencimento: vencimentoLocal, itens } = dadosVenda;

        const formatarVencimentoParaDB = (dataString) => {
            if (!dataString || dataString.length !== 10 || dataString.indexOf('/') === -1) return null;
            const [dia, mes, ano] = dataString.split('/');
            return `${ano}-${mes}-${dia}`;
        };

        const vencimentoFormatadoLocal = vencimentoLocal ? formatarVencimentoParaDB(vencimentoLocal) : null;

        // Converter data da venda para UTC
        const dataUTC = dataLocal ? new Date(dataLocal).toISOString() : null;

        // Converter data de vencimento para UTC (se existir)
        const vencimentoUTC = vencimentoFormatadoLocal ? new Date(vencimentoFormatadoLocal + "T00:00:00Z").toISOString().split('T')[0] : null;


        db.run(`INSERT INTO vendas (cliente_id, data, data_vencimento, total) VALUES (?, ?, ?, ?)`,
            [cliente_id, dataUTC, vencimentoUTC, total],
            function (err) {
                if (err) {
                    console.error('Erro ao inserir venda:', err.message);
                    return resolve({ success: false, message: 'Erro ao registrar venda.' });
                }

                const venda_id = this.lastID;

                // Inserir registro na tabela de recebimentos
                db.run(`INSERT INTO recebimentos (venda_id, data_vencimento, valor_total) VALUES (?, ?, ?)`,
                    [venda_id, vencimentoUTC, total],
                    function (errRecebimento) {
                        if (errRecebimento) {
                            console.error('Erro ao inserir dados na tabela de recebimentos:', errRecebimento.message);
                            console.log('➡️ Erro ao inserir recebimento para a venda ID:', venda_id, errRecebimento); // ADICIONADO
                            // Você pode optar por desfazer a inserção da venda aqui, dependendo da sua lógica de negócio
                            return resolve({ success: false, message: 'Erro ao registrar recebimento.' });
                        }
                        console.log('➡️ Recebimento registrado com sucesso para a venda ID:', venda_id); // ADICIONADO
                    }
                );

                let erroInterno = false;
                let inseridos = 0;

                const stmtItensVenda = db.prepare(`INSERT INTO itens_venda (venda_id, produto_id, nome_produto, quantidade, preco_unitario) VALUES (?, ?, ?, ?, ?)`);
                const stmtUpdateEstoque = db.prepare(`UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?`);
                const stmtBuscarNomeProduto = db.prepare(`SELECT nome FROM produtos WHERE id = ?`);

                for (const item of itens) {
                    stmtBuscarNomeProduto.get(item.produto_id, (errNome, rowNome) => {
                        if (errNome) {
                            console.error('Erro ao buscar nome do produto:', errNome.message);
                            erroInterno = true;
                            finalizar();
                            return;
                        }

                        const nomeProduto = rowNome ? rowNome.nome : 'Produto não encontrado';

                        stmtItensVenda.run([venda_id, item.produto_id, nomeProduto, item.quantidade, item.preco_unitario], function (errItemVenda) {
                            if (errItemVenda) {
                                console.error('Erro ao inserir item de venda:', errItemVenda.message);
                                erroInterno = true;
                            }
                            inseridos++;
                            if (inseridos === itens.length * 2) finalizar();
                        });

                        stmtUpdateEstoque.run([item.quantidade, item.produto_id], function (errEstoque) {
                            if (errEstoque) {
                                console.error('Erro ao atualizar estoque:', errEstoque.message);
                                erroInterno = true;
                            }
                            inseridos++;
                            if (inseridos === itens.length * 2) finalizar();
                        });
                    });
                }

                function finalizar() {
                    stmtItensVenda.finalize();
                    stmtUpdateEstoque.finalize();
                    stmtBuscarNomeProduto.finalize();
                    if (erroInterno) {
                        return resolve({ success: false, message: 'Erro interno ao registrar venda.' });
                    }
                    return resolve({ success: true, message: 'Venda registrada com sucesso!' });
                }
            });
    });
});

// Buscar vendas e itens
ipcMain.handle('buscarVendas', async (event, filtros) => {
    return new Promise((resolve, reject) => {
        const { cliente, clienteId, dataInicio, dataFim, vencimentoInicio, vencimentoFim } = filtros;

        let query = `
            SELECT
                v.id AS venda_id,
                c.nome AS cliente,
                c.observacao,
                v.data,
                v.data_vencimento AS vencimento,
                v.total AS total_venda,
                iv.id AS item_id,
                iv.nome_produto,
                iv.quantidade,
                iv.preco_unitario
            FROM vendas v
            JOIN clientes c ON c.id = v.cliente_id
            LEFT JOIN itens_venda iv ON v.id = iv.venda_id
            WHERE 1 = 1
        `;
        const params = [];

        if (clienteId) {
            query += " AND c.id = ?";
            params.push(clienteId);
        } else if (cliente) {
            query += " AND c.nome LIKE ?";
            params.push(`%${cliente}%`);
        }

        const formatarData = (data) => {
            if (!data || !/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return null;
            const [dia, mes, ano] = data.split('/');
            return `${ano}-${mes}-${dia}`;
        };

        if (dataInicio) {
            query += " AND DATE(v.data) >= DATE(?)";
            params.push(formatarData(dataInicio));
        }

        if (dataFim) {
            query += " AND DATE(v.data) <= DATE(?)";
            params.push(formatarData(dataFim));
        }

        if (vencimentoInicio) {
            query += " AND DATE(v.data_vencimento) >= DATE(?)";
            params.push(formatarData(vencimentoInicio));
        }

        if (vencimentoFim) {
            query += " AND DATE(v.data_vencimento) <= DATE(?)";
            params.push(formatarData(vencimentoFim));
        }

        query += " ORDER BY v.data DESC, v.id DESC";

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Erro ao buscar vendas e itens:', err.message);
                return reject([]);
            } else {
                const vendasDetalhadas = rows.reduce((acc, row) => {
                    const vendaExistente = acc.find(v => v.venda_id === row.venda_id);
                    const item = row.item_id ? {
                        id: row.item_id,
                        nome_produto: row.nome_produto,
                        quantidade: row.quantidade,
                        preco_unitario: row.preco_unitario
                    } : null;

                    if (vendaExistente) {
                        if (item) {
                            vendaExistente.itens.push(item);
                        }
                    } else {
                        acc.push({
                            venda_id: row.venda_id,
                            cliente: row.cliente,
                            observacao: row.observacao,
                            data: row.data,
                            vencimento: row.vencimento,
                            total_venda: row.total_venda,
                            itens: item ? [item] : []
                        });
                    }
                    return acc;
                }, []);

                const vendasFormatadas = vendasDetalhadas.map(venda => ({
                    ...venda,
                    data: venda.data ? new Date(venda.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
                    vencimento: venda.vencimento ? new Date(venda.vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'
                }));

                resolve(vendasFormatadas);
            }
        });
    });
});

// Buscar registros de recebimentos
// No seu arquivo de backend do Electron (ex: main.js ou onde está o ipcMain)
ipcMain.handle('buscarRecebimentos', async (event, filtros) => {
  return new Promise((resolve, reject) => {
    const { status, cliente } = filtros;
    let query = `
      SELECT r.id, v.id as venda_id, c.nome as cliente, r.data_vencimento, r.valor_total, r.valor_pago, r.data_pagamento, r.status, r.forma_pagamento
      FROM recebimentos r
      JOIN vendas v ON v.id = r.venda_id
      JOIN clientes c ON c.id = v.cliente_id
      WHERE 1 = 1
    `;
    const params = [];

    if (status) {
      query += " AND r.status = ?";
      params.push(status);
    }

    if (cliente) {
      query += " AND c.nome LIKE ?";
      params.push(`%${cliente}%`);
    }

    query += " ORDER BY r.data_vencimento ASC";

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Erro ao buscar recebimentos:', err.message);
        return reject(err); 
      } else {
        // Pega a data atual NO SERVIDOR e zera as horas para comparar apenas o dia
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const recebimentosFormatados = rows.map(recebimento => {
          let statusParaExibicao = recebimento.status; // Começa com o status do banco

          // Verifica se a conta deve ser considerada "atrasada"
          // Aplicar apenas se o status atual for 'pendente' (ou outros que podem ficar atrasados)
          // E se não estiver já 'pago' ou 'cancelado'
          if (recebimento.data_vencimento && 
              (statusParaExibicao === 'pendente')) { 
            
            // Converte a data de vencimento do formato YYYY-MM-DD (do banco) para um objeto Date
            // Assegure-se que recebimento.data_vencimento é uma string 'YYYY-MM-DD'
            const partesDataVencimento = recebimento.data_vencimento.split('-');
            const anoVenc = parseInt(partesDataVencimento[0], 10);
            const mesVenc = parseInt(partesDataVencimento[1], 10) - 1; // Mês no JS é 0-11
            const diaVenc = parseInt(partesDataVencimento[2], 10);
            
            const dataVencimentoObj = new Date(anoVenc, mesVenc, diaVenc);
            dataVencimentoObj.setHours(0, 0, 0, 0); // Zera horas para comparar apenas o dia

            if (dataVencimentoObj < hoje) {
              statusParaExibicao = 'atrasado';
            }
          }

          return {
            ...recebimento,
            status: statusParaExibicao, // Usa o status ajustado para exibição
            // Mantém o envio das datas originais (strings) para o frontend formatar
            data_vencimento: recebimento.data_vencimento || null, 
            data_pagamento: recebimento.data_pagamento || null 
          };
        });
        resolve(recebimentosFormatados);
      }
    });
  });
});

// Atualizar recebimento
ipcMain.handle('atualizarStatusRecebimento', async (event, dadosAtualizacao) => {
  return new Promise((resolve, reject) => {
    const {
      recebimentoId,
      novoStatus,
      dataPagamento, // Já formatado como YYYY-MM-DD pelo frontend
      formaPagamento,
      novoValorPago   // Este é o valor que precisamos salvar
    } = dadosAtualizacao;

    // Validações básicas (importante fazer no backend também)
    if (!recebimentoId || !novoStatus) {
      return reject({ success: false, message: 'ID do Recebimento e Novo Status são obrigatórios.' });
    }

    // ATENÇÃO: Obtenha o valor_total do banco para este recebimentoId
    // Esta etapa é crucial para a lógica de status pendente/pago
    db.get("SELECT valor_total FROM recebimentos WHERE id = ?", [recebimentoId], (err, row) => {
      if (err) {
        console.error('Erro ao buscar valor_total do recebimento:', err.message);
        return reject({ success: false, message: 'Erro ao buscar dados do recebimento.' });
      }
      if (!row) {
        return reject({ success: false, message: 'Recebimento não encontrado.' });
      }

      const valorTotalDoBanco = parseFloat(row.valor_total);
      let statusFinalASalvar = novoStatus;
      let valorPagoASalvar = novoValorPago; // Inicialmente usa o valor enviado

      // --- Início da Lógica de Status e Valor Pago ---
      if (novoStatus.toLowerCase() === 'pago') {
        valorPagoASalvar = valorTotalDoBanco; // Garante que 'pago' significa valor total pago
        if (!dataPagamento || !formaPagamento) {
          // Se o frontend já validou, esta é uma dupla checagem.
          // Pode ser mais flexível aqui ou manter a obrigatoriedade.
          // return reject({ success: false, message: 'Para status "Pago", Data de Pagamento e Forma de Pagamento são obrigatórios.' });
        }
      } else if (novoStatus.toLowerCase() !== 'cancelado') { // Não se aplica a 'cancelado'
        if (novoValorPago > 0 && novoValorPago < valorTotalDoBanco) {
          statusFinalASalvar = 'pendente'; // Regra: pagamento parcial = pendente
        } else if (novoValorPago >= valorTotalDoBanco) {
          // Se pagou tudo mas o status enviado não foi 'pago' (ex: 'pendente' ou 'atrasado')
          // Você pode decidir se força para 'pago' ou respeita o status enviado.
          // Para respeitar: não faz nada aqui, statusFinalASalvar já é novoStatus.
          // Para forçar para 'pago' se pagou tudo:
          // statusFinalASalvar = 'pago';
          // valorPagoASalvar = valorTotalDoBanco;
          // E aqui também, dataPagamento e formaPagamento seriam idealmente necessários.
        } else if (novoValorPago <= 0) {
            // Se o valor pago é zero ou negativo, e o status não é 'pago' ou 'cancelado',
            // o status enviado ('pendente', 'atrasado') é mantido.
            valorPagoASalvar = 0; // Garante que não seja negativo
        }
      }
      // --- Fim da Lógica de Status e Valor Pago ---

      const query = `
        UPDATE recebimentos
        SET status = ?,
            valor_pago = ?,      
            data_pagamento = ?,
            forma_pagamento = ?
        WHERE id = ?
      `;
      const params = [
        statusFinalASalvar,
        valorPagoASalvar,    // Valor pago atualizado
        dataPagamento,        // Deve ser YYYY-MM-DD ou NULL
        formaPagamento,
        recebimentoId
      ];

      db.run(query, params, function(err) { // Usar function() para ter acesso a this.changes
        if (err) {
          console.error('Erro ao atualizar recebimento:', err.message);
          return reject({ success: false, message: 'Erro de banco de dados ao atualizar.' });
        }
        if (this.changes === 0) {
          return reject({ success: false, message: 'Nenhum recebimento atualizado, ID pode não existir.' });
        }
        console.log(`Recebimento ID ${recebimentoId} atualizado com sucesso. Valor pago: ${valorPagoASalvar}, Status: ${statusFinalASalvar}`);
        resolve({ success: true });
      });
    });
  });
});

async function salvarPDF(caminhoArquivo, dadosPDF) {
  try {
    const diretorio = path.dirname(caminhoArquivo);

    // Cria diretório recursivamente caso não exista
    if (!fs.existsSync(diretorio)) {
      fs.mkdirSync(diretorio, { recursive: true });
    }

    // Grava o arquivo PDF (dadosPDF é um buffer ou string)
    fs.writeFileSync(caminhoArquivo, dadosPDF);

    console.log(`PDF salvo em: ${caminhoArquivo}`);
    return caminhoArquivo;
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    throw error;
  }
}

ipcMain.handle('exportarParaPDF', async (event, htmlContent) => {
  const { dialog } = require('electron');
  const fs = require('fs');
  const path = require('path');

  const { filePath } = await dialog.showSaveDialog({
    title: 'Salvar Relatório',
    defaultPath: path.join(app.getPath('desktop'), 'relatorio-vendas.pdf'),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });

  if (!filePath) return null;

  // Usando webContents.printToPDF
  const win = new BrowserWindow({ show: false });
  await win.loadURL(`data:text/html,${encodeURIComponent(htmlContent)}`);

  const pdfData = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    marginsType: 1 // Margens mínimas
  });

  fs.writeFileSync(filePath, pdfData);
  win.close();

  return filePath;
});

// Quando o aplicativo Electron estiver pronto
app.whenReady().then(() => {
  initializeDatabase(); // Garante que o banco seja inicializado APENAS UMA VEZ

  // --- Código temporário para logar os dados das tabelas ---
  db.all("SELECT * FROM recebimentos", (err, rows) => {
    if (err) {
      console.error("Erro ao consultar tabela recebimentos:", err.message);
    } else {
      console.log("➡️ Dados da tabela recebimentos:", rows);
    }
  });

  db.all("SELECT * FROM vendas", (err, rows) => {
    if (err) {
      console.error("Erro ao consultar tabela vendas:", err.message);
    } else {
      console.log("➡️ Dados da tabela vendas:", rows);
    }
  });

  db.all("SELECT * FROM clientes", (err, rows) => {
    if (err) {
      console.error("Erro ao consultar tabela clientes:", err.message);
    } else {
      console.log("➡️ Dados da tabela clientes:", rows);
    }
  });
  // --- Fim do código temporário ---

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});