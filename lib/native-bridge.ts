/**
 * Native Bridge Interface
 * Platform-specific implementations for accessing hardware features
 * Supports Android Power Button + iOS/Web fallbacks
 */

export interface NativeBridgeCapabilities {
  hasAccessibility: boolean; // Can monitor power button
  hasBackground: boolean; // Can run in background
  platform: 'android' | 'ios' | 'web';
}

export interface PowerButtonEvent {
  timestamp: number;
  duration: number; // milliseconds
  isLongPress: boolean;
}

/**
 * Abstract bridge for native functionality
 */
export class NativeBridge {
  private listeners: Set<(event: PowerButtonEvent) => void> = new Set();
  private capabilities: NativeBridgeCapabilities;

  constructor() {
    this.capabilities = this.detectCapabilities();
  }

  /**
   * Detect platform and capabilities
   */
  private detectCapabilities(): NativeBridgeCapabilities {
    // Server-side rendering safety check
    if (typeof navigator === 'undefined') {
      return {
        hasAccessibility: false,
        hasBackground: false,
        platform: 'web',
      };
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(userAgent);
    const isIos = /iphone|ipad|ipod/.test(userAgent);

    const platform = isAndroid ? 'android' : isIos ? 'ios' : 'web';

    return {
      hasAccessibility: platform === 'android' && this.checkAndroidAccessibility(),
      hasBackground: platform === 'android',
      platform,
    };
  }

  /**
   * Android-specific: Check if Accessibility Service is enabled
   */
  private checkAndroidAccessibility(): boolean {
    // Server-side rendering safety check
    if (typeof window === 'undefined') return false;
    // This would be populated by Android Java bridge
    return !!(window as any).__micall_accessibility_enabled;
  }

  /**
   * Get current platform capabilities
   */
  getCapabilities(): NativeBridgeCapabilities {
    return this.capabilities;
  }

  /**
   * Request Accessibility Service permission (Android)
   * Shows native dialog to user
   */
  async requestAccessibilityPermission(): Promise<boolean> {
    if (this.capabilities.platform !== 'android') {
      console.warn('Accessibility permission not available on this platform');
      return false;
    }

    return new Promise((resolve) => {
      // Android bridge: call native method
      (window as any).__micall_request_accessibility?.((granted: boolean) => {
        if (granted) {
          this.capabilities.hasAccessibility = true;
          this.setupAndroidPowerButtonListener();
        }
        resolve(granted);
      });
    });
  }

  /**
   * Start listening for power button events (Android)
   */
  private setupAndroidPowerButtonListener(): void {
    if (this.capabilities.platform !== 'android') return;

    // Android bridge: register power button listener
    (window as any).__micall_register_power_button_listener?.((event: PowerButtonEvent) => {
      this.notifyListeners(event);
    });
  }

  /**
   * Subscribe to power button events
   */
  onPowerButton(callback: (event: PowerButtonEvent) => void): () => void {
    this.listeners.add(callback);

    // Set up listener if this is the first subscription
    if (this.listeners.size === 1 && this.capabilities.hasAccessibility) {
      this.setupAndroidPowerButtonListener();
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of power button event
   */
  private notifyListeners(event: PowerButtonEvent): void {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error('Power button listener error:', err);
      }
    });
  }

  /**
   * Keep app in foreground (Android)
   */
  async requestForegroundService(): Promise<boolean> {
    if (this.capabilities.platform !== 'android') return true;

    return new Promise((resolve) => {
      (window as any).__micall_request_foreground?.((granted: boolean) => {
        resolve(granted);
      });
    });
  }

  /**
   * Web fallback: Simulate power button with keyboard shortcut
   * Ctrl+Alt+P on desktop, or dedicated UI button
   */
  setupWebFallback(): void {
    if (this.capabilities.platform !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Alt+P as power button simulator
      if (e.ctrlKey && e.altKey && e.key === 'p') {
        e.preventDefault();
        const event: PowerButtonEvent = {
          timestamp: Date.now(),
          duration: 0,
          isLongPress: false,
        };
        this.notifyListeners(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
  }

  /**
   * Get platform-specific documentation
   */
  static getSetupInstructions(platform: 'android' | 'ios' | 'web'): string {
    const instructions: Record<string, string> = {
      android: `
## Android Setup

1. Build native module: \`./android/build_power_button_bridge.sh\`
2. Enable Accessibility Service for MiCall:
   - Settings > Accessibility > Enable MiCall Power Monitor
3. Grant Foreground Service permission in manifest

See: ./android/MicallPowerButtonService.kt
      `,
      ios: `
## iOS Setup (Fallback Only)

Power button hardware access is not available via web API.
Implement via native app wrapper or volume button alternative.
      `,
      web: `
## Web Fallback

Press Ctrl+Alt+P to simulate power button press.
Or use the "Activate Emergency" button in the UI.
      `,
    };

    return instructions[platform] || 'Platform not recognized';
  }
}

/**
 * Global singleton instance
 */
let bridgeInstance: NativeBridge | null = null;

export function getNativeBridge(): NativeBridge {
  if (!bridgeInstance) {
    bridgeInstance = new NativeBridge();
  }
  return bridgeInstance;
}
