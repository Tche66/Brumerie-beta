// src/services/deliveryService.ts  — v17 simplifié
// Une seule collection : orders. Pas de deliveryRequests séparée.

import {
  collection, doc, getDoc, getDocs, updateDoc,
  query, where, serverTimestamp, onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { User, Order } from '@/types';
import { createNotification } from './notificationService';

// ── Livreurs disponibles pour une zone ──────────────────────────
export async function getAvailableDeliverers(fromZone: string): Promise<User[]> {
  // Si zone vide → retourner tous les livreurs dispo (fallback)
  const constraints: any[] = [
    where('role', '==', 'livreur'),
    where('deliveryAvailable', '==', true),
  ];
  if (fromZone) {
    constraints.push(where('deliveryZones', 'array-contains', fromZone));
  }
  const snap = await getDocs(query(collection(db, 'users'), ...constraints));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
}

// ── Tous les livreurs (admin) ────────────────────────────────────
export async function getAllDeliverers(): Promise<User[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'livreur')));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
}

// ── Livreur par UID ──────────────────────────────────────────────
export async function getDelivererById(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as User;
}

// ── Tarif livraison entre deux zones ────────────────────────────
export function calcDeliveryFee(deliverer: User, from: string, to: string): number {
  const rates = deliverer.deliveryRates || [];
  const exact   = rates.find(r => r.fromZone === from && r.toZone === to);
  if (exact) return exact.price;
  const reverse = rates.find(r => r.fromZone === to && r.toZone === from);
  if (reverse) return reverse.price;
  if (from === to) {
    const same = rates.find(r => r.toZone === 'same' || r.fromZone === from);
    if (same) return same.price;
  }
  return 1000; // Tarif par défaut
}

// ── Assigner un livreur à une commande ──────────────────────────
// Remplace createDeliveryRequest — tout reste dans orders
export async function assignDeliverer(params: {
  orderId: string;
  deliverer: User;
  fee: number;
  order: Order;
}): Promise<void> {
  const { orderId, deliverer, fee, order } = params;

  await updateDoc(doc(db, 'orders', orderId), {
    delivererId: deliverer.id,
    delivererName: deliverer.deliveryPartnerName || deliverer.name,
    delivererPhone: deliverer.phone || '',
    deliveryFee: fee,
    deliveryAssignedAt: serverTimestamp(),
    // status reste 'ready' — le livreur va scanner pour passer à 'picked'
  });

  // Notifier le livreur
  await createNotification(
    deliverer.id, 'system',
    '🛵 Nouvelle mission !',
    `Livraison "${order.productTitle}" — ${order.sellerName}. Ouvre le QR du vendeur pour récupérer le colis.`,
    { orderId, productId: order.productId }
  );
}

// ── Livreur scanne QR vendeur → colis récupéré ──────────────────
export async function confirmPickupByDeliverer(
  orderId: string,
  order: Order,
): Promise<{ success: boolean; error?: string }> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return { success: false, error: 'Commande introuvable' };
  const current = snap.data();

  if (!['ready', 'cod_confirmed'].includes(current.status)) {
    return { success: false, error: 'La commande n\'est pas encore prête' };
  }

  await updateDoc(doc(db, 'orders', orderId), {
    status: 'picked',
    deliveryPickedAt: serverTimestamp(),
  });

  // Notifier vendeur + acheteur
  await Promise.all([
    createNotification(order.sellerId, 'system',
      '🛵 Colis récupéré !',
      `${current.delivererName} a récupéré "${order.productTitle}". Livraison en cours.`,
      { orderId, productId: order.productId }
    ),
    createNotification(order.buyerId, 'system',
      '🚀 Ton article est en route !',
      `${current.delivererName} transporte "${order.productTitle}" vers toi.`,
      { orderId, productId: order.productId }
    ),
  ]);

  return { success: true };
}

// ── Acheteur scanne QR livreur → livraison confirmée ────────────
export async function confirmDeliveryByBuyer(
  orderId: string,
  order: Order,
): Promise<{ success: boolean; error?: string }> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return { success: false, error: 'Commande introuvable' };
  const current = snap.data();

  if (!['picked', 'ready'].includes(current.status)) {
    return { success: false, error: 'Livraison non en cours' };
  }

  await updateDoc(doc(db, 'orders', orderId), {
    status: 'delivered',
    deliveredAt: serverTimestamp(),
    reviewsUnlocked: true,
  });

  await Promise.all([
    createNotification(order.sellerId, 'system',
      '✅ Livraison confirmée !',
      `${order.buyerName} a bien reçu "${order.productTitle}". Mission terminée ✓`,
      { orderId, productId: order.productId }
    ),
    createNotification(current.delivererId, 'system',
      '💰 Mission terminée !',
      `Livraison de "${order.productTitle}" confirmée par l'acheteur. Bravo !`,
      { orderId }
    ),
  ]);

  // Incrémenter stats livreur
  if (current.delivererId) {
    const userSnap = await getDoc(doc(db, 'users', current.delivererId));
    if (userSnap.exists()) {
      const d = userSnap.data();
      await updateDoc(doc(db, 'users', current.delivererId), {
        totalDeliveries: (d.totalDeliveries || 0) + 1,
        totalEarnings: (d.totalEarnings || 0) + (current.deliveryFee || 0),
      });
    }
  }

  return { success: true };
}

// ── Commandes assignées à un livreur (temps réel) ───────────────
export function subscribeDelivererOrders(
  delivererId: string,
  callback: (orders: Order[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'orders'),
    where('delivererId', '==', delivererId),
  );
  return onSnapshot(q, snap => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    orders.sort((a, b) => {
      const ta = (a as any).createdAt?.toMillis?.() || 0;
      const tb = (b as any).createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
    callback(orders);
  });
}

// ── Toggle disponibilité livreur ─────────────────────────────────
export async function toggleDelivererAvailability(uid: string, available: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { deliveryAvailable: available });
}

// ── Mise à jour profil livreur ───────────────────────────────────
export async function updateDelivererProfile(uid: string, data: {
  deliveryZones: string[];
  deliveryRates: any[];
  deliveryBio: string;
  deliveryAvailable: boolean;
  deliveryPartnerName: string;
}): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...data, role: 'livreur' });
}

// ── Notifier tous les livreurs d'une nouvelle commande ──────────
export async function notifyAllDeliverers(orderId: string, order: Order): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'livreur')));
    await Promise.all(
      snap.docs.map(d =>
        createNotification(d.id, 'system',
          '🛵 Mission disponible',
          `"${order.productTitle}" — ${order.sellerName} → livraison demandée.`,
          { orderId, productId: order.productId }
        )
      )
    );
  } catch (e) { console.error('notifyAllDeliverers:', e); }
}
