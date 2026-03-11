// src/services/adminService.ts — Toutes les opérations admin
import {
  collection, doc, getDocs, getDoc, updateDoc, deleteDoc,
  query, orderBy, where, onSnapshot, addDoc, serverTimestamp,
  limit, startAfter, QueryDocumentSnapshot, Timestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { syncSellerDataToProducts } from './productService';

// ─── STATISTIQUES ─────────────────────────────────────────────
export async function getAdminStats(): Promise<{
  totalUsers: number;
  totalSellers: number;
  verifiedSellers: number;
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  totalBoostRevenue: number;
  totalVerifRevenue: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newProductsToday: number;
}> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayTs = Timestamp.fromDate(today);
  // Fenêtre 7 jours pour fallback si createdAt absent sur anciens comptes
  const week = new Date(today); week.setDate(week.getDate() - 7);
  const weekTs = Timestamp.fromDate(week);

  const [users, products, orders, boosts] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'orders')),
    getDocs(query(collection(db, 'boosts'), where('status', '!=', 'pending'))),
  ]);

  const usersData = users.docs.map(d => d.data());
  const productsData = products.docs.map(d => d.data());
  const boostsData = boosts.docs.map(d => d.data());

  const totalBoostRevenue = boostsData
    .filter(b => b.status === 'active')
    .reduce((s, b) => s + (b.price || 0), 0);

  const verifiedCount = usersData.filter(u => u.isVerified).length;

  return {
    totalUsers: users.size,
    totalSellers: usersData.filter(u => u.role === 'seller').length,
    verifiedSellers: verifiedCount,
    totalProducts: products.size,
    activeProducts: productsData.filter(p => p.status === 'active').length,
    totalOrders: orders.size,
    totalBoostRevenue,
    totalVerifRevenue: verifiedCount * 3000,
    newUsersToday: usersData.filter(u => {
      const ms = u.createdAt?.toMillis?.() ?? (u.createdAt?.seconds ? u.createdAt.seconds * 1000 : null);
      return ms !== null && ms > todayTs.toMillis();
    }).length,
    newProductsToday: productsData.filter(p => {
      const ms = p.createdAt?.toMillis?.() ?? (p.createdAt?.seconds ? p.createdAt.seconds * 1000 : null);
      return ms !== null && ms > todayTs.toMillis();
    }).length,
    newUsersThisWeek: usersData.filter(u => {
      const ms = u.createdAt?.toMillis?.() ?? (u.createdAt?.seconds ? u.createdAt.seconds * 1000 : null);
      return ms !== null && ms > weekTs.toMillis();
    }).length,
  };
}

// ─── UTILISATEURS ─────────────────────────────────────────────
export function subscribeAllUsers(
  callback: (users: any[]) => void,
  maxCount = 500,
): () => void {
  // Sans orderBy — tous les users visibles même sans champ createdAt
  const q = query(collection(db, 'users'), limit(maxCount));
  return onSnapshot(q, snap => {
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Tri côté client : plus récent en premier (avec fallback si createdAt absent)
    users.sort((a: any, b: any) => {
      const aTime = a.createdAt?.toDate?.()?.getTime() || a.createdAt?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toDate?.()?.getTime() || b.createdAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });
    callback(users);
  }, () => callback([]));
}

export async function banUser(userId: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    isBanned: true,
    banReason: reason,
    bannedAt: serverTimestamp(),
  });
}

export async function unbanUser(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    isBanned: false,
    banReason: null,
    bannedAt: null,
  });
}

export async function setUserRole(userId: string, role: 'buyer' | 'seller'): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { role });
}

export async function forceVerifyUser(userId: string, adminUid: string): Promise<void> {
  const monthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await updateDoc(doc(db, 'users', userId), {
    isVerified: true,
    verificationPending: false,
    verifiedUntil: Timestamp.fromDate(monthLater),
    verifiedByAdmin: adminUid,
    verifiedAt: serverTimestamp(),
  });
  // Propager le badge vérifié sur tous les produits existants
  try { await syncSellerDataToProducts(userId, { sellerVerified: true }); } catch {}
}

export async function revokeVerification(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    isVerified: false,
    verifiedUntil: null,
  });
  // Retirer le badge vérifié de tous les produits existants
  try { await syncSellerDataToProducts(userId, { sellerVerified: false }); } catch {}
}

// ─── PRODUITS ─────────────────────────────────────────────────
export function subscribeAllProducts(
  callback: (products: any[]) => void,
  maxCount = 100,
): () => void {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(maxCount));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

export async function adminDeleteProduct(productId: string): Promise<void> {
  await updateDoc(doc(db, 'products', productId), {
    status: 'deleted',
    deletedAt: serverTimestamp(),
    deletedByAdmin: true,
  });
}

export async function adminHideProduct(productId: string, hide: boolean): Promise<void> {
  await updateDoc(doc(db, 'products', productId), {
    hidden: hide,
    hiddenAt: hide ? serverTimestamp() : null,
  });
}

// ─── COMMANDES & LITIGES ──────────────────────────────────────
export function subscribeAllOrders(
  callback: (orders: any[]) => void,
): () => void {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

export async function forceResolveOrder(
  orderId: string,
  resolution: 'completed' | 'refunded' | 'cancelled',
  adminNote: string,
  adminUid: string,
): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), {
    status: resolution,
    adminResolution: resolution,
    adminNote,
    resolvedByAdmin: adminUid,
    resolvedAt: serverTimestamp(),
  });
}

// ─── ANNONCE SYSTÈME ──────────────────────────────────────────
export async function publishSystemBanner(banner: {
  message: string;
  type: 'info' | 'warning' | 'promo';
  expiresInHours: number;
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + banner.expiresInHours * 3600000);
  await addDoc(collection(db, 'system_banners'), {
    ...banner,
    active: true,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });
}

export async function dismissSystemBanner(bannerId: string): Promise<void> {
  await updateDoc(doc(db, 'system_banners'), { active: false });
}

export function subscribeActiveBanners(callback: (banners: any[]) => void): () => void {
  const now = Timestamp.now();
  const q = query(
    collection(db, 'system_banners'),
    where('active', '==', true),
    where('expiresAt', '>', now),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

// ─── PARAMÈTRES GLOBAUX ───────────────────────────────────────
export async function getGlobalSettings(): Promise<any> {
  const snap = await getDoc(doc(db, 'system', 'settings'));
  return snap.exists() ? snap.data() : {};
}

export async function saveGlobalSettings(settings: {
  verificationPrice?: number;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  boostPrices?: { '24h': number; '48h': number; '7j': number };
  wavePaymentPhone?: string;
  // Deeplinks Wave complets, un par plan (ex: wave://send?phone=...&amount=500)
  waveLinks?: { '24h': string; '48h': string; '7j': string };
  planLimits?: {
    simple: { products: number; dailyChats: number };
    verified: { products: number; dailyChats: number };
  };
}): Promise<void> {
  const ref = doc(db, 'system', 'settings');
  await updateDoc(ref, { ...settings, updatedAt: serverTimestamp() }).catch(async () => {
    // Document n'existe pas encore — créer
    const { setDoc } = await import('firebase/firestore');
    await setDoc(ref, { ...settings, updatedAt: serverTimestamp() });
  });
}

// ─── LOGS D'ACTIVITÉ ──────────────────────────────────────────
export async function logAdminAction(
  adminUid: string,
  action: string,
  targetId: string,
  details?: string,
): Promise<void> {
  await addDoc(collection(db, 'admin_logs'), {
    adminUid,
    action,
    targetId,
    details: details || '',
    createdAt: serverTimestamp(),
  }).catch(() => {}); // silencieux
}

export function subscribeAdminLogs(callback: (logs: any[]) => void): () => void {
  const q = query(collection(db, 'admin_logs'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

// ─── MESSAGE DIRECT ADMIN → USER ─────────────────────────────
// Crée une conversation "Brumerie Admin" + notif in-app
export async function sendAdminDirectMessage(
  targetUserId: string,
  targetUserName: string,
  message: string,
  adminUid: string,
): Promise<void> {
  const { collection: col, addDoc: add, query: q, where: wh, getDocs: get,
          serverTimestamp: now, doc: d, setDoc, updateDoc: upd } = await import('firebase/firestore');

  // Chercher conversation admin existante avec cet user
  const convsRef = col(db, 'conversations');
  const existing = await get(q(convsRef, wh('isAdminConv', '==', true), wh('participants', 'array-contains', targetUserId)));

  let convId: string;

  if (!existing.empty) {
    convId = existing.docs[0].id;
  } else {
    // Créer conversation admin
    const convRef = await add(convsRef, {
      participants: [adminUid, targetUserId],
      participantNames: { [adminUid]: 'Brumerie', [targetUserId]: targetUserName },
      participantPhotos: { [adminUid]: '', [targetUserId]: '' },
      isAdminConv: true,
      productId: null,
      productTitle: 'Message de Brumerie',
      productImage: null,
      productPrice: 0,
      lastMessage: message,
      lastMessageAt: now(),
      lastSenderId: adminUid,
      unreadCount: { [adminUid]: 0, [targetUserId]: 1 },
      createdAt: now(),
    });
    convId = convRef.id;
  }

  // Ajouter le message
  await add(col(db, 'conversations', convId, 'messages'), {
    conversationId: convId,
    senderId: adminUid,
    senderName: 'Brumerie 🛡️',
    text: message,
    type: 'text',
    readBy: [adminUid],
    createdAt: now(),
  });

  // Mettre à jour lastMessage
  await upd(d(db, 'conversations', convId), {
    lastMessage: message,
    lastMessageAt: now(),
    lastSenderId: adminUid,
    [`unreadCount.${targetUserId}`]: (existing.empty ? 1 : (existing.docs[0].data().unreadCount?.[targetUserId] || 0) + 1),
  });

  // Notification in-app
  const { createNotification } = await import('@/services/notificationService');
  await createNotification(targetUserId, 'system', '📩 Message de Brumerie', message, { conversationId: convId });
}

// ─── NOTIFICATION BROADCAST TOUS LES USERS ───────────────────
export async function broadcastNotificationToAll(
  title: string,
  body: string,
  adminUid: string,
): Promise<{ sent: number; errors: number }> {
  const { collection: col, getDocs: get } = await import('firebase/firestore');
  const { createNotification } = await import('@/services/notificationService');

  const snap = await get(col(db, 'users'));
  let sent = 0;
  let errors = 0;

  // Envoyer en parallèle par batch de 10
  const users = snap.docs.map(d => d.id);
  const batchSize = 10;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await Promise.all(batch.map(uid =>
      createNotification(uid, 'system', title, body)
        .then(() => { sent++; })
        .catch(() => { errors++; })
    ));
  }

  // Log
  await logAdminAction(adminUid, 'BROADCAST_SENT', 'all', `${title} — ${sent} envoyés`);
  return { sent, errors };
}

// ─── TOGGLE BADGE VÉRIFIÉ ─────────────────────────────────────
export async function toggleUserVerification(
  userId: string,
  enable: boolean,
  adminUid: string,
  durationDays = 30,
): Promise<void> {
  const { doc: d, updateDoc: upd, serverTimestamp: now, Timestamp } = await import('firebase/firestore');
  const expiresAt = new Date(Date.now() + durationDays * 24 * 3600000);
  await upd(d(db, 'users', userId), enable ? {
    isVerified: true,
    verificationPending: false,
    verifiedUntil: Timestamp.fromDate(expiresAt),
    verifiedByAdmin: adminUid,
    verifiedAt: now(),
  } : {
    isVerified: false,
    verifiedUntil: null,
  });
  await logAdminAction(adminUid, enable ? 'BADGE_ENABLED' : 'BADGE_DISABLED', userId, enable ? `${durationDays} jours` : '');
}
