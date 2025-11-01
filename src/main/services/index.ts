import os from 'node:os';

import type {
  ServiceAction,
  ServiceControlResult,
  ServiceInfo,
  ServiceListFilters,
} from '../../types/service';
import * as linuxProvider from './linux';
import * as macProvider from './macos';
import * as windowsProvider from './windows';

type ServiceProvider = {
  listServices(filters?: ServiceListFilters): Promise<ServiceInfo[]>;
  controlService?(serviceId: string, action: ServiceAction): Promise<ServiceControlResult>;
  getServiceDetails?(serviceId: string): Promise<ServiceInfo | null>;
};

function loadProvider(): ServiceProvider {
  switch (process.platform) {
    case 'win32':
      return windowsProvider;
    case 'darwin':
      return macProvider;
    case 'linux':
    default:
      return linuxProvider;
  }
}

const provider: ServiceProvider = loadProvider();

export async function listServices(filters: ServiceListFilters = {}): Promise<ServiceInfo[]> {
  return provider.listServices(filters);
}

export async function controlService(
  serviceId: string,
  action: ServiceAction
): Promise<ServiceControlResult> {
  if (!provider.controlService) {
    throw new Error(`Service control is not available on ${os.type()}`);
  }
  return provider.controlService(serviceId, action);
}

export async function getServiceDetails(serviceId: string): Promise<ServiceInfo | null> {
  if (provider.getServiceDetails) {
    return provider.getServiceDetails(serviceId);
  }

  const services = await provider.listServices({ serviceId });
  return services.find((item) => item.id === serviceId || item.name === serviceId) ?? null;
}

