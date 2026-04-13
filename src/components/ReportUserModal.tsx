// src/components/ReportUserModal.tsx
// Modal de signalement — Vendeur signale un client, Client signale un vendeur
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  submitTrustReport,
  REPORT_REASONS,
  ReportReason,
} from '@/services/trustService';

interface ReportUserModalProps {
  reportedId: string;
  reportedName: string;
  reportedPhone?: string;
  reportedRole: 'buyer' | 'seller' | 'livreur';
  orderId?: string;
  productId?: string;
  onClose: () => void;
}

export function ReportUserModal({
  reportedId, reportedName, reportedPhone, reportedRole,
  orderId, productId, onClose,
}: ReportUserModalProps) {
  const { userProfile } = useAuth();
  const [reason, setReason]   = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [step, setStep]       = useState<'form' | 'confirm' | 'done' | 'error'>('form');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!userProfile) return null;

  // Filtrer les raisons selon qui est signalé
  const validReasons = Object.entries(REPORT_REASONS).filter(([, r]) =>
    r.targetRole === 'both' || r.targetRole === reportedRole
  );

  const handleSubmit = async () => {
    if (!reason || details.trim().length < 20) return;
    setLoading(true);
    const result = await submitTrustReport({
      reporterId:    userProfile.id,
      reporterName:  userProfile.name,
      reporterRole:  userProfile.role as 'buyer' | 'seller' | 'livreur',
      reportedId,
      reportedName,
      reportedPhone,
      reason: reason as ReportReason,
      details: details.trim(),
      orderId,
      productId,
    });
    setLoading(false);
    if (result.success) {
      setStep('done');
    } else {
      setErrorMsg(result.error || 'Erreur inconnue');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[300] flex items-end justify-center p-4"
      onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl"
        style={{ maxHeight: '92dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="sticky top-0 bg-white pt-4 pb-3 px-6 border-b border-slate-50 z-10">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <span className="text-base">🚨</span>
            </div>
            <div>
              <h2 className="font-black text-[14px] text-slate-900 uppercase tracking-tight">Signaler un problème</h2>
              <p className="text-[10px] font-bold text-slate-400">Avec {reportedName}</p>
            </div>
            <button onClick={onClose} className="ml-auto w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5">

          {/* ── ÉTAPE FORMULAIRE ── */}
          {(step === 'form' || step === 'confirm') && (
            <>
              {/* Info protection */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5 flex gap-3">
                <span className="text-xl flex-shrink-0">🛡️</span>
                <div>
                  <p className="font-black text-amber-900 text-[11px] mb-0.5">Signalement anonyme et protégé</p>
                  <p className="text-[10px] text-amber-700 leading-snug">
                    Ton identité n'est pas révélée. Après 3 signalements distincts, l'utilisateur est marqué "à risque" pour toute la communauté Brumerie.
                  </p>
                </div>
              </div>

              {/* Raison */}
              <div className="mb-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Raison du signalement</p>
                <div className="grid grid-cols-2 gap-2">
                  {validReasons.map(([key, r]) => (
                    <button key={key}
                      onClick={() => setReason(key as ReportReason)}
                      className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl text-[11px] font-bold border-2 transition-all active:scale-95 text-left ${
                        reason === key
                          ? 'bg-red-600 border-red-600 text-white shadow-lg'
                          : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}>
                      <span className="text-base flex-shrink-0">{r.icon}</span>
                      <span className="leading-tight">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Détails */}
              <div className="mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Décris la situation <span className="text-slate-300 normal-case font-bold">(min. 20 caractères)</span>
                </p>
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Ex : Le client a reçu les chaussures mais n'a jamais payé. Il ne répond plus sur WhatsApp..."
                  rows={4}
                  className="w-full bg-slate-50 rounded-2xl px-4 py-3.5 text-[13px] border-2 border-transparent focus:border-red-400 outline-none resize-none leading-relaxed"
                />
                <p className={`text-[9px] font-bold mt-1 text-right ${details.length >= 20 ? 'text-green-600' : 'text-slate-400'}`}>
                  {details.length}/20 min {details.length >= 20 ? '✓' : ''}
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!reason || details.trim().length < 20 || loading}
                className="w-full py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-widest text-white shadow-xl active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#991B1B,#DC2626)' }}>
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Envoi...</>
                ) : (
                  <>🚨 Envoyer le signalement</>
                )}
              </button>

              <p className="text-center text-[9px] text-slate-400 font-bold mt-3 leading-snug px-4">
                Les faux signalements malveillants entraînent la suspension du compte.
              </p>
            </>
          )}

          {/* ── ÉTAPE SUCCÈS ── */}
          {step === 'done' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              </div>
              <h3 className="font-black text-[16px] text-slate-900 mb-2">Signalement enregistré</h3>
              <p className="text-[12px] text-slate-500 leading-relaxed mb-2">
                L'équipe Brumerie examine chaque signalement sous 24h.
              </p>
              <p className="text-[11px] text-green-700 font-black bg-green-50 rounded-2xl px-4 py-3 mb-6">
                🛡️ Si 3 membres distincts signalent ce profil, il sera automatiquement marqué "à risque" pour toute la communauté.
              </p>
              <button onClick={onClose}
                className="w-full py-4 rounded-[2rem] font-black text-[12px] uppercase tracking-widest text-white"
                style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
                Fermer
              </button>
            </div>
          )}

          {/* ── ÉTAPE ERREUR ── */}
          {step === 'error' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="font-black text-[16px] text-slate-900 mb-2">Impossible d'envoyer</h3>
              <p className="text-[12px] text-red-600 font-bold mb-6">{errorMsg}</p>
              <div className="flex gap-3">
                <button onClick={() => setStep('form')}
                  className="flex-1 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest text-white bg-slate-900">
                  Réessayer
                </button>
                <button onClick={onClose}
                  className="flex-1 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest text-slate-600 bg-slate-100">
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
