// sw.js — Service Worker Brumerie v18
// Push notifications avec icône + badge Brumerie + channelId Android
const CACHE_NAME = 'brumerie-v4';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ).then(() => clients.claim())
));

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

// ── Mapping type → channel Android + icône + action ──────────
const NOTIF_CONFIG = {
  message:      { channel: 'brumerie_message',      icon: '/notif-icon.png', action: 'Voir le message',  sound: 'notif_message' },
  commande:     { channel: 'brumerie_commande',      icon: '/notif-icon.png', action: 'Voir la commande', sound: 'notif_commande' },
  confirmation: { channel: 'brumerie_confirmation',  icon: '/notif-icon.png', action: 'Voir le détail',   sound: 'notif_confirmation' },
  livraison:    { channel: 'brumerie_livraison',     icon: '/notif-icon.png', action: 'Voir la livraison',sound: 'notif_livraison' },
  offre:        { channel: 'brumerie_offre',         icon: '/notif-icon.png', action: 'Voir l\'offre',    sound: 'notif_offre' },
  note:         { channel: 'brumerie_note',          icon: '/notif-icon.png', action: 'Voir l\'avis',     sound: 'notif_note' },
  publication:  { channel: 'brumerie_publication',   icon: '/notif-icon.png', action: 'Voir le produit',  sound: 'notif_publication' },
  alerte:       { channel: 'brumerie_alerte',        icon: '/notif-icon.png', action: 'Voir l\'alerte',   sound: 'notif_alerte' },
  story:        { channel: 'brumerie_story',         icon: '/notif-icon.png', action: 'Voir la story',    sound: 'notif_story' },
  general:      { channel: 'brumerie_general',       icon: '/notif-icon.png', action: 'Ouvrir Brumerie',  sound: 'notif_general' },
};

// ── Push notification reçue ───────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Brumerie', body: event.data.text() }; }

  const {
    title = 'Brumerie',
    body = '',
    type = 'general',
    conversationId,
    productId,
    orderId,
    image,        // image optionnelle dans la notif
  } = data;

  const cfg = NOTIF_CONFIG[type] || NOTIF_CONFIG.general;

  const options = {
    body,
    icon:  cfg.icon,
    badge: '/notif-badge.png',
    image: image || undefined,           // grande image si fournie
    tag:   conversationId || orderId || productId || 'brumerie-notif',
    renotify:           true,
    requireInteraction: type === 'commande' || type === 'livraison',
    silent: false,
    vibrate: type === 'commande' ? [300, 100, 300, 100, 300] : [150, 50, 150],
    // channelId Android (ignoré sur web, utilisé par Capacitor/FCM natif)
    android: { channelId: cfg.channel },
    data: {
      conversationId,
      productId,
      orderId,
      type,
      url: self.registration.scope,
    },
    actions: [
      { action: 'open', title: cfg.action },
      { action: 'dismiss', title: 'Ignorer' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Clic sur notification ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const { conversationId, orderId, productId, url } = event.notification.data || {};

  let target = url || '/';
  if (conversationId) target += `#conv-${conversationId}`;
  else if (orderId)   target += `#order-${orderId}`;
  else if (productId) target += `#product-${productId}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.startsWith(url || '') && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', conversationId, orderId, productId });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
