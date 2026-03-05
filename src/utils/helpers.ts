// src/utils/helpers.ts

/**
 * Générer lien WhatsApp avec message pré-rempli
 */
export function generateWhatsAppLink(phone: string, productTitle: string, price: number): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const message = `Bonjour, je suis intéressé(e) par votre *${productTitle}* à *${formatPrice(price)}* sur Brumerie.`;
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Formater le prix en FCFA
 */
export function formatPrice(price: number): string {
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

/**
 * Formater la date relative (il y a X jours)
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 30) return `Il y a ${diffDays}j`;
  
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Compresser une image avant upload
 */
export async function compressImage(file: File, maxWidth: number = 1200): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8);
      };
    };
  });
}

/**
 * Valider numéro de téléphone (format ivoirien)
 */
export function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  // Format: +225XXXXXXXXXX ou 225XXXXXXXXXX ou 0XXXXXXXXX
  return /^(\+?225)?[0-9]{10}$/.test(cleanPhone);
}

/**
 * Formater numéro de téléphone pour affichage
 */
export function formatPhoneDisplay(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('225')) {
    return `+225 ${cleanPhone.slice(3, 5)} ${cleanPhone.slice(5, 7)} ${cleanPhone.slice(7, 9)} ${cleanPhone.slice(9)}`;
  }
  return phone;
}
