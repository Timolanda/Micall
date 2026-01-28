/**
 * RecordingIndicator Component
 * Shows recording status with visual feedback and upload progress
 * Appears at top of screen during emergency
 */

'use client';

import React from 'react';
import { RecorderState } from '@/hooks/useMediaRecorder';
import { Mic, Square, Pause, Play } from 'lucide-react';

export interface RecordingIndicatorProps {
  state: RecorderState;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  isVisible?: boolean;
}

export function RecordingIndicator({
  state,
  onPause,
  onResume,
  onStop,
  isVisible = true,
}: RecordingIndicatorProps) {
  if (!isVisible || !state.isRecording) {
    return null;
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`
        fixed top-4 left-1/2 transform -translate-x-1/2 z-50
        flex items-center gap-3 px-4 py-2 rounded-full shadow-lg
        transition-all duration-300
        ${state.isPaused ? 'bg-yellow-500/90' : 'bg-red-500/90'}
      `}
    >
      {/* Recording indicator dot */}
      <div
        className={`
          w-3 h-3 rounded-full animate-pulse
          ${state.isPaused ? 'bg-yellow-200' : 'bg-white'}
        `}
      />

      {/* Status label */}
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-white" />
        <span className="text-sm font-semibold text-white">
          {state.isPaused ? 'Paused' : 'Recording'}
        </span>
      </div>

      {/* Duration */}
      <span className="text-sm font-mono text-white ml-2">{formatDuration(state.totalDuration)}</span>

      {/* Upload indicator */}
      {state.isUploading && (
        <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-white/20 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-spin" />
          <span className="text-xs text-white">Uploading</span>
        </div>
      )}

      {/* Control buttons */}
      <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/30">
        {state.isPaused ? (
          <button
            onClick={onResume}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            title="Resume recording"
          >
            <Play className="w-4 h-4 text-white" />
          </button>
        ) : (
          <button
            onClick={onPause}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            title="Pause recording"
          >
            <Pause className="w-4 h-4 text-white" />
          </button>
        )}

        <button
          onClick={onStop}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
          title="Stop recording"
        >
          <Square className="w-4 h-4 text-white fill-white" />
        </button>
      </div>
    </div>
  );
}
