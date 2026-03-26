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
    // 1. Chercher si le compte Supabase existe déjà
    const searchRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers }
    );
    const searchData = await searchRes.json();

    console.log('[AW Auth] Search status:', searchRes.status);

    let supabaseUserId;

    if (searchData.users?.length > 0) {
      supabaseUserId = searchData.users[0].id;
      console.log('[AW Auth] Compte existant trouvé:', supabaseUserId);
    } else {
      // Créer le compte Supabase
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

      const created = await createRes.json();
      console.log('[AW Auth] Create status:', createRes.status, JSON.stringify(created).substring(0, 200));

      if (!created.id) {
        // Deuxième tentative — parfois l'email existe déjà avec une casse différente
        // ou a été créé entre la recherche et la création
        if (created.msg?.includes('already') || created.code === 'email_exists') {
          console.log('[AW Auth] Email existe déjà — nouvelle recherche');
          const retry = await fetch(
            `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
            { headers }
          );
          const retryData = await retry.json();
          if (retryData.users?.length > 0) {
            supabaseUserId = retryData.users[0].id;
            console.log('[AW Auth] Trouvé en retry:', supabaseUserId);
          }
        }
        if (!supabaseUserId) {
          throw new Error(`Création compte échouée: ${JSON.stringify(created)}`);
        }
      } else {
        supabaseUserId = created.id;
        console.log('[AW Auth] Nouveau compte créé:', supabaseUserId);
      }
    }

    // 2. Générer un magic link
    const linkRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${supabaseUserId}/magiclink`,
      { method: 'POST', headers }
    );
    const linkData = await linkRes.json();
    console.log('[AW Auth] Magic link status:', linkRes.status);

    return res.status(200).json({
      supabaseUserId,
      magicLink: linkData.action_link || null,
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
