// api/aw-address.js — Proxy sécurisé Address-Web pour Brumerie v2
// La clé API ne transite JAMAIS par le navigateur
// Appelé par awService.ts depuis le frontend Brumerie

const AW_API_BASE = process.env.ADDRESSWEB_API_BASE || 'https://addressweb.brumerie.com';
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
  res.setHeader('Cache-Control', 'public, s-maxage=300');
}

// ── Fetch avec timeout ────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Handler principal ─────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCORS(req, res);

  // Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, query, body } = req;

  // ── GET /api/aw-address?health=1 — Diagnostic endpoint ──────
  // Permet de vérifier l'état de la config sans exposer la clé
  if (method === 'GET' && query.health === '1') {
    return res.status(200).json({
      status:     'ok',
      keyPresent: !!AW_API_KEY,
      keyLength:  AW_API_KEY ? AW_API_KEY.length : 0,
      apiBase:    AW_API_BASE,
      env:        process.env.NODE_ENV || 'unknown',
    });
  }

  if (!AW_API_KEY) {
    console.error('[AW Proxy] ADDRESSWEB_API_KEY manquante — configurer dans Vercel > Settings > Environment Variables');
    return res.status(500).json({
      error:  'ADDRESSWEB_API_KEY non configurée',
      fix:    'Ajouter ADDRESSWEB_API_KEY dans Vercel Settings > Environment Variables, puis redéployer.',
    });
  }

  const AW_HEADERS = {
    'Authorization': `Bearer ${AW_API_KEY}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };

  try {
    // ── GET /api/aw-address?code=AW-ABJ-84321 ────────────────
    if (method === 'GET' && query.code) {
      const code = String(query.code).toUpperCase().trim();

      if (!/^AW-[A-Z]{3}-\d{5}$/.test(code)) {
        return res.status(400).json({ error: 'Format invalide. Exemple: AW-ABJ-84321' });
      }

      let response;
      try {
        response = await fetchWithTimeout(
          `${AW_API_BASE}/api/v1/addresses/${code}`,
          { headers: AW_HEADERS },
          10000 // 10s pour les connexions lentes ivoiriennes
        );
      } catch (fetchErr) {
        const isTimeout = fetchErr.name === 'AbortError';
        console.error(`[AW Proxy] ${isTimeout ? 'TIMEOUT' : 'FETCH ERROR'} on code lookup:`, fetchErr.message);
        return res.status(502).json({
          error:   isTimeout ? 'AddressWeb API timeout (>10s)' : 'Impossible de joindre AddressWeb',
          code,
          details: fetchErr.message,
        });
      }

      if (response.status === 404) {
        return res.status(404).json({ error: 'Adresse introuvable', code });
      }

      if (response.status === 401 || response.status === 403) {
        const errBody = await response.text();
        console.error('[AW Proxy] Auth error:', response.status, errBody);
        return res.status(502).json({
          error:   'Clé API AddressWeb invalide ou expirée',
          status:  response.status,
          details: errBody.substring(0, 200),
        });
      }

      if (!response.ok) {
        const errBody = await response.text();
        console.error('[AW Proxy] API error:', response.status, errBody);
        return res.status(502).json({
          error:   `Erreur API Address-Web (HTTP ${response.status})`,
          details: errBody.substring(0, 200),
        });
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        const rawText = await response.text().catch(() => '');
        console.error('[AW Proxy] JSON parse error, raw response:', rawText.substring(0, 300));
        return res.status(502).json({ error: 'Réponse API non-JSON', raw: rawText.substring(0, 100) });
      }

      // Normaliser les champs (AddressWeb peut changer son schéma)
      const normalized = {
        addressCode:    data.addressCode    || data.code    || data.address_code || code,
        latitude:       data.latitude       || data.lat     || 0,
        longitude:      data.longitude      || data.lng     || data.lon          || 0,
        repere:         data.repere         || data.label   || data.description  || '',
        ville:          data.ville          || data.city    || data.town         || '',
        quartier:       data.quartier       || data.district|| data.neighborhood || '',
        pays:           data.pays           || data.country || 'Côte d\'Ivoire',
        isVerified:     data.isVerified     || data.verified|| false,
        shareLink:      data.shareLink      || `${AW_API_BASE}/${code}`,
        googleMapsLink: (data.latitude || data.lat)
          ? `https://www.google.com/maps?q=${data.latitude || data.lat},${data.longitude || data.lng}`
          : '',
        _raw: undefined, // ne pas exposer le raw en prod
      };

      return res.status(200).json(normalized);
    }

    // ── GET /api/aw-address?search=Cocody ────────────────────
    if (method === 'GET' && query.search) {
      const q     = String(query.search).trim();
      const limit = Math.min(parseInt(query.limit || '10'), 20);

      let response;
      try {
        response = await fetchWithTimeout(
          `${AW_API_BASE}/api/v1/addresses/search?q=${encodeURIComponent(q)}&limit=${limit}`,
          { headers: AW_HEADERS },
          8000
        );
      } catch (fetchErr) {
        console.error('[AW Proxy] Search fetch error:', fetchErr.message);
        return res.status(502).json({ error: 'Erreur recherche Address-Web', results: [] });
      }

      if (!response.ok) {
        return res.status(502).json({ error: 'Erreur recherche Address-Web', results: [] });
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

      let response;
      try {
        response = await fetchWithTimeout(
          `${AW_API_BASE}/api/v1/addresses`,
          {
            method:  'POST',
            headers: AW_HEADERS,
            body:    JSON.stringify({ latitude, longitude, repere, ville, quartier, isPublic }),
          },
          10000
        );
      } catch (fetchErr) {
        console.error('[AW Proxy] Create fetch error:', fetchErr.message);
        return res.status(502).json({ error: "Impossible de joindre AddressWeb pour créer l'adresse" });
      }

      if (!response.ok) {
        const errBody = await response.text();
        console.error('[AW Proxy] Create error:', response.status, errBody);
        return res.status(502).json({ error: `Impossible de créer l'adresse (HTTP ${response.status})` });
      }

      const data = await response.json();
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Méthode non supportée' });

  } catch (err) {
    console.error('[AW Proxy] Exception non gérée:', err.message, err.stack);
    return res.status(500).json({ error: 'Erreur serveur proxy', details: err.message });
  }
};

