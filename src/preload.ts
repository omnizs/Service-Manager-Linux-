import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import type {
  IpcResponse,
  ServiceAction,
  ServiceControlResult,
  ServiceInfo,
  ServiceListFilters,
  ServiceAPI,
  UpdateInfo,
  UpdateProgress,
} from './types/service';

const api: ServiceAPI = {
  listServices: (filters?: ServiceListFilters) =>
    ipcRenderer.invoke('services:list', filters || {}) as Promise<IpcResponse<ServiceInfo[]>>,
  controlService: (serviceId: string, action: ServiceAction) =>
    ipcRenderer.invoke('services:control', { serviceId, action }) as Promise<
      IpcResponse<ServiceControlResult>
    >,
  getServiceDetails: (serviceId: string) =>
    ipcRenderer.invoke('services:details', serviceId) as Promise<IpcResponse<ServiceInfo | null>>,
  openPath: (targetPath: string) => {
    ipcRenderer.send('app:openPath', targetPath);
  },
  showError: (message: string) =>
    ipcRenderer.invoke('app:showErrorDialog', message) as Promise<void>,
  onServiceEvent: (handler: (payload: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, payload: unknown) => handler(payload);
    ipcRenderer.on('services:event', listener);
    return () => ipcRenderer.removeListener('services:event', listener);
  },
  checkForUpdates: () =>
    ipcRenderer.invoke('app:checkForUpdates') as Promise<IpcResponse<UpdateInfo>>,
  manualUpdateCheck: () =>
    ipcRenderer.invoke('app:manualUpdateCheck') as Promise<IpcResponse<void>>,
  applyPendingUpdate: () =>
    ipcRenderer.invoke('app:applyPendingUpdate') as Promise<IpcResponse<boolean>>,
  getAppVersion: () =>
    ipcRenderer.invoke('app:getVersion') as Promise<string>,
  onUpdateAvailable: (handler: (updateInfo: UpdateInfo) => void) => {
    const npmListener = (_event: IpcRendererEvent, updateInfo: UpdateInfo) => handler(updateInfo);
    const regularListener = (_event: IpcRendererEvent, data: { version: string; currentVersion: string; releaseNotes?: string }) => {
      handler({
        available: true,
        currentVersion: data.currentVersion,
        latestVersion: data.version,
        installMethod: 'packaged',
        releaseNotes: data.releaseNotes,
      });
    };
    ipcRenderer.on('update:available-npm', npmListener);
    ipcRenderer.on('update:available', regularListener);
    return () => {
      ipcRenderer.removeListener('update:available-npm', npmListener);
      ipcRenderer.removeListener('update:available', regularListener);
    };
  },
  onUpdateProgress: (handler: (progress: UpdateProgress) => void) => {
    const listener = (_event: IpcRendererEvent, progress: UpdateProgress) => handler(progress);
    ipcRenderer.on('update:progress', listener);
    return () => ipcRenderer.removeListener('update:progress', listener);
  },
  onUpdateDownloaded: (handler: (payload: { version: string; releaseNotes?: string }) => void) => {
    const listener = (_event: IpcRendererEvent, payload: { version: string; releaseNotes?: string }) => handler(payload);
    ipcRenderer.on('update:downloaded', listener);
    return () => ipcRenderer.removeListener('update:downloaded', listener);
  },
  onUpdateError: (handler: (error: { message: string }) => void) => {
    const listener = (_event: IpcRendererEvent, error: { message: string }) => handler(error);
    ipcRenderer.on('update:error', listener);
    return () => ipcRenderer.removeListener('update:error', listener);
  },
};

contextBridge.exposeInMainWorld('serviceAPI', api);

