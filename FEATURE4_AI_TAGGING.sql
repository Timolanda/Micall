-- Feature 4: AI Incident Tagging Database Schema

CREATE TABLE IF NOT EXISTS incident_analysis (
  id BIGSERIAL PRIMARY KEY,
  alert_id BIGINT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_result JSONB NOT NULL, -- Stores AnalysisResult object
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_incident_analysis_alert_id ON incident_analysis(alert_id);
CREATE INDEX idx_incident_analysis_user_id ON incident_analysis(user_id);
CREATE INDEX idx_incident_analysis_processed_at ON incident_analysis(processed_at DESC);

-- Extract common fields from JSONB for faster querying
CREATE INDEX idx_incident_analysis_severity ON incident_analysis(
  (analysis_result->>'severity')
);
CREATE INDEX idx_incident_analysis_type ON incident_analysis(
  (analysis_result->>'incidentType')
);

-- Row-Level Security Policies
ALTER TABLE incident_analysis ENABLE ROW LEVEL SECURITY;

-- Allow users to view analysis for their alerts
CREATE POLICY "Users can view incident analysis"
  ON incident_analysis
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

-- Analysis system can insert results (via Edge Function with service key)
-- This is handled via Supabase Service Role in the Edge Function

-- Materialized view for incident reporting
CREATE OR REPLACE VIEW incident_statistics AS
SELECT
  (analysis_result->>'incidentType')::TEXT as incident_type,
  (analysis_result->>'severity')::TEXT as severity,
  COUNT(*) as count,
  AVG((analysis_result->>'confidence')::FLOAT) as avg_confidence,
  DATE_TRUNC('hour', processed_at) as hour
FROM incident_analysis
GROUP BY incident_type, severity, DATE_TRUNC('hour', processed_at);

-- Grant access to view
GRANT SELECT ON incident_statistics TO authenticated;
