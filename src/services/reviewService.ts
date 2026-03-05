// src/services/reviewService.ts — Sprint 7 fix
import {
  collection, addDoc, query, where, getDocs,
  onSnapshot, serverTimestamp, updateDoc, doc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Review, RatingRole } from '@/types';

const reviewsCol = collection(db, 'reviews');

export async function submitReview(params: {
  orderId: string; productId: string; productTitle: string;
  fromUserId: string; fromUserName: string; fromUserPhoto?: string;
  toUserId: string; role: RatingRole; rating: number; comment: string;
}): Promise<void> {
  // Vérifier doublon
  const existing = await getDocs(query(reviewsCol,
    where('orderId', '==', params.orderId),
    where('fromUserId', '==', params.fromUserId),
  ));
  if (!existing.empty) throw new Error('Vous avez déjà noté cette commande.');

  // Nettoyer undefined — Firestore rejette les valeurs undefined
  const reviewData: Record<string, any> = {
    orderId: params.orderId,
    productId: params.productId,
    productTitle: params.productTitle,
    fromUserId: params.fromUserId,
    fromUserName: params.fromUserName,
    toUserId: params.toUserId,
    role: params.role,
    rating: params.rating,
    comment: params.comment,
    createdAt: serverTimestamp(),
  };
  if (params.fromUserPhoto) reviewData.fromUserPhoto = params.fromUserPhoto;

  await addDoc(reviewsCol, reviewData);

  // Marquer la commande comme notée
  try {
    const orderField = params.role === 'buyer_to_seller' ? 'buyerReviewed' : 'sellerReviewed';
    await updateDoc(doc(db, 'orders', params.orderId), { [orderField]: true });
  } catch { /* silencieux */ }

  // Mettre à jour la moyenne — seulement si l'utilisateur est le vendeur lui-même
  // (les règles bloquent l'écriture sur users/{autreId})
  // La moyenne est recalculée en temps réel via subscribeSellerReviews + calcul côté client
}

export async function hasReviewed(orderId: string, fromUserId: string): Promise<boolean> {
  try {
    const snap = await getDocs(query(reviewsCol,
      where('orderId', '==', orderId),
      where('fromUserId', '==', fromUserId),
    ));
    return !snap.empty;
  } catch { return false; }
}

export function subscribeSellerReviews(
  sellerId: string,
  callback: (reviews: Review[], avgRating: number, count: number) => void,
): () => void {
  const q = query(reviewsCol,
    where('toUserId', '==', sellerId),
    where('role', '==', 'buyer_to_seller'),
  );
  return onSnapshot(q, snap => {
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
    reviews.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    // Calcul de la moyenne côté client — pas besoin d'écrire dans users/
    const count = reviews.length;
    const avg = count > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    callback(reviews, avg, count);
  }, () => callback([], 0, 0));
}
