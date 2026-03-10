// src/components/GoogleNeighborhoodModal.tsx
// Modal affichée après 1ère connexion Google pour collecter le quartier
import React, { useState } from 'react';
import { NEIGHBORHOODS } from '@/types';
import { updateUserProfile } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  onDone: () => void;
}

export function GoogleNeighborhoodModal({ onDone }: Props) {
  const { currentUser, refreshUserProfile } = useAuth();
  const [neighborhood, setNeighborhood] = useState('');
  const [customHood, setCustomHood] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!neighborhood.trim() || !currentUser) return;
    setLoading(true);
    try {
      await updateUserProfile(currentUser.uid, { neighborhood: neighborhood.trim() });
      await refreshUserProfile();
      onDone();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg bg-white rounded-t-[3rem] px-6 pt-8 pb-12 shadow-2xl">

        {/* Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📍</div>
          <h2 className="font-black text-slate-900 text-[20px] leading-tight mb-2">
            Tu habites où à Abidjan ?
          </h2>
          <p className="text-[12px] text-slate-500 font-medium">
            On affiche les vendeurs de ton quartier en priorité
          </p>
        </div>

        {/* Sélection quartier */}
        {!customHood ? (
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-[2rem] mb-5">
            {NEIGHBORHOODS.slice(0, 5).map(n => (
              <button key={n} type="button" onClick={() => setNeighborhood(n)}
                className={`py-4 px-3 rounded-2xl border-2 text-[11px] font-bold transition-all ${neighborhood === n ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-white text-slate-500 shadow-sm'}`}>
                {n}
              </button>
            ))}
            <button type="button" onClick={() => { setCustomHood(true); setNeighborhood(''); }}
              className="py-4 px-3 rounded-2xl border-2 border-dashed border-slate-300 text-[11px] font-bold text-slate-400 bg-white">
              + Autre
            </button>
          </div>
        ) : (
          <div className="relative mb-5">
            <input type="text" placeholder="Ton quartier..." value={neighborhood} autoFocus
              onChange={e => setNeighborhood(e.target.value)}
              className="w-full px-6 py-5 bg-slate-50 border-2 border-green-600 rounded-[1.5rem] text-sm focus:bg-white outline-none transition-all" />
            <button type="button" onClick={() => { setCustomHood(false); setNeighborhood(''); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">
              Annuler
            </button>
          </div>
        )}

        <button onClick={handleSave}
          disabled={!neighborhood.trim() || loading}
          className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white transition-all disabled:opacity-30 shadow-xl active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
          {loading
            ? <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enregistrement...
              </div>
            : 'Confirmer mon quartier →'
          }
        </button>

        <button onClick={onDone}
          className="w-full mt-3 py-3 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
          Passer pour l'instant
        </button>
      </div>
    </div>
  );
}
