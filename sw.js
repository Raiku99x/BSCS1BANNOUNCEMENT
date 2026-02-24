// ============================================================
//  BSCS1B TaskHub — sw.js
//  Service Worker: handles push events + notification clicks
// ============================================================

const CACHE_NAME = 'taskhub-sw-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// ─── PUSH EVENT ──────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'BSCS1B TaskHub', body: event.data.text() };
  }

  const title   = data.title  || 'BSCS1B TaskHub';
  const options = {
    body:              data.body    || '',
    icon:              data.icon    || '/icon-192.png',
    badge:             data.badge   || '/badge-72.png',
    tag:               data.tag     || 'taskhub-general',
    data:              { url: data.url || '/' },
    requireInteraction: data.requireInteraction || false,
    vibrate:           [200, 100, 200],
    silent:            false,
    renotify:          true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ─── NOTIFICATION CLICK ──────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

// ─── NOTIFICATION CLOSE ──────────────────────────────────────
self.addEventListener('notificationclose', () => {
  // Optional: analytics/logging
});
