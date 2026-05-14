// src/services/userService.ts
import { doc, getDoc, updateDoc, collection, query, where, getDocs, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { User } from '@/types';

/**
 * Récupérer un utilisateur par ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;

    return { ...userDoc.data(), id: userDoc.id, uid: userDoc.id } as User;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Mettre à jour le profil utilisateur
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), updates);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Upload photo de profil
 */
export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  try {
    const photoRef = ref(storage, `avatars/${userId}`);
    await uploadBytes(photoRef, file);
    const url = await getDownloadURL(photoRef);

    // Mettre à jour l'URL dans Firestore
    await updateDoc(doc(db, 'users', userId), {
      photoURL: url,
    });

    return url;
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
}

/**
 * Incrémenter le compteur de ventes (manuel admin)
 */
export async function incrementSalesCount(userId: string): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const currentCount = userDoc.data().salesCount || 0;
      await updateDoc(doc(db, 'users', userId), {
        salesCount: currentCount + 1,
      });
    }
  } catch (error) {
    console.error('Error incrementing sales count:', error);
    throw error;
  }
}

/**
 * Activer/Désactiver badge vérifié (admin)
 */
export async function toggleVerifiedBadge(userId: string, isVerified: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isVerified,
    });
  } catch (error) {
    console.error('Error toggling verified badge:', error);
    throw error;
  }
}

// ── Récupérer tous les vendeurs actifs (pour sélecteur livreur) ──
export async function getAllActiveSellers(): Promise<User[]> {
  const { collection, getDocs, query, where } = await import('firebase/firestore');
  const { db } = await import('@/config/firebase');
  const snap = await getDocs(query(
    collection(db, 'users'),
    where('role', 'in', ['seller', 'both']),
  ));
  return snap.docs.map(d => ({ ...d.data(), id: d.id, uid: d.id } as User));
}

// ── Suggestions de vendeurs à suivre ──
export async function getSuggestedSellers(
  currentUserId?: string,
  followingIds: string[] = [],
  userNeighborhood?: string,
  maxResults = 6,
): Promise<User[]> {
  const { collection, getDocs, query, where, orderBy, limit: fbLimit } = await import('firebase/firestore');
  const { db } = await import('@/config/firebase');
  const snap = await getDocs(query(
    collection(db, 'users'),
    where('role', '==', 'seller'),
    fbLimit(50),
  ));
  const exclude = new Set([...(followingIds || []), currentUserId || '']);
  let sellers = snap.docs
    .map(d => ({ ...d.data(), id: d.id, uid: d.id } as User))
    .filter(s => !exclude.has(s.id) && s.photoURL && s.name);

  // Scoring : quartier match +3, vérifié +2, followerCount, activité récente +1
  const now = Date.now();
  sellers = sellers.map(s => {
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

// Chercher un utilisateur par numéro de téléphone
export async function getUserByPhone(phone: string): Promise<User | null> {
  try {
    const clean = phone.replace(/\D/g, '');
    const variants = [clean, '0' + clean.slice(-8), '+225' + clean.slice(-8), '225' + clean.slice(-8)];
    for (const v of variants) {
      const q = query(collection(db, 'users'), where('phone', '==', v), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, uid: d.id, ...d.data() } as User;
      }
    }
    return null;
  } catch { return null; }
}

// ── Historique "Vu récemment" ──────────────────────────────
export async function addRecentlyViewed(userId: string, productId: string): Promise<void> {
  if (!userId || !productId) return;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    const current: string[] = snap.data()?.recentlyViewedIds || [];
    // Retirer si déjà présent + ajouter en tête + limiter à 20
    const updated = [productId, ...current.filter(id => id !== productId)].slice(0, 20);
    await updateDoc(userRef, { recentlyViewedIds: updated });
  } catch {}
}

export async function getRecentlyViewedProducts(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.data()?.recentlyViewedIds || [];
  } catch { return []; }
}

// ── Recherche de vendeurs par nom ──────────────────────────
export async function searchSellers(nameQuery: string, limitCount: number = 10): Promise<User[]> {
  if (!nameQuery.trim()) return [];
  const q = nameQuery.trim().toLowerCase();
  try {
    // Stratégie 1 : chercher par role === 'seller'
    const snap = await getDocs(
      query(collection(db, 'users'),
        where('role', '==', 'seller'),
        limit(300)
      )
    );
    const results = snap.docs
      .map(d => ({ id: d.id, uid: d.id, ...d.data() }) as User)
      .filter(u => u.name?.toLowerCase().includes(q))
      .slice(0, limitCount);

    if (results.length > 0) return results;

    // Fallback : chercher parmi tous les users (si role non défini)
    const snapAll = await getDocs(query(collection(db, 'users'), limit(300)));
    return snapAll.docs
      .map(d => ({ id: d.id, uid: d.id, ...d.data() }) as User)
      .filter(u => u.name?.toLowerCase().includes(q))
      .slice(0, limitCount);
  } catch {
    return [];
  }
}

// Recherche de tous les utilisateurs (pour mentions @)
export async function searchAllUsers(nameQuery: string, limitCount: number = 8): Promise<User[]> {
  if (!nameQuery.trim()) return [];
  const q = nameQuery.trim().toLowerCase();
  try {
    const snap = await getDocs(query(collection(db, 'users'), limit(300)));
    return snap.docs
      .map(d => ({ id: d.id, uid: d.id, ...d.data() }) as User)
      .filter(u => u.name?.toLowerCase().includes(q))
      .slice(0, limitCount);
  } catch { return []; }
}
