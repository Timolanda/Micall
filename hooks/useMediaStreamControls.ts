/**
 * useMediaStreamControls Hook
 * Manages microphone and camera controls during live emergency sessions
 * Provides safe track toggling without disconnecting WebRTC
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  toggleAudioTrack,
  toggleVideoTrack,
  getTrackState,
  type TrackState,
} from '@/lib/media-track-utils';

interface UseMediaStreamControlsProps {
  stream: MediaStream | null;
  onStateChange?: (state: TrackState) => void;
}

interface UseMediaStreamControlsReturn {
  trackState: TrackState;
  toggleAudio: () => void;
  toggleVideo: () => void;
  muteAudio: () => void;
  unmuteAudio: () => void;
  turnOffVideo: () => void;
  turnOnVideo: () => void;
  isLoading: boolean;
  error: string | null;
}

export function useMediaStreamControls({
  stream,
  onStateChange,
}: UseMediaStreamControlsProps): UseMediaStreamControlsReturn {
  const [trackState, setTrackState] = useState<TrackState>({
    audio: false,
    video: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize state when stream changes
  useEffect(() => {
    if (stream) {
      const state = getTrackState(stream);
      setTrackState(state);
    }
  }, [stream]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(trackState);
  }, [trackState, onStateChange]);

  // Toggle audio (mute <-> unmute)
  const toggleAudio = useCallback(() => {
    if (!stream) {
      setError('No stream available');
      toast.error('No media stream available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newState = !trackState.audio;
      const success = toggleAudioTrack(stream, newState);

      if (success) {
        setTrackState((prev) => ({ ...prev, audio: newState }));
        toast.success(newState ? '🎤 Microphone on' : '🔇 Microphone off');
      } else {
        setError('Failed to toggle audio');
        toast.error('Failed to toggle microphone');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(`Microphone error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [stream, trackState.audio]);

  // Toggle video (on <-> off)
  const toggleVideo = useCallback(() => {
    if (!stream) {
      setError('No stream available');
      toast.error('No media stream available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newState = !trackState.video;
      const success = toggleVideoTrack(stream, newState);

      if (success) {
        setTrackState((prev) => ({ ...prev, video: newState }));
        toast.success(newState ? '🎥 Camera on' : '📹 Camera off');
      } else {
        setError('Failed to toggle video');
        toast.error('Failed to toggle camera');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(`Camera error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [stream, trackState.video]);

  // Mute audio
  const muteAudio = useCallback(() => {
    if (!stream) {
      setError('No stream available');
      return;
    }

    try {
      toggleAudioTrack(stream, false);
      setTrackState((prev) => ({ ...prev, audio: false }));
      toast.success('🔇 Microphone muted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(`Mute error: ${msg}`);
    }
  }, [stream]);

  // Unmute audio
  const unmuteAudio = useCallback(() => {
    if (!stream) {
      setError('No stream available');
      return;
    }

    try {
      toggleAudioTrack(stream, true);
      setTrackState((prev) => ({ ...prev, audio: true }));
      toast.success('🎤 Microphone unmuted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(`Unmute error: ${msg}`);
    }
  }, [stream]);

  // Turn off video
  const turnOffVideo = useCallback(() => {
    if (!stream) {
      setError('No stream available');
      return;
    }

    try {
      toggleVideoTrack(stream, false);
      setTrackState((prev) => ({ ...prev, video: false }));
      toast.success('📹 Camera turned off');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(`Camera off error: ${msg}`);
    }
  }, [stream]);

  // Turn on video
  const turnOnVideo = useCallback(() => {
    if (!stream) {
      setError('No stream available');
      return;
    }

    try {
      toggleVideoTrack(stream, true);
      setTrackState((prev) => ({ ...prev, video: true }));
      toast.success('🎥 Camera turned on');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(`Camera on error: ${msg}`);
    }
  }, [stream]);

  return {
    trackState,
    toggleAudio,
    toggleVideo,
    muteAudio,
    unmuteAudio,
    turnOffVideo,
    turnOnVideo,
    isLoading,
    error,
  };
}
