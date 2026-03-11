// src/pages/DelivererProfilePage.tsx
// Profil public d'un livreur — consultable par acheteur, vendeur, admin

import React, { useState, useEffect } from 'react';
import { getDelivererById } from '@/services/deliveryService';
import { calcDeliveryFee } from '@/services/deliveryService';
import type { User } from '@/types';

interface Props {
  delivererId: string;
  onBack: () => void;
  onChoose?: (deliverer: User, fee: number) => void;
  fromNeighborhood?: string;
  toNeighborhood?: string;
  onProposeToSeller?: (deliverer: User) => void;
  onContact?: (deliverer: User) => void; // ouvrir chat ou WhatsApp
}

const VEHICLE_LABELS: Record<string, string> = {
  moto: '🛵 Moto / Zémidjan',
  voiture: '🚗 Voiture',
  velo: '🚲 Vélo',
  tricycle: '🛺 Tricycle',
  pied: '🚶 À pied',
};
const STATUS_LABELS: Record<string, string> = {
  independant: 'Livreur indépendant',
  service: 'Service de livraison',
  chauffeur: 'Chauffeur / Zém',
};

export function DelivererProfilePage({
  delivererId, onBack, onChoose, fromNeighborhood, toNeighborhood, onProposeToSeller, onContact,
}: Props) {
  const [deliverer, setDeliverer] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDelivererById(delivererId).then(d => {
      setDeliverer(d);
      setLoading(false);
    });
  }, [delivererId]);

  if (loading) return (
    <div className="fixed inset-0 bg-white z-[300] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin"/>
    </div>
  );

  if (!deliverer) return (
    <div className="fixed inset-0 bg-white z-[300] flex flex-col items-center justify-center gap-4">
      <p className="text-slate-400 font-bold">Livreur introuvable</p>
      <button onClick={onBack} className="px-6 py-3 bg-slate-100 rounded-2xl font-black text-sm">← Retour</button>
    </div>
  );

  const fee = fromNeighborhood && toNeighborhood
    ? calcDeliveryFee(deliverer, fromNeighborhood, toNeighborhood)
    : null;

  const vehicleLabel = VEHICLE_LABELS[(deliverer as any).deliveryVehicle] || '—';
  const statusLabel = STATUS_LABELS[(deliverer as any).deliveryStatus] || '—';
  const hasLicense = (deliverer as any).deliveryHasLicense;
  const deliveryAge = (deliverer as any).deliveryAge;

  return (
    <div className="fixed inset-0 bg-white z-[300] flex flex-col font-sans overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-14 pb-4">
        <button onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="font-black text-slate-900 text-[15px] uppercase tracking-tight">Profil Livreur</h1>
      </div>

      <div className="px-5 pb-32 flex flex-col gap-5">

        {/* Carte identité */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          {deliverer.photoURL
            ? <img src={deliverer.photoURL} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"/>
            : <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl flex-shrink-0">🛵</div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-slate-900 text-[16px]">
                {deliverer.deliveryPartnerName || deliverer.name}
              </p>
              {deliverer.deliveryAvailable && (
                <span className="bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                  Disponible
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              📍 {(deliverer.deliveryZones || []).join(' · ')}
            </p>
            {deliverer.deliveryBio && (
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{deliverer.deliveryBio}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard value={deliverer.totalDeliveries || 0} label="Livraisons" color="green" />
          <StatCard value={deliverer.rating ? deliverer.rating.toFixed(1) : '—'} label="Note" color="amber" suffix={deliverer.rating ? '★' : ''} />
          <StatCard value={deliverer.reviewCount || 0} label="Avis" color="blue" />
        </div>

        {/* Infos pratiques */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Informations</p>
          <InfoRow icon="🛵" label="Transport" value={vehicleLabel}/>
          <InfoRow icon="👤" label="Statut" value={statusLabel}/>
          {deliveryAge && <InfoRow icon="🎂" label="Âge" value={`${deliveryAge} ans`}/>}
          {hasLicense !== undefined && (
            <InfoRow icon="📋" label="Permis" value={hasLicense ? '✅ Valide' : '❌ Non renseigné'}/>
          )}
          <InfoRow icon="✅" label="CGU Brumerie" value="Acceptées"/>
        </div>

        {/* Tarifs */}
        {(deliverer.deliveryRates || []).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Tarifs</p>
            {(deliverer.deliveryRates || []).map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <p className="text-[12px] text-slate-600">
                  {r.fromZone} → {r.toZone === 'same' ? 'même quartier' : r.toZone}
                </p>
                <p className="font-black text-slate-900 text-[13px]">
                  {r.price.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            ))}
            {fee !== null && (
              <div className="mt-3 bg-green-50 rounded-xl p-3 flex items-center justify-between">
                <p className="text-[11px] font-bold text-green-700">
                  Ton trajet ({fromNeighborhood} → {toNeighborhood})
                </p>
                <p className="font-black text-green-700 text-[15px]">
                  {fee.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            )}
          </div>
        )}

        {/* Avis (placeholder — à relier aux reviews Firestore) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Avis clients ({deliverer.reviewCount || 0})
          </p>
          {(!deliverer.reviewCount || deliverer.reviewCount === 0) ? (
            <p className="text-[11px] text-slate-400 text-center py-4">
              Pas encore d'avis — sois le premier à travailler avec ce livreur !
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 text-center py-2">
              ⭐ Note moyenne : {deliverer.rating?.toFixed(1)}/5
            </p>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      {(onChoose || onProposeToSeller || onContact) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 flex flex-col gap-2"
          style={{ maxWidth: 480, margin: '0 auto', left: '50%', transform: 'translateX(-50%)' }}>

          {onChoose && fee !== null && (
            <button
              onClick={() => onChoose(deliverer, fee)}
              disabled={!deliverer.deliveryAvailable}
              className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.15em] text-white disabled:opacity-40 shadow-xl active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
              {deliverer.deliveryAvailable
                ? `✅ Choisir ce livreur — ${fee.toLocaleString('fr-FR')} FCFA`
                : '⏸ Ce livreur est indisponible'}
            </button>
          )}

          {onProposeToSeller && (
            <button
              onClick={() => onProposeToSeller(deliverer)}
              className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.15em] text-white shadow-xl active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg,#D4500F,#f97316)' }}>
              📨 Proposer au vendeur
            </button>
          )}
          {onContact && (
            <button
              onClick={() => onContact(deliverer)}
              className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.15em] text-white shadow-xl active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
              💬 Contacter ce livreur
            </button>
          )}
          {/* WhatsApp si pas de chat dispo */}
          {!onContact && deliverer.phone && (
            <a
              href={"https://wa.me/" + deliverer.phone.replace(/\D/g, '')}
              target="_blank" rel="noopener noreferrer"
              className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.15em] text-white shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.97 0C5.362 0 0 5.373 0 11.993c0 2.114.554 4.09 1.523 5.802L.014 24l6.376-1.673A11.906 11.906 0 0011.97 24c6.607 0 11.969-5.373 11.969-11.993C23.939 5.373 18.577 0 11.97 0zm0 21.886a9.844 9.844 0 01-5.024-1.373l-.36-.215-3.736.98.997-3.648-.235-.374A9.848 9.848 0 012.12 11.993C2.12 6.53 6.52 2.12 11.97 2.12c5.448 0 9.85 4.41 9.85 9.873 0 5.463-4.402 9.893-9.85 9.893z"/></svg>
              WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, color, suffix = '' }: {
  value: number | string; label: string; color: string; suffix?: string;
}) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className={`${colors[color]} rounded-2xl p-4 text-center`}>
      <p className="text-2xl font-black">{value}{suffix}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">{label}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-6 text-center">{icon}</span>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 flex-shrink-0">{label}</span>
      <span className="text-[12px] font-bold text-slate-700 flex-1">{value}</span>
    </div>
  );
}
