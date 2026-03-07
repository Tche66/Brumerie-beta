// Upload direct vers Cloudinary — FormData simple, pas de proxy
// Fonctionne si le preset est en mode UNSIGNED dans Cloudinary

const CLOUD_NAME = 'dk8kfgmqx';
const UPLOAD_PRESET = 'brumerie_preset';

export async function uploadToCloudinary(
  source: File | string,
  folder = 'brumerie'
): Promise<string> {
  const fd = new FormData();

  if (source instanceof File) {
    fd.append('file', source);
  } else {
    // data URL string
    fd.append('file', source);
  }

  fd.append('upload_preset', UPLOAD_PRESET);
  // NE PAS envoyer 'folder' — le folder est défini dans le preset Cloudinary
  // Envoyer folder cause l'erreur "Display name cannot contain slashes"

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: fd }
  );

  const data = await res.json();

  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message || `Erreur upload (${res.status})`);
  }

  return data.secure_url as string;
}
