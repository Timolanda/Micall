-- ============================================
-- COMPLETE SUPABASE SETUP - ALL IN ONE
-- ============================================
-- Run this entire script in Supabase SQL Editor to set everything up

-- ===========================================
-- PART 1: PROFILES TABLE (User data)
-- ===========================================
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(20),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(255),
  
  -- Notification preferences
  notify_emergency BOOLEAN DEFAULT true,
  notify_police BOOLEAN DEFAULT true,
  notify_fire BOOLEAN DEFAULT true,
  notify_ems BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  notify_email BOOLEAN DEFAULT true,
  
  -- Status and tracking
  is_responder BOOLEAN DEFAULT false,
  responder_type VARCHAR(50),
  available BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_responder ON profiles(is_responder);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "admins_read_all_profiles" ON profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'hospital', 'police', 'fire', 'ems')
  );

CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at_trigger ON profiles;
CREATE TRIGGER profiles_updated_at_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- ===========================================
-- PART 2: USER INVITES TABLE (Invite system)
-- ===========================================
DROP TABLE IF EXISTS user_invites CASCADE;

CREATE TABLE user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_code VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'declined')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_invites_code ON user_invites(invite_code);
CREATE INDEX idx_user_invites_inviter ON user_invites(inviter_user_id);
CREATE INDEX idx_user_invites_status ON user_invites(status);
CREATE INDEX idx_user_invites_expires ON user_invites(expires_at);

ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_invites" ON user_invites
  FOR SELECT USING (true);

CREATE POLICY "create_own_invites" ON user_invites
  FOR INSERT WITH CHECK (auth.uid() = inviter_user_id);

CREATE POLICY "update_own_invites" ON user_invites
  FOR UPDATE USING (auth.uid() = inviter_user_id);

CREATE OR REPLACE FUNCTION update_user_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_invites_updated_at_trigger ON user_invites;
CREATE TRIGGER user_invites_updated_at_trigger
BEFORE UPDATE ON user_invites
FOR EACH ROW
EXECUTE FUNCTION update_user_invites_updated_at();

-- ===========================================
-- PART 3: SAVED VIDEOS TABLE (Video storage)
-- ===========================================
DROP TABLE IF EXISTS saved_videos CASCADE;

CREATE TABLE saved_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id BIGINT,
  storage_path TEXT NOT NULL,
  duration_seconds INT,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_saved_videos_user ON saved_videos(user_id);
CREATE INDEX idx_saved_videos_expires ON saved_videos(expires_at);

ALTER TABLE saved_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_videos" ON saved_videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_videos" ON saved_videos
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- PART 4: EMERGENCY ALERTS TABLE
-- ===========================================
DROP TABLE IF EXISTS emergency_alerts CASCADE;

CREATE TABLE emergency_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'emergency',
  lat FLOAT8 NOT NULL,
  lng FLOAT8 NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'responded', 'resolved', 'cancelled')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_emergency_alerts_user ON emergency_alerts(user_id);
CREATE INDEX idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX idx_emergency_alerts_created ON emergency_alerts(created_at DESC);

ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_alerts" ON emergency_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- ===========================================
-- PART 5: CONTACTS TABLE
-- ===========================================
DROP TABLE IF EXISTS contacts CASCADE;

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  relationship VARCHAR(50),
  is_emergency_contact BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_emergency ON contacts(is_emergency_contact);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_manage_own_contacts" ON contacts
  FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- PART 6: RESPONDERS TABLE
-- ===========================================
DROP TABLE IF EXISTS responders CASCADE;

CREATE TABLE responders (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat FLOAT8,
  lng FLOAT8,
  available BOOLEAN DEFAULT true,
  responder_type VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_responders_available ON responders(available);

ALTER TABLE responders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_available_responders" ON responders
  FOR SELECT USING (available = true);

-- ===========================================
-- COMPLETION MESSAGE
-- ===========================================
-- ✅ All tables created successfully!
-- 
-- You can now:
-- 1. Use the admin page (timolanda@gmail.com has access)
-- 2. Use Google OAuth to sign in/sign up
-- 3. Use the invite system (creates invites with 7-day expiration)
-- 4. Save videos (auto-deletes after 7 days)
-- 
-- Next Steps:
-- 1. Enable Google OAuth in Supabase → Authentication
-- 2. Set up Google Cloud credentials
-- 3. Configure authorized redirect URIs
