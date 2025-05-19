const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'db', 'pitstop.db');
const dbExiste = fs.existsSync(dbPath);
const db = new sqlite3.Database(dbPath);

// Cadastro do banco
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
      telefone TEXT UNIQUE, -- impõe restrição
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
      venda_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      preco_unitario REAL NOT NULL,
      FOREIGN KEY (venda_id) REFERENCES vendas(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )`);

    console.log("✅ Banco criado com sucesso.");
  });
} else {
  console.log("📂 Banco já existente. Nenhuma alteração feita.");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'renderer', 'assets', 'icon', 'pitstop_icon.png'), // 👈 caminho do ícone
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'login', 'login.html'));

}

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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  db.close();
});

// Salvar Cliente
ipcMain.handle('salvar-cliente', async (event, cliente) => {
  return new Promise((resolve) => {
    const telefoneLimpo = cliente.telefone.replace(/\D/g, ''); // apenas números

    // Verifica se telefone já existe
    db.get(
      `SELECT id FROM clientes WHERE telefone = ?`,
      [telefoneLimpo],
      (err, row) => {
        if (err) {
          console.error('Erro ao verificar telefone:', err.message);
          return resolve({ success: false, message: 'Erro no banco de dados' });
        }

        if (row) {
          return resolve({ success: false, message: 'Telefone já cadastrado' });
        }

        // Insere novo cliente
        db.run(
          `INSERT INTO clientes (nome, telefone, observacao) VALUES (?, ?, ?)`,
          [cliente.nome, telefoneLimpo, cliente.observacao],
          function (err) {
            if (err) {
              console.error('Erro ao inserir cliente:', err.message);
              resolve({ success: false, message: 'Erro ao salvar cliente' });
            } else {
              resolve({ success: true });
            }
          }
        );
      }
    );
  });
});

// Buscar Cliente
ipcMain.handle('get-clientes', async () => {
  return new Promise((resolve) => {
    db.all(`SELECT id, nome FROM clientes ORDER BY nome ASC`, [], (err, rows) => {
      if (err) {
        console.error('Erro ao buscar clientes:', err.message);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});

// Salvar Produto
ipcMain.handle('salvar-produto', async (event, produto) => {
  return new Promise((resolve) => {
    db.get(`SELECT id FROM produtos WHERE nome = ?`, [produto.nome], (err, row) => {
      if (err) {
        console.error('Erro ao verificar produto:', err.message);
        return resolve({ success: false });
      }

      if (row) {
        return resolve({ success: false, message: 'Produto já cadastrado.' });
      }

      db.run(
        `INSERT INTO produtos (nome, preco, quantidade) VALUES (?, ?, ?)`,
        [produto.nome, produto.preco, produto.quantidade],
        function (err) {
          if (err) {
            console.error('Erro ao salvar produto:', err.message);
            resolve({ success: false });
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  });
});

// Buscar Produto
ipcMain.handle('get-produtos', async () => {
  return new Promise((resolve) => {
    db.all(`SELECT id, nome, preco FROM produtos ORDER BY nome ASC`, [], (err, rows) => {
      if (err) {
        console.error('Erro ao buscar produtos:', err.message);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('buscar-clientes', async (event, termo) => {
  return new Promise((resolve) => {
    db.all("SELECT id, nome FROM clientes WHERE nome LIKE ?", [`%${termo}%`], (err, rows) => {
      resolve(err ? [] : rows);
    });
  });
});

ipcMain.handle('buscar-produtos', async (event, termo) => {
  return new Promise((resolve) => {
    db.all("SELECT id, nome, preco FROM produtos WHERE nome LIKE ?", [`%${termo}%`], (err, rows) => {
      resolve(err ? [] : rows);
    });
  });
});


// Registrar Venda
ipcMain.handle('registrar-venda', async (event, dados) => {
  return new Promise((resolve) => {
    //const dataAtual = new Date().toISOString().split('T')[0];
    const dataAtual = new Date().toLocaleString('pt-BR'); // Ex: "17/05/2025 17:41:00"

    
    db.run(
      `INSERT INTO vendas (cliente_id, data, total, data_vencimento) VALUES (?, ?, ?, ?)`,
      [dados.cliente_id, dataAtual, dados.total, dados.vencimento],

      function (err) {
        if (err) {
          console.error('Erro ao salvar venda:', err.message);
          return resolve({ success: false });
        }

        const vendaId = this.lastID;
        const stmt = db.prepare(`INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)`);

        for (const item of dados.itens) {
          stmt.run([vendaId, item.produto_id, item.quantidade, item.preco_unitario]);
        }

        stmt.finalize();
        resolve({ success: true });
      }
    );
  });
});

// Handler para autocomplete de clientes por nome
ipcMain.handle('buscar-clientes-por-nome', async (event, termo) => {
  return new Promise((resolve) => {
    db.all("SELECT id, nome FROM clientes WHERE nome LIKE ?", [`%${termo}%`], (err, rows) => {
      resolve(err ? [] : rows);
    });
  });
});

// Handler para autocomplete de produtos por nome
ipcMain.handle('buscar-produtos-por-nome', async (event, termo) => {
  return new Promise((resolve) => {
    db.all("SELECT id, nome, preco FROM produtos WHERE nome LIKE ?", [`%${termo}%`], (err, rows) => {
      resolve(err ? [] : rows);
    });
  });
});


ipcMain.handle('buscar-relatorio', async (event, filtros) => {
  return new Promise((resolve) => {
    let query = `
      SELECT v.id, v.data, v.data_vencimento, v.total, c.nome as cliente
      FROM vendas v
      JOIN clientes c ON v.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filtros.cliente) {
      query += ` AND c.nome LIKE ?`;
      params.push(`%${filtros.cliente}%`);
    }

    if (filtros.dataInicioVenda && filtros.dataFimVenda) {
      query += ` AND date(v.data) BETWEEN date(?) AND date(?)`;
      params.push(filtros.dataInicioVenda, filtros.dataFimVenda);
    }

    if (filtros.dataInicioVenc && filtros.dataFimVenc) {
      query += ` AND date(v.data_vencimento) BETWEEN date(?) AND date(?)`;
      params.push(filtros.dataInicioVenc, filtros.dataFimVenc);
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Erro ao buscar relatório:', err.message);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});
