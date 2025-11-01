import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'node:path';

import { controlService, getServiceDetails, listServices } from './services';
import type {
  IpcResponse,
  SerializedError,
  ServiceAction,
  ServiceControlResult,
  ServiceInfo,
  ServiceListFilters,
} from '../types/service';

interface ServicesControlPayload {
  serviceId: string;
  action: ServiceAction;
}

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
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

  mainWindow.loadFile(startURL).catch((error: unknown) => {
    console.error('Failed to load renderer', error);
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
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

ipcMain.handle('services:list', async (_event, payload?: ServiceListFilters): Promise<IpcResponse<ServiceInfo[]>> => {
  try {
    const result = await listServices(payload ?? {});
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: serialiseError(error) };
  }
});

ipcMain.handle(
  'services:control',
  async (_event, payload?: ServicesControlPayload): Promise<IpcResponse<ServiceControlResult>> => {
    try {
      if (!payload?.serviceId || !payload.action) {
        throw new Error('Invalid payload for services:control');
      }

      const result = await controlService(payload.serviceId, payload.action);
      return { ok: true, data: result };
    } catch (error) {
      return { ok: false, error: serialiseError(error) };
    }
  }
);

ipcMain.handle('services:details', async (_event, serviceId?: string): Promise<IpcResponse<ServiceInfo | null>> => {
  try {
    if (!serviceId) {
      throw new Error('Service identifier is required');
    }

    const result = await getServiceDetails(serviceId);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: serialiseError(error) };
  }
});

ipcMain.on('app:openPath', (_event, targetPath: string | undefined) => {
  if (!targetPath) return;
  shell.showItemInFolder(targetPath);
});

ipcMain.handle('app:showErrorDialog', async (_event, message?: unknown) => {
  if (!mainWindow) return;
  await dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: 'Service Manager',
    message: 'Service Manager',
    detail: typeof message === 'string' ? message : 'An unexpected error occurred.',
    buttons: ['OK'],
  });
});

function serialiseError(error: unknown): SerializedError {
  if (!error || typeof error !== 'object') {
    return { message: 'Unknown error' };
  }

  const err = error as Partial<SerializedError> & {
    stdout?: string | Buffer;
    stderr?: string | Buffer;
    message?: string;
    stack?: string;
    code?: string | number;
  };

  const serialised: SerializedError = {
    message: err.message ?? 'Unexpected error',
  };

  if (err.stack) serialised.stack = err.stack;
  if (err.code !== undefined) serialised.code = err.code;
  if (err.stderr) serialised.stderr = err.stderr.toString();
  if (err.stdout) serialised.stdout = err.stdout.toString();

  return serialised;
}

