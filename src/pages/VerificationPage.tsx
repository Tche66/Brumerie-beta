import React, { useState, useEffect } from 'react';
import { ChevronLeft, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getGlobalSettings } from '@/services/adminService';
import { SUPPORT_WHATSAPP } from '@/types';
import { getAppConfig } from '@/services/appConfigService';

interface VerificationPageProps { onBack: () => void; }

interface PremiumPack {
  id: string;
  months: number;
  label: string;
  pricePerMonth: number;
  totalPrice: number;
  savings: number;
  popular?: boolean;
  best?: boolean;
}

export function VerificationPage({ onBack }: VerificationPageProps) {
  const { userProfile } = useAuth();
  const [sentVerif, setSentVerif] = useState(false);
  const [sentPremium, setSentPremium] = useState(false);
  const [selectedPack, setSelectedPack] = useState<string>('6months');

  const [verificationPrice, setVerificationPrice] = useState(5000);
  const [baseMonthlyPrice, setBaseMonthlyPrice] = useState(3000);

  useEffect(() => {
    getGlobalSettings().then((s: any) => {
      if (s?.verificationPrice) setVerificationPrice(s.verificationPrice);
      if (s?.premiumPrice) setBaseMonthlyPrice(s.premiumPrice);
    }).catch(() => {});
  }, []);

  const isVerified = !!userProfile?.isVerified;
  const isPremium = !!userProfile?.isPremium;

  const PACKS: PremiumPack[] = [
    { id: '1month',   months: 1,  label: '1 mois',  pricePerMonth: baseMonthlyPrice, totalPrice: baseMonthlyPrice, savings: 0 },
    { id: '3months',  months: 3,  label: '3 mois',  pricePerMonth: Math.round(baseMonthlyPrice * 0.83), totalPrice: Math.round(baseMonthlyPrice * 0.83 * 3), savings: 17 },
    { id: '6months',  months: 6,  label: '6 mois',  pricePerMonth: Math.round(baseMonthlyPrice * 0.67), totalPrice: Math.round(baseMonthlyPrice * 0.67 * 6), savings: 33, popular: true },
    { id: '12months', months: 12, label: '1 an',    pricePerMonth: Math.round(baseMonthlyPrice * 0.50), totalPrice: Math.round(baseMonthlyPrice * 0.50 * 12), savings: 50, best: true },
  ];

  const activePack = PACKS.find(p => p.id === selectedPack) || PACKS[2];

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
  const positiveReviews = (userProfile as any)?.positiveReviewCount || 0;
  const isEligible = memberSinceMonths >= 6 && completedSales >= 5 && positiveReviews >= 3;

  const criteria = [
    { label: '6 mois sur Brumerie', met: memberSinceMonths >= 6, detail: `${memberSinceMonths} mois` },
    { label: '5 ventes completees', met: completedSales >= 5, detail: `${completedSales}/5` },
    { label: '3 avis positifs (4+)', met: positiveReviews >= 3, detail: `${positiveReviews}/3` },
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
    const msg = `Bonjour Brumerie !\n\nJe viens de payer le Pack Premium "${activePack.label}" (${activePack.totalPrice.toLocaleString('fr-FR')} FCFA).\n\nVoici ma preuve de paiement en photo.\n\nNom : ${userProfile.name}\nEmail : ${userProfile.email || ''}\nUID : ${userProfile.uid}`;
    window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg), '_blank');
  };

  const FEATURES_PREMIUM = [
    'Produits illimites (au lieu de 5)',
    'Messagerie illimitee',
    'Comptabilite et suivi des ventes',
    'Carnet clients complet',
    'Catalogue produits organise',
    'Calculateur de marge',
    'Rapport et suivi des dettes',
    'Personnalisation boutique (slogan, couleurs, vente flash)',
    'Visibilite boostee dans les resultats',
  ];

  return (
    <div className="min-h-screen pb-20 bg-slate-50">

      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-4">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 active:scale-90 transition-all">
          <ChevronLeft size={18} className="text-slate-600" />
        </button>
        <h1 className="font-bold text-[15px] text-slate-900">Badges & Abonnements</h1>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* ══ BADGE VERIFIE ══════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* En-tete */}
          <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-50">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D9BF0" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-slate-900">Badge Verifie</p>
              <p className="text-[11px] text-slate-400">Vendeur de confiance verifie par Brumerie</p>
            </div>
            {isVerified && (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[9px] font-bold text-blue-600 border border-blue-100">Actif</span>
            )}
          </div>

          <div className="px-5 py-4">
            {isVerified ? (
              <div className="text-center py-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-2">
                  <Check size={20} className="text-blue-500"/>
                </div>
                <p className="text-[13px] font-semibold text-slate-700">Votre identite est verifiee</p>
                <p className="text-[11px] text-slate-400 mt-1">Les acheteurs voient que vous etes un vendeur fiable</p>
              </div>
            ) : (
              <>
                {/* Criteres */}
                <div className="space-y-2 mb-4">
                  {criteria.map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${c.met ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}>
                        {c.met ? <Check size={10} className="text-green-600"/> : <X size={10} className="text-slate-300"/>}
                      </div>
                      <p className={`text-[11px] flex-1 ${c.met ? 'text-slate-700' : 'text-slate-400'}`}>{c.label}</p>
                      <span className={`text-[10px] font-medium ${c.met ? 'text-green-600' : 'text-slate-300'}`}>{c.detail}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50/50 rounded-xl p-3 mb-4 border border-blue-100/50">
                  <p className="text-[11px] text-blue-700 font-medium text-center">
                    Activation : {verificationPrice.toLocaleString('fr-FR')} FCFA/an apres validation des documents
                  </p>
                </div>

                {/* CTA */}
                {sentVerif ? (
                  <div className="space-y-2.5">
                    <div className="rounded-xl py-3 px-4 text-center bg-green-50 border border-green-200">
                      <p className="text-[12px] font-semibold text-green-700">Demande envoyee</p>
                      <p className="text-[10px] text-green-600 mt-0.5">Envoyez vos documents sur WhatsApp</p>
                    </div>
                    <button onClick={handlePayVerification}
                      className="w-full py-3 rounded-xl bg-blue-500 text-white text-[12px] font-semibold active:scale-[0.98] transition-all">
                      Payer {verificationPrice.toLocaleString('fr-FR')} FCFA
                    </button>
                  </div>
                ) : !isEligible ? (
                  <div className="rounded-xl py-3 px-4 text-center bg-slate-50 border border-slate-200">
                    <p className="text-[11px] text-slate-500">Criteres non remplis — continuez a vendre</p>
                  </div>
                ) : (
                  <button onClick={handleRequestVerification}
                    className="w-full py-3 rounded-xl bg-blue-500 text-white text-[12px] font-semibold active:scale-[0.98] transition-all">
                    Demander la verification
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ══ PREMIUM — PACKS ═════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* En-tete */}
          <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-50" style={{ background: 'linear-gradient(135deg, #1a1a1a, #292524)' }}>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white">Premium</p>
              <p className="text-[11px] text-slate-400">Tous les outils pour vendre comme un pro</p>
            </div>
            {isPremium && (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-bold text-amber-900 bg-amber-400">Actif</span>
            )}
          </div>

          <div className="px-5 py-4">
            {isPremium ? (
              <div className="text-center py-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <p className="text-[13px] font-semibold text-slate-700">Abonnement Premium actif</p>
                <p className="text-[11px] text-slate-400 mt-1">Vous avez acces a tous les outils pro</p>
              </div>
            ) : (
              <>
                {/* Avantages */}
                <div className="grid grid-cols-1 gap-1.5 mb-5">
                  {FEATURES_PREMIUM.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={11} className="text-amber-500 flex-shrink-0"/>
                      <p className="text-[11px] text-slate-600">{f}</p>
                    </div>
                  ))}
                </div>

                {/* Packs de prix */}
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Choisissez votre pack</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {PACKS.map(pack => (
                    <button
                      key={pack.id}
                      onClick={() => setSelectedPack(pack.id)}
                      className={`relative rounded-xl p-3 text-left transition-all active:scale-[0.97] ${
                        selectedPack === pack.id
                          ? 'border-2 border-amber-400 bg-amber-50/50 shadow-sm'
                          : 'border border-slate-200 bg-white'
                      }`}>
                      {pack.popular && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-[7px] font-bold text-slate-900 uppercase whitespace-nowrap">
                          Populaire
                        </span>
                      )}
                      {pack.best && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-green-500 text-[7px] font-bold text-white uppercase whitespace-nowrap">
                          Meilleur prix
                        </span>
                      )}
                      <p className="text-[12px] font-bold text-slate-900">{pack.label}</p>
                      <p className="text-[14px] font-bold text-amber-600 mt-0.5">
                        {pack.pricePerMonth.toLocaleString('fr-FR')} <span className="text-[10px] font-medium text-slate-400">FCFA/mois</span>
                      </p>
                      {pack.savings > 0 && (
                        <p className="text-[9px] font-bold text-green-600 mt-0.5">-{pack.savings}% d'economie</p>
                      )}
                      <p className="text-[9px] text-slate-400 mt-1">
                        Total : {pack.totalPrice.toLocaleString('fr-FR')} FCFA
                      </p>
                    </button>
                  ))}
                </div>

                {/* Resume du pack selectionne */}
                <div className="bg-slate-900 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-medium">Pack selectionne</p>
                      <p className="text-[15px] font-bold text-white mt-0.5">{activePack.label} Premium</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-bold text-amber-400">{activePack.totalPrice.toLocaleString('fr-FR')}</p>
                      <p className="text-[10px] text-slate-500">FCFA</p>
                    </div>
                  </div>
                  {activePack.savings > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-[9px] font-bold text-green-400">
                        Vous economisez {(baseMonthlyPrice * activePack.months - activePack.totalPrice).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                {sentPremium ? (
                  <div className="space-y-2.5">
                    <div className="rounded-xl py-3 px-4 text-center bg-amber-50 border border-amber-200">
                      <p className="text-[12px] font-semibold text-amber-700">Paiement lance !</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">Envoyez votre preuve de paiement</p>
                    </div>
                    <button onClick={handleSendProofPremium}
                      className="w-full py-3.5 rounded-xl bg-amber-500 text-slate-900 text-[12px] font-bold active:scale-[0.98] transition-all">
                      Envoyer la preuve de paiement
                    </button>
                    <button onClick={() => setSentPremium(false)}
                      className="w-full py-2.5 rounded-xl text-[11px] text-slate-400 bg-slate-50">
                      Recommencer
                    </button>
                  </div>
                ) : (
                  <button onClick={handleActivatePremium}
                    className="w-full py-3.5 rounded-xl bg-amber-500 text-slate-900 text-[12px] font-bold active:scale-[0.98] transition-all shadow-sm shadow-amber-200">
                    S'abonner — {activePack.totalPrice.toLocaleString('fr-FR')} FCFA
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Note */}
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-blue-500">Verifie</span> = badge de confiance (votre identite est controlee). <span className="font-semibold text-amber-500">Premium</span> = outils pro pour vendre plus. Les deux sont independants.
          </p>
        </div>

      </div>
    </div>
  );
}
