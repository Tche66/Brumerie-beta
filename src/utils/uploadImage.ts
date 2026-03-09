// src/utils/uploadImage.ts — v15
// Passe par la Netlify Function pour contourner le blocage réseau mobile CI
// api.cloudinary.com est bloqué sur 4G en Côte d'Ivoire — on passe par notre proxy Netlify

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string); // data:image/jpeg;base64,...
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

export async function uploadToCloudinary(
  source: File | string,
  _folder?: string  // ignoré — le folder est géré par le preset Cloudinary côté serveur
): Promise<string> {

  // Convertir en base64 si c'est un File
  const imageBase64 = source instanceof File ? await toBase64(source) : source;

  // Appel à notre Netlify Function proxy
  // Même domaine = pas de CORS, pas de blocage réseau opérateur
  const res = await fetch('/.netlify/functions/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Erreur serveur (${res.status}) — réessaie dans un instant`);
  }

  if (!res.ok) {
    // On affiche le message Cloudinary exact si dispo (ex: "Upload preset not found")
    throw new Error(data?.error || `Erreur upload (${res.status})`);
  }

  if (!data.url) {
    throw new Error('URL image non reçue — réessaie');
  }

  return data.url as string;
}
