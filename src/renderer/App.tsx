import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ServiceInfo, ExportFormat, ServiceAction } from '../types/service';
import ServiceTable from './components/ServiceTable';
import ServiceDetails from './components/ServiceDetails';
import Header from './components/Header';
import Footer from './components/Footer';
import Settings from './components/Settings';
import BackupManager from './components/BackupManager';
import LogViewer from './components/LogViewer';
import Toast, { useToast } from './components/Toast';
import { UpdateNotification } from './components/UpdateNotification';
import { useSettings } from './hooks/useSettings';
import { useUserPreferences } from './hooks/useUserPreferences';
import { getUserFriendlyErrorMessage } from '../utils/errorHandler';

const VALID_SERVICE_ACTIONS = new Set<ServiceAction>(['start', 'stop', 'restart', 'enable', 'disable']);

const App: React.FC = () => {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backupsOpen, setBackupsOpen] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedForLogs, setSelectedForLogs] = useState<{ id: string; name: string } | null>(null);
  
  const isRefreshingRef = useRef(false);
  
  const { toasts, addToast, removeToast } = useToast();
  const { settings, updateSettings } = useSettings();
  const { favorites, isFavorite, toggleFavorite, getNote, setNote, deleteNote } = useUserPreferences();

  const platform = navigator.platform || 'Unknown';
  const os = platform.includes('Win') ? 'Windows' : platform.includes('Mac') ? 'macOS' : 'Linux';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const refreshServices = useCallback(async (showLoader = true) => {
    if (isRefreshingRef.current) return;
    
    if (!window.serviceAPI) {
      console.error('Service API not available');
      addToast('Service API not available. Please restart the application.', 'error');
      return;
    }

    isRefreshingRef.current = true;
    const startTime = performance.now();
    
    if (showLoader) {
      setLoading(true);
    }

    try {
      const response = await window.serviceAPI.listServices({});

      if (!response || !response.ok) {
        const message = response?.error?.message ?? 'Failed to load services';
        throw new Error(message);
      }

      const serviceList = Array.isArray(response.data) ? response.data : [];
      setServices(serviceList);
      setLastUpdated(new Date());
      
      const endTime = performance.now();
      setLoadTime(Math.round(endTime - startTime));
    } catch (error) {
      console.error('Failed to refresh services', error);
      const friendlyMessage = getUserFriendlyErrorMessage(error, 'load services');
      addToast(friendlyMessage, 'error');
      setLoadTime(null);
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, [addToast]);

  const executeServiceAction = useCallback(async (serviceId: string, action: string, serviceName: string) => {
    if (!window.serviceAPI) {
      return { success: false, error: 'Service API not available' };
    }

    if (!VALID_SERVICE_ACTIONS.has(action)) {
      return { success: false, error: `Invalid action: ${action}` };
    }

    const serviceAction = action as ServiceAction;

    try {
      const response = await window.serviceAPI.controlService(serviceId, serviceAction);
      if (!response || !response.ok) {
        const message = response?.error?.message ?? 'Action failed';
        throw new Error(message);
      }
      return { success: true };
    } catch (error) {
      console.error(`Failed to ${action} service`, error);
      const friendlyMessage = getUserFriendlyErrorMessage(error, `${action} ${serviceName}`);
      return { success: false, error: friendlyMessage };
    }
  }, []);

  const filteredServices = React.useMemo(() => {
    const search = debouncedSearchQuery.trim().toLowerCase();
    const hasSearchQuery = search.length > 0;
    const hasStatusFilter = statusFilter !== 'all';

    let filtered = services;

    if (hasSearchQuery || hasStatusFilter) {
      filtered = services.filter((item) => {
        if (hasStatusFilter) {
          const status = (item.status || '').toLowerCase();
          
          if (statusFilter === 'running') {
            if (!status.includes('active') && !status.includes('running') && !status.includes('started')) {
              return false;
            }
          } else if (statusFilter === 'stopped') {
            if (!status.includes('inactive') && !status.includes('stopped') && !status.includes('dead')) {
              return false;
            }
          }
        }

        if (hasSearchQuery) {
          const name = item.name.toLowerCase();
          if (name.includes(search)) return true;
          
          if (item.description) {
            const desc = item.description.toLowerCase();
            if (desc.includes(search)) return true;
          }
          
          if (item.executable) {
            const exec = item.executable.toLowerCase();
            if (exec.includes(search)) return true;
          }
          
          return false;
        }

        return true;
      });
    }

    const favoritesList = Array.from(favorites);
    const favoriteServices = filtered.filter(s => favoritesList.includes(s.id));
    const nonFavoriteServices = filtered.filter(s => !favoritesList.includes(s.id));
    
    return [...favoriteServices, ...nonFavoriteServices];
  }, [services, debouncedSearchQuery, statusFilter, favorites]);

  useEffect(() => {
    if (selectedService && !filteredServices.find(s => s.id === selectedService.id)) {
      setSelectedService(null);
    }
  }, [filteredServices, selectedService]);

  const handleServiceSelect = useCallback(async (service: ServiceInfo) => {
    setSelectedService(service);
    
    if (!window.serviceAPI) {
      return;
    }

    requestIdleCallback(() => {
      window.serviceAPI.getServiceDetails(service.id).then(response => {
        if (response && response.ok && response.data) {
          setSelectedService(prev => {
            if (prev?.id === service.id) {
              return { ...service, ...response.data };
            }
            return prev;
          });
        }
      }).catch(error => {
        console.warn('Failed to load service details', error);
      });
    });
  }, []);

  const handleServiceAction = useCallback(async (serviceId: string, action: string, serviceName: string) => {
    const result = await executeServiceAction(serviceId, action, serviceName);
    if (result.success) {
      addToast(`✓ ${action.charAt(0).toUpperCase() + action.slice(1)} requested for ${serviceName}`, 'success');
      await refreshServices(false);
    } else {
      addToast(result.error || 'Action failed', 'error');
    }
  }, [executeServiceAction, addToast, refreshServices]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!window.serviceAPI) {
      addToast('Service API not available', 'error');
      return;
    }

    try {
      const response = await window.serviceAPI.exportServices(format, filteredServices);
      if (!response || !response.ok || !response.data) {
        const message = response?.error?.message ?? 'Export failed';
        throw new Error(message);
      }

      const { content, filename } = response.data;
      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/plain',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast(`✓ Exported ${filteredServices.length} services as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Failed to export services', error);
      const friendlyMessage = getUserFriendlyErrorMessage(error, 'export services');
      addToast(friendlyMessage, 'error');
    }
  }, [filteredServices, addToast]);

  const handleViewLogs = useCallback((serviceId: string, serviceName: string) => {
    setSelectedForLogs({ id: serviceId, name: serviceName });
    setLogsOpen(true);
  }, []);

  const handleToggleFavorite = useCallback((serviceId: string) => {
    toggleFavorite(serviceId);
  }, [toggleFavorite]);

  const handleCloseLogs = useCallback(() => {
    setLogsOpen(false);
    setSelectedForLogs(null);
  }, []);

  useEffect(() => {
    refreshServices(true);
    
    if (window.serviceAPI) {
      window.serviceAPI.getAppVersion().then(version => {
        setAppVersion(version);
      }).catch(error => {
        console.error('Failed to get app version:', error);
      });
    }
  }, [refreshServices]);

  useEffect(() => {
    if (!settings.autoUpdate) return;

    const intervalMs = settings.updateInterval * 60 * 1000;
    
    const timer = setInterval(() => {
      if (isWindowFocused && !document.hidden) {
        refreshServices(false);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [settings.autoUpdate, settings.updateInterval, refreshServices, isWindowFocused]);

  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
      if (settings.autoUpdate) {
        refreshServices(false);
      }
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setIsWindowFocused(true);
        if (settings.autoUpdate) {
          refreshServices(false);
        }
      } else {
        setIsWindowFocused(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshServices, settings.autoUpdate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        refreshServices(true);
      }
      
      if (event.key === 'Escape') {
        event.preventDefault();
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (backupsOpen) {
          setBackupsOpen(false);
        } else if (selectedService) {
          setSelectedService(null);
        }
      }
      
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        setSettingsOpen(true);
      }
      
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setBackupsOpen(true);
      }
      
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        document.getElementById('searchInput')?.focus();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault();
        if (selectedService) {
          handleViewLogs(selectedService.id, selectedService.name);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [refreshServices, selectedService, settingsOpen, backupsOpen, handleViewLogs]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header 
        loading={loading}
        theme={settings.theme}
        onToggleTheme={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
        onRefresh={() => refreshServices(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenBackups={() => setBackupsOpen(true)}
        onExport={handleExport}
      />

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
          <ServiceTable
            services={filteredServices}
            selectedId={selectedService?.id || null}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            loading={loading}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onServiceSelect={handleServiceSelect}
            onServiceAction={handleServiceAction}
            onToggleFavorite={handleToggleFavorite}
            onViewLogs={handleViewLogs}
            isFavorite={isFavorite}
          />

          <ServiceDetails
            service={selectedService}
          />
        </div>
      </main>

      <Footer
        serviceCount={filteredServices.length}
        totalCount={services.length}
        lastUpdated={lastUpdated}
        platform={os}
        loadTime={loadTime}
        autoUpdateEnabled={settings.autoUpdate}
        updateInterval={settings.updateInterval}
        appVersion={appVersion}
      />

      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      <BackupManager
        isOpen={backupsOpen}
        onClose={() => setBackupsOpen(false)}
        onBackupCreated={() => refreshServices(false)}
      />

      {selectedForLogs && (
        <LogViewer
          serviceId={selectedForLogs.id}
          serviceName={selectedForLogs.name}
          isOpen={logsOpen}
          onClose={handleCloseLogs}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
      <UpdateNotification />
    </div>
  );
};

export default App;
