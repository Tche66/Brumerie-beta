// src/services/bookmarkService.ts
// ✅ Favoris stockés dans users/{uid}.bookmarkedProductIds
// Utilise la collection "users" qui existe déjà → zéro problème de règles Firestore

import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, increment } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { createNotification } from './notificationService';
import { showLocalPushNotification } from './pushService';

const userRef = (uid: string) => doc(db, 'users', uid);

export async function getBookmarks(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const snap = await getDoc(userRef(userId));
    if (!snap.exists()) return [];
    return snap.data()?.bookmarkedProductIds || [];
  } catch (err) {
    console.error('[Bookmarks] getBookmarks:', err);
    return [];
  }
}

export async function addBookmark(
  userId: string,
  productId: string,
  productInfo?: { sellerId: string; title: string; buyerName: string },
): Promise<boolean> {
  if (!userId || !productId) return false;
  try {
    await updateDoc(userRef(userId), {
      bookmarkedProductIds: arrayUnion(productId),
    });
    // Incrémenter le compteur favori sur le produit (visible par tous)
    try {
      await updateDoc(doc(db, 'products', productId), { bookmarkCount: increment(1) });
    } catch { /* silencieux — pas bloquant */ }

    // Notifier le vendeur si infos disponibles
    if (productInfo?.sellerId && productInfo.sellerId !== userId) {
      await createNotification(
        productInfo.sellerId,
        'favorite',
        '❤️ Nouveau favori !',
        `${productInfo.buyerName} a mis "${productInfo.title}" en favori`,
        { productId },
      );
      await showLocalPushNotification(
        '❤️ Nouveau favori !',
        `${productInfo.buyerName} a mis "${productInfo.title}" en favori`,
        { productId, type: 'favorite' },
      );
    }
    return true;
  } catch (err) {
    console.error('[Bookmarks] addBookmark:', err);
    return false;
  }
}

export async function removeBookmark(userId: string, productId: string): Promise<boolean> {
  if (!userId || !productId) return false;
  try {
    await updateDoc(userRef(userId), {
      bookmarkedProductIds: arrayRemove(productId),
    });
    // Décrémenter le compteur favori
    try {
      await updateDoc(doc(db, 'products', productId), { bookmarkCount: increment(-1) });
    } catch { /* silencieux */ }
    return true;
  } catch (err) {
    console.error('[Bookmarks] removeBookmark:', err);
    return false;
  }
}
