// api/google-auth-start.js — Vercel
// Étape 1 : redirige vers Google OAuth avec le state

export default async function handler(req, res) {
  const state = req.query?.state;
  if (!state) {
    return res.status(400).json({ error: 'Missing state parameter' });
  }

  const clientId    = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `https://brumerie-beta.vercel.app/api/google-auth-callback`;

  if (!clientId) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID manquant' });
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'openid email profile',
    state:         state,
    prompt:        'select_account',
    access_type:   'online',
  });

  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
