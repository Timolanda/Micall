import { EventEmitter } from 'events';
import { performanceService } from './PerformanceService';
import { backupService } from '../utils/backup';
import logger from '../utils/logger';
import { env } from '../config/environment';

interface SystemMetrics {
  cpu: number;
  memory: number;
  activeConnections: number;
  requestRate: number;
  errorRate: number;
  responseTime: number;
}

class MonitoringService extends EventEmitter {
  private metrics: SystemMetrics = {
    cpu: 0,
    memory: 0,
    activeConnections: 0,
    requestRate: 0,
    errorRate: 0,
    responseTime: 0
  };

  private readonly ALERT_THRESHOLDS = {
    cpu: 80, // 80% CPU usage
    memory: 85, // 85% memory usage
    errorRate: 5, // 5% error rate
    responseTime: 1000 // 1 second
  };

  constructor() {
    super();
    this.startMetricsCollection();
  }

  private startMetricsCollection() {
    setInterval(async () => {
      await this.collectMetrics();
      this.checkThresholds();
    }, 60000); // Every minute
  }

  private async collectMetrics() {
    try {
      const metrics = await performanceService.getSystemMetrics();
      this.metrics = {
        ...this.metrics,
        ...metrics
      };
      
      logger.debug('System metrics collected:', this.metrics);
    } catch (error) {
      logger.error('Failed to collect system metrics:', error);
    }
  }

  private checkThresholds() {
    if (this.metrics.cpu > this.ALERT_THRESHOLDS.cpu) {
      this.emit('alert', {
        type: 'high-cpu',
        value: this.metrics.cpu,
        threshold: this.ALERT_THRESHOLDS.cpu
      });
    }

    if (this.metrics.memory > this.ALERT_THRESHOLDS.memory) {
      this.emit('alert', {
        type: 'high-memory',
        value: this.metrics.memory,
        threshold: this.ALERT_THRESHOLDS.memory
      });
    }

    // Add more threshold checks as needed
  }

  public getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }
}

export const monitoringService = new MonitoringService(); 