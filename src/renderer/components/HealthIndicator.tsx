import React, { useState, useEffect, useCallback, memo } from 'react';
import type { ServiceHealthStatus, HealthStatus, ServiceStatus } from '../../types/service';

interface HealthIndicatorProps {
  serviceId: string;
  expectedStatus?: ServiceStatus;
}

const HealthIndicator: React.FC<HealthIndicatorProps> = memo(({ serviceId, expectedStatus = 'active' }) => {
  const [healthStatus, setHealthStatus] = useState<ServiceHealthStatus | null>(null);
  const [isMonitored, setIsMonitored] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchHealthStatus = useCallback(async () => {
    if (!window.serviceAPI) return;

    try {
      const response = await window.serviceAPI.getHealthStatus(serviceId);
      if (response?.ok && response.data && response.data.length > 0) {
        setHealthStatus(response.data[0]);
        setIsMonitored(response.data[0].isMonitored);
      } else {
        setHealthStatus(null);
        setIsMonitored(false);
      }
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    }
  }, [serviceId]);

  useEffect(() => {
    void fetchHealthStatus();

    if (!window.serviceAPI) return;

    const unsubscribe = window.serviceAPI.onHealthEvent((event) => {
      if (event.serviceId === serviceId) {
        void fetchHealthStatus();
      }
    });

    const interval = setInterval(() => {
      void fetchHealthStatus();
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [serviceId, fetchHealthStatus]);

  const handleToggleMonitoring = async () => {
    if (!window.serviceAPI) return;

    setLoading(true);
    try {
      if (isMonitored) {
        const response = await window.serviceAPI.stopHealthMonitoring(serviceId);
        if (!response?.ok) {
          throw new Error(response?.error?.message ?? 'Failed to stop monitoring');
        }
      } else {
        const response = await window.serviceAPI.startHealthMonitoring(serviceId, expectedStatus);
        if (!response?.ok) {
          throw new Error(response?.error?.message ?? 'Failed to start monitoring');
        }
      }
      await fetchHealthStatus();
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status: HealthStatus): string => {
    switch (status) {
      case 'healthy':
        return 'text-emerald-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'unhealthy':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getHealthIcon = (status: HealthStatus): JSX.Element => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        );
      case 'degraded':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        );
      case 'unhealthy':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        );
    }
  };

  const formatUptime = (uptime: number): string => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const formatLastCheck = (timestamp: number): string => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isMonitored && !healthStatus) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Health Monitoring
          </h3>
        </div>
        <button
          onClick={handleToggleMonitoring}
          disabled={loading}
          className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Starting...' : 'Start Monitoring'}
        </button>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Monitor this service for health and uptime
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Health Status
        </h3>
        <button
          onClick={handleToggleMonitoring}
          disabled={loading}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
        >
          {loading ? '...' : isMonitored ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </div>

      {healthStatus && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={getHealthColor(healthStatus.status)}>
              {getHealthIcon(healthStatus.status)}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {healthStatus.status}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last check: {formatLastCheck(healthStatus.lastCheck)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
              <div className="text-gray-500 dark:text-gray-400 mb-1">Uptime</div>
              <div className="text-gray-900 dark:text-white font-medium">
                {formatUptime(healthStatus.uptime)}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
              <div className="text-gray-500 dark:text-gray-400 mb-1">Success Rate</div>
              <div className="text-gray-900 dark:text-white font-medium">
                {healthStatus.successRate.toFixed(1)}%
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
              <div className="text-gray-500 dark:text-gray-400 mb-1">Total Checks</div>
              <div className="text-gray-900 dark:text-white font-medium">
                {healthStatus.totalChecks}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
              <div className="text-gray-500 dark:text-gray-400 mb-1">Failures</div>
              <div className="text-gray-900 dark:text-white font-medium">
                {healthStatus.failureCount}
              </div>
            </div>
          </div>

          {healthStatus.consecutiveFailures > 0 && (
            <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded">
              ⚠️ {healthStatus.consecutiveFailures} consecutive failure{healthStatus.consecutiveFailures !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

HealthIndicator.displayName = 'HealthIndicator';

export default HealthIndicator;
