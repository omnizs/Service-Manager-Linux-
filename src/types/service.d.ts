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
}

export interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: SerializedError;
}

export interface ServiceAPI {
  listServices(filters?: ServiceListFilters): Promise<IpcResponse<ServiceInfo[]>>;
  controlService(serviceId: string, action: ServiceAction): Promise<IpcResponse<ServiceControlResult>>;
  getServiceDetails(serviceId: string): Promise<IpcResponse<ServiceInfo | null>>;
  openPath(targetPath: string): void;
  showError(message: string): Promise<void>;
  onServiceEvent(handler: (payload: unknown) => void): () => void;
}

declare global {
  interface Window {
    serviceAPI: ServiceAPI;
  }
}

export {};


