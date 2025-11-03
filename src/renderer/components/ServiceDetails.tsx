import React, { memo } from 'react';
import type { ServiceInfo } from '../../types/service';

interface ServiceDetailsProps {
  service: ServiceInfo | null;
}

const ServiceDetails: React.FC<ServiceDetailsProps> = memo(({ service }) => {
  const formatStatusLabel = (label: string): string => {
    if (!label) return 'Unknown';
    const cleaned = label.replace(/\s*\([^)]*\)/g, '').trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  };

  const formatStartupType = (value: string | undefined): string => {
    if (!value) return 'Unknown';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const handleOpenPath = (path: string) => {
    window.serviceAPI.openPath(path);
  };

  if (!service) {
    return (
      <aside className="w-full lg:w-96 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center justify-center text-center">
        <svg width="64" height="64" viewBox="0 0 48 48" fill="none" className="text-gray-300 dark:text-gray-700 mb-4">
          <path d="M24 4C12.96 4 4 12.96 4 24C4 35.04 12.96 44 24 44C35.04 44 44 35.04 44 24C44 12.96 35.04 4 24 4ZM24 40C15.18 40 8 32.82 8 24C8 15.18 15.18 8 24 8C32.82 8 40 15.18 40 24C40 32.82 32.82 40 24 40ZM22 22V14H26V22H22ZM22 34V26H26V34H22Z" fill="currentColor" opacity="0.3"/>
        </svg>
        <p className="text-gray-500 dark:text-gray-400">Select a service to view details</p>
      </aside>
    );
  }

  return (
    <aside className="w-full lg:w-96 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service Details</h2>
      </div>
      
      <div className="p-6 overflow-auto max-h-[calc(100vh-300px)]">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Name</dt>
            <dd className="text-sm text-gray-900 dark:text-white font-medium">{service.name || service.id}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Identifier</dt>
            <dd className="text-sm text-gray-900 dark:text-gray-300 font-mono">{service.id}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Status</dt>
            <dd className="text-sm text-gray-900 dark:text-white">{formatStatusLabel(service.statusLabel || service.status || 'unknown')}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Startup Type</dt>
            <dd className="text-sm text-gray-900 dark:text-white">{formatStartupType(service.startupType)}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Executable</dt>
            <dd className="text-sm text-gray-900 dark:text-gray-300 font-mono break-all">{service.executable || '—'}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">PID</dt>
            <dd className="text-sm text-gray-900 dark:text-white">{service.pid ? String(service.pid) : '—'}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Description</dt>
            <dd className="text-sm text-gray-900 dark:text-gray-300">{service.description || '—'}</dd>
          </div>

          {service.unitFile && (
            <div>
              <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Unit File</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-300">
                <div className="flex flex-col gap-2">
                  <span className="font-mono break-all">{service.unitFile}</span>
                  <button
                    onClick={() => handleOpenPath(service.unitFile as string)}
                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7.5A1.5 1.5 0 014.5 6h4.086a1.5 1.5 0 011.06.44l1.414 1.414a1.5 1.5 0 001.06.44H19.5A1.5 1.5 0 0121 9.794v8.706A1.5 1.5 0 0119.5 20h-15A1.5 1.5 0 013 18.5V7.5z" />
                      </svg>
                      <span>Show in File Manager</span>
                    </span>
                  </button>
                </div>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </aside>
  );
});

ServiceDetails.displayName = 'ServiceDetails';

export default ServiceDetails;

