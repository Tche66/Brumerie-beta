// api/aw-address.js — Proxy Brumerie → Address-Web
// ES Module — compatible "type": "module"

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const BRUMERIE_UID = process.env.BRUMERIE_USER_ID; // fallback si pas de supabaseUserId

const supabaseHeaders = {
  'apikey':        ANON_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
};

function generateAddressCode(ville = 'ABJ') {
  const code = ville.substring(0, 3).toUpperCase().padEnd(3, 'X');
  const uniqueId = Math.floor(10000 + Math.random() * 90000);
  return `AW-${code}-${uniqueId}`;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const ALLOWED = ['https://brumerie.com','https://www.brumerie.com','http://localhost:5173'];
  if (ALLOWED.includes(origin) || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Health check ──────────────────────────────────────────────
  if (req.method === 'GET' && req.query.health === '1') {
    return res.status(200).json({
      ok:          true,
      supabaseUrl: SUPABASE_URL  ? '✓' : '✗',
      anonKey:     ANON_KEY      ? '✓' : '✗',
      serviceKey:  SERVICE_KEY   ? '✓' : '✗',
      brumeUserId: BRUMERIE_UID  ? '✓' : '✗',
    });
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Variables manquantes: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY' });
  }

  // ── GET ?code=AW-ABI-XXXXX ──────────────────────────────────
  if (req.method === 'GET') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Paramètre code requis' });

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/addresses?address_code=eq.${encodeURIComponent(code)}&select=*`,
      { headers: supabaseHeaders }
    );
    const data = await response.json();
    if (!data || data.length === 0) return res.status(404).json({ error: 'Adresse introuvable' });

    const a = data[0];
    return res.status(200).json({
      addressCode: a.address_code,
      latitude:    a.latitude,
      longitude:   a.longitude,
      repere:      a.repere,
      ville:       a.ville,
      quartier:    a.quartier,
      pays:        a.pays,
      isPublic:    a.is_public,
      isVerified:  a.is_verified,
      shareLink:   `https://addressweb.brumerie.com/${a.address_code}`,
      googleMapsLink: `https://www.google.com/maps?q=${a.latitude},${a.longitude}`,
      editLink:    `https://addressweb.brumerie.com/${a.address_code}/modifier`,
    });
  }

  // ── POST — créer une adresse ────────────────────────────────
  if (req.method === 'POST') {
    const {
      latitude, longitude, repere, ville,
      quartier, pays, isPublic,
      supabaseUserId, // ← ID réel de l'utilisateur (retourné par /api/aw-auth)
    } = req.body || {};

    if (!latitude || !longitude || !ville) {
      return res.status(400).json({ error: 'latitude, longitude et ville sont requis' });
    }

    // Utiliser le vrai user_id de l'utilisateur si disponible
    // Sinon fallback sur le compte Brumerie générique
    const userId = supabaseUserId || BRUMERIE_UID;
    if (!userId) {
      return res.status(500).json({ error: 'userId manquant — fournir supabaseUserId ou configurer BRUMERIE_USER_ID' });
    }

    const addressCode = generateAddressCode(ville);
    const payload = {
      address_code: addressCode,
      latitude:     parseFloat(latitude),
      longitude:    parseFloat(longitude),
      repere:       repere || '',
      ville,
      quartier:     quartier || null,
      pays:         pays || "Côte d'Ivoire",
      is_public:    isPublic !== false,
      user_id:      userId,  // ← vrai propriétaire = peut modifier sur Address-Web
      categorie:    categorie || 'autre',
    };

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/addresses`,
      { method: 'POST', headers: supabaseHeaders, body: JSON.stringify(payload) }
    );
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Erreur Supabase', detail: data });

    const created = Array.isArray(data) ? data[0] : data;
    return res.status(201).json({
      addressCode: created.address_code,
      shareLink:   `https://addressweb.brumerie.com/${created.address_code}`,
      editLink:    `https://addressweb.brumerie.com/${created.address_code}/modifier`,
      googleMapsLink: `https://www.google.com/maps?q=${created.latitude},${created.longitude}`,
      latitude:    created.latitude,
      longitude:   created.longitude,
      ville:       created.ville,
    });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
