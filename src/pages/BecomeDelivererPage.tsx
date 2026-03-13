// src/pages/BecomeDelivererPage.tsx
// Inscription livreur partenaire — 5 étapes + CGU + auto-redirect si déjà inscrit
import React, { useState, useEffect } from 'react';
import { NEIGHBORHOODS } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { updateDelivererProfile } from '@/services/deliveryService';
import { CGULivreurPage } from './CGULivreurPage';
import type { DeliveryRate } from '@/types';

interface Props { onBack: () => void; onDone: () => void; }

type VehicleType = 'moto' | 'velo' | 'voiture' | 'tricycle' | 'pied';
type DelivererStatus = 'independant' | 'service' | 'chauffeur';
type Step = 'cgu' | 'identity' | 'zones' | 'rates' | 'bio';

const VEHICLES = [
  { id: 'moto',     label: 'Moto / Zemidjan', icon: '🛵', needsLicense: true },
  { id: 'voiture',  label: 'Voiture',          icon: '🚗', needsLicense: true },
  { id: 'velo',     label: 'Velo',             icon: '🚲', needsLicense: false },
  { id: 'tricycle', label: 'Tricycle',          icon: '🛺', needsLicense: false },
  { id: 'pied',     label: 'A pied',           icon: '🚶', needsLicense: false },
] as const;

const STATUSES = [
  { id: 'independant', label: 'Livreur independant', sub: 'Tu fais ca a ton compte' },
  { id: 'service',     label: 'Service de livraison', sub: 'Tu representes une entreprise' },
  { id: 'chauffeur',   label: 'Chauffeur / Zem',      sub: 'Tu proposes aussi du transport' },
] as const;

export function BecomeDelivererPage({ onBack, onDone }: Props) {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.role === 'livreur') onDone();
  }, [userProfile?.role]);

  const [step, setStep]         = useState<Step>('cgu');
  const [loading, setLoading]   = useState(false);
  const [name, setName]         = useState(userProfile?.deliveryPartnerName || '');
  const [age, setAge]           = useState('');
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [hasLicense, setHasLicense] = useState<boolean | null>(null);
  // Pour compatibilité save
  const vehicle = vehicles[0] || '';
  const [status, setStatus]     = useState<DelivererStatus | ''>('');
  const [zones, setZones]       = useState<string[]>([]);
  const [zoneSearch, setZoneSearch] = useState('');
  const [rates, setRates]       = useState<DeliveryRate[]>([{ fromZone: '', toZone: '', price: 500 }]);
  const [bio, setBio]           = useState('');

  // ⚠️ isDeliveryCompany déclaré EN PREMIER car utilisé dans les fonctions suivantes
  const isDeliveryCompany = status === 'service';

  const toggleVehicle = (id: VehicleType) => {
    if (isDeliveryCompany) {
      setVehicles(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
      setHasLicense(null);
    } else {
      setVehicles([id]);
      setHasLicense(null);
    }
  };
  const needsLicense = !isDeliveryCompany && VEHICLES.find(v => v.id === vehicle)?.needsLicense === true;

  const toggleZone = (z: string) => {
    if (zones.includes(z)) setZones(zones.filter(x => x !== z));
    else if (isDeliveryCompany || zones.length < 2) setZones([...zones, z]);
  };

  const updateRate = (i: number, field: keyof DeliveryRate, val: string | number) => {
    const r = [...rates];
    r[i] = { ...r[i], [field]: val };
    setRates(r);
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await updateDelivererProfile(currentUser.uid, {
        deliveryZones: zones,
        deliveryRates: rates.filter(r => r.fromZone && r.toZone && r.price > 0),
        deliveryBio: bio.trim(),
        deliveryAvailable: true,
        deliveryPartnerName: name.trim(),
      });
      const { updateDoc, doc } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      await updateDoc(doc(db, 'users', currentUser.uid), {
        role: 'livreur',
        deliveryVehicle: vehicles[0] || '',
        deliveryStatus: status,
        deliveryAge: Number(age),
        deliveryVehicles: vehicles,
        deliveryHasLicense: hasLicense,
        deliveryCGUAccepted: true,
        deliveryCGUAcceptedAt: new Date().toISOString(),
      });
      await refreshUserProfile();
      onDone();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const STEPS: Step[] = ['cgu', 'identity', 'zones', 'rates', 'bio'];
  const stepIdx = STEPS.indexOf(step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  if (step === 'cgu') {
    return <CGULivreurPage onBack={onBack} onAccept={() => setStep('identity')} />;
  }

  const canProceedIdentity =
    name.trim().length > 0 &&
    age !== '' && Number(age) >= 18 &&
    vehicles.length > 0 && status !== '' &&
    (!needsLicense || hasLicense === true);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <div className="flex items-center gap-4 px-5 pt-14 pb-4">
        <button
          onClick={() => stepIdx <= 1 ? onBack() : setStep(STEPS[stepIdx - 1])}
          className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-slate-900 text-lg uppercase tracking-tight">Devenir Livreur</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Etape {stepIdx}/{STEPS.length - 1}</p>
        </div>
      </div>

      <div className="mx-5 mb-6 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: progress + '%', background: 'linear-gradient(90deg,#115E2E,#16A34A)' }}/>
      </div>

      <div className="flex-1 px-5 pb-36 overflow-y-auto">

        {step === 'identity' && (
          <div className="flex flex-col gap-5">
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">👤</div>
              <h2 className="font-black text-slate-900 text-lg">Ton profil livreur</h2>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nom de ton service *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex: Kouassi Express..."
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold focus:border-green-600 outline-none"/>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ton age *</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)}
                min={18} max={70} placeholder="Ex: 25"
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold focus:border-green-600 outline-none"/>
              {age !== '' && Number(age) < 18 && (
                <p className="text-red-500 text-[10px] font-bold mt-1">Minimum 18 ans requis</p>
              )}
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tu es *</label>
              <div className="flex flex-col gap-2">
                {STATUSES.map(s => (
                  <button key={s.id} onClick={() => setStatus(s.id)}
                    className={'w-full text-left px-4 py-3 rounded-2xl border-2 transition-all active:scale-[0.98] ' +
                      (status === s.id ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-slate-50')}>
                    <p className={'font-black text-[12px] ' + (status === s.id ? 'text-green-800' : 'text-slate-800')}>{s.label}</p>
                    <p className="text-[10px] text-slate-400">{s.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Moyen de transport *</label>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLES.map(v => (
                  <button key={v.id} onClick={() => { setVehicle(v.id); setHasLicense(null); }}
                    className={'py-4 px-3 rounded-2xl border-2 text-center transition-all active:scale-95 ' +
                      (vehicle === v.id ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-slate-50')}>
                    <div className="text-2xl mb-1">{v.icon}</div>
                    <p className={'text-[11px] font-black ' + (vehicles.includes(v.id as VehicleType) ? 'text-green-800' : 'text-slate-700')}>{v.label}</p>
                    {v.needsLicense && <p className="text-[9px] text-slate-400 mt-0.5">Permis requis</p>}
                  </button>
                ))}
              </div>
            </div>

            {needsLicense && (
              <div className="bg-amber-50 rounded-2xl p-4">
                <label className="text-[9px] font-black text-amber-700 uppercase tracking-widest block mb-3">
                  As-tu un permis de conduire valide ? *
                </label>
                <div className="flex gap-3">
                  <button onClick={() => setHasLicense(true)}
                    className={'flex-1 py-3 rounded-xl border-2 font-black text-[12px] transition-all ' +
                      (hasLicense === true ? 'border-green-600 bg-green-600 text-white' : 'border-slate-200 bg-white text-slate-700')}>
                    Oui
                  </button>
                  <button onClick={() => setHasLicense(false)}
                    className={'flex-1 py-3 rounded-xl border-2 font-black text-[12px] transition-all ' +
                      (hasLicense === false ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-700')}>
                    Non
                  </button>
                </div>
                {hasLicense === false && (
                  <p className="text-red-600 text-[10px] font-bold mt-2">
                    Un permis valide est obligatoire pour ce vehicule.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'zones' && (
          <div className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">📍</div>
              <h2 className="font-black text-slate-900 text-lg mb-1">Zones couvertes</h2>
              <p className="text-slate-500 text-[11px]">
                {isDeliveryCompany ? 'Toutes les villes que ton service couvre (illimité)' : 'Maximum 2 quartiers'}
              </p>
              <p className="text-green-600 font-black text-[12px] mt-1">
                {zones.length}{!isDeliveryCompany && '/2'} zone{zones.length > 1 ? 's' : ''} sélectionnée{zones.length > 1 ? 's' : ''}
              </p>
            </div>
            {/* Barre de recherche zones — entreprises uniquement */}
            {isDeliveryCompany && (
              <input
                type="text"
                placeholder="🔍 Rechercher une ville..."
                value={zoneSearch}
                onChange={e => setZoneSearch(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-[12px] border-2 border-transparent focus:border-green-500 outline-none"
              />
            )}
            {/* Zones sélectionnées en haut */}
            {zones.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {zones.map(z => (
                  <button key={z} onClick={() => toggleZone(z)}
                    className="flex items-center gap-1.5 bg-green-600 text-white rounded-xl px-3 py-1.5 text-[10px] font-black active:scale-95 transition-all">
                    {z} <span className="opacity-70">✕</span>
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {NEIGHBORHOODS
                .filter(n => !isDeliveryCompany || !zoneSearch || n.toLowerCase().includes((zoneSearch || '').toLowerCase()))
                .map(n => {
                  const sel = zones.includes(n);
                  const disabled = !sel && !isDeliveryCompany && zones.length >= 2;
                  return (
                    <button key={n} onClick={() => !disabled && toggleZone(n)}
                      className={'py-4 px-3 rounded-2xl border-2 text-[11px] font-bold transition-all ' +
                        (sel ? 'bg-green-600 border-green-600 text-white shadow-lg'
                          : disabled ? 'bg-slate-50 border-slate-100 text-slate-300'
                          : 'bg-white border-slate-200 text-slate-700 active:scale-95')}>
                      {n}
                    </button>
                  );
              })}
            </div>
          </div>
        )}

        {step === 'rates' && (
          <div className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">💰</div>
              <h2 className="font-black text-slate-900 text-lg mb-1">Tes tarifs</h2>
              <p className="text-slate-500 text-[11px]">Prix par trajet en FCFA</p>
            </div>
            {rates.map((rate, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tarif {i + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">De</label>
                    <select value={rate.fromZone} onChange={e => updateRate(i, 'fromZone', e.target.value)}
                      className="w-full px-3 py-3 bg-white border-2 border-slate-200 rounded-xl text-[11px] font-bold focus:border-green-600 outline-none">
                      <option value="">Choisir</option>
                      {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Vers</label>
                    <select value={rate.toZone} onChange={e => updateRate(i, 'toZone', e.target.value)}
                      className="w-full px-3 py-3 bg-white border-2 border-slate-200 rounded-xl text-[11px] font-bold focus:border-green-600 outline-none">
                      <option value="">Choisir</option>
                      <option value="same">Meme quartier</option>
                      {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">Prix (FCFA)</label>
                  <input type="number" value={rate.price} min={200} step={100}
                    onChange={e => updateRate(i, 'price', Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-black focus:border-green-600 outline-none"/>
                </div>
                {rates.length > 1 && (
                  <button onClick={() => setRates(rates.filter((_, j) => j !== i))}
                    className="text-[10px] font-bold text-red-400 self-end">Supprimer</button>
                )}
              </div>
            ))}
            {rates.length < 6 && (
              <button onClick={() => setRates([...rates, { fromZone: zones[0] || '', toZone: '', price: 500 }])}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-bold text-slate-400">
                + Ajouter un tarif
              </button>
            )}
          </div>
        )}

        {step === 'bio' && (
          <div className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">✍️</div>
              <h2 className="font-black text-slate-900 text-lg mb-1">Presente ton service</h2>
              <p className="text-slate-500 text-[11px]">Les clients verront ce texte</p>
            </div>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              placeholder="Ex: Livraison rapide en moto. Disponible 7j/7 de 7h a 21h. Serieux et ponctuel"
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-medium focus:border-green-600 outline-none resize-none leading-relaxed"/>

            <div className="bg-green-50 rounded-2xl p-4 space-y-2">
              <p className="text-[9px] font-black text-green-700 uppercase tracking-widest">Resume</p>
              <div className="flex items-center gap-2">
                <span className="text-xl">{vehicles.map(v => VEHICLES.find(x => x.id === v)?.icon).join(' ')}</span>
                <p className="font-black text-slate-900 text-[13px]">{name}</p>
              </div>
              <p className="text-[11px] text-slate-500">
                {STATUSES.find(s => s.id === status)?.label} · {age} ans
                {needsLicense ? (hasLicense ? ' · Permis OK' : ' · Sans permis') : ''}
              </p>
              <p className="text-[11px] text-green-700 font-bold">📍 {zones.join(' · ')}</p>
              {rates.filter(r => r.fromZone && r.toZone).map((r, i) => (
                <p key={i} className="text-[11px] text-slate-600">
                  {r.fromZone} → {r.toZone === 'same' ? 'meme quartier' : r.toZone} : {r.price.toLocaleString('fr-FR')} FCFA
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 bg-white border-t border-slate-100 px-5 py-4"
        style={{ maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)' }}>
        {step === 'identity' && (
          <button onClick={() => setStep('zones')} disabled={!canProceedIdentity}
            className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white disabled:opacity-30 shadow-xl active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
            Continuer →
          </button>
        )}
        {step === 'zones' && (
          <button onClick={() => setStep('rates')} disabled={zones.length === 0}
            className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white disabled:opacity-30 shadow-xl active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
            Continuer →
          </button>
        )}
        {step === 'rates' && (
          <button onClick={() => setStep('bio')}
            disabled={rates.filter(r => r.fromZone && r.toZone && r.price > 0).length === 0}
            className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white disabled:opacity-30 shadow-xl active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
            Continuer →
          </button>
        )}
        {step === 'bio' && (
          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white disabled:opacity-40 shadow-xl active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
                  Enregistrement...
                </span>
              : '🛵 Activer mon profil livreur'}
          </button>
        )}
      </div>
    </div>
  );
}
