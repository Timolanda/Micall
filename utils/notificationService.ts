/**
 * MiCall Push Notification Service
 * Handles sending notifications to responders and users
 */

import { supabase } from '@/lib/supabase';

export interface NotificationPayload {
  title: string;
  body: string;
  emergency_id?: string;
  victim_id?: string;
  victim_name?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  responder_types?: string[]; // police, fire, medical, rescue
  radius_km?: number;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string }>;
}

/**
 * Send push notification to a specific user via their subscription
 */
export async function sendNotificationToUser(
  userId: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const { data: subscription, error: subError } = await supabase
      .from('notification_subscriptions')
      .select('subscription_data')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (subError || !subscription) {
      console.warn(`No active subscription for user ${userId}`);
      return false;
    }

    const subscriptionObject = subscription.subscription_data;
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscriptionObject,
        payload: buildNotificationPayload(payload),
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send notification to user:', error);
    return false;
  }
}

/**
 * Send emergency alert notification to all active responders
 * Filters by location (radius) and responder types
 */
export async function sendEmergencyAlert(
  emergencyId: string,
  victimId: string,
  victimName: string,
  location: { latitude: number; longitude: number },
  responderTypes?: string[],
  radiusKm: number = 5
): Promise<number> {
  try {
    // Query for responders matching criteria
    const query = supabase
      .from('responders')
      .select(
        `
        id,
        user_id,
        responder_type,
        lat,
        lng,
        notification_settings:notification_settings(id)
      `
      )
      .eq('available', true)
      .eq('notification_settings.receive_notifications', true);

    // Filter by responder type if specified
    if (responderTypes && responderTypes.length > 0) {
      query.in('responder_type', responderTypes);
    }

    const { data: responders, error } = await query;

    if (error) {
      console.error('Error fetching responders:', error);
      return 0;
    }

    if (!responders || responders.length === 0) {
      console.warn('No responders found for emergency alert');
      return 0;
    }

    let notificationsSent = 0;

    // Filter by distance and send notifications
    for (const responder of responders) {
      if (responder.lat && responder.lng) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          responder.lat,
          responder.lng
        );

        if (distance <= radiusKm) {
          const payload: NotificationPayload = {
            title: '🚨 Emergency Alert',
            body: `Emergency from ${victimName} - ${distance.toFixed(1)}km away`,
            emergency_id: emergencyId,
            victim_id: victimId,
            victim_name: victimName,
            location: location,
            responder_types: responderTypes,
            radius_km: radiusKm,
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            tag: `emergency-${emergencyId}`,
            requireInteraction: true,
            data: {
              emergency_id: emergencyId,
              victim_id: victimId,
              victim_name: victimName,
              distance_km: distance.toFixed(1),
              lat: location.latitude,
              lng: location.longitude,
            },
            actions: [
              { action: 'respond', title: 'Respond Now' },
              { action: 'dismiss', title: 'Dismiss' },
            ],
          };

          const sent = await sendNotificationToUser(responder.user_id, payload);
          if (sent) {
            notificationsSent++;
          }
        }
      }
    }

    // Log notification broadcast
    if (notificationsSent > 0) {
      await logNotificationBroadcast(emergencyId, notificationsSent, 'emergency_alert');
    }

    return notificationsSent;
  } catch (error) {
    console.error('Failed to send emergency alert:', error);
    return 0;
  }
}

/**
 * Send location-based notification to responders
 */
export async function sendLocationBasedNotification(
  title: string,
  body: string,
  location: { latitude: number; longitude: number },
  radiusKm: number = 5,
  responderTypes?: string[]
): Promise<number> {
  try {
    const { data: responders, error } = await supabase
      .from('responders')
      .select('id, user_id, lat, lng')
      .eq('available', true);

    if (error || !responders) {
      return 0;
    }

    let notificationsSent = 0;

    for (const responder of responders) {
      if (responder.lat && responder.lng) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          responder.lat,
          responder.lng
        );

        if (distance <= radiusKm) {
          const payload: NotificationPayload = {
            title,
            body: `${body} - ${distance.toFixed(1)}km away`,
            location,
            radius_km: radiusKm,
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            data: { distance_km: distance.toFixed(1) },
          };

          const sent = await sendNotificationToUser(responder.user_id, payload);
          if (sent) {
            notificationsSent++;
          }
        }
      }
    }

    return notificationsSent;
  } catch (error) {
    console.error('Failed to send location-based notification:', error);
    return 0;
  }
}

/**
 * Send notification to specific responder type
 */
export async function sendResponderTypeNotification(
  title: string,
  body: string,
  responderTypes: string[]
): Promise<number> {
  try {
    const { data: responders, error } = await supabase
      .from('responders')
      .select('id, user_id')
      .eq('available', true)
      .in('responder_type', responderTypes);

    if (error || !responders) {
      return 0;
    }

    let notificationsSent = 0;

    for (const responder of responders) {
      const payload: NotificationPayload = {
        title,
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
      };

      const sent = await sendNotificationToUser(responder.user_id, payload);
      if (sent) {
        notificationsSent++;
      }
    }

    return notificationsSent;
  } catch (error) {
    console.error('Failed to send responder type notification:', error);
    return 0;
  }
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPushNotifications(
  userId: string,
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const { error } = await supabase.from('notification_subscriptions').upsert(
      {
        user_id: userId,
        subscription_data: subscription,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Failed to save subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Subscription save error:', error);
    return false;
  }
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeFromPushNotifications(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return false;
  }
}

/**
 * Send test notification
 */
export async function sendTestNotification(userId: string): Promise<boolean> {
  const payload: NotificationPayload = {
    title: '✅ Test Notification',
    body: 'Your notification settings are working correctly!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'test-notification',
  };

  return sendNotificationToUser(userId, payload);
}

// ============== HELPERS ==============

/**
 * Build standardized notification payload
 */
function buildNotificationPayload(payload: NotificationPayload): NotificationPayload {
  return {
    title: payload.title || 'MiCall',
    body: payload.body || 'New notification',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/badge-72.png',
    tag: payload.tag || 'micall-notification',
    requireInteraction: payload.requireInteraction ?? true,
    data: payload.data || {},
    actions: payload.actions || [],
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Log notification broadcast for analytics
 */
async function logNotificationBroadcast(
  emergencyId: string,
  recipientCount: number,
  notificationType: string
): Promise<void> {
  try {
    await supabase.from('notification_logs').insert({
      emergency_id: emergencyId,
      notification_type: notificationType,
      recipient_count: recipientCount,
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log notification broadcast:', error);
  }
}
