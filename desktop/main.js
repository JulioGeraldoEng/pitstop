const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(path.join(__dirname, 'db', 'pitstop.db'));

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('login', async (event, { usuario, senha }) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM usuarios WHERE usuario = ? AND senha = ?",
      [usuario, senha],
      (err, row) => {
        if (err) return reject(err);
        if (row) resolve(true);
        else resolve(false);
      }
    );
  });
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
