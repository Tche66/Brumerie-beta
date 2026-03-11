// src/pages/BecomeDelivererPage.tsx
// Formulaire pour devenir livreur partenaire Brumerie

import React, { useState } from 'react';
import { NEIGHBORHOODS } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { updateDelivererProfile } from '@/services/deliveryService';
import type { DeliveryRate } from '@/types';

interface Props { onBack: () => void; onDone: () => void; }

export function BecomeDelivererPage({ onBack, onDone }: Props) {
  const { currentUser, refreshUserProfile } = useAuth();
  const [step, setStep] = useState<'intro' | 'zones' | 'rates' | 'bio'>('intro');
  const [name, setName] = useState('');
  const [zones, setZones] = useState<string[]>([]);
  const [rates, setRates] = useState<DeliveryRate[]>([{ fromZone: '', toZone: '', price: 500 }]);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const progress = step === 'intro' ? 25 : step === 'zones' ? 50 : step === 'rates' ? 75 : 100;

  const toggleZone = (z: string) => {
    if (zones.includes(z)) setZones(zones.filter(x => x !== z));
    else if (zones.length < 2) setZones([...zones, z]);
  };

  const updateRate = (i: number, field: keyof DeliveryRate, val: string | number) => {
    const newRates = [...rates];
    newRates[i] = { ...newRates[i], [field]: val };
    setRates(newRates);
  };

  const addRate = () => {
    if (rates.length < 6) setRates([...rates, { fromZone: zones[0] || '', toZone: '', price: 500 }]);
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
      await refreshUserProfile();
      onDone();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-14 pb-4">
        <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div>
          <h1 className="font-black text-slate-900 text-lg uppercase tracking-tight">Devenir Livreur</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Partenaire Brumerie</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mx-5 mb-6 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#115E2E,#16A34A)' }}/>
      </div>

      <div className="flex-1 px-5 pb-32 overflow-y-auto">

        {/* ── ÉTAPE 1 — Intro ── */}
        {step === 'intro' && (
          <div className="flex flex-col gap-5">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-6 text-center">
              <div className="text-6xl mb-4">🛵</div>
              <h2 className="font-black text-slate-900 text-xl mb-2">Livre dans ton quartier</h2>
              <p className="text-slate-500 text-[12px] leading-relaxed">
                Rejoins le réseau de livreurs Brumerie. Tu fixes tes propres tarifs, tu couvres jusqu'à 2 quartiers et tu gères tes disponibilités.
              </p>
            </div>

            {[
              ['🗺️', 'Zone locale', 'Maximum 2 quartiers — tu connais le terrain'],
              ['💰', 'Tes tarifs', 'Tu fixes combien tu veux gagner par livraison'],
              ['📱', 'App simple', 'Accepte les missions directement depuis l\'app'],
              ['📊', 'Suivi gains', 'Vois tes livraisons et revenus en temps réel'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="font-black text-slate-900 text-[13px]">{title}</p>
                  <p className="text-slate-500 text-[11px]">{desc}</p>
                </div>
              </div>
            ))}

            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Nom de ton service *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex: Kouassi Express, Rapid'Cocody..."
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold focus:border-green-600 outline-none transition-all"/>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 — Zones ── */}
        {step === 'zones' && (
          <div className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">📍</div>
              <h2 className="font-black text-slate-900 text-lg mb-1">Tes quartiers</h2>
              <p className="text-slate-500 text-[11px]">Choisis 1 ou 2 quartiers que tu couvres</p>
              <p className="text-green-600 font-black text-[11px] mt-1">{zones.length}/2 sélectionné{zones.length > 1 ? 's' : ''}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NEIGHBORHOODS.map(n => {
                const selected = zones.includes(n);
                const disabled = !selected && zones.length >= 2;
                return (
                  <button key={n} onClick={() => !disabled && toggleZone(n)}
                    className={`py-4 px-3 rounded-2xl border-2 text-[11px] font-bold transition-all ${
                      selected ? 'bg-green-600 border-green-600 text-white shadow-lg'
                        : disabled ? 'bg-slate-50 border-slate-100 text-slate-300'
                        : 'bg-white border-slate-200 text-slate-700 active:scale-95'}`}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 — Tarifs ── */}
        {step === 'rates' && (
          <div className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">💰</div>
              <h2 className="font-black text-slate-900 text-lg mb-1">Tes tarifs</h2>
              <p className="text-slate-500 text-[11px]">Fixe tes prix par trajet (en FCFA)</p>
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
                      <option value="same">Même quartier</option>
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
                    className="text-[10px] font-bold text-red-400 self-end">
                    Supprimer
                  </button>
                )}
              </div>
            ))}

            {rates.length < 6 && (
              <button onClick={addRate}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-bold text-slate-400 flex items-center justify-center gap-2">
                + Ajouter un tarif
              </button>
            )}
          </div>
        )}

        {/* ── ÉTAPE 4 — Bio ── */}
        {step === 'bio' && (
          <div className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">✍️</div>
              <h2 className="font-black text-slate-900 text-lg mb-1">Présente ton service</h2>
              <p className="text-slate-500 text-[11px]">Les acheteurs et vendeurs verront ce texte</p>
            </div>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
              placeholder="Ex: Livraison rapide Cocody et Plateau. Disponible 7j/7 de 8h à 20h. Sérieux et ponctuel ✅"
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-medium focus:border-green-600 outline-none resize-none transition-all leading-relaxed"/>

            {/* Résumé */}
            <div className="bg-green-50 rounded-2xl p-4">
              <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-3">Résumé de ton profil</p>
              <p className="font-black text-slate-900 text-[13px] mb-1">{name || 'Mon service de livraison'}</p>
              <p className="text-[11px] text-slate-500 mb-2">📍 {zones.join(' · ') || '—'}</p>
              {rates.filter(r => r.fromZone && r.toZone).map((r, i) => (
                <p key={i} className="text-[11px] text-green-700 font-bold">
                  {r.fromZone} → {r.toZone === 'same' ? 'même quartier' : r.toZone} : {r.price.toLocaleString('fr-FR')} FCFA
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 flex flex-col gap-2" style={{ maxWidth: 480, margin: '0 auto', left: '50%', transform: 'translateX(-50%)' }}>
        {step === 'intro' && (
          <button onClick={() => setStep('zones')}
            disabled={!name.trim()}
            className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white disabled:opacity-30 shadow-xl active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
            Continuer →
          </button>
        )}
        {step === 'zones' && (
          <>
            <button onClick={() => setStep('rates')}
              disabled={zones.length === 0}
              className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white disabled:opacity-30 shadow-xl active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
              Continuer →
            </button>
            <button onClick={() => setStep('intro')} className="w-full py-2 text-slate-400 font-bold text-[11px] uppercase tracking-widest">← Retour</button>
          </>
        )}
        {step === 'rates' && (
          <>
            <button onClick={() => setStep('bio')}
              disabled={rates.filter(r => r.fromZone && r.toZone && r.price > 0).length === 0}
              className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white disabled:opacity-30 shadow-xl active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
              Continuer →
            </button>
            <button onClick={() => setStep('zones')} className="w-full py-2 text-slate-400 font-bold text-[11px] uppercase tracking-widest">← Retour</button>
          </>
        )}
        {step === 'bio' && (
          <>
            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white disabled:opacity-40 shadow-xl active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
              {loading
                ? <div className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Enregistrement...</div>
                : '🛵 Activer mon profil livreur'
              }
            </button>
            <button onClick={() => setStep('rates')} className="w-full py-2 text-slate-400 font-bold text-[11px] uppercase tracking-widest">← Retour</button>
          </>
        )}
      </div>
    </div>
  );
}
