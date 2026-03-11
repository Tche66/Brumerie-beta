// api/google-auth-callback.js — Vercel
// Étape 2 : Google rappelle ici → custom token Firebase → stocké en Firestore

import admin from 'firebase-admin';

function getAdmin() {
  if (admin.apps.length > 0) return admin;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT manquant dans Vercel env vars');
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch(e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT JSON invalide: ' + e.message);
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
}

const htmlOk = (msg) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Brumerie — Connexion réussie</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#f0fdf4;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.card{background:white;border-radius:32px;padding:48px 32px;text-align:center;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.1)}
.icon{font-size:56px;margin-bottom:16px}
h2{color:#15803d;font-size:20px;font-weight:900;margin-bottom:8px}
p{color:#64748b;font-size:13px;line-height:1.6;margin-bottom:20px}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#15803d;animation:pulse 1s ease-in-out infinite}
.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
</style></head>
<body><div class="card">
<div class="icon">✅</div>
<h2>Connexion réussie !</h2>
<p>${msg}</p>
<p style="font-size:11px;color:#94a3b8">Retourne sur l'onglet Brumerie</p>
<div style="display:flex;gap:6px;justify-content:center;margin-top:16px">
<span class="dot"></span><span class="dot"></span><span class="dot"></span>
</div>
</div>
<script>setTimeout(()=>window.close(),2500)</script>
</body></html>`;

const htmlErr = (msg) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Erreur</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff1f2}
.box{background:white;border-radius:24px;padding:40px;text-align:center;max-width:320px}
h2{color:#ef4444;margin-bottom:12px;font-size:18px}p{color:#64748b;font-size:13px}</style>
</head><body><div class="box"><h2>❌ Erreur</h2><p>${msg}</p>
<p style="margin-top:12px;font-size:11px">Retourne sur Brumerie et réessaie.</p>
</div></body></html>`;

export default async function handler(req, res) {
  const { code, state, error } = req.query || {};

  const sendHtml = (html) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  };

  if (error) return sendHtml(htmlErr('Connexion Google annulée.'));
  if (!code || !state) return sendHtml(htmlErr('Paramètres manquants.'));

  try {
    const clientId     = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri  = `https://brumerie-beta.vercel.app/api/google-auth-callback`;

    if (!clientId || !clientSecret) {
      console.error('[GoogleCallback] Missing env vars:', { clientId: !!clientId, clientSecret: !!clientSecret });
      return sendHtml(htmlErr('Variables GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET manquantes dans Vercel.'));
    }

    // 1. Échanger le code OAuth contre un access_token Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error('[GoogleCallback] token error:', tokenData.error, tokenData.error_description);
      return sendHtml(htmlErr(`Erreur OAuth: ${tokenData.error} — ${tokenData.error_description || ''}. Vérifie GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans Vercel.`));
    }

    // 2. Profil Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile.id || !profile.email) return sendHtml(htmlErr('Profil Google introuvable.'));

    // 3. Firebase Admin — créer ou récupérer le user
    const fa        = getAdmin();
    const faAuth    = fa.auth();
    const firestore = fa.firestore();

    let firebaseUid;
    try {
      const existing = await faAuth.getUserByEmail(profile.email);
      firebaseUid = existing.uid;
    } catch {
      const created = await faAuth.createUser({
        email:       profile.email,
        displayName: profile.name || '',
        photoURL:    profile.picture || '',
      });
      firebaseUid = created.uid;
    }

    // 4. Créer profil Firestore si absent
    const userRef  = firestore.collection('users').doc(firebaseUid);
    const userSnap = await userRef.get();
    const isNewUser = !userSnap.exists;
    if (isNewUser) {
      await userRef.set({
        id: firebaseUid, uid: firebaseUid,
        email: profile.email, name: profile.name || '',
        phone: '', role: 'buyer', neighborhood: '',
        isVerified: false, photoURL: profile.picture || '',
        bookmarkedProductIds: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        publicationCount: 0, publicationLimit: 50,
        needsOnboarding: true,   // ← flag onboarding
        authProvider: 'google',  // ← provider tracé
      });
    } else if (!userSnap.data().neighborhood || !userSnap.data().phone) {
      // User Google existant mais onboarding incomplet
      await userRef.update({ needsOnboarding: true, authProvider: 'google' });
    }

    // 5. Firebase Custom Token
    const customToken = await faAuth.createCustomToken(firebaseUid);

    // 6. Stocker dans Firestore (TTL 3 min)
    await firestore.collection('authTokens').doc(state).set({
      token:    customToken,
      uid:      firebaseUid,
      email:    profile.email,
      name:     profile.name || '',
      photoURL: profile.picture || '',
      expiresAt: Date.now() + 3 * 60 * 1000,
    });

    return sendHtml(htmlOk(`Connecté en tant que <strong>${profile.name || profile.email}</strong>`));

  } catch (err) {
    console.error('[GoogleCallback] Error:', err?.message, err?.code, err?.stack?.slice(0,200));
    const detail = err?.message || err?.code || String(err);
    return sendHtml(htmlErr(`Erreur serveur: ${detail.slice(0,120)}`));
  }
}
