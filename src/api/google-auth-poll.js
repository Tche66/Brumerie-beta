// api/google-auth-poll.js — Vercel
// L'app interroge cette fonction toutes les secondes pour récupérer le custom token

import admin from 'firebase-admin';

function getAdmin() {
  if (admin.apps.length > 0) return admin;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const state = req.query?.state;
  if (!state) return res.status(400).json({ error: 'Missing state' });

  try {
    const firestore = getAdmin().firestore();
    const docRef    = firestore.collection('authTokens').doc(state);
    const snap      = await docRef.get();

    if (!snap.exists) {
      // Pas encore prêt → continuer à poller
      return res.status(202).json({ status: 'pending' });
    }

    const data = snap.data();

    if (data.expiresAt < Date.now()) {
      await docRef.delete();
      return res.status(410).json({ error: 'expired' });
    }

    // Token trouvé → retourner + supprimer (usage unique)
    await docRef.delete();

    return res.status(200).json({
      status:   'ready',
      token:    data.token,
      uid:      data.uid,
      email:    data.email,
      name:     data.name,
      photoURL: data.photoURL,
    });

  } catch (err) {
    console.error('[GooglePoll] Error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
