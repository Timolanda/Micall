/**
 * Alert Sound Type Definitions
 * 
 * TypeScript types and interfaces for the alert sound system.
 */

/**
 * Sound type identifier
 */
export type AlertSoundType = 'critical' | 'notification' | 'responder';

/**
 * Options for playing a sound
 */
export interface AlertSoundOptions {
  volume?: number; // 0-1
  loop?: boolean;
  maxDuration?: number; // seconds
}

/**
 * Current state of the alert sound system
 */
export interface AlertSoundState {
  isPlaying: boolean;
  isMuted: boolean;
  currentSound: AlertSoundType | null;
}
