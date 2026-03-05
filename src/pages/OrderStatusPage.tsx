// src/pages/OrderStatusPage.tsx — Sprint 5 fix : 2 onglets, pas de conflit de rôle
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToCloudinary } from '@/utils/uploadImage';
import {
  subscribeToOrder, confirmPaymentReceived, submitProof,
  confirmDelivery, openOrderDispute, getCountdown,
  subscribeOrdersAsBuyer, subscribeOrdersAsSeller, checkExpiredOrders,
  confirmCODReady, confirmCODDelivered,
} from '@/services/orderService';
import { Order, OrderStatus, MOBILE_PAYMENT_METHODS } from '@/types';
import { RatingModal } from '@/components/RatingModal';
import { hasReviewed } from '@/services/reviewService';
import { PaymentLogo } from '@/components/PaymentLogo';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface OrderStatusPageProps {
  orderId?: string;
  onBack: () => void;
}

// ── Badge statut ───────────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; bg: string; color: string }> = {
    initiated:  { label: 'Initié',           bg: '#FEF3C7', color: '#92400E' },
    proof_sent: { label: 'Preuve envoyée',    bg: '#DBEAFE', color: '#1D4ED8' },
    confirmed:  { label: 'Paiement confirmé', bg: '#D1FAE5', color: '#065F46' },
    delivered:  { label: 'Livré ✓',          bg: '#DCFCE7', color: '#166534' },
    disputed:   { label: '⚠️ Litige',         bg: '#FFEDD5', color: '#9A3412' },
    cancelled:  { label: 'Annulé',            bg: '#F3F4F6', color: '#374151' },
    cod_pending:   { label: '🤝 Payer à livraison', bg: '#EFF6FF', color: '#1D4ED8' },
    cod_confirmed: { label: '🚚 En livraison',      bg: '#F0FDF4', color: '#166534' },
  };
  const s = map[status] || map.initiated;
  return (
    <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Compte à rebours ──────────────────────────────────────
function Countdown({ deadline, label }: { deadline: any; label: string }) {
  const [text, setText] = useState('');
  useEffect(() => {
    setText(getCountdown(deadline));
    const t = setInterval(() => setText(getCountdown(deadline)), 30000);
    return () => clearInterval(t);
  }, [deadline]);
  if (!deadline || !text || text === 'Expiré') return null;
  return (
    <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 flex items-center gap-3">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <p className="text-[11px] font-black text-orange-800">{label} <span className="text-orange-600">{text}</span></p>
    </div>
  );
}

// ── Carte commande dans la liste ──────────────────────────
function OrderCard({ order, viewAs, onClick }: {
  order: Order; viewAs: 'buyer' | 'seller'; onClick: () => void;
}) {
  const needsAction =
    (viewAs === 'seller' && (order.status === 'proof_sent' || order.status === 'cod_pending')) ||
    (viewAs === 'buyer'  && (order.status === 'confirmed'  || order.status === 'cod_confirmed'));

  const otherName = viewAs === 'buyer' ? order.sellerName : order.buyerName;
  const totalDisplay = (order as any).totalAmount || order.productPrice;

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-all text-left border-b border-slate-50 last:border-0">
      <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
        <img src={order.productImage} alt="" className="w-full h-full object-cover"/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-slate-900 text-[12px] truncate">{order.productTitle}</p>
        <p className="text-slate-400 text-[10px] font-bold truncate">
          {viewAs === 'buyer' ? `Vendeur: ${otherName}` : `Acheteur: ${otherName}`}
        </p>
        <p className="text-green-600 font-bold text-[11px]">{totalDisplay.toLocaleString('fr-FR')} FCFA</p>
        <div className="mt-1"><StatusBadge status={order.status}/></div>
      </div>
      {needsAction && (
        <div className="w-3 h-3 bg-orange-500 rounded-full flex-shrink-0 animate-pulse"/>
      )}
    </button>
  );
}


// ── Upload preuve inline (depuis détail commande) ─────────
function ProofUploadInline({ orderId, order }: { orderId: string; order: Order }) {
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!screenshotPreview || !transactionRef.trim()) return;
    setLoading(true);
    try {
      const cloudUrl = await uploadToCloudinary(screenshotPreview);
      await submitProof(orderId, { screenshotUrl: cloudUrl, transactionRef: transactionRef.trim() });
      setDone(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div className="bg-green-50 rounded-2xl p-4 border border-green-100 text-center">
      <p className="font-black text-green-800 text-[12px]">✅ Preuve envoyée ! Le vendeur va confirmer sous 24h.</p>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Envoyer votre preuve de paiement</p>
      {/* Screenshot */}
      <button onClick={() => fileRef.current?.click()}
        className={`w-full rounded-2xl border-2 border-dashed overflow-hidden transition-all ${screenshotPreview ? 'border-green-400' : 'border-slate-200 bg-slate-50'}`}
        style={{ minHeight: 100 }}>
        {screenshotPreview
          ? <img src={screenshotPreview} alt="Preuve" className="w-full object-contain max-h-40"/>
          : <div className="flex flex-col items-center justify-center py-6 gap-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tap pour uploader le reçu</p>
            </div>
        }
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
      {/* Transaction ref */}
      <input type="text" value={transactionRef} onChange={e => setTransactionRef(e.target.value)}
        placeholder="ID / Référence de transaction"
        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-[12px] font-mono border-2 border-transparent focus:border-green-500 outline-none tracking-wider"/>
      <button onClick={handleSubmit} disabled={!screenshotPreview || !transactionRef.trim() || loading}
        className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white shadow-lg shadow-green-200 active:scale-95 transition-all disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : 'Envoyer la preuve →'}
      </button>
    </div>
  );
}

// ── Détail d'une commande ─────────────────────────────────
function OrderDetail({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const { currentUser } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeToOrder(orderId, (o) => {
      setOrder(o);
    });
    return unsub;
  }, [orderId]);

  if (!order || !currentUser) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"/>
    </div>
  );

  const isBuyer  = order.buyerId  === currentUser.uid;
  const isSeller = order.sellerId === currentUser.uid;
  const method = MOBILE_PAYMENT_METHODS.find(m => m.id === order.paymentInfo?.method);
  const totalDisplay = (order as any).totalAmount || order.productPrice;
  const deliveryFee = (order as any).deliveryFee || 0;

  const act = async (fn: () => Promise<void>) => {
    setLoading(true); await fn(); setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-5 flex items-center gap-4 border-b border-slate-100 z-40">
        <button onClick={onBack} className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-slate-900 text-[13px] uppercase tracking-tight truncate">{order.productTitle}</h1>
          <div className="mt-0.5"><StatusBadge status={order.status}/></div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-5">

        {/* Produit + montant */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
            <img src={order.productImage} alt="" className="w-full h-full object-cover"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-sm">{order.productTitle}</p>
            <div className="space-y-0.5 mt-1">
              <p className="text-green-600 font-black text-base">{totalDisplay.toLocaleString('fr-FR')} FCFA</p>
              {deliveryFee > 0 && (
                <p className="text-[10px] text-slate-400 font-bold">
                  Article {order.productPrice.toLocaleString('fr-FR')} + Livraison {deliveryFee.toLocaleString('fr-FR')} FCFA
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Parties impliquées */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Acheteur</p>
            <p className="font-black text-slate-900 text-[12px] truncate">{order.buyerName}</p>
            {isBuyer && <span className="text-[8px] text-blue-500 font-bold">← Toi</span>}
          </div>
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-1">Vendeur</p>
            <p className="font-black text-slate-900 text-[12px] truncate">{order.sellerName}</p>
            {isSeller && <span className="text-[8px] text-green-500 font-bold">← Toi</span>}
          </div>
        </div>

        {/* Compte à rebours vendeur */}
        {order.status === 'proof_sent' && isSeller && (
          <Countdown deadline={(order as any).autoDisputeAt} label="⏳ Il vous reste"/>
        )}

        {/* Stepper — 2 étapes COD, 4 étapes paiement mobile */}
        <div className="space-y-3">
          {(order.isCOD ? [
            { label: '🤝 Commande confirmée',        done: true },
            { label: '🚚 En cours de livraison',     done: ['cod_confirmed','delivered'].includes(order.status) },
            { label: '✅ Reçu & payé',               done: order.status === 'delivered' },
          ] : [
            { label: '🛍️ Commande initiée',              done: true },
            { label: '📸 Preuve envoyée',                done: ['proof_sent','confirmed','delivered','disputed'].includes(order.status) },
            { label: '✅ Paiement confirmé',             done: ['confirmed','delivered'].includes(order.status) },
            { label: '📦 Livraison confirmée',           done: order.status === 'delivered' },
          ]).map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${s.done ? 'bg-green-500' : 'bg-slate-100'}`}>
                {s.done
                  ? <svg width="14" height="14" fill="none" stroke="white" strokeWidth="3"><path d="M11 4L5 10l-3-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <span className="text-[10px] font-black text-slate-400">{i+1}</span>}
              </div>
              <p className={`text-[12px] ${s.done ? 'font-black text-slate-900' : 'font-medium text-slate-400'}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Preuve */}
        {order.proof && (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preuve de paiement</p>
            <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
              <img src={order.proof.screenshotUrl} alt="Preuve" className="w-full object-contain max-h-48"/>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold">Référence</span>
              <span className="font-black text-slate-900 text-[12px] font-mono">{order.proof.transactionRef}</span>
            </div>
          </div>
        )}

        {/* Coordonnées paiement (rappel vendeur) */}
        {isSeller && order.paymentInfo && order.status === 'proof_sent' && (
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
            {method && <PaymentLogo logo={method.logo} name={method.name} color={method.color} size={40} />}
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">{method?.name}</p>
              <p className="font-black text-slate-900">{order.paymentInfo.phone} · {order.paymentInfo.holderName}</p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            FLUX COD — PAYER À LA LIVRAISON
        ══════════════════════════════════════════════════ */}

        {/* VENDEUR — Étape 1 : confirmer mise en livraison */}
        {isSeller && order.status === 'cod_pending' && (
          <div className="space-y-3 pt-2">
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-[10px] font-black text-blue-800 uppercase mb-1">🤝 Nouvelle commande à livrer</p>
              <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                L'acheteur paiera à la réception. Confirmez dès que vous êtes prêt à livrer.
              </p>
            </div>
            <button onClick={() => act(() => confirmCODReady(orderId))} disabled={loading}
              className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
                : '📦 Je mets en livraison →'}
            </button>
            <button onClick={() => setShowDisputeForm(true)}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-100 active:scale-95 transition-all">
              Signaler un problème
            </button>
          </div>
        )}

        {/* VENDEUR — Étape 2 : en attente de confirmation acheteur */}
        {isSeller && order.status === 'cod_confirmed' && (
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <p className="text-[10px] font-black text-green-800 uppercase mb-1">🚚 Livraison en cours</p>
            <p className="text-[11px] text-green-700 font-bold">
              En attente de la confirmation de réception par l'acheteur. Le paiement sera encaissé à la livraison.
            </p>
          </div>
        )}

        {/* ACHETEUR — Étape 1 : attente livraison */}
        {isBuyer && order.status === 'cod_pending' && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-[10px] font-black text-blue-800 uppercase mb-1">🤝 Paiement à la livraison</p>
            <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
              Commande confirmée ! Le vendeur va préparer la livraison. Vous paierez <span className="text-blue-900">{totalDisplay.toLocaleString('fr-FR')} FCFA</span> à la réception.
            </p>
          </div>
        )}

        {/* ACHETEUR — Étape 2 : confirmer réception + paiement */}
        {isBuyer && order.status === 'cod_confirmed' && (
          <div className="space-y-3 pt-2">
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
              <p className="text-[10px] font-black text-green-800 uppercase mb-1">🚚 Votre commande arrive !</p>
              <p className="text-[11px] text-green-700 font-bold leading-relaxed">
                {order.sellerName} a confirmé l'envoi. Payez <span className="text-green-900 font-black">{totalDisplay.toLocaleString('fr-FR')} FCFA</span> au livreur et confirmez la réception.
              </p>
            </div>
            <button onClick={() => act(async () => {
              await confirmCODDelivered(orderId);
              try { await updateDoc(doc(db, 'products', order.productId), { status: 'sold' }); } catch {}
              setShowRatingModal(true);
            })} disabled={loading}
              className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-xl shadow-green-200 active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
                : "J'ai reçu et payé ✓"}
            </button>
            <button onClick={() => setShowDisputeForm(true)}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-100 active:scale-95 transition-all">
              Signaler un problème
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            FLUX MOBILE MONEY
        ══════════════════════════════════════════════════ */}

        {/* ── ACTIONS VENDEUR — paiement mobile ── */}
        {isSeller && order.status === 'proof_sent' && (
          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vérifiez votre solde puis confirmez</p>
            <button onClick={() => act(() => confirmPaymentReceived(orderId))} disabled={loading}
              className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-xl shadow-green-200 active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : "J'ai reçu le paiement ✓"}
            </button>
            <button onClick={() => setShowDisputeForm(true)}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-100 active:scale-95 transition-all">
              Signaler un problème
            </button>
          </div>
        )}

        {/* ── ACHETEUR — Mobile money : en attente preuve ── */}
        {isBuyer && order.status === 'initiated' && (
          <div className="space-y-3 pt-2">
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-[10px] font-black text-amber-800 uppercase mb-1">En attente de votre preuve</p>
              <p className="text-[11px] text-amber-800 font-bold">
                Effectuez le virement {order.paymentInfo?.method && `${order.paymentInfo.method.toUpperCase()}`} au {order.paymentInfo?.phone}, puis uploadez votre preuve ici.
              </p>
            </div>
            {/* Upload preuve inline — évite de perdre la commande si on quitte */}
            <ProofUploadInline orderId={orderId} order={order} />
          </div>
        )}

        {isBuyer && order.status === 'proof_sent' && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-[11px] text-blue-800 font-bold">
              ⏳ Preuve envoyée. Le vendeur a 24h pour confirmer la réception.
            </p>
          </div>
        )}

        {isBuyer && order.status === 'confirmed' && (
          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avez-vous reçu l'article ?</p>
            <button onClick={() => act(async () => {
              await confirmDelivery(orderId);
              // Auto-marquer le produit comme vendu
              try { await updateDoc(doc(db, 'products', order.productId), { status: 'sold' }); } catch {}
              setShowRatingModal(true);
            })} disabled={loading}
              className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-xl shadow-blue-200 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : "J'ai reçu l'article ✓"}
            </button>
            <button onClick={() => setShowDisputeForm(true)}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-100 active:scale-95 transition-all">
              Signaler un problème
            </button>
          </div>
        )}

        {order.status === 'disputed' && (
          <div className="bg-orange-50 rounded-2xl p-5 border border-orange-200">
            <p className="font-black text-orange-900 text-[12px] uppercase mb-2">⚠️ Litige en cours</p>
            <p className="text-[11px] text-orange-800 font-medium leading-relaxed">
              L'équipe Brumerie examine ce dossier. Vous serez contacté sous 48h.
            </p>
            {order.disputeReason && (
              <p className="text-[10px] text-orange-600 font-bold mt-2">Motif : {order.disputeReason}</p>
            )}
          </div>
        )}

        {order.status === 'delivered' && (
          <div className="bg-green-50 rounded-2xl p-5 border border-green-100 text-center">
            <p className="text-3xl mb-2">🎉</p>
            <p className="font-black text-green-900 text-[13px] uppercase tracking-tight">Transaction terminée !</p>
          </div>
        )}
      </div>

      {/* Modale notation post-livraison (mobile money ET COD) */}
      {showRatingModal && currentUser && order.status === 'delivered' && isBuyer && (
        <RatingModal
          orderId={orderId}
          productId={order.productId}
          productTitle={order.productTitle}
          productImage={order.productImage}
          fromUserId={currentUser.uid}
          fromUserName={order.buyerName}
          fromUserPhoto={order.buyerPhoto || undefined}
          toUserId={order.sellerId}
          toUserName={order.sellerName}
          role="buyer_to_seller"
          onDone={() => setShowRatingModal(false)}
          onSkip={() => setShowRatingModal(false)}
        />
      )}

      {/* Modal signalement */}
      {showDisputeForm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 space-y-5">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto"/>
            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight text-center">Signaler un problème</h3>
            <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
              placeholder="Décrivez le problème..." rows={4}
              className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-[13px] border-2 border-transparent focus:border-orange-400 outline-none resize-none"/>
            <div className="flex flex-col gap-3">
              <button onClick={() => act(() => openOrderDispute(orderId, disputeReason)).then(() => setShowDisputeForm(false))}
                disabled={!disputeReason.trim() || loading}
                className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white bg-orange-500 shadow-lg active:scale-95 disabled:opacity-50 transition-all">
                Envoyer le signalement
              </button>
              <button onClick={() => setShowDisputeForm(false)}
                className="w-full py-3 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale avec 2 onglets ────────────────────────
export function OrderStatusPage({ orderId, onBack }: OrderStatusPageProps) {
  const { currentUser, userProfile } = useAuth();
  const [tab, setTab] = useState<'purchases' | 'sales'>('purchases');
  const [purchases, setPurchases] = useState<Order[]>([]); // buyerId === moi
  const [sales, setSales] = useState<Order[]>([]);          // sellerId === moi
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(orderId || '');

  useEffect(() => {
    if (!currentUser) return;
    checkExpiredOrders(currentUser.uid);

    let purchasesLoaded = false;
    let salesLoaded = false;

    const unsubBuyer = subscribeOrdersAsBuyer(currentUser.uid, (ords) => {
      setPurchases(ords);
      purchasesLoaded = true;
      if (purchasesLoaded && salesLoaded) setLoading(false);
    });

    const unsubSeller = subscribeOrdersAsSeller(currentUser.uid, (ords) => {
      setSales(ords);
      salesLoaded = true;
      if (purchasesLoaded && salesLoaded) setLoading(false);
    });

    // Safety timeout étendu - Firestore peut être lent
    const t = setTimeout(() => setLoading(false), 5000);

    return () => { unsubBuyer(); unsubSeller(); clearTimeout(t); };
  }, [currentUser]);

  if (selectedOrderId) {
    return <OrderDetail orderId={selectedOrderId} onBack={() => setSelectedOrderId('')}/>;
  }

  const isSeller = userProfile?.role === 'seller';
  const pendingSales     = sales.filter(o => o.status === 'proof_sent' || o.status === 'cod_pending').length;
  const pendingPurchases = purchases.filter(o => o.status === 'confirmed' || o.status === 'cod_confirmed').length;
  const currentList = tab === 'purchases' ? purchases : sales;
  const currentRole = tab === 'purchases' ? 'buyer' : 'seller';

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-5 flex items-center gap-4 border-b border-slate-100 z-40">
        <button onClick={onBack} className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="font-black text-slate-900 text-base uppercase tracking-tight">Mes Commandes</h1>
      </div>

      {/* Onglets */}
      <div className="flex gap-3 px-5 pt-5 pb-4">
        <button onClick={() => setTab('purchases')}
          className={`flex-1 relative py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 ${tab === 'purchases' ? 'text-white shadow-xl shadow-blue-200' : 'text-slate-500 bg-slate-50'}`}
          style={tab === 'purchases' ? { background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' } : {}}>
          🛒 Mes achats
          {pendingPurchases > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white">
              <span className="text-[8px] font-black text-white">{pendingPurchases}</span>
            </span>
          )}
        </button>
        <button onClick={() => setTab('sales')}
          className={`flex-1 relative py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 ${tab === 'sales' ? 'text-white shadow-xl shadow-green-200' : 'text-slate-500 bg-slate-50'}`}
          style={tab === 'sales' ? { background: 'linear-gradient(135deg, #16A34A, #115E2E)' } : {}}>
          🏪 Mes ventes
          {pendingSales > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white">
              <span className="text-[8px] font-black text-white">{pendingSales}</span>
            </span>
          )}
        </button>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex items-center justify-center pt-24">
          <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"/>
        </div>
      ) : currentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 px-10 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
            </svg>
          </div>
          <p className="font-black text-slate-900 uppercase tracking-tight text-lg mb-2">
            {tab === 'purchases' ? 'Aucun achat' : 'Aucune vente'}
          </p>
          <p className="text-slate-400 text-[11px]">
            {tab === 'purchases'
              ? 'Vos achats apparaîtront ici. Si vous avez une commande en cours, vérifiez vos notifications.'
              : 'Les commandes reçues apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <div>
          {currentList.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              viewAs={currentRole}
              onClick={() => setSelectedOrderId(order.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
