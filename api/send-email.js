// api/send-email.js — Vercel
// Gère TOUT l'OTP : génération, stockage en mémoire, envoi Brevo, vérification
// Aucune dépendance Firestore = aucun problème de règles Firebase

// Stockage OTP en mémoire (durée de vie de la Function instance ~15min)
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (val.expires < now) otpStore.delete(key);
  }
}

// ── RATE LIMITER simple (mémoire) ─────────────────────────────
// Limite : 5 OTP par adresse email par 10 minutes
const otpAttempts = new Map(); // email → { count, resetAt }

function checkRateLimit(email) {
  const now = Date.now();
  const key = email.toLowerCase().trim();
  const entry = otpAttempts.get(key);

  if (entry) {
    if (now < entry.resetAt) {
      if (entry.count >= 5) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
      }
      entry.count++;
    } else {
      otpAttempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    }
  } else {
    otpAttempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
  }
  return { allowed: true };
}

// Nettoyage toutes les heures pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpAttempts.entries()) {
    if (now > val.resetAt) otpAttempts.delete(key);
  }
}, 60 * 60 * 1000);

export default async function handler(req, res) {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try { body = req.body || {}; }
  catch { return res.status(400).json({ error: 'JSON invalide' }); }

  const { action } = body;

  // ── Rate limiting OTP ────────────────────────────────────
  const emailForLimit = body.email || body.newEmail || '';
  const otpActions = ['send_otp', 'send_reset_otp', 'send_change_email_otp'];
  if (emailForLimit && otpActions.includes(action)) {
    const rl = checkRateLimit(emailForLimit);
    if (!rl.allowed) {
      return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans ' + rl.retryAfter + 's.' });
    }
  }

  // ── ACTION : send_otp ─────────────────────────────────────────
  if (action === 'send_otp') {
    const { email, name } = body;
    if (!email || !name) return res.status(400).json({ error: 'email et name requis' });

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error('[OTP] BREVO_API_KEY manquante dans les variables Netlify');
      return res.status(500).json({ error: 'Configuration serveur manquante. Contacte le support.' });
    }

    cleanExpired();

    // Anti-spam : max 3 envois par email en 10 min
    const existing = otpStore.get(email.toLowerCase());
    if (existing && existing.sendCount >= 3 && existing.expires > Date.now()) {
      return res.status(429).json({ error: 'Trop de tentatives. Attends 10 minutes.' });
    }

    const code    = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000;
    otpStore.set(email.toLowerCase(), {
      code,
      expires,
      attempts:  0,
      sendCount: (existing?.sendCount || 0) + 1,
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Code de vérification Brumerie</title>
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:32px 16px">
    <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10)">
      <tr><td style="background:linear-gradient(150deg,#16A34A 0%,#0f5c2e 100%);padding:40px 32px;text-align:center">
        <div style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:20px;padding:16px 28px;margin-bottom:18px">
          <span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px;font-family:Georgia,serif">
            🛍 Brumerie
          </span>
        </div>
        <p style="color:rgba(255,255,255,0.75);font-size:11px;margin:0;text-transform:uppercase;letter-spacing:3px;font-weight:600">
          Vérification Email
        </p>
      </td></tr>
      <tr><td style="padding:40px 32px 32px">
        <h2 style="color:#0f172a;font-size:22px;font-weight:900;margin:0 0 10px;line-height:1.2">
          Bienvenue, ${name} 👋
        </h2>
        <p style="color:#64748b;font-size:14px;line-height:1.65;margin:0 0 30px">
          Ton inscription sur Brumerie est presque terminée !<br>
          Copie ce code dans l'application pour confirmer ton email.
        </p>
        <div style="background:#f8fafc;border:2px dashed #d1fae5;border-radius:20px;padding:30px 24px;text-align:center;margin:0 0 24px">
          <p style="font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:3px;margin:0 0 14px">
            Ton code de vérification
          </p>
          <div style="background:#0f172a;border-radius:16px;padding:18px 24px;display:inline-block;margin:0 0 12px">
            <span style="font-size:52px;font-weight:900;letter-spacing:0.5em;color:#ffffff;font-family:'Courier New',monospace">
              ${code}
            </span>
          </div>
          <p style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:0">
            ⏱&nbsp; Expire dans 10 minutes
          </p>
        </div>
        <div style="background:#fef2f2;border-left:4px solid #fca5a5;border-radius:0 12px 12px 0;padding:12px 16px;margin:0 0 24px">
          <p style="color:#991b1b;font-size:12px;font-weight:700;margin:0">
            🔐 &nbsp;Ne partage jamais ce code. Brumerie ne te le demandera jamais par téléphone.
          </p>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">
          Si tu n'es pas à l'origine de cette inscription, ignore ce message.
        </p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:2px solid #f0fdf4">
        <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px">
          Brumerie &bull; Le commerce de quartier &bull; Abidjan 🇨🇮
        </p>
        <p style="color:#cbd5e1;font-size:10px;margin:0">
          📬 &nbsp;Email introuvable ? Vérifie ton dossier <strong>Spam</strong> ou <strong>Courrier indésirable</strong>
        </p>
      </td></tr>
    </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method:  'POST',
        headers: {
          'accept':       'application/json',
          'api-key':      apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender:      { name: "Brumerie côte d'ivoire", email: 'contact.brumerie@gmail.com' },
          to:          [{ email, name }],
          subject:     `${code} — Ton code de vérification Brumerie`,
          htmlContent,
        }),
      });

      const data = await brevoRes.json().catch(() => ({}));

      if (!brevoRes.ok) {
        // ── Diagnostic détaillé de l'erreur Brevo ──────────────
        const brevoError = data.message || data.error || JSON.stringify(data);
        console.error(`[OTP] Brevo a refusé l'envoi vers ${email}`);
        console.error(`[OTP] Status: ${brevoRes.status} | Erreur: ${brevoError}`);
        console.error(`[OTP] Sender: ${process.env.BREVO_SENDER_EMAIL || 'non configuré'}`);
        console.error(`[OTP] Clé API (premiers chars): ${apiKey.substring(0, 12)}...`);

        // Diagnostic de la cause probable
        let hint = '';
        if (brevoRes.status === 401) hint = 'Clé API Brevo invalide ou révoquée';
        if (brevoRes.status === 400 && brevoError.includes('sender')) hint = 'Email sender non vérifié dans Brevo';
        if (brevoRes.status === 403) hint = 'Compte Brevo suspendu ou quota dépassé';
        console.error(`[OTP] Cause probable: ${hint || 'Voir détail ci-dessus'}`);

        return res.status(502).json({ error: 'Erreur envoi email', detail: brevoError, hint, status: brevoRes.status });
      }

      console.log(`[OTP] ✅ Code envoyé à ${email} — messageId: ${data.messageId}`);
      return res.status(200).json({ success: true });

    } catch (err) {
      console.error('[OTP] Erreur réseau Brevo:', err.message);
      return res.status(500).json({ error: 'Erreur réseau lors de l\'envoi' });
    }
  }

  // ── ACTION : verify_otp ───────────────────────────────────────
  if (action === 'verify_otp') {
    const { email, code } = body;
    if (!email || !code) return res.status(400).json({ error: 'email et code requis' });

    const entry = otpStore.get(email.toLowerCase());

    if (!entry) return res.status(200).json({ result: 'invalid' });
    if (entry.expires < Date.now()) {
      otpStore.delete(email.toLowerCase());
      return res.status(200).json({ result: 'expired' });
    }

    entry.attempts = (entry.attempts || 0) + 1;
    if (entry.attempts > 5) {
      otpStore.delete(email.toLowerCase());
      return res.status(200).json({ result: 'invalid', reason: 'too_many_attempts' });
    }

    if (entry.code !== code.trim()) return res.status(200).json({ result: 'invalid' });

    otpStore.delete(email.toLowerCase());
    return res.status(200).json({ result: 'valid' });
  }

  // ── ACTION : welcome ──────────────────────────────────────────
  if (action === 'welcome') {
    const { email, name } = body;
    if (!email || !process.env.BREVO_API_KEY) return res.status(200).json({ skipped: true });

    const htmlWelcome = `
<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
<tr><td align="center"><table width="100%" style="max-width:480px;background:#fff;border-radius:24px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#16A34A,#115E2E);padding:40px;text-align:center">
  <h1 style="color:#fff;font-size:26px;font-weight:900;margin:0">🎉 Bienvenue sur Brumerie !</h1>
</td></tr>
<tr><td style="padding:40px">
  <p style="color:#0f172a;font-size:16px;font-weight:700;margin:0 0 12px">Salut ${name || ''} 👋</p>
  <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px">
    Ton compte est créé et vérifié. Explore les articles près de chez toi, achète, vends et rejoins la communauté Brumerie d'Abidjan !
  </p>
  <a href="https://brumerie.com" style="display:inline-block;background:linear-gradient(135deg,#115E2E,#16A34A);color:#fff;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:1px;padding:16px 32px;border-radius:16px;text-decoration:none">
    Ouvrir Brumerie →
  </a>
</td></tr>
<tr><td style="padding:20px;text-align:center;background:#f8fafc;border-top:1px solid #f1f5f9">
  <p style="color:#cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0">Brumerie · Abidjan 🇨🇮</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

    fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: "Brumerie côte d'ivoire", email: 'contact.brumerie@gmail.com' },
        to: [{ email, name: name || email }],
        subject: `Bienvenue sur Brumerie, ${name || ''} 🎉`,
        htmlContent: htmlWelcome,
      }),
    }).catch(console.warn);

    return res.status(200).json({ success: true });
  }


  // ── ACTION : reset_password_send ─────────────────────────────
  // Envoie un OTP de réinitialisation de mot de passe via Brevo
  if (action === 'reset_password_send') {
    const { email } = body;
    if (!email) return res.status(400).json({ error: 'email requis' });

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Configuration serveur manquante' });

    cleanExpired();

    // Anti-spam
    const resetKey = 'reset_' + email.toLowerCase();
    const existing = otpStore.get(resetKey);
    if (existing && existing.sendCount >= 3 && existing.expires > Date.now()) {
      return res.status(429).json({ error: 'Trop de tentatives. Attends 10 minutes.' });
    }

    const code    = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 min
    otpStore.set(resetKey, { code, expires, attempts: 0, sendCount: (existing?.sendCount || 0) + 1 });

    const htmlReset = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
    <table width="100%" style="max-width:520px;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10)">
      <tr><td style="background:linear-gradient(150deg,#D97706 0%,#92400E 100%);padding:36px 32px;text-align:center">
        <div style="font-size:26px;font-weight:900;color:#fff;margin-bottom:8px">🔐 Brumerie</div>
        <p style="color:rgba(255,255,255,0.80);font-size:11px;margin:0;text-transform:uppercase;letter-spacing:3px">Réinitialisation du mot de passe</p>
      </td></tr>
      <tr><td style="padding:40px 32px">
        <h2 style="color:#0f172a;font-size:20px;font-weight:900;margin:0 0 12px">Tu as demandé un nouveau mot de passe ?</h2>
        <p style="color:#64748b;font-size:14px;line-height:1.65;margin:0 0 28px">
          Copie ce code dans l'application Brumerie pour définir ton nouveau mot de passe.
        </p>
        <div style="background:#fff7ed;border:2px dashed #fed7aa;border-radius:20px;padding:28px;text-align:center;margin:0 0 24px">
          <p style="font-size:12px;color:#92400E;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin:0 0 14px">Code de réinitialisation</p>
          <div style="background:#0f172a;border-radius:14px;padding:16px 24px;display:inline-block">
            <span style="font-size:48px;font-weight:900;letter-spacing:0.5em;color:#FCD34D;font-family:'Courier New',monospace">${code}</span>
          </div>
          <p style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:14px 0 0">⏱ Expire dans 10 minutes</p>
        </div>
        <div style="background:#fef2f2;border-left:4px solid #fca5a5;border-radius:0 12px 12px 0;padding:12px 16px">
          <p style="color:#991b1b;font-size:12px;font-weight:700;margin:0">🔐 Si ce n'est pas toi, ignore ce message. Ton mot de passe actuel reste inchangé.</p>
        </div>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:18px 32px;text-align:center;border-top:2px solid #fff7ed">
        <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0">Brumerie · Abidjan 🇨🇮</p>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`;

    try {
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender:      { name: "Brumerie côte d'ivoire", email: 'contact.brumerie@gmail.com' },
          to:          [{ email }],
          subject:     `${code} — Réinitialisation de ton mot de passe Brumerie`,
          htmlContent: htmlReset,
        }),
      });

      if (!brevoRes.ok) {
        const data = await brevoRes.json().catch(() => ({}));
        return res.status(502).json({ error: 'Erreur envoi email', detail: data.message });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erreur réseau' });
    }
  }

  // ── ACTION : reset_password_verify ───────────────────────────
  // Vérifie l'OTP et retourne un token signé permettant de changer le mot de passe
  if (action === 'reset_password_verify') {
    const { email, code } = body;
    if (!email || !code) return res.status(400).json({ error: 'email et code requis' });

    const resetKey = 'reset_' + email.toLowerCase();
    const entry    = otpStore.get(resetKey);

    if (!entry) return res.status(200).json({ result: 'invalid' });
    if (entry.expires < Date.now()) {
      otpStore.delete(resetKey);
      return res.status(200).json({ result: 'expired' });
    }

    entry.attempts = (entry.attempts || 0) + 1;
    if (entry.attempts > 5) {
      otpStore.delete(resetKey);
      return res.status(200).json({ result: 'invalid', reason: 'too_many_attempts' });
    }

    if (entry.code !== code.trim()) {
      return res.status(200).json({ result: 'invalid' });
    }

    otpStore.delete(resetKey);

    // OTP valide — générer un resetToken temporaire (valable 5 min)
    // Ce token sera utilisé côté client pour confirmer le changement
    const resetToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const tokenExpiry = Date.now() + 5 * 60 * 1000;
    otpStore.set('rtoken_' + email.toLowerCase(), { token: resetToken, expires: tokenExpiry });

    return res.status(200).json({ result: 'valid', resetToken, email });
  }

  // ── ACTION : reset_password_change ───────────────────────────
  // Valide le resetToken + change le mot de passe Firebase via Admin SDK
  if (action === 'reset_password_change') {
    const { email, resetToken, newPassword } = body;
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });
    }

    // Vérifier le resetToken
    const tokenKey   = 'rtoken_' + email.toLowerCase();
    const tokenEntry = otpStore.get(tokenKey);
    if (!tokenEntry || tokenEntry.token !== resetToken || tokenEntry.expires < Date.now()) {
      return res.status(200).json({ result: 'invalid', error: 'Token expiré ou invalide' });
    }
    otpStore.delete(tokenKey);

    // Firebase Admin SDK pour changer le mot de passe
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      // Fallback : renvoyer un lien de reset Firebase standard si pas d'Admin SDK configuré
      return res.status(200).json({ result: 'needs_firebase_reset', email, message: 'Admin SDK non configuré. Configure FIREBASE_SERVICE_ACCOUNT dans Vercel.' });
    }

    try {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      }

      // Trouver l'utilisateur par email
      const userRecord = await admin.auth().getUserByEmail(email);
      // Changer le mot de passe
      await admin.auth().updateUser(userRecord.uid, { password: newPassword });

      return res.status(200).json({ result: 'success' });
    } catch (err) {
      console.error('[RESET] Erreur Firebase Admin:', err.message);
      if (err.code === 'auth/user-not-found') {
        return res.status(200).json({ result: 'invalid', error: 'Aucun compte avec cet email' });
      }
      return res.status(500).json({ result: 'error', error: err.message });
    }
  }


  // ── ACTION : change_email_verify_password ────────────────────
  // Étape 1 : vérifie le mot de passe actuel via Firebase Admin
  if (action === 'change_email_verify_password') {
    const { email, password } = body;
    if (!email || !password) return res.status(400).json({ error: 'email et password requis' });

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      return res.status(200).json({ result: 'needs_setup',
        error: 'FIREBASE_SERVICE_ACCOUNT non configuré dans Netlify' });
    }

    try {
      // Vérifier le mot de passe via Firebase REST API (sign-in)
      const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'FIREBASE_API_KEY manquant' });

      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: false }) }
      );
      const signInData = await signInRes.json();
      if (!signInRes.ok || signInData.error) {
        return res.status(200).json({ result: 'wrong_password' });
      }

      return res.status(200).json({ result: 'valid' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── ACTION : change_email_send_otp ───────────────────────────
  // Étape 2 : envoie OTP au NOUVEL email pour le vérifier
  if (action === 'change_email_send_otp') {
    const { newEmail, currentEmail } = body;
    if (!newEmail || !currentEmail) return res.status(400).json({ error: 'newEmail et currentEmail requis' });

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'BREVO_API_KEY manquant' });

    cleanExpired();
    const key = 'emailchange_' + newEmail.toLowerCase();
    const existing = otpStore.get(key);
    if (existing && existing.sendCount >= 3 && existing.expires > Date.now()) {
      return res.status(429).json({ error: 'Trop de tentatives. Attends 10 minutes.' });
    }

    const code    = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000;
    otpStore.set(key, { code, expires, attempts: 0, sendCount: (existing?.sendCount || 0) + 1, currentEmail });

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
  <table width="100%" style="max-width:520px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.10)">
    <tr><td style="background:linear-gradient(150deg,#2563EB,#1D4ED8);padding:36px 32px;text-align:center">
      <div style="font-size:26px;font-weight:900;color:#fff;margin-bottom:8px">✉️ Brumerie</div>
      <p style="color:rgba(255,255,255,.80);font-size:11px;margin:0;text-transform:uppercase;letter-spacing:3px">Vérification du nouvel email</p>
    </td></tr>
    <tr><td style="padding:40px 32px">
      <h2 style="color:#0f172a;font-size:20px;font-weight:900;margin:0 0 10px">Confirme ton nouvel email</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.65;margin:0 0 28px">
        Tu as demandé à changer l'email de ton compte Brumerie vers cette adresse.<br>
        Saisis ce code pour confirmer.
      </p>
      <div style="background:#eff6ff;border:2px dashed #bfdbfe;border-radius:20px;padding:28px;text-align:center;margin:0 0 24px">
        <p style="font-size:12px;color:#1D4ED8;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin:0 0 14px">Code de vérification</p>
        <div style="background:#0f172a;border-radius:14px;padding:16px 24px;display:inline-block">
          <span style="font-size:48px;font-weight:900;letter-spacing:0.5em;color:#60A5FA;font-family:'Courier New',monospace">${code}</span>
        </div>
        <p style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:14px 0 0">⏱ Expire dans 10 minutes</p>
      </div>
      <div style="background:#fef2f2;border-left:4px solid #fca5a5;border-radius:0 12px 12px 0;padding:12px 16px">
        <p style="color:#991b1b;font-size:12px;font-weight:700;margin:0">🔐 Si tu n'as pas fait cette demande, ignore ce message. Ton compte reste intact.</p>
      </div>
    </td></tr>
    <tr><td style="background:#f8fafc;padding:18px 32px;text-align:center;border-top:2px solid #eff6ff">
      <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0">Brumerie · Abidjan 🇨🇮</p>
    </td></tr>
  </table></td></tr></table>
</body></html>`;

    try {
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: { name: "Brumerie côte d'ivoire", email: 'contact.brumerie@gmail.com' },
          to: [{ email: newEmail }],
          subject: `${code} — Confirme ton nouvel email Brumerie`,
          htmlContent: html,
        }),
      });
      if (!brevoRes.ok) {
        const d = await brevoRes.json().catch(() => ({}));
        return res.status(502).json({ error: d.message || 'Erreur envoi email' });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erreur réseau' });
    }
  }

  // ── ACTION : change_email_apply ───────────────────────────────
  // Étape 3 : vérifie OTP + change l'email dans Firebase Auth + Firestore
  if (action === 'change_email_apply') {
    const { newEmail, code, uid } = body;
    if (!newEmail || !code || !uid) return res.status(400).json({ error: 'newEmail, code et uid requis' });

    const key   = 'emailchange_' + newEmail.toLowerCase();
    const entry = otpStore.get(key);

    if (!entry) return res.status(200).json({ result: 'invalid' });
    if (entry.expires < Date.now()) { otpStore.delete(key); return res.status(200).json({ result: 'expired' }); }

    entry.attempts = (entry.attempts || 0) + 1;
    if (entry.attempts > 5) { otpStore.delete(key); return res.status(200).json({ result: 'invalid', reason: 'too_many_attempts' }); }
    if (entry.code !== code.trim()) return res.status(200).json({ result: 'invalid' });

    otpStore.delete(key);

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      return res.status(200).json({ result: 'needs_setup' });
    }

    try {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(JSON.parse(serviceAccountJson)) });
      }

      // Vérifier que le nouvel email n'est pas déjà utilisé
      try {
        await admin.auth().getUserByEmail(newEmail);
        return res.status(200).json({ result: 'email_taken', error: 'Cet email est déjà utilisé par un autre compte' });
      } catch (notFound) {
        if (notFound.code !== 'auth/user-not-found') throw notFound;
        // Email libre — on peut continuer
      }

      // Changer l'email dans Firebase Auth
      await admin.auth().updateUser(uid, {
        email: newEmail,
        emailVerified: true, // évite l'email de révocation Firebase
      });

      // Mettre à jour dans Firestore aussi
      const { getFirestore } = require('firebase-admin/firestore');
      const adminDb = getFirestore();
      await adminDb.collection('users').doc(uid).update({ email: newEmail });

      return res.status(200).json({ result: 'success' });
    } catch (err) {
      console.error('[CHANGE_EMAIL] Erreur:', err.message);
      return res.status(500).json({ result: 'error', error: err.message });
    }
  }

  // ── ACTION : admin_change_email ───────────────────────────────
  // Admin change l'email d'un user sans mot de passe (accès admin direct)
  if (action === 'admin_change_email') {
    const { targetUid, newEmail, adminToken } = body;
    if (!targetUid || !newEmail) return res.status(400).json({ error: 'targetUid et newEmail requis' });
    if (!adminToken) return res.status(401).json({ error: 'Token admin requis' });

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) return res.status(200).json({ result: 'needs_setup' });

    try {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(JSON.parse(serviceAccountJson)) });
      }

      // Vérifier que le appelant est bien l'admin via son Firebase ID Token
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(adminToken);
      } catch (tokenErr) {
        return res.status(401).json({ error: 'Token admin invalide ou expiré' });
      }
      const adminUidEnv = process.env.ADMIN_UID || process.env.VITE_ADMIN_UID;
      if (!adminUidEnv || decodedToken.uid !== adminUidEnv) {
        return res.status(403).json({ error: 'Accès refusé — non admin' });
      }

      // Vérifier que le nouvel email n'est pas pris
      try {
        await admin.auth().getUserByEmail(newEmail);
        return res.status(200).json({ result: 'email_taken' });
      } catch (notFound) {
        if (notFound.code !== 'auth/user-not-found') throw notFound;
      }

      await admin.auth().updateUser(targetUid, { email: newEmail, emailVerified: true });
      const { getFirestore } = require('firebase-admin/firestore');
      await getFirestore().collection('users').doc(targetUid).update({ email: newEmail });

      return res.status(200).json({ result: 'success' });
    } catch (err) {
      return res.status(500).json({ result: 'error', error: err.message });
    }
  }

  return res.status(400).json({ error: `Action inconnue: ${action}` });
}