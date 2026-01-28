-- ============================================
-- SUPABASE PROFILES TABLE FIX
-- ============================================
-- This script fixes all syntax errors and creates the profiles table correctly

-- Step 1: Drop existing profiles table (with cascade to remove dependencies)
DROP TABLE IF EXISTS profiles CASCADE;

-- Step 2: Create profiles table with correct syntax
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

-- Step 3: Create indexes for better query performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_responder ON profiles(is_responder);

-- Step 4: Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Users can read their own profile
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "admins_read_all_profiles" ON profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'hospital', 'police', 'fire', 'ems')
  );

-- Step 6: Create update trigger to auto-update updated_at
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

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- If you see no errors above, the profiles table has been created successfully!
-- All syntax errors have been fixed.
