/**
 * Recorder Upload Utilities
 * Handles chunked recording and upload to Supabase Storage
 */

import { supabase } from '@/lib/supabase';

export interface RecordingChunk {
  alertId: number;
  userId: string;
  blob: Blob;
  timestamp: number;
  duration: number;
}

export interface UploadProgress {
  chunkIndex: number;
  totalChunks: number;
  percentComplete: number;
}

/**
 * Upload a recorded chunk to Supabase Storage
 * Path: evidence/alerts/{alertId}/{userId}/{timestamp}.webm
 */
export async function uploadRecordingChunk(
  chunk: RecordingChunk,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ path: string; size: number } | null> {
  try {
    const timestamp = new Date(chunk.timestamp).toISOString();
    const filePath = `alerts/${chunk.alertId}/${chunk.userId}/${timestamp}.webm`;

    const { data, error } = await supabase.storage
      .from('evidence')
      .upload(filePath, chunk.blob, {
        upsert: false,
        contentType: 'video/webm',
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    console.log(`Uploaded: ${filePath} (${chunk.blob.size} bytes)`);

    return {
      path: data.path,
      size: chunk.blob.size,
    };
  } catch (err) {
    console.error('Recording upload failed:', err);
    return null;
  }
}

/**
 * Create a database record for uploaded recording
 * Saves metadata to incident_recordings table
 */
export async function saveRecordingMetadata(
  alertId: number,
  userId: string,
  filePath: string,
  duration: number,
  fileSize: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('incident_recordings')
      .insert({
        alert_id: alertId,
        user_id: userId,
        file_path: filePath,
        duration,
        file_size: fileSize,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to save recording metadata:', error);
      return false;
    }

    console.log(`Saved metadata for: ${filePath}`);
    return true;
  } catch (err) {
    console.error('Metadata save error:', err);
    return false;
  }
}

/**
 * List all recordings for an alert
 */
export async function getAlertRecordings(alertId: number): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('incident_recordings')
      .select('file_path')
      .eq('alert_id', alertId);

    if (error) {
      console.error('Failed to fetch recordings:', error);
      return [];
    }

    return (data || []).map((r: { file_path: string }) => r.file_path);
  } catch (err) {
    console.error('Fetch recordings error:', err);
    return [];
  }
}

/**
 * Delete a recording from storage
 */
export async function deleteRecording(filePath: string): Promise<boolean> {
  try {
    const { error: storageError } = await supabase.storage
      .from('evidence')
      .remove([filePath]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      return false;
    }

    // Also delete from database
    const { error: dbError } = await supabase
      .from('incident_recordings')
      .delete()
      .eq('file_path', filePath);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return false;
    }

    console.log(`Deleted recording: ${filePath}`);
    return true;
  } catch (err) {
    console.error('Delete error:', err);
    return false;
  }
}

/**
 * Get signed URL for accessing a recording
 */
export async function getRecordingSignedUrl(
  filePath: string,
  expirySeconds: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('evidence')
      .createSignedUrl(filePath, expirySeconds);

    if (error) {
      console.error('Failed to create signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Signed URL error:', err);
    return null;
  }
}
