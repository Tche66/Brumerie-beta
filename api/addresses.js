// api/v1/addresses.js
// GET    /api/v1/addresses/search?q=...  → recherche
// POST   /api/v1/addresses               → créer
// GET    /api/v1/addresses/:code         → lire (géré dans [code].js)

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY;
const ANON_KEY      = process.env.VITE_SUPABASE_ANON_KEY;

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function validateApiKey(keyHeader) {
  if (!keyHeader) return null;
  const key = keyHeader.replace('Bearer ', '').trim();

  // Hasher la clé reçue
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const keyHash = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // Chercher dans api_keys
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/api_keys?key_hash=eq.${keyHash}&is_active=eq.true&select=id,user_id,plan,daily_limit,requests_today`,
    { headers }
  );
  const keys = await res.json();
  if (!keys || keys.length === 0) return null;

  const apiKey = keys[0];

  // Vérifier la limite quotidienne
  if (apiKey.daily_limit !== -1 && apiKey.requests_today >= apiKey.daily_limit) {
    return { error: 'Limite quotidienne atteinte', limit: apiKey.daily_limit };
  }

  // Incrémenter le compteur
  await fetch(
    `${SUPABASE_URL}/rest/v1/api_keys?id=eq.${apiKey.id}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        requests_today: apiKey.requests_today + 1,
        requests_total: apiKey.requests_total + 1,
        last_used_at: new Date().toISOString(),
      }),
    }
  );

  return { userId: apiKey.user_id, plan: apiKey.plan };
}

function generateAddressCode(ville = 'ABJ') {
  const code = ville.substring(0, 3).toUpperCase().padEnd(3, 'X');
  const uniqueId = Math.floor(10000 + Math.random() * 90000);
  return `AW-${code}-${uniqueId}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Valider la clé API
  const auth = await validateApiKey(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: 'Clé API invalide ou manquante' });
  if (auth.error) return res.status(429).json({ error: auth.error, limit: auth.limit });

  // GET /api/v1/addresses/search?q=...
  if (req.method === 'GET') {
    const { q, limit = '20' } = req.query;
    if (!q) return res.status(400).json({ error: 'Paramètre q requis' });

    const lim = Math.min(parseInt(limit), 100);
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/addresses?or=(address_code.ilike.*${q}*,ville.ilike.*${q}*,repere.ilike.*${q}*)&is_public=eq.true&select=address_code,latitude,longitude,ville,quartier,repere,categorie,is_verified&limit=${lim}`,
      { headers }
    );
    const data = await response.json();
    return res.status(200).json({ results: data || [], count: data?.length || 0 });
  }

  // POST /api/v1/addresses
  if (req.method === 'POST') {
    const { latitude, longitude, repere, ville, quartier, pays, isPublic, categorie } = req.body || {};

    if (!latitude || !longitude || !ville) {
      return res.status(400).json({ error: 'latitude, longitude et ville sont requis' });
    }

    const addressCode = generateAddressCode(ville);
    const payload = {
      address_code: addressCode,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      repere: repere || '',
      ville,
      quartier: quartier || null,
      pays: pays || "Côte d'Ivoire",
      is_public: isPublic !== false,
      user_id: auth.userId,
      categorie: categorie || 'autre',
    };

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/addresses`,
      { method: 'POST', headers, body: JSON.stringify(payload) }
    );
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Erreur création', detail: data });

    const created = Array.isArray(data) ? data[0] : data;
    return res.status(201).json({
      addressCode: created.address_code,
      latitude: created.latitude,
      longitude: created.longitude,
      ville: created.ville,
      shareLink: `https://addressweb.brumerie.com/${created.address_code}`,
    });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
