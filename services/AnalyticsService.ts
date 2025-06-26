import { Emergency } from '../models/Emergency';
import { User } from '../models/User';
import { cacheService } from '../utils/cache';
import logger from '../utils/logger';

interface EmergencyStats {
  total: number;
  byType: Record<string, number>;
  averageResponseTime: number;
  resolvedPercentage: number;
}

interface UserStats {
  total: number;
  activeResponders: number;
  verifiedContacts: number;
  averageContactsPerUser: number;
}

export class AnalyticsService {
  private CACHE_TTL = 3600; // 1 hour

  async getEmergencyStats(timeRange: 'day' | 'week' | 'month'): Promise<EmergencyStats> {
    const cacheKey = `stats:emergency:${timeRange}`;
    const cached = await cacheService.get<EmergencyStats>(cacheKey);
    if (cached) return cached;

    const startDate = this.getStartDate(timeRange);
    
    const emergencies = await Emergency.find({
      createdAt: { $gte: startDate }
    }).lean();

    const stats = {
      total: emergencies.length,
      byType: this.countByType(emergencies),
      averageResponseTime: this.calculateAverageResponseTime(emergencies),
      resolvedPercentage: this.calculateResolvedPercentage(emergencies)
    };

    await cacheService.set(cacheKey, stats, this.CACHE_TTL);
    return stats;
  }

  async generateReport(startDate: Date, endDate: Date) {
    const report = await Emergency.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status',
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          avgResponseTime: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1
        }
      }
    ]);

    return report;
  }

  private getStartDate(timeRange: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }

  private countByType(emergencies: any[]): Record<string, number> {
    return emergencies.reduce((acc, emergency) => {
      acc[emergency.type] = (acc[emergency.type] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateAverageResponseTime(emergencies: any[]): number {
    const resolvedEmergencies = emergencies.filter(e => e.resolvedAt);
    if (resolvedEmergencies.length === 0) return 0;

    const totalTime = resolvedEmergencies.reduce((sum, e) => {
      return sum + (new Date(e.resolvedAt).getTime() - new Date(e.createdAt).getTime());
    }, 0);

    return totalTime / resolvedEmergencies.length / 1000; // Convert to seconds
  }

  private calculateResolvedPercentage(emergencies: any[]): number {
    if (emergencies.length === 0) return 0;
    const resolved = emergencies.filter(e => e.status === 'resolved').length;
    return (resolved / emergencies.length) * 100;
  }
} 