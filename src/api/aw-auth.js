// api/aw-auth.js — Bridge Brumerie (Firebase) → Address-Web (Supabase)
// Utilise la table brumerie_users pour stocker/retrouver le supabaseUserId
// sans avoir besoin de lister tous les users Supabase

const SUPABASE_URL      = process.env.SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SERVICE_KEY       = process.env.SUPABASE_SERVICE_KEY || '';

const headers = {
  'apikey':        SUPABASE_ANON_KEY || SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'https://brumerie.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non supportée' });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Variables Vercel manquantes' });
  }

  const { uid, email } = req.body || {};
  if (!uid || !email) {
    return res.status(400).json({ error: 'uid et email requis' });
  }

  try {
    // ── Étape 1 : chercher dans brumerie_users (notre cache) ──────
    const cacheRes = await fetch(
      `${SUPABASE_URL}/rest/v1/brumerie_users?brumerie_uid=eq.${encodeURIComponent(uid)}&select=supabase_id`,
      { headers }
    );
    const cacheText = await cacheRes.text();
    console.log('[AW Auth] Cache lookup status:', cacheRes.status);

    let supabaseUserId = null;

    if (cacheRes.ok) {
      let cacheData;
      try { cacheData = JSON.parse(cacheText); } catch { cacheData = []; }
      if (Array.isArray(cacheData) && cacheData.length > 0) {
        supabaseUserId = cacheData[0].supabase_id;
        console.log('[AW Auth] Trouvé dans cache:', supabaseUserId);
      }
    }

    // ── Étape 2 : pas dans le cache → créer le compte Supabase ───
    if (!supabaseUserId) {
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
      console.log('[AW Auth] Create status:', createRes.status, createText.substring(0, 150));

      let created;
      try { created = JSON.parse(createText); } catch { created = {}; }

      if (created.id) {
        supabaseUserId = created.id;
        console.log('[AW Auth] Nouveau compte créé:', supabaseUserId);
      } else if (created.error_code === 'email_exists') {
        // Email déjà enregistré mais pas dans notre cache
        // → le dev AW doit avoir créé ce compte manuellement
        // → on insère quand même dans brumerie_users si on a l'ID
        console.log('[AW Auth] Email existe — compte créé hors Brumerie');
        // On ne peut pas récupérer l'ID sans listing → retourner fallback
        return res.status(200).json({
          supabaseUserId: null,
          magicLink:      null,
          error:          'email_exists_no_id',
          message:        'Compte existe mais ID non récupérable. Contacter le dev AddressWeb pour lier manuellement.',
        });
      } else {
        throw new Error(`Création échouée: ${createText.substring(0, 200)}`);
      }

      // ── Étape 3 : sauvegarder dans brumerie_users pour la prochaine fois ──
      const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/brumerie_users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brumerie_uid: uid,
          supabase_id:  supabaseUserId,
          email:        email.toLowerCase(),
        }),
      });
      console.log('[AW Auth] Cache save status:', saveRes.status);
    }

    // ── Étape 4 : générer un magic link (non bloquant) ────────────
    let magicLink = null;
    try {
      const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generateLink`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'magiclink', email }),
      });
      const linkText = await linkRes.text();
      console.log('[AW Auth] Magic link status:', linkRes.status);
      try {
        const linkData = JSON.parse(linkText);
        magicLink = linkData.action_link || null;
      } catch { /* non bloquant */ }
    } catch { /* non bloquant */ }

    return res.status(200).json({ supabaseUserId, magicLink });

  } catch (err) {
    console.error('[AW Auth] Exception:', err.message);
    return res.status(200).json({
      supabaseUserId: null,
      magicLink:      null,
      error:          err.message,
    });
  }
}
