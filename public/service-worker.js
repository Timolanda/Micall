/**
 * MiCall – Emergency Safe Service Worker (Production)
 * Philosophy:
 *  - NEVER cache pages or API data
 *  - ALWAYS fetch fresh network data
 *  - Cache only static assets (icons/sounds/offline page)
 *  - No precache of JS bundles
 */

const STATIC_CACHE = 'micall-static-v1';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icon-144x144.png',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

/* =========================
   INSTALL
========================= */
self.addEventListener('install', (event) => {
  console.log('🔧 SW installing');

  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );

  self.skipWaiting();
});

/* =========================
   ACTIVATE
========================= */
self.addEventListener('activate', (event) => {
  console.log('✅ SW activated');

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== STATIC_CACHE && caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

/* =========================
   FETCH
========================= */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // only same origin
  if (url.origin !== location.origin) return;

  /* =========================
     API CALLS → NETWORK ONLY
     (Supabase / alerts must NEVER cache)
  ========================= */
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  /* =========================
     STATIC ASSETS → CACHE FIRST
  ========================= */
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.wav') ||
    url.pathname.endsWith('.mp3')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request);
      })
    );
    return;
  }

  /* =========================
     PAGES → NETWORK FIRST
     (always fresh code)
  ========================= */
  event.respondWith(
    fetch(event.request)
      .then(response => response)
      .catch(() => caches.match(OFFLINE_URL))
  );
});

/* =========================
   PUSH NOTIFICATIONS
========================= */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title || 'MiCall', {
      body: data.body || 'Emergency alert',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      requireInteraction: true,
      data: data
    })
  );
});

/* =========================
   NOTIFICATION CLICK
========================= */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientsArr => {
      for (const client of clientsArr) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
