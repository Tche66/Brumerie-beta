// src/components/DelivererPicker.tsx — v17
// Bottom sheet : choisir un livreur + l'assigner en un clic

import React, { useState, useEffect } from 'react';
import { getAvailableDeliverers, calcDeliveryFee, assignDeliverer } from '@/services/deliveryService';
import { DelivererProfilePage } from '@/pages/DelivererProfilePage';
import type { User, Order } from '@/types';

interface Props {
  order: Order;
  onDone: (deliverer: User, fee: number) => void;
  onClose: () => void;
  onContactDeliverer?: (delivererId: string, delivererName: string) => void;
}

export function DelivererPicker({ order, onDone, onClose, onContactDeliverer }: Props) {
  const [deliverers, setDeliverers] = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<User | null>(null);
  const [sending, setSending]       = useState(false);
  const [viewProfile, setViewProfile] = useState<string | null>(null);

  // Guard défensif — order peut être undefined si Firestore pas encore chargé
  const fromZone = (order as any)?.sellerNeighborhood || (order as any)?.neighborhood || '';
  const toZone   = (order as any)?.buyerNeighborhood  || (order as any)?.neighborhood || '';

  useEffect(() => {
    getAvailableDeliverers(fromZone).then(list => {
      setDeliverers(list);
      setLoading(false);
    });
  }, [fromZone]);

  const getFee = (d: User) => calcDeliveryFee(d, fromZone, toZone);

  const handleConfirm = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const fee = getFee(selected);
      await assignDeliverer({ orderId: order.id, deliverer: selected, fee, order });
      onDone(selected, fee);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  if (viewProfile) {
    return (
      <DelivererProfilePage
        delivererId={viewProfile}
        fromNeighborhood={fromZone}
        toNeighborhood={toZone}
        onBack={() => setViewProfile(null)}
        onChoose={(deliverer, fee) => { setSelected(deliverer); setViewProfile(null); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg bg-white rounded-t-[3rem] px-5 pt-8 pb-10 shadow-2xl"
        style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 flex-shrink-0"/>

        <div className="mb-4 flex-shrink-0">
          <h2 className="font-black text-slate-900 text-[18px] mb-1">Choisir un livreur</h2>
          <p className="text-[11px] text-slate-500">
            {fromZone || 'Zone vendeur'} → {toZone || 'Zone acheteur'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-4">
          {loading && (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin mx-auto"/>
            </div>
          )}

          {!loading && deliverers.length === 0 && (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">😕</div>
              <p className="font-black text-slate-400 text-[12px]">Aucun livreur disponible</p>
              <p className="text-slate-400 text-[11px] mt-1">Essaie plus tard ou contacte le vendeur directement</p>
            </div>
          )}

          {deliverers.map(d => {
            const fee = getFee(d);
            const sel = selected?.id === d.id;
            return (
              <div key={d.id}
                className={'rounded-2xl border-2 p-4 transition-all ' +
                  (sel ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-white')}>
                <div className="flex items-center gap-3 mb-3">
                  <button onClick={() => setViewProfile(d.id)} className="flex-shrink-0">
                    {d.photoURL
                      ? <img src={d.photoURL} alt="" className="w-12 h-12 rounded-xl object-cover"/>
                      : <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-xl">🛵</div>
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-[13px]">{d.deliveryPartnerName || d.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">📍 {(d.deliveryZones || []).join(' · ')}</p>
                    {d.totalDeliveries ? (
                      <p className="text-[10px] text-green-600 font-bold">
                        ✅ {d.totalDeliveries} livraisons{d.rating ? ` · ⭐ ${d.rating.toFixed(1)}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-green-600 text-[16px]">{fee.toLocaleString('fr-FR')}</p>
                    <p className="text-[9px] text-slate-400 font-bold">FCFA</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(sel ? null : d)}
                    className={'flex-1 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 ' +
                      (sel ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700')}>
                    {sel ? '✓ Sélectionné' : 'Sélectionner'}
                  </button>
                  <button onClick={() => setViewProfile(d.id)}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-black text-[10px] active:scale-95">
                    Profil
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="px-6 py-4 rounded-2xl bg-slate-100 font-black text-[11px] uppercase tracking-widest text-slate-600 active:scale-95">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || sending || !selected.deliveryAvailable}
            className="flex-1 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white disabled:opacity-30 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
            {sending
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
                  Envoi...
                </span>
              : selected
                ? `✅ Assigner ${selected.deliveryPartnerName || 'ce livreur'}`
                : 'Choisir un livreur'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
