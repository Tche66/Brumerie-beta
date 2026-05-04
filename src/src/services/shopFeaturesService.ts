// src/services/shopFeaturesService.ts
// Stats boutique enrichies · Dernier vu · Suivre vendeurs · Wishlist · Cashback · Boutique fermée

import {
  doc, getDoc, getDocs, updateDoc, arrayUnion, arrayRemove,
  collection, query, where, orderBy, limit, Timestamp,
  increment, serverTimestamp, setDoc, onSnapshot, addDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { createNotification } from '@/services/notificationService';

// ════════════════════════════════════════════════════════════
// 1. PRÉSENCE & DERNIER VU
// ════════════════════════════════════════════════════════════

/** Mettre à jour lastActiveAt et calculer le temps de réponse moyen */
export async function updatePresence(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      lastActiveAt: serverTimestamp(),
    });
  } catch {}
}

/** Formater "Actif il y a X" depuis un Timestamp Firestore */
export function formatLastSeen(lastActiveAt: any): string {
  if (!lastActiveAt) return 'Actif récemment';
  const ts = lastActiveAt?.toDate?.() ?? (lastActiveAt?.seconds ? new Date(lastActiveAt.seconds * 1000) : null);
  if (!ts) return 'Actif récemment';
  const diff = Date.now() - ts.getTime();
  const min  = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (min < 2)   return '🟢 En ligne';
  if (min < 60)  return `Actif il y a ${min} min`;
  if (hrs < 24)  return `Actif il y a ${hrs}h`;
  if (days < 7)  return `Actif il y a ${days}j`;
  return 'Actif il y a +7j';
}

/** Badge couleur selon activité */
export function getActivityColor(lastActiveAt: any): 'green' | 'amber' | 'slate' {
  if (!lastActiveAt) return 'slate';
  const ts = lastActiveAt?.toDate?.() ?? (lastActiveAt?.seconds ? new Date(lastActiveAt.seconds * 1000) : null);
  if (!ts) return 'slate';
  const min = Math.floor((Date.now() - ts.getTime()) / 60000);
  if (min < 5)   return 'green';
  if (min < 120) return 'amber';
  return 'slate';
}

// ════════════════════════════════════════════════════════════
// 2. STATS BOUTIQUE ENRICHIES
// ════════════════════════════════════════════════════════════

export interface ShopStats {
  totalViews: number;
  totalContacts: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;      // % vues → commandes
  topProducts: { id: string; title: string; views: number; orders: number; image: string }[];
  peakHours: { hour: number; views: number }[];  // heures de pointe
  weeklyViews: { week: string; views: number }[]; // tendance semaine
  recurringBuyers: number;     // acheteurs ayant commandé 2+ fois
  avgOrderValue: number;
}

export async function getSellerShopStats(sellerId: string): Promise<ShopStats> {
  const [productsSnap, ordersSnap] = await Promise.all([
    getDocs(query(collection(db, 'products'), where('sellerId', '==', sellerId))),
    getDocs(query(collection(db, 'orders'),   where('sellerId', '==', sellerId))),
  ]);

  const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  const orders   = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }))   as any[];
  const doneOrders = orders.filter(o => ['delivered','cod_delivered','confirmed','ready'].includes(o.status));

  // Vues / contacts totaux
  const totalViews    = products.reduce((s, p) => s + (p.viewCount || 0), 0);
  const totalContacts = products.reduce((s, p) => s + (p.whatsappClickCount || 0), 0);
  const totalOrders   = doneOrders.length;
  const totalRevenue  = doneOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const conversionRate = totalViews > 0 ? Math.round((totalOrders / totalViews) * 100 * 10) / 10 : 0;
  const avgOrderValue  = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Top produits (par vues)
  const topProducts = [...products]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      title: p.title || '',
      views: p.viewCount || 0,
      orders: orders.filter(o => o.productId === p.id).length,
      image: p.images?.[0] || '',
    }));

  // Heures de pointe — calculées depuis les timestamps des commandes du vendeur
  const hourMap: Record<number, number> = {};
  for (const o of doneOrders) {
    const ts = o.createdAt?.toDate?.() ?? (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null);
    if (ts) {
      const h = ts.getHours();
      hourMap[h] = (hourMap[h] || 0) + 1;
    }
  }
  const peakHours = Object.entries(hourMap)
    .map(([h, v]) => ({ hour: parseInt(h), views: v }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Vues par semaine — calculées depuis les commandes (approximation)
  const weekMap: Record<string, number> = {};
  for (const o of doneOrders) {
    const ts = o.createdAt?.toDate?.() ?? (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null);
    if (ts) {
      const w = `${ts.getFullYear()}-S${Math.ceil(ts.getDate()/7)}`;
      weekMap[w] = (weekMap[w] || 0) + 1;
    }
  }
  const weeklyViews = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, views]) => ({ week, views }));

  // Acheteurs récurrents
  const buyerCounts: Record<string, number> = {};
  for (const o of doneOrders) {
    if (o.buyerId) buyerCounts[o.buyerId] = (buyerCounts[o.buyerId] || 0) + 1;
  }
  const recurringBuyers = Object.values(buyerCounts).filter(c => c >= 2).length;

  return { totalViews, totalContacts, totalOrders, totalRevenue, conversionRate, topProducts, peakHours, weeklyViews, recurringBuyers, avgOrderValue };
}

/** Tracker une vue sur un produit (appeler depuis ProductDetailPage)
 * Note : seul viewCount est incrémenté côté client (règle Firestore).
 * viewsByHour et viewsByWeek sont calculés côté admin depuis getSellerShopStats.
 */
export async function trackProductView(productId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'products', productId), {
      viewCount: increment(1),
    });
  } catch {}
}

// ════════════════════════════════════════════════════════════
// 3. SUIVRE UN VENDEUR
// ════════════════════════════════════════════════════════════

export async function followSeller(buyerId: string, sellerId: string, sellerName: string): Promise<void> {
  await updateDoc(doc(db, 'users', buyerId), {
    followingSellers: arrayUnion(sellerId),
  });
  // Dénormaliser le compteur sur le vendeur
  try {
    await updateDoc(doc(db, 'users', sellerId), {
      followerCount: increment(1),
    });
  } catch {}
  await createNotification(sellerId, 'system',
    '👤 Nouvel abonné !',
    `Quelqu'un suit maintenant ta boutique. Publie régulièrement pour rester visible !`,
    {}
  );
}

export async function unfollowSeller(buyerId: string, sellerId: string): Promise<void> {
  await updateDoc(doc(db, 'users', buyerId), {
    followingSellers: arrayRemove(sellerId),
  });
  // Décrémenter le compteur sur le vendeur
  try {
    await updateDoc(doc(db, 'users', sellerId), {
      followerCount: increment(-1),
    });
  } catch {}
}

export function isFollowingSeller(buyerId: string, sellerId: string, followingList: string[]): boolean {
  return followingList.includes(sellerId);
}

/** Notifier tous les followers d'un vendeur quand il publie un article */
export async function notifyFollowersNewProduct(sellerId: string, sellerName: string, productTitle: string, productId: string): Promise<void> {
  try {
    const q = query(collection(db, 'users'), where('followingSellers', 'array-contains', sellerId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d =>
      createNotification(d.id, 'system',
        `🛍️ ${sellerName} a publié un nouvel article`,
        `"${productTitle}" vient d'être mis en ligne.`,
        { productId, sellerId }
      )
    ));
  } catch (e) { console.error('[followSeller] notify:', e); }
}

// ════════════════════════════════════════════════════════════
// 4. WISHLIST PARTAGEABLE
// ════════════════════════════════════════════════════════════

function generateWishlistSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'wish';
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'users', userId));
  const data = snap.data() || {};
  const slug = data.wishlistSlug || generateWishlistSlug(data.name || 'user');
  await updateDoc(doc(db, 'users', userId), {
    wishlistIds: arrayUnion(productId),
    wishlistSlug: slug,
  });
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    wishlistIds: arrayRemove(productId),
  });
}

export async function toggleWishlistPublic(userId: string, isPublic: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { wishlistPublic: isPublic });
}

export function buildWishlistLink(slug: string): string {
  return `${window.location.origin}?wishlist=${slug}`;
}

/** Lire la wishlist publique d'un utilisateur via son slug */
export async function getPublicWishlist(slug: string): Promise<{ userId: string; products: any[] } | null> {
  try {
    const q = query(collection(db, 'users'), where('wishlistSlug', '==', slug), where('wishlistPublic', '==', true), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const userData = snap.docs[0].data();
    const ids: string[] = userData.wishlistIds || [];
    if (!ids.length) return { userId: snap.docs[0].id, products: [] };
    const prods = await Promise.all(
      ids.map(id => getDoc(doc(db, 'products', id)).then(d => d.exists() ? { id: d.id, ...d.data() } : null))
    );
    return { userId: snap.docs[0].id, products: prods.filter(Boolean) };
  } catch { return null; }
}

// ════════════════════════════════════════════════════════════
// 5. CASHBACK FIDÉLITÉ
// ════════════════════════════════════════════════════════════

export const CASHBACK_RATE   = 100;   // 100 FCFA = 1 point
export const CASHBACK_REDEEM = 100;   // 100 points = bon de réduction
export const CASHBACK_VALUE  = 500;   // 500 FCFA de réduction par tranche de 100 pts

/** Créditer des points après un achat */
export async function creditLoyaltyPoints(buyerId: string, orderAmount: number): Promise<number> {
  const pts = Math.floor(orderAmount / CASHBACK_RATE);
  if (pts <= 0) return 0;
  await updateDoc(doc(db, 'users', buyerId), {
    loyaltyPoints: increment(pts),
  });
  await createNotification(buyerId, 'system',
    `+${pts} points fidélité 🎁`,
    `Tu as gagné ${pts} points sur ta commande. ${CASHBACK_REDEEM} points = ${CASHBACK_VALUE} FCFA de réduction !`,
    {}
  );
  return pts;
}

/** Utiliser des points pour une réduction */
export async function redeemLoyaltyPoints(buyerId: string, pointsToUse: number): Promise<{ success: boolean; discount: number; remaining: number }> {
  if (pointsToUse < CASHBACK_REDEEM) return { success: false, discount: 0, remaining: 0 };
  const snap = await getDoc(doc(db, 'users', buyerId));
  const pts  = snap.data()?.loyaltyPoints || 0;
  if (pts < pointsToUse) return { success: false, discount: 0, remaining: pts };
  const discountUnits = Math.floor(pointsToUse / CASHBACK_REDEEM);
  const discount = discountUnits * CASHBACK_VALUE;
  await updateDoc(doc(db, 'users', buyerId), {
    loyaltyPoints:     increment(-pointsToUse),
    loyaltyPointsUsed: increment(pointsToUse),
  });
  return { success: true, discount, remaining: pts - pointsToUse };
}

/** Calculer combien de points sont utilisables (tranches de 100) */
export function getRedeemablePoints(points: number): { redeemable: number; discount: number } {
  const units = Math.floor(points / CASHBACK_REDEEM);
  return { redeemable: units * CASHBACK_REDEEM, discount: units * CASHBACK_VALUE };
}

// ════════════════════════════════════════════════════════════
// 6. BOUTIQUE FERMÉE TEMPORAIREMENT
// ════════════════════════════════════════════════════════════

export async function closeShopUntil(sellerId: string, until: Date, message?: string): Promise<void> {
  await updateDoc(doc(db, 'users', sellerId), {
    shopClosedUntil: Timestamp.fromDate(until),
    shopClosedMessage: message || '',
  });
}

export async function reopenShop(sellerId: string): Promise<void> {
  await updateDoc(doc(db, 'users', sellerId), {
    shopClosedUntil: null,
    shopClosedMessage: '',
  });
}

export function isShopClosed(shopClosedUntil: any): boolean {
  if (!shopClosedUntil) return false;
  const until = shopClosedUntil?.toDate?.() ?? (shopClosedUntil?.seconds ? new Date(shopClosedUntil.seconds * 1000) : null);
  if (!until) return false;
  return until > new Date();
}

export function formatShopClosedUntil(shopClosedUntil: any): string {
  const until = shopClosedUntil?.toDate?.() ?? (shopClosedUntil?.seconds ? new Date(shopClosedUntil.seconds * 1000) : null);
  if (!until) return '';
  return until.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

// ════════════════════════════════════════════════════════════
// 7. VENTE FLASH PROGRAMMÉE
// ════════════════════════════════════════════════════════════

export interface ScheduledPromo {
  promoPrice: number;         // Prix promo
  promoActiveFrom?: string;   // ISO — start (null = immédiat)
  promoActiveUntil?: string;  // ISO — end (null = permanent)
  flashSaleActive?: boolean;
  flashSaleLabel?: string;
}

export async function setProductPromo(productId: string, promo: ScheduledPromo): Promise<void> {
  const now = new Date().toISOString();
  const isActive = !promo.promoActiveFrom || promo.promoActiveFrom <= now;
  const isExpired = promo.promoActiveUntil ? promo.promoActiveUntil < now : false;
  await updateDoc(doc(db, 'products', productId), {
    promoPrice:        promo.promoPrice || null,
    promoActiveFrom:   promo.promoActiveFrom || null,
    promoActiveUntil:  promo.promoActiveUntil || null,
    flashSaleActive:   isActive && !isExpired && !!promo.promoPrice,
    flashSaleScheduled: !!promo.promoActiveFrom && !isActive,
    flashSaleLabel:    promo.flashSaleLabel || '',
  });
}

export async function cancelProductPromo(productId: string): Promise<void> {
  await updateDoc(doc(db, 'products', productId), {
    promoPrice: null, promoActiveFrom: null, promoActiveUntil: null,
    flashSaleActive: false, flashSaleScheduled: false, flashSaleLabel: '',
  });
}

/** Calculer le prix actuel d'un produit (promo ou normal) */
export function getEffectivePrice(product: { price: number; promoPrice?: number; promoActiveFrom?: string; promoActiveUntil?: string }): {
  price: number; isPromo: boolean; discountPct: number;
} {
  const now = new Date().toISOString();
  if (
    product.promoPrice &&
    product.promoPrice < product.price &&
    (!product.promoActiveFrom || product.promoActiveFrom <= now) &&
    (!product.promoActiveUntil || product.promoActiveUntil >= now)
  ) {
    const pct = Math.round((1 - product.promoPrice / product.price) * 100);
    return { price: product.promoPrice, isPromo: true, discountPct: pct };
  }
  return { price: product.price, isPromo: false, discountPct: 0 };
}

// ════════════════════════════════════════════════════════════
// REPOST — Partage d'un article avec commentaire
// ════════════════════════════════════════════════════════════
import type { Repost } from '@/types';

export async function repostProduct(
  reposterId: string,
  reposterName: string,
  reposterPhoto: string | undefined,
  product: { id: string; title: string; images: string[]; price: number; sellerId: string; sellerName: string },
  comment: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'reposts'), {
    originalProductId:    product.id,
    originalProductTitle: product.title,
    originalProductImage: product.images?.[0] || '',
    originalProductPrice: product.price,
    originalSellerId:     product.sellerId,
    originalSellerName:   product.sellerName,
    reposterId,
    reposterName,
    reposterPhoto: reposterPhoto || null,
    comment: comment.trim(),
    createdAt: serverTimestamp(),
  });
  await createNotification(
    product.sellerId,
    'system',
    reposterName + ' a partage ton article',
    '"' + product.title + '" — avec le commentaire : "' + comment.trim().slice(0, 60) + (comment.length > 60 ? '...' : '') + '"',
    { productId: product.id }
  );
  return docRef.id;
}

export async function getRepostsForProduct(productId: string): Promise<Repost[]> {
  const snap = await getDocs(query(
    collection(db, 'reposts'),
    where('originalProductId', '==', productId),
    orderBy('createdAt', 'desc'),
    limit(20)
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Repost[];
}
