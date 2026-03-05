// sw.js — Service Worker Brumerie avec Push Notifications
const CACHE_NAME = 'brumerie-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ).then(() => clients.claim())
));

// Fetch — laisser passer normalement
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

// ── Push notification reçue ───────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Brumerie', body: event.data.text() }; }

  const { title = 'Brumerie', body = '', type = 'message', conversationId, productId } = data;

  const icons = {
    message:  '/favicon.png',
    reply:    '/favicon.png',
    favorite: '/favicon.png',
    system:   '/favicon.png',
  };

  const options = {
    body,
    icon: icons[type] || '/favicon.png',
    badge: '/favicon.png',
    tag: conversationId || productId || 'brumerie-notif',
    renotify: true,
    requireInteraction: false,
    vibrate: [100, 50, 100],
    data: { conversationId, productId, type, url: self.registration.scope },
    actions: type === 'message' || type === 'reply'
      ? [{ action: 'open_chat', title: 'Voir le message' }]
      : [{ action: 'open_app', title: 'Ouvrir Brumerie' }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Clic sur notification push ────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { conversationId, url } = event.notification.data || {};

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Si l'app est déjà ouverte → focus + navigate
      for (const client of clientList) {
        if (client.url.startsWith(url) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', conversationId });
          return;
        }
      }
      // Sinon ouvrir un nouvel onglet
      if (clients.openWindow) {
        return clients.openWindow(url + (conversationId ? `#conv-${conversationId}` : ''));
      }
    })
  );
});
