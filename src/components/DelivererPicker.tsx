// src/components/DelivererPicker.tsx — v17
// Bottom sheet : choisir un livreur + l'assigner en un clic

import React, { useState, useEffect } from 'react';
import { getAvailableDeliverers, assignDeliverer } from '@/services/deliveryService';
import type { DeliveryRate } from '@/types';
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
  const [selectedRate, setSelectedRate] = useState<DeliveryRate | null>(null);
  const [customFee, setCustomFee]   = useState<number | null>(null);
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

  // Retourne tous les tarifs d'un livreur triés par pertinence
  const getRatesForDeliverer = (d: User): DeliveryRate[] => {
    const rates = (d.deliveryRates || []) as DeliveryRate[];
    // D'abord les tarifs exacts, puis les approximatifs
    const exact   = rates.filter(r => (r.fromZone === fromZone && r.toZone === toZone) || (r.fromZone === toZone && r.toZone === fromZone));
    const zone    = rates.filter(r => !exact.includes(r) && (r.fromZone === fromZone || r.toZone === toZone || r.fromZone === toZone || r.toZone === fromZone));
    const other   = rates.filter(r => !exact.includes(r) && !zone.includes(r));
    return [...exact, ...zone, ...other];
  };

  const getDefaultFee = (d: User): number => {
    const rates = getRatesForDeliverer(d);
    return rates[0]?.price ?? 1000;
  };

  const getFee = (): number => {
    if (customFee !== null) return customFee;
    if (selectedRate) return selectedRate.price;
    if (selected) return getDefaultFee(selected);
    return 0;
  };

  const handleSelectDeliverer = (d: User) => {
    if (selected?.id === d.id) {
      setSelected(null);
      setSelectedRate(null);
      setCustomFee(null);
    } else {
      setSelected(d);
      // Auto-sélectionner le premier tarif pertinent
      const rates = getRatesForDeliverer(d);
      setSelectedRate(rates[0] || null);
      setCustomFee(null);
    }
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const fee = getFee();
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
            const sel = selected?.id === d.id;
            const rates = getRatesForDeliverer(d);
            const hasMultipleRates = rates.length > 1;
            const displayFee = sel
              ? getFee()
              : getDefaultFee(d);

            return (
              <div key={d.id}
                className={'rounded-2xl border-2 p-4 transition-all ' +
                  (sel ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-white')}>

                {/* Header livreur */}
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
                        ✅ {d.totalDeliveries} livraison{d.totalDeliveries > 1 ? 's' : ''}{d.rating ? ` · ⭐ ${d.rating.toFixed(1)}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-green-600 text-[16px]">{displayFee.toLocaleString('fr-FR')}</p>
                    <p className="text-[9px] text-slate-400 font-bold">FCFA</p>
                  </div>
                </div>

                {/* Sélecteur de tarif — visible seulement si sélectionné ET plusieurs tarifs */}
                {sel && hasMultipleRates && (
                  <div className="bg-white rounded-xl p-3 mb-3 border border-green-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Choisir le tarif
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {rates.map((r, i) => {
                        const isSelected = selectedRate?.fromZone === r.fromZone &&
                                           selectedRate?.toZone === r.toZone &&
                                           selectedRate?.price === r.price;
                        return (
                          <button key={i} onClick={() => { setSelectedRate(r); setCustomFee(null); }}
                            className={'w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ' +
                              (isSelected ? 'bg-green-600 text-white' : 'bg-slate-50 text-slate-700 border border-slate-200')}>
                            <span>
                              {r.toZone === 'same' ? 'Même quartier' : `${r.fromZone || '?'} → ${r.toZone || '?'}`}
                            </span>
                            <span className={'font-black ' + (isSelected ? 'text-white' : 'text-green-600')}>
                              {r.price.toLocaleString('fr-FR')} F
                            </span>
                          </button>
                        );
                      })}
                      {/* Tarif personnalisé */}
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          placeholder="Autre montant..."
                          value={customFee ?? ''}
                          onChange={e => {
                            const v = parseInt(e.target.value);
                            setCustomFee(isNaN(v) ? null : v);
                            if (!isNaN(v)) setSelectedRate(null);
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold outline-none focus:border-green-400"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">FCFA</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Boutons sélection + profil */}
                <div className="flex gap-2">
                  <button onClick={() => handleSelectDeliverer(d)}
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
                  Assignation...
                </span>
              : selected
                ? `✅ Assigner ${selected.deliveryPartnerName || 'ce livreur'} — ${getFee().toLocaleString('fr-FR')} F`
                : 'Choisir un livreur'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
