/**
 * MiCall Service Worker - Improved Version
 * Handles offline support, background sync, and push notifications
 * Fixed: No more null responses, proper offline detection
 */

const CACHE_NAME = 'micall-v1';
const RUNTIME_CACHE = 'micall-runtime-v1';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error('Cache add error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log(`🗑️ Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - improved offline detection
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Only handle same-origin requests
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first strategy for API routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache on network error
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('📦 Using cached API response:', event.request.url);
              return cachedResponse;
            }
            // Return a proper error response instead of null/undefined
            return new Response(
              JSON.stringify({
                error: 'You are currently offline. Please check your internet connection.',
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // Cache-first strategy for static assets and pages
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('📦 Using cached asset:', event.request.url);
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Validate response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Cache successful responses
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Fall back to cached version
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }

            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL).then((offlineResponse) => {
                return offlineResponse || new Response('Offline', { status: 503 });
              });
            }

            // Return error response for other requests
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
        });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const {
      title = 'MiCall',
      body = 'New emergency alert',
      icon = '/icons/icon-192.png',
      badge = '/icons/badge-72.png',
      tag = 'micall-notification',
      data: notificationData = {},
      actions = [],
    } = data;

    const options = {
      body,
      icon,
      badge,
      tag,
      requireInteraction: true, // Keep notification visible until user interacts
      data: notificationData,
      actions: [
        {
          action: 'respond',
          title: 'Respond',
          icon: '/icons/action-respond.png',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/action-dismiss.png',
        },
        ...actions,
      ],
      // Vibration pattern for urgent alerts
      vibrate: [200, 100, 200],
      // Sound notification
      sound: '/sounds/alert.mp3',
      // Badge for app icon
      badge: '/icons/badge-72.png',
      // Priority
      priority: 'high',
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error('Push notification error:', error);
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('MiCall', {
        body: 'New emergency alert',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: 'micall-notification',
        requireInteraction: true,
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  let clientUrl = '/';

  // Determine URL based on notification action and type
  if (event.action === 'respond') {
    clientUrl = '/responder';
  } else if (event.action === 'dismiss') {
    return;
  } else if (notificationData.emergency_id) {
    clientUrl = `/?alert_id=${notificationData.emergency_id}`;
  } else if (notificationData.url) {
    clientUrl = notificationData.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if app is already open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === clientUrl && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window if app not open
      if (clients.openWindow) {
        return clients.openWindow(clientUrl);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  const notificationData = event.notification.data || {};

  // Track notification dismissal if needed
  if (notificationData.notification_id) {
    // Could send dismissal analytics here
    console.log('Notification dismissed:', notificationData.notification_id);
  }
});

// Background sync for emergency alerts
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-alerts') {
    event.waitUntil(syncEmergencyAlerts());
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-alerts') {
    event.waitUntil(checkForAlerts());
  }
});

// Helper functions
async function syncEmergencyAlerts() {
  try {
    // Sync any pending emergency alerts
    const response = await fetch('/api/sync-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch (error) {
    console.error('Alert sync error:', error);
    throw error;
  }
}

async function checkForAlerts() {
  try {
    // Periodically check for new alerts
    const response = await fetch('/api/check-alerts');
    const data = await response.json();

    if (data.alerts && data.alerts.length > 0) {
      // Send notification for new alerts
      data.alerts.forEach((alert) => {
        self.registration.showNotification('MiCall - New Emergency', {
          body: alert.description || 'New emergency alert nearby',
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          tag: `alert-${alert.id}`,
          data: { emergency_id: alert.id },
          requireInteraction: true,
        });
      });
    }
  } catch (error) {
    console.error('Alert check error:', error);
  }
}

// Message handler for client communication
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'GET_NOTIFICATION_COUNT') {
    // Return notification count to client
    event.ports[0].postMessage({ count: 0 });
  }
});
