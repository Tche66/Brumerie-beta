// api/aw-auth.js — Bridge Brumerie (Firebase) → Address-Web (Supabase)
// Crée ou retrouve un compte Supabase depuis un utilisateur Firebase
// La clé Supabase service_role ne quitte jamais le serveur

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://brumerie.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non supportée' });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant' });
  }

  const { uid, email } = req.body || {};
  if (!uid || !email) {
    return res.status(400).json({ error: 'uid et email requis' });
  }

  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. Chercher si le compte Supabase existe déjà
    const searchRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers }
    );
    const searchData = await searchRes.json();

    let supabaseUserId;

    if (searchData.users?.length > 0) {
      // Compte existant → récupérer l'ID
      supabaseUserId = searchData.users[0].id;
    } else {
      // Créer le compte Supabase automatiquement
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          email_confirm: true,
          password: `${uid}_brumerie_${Math.random().toString(36).slice(2)}`,
          user_metadata: {
            brumerie_uid: uid,
            source: 'brumerie',
          },
        }),
      });
      const created = await createRes.json();
      if (!created.id) throw new Error('Impossible de créer le compte Address-Web');
      supabaseUserId = created.id;
    }

    // 2. Générer un magic link de connexion automatique
    const linkRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${supabaseUserId}/magiclink`,
      { method: 'POST', headers }
    );
    const linkData = await linkRes.json();

    if (!linkData.action_link) {
      throw new Error('Impossible de générer le lien de connexion');
    }

    return res.status(200).json({
      magicLink: linkData.action_link,
      supabaseUserId,
    });

  } catch (err) {
    console.error('[AW Auth]', err.message);
    // Fallback — ouvrir Address-Web sans connexion auto
    return res.status(200).json({
      magicLink: null,
      fallback: `${process.env.APP_DOMAIN || 'https://addressweb.brumerie.com'}`,
    });
  }
};
