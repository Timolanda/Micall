import { Request } from 'express';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  notificationPreference: 'sms' | 'email' | 'both';
  verified: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    walletAddress: string;
  };
}

export interface BackupStats {
  size: number;
  createdAt: Date;
  lastModified: Date;
  compressed: boolean;
}

export interface BackupMetadata {
  name: string;
  createdAt: Date;
  size: number;
  type: 'manual' | 'scheduled';
  status: 'completed' | 'failed';
  error?: string;
}

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
} 