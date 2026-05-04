// Reverse geocoding via Nominatim (OpenStreetMap) - Gratuit, toute l'Afrique couverte

export interface GeocodingResult {
  ville: string;
  pays: string;
  quartier?: string;
  codeVille: string;
  displayName: string;
}

// Cache pour éviter les requêtes répétées
const geocodingCache = new Map<string, GeocodingResult>();

// Codes pays africains pour générer un code ville cohérent
const COUNTRY_CODES: Record<string, string> = {
  "Côte d'Ivoire": 'CI', 'Sénégal': 'SN', 'Nigeria': 'NG', 'Ghana': 'GH',
  'Kenya': 'KE', 'RDC': 'CD', "Congo": 'CG', 'Cameroun': 'CM', 'Mali': 'ML',
  'Burkina Faso': 'BF', 'Niger': 'NE', 'Guinée': 'GN', 'Bénin': 'BJ',
  'Togo': 'TG', 'Rwanda': 'RW', 'Uganda': 'UG', 'Tanzania': 'TZ',
  'Ethiopia': 'ET', 'Égypte': 'EG', 'Maroc': 'MA', 'Tunisie': 'TN',
  'Algérie': 'DZ', 'Afrique du Sud': 'ZA', 'Angola': 'AO', 'Mozambique': 'MZ',
  'Madagascar': 'MG', 'Zambie': 'ZM', 'Zimbabwe': 'ZW', 'Malawi': 'MW',
  'Botswana': 'BW', 'Namibie': 'NA', 'Gabon': 'GA', 'Tchad': 'TD',
  'Sudan': 'SD', 'Somalie': 'SO', 'Liberia': 'LR', 'Sierra Leone': 'SL',
  'Guinée-Bissau': 'GW', 'Cap-Vert': 'CV', 'Gambie': 'GM',
};

function generateCityCode(ville: string, pays: string): string {
  // Prendre les 3 premières lettres de la ville, en majuscules, sans accents
  const normalized = ville
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .substring(0, 3);
  return normalized.padEnd(3, 'X');
}

export async function getCityFromCoordinates(lat: number, lng: number): Promise<GeocodingResult> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  try {
    // Nominatim OpenStreetMap - CORS ok, gratuit, pas de clé API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
      {
        headers: {
          'User-Agent': 'AddressWeb/1.0 (adressage numerique Afrique)',
        },
      }
    );

    if (!response.ok) throw new Error('Nominatim error');

    const data = await response.json();
    const address = data.address || {};

    // Extraire la ville (plusieurs champs possibles selon le pays)
    const ville =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state_district ||
      'Ville inconnue';

    const pays = address.country || 'Afrique';
    const quartier = address.suburb || address.neighbourhood || address.district || undefined;

    const result: GeocodingResult = {
      ville,
      pays,
      quartier,
      codeVille: generateCityCode(ville, pays),
      displayName: quartier ? `${quartier}, ${ville}` : ville,
    };

    geocodingCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('Nominatim unavailable, fallback local:', error);
    // Fallback sur la détection locale si Nominatim échoue
    return fallbackDetection(lat, lng);
  }
}

// Fallback si pas de réseau
function fallbackDetection(lat: number, lng: number): GeocodingResult {
  const cities = [
    { name: 'Abidjan', pays: "Côte d'Ivoire", code: 'ABJ', minLat: 5.0, maxLat: 5.6, minLng: -4.5, maxLng: -3.7 },
    { name: 'Dakar', pays: 'Sénégal', code: 'DKR', minLat: 14.6, maxLat: 14.8, minLng: -17.5, maxLng: -17.3 },
    { name: 'Lagos', pays: 'Nigeria', code: 'LOS', minLat: 6.4, maxLat: 6.6, minLng: 3.3, maxLng: 3.5 },
    { name: 'Accra', pays: 'Ghana', code: 'ACC', minLat: 5.5, maxLat: 5.7, minLng: -0.3, maxLng: -0.1 },
    { name: 'Kinshasa', pays: 'RDC', code: 'KIN', minLat: -4.4, maxLat: -4.2, minLng: 15.2, maxLng: 15.4 },
    { name: 'Nairobi', pays: 'Kenya', code: 'NBO', minLat: -1.4, maxLat: -1.2, minLng: 36.7, maxLng: 36.9 },
    { name: 'Bamako', pays: 'Mali', code: 'BAM', minLat: 12.5, maxLat: 12.8, minLng: -8.2, maxLng: -7.8 },
    { name: 'Ouagadougou', pays: 'Burkina Faso', code: 'OUA', minLat: 12.2, maxLat: 12.5, minLng: -1.7, maxLng: -1.3 },
    { name: 'Douala', pays: 'Cameroun', code: 'DLA', minLat: 3.8, maxLat: 4.1, minLng: 9.6, maxLng: 9.9 },
    { name: 'Yaoundé', pays: 'Cameroun', code: 'YAO', minLat: 3.7, maxLat: 4.0, minLng: 11.4, maxLng: 11.7 },
    { name: 'Lomé', pays: 'Togo', code: 'LOM', minLat: 6.1, maxLat: 6.2, minLng: 1.1, maxLng: 1.3 },
    { name: 'Cotonou', pays: 'Bénin', code: 'COT', minLat: 6.3, maxLat: 6.5, minLng: 2.3, maxLng: 2.5 },
    { name: 'Conakry', pays: 'Guinée', code: 'CKY', minLat: 9.5, maxLat: 9.7, minLng: -13.8, maxLng: -13.5 },
    { name: 'Addis-Abeba', pays: 'Ethiopie', code: 'ADD', minLat: 8.9, maxLat: 9.1, minLng: 38.6, maxLng: 38.9 },
    { name: 'Casablanca', pays: 'Maroc', code: 'CAS', minLat: 33.5, maxLat: 33.7, minLng: -7.7, maxLng: -7.5 },
    { name: 'Le Caire', pays: 'Égypte', code: 'CAI', minLat: 30.0, maxLat: 30.2, minLng: 31.2, maxLng: 31.4 },
  ];

  const city = cities.find(
    c => lat >= c.minLat && lat <= c.maxLat && lng >= c.minLng && lng <= c.maxLng
  );

  if (city) {
    return { ville: city.name, pays: city.pays, codeVille: city.code, displayName: city.name };
  }

  return { ville: 'Afrique', pays: 'Afrique', codeVille: 'AFR', displayName: 'Afrique' };
}
