/**
 * Remote Theft Alarm System Types
 * Non-destructive extension to MiCall emergency response
 */

export interface TrustedContact {
  id: string;
  userId: string;
  contactPhone: string;
  contactName: string;
  verified: boolean;
  verifiedAt?: string;
  verificationMethod?: 'otp' | 'email';
  createdAt: string;
}

export interface TheftModeState {
  isStolen: boolean;
  activatedAt?: string;
  activatedByContactPhone?: string;
  activatedByContactName?: string;
  lastKnownLocation?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  deviceId?: string;
  alarmStatus: 'inactive' | 'active' | 'paused' | 'silenced';
  restartCount: number;
  lastRestartTime?: string;
}

export interface TheftTriggerRequest {
  userId: string;
  requestingContactPhone: string;
}

export interface TheftDisableRequest {
  userId: string;
  authenticationMethod: 'pin' | 'biometric' | 'backend-verification';
}

export interface TheftAlarmConfig {
  volumeLevel: number; // 0-100
  alarmDuration: number; // milliseconds, 0 = infinite
  alarmSoundUrl?: string;
  flashlightEnabled: boolean;
  locationBroadcastInterval: number; // milliseconds
  maxRestartAttempts: number;
  restartDebounceMs: number;
}

export interface AlarmState {
  isPlaying: boolean;
  volume: number;
  startedAt: string;
  pausedAt?: string;
}
