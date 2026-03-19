// src/services/awService.ts — v2 : proxy sécurisé via /api/aw-address
// La clé API Address-Web reste côté serveur Vercel — jamais exposée au navigateur

// ── Config ────────────────────────────────────────────────────
// En prod → /api/aw-address (proxy Vercel)
// En dev local → même chose (Vercel CLI gère les fonctions)
const AW_PROXY = '/api/aw-address';
const AW_SHARE_BASE = 'https://addressweb.app';

// ── Types ─────────────────────────────────────────────────────
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

// ── Validation format AW-ABJ-84321 ───────────────────────────
const AW_REGEX = /^AW-[A-Z]{3}-\d{5}$/i;

export function isValidAWCode(code: string): boolean {
  return AW_REGEX.test(code.trim());
}

export function formatAWCode(raw: string): string {
  return raw.trim().toUpperCase();
}

// ── Résoudre un code AW → données complètes ──────────────────
export async function resolveAWCode(code: string): Promise<AWAddress | null> {
  const clean = formatAWCode(code);
  if (!isValidAWCode(clean)) return null;

  try {
    const res = await fetch(`${AW_PROXY}?code=${encodeURIComponent(clean)}`, {
      signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined,
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn('[AW] Proxy error:', res.status);
      return buildFallback(clean);
    }

    const data = await res.json();

    return {
      addressCode:    data.addressCode || clean,
      latitude:       data.latitude    || 0,
      longitude:      data.longitude   || 0,
      repere:         data.repere      || '',
      ville:          data.ville       || '',
      quartier:       data.quartier,
      pays:           data.pays,
      isVerified:     data.isVerified  || false,
      shareLink:      `${AW_SHARE_BASE}/${clean}`,
      googleMapsLink: data.latitude && data.longitude
        ? `https://www.google.com/maps?q=${data.latitude},${data.longitude}`
        : '',
    };
  } catch (err) {
    console.warn('[AW] Resolve failed:', err);
    return buildFallback(clean);
  }
}

// Fallback si proxy indisponible — retourne lien de partage sans GPS
function buildFallback(code: string): AWAddress {
  return {
    addressCode:    code,
    latitude:       0,
    longitude:      0,
    repere:         '',
    ville:          '',
    shareLink:      `${AW_SHARE_BASE}/${code}`,
    googleMapsLink: '',
  };
}

// ── Recherche d'adresses ──────────────────────────────────────
export async function searchAWAddresses(query: string, limit = 10): Promise<AWAddress[]> {
  if (!query || query.length < 2) return [];
  try {
    const res = await fetch(
      `${AW_PROXY}?search=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.results || data || [];
    return results.map((d: any): AWAddress => ({
      addressCode:    d.addressCode,
      latitude:       d.latitude    || 0,
      longitude:      d.longitude   || 0,
      repere:         d.repere      || '',
      ville:          d.ville       || '',
      quartier:       d.quartier,
      shareLink:      `${AW_SHARE_BASE}/${d.addressCode}`,
      googleMapsLink: d.latitude && d.longitude
        ? `https://www.google.com/maps?q=${d.latitude},${d.longitude}`
        : '',
    }));
  } catch { return []; }
}

// ── Helpers ───────────────────────────────────────────────────
export function getAWMapsLink(addr: AWAddress): string {
  if (addr.latitude && addr.longitude) {
    return `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`;
  }
  return addr.shareLink;
}

export function getAWWhatsAppLink(addr: AWAddress): string {
  const msg = `📍 Mon adresse : *${addr.addressCode}*\n${addr.repere ? addr.repere + '\n' : ''}🔗 ${addr.shareLink}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export function getAWCreateLink(): string {
  return `${AW_SHARE_BASE}/creer`;
}

export function formatAWDisplay(code: string): string {
  return `📍 ${code.toUpperCase()}`;
}
