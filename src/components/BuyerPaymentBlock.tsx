// src/components/BuyerPaymentBlock.tsx
// Bloc affiché à l'acheteur quand la livraison est assignée (status 'ready')
// → Il choisit son mode de paiement et envoie une preuve au vendeur
// → Il paie UNIQUEMENT le prix article au vendeur (pas les frais livreur)

import React, { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { uploadToCloudinary } from '@/utils/uploadImage';
import { submitProof } from '@/services/orderService';
import { MOBILE_PAYMENT_METHODS } from '@/types';
import type { Order, PaymentInfo } from '@/types';

interface Props {
  order: Order;
  orderId: string;
}

export function BuyerPaymentBlock({ order, orderId }: Props) {
  const ord = order as any;
  // Chercher dans sellerPaymentMethods (tableau) en priorité, sinon fallback paymentInfo
  const allSellerMethods: PaymentInfo[] = ord.sellerPaymentMethods || (ord.paymentInfo ? [ord.paymentInfo] : []);
  const sellerPayment: PaymentInfo | undefined = ord.paymentInfo;

  const [selectedMethod, setSelectedMethod] = useState<string>(
    allSellerMethods[0]?.method || sellerPayment?.method || MOBILE_PAYMENT_METHODS[0].id
  );
  const [transactionRef, setTransactionRef]  = useState('');
  const [screenshot, setScreenshot]          = useState<File | null>(null);
  const [uploading, setUploading]            = useState(false);
  const [sent, setSent]                      = useState(!!(ord.buyerPaymentSent));
  const [error, setError]                    = useState('');

  // Infos paiement du vendeur pour le mode sélectionné
  const vendorPaymentInfo = allSellerMethods.find(m => m.method === selectedMethod)
    ?? (sellerPayment?.method === selectedMethod ? sellerPayment : undefined);

  const productPrice = order.productPrice || (ord.effectivePrice ?? 0);

  const handleSend = async () => {
    if (!screenshot && !transactionRef.trim()) {
      setError('Entre la référence de transaction ou joins une capture d\'écran.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      let screenshotUrl = '';
      if (screenshot) {
        screenshotUrl = await uploadToCloudinary(screenshot);
      }
      // Enregistrer la preuve de paiement (réutilise submitProof existant)
      await submitProof(orderId, {
        screenshotUrl: screenshotUrl || '',
        transactionRef: transactionRef.trim() || selectedMethod.toUpperCase() + ' — ' + new Date().toLocaleTimeString(),
      });
      // Marquer buyerPaymentSent pour ne plus afficher ce bloc
      await updateDoc(doc(db, 'orders', orderId), {
        buyerPaymentSent: true,
        buyerPaymentMethod: selectedMethod,
        buyerPaymentRef: transactionRef.trim(),
      });
      setSent(true);
    } catch (e: any) {
      setError('Erreur : ' + (e?.message || 'Réessaie'));
    } finally {
      setUploading(false);
    }
  };

  if (sent || ord.buyerPaymentSent) {
    return (
      <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">✅ Paiement envoyé</p>
        <p className="text-[11px] text-green-700">
          Ta preuve de paiement a été transmise au vendeur. En attente de confirmation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-4">
      <div>
        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">
          💳 Payer le vendeur
        </p>
        <p className="text-[11px] text-amber-700">
          Paie{' '}
          <span className="font-black text-amber-900">
            {productPrice.toLocaleString('fr-FR')} FCFA
          </span>{' '}
          au vendeur avant la livraison. Les frais du livreur sont séparés.
        </p>
      </div>

      {/* Sélecteur mode paiement */}
      <div>
        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">
          Mode de paiement
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(allSellerMethods.length > 0
            ? allSellerMethods.map(pm => MOBILE_PAYMENT_METHODS.find(m => m.id === pm.method)).filter(Boolean)
            : MOBILE_PAYMENT_METHODS
          ).map(m => m && (
            <button
              key={m.id}
              onClick={() => setSelectedMethod(m.id)}
              className={
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all active:scale-95 ' +
                (selectedMethod === m.id
                  ? 'border-amber-500 bg-white shadow-sm'
                  : 'border-slate-200 bg-white/60')
              }
            >
              <img src={m.logo} alt={m.name}
                className="w-6 h-6 rounded object-contain flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
              />
              <span className={
                'font-black text-[10px] truncate ' +
                (selectedMethod === m.id ? 'text-amber-800' : 'text-slate-600')
              }>
                {m.name}
              </span>
            </button>
          ))}
          {/* Espèces toujours disponible */}
          <button
            onClick={() => setSelectedMethod('especes')}
            className={
              'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all active:scale-95 ' +
              (selectedMethod === 'especes'
                ? 'border-amber-500 bg-white shadow-sm'
                : 'border-slate-200 bg-white/60')
            }
          >
            <span className="text-lg">💵</span>
            <span className={'font-black text-[10px] ' + (selectedMethod === 'especes' ? 'text-amber-800' : 'text-slate-600')}>
              Espèces
            </span>
          </button>
        </div>
      </div>

      {/* Coordonnées vendeur si disponibles */}
      {vendorPaymentInfo && (
        <div className="bg-white rounded-xl p-3 border border-amber-200">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Coordonnées vendeur
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-slate-900 text-[13px] tracking-widest">
                {vendorPaymentInfo.phone}
              </p>
              <p className="text-[10px] text-slate-500">{vendorPaymentInfo.holderName}</p>
            </div>
            {vendorPaymentInfo.waveLink ? (
              <a
                href={vendorPaymentInfo.waveLink}
                target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl font-black text-[10px] text-white active:scale-95"
                style={{ background: '#1BA6F9' }}
              >
                Payer Wave
              </a>
            ) : (
              <button
                onClick={() => navigator.clipboard?.writeText(vendorPaymentInfo.phone)}
                className="px-3 py-2 rounded-xl bg-slate-100 font-black text-[9px] text-slate-600 active:scale-95"
              >
                Copier
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ref transaction */}
      <div>
        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5">
          Référence transaction
        </p>
        <input
          type="text"
          value={transactionRef}
          onChange={e => setTransactionRef(e.target.value)}
          placeholder="Ex: TXN-20250312-XXXX"
          className="w-full px-4 py-3 bg-white rounded-xl border border-amber-200 text-[12px] font-bold outline-none focus:border-amber-400"
        />
      </div>

      {/* Capture écran (optionnel) */}
      <div>
        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5">
          Capture d&apos;écran (optionnel)
        </p>
        <label className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-dashed border-amber-300 cursor-pointer active:scale-95">
          <span className="text-xl">📸</span>
          <span className="text-[11px] font-bold text-slate-600 flex-1 truncate">
            {screenshot ? screenshot.name : 'Joindre une preuve de paiement'}
          </span>
          <input
            type="file" accept="image/*" className="hidden"
            onChange={e => setScreenshot(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {error && (
        <p className="text-[10px] font-bold text-red-500 px-1">{error}</p>
      )}

      {/* Bouton envoyer */}
      <button
        onClick={handleSend}
        disabled={uploading}
        className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white disabled:opacity-50 active:scale-95 transition-all"
        style={{ background: 'linear-gradient(135deg,#92400E,#D97706)' }}
      >
        {uploading
          ? <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
              Envoi...
            </span>
          : '💸 Confirmer le paiement au vendeur'
        }
      </button>

      <p className="text-[9px] text-amber-600 text-center">
        Le vendeur sera notifié et validera ton paiement.
      </p>
    </div>
  );
}
