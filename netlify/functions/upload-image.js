// netlify/functions/upload-image.js — v15
// Proxy Cloudinary : contourne le blocage réseau mobile CI
// "type": "commonjs" dans package.json garantit que exports.handler fonctionne

exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const CLOUD_NAME = 'dk8kfgmqx';
    const UPLOAD_PRESET = 'brumerie_preset'; // SANS majuscule, SANS folder dans la requête

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'JSON invalide' }) };
    }

    const { imageBase64 } = body;

    if (!imageBase64) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'imageBase64 requis' }) };
    }

    // Vérifier que c'est bien un data URL valide
    if (!imageBase64.startsWith('data:image/')) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Format image invalide' }) };
    }

    // Envoi à Cloudinary en JSON — PAS de "folder" (évite "Display name cannot contain slashes")
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: imageBase64,
        upload_preset: UPLOAD_PRESET,
      }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Réponse Cloudinary illisible' }) };
    }

    if (!res.ok || !data.secure_url) {
      const msg = data?.error?.message || `Cloudinary erreur ${res.status}`;
      console.error('[upload-image] Cloudinary error:', msg);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: msg }) };
    }

    console.log('[upload-image] Upload OK:', data.secure_url);
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ url: data.secure_url }),
    };

  } catch (err) {
    console.error('[upload-image] Exception:', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: String(err.message || err) }),
    };
  }
};
