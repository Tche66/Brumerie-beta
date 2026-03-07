// netlify/functions/upload-image.js
// Proxy d'upload Cloudinary pour éviter les erreurs CORS sur mobile

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dk8kfgmqx';
    const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'brumerie_preset';

    // Récupérer le body (base64 de l'image + folder)
    const body = JSON.parse(event.body || '{}');
    const { imageBase64, folder = 'brumerie', mimeType = 'image/jpeg' } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'imageBase64 requis' }),
      };
    }

    // Construire le FormData pour Cloudinary
    const formData = new URLSearchParams();
    formData.append('file', `data:${mimeType};base64,${imageBase64}`);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || 'Upload échoué' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: data.secure_url }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Erreur serveur' }),
    };
  }
};
