import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, MOBILE_PAYMENT_METHODS } from '@/types';
import { uploadToCloudinary } from '@/utils/uploadImage';
import { submitProof, getCountdown, validateDeliveryCode } from '@/services/orderService';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { BruIcons } from '@/components/BruIcons';

export function AppelButton({ order, orderId }: { order: Order; orderId: string }) {
  const [sellerPhone, setSellerPhone] = React.useState<string>('');

  React.useEffect(() => {
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

  const _msg = encodeURIComponent(
    `Bonjour, je suis ${order.buyerName} \u{1F44B}\n` +
    `J'ai commandé "${order.productTitle}" sur Brumerie ` +
    `(Commande #${orderId.slice(-6).toUpperCase()}).\n` +
    `Montant : ${order.productPrice.toLocaleString('fr-FR')} FCFA\n` +
    `Puis-je avoir plus d'informations ?`);

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

export function DeliveryCodeInput({ orderId, order: _order, onValidated }: {
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
          {error}
        </div>
      )}
      <button onClick={handleValidate} disabled={loading || code.length !== 6}
        className="w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-xl shadow-green-200 active:scale-95 transition-all disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
        {loading
          ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
          : 'Valider — Confirmer la réception'}
      </button>
      <p className="text-[10px] text-slate-400 text-center font-bold">
        En validant ce code, tu confirmes avoir reçu l'article en bon état.
      </p>
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    initiated:     { label: 'Initié',               bg: '#FEF3C7', color: '#92400E' },
    proof_sent:    { label: 'Preuve envoyée',        bg: '#DBEAFE', color: '#1D4ED8' },
    confirmed:     { label: 'Paiement confirmé',     bg: '#D1FAE5', color: '#065F46' },
    ready:         { label: 'Prêt à livrer',      bg: '#FEF9C3', color: '#854D0E' },
    picked:        { label: 'En route',            bg: '#FEF3C7', color: '#92400E' },
    delivered:     { label: 'Livré ✓',               bg: '#DCFCE7', color: '#166534' },
    disputed:      { label: 'Litige',              bg: '#FFEDD5', color: '#9A3412' },
    cancelled:     { label: 'Annulé',                bg: '#F3F4F6', color: '#374151' },
    cod_pending:   { label: 'Payer à livraison',  bg: '#EFF6FF', color: '#1D4ED8' },
    cod_confirmed: { label: '\u{1F69A} En livraison',        bg: '#F0FDF4', color: '#166534' },
    cod_delivered:  { label: 'Att. confirmation',    bg: '#FEF9C3', color: '#854D0E' },
  };
  const s = map[status] || map.initiated;
  return (
    <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export function Countdown({ deadline, label }: { deadline: any; label: string }) {
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

export function OrderCard({ order, viewAs, onClick }: {
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

export function ProofUploadInline({ orderId, order }: { orderId: string; order: Order }) {
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
      <p className="font-black text-green-800 text-[12px]">Preuve envoyée ! Le vendeur va confirmer sous 24h.</p>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Envoyer votre preuve de paiement</p>
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

export function SellerPaymentMethods({ order }: { order: Order }) {
  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(null);
  const [paid, setPaid] = React.useState(false);
  const [savingPayment, setSavingPayment] = React.useState(false);
  const [paidAmount] = React.useState((order as any).productPrice || order.price || 0);
  const [liveSellerMethods, setLiveSellerMethods] = React.useState<import('@/types').PaymentInfo[] | null>(null);

  const confirmPaymentChosen = async (methodId: string, methodName: string, phone?: string | null) => {
    setSavingPayment(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        chosenPaymentMethod: { method: methodId, methodName, phone: phone || null },
      });
    } catch(e) { console.error(e); }
    finally { setSavingPayment(false); setPaid(true); }
  };

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
        Tu as déclaré avoir envoyé {paidAmount.toLocaleString('fr-FR')} FCFA au vendeur via {selectedMethod}.
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
          <span className="text-lg"></span>
          <span className="text-[10px] font-black text-slate-700">Espèces</span>
        </button>
      </div>

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
              style={{ background:`linear-gradient(135deg,${m.color},${m.color}CC)` }}>
              {savingPayment ? 'Enregistrement...' : `Paiement envoyé — ${paidAmount.toLocaleString('fr-FR')} FCFA via ${m.name}`}
            </button>
          </div>
        );
      })()}

      {selectedMethod === 'cash' && (
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 space-y-2">
          <p className="text-[10px] text-amber-700 font-bold">
            <BruIcons.Money size={14}/> Règlement en espèces directement lors de la remise de l&apos;article.
          </p>
          <button
            onClick={() => confirmPaymentChosen('especes', 'Espèces', null)}
            disabled={savingPayment}
            className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-white active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
            {savingPayment ? '...' : 'Confirmer — paiement en espèces'}
          </button>
        </div>
      )}
    </div>
  );
}
