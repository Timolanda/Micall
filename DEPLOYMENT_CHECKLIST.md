# MiCall Production Deployment Checklist

## 🎯 BEFORE DEPLOYING TO PRODUCTION

### Phase 1: Database Schema (5 minutes)

**Steps:**
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to SQL Editor
3. Copy the entire contents of `schema.sql` from your repo
4. Paste into SQL Editor
5. Click "Run"
6. Verify all tables are created:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema='public' ORDER BY table_name;
   ```

**Expected Tables:**
- ✅ contacts
- ✅ emergency_alerts
- ✅ history
- ✅ live_responders (NEW)
- ✅ location_sharing_permissions
- ✅ notifications
- ✅ profiles
- ✅ responders
- ✅ subscriptions
- ✅ user_locations
- ✅ videos
- ✅ webrtc_signals (NEW)

---

### Phase 2: Enable Realtime (3 minutes)

Go to **Supabase Dashboard → Realtime → Tables**

Enable Realtime on these tables:
- ✅ emergency_alerts
- ✅ responders
- ✅ live_responders
- ✅ webrtc_signals
- ✅ user_locations

**How to enable:**
1. Click table name
2. Toggle "Realtime" switch ON
3. Verify it says "Listening to changes"

---

### Phase 3: Create Storage Buckets (3 minutes)

Go to **Supabase Dashboard → Storage → Buckets**

**Create Evidence Bucket:**
1. Click "New Bucket"
2. Name: `evidence`
3. Check: "Private" ✅
4. Click "Create"

**Create Videos Bucket:**
1. Click "New Bucket"
2. Name: `videos`
3. Check: "Private" ✅
4. Click "Create"

---

### Phase 4: Verify RLS Policies (5 minutes)

Go to **Supabase Dashboard → Authentication → Policies**

Check each table has policies:
- ✅ profiles: 3 policies (view own, update own, admin view all)
- ✅ emergency_alerts: 5 policies
- ✅ responders: 4 policies
- ✅ live_responders: 3 policies
- ✅ user_locations: 2 policies
- ✅ contacts: 1 policy
- ✅ notifications: 2 policies
- ✅ webrtc_signals: 1 policy

**If missing**, copy from PRODUCTION_SCHEMA.sql

---

### Phase 5: Frontend Deployment (5 minutes)

**Environment Variables (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Build:**
```bash
npm install
npm run build
npm run start
```

**Or deploy to Vercel:**
```bash
npm install -g vercel
vercel
# Follow prompts
```

---

### Phase 6: Test All Features (15 minutes)

#### Test 1: Sign Up
1. Go to `/signup`
2. Enter: full_name, phone, email, password
3. Click "Sign Up"
4. ✅ Profile should be created with name + phone

#### Test 2: Go Live
1. Go to `/` (dashboard)
2. Allow location access
3. Click "Go Live"
4. ✅ Camera preview appears (no backend required)
5. ✅ Alert created in `emergency_alerts` table
6. ✅ Row created in `responders` table with `available = true`

#### Test 3: View on Another Device
1. Open `/live` on different user/device
2. ✅ Should see active emergency alert
3. Tap alert → ✅ Shows live responder count

#### Test 4: Camera Toggle
1. While live, look for rotate icon
2. ✅ Click to switch between front/back camera
3. ✅ Stays live during switch

#### Test 5: Admin Dashboard
1. Set your profile role to 'admin' or 'hospital' in Supabase
2. Go to `/admin`
3. ✅ Should see:
   - Active emergencies list
   - Available responders list
   - Responder count badges
   - Real-time updates

#### Test 6: End Live
1. While live, click "End Live"
2. ✅ Recording uploads to storage
3. ✅ Alert status = 'ended'
4. ✅ Responder available = false
5. ✅ Camera stops

#### Test 7: Map Visibility
1. Go to dashboard
2. Collapse map (should show "Live Response Map" header fully)
3. Expand map (should not overlap navbar)
4. ✅ Toggle works smoothly

---

## 🔒 Security Verification

### Test RLS is Working

**Run in Supabase SQL Editor:**

```sql
-- Should see only their profile
select * from profiles where auth.uid() = id;

-- Should fail if trying to access another user's alerts
select * from emergency_alerts 
where user_id != auth.uid() 
and status = 'active';
-- Expected: 0 rows for non-responders

-- Admin should see all alerts
select * from emergency_alerts;
-- Expected: All rows if user role = 'admin'
```

---

## 🚨 Rollback Plan

If something breaks:

**Step 1: Identify Issue**
1. Check Supabase logs: Dashboard → Logs
2. Check browser console (F12)
3. Check network tab for failed requests

**Step 2: Fix Database**
```sql
-- Disable RLS temporarily (DEBUG ONLY)
alter table emergency_alerts disable row level security;

-- Or rollback a specific policy
drop policy if EXISTS "Users can create own alerts" on emergency_alerts;
```

**Step 3: Revert Frontend**
```bash
git revert HEAD
# or
git checkout main
npm run build && npm run start
```

---

## 📊 Production Monitoring

### Daily Checks
- [ ] Check Supabase logs for errors
- [ ] Verify realtime is publishing changes
- [ ] Monitor storage usage
- [ ] Check database query performance

### Weekly Checks
- [ ] Review emergency_alerts for stuck alerts (status != 'ended')
- [ ] Clean up old webrtc_signals (>24hrs old)
- [ ] Verify RLS policies are working
- [ ] Check responder availability status

### Performance Optimization
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Vacuum and analyze
VACUUM ANALYZE profiles;
VACUUM ANALYZE emergency_alerts;
VACUUM ANALYZE responders;
```

---

## 🎯 Post-Deployment

### 1. Enable Email Alerts (Optional)
Supabase → Authentication → Email Templates
- Customize signup welcome email
- Add phone to profile data

### 2. Setup Monitoring (Optional)
- Integrate with Sentry for error tracking
- Setup uptime monitoring
- Add analytics for user behavior

### 3. Document Admin Access
- Share admin dashboard URL: `https://yourapp.com/admin`
- Create admin user account for hospital/police
- Document role setup process

### 4. Create Support Resources
- Troubleshooting guide for users
- Admin dashboard guide
- Emergency contact procedures

---

## ✅ Verification Checklist

Before declaring production-ready:

- [ ] Schema deployed with all tables
- [ ] Realtime enabled on 5 tables
- [ ] Storage buckets created (evidence + videos)
- [ ] RLS policies verified on all tables
- [ ] Frontend deployed successfully
- [ ] Sign up works (name + phone captured)
- [ ] Go Live creates alert + responder presence
- [ ] Other users see responders
- [ ] Admin dashboard accessible
- [ ] Camera toggle working
- [ ] Map visible and not overlapping
- [ ] End Live clears all state
- [ ] Tests pass on mobile + desktop
- [ ] No RLS bypass vulnerabilities
- [ ] Performance acceptable (<500ms response times)

---

## 🆘 Support Contacts

If issues arise:

**Supabase Support:**
- https://supabase.com/support
- Discord: https://discord.supabase.io

**Check Repository:**
- Issues: https://github.com/your-org/micall/issues
- Discussions: https://github.com/your-org/micall/discussions

**Common Issues:**

| Issue | Solution |
|-------|----------|
| "Auth not initialized" | Ensure NEXT_PUBLIC_SUPABASE_URL is set |
| "RLS policy blocks access" | Check policies in SQL Editor |
| "Realtime not updating" | Verify table is enabled for realtime |
| "Storage 403 error" | Check bucket policy and user role |
| "Camera permission denied" | Check browser permissions |

---

## 🎉 You're Live!

Congratulations! MiCall is now production-ready with:
- ✅ Secure RLS for all data
- ✅ Real-time emergency alerts
- ✅ Responder presence tracking
- ✅ Admin dashboard monitoring
- ✅ Enhanced user profiles
- ✅ Proper auth handling
- ✅ Camera controls
- ✅ Reliable state management

**Next Steps:**
1. Monitor production logs
2. Gather user feedback
3. Plan feature enhancements
4. Scale infrastructure as needed
