// src/components/TrustAdminPanel.tsx
// ── Panneau admin Anti-Arnaque — intégrable dans AdminPage ou DashboardPage ──
// Gestion des signalements : valider / rejeter + bannir
import React, { useState, useEffect } from 'react';
import {
  getPendingReports, getRiskUsers, validateReport, banUser,
  TrustReport, TrustScore,
  RISK_LABELS, REPORT_REASONS,
} from '@/services/trustService';
import { RiskBadge } from '@/components/RiskBadge';

export function TrustAdminPanel() {
  const [tab, setTab] = useState<'pending' | 'risk_users'>('pending');
  const [pending, setPending]     = useState<TrustReport[]>([]);
  const [riskUsers, setRiskUsers] = useState<TrustScore[]>([]);
  const [loading, setLoading]     = useState(true);
  const [actionNote, setActionNote] = useState('');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeBanUserId, setActiveBanUserId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [p, r] = await Promise.all([getPendingReports(), getRiskUsers('watch')]);
    setPending(p);
    setRiskUsers(r);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleValidate = async (reportId: string, action: 'validated' | 'rejected') => {
    await validateReport(reportId, action, actionNote);
    setActionNote('');
    setActiveReportId(null);
    load();
  };

  const handleBan = async (userId: string) => {
    await banUser(userId, actionNote || 'Banni par admin');
    setActionNote('');
    setActiveBanUserId(null);
    load();
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'En attente', value: pending.length, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Sous surveillance', value: riskUsers.filter(u => u.riskLevel === 'watch').length, color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'À risque / Bannis', value: riskUsers.filter(u => u.riskLevel === 'risk' || u.riskLevel === 'banned').length, color: '#DC2626', bg: '#FEF2F2' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center border" style={{ background: s.bg, borderColor: s.color + '33' }}>
            <p className="font-black text-[26px] leading-none" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: s.color }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        <button onClick={() => setTab('pending')}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 ${tab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
          🚨 Signalements
          {pending.length > 0 && <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{pending.length}</span>}
        </button>
        <button onClick={() => setTab('risk_users')}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${tab === 'risk_users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
          ⚠️ Profils à risque
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
        </div>
      )}

      {/* ── SIGNALEMENTS EN ATTENTE ── */}
      {!loading && tab === 'pending' && (
        <div className="space-y-3">
          {pending.length === 0 && (
            <div className="bg-green-50 rounded-2xl p-6 text-center border border-green-100">
              <span className="text-3xl block mb-2">✅</span>
              <p className="font-black text-green-800 text-[12px]">Aucun signalement en attente</p>
            </div>
          )}
          {pending.map(report => {
            const reasonCfg = REPORT_REASONS[report.reason];
            const isActive = activeReportId === report.id;
            return (
              <div key={report.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl flex-shrink-0">{reasonCfg?.icon || '❓'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          {reasonCfg?.label}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">{formatDate(report.createdAt)}</span>
                      </div>
                      <p className="font-black text-[12px] text-slate-900">
                        {report.reporterName} → signale → {report.reportedName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        Reporter : {report.reporterRole} · Signalé : {report.reportedPhone || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl px-3 py-2.5 mb-3">
                    <p className="text-[11px] text-slate-700 leading-snug italic">"{report.details}"</p>
                  </div>

                  {report.orderId && (
                    <p className="text-[9px] font-bold text-blue-600 mb-3">🛒 Commande liée : {report.orderId}</p>
                  )}

                  {!isActive ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setActiveReportId(report.id!); setActionNote(''); }}
                        className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide bg-slate-900 text-white active:scale-95">
                        Traiter
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <textarea
                        value={actionNote}
                        onChange={e => setActionNote(e.target.value)}
                        placeholder="Note admin (optionnelle)..."
                        rows={2}
                        className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-[12px] outline-none resize-none border-2 border-transparent focus:border-slate-300"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleValidate(report.id!, 'validated')}
                          className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white active:scale-95">
                          ✓ Valider
                        </button>
                        <button
                          onClick={() => handleValidate(report.id!, 'rejected')}
                          className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase bg-slate-200 text-slate-700 active:scale-95">
                          ✗ Rejeter
                        </button>
                        <button
                          onClick={() => setActiveReportId(null)}
                          className="px-3 py-2.5 rounded-xl text-[10px] font-black text-slate-400 active:scale-95">
                          ←
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PROFILS À RISQUE ── */}
      {!loading && tab === 'risk_users' && (
        <div className="space-y-3">
          {riskUsers.length === 0 && (
            <div className="bg-green-50 rounded-2xl p-6 text-center border border-green-100">
              <span className="text-3xl block mb-2">✅</span>
              <p className="font-black text-green-800 text-[12px]">Aucun profil à risque</p>
            </div>
          )}
          {riskUsers.map(user => {
            const cfg = RISK_LABELS[user.riskLevel];
            const isBanActive = activeBanUserId === user.userId;
            return (
              <div key={user.userId} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: cfg.bg }}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-black text-[13px] text-slate-900 truncate">{user.userName}</p>
                      <RiskBadge level={user.riskLevel} size="sm" />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold">
                      {user.reportCount} signalement{user.reportCount > 1 ? 's' : ''} validé{user.reportCount > 1 ? 's' : ''}
                      {user.userPhone ? ` · ${user.userPhone}` : ''}
                      {' · '}{user.userRole}
                    </p>
                  </div>
                </div>

                {!isBanActive && user.riskLevel !== 'banned' && (
                  <button
                    onClick={() => { setActiveBanUserId(user.userId); setActionNote(''); }}
                    className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide bg-red-900 text-white active:scale-95">
                    🚫 Bannir ce compte
                  </button>
                )}

                {isBanActive && (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <textarea
                      value={actionNote}
                      onChange={e => setActionNote(e.target.value)}
                      placeholder="Raison du bannissement..."
                      rows={2}
                      className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-[12px] outline-none resize-none border-2 border-transparent focus:border-red-300"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBan(user.userId)}
                        className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase bg-red-700 text-white active:scale-95">
                        🚫 Confirmer le bannissement
                      </button>
                      <button
                        onClick={() => setActiveBanUserId(null)}
                        className="px-3 py-2.5 rounded-xl text-[10px] font-black text-slate-400 active:scale-95">
                        ←
                      </button>
                    </div>
                  </div>
                )}

                {user.riskLevel === 'banned' && (
                  <div className="bg-red-900/10 rounded-xl px-3 py-2 text-center">
                    <p className="text-[10px] font-black text-red-700">🚫 Compte banni</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
