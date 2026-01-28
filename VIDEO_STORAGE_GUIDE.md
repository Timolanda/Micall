# Video Storage in Supabase - Implementation Guide

## Overview
You can save live videos to Supabase using the Storage API. Here's how to implement it:

## 1. **Set Up Supabase Storage**

Run this SQL in your Supabase console:

```sql
-- Create a storage bucket for videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('live-videos', 'live-videos', true)
ON CONFLICT DO NOTHING;

-- Create RLS policies for the bucket
CREATE POLICY "Authenticated users can upload videos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'live-videos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own videos" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'live-videos' AND
    owner = auth.uid()
  );

CREATE POLICY "Public can read videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'live-videos');
```

## 2. **Add Video Metadata Table**

```sql
-- Table to track saved videos
CREATE TABLE saved_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id BIGINT REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  duration_seconds INT,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_saved_videos_user ON saved_videos(user_id);
CREATE INDEX idx_saved_videos_expires ON saved_videos(expires_at);
```

## 3. **Automatic Cleanup (Cron Job)**

Create a scheduled job to delete expired videos:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
  'cleanup-expired-videos',
  '0 2 * * *',  -- Daily at 2 AM
  $$
    UPDATE saved_videos
    SET is_deleted = true
    WHERE expires_at < NOW() AND NOT is_deleted;
  $$
);
```

## 4. **Implementation in React Component**

```typescript
// Example: Save video to Supabase
const saveVideoToSupabase = async (
  blob: Blob,
  alertId: string,
  userId: string
) => {
  try {
    const fileName = `${userId}/${alertId}/${Date.now()}.webm`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('live-videos')
      .upload(fileName, blob, {
        contentType: 'video/webm',
        cacheControl: '3600',
      });

    if (error) throw error;

    // Record metadata in database
    const { error: dbError } = await supabase
      .from('saved_videos')
      .insert({
        user_id: userId,
        alert_id: parseInt(alertId),
        storage_path: fileName,
        file_size_bytes: blob.size,
        duration_seconds: calculateDuration(), // Your logic
      });

    if (dbError) throw dbError;

    return {
      success: true,
      path: data.path,
      url: supabase.storage
        .from('live-videos')
        .getPublicUrl(fileName).data.publicUrl,
    };
  } catch (error) {
    console.error('Error saving video:', error);
    return { success: false, error };
  }
};
```

## 5. **Automatic Expiration & Deletion**

Videos are automatically marked for deletion after 7 days via:
- Database timestamp: `expires_at`
- Scheduled cleanup job deletes old storage files
- Manual cleanup function can be triggered

## 6. **Cost Considerations**

- **Storage**: $0.15 per GB-month
- **Bandwidth**: $0.15 per GB (egress)
- Incoming data: Free
- For a 1-hour HD video (~500MB): ~$0.075/month storage, $0.075 bandwidth

## 7. **Optimization Tips**

✅ **Compress videos** before upload (use FFmpeg or similar)
✅ **Use WebM format** - smaller than MP4 (40-60% reduction)
✅ **Limit recording duration** - cap at 30-60 minutes per session
✅ **Auto-cleanup** - delete after 7 days (as above)
✅ **Batch processing** - upload only when needed

## 8. **Example: Automatic Cleanup After 7 Days**

```typescript
// In your GoLiveButton or video component
const handleVideoEnd = async (videoBlob: Blob, alertId: string) => {
  // Save video
  const result = await saveVideoToSupabase(videoBlob, alertId, user.id);
  
  // Schedule auto-delete after 7 days
  setTimeout(async () => {
    await supabase.storage
      .from('live-videos')
      .remove([result.path]);
      
    // Mark as deleted in DB
    await supabase
      .from('saved_videos')
      .update({ is_deleted: true })
      .eq('storage_path', result.path);
  }, 7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
};
```

## 9. **Retrieve Saved Videos**

```typescript
const getSavedVideos = async (userId: string) => {
  const { data, error } = await supabase
    .from('saved_videos')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((video) => ({
    ...video,
    url: supabase.storage
      .from('live-videos')
      .getPublicUrl(video.storage_path).data.publicUrl,
  }));
};
```

## 10. **Security Notes**

- Videos are stored in a public bucket but with user-specific paths
- Only authenticated users can upload
- RLS policies prevent unauthorized deletion
- Automatic cleanup happens server-side
- Consider encrypting sensitive videos at application level

---

**Implementation Status**: Ready to integrate into your GoLiveButton component
