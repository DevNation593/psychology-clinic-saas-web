// Service Worker for Web Push Notifications (no app-shell/chunk caching)
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ (self);

const CACHE_PREFIX = 'psychology-clinic-';

// Install event
sw.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  // Push-only SW: do not pre-cache app routes/chunks to avoid stale chunk errors.
  event.waitUntil(Promise.resolve());
  sw.skipWaiting();
});

// Activate event
sw.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith(CACHE_PREFIX)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve(false);
        })
      );
    })
  );
  sw.clients.claim();
});

// Push event - Handle incoming push notifications
sw.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'Nueva Notificación',
    body: 'Tienes una nueva actualización',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'default',
    data: {},
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
    }
  }

  /** @type {NotificationOptions} */
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    sw.registration.showNotification(data.title, options)
  );
});

// Notification click event
sw.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (sw.clients.openWindow) {
          return sw.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync (optional - for offline actions)
sw.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-appointments') {
    event.waitUntil(
      // Sync pending appointments
      Promise.resolve()
    );
  }
});
