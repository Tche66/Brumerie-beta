// src/services/adminService.ts — v2 hybride NestJS + Firestore
import {
  collection, doc, getDocs, getDoc, updateDoc, deleteDoc,
  query, orderBy, where, onSnapshot, addDoc, serverTimestamp,
  limit, Timestamp, writeBatch, setDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { syncSellerDataToProducts } from './productService';
import { usersApi, dashboardApi } from './apiClient';
import { VERIFICATION_PRICE } from '@/types';

// ─── STATISTIQUES — backend NestJS + Firestore ────────────────────
export async function getAdminStats(): Promise<any> {
  try {
    // Essayer le health check backend pour les stats Neon
    const health = await dashboardApi.health() as any;
    const neonStats = {
      ordersToday: health.business?.ordersToday || 0,
      dlqSize: health.reliability?.dlqSize || 0,
      postgresStatus: health.system?.postgres?.status || 'unknown',
    };

    // Compléter avec Firestore pour les stats complètes
    const firestoreStats = await getFirestoreStats();
    return { ...firestoreStats, ...neonStats };
  } catch {
    return getFirestoreStats();
  }
}

async function getFirestoreStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayTs = Timestamp.fromDate(today);
  const week = new Date(today); week.setDate(week.getDate() - 7);
  const weekTs = Timestamp.fromDate(week);

  const [users, products, orders, boosts, storiesSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'orders')),
    getDocs(query(collection(db, 'boosts'), where('status', '!=', 'pending'))),
    getDocs(collection(db, 'stories')).catch(() => ({ size: 0, docs: [] as any[] })),
  ]);

  const usersData    = users.docs.map(d => d.data());
  const productsData = products.docs.map(d => d.data());
  const ordersData   = orders.docs.map(d => d.data());
  const boostsData   = boosts.docs.map(d => d.data());
  const completedOrders = ordersData.filter(o => o.status === 'delivered').length;
  const totalOrderValue = ordersData.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalBoostRevenue = boostsData.filter(b => b.status === 'active').reduce((s, b) => s + (b.price || 0), 0);
  const premiumCount  = usersData.filter(u => u.isPremium).length;
  const verifiedCount = usersData.filter(u => u.isVerified && !u.isPremium).length;
  const uniqueBuyers  = new Set(ordersData.map((o: any) => o.buyerId).filter(Boolean)).size;
  const totalBuyers   = usersData.filter(u => u.role !== 'seller').length;

  let verifPrice = VERIFICATION_PRICE;
  let premiumPriceVal = 10000;
  try {
    const s = (await getDoc(doc(db, 'system', 'settings'))).data() || {};
    verifPrice = (s.verificationPromoPrice > 0) ? s.verificationPromoPrice : (s.verificationPrice || VERIFICATION_PRICE);
    premiumPriceVal = (s.premiumPromoPrice > 0) ? s.premiumPromoPrice : (s.premiumPrice || 10000);
  } catch {}

  const tsOk = (u: any, ref: number) => {
    const ms = u.createdAt?.toMillis?.() ?? (u.createdAt?.seconds ? u.createdAt.seconds * 1000 : null);
    return ms !== null && ms > ref;
  };

  return {
    totalUsers: users.size, totalBuyers,
    totalSellers: usersData.filter(u => u.role === 'seller').length,
    verifiedSellers: verifiedCount + premiumCount,
    premiumSellers: premiumCount,
    bannedUsers: usersData.filter(u => u.isBanned).length,
    totalProducts: products.size,
    activeProducts: productsData.filter(p => p.status === 'active').length,
    soldProducts: productsData.filter(p => p.status === 'sold').length,
    draftProducts: productsData.filter(p => p.status === 'draft').length,
    totalOrders: orders.size, completedOrders,
    pendingOrders: ordersData.filter(o => ['pending','accepted','in_transit'].includes(o.status)).length,
    cancelledOrders: ordersData.filter(o => o.status === 'cancelled').length,
    totalRevenue: totalOrderValue, totalBoostRevenue,
    totalVerifRevenue: verifiedCount * verifPrice,
    totalPremiumRevenue: premiumCount * premiumPriceVal,
    newUsersToday: usersData.filter(u => tsOk(u, todayTs.toMillis())).length,
    newProductsToday: productsData.filter(p => tsOk(p, todayTs.toMillis())).length,
    newUsersThisWeek: usersData.filter(u => tsOk(u, weekTs.toMillis())).length,
    conversionRate: totalBuyers > 0 ? Math.round((uniqueBuyers / totalBuyers) * 100) : 0,
    avgOrderValue: completedOrders > 0 ? Math.round(totalOrderValue / completedOrders) : 0,
    totalStories: (storiesSnap as any).size || 0,
  };
}

// ─── UTILISATEURS ─────────────────────────────────────────────────
export function subscribeAllUsers(callback: (users: any[]) => void, maxCount = 2000): () => void {
  const q = query(collection(db, 'users'), limit(maxCount));
  return onSnapshot(q, snap => {
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    users.sort((a: any, b: any) => {
      const aTime = a.createdAt?.toDate?.()?.getTime() || a.createdAt?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toDate?.()?.getTime() || b.createdAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });
    callback(users);
  }, () => callback([]));
}

export function subscribeDelivererUsers(callback: (users: any[]) => void): () => void {
  const q = query(collection(db, 'users'), where('role', '==', 'livreur'));
  return onSnapshot(q, snap => {
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    users.sort((a: any, b: any) => {
      const aTime = a.createdAt?.toDate?.()?.getTime() || (a.createdAt?.seconds || 0) * 1000;
      const bTime = b.createdAt?.toDate?.()?.getTime() || (b.createdAt?.seconds || 0) * 1000;
      return bTime - aTime;
    });
    callback(users);
  }, () => callback([]));
}

export async function banUser(userId: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { isBanned: true, banReason: reason, bannedAt: serverTimestamp() });
}

export async function unbanUser(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { isBanned: false, banReason: null, bannedAt: null });
}

export async function setUserRole(userId: string, role: 'buyer' | 'seller' | 'livreur'): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { role });
  usersApi.updateMe({ role } as any).catch(() => {});
}

export async function forceVerifyUser(userId: string, adminUid: string): Promise<void> {
  const monthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await updateDoc(doc(db, 'users', userId), {
    isVerified: true, verificationPending: false,
    verifiedUntil: Timestamp.fromDate(monthLater),
    verifiedByAdmin: adminUid, verifiedAt: serverTimestamp(),
  });
  try { await syncSellerDataToProducts(userId, { isVerified: true }); } catch {}
}

export async function revokeVerification(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { isVerified: false, verifiedUntil: null });
  try { await syncSellerDataToProducts(userId, { isVerified: false }); } catch {}
}

// ─── BADGES ───────────────────────────────────────────────────────
export async function toggleUserVerification(userId: string, enable: boolean, adminUid: string, durationDays = 30): Promise<void> {
  const expiresAt = new Date(Date.now() + durationDays * 24 * 3600000);
  await updateDoc(doc(db, 'users', userId), enable ? {
    isVerified: true, verificationPending: false,
    verifiedUntil: Timestamp.fromDate(expiresAt),
    verifiedByAdmin: adminUid, verifiedAt: serverTimestamp(),
  } : { isVerified: false, verifiedUntil: null });
  try {
    if (enable) await syncSellerDataToProducts(userId, { isVerified: true });
    else await syncSellerDataToProducts(userId, { isVerified: false });
  } catch {}
  await logAdminAction(adminUid, enable ? 'BADGE_ENABLED' : 'BADGE_DISABLED', userId, enable ? `${durationDays} jours` : '');
}

export async function forcePremiumUser(userId: string, adminUid: string, durationDays = 30): Promise<void> {
  const expiresAt = new Date(Date.now() + durationDays * 24 * 3600000);
  await updateDoc(doc(db, 'users', userId), {
    isPremium: true, isVerified: true, tier: 'premium',
    premiumUntil: Timestamp.fromDate(expiresAt),
    premiumByAdmin: adminUid, premiumAt: serverTimestamp(),
    verifiedUntil: Timestamp.fromDate(expiresAt),
    verificationPending: false,
  });
  try { await syncSellerDataToProducts(userId, { isVerified: true }); } catch {}
  await logAdminAction(adminUid, 'PREMIUM_ENABLED', userId, `${durationDays} jours`);
}

export async function revokePremium(userId: string, adminUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { isPremium: false, tier: 'verified', premiumUntil: null });
  await logAdminAction(adminUid, 'PREMIUM_REVOKED', userId, '');
}

export async function revokeAll(userId: string, adminUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    isPremium: false, isVerified: false, tier: 'simple',
    premiumUntil: null, verifiedUntil: null,
  });
  try { await syncSellerDataToProducts(userId, { isVerified: false }); } catch {}
  await logAdminAction(adminUid, 'ALL_BADGES_REVOKED', userId, '');
}

// ─── PRODUITS ─────────────────────────────────────────────────────
export function subscribeAllProducts(callback: (products: any[]) => void, maxCount = 100): () => void {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(maxCount));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => callback([]));
}

export async function adminDeleteProduct(productId: string): Promise<void> {
  await updateDoc(doc(db, 'products', productId), { status: 'deleted', deletedAt: serverTimestamp(), deletedByAdmin: true });
}

export async function adminHideProduct(productId: string, hide: boolean): Promise<void> {
  await updateDoc(doc(db, 'products', productId), { hidden: hide, hiddenAt: hide ? serverTimestamp() : null });
}

// ─── COMMANDES ────────────────────────────────────────────────────
export function subscribeAllOrders(callback: (orders: any[]) => void): () => void {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => callback([]));
}

export async function forceResolveOrder(orderId: string, resolution: 'completed' | 'refunded' | 'cancelled', adminNote: string, adminUid: string): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), {
    status: resolution, adminResolution: resolution,
    adminNote, resolvedByAdmin: adminUid, resolvedAt: serverTimestamp(),
  });
}

// ─── BANNERS ──────────────────────────────────────────────────────
export async function publishSystemBanner(banner: { message: string; type: 'info' | 'warning' | 'promo'; expiresInHours: number; ctaLabel?: string; ctaUrl?: string }): Promise<void> {
  const expiresAt = new Date(Date.now() + banner.expiresInHours * 3600000);
  await addDoc(collection(db, 'system_banners'), { ...banner, active: true, createdAt: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt) });
}

export async function dismissSystemBanner(bannerId: string): Promise<void> {
  await updateDoc(doc(db, 'system_banners', bannerId), { active: false });
}

export function subscribeActiveBanners(callback: (banners: any[]) => void): () => void {
  const q = query(collection(db, 'system_banners'), where('active', '==', true), where('expiresAt', '>', Timestamp.now()));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => callback([]));
}

// ─── PARAMÈTRES ───────────────────────────────────────────────────
export async function getGlobalSettings(): Promise<any> {
  const snap = await getDoc(doc(db, 'system', 'settings'));
  return snap.exists() ? snap.data() : {};
}

export async function saveGlobalSettings(settings: Record<string, any>): Promise<void> {
  const payload = { ...settings, updatedAt: serverTimestamp() };
  const refSystem = doc(db, 'system', 'settings');
  await updateDoc(refSystem, payload).catch(async () => { await setDoc(refSystem, payload); });
  const refAppConfig = doc(db, 'appConfig', 'main');
  await updateDoc(refAppConfig, payload).catch(async () => { await setDoc(refAppConfig, payload); });
}

// ─── LOGS ─────────────────────────────────────────────────────────
export async function logAdminAction(adminUid: string, action: string, targetId: string, details?: string): Promise<void> {
  await addDoc(collection(db, 'admin_logs'), { adminUid, action, targetId, details: details || '', createdAt: serverTimestamp() }).catch(() => {});
}

export function subscribeAdminLogs(callback: (logs: any[]) => void): () => void {
  const q = query(collection(db, 'admin_logs'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => callback([]));
}

// ─── MESSAGE DIRECT ADMIN → USER ─────────────────────────────────
export async function sendAdminDirectMessage(targetUserId: string, targetUserName: string, message: string, adminUid: string): Promise<void> {
  const convsRef = collection(db, 'conversations');
  const existing = await getDocs(query(convsRef, where('isAdminConv', '==', true), where('participants', 'array-contains', targetUserId)));
  let convId: string;

  if (!existing.empty) {
    convId = existing.docs[0].id;
  } else {
    const convRef = await addDoc(convsRef, {
      participants: [adminUid, targetUserId],
      participantNames: { [adminUid]: 'Brumerie', [targetUserId]: targetUserName },
      isAdminConv: true, productId: null,
      productTitle: 'Message de Brumerie', productImage: null, productPrice: 0,
      lastMessage: message, lastMessageAt: serverTimestamp(),
      lastSenderId: adminUid,
      unreadCount: { [adminUid]: 0, [targetUserId]: 1 },
      createdAt: serverTimestamp(),
    });
    convId = convRef.id;
  }

  await addDoc(collection(db, 'conversations', convId, 'messages'), {
    conversationId: convId, senderId: adminUid,
    senderName: 'Brumerie 🛡️', text: message,
    type: 'text', readBy: [adminUid], createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'conversations', convId), {
    lastMessage: message, lastMessageAt: serverTimestamp(), lastSenderId: adminUid,
    [`unreadCount.${targetUserId}`]: (existing.empty ? 1 : (existing.docs[0].data().unreadCount?.[targetUserId] || 0) + 1),
  });

  const { createNotification } = await import('@/services/notificationService');
  await createNotification(targetUserId, 'system', '📩 Message de Brumerie', message, { conversationId: convId });
}

// ─── BROADCAST ────────────────────────────────────────────────────
export async function broadcastNotificationToAll(title: string, body: string, adminUid: string): Promise<{ sent: number; errors: number }> {
  const { createNotification } = await import('@/services/notificationService');
  const snap = await getDocs(collection(db, 'users'));
  let sent = 0; let errors = 0;
  const users = snap.docs.map(d => d.id);
  for (let i = 0; i < users.length; i += 10) {
    await Promise.all(users.slice(i, i + 10).map(uid =>
      createNotification(uid, 'system', title, body).then(() => { sent++; }).catch(() => { errors++; })
    ));
  }
  await logAdminAction(adminUid, 'BROADCAST_SENT', 'all', `${title} — ${sent} envoyés`);
  return { sent, errors };
}
