# 🚨 CRITICAL ISSUES & FIXES - MARCH 23, 2026

## Issue 1: Custom Domain Login (www.micall.app) Not Working ✅ FIXABLE

### Root Cause
Supabase Auth configuration missing redirect URLs for custom domain

### Solution
**Go to Supabase Dashboard:**
1. Dashboard → Authentication → URL Configuration
2. Add these to "Redirect URLs":
   - `https://www.micall.app`
   - `https://www.micall.app/auth/callback`
   - `https://micall.app`
   - `https://micall.app/auth/callback`
3. **Save changes**
4. Test login on custom domain

### Verification
- Before: Login on www.micall.app → redirect error
- After: Login on www.micall.app → redirects to dashboard ✅

---

## Issue 2: Camera/SOS Not Working

### Camera Status: ✅ IMPLEMENTED
- File: `components/GoLiveButton.tsx` - COMPLETE
- File: `app/page.tsx` - startCamera() function COMPLETE
- File: `hooks/useMediaStreamControls.ts` - COMPLETE
- File: `hooks/useMediaRecorder.ts` - COMPLETE

### SOS Status: ✅ IMPLEMENTED
- File: `components/SOSButton.tsx` - COMPLETE
- File: `components/EmergencyUnlockScreen.tsx` - COMPLETE
- Trigger methods:
  - Button click (always works)
  - Volume Up (Android PWA)
  - Device Shake (iOS/Android PWA)
  - Power button long press (native Android)

### Possible Issues & Fixes:
1. **Camera Permission Not Granted**
   - iOS: Settings → Privacy → Camera → Allow MiCall
   - Android: App settings → Permissions → Camera → Allow

2. **Browser Not Supporting getUserMedia**
   - Use Chrome, Edge, Firefox on Android
   - Use Safari on iOS

3. **SOS Alert Not Appearing**
   - Check browser console for errors (F12)
   - Ensure location services enabled
   - Check if Supabase connection working

### How to Test:
- Click "Activate Camera" button on home page
- Or press Volume Up (Android)
- Or shake device
- Or click SOS button

---

## Issue 3: Home Page Not Showing Responders Count

### Current Implementation:
- File: `app/page.tsx` lines 160-185
- Query: `SELECT id FROM responders WHERE available=true`
- Display: Users icon + count + "Responders Available"

### Why It Might Not Show:
1. **responders table is empty** (no responders added)
2. **No responders with available=true** (status filtering)
3. **Database permission issue** (RLS policy blocking)
4. **Real-time subscription not updating** (channel issue)

### Quick Fix - Add Test Data:

```sql
-- Check if responders table exists
SELECT * FROM responders LIMIT 5;

-- If empty, add test responder:
INSERT INTO responders (id, lat, lng, available, updated_at)
VALUES (
  (SELECT id FROM profiles LIMIT 1),  -- Use existing user
  -1.2865,  -- Nairobi lat
  36.8172,  -- Nairobi lng
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET available=true;

-- Check result
SELECT COUNT(*) as responder_count FROM responders WHERE available=true;
```

### Expected Result:
- Responders count should display on home page
- Should update in real-time when responders go online/offline

---

## Issue 4: Profile Contact Add Failing

### Current Implementation:
- Table: `contacts` (emergency contacts) ✅
- Table: `trusted_contacts` (theft alarm contacts) ⚠️ 

### Problem:
The theft alarm "trusted contacts" feature depends on a `trusted_contacts` table that may not be created in your Supabase.

### Solution - Create The Table:

```sql
-- Create trusted_contacts table for theft alarm feature
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

-- Add RLS policies
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contacts"
  ON trusted_contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_trusted_contacts_user_id ON trusted_contacts(user_id);
CREATE INDEX idx_trusted_contacts_verified ON trusted_contacts(verified);
```

### Test Contact Add:
1. Go to Profile page
2. Click "Add Contact"
3. Enter name and phone
4. Should show success message

---

## Summary of Required Actions:

| Issue | Fix | Priority |
|-------|-----|----------|
| Custom domain login | Add redirect URLs in Supabase | 🔴 CRITICAL |
| Camera/SOS | Enable permissions + check console errors | 🟠 HIGH |
| Responders count | Add test responder + verify data | 🟡 MEDIUM |
| Contact add | Create trusted_contacts table | 🟡 MEDIUM |

---

## Testing Checklist:

- [ ] 1. Add custom domain redirect URLs to Supabase
- [ ] 2. Test login on www.micall.app
- [ ] 3. Grant camera permissions
- [ ] 4. Test camera button on home page
- [ ] 5. Test SOS button (should show emergency alert)
- [ ] 6. Run SQL to create trusted_contacts table
- [ ] 7. Add test responder to responders table
- [ ] 8. Check home page - should show responder count
- [ ] 9. Go to profile and add contact
- [ ] 10. Sister tests same features on her device

---

## Quick Testing on Your Device:

```
1. Camera Test:
   - Click "Activate Camera" button
   - Grant camera permission when prompted
   - Should see video preview
   - Should see recording timer
   
2. SOS Test:
   - Click "SOS" button (middle card)
   - Should see emergency alert creation
   - Should play alarm sound
   - Should show emergency profile
   
3. Responders Test:
   - Home page should show count (not 0)
   - Should update in real-time
   
4. Contact Test:
   - Profile → Add contact
   - Enter name + Kenyan phone
   - Should save successfully
```

