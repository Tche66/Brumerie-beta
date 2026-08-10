// src/pages/VerificationPage.tsx — v3 : matrice badges correcte + Premium actif
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getGlobalSettings } from '@/services/adminService';
import { SUPPORT_WHATSAPP } from '@/types';
import { getAppConfig } from '@/services/appConfigService';
import { BruIcons } from '@/components/BruIcons';

interface VerificationPageProps { onBack: () => void; }

export function VerificationPage({ onBack }: VerificationPageProps) {
  const { userProfile } = useAuth();
  const [sent, setSent]  = useState(false);
  const [sentPremium, setSentPremium] = useState(false);

  // Prix Vérifié (depuis Firestore — modifiable admin)
  const [verificationPrice, setVerificationPrice]           = useState(5000);
  const [verificationPromoPrice, setVerificationPromoPrice] = useState<number | null>(null);
  // Prix Premium (depuis Firestore — modifiable admin)
  const [premiumPrice, setPremiumPrice]                     = useState(10000);
  const [premiumPromoPrice, setPremiumPromoPrice]           = useState<number | null>(null);

  useEffect(() => {
    getGlobalSettings().then((s: any) => {
      if (s?.verificationPrice)   setVerificationPrice(s.verificationPrice);
      setVerificationPromoPrice(s?.verificationPromoPrice > 0 ? s.verificationPromoPrice : null);
      if (s?.premiumPrice)        setPremiumPrice(s.premiumPrice);
      setPremiumPromoPrice(s?.premiumPromoPrice > 0 ? s.premiumPromoPrice : null);
    }).catch(() => {});
  }, []);

  const effectiveVerifiedPrice = verificationPromoPrice ?? verificationPrice;
  const effectivePremiumPrice  = premiumPromoPrice ?? premiumPrice;

  const tier = userProfile?.isPremium ? 'premium' : userProfile?.isVerified ? 'verified' : 'simple';

  const handleActivate = () => {
    if (!userProfile) return;
    const config  = getAppConfig();
    const payLink = config.badgePaymentLink || '';
    if (payLink) window.open(payLink, '_blank');
    setSent(true);
  };

  const handleSendProof = () => {
    if (!userProfile) return;
    const config = getAppConfig();
    const waNum  = config.badgeWhatsappAfter || SUPPORT_WHATSAPP;
    const msg    = 'Bonjour Brumerie ! Je viens de payer le Badge Vérifié ('
      + effectiveVerifiedPrice.toLocaleString('fr-FR') + 'FCFA).\n\nVoici ma preuve de paiement en photo.\n\nNom :'
      + userProfile.name + '\n📧 Email : ' + (userProfile.email || '') + '\nApp :' + userProfile.uid;
    window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg), '_blank');
  };

  const handleActivatePremium = () => {
    if (!userProfile) return;
    const config  = getAppConfig();
    const payLink = (config as any).premiumPaymentLink || config.badgePaymentLink || '';
    if (payLink) window.open(payLink, '_blank');
    setSentPremium(true);
  };

  const handleSendProofPremium = () => {
    if (!userProfile) return;
    const config = getAppConfig();
    const waNum  = config.badgeWhatsappAfter || SUPPORT_WHATSAPP;
    const msg    = 'Bonjour Brumerie ! Je viens de payer le Badge Premium ('
      + effectivePremiumPrice.toLocaleString('fr-FR') + 'FCFA).\n\nVoici ma preuve de paiement en photo.\n\nNom :'
      + userProfile.name + '\n📧 Email : ' + (userProfile.email || '') + '\nApp :' + userProfile.uid;
    window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg), '_blank');
  };

  // Fonctionnalités par badge
  const FEATURES_SIMPLE = [
    { icon: '', text: <>Aucun badge d'identité vérifiée</> },
    { icon: '', text: <>Caméra uniquement (pas de galerie)</> },
    { icon: '', text: <>Visibilité normale</> },
    { icon: '', text: <>Max <strong>5 chats / jour</strong></> },
    { icon: '', text: <>Max <strong>5 produits</strong></> },
    { icon: '', text: <span className="text-slate-300">Aucune statistique</span> },
  ];

  const FEATURES_VERIFIED = [
    { icon: '🔵', text: <><strong style={{ color: '#1D9BF0' }}>Badge Bleu</strong> "Vérifié"</> },
    { icon: '', text: <>Galerie photos complète</> },
    { icon: '🚀', text: <>Visibilité <strong>boostée (+20%)</strong></> },
    { icon: '', text: <>Messagerie <strong>illimitée</strong></> },
    { icon: '', text: <>Bio + Liens réseaux sociaux</> },
    { icon: '', text: <>Stats de vues de base</> },
    { icon: '', text: <>Stories <strong>24h</strong></> },
    { icon: '', text: <>Max <strong>20 produits</strong></> },
  ];

  const FEATURES_PREMIUM = [
    { icon: '⭐', text: <><strong style={{ color: '#F59E0B' }}>Badge Or</strong> "Premium"</> },
    { icon: '🎬', text: <>Photos Studio + <strong style={{ color: '#F59E0B' }}>Vidéos</strong> (bientôt)</> },
    { icon: '', text: <><strong style={{ color: '#F59E0B' }}>Priorité Max</strong> (Top Page)</> },
    { icon: '🤖', text: <>Messagerie illimitée + Auto-réponse</> },
    { icon: '', text: <>Boutique <strong style={{ color: '#F59E0B' }}>100% personnalisée</strong> + Vente flash</> },
    { icon: '', text: <>Comptabilité · Carnet clients · Catalogue</> },
    { icon: '', text: <>Marge · Rapport hebdomadaire · Dettes</> },
    { icon: '', text: <>Analyse <strong style={{ color: '#F59E0B' }}>détaillée</strong> des ventes</> },
    { icon: '', text: <><strong style={{ color: '#F59E0B' }}>Produits illimités</strong></> },
  ];

  return (
    <div className="min-h-screen pb-20 font-sans bg-gray-50 dark:bg-slate-900">

      {/* Header */}
      <div className="bg-white sticky top-0 z-50 px-5 py-5 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700 active:scale-[0.98] transition-all">
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="font-semibold text-sm text-slate-900">Badges & Plans</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Choisissez votre niveau de visibilité sur Brumerie</p>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-4">

        {/* ── CARTE SIMPLE ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-400 mb-1"><BruIcons.Unlock size={14}/> Simple</p>
          <p className="text-4xl font-semibold text-slate-300 mb-1">0 <span className="text-xl">FCFA</span></p>
          <p className="text-xs text-slate-400 mb-5">Pour tester l'application</p>
          <div className="space-y-3">
            {FEATURES_SIMPLE.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-base w-6 text-center flex-shrink-0">{f.icon}</span>
                <p className="text-[12px] font-medium text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-slate-100 rounded-lg py-4 text-center">
            <p className="text-xs font-medium text-slate-400">
              {tier === 'simple' ? '— Plan actuel —' : 'Plan de base'}
            </p>
          </div>
        </div>

        {/* ── CARTE VÉRIFIÉ ── */}
        <div className="rounded-xl overflow-visible relative"
          style={{ boxShadow: tier === 'simple' ? '0 20px 60px rgba(29,155,240,0.25)' : 'none', border: '2px solid #1D9BF0' }}>

          {tier === 'simple' && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-amber-400 text-slate-900 text-xs font-medium px-5 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                <BruIcons.Flame size={14}/> Recommandé pour vous !
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 pt-8">
            <p className="font-semibold mb-2" style={{ color: '#1D9BF0' }}>🔵 Vérifié</p>

            <div className="flex items-baseline gap-3 mb-1">
              {verificationPromoPrice && (
                <p className="text-slate-300 line-through text-lg font-bold">{verificationPrice.toLocaleString('fr-FR')}</p>
              )}
              <p className="text-5xl font-semibold text-slate-900">
                {effectiveVerifiedPrice.toLocaleString('fr-FR')} <span className="text-xl font-bold">FCFA</span>
              </p>
              {verificationPromoPrice && (
                <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">PROMO</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-5">Visibilité accrue · Identité contrôlée · /mois</p>

            <div className="space-y-3">
              {FEATURES_VERIFIED.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center flex-shrink-0">{f.icon}</span>
                  <p className="text-[12px] font-medium text-slate-600">{f.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {tier === 'verified' ? (
                <div className="rounded-lg py-4 text-center" style={{ background: '#EFF6FF' }}>
                  <p className="text-xs font-medium" style={{ color: '#1D9BF0' }}>✓ Badge actif</p>
                </div>
              ) : tier === 'premium' ? (
                <div className="rounded-lg py-4 text-center bg-gray-50 dark:bg-slate-900">
                  <p className="text-xs font-medium text-slate-400">Inclus dans Premium ✓</p>
                </div>
              ) : (
                <>
                  {sent ? (
                    <div className="space-y-3">
                      <div className="rounded-lg py-4 px-4 text-center bg-green-50 border-2 border-green-200">
                        <p className="text-green-800 font-semibold text-[12px]"><BruIcons.CheckCircle size={14}/> Paiement lancé !</p>
                        <p className="text-green-600 text-xs mt-1 font-medium">Envoie ta preuve de paiement ci-dessous</p>
                      </div>
                      <button onClick={handleSendProof}
                        className="w-full py-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-medium text-xs text-white active:scale-[0.98] transition-all">
                        <BruIcons.Camera size={14}/> Envoyer ma preuve de paiement
                      </button>
                      <button onClick={() => setSent(false)} className="w-full py-3 rounded-lg font-bold text-[11px] text-slate-400 bg-gray-50 dark:bg-slate-900">
                        ← Recommencer
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleActivate}
                      className="w-full py-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-medium text-xs text-white active:scale-[0.98] transition-all shadow-sm">
                      <BruIcons.Credit size={14}/> PAYER {effectiveVerifiedPrice.toLocaleString('fr-FR')} FCFA
                    </button>
                  )}
                  <p className="text-center text-amber-500 font-semibold text-xs">✨ Cadeau : +30 jours gratuits !</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── CARTE PREMIUM ── */}
        <div className="rounded-xl p-6 pb-8 relative overflow-visible"
          style={{
            background: '#0F0F0F',
            border: tier === 'premium' ? '2px solid #F59E0B' : '2px solid rgba(245,158,11,0.2)',
            boxShadow: tier !== 'premium' ? '0 8px 24px rgba(245,158,11,0.10)' : '0 8px 24px rgba(245,158,11,0.20)',
          }}>

          {tier !== 'premium' && tier !== 'simple' && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="text-xs font-medium px-5 py-1.5 rounded-full shadow-sm whitespace-nowrap bg-amber-500 text-slate-900">
                ⭐ Passe au niveau supérieur
              </div>
            </div>
          )}

          <div className="pt-2">
            <p className="font-semibold mb-2" style={{ color: '#F59E0B' }}>⭐ Premium</p>

            <div className="flex items-baseline gap-3 mb-1">
              {premiumPromoPrice && (
                <p className="line-through text-lg font-bold" style={{ color: '#78716C' }}>{premiumPrice.toLocaleString('fr-FR')}</p>
              )}
              <p className="text-5xl font-semibold text-white">
                {effectivePremiumPrice.toLocaleString('fr-FR')} <span className="text-xl font-bold">FCFA</span>
              </p>
              {premiumPromoPrice && (
                <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">PROMO</span>
              )}
            </div>
            <p className="text-xs mb-5" style={{ color: '#78716C' }}>L'élite du e-commerce local · /mois</p>

            <div className="space-y-3">
              {FEATURES_PREMIUM.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center flex-shrink-0">{f.icon}</span>
                  <p className="text-[12px] font-medium" style={{ color: '#A8A29E' }}>{f.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {tier === 'premium' ? (
                <div className="rounded-lg py-4 text-center"
                  style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <p className="text-xs font-medium" style={{ color: '#F59E0B' }}>⭐ Badge Premium actif</p>
                </div>
              ) : (
                <>
                  {sentPremium ? (
                    <div className="space-y-3">
                      <div className="rounded-lg py-4 px-4 text-center bg-amber-900/30 border border-amber-600/40">
                        <p className="font-semibold text-xs text-amber-400"><BruIcons.CheckCircle size={14}/> Paiement lancé !</p>
                        <p className="text-amber-300/70 text-xs mt-1 font-medium">Envoie ta preuve ci-dessous</p>
                      </div>
                      <button onClick={handleSendProofPremium}
                        className="w-full py-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-medium text-xs text-white active:scale-[0.98] transition-all">
                        <BruIcons.Camera size={14}/> Envoyer ma preuve de paiement
                      </button>
                      <button onClick={() => setSentPremium(false)}
                        className="w-full py-3 rounded-lg font-bold text-[11px] bg-white/10 text-white/50">
                        ← Recommencer
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleActivatePremium}
                      className="w-full py-4 rounded-lg bg-amber-500 hover:bg-amber-600 font-medium text-xs text-slate-900 active:scale-[0.98] transition-all shadow-sm">
                      ⭐ PAYER {effectivePremiumPrice.toLocaleString('fr-FR')} FCFA
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
