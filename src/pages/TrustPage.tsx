// src/pages/TrustPage.tsx — v2
// Fix : try/catch Firestore, imports nettoyés, signalement vendeur + acheteur
import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTrustScore, getRiskUsers,
  TrustScore, RISK_LABELS,
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
  const [loadError, setLoadError] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    id: string; name: string; phone?: string; role: 'buyer' | 'seller' | 'livreur';
  } | null>(null);

  // Signalement manuel
  const [searchPhone, setSearchPhone]   = useState('');
  const [searchName, setSearchName]     = useState('');
  const [targetRole, setTargetRole] = useState<'buyer' | 'seller' | 'livreur'>('buyer');

  useEffect(() => {
    if (!userProfile) { setLoading(false); return; }
    const load = async () => {
      try {
        const [score, risks] = await Promise.all([
          getTrustScore(userProfile.id).catch(() => null),
          getRiskUsers('watch').catch(() => []),
        ]);
        setMyScore(score);
        setRiskUsers(risks);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userProfile]);

  if (!userProfile) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <p className="text-slate-400 font-bold text-[12px]">Connecte-toi pour accéder à cette page.</p>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-green-200 border-t-green-600 rounded-full animate-spin" />
        <p className="text-[11px] font-bold text-slate-400">Chargement...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24 font-sans">

      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700">
        <button onClick={onBack} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center active:scale-95 transition-transform">
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Communaute de confiance</h1>
          <p className="text-xs text-gray-500">Anti-arnaque Brumerie</p>
        </div>
        {riskUsers.filter(u => u.riskLevel === 'risk' || u.riskLevel === 'banned').length > 0 && (
          <span className="bg-red-600 text-white text-xs font-medium px-2.5 py-1 rounded-full ml-auto">
            {riskUsers.filter(u => u.riskLevel === 'risk' || u.riskLevel === 'banned').length} signalés
          </span>
        )}
      </div>

      {/* HERO */}
      <div className="mx-4 mt-4 rounded-xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#1A1A18,#2d2d2a)' }}>
        <div className="p-5">
          <p className="text-xs font-medium text-amber-400 mb-2">Réseau de confiance informel, formalisé</p>
          <p className="text-white font-semibold text-[15px] leading-tight mb-3">
            Les vendeurs d'Abidjan se protègent entre eux.
          </p>
          <p className="text-slate-400 text-[11px] leading-snug mb-4">
            Signale un mauvais payeur, un vendeur arnaqueur ou un faux profil. Après 3 signalements distincts, l'utilisateur est marqué automatiquement pour toute la communauté.
          </p>
          <div className="flex gap-2 flex-wrap">
            <span className="bg-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-full">Réseau communautaire</span>
            <span className="bg-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-full">Alerte automatique</span>
            <span className="bg-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-full">Anonyme</span>
          </div>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mx-4 mt-4">
        {[
          { key: 'community', label: 'Communauté' },
          { key: 'my_score',  label: 'Mon score'  },
          { key: 'report',    label: 'Signaler'   },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
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
            {loadError && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-semibold text-amber-900 text-[11px] mb-1">Index Firestore en cours de création</p>
                  <p className="text-xs font-medium text-amber-700 leading-snug">
                    La liste des profils signalés sera disponible dans 2-3 minutes. Les signalements fonctionnent déjà.
                  </p>
                </div>
              </div>
            )}

            {/* Liste profils à risque */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-3">
                Profils signalés par la communauté ({riskUsers.length})
              </p>

              {riskUsers.length === 0 && !loadError ? (
                <div className="bg-green-50 border border-green-100 rounded-lg p-6 text-center">
                  <span className="text-3xl block mb-2">✅</span>
                  <p className="font-semibold text-green-800 text-[12px]">Aucun profil signalé</p>
                  <p className="text-xs font-medium text-green-700 mt-1">La communauté Brumerie est saine pour l'instant.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {riskUsers.map(user => {
                    const cfg = RISK_LABELS[user.riskLevel] || RISK_LABELS.safe;
                    return (
                      <div key={user.userId}
                        className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 text-xl"
                          style={{ background: cfg.bg }}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="font-semibold text-slate-900 text-[12px] truncate">{user.userName}</p>
                            <RiskBadge level={user.riskLevel} size="sm" />
                          </div>
                          <p className="text-xs font-medium text-slate-400">
                            {user.reportCount} signalement{user.reportCount > 1 ? 's' : ''} validé{user.reportCount > 1 ? 's' : ''}
                            {user.userPhone ? ` · ${user.userPhone}` : ''}
                            {' · '}{user.userRole === 'buyer' ? 'Acheteur' : user.userRole === 'seller' ? 'Vendeur' : 'Livreur'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comment ça marche */}
            <div className="bg-white rounded-lg p-5 border border-slate-100">
              <p className="text-xs font-medium text-slate-400 mb-4">Comment ça marche</p>
              {[
                { n: '1', text: 'Un vendeur ou acheteur signale un profil problématique.', icon: '🚨' },
                { n: '2', text: 'L\'équipe Brumerie vérifie le signalement sous 24h.', icon: '🔍' },
                { n: '3', text: 'Dès 3 signalements distincts → marqué "À risque" automatiquement.', icon: '⚠️' },
                { n: '4', text: 'Chaque vendeur reçoit une alerte discrète quand ce profil passe commande.', icon: '🔔' },
              ].map(item => (
                <div key={item.n} className="flex gap-3 mb-3 last:mb-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
                    {item.n}
                  </div>
                  <div className="flex items-start gap-2 pt-1">
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
            <div className="bg-white rounded-lg p-5 border border-slate-100 shadow-sm">
              <p className="text-xs font-medium text-slate-400 mb-4">Ton profil de confiance</p>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: RISK_LABELS[myScore?.riskLevel || 'safe'].bg }}>
                  {RISK_LABELS[myScore?.riskLevel || 'safe'].icon}
                </div>
                <div>
                  <p className="font-semibold text-[22px] text-slate-900 leading-none mb-1">
                    {RISK_LABELS[myScore?.riskLevel || 'safe'].label}
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    {myScore?.reportCount || 0} signalement{(myScore?.reportCount || 0) !== 1 ? 's' : ''} reçu{(myScore?.reportCount || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="mb-5">
                <div className="flex justify-between text-xs font-medium text-slate-400 mb-1.5">
                  <span>Fiable</span><span>Surveillance</span><span>À risque</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((myScore?.reportCount || 0) / 5) * 100)}%`,
                      background: !myScore || myScore.riskLevel === 'safe' ? '#16A34A'
                        : myScore.riskLevel === 'watch' ? '#D97706' : '#DC2626',
                    }} />
                </div>
              </div>

              {(!myScore || myScore.riskLevel === 'safe') && (
                <p className="text-[11px] text-green-700 font-semibold bg-green-50 rounded-lg px-4 py-3">
                  Ton profil est en bonne santé. Continue comme ça !
                </p>
              )}
              {myScore?.riskLevel === 'watch' && (
                <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 rounded-lg px-4 py-3">
                  Ton profil est sous surveillance. Contacte le support si tu penses que des signalements sont injustifiés.
                </p>
              )}
              {myScore?.riskLevel === 'risk' && (
                <p className="text-[11px] text-red-700 font-semibold bg-red-50 rounded-lg px-4 py-3">
                  Ton profil est marqué "À risque". Contacte immédiatement le support Brumerie.
                </p>
              )}
            </div>

            <div className="bg-slate-900 rounded-xl p-5">
              <p className="text-xs font-medium text-green-400 mb-3">Conseils pour un bon score</p>
              {[
                'Toujours livrer ce qui est annoncé dans les photos',
                'Confirmer le paiement avant de livrer',
                'Répondre rapidement aux messages',
                'Signaler tout problème directement dans la commande',
              ].map((tip, i) => (
                <div key={i} className="flex gap-2 mb-2 last:mb-0">
                  <span className="text-green-400 font-semibold text-[11px] flex-shrink-0 mt-0.5">→</span>
                  <p className="text-[11px] text-slate-300 leading-snug">{tip}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── TAB SIGNALER ── */}
        {tab === 'report' && (
          <>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
              <span className="text-xl flex-shrink-0">🛡️</span>
              <div>
                <p className="font-semibold text-amber-900 text-[11px] mb-1">Signalement anonyme et protégé</p>
                <p className="text-xs font-medium text-amber-700 leading-snug">
                  Tu peux signaler un client mauvais payeur, un vendeur arnaqueur ou un livreur malhonnête. Ton identité n'est pas révélée.
                </p>
              </div>
            </div>

            {/* Choix du type de profil à signaler */}
            <div className="bg-white rounded-lg p-5 border border-slate-100">
              <p className="text-xs font-medium text-slate-400 mb-3">
                Qui veux-tu signaler ?
              </p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {([
                  { role: 'buyer',   icon: '🛒', label: 'Un client',  sub: 'Mauvais payeur' },
                  { role: 'seller',  icon: '🏪', label: 'Un vendeur', sub: 'Arnaque, faux produit' },
                  { role: 'livreur', icon: '🏍️', label: 'Un livreur', sub: 'Vol, disparition' },
                ] as const).map(item => (
                  <button key={item.role}
                    onClick={() => setTargetRole(item.role)}
                    className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all active:scale-95 ${
                      targetRole === item.role
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-gray-50 dark:bg-slate-900 border-slate-100 text-slate-700'
                    }`}>
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs font-medium leading-tight text-center">{item.label}</span>
                    <span className={`text-xs font-medium text-center leading-snug px-1 ${targetRole === item.role ? 'text-red-100' : 'text-slate-400'}`}>
                      {item.sub}
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-xs font-medium text-slate-400 mb-2">
                Nom du {targetRole === 'buyer' ? 'client' : targetRole === 'seller' ? 'vendeur' : 'livreur'}
              </p>
              <input
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                placeholder={targetRole === 'buyer' ? 'Ex: Konan Koffi' : targetRole === 'seller' ? 'Ex: Adjoua Mode' : 'Ex: Moussa Express'}
                className="w-full px-4 py-3.5 rounded-lg border-2 border-slate-100 bg-gray-50 dark:bg-slate-900 text-[13px] outline-none focus:border-red-400 transition-all mb-3"
              />

              <p className="text-xs font-medium text-slate-400 mb-2">
                Numéro de téléphone (optionnel)
              </p>
              <input
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
                placeholder="+225 07 XX XX XX XX"
                className="w-full px-4 py-3.5 rounded-lg border-2 border-slate-100 bg-gray-50 dark:bg-slate-900 text-[13px] outline-none focus:border-red-400 transition-all mb-4"
              />

              <button
                disabled={searchName.trim().length < 2}
                onClick={() => {
                  setReportTarget({
                    id: searchPhone || `manual_${Date.now()}`,
                    name: searchName.trim(),
                    phone: searchPhone || undefined,
                    role: targetRole,
                  });
                  setShowReportModal(true);
                }}
                className="w-full py-4 rounded-xl font-semibold text-sm text-white shadow-sm active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#991B1B,#DC2626)' }}>
                Continuer le signalement
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 font-medium leading-snug px-4">
              Les faux signalements malveillants entraînent la suspension du compte.
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
          onClose={() => {
            setShowReportModal(false);
            setReportTarget(null);
            setSearchName('');
            setSearchPhone('');
            setTab('community');
          }}
        />
      )}
    </div>
  );
}
