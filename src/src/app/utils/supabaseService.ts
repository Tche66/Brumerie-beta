import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://TON_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'TA_ANON_KEY';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// TYPES
// ============================================================
export interface Address {
  id: string;
  addressCode: string;
  latitude: number;
  longitude: number;
  repere: string;
  ville: string;
  pays?: string;
  quartier?: string;
  userId?: string | null;
  isPublic?: boolean;
  viewCount?: number;
  photos?: string[];
  categorie?: string;
  isVerified?: boolean;
  verifiedCount?: number;
  createdAt: string;
}

export interface Profile {
  id: string;
  email?: string;
  nom?: string;
  telephone?: string;
  photoUrl?: string;
  profession?: string;
  bio?: string;
  role?: string;
  adressesCount?: number;
  createdAt?: string;
}

function dbToAddress(row: any): Address {
  return {
    id: row.id,
    addressCode: row.address_code,
    latitude: row.latitude,
    longitude: row.longitude,
    repere: row.repere || '',
    ville: row.ville,
    pays: row.pays,
    quartier: row.quartier,
    userId: row.user_id,
    isPublic: row.is_public,
    viewCount: row.view_count,
    photos: row.photos || [],
    categorie: row.categorie || 'autre',
    isVerified: row.is_verified || false,
    verifiedCount: row.verified_count || 0,
    createdAt: row.created_at,
  };
}

function dbToProfile(row: any): Profile {
  return {
    id: row.id,
    email: row.email,
    nom: row.nom,
    telephone: row.telephone,
    photoUrl: row.photo_url,
    profession: row.profession,
    bio: row.bio,
    role: row.role,
    adressesCount: row.adresses_count,
    createdAt: row.created_at,
  };
}

// ============================================================
// ADDRESSES
// ============================================================
export async function saveAddress(data: {
  addressCode: string;
  latitude: number;
  longitude: number;
  repere: string;
  ville: string;
  pays?: string;
  quartier?: string;
  isPublic?: boolean;
  categorie?: string;
}): Promise<Address> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Vous devez être connecté pour créer une adresse');

  const { data: row, error } = await supabase
    .from('addresses')
    .insert({
      address_code: data.addressCode,
      latitude: data.latitude,
      longitude: data.longitude,
      repere: data.repere,
      ville: data.ville,
      pays: data.pays || 'Afrique',
      quartier: data.quartier || null,
      user_id: user.id,
      is_public: data.isPublic !== false,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur sauvegarde: ${error.message}`);

  return dbToAddress(row);
}

export async function getAddressByCode(code: string): Promise<Address | null> {
  const { data: row, error } = await supabase
    .from('addresses').select('*').eq('address_code', code).single();
  if (error || !row) return null;
  supabase.rpc('increment_view_count', { address_code_param: code }).then(() => {});
  return dbToAddress(row);
}

export async function getAllAddresses(limit = 50): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses').select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).map(dbToAddress);
}

export async function getMapAddresses(): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses').select('id,address_code,latitude,longitude,repere,ville,categorie,photos')
    .eq('is_public', true).limit(500);
  if (error) return [];
  return (data || []).map(dbToAddress);
}

export async function getUserAddresses(): Promise<Address[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('addresses').select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map(dbToAddress);
}

export async function updateAddress(id: string, updates: {
  repere?: string; ville?: string; quartier?: string;
  isPublic?: boolean; categorie?: string; repere_description?: string;
}): Promise<boolean> {
  const mapped: any = {};
  if (updates.repere !== undefined) mapped.repere = updates.repere;
  if (updates.ville !== undefined) mapped.ville = updates.ville;
  if (updates.quartier !== undefined) mapped.quartier = updates.quartier;
  if (updates.isPublic !== undefined) mapped.is_public = updates.isPublic;
  if (updates.categorie !== undefined) mapped.categorie = updates.categorie;
  const { error } = await supabase.from('addresses').update(mapped).eq('id', id);
  return !error;
}

export async function deleteAddress(id: string): Promise<boolean> {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  return !error;
}

export async function searchAddresses(query: string, limit = 30): Promise<Address[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];
  const { data, error } = await supabase
    .from('addresses').select('*')
    .or(`address_code.ilike.%${q}%,repere.ilike.%${q}%,ville.ilike.%${q}%`)
    .eq('is_public', true).limit(10)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map(dbToAddress);
}

// ============================================================
// PHOTOS — Upload Supabase Storage
// ============================================================
export async function uploadAddressPhoto(addressId: string, file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Connexion requise');

  const ext = file.name.split('.').pop();
  const filename = `${user.id}/${addressId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('address-photos')
    .upload(filename, file, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(`Upload échoué: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from('address-photos')
    .getPublicUrl(filename);

  const photoUrl = urlData.publicUrl;

  // Ajouter l'URL dans le tableau photos de l'adresse
  const { data: current } = await supabase
    .from('addresses').select('photos').eq('id', addressId).single();
  const currentPhotos: string[] = current?.photos || [];

  await supabase.from('addresses')
    .update({ photos: [...currentPhotos, photoUrl] })
    .eq('id', addressId);

  return photoUrl;
}

export async function deleteAddressPhoto(addressId: string, photoUrl: string): Promise<boolean> {
  const { data: current } = await supabase
    .from('addresses').select('photos').eq('id', addressId).single();
  const updated = (current?.photos || []).filter((p: string) => p !== photoUrl);
  const { error } = await supabase.from('addresses')
    .update({ photos: updated }).eq('id', addressId);
  return !error;
}

// ============================================================
// PROFIL
// ============================================================
export async function getProfile(userId?: string): Promise<Profile | null> {
  const id = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!id) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error || !data) return null;
  return dbToProfile(data);
}

export async function updateProfile(updates: {
  nom?: string; telephone?: string; profession?: string; bio?: string; isPublicDefault?: boolean;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const mapped: Record<string, any> = {};
  if (updates.nom !== undefined) mapped.nom = updates.nom;
  if (updates.telephone !== undefined) mapped.telephone = updates.telephone;
  if (updates.profession !== undefined) mapped.profession = updates.profession;
  if (updates.bio !== undefined) mapped.bio = updates.bio;
  if (Object.keys(mapped).length === 0) return true;
  const { error } = await supabase.from('profiles').update(mapped).eq('id', user.id);
  if (error) throw new Error(error.message);
  return !error;
}

export async function uploadProfilePhoto(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Connexion requise');
  const ext = file.name.split('.').pop();
  const filename = `${user.id}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from('address-photos').upload(filename, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('address-photos').getPublicUrl(filename);
  await supabase.from('profiles').update({ photo_url: data.publicUrl }).eq('id', user.id);
  return data.publicUrl;
}

// ============================================================
// AUTH
// ============================================================
export async function signUp(email: string, password: string, nom?: string, profession?: string) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { nom, profession } },
  });
  if (error) throw error;
  // Mettre à jour profil avec profession si fournie
  if (data.user && profession) {
    await supabase.from('profiles')
      .update({ nom, profession })
      .eq('id', data.user.id);
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/profil`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw new Error(error.message);
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function changePassword(newPassword: string): Promise<boolean> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return !error;
}

// ============================================================
// UTILITAIRES
// ============================================================
export function generateAddressCode(codeVille: string): string {
  const code = codeVille.substring(0, 3).toUpperCase().padEnd(3, 'X');
  const uniqueId = Math.floor(10000 + Math.random() * 90000);
  return `AW-${code}-${uniqueId}`;
}

export function getShareLink(addressCode: string): string {
  return `${window.location.origin}/${addressCode}`;
}

export function getGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function getWhatsAppLink(addressCode: string, repere: string): string {
  const link = getShareLink(addressCode);
  const message = `Mon adresse Address-Web: *${addressCode}*\n📍 ${repere}\n🔗 ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}

// ============================================================
// VÉRIFICATION COMMUNAUTAIRE
// ============================================================

export async function verifyAddress(addressId: string): Promise<{ success: boolean; newCount: number; isVerified: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Connexion requise pour vérifier une adresse');

  // Vérifier si déjà voté
  const { data: existing } = await supabase
    .from('verifications')
    .select('id')
    .eq('address_id', addressId)
    .eq('user_id', user.id)
    .single();

  if (existing) throw new Error('Vous avez déjà vérifié cette adresse');

  const { error } = await supabase.from('verifications').insert({
    address_id: addressId,
    user_id: user.id,
  });

  if (error) throw new Error(error.message);

  // Récupérer le nouveau count
  const { data: addr } = await supabase
    .from('addresses')
    .select('verified_count, is_verified')
    .eq('id', addressId)
    .single();

  return {
    success: true,
    newCount: addr?.verified_count || 1,
    isVerified: addr?.is_verified || false,
  };
}

export async function hasUserVerified(addressId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('verifications')
    .select('id')
    .eq('address_id', addressId)
    .eq('user_id', user.id)
    .single();
  return !!data;
}

// ============================================================
// API KEYS
// ============================================================

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'aw_live_';
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createApiKey(name = 'Clé principale'): Promise<{ key: string; prefix: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Connexion requise');

  // Vérifier si une clé existe déjà
  const { data: existing } = await supabase
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (existing && existing.length >= 3) throw new Error('Maximum 3 clés API par compte');

  const key = generateApiKey();
  const keyHash = await hashKey(key);
  const keyPrefix = key.substring(0, 16) + '...';

  // Récupérer le plan de l'utilisateur
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
  const plan = profile?.plan || 'free';
  const dailyLimit = plan === 'enterprise' ? -1 : plan === 'premium_annual' || plan === 'premium_lifetime' ? 10000 : 100;

  const { error } = await supabase.from('api_keys').insert({
    user_id: user.id,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    name,
    plan,
    daily_limit: dailyLimit,
  });

  if (error) throw new Error(error.message);
  return { key, prefix: keyPrefix };
}

export async function getApiKeys(): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('api_keys')
    .select('id, key_prefix, name, plan, requests_today, requests_total, daily_limit, is_active, last_used_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function revokeApiKey(keyId: string): Promise<boolean> {
  const { error } = await supabase.from('api_keys').update({ is_active: false }).eq('id', keyId);
  return !error;
}

export async function getApiStats(): Promise<{ today: number; total: number; topEndpoints: any[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { today: 0, total: 0, topEndpoints: [] };

  const { data: keys } = await supabase
    .from('api_keys')
    .select('requests_today, requests_total')
    .eq('user_id', user.id);

  const today = (keys || []).reduce((sum, k) => sum + (k.requests_today || 0), 0);
  const total = (keys || []).reduce((sum, k) => sum + (k.requests_total || 0), 0);

  return { today, total, topEndpoints: [] };
}

// ============================================================
// PLANS PREMIUM
// ============================================================

export async function getUserPlan(): Promise<{ plan: string; expiresAt: string | null; isActive: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { plan: 'free', expiresAt: null, isActive: false };

  const { data } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single();

  if (!data) return { plan: 'free', expiresAt: null, isActive: false };

  const isActive = data.plan === 'free' ||
    data.plan === 'premium_lifetime' ||
    (data.plan_expires_at && new Date(data.plan_expires_at) > new Date());

  return {
    plan: data.plan || 'free',
    expiresAt: data.plan_expires_at,
    isActive: !!isActive,
  };
}

// Admin seulement — activer un plan manuellement après paiement
export async function activatePlan(userId: string, plan: string, months?: number): Promise<boolean> {
  const expiresAt = plan === 'premium_lifetime' ? null :
    new Date(Date.now() + (months || 12) * 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('profiles').update({
    plan,
    plan_expires_at: expiresAt,
  }).eq('id', userId);

  return !error;
}

// ============================================================
// ADRESSES INITIALES (seed 50 adresses pour le lancement)
// ============================================================

export async function seedInitialPublicAddresses(): Promise<number> {
  const { data: existing } = await supabase
    .from('addresses')
    .select('id', { count: 'exact', head: true });

  // Ne pas seeder si déjà des adresses
  if ((existing as any)?.length > 0) return 0;

  const seeds = [
    { lat: 5.3600, lng: -4.0083, repere: 'Carrefour Sainte Marie, feu tricolore', ville: 'Abidjan', quartier: 'Cocody', code: 'AW-ABI-10001' },
    { lat: 5.3456, lng: -3.9987, repere: 'Marché de Treichville, entrée principale', ville: 'Abidjan', quartier: 'Treichville', code: 'AW-ABI-10002' },
    { lat: 5.3712, lng: -4.0234, repere: 'Centre commercial Playce Marcory', ville: 'Abidjan', quartier: 'Marcory', code: 'AW-ABI-10003' },
    { lat: 5.3298, lng: -4.0156, repere: 'Hôtel Ivotel, entrée secondaire', ville: 'Abidjan', quartier: 'Plateau', code: 'AW-ABI-10004' },
    { lat: 5.3890, lng: -3.9756, repere: 'Université FHB, portail nord', ville: 'Abidjan', quartier: 'Cocody', code: 'AW-ABI-10005' },
    { lat: 14.6937, lng: -17.4441, repere: 'Marché Sandaga, côté est', ville: 'Dakar', quartier: 'Médina', code: 'AW-DAK-10001' },
    { lat: 14.7167, lng: -17.4677, repere: 'Aéroport international LSS', ville: 'Dakar', quartier: 'Yoff', code: 'AW-DAK-10002' },
    { lat: 6.4531, lng: 3.3958, repere: 'Eko Hotel & Suites, Victoria Island', ville: 'Lagos', quartier: 'Victoria Island', code: 'AW-LAG-10001' },
    { lat: 6.5244, lng: 3.3792, repere: 'Computer Village Ikeja', ville: 'Lagos', quartier: 'Ikeja', code: 'AW-LAG-10002' },
    { lat: 5.6037, lng: -0.1870, repere: 'Accra Mall, entrée principale', ville: 'Accra', quartier: 'Spintex', code: 'AW-ACC-10001' },
  ];

  let created = 0;
  for (const s of seeds) {
    const { error } = await supabase.from('addresses').insert({
      address_code: s.code,
      latitude: s.lat,
      longitude: s.lng,
      repere: s.repere,
      ville: s.ville,
      quartier: s.quartier,
      pays: s.ville === 'Abidjan' ? "Côte d'Ivoire" : s.ville === 'Dakar' ? 'Sénégal' : s.ville === 'Lagos' ? 'Nigeria' : 'Ghana',
      is_public: true,
      is_verified: true,
      verified_count: 5,
      user_id: null,
    });
    if (!error) created++;
  }
  return created;
}
