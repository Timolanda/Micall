-- Feature 3: Auto-Record Database Schema
-- Create incident_recordings table to track all emergency video/audio recordings

CREATE TABLE IF NOT EXISTS incident_recordings (
  id BIGSERIAL PRIMARY KEY,
  alert_id BIGINT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL UNIQUE, -- Storage path: alerts/{alertId}/{userId}/{timestamp}.webm
  duration FLOAT NOT NULL, -- Recording duration in seconds
  file_size BIGINT NOT NULL, -- File size in bytes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_incident_recordings_alert_id ON incident_recordings(alert_id);
CREATE INDEX idx_incident_recordings_user_id ON incident_recordings(user_id);
CREATE INDEX idx_incident_recordings_created_at ON incident_recordings(created_at DESC);

-- Row-Level Security Policies
ALTER TABLE incident_recordings ENABLE ROW LEVEL SECURITY;

-- Allow users to view recordings for alerts they're involved with
CREATE POLICY "Users can view recordings for their alerts"
  ON incident_recordings
  FOR SELECT
  USING (
    -- User created the alert
    alert_id IN (
      SELECT id FROM alerts WHERE user_id = auth.uid()
    )
    OR
    -- User is responding to the alert
    user_id = auth.uid()
    OR
    -- User is an admin
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Allow users to insert their own recordings
CREATE POLICY "Users can insert their own recordings"
  ON incident_recordings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own recordings
CREATE POLICY "Users can delete their own recordings"
  ON incident_recordings
  FOR DELETE
  USING (user_id = auth.uid());

-- Storage bucket configuration (run in Supabase console)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false);

-- Storage RLS policies
CREATE POLICY "Users can upload evidence for their alerts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'evidence'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can view evidence for their alerts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'evidence'
    AND (
      -- User uploaded it
      auth.uid()::text = (storage.foldername(name))[2]
      OR
      -- User is admin
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
      )
    )
  );

CREATE POLICY "Users can delete their own evidence"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'evidence'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
