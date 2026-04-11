// src/pages/ReferralPage.tsx — v2 Brumerie
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ensureReferralCode, buildReferralLink, getReferralStats, recalculateReferralCount } from '@/services/referralService';
import { REFERRAL_REWARDS } from '@/types';

interface ReferralPageProps { onBack: () => void; }

const TIER_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  starter:    { bg: 'bg-emerald-50',  text: 'text-emerald-800', border: 'border-emerald-200', badge: 'bg-emerald-500' },
  active:     { bg: 'bg-blue-50',     text: 'text-blue-800',    border: 'border-blue-200',    badge: 'bg-blue-500' },
  influencer: { bg: 'bg-orange-50',   text: 'text-orange-800',  border: 'border-orange-200',  badge: 'bg-orange-500' },
  champion:   { bg: 'bg-purple-50',   text: 'text-purple-800',  border: 'border-purple-200',  badge: 'bg-purple-600' },
  legend:     { bg: 'bg-amber-50',    text: 'text-amber-800',   border: 'border-amber-200',   badge: 'bg-amber-500' },
  ambassador: { bg: 'bg-slate-900',   text: 'text-white',       border: 'border-slate-700',   badge: 'bg-white' },
};

export function ReferralPage({ onBack }: ReferralPageProps) {
  const { currentUser, userProfile } = useAuth();
  const [code, setCode]           = useState('');
  const [count, setCount]         = useState(0);
  const [bonusPub, setBonusPub]   = useState(0);
  const [bonusChat, setBonusChat] = useState(0);
  const [freeVerif, setFreeVerif] = useState<Date | null>(null);
  const [copied, setCopied]       = useState(false);
  const [loading, setLoading]     = useState(true);
  const [expandedTier, setExpandedTier] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser || !userProfile) return;
    (async () => {
      const c = await ensureReferralCode(currentUser.uid, userProfile.name);
      setCode(c);
      const realCount = await recalculateReferralCount(currentUser.uid);
      setCount(realCount);
      const stats = await getReferralStats(currentUser.uid);
      if (stats) {
        setBonusPub(stats.bonusPublications);
        setBonusChat(stats.bonusChats);
        if (stats.freeVerifiedUntil?.toDate) setFreeVerif(stats.freeVerifiedUntil.toDate());
      }
      setLoading(false);
    })();
  }, [currentUser?.uid]);

  const referralLink = code ? buildReferralLink(code) : '';

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Rejoins Brumerie 🛍️',
        text: `Hey ! Je vends et j'achète sur Brumerie — le commerce local de quartier en Côte d'Ivoire.\nUtilise mon code ${code} à l'inscription et rejoins la communauté !\n`,
        url: referralLink,
      });
    } else {
      handleCopy(referralLink);
    }
  };

  const nextReward  = REFERRAL_REWARDS.find(r => r.threshold > count);
  const currentTier = [...REFERRAL_REWARDS].reverse().find(r => r.threshold <= count);
  const progressPct = nextReward
    ? Math.min(Math.round((count / nextReward.threshold) * 100), 100)
    : 100;

  // Conditions strictes d'influence — un filleul compte seulement s'il a publié au moins 1 article
  const STRICT_NOTE = 'Seuls les filleuls ayant publié au moins 1 article sont comptabilisés.';

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">

      {/* Header */}
      <div className="bg-white sticky top-0 z-50 px-5 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 active:scale-90 transition-all">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-[11px] uppercase tracking-widest text-slate-900">Programme Ambassadeur</h1>
          <p className="text-[9px] text-slate-400 font-bold">Invite · Grandis · Gagne</p>
        </div>
        {currentTier && (
          <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase ${TIER_COLORS[currentTier.tier]?.badge} text-white`}>
            {currentTier.emoji} {currentTier.tier}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-100 border-t-green-600 rounded-full animate-spin"/>
        </div>
      ) : (
        <div className="px-4 pt-5 space-y-4">

          {/* Hero — stats */}
          <div className="rounded-[2rem] p-6 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#16A34A 0%,#0f5c2e 100%)' }}>
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10"/>
            <div className="absolute right-10 bottom-0 w-20 h-20 rounded-full bg-white/5"/>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-green-200 mb-3">Ton impact</p>
            <div className="flex items-end gap-6 mb-4">
              <div>
                <p className="font-black text-5xl text-white leading-none">{count}</p>
                <p className="text-[10px] uppercase font-black text-green-200 mt-1">filleuls actifs</p>
              </div>
              {currentTier && (
                <div className="bg-white/15 rounded-2xl px-4 py-2 backdrop-blur-sm">
                  <p className="font-black text-[13px]">{currentTier.emoji} {currentTier.label}</p>
                  <p className="text-[9px] text-green-200 font-bold">Statut actuel</p>
                </div>
              )}
            </div>

            {/* Avantages actifs */}
            {(bonusPub > 0 || bonusChat > 0 || freeVerif) && (
              <div className="flex gap-2 flex-wrap">
                {bonusPub > 0 && (
                  <span className="bg-white/20 text-white text-[9px] font-black px-2.5 py-1 rounded-xl">
                    📦 +{bonusPub} pub./mois
                  </span>
                )}
                {bonusChat > 0 && (
                  <span className="bg-white/20 text-white text-[9px] font-black px-2.5 py-1 rounded-xl">
                    💬 +{bonusChat === 999 ? '∞' : bonusChat} chats/jour
                  </span>
                )}
                {freeVerif && (
                  <span className="bg-white/20 text-white text-[9px] font-black px-2.5 py-1 rounded-xl">
                    🏅 Badge jusqu'au {freeVerif.toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            )}

            {/* Note stricte */}
            <p className="text-[8px] text-green-200/70 mt-3 italic">{STRICT_NOTE}</p>
          </div>

          {/* Progression vers prochain palier */}
          {nextReward && (
            <div className="bg-white rounded-[1.75rem] p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-black text-slate-900 text-[12px]">Prochain : {nextReward.label}</p>
                  <p className="text-[10px] text-green-600 font-bold mt-0.5">{nextReward.description}</p>
                </div>
                <span className="text-[11px] font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl">
                  {nextReward.threshold - count} restants
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden mt-3">
                <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                  style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#16A34A,#4ade80)' }}>
                  <div className="absolute inset-0 bg-white/20 animate-pulse"/>
                </div>
              </div>
              <div className="flex justify-between mt-1.5">
                <p className="text-[9px] text-slate-400 font-bold">{count} filleuls</p>
                <p className="text-[9px] text-slate-400 font-bold">{nextReward.threshold} requis</p>
              </div>
            </div>
          )}

          {/* Lien + partage */}
          <div className="bg-white rounded-[1.75rem] p-5 border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Ton invitation</p>

            {/* Code */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border-2 border-dashed border-slate-200 mb-3">
              <span className="text-[9px] font-black text-slate-400 uppercase">Code</span>
              <p className="font-black text-lg text-slate-900 tracking-[0.2em] flex-1">{code}</p>
              <button onClick={() => handleCopy(code)}
                className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 ${copied ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'}`}>
                {copied ? '✓' : 'Copier'}
              </button>
            </div>

            {/* Lien */}
            <div className="bg-slate-50 rounded-2xl px-4 py-2.5 mb-3">
              <p className="text-[9px] text-slate-400 font-mono break-all">{referralLink}</p>
            </div>

            {/* Boutons */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleCopy(referralLink)}
                className={`py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${copied ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white'}`}>
                {copied ? '✓ Copié !' : '🔗 Copier lien'}
              </button>
              <button onClick={handleShare}
                className="py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-green-600 text-white active:scale-95 transition-all flex items-center justify-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Partager
              </button>
            </div>

            {/* WhatsApp direct */}
            <a href={`https://wa.me/?text=${encodeURIComponent(`🛍️ Rejoins-moi sur Brumerie — le commerce local de quartier en Côte d'Ivoire !\n\nUtilise mon code *${code}* à l'inscription pour démarrer.\n\n👉 ${referralLink}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-2 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-[#25D366] text-white active:scale-95 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Envoyer sur WhatsApp
            </a>
          </div>

          {/* Paliers */}
          <div className="bg-white rounded-[1.75rem] p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Paliers & Récompenses</p>
              <span className="text-[8px] bg-red-50 text-red-600 font-black px-2 py-1 rounded-full uppercase">Strict</span>
            </div>
            <div className="space-y-2">
              {REFERRAL_REWARDS.map((reward, i) => {
                const unlocked  = count >= reward.threshold;
                const isCurrent = currentTier?.threshold === reward.threshold;
                const isNext    = nextReward?.threshold === reward.threshold;
                const c = TIER_COLORS[reward.tier] || TIER_COLORS.starter;
                const expanded  = expandedTier === i;

                return (
                  <div key={i}
                    className={`rounded-2xl border-2 overflow-hidden transition-all ${
                      unlocked ? c.border + ' ' + c.bg
                      : isNext  ? 'border-slate-300 bg-slate-50 border-dashed'
                      : 'border-slate-100 bg-slate-50 opacity-60'
                    }`}>
                    <button
                      className="w-full flex items-center gap-3 p-4 text-left"
                      onClick={() => setExpandedTier(expanded ? null : i)}>
                      {/* Indicateur */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        unlocked ? c.badge : 'bg-slate-200'
                      }`}>
                        {unlocked ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <span className="font-black text-[11px] text-slate-400">{reward.threshold}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-black text-[12px] ${unlocked ? c.text : 'text-slate-500'}`}>
                            {reward.label}
                          </p>
                          {isCurrent && <span className="text-[8px] bg-green-600 text-white px-2 py-0.5 rounded-full font-black">ACTUEL</span>}
                          {isNext && !unlocked && <span className="text-[8px] bg-slate-700 text-white px-2 py-0.5 rounded-full font-black">PROCHAIN</span>}
                        </div>
                        <p className={`text-[10px] font-bold truncate ${unlocked ? c.text : 'text-slate-400'}`}>
                          {reward.description}
                        </p>
                      </div>

                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"
                        style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {/* Détail expandable */}
                    {expanded && (
                      <div className={`px-4 pb-4 pt-0 border-t ${unlocked ? c.border : 'border-slate-100'}`}>
                        <p className={`text-[11px] font-medium leading-relaxed ${unlocked ? c.text : 'text-slate-500'}`}>
                          {reward.detail}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {reward.extraPublications > 0 && (
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${unlocked ? 'bg-white/50' : 'bg-slate-100 text-slate-500'}`}>
                              📦 +{reward.extraPublications === 999 ? '∞' : reward.extraPublications} publications
                            </span>
                          )}
                          {reward.extraChats > 0 && (
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${unlocked ? 'bg-white/50' : 'bg-slate-100 text-slate-500'}`}>
                              💬 +{reward.extraChats === 999 ? '∞' : reward.extraChats} chats/jour
                            </span>
                          )}
                          {reward.freeVerifiedDays > 0 && (
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${unlocked ? 'bg-white/50' : 'bg-slate-100 text-slate-500'}`}>
                              🏅 Badge {reward.freeVerifiedDays}j offert
                            </span>
                          )}
                          {reward.boostCredit > 0 && (
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${unlocked ? 'bg-white/50' : 'bg-slate-100 text-slate-500'}`}>
                              🚀 {reward.boostCredit} boost{reward.boostCredit > 1 ? 's' : ''} offert{reward.boostCredit > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Règles strictes */}
          <div className="bg-slate-900 rounded-[1.75rem] p-5 text-white">
            <p className="font-black text-[10px] uppercase tracking-widest mb-1 text-red-400">⚠️ Conditions strictes</p>
            <p className="text-[9px] text-slate-400 mb-4">Pour éviter les abus et protéger la qualité de la communauté.</p>
            <div className="space-y-3">
              {[
                { icon: '✅', text: 'Un filleul est comptabilisé uniquement s\'il a publié au moins 1 article actif.' },
                { icon: '🚫', text: 'Les faux comptes et auto-parrainages entraînent une exclusion définitive du programme.' },
                { icon: '🔒', text: 'Les récompenses sont attribuées automatiquement après vérification — aucun recours possible.' },
                { icon: '📊', text: 'Brumerie se réserve le droit de modifier les paliers avec un préavis de 7 jours.' },
                { icon: '🎯', text: 'Le statut Ambassadeur (100 invités) donne accès à des avantages exclusifs non communiqués publiquement.' },
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5">{rule.icon}</span>
                  <p className="text-[10px] font-medium text-slate-300 leading-relaxed">{rule.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Comment ça marche */}
          <div className="bg-white rounded-[1.75rem] p-5 border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Comment ça marche</p>
            <div className="space-y-4">
              {[
                { n: '1', icon: '🔗', text: 'Partage ton lien unique ou ton code à tes contacts.' },
                { n: '2', icon: '📝', text: 'Ils s\'inscrivent sur brumerie.com et entrent ton code.' },
                { n: '3', icon: '📦', text: 'Dès qu\'ils publient leur premier article, tu es crédité.' },
                { n: '4', icon: '🎁', text: 'Tes avantages s\'activent automatiquement selon ton palier.' },
              ].map(step => (
                <div key={step.n} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-50 border-2 border-green-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-base">{step.icon}</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed flex-1">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
