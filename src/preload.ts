import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import type {
  IpcResponse,
  ServiceAction,
  ServiceControlResult,
  ServiceInfo,
  ServiceListFilters,
  ServiceAPI,
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
};

contextBridge.exposeInMainWorld('serviceAPI', api);

