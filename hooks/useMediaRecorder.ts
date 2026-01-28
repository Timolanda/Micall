/**
 * useMediaRecorder Hook
 * Manages audio/video recording from MediaStream with automatic chunking
 * Records in 30-second chunks for upload resiliency
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RecordingChunk, uploadRecordingChunk, saveRecordingMetadata, UploadProgress } from '@/lib/recorder-upload';
import { toast } from 'sonner';

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  totalDuration: number; // in seconds
  isUploading: boolean;
}

export interface UseMediaRecorderProps {
  stream?: MediaStream;
  alertId?: number;
  userId?: string;
  enabled?: boolean;
  chunkDurationMs?: number; // Default 30000ms (30 seconds)
  onChunkReady?: (chunk: RecordingChunk) => Promise<void>;
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: Error) => void;
}

export function useMediaRecorder({
  stream,
  alertId,
  userId,
  enabled = true,
  chunkDurationMs = 30000,
  onChunkReady,
  onProgress,
  onError,
}: UseMediaRecorderProps) {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    totalDuration: 0,
    isUploading: false,
  });

  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  /**
   * Start recording from the provided stream
   */
  const startRecording = useCallback(() => {
    if (!stream || !enabled) {
      const msg = 'No stream available or recording disabled';
      setError(msg);
      onError?.(new Error(msg));
      return;
    }

    if (!alertId || !userId) {
      const msg = 'Alert ID and User ID required to record';
      setError(msg);
      onError?.(new Error(msg));
      return;
    }

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000,
      });

      chunksRef.current = [];
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event: Event) => {
        const msg = `Recording error: ${(event as any).error}`;
        setError(msg);
        onError?.(new Error(msg));
        toast.error('Recording error occurred');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      // Set up chunk rotation timer (every chunkDurationMs, save current blob)
      timerRef.current = setInterval(async () => {
        if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
          try {
            mediaRecorderRef.current.requestData();

            // Combine all chunks into a single blob
            if (chunksRef.current.length > 0) {
              const blob = new Blob(chunksRef.current, { type: 'video/webm' });
              const now = Date.now();
              const duration = (now - startTimeRef.current - pausedDurationRef.current) / 1000;

              const chunk: RecordingChunk = {
                alertId,
                userId,
                blob,
                timestamp: startTimeRef.current,
                duration,
              };

              // Upload chunk if callback provided
              if (onChunkReady) {
                setState((prev) => ({ ...prev, isUploading: true }));
                await onChunkReady(chunk);
                setState((prev) => ({ ...prev, isUploading: false }));
              }

              // Reset for next chunk
              chunksRef.current = [];
              startTimeRef.current = Date.now();
            }
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error.message);
            onError?.(error);
          }
        }
      }, chunkDurationMs);

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        totalDuration: 0,
      }));

      toast.success('Recording started');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      onError?.(error);
      toast.error('Failed to start recording');
    }
  }, [stream, enabled, alertId, userId, state.isRecording, state.isPaused, chunkDurationMs, onChunkReady, onError]);

  /**
   * Pause recording (does not stop)
   */
  const pauseRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    try {
      mediaRecorderRef.current.pause();
      pausedDurationRef.current += Date.now() - startTimeRef.current;
      setState((prev) => ({ ...prev, isPaused: true }));
      toast.success('Recording paused');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      onError?.(error);
      toast.error('Failed to pause recording');
    }
  }, [onError]);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    try {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();
      setState((prev) => ({ ...prev, isPaused: false }));
      toast.success('Recording resumed');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      onError?.(error);
      toast.error('Failed to resume recording');
    }
  }, [onError]);

  /**
   * Stop recording and return final blob
   */
  const stopRecording = useCallback(
    async (): Promise<Blob | null> => {
      if (!mediaRecorderRef.current) return null;

      return new Promise((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = async () => {
            try {
              // Combine all chunks from session
              if (chunksRef.current.length > 0) {
                const finalBlob = new Blob(chunksRef.current, { type: 'video/webm' });
                const duration = (Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000;

                // Upload final chunk
                if (alertId && userId) {
                  const chunk: RecordingChunk = {
                    alertId,
                    userId,
                    blob: finalBlob,
                    timestamp: startTimeRef.current,
                    duration,
                  };

                  if (onChunkReady) {
                    setState((prev) => ({ ...prev, isUploading: true }));
                    await onChunkReady(chunk);
                    setState((prev) => ({ ...prev, isUploading: false }));
                  }
                }
              }

              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }

              chunksRef.current = [];
              setState((prev) => ({
                ...prev,
                isRecording: false,
                isPaused: false,
                totalDuration: 0,
              }));

              toast.success('Recording stopped and uploaded');
              resolve(chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: 'video/webm' }) : null);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              setError(error.message);
              onError?.(error);
              toast.error('Failed to finalize recording');
              resolve(null);
            }
          };

          mediaRecorderRef.current.stop();
        }
      });
    },
    [alertId, userId, onChunkReady, onError]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    ...state,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
}
