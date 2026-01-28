/**
 * usePushToTalk Hook
 * Enables responders to broadcast voice commands to victim and other responders
 * Push-to-talk: Hold key/button to speak, release to stop
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface PushToTalkState {
  isActive: boolean; // Currently transmitting
  isReceiving: boolean; // Another responder is speaking
  volume: number; // Playback volume 0-100
  isConnected: boolean; // Connected to alert channel
}

export interface UsePushToTalkProps {
  alertId?: number;
  userId?: string;
  role?: 'responder' | 'victim';
  enabled?: boolean;
  onRemoteAudio?: (blob: Blob) => void;
  onStateChange?: (state: PushToTalkState) => void;
}

export function usePushToTalk({
  alertId,
  userId,
  role = 'responder',
  enabled = true,
  onRemoteAudio,
  onStateChange,
}: UsePushToTalkProps) {
  const [state, setState] = useState<PushToTalkState>({
    isActive: false,
    isReceiving: false,
    volume: 100,
    isConnected: false,
  });

  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Initialize audio context and connect to Supabase channel
   */
  const initialize = useCallback(async () => {
    if (!alertId || !userId || !enabled) return;

    try {
      // Get user's microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = state.volume / 100;
      gainNodeRef.current = gainNode;

      // Create media recorder
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          chunksRef.current = [];

          // Broadcast to other responders via Supabase
          try {
            await channelRef.current?.send({
              type: 'broadcast',
              event: 'ptt_audio',
              payload: {
                userId,
                role,
                timestamp: Date.now(),
                audioBlob: audioBlob, // This will be serialized
              },
            });
          } catch (err) {
            console.error('Failed to broadcast PTT audio:', err);
          }
        }
      };

      // Connect to Supabase realtime channel
      const channel = supabase.channel(`alert:${alertId}:ptt`);

      channel
        .on('broadcast', { event: 'ptt_audio' }, (payload: any) => {
          if (payload.payload.userId !== userId) {
            setState((prev) => ({ ...prev, isReceiving: true }));
            onRemoteAudio?.(payload.payload.audioBlob);

            // Auto-stop receiving after 30 seconds
            setTimeout(() => {
              setState((prev) => ({ ...prev, isReceiving: false }));
            }, 30000);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setState((prev) => ({ ...prev, isConnected: true }));
            toast.success('Push-to-talk connected');
          } else if (status === 'CLOSED') {
            setState((prev) => ({ ...prev, isConnected: false }));
          }
        });

      channelRef.current = channel;
      toast.success('Push-to-talk initialized');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      toast.error('Failed to initialize push-to-talk');
    }
  }, [alertId, userId, role, enabled, state.volume, onRemoteAudio]);

  /**
   * Start transmitting audio
   */
  const startTransmit = useCallback(() => {
    if (!mediaRecorderRef.current || !state.isConnected) {
      const msg = 'PTT not ready. Reconnect and try again.';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      mediaRecorderRef.current.start();
      setState((prev) => ({ ...prev, isActive: true }));
      onStateChange?.({ ...state, isActive: true });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      toast.error('Failed to start transmit');
    }
  }, [state, onStateChange]);

  /**
   * Stop transmitting audio and broadcast
   */
  const stopTransmit = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    try {
      mediaRecorderRef.current.stop();
      setState((prev) => ({ ...prev, isActive: false }));
      onStateChange?.({ ...state, isActive: false });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      toast.error('Failed to stop transmit');
    }
  }, [state, onStateChange]);

  /**
   * Adjust playback volume
   */
  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(100, volume));
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clamped / 100;
    }
    setState((prev) => ({ ...prev, volume: clamped }));
    onStateChange?.({ ...state, volume: clamped });
  }, [state, onStateChange]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    initialize();

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [initialize]);

  return {
    ...state,
    error,
    startTransmit,
    stopTransmit,
    setVolume,
  };
}
