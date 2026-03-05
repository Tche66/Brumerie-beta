// src/components/ChangeEmailModal.tsx
// Changement email utilisateur : mot de passe → OTP → nouvel email appliqué
import React, { useState, useRef, useEffect } from 'react';
import { verifyCurrentPassword, sendEmailChangeOTP, applyEmailChange } from '@/services/emailChangeService';

interface Props {
  currentEmail: string;
  uid: string;
  onClose: () => void;
  onSuccess: (newEmail: string) => void;
}

type Step = 'password' | 'newemail' | 'otp' | 'done';

export function ChangeEmailModal({ currentEmail, uid, onClose, onSuccess }: Props) {
  const [step, setStep]       = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp]         = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [resendCd, setResendCd] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (resendCd > 0) {
      timerRef.current = setInterval(() => setResendCd(c => c - 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resendCd]);

  // ── Étape 1 : vérifier mot de passe ──────────────────────────
  const handleVerifyPassword = async () => {
    if (!password) { setError('Saisis ton mot de passe'); return; }
    setLoading(true); setError('');
    const res = await verifyCurrentPassword(currentEmail, password);
    setLoading(false);
    if (res.valid) setStep('newemail');
    else setError(res.error || 'Mot de passe incorrect');
  };

  // ── Étape 2 : envoyer OTP au nouvel email ─────────────────────
  const handleSendOTP = async () => {
    if (!newEmail.includes('@')) { setError('Email invalide'); return; }
    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setError('Le nouvel email est identique à l\'actuel'); return;
    }
    setLoading(true); setError('');
    const res = await sendEmailChangeOTP(newEmail.trim().toLowerCase(), currentEmail);
    setLoading(false);
    if (res.success) { setStep('otp'); setResendCd(60); }
    else setError(res.error || 'Erreur');
  };

  // ── Saisie OTP ──────────────────────────────────────────────
  const handleOtpChange = (idx: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[idx] = v; setOtp(next);
    if (v && idx < 5) inputsRef.current[idx + 1]?.focus();
    if (!v && idx > 0) inputsRef.current[idx - 1]?.focus();
    if (next.every(d => d)) handleApply(next.join(''));
  };
  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputsRef.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (t.length === 6) { setOtp(t.split('')); handleApply(t); }
  };

  // ── Étape 3 : appliquer le changement ────────────────────────
  const handleApply = async (code?: string) => {
    const c = code || otp.join('');
    if (c.length !== 6) { setError('Saisis les 6 chiffres'); return; }
    setLoading(true); setError('');
    const res = await applyEmailChange(newEmail, c, uid);
    setLoading(false);
    if (res.success) { setStep('done'); onSuccess(newEmail); }
    else {
      setError(res.error || 'Erreur');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    }
  };

  const handleResend = async () => {
    if (resendCd > 0) return;
    setLoading(true); setError('');
    const res = await sendEmailChangeOTP(newEmail, currentEmail);
    setLoading(false);
    if (res.success) { setOtp(['', '', '', '', '', '']); setResendCd(60); }
    else setError(res.error || 'Erreur renvoi');
  };

  const inputCls = "w-full bg-slate-50 border-2 border-transparent focus:border-blue-400 rounded-2xl px-4 py-4 text-[13px] font-black outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-white rounded-t-3xl overflow-hidden shadow-2xl"
        style={{ animation: 'slideUp .3s cubic-bezier(.2,.8,.2,1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="font-black text-slate-900 text-[17px]">
              {step === 'password' && '🔐 Confirme ton identité'}
              {step === 'newemail' && '✉️ Nouvel email'}
              {step === 'otp'      && '📩 Vérifie ton nouvel email'}
              {step === 'done'     && '✅ Email mis à jour !'}
            </h2>
            <p className="text-slate-400 text-[11px] font-bold mt-0.5">
              {step === 'password' && 'Saisis ton mot de passe actuel pour continuer'}
              {step === 'newemail' && `Actuellement : ${currentEmail}`}
              {step === 'otp'      && `Code envoyé à ${newEmail}`}
              {step === 'done'     && 'Connecte-toi avec ton nouvel email'}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-400 active:scale-90">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex gap-1.5 px-6 mb-4">
          {(['password','newemail','otp','done'] as Step[]).map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-all ${
              step === s ? 'bg-blue-500' :
              ['password','newemail','otp','done'].indexOf(step) > i ? 'bg-blue-200' : 'bg-slate-100'
            }`}/>
          ))}
        </div>

        <div className="px-6 pb-8 space-y-4">

          {/* ── Étape 1 : Mot de passe ── */}
          {step === 'password' && (
            <>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'}
                  value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Mot de passe actuel"
                  className={inputCls + " pr-12"}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()}
                  autoFocus/>
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
              {error && <p className="text-red-500 text-[11px] font-bold">{error}</p>}
              <button onClick={handleVerifyPassword} disabled={!password || loading}
                className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white disabled:opacity-40 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Vérification...</span> : 'Continuer →'}
              </button>
            </>
          )}

          {/* ── Étape 2 : Nouvel email ── */}
          {step === 'newemail' && (
            <>
              <input type="email" value={newEmail} onChange={e => { setNewEmail(e.target.value); setError(''); }}
                placeholder="nouveau@email.com"
                className={inputCls}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                autoFocus autoCapitalize="none" autoCorrect="off"/>
              {error && <p className="text-red-500 text-[11px] font-bold">{error}</p>}
              <div className="bg-blue-50 rounded-2xl px-4 py-3">
                <p className="text-blue-700 text-[11px] font-bold leading-relaxed">
                  📩 Un code de vérification sera envoyé à <strong>{newEmail || 'ton nouvel email'}</strong> pour confirmer que tu en es propriétaire.
                </p>
              </div>
              <button onClick={handleSendOTP} disabled={!newEmail.includes('@') || loading}
                className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white disabled:opacity-40 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Envoi...</span> : '📩 Envoyer le code'}
              </button>
            </>
          )}

          {/* ── Étape 3 : OTP ── */}
          {step === 'otp' && (
            <>
              <p className="text-slate-500 text-[12px] text-center leading-relaxed">
                Saisis le code reçu à<br/>
                <strong className="text-slate-700">{newEmail}</strong>
              </p>
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input key={i} ref={el => { inputsRef.current[i] = el; }}
                    type="tel" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-[22px] font-black rounded-2xl border-2 outline-none transition-all ${
                      d ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-50'
                    } ${loading ? 'opacity-50' : ''}`}
                    disabled={loading}/>
                ))}
              </div>
              {error && <p className="text-red-500 text-[11px] font-bold text-center">{error}</p>}
              {loading && (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"/>
                  <span className="text-blue-600 text-[12px] font-bold">Application du changement...</span>
                </div>
              )}
              {!loading && (
                <button onClick={() => handleApply()} disabled={otp.some(d => !d)}
                  className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white disabled:opacity-40 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                  ✓ Confirmer le changement
                </button>
              )}
              <div className="text-center">
                {resendCd > 0
                  ? <p className="text-slate-400 text-[11px] font-bold">Renvoyer dans {resendCd}s</p>
                  : <button onClick={handleResend} className="text-blue-600 text-[12px] font-black underline">↺ Renvoyer le code</button>}
              </div>
            </>
          )}

          {/* ── Étape 4 : Succès ── */}
          {step === 'done' && (
            <>
              <div className="py-4 text-center">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✉️</span>
                </div>
                <p className="text-slate-700 font-black text-[15px] mb-1">Email changé avec succès</p>
                <p className="text-slate-400 text-[12px]">Ton nouveau email : <strong className="text-blue-600">{newEmail}</strong></p>
              </div>
              <button onClick={onClose}
                className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white active:scale-95"
                style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                Fermer
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}
