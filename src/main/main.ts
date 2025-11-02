import { app, BrowserWindow, ipcMain, shell, dialog, session } from 'electron';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { controlService, getServiceDetails, listServices } from './services';
import type {
  IpcResponse,
  SerializedError,
  ServiceAction,
  ServiceControlResult,
  ServiceInfo,
  ServiceListFilters,
} from '../types/service';
import {
  isValidServiceId,
  isValidFilePath,
  isValidServiceAction,
  sanitizeErrorMessage,
  RateLimiter,
} from '../utils/validation';

const execAsync = promisify(exec);

interface ServicesControlPayload {
  serviceId: string;
  action: ServiceAction;
}

// Rate limiter for service control operations (200ms cooldown)
const controlRateLimiter = new RateLimiter(200);

// Cache for service list (500ms cache)
let servicesCache: { data: ServiceInfo[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 500;

let mainWindow: BrowserWindow | null = null;

/**
 * Check if the application is running with elevated privileges
 */
async function checkElevatedPrivileges(): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      // On Windows, try to read a registry key that requires admin access
      const { stdout } = await execAsync('net session 2>&1');
      return !stdout.includes('Access is denied') && !stdout.includes('system error');
    } else if (process.platform === 'darwin' || process.platform === 'linux') {
      // On Unix-like systems, check if running as root (UID 0)
      return process.getuid ? process.getuid() === 0 : false;
    }
  } catch (error) {
    return false;
  }
  return false;
}

/**
 * Show a warning dialog if not running with elevated privileges
 */
async function showPrivilegeWarning(): Promise<void> {
  const isElevated = await checkElevatedPrivileges();
  
  if (!isElevated) {
    let message: string;
    let detail: string;
    
    if (process.platform === 'win32') {
      message = 'Administrator Privileges Required';
      detail = 'Service Manager is not running with administrator privileges.\n\n' +
               'Many service operations will require elevated permissions. ' +
               'To avoid permission errors, please:\n\n' +
               '1. Close this application\n' +
               '2. Right-click the application icon\n' +
               '3. Select "Run as administrator"\n\n' +
               'You can continue without administrator rights, but some operations may fail.';
    } else if (process.platform === 'darwin') {
      message = 'Elevated Privileges Recommended';
      detail = 'Service Manager is not running with elevated privileges.\n\n' +
               'Some service operations may require administrator permissions. ' +
               'You may be prompted to enter your password when performing privileged operations.\n\n' +
               'To run with elevated privileges from the start:\n' +
               'sudo service-manager';
    } else {
      message = 'Root Privileges Recommended';
      detail = 'Service Manager is not running as root.\n\n' +
               'Some service operations may require elevated permissions. ' +
               'You may be prompted to authenticate when performing privileged operations.\n\n' +
               'To run with elevated privileges from the start:\n' +
               'sudo service-manager';
    }
    
    await dialog.showMessageBox({
      type: 'warning',
      title: 'Service Manager',
      message,
      detail,
      buttons: ['Continue Anyway', 'Exit'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 1) {
        app.quit();
      }
    });
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#1b1d23',
    autoHideMenuBar: true,
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
  // Enhanced security settings
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none';"
        ],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
      },
    });
  });

  // Check for elevated privileges and show warning if needed
  void showPrivilegeWarning().then(() => {
    createMainWindow();
  });

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
    // Validate payload
    if (payload && typeof payload !== 'object') {
      throw new Error('Invalid payload type');
    }

    const filters = payload ?? {};

    // Validate search query length
    if (filters.search && filters.search.length > 1000) {
      throw new Error('Search query too long');
    }

    // Validate status filter
    if (filters.status && typeof filters.status !== 'string') {
      throw new Error('Invalid status filter');
    }

    // Check cache (only for non-search queries)
    if (!filters.search && servicesCache && Date.now() - servicesCache.timestamp < CACHE_TTL_MS) {
      return { ok: true, data: servicesCache.data };
    }

    const result = await listServices(filters);

    // Cache result if no search filter
    if (!filters.search) {
      servicesCache = { data: result, timestamp: Date.now() };
    }

    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: serialiseError(error) };
  }
});

ipcMain.handle(
  'services:control',
  async (_event, payload?: ServicesControlPayload): Promise<IpcResponse<ServiceControlResult>> => {
    try {
      // Validate payload structure
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid payload structure');
      }

      if (!payload.serviceId || !payload.action) {
        throw new Error('Missing required fields: serviceId and action');
      }

      // Validate service ID
      if (!isValidServiceId(payload.serviceId)) {
        throw new Error('Invalid service identifier');
      }

      // Validate action
      if (!isValidServiceAction(payload.action)) {
        throw new Error('Invalid service action');
      }

      // Rate limiting
      const rateLimitKey = `${payload.serviceId}:${payload.action}`;
      if (!controlRateLimiter.isAllowed(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      }

      // Invalidate cache on control operations
      servicesCache = null;

      const result = await controlService(payload.serviceId, payload.action);

      // Log privileged operation
      console.log(`[AUDIT] Service control: ${payload.action} on ${payload.serviceId} at ${new Date().toISOString()}`);

      return { ok: true, data: result };
    } catch (error) {
      return { ok: false, error: serialiseError(error) };
    }
  }
);

ipcMain.handle('services:details', async (_event, serviceId?: string): Promise<IpcResponse<ServiceInfo | null>> => {
  try {
    // Validate service ID
    if (!serviceId || typeof serviceId !== 'string') {
      throw new Error('Service identifier is required');
    }

    if (!isValidServiceId(serviceId)) {
      throw new Error('Invalid service identifier');
    }

    const result = await getServiceDetails(serviceId);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: serialiseError(error) };
  }
});

ipcMain.on('app:openPath', (_event, targetPath: string | undefined) => {
  if (!targetPath || typeof targetPath !== 'string') return;

  // Validate file path
  if (!isValidFilePath(targetPath)) {
    console.error('[SECURITY] Rejected invalid file path:', sanitizeErrorMessage(targetPath));
    return;
  }

  // Additional platform-specific validation
  const isWindows = process.platform === 'win32';
  const isDarwin = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';

  // Whitelist allowed directories
  const allowedPrefixes: string[] = [];
  
  if (isWindows) {
    allowedPrefixes.push('C:\\Windows\\System32', 'C:\\Program Files');
  } else if (isDarwin) {
    allowedPrefixes.push('/Library/LaunchDaemons', '/Library/LaunchAgents', '/System/Library');
  } else if (isLinux) {
    allowedPrefixes.push('/etc/systemd', '/lib/systemd', '/usr/lib/systemd');
  }

  // Check if path starts with allowed prefix
  const isAllowed = allowedPrefixes.length === 0 || allowedPrefixes.some(prefix => 
    targetPath.startsWith(prefix)
  );

  if (!isAllowed) {
    console.error('[SECURITY] Path not in allowed directories:', sanitizeErrorMessage(targetPath));
    return;
  }

  shell.showItemInFolder(targetPath);
  console.log(`[AUDIT] Opened file path at ${new Date().toISOString()}`);
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

  // Sanitize error message to remove sensitive information
  const sanitizedMessage = sanitizeErrorMessage(err.message ?? 'Unexpected error');

  const serialised: SerializedError = {
    message: sanitizedMessage,
  };

  // Only include stack traces in development mode
  if (process.env.NODE_ENV === 'development' && err.stack) {
    serialised.stack = err.stack;
  }

  if (err.code !== undefined) serialised.code = err.code;
  
  // Sanitize stderr and stdout
  if (err.stderr) {
    serialised.stderr = sanitizeErrorMessage(err.stderr.toString());
  }
  if (err.stdout) {
    serialised.stdout = sanitizeErrorMessage(err.stdout.toString());
  }

  return serialised;
}

