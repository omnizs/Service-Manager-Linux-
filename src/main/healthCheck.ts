import { BrowserWindow } from 'electron';
import { getServiceDetails, controlService } from './services';
import type {
  ServiceStatus,
  HealthStatus,
  HealthCheckEvent,
  ServiceHealthStatus,
  HealthCheckConfig,
} from '../types/service';

interface MonitoredService {
  serviceId: string;
  serviceName: string;
  expectedStatus?: ServiceStatus;
  startTime: number;
  lastCheck: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalChecks: number;
  failureCount: number;
  currentStatus: HealthStatus;
}

const DEFAULT_CONFIG: HealthCheckConfig = {
  enabled: true,
  interval: 30000,
  failureThreshold: 3,
  autoRestart: false,
  notifyOnFailure: true,
};

class HealthCheckManager {
  private monitoredServices = new Map<string, MonitoredService>();
  private config: HealthCheckConfig = { ...DEFAULT_CONFIG };
  private intervalId: NodeJS.Timeout | null = null;
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<HealthCheckConfig>): HealthCheckConfig {
    this.config = { ...this.config, ...updates };
    
    if (this.config.enabled && this.monitoredServices.size > 0) {
      this.startMonitoring();
    } else if (!this.config.enabled) {
      this.stopMonitoring();
    }
    
    return { ...this.config };
  }

  startServiceMonitoring(serviceId: string, serviceName?: string, expectedStatus?: ServiceStatus): boolean {
    if (this.monitoredServices.has(serviceId)) {
      const monitored = this.monitoredServices.get(serviceId);
      if (monitored) {
        if (expectedStatus && monitored.expectedStatus !== expectedStatus) {
          monitored.expectedStatus = expectedStatus;
        }
        if (serviceName && serviceName.trim() && monitored.serviceName !== serviceName.trim()) {
          monitored.serviceName = serviceName.trim();
        }
      }
      return true;
    }

    this.monitoredServices.set(serviceId, {
      serviceId,
      serviceName: serviceName?.trim() || serviceId,
      expectedStatus: expectedStatus || 'active',
      startTime: Date.now(),
      lastCheck: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      totalChecks: 0,
      failureCount: 0,
      currentStatus: 'unknown',
    });

    if (this.config.enabled && !this.intervalId) {
      this.startMonitoring();
    }

    return true;
  }

  stopServiceMonitoring(serviceId: string): boolean {
    const removed = this.monitoredServices.delete(serviceId);
    
    if (this.monitoredServices.size === 0 && this.intervalId) {
      this.stopMonitoring();
    }
    
    return removed;
  }

  getHealthStatus(serviceId?: string): ServiceHealthStatus[] {
    const services = serviceId 
      ? [this.monitoredServices.get(serviceId)].filter(Boolean) as MonitoredService[]
      : Array.from(this.monitoredServices.values());

    return services.map(service => {
      const uptime = Date.now() - service.startTime;
      const successRate = service.totalChecks > 0 
        ? ((service.totalChecks - service.failureCount) / service.totalChecks) * 100 
        : 100;

      return {
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        status: service.currentStatus,
        lastCheck: service.lastCheck,
        uptime,
        consecutiveFailures: service.consecutiveFailures,
        consecutiveSuccesses: service.consecutiveSuccesses,
        totalChecks: service.totalChecks,
        failureCount: service.failureCount,
        successRate,
        isMonitored: true,
        expectedStatus: service.expectedStatus,
      };
    });
  }

  private startMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      void this.performHealthChecks();
    }, this.config.interval);

    void this.performHealthChecks();
  }

  private stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async performHealthChecks(): Promise<void> {
    if (!this.config.enabled) return;

    const checks = Array.from(this.monitoredServices.entries()).map(
      ([serviceId, monitored]) => this.checkService(serviceId, monitored)
    );

    await Promise.allSettled(checks);
  }

  private async checkService(serviceId: string, monitored: MonitoredService): Promise<void> {
    const previousStatus = monitored.currentStatus;
    
    try {
      const serviceDetails = await getServiceDetails(serviceId);
      
      if (!serviceDetails) {
        this.handleFailure(monitored, 'Service not found');
        this.emitHealthEvent(serviceId, monitored, previousStatus, 'Service not found');
        return;
      }

      monitored.lastCheck = Date.now();
      monitored.totalChecks++;

      const isHealthy = this.evaluateServiceHealth(serviceDetails.status, monitored.expectedStatus);
      
      if (isHealthy) {
        monitored.consecutiveSuccesses++;
        monitored.consecutiveFailures = 0;
        
        if (monitored.consecutiveSuccesses >= 2) {
          monitored.currentStatus = 'healthy';
        } else if (previousStatus === 'degraded' || previousStatus === 'unhealthy') {
          monitored.currentStatus = 'degraded';
        } else {
          monitored.currentStatus = 'healthy';
        }
      } else {
        this.handleFailure(monitored, `Service status is ${serviceDetails.status}, expected ${monitored.expectedStatus}`);
      }

      if (monitored.currentStatus !== previousStatus) {
        this.emitHealthEvent(serviceId, monitored, previousStatus);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.handleFailure(monitored, message);
      this.emitHealthEvent(serviceId, monitored, previousStatus, message);
    }
  }

  private evaluateServiceHealth(actualStatus: ServiceStatus, expectedStatus?: ServiceStatus): boolean {
    if (!expectedStatus) {
      return actualStatus === 'active';
    }

    return actualStatus === expectedStatus;
  }

  private handleFailure(monitored: MonitoredService, message: string): void {
    monitored.consecutiveFailures++;
    monitored.consecutiveSuccesses = 0;
    monitored.failureCount++;

    if (monitored.consecutiveFailures >= this.config.failureThreshold) {
      monitored.currentStatus = 'unhealthy';
      
      if (this.config.autoRestart) {
        void this.attemptAutoRestart(monitored);
      }
    } else if (monitored.consecutiveFailures > 0) {
      monitored.currentStatus = 'degraded';
    }

    if (this.config.notifyOnFailure && monitored.currentStatus === 'unhealthy') {
      console.log(`[HEALTH] Service ${monitored.serviceName} is unhealthy: ${message}`);
    }
  }

  private async attemptAutoRestart(monitored: MonitoredService): Promise<void> {
    try {
      console.log(`[HEALTH] Attempting auto-restart for service ${monitored.serviceName}`);
      await controlService(monitored.serviceId, 'restart');
      monitored.consecutiveFailures = 0;
    } catch (error) {
      console.error(`[HEALTH] Failed to auto-restart service ${monitored.serviceName}:`, error);
    }
  }

  private emitHealthEvent(
    serviceId: string,
    monitored: MonitoredService,
    previousStatus: HealthStatus,
    message?: string
  ): void {
    if (!this.mainWindow) return;

    const event: HealthCheckEvent = {
      serviceId,
      timestamp: Date.now(),
      status: monitored.currentStatus,
      previousStatus,
      consecutiveFailures: monitored.consecutiveFailures,
      message,
    };

    this.mainWindow.webContents.send('health:event', event);
  }

  cleanup(): void {
    this.stopMonitoring();
    this.monitoredServices.clear();
  }
}

export const healthCheckManager = new HealthCheckManager();
