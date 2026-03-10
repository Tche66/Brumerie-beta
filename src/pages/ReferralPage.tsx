// src/pages/ReferralPage.tsx — Page parrainage Brumerie
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ensureReferralCode, buildReferralLink, getReferralStats, recalculateReferralCount } from '@/services/referralService';
import { REFERRAL_REWARDS } from '@/types';

interface ReferralPageProps { onBack: () => void; }

export function ReferralPage({ onBack }: ReferralPageProps) {
  const { currentUser, userProfile } = useAuth();
  const [code, setCode]         = useState('');
  const [count, setCount]       = useState(0);
  const [bonusPub, setBonusPub] = useState(0);
  const [bonusChat, setBonusChat] = useState(0);
  const [freeVerif, setFreeVerif] = useState<Date | null>(null);
  const [copied, setCopied]     = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!currentUser || !userProfile) return;
    (async () => {
      const c = await ensureReferralCode(currentUser.uid, userProfile.name);
      setCode(c);
      // Recalculer le vrai nombre depuis Firestore (évite les bugs de règles)
      const realCount = await recalculateReferralCount(currentUser.uid);
      setCount(realCount);
      // Récupérer les autres stats
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
    try { await navigator.clipboard.writeText(text); }
    catch { /* fallback */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Prochain palier
  const nextReward = REFERRAL_REWARDS.find(r => r.threshold > count);
  const topReward  = [...REFERRAL_REWARDS].reverse().find(r => r.threshold <= count);

  const progressPct = nextReward
    ? Math.round((count / nextReward.threshold) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">

      {/* Header */}
      <div className="bg-white sticky top-0 z-50 px-6 py-5 flex items-center gap-4 border-b border-slate-100 shadow-sm">
        <button onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <h1 className="font-black text-xs uppercase tracking-widest text-slate-900">Parrainage</h1>
          <p className="text-[9px] text-slate-400 font-bold">Invite & débloque des avantages</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-100 border-t-green-600 rounded-full animate-spin"/>
        </div>
      ) : (
        <div className="px-4 pt-6 space-y-5">

          {/* Hero card */}
          <div className="rounded-3xl p-6 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#16A34A 0%,#115E2E 100%)' }}>
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10"/>
            <div className="absolute right-16 bottom-2 w-16 h-16 rounded-full bg-white/5"/>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                  <path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-green-200">Ton programme</p>
                <p className="font-black text-xl text-white leading-tight">Parrainage</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="font-black text-4xl text-white">{count}</p>
                <p className="text-[9px] uppercase font-bold text-green-200">invités rejoints</p>
              </div>
              {(bonusPub > 0 || bonusChat > 0) && (
                <div className="flex gap-2 flex-wrap">
                  {bonusPub > 0 && (
                    <span className="bg-white/20 text-white text-[9px] font-black px-2 py-1 rounded-xl">
                      +{bonusPub} pub./mois
                    </span>
                  )}
                  {bonusChat > 0 && (
                    <span className="bg-white/20 text-white text-[9px] font-black px-2 py-1 rounded-xl">
                      +{bonusChat} chat/jour
                    </span>
                  )}
                </div>
              )}
            </div>
            {freeVerif && (
              <div className="mt-3 bg-white/15 rounded-2xl px-3 py-2">
                <p className="text-[10px] font-black text-white">
                  🏅 Badge Vérifié offert jusqu'au {freeVerif.toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}
          </div>

          {/* Progression vers le prochain palier */}
          {nextReward && (
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="font-black text-slate-900 text-[12px]">Prochain palier</p>
                <span className="text-[9px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-xl">
                  {nextReward.threshold - count} restants
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#16A34A,#22C55E)' }}/>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[9px] text-slate-400 font-bold">{count}/{nextReward.threshold} invités</p>
                <p className="text-[9px] text-green-600 font-black">{nextReward.description}</p>
              </div>
            </div>
          )}

          {/* Code parrainage */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Ton code unique</p>
            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-4 border-2 border-dashed border-slate-200">
              <p className="font-black text-2xl text-slate-900 tracking-[0.2em] flex-1">{code}</p>
              <button onClick={() => handleCopy(code)}
                className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                  copied ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'
                }`}>
                {copied ? '✓ Copié' : 'Copier'}
              </button>
            </div>
          </div>

          {/* Lien de parrainage */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Ton lien d'invitation</p>
            <div className="bg-slate-50 rounded-2xl px-4 py-3 mb-3">
              <p className="text-[10px] text-slate-500 font-mono break-all">{referralLink}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleCopy(referralLink)}
                className={`flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white'
                }`}>
                {copied ? '✓ Copié !' : 'Copier le lien'}
              </button>
              {navigator.share && (
                <button
                  onClick={() => navigator.share({
                    title: 'Rejoins Brumerie',
                    text: `Rejoins-moi sur Brumerie — le marché de quartier à Abidjan ! Utilise mon code ${code} à l'inscription.`,
                    url: referralLink,
                  })}
                  className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-green-600 text-white active:scale-95 transition-all flex items-center justify-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  Partager
                </button>
              )}
            </div>
          </div>

          {/* Paliers de récompenses */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Récompenses</p>
            <div className="space-y-3">
              {REFERRAL_REWARDS.map((reward, i) => {
                const unlocked = count >= reward.threshold;
                return (
                  <div key={i}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      unlocked ? 'border-green-200 bg-green-50' : 'border-slate-100 bg-slate-50'
                    }`}>
                    {/* Indicateur */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      unlocked ? 'bg-green-600' : 'bg-slate-200'
                    }`}>
                      {unlocked ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <span className="font-black text-[11px] text-slate-400">{reward.threshold}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`font-black text-[12px] ${unlocked ? 'text-green-800' : 'text-slate-500'}`}>
                          {reward.label}
                        </p>
                        {unlocked && (
                          <span className="text-[8px] bg-green-600 text-white px-2 py-0.5 rounded-full font-black uppercase">Débloqué</span>
                        )}
                      </div>
                      <p className={`text-[10px] font-bold ${unlocked ? 'text-green-700' : 'text-slate-400'}`}>
                        {reward.description}
                        {reward.freeVerified && ' 🏅'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comment ça marche */}
          <div className="bg-slate-900 rounded-3xl p-5 text-white">
            <p className="font-black text-[11px] uppercase tracking-widest mb-4 opacity-70">Comment ça marche</p>
            <div className="space-y-4">
              {[
                { n: '1', text: 'Partage ton lien ou ton code à tes amis' },
                { n: '2', text: "Ils s'inscrivent et entrent ton code à l'inscription" },
                { n: '3', text: 'Dès qu\'ils sont actifs, tu débloques des avantages automatiquement' },
              ].map(step => (
                <div key={step.n} className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="font-black text-[10px]">{step.n}</span>
                  </div>
                  <p className="text-[11px] font-bold opacity-80 leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
