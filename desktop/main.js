const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'db', 'pitstop.db');
const dbExiste = fs.existsSync(dbPath);
const db = new sqlite3.Database(dbPath);

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
      telefone TEXT,
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
    icon: path.join(__dirname, 'renderer', 'assets', 'icon', 'pitstop_icon.ico'), // 👈 caminho do ícone
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'login', 'login.html'));

}

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
