import cron from 'node-cron';
import { backupService } from '../utils/backup';
import logger from '../utils/logger';
import { env } from '../config/environment';
import { sendNotification } from '../utils/notifications';
import { BackupMetadata } from '../types';

interface BackupConfig {
  schedule: string;
  retentionDays: number;
  notifyOnFailure: boolean;
  notifyEmail: string;
}

export class BackupScheduler {
  private config: BackupConfig;
  private tasks: cron.ScheduledTask[] = [];

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      schedule: '0 0 * * *', // Daily at midnight
      retentionDays: 30,
      notifyOnFailure: true,
      notifyEmail: env.ADMIN_EMAIL,
      ...config
    };
  }

  start() {
    // Schedule regular backups
    this.tasks.push(
      cron.schedule(this.config.schedule, () => {
        this.performBackup();
      })
    );

    // Schedule cleanup of old backups
    this.tasks.push(
      cron.schedule('0 1 * * *', () => {
        this.cleanupOldBackups();
      })
    );

    logger.info('Backup scheduler started');
  }

  stop() {
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    logger.info('Backup scheduler stopped');
  }

  private async performBackup() {
    try {
      const backupName = await backupService.createBackup();
      logger.info(`Scheduled backup created: ${backupName}`);
      
      // Store backup metadata
      await this.storeBackupMetadata(backupName);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Scheduled backup failed:', error);
      
      if (this.config.notifyOnFailure) {
        await this.notifyBackupFailure(error);
      }
    }
  }

  private async cleanupOldBackups() {
    try {
      const backups = await backupService.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      for (const backup of backups) {
        const backupDate = this.getBackupDate(backup);
        if (backupDate < cutoffDate) {
          await backupService.deleteBackup(backup);
          logger.info(`Deleted old backup: ${backup}`);
        }
      }
    } catch (error) {
      logger.error('Backup cleanup failed:', error);
    }
  }

  private async storeBackupMetadata(backupName: string) {
    const metadata: BackupMetadata = {
      name: backupName,
      createdAt: new Date(),
      size: await this.getBackupSize(backupName),
      type: 'scheduled',
      status: 'completed'
    };

    await backupService.storeMetadata(metadata);
  }

  private async notifyBackupFailure(error: Error) {
    const message = {
      to: this.config.notifyEmail,
      subject: 'Backup Failure Alert',
      body: `Scheduled backup failed at ${new Date().toISOString()}\n\nError: ${error.message}`
    };

    try {
      await sendNotification(message);
    } catch (notifyError) {
      logger.error('Failed to send backup failure notification:', notifyError);
    }
  }

  private getBackupDate(backupName: string): Date {
    const match = backupName.match(/backup-(.+)\.gz/);
    return match ? new Date(match[1]) : new Date(0);
  }

  private async getBackupSize(backupName: string): Promise<number> {
    try {
      const stats = await backupService.getBackupStats(backupName);
      return stats.size;
    } catch (error) {
      logger.error('Failed to get backup size:', error);
      return 0;
    }
  }
}

// Create and export singleton instance
export const backupScheduler = new BackupScheduler(); 