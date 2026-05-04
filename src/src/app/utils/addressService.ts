export interface Address {
  id: string;
  addressCode: string;
  latitude: number;
  longitude: number;
  repere: string;
  ville: string;
  createdAt: string;
}

const STORAGE_KEY = 'addressweb_addresses';

// Générer un code d'adresse unique
export function generateAddressCode(ville: string): string {
  const villeCode = ville.substring(0, 3).toUpperCase();
  const uniqueId = Math.floor(10000 + Math.random() * 90000);
  return `AW-${villeCode}-${uniqueId}`;
}

// Déterminer la ville à partir des coordonnées (simplifié pour le MVP)
export function getCityFromCoordinates(lat: number, lng: number): string {
  // Abidjan, Côte d'Ivoire
  if (lat >= 5.0 && lat <= 5.6 && lng >= -4.5 && lng <= -3.7) {
    return 'Abidjan';
  }
  // Dakar, Sénégal
  if (lat >= 14.6 && lat <= 14.8 && lng >= -17.5 && lng <= -17.3) {
    return 'Dakar';
  }
  // Lagos, Nigeria
  if (lat >= 6.4 && lat <= 6.6 && lng >= 3.3 && lng <= 3.5) {
    return 'Lagos';
  }
  // Accra, Ghana
  if (lat >= 5.5 && lat <= 5.7 && lng >= -0.3 && lng <= -0.1) {
    return 'Accra';
  }
  // Kinshasa, RDC
  if (lat >= -4.4 && lat <= -4.2 && lng >= 15.2 && lng <= 15.4) {
    return 'Kinshasa';
  }
  // Nairobi, Kenya
  if (lat >= -1.4 && lat <= -1.2 && lng >= 36.7 && lng <= 36.9) {
    return 'Nairobi';
  }
  
  return 'Ville';
}

// Sauvegarder une adresse
export function saveAddress(address: Omit<Address, 'id' | 'createdAt'>): Address {
  const addresses = getAllAddresses();
  const newAddress: Address = {
    ...address,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  
  addresses.push(newAddress);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  
  return newAddress;
}

// Récupérer toutes les adresses
export function getAllAddresses(): Address[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Récupérer une adresse par son code
export function getAddressByCode(code: string): Address | null {
  const addresses = getAllAddresses();
  return addresses.find(addr => addr.addressCode === code) || null;
}

// Générer un lien de partage
export function getShareLink(addressCode: string): string {
  return `${window.location.origin}/${addressCode}`;
}

// Générer un lien Google Maps
export function getGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// Partager via WhatsApp
export function shareViaWhatsApp(addressCode: string, repere: string): void {
  const link = getShareLink(addressCode);
  const message = `Voici mon adresse Address-Web: ${addressCode}\n${repere}\n${link}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// Copier le lien
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
}