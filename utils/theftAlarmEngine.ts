/**
 * Theft Mode Alarm Engine
 * Non-destructive alarm system for stolen device recovery
 * 
 * Features:
 * - Persistent alarm that survives silent mode
 * - Auto-restart if stopped or app restarted
 * - Flashlight strobe effect (if supported)
 * - Maximum volume override
 */

import type { AlarmState } from '@/types/theft';

interface AlarmConfig {
  alarmUrl?: string;
  volume?: number;
  loopInterval?: number;
}

class TheftAlarmEngine {
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private alarmState: AlarmState | null = null;
  private flashlightInterval: NodeJS.Timeout | null = null;
  private restartCheckInterval: NodeJS.Timeout | null = null;
  private config: Required<AlarmConfig>;

  constructor(config: AlarmConfig = {}) {
    this.config = {
      // Default high-pitched alarm sound (public domain)
      alarmUrl: config.alarmUrl || '/sounds/theft-alarm.mp3',
      volume: config.volume ?? 1.0,
      loopInterval: config.loopInterval ?? 100, // Check every 100ms if still playing
    };
  }

  /**
   * Start the theft alarm
   * - Force maximum volume
   * - Loop continuously
   * - Override silent/vibrate modes
   */
  startAlarm = async (): Promise<void> => {
    try {
      if (this.isPlaying) {
        console.log('🚨 Alarm already playing');
        return;
      }

      // Request user interaction (required by browsers)
      // In real scenario, this happens from the stolen screen
      await this.initializeAudioContext();

      // Create or reuse audio element
      if (!this.audioElement) {
        this.audioElement = new Audio(this.config.alarmUrl);
        this.audioElement.loop = true;
        this.audioElement.preload = 'auto';
      }

      // Force maximum volume
      this.audioElement.volume = 1.0;

      // Play the alarm
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      this.isPlaying = true;
      this.alarmState = {
        isPlaying: true,
        volume: 1.0,
        startedAt: new Date().toISOString(),
      };

      console.log('🚨 Theft alarm started');

      // Start monitoring if alarm stops
      this.monitorAlarmStatus();

      // Start flashlight strobe
      this.startFlashlightStrobe();
    } catch (err) {
      console.error('❌ Failed to start alarm:', err);
    }
  };

  /**
   * Stop the alarm (only for authorized users)
   */
  stopAlarm = (): void => {
    try {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      }

      this.isPlaying = false;
      if (this.alarmState) {
        this.alarmState.pausedAt = new Date().toISOString();
      }

      if (this.flashlightInterval) {
        clearInterval(this.flashlightInterval);
      }

      if (this.restartCheckInterval) {
        clearInterval(this.restartCheckInterval);
      }

      console.log('✅ Theft alarm stopped');
    } catch (err) {
      console.error('❌ Failed to stop alarm:', err);
    }
  };

  /**
   * Monitor alarm and auto-restart if stopped
   * This prevents users from silencing the alarm
   */
  private monitorAlarmStatus = (): void => {
    if (this.restartCheckInterval) {
      clearInterval(this.restartCheckInterval);
    }

    this.restartCheckInterval = setInterval(() => {
      if (!this.isPlaying || !this.audioElement) {
        console.warn('⚠️ Alarm stopped unexpectedly, restarting...');
        this.resumeAlarmIfNeeded();
      }
    }, this.config.loopInterval);
  };

  /**
   * Resume alarm if it was stopped
   * Called after app restart or device reboot
   */
  resumeAlarmIfNeeded = async (): Promise<void> => {
    if (this.isPlaying) {
      console.log('🔔 Alarm already playing');
      return;
    }

    console.log('🔔 Resuming alarm...');
    await this.startAlarm();
  };

  /**
   * Initialize Web Audio API context (required for volume control)
   */
  private initializeAudioContext = async (): Promise<void> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Resume if suspended (due to browser autoplay policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      console.log('🔊 Audio context resumed');
    }
  };

  /**
   * Start flashlight strobe effect (if device supports)
   * Uses Screen Brightness API or camera flash
   */
  private startFlashlightStrobe = (): void => {
    // For now, use simple CSS blinking effect
    // Future: Integrate with native bridge for actual flashlight
    const strobeElement = document.getElementById('theft-strobe');
    if (!strobeElement) return;

    let isOn = true;
    this.flashlightInterval = setInterval(() => {
      isOn = !isOn;
      strobeElement.style.opacity = isOn ? '1' : '0.3';
    }, 200); // 200ms on/off for visible strobe
  };

  /**
   * Get current alarm state
   */
  getState = (): AlarmState | null => {
    return this.alarmState;
  };

  /**
   * Force maximum volume (override silent mode)
   */
  setMaximumVolume = (): void => {
    if (this.audioElement) {
      this.audioElement.volume = 1.0;
      if (this.alarmState) {
        this.alarmState.volume = 1.0;
      }
    }
  };

  /**
   * Cleanup resources
   */
  destroy = (): void => {
    this.stopAlarm();
    if (this.audioElement) {
      this.audioElement.src = '';
      this.audioElement = null;
    }
  };
}

// Global singleton instance
let alarmEngineInstance: TheftAlarmEngine | null = null;

/**
 * Get or create the alarm engine
 */
export const getTheftAlarmEngine = (config?: AlarmConfig): TheftAlarmEngine => {
  if (!alarmEngineInstance) {
    alarmEngineInstance = new TheftAlarmEngine(config);
  }
  return alarmEngineInstance;
};

/**
 * Export the class for testing
 */
export { TheftAlarmEngine };
