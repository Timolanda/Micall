# 🔔 Notification System Integration Guide

This guide explains how to integrate the push notification system with existing MiCall features.

---

## 1. Trigger Notifications on Emergency (Go Live)

### **Update `app/page.tsx` - handleGoLive Function**

Add this import at the top:
```typescript
import { sendEmergencyAlert } from '@/utils/notificationService';
```

In the `handleGoLive` function, after creating the alert, add:
```typescript
// After alert creation succeeds
if (alertData?.id && userLocation) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', uid)
      .single();

    const victimName = profile?.full_name || 'Unknown';

    // Send notifications to nearby responders
    // Customize responder types based on your needs
    const responderTypes = ['police', 'fire', 'medical', 'rescue'];
    const radiusKm = 5; // User can customize in settings

    const notificationsSent = await sendEmergencyAlert(
      alertData.id.toString(),
      uid,
      victimName,
      {
        latitude: userLocation[0],
        longitude: userLocation[1],
      },
      responderTypes,
      radiusKm
    );

    console.log(`Notifications sent to ${notificationsSent} responders`);
  } catch (notifError) {
    console.error('Notification broadcast failed:', notifError);
    // Don't fail the Go Live if notifications fail
  }
}
```

---

## 2. Use Responder Notification Settings

### **Filter by User Preferences**

The `sendEmergencyAlert` function automatically filters responders by:
- ✅ Availability status
- ✅ Location (within radius)
- ✅ Responder type (police/fire/medical/rescue)
- ✅ Notification settings (checks notification_settings table)

Each responder sees:
- Emergency details
- Distance from their location
- Victim name
- Action buttons: "Respond Now" or "Dismiss"

---

## 3. Send Location-Based Notifications

### **For Location Sharing Features**

```typescript
import { sendLocationBasedNotification } from '@/utils/notificationService';

// Alert responders within 5km of a location
await sendLocationBasedNotification(
  'Alert: Emergency nearby',
  'An emergency has been reported',
  {
    latitude: 40.7128,
    longitude: -74.0060,
  },
  5 // radius in km
);
```

---

## 4. Send Responder Type Specific Alerts

### **Dispatch Specific Services**

```typescript
import { sendResponderTypeNotification } from '@/utils/notificationService';

// Alert only police officers
await sendResponderTypeNotification(
  'Criminal activity reported',
  'Suspicious activity on Main Street',
  ['police']
);

// Alert emergency services
await sendResponderTypeNotification(
  'Major emergency',
  'Structure fire at downtown complex',
  ['fire', 'medical', 'rescue']
);
```

---

## 5. User Notification Settings Page

### **Display Settings in Profile Page**

```typescript
// In app/settings/page.tsx or similar
import NotificationSettings from '@/components/NotificationSettings';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {user?.id && (
        <NotificationSettings userId={user.id} />
      )}
    </div>
  );
}
```

---

## 6. Test Notifications

### **Send Test Notification**

```typescript
import { sendTestNotification } from '@/utils/notificationService';

// In a test button or debug component
const handleTestNotification = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const success = await sendTestNotification(user.id);
  if (success) {
    console.log('Test notification sent!');
  }
};
```

---

## 7. API Endpoint for Web Push

### **Create `/api/send-notification` Endpoint**

The notification service expects this endpoint. Create it in your API routes:

```typescript
// app/api/send-notification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// Configure VAPID keys (set in environment variables)
webpush.setVapidDetails(
  process.env.NEXT_PUBLIC_VAPID_SUBJECT || 'mailto:support@micall.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { subscription, payload } = await request.json();

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription provided' },
        { status: 400 }
      );
    }

    // Send push notification
    await webpush.sendNotification(subscription, JSON.stringify(payload));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web push error:', error);
    
    // Handle subscription errors (e.g., unsubscribed)
    if (error instanceof webpush.WebPushError) {
      if (error.statusCode === 410) {
        // Subscription no longer valid
        return NextResponse.json(
          { error: 'Subscription expired', code: 410 },
          { status: 410 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
```

**Install `web-push` package:**
```bash
npm install web-push
npm install --save-dev @types/web-push
```

---

## 8. Generate VAPID Keys

### **One-time Setup**

```bash
# Generate VAPID keys
npx web-push generate-vapid-keys

# Output:
# Public Key: <NEXT_PUBLIC_VAPID_PUBLIC_KEY>
# Private Key: <VAPID_PRIVATE_KEY>
```

### **Set Environment Variables**

```bash
# .env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
```

---

## 9. Monitor Notification Delivery

### **Check Notification Logs**

Query the `notification_logs` table:

```typescript
// In admin dashboard or debug component
const { data: logs } = await supabase
  .from('notification_logs')
  .select('*')
  .eq('emergency_id', emergencyId)
  .order('sent_at', { ascending: false });

logs?.forEach(log => {
  console.log(`${log.notification_type}: ${log.recipient_count} sent at ${log.sent_at}`);
});
```

---

## 10. Responder Type Mapping

### **Available Responder Types**

```typescript
const RESPONDER_TYPES = {
  'police': '🚔 Police',
  'fire': '🚒 Fire Department',
  'medical': '🚑 Medical/Ambulance',
  'rescue': '🛟 Rescue/Recovery',
};
```

When signing up, responders select their type in the profile creation flow.

---

## 11. Common Scenarios

### **Scenario 1: Victim Goes Live**
```
1. User clicks "Go Live"
2. Camera preview starts (works immediately)
3. Backend creates emergency_alert
4. responders table updated with location
5. sendEmergencyAlert() called
6. Nearby responders get push notification
7. Responders can respond or dismiss
```

### **Scenario 2: Responder Offline Notification**
```
1. App runs in background or closed
2. Push notification arrives
3. Service worker catches push event
4. showNotification() displays alert
5. User clicks "Respond Now"
6. App opens to emergency details
7. Responder can navigate or video call
```

### **Scenario 3: Responder Customizes Settings**
```
1. Responder opens app
2. Permission modal shows (first time)
3. User grants notification permission
4. Opens Settings
5. Disables "Fire Department" notifications
6. Sets alert radius to 10km
7. Only police/medical/rescue within 10km notify
```

---

## 12. Debugging Tips

### **Check Service Worker**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations()
  .then(registrations => console.log(registrations));
```

### **Check Subscriptions**
```typescript
// In browser console
navigator.serviceWorker.ready
  .then(reg => reg.pushManager.getSubscription())
  .then(sub => console.log(JSON.stringify(sub, null, 2)));
```

### **Test Notifications**
```javascript
// Simulate push from dev console
const registration = await navigator.serviceWorker.ready;
const event = new Event('push');
event.data = {
  json: () => ({
    title: 'Test',
    body: 'Testing notifications',
  })
};
registration.serviceWorker.controller.postMessage({ type: 'PUSH_RECEIVED', event });
```

---

## 13. Production Checklist

- [ ] VAPID keys generated and stored in env vars
- [ ] `/api/send-notification` endpoint created
- [ ] Service worker deployed to `public/service-worker.js`
- [ ] Manifest.json configured for your domain
- [ ] Notification tables created (schema.sql applied)
- [ ] Test notification delivery on real device
- [ ] Verify offline notifications work
- [ ] Check browser console for errors
- [ ] Monitor notification_logs table
- [ ] Set up error tracking for failed sends

---

## 14. Troubleshooting

### **Notifications Not Showing**
- ✅ Check `Notification.permission` is 'granted'
- ✅ Verify service worker is registered
- ✅ Check browser notification settings
- ✅ Ensure VAPID keys are correct
- ✅ Check `/api/send-notification` is responding

### **Subscriptions Invalid**
- ✅ VAPID key mismatch (regenerate both public/private)
- ✅ Subscription expired (re-subscribe)
- ✅ Database connection error
- ✅ Check notification_subscriptions table

### **App Not Opening from Notification**
- ✅ Check notification click handler in service worker
- ✅ Verify clientUrl is correct
- ✅ Check app launch configuration in manifest.json

---

**✅ Integration Complete!**

Your MiCall platform now has production-grade push notifications integrated with the emergency response system.

For questions or issues, check the service worker logs and browser console.
