/**
 * Stolen Device Screen
 * Full-screen modal that displays when theft mode is active
 * Prevents dismissal without authentication
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, MapPin, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';
import type { TheftModeState } from '@/types/theft';

interface StolenDeviceScreenProps {
  isActive: boolean;
  theftState?: TheftModeState;
  onDisabled?: () => void;
}

export default function StolenDeviceScreen({
  isActive,
  theftState,
  onDisabled,
}: StolenDeviceScreenProps) {
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [unlockAttempts, setUnlockAttempts] = useState(0);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [pulseOpacity, setPulseOpacity] = useState(1);

  // Pulsing red border animation
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setPulseOpacity((prev) => (prev === 1 ? 0.5 : 1));
    }, 600);

    return () => clearInterval(interval);
  }, [isActive]);

  /**
   * Handle unlock attempt (requires biometric or PIN)
   */
  const handleUnlockAttempt = useCallback(async () => {
    setIsUnlocking(true);
    setUnlockAttempts((prev) => prev + 1);

    try {
      // In production, integrate with:
      // 1. Biometric API (fingerprint/face)
      // 2. PIN entry modal
      // 3. Backend verification

      // For now, show modal for PIN entry
      const pin = prompt('🔐 Enter your PIN to disable theft mode:');

      if (!pin) {
        toast.error('❌ Unlock cancelled');
        setIsUnlocking(false);
        return;
      }

      // Verify PIN (backend call)
      // const { data, error } = await supabase.rpc('verify_theft_pin', { pin });

      // Placeholder - will integrate with backend
      if (pin === '0000') {
        // Demo PIN for testing
        toast.success('✅ Device unlocked - Theft mode disabled');
        setShowUnlockPrompt(false);

        // Call disable endpoint
        // await disableTheftMode();

        if (onDisabled) {
          onDisabled();
        }
      } else {
        toast.error(`❌ Incorrect PIN (Attempt ${unlockAttempts + 1}/3)`);

        if (unlockAttempts >= 2) {
          toast.error('⚠️ Too many failed attempts. Contact emergency services.');
        }
      }
    } catch (err) {
      console.error('❌ Unlock error:', err);
      toast.error('❌ Unlock failed');
    } finally {
      setIsUnlocking(false);
    }
  }, [unlockAttempts, onDisabled]);

  if (!isActive) return null;

  return (
    <>
      {/* Full-screen overlay - blocks all interactions */}
      <div
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
        style={{
          borderWidth: '6px',
          borderStyle: 'solid',
          borderColor: `rgba(220, 38, 38, ${pulseOpacity})`, // Pulsing red
          transition: 'border-color 0.6s ease-in-out',
        }}
      >
        {/* Top warning section */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6">
            {/* Alert icon with animation */}
            <div className="flex justify-center">
              <div
                className="animate-bounce"
                style={{
                  animationDelay: '0s',
                }}
              >
                <AlertTriangle
                  size={80}
                  className="text-red-500"
                  strokeWidth={1}
                />
              </div>
            </div>

            {/* Main warning text */}
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-black text-red-500">
                THIS DEVICE IS STOLEN
              </h1>
              <p className="text-xl md:text-2xl text-white font-semibold">
                Location is being shared
              </p>
            </div>

            {/* Theft details */}
            {theftState && (
              <div className="text-white space-y-2 text-sm md:text-base opacity-80">
                {theftState.activatedByContactName && (
                  <p>
                    🚨 Reported by: <strong>{theftState.activatedByContactName}</strong>
                  </p>
                )}
                {theftState.activatedAt && (
                  <p>
                    ⏰ Reported at:{' '}
                    <strong>{new Date(theftState.activatedAt).toLocaleTimeString()}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Location sharing info */}
            <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm md:text-base">
              <MapPin size={20} />
              <span>📍 Live location broadcast active</span>
            </div>
          </div>
        </div>

        {/* Bottom unlock section */}
        <div className="flex-1 flex items-end justify-center pb-12 space-y-4 w-full px-4">
          {!showUnlockPrompt ? (
            <button
              onClick={() => setShowUnlockPrompt(true)}
              className="w-full max-w-sm px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-lg"
            >
              🔓 Unlock Device
            </button>
          ) : (
            <div className="w-full max-w-sm space-y-4">
              <button
                onClick={handleUnlockAttempt}
                disabled={isUnlocking || unlockAttempts >= 3}
                className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors text-lg"
              >
                {isUnlocking
                  ? '⏳ Verifying...'
                  : `✓ Enter PIN (${3 - unlockAttempts} attempts left)`}
              </button>
              <button
                onClick={() => setShowUnlockPrompt(false)}
                className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
              >
                ✕ Cancel
              </button>
            </div>
          )}

          {/* Emergency contact info */}
          <div className="w-full text-center text-white text-sm opacity-70 pt-4 border-t border-gray-700">
            <p>📞 If this is not your device, contact emergency services</p>
          </div>
        </div>

        {/* Strobe effect element */}
        <div
          id="theft-strobe"
          className="fixed inset-0 pointer-events-none z-0 opacity-0"
          style={{
            background: 'white',
            mixBlendMode: 'screen',
            transition: 'opacity 0.2s linear',
          }}
        />
      </div>
    </>
  );
}
