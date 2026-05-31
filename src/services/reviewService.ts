// src/services/reviewService.ts — migré vers backend NestJS
import { trustApi } from './apiClient';
import { query, where, getDocs, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Review, RatingRole } from '@/types';

// ── Soumettre un avis ─────────────────────────────────────────────
export async function submitReview(params: {
  orderId: string; productId: string; productTitle: string;
  fromUserId: string; fromUserName: string; fromUserPhoto?: string;
  fromUserNeighborhood?: string;
  toUserId: string; role: RatingRole; rating: number; comment: string;
}): Promise<void> {
  await trustApi.createReview({
    orderId:             params.orderId,
    productId:           params.productId,
    productTitle:        params.productTitle,
    toUserId:            params.toUserId,
    role:                params.role,
    rating:              params.rating,
    comment:             params.comment,
    fromUserNeighborhood: params.fromUserNeighborhood,
  });
}

// ── Vérifier si déjà noté ─────────────────────────────────────────
export async function hasReviewed(orderId: string, fromUserId: string): Promise<boolean> {
  try {
    const snap = await getDocs(query(
      collection(db, 'reviews'),
      where('orderId', '==', orderId),
      where('fromUserId', '==', fromUserId),
    ));
    return !snap.empty;
  } catch { return false; }
}

// ── Avis d'un vendeur — realtime via Firestore ────────────────────
export function subscribeSellerReviews(
  sellerId: string,
  callback: (reviews: Review[], avgRating: number, count: number) => void,
): () => void {
  const q = query(
    collection(db, 'reviews'),
    where('toUserId', '==', sellerId),
    where('role', '==', 'buyer_to_seller'),
  );
  return onSnapshot(q, snap => {
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
    reviews.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    const count = reviews.length;
    const avg = count > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;
    callback(reviews, avg, count);
  }, () => callback([], 0, 0));
}

// ── Avis d'un livreur — realtime via Firestore ────────────────────
export function subscribeDelivererReviews(
  delivererId: string,
  callback: (reviews: Review[], avgRating: number, count: number) => void,
): () => void {
  const q = query(collection(db, 'reviews'), where('toUserId', '==', delivererId));
  return onSnapshot(q, snap => {
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
    reviews.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    const count = reviews.length;
    const avg = count > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;
    callback(reviews, avg, count);
  }, () => callback([], 0, 0));
}
