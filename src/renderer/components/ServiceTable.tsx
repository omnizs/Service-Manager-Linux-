import React, { useState, useEffect, memo } from 'react';
import type { ServiceInfo } from '../../types/service';
import StatusBadge from './StatusBadge';
import ActionButton from './ActionButton';
import LoadingSpinner from './LoadingSpinner';

interface ServiceTableProps {
  loading?: boolean;
  services: ServiceInfo[];
  selectedId: string | null;
  searchQuery: string;
  statusFilter: string;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (filter: string) => void;
  onServiceSelect: (service: ServiceInfo) => void;
  onServiceAction: (serviceId: string, action: string, serviceName: string) => void;
}

// RAM optimization: reduce page size to lower memory usage
const ITEMS_PER_PAGE = 50;

const ServiceTable: React.FC<ServiceTableProps> = memo(({
  services,
  selectedId,
  searchQuery,
  statusFilter,
  loading = false,
  onSearchChange,
  onStatusFilterChange,
  onServiceSelect,
  onServiceAction,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(services.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, services.length);
  const pageServices = services.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const formatStartupType = (value: string | undefined): string => {
    if (!value) return 'Unknown';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const renderServiceIcon = (service: ServiceInfo) => {
    const statusText = `${service.statusLabel ?? ''} ${service.status ?? ''}`.toLowerCase();
    const isRunning = ['running', 'active', 'started'].some(token => statusText.includes(token));
    const isStopped = ['stopped', 'inactive', 'dead'].some(token => statusText.includes(token));

    const iconClass = isRunning
      ? 'text-emerald-400'
      : isStopped
        ? 'text-slate-500 dark:text-slate-400'
        : 'text-blue-400';

    return (
      <svg
        className={`w-4 h-4 flex-shrink-0 ${iconClass}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.6}
          d="M9.75 4.5h-3a1.5 1.5 0 00-1.5 1.5v3a1.5 1.5 0 001.5 1.5h3a1.5 1.5 0 001.5-1.5v-3a1.5 1.5 0 00-1.5-1.5zm7.5 0h-3a1.5 1.5 0 00-1.5 1.5v3a1.5 1.5 0 001.5 1.5h3a1.5 1.5 0 001.5-1.5v-3a1.5 1.5 0 00-1.5-1.5zm-7.5 7.5h-3a1.5 1.5 0 00-1.5 1.5v3a1.5 1.5 0 001.5 1.5h3a1.5 1.5 0 001.5-1.5v-3a1.5 1.5 0 00-1.5-1.5zm7.5 0h-3a1.5 1.5 0 00-1.5 1.5v3a1.5 1.5 0 001.5 1.5h3a1.5 1.5 0 001.5-1.5v-3a1.5 1.5 0 00-1.5-1.5z"
        />
      </svg>
    );
  };

  return (
    <section className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="searchInput"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Status:
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Services</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Service Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Startup</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Executable Path</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading && services.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12">
                  <LoadingSpinner text="Loading services..." />
                </td>
              </tr>
            ) : pageServices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'No services found matching the current filters' 
                    : 'No services available'}
                </td>
              </tr>
            ) : (
              pageServices.map((service) => (
                <tr
                  key={service.id}
                  onClick={() => onServiceSelect(service)}
                  className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedId === service.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {renderServiceIcon(service)}
                      <span className="truncate max-w-[220px]" title={service.name}>{service.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={service.status} label={service.statusLabel} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatStartupType(service.startupType)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400 truncate max-w-xs" title={service.executable || ''}>
                    {service.executable || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 truncate max-w-md" title={service.description || ''}>
                    {service.description || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <ActionButton
                        action="start"
                        enabled={service.canStart}
                        onClick={() => onServiceAction(service.id, 'start', service.name)}
                      />
                      <ActionButton
                        action="stop"
                        enabled={service.canStop}
                        onClick={() => onServiceAction(service.id, 'stop', service.name)}
                      />
                      <ActionButton
                        action="restart"
                        enabled={service.canRestart}
                        onClick={() => onServiceAction(service.id, 'restart', service.name)}
                      />
                      <ActionButton
                        action="enable"
                        enabled={service.canEnable}
                        onClick={() => onServiceAction(service.id, 'enable', service.name)}
                      />
                      <ActionButton
                        action="disable"
                        enabled={service.canDisable}
                        onClick={() => onServiceAction(service.id, 'disable', service.name)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {startIndex + 1}-{endIndex} of {services.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </section>
  );
});

ServiceTable.displayName = 'ServiceTable';

export default ServiceTable;

