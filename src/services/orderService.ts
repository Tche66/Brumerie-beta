// src/services/orderService.ts
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, onSnapshot, orderBy, serverTimestamp,
  Timestamp, limit,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Order, OrderStatus, OrderProof, PaymentInfo, BRUMERIE_FEE_PERCENT } from '@/types';
import { createNotification } from './notificationService';
import { showLocalPushNotification } from './pushService';

const ordersCol = collection(db, 'orders');

// ── Calcul frais ───────────────────────────────────────────
export function calcOrderFees(price: number) {
  const brumerieFee    = Math.round(price * BRUMERIE_FEE_PERCENT / 100);
  const sellerReceives = price - brumerieFee;
  return { brumerieFee, sellerReceives };
}

// ── Créer commande ────────────────────────────────────────
export async function createOrder(params: {
  buyerId: string;    buyerName: string;  buyerPhoto?: string;
  sellerId: string;   sellerName: string; sellerPhoto?: string;
  productId: string;  productTitle: string; productImage: string;
  productPrice: number;
  deliveryFee?: number;
  paymentInfo: PaymentInfo;
  deliveryType: 'delivery' | 'in_person';
  isCOD?: boolean;
}): Promise<string> {
  const { brumerieFee, sellerReceives } = calcOrderFees(params.productPrice);
  const isCOD = params.paymentInfo?.method === 'cash_on_delivery' || params.isCOD;
  const initialStatus: OrderStatus = isCOD ? 'cod_pending' : 'initiated';

  const ref = await addDoc(ordersCol, {
    ...params,
    isCOD: isCOD || false,
    brumerieFee,
    sellerReceives,
    status: initialStatus,
    createdAt: serverTimestamp(),
  });

  const orderId = ref.id;
  await notifyBoth({
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

  return ref.id;
}


// ── Acheteur envoie preuve ─────────────────────────────────
export async function submitProof(
  orderId: string,
  proof: { screenshotUrl: string; transactionRef: string },
): Promise<void> {
  const now = new Date();
  // Deadline auto-dispute = maintenant + 24h
  const autoDisputeAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  // Rappel = maintenant + 6h
  const reminderAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;

  await updateDoc(doc(ordersCol, orderId), {
    proof: { ...proof, submittedAt: serverTimestamp() },
    status: 'proof_sent' as OrderStatus,
    proofSentAt: serverTimestamp(),
    autoDisputeAt: Timestamp.fromDate(autoDisputeAt),
    reminderAt: Timestamp.fromDate(reminderAt),
  });

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: `💰 Vérifiez votre solde ${order.paymentInfo.method} !`,
      body: `${order.buyerName} déclare avoir envoyé ${order.productPrice.toLocaleString('fr-FR')} FCFA. Ref: ${proof.transactionRef}. Confirmez la réception.`,
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

// ── COD : Vendeur confirme qu'il est prêt à livrer ────────────
export async function confirmCODReady(orderId: string): Promise<void> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;

  await updateDoc(doc(ordersCol, orderId), {
    status: 'cod_confirmed' as OrderStatus,
    codReadyAt: serverTimestamp(),
  });

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: `📦 Livraison en cours`,
      body: `Vous avez confirmé la mise en livraison de "${order.productTitle}". Attendez la confirmation de réception.`,
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: `🚚 Votre commande arrive !`,
      body: `${order.sellerName} a confirmé l'envoi de "${order.productTitle}". Confirmez la réception et payez à la livraison.`,
      convData: { orderId, productId: order.productId },
    },
  });
}

// ── COD : Acheteur confirme réception + paiement effectué ─────
export async function confirmCODDelivered(orderId: string): Promise<void> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;

  await updateDoc(doc(ordersCol, orderId), {
    status: 'delivered' as OrderStatus,
    deliveredAt: serverTimestamp(),
  });

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

// ── Vendeur confirme réception ─────────────────────────────
export async function confirmPaymentReceived(orderId: string): Promise<void> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;

  await updateDoc(doc(ordersCol, orderId), {
    status: 'confirmed' as OrderStatus,
    confirmedAt: serverTimestamp(),
    sellerBlocked: false,
  });

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: `✅ Paiement confirmé`,
      body: `Vous avez confirmé la réception. Procédez à la livraison de "${order.productTitle}".`,
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: `🎉 Paiement confirmé !`,
      body: `${order.sellerName} a confirmé la réception. Votre commande "${order.productTitle}" est en cours.`,
      convData: { orderId, productId: order.productId },
    },
  });
}


// ── Générer code livraison 6 chars (XK9B2R) ───────────────
function generateDeliveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I,O,0,1 (confusion visuelle)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── Vendeur clique "Prêt à livrer" → génère le code ────────
export async function markReadyToDeliver(orderId: string): Promise<string> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) throw new Error('Commande introuvable');
  const order = { id: snap.id, ...snap.data() } as Order;

  const deliveryCode = generateDeliveryCode();

  await updateDoc(doc(ordersCol, orderId), {
    status: 'ready' as OrderStatus,
    deliveryCode,
    deliveryCodeGeneratedAt: serverTimestamp(),
  });

  // Notifier les deux parties avec leur code
  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: '🔐 Code de livraison généré',
      body: \`Ton code : \${deliveryCode} — Remets ce code à l'acheteur à la livraison uniquement.\`,
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: '🚚 Ton article arrive !',
      body: 'Ton code de confirmation : ' + deliveryCode + ' — Saisis-le sur Brumerie à la réception.',
      convData: { orderId, productId: order.productId },
    },
  });

  return deliveryCode;
}

// ── Acheteur valide le code → livraison confirmée ──────────
export async function validateDeliveryCode(
  orderId: string,
  inputCode: string,
): Promise<{ success: boolean; error?: string }> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return { success: false, error: 'Commande introuvable' };
  const order = { id: snap.id, ...snap.data() } as Order;

  if (order.status !== 'ready') {
    return { success: false, error: 'Commande non prête pour la livraison' };
  }

  if (!order.deliveryCode) {
    return { success: false, error: 'Code de livraison non généré' };
  }

  if (order.deliveryCode.toUpperCase() !== inputCode.trim().toUpperCase()) {
    return { success: false, error: 'Code incorrect — réessaie' };
  }

  // Code valide → livraison confirmée + avis débloqués
  await updateDoc(doc(ordersCol, orderId), {
    status: 'delivered' as OrderStatus,
    deliveredAt: serverTimestamp(),
    deliveryValidatedAt: serverTimestamp(),
    reviewsUnlocked: true,
  });

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
      body: 'Livraison confirmée. Tu peux maintenant noter ' + order.sellerName + ' !',
      convData: { orderId, productId: order.productId },
    },
  });

  return { success: true };
}

// ── Acheteur confirme réception physique ───────────────────
export async function confirmDelivery(orderId: string): Promise<void> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;

  await updateDoc(doc(ordersCol, orderId), {
    status: 'delivered' as OrderStatus,
    deliveredAt: serverTimestamp(),
  });

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

// ── Signalement vendeur / acheteur ─────────────────────────
export async function openOrderDispute(orderId: string, reason: string): Promise<void> {
  const snap = await getDoc(doc(ordersCol, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;

  await updateDoc(doc(ordersCol, orderId), {
    status: 'disputed' as OrderStatus,
    disputedAt: serverTimestamp(),
    disputeReason: reason,
    sellerBlocked: true, // vendeur bloqué jusqu'à résolution
  });

  // Notifier Brumerie via collection reports
  await addDoc(collection(db, 'reports'), {
    type: 'order_dispute',
    orderId,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    productTitle: order.productTitle,
    amount: order.productPrice,
    reason,
    createdAt: serverTimestamp(),
    resolved: false,
  });

  await notifyBoth({
    sellerId: order.sellerId,
    sellerMsg: {
      title: `⚠️ Litige ouvert`,
      body: `Un litige a été signalé sur "${order.productTitle}". Vos publications sont suspendues. Contactez Brumerie.`,
      convData: { orderId, productId: order.productId },
    },
    buyerId: order.buyerId,
    buyerMsg: {
      title: `⚠️ Litige signalé`,
      body: `Votre signalement a été enregistré. L'équipe Brumerie va examiner la situation.`,
      convData: { orderId, productId: order.productId },
    },
  });
}

// ── Vérifier si vendeur est bloqué ────────────────────────
export async function isSellerBlocked(sellerId: string): Promise<boolean> {
  const q = query(
    ordersCol,
    where('sellerId', '==', sellerId),
    where('sellerBlocked', '==', true),
    limit(1),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ── Vérifier commandes expirées (rappel 6h / dispute 24h) ─
export async function checkExpiredOrders(sellerId: string): Promise<void> {
  const now = Timestamp.now();
  const q = query(
    ordersCol,
    where('sellerId', '==', sellerId),
    where('status', '==', 'proof_sent'),
  );
  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const order = { id: d.id, ...d.data() } as any;

    // Rappel 6h
    if (order.reminderAt && order.reminderAt <= now && !order.reminderSentAt) {
      await updateDoc(d.ref, { reminderSentAt: serverTimestamp() });
      await createNotification(
        order.sellerId, 'system',
        `⏳ Rappel : Confirmez le paiement`,
        `L'acheteur ${order.buyerName} attend votre confirmation pour "${order.productTitle}". Il vous reste peu de temps.`,
        { productId: order.productId },
      );
      await showLocalPushNotification(
        `⏳ Confirmez le paiement`,
        `${order.buyerName} attend votre confirmation — "${order.productTitle}"`,
        { type: 'system' },
      );
    }

    // Auto-dispute 24h
    if (order.autoDisputeAt && order.autoDisputeAt <= now) {
      await openOrderDispute(order.id, 'Délai de 24h dépassé sans confirmation vendeur');
    }
  }
}

// ── Listeners temps réel ───────────────────────────────────
export function subscribeToOrder(
  orderId: string,
  callback: (order: Order | null) => void,
): () => void {
  return onSnapshot(doc(ordersCol, orderId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } as Order : null);
  });
}

export function subscribeUserOrders(
  userId: string,
  role: 'buyer' | 'seller',
  callback: (orders: Order[]) => void,
): () => void {
  const field = role === 'buyer' ? 'buyerId' : 'sellerId';
  const q = query(ordersCol, where(field, '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
  });
}

// ── Listener séparé achats ET ventes (pour vendeurs qui achètent aussi) ──
export function subscribeOrdersAsBuyer(
  userId: string,
  callback: (orders: Order[]) => void,
): () => void {
  // Pas de orderBy pour éviter l'index composite Firestore
  const q = query(ordersCol, where('buyerId', '==', userId));
  return onSnapshot(q, snap => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    // Tri client-side par date décroissante
    orders.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
    callback(orders);
  }, (err) => {
    console.error('[subscribeOrdersAsBuyer]', err);
    callback([]);
  });
}

export function subscribeOrdersAsSeller(
  userId: string,
  callback: (orders: Order[]) => void,
): () => void {
  // Pas de orderBy pour éviter l'index composite Firestore
  const q = query(ordersCol, where('sellerId', '==', userId));
  return onSnapshot(q, snap => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    // Tri client-side par date décroissante
    orders.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
    callback(orders);
  }, (err) => {
    console.error('[subscribeOrdersAsSeller]', err);
    callback([]);
  });
}

// ── Helper interne — notifier les 2 parties ────────────────
async function notifyBoth(params: {
  sellerId: string; sellerMsg: { title: string; body: string; convData: any };
  buyerId: string;  buyerMsg:  { title: string; body: string; convData: any };
}): Promise<void> {
  await Promise.all([
    createNotification(params.sellerId, 'system', params.sellerMsg.title, params.sellerMsg.body, params.sellerMsg.convData),
    createNotification(params.buyerId,  'system', params.buyerMsg.title,  params.buyerMsg.body,  params.buyerMsg.convData),
    showLocalPushNotification(params.sellerMsg.title, params.sellerMsg.body, { type: 'system' }),
    showLocalPushNotification(params.buyerMsg.title,  params.buyerMsg.body,  { type: 'system' }),
  ]);
}

// ── Helper countdown ──────────────────────────────────────
export function getCountdown(deadline: any): string {
  if (!deadline) return '';
  const d = deadline?.toDate ? deadline.toDate() : new Date(deadline);
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m.toString().padStart(2, '0')}min`;
}
