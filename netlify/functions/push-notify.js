// netlify/functions/push-notify.js
// Envoi de notifications push PWA via Web Push Protocol
// Nécessite : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL dans env Netlify

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Store en mémoire des subscriptions (remplacer par Firestore en prod) ──
// En prod, les subscriptions sont stockées dans Firestore via le frontend
// Cette function reçoit la subscription + le payload et envoie la notif

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { action, subscription, payload } = JSON.parse(event.body || '{}');

    // Action : envoyer une notification à une subscription
    if (action === 'send') {
      if (!subscription || !payload) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'subscription et payload requis' }) };
      }

      const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY;
      const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
      const vapidEmail      = process.env.VAPID_EMAIL || 'mailto:contact.brumerie@gmail.com';

      if (!vapidPublicKey || !vapidPrivateKey) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clés VAPID manquantes' }) };
      }

      // Utiliser web-push via require (installé dans node_modules)
      let webpush;
      try {
        webpush = require('web-push');
      } catch {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'web-push non installé. Ajoute web-push dans package.json' }) };
      }

      webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

      const notifPayload = JSON.stringify({
        title: payload.title || 'Brumerie 🛍',
        body:  payload.body  || 'Nouveau message',
        icon:  '/assets/Logos/logo-app-icon.png',
        badge: '/assets/Logos/logo-app-icon.png',
        data:  { url: payload.url || '/', productId: payload.productId },
      });

      await webpush.sendNotification(subscription, notifPayload);
      return { statusCode: 200, headers, body: JSON.stringify({ sent: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Action inconnue' }) };

  } catch (err) {
    console.error('[Push] Erreur:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
