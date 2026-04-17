// src/pages/VerificationPage.tsx — v3 : matrice badges correcte + Premium actif
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getGlobalSettings } from '@/services/adminService';
import { SUPPORT_WHATSAPP } from '@/types';
import { getAppConfig } from '@/services/appConfigService';

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
      + effectiveVerifiedPrice.toLocaleString('fr-FR') + ' FCFA).\n\nVoici ma preuve de paiement en photo.\n\n👤 Nom : '
      + userProfile.name + '\n📧 Email : ' + (userProfile.email || '') + '\n📱 App : ' + userProfile.uid;
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
      + effectivePremiumPrice.toLocaleString('fr-FR') + ' FCFA).\n\nVoici ma preuve de paiement.\n\n👤 Nom : '
      + userProfile.name + '\n📧 Email : ' + (userProfile.email || '') + '\n📱 App : ' + userProfile.uid;
    window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg), '_blank');
  };

  // Fonctionnalités par badge
  const FEATURES_SIMPLE = [
    { icon: '❌', text: <>Aucun badge d'identité vérifiée</> },
    { icon: '📸', text: <>Caméra uniquement (pas de galerie)</> },
    { icon: '📍', text: <>Visibilité normale</> },
    { icon: '💬', text: <>Max <strong>5 chats / jour</strong></> },
    { icon: '📦', text: <>Max <strong>5 produits</strong></> },
    { icon: '📊', text: <span className="text-slate-300">Aucune statistique</span> },
  ];

  const FEATURES_VERIFIED = [
    { icon: '🔵', text: <><strong style={{ color: '#1D9BF0' }}>Badge Bleu</strong> "Vérifié"</> },
    { icon: '📸', text: <>Galerie photos + Catalogue WhatsApp</> },
    { icon: '🚀', text: <>Visibilité <strong>boostée (+20%)</strong></> },
    { icon: '💬', text: <>Messagerie <strong>illimitée</strong></> },
    { icon: '🌐', text: <>Bio + Liens réseaux sociaux</> },
    { icon: '📊', text: <>Stats de vues de base</> },
    { icon: '💰', text: <>Comptabilité · Carnet clients · Catalogue</> },
    { icon: '📊', text: <>Marge · Rapport hebdomadaire</> },
    { icon: '📦', text: <>Max <strong>20 produits</strong></> },
  ];

  const FEATURES_PREMIUM = [
    { icon: '⭐', text: <><strong style={{ color: '#F59E0B' }}>Badge Or</strong> "Premium"</> },
    { icon: '🎬', text: <>Photos Studio + <strong style={{ color: '#F59E0B' }}>Vidéos</strong> (bientôt)</> },
    { icon: '🥇', text: <><strong style={{ color: '#F59E0B' }}>Priorité Max</strong> (Top Page)</> },
    { icon: '🤖', text: <>Messagerie illimitée + Auto-réponse</> },
    { icon: '🎨', text: <>Boutique <strong style={{ color: '#F59E0B' }}>100% personnalisée</strong></> },
    { icon: '🔥', text: <>Vente flash activable</> },
    { icon: '📸', text: <>Stories <strong style={{ color: '#F59E0B' }}>24h</strong></> },
    { icon: '📈', text: <>Analyse détaillée des ventes</> },
    { icon: '📒', text: <>Journal de dettes</> },
    { icon: '📦', text: <><strong style={{ color: '#F59E0B' }}>Produits illimités</strong></> },
  ];

  return (
    <div className="min-h-screen pb-20 font-sans" style={{ background: '#F0F4FF' }}>

      {/* Header */}
      <div className="bg-white sticky top-0 z-50 px-5 py-5 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <h1 className="font-black text-sm uppercase tracking-widest text-slate-900">Badges & Plans</h1>
          <p className="text-[9px] text-slate-400 font-bold mt-0.5">Choisissez votre niveau de visibilité sur Brumerie</p>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-4">

        {/* ── CARTE SIMPLE ── */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">🔓 Simple</p>
          <p className="text-4xl font-black text-slate-300 mb-1">0 <span className="text-xl">FCFA</span></p>
          <p className="text-[10px] text-slate-400 mb-5">Pour tester l'application</p>
          <div className="space-y-3">
            {FEATURES_SIMPLE.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-base w-6 text-center flex-shrink-0">{f.icon}</span>
                <p className="text-[12px] font-medium text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-slate-100 rounded-2xl py-4 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {tier === 'simple' ? '— Plan actuel —' : 'Plan de base'}
            </p>
          </div>
        </div>

        {/* ── CARTE VÉRIFIÉ ── */}
        <div className="rounded-3xl overflow-visible relative"
          style={{ boxShadow: tier === 'simple' ? '0 20px 60px rgba(29,155,240,0.25)' : 'none', border: '2px solid #1D9BF0' }}>

          {tier === 'simple' && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                🔥 RECOMMANDÉ POUR VOUS !
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 pt-8">
            <p className="font-black uppercase tracking-widest mb-2" style={{ color: '#1D9BF0' }}>🔵 Vérifié</p>

            <div className="flex items-baseline gap-3 mb-1">
              {verificationPromoPrice && (
                <p className="text-slate-300 line-through text-lg font-bold">{verificationPrice.toLocaleString('fr-FR')}</p>
              )}
              <p className="text-5xl font-black text-slate-900">
                {effectiveVerifiedPrice.toLocaleString('fr-FR')} <span className="text-xl font-bold">FCFA</span>
              </p>
              {verificationPromoPrice && (
                <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">PROMO</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mb-5">Visibilité accrue · Identité contrôlée · /mois</p>

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
                <div className="rounded-2xl py-4 text-center" style={{ background: '#EFF6FF' }}>
                  <p className="font-black text-[11px] uppercase tracking-widest" style={{ color: '#1D9BF0' }}>✓ Badge actif</p>
                </div>
              ) : tier === 'premium' ? (
                <div className="rounded-2xl py-4 text-center bg-slate-50">
                  <p className="font-black text-[11px] text-slate-400 uppercase tracking-widest">Inclus dans Premium ✓</p>
                </div>
              ) : (
                <>
                  {sent ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl py-4 px-4 text-center bg-green-50 border-2 border-green-200">
                        <p className="text-green-800 font-black text-[12px]">✅ Paiement lancé !</p>
                        <p className="text-green-600 text-[10px] mt-1 font-bold">Envoie ta preuve de paiement ci-dessous</p>
                      </div>
                      <button onClick={handleSendProof}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[12px] text-white active:scale-[0.98] transition-all"
                        style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                        📸 Envoyer ma preuve de paiement
                      </button>
                      <button onClick={() => setSent(false)} className="w-full py-3 rounded-2xl font-bold text-[11px] text-slate-400 bg-slate-50">
                        ← Recommencer
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleActivate}
                      className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[12px] text-white active:scale-[0.98] transition-all"
                      style={{ background: 'linear-gradient(135deg,#1B5E20,#16A34A)', boxShadow: '0 10px 30px rgba(22,163,74,0.4)' }}>
                      💳 PAYER {effectiveVerifiedPrice.toLocaleString('fr-FR')} FCFA
                    </button>
                  )}
                  <p className="text-center text-amber-500 font-black text-[10px]">✨ Cadeau : +30 jours gratuits !</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── CARTE PREMIUM ── */}
        <div className="rounded-3xl p-6 pb-8 relative overflow-visible"
          style={{
            background: '#0F0F0F',
            border: tier === 'premium' ? '2px solid #F59E0B' : '2px solid rgba(245,158,11,0.2)',
            boxShadow: tier !== 'premium' ? '0 20px 60px rgba(245,158,11,0.15)' : '0 20px 60px rgba(245,158,11,0.4)',
          }}>

          {tier !== 'premium' && tier !== 'simple' && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="text-[10px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#1a1a1a' }}>
                ⭐ PASSE AU NIVEAU SUPÉRIEUR
              </div>
            </div>
          )}

          <div className="pt-2">
            <p className="font-black uppercase tracking-widest mb-2" style={{ color: '#F59E0B' }}>⭐ Premium</p>

            <div className="flex items-baseline gap-3 mb-1">
              {premiumPromoPrice && (
                <p className="line-through text-lg font-bold" style={{ color: '#78716C' }}>{premiumPrice.toLocaleString('fr-FR')}</p>
              )}
              <p className="text-5xl font-black text-white">
                {effectivePremiumPrice.toLocaleString('fr-FR')} <span className="text-xl font-bold">FCFA</span>
              </p>
              {premiumPromoPrice && (
                <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">PROMO</span>
              )}
            </div>
            <p className="text-[10px] mb-5" style={{ color: '#78716C' }}>L'élite du e-commerce local · /mois</p>

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
                <div className="rounded-2xl py-4 text-center"
                  style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <p className="font-black text-[11px] uppercase tracking-widest" style={{ color: '#F59E0B' }}>⭐ Badge Premium actif</p>
                </div>
              ) : (
                <>
                  {sentPremium ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl py-4 px-4 text-center bg-amber-900/30 border border-amber-600/40">
                        <p className="font-black text-[12px] text-amber-400">✅ Paiement lancé !</p>
                        <p className="text-amber-300/70 text-[10px] mt-1 font-bold">Envoie ta preuve ci-dessous</p>
                      </div>
                      <button onClick={handleSendProofPremium}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[12px] active:scale-[0.98] transition-all"
                        style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', color: 'white' }}>
                        📸 Envoyer ma preuve de paiement
                      </button>
                      <button onClick={() => setSentPremium(false)}
                        className="w-full py-3 rounded-2xl font-bold text-[11px] bg-white/10 text-white/50">
                        ← Recommencer
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleActivatePremium}
                      className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[12px] active:scale-[0.98] transition-all"
                      style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#1a1a1a', boxShadow: '0 10px 30px rgba(245,158,11,0.4)' }}>
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
