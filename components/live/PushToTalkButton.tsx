/**
 * PushToTalkButton Component
 * Hold-to-talk button for responders to broadcast commands
 * Visual feedback shows transmission and reception status
 */

'use client';

import React, { useRef, useEffect } from 'react';
import { Mic, Volume2, Wifi } from 'lucide-react';

export interface PushToTalkButtonProps {
  isActive: boolean;
  isReceiving: boolean;
  isConnected: boolean;
  volume: number;
  onStartTransmit: () => void;
  onStopTransmit: () => void;
  onVolumeChange?: (volume: number) => void;
  disabled?: boolean;
}

export function PushToTalkButton({
  isActive,
  isReceiving,
  isConnected,
  volume,
  onStartTransmit,
  onStopTransmit,
  onVolumeChange,
  disabled = false,
}: PushToTalkButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  /**
   * Handle mouse down / touch start = start transmitting
   */
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!disabled && isConnected) {
      onStartTransmit();
    }
  };

  /**
   * Handle mouse up / touch end = stop transmitting
   */
  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isActive) {
      onStopTransmit();
    }
  };

  /**
   * Handle keyboard (spacebar) for push-to-talk
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !disabled && isConnected) {
        e.preventDefault();
        onStartTransmit();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isActive) {
        e.preventDefault();
        onStopTransmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive, isConnected, disabled, onStartTransmit, onStopTransmit]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Connection status */}
      <div className={`flex items-center gap-2 text-xs font-semibold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
        <Wifi className="w-3 h-3" />
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      {/* Main PTT button */}
      <button
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        disabled={disabled || !isConnected}
        className={`
          relative w-24 h-24 rounded-full font-bold text-lg
          transition-all duration-100 shadow-lg
          flex items-center justify-center
          ${isActive ? 'scale-95' : 'scale-100'}
          ${isReceiving ? 'ring-4 ring-blue-400 animate-pulse' : ''}
          ${
            isActive
              ? 'bg-red-500 text-white shadow-red-500/50'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }
          ${disabled || !isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex flex-col items-center gap-1">
          <Mic className="w-6 h-6" />
          <span className="text-xs">{isActive ? 'Speaking' : 'Push'}</span>
        </div>

        {/* Recording indicator dot */}
        {isActive && (
          <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full animate-pulse" />
        )}

        {/* Receiving indicator */}
        {isReceiving && (
          <div className="absolute bottom-2 right-2 w-3 h-3 bg-blue-300 rounded-full animate-pulse" />
        )}
      </button>

      {/* Status text */}
      <div className="text-center text-sm">
        {isReceiving && <p className="text-blue-500 font-semibold">📡 Receiving transmission...</p>}
        {isActive && <p className="text-red-500 font-semibold">🎙️ Transmitting...</p>}
        {!isActive && !isReceiving && (
          <p className="text-gray-600">Hold to transmit • Spacebar: Hold</p>
        )}
      </div>

      {/* Volume control */}
      <div className="flex items-center gap-2 w-48">
        <Volume2 className="w-4 h-4 text-gray-600" />
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => onVolumeChange?.(parseInt(e.target.value))}
          disabled={disabled}
          className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-xs text-gray-600 w-8 text-right">{volume}%</span>
      </div>
    </div>
  );
}
