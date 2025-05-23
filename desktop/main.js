const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'db', 'pitstop.db');
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
        quantidade INTEGER NOT NULL,
        preco_unitario REAL NOT NULL,
        FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
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
    icon: path.join(__dirname, 'renderer', 'assets', 'icon', 'pitstop_icon.png'),
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



ipcMain.handle('registrar-venda', async (event, dadosVenda) => {
  return new Promise((resolve, reject) => {
    const { cliente_id, total, data, vencimento, itens } = dadosVenda;

    const formatarVencimentoParaDB = (dataString) => {
      if (!dataString || dataString.length !== 10 || dataString.indexOf('/') === -1) return null;
      const [dia, mes, ano] = dataString.split('/');
      return `${ano}-${mes}-${dia}`;
    };

    const vencimentoFormatado = vencimento ? formatarVencimentoParaDB(vencimento) : null;

    db.run(`INSERT INTO vendas (cliente_id, data, data_vencimento, total) VALUES (?, ?, ?, ?)`,
      [cliente_id, data, vencimentoFormatado, total],
      function (err) {
        if (err) {
          console.error('Erro ao inserir venda:', err.message);
          return resolve({ success: false, message: 'Erro ao registrar venda.' });
        }

        const venda_id = this.lastID;

        let erroInterno = false;
        let inseridos = 0;

        const stmtItensVenda = db.prepare(`INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)`);
        const stmtUpdateEstoque = db.prepare(`UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?`);

        for (const item of itens) {
          stmtItensVenda.run([venda_id, item.produto_id, item.quantidade, item.preco_unitario], function (err) {
            if (err) {
              console.error('Erro ao inserir item de venda:', err.message);
              erroInterno = true;
            }
            inseridos++;
            if (inseridos === itens.length * 2) finalizar();
          });

          stmtUpdateEstoque.run([item.quantidade, item.produto_id], function (err) {
            if (err) {
              console.error('Erro ao atualizar estoque:', err.message);
              erroInterno = true;
            }
            inseridos++;
            if (inseridos === itens.length * 2) finalizar();
          });
        }

        function finalizar() {
          stmtItensVenda.finalize();
          stmtUpdateEstoque.finalize();
          if (erroInterno) {
            return resolve({ success: false, message: 'Erro interno ao registrar venda.' });
          }
          return resolve({ success: true, message: 'Venda registrada com sucesso!' });
        }
      });
  });
});


ipcMain.handle('buscarVendas', async (event, filtros) => {
  return new Promise((resolve, reject) => {
    const { cliente, clienteId, dataInicio, dataFim, vencimentoInicio, vencimentoFim } = filtros;

    let query = `
      SELECT v.id, c.nome as cliente, c.observacao, v.data, v.data_vencimento as vencimento, v.total
      FROM vendas v
      JOIN clientes c ON c.id = v.cliente_id
      WHERE 1 = 1
    `;
    const params = [];

    // Se clienteId for fornecido, busca pelo ID (busca exata)
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

    query += " ORDER BY v.data DESC";

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Erro ao buscar vendas:', err.message);
        return reject([]);
      } else {
        const vendasFormatadas = rows.map(venda => ({
          ...venda,
          data: new Date(venda.data).toLocaleDateString('pt-BR'),
          vencimento: venda.vencimento ? new Date(venda.vencimento).toLocaleDateString('pt-BR') : ''
        }));
        resolve(vendasFormatadas);
      }
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

ipcMain.handle('exportar-para-pdf', async (event) => {
  const win = event.sender.getOwnerBrowserWindow();

  try {
    const pdfData = await win.webContents.printToPDF({});

    // Defina um caminho válido para salvar
    const caminhoSalvar = '/mnt/c/Users/julio/OneDrive/Área de Trabalho/relatorio-vendas.pdf';

    // Certifique-se que o diretório existe (como já falamos antes)
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(caminhoSalvar);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(caminhoSalvar, pdfData);

    return caminhoSalvar; // Retorna o caminho para o frontend
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    throw error;
  }
});

// Quando o aplicativo Electron estiver pronto
app.whenReady().then(() => {
  initializeDatabase(); // Garante que o banco seja inicializado APENAS UMA VEZ
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});