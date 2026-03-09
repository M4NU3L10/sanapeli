const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

// ── Polku käyttäjän sanapakettikansioon ──────────────────────────────────────
function getUserPackagesDir() {
  const docs = app.getPath('documents');
  const dir  = path.join(docs, 'Sanastopeli', 'Sanapakettit');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ── Polku sovelluksen mukana tuleviin oletuspaketteihin ──────────────────────
function getBuiltinPackagesDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'packages');
  }
  return path.join(__dirname, 'packages');
}

// ── Polku edistymisdataan ────────────────────────────────────────────────────
function getProgressFile() {
  const data = app.getPath('userData');
  return path.join(data, 'progress.json');
}

function loadProgress() {
  const file = getProgressFile();
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function saveProgress(data) {
  try { fs.writeFileSync(getProgressFile(), JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { console.error('Edistymisen tallennus epäonnistui:', e); }
}

// ── Ikkunan luonti ────────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  900,
    height: 700,
    minWidth:  480,
    minHeight: 600,
    title: 'Sanastopeli',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false, // näytetään kun valmis
    autoHideMenuBar: true,
    frame: true,
  });

  mainWindow.loadFile('index.html');

  // Näytä ikkuna vasta kun valmis, vältetään tyhjä näyttö
  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  IPC – sanapakettien hallinta
// ═══════════════════════════════════════════════════════════════════════════════

// Listaa kaikki saatavilla olevat paketit (sisäiset + käyttäjän)
ipcMain.handle('get-packages', async () => {
  const results = [];

  const readDir = (dir, source) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf8');
        const pkg = JSON.parse(raw);
        if (pkg.words && pkg.name) {
          results.push({
            id:       file.replace('.json', ''),
            filename: file,
            path:     path.join(dir, file),
            source,
            name:            pkg.name            || file,
            sourceLanguage:  pkg.sourceLanguage  || '?',
            targetLanguage:  pkg.targetLanguage  || '?',
            sourceFlagEmoji: pkg.sourceFlagEmoji || '',
            targetFlagEmoji: pkg.targetFlagEmoji || '',
            wordCount:       Array.isArray(pkg.words) ? pkg.words.length : 0,
          });
        }
      } catch { /* ohita virheelliset tiedostot */ }
    }
  };

  readDir(getBuiltinPackagesDir(), 'builtin');
  readDir(getUserPackagesDir(),    'user');
  return results;
});

// Lataa yhden paketin sanat
ipcMain.handle('load-package', async (_e, filePath) => {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { error: e.message };
  }
});

// Avaa käyttäjän sanapakettikansio Explorerissa
ipcMain.handle('open-packages-folder', async () => {
  const dir = getUserPackagesDir();
  await shell.openPath(dir);
  return dir;
});

// Kopioi esimerkkipaketti käyttäjän kansioon, jos se auttaa alkuun pääsemistä
ipcMain.handle('copy-example-package', async () => {
  const src  = path.join(getBuiltinPackagesDir(), 'esimerkki-paketti.json');
  const dest = path.join(getUserPackagesDir(), 'esimerkki-paketti.json');
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
  }
  return getUserPackagesDir();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  IPC – edistyminen
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('load-progress', async () => loadProgress());

ipcMain.handle('save-progress', async (_e, data) => {
  const current = loadProgress();
  const merged  = { ...current, ...data };
  saveProgress(merged);
  return true;
});

// ═══════════════════════════════════════════════════════════════════════════════
//  IPC – tiedostojen tuonti
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('import-package', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Tuo sanapaketti',
    filters: [{ name: 'JSON-sanapaketti', extensions: ['json'] }],
    properties: ['openFile', 'multiSelections'],
  });
  if (result.canceled) return { canceled: true };

  const dest = getUserPackagesDir();
  const imported = [];
  for (const src of result.filePaths) {
    try {
      const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
      if (!raw.words || !raw.name) {
        imported.push({ file: path.basename(src), ok: false, error: 'Ei kelvollinen sanapaketti' });
        continue;
      }
      const target = path.join(dest, path.basename(src));
      fs.copyFileSync(src, target);
      imported.push({ file: path.basename(src), ok: true });
    } catch (e) {
      imported.push({ file: path.basename(src), ok: false, error: e.message });
    }
  }
  return { canceled: false, imported };
});
