// api/aw-auth.js — Bridge Brumerie (Firebase) → Address-Web (Supabase)
// Crée ou retrouve un compte Supabase depuis un utilisateur Firebase

const SUPABASE_URL     = process.env.SUPABASE_URL     || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'https://brumerie.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non supportée' });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant' });
  }

  const { uid, email } = req.body || {};
  if (!uid || !email) {
    return res.status(400).json({ error: 'uid et email requis' });
  }

  // Headers Supabase Admin — apikey + Authorization requis
  const headers = {
    'apikey':        SUPABASE_ANON_KEY || SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type':  'application/json',
  };

  try {
    // 1. Tenter de créer le compte directement
    // Si email existe déjà → Supabase retourne une erreur qu'on récupère pour faire la recherche
    let supabaseUserId;

    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        email_confirm: true,
        password: `${uid}_brumerie_${Math.random().toString(36).slice(2)}`,
        user_metadata: { brumerie_uid: uid, source: 'brumerie' },
      }),
    });

    const createText = await createRes.text();
    console.log('[AW Auth] Create status:', createRes.status, createText.substring(0, 200));
    
    let created;
    try { created = JSON.parse(createText); } catch { created = {}; }

    if (created.id) {
      // Compte créé avec succès
      supabaseUserId = created.id;
      console.log('[AW Auth] Nouveau compte créé:', supabaseUserId);
    } else {
      // Compte existe déjà → chercher par listing (page 1, filtrer par email)
      console.log('[AW Auth] Compte existant — recherche dans la liste');
      
      // Supabase Admin: lister les utilisateurs et filtrer
      const listRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`,
        { headers }
      );
      const listText = await listRes.text();
      let listData;
      try { listData = JSON.parse(listText); } catch { listData = {}; }
      
      console.log('[AW Auth] List status:', listRes.status);
      
      const users = listData.users || [];
      const found = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      
      if (found?.id) {
        supabaseUserId = found.id;
        console.log('[AW Auth] Compte existant trouvé:', supabaseUserId);
      } else {
        throw new Error(`Impossible de trouver ou créer le compte pour: ${email}`);
      }
    }

    // 2. Générer un magic link (optionnel — ne bloque pas si ça échoue)
    let magicLink = null;
    try {
      const linkRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/generateLink`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: 'magiclink', email }),
        }
      );
      const linkText = await linkRes.text();
      console.log('[AW Auth] Magic link status:', linkRes.status, linkText.substring(0, 100));
      try {
        const linkData = JSON.parse(linkText);
        magicLink = linkData.action_link || linkData.hashed_token || null;
      } catch { /* pas de magic link — non bloquant */ }
    } catch (linkErr) {
      console.log('[AW Auth] Magic link skipped:', linkErr.message);
    }

    // Retourner supabaseUserId même sans magic link
    // C'est la clé — aw-address peut créer l'adresse au bon nom
    return res.status(200).json({
      supabaseUserId,
      magicLink,
    });

  } catch (err) {
    console.error('[AW Auth] Exception:', err.message);
    // Retourner quand même le fallback — mais PAS de supabaseUserId
    // Le proxy aw-address utilisera BRUMERIE_USER_ID comme fallback
    return res.status(200).json({
      supabaseUserId: null,
      magicLink:      null,
      error:          err.message,
    });
  }
}
