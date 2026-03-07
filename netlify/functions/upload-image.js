// netlify/functions/upload-image.js
// Proxy Cloudinary — contourne le blocage réseau mobile CI

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
    const UPLOAD_PRESET = 'brumerie_preset';

    const { imageBase64 } = JSON.parse(event.body || '{}');

    if (!imageBase64) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'imageBase64 requis' }) };
    }

    // Envoyer à Cloudinary en JSON — PAS de folder (cause "Display name cannot contain slashes")
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: imageBase64,
        upload_preset: UPLOAD_PRESET,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.secure_url) {
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: data.error?.message || 'Upload Cloudinary échoué' }),
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
      body: JSON.stringify({ error: String(err.message || err) }),
    };
  }
};
