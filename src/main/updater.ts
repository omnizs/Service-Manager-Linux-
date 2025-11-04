/**
 * Auto-update functionality for Service Manager
 * Handles both npm installations and packaged apps
 */

import { app, dialog, BrowserWindow, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import log from 'electron-log';

const execAsync = promisify(exec);

let pendingUpdateVersion: string | null = null;
let updateCheckInterval: NodeJS.Timeout | null = null;

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Configure autoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;
autoUpdater.allowDowngrade = false;

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  installMethod: 'npm' | 'packaged' | 'source';
  updateCommand?: string;
  releaseNotes?: string;
}

/**
 * Detect how the application was installed
 */
function detectInstallMethod(): 'npm' | 'packaged' | 'source' {
  // Check if running as packaged app (electron-builder)
  if (app.isPackaged) {
    // Check if installed via npm global
    const execPath = process.execPath;
    if (execPath.includes('node_modules') || execPath.includes('.npm')) {
      return 'npm';
    }
    return 'packaged';
  }
  return 'source';
}

/**
 * Check for updates from npm registry
 */
async function checkNpmUpdate(): Promise<{ latestVersion: string; available: boolean }> {
  try {
    const { stdout } = await execAsync('npm view @omnizs/service-manager version');
    const latestVersion = stdout.trim();
    const currentVersion = app.getVersion();
    
    // Compare versions
    const available = compareVersions(latestVersion, currentVersion) > 0;
    
    return { latestVersion, available };
  } catch (error) {
    console.error('[UPDATE] Failed to check npm registry:', error);
    return { latestVersion: app.getVersion(), available: false };
  }
}

/**
 * Compare semantic versions
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.replace(/^v/, '').split('.').map(Number);
  const bParts = b.replace(/^v/, '').split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }
  return 0;
}

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  const installMethod = detectInstallMethod();
  const currentVersion = app.getVersion();
  
  console.log(`[UPDATE] Checking for updates (install method: ${installMethod}, version: ${currentVersion})`);
  
  // For npm installations, check npm registry
  if (installMethod === 'npm') {
    const { latestVersion, available } = await checkNpmUpdate();
    
    return {
      available,
      currentVersion,
      latestVersion,
      installMethod: 'npm',
      updateCommand: 'npm install -g @omnizs/service-manager@latest',
    };
  }
  
  // For packaged apps, use electron-updater
  if (installMethod === 'packaged') {
    try {
      const updateCheckResult = await autoUpdater.checkForUpdatesAndNotify();
      
      if (updateCheckResult && updateCheckResult.updateInfo) {
        const available = compareVersions(updateCheckResult.updateInfo.version, currentVersion) > 0;
        
        return {
          available,
          currentVersion,
          latestVersion: updateCheckResult.updateInfo.version,
          installMethod: 'packaged',
          releaseNotes: updateCheckResult.updateInfo.releaseNotes as string | undefined,
        };
      }
    } catch (error) {
      console.error('[UPDATE] Failed to check for packaged updates:', error);
    }
  }
  
  // Source installations don't get auto-updates
  return {
    available: false,
    currentVersion,
    installMethod: 'source',
  };
}

/**
 * Initialize auto-updater for packaged apps
 */
export function initializeAutoUpdater(mainWindow: BrowserWindow): void {
  const installMethod = detectInstallMethod();
  
  if (installMethod !== 'packaged') {
    log.info('[UPDATE] Auto-updater disabled (not a packaged app)');
    console.log('[UPDATE] Auto-updater disabled (not a packaged app)');
    return;
  }
  
  log.info('[UPDATE] Initializing auto-updater for packaged app');
  
  // Not available
  autoUpdater.on('update-not-available', (info) => {
    log.info('[UPDATE] No update available. Current version:', app.getVersion());
    console.log('[UPDATE] No update available. Current version:', app.getVersion());
  });
  
  // Checking for updates
  autoUpdater.on('checking-for-update', () => {
    log.info('[UPDATE] Checking for updates...');
    console.log('[UPDATE] Checking for updates...');
  });
  
  // Update available
  autoUpdater.on('update-available', (info) => {
    log.info('[UPDATE] Update available:', info.version);
    console.log('[UPDATE] Update available:', info.version);
    mainWindow.webContents.send('update:available', {
      version: info.version,
      currentVersion: app.getVersion(),
      releaseNotes: info.releaseNotes,
    });
  });
  
  // Download progress
  autoUpdater.on('download-progress', (progress) => {
    const percentRounded = Math.round(progress.percent);
    if (percentRounded % 10 === 0) { // Log every 10%
      log.info(`[UPDATE] Download progress: ${percentRounded}%`);
    }
    mainWindow.webContents.send('update:progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });
  
  // Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    log.info('[UPDATE] Update downloaded:', info.version);
    console.log('[UPDATE] Update downloaded:', info.version);
    pendingUpdateVersion = info.version;
    mainWindow.webContents.send('update:downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
    
    void dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Service Manager v${info.version} has been downloaded.`,
      detail: 'The application will automatically install the update when you close it, or you can restart now.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
  
  // Error handling
  autoUpdater.on('error', (error) => {
    log.error('[UPDATE] Auto-updater error:', error);
    console.error('[UPDATE] Auto-updater error:', error);
    mainWindow.webContents.send('update:error', {
      message: error.message,
    });
  });
  
  app.on('before-quit', () => {
    if (pendingUpdateVersion) {
      console.log(`[UPDATE] Installing pending update ${pendingUpdateVersion} on quit`);
    }
  });

  // Check for updates on startup
  log.info('[UPDATE] Checking for updates on startup...');
  console.log('[UPDATE] Checking for updates on startup...');
  void autoUpdater.checkForUpdatesAndNotify().catch(error => {
    log.error('[UPDATE] Failed to check for updates:', error);
    console.error('[UPDATE] Failed to check for updates:', error);
  });
  
  // Schedule periodic update checks (every 4 hours)
  const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  updateCheckInterval = setInterval(() => {
    log.info('[UPDATE] Running scheduled update check...');
    console.log('[UPDATE] Running scheduled update check...');
    void autoUpdater.checkForUpdatesAndNotify().catch(error => {
      log.error('[UPDATE] Scheduled update check failed:', error);
      console.error('[UPDATE] Scheduled update check failed:', error);
    });
  }, CHECK_INTERVAL);
  
  // Clean up interval on app quit
  app.on('before-quit', () => {
    if (updateCheckInterval) {
      clearInterval(updateCheckInterval);
      updateCheckInterval = null;
    }
  });
}

/**
 * Show update notification for npm installations
 */
export function showNpmUpdateNotification(mainWindow: BrowserWindow, updateInfo: UpdateInfo): void {
  const message = `A new version of Service Manager is available!\n\n` +
    `Current version: ${updateInfo.currentVersion}\n` +
    `Latest version: ${updateInfo.latestVersion}\n\n` +
    `To update, run the following command in your terminal:`;
  
  void dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message,
    detail: updateInfo.updateCommand,
    buttons: ['Copy Command', 'View Release', 'Later'],
    defaultId: 0,
    cancelId: 2,
  }).then(result => {
    if (result.response === 0) {
      // Copy command to clipboard
      const { clipboard } = require('electron');
      clipboard.writeText(updateInfo.updateCommand || '');
      
      void dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Copied',
        message: 'Update command copied to clipboard!',
        buttons: ['OK'],
      });
    } else if (result.response === 1) {
      // Open release page
      void shell.openExternal('https://github.com/omnizs/Service-Manager/releases/latest');
    }
  });
}

/**
 * Manual update check (called from menu or UI)
 */
export async function performManualUpdateCheck(mainWindow: BrowserWindow): Promise<void> {
  const updateInfo = await checkForUpdates();
  
  if (updateInfo.available) {
    if (updateInfo.installMethod === 'npm') {
      showNpmUpdateNotification(mainWindow, updateInfo);
    } else if (updateInfo.installMethod === 'packaged') {
      void dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `Service Manager v${updateInfo.latestVersion} is available!`,
        detail: 'The update is downloading in the background. You will be notified when it is ready to install.',
        buttons: ['OK'],
      });
    }
  } else {
    void dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'No Updates Available',
      message: `You are running the latest version (${updateInfo.currentVersion})`,
      buttons: ['OK'],
    });
  }
}

export function applyPendingUpdate(): boolean {
  if (pendingUpdateVersion) {
    console.log(`[UPDATE] Applying pending update ${pendingUpdateVersion} via manual trigger`);
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.quitAndInstall();
    return true;
  }
  console.log('[UPDATE] No pending update to apply');
  return false;
}

