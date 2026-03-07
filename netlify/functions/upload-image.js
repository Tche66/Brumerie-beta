// netlify/functions/upload-image.js
// Proxy d'upload Cloudinary — évite CORS sur mobile Android

exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  try {
    const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dk8kfgmqx';
    const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'brumerie_preset';

    const body = JSON.parse(event.body || '{}');
    const { imageBase64, folder = 'brumerie', mimeType = 'image/jpeg' } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'imageBase64 requis' }),
      };
    }

    // Construire la data URL complète
    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:${mimeType};base64,${imageBase64}`;

    // Cloudinary accepte le JSON directement pour les uploads base64
    const payload = {
      file: dataUrl,
      upload_preset: UPLOAD_PRESET,
      folder: folder,
    };

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      const errMsg = data.error?.message || `Erreur Cloudinary ${response.status}`;
      return {
        statusCode: response.status || 500,
        headers: CORS,
        body: JSON.stringify({ error: errMsg }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ url: data.secure_url }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message || 'Erreur serveur' }),
    };
  }
};
