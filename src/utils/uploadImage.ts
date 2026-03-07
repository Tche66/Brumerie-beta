// src/utils/uploadImage.ts
// Upload via Netlify Function pour éviter les erreurs CORS sur mobile Android

/**
 * Convertit un File en base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Enlever le préfixe "data:image/jpeg;base64,"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Lecture fichier échouée'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload une image vers Cloudinary via la Netlify Function proxy
 * Évite les erreurs CORS sur mobile Android
 */
export async function uploadToCloudinary(
  source: File | string,
  folder = 'brumerie'
): Promise<string> {
  let imageBase64: string;
  let mimeType = 'image/jpeg';

  if (source instanceof File) {
    mimeType = source.type || 'image/jpeg';
    imageBase64 = await fileToBase64(source);
  } else {
    // source = data URL base64
    const parts = source.split(',');
    imageBase64 = parts[1] || parts[0];
    const mimeMatch = source.match(/data:([^;]+);/);
    if (mimeMatch) mimeType = mimeMatch[1];
  }

  const response = await fetch('/.netlify/functions/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, folder, mimeType }),
  });

  const data = await response.json();

  if (!response.ok || !data.url) {
    throw new Error(data.error || `Upload échoué (${response.status})`);
  }

  return data.url;
}
