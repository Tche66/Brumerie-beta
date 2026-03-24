// api/aw-address.js — Proxy Brumerie → Address-Web (Supabase)
// Variables Vercel requises :
//   SUPABASE_URL         = https://lgvftohxsotraazsksrb.supabase.co
//   SUPABASE_ANON_KEY    = eyJ... (clé anon publique)
//   SUPABASE_SERVICE_KEY = eyJ... (clé service_role — jamais publique)

const SUPABASE_URL  = process.env.SUPABASE_URL;
const ANON_KEY      = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY;

// Headers Supabase obligatoires
const supabaseHeaders = {
  'apikey':        ANON_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation', // retourner l'objet créé
};

// Génère un code AW à partir de la ville (même logique qu'Address-Web)
function generateAddressCode(ville = 'ABJ') {
  const code = ville.substring(0, 3).toUpperCase().padEnd(3, 'X');
  const uniqueId = Math.floor(10000 + Math.random() * 90000);
  return `AW-${code}-${uniqueId}`;
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const ALLOWED = ['https://brumerie.com','https://www.brumerie.com','http://localhost:5173'];
  if (ALLOWED.includes(origin) || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Health check ─────────────────────────────────────────────
  if (req.method === 'GET' && req.query.health === '1') {
    return res.status(200).json({
      ok:             true,
      supabaseUrl:    SUPABASE_URL ? '✓ présente' : '✗ manquante',
      anonKey:        ANON_KEY    ? '✓ présente' : '✗ manquante',
      serviceKey:     SERVICE_KEY ? '✓ présente' : '✗ manquante',
      brumeUserIdEnv: process.env.AW_BRUMERIE_USER_ID ? '✓ présente' : '✗ manquante (optionnelle)',
    });
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Variables Vercel manquantes : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY' });
  }

  // ── GET /api/aw-address?code=AW-ABJ-84321 ──────────────────────
  if (req.method === 'GET') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Paramètre code requis' });

    let response, data;
    try {
      response = await fetch(
        `${SUPABASE_URL}/rest/v1/addresses?address_code=eq.${encodeURIComponent(code)}&select=*`,
        { headers: supabaseHeaders }
      );
      data = await response.json();
    } catch (fetchErr) {
      console.error('[AW Proxy] GET fetch error:', fetchErr.message);
      return res.status(502).json({ error: 'Impossible de joindre Supabase' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Adresse introuvable' });
    }

    const addr = data[0];
    return res.status(200).json({
      addressCode: addr.address_code,
      latitude:    addr.latitude,
      longitude:   addr.longitude,
      repere:      addr.repere,
      ville:       addr.ville,
      quartier:    addr.quartier,
      pays:        addr.pays,
      isPublic:    addr.is_public,
      shareLink:   `https://addressweb.brumerie.com/${addr.address_code}`,
      googleMapsLink: `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`,
    });
  }

  // ── POST /api/aw-address ────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      latitude, longitude, repere, ville,
      quartier, pays, isPublic, userId, categorie
    } = req.body || {};

    // Validation
    if (!latitude || !longitude || !ville) {
      return res.status(400).json({ error: 'latitude, longitude et ville sont requis' });
    }
    // userId : envoyé par le frontend OU fallback sur le compte dédié Brumerie
    const resolvedUserId = userId || process.env.AW_BRUMERIE_USER_ID;
    if (!resolvedUserId) {
      return res.status(400).json({ error: 'userId requis — configurer AW_BRUMERIE_USER_ID sur Vercel' });
    }

    const addressCode = generateAddressCode(ville);

    const payload = {
      address_code: addressCode,
      latitude:     parseFloat(latitude),
      longitude:    parseFloat(longitude),
      repere:       repere || '',
      ville:        ville,
      quartier:     quartier || null,
      pays:         pays || 'Côte d\'Ivoire',
      is_public:    isPublic !== false,
      user_id:      resolvedUserId,
      // categorie retiré — vérifier si le champ existe dans la table Supabase
    };

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/addresses`,
      {
        method:  'POST',
        headers: supabaseHeaders,
        body:    JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Erreur Supabase', detail: data });
    }

    const created = Array.isArray(data) ? data[0] : data;

    return res.status(201).json({
      addressCode: created.address_code,
      shareLink:   `https://addressweb.brumerie.com/${created.address_code}`,
      googleMapsLink: `https://www.google.com/maps?q=${created.latitude},${created.longitude}`,
      latitude:    created.latitude,
      longitude:   created.longitude,
      ville:       created.ville,
    });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
};
