-- ============================================================================
-- MICALL DATABASE FIXES - RUN IN SUPABASE SQL EDITOR
-- ============================================================================
-- This script creates missing tables and fixes permission issues
-- Run this ONCE in your Supabase SQL Editor (https://app.supabase.com)
-- ============================================================================

-- ============================================================================
-- 1. CREATE TRUSTED_CONTACTS TABLE (for theft alarm feature)
-- ============================================================================
-- This table stores phone numbers of trusted contacts who can trigger theft mode

CREATE TABLE IF NOT EXISTS trusted_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone VARCHAR(20) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_method VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, contact_phone)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user_id ON trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_verified ON trusted_contacts(verified);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_phone ON trusted_contacts(contact_phone);

-- Enable Row Level Security
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own contacts
CREATE POLICY IF NOT EXISTS "Users can manage their own contacts"
  ON trusted_contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. CREATE THEFT_MODE_LOG TABLE (for audit trail)
-- ============================================================================
-- This table logs all theft mode activation/deactivation events

CREATE TABLE IF NOT EXISTS theft_mode_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_theft_mode_log_user_id ON theft_mode_log(user_id);
CREATE INDEX IF NOT EXISTS idx_theft_mode_log_timestamp ON theft_mode_log(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE theft_mode_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own logs
CREATE POLICY IF NOT EXISTS "Users can view their own theft logs"
  ON theft_mode_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. FIX RESPONDERS TABLE (ensure it has correct columns)
-- ============================================================================
-- Add missing columns if they don't exist

ALTER TABLE responders ADD COLUMN IF NOT EXISTS responder_type VARCHAR(50);
ALTER TABLE responders ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'responder';

-- Create index for availability queries
CREATE INDEX IF NOT EXISTS idx_responders_available_updated ON responders(available, updated_at DESC);

-- ============================================================================
-- 4. CREATE RESPONDER_PRESENCE TABLE (for tracking active responders per alert)
-- ============================================================================
-- This table tracks which responders are actively responding to each alert

CREATE TABLE IF NOT EXISTS responder_presence (
  id BIGSERIAL PRIMARY KEY,
  alert_id BIGINT NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type VARCHAR(50) NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_responder_presence_alert_id ON responder_presence(alert_id);
CREATE INDEX IF NOT EXISTS idx_responder_presence_user_id ON responder_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_responder_presence_alert_user ON responder_presence(alert_id, user_id);

-- Enable Row Level Security
ALTER TABLE responder_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for responder_presence
CREATE POLICY IF NOT EXISTS "Users can view responder presence on their alerts"
  ON responder_presence FOR SELECT
  USING (
    alert_id IN (
      SELECT id FROM emergency_alerts WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY IF NOT EXISTS "Responders can insert their own presence"
  ON responder_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Responders can update their own presence"
  ON responder_presence FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 5. FIX PROFILES TABLE (add theft-related columns if missing)
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_stolen BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stolen_activated_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 6. ADD TEST DATA (if responders table is empty)
-- ============================================================================
-- This adds test responders so the home page can display responder count

-- Option A: Add a responder with your own user ID
-- Replace 'your-user-id-here' with an actual UUID from your users
-- INSERT INTO responders (id, available, updated_at)
-- VALUES ('your-user-id-here', true, NOW())
-- ON CONFLICT (id) DO UPDATE SET available = true;

-- Option B: View available responders
-- SELECT COUNT(*) as responder_count FROM responders WHERE available = true;

-- ============================================================================
-- 7. VERIFY EVERYTHING IS SET UP CORRECTLY
-- ============================================================================

-- Check trusted_contacts table exists and has data
SELECT COUNT(*) as trusted_contacts_count FROM trusted_contacts;

-- Check theft_mode_log table exists
SELECT COUNT(*) as theft_logs_count FROM theft_mode_log;

-- Check responders count (should show active responders)
SELECT COUNT(*) as responders_available FROM responders WHERE available = true;

-- Check responder_presence on current active alerts
SELECT 
  alert_id,
  COUNT(*) as responder_count
FROM responder_presence
GROUP BY alert_id
ORDER BY alert_id DESC
LIMIT 5;

-- ============================================================================
-- ✅ ALL DONE!
-- ============================================================================
-- Your MiCall app should now work with:
-- ✅ Singleton Supabase client (no multiple instances)
-- ✅ Theft alarm system (with trusted contacts)
-- ✅ Responder tracking (showing count on home page)
-- ✅ Complete audit trail (theft mode logs)
-- ============================================================================
