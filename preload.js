const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Menu commands forwarded from main process
  onMenuImport: (cb) => ipcRenderer.on('menu-import',  (_e) => cb()),
  onMenuSave:   (cb) => ipcRenderer.on('menu-save',    (_e) => cb()),
  onMenuSaveAs: (cb) => ipcRenderer.on('menu-save-as', (_e) => cb()),
  onMenuLoad:   (cb) => ipcRenderer.on('menu-load',    (_e) => cb()),
  onMenuUndo:     (cb) => ipcRenderer.on('menu-undo',      (_e) => cb()),
  onMenuRedo:     (cb) => ipcRenderer.on('menu-redo',      (_e) => cb()),
  onMenuLoadFile: (cb) => ipcRenderer.on('menu-load-file', (_e, data) => cb(data)),

  // File dialogs
  saveDialog:     (defaultName) => ipcRenderer.invoke('dialog-save', defaultName),
  openJsonDialog: ()            => ipcRenderer.invoke('dialog-open-json'),
  openPdfDialog:  ()            => ipcRenderer.invoke('dialog-open-pdf'),

  // File I/O
  readFileB64:    (filePath)       => ipcRenderer.invoke('read-file-b64', filePath),
  writeFile:      (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  addRecentFile:  (filePath)       => ipcRenderer.invoke('add-recent-file', filePath),
  getProjectsDir: ()               => ipcRenderer.invoke('get-projects-dir'),

  // Window chrome
  setTitle: (title) => ipcRenderer.invoke('set-title', title),

  // Licensing
  getLicenseStatus: ()    => ipcRenderer.invoke('get-license-status'),
  activateLicense:  (key) => ipcRenderer.invoke('activate-license', key),
  openExternal:     (url) => ipcRenderer.invoke('open-external', url),

  platform: process.platform,
});
