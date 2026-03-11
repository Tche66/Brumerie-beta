// src/pages/EditDelivererProfilePage.tsx — v17.1
// Page de modification du profil livreur existant
// Ne montre PAS la CGU ni les étapes d'identité — uniquement les infos modifiables

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateDelivererProfile } from '@/services/deliveryService';
import { NEIGHBORHOODS, DeliveryRate } from '@/types';


interface Props { onBack: () => void; onSaved: () => void; }

export function EditDelivererProfilePage({ onBack, onSaved }: Props) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();

  const [name,      setName]      = useState(userProfile?.deliveryPartnerName || '');
  const [bio,       setBio]       = useState(userProfile?.deliveryBio || '');
  const [zones,     setZones]     = useState<string[]>(userProfile?.deliveryZones || []);
  const [rates,     setRates]     = useState<DeliveryRate[]>(
    (userProfile?.deliveryRates || [{ fromZone: '', toZone: '', price: 500 }]) as DeliveryRate[]
  );
  const [available, setAvailable] = useState(userProfile?.deliveryAvailable ?? true);
  const [loading,   setLoading]   = useState(false);
  const [saved,     setSaved]     = useState(false);

  const toggleZone = (z: string) => {
    if (zones.includes(z)) setZones(zones.filter(x => x !== z));
    else if (zones.length < 3) setZones([...zones, z]);
  };

  const setRate = (i: number, field: keyof DeliveryRate, val: string | number) => {
    const r = [...rates];
    r[i] = { ...r[i], [field]: val };
    setRates(r);
  };

  const addRate = () => setRates([...rates, { fromZone: '', toZone: '', price: 500 }]);
  const removeRate = (i: number) => setRates(rates.filter((_, idx) => idx !== i));

  const canSave = name.trim().length > 0 && zones.length > 0 &&
    rates.some(r => r.fromZone && r.toZone && r.price > 0);

  const handleSave = async () => {
    if (!currentUser || !canSave) return;
    setLoading(true);
    try {
      await updateDelivererProfile(currentUser.uid, {
        deliveryPartnerName: name.trim(),
        deliveryBio: bio.trim(),
        deliveryZones: zones,
        deliveryRates: rates.filter(r => r.fromZone && r.toZone && r.price > 0),
        deliveryAvailable: available,
      });
      await refreshUserProfile();
      setSaved(true);
      setTimeout(onSaved, 800);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-5 flex items-center gap-4 border-b border-slate-100 z-40">
        <button onClick={onBack} className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <h1 className="font-black text-slate-900 text-base uppercase tracking-tight">Mon profil livreur</h1>
          <p className="text-[10px] text-slate-400">Modifie tes informations</p>
        </div>
      </div>

      <div className="px-5 pt-6 flex flex-col gap-6">

        {/* Disponibilité */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Disponibilité</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-slate-900 text-[14px]">{available ? '🟢 Disponible' : '⚫ Indisponible'}</p>
              <p className="text-[11px] text-slate-400">{available ? 'Tu reçois des missions' : 'Aucune mission envoyée'}</p>
            </div>
            <button onClick={() => setAvailable(!available)}
              className={'w-14 h-7 rounded-full transition-all relative ' + (available ? 'bg-green-500' : 'bg-slate-300')}>
              <div className={'w-6 h-6 bg-white rounded-full shadow-md absolute top-0.5 transition-all ' + (available ? 'left-7' : 'left-0.5')}/>
            </button>
          </div>
        </div>

        {/* Nom du service */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nom de ton service</p>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Ex: Koba Express, Livraison Rapide CI..."
            className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[13px] border-2 border-transparent focus:border-green-500 outline-none font-bold"/>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Description (optionnel)</p>
          <textarea value={bio} onChange={e => setBio(e.target.value)}
            placeholder="Présente ton service, ton expérience, ta rapidité..."
            rows={3}
            className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[13px] border-2 border-transparent focus:border-green-500 outline-none resize-none"/>
        </div>

        {/* Zones */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zones couvertes</p>
            <p className="text-[10px] font-bold text-green-600">{zones.length}/3 sélectionnées</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(NEIGHBORHOODS || [
              'Cocody','Plateau','Marcory','Treichville','Adjamé','Yopougon',
              'Abobo','Koumassi','Port-Bouët','Attécoubé','Jacqueville','Dabou',
            ]).map(n => {
              const sel = zones.includes(n);
              const dis = !sel && zones.length >= 3;
              return (
                <button key={n} onClick={() => !dis && toggleZone(n)}
                  className={'px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ' +
                    (sel ? 'bg-green-600 text-white' : dis ? 'bg-slate-100 text-slate-300' : 'bg-slate-100 text-slate-600 active:scale-95')}>
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarifs */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mes tarifs</p>
          <div className="flex flex-col gap-3">
            {rates.map((rate, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <div className="flex gap-2 mb-2">
                  <select value={rate.fromZone} onChange={e => setRate(i, 'fromZone', e.target.value)}
                    className="flex-1 bg-white rounded-lg px-2 py-2 text-[11px] border border-slate-200 outline-none">
                    <option value="">De...</option>
                    {(NEIGHBORHOODS || zones).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="flex items-center text-slate-400 font-black text-[12px]">→</span>
                  <select value={rate.toZone} onChange={e => setRate(i, 'toZone', e.target.value)}
                    className="flex-1 bg-white rounded-lg px-2 py-2 text-[11px] border border-slate-200 outline-none">
                    <option value="">Vers...</option>
                    {(NEIGHBORHOODS || zones).map(n => <option key={n} value={n}>{n}</option>)}
                    <option value="same">Même quartier</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={rate.price} min={0}
                    onChange={e => setRate(i, 'price', parseInt(e.target.value) || 0)}
                    className="flex-1 bg-white rounded-lg px-3 py-2 text-[12px] border border-slate-200 outline-none font-black"/>
                  <span className="text-[10px] text-slate-400 font-bold">FCFA</span>
                  {rates.length > 1 && (
                    <button onClick={() => removeRate(i)}
                      className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center active:scale-90">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={addRate}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-[11px] active:scale-95">
              + Ajouter un tarif
            </button>
          </div>
        </div>

        {/* Bouton Sauvegarder */}
        <button onClick={handleSave} disabled={!canSave || loading}
          className="w-full py-5 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white shadow-xl shadow-green-200 active:scale-95 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
          {loading
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
            : saved ? '✅ Profil mis à jour !' : '💾 Sauvegarder les modifications'}
        </button>

      </div>
    </div>
  );
}
