import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { subscribeToPushNotifications, sendTestNotification } from '@/utils/notificationService';
import type { DbEmergencyAlert } from '../types';
import { isWithinRadiusKm } from '../utils/distance';

/**
 * useNotifications Hook - Legacy emergency alerts (kept for compatibility)
 */
export function useNotifications(userId: string | null, userLocation: [number, number] | null) {
  const [notifications, setNotifications] = useState<DbEmergencyAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !userLocation) return;
    let isActive = true;
    setLoading(true);
    supabase
      .from('emergency_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!isActive) return;
        const alerts = (data || []) as DbEmergencyAlert[];
        const filtered = alerts.filter((alert) => {
          if (typeof alert.lat !== 'number' || typeof alert.lng !== 'number') return false;
          return isWithinRadiusKm(userLocation, [alert.lat, alert.lng], 1);
        });
        setNotifications(filtered);
        setError(error ? error.message : null);
        setLoading(false);
      });
    // Subscribe to real-time notification updates
    const subscription = supabase
      .channel('emergency_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, (payload) => {
        if (!isActive) return;
        const alert = payload.new as DbEmergencyAlert;
        if (typeof alert.lat !== 'number' || typeof alert.lng !== 'number') return;
        if (!isWithinRadiusKm(userLocation, [alert.lat, alert.lng], 1)) return;
        setNotifications((prev) => [alert, ...prev]);
      })
      .subscribe();
    return () => {
      isActive = false;
      supabase.removeChannel(subscription);
    };
  }, [userId, userLocation]);

  return { notifications, loading, error };
}

/**
 * Push Notification State Interface
 */
export interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission | null;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * usePushNotifications Hook
 * Manages push notification state, permissions, and subscriptions
 */
export function usePushNotifications() {
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: null,
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Check if notifications are supported
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          isLoading: false,
        }));
        return;
      }

      setState((prev) => ({ ...prev, isSupported: true }));

      // Get current permission
      const permission = Notification.permission;
      setState((prev) => ({ ...prev, permission }));

      // Check if already subscribed
      if (permission === 'granted' && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setState((prev) => ({
          ...prev,
          isSubscribed: !!subscription,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Initialization failed',
        isLoading: false,
      }));
    }
  };

  /**
   * Request notification permissions
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (!('Notification' in window)) {
        throw new Error('Notifications not supported');
      }

      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));

      if (permission === 'granted') {
        // Subscribe to push notifications
        const subscribed = await subscribe();
        setState((prev) => ({
          ...prev,
          isSubscribed: subscribed,
          isLoading: false,
        }));
        return subscribed;
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Permission denied',
        }));
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Permission request failed',
        isLoading: false,
      }));
      return false;
    }
  }, []);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      if (!('PushManager' in window)) {
        throw new Error('Push notifications not supported');
      }

      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Resubscribe to ensure fresh token
        await subscription.unsubscribe();
      }

      // Subscribe with VAPID key
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Get user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Save subscription to database
      const success = await subscribeToPushNotifications(
        user.id,
        subscription
      );

      if (success) {
        setState((prev) => ({
          ...prev,
          isSubscribed: true,
          error: null,
        }));
      }

      return success;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Subscription failed',
      }));
      return false;
    }
  }, []);

  /**
   * Send test notification
   */
  const sendTestNotif = useCallback(async (): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const success = await sendTestNotification(user.id);
      if (!success) {
        setState((prev) => ({
          ...prev,
          error: 'Failed to send test notification',
        }));
      }
      return success;
    } catch (error) {
      console.error('Error sending test notification:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send test notification',
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    requestPermission,
    subscribe,
    sendTestNotification: sendTestNotif,
  };
} 