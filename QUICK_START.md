# 🎯 Quick Setup Guide (5 Minutes)

## The 4 Things You Fixed

1. **Admin Page** - You can now access as timolanda@gmail.com ✅
2. **Google OAuth** - Sign in with Google button added ✅
3. **Invite System** - Fixed with new database table ✅
4. **Video Storage** - Auto-saves and deletes after 7 days ✅

---

## 🚀 What To Do Right Now

### **Step 1: Run SQL in Supabase (3 minutes)**

1. Go to: `supabase.com` → Your Project → SQL Editor
2. Open this file: [COMPLETE_DATABASE_SETUP.sql](COMPLETE_DATABASE_SETUP.sql)
3. Copy ALL the code
4. Paste into Supabase SQL Editor
5. Click "Run"
6. Done! ✅

### **Step 2: Set Up Google OAuth (5 minutes)**

1. Go to: https://console.cloud.google.com
2. Create OAuth credentials:
   - Click "Create Credentials"
   - Type: "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/`
3. Copy your **Client ID** and **Client Secret**
4. Go to Supabase → Authentication → Providers → Google
5. Click "Enable"
6. Paste your credentials
7. Click "Save"
8. Done! ✅

### **Step 3: Test Everything (2 minutes)**

```
1. Clear browser cache (Ctrl+Shift+Delete)
2. Go to /signin
3. Click "Sign in with Google" → Test it works
4. Sign in as: timolanda@gmail.com
5. Go to /admin → Should show dashboard
6. Click "Invite" button → Test invite works
```

---

## 📱 What Works Now

| Feature | Before | After |
|---------|--------|-------|
| Admin Access | ❌ Access Denied | ✅ Works for timolanda@gmail.com |
| Sign In | Email/Password only | ✅ + Google OAuth |
| Sign Up | Email/Password only | ✅ + Google OAuth |
| Invites | ❌ Database error | ✅ Works perfectly |
| Video Storage | ❌ Not available | ✅ Auto-saves, deletes in 7 days |

---

## 📂 Key Files

| File | What It Does |
|------|--------------|
| [COMPLETE_DATABASE_SETUP.sql](COMPLETE_DATABASE_SETUP.sql) | Run this first in Supabase |
| [app/admin/page.tsx](app/admin/page.tsx) | Admin dashboard (timolanda@gmail.com access) |
| [app/(auth)/signin/page.tsx](app/(auth)/signin/page.tsx) | Sign in with Google |
| [app/(auth)/signup/page.tsx](app/(auth)/signup/page.tsx) | Sign up with Google |
| [VIDEO_STORAGE_GUIDE.md](VIDEO_STORAGE_GUIDE.md) | How to save videos |

---

## 🆘 Troubleshooting

**Admin page says "Access denied"?**
- Make sure you're signed in as: `timolanda@gmail.com` (exactly)
- Clear browser cache (Ctrl+Shift+Delete)
- Sign out and sign back in

**Google OAuth not working?**
- Did you run the SQL in Supabase? (Step 1)
- Is Google enabled in Supabase → Authentication → Providers?
- Check your OAuth credentials are correct

**Invite button not working?**
- Run [COMPLETE_DATABASE_SETUP.sql](COMPLETE_DATABASE_SETUP.sql) in Supabase
- Refresh the page

**Want video storage?**
- Read: [VIDEO_STORAGE_GUIDE.md](VIDEO_STORAGE_GUIDE.md)
- Or skip for now - it's optional

---

## ✅ Checklist

- [ ] Ran [COMPLETE_DATABASE_SETUP.sql](COMPLETE_DATABASE_SETUP.sql) in Supabase
- [ ] Enabled Google OAuth in Supabase
- [ ] Created Google Cloud OAuth credentials
- [ ] Added redirect URIs in Google Cloud
- [ ] Tested sign in with Google
- [ ] Tested admin access as timolanda@gmail.com
- [ ] Tested invite button

---

## 💡 That's It!

Everything is ready. Just follow the 3 steps above and you're done.

**Questions?** Check the full guides:
- Admin: See [COMPLETE_FIX_SUMMARY.md](COMPLETE_FIX_SUMMARY.md)
- Videos: See [VIDEO_STORAGE_GUIDE.md](VIDEO_STORAGE_GUIDE.md)
