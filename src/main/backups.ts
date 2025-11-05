import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { ServiceInfo } from '../types/service';

export interface ServiceBackup {
  id: string;
  timestamp: number;
  services: BackupServiceInfo[];
  platform: string;
  totalServices: number;
}

export interface BackupServiceInfo {
  id: string;
  name: string;
  status: string;
  startupType: string;
  enabled: boolean;
}

const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');
const MAX_BACKUPS = 20;

function ensureBackupDirectory(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getBackupFilePath(id: string): string {
  return path.join(BACKUP_DIR, `backup-${id}.json`);
}

export function createBackup(services: ServiceInfo[]): ServiceBackup {
  ensureBackupDirectory();

  const timestamp = Date.now();
  const id = timestamp.toString();
  
  const backupServices: BackupServiceInfo[] = services.map(service => ({
    id: service.id,
    name: service.name,
    status: service.status,
    startupType: service.startupType,
    enabled: service.startupType.toLowerCase().includes('enabled') || 
             service.startupType.toLowerCase().includes('automatic'),
  }));

  const backup: ServiceBackup = {
    id,
    timestamp,
    services: backupServices,
    platform: process.platform,
    totalServices: services.length,
  };

  fs.writeFileSync(getBackupFilePath(id), JSON.stringify(backup, null, 2), 'utf-8');

  cleanOldBackups();

  return backup;
}

export function listBackups(): ServiceBackup[] {
  ensureBackupDirectory();

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('backup-') && file.endsWith('.json'));

  const backups: ServiceBackup[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(BACKUP_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const backup = JSON.parse(content) as ServiceBackup;
      backups.push(backup);
    } catch (error) {
      console.error(`Failed to read backup file ${file}:`, error);
    }
  }

  return backups.sort((a, b) => b.timestamp - a.timestamp);
}

export function getBackup(id: string): ServiceBackup | null {
  try {
    const filePath = getBackupFilePath(id);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as ServiceBackup;
  } catch (error) {
    console.error(`Failed to read backup ${id}:`, error);
    return null;
  }
}

export function deleteBackup(id: string): boolean {
  try {
    const filePath = getBackupFilePath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to delete backup ${id}:`, error);
    return false;
  }
}

function cleanOldBackups(): void {
  try {
    const backups = listBackups();
    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      for (const backup of toDelete) {
        deleteBackup(backup.id);
      }
    }
  } catch (error) {
    console.error('Failed to clean old backups:', error);
  }
}

export function exportBackup(id: string, exportPath: string): boolean {
  try {
    const backup = getBackup(id);
    if (!backup) {
      return false;
    }
    fs.writeFileSync(exportPath, JSON.stringify(backup, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Failed to export backup ${id}:`, error);
    return false;
  }
}

export function importBackup(importPath: string): ServiceBackup | null {
  try {
    ensureBackupDirectory();
    const content = fs.readFileSync(importPath, 'utf-8');
    const backup = JSON.parse(content) as ServiceBackup;
    
    const newId = Date.now().toString();
    const newBackup: ServiceBackup = {
      ...backup,
      id: newId,
      timestamp: Date.now(),
    };
    
    fs.writeFileSync(getBackupFilePath(newId), JSON.stringify(newBackup, null, 2), 'utf-8');
    
    cleanOldBackups();
    
    return newBackup;
  } catch (error) {
    console.error('Failed to import backup:', error);
    return null;
  }
}
