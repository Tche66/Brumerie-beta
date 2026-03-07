// uploadImage.ts v14
// Passe par Netlify Function pour contourner le blocage réseau mobile CI
// api.cloudinary.com est bloqué sur 4G en Côte d'Ivoire — on passe par notre serveur Netlify

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string); // data:image/jpeg;base64,...
    reader.onerror = () => reject(new Error('Lecture fichier échouée'));
    reader.readAsDataURL(file);
  });
}

export async function uploadToCloudinary(
  source: File | string,
  _folder?: string  // ignoré — le folder est configuré dans le preset Cloudinary
): Promise<string> {

  // Convertir en base64 si c'est un File
  const imageBase64 = source instanceof File ? await toBase64(source) : source;

  // Appel à notre Netlify Function (même domaine = pas de CORS, pas de blocage réseau)
  const res = await fetch('/.netlify/functions/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });

  if (!res.ok) {
    let msg = `Erreur serveur (${res.status})`;
    try { const d = await res.json(); msg = d.error || msg; } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  if (!data.url) throw new Error('URL image non reçue');

  return data.url as string;
}
