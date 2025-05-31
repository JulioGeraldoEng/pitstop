const { app, Menu, BrowserWindow, ipcMain } = require('electron');
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

const cssFilePath = path.join(__dirname, 'renderer', 'assets', 'css', 'styles.css');

const bcrypt = require('bcrypt');

// Variável para armazenar a janela principal
let mainWindow;
let aboutWindow = null; // Janela "Sobre"

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
      const senhaAdmin = bcrypt.hashSync('1234', 10); // Cria a senha do admin com bcrypt
      db.run(`INSERT INTO usuarios (usuario, senha) VALUES ('admin', ?)`, [senhaAdmin]);
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
      "SELECT id, senha FROM usuarios WHERE usuario = ?",
      [username],
      (err, row) => {
        if (err) {
          console.error('Erro no banco de dados:', err);
          return resolve({ success: false, message: 'Erro no servidor.' });
        }

        if (row && bcrypt.compareSync(password, row.senha)) {
          resolve({ success: true, userId: row.id });
        } else {
          resolve({ success: false, message: 'Usuário ou senha incorretos' });
        }
      }
    );
  });
});

// Handler para cadastrar usuário
ipcMain.handle('cadastrarUsuario', async (event, usuario, senha) => {
  return new Promise((resolve) => {
    const senhaHash = bcrypt.hashSync(senha, 10);
    db.run("INSERT INTO usuarios (usuario, senha) VALUES (?, ?)", [usuario, senhaHash], function (err) {
      if (err) {
        console.error('Erro ao cadastrar usuário:', err.message);
        return resolve({ success: false, message: 'Usuário já existe ou erro no cadastro.' });
      }
      resolve({ success: true });
    });
  });
});

// Handler para alterar senha
ipcMain.handle('alterarSenha', async (event, { usuario, senhaAtual, novaSenha }) => {
  return new Promise((resolve) => {
    db.get("SELECT senha FROM usuarios WHERE usuario = ?", [usuario], (err, row) => {
      if (err || !row) return resolve({ success: false, message: 'Usuário não encontrado.' });

      const senhaCorreta = bcrypt.compareSync(senhaAtual, row.senha);
      if (!senhaCorreta) return resolve({ success: false, message: 'Senha atual incorreta.' });

      const novaHash = bcrypt.hashSync(novaSenha, 10);
      db.run("UPDATE usuarios SET senha = ? WHERE usuario = ?", [novaHash, usuario], function (err) {
        if (err) return resolve({ success: false, message: 'Erro ao atualizar senha.' });
        resolve({ success: true, message: 'Senha atualizada com sucesso.' });
      });
    });
  });
});

// Handler para esqueci minha senha
ipcMain.handle('redefinirSenha', async (event, { usuario, chaveMestra, novaSenha }) => {
  const CHAVE_MESTRA = 'super123'; // ajuste aqui sua chave

  console.log(`[DEBUG] Tentando redefinir senha de "${usuario}" com chave "${chaveMestra}"`);

  return new Promise((resolve) => {
    if (chaveMestra !== CHAVE_MESTRA) {
      console.log('[DEBUG] Chave mestra incorreta.');
      return resolve({ success: false, message: 'Chave mestra incorreta.' });
    }

    const novaHash = bcrypt.hashSync(novaSenha, 10);

    db.run("UPDATE usuarios SET senha = ? WHERE usuario = ?", [novaHash, usuario], function (err) {
      if (err) {
        console.error('[ERRO] Falha no UPDATE do usuário:', err.message);
        return resolve({ success: false, message: 'Erro ao atualizar senha.' });
      }

      if (this.changes === 0) {
        console.warn('[DEBUG] Nenhum usuário atualizado. Nome de usuário não encontrado?');
        return resolve({ success: false, message: 'Usuário não encontrado.' });
      }

      console.log('[SUCESSO] Senha redefinida com sucesso para:', usuario);
      resolve({ success: true, message: 'Senha redefinida com sucesso.' });
    });
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
    const { cliente, clienteId, dataInicio, dataFim, vencimentoInicio, vencimentoFim, status: statusFiltro } = filtros;

    let query = `
      SELECT
          v.id AS venda_id,
          c.nome AS cliente,
          c.telefone AS telefone,
          c.observacao, 
          v.data,
          v.data_vencimento,      -- Usaremos esta para a lógica de atraso
          v.total AS total_venda,
          iv.id AS item_id,
          iv.nome_produto,
          iv.quantidade,
          iv.preco_unitario,
          r.status AS status_armazenado_db -- Status original do recebimento
      FROM vendas v
      JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN itens_venda iv ON v.id = iv.venda_id
      LEFT JOIN recebimentos r ON v.id = r.venda_id 
      WHERE 1 = 1
    `;
    const params = [];

    // Seus filtros de cliente e data (mantidos como na sua versão corrigida)
    if (clienteId) { query += " AND c.id = ?"; params.push(clienteId); }
    else if (cliente) { query += " AND c.nome LIKE ?"; params.push(`%${cliente}%`); }

    const formatarDataParaDB = (dataString) => {
        if (!dataString || !/^\d{2}\/\d{2}\/\d{4}$/.test(dataString)) return null;
        const [dia, mes, ano] = dataString.split('/');
        return `${ano}-${mes}-${dia}`;
    };

    const dataInicioFormatada = formatarDataParaDB(dataInicio);
    if (dataInicioFormatada) { query += " AND DATE(v.data) >= DATE(?)"; params.push(dataInicioFormatada); }
    const dataFimFormatada = formatarDataParaDB(dataFim);
    if (dataFimFormatada) { query += " AND DATE(v.data) <= DATE(?)"; params.push(dataFimFormatada); }
    const vencimentoInicioFormatada = formatarDataParaDB(vencimentoInicio);
    if (vencimentoInicioFormatada) { query += " AND DATE(v.data_vencimento) >= DATE(?)"; params.push(vencimentoInicioFormatada); }
    const vencimentoFimFormatada = formatarDataParaDB(vencimentoFim);
    if (vencimentoFimFormatada) { query += " AND DATE(v.data_vencimento) <= DATE(?)"; params.push(vencimentoFimFormatada); }

    // --- Filtro de Status CORRIGIDO e AJUSTADO ---
        if (statusFiltro && statusFiltro !== "") { // Se um status específico foi selecionado
            const statusLower = statusFiltro.toLowerCase();

        if (statusLower === 'atrasado') {
            // Para o filtro "atrasado":
            // 1. Status no banco é 'pendente' E a data de vencimento da VENDA já passou
            // OU
            // 2. Status no banco já é 'atrasado'
            query += ` AND (
                            (LOWER(r.status) = 'pendente' AND DATE(v.data_vencimento) < DATE('now', 'localtime')) 
                            OR 
                            LOWER(r.status) = 'atrasado'
                            )`;
        } else if (statusLower === 'pendente') {
            // Para 'pendente', busca 'pendente' que AINDA NÃO ESTÃO VENCIDOS
            query += ` AND LOWER(r.status) = 'pendente' AND DATE(v.data_vencimento) >= DATE('now', 'localtime')`;
        } else {
            // Para outros status ('pago', 'cancelado')
            query += " AND LOWER(r.status) = LOWER(?)";
            params.push(statusLower);
        }
    }
    // --- Fim do Filtro de Status CORRIGIDO ---
    
    query += " ORDER BY v.data DESC, v.id DESC, iv.id ASC";

    // console.log("BACKEND - Query buscarVendas:", query);
    // console.log("BACKEND - Params buscarVendas:", params);

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('BACKEND - Erro na query buscarVendas:', err.message);
        return reject(err); 
      }
      // console.log("BACKEND - Rows do DB (buscarVendas):", JSON.stringify(rows, null, 2)); 

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const vendasMap = new Map();
      rows.forEach(row => {
        let statusParaExibicao = row.status_armazenado_db; // Status como está no banco

        // Deriva o status "atrasado" para exibição SEMPRE
        if (row.data_vencimento && statusParaExibicao && statusParaExibicao.toLowerCase() === 'pendente') {
          const partesDataVenc = row.data_vencimento.split('-');
          const dataVencimentoObj = new Date(
            parseInt(partesDataVenc[0], 10),
            parseInt(partesDataVenc[1], 10) - 1, 
            parseInt(partesDataVenc[2], 10)
          );
          dataVencimentoObj.setHours(0, 0, 0, 0);
          if (dataVencimentoObj < hoje) {
            statusParaExibicao = 'atrasado';
          }
        }

        if (!vendasMap.has(row.venda_id)) {
          vendasMap.set(row.venda_id, {
            venda_id: row.venda_id,
            cliente: row.cliente,
            telefone: row.telefone,
            observacao: row.observacao,
            data: row.data, 
            vencimento: row.data_vencimento, // Envia a data de vencimento original da VENDA
            total_venda: row.total_venda,
            status_pagamento: statusParaExibicao || 'N/A', // Usa o status DERIVADO
            itens: []
          });
        }
        if (row.item_id) {
          vendasMap.get(row.venda_id).itens.push({
            id: row.item_id,
            nome_produto: row.nome_produto,
            quantidade: row.quantidade,
            preco_unitario: row.preco_unitario
          });
        }
      });
      const vendasProcessadas = Array.from(vendasMap.values());
      // console.log("BACKEND - Vendas Processadas para Frontend:", JSON.stringify(vendasProcessadas, null, 2));
      resolve(vendasProcessadas);
    });
  });
});

// Buscar registros de recebimentos
ipcMain.handle('buscarRecebimentos', async (event, filtros) => {
  return new Promise((resolve, reject) => {
    const { status: statusFiltro, cliente } = filtros;

    let query = `
      SELECT r.id, v.id as venda_id, c.nome as cliente, 
             r.data_vencimento,  -- Usado para lógica de 'atrasado'
             r.valor_total, r.valor_pago, r.data_pagamento, 
             r.status as status_armazenado_db, -- Status original do banco
             r.forma_pagamento
      FROM recebimentos r
      JOIN vendas v ON v.id = r.venda_id       -- Join com vendas
      JOIN clientes c ON c.id = v.cliente_id -- Join com clientes a partir de vendas
      WHERE 1 = 1
    `;
    const params = [];

    if (cliente) {
      query += " AND c.nome LIKE ?";
      params.push(`%${cliente}%`);
    }

    // --- Filtro de Status CORRIGIDO e AJUSTADO ---
    if (statusFiltro && statusFiltro !== "") {
        const statusLower = statusFiltro.toLowerCase();
        if (statusLower === 'atrasado') {
            query += ` AND (
                            (LOWER(r.status) = 'pendente' AND DATE(r.data_vencimento) < DATE('now', 'localtime')) 
                            OR 
                            LOWER(r.status) = 'atrasado'
                           )`;
        } else if (statusLower === 'pendente') {
            query += ` AND LOWER(r.status) = 'pendente' AND DATE(r.data_vencimento) >= DATE('now', 'localtime')`;
        } else {
            query += " AND LOWER(r.status) = LOWER(?)";
            params.push(statusLower);
        }
    }
    // --- Fim do Filtro de Status CORRIGIDO ---

    query += " ORDER BY r.data_vencimento ASC";
    // console.log("Query buscarRecebimentos:", query, "Params:", params);

    db.all(query, params, (err, rows) => {
      if (err) { 
        console.error('Erro ao buscar recebimentos:', err.message);
        return reject(err); 
      }
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const recebimentosProcessados = rows.map(recebimento => {
        let statusParaExibicao = recebimento.status_armazenado_db;

        if (recebimento.data_vencimento && statusParaExibicao && statusParaExibicao.toLowerCase() === 'pendente') {
          const partesDataVenc = recebimento.data_vencimento.split('-');
          const dataVencimentoObj = new Date(
            parseInt(partesDataVenc[0], 10), 
            parseInt(partesDataVenc[1], 10) - 1, 
            parseInt(partesDataVenc[2], 10)
          );
          dataVencimentoObj.setHours(0,0,0,0);
          if (dataVencimentoObj < hoje) {
            statusParaExibicao = 'atrasado';
          }
        }
        return {
          ...recebimento, // Retorna todos os campos originais da linha do DB
          status: statusParaExibicao, // Sobrescreve o campo 'status' com o valor derivado
          // Assegura que as datas originais sejam enviadas para o frontend formatar
          data_vencimento: recebimento.data_vencimento || null,
          data_pagamento: recebimento.data_pagamento || null
        };
      });
      resolve(recebimentosProcessados);
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

// sincronizar status atrasados via IPC
ipcMain.handle('sincronizar-status-atrasados-banco', async () => {
  try {
    const resultado = await atualizarStatusParaAtrasadoNoBanco();
    return resultado;
  } catch (error) {
    console.error("Falha ao sincronizar status atrasados via IPC:", error);
    return { success: false, message: error.message || "Erro desconhecido na sincronização." };
  }
});

// função para atualizar status de recebimentos atrasados
async function atualizarStatusParaAtrasadoNoBanco() {
  return new Promise((resolve, reject) => {
    // Pega a data atual e formata para YYYY-MM-DD para comparação com SQLite
    // DATE('now', 'localtime') já faz isso no SQL, mas ter a string pode ser útil
    // ou podemos confiar diretamente na função DATE do SQLite.
    // Para a query, vamos usar DATE('now', 'localtime') do SQLite.

    const query = `
      UPDATE recebimentos
      SET status = 'atrasado'
      WHERE 
        LOWER(status) = 'pendente' 
        AND DATE(data_vencimento) < DATE('now', 'localtime') 
    `;
    // DATE(data_vencimento) < DATE('now', 'localtime')
    //   -> Compara a data de vencimento (que deve estar como YYYY-MM-DD)
    //   -> com a data atual no fuso horário do servidor.

    db.run(query, [], function(err) { // Não precisamos de parâmetros aqui
      if (err) {
        console.error("Erro ao tentar atualizar status para 'atrasado' no banco:", err.message);
        return reject({ success: false, message: `Erro no banco: ${err.message}` });
      }
      if (this.changes > 0) {
        console.log(`[AUTO-STATUS] ${this.changes} registro(s) de recebimento foram atualizados para 'atrasado' no banco.`);
      }
      resolve({ success: true, changes: this.changes || 0 });
    });
  });
}

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

// Exportar para PDF
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

// NOVO HANDLER PARA LER O ARQUIVO BASE64
ipcMain.handle('ler-arquivo-base64', async (event, caminhoRelativoDoArquivo) => {
  try {
    // app.getAppPath() retorna o diretório raiz da sua aplicação
    // (onde está o package.json, ou a raiz do app.asar se estiver empacotado)
    const caminhoAbsoluto = path.join(app.getAppPath(), caminhoRelativoDoArquivo);

    if (fs.existsSync(caminhoAbsoluto)) {
      const conteudoBase64Puro = fs.readFileSync(caminhoAbsoluto, 'utf8');
      // Assumindo que seu arquivo .b64 contém APENAS a string da imagem, sem o prefixo.
      // Adicionamos o prefixo necessário para Data URI.
      return `data:image/png;base64,${conteudoBase64Puro.trim()}`;
    } else {
      console.error(`Arquivo Base64 não encontrado em: ${caminhoAbsoluto}`);
      return null; // Ou lançar um erro que o frontend pode tratar
    }
  } catch (error) {
    console.error('Erro ao ler arquivo Base64 do sistema:', error);
    throw error; // Propaga o erro para o renderer para ser pego no catch
  }
});

// Quando o aplicativo Electron estiver pronto
app.whenReady().then(async () => {
  initializeDatabase(); // Garante que o banco seja inicializado APENAS UMA VEZ

  // Adicione a chamada para atualizar os status aqui
  try {
    console.log("[APP INIT] Verificando e atualizando status de recebimentos vencidos...");
    const resultadoAtualizacao = await atualizarStatusParaAtrasadoNoBanco();
    if (resultadoAtualizacao.success) {
      if (resultadoAtualizacao.changes > 0) {
        console.log(`[APP INIT] ${resultadoAtualizacao.changes} status foram atualizados para 'atrasado'.`);
      } else {
        console.log("[APP INIT] Nenhum status precisou ser atualizado para 'atrasado'.");
      }
    }
  } catch (error) {
    console.error("[APP INIT] Falha ao tentar atualizar status vencidos na inicialização:", error);
  }

  createWindow();

  const menuTemplate = [
  {
    label: 'Arquivo', // Nome do menu principal
    submenu: [
      {
        label: 'Abrir Ferramenta X',
        click: async () => {
          // Lógica para abrir uma nova janela ou executar uma ação
          console.log('Abrir Ferramenta X clicado!');
          // Exemplo: criar uma nova janela
          // const newWindow = new BrowserWindow({ width: 600, height: 400 });
          // newWindow.loadFile('caminho/para/ferramenta_x.html');
        }
      },
      {
        label: 'Configurações',
        click: () => {
          console.log('Configurações clicado!');
          // Lógica para abrir a janela de configurações
        }
      },
      { type: 'separator' }, // Adiciona uma linha separadora
      {
        label: 'Sair',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', // Atalho
        click: () => {
          app.quit(); // Fecha a aplicação
        }
        // Você também pode usar 'role' para comportamentos padrão:
        // role: 'quit'
      }
    ]
  },
  {
    label: 'Ajuda', // Nome do menu de ajuda',
    submenu: [
      {
        label: 'Sobre o Pitstop',
        click: () => {

          if (aboutWindow) {
            aboutWindow.focus();
            return;
          }

          // Criar uma nova janela para o "Sobre"
          aboutWindow = new BrowserWindow({
            width: 500, // Largura da janela "Sobre"
            height: 450, // Altura da janela "Sobre"
            title: 'Sobre o Pitstop', // Título da janela
            icon: path.join(__dirname, 'renderer', 'assets', 'icon', 'pitstop_icon.ico'),
            // parent: mainWindow, // Descomente se quiser que seja filha da janela principal
            // modal: true,       // Descomente se quiser que seja modal (bloqueia interação com a parente)
            resizable: false,    // Impede redimensionamento
            minimizable: false,  // Impede minimização (opcional)
            maximizable: false,  // Impede maximização (opcional)
            // autoHideMenuBar: true, // Oculta a barra de menu (comum para janelas "Sobre")
            webPreferences: {
              nodeIntegration: false, // Mantenha false por segurança
              contextIsolation: true, // Mantenha true por segurança
              // preload: path.join(__dirname, 'about-preload.js') // Se precisar de um preload específico
            }
          });

          // Carrega o arquivo sobre.html na nova janela
          // Certifique-se que o caminho para 'sobre.html' está correto
          aboutWindow.loadFile(path.join(__dirname, 'renderer', 'sobre', 'sobre.html'));
          // Se 'sobre.html' estiver em uma pasta 'assets':
          // aboutWindow.loadFile(path.join(__dirname, 'assets', 'sobre.html'));

          // Opcional: Remover o menu da janela "Sobre"
          aboutWindow.setMenu(null);

          // Limpa a referência da janela quando ela for fechada
          aboutWindow.on('closed', () => {
            aboutWindow = null;
          });
        }
      },
    ]
  },
  // Adicione mais menus como 'Editar', 'Visualizar' conforme necessário
  // Exemplo de um menu 'Editar' com roles comuns:
  
  {
    label: 'Visualizar',
    submenu: [
      { type: 'separator' },
      { role: 'reload', label: 'Recarregar Janela' },
      { role: 'forceReload', label: 'Forçar Recarregamento da Janela' },
      { role: 'toggleDevTools', label: 'Ferramentas do Desenvolvedor' },
      { type: 'separator' },
      { role: 'resetZoom', label: 'Restaurar Zoom' },
      { role: 'zoomIn', label: 'Aumentar Zoom' },
      { role: 'zoomOut', label: 'Diminuir Zoom' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Tela Cheia' }
    ]
  },
  {
      label: 'Mudar Cor', // Mantendo sua estrutura
      submenu: [
        // Novas opções para mudar a cor do body:
        {
          label: 'Fundo Vermelho Claro',
          click: () => {
            updateCssBackgroundColor('rgb(255, 182, 193)'); // Cor exemplo
          }
        },
        {
          label: 'Fundo Amarelo Claro',
          click: () => {
            updateCssBackgroundColor('rgb(238, 238, 142)');
          }
        },
        {
          label: 'Fundo Verde Claro',
          click: () => {
            updateCssBackgroundColor('rgb(152, 251, 152)');
          }
        },
        {
          label: 'Fundo Azul Claro',
          click: () => {
            updateCssBackgroundColor('rgb(173, 216, 230)');
          }
        }
      ]
    },
    {
      label: 'Configurações',
      submenu: [
        {
          label: 'Preferências do Aplicativo...',
          click: () => {
            // Lógica para abrir uma janela de configurações/preferências
            // Ex: criar uma nova BrowserWindow e carregar um 'configuracoes.html'
            console.log('Abrir janela de Preferências do Aplicativo');
          }
        },
        {
          label: 'Backup e Restauração de Dados...',
          click: () => {
            // Lógica para abrir ferramentas de backup/restauração
            console.log('Abrir Backup/Restauração');
          }
        },
        { type: 'separator' },
        {
          label: 'Sincronizar Status Atrasados', // Você tinha isso no seu preload
          click: () => {
            // Idealmente, isso envia uma mensagem para o renderer, que então chama
            // a função da API do preload, ou o main process lida com isso diretamente.
            if (mainWindow && mainWindow.webContents) {
              console.log('Solicitando sincronização de status atrasados...');
              mainWindow.webContents.send('trigger-action', 'sincronizarStatusAtrasados');
            }
          }
        },
        // Você poderia adicionar aqui "Importar Dados...", "Exportar Dados..." etc.
      ]
    }
];
  
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Função para atualizar o CSS e notificar o renderer
function updateCssBackgroundColor(newColor) {
  if (!mainWindow) {
    console.error('Janela principal não encontrada.');
    return;
  }

  // 1. Atualização visual imediata na janela (renderer)
  mainWindow.webContents.send('change-body-color', newColor);

  // 2. Modificar e salvar o arquivo CSS
  try {
    let originalCssContent = fs.readFileSync(cssFilePath, 'utf8');
    let modifiedCssContent = originalCssContent;
    let changesMade = false;

    const bodyRuleRegex = /(body\s*\{)([\s\S]*?)(\})/i; // Regex para encontrar a regra 'body { ... }'
    let bodyRuleFound = false;

    modifiedCssContent = originalCssContent.replace(bodyRuleRegex, (match, bodyOpenTag, bodyContent, bodyCloseTag) => {
      bodyRuleFound = true;
      const bgColorRegex = /(background-color\s*:\s*)(?:[^;]+)(\s*;?)/i; // Regex para 'background-color: valor;'

      if (bgColorRegex.test(bodyContent)) {
        // Propriedade background-color existe, substitui o valor
        bodyContent = bodyContent.replace(bgColorRegex, `$1${newColor}$2`);
        console.log(`Propriedade 'background-color' atualizada para ${newColor}.`);
      } else {
        // Propriedade background-color não existe dentro da regra body, adiciona
        let trimmedBodyContent = bodyContent.trim();
        if (trimmedBodyContent && !trimmedBodyContent.endsWith(';') && !trimmedBodyContent.endsWith('}')) {
          trimmedBodyContent += ';'; // Garante ponto e vírgula na última propriedade existente
        }
        const spacing = bodyContent.includes('\n') ? '\n  ' : ' '; // Mantém uma formatação mínima
        bodyContent = `${spacing}${trimmedBodyContent}${trimmedBodyContent ? spacing : ''}background-color: ${newColor};${bodyContent.includes('\n') ? '\n' : ''}`;
        console.log(`Propriedade 'background-color: ${newColor}' adicionada à regra body.`);
      }
      changesMade = true;
      return `${bodyOpenTag}${bodyContent}${bodyCloseTag}`;
    });

    if (!bodyRuleFound) {
      // Regra 'body { ... }' não foi encontrada no arquivo. Adiciona uma nova.
      const separator = originalCssContent.trim() === '' ? '' : '\n\n';
      modifiedCssContent += `${separator}body {\n  background-color: ${newColor};\n}\n`;
      console.log(`Regra 'body' não encontrada. Nova regra adicionada ao final do arquivo ${cssFilePath}.`);
      changesMade = true;
    }

    if (changesMade && modifiedCssContent !== originalCssContent) {
      fs.writeFileSync(cssFilePath, modifiedCssContent, 'utf8');
      console.log(`Arquivo CSS "${cssFilePath}" salvo com sucesso.`);
    } else if (changesMade && modifiedCssContent === originalCssContent) {
      // Isso pode acontecer se a cor já for a mesma ou a lógica de substituição não alterou o conteúdo.
      console.log('Nenhuma alteração real no conteúdo do CSS, arquivo não salvo.');
    } else if (!changesMade && bodyRuleFound) {
        console.warn(`Regra 'body' processada, mas nenhuma alteração feita. Verifique a lógica interna.`)
    }

  } catch (error) {
    console.error(`Falha ao ler ou escrever no arquivo CSS "${cssFilePath}":`, error);
    // Opcional: notificar o usuário na interface sobre o erro
    mainWindow.webContents.send('show-error-message', `Erro ao salvar cor no CSS: ${error.message}`);
  }
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});