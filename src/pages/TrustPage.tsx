// src/pages/TrustPage.tsx
// ── Page Communauté de Confiance Brumerie ─────────────────
// Accessible depuis Paramètres > "Signaler un arnaqueur"
// Affiche : score de l'utilisateur courant + formulaire de signalement
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTrustScore, getReportsForUser, getRiskUsers,
  TrustScore, TrustReport,
  RISK_LABELS, REPORT_REASONS,
} from '@/services/trustService';
import { RiskBadge } from '@/components/RiskBadge';
import { ReportUserModal } from '@/components/ReportUserModal';

interface TrustPageProps {
  onBack: () => void;
}

export function TrustPage({ onBack }: TrustPageProps) {
  const { userProfile } = useAuth();
  const [tab, setTab] = useState<'community' | 'my_score' | 'report'>('community');
  const [myScore, setMyScore]     = useState<TrustScore | null>(null);
  const [riskUsers, setRiskUsers] = useState<TrustScore[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    id: string; name: string; phone?: string; role: 'buyer' | 'seller' | 'livreur';
  } | null>(null);

  // Champ recherche pour signaler un utilisateur inconnu
  const [searchPhone, setSearchPhone] = useState('');

  useEffect(() => {
    if (!userProfile) return;
    Promise.all([
      getTrustScore(userProfile.id),
      getRiskUsers('watch'),
    ]).then(([score, risks]) => {
      setMyScore(score);
      setRiskUsers(risks);
      setLoading(false);
    });
  }, [userProfile]);

  const handleReportUser = (user: TrustScore) => {
    setReportTarget({
      id: user.userId,
      name: user.userName,
      phone: user.userPhone,
      role: user.userRole as 'buyer' | 'seller' | 'livreur',
    });
    setShowReportModal(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">

      {/* HEADER */}
      <div className="bg-white sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-[14px] uppercase tracking-tight text-slate-900">🛡️ Communauté de confiance</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Anti-arnaque Brumerie</p>
        </div>
        {riskUsers.filter(u => u.riskLevel === 'risk' || u.riskLevel === 'banned').length > 0 && (
          <span className="bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full">
            {riskUsers.filter(u => u.riskLevel === 'risk' || u.riskLevel === 'banned').length} signalés
          </span>
        )}
      </div>

      {/* HERO EXPLICATION */}
      <div className="mx-4 mt-4 rounded-[2rem] overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#1A1A18,#2d2d2a)' }}>
        <div className="p-5">
          <p className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] mb-2">Le réseau de confiance informel, formalisé</p>
          <p className="text-white font-black text-[15px] leading-tight mb-3">
            Les vendeurs d'Abidjan se protègent entre eux.
          </p>
          <p className="text-slate-400 text-[11px] leading-snug mb-4">
            Signale un mauvais payeur, un vendeur arnaqueur ou un faux profil. Après 3 signalements distincts, l'utilisateur est marqué automatiquement pour toute la communauté.
          </p>
          <div className="flex gap-2 flex-wrap">
            <span className="bg-white/10 text-white text-[9px] font-black px-3 py-1.5 rounded-full">🤝 Réseau communautaire</span>
            <span className="bg-white/10 text-white text-[9px] font-black px-3 py-1.5 rounded-full">⚡ Alerte automatique</span>
            <span className="bg-white/10 text-white text-[9px] font-black px-3 py-1.5 rounded-full">🕵️ Signalement anonyme</span>
          </div>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mx-4 mt-4">
        {[
          { key: 'community', label: '🛡️ Communauté' },
          { key: 'my_score',  label: '⭐ Mon score' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── TAB COMMUNAUTÉ ── */}
        {tab === 'community' && (
          <>
            {/* CTA Signaler */}
            <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-200">
                <span className="text-2xl">🚨</span>
              </div>
              <div className="flex-1">
                <p className="font-black text-red-900 text-[12px] mb-0.5">Tu as eu un problème ?</p>
                <p className="text-[10px] text-red-700">Signale ce profil pour protéger les autres membres.</p>
              </div>
              <button
                onClick={() => setTab('report')}
                className="bg-red-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl active:scale-95 flex-shrink-0">
                Signaler
              </button>
            </div>

            {/* Liste des profils à risque */}
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Profils signalés par la communauté ({riskUsers.length})
              </p>

              {riskUsers.length === 0 ? (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
                  <span className="text-3xl block mb-2">✅</span>
                  <p className="font-black text-green-800 text-[12px]">Aucun profil signalé</p>
                  <p className="text-[10px] text-green-700 mt-1">La communauté Brumerie est saine pour l'instant.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {riskUsers.map(user => {
                    const cfg = RISK_LABELS[user.riskLevel];
                    return (
                      <div key={user.userId}
                        className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl"
                          style={{ background: cfg.bg }}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-black text-slate-900 text-[12px] truncate">{user.userName}</p>
                            <RiskBadge level={user.riskLevel} size="sm" />
                          </div>
                          <p className="text-[9px] font-bold text-slate-400">
                            {user.reportCount} signalement{user.reportCount > 1 ? 's' : ''} validé{user.reportCount > 1 ? 's' : ''}
                            {user.userPhone ? ` · ${user.userPhone}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comment ça marche */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Comment ça marche</p>
              {[
                { step: '1', text: 'Un vendeur ou acheteur signale un profil problématique.', icon: '🚨' },
                { step: '2', text: "L'équipe Brumerie vérifie le signalement sous 24h.", icon: '🔍' },
                { step: '3', text: 'Dès 3 signalements distincts → marqué "À risque" automatiquement.', icon: '⚠️' },
                { step: '4', text: 'Chaque vendeur reçoit une alerte discrète quand ce profil passe commande.', icon: '🔔' },
              ].map(item => (
                <div key={item.step} className="flex gap-3 mb-3 last:mb-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {item.step}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <p className="text-[11px] text-slate-600 leading-snug">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── TAB MON SCORE ── */}
        {tab === 'my_score' && (
          <>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Ton profil de confiance</p>

              {/* Score visuel */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: RISK_LABELS[(myScore?.riskLevel || 'safe')].bg }}>
                  {RISK_LABELS[(myScore?.riskLevel || 'safe')].icon}
                </div>
                <div>
                  <p className="font-black text-[22px] text-slate-900 leading-none mb-1">
                    {RISK_LABELS[(myScore?.riskLevel || 'safe')].label}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {myScore?.reportCount || 0} signalement{(myScore?.reportCount || 0) > 1 ? 's' : ''} reçu{(myScore?.reportCount || 0) > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="mb-4">
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  <span>Fiable</span><span>Surveillance</span><span>À risque</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((myScore?.reportCount || 0) / 5) * 100)}%`,
                      background: (myScore?.riskLevel === 'safe') ? '#16A34A'
                        : (myScore?.riskLevel === 'watch') ? '#D97706' : '#DC2626',
                    }} />
                </div>
              </div>

              {(myScore?.riskLevel === 'safe' || !myScore) && (
                <p className="text-[11px] text-green-700 font-black bg-green-50 rounded-xl px-4 py-3">
                  ✅ Ton profil est en bonne santé. Continue comme ça !
                </p>
              )}
              {myScore?.riskLevel === 'watch' && (
                <p className="text-[11px] text-amber-700 font-black bg-amber-50 rounded-xl px-4 py-3">
                  👁️ Ton profil est sous surveillance. Contacte le support Brumerie si tu penses que des signalements sont injustifiés.
                </p>
              )}
            </div>

            {/* Conseils */}
            <div className="bg-slate-900 rounded-2xl p-5">
              <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-3">Conseils pour maintenir un bon score</p>
              {[
                'Toujours livrer ce qui est annoncé dans les photos',
                'Confirmer le paiement avant de livrer',
                'Répondre rapidement aux messages des clients',
                'Signaler immédiatement tout problème dans les commandes',
              ].map((tip, i) => (
                <div key={i} className="flex gap-2 mb-2 last:mb-0">
                  <span className="text-green-400 font-black text-[11px] flex-shrink-0">→</span>
                  <p className="text-[11px] text-slate-300 leading-snug">{tip}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── TAB SIGNALER ── */}
        {tab === 'report' && (
          <>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div>
                <p className="font-black text-amber-900 text-[11px] mb-1">Signalement manuel</p>
                <p className="text-[10px] text-amber-700 leading-snug">
                  Si tu n'as pas de commande liée, tu peux signaler directement un profil par numéro de téléphone. Le signalement reste toujours anonyme.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Signaler par numéro</p>
              <div className="flex gap-2">
                <input
                  value={searchPhone}
                  onChange={e => setSearchPhone(e.target.value)}
                  placeholder="+225 07 XX XX XX XX"
                  className="flex-1 px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-red-400 transition-all"
                />
                <button
                  disabled={searchPhone.length < 8}
                  onClick={() => {
                    setReportTarget({ id: searchPhone, name: searchPhone, phone: searchPhone, role: 'buyer' });
                    setShowReportModal(true);
                  }}
                  className="px-4 py-3.5 rounded-xl bg-red-600 text-white font-black text-[11px] uppercase active:scale-95 disabled:opacity-40 flex-shrink-0">
                  Signaler
                </button>
              </div>
              <p className="text-[9px] text-slate-400 mt-2">
                💡 Préfère signaler depuis une commande — c'est plus précis et plus fiable.
              </p>
            </div>

            <p className="text-center text-[9px] text-slate-400 font-bold leading-snug px-4">
              Les faux signalements malveillants entraînent la suspension permanente du compte.
            </p>
          </>
        )}
      </div>

      {/* MODAL SIGNALEMENT */}
      {showReportModal && reportTarget && (
        <ReportUserModal
          reportedId={reportTarget.id}
          reportedName={reportTarget.name}
          reportedPhone={reportTarget.phone}
          reportedRole={reportTarget.role}
          onClose={() => { setShowReportModal(false); setReportTarget(null); setTab('community'); }}
        />
      )}
    </div>
  );
}
