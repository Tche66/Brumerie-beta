// src/services/orderService.ts — v19 hybride NestJS + Firestore
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, onSnapshot, orderBy, serverTimestamp,
  Timestamp, limit,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Order, OrderStatus, PaymentInfo, BRUMERIE_FEE_PERCENT } from '@/types';
import { createNotification } from './notificationService';
import { showLocalPushNotification } from './pushService';
import { ordersApi } from './apiClient';

const ordersCol = collection(db, 'orders');

// ── Calcul frais ──────────────────────────────────────────────────
export function calcOrderFees(price: number) {
  const brumerieFee    = Math.round(price * BRUMERIE_FEE_PERCENT / 100);
  const sellerReceives = price - brumerieFee;
  return { brumerieFee, sellerReceives };
}

// ── Générer code livraison ────────────────────────────────────────
function generateDeliveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Créer commande — backend NestJS + Firestore fallback ──────────
export async function createOrder(params: {
  buyerId: string; buyerName: string; buyerPhoto?: string;
  sellerId: string; sellerName: string; sellerPhoto?: string;
  productId: string; productTitle: string; productImage: string;
  productPrice: number; deliveryFee?: number;
  paymentInfo: PaymentInfo;
  deliveryType: 'delivery' | 'in_person';
  isCOD?: boolean;
  buyerAWCode?: string; buyerAWRepere?: string;
  buyerAWLatitude?: number; buyerAWLongitude?: number;
}): Promise<string> {
  const { brumerieFee, sellerReceives } = calcOrderFees(params.productPrice);
  const isCOD = params.paymentInfo?.method === 'cash_on_delivery' || params.isCOD;
  const totalAmount = params.productPrice + (params.deliveryFee || 0);

  try {
    // Essayer le backend NestJS d'abord
    const order = await ordersApi.create({
      sellerId:         params.sellerId,
      sellerName:       params.sellerName,
      sellerPhoto:      params.sellerPhoto,
      productId:        params.productId,
      productTitle:     params.productTitle,
      productImage:     params.productImage,
      productPrice:     params.productPrice,
      deliveryFee:      params.deliveryFee || 0,
      totalAmount,
      brumerieFee,
      sellerReceives,
      paymentMethod:    params.paymentInfo.method,
      paymentPhone:     params.paymentInfo.phone,
      paymentHolderName: params.paymentInfo.holderName,
      deliveryType:     params.deliveryType,
      isCOD:            isCOD || false,
      buyerAWCode:      params.buyerAWCode,
      buyerAWRepere:    params.buyerAWRepere,
      buyerAWLatitude:  params.buyerAWLatitude,
      buyerAWLongitude: params.buyerAWLongitude,
    }) as any;

    const orderId = order.id;

    // Notifications non bloquantes
    notifyBoth({
      sellerId: params.sellerId,
      sellerMsg: {
        title: isCOD ? `🤝 Commande à la livraison !` : `🛍️ Nouvelle commande !`,
        body: isCOD
          ? `${params.buyerName} commande "${params.productTitle}" — Paiement à la livraison.`
          : `${params.buyerName} veut acheter "${params.productTitle}" — Attendez sa preuve de paiement.`,
        convData: { orderId, productId: params.productId },
      },
      buyerId: params.buyerId,
      buyerMsg: {
        title: isCOD ? `Commande enregistrée 🤝` : `Commande initiée ✓`,
        body: isCOD
          ? `Tu paieras ${params.productPrice.toLocaleString('fr-FR')} FCFA à la réception.`
          : `Effectuez le paiement sur ${params.paymentInfo.method.toUpperCase()} au ${params.paymentInfo.phone} (${params.paymentInfo.holderName})`,
        convData: { orderId, productId: params.productId },
      },
    });

    return orderId;

  } catch (backendErr) {
    console.warn('[createOrder] Backend failed, fallback Firestore:', backendErr);

    // Fallback Firestore
    const initialStatus: OrderStatus = isCOD ? 'cod_pending' : 'initiated';
    const cleanParams = Object.fromEntries(
      Object.entries({
        ...params, isCOD: isCOD || false, brumerieFee, sellerReceives,
        totalAmount, status: initialStatus, createdAt: serverTimestamp(),
      }).filter(([_, v]) => v !== undefined)
    );
    const ref = await addDoc(ordersCol, cleanParams);
    notifyBoth({
      sellerId: params.sellerId,
      sellerMsg: {
        title: isCOD ? `🤝 Commande à la livraison !` : `🛍️ Nouvelle commande !`,
        body: `${params.buyerName} — "${params.productTitle}"`,
        convData: { orderId: ref.id, productId: params.productId },
      },
      buyerId: params.buyerId,
      buyerMsg: {
        title: `Commande initiée ✓`,
        body: `Effectuez le paiement sur ${params.paymentInfo.method.toUpperCase()}`,
        convData: { orderId: ref.id, productId: params.productId },
      },
    });
    return ref.id;
  }
}

// ── Acheteur envoie preuve — Firestore (proof inclut screenshot) ──
export async function submitProof(
  orderId: string,
  proof: { screenshotUrl: string; transactionRef: string },
): Promise<void> {
  const now = new Date();
  const autoDisputeAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const reminderAt    = new Date(now.getTime() + 6  * 60 * 60 * 1000);

  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;

  // Update Firestore (contient la preuve screenshot)
  await updateDoc(doc(ordersCol, orderId), {
    proof: { ...proof, submittedAt: serverTimestamp() },
    status: 'proof_sent' as OrderStatus,
    proofSentAt: serverTimestamp(),
    autoDisputeAt: Timestamp.fromDate(autoDisputeAt),
    reminderAt: Timestamp.fromDate(reminderAt),
  });

  // Sync statut sur Neon
  ordersApi.updateStatus(orderId, 'proof_sent', {
    proofScreenshotUrl: proof.screenshotUrl,
    proofTransactionRef: proof.transactionRef,
    proofSubmittedAt: now.toISOString(),
  }).catch(() => {});

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: `💰 Vérifiez votre solde !`,
      body: `${order.buyerName} déclare avoir envoyé ${order.productPrice?.toLocaleString('fr-FR')} FCFA. Ref: ${proof.transactionRef}`,
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: `Preuve envoyée ✓`,
      body: `Le vendeur a été notifié. Il doit confirmer dans les 24h.`,
      convData: { orderId, productId: order.productId },
    },
  });
}

// ── Vendeur confirme réception paiement ───────────────────────────
export async function confirmPaymentReceived(orderId: string): Promise<void> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;

  await updateDoc(doc(ordersCol, orderId), {
    status: 'confirmed' as OrderStatus,
    confirmedAt: serverTimestamp(),
    sellerBlocked: false,
  });

  ordersApi.updateStatus(orderId, 'confirmed').catch(() => {});

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: `✅ Paiement confirmé`,
      body: `Procédez à la livraison de "${order.productTitle}".`,
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: `🎉 Paiement confirmé !`,
      body: `${order.sellerName} a confirmé. Votre commande est en cours.`,
      convData: { orderId, productId: order.productId },
    },
  });

  await notifyAllDeliverers(orderId, order);
}

// ── Vendeur marque prêt à livrer → génère code ────────────────────
export async function markReadyToDeliver(orderId: string): Promise<string> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) throw new Error('Commande introuvable');
  const order = { id: snap.id, ...snap.data() } as Order;

  const deliveryCode = generateDeliveryCode();
  const qrPickupPayload   = 'brumerie://pickup/'   + orderId + '/' + deliveryCode;
  const qrDeliveryPayload = 'brumerie://delivery/' + orderId + '/' + deliveryCode;

  await updateDoc(doc(ordersCol, orderId), {
    status: 'ready' as OrderStatus,
    deliveryCode, qrPickupPayload, qrDeliveryPayload,
    deliveryCodeGeneratedAt: serverTimestamp(),
  });

  ordersApi.updateStatus(orderId, 'ready', { deliveryCode }).catch(() => {});

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: '🔐 Code de livraison généré',
      body: 'Ton code : ' + deliveryCode + ' — Remets-le à l\'acheteur à la livraison.',
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: '🚚 Ton article arrive !',
      body: 'Ton code de confirmation : ' + deliveryCode,
      convData: { orderId, productId: order.productId },
    },
  });

  await notifyAllDeliverers(orderId, order);
  return deliveryCode;
}

// ── COD : Vendeur confirme → génère code escrow ───────────────────
export async function confirmCODReady(orderId: string): Promise<string> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return '';
  const order = { id: snap.id, ...snap.data() } as Order;

  const deliveryCode = generateDeliveryCode();
  const qrPickupPayload   = 'brumerie://pickup/'   + orderId + '/' + deliveryCode;
  const qrDeliveryPayload = 'brumerie://delivery/' + orderId + '/' + deliveryCode;

  await updateDoc(doc(ordersCol, orderId), {
    status: 'cod_confirmed' as OrderStatus,
    deliveryCode, qrPickupPayload, qrDeliveryPayload,
    deliveryCodeGeneratedAt: serverTimestamp(),
    codReadyAt: serverTimestamp(),
  });

  ordersApi.updateStatus(orderId, 'cod_confirmed', { deliveryCode }).catch(() => {});

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: '📦 Code livraison généré !',
      body: 'Ton code : ' + deliveryCode,
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: '🚚 Ta commande arrive !',
      body: 'Code de réception : ' + deliveryCode,
      convData: { orderId, productId: order.productId },
    },
  });

  await notifyAllDeliverers(orderId, order);
  return deliveryCode;
}

// ── Acheteur valide code → livraison confirmée ────────────────────
export async function validateDeliveryCode(
  orderId: string, inputCode: string,
): Promise<{ success: boolean; error?: string }> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return { success: false, error: 'Commande introuvable' };
  const order = { id: snap.id, ...snap.data() } as Order;

  if (!['ready', 'picked', 'cod_confirmed'].includes(order.status)) {
    return { success: false, error: 'Commande non prête pour la livraison' };
  }
  if (!order.deliveryCode) return { success: false, error: 'Code non généré' };
  if (order.deliveryCode.toUpperCase() !== inputCode.trim().toUpperCase()) {
    return { success: false, error: 'Code incorrect — réessaie' };
  }

  await updateDoc(doc(ordersCol, orderId), {
    status: 'delivered' as OrderStatus,
    deliveredAt: serverTimestamp(),
    deliveryValidatedAt: serverTimestamp(),
    reviewsUnlocked: true,
  });

  ordersApi.updateStatus(orderId, 'delivered', {
    deliveryValidatedAt: new Date().toISOString(),
    reviewsUnlocked: true,
  }).catch(() => {});

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: '✅ Livraison confirmée !',
      body: order.buyerName + ' a confirmé la réception de "' + order.productTitle + '". Transaction terminée ✓',
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: '🎉 Article reçu !',
      body: 'Livraison confirmée. Tu peux noter ' + order.sellerName + ' !',
      convData: { orderId, productId: order.productId },
    },
  });

  if (order.delivererId) {
    await createNotification(order.delivererId, 'system',
      '💰 Mission terminée !',
      'Livraison de "' + order.productTitle + '" confirmée. Bravo !',
      { orderId }
    );
  }

  return { success: true };
}

// ── COD : Acheteur confirme réception + paiement ──────────────────
export async function confirmCODDelivered(orderId: string): Promise<void> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;
  const isCOD = (order as any).isCOD;

  await updateDoc(doc(ordersCol, orderId), {
    status: (isCOD ? 'cod_delivered' : 'delivered') as OrderStatus,
    deliveredAt: serverTimestamp(),
  });

  ordersApi.updateStatus(orderId, isCOD ? 'cod_delivered' : 'delivered').catch(() => {});

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: `✅ Paiement encaissé !`,
      body: `${order.buyerName} a confirmé avoir reçu et payé "${order.productTitle}". Transaction terminée ✓`,
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: `🎉 Merci pour votre achat !`,
      body: `Transaction terminée. Pensez à noter ${order.sellerName} !`,
      convData: { orderId, productId: order.productId },
    },
  });
}

// ── Confirmer livraison physique ──────────────────────────────────
export async function confirmDelivery(orderId: string): Promise<void> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;

  await updateDoc(doc(ordersCol, orderId), {
    status: 'delivered' as OrderStatus,
    deliveredAt: serverTimestamp(),
  });

  ordersApi.updateStatus(orderId, 'delivered').catch(() => {});

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: `📦 Livraison confirmée !`,
      body: `${order.buyerName} a confirmé avoir reçu "${order.productTitle}". Transaction terminée ✓`,
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: `Transaction terminée ✓`,
      body: `Merci pour votre achat ! Pensez à noter ${order.sellerName}.`,
      convData: { orderId, productId: order.productId },
    },
  });
}

// ── Ouvrir un litige ──────────────────────────────────────────────
export async function openOrderDispute(orderId: string, reason: string): Promise<void> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;

  await updateDoc(doc(ordersCol, orderId), {
    status: 'disputed' as OrderStatus,
    disputedAt: serverTimestamp(),
    disputeReason: reason,
    sellerBlocked: true,
  });

  ordersApi.updateStatus(orderId, 'disputed', { disputeReason: reason }).catch(() => {});

  await addDoc(collection(db, 'reports'), {
    type: 'order_dispute', orderId,
    buyerId: order.buyerId, sellerId: order.sellerId,
    productTitle: order.productTitle, amount: order.productPrice,
    reason, createdAt: serverTimestamp(), resolved: false,
  });

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: `⚠️ Litige ouvert`,
      body: `Un litige a été signalé sur "${order.productTitle}". Contactez Brumerie.`,
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: `⚠️ Litige signalé`,
      body: `Votre signalement a été enregistré. L'équipe Brumerie va examiner.`,
      convData: { orderId, productId: order.productId },
    },
  });
}

// ── Annuler livraison ─────────────────────────────────────────────
export async function cancelDelivery(
  orderId: string, cancelledBy: 'buyer' | 'seller', reason: string,
): Promise<void> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as any;

  const wasPickedUp = order.status === 'picked';
  const newStatus = wasPickedUp ? 'disputed' : (order.isCOD ? 'cod_pending' : 'confirmed');

  await updateDoc(doc(ordersCol, orderId), {
    status: newStatus,
    delivererId: null, delivererName: null, delivererPhone: null,
    deliveryFee: null, deliveryCancelledAt: serverTimestamp(),
    deliveryCancelledBy: cancelledBy, deliveryCancelReason: reason,
  });

  ordersApi.updateStatus(orderId, newStatus).catch(() => {});

  const cancellerName = cancelledBy === 'buyer' ? order.buyerName : order.sellerName;
  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: wasPickedUp ? '⚠️ Litige signalé' : '🔄 Livreur retiré',
      body: `${cancellerName} a annulé la livraison. Motif : ${reason}`,
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: wasPickedUp ? '⚠️ Litige signalé' : '🔄 Livreur retiré',
      body: `${cancellerName} a annulé la livraison. Motif : ${reason}`,
      convData: { orderId, productId: order.productId },
    },
  });

  if (order.delivererId) {
    await createNotification(order.delivererId, 'system',
      '❌ Mission annulée',
      `La mission "${order.productTitle}" a été annulée. Motif : ${reason}`,
      { orderId }
    );
  }
}

// ── Annuler une commande ─────────────────────────────────────────
export async function cancelOrder(
  orderId: string, cancelledBy: 'buyer' | 'seller', reason: string,
): Promise<void> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as any;

  // On ne peut annuler que les commandes pas encore livrées
  const nonCancellable = ['delivered', 'cancelled', 'cod_delivered'];
  if (nonCancellable.includes(order.status)) {
    throw new Error('Cette commande ne peut plus être annulée');
  }

  await updateDoc(doc(ordersCol, orderId), {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
    cancelledBy,
    cancelReason: reason,
  });

  ordersApi.updateStatus(orderId, 'cancelled').catch(() => {});

  const cancellerName = cancelledBy === 'buyer' ? order.buyerName : order.sellerName;
  const otherParty = cancelledBy === 'buyer' ? 'sellerId' : 'buyerId';

  await createNotification(
    order[otherParty], 'order',
    '❌ Commande annulée',
    `${cancellerName} a annulé la commande "${order.productTitle}". Motif : ${reason}`,
    { orderId, productId: order.productId }
  );
}

// ── Vérifier si vendeur bloqué ────────────────────────────────────
export async function isSellerBlocked(sellerId: string): Promise<boolean> {
  const q = query(ordersCol, where('sellerId', '==', sellerId), where('sellerBlocked', '==', true), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

// ── Vérifier commandes expirées ───────────────────────────────────
export async function checkExpiredOrders(sellerId: string): Promise<void> {
  const now = Timestamp.now();
  const q = query(ordersCol, where('sellerId', '==', sellerId), where('status', '==', 'proof_sent'));
  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const order = { id: d.id, ...d.data() } as any;
    if (order.reminderAt && order.reminderAt <= now && !order.reminderSentAt) {
      await updateDoc(d.ref, { reminderSentAt: serverTimestamp() });
      await createNotification(order.sellerId, 'system',
        `⏳ Rappel : Confirmez le paiement`,
        `${order.buyerName} attend votre confirmation pour "${order.productTitle}".`,
        { productId: order.productId },
      );
    }
    if (order.autoDisputeAt && order.autoDisputeAt <= now) {
      await openOrderDispute(order.id, 'Délai de 24h dépassé sans confirmation vendeur');
    }
  }
}

// ── Subscriptions realtime — restent sur Firestore ───────────────
export function subscribeToOrder(orderId: string, callback: (order: Order | null) => void): () => void {
  return onSnapshot(doc(ordersCol, orderId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } as Order : null);
  });
}

export function subscribeUserOrders(userId: string, role: 'buyer' | 'seller', callback: (orders: Order[]) => void): () => void {
  const field = role === 'buyer' ? 'buyerId' : 'sellerId';
  const q = query(ordersCol, where(field, '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))));
}

export function subscribeOrdersAsBuyer(userId: string, callback: (orders: Order[]) => void): () => void {
  const q = query(ordersCol, where('buyerId', '==', userId));
  return onSnapshot(q, snap => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    orders.sort((a, b) => ((b as any).createdAt?.toMillis?.() || 0) - ((a as any).createdAt?.toMillis?.() || 0));
    callback(orders);
  }, () => callback([]));
}

export function subscribeOrdersAsSeller(userId: string, callback: (orders: Order[]) => void): () => void {
  const q = query(ordersCol, where('sellerId', '==', userId));
  return onSnapshot(q, snap => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    orders.sort((a, b) => ((b as any).createdAt?.toMillis?.() || 0) - ((a as any).createdAt?.toMillis?.() || 0));
    callback(orders);
  }, () => callback([]));
}

// ── Helpers internes ──────────────────────────────────────────────
async function notifyBoth(params: {
  sellerId: string; sellerMsg: { title: string; body: string; convData: any };
  buyerId: string;  buyerMsg:  { title: string; body: string; convData: any };
}): Promise<void> {
  try {
    await Promise.allSettled([
      createNotification(params.sellerId, 'system', params.sellerMsg.title, params.sellerMsg.body, params.sellerMsg.convData),
      createNotification(params.buyerId,  'system', params.buyerMsg.title,  params.buyerMsg.body,  params.buyerMsg.convData),
      showLocalPushNotification(params.sellerMsg.title, params.sellerMsg.body, { type: 'system' }),
      showLocalPushNotification(params.buyerMsg.title,  params.buyerMsg.body,  { type: 'system' }),
    ]);
  } catch (e) { console.warn('[notifyBoth] error:', e); }
}

export async function notifyAllDeliverers(orderId: string, order: Order): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'livreur')));
    await Promise.all(snap.docs.map(d =>
      createNotification(d.id, 'system', '🛵 Nouvelle mission disponible',
        `"${order.productTitle}" — ${order.sellerName}`,
        { orderId, productId: order.productId }
      )
    ));
  } catch (e) { console.error('notifyAllDeliverers:', e); }
}

export function getCountdown(deadline: any): string {
  if (!deadline) return '';
  const d = deadline?.toDate ? deadline.toDate() : new Date(deadline);
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m.toString().padStart(2, '0')}min`;
}
