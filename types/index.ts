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

// Add type for user profile (adjust fields as per your Supabase 'profiles' table)
export interface Profile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  medical_info?: string;
  created_at?: string;
  // Add any other fields from your 'profiles' table
}

// Add type for subscription (adjust fields as per your Supabase 'subscriptions' table)
export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: 'active' | 'inactive' | 'cancelled';
  started_at: string;
  ends_at?: string;
  // Add any other fields from your 'subscriptions' table
}

// Add type for responder (adjust fields as per your Supabase 'responders' table)
export interface Responder {
  id: string;
  name?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  status?: string;
  // Add any other fields from your 'responders' table
}

// Add type for emergency alert as stored in the DB (not the socket type)
export interface DbEmergencyAlert {
  id: number;
  user_id: string;
  type: string;
  message?: string;
  lat?: number;
  lng?: number;
  status: string;
  created_at: string;
  video_url?: string;
  // Add any other fields from your 'emergency_alerts' table
} 