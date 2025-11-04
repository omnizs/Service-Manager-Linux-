import React, { useState, useEffect, useCallback } from 'react';
import type { ServiceInfo } from '../types/service';
import ServiceTable from './components/ServiceTable';
import ServiceDetails from './components/ServiceDetails';
import Header from './components/Header';
import Footer from './components/Footer';
import Settings from './components/Settings';
import Toast, { useToast } from './components/Toast';
import { UpdateNotification } from './components/UpdateNotification';
import { useSettings } from './hooks/useSettings';
import { getUserFriendlyErrorMessage } from '../utils/errorHandler';

const App: React.FC = () => {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [filteredServices, setFilteredServices] = useState<ServiceInfo[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const { toasts, addToast, removeToast } = useToast();
  const { settings, updateSettings } = useSettings();

  // Platform detection
  const platform = navigator.platform || 'Unknown';
  const os = platform.includes('Win') ? 'Windows' : platform.includes('Mac') ? 'macOS' : 'Linux';

  // Refresh services - removed filter from API call to fix filtering
  const refreshServices = useCallback(async (showLoader = true) => {
    if (loading || isRefreshing) return;

    setIsRefreshing(true);
    const startTime = performance.now();
    
    if (showLoader) {
      setLoading(true);
    }

    try {
      // Fetch all services without filter (fixed: filter now works client-side)
      const response = await window.serviceAPI.listServices({});

      if (!response || !response.ok) {
        const message = response?.error?.message ?? 'Failed to load services';
        throw new Error(message);
      }

      setServices(Array.isArray(response.data) ? response.data : []);
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
      setIsRefreshing(false);
    }
  }, [loading, isRefreshing, addToast]);

  // Apply filters client-side - optimized with useMemo-style logic
  useEffect(() => {
    // Use requestIdleCallback for non-urgent filtering (React 19 optimization)
    const filterId = requestIdleCallback(() => {
      let filtered = services.slice();
      const search = searchQuery.trim().toLowerCase();

      // Search filter - optimized with early return
      if (search) {
        filtered = filtered.filter((item) => {
          const name = item.name.toLowerCase();
          if (name.includes(search)) return true;
          
          const desc = item.description?.toLowerCase();
          if (desc?.includes(search)) return true;
          
          const exec = item.executable?.toLowerCase();
          return exec?.includes(search) ?? false;
        });
      }

      // Status filter - map Running/Stopped to actual service statuses
      if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter((item) => {
          const status = (item.status || '').toLowerCase();
          
          if (statusFilter === 'running') {
            // Match: active, running, started
            return status.includes('active') || status.includes('running') || status.includes('started');
          } else if (statusFilter === 'stopped') {
            // Match: inactive, stopped, dead
            return status.includes('inactive') || status.includes('stopped') || status.includes('dead');
          }
          
          return false;
        });
      }

      setFilteredServices(filtered);

      // Clear selection if filtered out
      if (selectedService && !filtered.find(s => s.id === selectedService.id)) {
        setSelectedService(null);
      }
    });

    return () => cancelIdleCallback(filterId);
  }, [services, searchQuery, statusFilter, selectedService]);

  // Handle service selection
  const handleServiceSelect = useCallback(async (service: ServiceInfo) => {
    setSelectedService(service);

    try {
      const response = await window.serviceAPI.getServiceDetails(service.id);
      if (response && response.ok && response.data) {
        setSelectedService({
          ...service,
          ...response.data,
        });
      }
    } catch (error) {
      console.warn('Failed to load service details', error);
    }
  }, []);

  // Handle service actions
  const handleServiceAction = useCallback(async (serviceId: string, action: string, serviceName: string) => {
    try {
      const response = await window.serviceAPI.controlService(serviceId, action as any);
      if (!response || !response.ok) {
        const message = response?.error?.message ?? 'Action failed';
        throw new Error(message);
      }
      addToast(`✓ ${action.charAt(0).toUpperCase() + action.slice(1)} requested for ${serviceName}`, 'success');
      await refreshServices(false);
    } catch (error) {
      console.error(`Failed to ${action} service`, error);
      const friendlyMessage = getUserFriendlyErrorMessage(error, `${action} ${serviceName}`);
      addToast(friendlyMessage, 'error');
    }
  }, [addToast, refreshServices]);

  // Initial load
  useEffect(() => {
    refreshServices(true);
  }, []);

  // Auto-update based on settings
  useEffect(() => {
    if (!settings.autoUpdate) return;

    const intervalMs = settings.updateInterval * 60 * 1000; // Convert minutes to milliseconds
    
    const timer = setInterval(() => {
      if (isWindowFocused && !document.hidden) {
        refreshServices(false);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [settings.autoUpdate, settings.updateInterval, refreshServices, isWindowFocused]);

  // Window focus handling
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+R or Cmd+R to refresh
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        refreshServices(true);
      }
      
      // Escape to clear selection or close settings
      if (event.key === 'Escape') {
        event.preventDefault();
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (selectedService) {
          setSelectedService(null);
        }
      }
      
      // Ctrl+, or Cmd+, to open settings
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        setSettingsOpen(true);
      }
      
      // Ctrl+F or Cmd+F to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [refreshServices, selectedService, settingsOpen]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header 
        loading={loading}
        theme={settings.theme}
        onToggleTheme={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
        onRefresh={() => refreshServices(true)}
        onOpenSettings={() => setSettingsOpen(true)}
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
      />

      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
      <UpdateNotification />
    </div>
  );
};

export default App;
