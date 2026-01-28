/**
 * VictimControls Component
 * Provides UI for victim to control microphone and camera during emergency
 * Displays current state and allows toggling without disrupting WebRTC session
 */

'use client';

import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useMediaStreamControls } from '@/hooks/useMediaStreamControls';

interface VictimControlsProps {
  stream: MediaStream | null;
  alertId: string | null;
  isLive: boolean;
  onStateChange?: (state: { audio: boolean; video: boolean }) => void;
}

export default function VictimControls({
  stream,
  alertId,
  isLive,
  onStateChange,
}: VictimControlsProps) {
  const { trackState, toggleAudio, toggleVideo, isLoading } =
    useMediaStreamControls({
      stream,
      onStateChange,
    });

  if (!isLive || !alertId) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-0 right-0 z-40 flex justify-center px-4">
      <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-4 flex gap-3 shadow-lg backdrop-blur-sm">
        {/* Microphone Toggle */}
        <button
          onClick={toggleAudio}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
            trackState.audio
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={trackState.audio ? 'Mute microphone' : 'Unmute microphone'}
        >
          {trackState.audio ? (
            <>
              <Mic size={18} />
              <span className="hidden sm:inline text-sm">Mic On</span>
            </>
          ) : (
            <>
              <MicOff size={18} />
              <span className="hidden sm:inline text-sm">Mic Off</span>
            </>
          )}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleVideo}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
            trackState.video
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={trackState.video ? 'Turn off camera' : 'Turn on camera'}
        >
          {trackState.video ? (
            <>
              <Video size={18} />
              <span className="hidden sm:inline text-sm">Cam On</span>
            </>
          ) : (
            <>
              <VideoOff size={18} />
              <span className="hidden sm:inline text-sm">Cam Off</span>
            </>
          )}
        </button>

        {/* Status Indicator */}
        <div className="flex items-center px-3 border-l border-gray-600">
          <span className="text-xs text-gray-400">
            {trackState.audio && trackState.video ? (
              <span className="text-green-400">✓ All enabled</span>
            ) : trackState.audio ? (
              <span className="text-yellow-400">⚠ Cam off</span>
            ) : trackState.video ? (
              <span className="text-yellow-400">⚠ Mic off</span>
            ) : (
              <span className="text-red-400">✗ Both off</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
