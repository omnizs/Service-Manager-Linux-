export type ServiceStatus =
  | 'active'
  | 'inactive'
  | 'failed'
  | 'activating'
  | 'deactivating'
  | 'unknown';

export type ServiceAction = 'start' | 'stop' | 'restart' | 'enable' | 'disable';

export interface ServiceInfo {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  statusLabel: string;
  startupType: string;
  executable: string | null;
  unitFile?: string | null;
  pid: number | null;
  provider: 'systemd' | 'win32-service' | 'launchd';
  loadState?: string | null;
  domain?: string | null;
  raw?: unknown;
  canStart: boolean;
  canStop: boolean;
  canRestart: boolean;
  canEnable: boolean;
  canDisable: boolean;
}

export interface ServiceListFilters {
  search?: string;
  status?: string;
  serviceId?: string;
}

export interface ServiceControlResult {
  action: ServiceAction;
  serviceId: string;
  elevated?: boolean;
  stdout?: string;
  stderr?: string;
  domain?: string;
}

export interface SerializedError {
  message: string;
  stack?: string;
  code?: string | number;
  stderr?: string;
  stdout?: string;
  category?: string;
}

export interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: SerializedError;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  installMethod: 'npm' | 'packaged' | 'source';
  updateCommand?: string;
  releaseNotes?: string;
}

export interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
}

export interface BackupServiceInfo {
  id: string;
  name: string;
  status: string;
  startupType: string;
  enabled: boolean;
}

export interface ServiceBackup {
  id: string;
  timestamp: number;
  services: BackupServiceInfo[];
  platform: string;
  totalServices: number;
}

export interface ServiceAPI {
  listServices(filters?: ServiceListFilters): Promise<IpcResponse<ServiceInfo[]>>;
  controlService(serviceId: string, action: ServiceAction): Promise<IpcResponse<ServiceControlResult>>;
  getServiceDetails(serviceId: string): Promise<IpcResponse<ServiceInfo | null>>;
  openPath(targetPath: string): void;
  showError(message: string): Promise<void>;
  onServiceEvent(handler: (payload: unknown) => void): () => void;
  checkForUpdates(): Promise<IpcResponse<UpdateInfo>>;
  manualUpdateCheck(): Promise<IpcResponse<void>>;
  applyPendingUpdate(): Promise<IpcResponse<boolean>>;
  getAppVersion(): Promise<string>;
  onUpdateAvailable(handler: (updateInfo: UpdateInfo) => void): () => void;
  onUpdateProgress(handler: (progress: UpdateProgress) => void): () => void;
  onUpdateDownloaded(handler: (payload: { version: string; releaseNotes?: string }) => void): () => void;
  onUpdateError(handler: (error: { message: string }) => void): () => void;
  createBackup(): Promise<IpcResponse<ServiceBackup>>;
  listBackups(): Promise<IpcResponse<ServiceBackup[]>>;
  getBackup(id: string): Promise<IpcResponse<ServiceBackup | null>>;
  deleteBackup(id: string): Promise<IpcResponse<boolean>>;
  restoreBackup(id: string): Promise<IpcResponse<{ success: number; failed: number; errors: string[] }>>;
}

declare global {
  interface Window {
    serviceAPI: ServiceAPI;
  }
}

export {};


