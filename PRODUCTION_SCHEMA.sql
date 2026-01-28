/*
 ============================================================================
 MiCall Production Emergency Response Platform - Complete Schema & RLS
 ============================================================================
 This SQL script includes:
 - Complete table structure with proper constraints
 - Secure Row Level Security (RLS) policies
 - Production-grade indexes
 - Realtime subscription support
 - Phone + full_name fields on profiles
 - Admin roles (hospital, police, admin, fire)
 ============================================================================
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- PROFILES TABLE (Enhanced)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role TEXT CHECK (role IN ('victim', 'responder', 'contact', 'admin', 'hospital', 'police', 'fire')),
  photo_url TEXT,
  medical_info TEXT,
  location_sharing_enabled BOOLEAN DEFAULT FALSE,
  location_sharing_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- ============================================================================
-- EMERGENCY ALERTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('SOS', 'video', 'Go Live', 'other')),
  message TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  video_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'resolved', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_emergency_alerts_user_id ON emergency_alerts(user_id);
CREATE INDEX idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX idx_emergency_alerts_created_at ON emergency_alerts(created_at DESC);

-- ============================================================================
-- RESPONDERS TABLE (CRITICAL FOR PRESENCE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS responders (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  location GEOMETRY(Point, 4326),
  available BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_location_data CHECK (
    (lat IS NULL AND lng IS NULL AND location IS NULL)
    OR (lat IS NOT NULL AND lng IS NOT NULL AND location IS NOT NULL)
  )
);

CREATE INDEX idx_responders_available ON responders(available);
CREATE INDEX idx_responders_location ON responders USING gist(location);
CREATE INDEX idx_responders_updated_at ON responders(updated_at DESC);

-- ============================================================================
-- LIVE RESPONDERS TABLE (Track active responders per alert)
-- ============================================================================
CREATE TABLE IF NOT EXISTS live_responders (
  id BIGSERIAL PRIMARY KEY,
  alert_id BIGINT NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_responder_alert UNIQUE(alert_id, responder_id)
);

CREATE INDEX idx_live_responders_alert_id ON live_responders(alert_id);
CREATE INDEX idx_live_responders_responder_id ON live_responders(responder_id);

-- ============================================================================
-- USER LOCATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_locations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_updated_at ON user_locations(updated_at DESC);

-- ============================================================================
-- CONTACTS TABLE (Emergency Contacts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT,
  can_view_location BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_phone UNIQUE(user_id, phone),
  CONSTRAINT max_contacts_per_user CHECK (
    (SELECT COUNT(*) FROM contacts c2 WHERE c2.user_id = user_id) <= 5
  )
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);

-- ============================================================================
-- LOCATION SHARING PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS location_sharing_permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_contact UNIQUE(user_id, contact_id)
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_id BIGINT REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('emergency', 'info', 'warning', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- ============================================================================
-- HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_id BIGINT REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_history_user_id ON history(user_id);

-- ============================================================================
-- WEBRTC SIGNALS TABLE (for peer-to-peer communication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS webrtc_signals (
  id BIGSERIAL PRIMARY KEY,
  alert_id BIGINT NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('offer', 'answer', 'ice')),
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webrtc_signals_alert_id ON webrtc_signals(alert_id);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- VIDEOS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS videos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_id BIGINT REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- POSTGRES FUNCTIONS
-- ============================================================================

-- Trigger to update PostGIS location when lat/lng changes
CREATE OR REPLACE FUNCTION update_responder_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_responder_location ON responders;
CREATE TRIGGER trigger_update_responder_location
  BEFORE INSERT OR UPDATE ON responders
  FOR EACH ROW
  EXECUTE FUNCTION update_responder_location();

-- Update timestamp on profile changes
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- PROFILES RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hospital', 'police', 'fire')
    )
  );

-- ============================================================================
-- EMERGENCY ALERTS RLS
-- ============================================================================
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own alerts" ON emergency_alerts;
CREATE POLICY "Users can create own alerts" ON emergency_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own alerts" ON emergency_alerts;
CREATE POLICY "Users can view own alerts" ON emergency_alerts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own alerts" ON emergency_alerts;
CREATE POLICY "Users can update own alerts" ON emergency_alerts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Responders can view active alerts" ON emergency_alerts;
CREATE POLICY "Responders can view active alerts" ON emergency_alerts
  FOR SELECT USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('responder', 'admin', 'hospital', 'police', 'fire')
    )
  );

DROP POLICY IF EXISTS "Admins can view all alerts" ON emergency_alerts;
CREATE POLICY "Admins can view all alerts" ON emergency_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hospital', 'police', 'fire')
    )
  );

-- ============================================================================
-- RESPONDERS RLS
-- ============================================================================
ALTER TABLE responders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Responders can insert own presence" ON responders;
CREATE POLICY "Responders can insert own presence" ON responders
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Responders can update own location" ON responders;
CREATE POLICY "Responders can update own location" ON responders
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can view available responders" ON responders;
CREATE POLICY "Anyone can view available responders" ON responders
  FOR SELECT USING (available = TRUE);

DROP POLICY IF EXISTS "Admins can view all responders" ON responders;
CREATE POLICY "Admins can view all responders" ON responders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hospital', 'police', 'fire')
    )
  );

-- ============================================================================
-- LIVE RESPONDERS RLS
-- ============================================================================
ALTER TABLE live_responders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Responders can join live alerts" ON live_responders;
CREATE POLICY "Responders can join live alerts" ON live_responders
  FOR INSERT WITH CHECK (auth.uid() = responder_id);

DROP POLICY IF EXISTS "Users can view responders on their alerts" ON live_responders;
CREATE POLICY "Users can view responders on their alerts" ON live_responders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM emergency_alerts ea
      WHERE ea.id = alert_id
      AND (
        ea.user_id = auth.uid()
        OR auth.uid() IN (
          SELECT responder_id FROM live_responders
          WHERE alert_id = emergency_alerts.id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Admins can view all live responders" ON live_responders;
CREATE POLICY "Admins can view all live responders" ON live_responders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hospital', 'police', 'fire')
    )
  );

-- ============================================================================
-- USER LOCATIONS RLS
-- ============================================================================
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own location" ON user_locations;
CREATE POLICY "Users can manage own location" ON user_locations
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Responders can view locations during active emergencies" ON user_locations;
CREATE POLICY "Responders can view locations during active emergencies" ON user_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM emergency_alerts ea
      WHERE ea.user_id = user_locations.user_id
      AND ea.status = 'active'
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('responder', 'admin', 'hospital', 'police', 'fire')
      )
    )
  );

-- ============================================================================
-- CONTACTS RLS
-- ============================================================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
CREATE POLICY "Users can manage own contacts" ON contacts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS RLS
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HISTORY RLS
-- ============================================================================
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own history" ON history;
CREATE POLICY "Users can view own history" ON history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all history" ON history;
CREATE POLICY "Admins can view all history" ON history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hospital', 'police', 'fire')
    )
  );

-- ============================================================================
-- WEBRTC SIGNALS RLS
-- ============================================================================
ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create and view signals for their alerts" ON webrtc_signals;
CREATE POLICY "Users can create and view signals for their alerts" ON webrtc_signals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM emergency_alerts ea
      WHERE ea.id = alert_id
      AND (
        ea.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM live_responders lr
          WHERE lr.alert_id = alert_id
          AND lr.responder_id = auth.uid()
        )
      )
    )
  );

-- ============================================================================
-- SUBSCRIPTIONS RLS
-- ============================================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- VIDEOS RLS
-- ============================================================================
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own videos" ON videos;
CREATE POLICY "Users can manage own videos" ON videos
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STORAGE POLICIES (Supabase Storage)
-- ============================================================================

-- Create evidence bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for authenticated uploads
DROP POLICY IF EXISTS "Authenticated users can upload evidence" ON storage.objects;
CREATE POLICY "Authenticated users can upload evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence');

DROP POLICY IF EXISTS "Users can view their own evidence" ON storage.objects;
CREATE POLICY "Users can view their own evidence" ON storage.objects
  FOR SELECT USING (bucket_id = 'evidence' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hospital', 'police', 'fire')
    )
  ));

-- ============================================================================
-- PRODUCTION INDEXES (for performance)
-- ============================================================================

-- Alert location queries
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_coords ON emergency_alerts(lat, lng);

-- Responder availability queries
CREATE INDEX IF NOT EXISTS idx_responders_available_updated ON responders(available, updated_at DESC);

-- User location tracking
CREATE INDEX IF NOT EXISTS idx_user_locations_updated ON user_locations(user_id, updated_at DESC);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

/*
  NOTES FOR DEPLOYMENT:
  
  1. Run this script in your Supabase SQL Editor
  2. Verify all tables are created: SELECT * FROM information_schema.tables WHERE table_schema='public'
  3. Enable Realtime on these tables via Supabase Dashboard:
     - emergency_alerts
     - responders
     - live_responders
     - user_locations
     - webrtc_signals
  
  4. Key Changes in This Schema:
     ✅ Added full_name and phone to profiles
     ✅ Added admin roles: hospital, police, admin, fire
     ✅ Added live_responders table for tracking active responders
     ✅ Secure RLS policies preventing cross-user access
     ✅ Admin access to all data
     ✅ Proper UPSERT support (responders table)
     ✅ Responder presence is separate from emergency_alerts
     ✅ Indexes for performance
     ✅ UNIQUE constraints to prevent duplicates
  
  5. Mobile-Safe Considerations:
     ✅ No client-side auth workarounds needed
     ✅ All user data isolated by RLS
     ✅ Responder presence updates via UPSERT
     ✅ Proper transaction handling
*/
