const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');

const services = require('./services');

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#1b1d23',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
    title: 'Service Manager',
  });

  const startURL = path.join(__dirname, '..', 'renderer', 'index.html');

  mainWindow.loadFile(startURL);

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) return;
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('services:list', async (_event, payload = {}) => {
  try {
    const result = await services.listServices(payload || {});
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error: serialiseError(error),
    };
  }
});

ipcMain.handle('services:control', async (_event, payload) => {
  try {
    if (!payload || !payload.serviceId || !payload.action) {
      throw new Error('Invalid payload for services:control');
    }

    const result = await services.controlService(payload.serviceId, payload.action);
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error: serialiseError(error),
    };
  }
});

ipcMain.handle('services:details', async (_event, serviceId) => {
  try {
    if (!serviceId) {
      throw new Error('Service identifier is required');
    }

    const result = await services.getServiceDetails(serviceId);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: serialiseError(error) };
  }
});

ipcMain.on('app:openPath', (_event, targetPath) => {
  if (!targetPath) return;
  shell.showItemInFolder(targetPath);
});

ipcMain.handle('app:showErrorDialog', async (_event, message) => {
  if (!mainWindow) return;
  await dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: 'Service Manager',
    message: 'Service Manager',
    detail: typeof message === 'string' ? message : 'An unexpected error occurred.',
    buttons: ['OK'],
  });
});

function serialiseError(error) {
  if (!error) {
    return { message: 'Unknown error' };
  }

  const serialised = {
    message: error.message || 'Unexpected error',
    stack: error.stack,
    code: error.code,
  };

  if (error.stderr) {
    serialised.stderr = error.stderr.toString();
  }

  if (error.stdout) {
    serialised.stdout = error.stdout.toString();
  }

  return serialised;
}

