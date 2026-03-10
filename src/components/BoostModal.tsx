// src/components/BoostModal.tsx — Modal boost d'annonce via Wave
import React, { useState, useEffect } from 'react';
import { Product, BOOST_PLANS, BoostDuration } from '@/types';
import { createBoost } from '@/services/boostService';
import { useAuth } from '@/contexts/AuthContext';

interface BoostModalProps {
  product: Product;
  onClose: () => void;
  onBoosted?: () => void;
}

export function BoostModal({ product, onClose, onBoosted }: BoostModalProps) {
  const { currentUser, userProfile } = useAuth();
  const [selected, setSelected] = useState<BoostDuration>('24h');
  const [waveRef, setWaveRef] = useState('');
  const [plans, setPlans] = useState(BOOST_PLANS);
  const [waveLinks, setWaveLinks] = useState<Record<string,string>>({});

  // Lire prix + liens Wave personnalisés depuis Firestore
  useEffect(() => {
    import('@/services/adminService').then(({ getGlobalSettings }) =>
      getGlobalSettings().then((settings: any) => {
        if (settings?.boostPrices) {
          setPlans(BOOST_PLANS.map(p => ({
            ...p,
            price: settings.boostPrices[p.duration] ?? p.price,
          })));
        }
        if (settings?.waveLinks) setWaveLinks(settings.waveLinks);
      }).catch(() => {})
    );
  }, []);
  const [step, setStep] = useState<'choose' | 'pay' | 'confirm' | 'done'>('choose');
  const [loading, setLoading] = useState(false);

  const plan = plans.find(p => p.duration === selected)!;

  const handleConfirmPayment = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await createBoost({
        productId: product.id,
        productTitle: product.title,
        sellerId: currentUser.uid,
        sellerName: userProfile?.name,
        duration: selected,
        waveRef: waveRef.trim() || undefined,
      });
      setStep('done');
    // Son de succès — boost en cours de validation
    import('@/services/soundService').then(({ playSuccessSound }) => playSuccessSound()).catch(() => {});
      setTimeout(() => { onBoosted?.(); onClose(); }, 2500);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-[2.5rem] px-6 pt-5 pb-10 shadow-2xl" style={{ maxHeight: '85dvh', overflowY: 'auto', animation: 'slideUp 0.3s ease-out' }}>
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5"/>

        {step === 'done' ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">⏳</div>
            <h3 className="font-black text-[18px] text-slate-900 mb-2">Demande envoyée !</h3>
            <p className="text-slate-500 text-[13px] leading-relaxed">
              Ton boost sera activé sous <span className="font-black text-green-700">30 minutes</span> après vérification du paiement Wave.
            </p>
          </div>
        ) : step === 'choose' ? (
          <>
            <h3 className="font-black text-[16px] text-slate-900 mb-1">🚀 Booster l'annonce</h3>
            <p className="text-slate-400 text-[12px] mb-5 truncate">« {product.title} »</p>

            {/* Plans */}
            <div className="space-y-3 mb-6">
              {plans.map(p => (
                <button key={p.duration} onClick={() => setSelected(p.duration)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all active:scale-98 ${selected === p.duration ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="text-left">
                    <p className={`font-black text-[13px] ${selected === p.duration ? 'text-green-800' : 'text-slate-700'}`}>{p.label}</p>
                    <p className="text-[11px] text-slate-400">Visible en tête d'accueil</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-[15px] ${selected === p.duration ? 'text-green-700' : 'text-slate-600'}`}>
                      {p.price.toLocaleString('fr-FR')} FCFA
                    </p>
                    {selected === p.duration && <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center ml-auto mt-1"><span className="text-white text-[10px]">✓</span></div>}
                  </div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep('pay')}
              className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
              Payer {plan.price.toLocaleString('fr-FR')} FCFA via Wave →
            </button>
          </>
        ) : step === 'pay' ? (
          <>
            <h3 className="font-black text-[16px] text-slate-900 mb-5">💳 Paiement Wave</h3>

            <div className="bg-green-50 rounded-2xl p-5 mb-5 border border-green-100 text-center">
              <p className="text-[12px] text-green-700 font-bold mb-4">
                Appuie sur le bouton ci-dessous — Wave s'ouvre automatiquement avec le montant déjà rempli.
              </p>
              {/* Deeplink Wave — ouvre l'app Wave avec montant pré-rempli */}
              <a
                href={waveLinks[selected] || `wave://send?phone=+22505868676 93&amount=${plan.price}&note=Boost+Brumerie+${plan.duration}`}
                className="block w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-95 transition-all mb-3 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1AA3FF, #0070D1)' }}
                onClick={() => setTimeout(() => setStep('confirm'), 3000)}>
                📱 Ouvrir Wave — {plan.price.toLocaleString('fr-FR')} FCFA
              </a>
              <p className="text-[10px] text-green-600 font-bold">
                {waveLinks[selected]
                  ? <>🔗 Lien personnalisé configuré</>
                  : <>📱 Lien Wave par défaut · Plan {selected}</>}
              </p>
            </div>

            <p className="text-[11px] text-slate-400 font-medium mb-5 text-center leading-relaxed">
              Après avoir payé dans Wave, reviens ici et confirme.
            </p>

            <button onClick={() => setStep('confirm')}
              className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
              J'ai payé ✓ — Confirmer
            </button>
            <button onClick={() => setStep('choose')}
              className="w-full py-3 mt-2 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
              ← Retour
            </button>
          </>
        ) : (
          <>
            <h3 className="font-black text-[16px] text-slate-900 mb-3">✅ Confirmer le boost</h3>
            <div className="bg-slate-50 rounded-2xl p-4 mb-5">
              <p className="text-[12px] text-slate-600 font-bold">Article : {product.title}</p>
              <p className="text-[12px] text-slate-600 font-bold mt-1">Durée : {plan.label}</p>
              <p className="text-[12px] text-green-700 font-black mt-1">Montant : {plan.price.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mb-5 leading-relaxed">
              En confirmant, tu déclares avoir effectué le paiement Wave. Brumerie vérifiera et activera ton boost sous 30 minutes.
            </p>
            <button onClick={handleConfirmPayment} disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white disabled:opacity-50 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
              {loading ? '⏳ Activation...' : '🚀 Activer le boost'}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes slideUp { from { transform:translateY(30px);opacity:0 } to { transform:translateY(0);opacity:1 } }`}</style>
    </div>
  );
}
