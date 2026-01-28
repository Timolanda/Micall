// app/api/send-notification/route.ts
/**
 * Web Push Notification API Endpoint
 * Sends push notifications to subscribed clients
 * 
 * Requirements:
 * - npm install web-push
 * - Environment variables: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 */

'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

let webpush: any;

try {
  webpush = require('web-push');
} catch (err) {
  console.warn('web-push package not installed. Install with: npm install web-push @types/web-push');
}

// Initialize Supabase admin client - lazy load to avoid initialization errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Configure VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (webpush && vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@micall.app',
    vapidPublicKey,
    vapidPrivateKey
  );
}

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface WebPushError extends Error {
  statusCode?: number;
  body?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is an authorized request (from backend only)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.NOTIFICATION_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload: NotificationPayload = await request.json();
    const { userId, title, body, icon, badge, tag, data } = payload;

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, body' },
        { status: 400 }
      );
    }

    // Get user's push tokens
    const supabase = getSupabaseClient();
    const { data: notificationSettings, error: queryError } = await supabase
      .from('notification_settings')
      .select('push_token')
      .eq('user_id', userId)
      .single();

    if (queryError) {
      console.error('Error fetching push token:', queryError);
      return NextResponse.json(
        { error: 'User not found or no notification settings' },
        { status: 404 }
      );
    }

    if (!notificationSettings?.push_token) {
      return NextResponse.json(
        { error: 'User has no push token' },
        { status: 400 }
      );
    }

    const pushToken = notificationSettings.push_token;

    // Send push notification
    const notificationOptions = {
      icon: icon || '/icon-192x192.png',
      badge: badge || '/badge-72x72.png',
      tag: tag || 'micall-notification',
      data: data || {},
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Open MiCall',
          icon: '/icon-96x96.png',
        },
        {
          action: 'close',
          title: 'Dismiss',
          icon: '/icon-96x96.png',
        },
      ],
    };

    try {
      if (!webpush) {
        return NextResponse.json(
          { error: 'Web push service not configured. Install web-push package.' },
          { status: 503 }
        );
      }

      await webpush.sendNotification(
        {
          endpoint: pushToken,
          keys: {
            auth: 'default_auth_key',
            p256dh: 'default_p256dh',
          },
        },
        JSON.stringify({
          title,
          body,
          ...notificationOptions,
        })
      );

      return NextResponse.json(
        { success: true, message: 'Notification sent' },
        { status: 200 }
      );
    } catch (pushError: unknown) {
      const error = pushError as any;
      console.error('Web Push Error:', error);

      // Handle specific push errors
      if (error.statusCode === 410) {
        // Token expired, delete it
        await supabase
          .from('notification_settings')
          .update({ push_token: null, browser_push_enabled: false })
          .eq('user_id', userId);

        return NextResponse.json(
          { error: 'Push token expired and removed' },
          { status: 410 }
        );
      }

      if (error.statusCode === 400 || error.statusCode === 401) {
        return NextResponse.json(
          { error: `Push service error: ${error.body || error.message}` },
          { status: error.statusCode }
        );
      }

      throw error;
    }
  } catch (error: unknown) {
    const err = error as any;
    console.error('Send notification error:', err);

    return NextResponse.json(
      { error: 'Failed to send notification', details: err.message || String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/send-notification
 * Health check endpoint
 */
export async function GET() {
  try {
    // Check if VAPID keys are configured
    const hasVapidPublic = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const hasVapidPrivate = !!process.env.VAPID_PRIVATE_KEY;

    if (!hasVapidPublic || !hasVapidPrivate) {
      return NextResponse.json(
        {
          status: 'MISCONFIGURED',
          message: 'VAPID keys not configured',
          requiredEnvVars: {
            NEXT_PUBLIC_VAPID_PUBLIC_KEY: hasVapidPublic,
            VAPID_PRIVATE_KEY: hasVapidPrivate,
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'OK',
      message: 'Notification service is ready',
      configured: {
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: true,
        VAPID_PRIVATE_KEY: true,
      },
      endpoint: '/api/send-notification',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/send-notification
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
