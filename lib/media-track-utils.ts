/**
 * Media Track Utilities
 * Safe manipulation of MediaStreamTrack objects
 * Used for toggling camera and microphone during live emergency sessions
 */

export interface TrackState {
  audio: boolean;
  video: boolean;
}

/**
 * Toggle audio track enabled state
 * Does NOT stop or disconnect the track
 * Safe to call during active WebRTC session
 */
export function toggleAudioTrack(
  stream: MediaStream | null,
  enabled: boolean
): boolean {
  if (!stream) return false;

  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    console.warn('No audio tracks found in stream');
    return false;
  }

  audioTracks.forEach((track) => {
    track.enabled = enabled;
    console.log(`Audio track ${enabled ? 'enabled' : 'disabled'}`);
  });

  return true;
}

/**
 * Toggle video track enabled state
 * Does NOT stop or disconnect the track
 * Safe to call during active WebRTC session
 */
export function toggleVideoTrack(
  stream: MediaStream | null,
  enabled: boolean
): boolean {
  if (!stream) return false;

  const videoTracks = stream.getVideoTracks();
  if (videoTracks.length === 0) {
    console.warn('No video tracks found in stream');
    return false;
  }

  videoTracks.forEach((track) => {
    track.enabled = enabled;
    console.log(`Video track ${enabled ? 'enabled' : 'disabled'}`);
  });

  return true;
}

/**
 * Get current state of all tracks in stream
 */
export function getTrackState(stream: MediaStream | null): TrackState {
  if (!stream) {
    return { audio: false, video: false };
  }

  const audioEnabled = stream.getAudioTracks().some((t) => t.enabled);
  const videoEnabled = stream.getVideoTracks().some((t) => t.enabled);

  return {
    audio: audioEnabled,
    video: videoEnabled,
  };
}

/**
 * Safely stop all tracks in a stream
 * Call this on component unmount or session end
 */
export function stopAllTracks(stream: MediaStream | null): void {
  if (!stream) return;

  stream.getTracks().forEach((track) => {
    track.stop();
    console.log(`Stopped ${track.kind} track`);
  });
}

/**
 * Mute only audio (video continues)
 */
export function muteAudio(stream: MediaStream | null): boolean {
  return toggleAudioTrack(stream, false);
}

/**
 * Unmute audio
 */
export function unmuteAudio(stream: MediaStream | null): boolean {
  return toggleAudioTrack(stream, true);
}

/**
 * Turn off only video (audio continues)
 */
export function turnOffVideo(stream: MediaStream | null): boolean {
  return toggleVideoTrack(stream, false);
}

/**
 * Turn on video
 */
export function turnOnVideo(stream: MediaStream | null): boolean {
  return toggleVideoTrack(stream, true);
}

/**
 * Check if audio is currently enabled
 */
export function isAudioEnabled(stream: MediaStream | null): boolean {
  if (!stream) return false;
  return stream.getAudioTracks().some((t) => t.enabled);
}

/**
 * Check if video is currently enabled
 */
export function isVideoEnabled(stream: MediaStream | null): boolean {
  if (!stream) return false;
  return stream.getVideoTracks().some((t) => t.enabled);
}
