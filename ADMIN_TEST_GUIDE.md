# MiCall Admin Features - Quick Test Guide

## 🧪 Testing Checklist

### Test 1: Settings Page Auth Redirect ✅
**Objective:** Verify unauthenticated users are redirected to signin

**Steps:**
1. Clear browser cookies or use incognito mode
2. Navigate to `/settings`
3. **Expected:** Redirected to `/signin` with message "Please sign in to access settings"
4. ✅ Sign in with test account
5. **Expected:** Settings page loads with notification preferences

### Test 2: "Responders Available" Widget ✅
**Objective:** Verify responders count displays on home page

**Steps:**
1. Sign in as regular user
2. Navigate to `/` (home)
3. Look at middle card in 3-column grid
4. **Expected:** Shows Users icon + number + "Responders Available"
5. Number should match database count of responders with status 'available'/'on_duty'

### Test 3: Admin Section in Settings ✅
**Objective:** Verify admin section shows only for admin users

**Test Case A - Regular User:**
1. Sign in as non-admin user
2. Navigate to `/settings`
3. Scroll down
4. **Expected:** NO purple "Administrator Panel" section visible

**Test Case B - Admin User:**
1. Have owner convert user to 'admin' role (see Test 5)
2. Sign in as newly converted admin user
3. Navigate to `/settings`
4. Scroll down
5. **Expected:** Purple "Administrator Panel" visible with:
   - "📊 Admin Dashboard" button
   - Owner-only "👥 Convert User to Admin" section (if user is owner)

### Test 4: Admin Dashboard Access ✅
**Objective:** Verify admin dashboard is only accessible to admins

**Test Case A - Non-Admin:**
1. Sign in as regular user
2. Navigate to `/admin`
3. **Expected:** Redirect to home page with error toast: "Access denied: Admin role required"

**Test Case B - Admin:**
1. Convert user to 'admin' role
2. Sign in as admin user
3. Navigate to `/admin`
4. **Expected:** 
   - Dashboard loads successfully
   - Shows active alerts grid
   - Shows responders grid
   - Refresh button works
   - Real-time data displays

### Test 5: User to Admin Conversion ✅
**Objective:** Verify owner can convert users to admin roles

**Steps:**
1. Sign in as owner: `timolanda@gmail.com`
2. Navigate to `/settings`
3. Scroll to "Administrator Panel" → Click "👥 Convert User to Admin"
4. Search for a user email (e.g., "test@example.com")
5. **Expected:** User appears in search results with current role shown
6. Click on user to select
7. **Expected:** Role selection panel appears below
8. Select role: "Police Officer" (👮)
9. **Expected:** Confirmation section shows with both roles
10. Click "Convert User" button
11. **Expected:** Success message: "✅ test@example.com is now a Police Officer!"
12. Form resets

**Verification:**
- Have converted user sign out and sign back in
- Navigate to `/settings`
- **Expected:** Purple admin section is now visible to them
- Can click "📊 Admin Dashboard"

### Test 6: Maps on All Pages ✅
**Objective:** Verify Leaflet maps work across all pages

**Test A - Home Page Map:**
1. Navigate to `/`
2. See collapsible map at bottom (above nav bar)
3. Map shows collapsed state: ~120px height
4. Click chevron (↑) to expand
5. **Expected:** Map expands to 380px, shows victim and responder markers
6. Map is interactive: can pan/zoom
7. **Expected:** Shows distance and ETA between markers
8. Click chevron (↓) to collapse
9. **Expected:** Map returns to collapsed state

**Test B - Responder Live Page:**
1. Need active emergency alert first
2. Or navigate to `/responder/live/test-alert-id`
3. **Expected:** ResponderMap loads if alert exists
4. Shows responder (🧍‍♂️) and victim (🚨) locations
5. Route line connects them (red for preview, blue for navigation)
6. Distance/ETA displays below map

**Test C - Location Sharing Page:**
1. Navigate to `/location-sharing`
2. Click "Start Sharing" or "Share Location"
3. **Expected:** Map displays your location
4. Can see real-time tracking visualization
5. SOS option available with location broadcast

### Test 7: Admin Roles in Settings ✅
**Objective:** Verify all admin role options work

**Admin Roles to Test:**
- 🛡️ Platform Admin (`admin`) - Full system access
- 👮 Police Officer (`police`) - Law enforcement
- 🚒 Fire Department (`fire`) - Fire/rescue services  
- 🏥 Hospital/Medical (`hospital`) - Medical responders
- 🚑 Emergency Medical Services (`ems`) - EMS teams

**Steps:**
1. As owner, go to Settings → Convert User to Admin
2. Select each role and verify:
   - Icon displays correctly
   - Role name is clear
   - Confirmation shows correct role

### Test 8: Owner-Only Features ✅
**Objective:** Verify owner controls are only visible to owner

**Test A - Non-Owner User:**
1. Sign in as non-owner admin
2. Navigate to `/settings`
3. Go to Administrator Panel
4. Scroll down
5. **Expected:** NO "👥 Convert User to Admin" section visible

**Test B - Owner User:**
1. Sign in as owner: `timolanda@gmail.com`
2. Navigate to `/settings`
3. Go to Administrator Panel
4. Scroll down
5. **Expected:** Yellow "👥 Convert User to Admin" button is visible
6. Can click it and access `/admin/convert-user`

## 🔄 Full User Flow Test

**Scenario:** Create and promote a new responder admin

**Step 1: Owner Setup**
```
Owner: timolanda@gmail.com
- Already admin role
- Access to /admin/convert-user
- Can see "Convert User to Admin" in Settings
```

**Step 2: Create New User**
```
Action: Sign up new user (e.g., jane.officer@police.gov)
Result: New user account created with 'user' or default role
```

**Step 3: Owner Promotes User**
```
Owner: timolanda@gmail.com
1. Settings → Administrator Panel → "👥 Convert User to Admin"
2. Search for: jane.officer@police.gov
3. Select role: "Police Officer"
4. Confirm conversion
Result: jane.officer@police.gov now has role='police'
```

**Step 4: New Admin User Accesses Features**
```
User: jane.officer@police.gov (logs out and logs back in)
1. Navigate to /settings
2. See purple "Administrator Panel"
3. Click "📊 Admin Dashboard"
4. Access admin features: manage alerts, view responders, etc.
Result: New admin successfully onboarded
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Settings page shows "Please sign in" even when signed in | Clear browser cache, log out and log back in |
| Admin section doesn't appear after conversion | User needs to sign out and sign back in to refresh session |
| Maps not showing on home page | Try expanding the map widget, check browser console for Leaflet errors |
| Convert user button not visible | Ensure you're signed in as `timolanda@gmail.com` |
| Search results empty | Double-check email spelling, user must exist in database |
| API returns "Unauthorized" | Verify caller email is exactly `timolanda@gmail.com` |

## ✅ Production Checklist

Before deploying to production:

- [ ] Test settings auth redirect works for all user types
- [ ] Verify admin section only shows to admin users
- [ ] Test user conversion works and new admins can access dashboard
- [ ] Verify maps work on home, responder live, and location-sharing pages
- [ ] Confirm responders available count updates correctly
- [ ] Test all 5 admin role types can be assigned
- [ ] Verify owner-only features only accessible to owner
- [ ] Build passes with 0 errors
- [ ] All 23 pages generated successfully
- [ ] Test on mobile and desktop viewports
- [ ] Verify dark mode styling works across new components

## 📞 Support

If any tests fail:
1. Check browser console for JavaScript errors
2. Check server logs for API errors
3. Verify `.env.local` has `SUPABASE_SERVICE_ROLE_KEY` set
4. Ensure database `profiles` table has `role` column
5. Verify RLS policies allow admin role updates

---

**Test Guide Version:** 1.0  
**Last Updated:** January 7, 2025  
**Status:** Ready for Testing ✅
