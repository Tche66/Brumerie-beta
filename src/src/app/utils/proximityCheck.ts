import { supabase } from './supabaseService';

// Distance en mètres entre 2 coordonnées GPS (formule Haversine)
export function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface NearbyAddress {
  id: string;
  address_code: string;
  latitude: number;
  longitude: number;
  repere: string;
  ville: string;
  quartier: string | null;
  categorie: string | null;
  user_id: string;
  distanceMeters: number;
}

/**
 * Cherche les adresses existantes dans un rayon donné (défaut 5m)
 * Utilise un bounding-box SQL puis filtre précisément côté client
 */
export async function findNearbyAddresses(
  lat: number,
  lon: number,
  radiusMeters = 5
): Promise<NearbyAddress[]> {
  // 1° de latitude ≈ 111 000 m
  const delta = radiusMeters / 111000;

  const { data, error } = await supabase
    .from('addresses')
    .select('id, address_code, latitude, longitude, repere, ville, quartier, categorie, user_id')
    .gte('latitude',  lat - delta)
    .lte('latitude',  lat + delta)
    .gte('longitude', lon - delta)
    .lte('longitude', lon + delta)
    .limit(20);

  if (error || !data) return [];

  // Filtrer précisément avec Haversine
  return data
    .map(a => ({
      ...a,
      distanceMeters: Math.round(haversineMeters(lat, lon, a.latitude, a.longitude))
    }))
    .filter(a => a.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
