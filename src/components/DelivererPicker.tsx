// src/components/DelivererPicker.tsx
// Bottom sheet pour choisir un livreur à la commande (acheteur, vendeur ou admin)

import React, { useState, useEffect } from 'react';
import { getAvailableDeliverers, calcDeliveryFee, createDeliveryRequest } from '@/services/deliveryService';
import type { User } from '@/types';

interface Props {
  orderId: string;
  fromNeighborhood: string;
  toNeighborhood: string;
  proposedBy: 'buyer' | 'seller' | 'admin';
  buyerName: string;
  sellerName: string;
  productTitle: string;
  productImage?: string;
  onDone: (delivererId: string, fee: number) => void;
  onClose: () => void;
}

export function DelivererPicker({
  orderId, fromNeighborhood, toNeighborhood,
  proposedBy, buyerName, sellerName, productTitle, productImage,
  onDone, onClose,
}: Props) {
  const [deliverers, setDeliverers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getAvailableDeliverers(fromNeighborhood).then(d => {
      setDeliverers(d);
      setLoading(false);
    });
  }, [fromNeighborhood]);

  const getFee = (d: User) => calcDeliveryFee(d, fromNeighborhood, toNeighborhood);

  const handleConfirm = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const fee = getFee(selected);
      await createDeliveryRequest({
        orderId, delivererId: selected.id,
        proposedBy, fromNeighborhood, toNeighborhood,
        estimatedFee: fee, buyerName, sellerName,
        productTitle, productImage,
      });
      onDone(selected.id, fee);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg bg-white rounded-t-[3rem] px-5 pt-8 pb-12 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5"/>

        <div className="mb-5">
          <h2 className="font-black text-slate-900 text-[18px] mb-1">Choisir un livreur</h2>
          <p className="text-[11px] text-slate-500">
            {fromNeighborhood} → {toNeighborhood}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-5">
          {loading && (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin mx-auto"/>
            </div>
          )}
          {!loading && deliverers.length === 0 && (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">😕</div>
              <p className="font-black text-slate-400 text-[12px]">Aucun livreur disponible dans ce quartier</p>
              <p className="text-slate-400 text-[11px] mt-1">Essaie plus tard ou contacte le vendeur</p>
            </div>
          )}
          {deliverers.map(d => {
            const fee = getFee(d);
            const sel = selected?.id === d.id;
            return (
              <button key={d.id} onClick={() => setSelected(d)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                  sel ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-3">
                  {d.photoURL
                    ? <img src={d.photoURL} alt="" className="w-12 h-12 rounded-xl object-cover"/>
                    : <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-xl">🛵</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-[13px]">{d.deliveryPartnerName || d.name}</p>
                    <p className="text-[10px] text-slate-400">📍 {(d.deliveryZones || []).join(' · ')}</p>
                    {d.deliveryBio && (
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{d.deliveryBio}</p>
                    )}
                    {d.totalDeliveries ? (
                      <p className="text-[10px] text-green-600 font-bold mt-0.5">✅ {d.totalDeliveries} livraisons</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="font-black text-green-600 text-[15px]">{fee.toLocaleString('fr-FR')}</p>
                    <p className="text-[9px] text-slate-400 font-bold">FCFA</p>
                  </div>
                </div>
                {sel && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-600 flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round"/></svg>
                    </div>
                    <p className="text-[10px] font-black text-green-700">Sélectionné</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="px-6 py-4 rounded-2xl bg-slate-100 font-black text-[11px] uppercase tracking-widest text-slate-600 active:scale-95">
            Annuler
          </button>
          <button onClick={handleConfirm}
            disabled={!selected || sending}
            className="flex-1 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white disabled:opacity-30 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
            {sending
              ? <div className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Envoi...</div>
              : `📨 Contacter ${selected?.deliveryPartnerName || 'ce livreur'}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
