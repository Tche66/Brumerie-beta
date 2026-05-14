// api/upload-image.js — Format Vercel Serverless Function
// Proxy Cloudinary : contourne blocage réseau mobile CI

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const CLOUD_NAME = 'dk8kfgmqx';
    const UPLOAD_PRESET = 'brumerie_preset';

    const { imageBase64 } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 requis' });
    }

    if (!imageBase64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Format image invalide' });
    }

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: imageBase64,
          upload_preset: UPLOAD_PRESET,
        }),
      }
    );

    let data;
    try {
      data = await cloudRes.json();
    } catch {
      return res.status(500).json({ error: 'Réponse Cloudinary illisible' });
    }

    if (!cloudRes.ok || !data.secure_url) {
      const msg = data?.error?.message || `Cloudinary erreur ${cloudRes.status}`;
      console.error('[upload-image] Cloudinary error:', msg);
      return res.status(500).json({ error: msg });
    }

    console.log('[upload-image] OK:', data.secure_url);
    return res.status(200).json({ url: data.secure_url });

  } catch (err) {
    console.error('[upload-image] Exception:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
