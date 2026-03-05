// src/utils/uploadImage.ts — Upload vers Cloudinary (même config que les photos produits)
const CLOUD_NAME = 'dk8kfgmqx';
const UPLOAD_PRESET = 'brumerie_preset';

/**
 * Upload un fichier ou un base64 vers Cloudinary
 * Retourne l'URL sécurisée
 */
export async function uploadToCloudinary(source: File | string): Promise<string> {
  const fd = new FormData();

  if (typeof source === 'string') {
    // base64 → Blob
    const res = await fetch(source);
    const blob = await res.blob();
    fd.append('file', blob, 'proof.jpg');
  } else {
    fd.append('file', source);
  }

  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', 'brumerie_proofs'); // dossier séparé pour les preuves

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: fd }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Upload Cloudinary échoué');
  }

  const data = await response.json();
  return data.secure_url as string;
}
