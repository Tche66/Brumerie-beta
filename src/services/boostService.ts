// src/services/boostService.ts — Boost d'annonces avec validation admin
import {
  collection, doc, addDoc, getDocs, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ProductBoost, BoostDuration, BOOST_PLANS } from '@/types';

const boostsCol = collection(db, 'boosts');

// ── Créer une demande de boost (status: pending) ──────────────
export async function createBoost(params: {
  productId: string;
  productTitle?: string;
  sellerId: string;
  sellerName?: string;
  duration: BoostDuration;
  waveRef?: string;
}): Promise<string> {
  const plan = BOOST_PLANS.find(p => p.duration === params.duration)!;
  const ref = await addDoc(boostsCol, {
    ...params,
    price: plan.price,
    status: 'pending',           // ← EN ATTENTE — pas encore actif
    startedAt: null,             // sera rempli par l'admin à l'activation
    expiresAt: null,
    createdAt: serverTimestamp(),
    waveRef: params.waveRef || null,
  });
  return ref.id;
}

// ── ADMIN — Activer un boost ──────────────────────────────────
export async function activateBoost(boostId: string, adminUid: string): Promise<void> {
  const boostRef = doc(boostsCol, boostId);
  const snap = await import('firebase/firestore').then(({ getDoc }) => getDoc(boostRef));
  if (!snap.exists()) throw new Error('Boost introuvable');

  const data = snap.data() as ProductBoost;
  const plan = BOOST_PLANS.find(p => p.duration === data.duration)!;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + plan.hours * 60 * 60 * 1000);

  await updateDoc(boostRef, {
    status: 'active',
    startedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    activatedAt: serverTimestamp(),
    activatedBy: adminUid,
  });
}

// ── ADMIN — Rejeter un boost ──────────────────────────────────
export async function rejectBoost(boostId: string, adminUid: string, reason?: string): Promise<void> {
  await updateDoc(doc(boostsCol, boostId), {
    status: 'rejected',
    activatedBy: adminUid,
    rejectionReason: reason || 'Paiement non confirmé',
  });
}

// ── Écouter les demandes en attente (admin) ───────────────────
export function subscribePendingBoosts(
  callback: (boosts: ProductBoost[]) => void,
): () => void {
  const q = query(boostsCol, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductBoost)));
  }, () => callback([]));
}

// ── Écouter tous les boosts admin (toutes statuses) ───────────
export function subscribeAllBoosts(
  callback: (boosts: ProductBoost[]) => void,
): () => void {
  const q = query(boostsCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductBoost)));
  }, () => callback([]));
}

// ── Écouter les produits boostés ACTIFS ──────────────────────
export function subscribeBoostedProductIds(
  callback: (ids: Set<string>) => void,
): () => void {
  const now = Timestamp.now();
  const q = query(
    boostsCol,
    where('status', '==', 'active'),
    where('expiresAt', '>', now),
  );
  return onSnapshot(q, snap => {
    const ids = new Set(snap.docs.map(d => d.data().productId as string));
    callback(ids);
  }, () => callback(new Set()));
}

// ── Vérifier si un produit est boosté (actif) ────────────────
export async function isProductBoosted(productId: string): Promise<boolean> {
  const now = Timestamp.now();
  const q = query(
    boostsCol,
    where('productId', '==', productId),
    where('status', '==', 'active'),
    where('expiresAt', '>', now),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ── Récupérer les boosts d'un vendeur ────────────────────────
export async function getSellerBoosts(sellerId: string): Promise<ProductBoost[]> {
  const q = query(boostsCol, where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductBoost));
}

// ── Auto-expiration : marquer expired + notifier le vendeur ──
// Appelé au démarrage de l'app pour chaque vendeur connecté
export async function checkAndNotifyExpiringBoosts(
  sellerId: string,
  sellerName: string,
): Promise<void> {
  const { getDocs: gd, query: q, collection: col, where: wh, updateDoc: upd,
          doc: d, Timestamp: Ts, serverTimestamp: now } = await import('firebase/firestore');
  const { createNotification } = await import('@/services/notificationService');
  const { db: database } = await import('@/config/firebase');

  const boostCol = col(database, 'boosts');
  const nowTs = Ts.now();
  const in24h = Ts.fromMillis(Date.now() + 24 * 3600000);

  // 1. Marquer les boosts expirés (status toujours 'active' mais expiresAt dépassé)
  const expiredQ = q(boostCol,
    wh('sellerId', '==', sellerId),
    wh('status', '==', 'active'),
    wh('expiresAt', '<=', nowTs),
  );
  const expiredSnap = await gd(expiredQ);
  for (const docSnap of expiredSnap.docs) {
    await upd(d(database, 'boosts', docSnap.id), {
      status: 'expired',
      expiredAt: now(),
    });
    const data = docSnap.data();
    // Notif : boost expiré
    await createNotification(sellerId, 'system',
      '⚡ Boost expiré',
      `Ton annonce "${data.productTitle || 'article'}" n'est plus boostée. Renouvelle pour rester en tête !`,
      { productId: data.productId },
    );
  }

  // 2. Notifier les boosts qui expirent dans moins de 24h (et notif pas encore envoyée)
  const soonQ = q(boostCol,
    wh('sellerId', '==', sellerId),
    wh('status', '==', 'active'),
    wh('expiresAt', '<=', in24h),
    wh('expiresAt', '>', nowTs),
  );
  const soonSnap = await gd(soonQ);
  for (const docSnap of soonSnap.docs) {
    const data = docSnap.data();
    if (data.expiryReminderSent) continue; // déjà notifié
    await upd(d(database, 'boosts', docSnap.id), { expiryReminderSent: true });

    const hoursLeft = Math.round((data.expiresAt.toMillis() - Date.now()) / 3600000);
    await createNotification(sellerId, 'system',
      '⚡ Boost bientôt expiré',
      `Ton annonce "${data.productTitle || 'article'}" expire dans ${hoursLeft}h. Renouvelle pour continuer à être mis en avant !`,
      { productId: data.productId },
    );
  }
}

// ── Vérifier badge vendeur expirant ───────────────────────────
export async function checkAndNotifyExpiringBadge(userId: string): Promise<void> {
  const { getDoc: gd, doc: d, updateDoc: upd, Timestamp: Ts } = await import('firebase/firestore');
  const { createNotification } = await import('@/services/notificationService');
  const { db: database } = await import('@/config/firebase');

  const snap = await gd(d(database, 'users', userId));
  if (!snap.exists()) return;
  const data = snap.data();
  if (!data.isVerified || !data.verifiedUntil) return;

  const now = Date.now();
  const expiresMs = data.verifiedUntil.toMillis();
  const diff = expiresMs - now;

  // Badge déjà expiré
  if (diff <= 0) {
    await upd(d(database, 'users', userId), { isVerified: false, verifiedUntil: null });
    await createNotification(userId, 'system',
      '🏅 Badge expiré',
      'Ton badge Vendeur Vérifié a expiré. Renouvelle-le (1 000 FCFA/mois) pour continuer à vendre en priorité.',
    );
    return;
  }

  // Expire dans moins de 3 jours → rappel (si pas encore envoyé)
  if (diff < 3 * 24 * 3600000 && !data.badgeExpiryReminderSent) {
    await upd(d(database, 'users', userId), { badgeExpiryReminderSent: true });
    const daysLeft = Math.round(diff / 86400000);
    await createNotification(userId, 'system',
      '🏅 Badge expire bientôt',
      `Ton badge Vendeur Vérifié expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}. Renouvelle-le pour ne pas perdre ta priorité d'affichage !`,
    );
  }
}
