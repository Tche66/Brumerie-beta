// src/services/bookmarkService.ts — v2 hybride NestJS + Firestore
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, increment } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { productsApi } from './apiClient';
import { createNotification } from './notificationService';
import { showLocalPushNotification } from './pushService';

const userRef = (uid: string) => doc(db, 'users', uid);

// ── Récupérer les bookmarks ───────────────────────────────────────
export async function getBookmarks(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    // Essayer Neon d'abord
    const products = await productsApi.getBookmarks() as any[];
    if (products?.length >= 0) return products.map((p: any) => p.id || p.firebaseId || p.productId);
  } catch {}
  // Fallback Firestore
  try {
    const snap = await getDoc(userRef(userId));
    if (!snap.exists()) return [];
    return snap.data()?.bookmarkedProductIds || [];
  } catch { return []; }
}

// ── Ajouter un bookmark ───────────────────────────────────────────
export async function addBookmark(
  userId: string,
  productId: string,
  productInfo?: { sellerId: string; title: string; buyerName: string },
): Promise<boolean> {
  if (!userId || !productId) return false;
  try {
    // Firestore — source de vérité UI
    await updateDoc(userRef(userId), { bookmarkedProductIds: arrayUnion(productId) });
    updateDoc(doc(db, 'products', productId), { bookmarkCount: increment(1) }).catch(() => {});

    // Sync Neon en background
    productsApi.toggleBookmark(productId).catch(() => {});

    // Notifier le vendeur
    if (productInfo?.sellerId && productInfo.sellerId !== userId) {
      createNotification(productInfo.sellerId, 'favorite',
        '❤️ Nouveau favori !',
        `${productInfo.buyerName} a mis "${productInfo.title}" en favori`,
        { productId }
      ).catch(() => {});
      showLocalPushNotification('❤️ Nouveau favori !',
        `${productInfo.buyerName} a mis "${productInfo.title}" en favori`,
        { productId, type: 'favorite' }
      ).catch(() => {});
    }
    return true;
  } catch { return false; }
}

// ── Supprimer un bookmark ─────────────────────────────────────────
export async function removeBookmark(userId: string, productId: string): Promise<boolean> {
  if (!userId || !productId) return false;
  try {
    await updateDoc(userRef(userId), { bookmarkedProductIds: arrayRemove(productId) });
    updateDoc(doc(db, 'products', productId), { bookmarkCount: increment(-1) }).catch(() => {});
    productsApi.toggleBookmark(productId).catch(() => {});
    return true;
  } catch { return false; }
}
