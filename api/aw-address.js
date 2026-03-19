// api/aw-address.js — Proxy sécurisé Address-Web pour Brumerie
// La clé API ne transite JAMAIS par le navigateur
// Appelé par awService.ts depuis le frontend Brumerie

const AW_API_BASE = 'https://addressweb.app';
const AW_API_KEY  = process.env.ADDRESSWEB_API_KEY || '';

// ── CORS ──────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://brumerie.com',
  'https://www.brumerie.com',
  'https://brumerie-beta.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=300'); // Cache 5 min
}

// ── Handler principal ─────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCORS(req, res);

  // Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!AW_API_KEY) {
    return res.status(500).json({ error: 'ADDRESSWEB_API_KEY non configurée sur Vercel' });
  }

  const { method, query, body } = req;

  try {
    // ── GET /api/aw-address?code=AW-ABJ-84321 ────────────────
    if (method === 'GET' && query.code) {
      const code = String(query.code).toUpperCase().trim();

      // Validation format
      if (!/^AW-[A-Z]{3}-\d{5}$/.test(code)) {
        return res.status(400).json({ error: 'Format invalide. Exemple: AW-ABJ-84321' });
      }

      const response = await fetch(`${AW_API_BASE}/api/v1/addresses/${code}`, {
        headers: {
          'Authorization': `Bearer ${AW_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return res.status(404).json({ error: 'Adresse introuvable', code });
      }

      if (!response.ok) {
        const err = await response.text();
        console.error('[AW Proxy] API error:', response.status, err);
        return res.status(502).json({ error: 'Erreur API Address-Web' });
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    // ── GET /api/aw-address?search=Cocody ────────────────────
    if (method === 'GET' && query.search) {
      const q = String(query.search).trim();
      const limit = Math.min(parseInt(query.limit || '10'), 20);

      const response = await fetch(
        `${AW_API_BASE}/api/v1/addresses/search?q=${encodeURIComponent(q)}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${AW_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return res.status(502).json({ error: 'Erreur recherche Address-Web' });
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    // ── POST /api/aw-address — Créer une adresse ─────────────
    if (method === 'POST') {
      const { latitude, longitude, repere, ville, quartier, isPublic } = body || {};

      if (!latitude || !longitude || !repere || !ville) {
        return res.status(400).json({
          error: 'Champs requis: latitude, longitude, repere, ville'
        });
      }

      const response = await fetch(`${AW_API_BASE}/api/v1/addresses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AW_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude, repere, ville, quartier, isPublic }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('[AW Proxy] Create error:', response.status, err);
        return res.status(502).json({ error: "Impossible de créer l'adresse" });
      }

      const data = await response.json();
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Méthode non supportée' });

  } catch (err) {
    console.error('[AW Proxy] Exception:', err.message);
    return res.status(500).json({ error: 'Erreur serveur proxy' });
  }
};
