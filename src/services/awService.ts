// src/services/awService.ts — Address-Web × Brumerie Bridge
// Pont entre Brumerie (Firebase) et Address-Web (Supabase)
// Les deux apps restent séparées — communication via API publique Address-Web

// ── Config ───────────────────────────────────────────────────────
const AW_BASE_URL = import.meta.env.VITE_AW_BASE_URL || 'https://addressweb.brumerie.com';
const AW_REGEX = /^AW-[A-Z]{3}-\d{5}$/i;

// ── Types ─────────────────────────────────────────────────────────
export interface AWAddress {
  addressCode: string;
  latitude: number;
  longitude: number;
  repere: string;
  ville: string;
  quartier?: string;
  pays?: string;
  isVerified?: boolean;
  shareLink: string;
  googleMapsLink: string;
}

// ── Validation du format code AW ─────────────────────────────────
export function isValidAWCode(code: string): boolean {
  return AW_REGEX.test(code.trim());
}

export function formatAWCode(raw: string): string {
  return raw.trim().toUpperCase();
}

// ── Résoudre un code AW → coordonnées + repère ───────────────────
// Interroge l'API publique Address-Web (sans auth requise pour les adresses publiques)
export async function resolveAWCode(code: string): Promise<AWAddress | null> {
  const clean = formatAWCode(code);
  if (!isValidAWCode(clean)) return null;

  try {
    // Essai 1 : API REST Address-Web
    const res = await fetch(`${AW_BASE_URL}/api/v1/addresses/${clean}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        addressCode: data.addressCode || clean,
        latitude: data.latitude,
        longitude: data.longitude,
        repere: data.repere || '',
        ville: data.ville || '',
        quartier: data.quartier,
        pays: data.pays,
        isVerified: data.isVerified,
        shareLink: `${AW_BASE_URL}/${clean}`,
        googleMapsLink: `https://www.google.com/maps?q=${data.latitude},${data.longitude}`,
      };
    }
  } catch (_) { /* API indisponible — fallback ci-dessous */ }

  // Essai 2 : page publique Address-Web (fallback sans API)
  // On retourne une adresse partielle avec le lien de partage
  return {
    addressCode: clean,
    latitude: 0,
    longitude: 0,
    repere: 'Adresse enregistrée sur Address-Web',
    ville: '',
    shareLink: `${AW_BASE_URL}/${clean}`,
    googleMapsLink: '',
  };
}

// ── Lien Google Maps depuis un code AW ───────────────────────────
export function getAWMapsLink(addr: AWAddress): string {
  if (addr.latitude && addr.longitude) {
    return `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`;
  }
  return addr.shareLink;
}

// ── Lien WhatsApp avec l'adresse ─────────────────────────────────
export function getAWWhatsAppLink(addr: AWAddress): string {
  const msg = `📍 Mon adresse : *${addr.addressCode}*\n${addr.repere ? addr.repere + '\n' : ''}🔗 ${addr.shareLink}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

// ── Générer le lien de création d'adresse AW (deep link vers Address-Web) ──
export function getAWCreateLink(prefill?: { ville?: string }): string {
  const params = prefill?.ville ? `?ville=${encodeURIComponent(prefill.ville)}` : '';
  return `${AW_BASE_URL}/creer${params}`;
}

// ── Affichage court du code ───────────────────────────────────────
export function formatAWDisplay(code: string): string {
  // AW-ABJ-84321 → 📍 AW-ABJ-84321
  return `📍 ${code.toUpperCase()}`;
}
