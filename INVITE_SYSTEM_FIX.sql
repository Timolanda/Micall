-- ============================================
-- INVITE SYSTEM TABLE SETUP
-- ============================================
-- This creates/fixes the user_invites table for the invite functionality

-- Step 1: Drop table if exists
DROP TABLE IF EXISTS user_invites CASCADE;

-- Step 2: Create user_invites table
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

-- Step 3: Create indexes
CREATE INDEX idx_user_invites_code ON user_invites(invite_code);
CREATE INDEX idx_user_invites_inviter ON user_invites(inviter_user_id);
CREATE INDEX idx_user_invites_status ON user_invites(status);
CREATE INDEX idx_user_invites_expires ON user_invites(expires_at);

-- Step 4: Enable RLS
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Anyone can read invites (to check if code is valid)
CREATE POLICY "read_invites" ON user_invites
  FOR SELECT USING (true);

-- Authenticated users can create their own invites
CREATE POLICY "create_own_invites" ON user_invites
  FOR INSERT WITH CHECK (auth.uid() = inviter_user_id);

-- Authenticated users can update their invites
CREATE POLICY "update_own_invites" ON user_invites
  FOR UPDATE USING (auth.uid() = inviter_user_id);

-- Step 6: Create update trigger for updated_at
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

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- If you see no errors above, the user_invites table has been created successfully!
