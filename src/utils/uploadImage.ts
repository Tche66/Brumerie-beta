// src/utils/uploadImage.ts
// Upload via Netlify Function proxy — évite CORS sur mobile Android

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Garder le préfixe data: complet pour la Netlify Function
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Lecture fichier échouée'));
    reader.readAsDataURL(file);
  });
}

export async function uploadToCloudinary(
  source: File | string,
  folder = 'brumerie'
): Promise<string> {
  let imageBase64: string;

  if (source instanceof File) {
    imageBase64 = await fileToBase64(source);
  } else {
    // Déjà une data URL ou base64
    imageBase64 = source;
  }

  const response = await fetch('/.netlify/functions/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      folder,
      mimeType: source instanceof File ? (source.type || 'image/jpeg') : 'image/jpeg',
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.url) {
    throw new Error(data.error || `Upload échoué (${response.status})`);
  }

  return data.url;
}
