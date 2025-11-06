import { app, BrowserWindow, ipcMain, shell, dialog, session } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import fs from 'node:fs';
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
  ServiceBackup,
  ServiceHealthStatus,
  HealthCheckConfig,
  ServiceStatus,
} from '../types/service';
import {
  isValidServiceId,
  isValidFilePath,
  isValidServiceAction,
  sanitizeErrorMessage,
  RateLimiter,
} from '../utils/validation';
import {
  withRetry,
  withTimeout,
  sanitizeError,
  CircuitBreaker,
} from '../utils/errorHandler';
import { CONFIG } from './config';
import { initializeAutoUpdater, performManualUpdateCheck, checkForUpdates, applyPendingUpdate, type UpdateInfo } from './updater';
import { createBackup, listBackups, getBackup, deleteBackup } from './backups';
import { healthCheckManager } from './healthCheck';

const execAsync = promisify(exec);

// RAM optimization: Configure Chromium flags for reduced memory usage
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
app.commandLine.appendSwitch('renderer-process-limit', '1');

interface ServicesControlPayload {
  serviceId: string;
  action: ServiceAction;
}

/**
 * Cache entry for service list
 */
interface CacheEntry {
  data: ServiceInfo[];
  timestamp: number;
}

/**
 * Ordered cache implementation with LRU eviction and memory optimization
 */
class OrderedCache<K, V> {
  private cache = new Map<K, V>();
  
  constructor(private maxSize: number) {}
  
  get(key: K): V | undefined {
    return this.cache.get(key);
  }
  
  set(key: K, value: V): void {
    // If key exists, delete it first to update insertion order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // If at max size, remove oldest entry (first in Map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, value);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // RAM optimization: remove expired entries
  clearExpired(ttl: number): void {
    const now = Date.now();
    const keysToDelete: K[] = [];
    
    this.cache.forEach((value, key) => {
      const entry = value as unknown as CacheEntry;
      if (entry.timestamp && now - entry.timestamp > ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
  
  get size(): number {
    return this.cache.size;
  }
}

// Rate limiter for service control operations
const controlRateLimiter = new RateLimiter(CONFIG.RATE_LIMIT.CONTROL_COOLDOWN_MS);

// Circuit breaker for service operations
const serviceCircuitBreaker = new CircuitBreaker(5, 60000);

// Cache for service list with size limit
const servicesCache = new OrderedCache<string, CacheEntry>(CONFIG.CACHE.MAX_SIZE);

let mainWindow: BrowserWindow | null = null;
let updateChecked = false;

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

/**
 * Create the main application window
 */
function createMainWindow(): void {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.resolve(__dirname, '../../resources/icon.png');
  const iconExists = fs.existsSync(iconPath);

  mainWindow = new BrowserWindow({
    width: CONFIG.WINDOW.DEFAULT_WIDTH,
    height: CONFIG.WINDOW.DEFAULT_HEIGHT,
    minWidth: CONFIG.WINDOW.MIN_WIDTH,
    minHeight: CONFIG.WINDOW.MIN_HEIGHT,
    show: false,
    backgroundColor: CONFIG.WINDOW.BACKGROUND_COLOR,
    autoHideMenuBar: true,
    icon: iconExists ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      // RAM optimization: reduce memory footprint
      backgroundThrottling: true,
      enablePreferredSizeMode: true,
    },
    title: 'Service Manager',
  });

  const startURL = path.join(__dirname, '..', 'renderer', 'index.html');

  mainWindow.loadFile(startURL).catch((error: unknown) => {
    console.error('[ERROR] Failed to load renderer:', error);
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();

    if (!updateChecked && mainWindow) {
      updateChecked = true;
      // Initialize auto-updater for packaged apps
      initializeAutoUpdater(mainWindow);
      
      // Check for npm updates after a short delay
      setTimeout(() => {
        void checkAndNotifyUpdates(mainWindow);
      }, 3000);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Clear cache on window close
    servicesCache.clear();
    // Cleanup health check manager
    healthCheckManager.setMainWindow(null);
    // Force garbage collection if available (RAM optimization)
    if (global.gc) {
      global.gc();
    }
  });
  
  // Set main window for health check manager
  healthCheckManager.setMainWindow(mainWindow);
}

/**
 * Check for updates and notify user if available
 */
async function checkAndNotifyUpdates(window: BrowserWindow | null): Promise<void> {
  if (!window) return;
  
  try {
    const updateInfo = await checkForUpdates();
    
    if (updateInfo.available && updateInfo.installMethod === 'npm') {
      // For npm installs, send notification to renderer
      window.webContents.send('update:available-npm', updateInfo);
    }
  } catch (error) {
    console.error('[UPDATE] Failed to check for updates:', error);
  }
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

  // RAM optimization: clear expired cache entries periodically
  setInterval(() => {
    // Clear only expired entries instead of entire cache
    servicesCache.clearExpired(CONFIG.CACHE.TTL_MS);
    
    // Force GC if available and app has been idle
    if (global.gc && mainWindow && !mainWindow.isFocused()) {
      global.gc();
    }
  }, 2 * 60 * 1000); // Every 2 minutes

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
  // Clear cache and force GC on app close (RAM optimization)
  servicesCache.clear();
  healthCheckManager.cleanup();
  if (global.gc) {
    global.gc();
  }
});

/**
 * Get cache key for service list
 */
function getCacheKey(filters: ServiceListFilters): string {
  return JSON.stringify(filters);
}

/**
 * IPC Handler: List services
 */
ipcMain.handle('services:list', async (_event, payload?: ServiceListFilters): Promise<IpcResponse<ServiceInfo[]>> => {
  try {
    // Validate payload
    if (payload && typeof payload !== 'object') {
      throw new Error('Invalid payload type');
    }

    const filters = payload ?? {};

    // Validate search query length
    if (filters.search && filters.search.length > CONFIG.VALIDATION.MAX_SEARCH_LENGTH) {
      throw new Error(`Search query too long (max ${CONFIG.VALIDATION.MAX_SEARCH_LENGTH} characters)`);
    }

    // Validate status filter
    if (filters.status && typeof filters.status !== 'string') {
      throw new Error('Invalid status filter');
    }

    // Check cache if enabled
    if (CONFIG.CACHE.ENABLED) {
      const cacheKey = getCacheKey(filters);
      const cached = servicesCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CONFIG.CACHE.TTL_MS) {
        return { ok: true, data: cached.data };
      }
    }

    // Execute with timeout and retry
    const result = await serviceCircuitBreaker.execute(() =>
      withTimeout(
        () => withRetry(() => listServices(filters)),
        CONFIG.PERFORMANCE.OPERATION_TIMEOUT_MS,
        'Service list operation timed out'
      )
    );

    // Cache result (OrderedCache handles size management automatically)
    if (CONFIG.CACHE.ENABLED) {
      const cacheKey = getCacheKey(filters);
      servicesCache.set(cacheKey, { data: result, timestamp: Date.now() });
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error('[ERROR] services:list failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: Control service
 */
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
      servicesCache.clear();

      // Execute with timeout and circuit breaker
      const result = await serviceCircuitBreaker.execute(() =>
        withTimeout(
          () => controlService(payload.serviceId, payload.action),
          CONFIG.PERFORMANCE.OPERATION_TIMEOUT_MS,
          'Service control operation timed out'
        )
      );

      // Audit log
      if (CONFIG.SECURITY.AUDIT_ENABLED) {
        console.log(`[AUDIT] Service control: ${payload.action} on ${payload.serviceId} at ${new Date().toISOString()}`);
      }

      return { ok: true, data: result };
    } catch (error) {
      console.error(`[ERROR] services:control failed for ${payload?.serviceId}:`, error);
      return { ok: false, error: sanitizeError(error) };
    }
  }
);

/**
 * IPC Handler: Get service details
 */
ipcMain.handle('services:details', async (_event, serviceId?: string): Promise<IpcResponse<ServiceInfo | null>> => {
  try {
    // Validate service ID
    if (!serviceId || typeof serviceId !== 'string') {
      throw new Error('Service identifier is required');
    }

    if (!isValidServiceId(serviceId)) {
      throw new Error('Invalid service identifier');
    }

    // Execute with timeout
    const result = await withTimeout(
      () => getServiceDetails(serviceId),
      CONFIG.PERFORMANCE.OPERATION_TIMEOUT_MS,
      'Service details operation timed out'
    );

    return { ok: true, data: result };
  } catch (error) {
    console.error(`[ERROR] services:details failed for ${serviceId}:`, error);
    return { ok: false, error: sanitizeError(error) };
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

/**
 * IPC Handler: Check for updates
 */
ipcMain.handle('app:checkForUpdates', async (): Promise<IpcResponse<UpdateInfo>> => {
  try {
    const updateInfo = await checkForUpdates();
    return { ok: true, data: updateInfo };
  } catch (error) {
    console.error('[ERROR] app:checkForUpdates failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: Perform manual update check with UI
 */
ipcMain.handle('app:manualUpdateCheck', async (): Promise<IpcResponse<void>> => {
  try {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }
    await performManualUpdateCheck(mainWindow);
    return { ok: true };
  } catch (error) {
    console.error('[ERROR] app:manualUpdateCheck failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('app:applyPendingUpdate', async (): Promise<IpcResponse<boolean>> => {
  try {
    const applied = applyPendingUpdate();
    return { ok: true, data: applied };
  } catch (error) {
    console.error('[ERROR] app:applyPendingUpdate failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: Get app version
 */
ipcMain.handle('app:getVersion', async (): Promise<string> => {
  return app.getVersion();
});

/**
 * IPC Handler: Create backup
 */
ipcMain.handle('backup:create', async (): Promise<IpcResponse<ServiceBackup>> => {
  try {
    const servicesResponse = await serviceCircuitBreaker.execute(() =>
      withTimeout(
        () => withRetry(() => listServices({})),
        CONFIG.PERFORMANCE.OPERATION_TIMEOUT_MS,
        'Service list operation timed out'
      )
    );

    const backup = createBackup(servicesResponse);
    
    if (CONFIG.SECURITY.AUDIT_ENABLED) {
      console.log(`[AUDIT] Backup created: ${backup.id} at ${new Date(backup.timestamp).toISOString()}`);
    }

    return { ok: true, data: backup };
  } catch (error) {
    console.error('[ERROR] backup:create failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: List backups
 */
ipcMain.handle('backup:list', async (): Promise<IpcResponse<ServiceBackup[]>> => {
  try {
    const backups = listBackups();
    return { ok: true, data: backups };
  } catch (error) {
    console.error('[ERROR] backup:list failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: Get backup
 */
ipcMain.handle('backup:get', async (_event, id?: string): Promise<IpcResponse<ServiceBackup | null>> => {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('Backup ID is required');
    }

    const backup = getBackup(id);
    return { ok: true, data: backup };
  } catch (error) {
    console.error('[ERROR] backup:get failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: Delete backup
 */
ipcMain.handle('backup:delete', async (_event, id?: string): Promise<IpcResponse<boolean>> => {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('Backup ID is required');
    }

    const result = deleteBackup(id);
    
    if (result && CONFIG.SECURITY.AUDIT_ENABLED) {
      console.log(`[AUDIT] Backup deleted: ${id} at ${new Date().toISOString()}`);
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error('[ERROR] backup:delete failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: Restore backup
 */
ipcMain.handle('backup:restore', async (_event, id?: string): Promise<IpcResponse<{ success: number; failed: number; errors: string[] }>> => {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('Backup ID is required');
    }

    const backup = getBackup(id);
    if (!backup) {
      throw new Error('Backup not found');
    }

    // Check platform compatibility
    if (backup.platform !== process.platform) {
      throw new Error(`Backup is from ${backup.platform}, cannot restore on ${process.platform}`);
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Get current service states
    const currentServices = await serviceCircuitBreaker.execute(() =>
      withTimeout(
        () => withRetry(() => listServices({})),
        CONFIG.PERFORMANCE.OPERATION_TIMEOUT_MS,
        'Service list operation timed out'
      )
    );

    const currentServiceMap = new Map(currentServices.map(s => [s.id, s]));

    // Restore each service from backup
    for (const backupService of backup.services) {
      const currentService = currentServiceMap.get(backupService.id);
      if (!currentService) {
        failed++;
        errors.push(`Service ${backupService.name} not found`);
        continue;
      }

      try {
        const currentStatus = currentService.status.toLowerCase();
        const backupStatus = backupService.status.toLowerCase();
        const isCurrentlyRunning = currentStatus.includes('active') || currentStatus.includes('running');
        const shouldBeRunning = backupStatus.includes('active') || backupStatus.includes('running');

        if (isCurrentlyRunning !== shouldBeRunning) {
          const action = shouldBeRunning ? 'start' : 'stop';
          await controlService(backupService.id, action);
        }

        const isCurrentlyEnabled = currentService.startupType.toLowerCase().includes('enabled') || 
                                   currentService.startupType.toLowerCase().includes('automatic');
        if (isCurrentlyEnabled !== backupService.enabled) {
          const action = backupService.enabled ? 'enable' : 'disable';
          await controlService(backupService.id, action);
        }

        success++;
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${backupService.name}: ${errorMsg}`);
      }
    }

    servicesCache.clear();

    if (CONFIG.SECURITY.AUDIT_ENABLED) {
      console.log(`[AUDIT] Backup restored: ${id} (${success} success, ${failed} failed) at ${new Date().toISOString()}`);
    }

    return { ok: true, data: { success, failed, errors } };
  } catch (error) {
    console.error('[ERROR] backup:restore failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: Get health status
 */
ipcMain.handle('health:getStatus', async (_event, serviceId?: string): Promise<IpcResponse<ServiceHealthStatus[]>> => {
  try {
    if (serviceId && typeof serviceId !== 'string') {
      throw new Error('Invalid service ID type');
    }

    if (serviceId && !isValidServiceId(serviceId)) {
      throw new Error('Invalid service identifier');
    }

    const status = healthCheckManager.getHealthStatus(serviceId);
    return { ok: true, data: status };
  } catch (error) {
    console.error('[ERROR] health:getStatus failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: Start health monitoring
 */
ipcMain.handle('health:startMonitoring', async (_event, payload?: { serviceId: string; expectedStatus?: ServiceStatus }): Promise<IpcResponse<boolean>> => {
  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid payload structure');
    }

    const { serviceId, expectedStatus } = payload;

    if (!serviceId || typeof serviceId !== 'string') {
      throw new Error('Service identifier is required');
    }

    if (!isValidServiceId(serviceId)) {
      throw new Error('Invalid service identifier');
    }

    const serviceDetails = await getServiceDetails(serviceId);
    const serviceName = serviceDetails?.name || serviceId;

    const result = healthCheckManager.startServiceMonitoring(serviceId, serviceName, expectedStatus);
    
    if (CONFIG.SECURITY.AUDIT_ENABLED) {
      console.log(`[AUDIT] Started health monitoring for ${serviceId} at ${new Date().toISOString()}`);
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error('[ERROR] health:startMonitoring failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: Stop health monitoring
 */
ipcMain.handle('health:stopMonitoring', async (_event, serviceId?: string): Promise<IpcResponse<boolean>> => {
  try {
    if (!serviceId || typeof serviceId !== 'string') {
      throw new Error('Service identifier is required');
    }

    if (!isValidServiceId(serviceId)) {
      throw new Error('Invalid service identifier');
    }

    const result = healthCheckManager.stopServiceMonitoring(serviceId);
    
    if (CONFIG.SECURITY.AUDIT_ENABLED) {
      console.log(`[AUDIT] Stopped health monitoring for ${serviceId} at ${new Date().toISOString()}`);
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error('[ERROR] health:stopMonitoring failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: Get health check config
 */
ipcMain.handle('health:getConfig', async (): Promise<IpcResponse<HealthCheckConfig>> => {
  try {
    const config = healthCheckManager.getConfig();
    return { ok: true, data: config };
  } catch (error) {
    console.error('[ERROR] health:getConfig failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * IPC Handler: Update health check config
 */
ipcMain.handle('health:updateConfig', async (_event, payload?: Partial<HealthCheckConfig>): Promise<IpcResponse<HealthCheckConfig>> => {
  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid payload structure');
    }

    if (payload.interval !== undefined && (typeof payload.interval !== 'number' || payload.interval < 5000)) {
      throw new Error('Invalid interval: must be at least 5000ms');
    }

    if (payload.failureThreshold !== undefined && (typeof payload.failureThreshold !== 'number' || payload.failureThreshold < 1)) {
      throw new Error('Invalid failure threshold: must be at least 1');
    }

    const config = healthCheckManager.updateConfig(payload);
    
    if (CONFIG.SECURITY.AUDIT_ENABLED) {
      console.log(`[AUDIT] Updated health check config at ${new Date().toISOString()}`);
    }

    return { ok: true, data: config };
  } catch (error) {
    console.error('[ERROR] health:updateConfig failed:', error);
    return { ok: false, error: sanitizeError(error) };
  }
});

/**
 * Legacy error serialization - now handled by sanitizeError from errorHandler
 * Keeping this wrapper for backwards compatibility if needed
 */

