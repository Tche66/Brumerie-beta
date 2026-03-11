// src/services/deliveryService.ts
// Service Firestore pour le système de livraison partenaire

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, limit, serverTimestamp, onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { DeliveryRequest, DeliveryRate, User } from '@/types';
import { NEIGHBORHOODS } from '@/types';

// ── Récupérer les livreurs disponibles pour une zone ────────────
export async function getAvailableDeliverers(fromZone: string): Promise<User[]> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'livreur'),
    where('deliveryAvailable', '==', true),
    where('deliveryZones', 'array-contains', fromZone)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
}

// ── Tous les livreurs (admin) ────────────────────────────────────
export async function getAllDeliverers(): Promise<User[]> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'livreur')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
}

// ── Calculer le tarif entre deux zones pour un livreur ───────────
export function calcDeliveryFee(deliverer: User, from: string, to: string): number {
  const rates = deliverer.deliveryRates || [];
  // Chercher tarif exact from→to
  const exact = rates.find(r => r.fromZone === from && r.toZone === to);
  if (exact) return exact.price;
  // Chercher tarif inverse to→from
  const reverse = rates.find(r => r.fromZone === to && r.toZone === from);
  if (reverse) return reverse.price;
  // Chercher tarif 'same' si même zone
  if (from === to) {
    const same = rates.find(r => r.toZone === 'same' || r.fromZone === from);
    if (same) return same.price;
  }
  // Tarif par défaut
  return 1000;
}

// ── Créer une demande de livraison ───────────────────────────────
export async function createDeliveryRequest(data: {
  orderId: string;
  delivererId: string;
  proposedBy: 'buyer' | 'seller' | 'admin';
  fromNeighborhood: string;
  toNeighborhood: string;
  estimatedFee: number;
  buyerName: string;
  buyerId?: string;
  sellerName: string;
  sellerId?: string;
  productTitle: string;
  productImage?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'deliveryRequests'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  // Mettre à jour l'ordre avec le livreur proposé
  await updateDoc(doc(db, 'orders', data.orderId), {
    delivererId: data.delivererId,
    delivererProposedBy: data.proposedBy,
    status: 'delivery_requested',
    deliveryRequestedAt: serverTimestamp(),
  });

  return ref.id;
}

// ── Livreur accepte/refuse une demande ───────────────────────────
export async function respondToDeliveryRequest(
  requestId: string,
  orderId: string,
  delivererId: string,
  delivererName: string,
  delivererPhone: string,
  accepted: boolean
): Promise<void> {
  await updateDoc(doc(db, 'deliveryRequests', requestId), {
    status: accepted ? 'accepted' : 'rejected',
    respondedAt: serverTimestamp(),
  });

  if (accepted) {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'delivery_accepted',
      delivererName,
      delivererPhone,
      deliveryAcceptedAt: serverTimestamp(),
    });
  } else {
    // Si refus, retirer le livreur de l'ordre
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'ready',
      delivererId: null,
      delivererName: null,
      delivererPhone: null,
    });
  }
}

// ── Livreur confirme la prise en charge (colis récupéré) ────────
export async function confirmPickup(requestId: string, orderId: string): Promise<void> {
  await updateDoc(doc(db, 'deliveryRequests', requestId), {
    status: 'picked',
    pickedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'orders', orderId), {
    status: 'delivery_picked',
    deliveryPickedAt: serverTimestamp(),
  });
}

// ── Écoute temps réel des demandes pour un livreur ───────────────
export function subscribeDeliveryRequests(
  delivererId: string,
  callback: (requests: DeliveryRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'deliveryRequests'),
    where('delivererId', '==', delivererId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as DeliveryRequest)));
  });
}

// ── Mises à jour profil livreur ──────────────────────────────────
export async function updateDelivererProfile(uid: string, data: {
  deliveryZones: string[];
  deliveryRates: DeliveryRate[];
  deliveryBio: string;
  deliveryAvailable: boolean;
  deliveryPartnerName: string;
}): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    role: 'livreur',
  });
}

// ── Toggler la disponibilité ─────────────────────────────────────
export async function toggleDelivererAvailability(uid: string, available: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { deliveryAvailable: available });
}

// ── Historique des livraisons complétées ────────────────────────
export async function getDelivererHistory(delivererId: string): Promise<DeliveryRequest[]> {
  const q = query(
    collection(db, 'deliveryRequests'),
    where('delivererId', '==', delivererId),
    where('status', '==', 'completed'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as DeliveryRequest));
}

// ── Marquer livraison complète + mettre à jour gains ────────────
export async function completeDelivery(
  requestId: string,
  delivererId: string,
  fee: number
): Promise<void> {
  await updateDoc(doc(db, 'deliveryRequests', requestId), {
    status: 'completed',
    completedAt: serverTimestamp(),
  });
  // Incrémenter les stats du livreur
  const userRef = doc(db, 'users', delivererId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    await updateDoc(userRef, {
      totalDeliveries: (data.totalDeliveries || 0) + 1,
      totalEarnings: (data.totalEarnings || 0) + fee,
    });
  }
}

// ── Récupérer un livreur par UID ─────────────────────────────
export async function getDelivererById(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as User;
}

// ── Livreur propose une livraison au vendeur (commande déjà existante ou non) ──
export async function proposeDeliveryToSeller(data: {
  orderId: string;
  delivererId: string;
  delivererName: string;
  delivererPhone: string;
  sellerId: string;
  buyerName: string;
  sellerName: string;
  productTitle: string;
  productImage?: string;
  fromNeighborhood: string;
  toNeighborhood: string;
  proposedFee: number;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'deliveryRequests'), {
    ...data,
    estimatedFee: data.proposedFee,
    proposedBy: 'livreur',
    status: 'pending_seller',
    createdAt: serverTimestamp(),
  });
  // Notifier le vendeur
  await addDoc(collection(db, 'notifications'), {
    userId: data.sellerId,
    type: 'system',
    title: '🛵 Un livreur vous propose ses services',
    body: data.delivererName + ' propose de livrer "' + data.productTitle + '" pour ' + data.proposedFee.toLocaleString('fr-FR') + ' FCFA.',
    data: { requestId: ref.id, orderId: data.orderId },
    read: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ── Vendeur accepte/refuse la proposition d'un livreur ───────
export async function respondToDelivererProposal(
  requestId: string,
  orderId: string,
  delivererId: string,
  delivererName: string,
  delivererPhone: string,
  accepted: boolean
): Promise<void> {
  await updateDoc(doc(db, 'deliveryRequests', requestId), {
    status: accepted ? 'accepted' : 'rejected_by_seller',
    respondedAt: serverTimestamp(),
  });
  if (accepted && orderId) {
    await updateDoc(doc(db, 'orders', orderId), {
      delivererId,
      delivererName,
      delivererPhone,
      status: 'delivery_accepted',
      deliveryAcceptedAt: serverTimestamp(),
    });
  }
}
