import { performance } from 'perf_hooks';
import { redis } from '../utils/cache';
import logger from '../utils/logger';

interface RouteMetrics {
  count: number;
  total: number;
  average: number;
  min: number;
  max: number;
}

export class PerformanceService {
  private readonly prefix = 'perf:';
  private readonly window = 3600; // 1 hour in seconds

  async recordMetric(route: string, duration: number) {
    const key = this.prefix + route;
    try {
      const current = await redis.get(key);
      const metrics: RouteMetrics = current ? JSON.parse(current) : {
        count: 0,
        total: 0,
        average: 0,
        min: Infinity,
        max: -Infinity
      };

      metrics.count++;
      metrics.total += duration;
      metrics.average = metrics.total / metrics.count;
      metrics.min = Math.min(metrics.min, duration);
      metrics.max = Math.max(metrics.max, duration);

      await redis.set(key, JSON.stringify(metrics), this.window);
    } catch (error) {
      logger.error('Error recording performance metric:', error);
    }
  }

  async getMetrics(route: string): Promise<RouteMetrics | null> {
    try {
      const data = await redis.get(this.prefix + route);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      return null;
    }
  }
}

export const performanceService = new PerformanceService(); 