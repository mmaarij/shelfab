import { app, BrowserWindow, protocol, net } from 'electron';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// This must be the very first thing that happens in the main process!
if (require('electron-squirrel-startup')) {
  app.quit();
}

import path from 'path';
import { initDatabase } from './database';
import { registerIpcHandlers } from './ipc-handlers';
import { updateElectronApp } from 'update-electron-app';

updateElectronApp({
  repo: 'mmaarij/shelfab',
  updateInterval: '1 hour',
  notifyUser: true
});

protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { supportFetchAPI: true, secure: true, bypassCSP: true } }
]);

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, '../../src/renderer/assets/shelfab-logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
};

// Initialize
app.whenReady().then(() => {
  protocol.handle('asset', (request) => {
    let urlWithoutScheme = request.url.slice('asset://'.length);
    return net.fetch('file://' + urlWithoutScheme);
  });

  initDatabase();
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Vite HMR declarations
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
