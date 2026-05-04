// src/components/GoogleNeighborhoodModal.tsx
// Onboarding post-connexion Google — 3 étapes :
// 1. Quartier (obligatoire)
// 2. WhatsApp (obligatoire)
// 3. Code parrainage (optionnel)

import React, { useState } from 'react';
import { NEIGHBORHOODS } from '@/types';
import { updateUserProfile } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { applyReferral, ensureReferralCode } from '@/services/referralService';

interface Props {
  onDone: () => void;
}

type Step = 'neighborhood' | 'whatsapp' | 'referral';

export function GoogleNeighborhoodModal({ onDone }: Props) {
  const { currentUser, refreshUserProfile } = useAuth();

  const [step, setStep]                     = useState<Step>('neighborhood');
  const [neighborhood, setNeighborhood]     = useState('');
  const [customHood, setCustomHood]         = useState(false);
  const [whatsapp, setWhatsapp]             = useState('');
  const [referralCode, setReferralCode]     = useState('');
  const [referralStatus, setReferralStatus] = useState<'idle'|'ok'|'err'>('idle');
  const [loading, setLoading]               = useState(false);

  const handleNeighborhoodNext = () => {
    if (!neighborhood.trim()) return;
    setStep('whatsapp');
  };

  const handleWhatsappNext = () => {
    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length < 8) return;
    setStep('referral');
  };

  const handleFinish = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const digits = whatsapp.replace(/\D/g, '');
      const phone  = digits.startsWith('225') ? '+' + digits : '+225' + digits;

      await updateUserProfile(currentUser.uid, {
        neighborhood: neighborhood.trim(),
        phone,
        needsOnboarding: false,  // effacer le flag
      } as any);

      if (referralCode.trim()) {
        const ok = await applyReferral(currentUser.uid, referralCode.trim().toUpperCase());
        setReferralStatus(ok ? 'ok' : 'err');
        if (!ok) await new Promise(r => setTimeout(r, 1500));
      }

      await ensureReferralCode(currentUser.uid, currentUser.displayName || '');
      await refreshUserProfile();
      onDone();
    } catch (e) {
      console.error('[GoogleOnboarding]', e);
    } finally {
      setLoading(false);
    }
  };

  const progress = step === 'neighborhood' ? 33 : step === 'whatsapp' ? 66 : 100;

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg bg-white rounded-t-[3rem] px-6 pt-8 pb-12 shadow-2xl">

        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5" />

        {/* Progress bar */}
        <div className="w-full h-1 bg-slate-100 rounded-full mb-7 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: progress + '%', background: 'linear-gradient(90deg,#115E2E,#16A34A)' }} />
        </div>

        {/* ── ÉTAPE 1 — Quartier ── */}
        {step === 'neighborhood' && (
          <>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">📍</div>
              <h2 className="font-black text-slate-900 text-[20px] leading-tight mb-2">
                Tu habites où à Abidjan ?
              </h2>
              <p className="text-[12px] text-slate-500 font-medium">
                On affiche les vendeurs de ton quartier en priorité
              </p>
            </div>

            {!customHood ? (
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-[2rem] mb-5">
                {NEIGHBORHOODS.slice(0, 5).map(n => (
                  <button key={n} type="button" onClick={() => setNeighborhood(n)}
                    className={'py-4 px-3 rounded-2xl border-2 text-[11px] font-bold transition-all ' +
                      (neighborhood === n
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                        : 'bg-white border-white text-slate-500 shadow-sm')}>
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

            <button onClick={handleNeighborhoodNext}
              disabled={!neighborhood.trim()}
              className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white transition-all disabled:opacity-30 shadow-xl active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
              Continuer →
            </button>
          </>
        )}

        {/* ── ÉTAPE 2 — WhatsApp ── */}
        {step === 'whatsapp' && (
          <>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">📱</div>
              <h2 className="font-black text-slate-900 text-[20px] leading-tight mb-2">
                Ton numéro WhatsApp
              </h2>
              <p className="text-[12px] text-slate-500 font-medium">
                Les acheteurs te contactent directement sur WhatsApp
              </p>
            </div>

            <div className="flex gap-2 mb-5">
              <div className="flex items-center gap-2 px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] text-sm font-bold text-slate-600 whitespace-nowrap">
                🇨🇮 +225
              </div>
              <input type="tel" placeholder="05 86 86 76 93"
                value={whatsapp} autoFocus
                onChange={e => setWhatsapp(e.target.value)}
                className="flex-1 px-5 py-4 bg-slate-50 border-2 border-green-600 rounded-[1.5rem] text-sm focus:bg-white outline-none transition-all font-medium" />
            </div>

            <button onClick={handleWhatsappNext}
              disabled={whatsapp.replace(/\D/g, '').length < 8}
              className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white transition-all disabled:opacity-30 shadow-xl active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
              Continuer →
            </button>

            <button onClick={() => setStep('neighborhood')}
              className="w-full mt-3 py-3 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
              ← Retour
            </button>
          </>
        )}

        {/* ── ÉTAPE 3 — Parrainage ── */}
        {step === 'referral' && (
          <>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎁</div>
              <h2 className="font-black text-slate-900 text-[20px] leading-tight mb-2">
                Code de parrainage ?
              </h2>
              <p className="text-[12px] text-slate-500 font-medium">
                Un ami t'a invité ? Entre son code pour lui offrir un bonus
              </p>
            </div>

            <input type="text" placeholder="Ex : KONAN-X7K2"
              value={referralCode}
              autoFocus
              onChange={e => { setReferralCode(e.target.value.toUpperCase()); setReferralStatus('idle'); }}
              className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] text-sm focus:border-green-600 focus:bg-white outline-none transition-all font-mono font-bold text-center tracking-widest uppercase mb-2" />

            {referralStatus === 'err' && (
              <p className="text-[11px] text-red-500 text-center font-bold mb-2">
                Code invalide ou déjà utilisé
              </p>
            )}
            {referralStatus === 'ok' && (
              <p className="text-[11px] text-green-600 text-center font-bold mb-2">
                ✅ Code appliqué !
              </p>
            )}

            <button onClick={handleFinish} disabled={loading}
              className="w-full py-5 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] text-white transition-all disabled:opacity-40 shadow-xl active:scale-[0.98] mt-3"
              style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
              {loading
                ? <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enregistrement...
                  </div>
                : "C'est parti ! 🚀"
              }
            </button>

            <button onClick={handleFinish} disabled={loading}
              className="w-full mt-3 py-3 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
              Passer — je n'ai pas de code
            </button>
          </>
        )}

      </div>
    </div>
  );
}
