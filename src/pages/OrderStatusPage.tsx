// src/pages/OrderStatusPage.tsx — Sprint 5 fix : 2 onglets, pas de conflit de rôle
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToCloudinary } from '@/utils/uploadImage';
import {
  subscribeToOrder, confirmPaymentReceived, submitProof,
  confirmDelivery, openOrderDispute, getCountdown, cancelDelivery,
  subscribeOrdersAsBuyer, subscribeOrdersAsSeller, checkExpiredOrders,
  confirmCODReady, confirmCODDelivered,
  markReadyToDeliver, validateDeliveryCode,
} from '@/services/orderService';
import { Order, OrderStatus, MOBILE_PAYMENT_METHODS } from '@/types';
import { RatingModal } from '@/components/RatingModal';
import { hasReviewed } from '@/services/reviewService';
import { PaymentLogo } from '@/components/PaymentLogo';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { DelivererPicker } from '@/components/DelivererPicker';
import { DelivererProfilePage } from '@/pages/DelivererProfilePage';
import { getDelivererById, confirmDeliveryByBuyer } from '@/services/deliveryService';
import { QRScanner } from '@/components/QRScanner';
import { BuyerPaymentBlock } from '@/components/BuyerPaymentBlock';
import { QRDisplay } from '@/components/QRDisplay';
import { buildQRPayload } from '@/utils/qrCode';

interface OrderStatusPageProps {
  orderId?: string;
  onBack: () => void;
  onOpenChatWithSeller?: (sellerId: string, sellerName: string, productId?: string, productTitle?: string) => void;
}

// ── Bouton Appel avec numéro du vendeur ────────────────────
function AppelButton({ order, orderId }: { order: Order; orderId: string }) {
  const [sellerPhone, setSellerPhone] = React.useState<string>('');

  React.useEffect(() => {
    // Récupérer le numéro Appel du vendeur depuis Firestore
    import('firebase/firestore').then(({ getDoc, doc }) =>
      import('@/config/firebase').then(({ db }) =>
        getDoc(doc(db, 'users', order.sellerId)).then(snap => {
          if (snap.exists()) {
            const d = snap.data();
            const phone = d.telNumber || d.phone || '';
            setSellerPhone(phone.replace(/\D/g, ''));
          }
        })
      )
    );
  }, [order.sellerId]);

  const msg = encodeURIComponent(
    `Bonjour, je suis ${order.buyerName} 👋\n` +
    `J'ai commandé "${order.productTitle}" sur Brumerie ` +
    `(Commande #${orderId.slice(-6).toUpperCase()}).\n` +
    `Montant : ${order.productPrice.toLocaleString('fr-FR')} FCFA\n` +
    `Puis-je avoir plus d'informations ?`
  );

  if (!sellerPhone) return (
    <div className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 bg-slate-100">
      Appel N/D
    </div>
  );

  return (
    <a href={'tel:' + sellerPhone}
      className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
      style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
      Appeler
    </a>
  );
}

// ── Composant saisie code livraison ──────────────────────────
function DeliveryCodeInput({ orderId, order, onValidated }: {
  orderId: string; order: Order; onValidated: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    if (code.trim().length !== 6) { setError('Le code doit faire 6 caractères'); return; }
    setLoading(true); setError(null);
    const result = await validateDeliveryCode(orderId, code);
    setLoading(false);
    if (result.success) { onValidated(); }
    else { setError(result.error || 'Code incorrect'); }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200">
        <p className="text-[10px] font-black text-yellow-800 uppercase tracking-widest mb-1">Code de confirmation</p>
        <p className="text-[11px] text-yellow-800 font-bold">
          Pas de caméra ? Entre le code à 6 caractères donné par le livreur.
        </p>
      </div>
      <input
        value={code}
        onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
        maxLength={6}
        placeholder="Ex: XK9B2R"
        className="w-full bg-slate-50 border-2 border-slate-200 focus:border-green-400 rounded-2xl px-5 py-4 text-center text-2xl font-black tracking-[0.4em] font-mono uppercase outline-none transition-colors"
      />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-[12px] font-bold text-center">
          ⚠️ {error}
        </div>
      )}
      <button onClick={handleValidate} disabled={loading || code.length !== 6}
        className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-xl shadow-green-200 active:scale-95 transition-all disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
        {loading
          ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
          : '✅ Valider — Confirmer la réception'}
      </button>
      <p className="text-[10px] text-slate-400 text-center font-bold">
        En validant ce code, tu confirmes avoir reçu l'article en bon état.
      </p>
    </div>
  );
}

// ── Badge statut ───────────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    initiated:     { label: 'Initié',               bg: '#FEF3C7', color: '#92400E' },
    proof_sent:    { label: 'Preuve envoyée',        bg: '#DBEAFE', color: '#1D4ED8' },
    confirmed:     { label: 'Paiement confirmé',     bg: '#D1FAE5', color: '#065F46' },
    ready:         { label: '📦 Prêt à livrer',      bg: '#FEF9C3', color: '#854D0E' },
    picked:        { label: '🛵 En route',            bg: '#FEF3C7', color: '#92400E' },
    delivered:     { label: 'Livré ✓',               bg: '#DCFCE7', color: '#166534' },
    disputed:      { label: '⚠️ Litige',              bg: '#FFEDD5', color: '#9A3412' },
    cancelled:     { label: 'Annulé',                bg: '#F3F4F6', color: '#374151' },
    cod_pending:   { label: '🤝 Payer à livraison',  bg: '#EFF6FF', color: '#1D4ED8' },
    cod_confirmed: { label: '🚚 En livraison',        bg: '#F0FDF4', color: '#166534' },
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

// ── SellerPaymentMethods — méthodes de paiement cliquables avec numéro vendeur ──
function SellerPaymentMethods({ order }: { order: Order }) {
  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(null);
  const [paid, setPaid] = React.useState(false);
  const [savingPayment, setSavingPayment] = React.useState(false);
  const [paidAmount] = React.useState((order as any).productPrice || order.price || 0);
  const [liveSellerMethods, setLiveSellerMethods] = React.useState<import('@/types').PaymentInfo[] | null>(null);

  // Sauvegarder le moyen de paiement choisi dans Firestore
  const confirmPaymentChosen = async (methodId: string, methodName: string, phone?: string | null) => {
    setSavingPayment(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        chosenPaymentMethod: { method: methodId, methodName, phone: phone || null },
      });
    } catch(e) { console.error(e); }
    finally { setSavingPayment(false); setPaid(true); }
  };

  // Charger les numéros vendeur depuis son profil si absent dans la commande
  React.useEffect(() => {
    const fromOrder = (order as any).sellerPaymentMethods;
    if (fromOrder && fromOrder.length > 0) { setLiveSellerMethods(fromOrder); return; }
    import('firebase/firestore').then(({ getDoc, doc: fDoc }) => {
      import('@/config/firebase').then(({ db }) => {
        getDoc(fDoc(db, 'users', order.sellerId)).then(snap => {
          if (snap.exists()) setLiveSellerMethods(snap.data().defaultPaymentMethods || []);
        });
      });
    });
  }, [order.sellerId]);

  const sellerMethods: import('@/types').PaymentInfo[] = liveSellerMethods
    ?? ((order as any).sellerPaymentMethods)
    ?? [];

  if (paid) return (
    <div className="bg-green-50 rounded-xl p-3 border border-green-200">
      <p className="text-[11px] font-black text-green-700">
        ✅ Tu as déclaré avoir envoyé {paidAmount.toLocaleString('fr-FR')} FCFA au vendeur via {selectedMethod}.
      </p>
      <p className="text-[9px] text-green-600 mt-1">Le vendeur validera la réception de ton paiement.</p>
    </div>
  );

  const methodsToShow = MOBILE_PAYMENT_METHODS.map(m => {
    const found = sellerMethods.find(sm => sm.method === m.id);
    return { ...m, phone: found?.phone || null, holderName: found?.holderName || null, waveLink: found?.waveLink || null };
  });

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Choisir un moyen de paiement</p>
      <div className="grid grid-cols-2 gap-2">
        {methodsToShow.map(m => (
          <button key={m.id}
            onClick={() => setSelectedMethod(selectedMethod === m.id ? null : m.id)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all active:scale-95 text-left ${
              selectedMethod === m.id
                ? 'border-green-400 bg-green-50 shadow-sm'
                : 'border-amber-100 bg-white'
            }`}>
            <img src={m.logo} alt={m.name}
              className="w-6 h-6 rounded object-contain flex-shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
            />
            <span className="text-[10px] font-black text-slate-700 truncate">{m.name}</span>
          </button>
        ))}
        <button
          onClick={() => setSelectedMethod(selectedMethod === 'cash' ? null : 'cash')}
          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all active:scale-95 text-left ${
            selectedMethod === 'cash'
              ? 'border-amber-400 bg-amber-50 shadow-sm'
              : 'border-amber-100 bg-white'
          }`}>
          <span className="text-lg">💵</span>
          <span className="text-[10px] font-black text-slate-700">Espèces</span>
        </button>
      </div>

      {/* Numéro vendeur pour la méthode sélectionnée */}
      {selectedMethod && selectedMethod !== 'cash' && (() => {
        const m = methodsToShow.find(x => x.id === selectedMethod);
        if (!m) return null;
        const phone = m.phone || (order as any).paymentInfo?.phone;
        const holder = m.holderName || (order as any).paymentInfo?.holderName;
        if (!phone) return (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[10px] text-slate-500 text-center">
              Numéro non renseigné — contacte le vendeur directement.
            </p>
          </div>
        );
        return (
          <div className="bg-white rounded-xl p-4 border border-green-200 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">{m.name} · {(order as any).sellerName}</p>
                <p className="font-black text-slate-900 text-[18px] tracking-widest mt-1">{phone}</p>
                {holder && <p className="text-[10px] text-slate-500">{holder}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                {m.waveLink ? (
                  <a href={m.waveLink} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl font-black text-[9px] text-white active:scale-95 text-center"
                    style={{ background: m.color }}>
                    Ouvrir
                  </a>
                ) : null}
                <button onClick={() => navigator.clipboard?.writeText(phone)}
                  className="px-3 py-2 rounded-xl bg-slate-100 font-black text-[9px] text-slate-600 active:scale-95">
                  Copier
                </button>
              </div>
            </div>
            <button
              onClick={() => confirmPaymentChosen(m.id, m.name, m.phone)}
              disabled={savingPayment}
              className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${m.color},${m.color}CC)` }}>
              {savingPayment ? '⏳ Enregistrement...' : `✅ Paiement envoyé — ${paidAmount.toLocaleString('fr-FR')} FCFA via ${m.name}`}
            </button>
          </div>
        );
      })()}

      {selectedMethod === 'cash' && (
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 space-y-2">
          <p className="text-[10px] text-amber-700 font-bold">
            💵 Règlement en espèces directement lors de la remise de l&apos;article.
          </p>
          <button
            onClick={() => confirmPaymentChosen('especes', 'Espèces', null)}
            disabled={savingPayment}
            className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-white active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
            {savingPayment ? '⏳...' : '✅ Confirmer — paiement en espèces'}
          </button>
        </div>
      )}
    </div>
  );
}

function OrderDetail({ orderId, onBack, onOpenChatWithSeller }: { orderId: string; onBack: () => void; onOpenChatWithSeller?: (sellerId: string, sellerName: string, productId?: string, productTitle?: string) => void }) {
  const { currentUser, userProfile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showDelivererRatingModal, setShowDelivererRatingModal] = useState(false);
  const [showSellerDelivererRatingModal, setShowSellerDelivererRatingModal] = useState(false);
  const [showDelivererPicker, setShowDelivererPicker] = useState(false);
  const [viewDelivererId, setViewDelivererId] = useState<string | null>(null);
  const [delivererInfo, setDelivererInfo] = useState<any>(null);
  // QR
  const [showSellerQR, setShowSellerQR] = useState(false);      // Vendeur affiche son QR au livreur
  const [showBuyerScanner, setShowBuyerScanner] = useState(false); // Acheteur scanne QR livreur
  const [showCancelDelivery, setShowCancelDelivery] = useState(false); // Modal annulation livraison
  const [cancelReason, setCancelReason] = useState('');


  useEffect(() => {
    const unsub = subscribeToOrder(orderId, (o) => {
      setOrder(o);
    });
    return unsub;
  }, [orderId]);

  useEffect(() => {
    if ((order as any)?.delivererId) {
      getDelivererById((order as any).delivererId).then(d => setDelivererInfo(d));
    }
  }, [(order as any)?.delivererId]);

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

        {/* ── BOUTONS CONTACT — Chat intégré + Appel ── */}
        {isBuyer && !['delivered', 'cancelled'].includes(order.status) && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onOpenChatWithSeller?.(order.sellerId, order.sellerName, order.productId, order.productTitle)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Chat
            </button>
            <AppelButton order={order} orderId={orderId} />
          </div>
        )}
        {isSeller && !['delivered', 'cancelled'].includes(order.status) && (
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => onOpenChatWithSeller?.(order.buyerId, order.buyerName, order.productId, order.productTitle)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Chat avec l'acheteur
            </button>
          </div>
        )}

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

        {/* ── BLOC LIVREUR ── */}
        {(() => {
          const ord = order as any;
          const hasDeliverer = !!ord.delivererId;
          const canAddDeliverer = !hasDeliverer && !['delivered','cancelled'].includes(order.status);
          return (
            <>
              {/* Livreur assigné */}
              {hasDeliverer && delivererInfo && (
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                  <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2">🛵 Livreur assigné</p>
                  <div className="flex items-center gap-3">
                    {delivererInfo.photoURL
                      ? <img src={delivererInfo.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0"/>
                      : <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-lg flex-shrink-0">🛵</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-[13px]">
                        {delivererInfo.deliveryPartnerName || delivererInfo.name}
                      </p>
                      <p className="text-[10px] text-slate-500">📍 {(delivererInfo.deliveryZones||[]).join(' · ')}</p>
                    </div>
                    <button
                      onClick={() => setViewDelivererId(ord.delivererId)}
                      className="px-3 py-2 rounded-xl bg-white border border-orange-200 text-[10px] font-black text-orange-600 active:scale-95">
                      Profil
                    </button>
                  </div>
                  {/* Contact livreur */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => onOpenChatWithSeller?.(ord.delivererId, delivererInfo.deliveryPartnerName || delivererInfo.name, ord.delivererId, 'Livraison ' + (order.productTitle || ''))}
                      className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest active:scale-95">
                      💬 Contacter
                    </button>
                    {delivererInfo.phone && (
                      <a href={"tel:" + delivererInfo.phone.replace(/\D/g, '')}
                        className="px-4 py-2.5 rounded-xl bg-green-500 text-white font-black text-[12px] active:scale-95 flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                        Appel
                      </a>
                    )}
                    {/* Changer de livreur */}
                    <button
                      onClick={() => setShowDelivererPicker(true)}
                      className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-black text-[10px] active:scale-95">
                      Changer
                    </button>
                    {/* Annuler livraison */}
                    {['ready','cod_confirmed','picked'].includes(order.status) && (
                      <button
                        onClick={() => setShowCancelDelivery(true)}
                        className="px-3 py-2.5 rounded-xl bg-red-50 text-red-500 font-black text-[10px] active:scale-95">
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Pas encore de livreur — proposer d'en ajouter un */}
              {canAddDeliverer && (
                <button
                  onClick={() => setShowDelivererPicker(true)}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 font-black text-[11px] text-orange-600 uppercase tracking-widest active:scale-95 transition-all">
                  🛵 Choisir un livreur Brumerie
                </button>
              )}

              {/* DelivererPicker overlay */}
              {showDelivererPicker && (
                <DelivererPicker
                  order={order}
                  onDone={(deliverer, fee) => {
                    setShowDelivererPicker(false);
                    setDelivererInfo(deliverer);
                  }}
                  onClose={() => setShowDelivererPicker(false)}
                />
              )}

              {/* Profil livreur overlay */}
              {viewDelivererId && (
                <DelivererProfilePage
                  delivererId={viewDelivererId}
                  onBack={() => setViewDelivererId(null)}
                  onContact={(d) => {
                    setViewDelivererId(null);
                    onOpenChatWithSeller?.(d.id, d.deliveryPartnerName || d.name);
                  }}
                />
              )}
            </>
          );
        })()}

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
            { label: '📸 Preuve envoyée',   done: ['proof_sent','confirmed','ready','picked','delivered','disputed'].includes(order.status) },
            { label: '✅ Paiement confirmé', done: ['confirmed','ready','picked','delivered'].includes(order.status) },
            { label: '🛵 En route',          done: ['picked','delivered'].includes(order.status) },
            { label: '📦 Livré',             done: order.status === 'delivered' },
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
        {/* ══ COD — VENDEUR : Étape 1 — Prêt à livrer → génère QR escrow ══ */}
        {isSeller && order.status === 'cod_pending' && (
          <div className="space-y-3 pt-2">
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-[10px] font-black text-blue-800 uppercase mb-1">🤝 Nouvelle commande COD</p>
              <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                L'acheteur paiera à la réception. Quand tu es prêt, clique pour générer le QR de livraison.
              </p>
            </div>
            <button onClick={() => act(() => confirmCODReady(orderId))} disabled={loading}
              className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
                : '📦 Prêt — Générer le QR de livraison'}
            </button>
            <button onClick={() => setShowDisputeForm(true)}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-100 active:scale-95 transition-all">
              Signaler un problème
            </button>
          </div>
        )}

        {/* ══ COD — VENDEUR : Étape 2 — QR généré, montrer au livreur ══ */}
        {isSeller && order.status === 'cod_confirmed' && order.deliveryCode && (
          <div className="space-y-3 pt-2">
            {showSellerQR && (
              <QRDisplay
                title="Mon QR Vendeur"
                subtitle="Fais scanner par le livreur"
                code={order.deliveryCode}
                qrPayload={(order as any).qrPickupPayload || buildQRPayload('pickup', orderId, order.deliveryCode)}
                color="#115E2E"
                emoji="📦"
                instruction="Le livreur scanne ce QR quand il vient récupérer le colis — confirme la prise en charge."
                onClose={() => setShowSellerQR(false)}
              />
            )}
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100 space-y-3">
              <div>
                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">📦 En attente du livreur</p>
                <p className="text-[11px] text-green-700">
                  Montre ton QR au livreur quand il arrive. L&apos;acheteur recevra son QR de réception.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSellerQR(true)}
                  className="flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
                  📲 Afficher mon QR
                </button>
                <div className="flex-1 bg-slate-900 rounded-xl flex items-center justify-center py-1">
                  <span className="text-[18px] font-black text-yellow-300 tracking-[0.3em] font-mono">{order.deliveryCode}</span>
                </div>
              </div>
              {/* Bouton confirmation paiement reçu de l'acheteur */}
              {!(order as any).sellerPaymentConfirmed && (
                <div className="border-t border-green-200 pt-3">
                  <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-2">
                    💰 L&apos;acheteur a payé ?
                  </p>
                  <button
                    onClick={async () => {
                      const { updateDoc, doc } = await import('firebase/firestore');
                      const { db } = await import('@/config/firebase');
                      await updateDoc(doc(db, 'orders', orderId), { sellerPaymentConfirmed: true });
                    }}
                    className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
                    ✅ Confirmer réception du paiement
                  </button>
                  <p className="text-[9px] text-green-600 text-center mt-1">
                    L&apos;acheteur pourra ensuite scanner le QR du livreur.
                  </p>
                </div>
              )}
              {(order as any).sellerPaymentConfirmed && (
                <div className="border-t border-green-200 pt-3 flex items-center gap-2">
                  <span className="text-green-600 text-lg">✅</span>
                  <p className="text-[11px] font-black text-green-700">Paiement confirmé — acheteur peut scanner le livreur</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Système Autoriser/Bloquer supprimé — flux simplifié */}

        {/* ══ COD ESPÈCES — VENDEUR : delivered → Confirmer réception argent + noter livreur ══ */}
        {isSeller && order.status === 'delivered' && (order as any).isCOD && (
          <div className="space-y-3 pt-2">
            {!(order as any).sellerReceivedCash && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-3">
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">
                  💵 As-tu reçu ton argent du livreur ?
                </p>
                <p className="text-[11px] text-amber-700">
                  La livraison est confirmée. Le livreur doit te remettre <span className="font-black">{(order as any).productPrice?.toLocaleString('fr-FR') || '—'} FCFA</span>.
                </p>
                <button
                  onClick={async () => {
                    const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
                    const { db } = await import('@/config/firebase');
                    await updateDoc(doc(db, 'orders', orderId), {
                      sellerReceivedCash: true,
                      sellerReceivedCashAt: serverTimestamp(),
                    });
                    setShowSellerDelivererRatingModal(true);
                  }}
                  className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
                  💰 Confirmer — j&apos;ai reçu mon argent
                </button>
              </div>
            )}
            {(order as any).sellerReceivedCash && (
              <div className="bg-green-50 rounded-2xl p-4 border border-green-200 flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-black text-green-800 text-[12px]">Argent reçu — transaction clôturée</p>
                  {!(order as any).sellerRatedDeliverer && (
                    <button
                      onClick={() => setShowSellerDelivererRatingModal(true)}
                      className="mt-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-black text-[10px] uppercase tracking-widest active:scale-95">
                      ⭐ Noter le livreur
                    </button>
                  )}
                  {(order as any).sellerRatedDeliverer && (
                    <p className="text-[10px] text-green-600 mt-1">Livreur noté ✓</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ COD — ACHETEUR : Étape 1 — Attente livraison ══ */}
        {isBuyer && order.status === 'cod_pending' && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-[10px] font-black text-blue-800 uppercase mb-1">🤝 Paiement à la livraison</p>
            <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
              Commande confirmée ! Le vendeur prépare la livraison. Tu paieras <span className="text-blue-900">{totalDisplay.toLocaleString('fr-FR')} FCFA</span> au livreur à la réception.
            </p>
          </div>
        )}

        {/* ══ COD — ACHETEUR : Étape 2 — Scanner QR livreur ou saisir code → confirme paiement ══ */}
        {isBuyer && order.status === 'cod_confirmed' && (
          <div className="space-y-3 pt-2">
            {showBuyerScanner && (
              <QRScanner
                expectedType="delivery"
                expectedOrderId={orderId}
                onSuccess={async (_code) => {
                  setShowBuyerScanner(false);
                  await act(async () => {
                    await confirmCODDelivered(orderId);
                    try { await updateDoc(doc(db, 'products', order.productId), { status: 'sold' }); } catch {}
                    setShowRatingModal(true);
                  });
                }}
                onClose={() => setShowBuyerScanner(false)}
              />
            )}
            {/* A) Paiement vendeur — numéro + modes de paiement */}
            {!(order as any).sellerPaymentConfirmed && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-3">
                <div>
                  <p className="text-[10px] font-black text-amber-800 uppercase mb-1">💳 Étape 1 — Payer le vendeur</p>
                  <p className="text-[11px] text-amber-700 mb-3">
                    Paie <span className="font-black text-amber-900 text-[13px]">{totalDisplay.toLocaleString('fr-FR')} FCFA</span> au vendeur avant réception.
                    Les frais du livreur sont séparés.
                  </p>
                  {/* Numéro vendeur si disponible */}
                  {(order as any).paymentInfo?.phone && (
                    <div className="bg-white rounded-xl p-3 border border-amber-200 flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Vendeur · {(order as any).sellerName}</p>
                        <p className="font-black text-slate-900 text-[14px] tracking-widest mt-0.5">
                          {(order as any).paymentInfo.phone}
                        </p>
                        <p className="text-[10px] text-slate-500">{(order as any).paymentInfo.holderName}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {(order as any).paymentInfo?.waveLink ? (
                          <a href={(order as any).paymentInfo.waveLink}
                            target="_blank" rel="noopener noreferrer"
                            className="px-3 py-2 rounded-xl font-black text-[9px] text-white active:scale-95"
                            style={{ background: '#1BA6F9' }}>
                            Wave
                          </a>
                        ) : null}
                        <button onClick={() => navigator.clipboard?.writeText((order as any).paymentInfo.phone)}
                          className="px-3 py-2 rounded-xl bg-slate-100 font-black text-[9px] text-slate-600 active:scale-95">
                          Copier
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Modes de paiement cliquables — affiche numéro vendeur */}
                  <SellerPaymentMethods order={order} />
                </div>
              </div>
            )}

            {/* B) Scanner QR — visible seulement après confirmation paiement vendeur */}
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
              <p className="text-[10px] font-black text-green-800 uppercase mb-1">🚚 Étape 2 — Confirmer la réception</p>
              <p className="text-[11px] text-green-700">
                {(order as any).sellerPaymentConfirmed
                  ? 'Le vendeur a confirmé ton paiement. Scanne le QR du livreur à la réception.'
                  : (order as any).delivererCashCollected
                  ? '💵 Le livreur a collecté ton paiement cash. Scanne son QR pour confirmer la réception.'
                  : (order as any).isCOD
                  ? 'Le livreur collectera ton paiement cash à la réception, puis tu scanneras son QR.'
                  : 'Une fois le paiement vendeur effectué, le vendeur le validera et tu pourras confirmer la réception.'}
              </p>
            </div>
            {/* Scanner visible uniquement après confirmation vendeur */}
            {((order as any).sellerPaymentConfirmed || (order as any).delivererCashCollected) && (
              <button onClick={() => setShowBuyerScanner(true)}
                className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
                📷 Scanner le QR du livreur
              </button>
            )}
            {/* Option 2 : Saisir code de secours + confirmer manuellement */}
            <DeliveryCodeInput orderId={orderId} order={order}
              onValidated={async () => {
                await confirmCODDelivered(orderId);
                try { updateDoc(doc(db, 'products', order.productId), { status: 'sold' }); } catch {}
                setShowRatingModal(true);
              }}
            />
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
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-[11px] text-blue-800 font-bold">
                ✅ Paiement confirmé. Le vendeur prépare ton article et va bientôt générer ton code de livraison.
              </p>
            </div>
            <button onClick={() => setShowDisputeForm(true)}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-100 active:scale-95 transition-all">
              Signaler un problème
            </button>
          </div>
        )}

        {/* ── VENDEUR — Confirme paiement reçu → peut marquer prêt à livrer ── */}
        {isSeller && order.status === 'confirmed' && (
          <div className="space-y-3 pt-2">
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
              <p className="text-[11px] text-green-800 font-bold">
                💰 Paiement confirmé. Prépare l'article puis clique "Prêt à livrer" pour générer le code.
              </p>
            </div>
            <button onClick={() => act(async () => {
              await markReadyToDeliver(orderId);
            })} disabled={loading}
              className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-xl shadow-yellow-200 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #D97706, #92400E)' }}>
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : '📦 Prêt à livrer — Générer le code'}
            </button>
          </div>
        )}

        {/* ── VENDEUR — QR + code livraison à montrer au livreur ── */}
        {isSeller && order.status === 'ready' && order.deliveryCode && (
          <div className="space-y-3 pt-2">
            {showSellerQR && (
              <QRDisplay
                title="Mon QR Vendeur"
                subtitle="Fais scanner par le livreur"
                code={order.deliveryCode}
                qrPayload={(order as any).qrPickupPayload || buildQRPayload('pickup', orderId, order.deliveryCode)}
                color="#115E2E"
                emoji="📦"
                instruction="Le livreur va scanner ce QR quand il vient récupérer le colis. Valide la prise en charge."
                onClose={() => setShowSellerQR(false)}
              />
            )}
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
              <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">📦 Prêt à livrer</p>
              <p className="text-[11px] text-green-700 mb-3">
                Le livreur va venir récupérer ton colis. Montre-lui ton QR ou donne-lui le code.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSellerQR(true)}
                  className="flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
                  📲 Afficher mon QR
                </button>
                <div className="flex-1 bg-slate-900 rounded-xl flex items-center justify-center py-1">
                  <span className="text-[18px] font-black text-yellow-300 tracking-[0.3em] font-mono">{order.deliveryCode}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ACHETEUR — Scanner QR livreur OU saisie manuelle ── */}
        {isBuyer && ['ready', 'picked'].includes(order.status) && (
          <div className="space-y-3 pt-2">
            {showBuyerScanner && (
              <QRScanner
                expectedType="delivery"
                expectedOrderId={orderId}
                onSuccess={async (code) => {
                  setShowBuyerScanner(false);
                  const result = await confirmDeliveryByBuyer(orderId, order);
                  if (result.success) {
                    try { updateDoc(doc(db, 'products', order.productId), { status: 'sold' }); } catch {}
                    setShowRatingModal(true);
                  }
                }}
                onClose={() => setShowBuyerScanner(false)}
              />
            )}

            {/* ── Paiement vendeur depuis la page commande ── */}
            {order.status === 'ready' && !(order as any).buyerPaymentSent && (
              <BuyerPaymentBlock order={order} orderId={orderId} />
            )}

            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">
                {order.status === 'picked' ? '🛵 Livraison en route !' : '⏳ En attente du livreur'}
              </p>
              <p className="text-[11px] text-blue-700 mb-3">
                {order.status === 'picked'
                  ? 'Le livreur arrive. Entre le code pour confirmer la réception.'
                  : 'Paye le vendeur ci-dessus puis le livreur viendra récupérer ton colis.'}
              </p>
              {order.status === 'picked' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBuyerScanner(true)}
                    className="flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
                    📷 Scanner QR Livreur
                  </button>
                </div>
              )}
            </div>
            {/* Saisie manuelle code de secours */}
            {order.status === 'picked' && (
              <DeliveryCodeInput orderId={orderId} order={order}
                onValidated={() => {
                  try { updateDoc(doc(db, 'products', order.productId), { status: 'sold' }); } catch {}
                  setShowRatingModal(true);
                }}
              />
            )}
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
          <div className="bg-green-50 rounded-2xl p-5 border border-green-100 space-y-3">
            <div className="text-center">
              <p className="text-3xl mb-2">🎉</p>
              <p className="font-black text-green-900 text-[13px] uppercase tracking-tight">Transaction terminée !</p>
            </div>
            {/* Résumé mode de paiement utilisé */}
            {(() => {
              const ord = order as any;
              const method = ord.paymentInfo?.method;
              const isRealCOD = method === 'cash_on_delivery' || method === 'especes' || (!method && ord.isCOD);
              const phone = ord.paymentInfo?.phone;
              const holderName = ord.paymentInfo?.holderName;
              const methodLabel = isRealCOD ? 'Espèces à la livraison' : (MOBILE_PAYMENT_METHODS.find(m => m.id === method)?.name || method || 'Mobile money');
              const proofUrl = ord.screenshotUrl || ord.proofUrl;
              const totalPaid = (ord.productPrice || 0) + (ord.deliveryFee || 0);
              return (
                <div className="bg-white rounded-xl p-3 border border-green-200 space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Récapitulatif paiement</p>
                  {/* Moyen de paiement choisi par l'acheteur */}
                  {ord.chosenPaymentMethod && (
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-600 font-bold">Moyen de paiement</p>
                      <p className="text-[11px] font-black text-slate-900">
                        {ord.chosenPaymentMethod.method === 'especes' ? '💵' : '📱'} {ord.chosenPaymentMethod.methodName}
                        {ord.chosenPaymentMethod.phone ? ` · ${ord.chosenPaymentMethod.phone}` : ''}
                      </p>
                    </div>
                  )}
                  {/* Mode de livraison (COD / Mobile) */}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-600 font-bold">Mode livraison</p>
                    <p className="text-[11px] font-black text-slate-900">{isRealCOD ? '💵 Espèces à la livraison' : '📱 ' + methodLabel}</p>
                  </div>
                  {phone && !isRealCOD && (
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-600 font-bold">Numéro vendeur</p>
                      <p className="text-[11px] font-black text-slate-900">{phone}{holderName ? ` · ${holderName}` : ''}</p>
                    </div>
                  )}
                  {/* Montants */}
                  <div className="border-t border-slate-100 pt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-600 font-bold">Article</p>
                      <p className="text-[11px] font-black text-slate-900">{(ord.productPrice || 0).toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    {(ord.deliveryFee || 0) > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-600 font-bold">Frais livreur</p>
                        <p className="text-[11px] font-black text-slate-900">{(ord.deliveryFee || 0).toLocaleString('fr-FR')} FCFA</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-1">
                      <p className="text-[11px] text-slate-800 font-black">Total</p>
                      <p className="text-[12px] font-black text-green-700">{totalPaid.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                  </div>
                  {/* Preuve */}
                  {proofUrl && !isRealCOD && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Preuve de paiement</p>
                      <img src={proofUrl} alt="preuve" className="w-full rounded-lg object-cover max-h-32 border border-slate-200"/>
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Acheteur : noter vendeur + livreur */}
            {isBuyer && (
              <div className="space-y-2 pt-1">
                {!(order as any).buyerReviewed && (
                  <button onClick={() => setShowRatingModal(true)}
                    className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
                    ⭐ Noter le vendeur
                  </button>
                )}
                {(order as any).buyerReviewed && <p className="text-[10px] text-green-600 text-center font-bold">Vendeur noté ✓</p>}
                {(order as any).delivererId && !(order as any).buyerRatedDeliverer && (
                  <button onClick={() => setShowDelivererRatingModal(true)}
                    className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 active:scale-95">
                    ⭐ Noter le livreur
                  </button>
                )}
                {(order as any).delivererId && (order as any).buyerRatedDeliverer && (
                  <p className="text-[10px] text-green-600 text-center font-bold">Livreur noté ✓</p>
                )}
              </div>
            )}
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
          onDone={() => {
            setShowRatingModal(false);
            // Après noter le vendeur, proposer de noter le livreur si applicable
            if ((order as any).delivererId) setTimeout(() => setShowDelivererRatingModal(true), 500);
          }}
          onSkip={() => {
            setShowRatingModal(false);
            if ((order as any).delivererId) setTimeout(() => setShowDelivererRatingModal(true), 500);
          }}
        />
      )}

      {/* Modal notation livreur — acheteur */}
      {showDelivererRatingModal && currentUser && (order as any).delivererId && isBuyer && !(order as any).buyerRatedDeliverer && (
        <RatingModal
          orderId={orderId}
          productId={order.productId}
          productTitle={order.productTitle}
          productImage={order.productImage}
          fromUserId={currentUser.uid}
          fromUserName={order.buyerName}
          fromUserPhoto={(order as any).buyerPhoto || undefined}
          toUserId={(order as any).delivererId}
          toUserName={(order as any).delivererName || 'Livreur'}
          role="buyer_to_deliverer"
          onDone={() => setShowDelivererRatingModal(false)}
          onSkip={() => setShowDelivererRatingModal(false)}
        />
      )}

      {/* Modal notation livreur — vendeur (après confirmation réception argent) */}
      {showSellerDelivererRatingModal && currentUser && (order as any).delivererId && isSeller && !(order as any).sellerRatedDeliverer && (
        <RatingModal
          orderId={orderId}
          productId={order.productId}
          productTitle={order.productTitle}
          productImage={order.productImage}
          fromUserId={currentUser.uid}
          fromUserName={order.sellerName}
          toUserId={(order as any).delivererId}
          toUserName={(order as any).delivererName || 'Livreur'}
          role="seller_to_deliverer"
          onDone={() => setShowSellerDelivererRatingModal(false)}
          onSkip={() => setShowSellerDelivererRatingModal(false)}
        />
      )}

      {/* Modal annulation livraison */}
      {showCancelDelivery && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 space-y-5" style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto"/>
            <div className="text-center">
              <p className="text-3xl mb-2">{(order as any).status === 'picked' ? '⚠️' : '🔄'}</p>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Annuler le livreur</h3>
              {(order as any).status === 'picked' && (
                <div className="mt-3 bg-red-50 rounded-2xl p-4 border border-red-100">
                  <p className="text-[11px] text-red-700 font-bold">
                    ⚠️ Attention : le livreur a déjà récupéré le colis. L&apos;annulation va ouvrir un litige automatiquement.
                  </p>
                </div>
              )}
              {(order as any).status !== 'picked' && (
                <p className="text-[11px] text-slate-500 mt-2">
                  Le livreur sera notifié. Tu pourras en choisir un autre.
                </p>
              )}
            </div>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder="Motif de l'annulation (obligatoire)..." rows={3}
              className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-[13px] border-2 border-transparent focus:border-red-400 outline-none resize-none"/>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => act(() => cancelDelivery(orderId, isBuyer ? 'buyer' : 'seller', cancelReason))
                  .then(() => { setShowCancelDelivery(false); setCancelReason(''); setDelivererInfo(null); })}
                disabled={!cancelReason.trim() || loading}
                className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white bg-red-500 shadow-lg active:scale-95 disabled:opacity-50 transition-all">
                {(order as any).status === 'picked' ? '⚠️ Annuler et ouvrir un litige' : '🔄 Annuler le livreur'}
              </button>
              <button onClick={() => { setShowCancelDelivery(false); setCancelReason(''); }}
                className="w-full py-3 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
                Retour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal signalement */}
      {showDisputeForm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 space-y-5" style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
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
export function OrderStatusPage({ orderId, onBack, onOpenChatWithSeller }: OrderStatusPageProps) {
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
    return <OrderDetail orderId={selectedOrderId} onBack={() => setSelectedOrderId('')} onOpenChatWithSeller={onOpenChatWithSeller}/>;
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
