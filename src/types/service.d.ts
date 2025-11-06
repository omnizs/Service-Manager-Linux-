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

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheckEvent {
  serviceId: string;
  timestamp: number;
  status: HealthStatus;
  previousStatus?: HealthStatus;
  consecutiveFailures: number;
  message?: string;
}

export interface ServiceHealthStatus {
  serviceId: string;
  serviceName: string;
  status: HealthStatus;
  lastCheck: number;
  uptime: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalChecks: number;
  failureCount: number;
  successRate: number;
  isMonitored: boolean;
  expectedStatus?: ServiceStatus;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  failureThreshold: number;
  autoRestart: boolean;
  notifyOnFailure: boolean;
}

export interface ServiceLogs {
  serviceId: string;
  serviceName: string;
  logs: string;
  lines: number;
  timestamp: number;
}

export type ExportFormat = 'csv' | 'json' | 'markdown';

export interface ExportResult {
  format: ExportFormat;
  content: string;
  filename: string;
}

export interface ServiceNote {
  serviceId: string;
  note: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferences {
  favorites: string[];
  notes: Record<string, ServiceNote>;
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
  getHealthStatus(serviceId?: string): Promise<IpcResponse<ServiceHealthStatus[]>>;
  startHealthMonitoring(serviceId: string, expectedStatus?: ServiceStatus): Promise<IpcResponse<boolean>>;
  stopHealthMonitoring(serviceId: string): Promise<IpcResponse<boolean>>;
  getHealthConfig(): Promise<IpcResponse<HealthCheckConfig>>;
  updateHealthConfig(config: Partial<HealthCheckConfig>): Promise<IpcResponse<HealthCheckConfig>>;
  onHealthEvent(handler: (event: HealthCheckEvent) => void): () => void;
  getServiceLogs(serviceId: string, lines?: number): Promise<IpcResponse<ServiceLogs>>;
  exportServices(format: ExportFormat, services: ServiceInfo[]): Promise<IpcResponse<ExportResult>>;
}

declare global {
  interface Window {
    serviceAPI: ServiceAPI;
  }
}

export {};


