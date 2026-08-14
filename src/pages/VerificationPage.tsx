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
  const [sentVerif, setSentVerif] = useState(false);
  const [sentPremium, setSentPremium] = useState(false);

  const [verificationPrice, setVerificationPrice] = useState(5000);
  const [premiumPrice, setPremiumPrice] = useState(3000);

  useEffect(() => {
    getGlobalSettings().then((s: any) => {
      if (s?.verificationPrice) setVerificationPrice(s.verificationPrice);
      if (s?.premiumPrice) setPremiumPrice(s.premiumPrice);
    }).catch(() => {});
  }, []);

  const tier = userProfile?.isPremium ? 'premium' : userProfile?.isVerified ? 'verified' : 'simple';

  // Eligibility check for Verified badge
  const memberSinceMonths = (() => {
    try {
      const created = (userProfile as any)?.createdAt?.toDate
        ? (userProfile as any).createdAt.toDate()
        : new Date((userProfile as any)?.createdAt);
      const months = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return Math.floor(months);
    } catch { return 0; }
  })();

  const completedSales = (userProfile as any)?.completedSales || 0;
  const avgRating = (userProfile as any)?.avgRating || 0;
  const positiveReviews = (userProfile as any)?.positiveReviewCount || 0;

  const isEligible = memberSinceMonths >= 6 && completedSales >= 5 && positiveReviews >= 3;

  const criteria = [
    { label: '6 mois sur Brumerie', met: memberSinceMonths >= 6, detail: `${memberSinceMonths} mois` },
    { label: '5 ventes completees', met: completedSales >= 5, detail: `${completedSales}/5` },
    { label: '3 avis positifs (4★+)', met: positiveReviews >= 3, detail: `${positiveReviews}/3` },
    { label: "Piece d'identite + selfie", met: false, detail: 'A envoyer' },
  ];

  const handleRequestVerification = () => {
    if (!userProfile) return;
    const config = getAppConfig();
    const waNum = config.badgeWhatsappAfter || SUPPORT_WHATSAPP;
    const msg = `Bonjour Brumerie !\n\nJe souhaite obtenir le Badge Verifie.\n\nNom : ${userProfile.name}\nEmail : ${userProfile.email || ''}\nUID : ${userProfile.uid}\n\nJ'envoie ma piece d'identite et mon selfie en photo ci-apres.`;
    window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg), '_blank');
    setSentVerif(true);
  };

  const handlePayVerification = () => {
    if (!userProfile) return;
    const config = getAppConfig();
    const payLink = config.badgePaymentLink || '';
    if (payLink) window.open(payLink, '_blank');
  };

  const handleActivatePremium = () => {
    if (!userProfile) return;
    const config = getAppConfig();
    const payLink = (config as any).premiumPaymentLink || config.badgePaymentLink || '';
    if (payLink) window.open(payLink, '_blank');
    setSentPremium(true);
  };

  const handleSendProofPremium = () => {
    if (!userProfile) return;
    const config = getAppConfig();
    const waNum = config.badgeWhatsappAfter || SUPPORT_WHATSAPP;
    const msg = `Bonjour Brumerie !\n\nJe viens de payer le Badge Premium (${premiumPrice.toLocaleString('fr-FR')} FCFA/mois).\n\nVoici ma preuve de paiement en photo.\n\nNom : ${userProfile.name}\nEmail : ${userProfile.email || ''}\nUID : ${userProfile.uid}`;
    window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg), '_blank');
  };

  const FEATURES_VERIFIED = [
    'Badge bleu de confiance sur votre profil',
    'Indique aux acheteurs que vous etes un vendeur verifie par Brumerie',
    'Identite confirmee — les clients vous font confiance',
    'Votre profil est marque comme fiable et authentique',
  ];

  const FEATURES_PREMIUM = [
    'Badge Or Premium sur votre profil',
    'Tout le badge Verifie inclus',
    'Priorite maximale (top des resultats)',
    'Produits illimites',
    'Boutique 100% personnalisee + Vente flash',
    'Comptabilite, Carnet clients, Catalogue',
    'Marge, Rapport hebdomadaire, Dettes',
    'Analyse detaillee des ventes',
    'Auto-reponse messagerie',
  ];

  return (
    <div className="min-h-screen pb-20 bg-white">

      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-4">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 active:scale-90 transition-all">
          <ChevronLeft size={18} className="text-slate-600" />
        </button>
        <h1 className="font-bold text-[15px] text-slate-900">Badges & Plans</h1>
      </div>

      <div className="px-5 pt-6 space-y-6">

        {/* ══ BADGE VERIFIE ══════════════════════════════════════════ */}
        <div className="border border-blue-200 rounded-2xl overflow-hidden">
          <div className="bg-blue-50 px-5 py-4 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-900">Badge Verifie</p>
                  <p className="text-[11px] text-slate-500">Vendeur verifie par la plateforme</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-bold text-slate-900">{verificationPrice.toLocaleString('fr-FR')} FCFA</p>
                <p className="text-[10px] text-slate-400">/an</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-5">
            {/* Criteres d'eligibilite */}
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Criteres d'eligibilite</p>
            <div className="space-y-2.5 mb-5">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${c.met ? 'bg-green-100' : 'bg-slate-100'}`}>
                    {c.met
                      ? <Check size={12} className="text-green-600"/>
                      : <X size={12} className="text-slate-400"/>
                    }
                  </div>
                  <p className={`text-[12px] flex-1 ${c.met ? 'text-slate-700' : 'text-slate-400'}`}>{c.label}</p>
                  <span className={`text-[10px] font-semibold ${c.met ? 'text-green-600' : 'text-slate-400'}`}>{c.detail}</span>
                </div>
              ))}
            </div>

            {/* Avantages */}
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Avantages inclus</p>
            <div className="space-y-2 mb-5">
              {FEATURES_VERIFIED.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Check size={12} className="text-blue-500 flex-shrink-0"/>
                  <p className="text-[12px] text-slate-600">{f}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            {tier === 'verified' || tier === 'premium' ? (
              <div className="rounded-xl py-3 text-center bg-blue-50 border border-blue-200">
                <p className="text-[12px] font-semibold text-blue-600">Badge Verifie actif</p>
              </div>
            ) : sentVerif ? (
              <div className="space-y-3">
                <div className="rounded-xl py-3 px-4 text-center bg-green-50 border border-green-200">
                  <p className="text-[12px] font-semibold text-green-700">Demande envoyee !</p>
                  <p className="text-[11px] text-green-600 mt-1">Envoyez votre piece + selfie sur WhatsApp. Apres validation, payez {verificationPrice.toLocaleString('fr-FR')} FCFA pour activer.</p>
                </div>
                <button onClick={handlePayVerification}
                  className="w-full py-3 rounded-xl bg-blue-500 text-white text-[12px] font-semibold active:scale-[0.98] transition-all">
                  Payer {verificationPrice.toLocaleString('fr-FR')} FCFA pour activer
                </button>
              </div>
            ) : !isEligible ? (
              <div className="rounded-xl py-3 px-4 text-center bg-slate-50 border border-slate-200">
                <p className="text-[12px] font-semibold text-slate-500">Criteres non remplis</p>
                <p className="text-[11px] text-slate-400 mt-1">Continuez a vendre pour debloquer ce badge</p>
              </div>
            ) : (
              <button onClick={handleRequestVerification}
                className="w-full py-3.5 rounded-xl bg-blue-500 text-white text-[12px] font-semibold active:scale-[0.98] transition-all">
                Demander la verification
              </button>
            )}
          </div>
        </div>

        {/* ══ BADGE PREMIUM ═══════════════════════════════════════════ */}
        <div className="border border-amber-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-900 px-5 py-4 border-b border-amber-300/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">Badge Premium</p>
                  <p className="text-[11px] text-slate-400">Vendeur professionnel</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-bold text-amber-400">{premiumPrice.toLocaleString('fr-FR')} FCFA</p>
                <p className="text-[10px] text-slate-500">/mois</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 bg-slate-950">
            {/* Avantages */}
            <div className="space-y-2.5 mb-5">
              {FEATURES_PREMIUM.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Check size={12} className="text-amber-400 flex-shrink-0"/>
                  <p className="text-[12px] text-slate-300">{f}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            {tier === 'premium' ? (
              <div className="rounded-xl py-3 text-center border border-amber-500/30" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <p className="text-[12px] font-semibold text-amber-400">Badge Premium actif</p>
              </div>
            ) : sentPremium ? (
              <div className="space-y-3">
                <div className="rounded-xl py-3 px-4 text-center border border-amber-500/30" style={{ background: 'rgba(245,158,11,0.1)' }}>
                  <p className="text-[12px] font-semibold text-amber-400">Paiement lance !</p>
                  <p className="text-[11px] text-amber-300/60 mt-1">Envoyez votre preuve de paiement</p>
                </div>
                <button onClick={handleSendProofPremium}
                  className="w-full py-3.5 rounded-xl bg-amber-500 text-slate-900 text-[12px] font-semibold active:scale-[0.98] transition-all">
                  Envoyer la preuve de paiement
                </button>
                <button onClick={() => setSentPremium(false)}
                  className="w-full py-2.5 rounded-xl text-[11px] text-slate-500 bg-white/5">
                  Recommencer
                </button>
              </div>
            ) : (
              <button onClick={handleActivatePremium}
                className="w-full py-3.5 rounded-xl bg-amber-500 text-slate-900 text-[12px] font-bold active:scale-[0.98] transition-all">
                S'abonner Premium — {premiumPrice.toLocaleString('fr-FR')} FCFA/mois
              </button>
            )}
          </div>
        </div>

        {/* Note explicative */}
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-slate-500 mb-2">Comment ca marche ?</p>
          <div className="space-y-2 text-[11px] text-slate-500">
            <p><span className="font-semibold text-blue-500">Verifie</span> — Badge de confiance uniquement. Prouve aux acheteurs que votre identite a ete verifiee par Brumerie. Criteres + documents + 5 000 FCFA/an.</p>
            <p><span className="font-semibold text-amber-500">Premium</span> — Abonnement vendeur pro. Acces a tous les outils avances (produits illimites, compta, catalogue, stats). 3 000 FCFA/mois.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
