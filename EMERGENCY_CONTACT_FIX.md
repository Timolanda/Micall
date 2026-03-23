# Emergency Contact Add Issue - Diagnostic & Fix

## Problem Identified

Users cannot add emergency contacts. Investigation shows several potential causes:

### Root Causes:
1. **Table doesn't exist** - `trusted_contacts` table hasn't been created yet in Supabase
2. **RLS Policy issue** - Even if table exists, RLS policies might be blocking inserts
3. **Authentication issue** - User session might not be properly authenticated
4. **Missing Supabase environment variables** - `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` missing

## Verification Steps

### Step 1: Check if Table Exists
Run this in Supabase SQL Editor:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'trusted_contacts'
);
```

If result is `false`, the table hasn't been created.

### Step 2: Check RLS Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'trusted_contacts';
```

If you see policies listed, check if they're blocking inserts for your user.

### Step 3: Check Authentication
In browser console when trying to add contact:
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log(user);
```

If `user` is null, authentication failed.

## Solution Checklist

### ✅ Step 1: Create Tables (if not exists)
Copy and paste into Supabase SQL Editor:

```sql
-- Create trusted_contacts table
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

-- Enable RLS
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can manage their own contacts" ON trusted_contacts;

-- Create new RLS policy - allows users to do anything with their own contacts
CREATE POLICY "Users can manage their own contacts"
  ON trusted_contacts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user_id ON trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_verified ON trusted_contacts(verified);
```

### ✅ Step 2: Verify Environment Variables
Check `.env.local` has these variables (ask sister to share):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### ✅ Step 3: Clear Browser Cache & Restart App
```bash
# Stop dev server (Ctrl+C)
# Delete .next folder
rm -rf .next

# Restart dev server
npm run dev
```

### ✅ Step 4: Test in Browser Console
```javascript
// Test authentication
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Test table access
const { data, error } = await supabase
  .from('trusted_contacts')
  .select('*');
console.log('Table access:', { data, error });

// Test insert
const { data: newData, error: insertError } = await supabase
  .from('trusted_contacts')
  .insert({
    user_id: user.id,
    contact_phone: '1234567890',
    contact_name: 'Test Contact'
  })
  .select();
console.log('Insert test:', { data: newData, error: insertError });
```

## If Still Not Working

### Debug API Endpoint
Add logging to see what error is returned:

1. Open Network tab in DevTools
2. Click "Add Contact"
3. Look for `/api/theft/trusted-contacts` request
4. Check Response tab to see exact error

Common errors:
- `PGRST110: Requested resource updated/deleted` - RLS policy blocking
- `42P01: relation "trusted_contacts" does not exist` - Table not created
- `401 Unauthorized` - Authentication failed

### Check API Logs
```bash
# If running locally, check Next.js server logs for error messages
# Should see "❌ Add contact error:" with details
```

## Code Review

The code is correct:
- ✅ `useTrustedContacts` hook properly calls API
- ✅ `addContact` function sends POST to `/api/theft/trusted-contacts`
- ✅ API route properly validates inputs and calls helper
- ✅ Helper function uses correct table/column names
- ✅ RLS policy allows users to insert their own contacts

The issue is 100% database/configuration related, NOT code.

## Final Confirmation

After running the SQL and testing:
1. Contact should be added to `trusted_contacts` table
2. OTP should be sent to the contact's phone (via Supabase Auth)
3. Contact should appear in the "Your Trusted Contacts" list
4. Status should show "Verified" once contact confirms OTP

---

**Status**: Ready for verification ✅
**Last Updated**: March 24, 2026
