// src/services/userService.ts — v2 hybride NestJS + Firestore
import {
  doc, getDoc, updateDoc, collection, query,
  where, getDocs, limit, orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { User } from '@/types';
import { usersApi } from './apiClient';

// ── Récupérer un user par ID ──────────────────────────────────────
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id, uid: snap.id } as User;
  } catch { return null; }
}

// ── Mettre à jour le profil — Firestore + Neon ────────────────────
export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
  await updateDoc(doc(db, 'users', userId), updates as any);
  usersApi.updateMe(updates as any).catch(() => {});
}

// ── Upload photo de profil ────────────────────────────────────────
export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  const photoRef = ref(storage, `avatars/${userId}`);
  await uploadBytes(photoRef, file);
  const url = await getDownloadURL(photoRef);
  await updateDoc(doc(db, 'users', userId), { photoURL: url });
  usersApi.updateMe({ photoURL: url }).catch(() => {});
  return url;
}

// ── Incrémenter les ventes ────────────────────────────────────────
export async function incrementSalesCount(userId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return;
  const current = snap.data().salesCount || 0;
  await updateDoc(doc(db, 'users', userId), { salesCount: current + 1 });
}

// ── Badge vérifié (admin) ─────────────────────────────────────────
export async function toggleVerifiedBadge(userId: string, isVerified: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { isVerified });
}

// ── Tous les vendeurs actifs ──────────────────────────────────────
export async function getAllActiveSellers(): Promise<User[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['seller', 'both'])));
  return snap.docs.map(d => ({ ...d.data(), id: d.id, uid: d.id } as User));
}

// ── Suggestions de vendeurs ───────────────────────────────────────
export async function getSuggestedSellers(
  currentUserId?: string,
  followingIds: string[] = [],
  userNeighborhood?: string,
  maxResults = 6,
): Promise<User[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'seller'), limit(50)));
  const exclude = new Set([...(followingIds || []), currentUserId || '']);
  const now = Date.now();

  let sellers = snap.docs
    .map(d => ({ ...d.data(), id: d.id, uid: d.id } as User))
    .filter(s => !exclude.has(s.id) && s.photoURL && s.name)
    .map(s => {
      let score = 0;
      if (userNeighborhood && s.neighborhood === userNeighborhood) score += 3;
      if (s.isVerified) score += 2;
      score += Math.min((s.followerCount || 0) / 10, 3);
      const lastActive = (s as any).lastActiveAt?.toMillis?.() || (s as any).lastActiveAt?.seconds * 1000 || 0;
      if (lastActive && now - lastActive < 7 * 24 * 60 * 60 * 1000) score += 1;
      (s as any)._score = score;
      return s;
    });

  sellers.sort((a, b) => ((b as any)._score || 0) - ((a as any)._score || 0));
  return sellers.slice(0, maxResults);
}

// ── Chercher par téléphone ────────────────────────────────────────
export async function getUserByPhone(phone: string): Promise<User | null> {
  try {
    const clean = phone.replace(/\D/g, '');
    const variants = [clean, '0' + clean.slice(-8), '+225' + clean.slice(-8), '225' + clean.slice(-8)];
    for (const v of variants) {
      const snap = await getDocs(query(collection(db, 'users'), where('phone', '==', v), limit(1)));
      if (!snap.empty) return { id: snap.docs[0].id, uid: snap.docs[0].id, ...snap.docs[0].data() } as User;
    }
    return null;
  } catch { return null; }
}

// ── Historique vu récemment ───────────────────────────────────────
export async function addRecentlyViewed(userId: string, productId: string): Promise<void> {
  if (!userId || !productId) return;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    const current: string[] = snap.data()?.recentlyViewedIds || [];
    const updated = [productId, ...current.filter(id => id !== productId)].slice(0, 20);
    await updateDoc(doc(db, 'users', userId), { recentlyViewedIds: updated });
    usersApi.updateMe({ recentlyViewedIds: updated } as any).catch(() => {});
  } catch {}
}

export async function getRecentlyViewedProducts(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.data()?.recentlyViewedIds || [];
  } catch { return []; }
}

// ── Recherche vendeurs — backend NestJS avec fallback Firestore ───
export async function searchSellers(nameQuery: string, limitCount = 10): Promise<User[]> {
  if (!nameQuery.trim()) return [];
  try {
    // Essayer backend NestJS d'abord
    const results = await usersApi.search(nameQuery) as User[];
    if (results.length > 0) return results.slice(0, limitCount);
  } catch {}

  // Fallback Firestore
  try {
    const q = nameQuery.trim().toLowerCase();
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'seller'), limit(300)));
    const results = snap.docs
      .map(d => ({ id: d.id, uid: d.id, ...d.data() }) as User)
      .filter(u => u.name?.toLowerCase().includes(q))
      .slice(0, limitCount);
    if (results.length > 0) return results;

    const snapAll = await getDocs(query(collection(db, 'users'), limit(300)));
    return snapAll.docs
      .map(d => ({ id: d.id, uid: d.id, ...d.data() }) as User)
      .filter(u => u.name?.toLowerCase().includes(q))
      .slice(0, limitCount);
  } catch { return []; }
}

// ── Recherche tous les users (mentions @) ─────────────────────────
export async function searchAllUsers(nameQuery: string, limitCount = 8): Promise<User[]> {
  if (!nameQuery.trim()) return [];
  try {
    const results = await usersApi.search(nameQuery) as User[];
    if (results.length > 0) return results.slice(0, limitCount);
  } catch {}

  try {
    const q = nameQuery.trim().toLowerCase();
    const snap = await getDocs(query(collection(db, 'users'), limit(300)));
    return snap.docs
      .map(d => ({ id: d.id, uid: d.id, ...d.data() }) as User)
      .filter(u => u.name?.toLowerCase().includes(q))
      .slice(0, limitCount);
  } catch { return []; }
}

// ── Présence ──────────────────────────────────────────────────────
export async function updatePresence(userId: string): Promise<void> {
  updateDoc(doc(db, 'users', userId), { lastActiveAt: new Date() }).catch(() => {});
  usersApi.updatePresence().catch(() => {});
}
