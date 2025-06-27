import { env } from '../config/environment';

interface NotificationMessage {
  to: string;
  subject: string;
  body: string;
}

export async function sendNotification(message: NotificationMessage): Promise<void> {
  // TODO: Implement actual email/notification service (SendGrid, AWS SES, etc.)
  console.log('Sending notification:', message);
  
  if (env.NODE_ENV !== 'production') {
    console.log('Notification:', message);
  }
}

export async function setupPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: env.VAPID_PUBLIC_KEY
    });

    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(subscription)
    });

    return true;
  } catch (error) {
    console.error('Failed to setup push notifications:', error);
    return false;
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
} 