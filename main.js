const { app, BrowserWindow, Menu, shell, dialog, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs   = require('fs');
const { autoUpdater } = require('electron-updater');

function iconPath() {
  const dark = nativeTheme.shouldUseDarkColors;
  const name = dark
    ? (process.platform === 'win32' ? 'icon-dark.ico' : 'icon-dark.png')
    : (process.platform === 'win32' ? 'icon.ico'      : 'icon.png');
  return path.join(__dirname, 'assets', name);
}

// Keep a global reference so the window isn't garbage-collected.
let win;

// Default folder for auto-save: ~/Documents/Director's Prep/
function getProjectsDir() {
  const dir = path.join(app.getPath('documents'), "Director's Prep");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ── Recent files ─────────────────────────────────────────────────────────────
const RECENTS_PATH = path.join(app.getPath('userData'), 'recents.json');
const RECENTS_MAX  = 5;

function loadRecents() {
  try { return JSON.parse(fs.readFileSync(RECENTS_PATH, 'utf8')); } catch { return []; }
}

function saveRecents(list) {
  fs.writeFileSync(RECENTS_PATH, JSON.stringify(list), 'utf8');
}

function addRecentFile(filePath) {
  let list = loadRecents().filter(p => p !== filePath);
  list.unshift(filePath);
  if (list.length > RECENTS_MAX) list = list.slice(0, RECENTS_MAX);
  saveRecents(list);
  app.addRecentDocument(filePath);   // Windows Jump List / macOS Dock
  buildMenu();                        // rebuild so the submenu reflects the change
}

function openRecentFile(filePath) {
  if (!fs.existsSync(filePath)) {
    dialog.showMessageBox(win, {
      type: 'warning', title: "File Not Found",
      message: `"${path.basename(filePath)}" could not be found.`,
      detail: filePath,
    });
    // Remove missing file from recents
    saveRecents(loadRecents().filter(p => p !== filePath));
    buildMenu();
    return;
  }
  const text = fs.readFileSync(filePath, 'utf8');
  win && win.webContents.send('menu-load-file', JSON.stringify({ text, filePath }));
}

// ── Native menu ──────────────────────────────────────────────────────────────

function buildMenu() {
  const isMac    = process.platform === 'darwin';
  const recents  = loadRecents();

  const recentItems = recents.length
    ? [
        ...recents.map(fp => ({
          label: path.basename(fp, '.prep'),
          click() { openRecentFile(fp); },
        })),
        { type: 'separator' },
        { label: 'Clear Recents', click() { saveRecents([]); app.clearRecentDocuments(); buildMenu(); } },
      ]
    : [{ label: 'No Recent Projects', enabled: false }];

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),

    {
      label: 'File',
      submenu: [
        {
          label: 'Import Screenplay…',
          accelerator: 'CmdOrCtrl+O',
          click() { win && win.webContents.send('menu-import'); },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click() { win && win.webContents.send('menu-save'); },
        },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click() { win && win.webContents.send('menu-save-as'); },
        },
        {
          label: 'Open Project…',
          accelerator: 'CmdOrCtrl+Shift+O',
          click() { win && win.webContents.send('menu-load'); },
        },
        {
          label: 'Open Recent',
          submenu: recentItems,
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click() { win && win.webContents.send('menu-undo'); },
        },
        {
          label: 'Redo',
          accelerator: process.platform === 'darwin' ? 'Cmd+Shift+Z' : 'Ctrl+Y',
          click() { win && win.webContents.send('menu-redo'); },
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },

    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },

    {
      label: 'Help',
      submenu: [
        {
          label: "Director's Prep Website",
          click() { shell.openExternal('https://directorsprep.com'); },
        },
        { type: 'separator' },
        {
          label: 'Check for Updates…',
          click() {
            if (!app.isPackaged) {
              dialog.showMessageBox(win, { type: 'info', message: 'Updates only work in the packaged app.', buttons: ['OK'] });
              return;
            }
            autoUpdater.checkForUpdates();
          },
        },
        { type: 'separator' },
        {
          label: "About Director's Prep",
          click() {
            const { version } = require('./package.json');
            dialog.showMessageBox(win, {
              type:    'info',
              title:   "About Director's Prep",
              icon:    path.join(__dirname, 'assets', 'icon.png'),
              message: "Director's Prep",
              detail:  `Version ${version}\n\nA director's shot planning tool.\n\n© ${new Date().getFullYear()} All rights reserved.`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('get-projects-dir', () => getProjectsDir());

ipcMain.handle('dialog-save', async (_event, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title:       "Save Director's Prep Project",
    defaultPath: path.join(getProjectsDir(), defaultName || 'project.prep'),
    filters:     [{ name: "Director's Prep Project", extensions: ['prep'] }],
  });
  return canceled ? null : filePath;
});

ipcMain.handle('dialog-open-json', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title:       "Open Director's Prep Project",
    defaultPath: getProjectsDir(),
    filters:     [{ name: "Director's Prep Project", extensions: ['prep'] }],
    properties:  ['openFile'],
  });
  if (canceled || !filePaths.length) return null;
  addRecentFile(filePaths[0]);
  return JSON.stringify({ text: fs.readFileSync(filePaths[0], 'utf8'), filePath: filePaths[0] });
});

ipcMain.handle('dialog-open-pdf', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title:      'Import Screenplay PDF',
    filters:    [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return null;
  return filePaths[0];
});

ipcMain.handle('read-file-b64', async (_event, filePath) => {
  const buf = fs.readFileSync(filePath);
  return JSON.stringify({ b64: buf.toString('base64'), name: path.basename(filePath) });
});

ipcMain.handle('write-file', async (_event, filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data, 'utf8');
  return true;
});

// Renderer calls this after a successful save so we record it in recents.
ipcMain.handle('add-recent-file', (_event, filePath) => {
  addRecentFile(filePath);
});

ipcMain.handle('set-title', (_event, title) => {
  if (win) win.setTitle(title);
});

// ── App lifecycle ────────────────────────────────────────────────────────────

function createWindow() {
  win = new BrowserWindow({
    width:  1400,
    height: 900,
    minWidth:  900,
    minHeight: 600,
    title: "Director's Prep",
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#fafaf9',
    show: false,
  });

  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; });

  nativeTheme.on('updated', () => {
    if (win) win.setIcon(iconPath());
  });

  win.on('close', async (e) => {
    let dirty = false;
    try {
      dirty = await win.webContents.executeJavaScript(
        // Warn if explicitly dirty OR if scenes exist but were never saved to a file
        '!!window.__isDirty || (typeof state !== "undefined" && state.scenes && state.scenes.length > 0 && !window.__currentFilePath)'
      );
    } catch (_) {}
    if (!dirty) return;

    e.preventDefault();

    const { response } = await dialog.showMessageBox(win, {
      type:    'question',
      title:   "Director's Prep",
      message: 'Save before closing?',
      detail:  'Your changes will be lost if you close without saving.',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId:  2,
    });

    if (response === 0) {
      win.webContents.send('menu-save');
      const start = Date.now();
      const poll = setInterval(async () => {
        let stillDirty = true;
        try { stillDirty = await win.webContents.executeJavaScript('!!window.__isDirty'); } catch (_) { stillDirty = false; }
        if (!stillDirty || Date.now() - start > 5000) {
          clearInterval(poll);
          win.destroy();
        }
      }, 200);
    } else if (response === 1) {
      win.destroy();
    }
  });
}

// ── Auto-updater ─────────────────────────────────────────────────────────────

function initAutoUpdater() {
  // Don't check for updates in dev (no publish config active yet).
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;       // download silently in the background
  autoUpdater.autoInstallOnAppQuit = true; // install when the user quits

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(win, {
      type:    'info',
      title:   'Update Available',
      message: `Version ${info.version} is available.`,
      detail:  'Downloading in the background. You\'ll be notified when it\'s ready.',
      buttons: ['OK'],
    });
  });

  autoUpdater.on('update-downloaded', () => {
    const { response } = dialog.showMessageBoxSync(win, {
      type:    'info',
      title:   'Update Ready',
      message: 'A new version has been downloaded.',
      detail:  'Restart now to apply the update, or it will install automatically when you quit.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err.message);
  });

  // Check on launch, then every 4 hours.
  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  initAutoUpdater();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
