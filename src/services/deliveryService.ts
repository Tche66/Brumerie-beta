// src/services/deliveryService.ts — v18 hybride NestJS + Firestore
import { deliveryApi } from './apiClient';
import {
  collection, doc, getDoc, getDocs, updateDoc,
  query, where, serverTimestamp, onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { User, Order } from '@/types';
import { createNotification } from './notificationService';

// ── Livreurs disponibles — backend NestJS ────────────────────────
export async function getAvailableDeliverers(fromZone: string): Promise<User[]> {
  try {
    const deliverers = await deliveryApi.getAvailable(fromZone) as User[];
    return deliverers;
  } catch {
    // Fallback Firestore si backend indisponible
    const snap = await getDocs(query(
      collection(db, 'users'),
      where('role', '==', 'livreur'),
      where('deliveryAvailable', '==', true),
    ));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
  }
}

// ── Tous les livreurs (admin) ────────────────────────────────────
export async function getAllDeliverers(): Promise<User[]> {
  try {
    return await deliveryApi.getAvailable() as User[];
  } catch {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'livreur')));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
  }
}

// ── Livreur par UID ──────────────────────────────────────────────
export async function getDelivererById(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as User;
}

// ── Tarif livraison ──────────────────────────────────────────────
export function calcDeliveryFee(deliverer: User, from: string, to: string): number {
  const rates = (deliverer as any).deliveryRates || [];
  const exact = rates.find((r: any) => r.fromZone === from && r.toZone === to);
  if (exact) return exact.price;
  const reverse = rates.find((r: any) => r.fromZone === to && r.toZone === from);
  if (reverse) return reverse.price;
  if (from === to) return (deliverer as any).deliveryPriceSameZone || 1000;
  return (deliverer as any).deliveryPriceOtherZone || 2000;
}

// ── Assigner un livreur — backend NestJS ─────────────────────────
export async function assignDeliverer(params: {
  orderId: string; deliverer: User; fee: number; order: Order; deliveryNotes?: string;
}): Promise<void> {
  const { orderId, deliverer, fee, order } = params;
  await deliveryApi.assign(orderId, deliverer.id, fee);

  // Notifications Firestore (restent sur Firebase)
  await createNotification(deliverer.id, 'system',
    '🛵 Nouvelle mission !',
    `Livraison "${order.productTitle}" — ${order.sellerName}.`,
    { orderId, productId: order.productId }
  );
  await createNotification(order.sellerId, 'system',
    '✅ Livreur assigné',
    `${deliverer.name} va récupérer "${order.productTitle}".`,
    { orderId, productId: order.productId }
  );
}

// ── Livreur scanne QR vendeur → colis récupéré ──────────────────
export async function confirmPickupByDeliverer(
  orderId: string, order: Order,
): Promise<{ success: boolean; error?: string }> {
  try {
    await deliveryApi.pickup(orderId);
    await createNotification(order.sellerId, 'system',
      '🛵 Colis récupéré !',
      `Le livreur a récupéré "${order.productTitle}". Livraison en cours.`,
      { orderId, productId: order.productId }
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Acheteur confirme livraison avec code ────────────────────────
export async function confirmDeliveryByBuyer(
  orderId: string, order: Order, code?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (code) {
      await deliveryApi.validate(orderId, code);
    } else {
      await deliveryApi.accept(orderId);
    }
    await Promise.all([
      createNotification(order.sellerId, 'system',
        '✅ Livraison confirmée !',
        `${order.buyerName} a reçu "${order.productTitle}".`,
        { orderId, productId: order.productId }
      ),
    ]);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Commandes d'un livreur — realtime Firestore ──────────────────
export function subscribeDelivererOrders(
  delivererId: string,
  callback: (orders: Order[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'orders'), where('delivererId', '==', delivererId));
  return onSnapshot(q, snap => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    orders.sort((a, b) => ((b as any).createdAt?.toMillis?.() || 0) - ((a as any).createdAt?.toMillis?.() || 0));
    callback(orders);
  });
}

// ── Commandes ouvertes dans la zone ─────────────────────────────
export function subscribeOpenOrdersInZone(
  zones: string[],
  callback: (orders: Order[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'orders'),
    where('status', 'in', ['confirmed', 'ready', 'cod_confirmed', 'cod_pending']),
  );
  return onSnapshot(q, snap => {
    const orders = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Order))
      .filter(o => !(o as any).delivererId)
      .sort((a, b) => ((b as any).createdAt?.toMillis?.() || 0) - ((a as any).createdAt?.toMillis?.() || 0));
    callback(orders);
  });
}

// ── Toggle disponibilité ─────────────────────────────────────────
export async function toggleDelivererAvailability(uid: string, available: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { deliveryAvailable: available });
}

// ── Mettre à jour profil livreur ─────────────────────────────────
export async function updateDelivererProfile(uid: string, data: Record<string, any>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...data, role: 'livreur' });
}

// ── Livreur refuse une course ────────────────────────────────────
export async function rejectDelivery(params: {
  orderId: string; delivererId: string; delivererName: string; reason: string; order: Order;
}): Promise<{ success: boolean; error?: string }> {
  const { orderId, delivererId, delivererName, reason, order } = params;
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return { success: false, error: 'Commande introuvable' };
  const current = snap.data();
  if (current.delivererId !== delivererId) return { success: false, error: 'Non autorisé' };

  let revertStatus = current.status;
  if (current.status === 'ready') revertStatus = 'confirmed';

  const existing = current.rejectedDeliverers || [];
  await updateDoc(doc(db, 'orders', orderId), {
    delivererId: null, delivererName: null, delivererPhone: null,
    deliveryFee: null, deliveryCode: null,
    status: revertStatus,
    rejectedDeliverers: [...existing, { delivererId, delivererName, reason, rejectedAt: new Date().toISOString() }],
    lastRejectionAt: serverTimestamp(),
  });

  await createNotification(order.sellerId, 'system',
    '⚠️ Livreur a refusé la mission',
    `${delivererName} a refusé "${order.productTitle}". Motif : ${reason}.`,
    { orderId, productId: order.productId }
  );
  return { success: true };
}

// ── Notifier tous les livreurs ───────────────────────────────────
export async function notifyAllDeliverers(orderId: string, order: Order): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'livreur')));
    await Promise.all(snap.docs.map(d =>
      createNotification(d.id, 'system', '🛵 Mission disponible',
        `"${order.productTitle}" — ${order.sellerName}`,
        { orderId, productId: order.productId }
      )
    ));
  } catch (e) { console.error('notifyAllDeliverers:', e); }
}
