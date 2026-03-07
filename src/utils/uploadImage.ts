// src/utils/uploadImage.ts — Upload Cloudinary centralisé
// Utilise les variables d'env si disponibles, sinon fallback hardcodé

const CLOUD_NAME = 'dk8kfgmqx';
const UPLOAD_PRESET = 'brumerie_preset';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Upload un fichier File ou un base64 vers Cloudinary
 * Retourne l'URL sécurisée
 */
export async function uploadToCloudinary(
  source: File | string,
  folder = 'brumerie'
): Promise<string> {
  const fd = new FormData();

  if (typeof source === 'string') {
    // base64 → Blob
    const res = await fetch(source);
    const blob = await res.blob();
    fd.append('file', blob, 'image.jpg');
  } else {
    fd.append('file', source);
  }

  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', folder);

  const response = await fetch(CLOUDINARY_URL, {
    method: 'POST',
    body: fd,
  });

  if (!response.ok) {
    let msg = 'Upload image échoué';
    try {
      const err = await response.json();
      msg = err.error?.message || `Cloudinary erreur ${response.status}: ${err.error?.message || 'inconnue'}`;
    } catch {}
    throw new Error(msg);
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error('Upload échoué : URL image non reçue de Cloudinary');
  }
  console.log('[Cloudinary] Upload réussi:', data.secure_url);
  return data.secure_url as string;
}
