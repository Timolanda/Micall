/**
 * Alert Sound Manager
 * 
 * Global singleton for managing emergency alert sounds across the MiCall platform.
 * Handles playback, muting, volume control, and autoplay policy compliance.
 * 
 * Features:
 * - Multiple alert sound types (critical, notification, responder)
 * - Persistent mute state (localStorage)
 * - Graceful autoplay policy handling
 * - Volume control (0-1)
 * - Auto-stop after max duration
 * - Mobile-friendly (respects device mute)
 * 
 * Usage:
 * ```typescript
 * import { alertSound, playCriticalAlert } from '@/lib/alert-sound';
 * 
 * // Play critical alert
 * await playCriticalAlert(5);
 * 
 * // Toggle mute
 * alertSound.toggleMute();
 * 
 * // Stop current sound
 * alertSound.stop();
 * ```
 */

export type AlertSoundType = 'critical' | 'notification' | 'responder';

export interface AlertSoundOptions {
  volume?: number; // 0-1
  loop?: boolean;
  maxDuration?: number; // seconds
}

export interface AlertSoundState {
  isPlaying: boolean;
  isMuted: boolean;
  currentSound: AlertSoundType | null;
}

/**
 * AlertSoundManager - Singleton class for managing alert sounds
 */
class AlertSoundManager {
  private audioElement: HTMLAudioElement | null = null;
  private isMuted = false;
  private isPlaying = false;
  private currentSound: AlertSoundType | null = null;
  private currentTimeout: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'micall-alert-sound-muted';
  private readonly SOUND_PATHS: Record<AlertSoundType, string> = {
    critical: '/sounds/micall-alert-critical.wav',
    notification: '/sounds/micall-alert-notification.wav',
    responder: '/sounds/micall-alert-responder.wav',
  };

  constructor() {
    this.isMuted = this.getStoredMuteState();
  }

  /**
   * Play an alert sound
   */
  async play(
    soundType: AlertSoundType,
    options: AlertSoundOptions = {},
  ): Promise<void> {
    try {
      // If muted, don't play
      if (this.isMuted) {
        return;
      }

      // Initialize audio element if needed
      if (!this.audioElement) {
        this.initAudioElement();
      }

      if (!this.audioElement) {
        console.warn('Alert sound: Audio element not initialized');
        return;
      }

      // Set sound properties
      const volume = options.volume ?? this.getVolumeForSoundType(soundType);
      const soundPath = this.getSoundPath(soundType);
      const maxDuration = options.maxDuration ?? this.getMaxDurationForSoundType(soundType);

      // Update state
      this.isPlaying = true;
      this.currentSound = soundType;

      // Set audio properties
      this.audioElement.src = soundPath;
      this.audioElement.volume = Math.min(1, Math.max(0, volume));
      this.audioElement.loop = options.loop ?? false;

      // Clear any existing timeout
      if (this.currentTimeout) {
        clearTimeout(this.currentTimeout);
      }

      // Auto-stop after max duration
      this.currentTimeout = setTimeout(() => {
        this.stop();
      }, maxDuration * 1000);

      // Play the sound
      await this.audioElement.play().catch((error) => {
        // Autoplay policy error - this is expected on first interaction
        if (error.name === 'NotAllowedError') {
          console.debug('Alert sound: Autoplay prevented by browser policy');
        } else {
          console.error('Alert sound: Play error', error);
        }
        this.isPlaying = false;
        if (this.currentTimeout) {
          clearTimeout(this.currentTimeout);
        }
      });
    } catch (error) {
      console.error('Alert sound: Unexpected error during playback', error);
      this.isPlaying = false;
    }
  }

  /**
   * Stop current sound playback
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }

    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    this.isPlaying = false;
    this.currentSound = null;
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.saveStoredMuteState();

    // Stop any currently playing sound
    if (this.isPlaying) {
      this.stop();
    }

    return this.isMuted;
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    if (this.isMuted !== muted) {
      this.toggleMute();
    }
  }

  /**
   * Get current mute state
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Get current playing state
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current sound type playing
   */
  getCurrentSound(): AlertSoundType | null {
    return this.currentSound;
  }

  /**
   * Get full state
   */
  getState(): AlertSoundState {
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      currentSound: this.currentSound,
    };
  }

  /**
   * Private Methods
   */

  private initAudioElement(): void {
    if (typeof window === 'undefined') {
      return; // Server-side rendering
    }

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';

    // Setup event listeners
    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
      this.currentSound = null;
    });

    this.audioElement.addEventListener('error', (error) => {
      console.error('Alert sound: Audio playback error', error);
      this.isPlaying = false;
    });
  }

  private getStoredMuteState(): boolean {
    if (typeof window === 'undefined') {
      return false; // Server-side rendering
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  }

  private saveStoredMuteState(): void {
    if (typeof window === 'undefined') {
      return; // Server-side rendering
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, this.isMuted.toString());
    } catch (error) {
      console.warn('Alert sound: Could not save mute state to localStorage', error);
    }
  }

  private getSoundPath(soundType: AlertSoundType): string {
    return this.SOUND_PATHS[soundType];
  }

  private getVolumeForSoundType(soundType: AlertSoundType): number {
    switch (soundType) {
      case 'critical':
        return 0.9;
      case 'responder':
        return 0.7;
      case 'notification':
        return 0.8;
      default:
        return 0.8;
    }
  }

  private getMaxDurationForSoundType(soundType: AlertSoundType): number {
    switch (soundType) {
      case 'critical':
        return 5;
      case 'responder':
        return 3;
      case 'notification':
        return 1.5;
      default:
        return 2;
    }
  }
}

/**
 * Global singleton instance
 */
export const alertSound = new AlertSoundManager();

/**
 * Convenience Functions
 */

/**
 * Play critical alert sound (emergency/SOS)
 */
export async function playCriticalAlert(maxDuration?: number): Promise<void> {
  return alertSound.play('critical', { maxDuration });
}

/**
 * Play responder notification sound
 */
export async function playResponderAlert(maxDuration?: number): Promise<void> {
  return alertSound.play('responder', { maxDuration });
}

/**
 * Play general notification sound
 */
export async function playNotificationAlert(maxDuration?: number): Promise<void> {
  return alertSound.play('notification', { maxDuration });
}

/**
 * Stop any currently playing alert sound
 */
export function stopAlertSound(): void {
  alertSound.stop();
}

/**
 * Toggle alert sound muting
 */
export function toggleAlertMute(): boolean {
  return alertSound.toggleMute();
}

/**
 * Get current mute state
 */
export function getAlertMuteState(): boolean {
  return alertSound.getMuted();
}

/**
 * Set alert sound mute state
 */
export function setAlertMuted(muted: boolean): void {
  alertSound.setMuted(muted);
}

/**
 * Get current alert sound state
 */
export function getAlertSoundState(): AlertSoundState {
  return alertSound.getState();
}
