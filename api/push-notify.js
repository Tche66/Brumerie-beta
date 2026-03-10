// api/push-notify.js — Format Vercel Serverless Function
// Envoi notifications push PWA via Web Push Protocol

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, subscription, payload } = req.body || {};

    if (action === 'send') {
      if (!subscription || !payload) {
        return res.status(400).json({ error: 'subscription et payload requis' });
      }

      const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY;
      const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
      const vapidEmail      = process.env.VAPID_EMAIL || 'mailto:contact.brumerie@gmail.com';

      if (!vapidPublicKey || !vapidPrivateKey) {
        return res.status(500).json({ error: 'VAPID keys manquantes' });
      }

      const webpush = await import('web-push');
      webpush.default.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey);

      await webpush.default.sendNotification(subscription, JSON.stringify(payload));
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Action inconnue' });

  } catch (err) {
    console.error('[push-notify] Error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
