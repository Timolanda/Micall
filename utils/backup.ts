import { exec } from 'child_process';
import { promisify } from 'util';
import { S3 } from '@aws-sdk/client-s3';
import { createReadStream, createWriteStream } from 'fs';
import { gzip, gunzip } from 'zlib';
import logger from './logger';
import { env } from '../config/environment';
import { BackupMetadata, BackupStats } from '../types';

const execAsync = promisify(exec);
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

interface S3Object {
  Key?: string;
  LastModified?: Date;
  ContentLength?: number;
}

export class BackupService {
  private s3: S3;
  private bucketName: string;

  constructor() {
    this.s3 = new S3({
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
      },
      region: env.AWS_REGION
    });
    this.bucketName = env.AWS_BACKUP_BUCKET;
  }

  async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString();
      const filename = `backup-${timestamp}.gz`;
      const backupPath = `/tmp/${filename}`;

      // Create MongoDB dump
      await execAsync(`mongodump --uri="${env.MONGODB_URI}" --archive="${backupPath}" --gzip`);

      // Upload to S3
      const fileStream = createReadStream(backupPath);
      await this.s3.putObject({
        Bucket: this.bucketName,
        Key: filename,
        Body: fileStream
      });

      logger.info(`Backup created successfully: ${filename}`);
      return filename;
    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw error;
    }
  }

  async restoreBackup(filename: string): Promise<void> {
    try {
      const backupPath = `/tmp/${filename}`;

      // Download from S3
      const { Body } = await this.s3.getObject({
        Bucket: this.bucketName,
        Key: filename
      });

      if (!Body) {
        throw new Error('Backup file is empty');
      }

      // Write to temp file
      const writeStream = createWriteStream(backupPath);
      if (Body instanceof Uint8Array) {
        writeStream.write(Body);
      } else if (Body instanceof ReadableStream) {
        // Handle streaming response
        const reader = Body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          writeStream.write(value);
        }
      }
      await new Promise(resolve => writeStream.end(resolve));

      // Restore MongoDB dump
      await execAsync(`mongorestore --uri="${env.MONGODB_URI}" --archive="${backupPath}" --gzip`);

      logger.info(`Backup restored successfully: ${filename}`);
    } catch (error) {
      logger.error('Backup restoration failed:', error);
      throw error;
    }
  }

  async listBackups(): Promise<string[]> {
    const { Contents } = await this.s3.listObjects({
      Bucket: this.bucketName
    });

    return (Contents as S3Object[] || [])
      .map(obj => obj.Key)
      .filter((key): key is string => typeof key === 'string');
  }

  async deleteBackup(filename: string): Promise<void> {
    await this.s3.deleteObject({
      Bucket: this.bucketName,
      Key: filename
    });
  }

  async storeMetadata(metadata: BackupMetadata): Promise<void> {
    await this.s3.putObject({
      Bucket: this.bucketName,
      Key: `metadata/${metadata.name}.json`,
      Body: JSON.stringify(metadata)
    });
  }

  async getBackupStats(filename: string): Promise<BackupStats> {
    const { ContentLength, LastModified } = await this.s3.headObject({
      Bucket: this.bucketName,
      Key: filename
    });

    return {
      size: ContentLength || 0,
      createdAt: new Date(),
      lastModified: LastModified || new Date(),
      compressed: filename.endsWith('.gz')
    };
  }
}

export const backupService = new BackupService(); 