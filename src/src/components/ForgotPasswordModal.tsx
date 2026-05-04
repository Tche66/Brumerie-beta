// src/components/ForgotPasswordModal.tsx
// Réinitialisation mot de passe par OTP Brevo — 3 étapes
import React, { useState, useRef, useEffect } from 'react';
import { sendResetOTP, verifyResetOTP, changePassword, ResetStep } from '@/services/passwordResetService';

interface Props { onClose: () => void }

export function ForgotPasswordModal({ onClose }: Props) {
  const [step, setStep]         = useState<ResetStep>('email');
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [resendCd, setResendCd] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compte à rebours renvoi
  useEffect(() => {
    if (resendCd > 0) {
      timerRef.current = setInterval(() => setResendCd(c => c - 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resendCd]);

  // ── Étape 1 — Envoyer OTP ──────────────────────────────────
  const handleSendOTP = async () => {
    if (!email.includes('@')) { setError('Adresse email invalide'); return; }
    setLoading(true); setError('');
    const res = await sendResetOTP(email.trim().toLowerCase());
    setLoading(false);
    if (res.success) { setStep('otp'); setResendCd(60); }
    else setError(res.error || 'Erreur');
  };

  // ── Saisie OTP — navigation automatique ───────────────────
  const handleOtpChange = (idx: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = v;
    setOtp(next);
    if (v && idx < 5) inputsRef.current[idx + 1]?.focus();
    if (!v && idx > 0) inputsRef.current[idx - 1]?.focus();
    // Auto-vérifier si 6 chiffres complets
    if (next.every(d => d) && next.join('').length === 6) {
      handleVerifyOTP(next.join(''));
    }
  };
  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputsRef.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      handleVerifyOTP(text);
    }
  };

  // ── Étape 2 — Vérifier OTP ─────────────────────────────────
  const handleVerifyOTP = async (code?: string) => {
    const finalCode = code || otp.join('');
    if (finalCode.length !== 6) { setError('Saisis les 6 chiffres'); return; }
    setLoading(true); setError('');
    const res = await verifyResetOTP(email, finalCode);
    setLoading(false);
    if (res.valid && res.resetToken) {
      setResetToken(res.resetToken);
      setStep('newpassword');
    } else {
      setError(res.error || 'Code incorrect');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    }
  };

  const handleResend = async () => {
    if (resendCd > 0) return;
    setLoading(true); setError('');
    const res = await sendResetOTP(email);
    setLoading(false);
    if (res.success) { setOtp(['', '', '', '', '', '']); setResendCd(60); }
    else setError(res.error || 'Erreur renvoi');
  };

  // ── Étape 3 — Nouveau mot de passe ─────────────────────────
  const handleChangePassword = async () => {
    if (password.length < 6) { setError('Minimum 6 caractères'); return; }
    if (password !== password2) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true); setError('');
    const res = await changePassword(email, resetToken, password);
    setLoading(false);
    if (res.success) setStep('done');
    else setError(res.error || 'Erreur');
  };

  // ── Styles communs ─────────────────────────────────────────
  const inputCls = "w-full bg-slate-50 border-2 border-transparent focus:border-green-400 rounded-2xl px-4 py-4 text-[13px] font-black outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-white rounded-t-3xl overflow-hidden shadow-2xl" style={{ maxHeight: '85dvh', overflowY: 'auto', animation: 'slideUp .3s cubic-bezier(.2,.8,.2,1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="font-black text-slate-900 text-[17px]">
              {step === 'email'       && '🔐 Mot de passe oublié'}
              {step === 'otp'         && '📩 Vérifie tes emails'}
              {step === 'newpassword' && '🔑 Nouveau mot de passe'}
              {step === 'done'        && '✅ Mot de passe modifié !'}
            </h2>
            <p className="text-slate-400 text-[11px] font-bold mt-0.5">
              {step === 'email'       && 'Tu recevras un code à 6 chiffres'}
              {step === 'otp'         && `Code envoyé à ${email}`}
              {step === 'newpassword' && 'Choisis un mot de passe sécurisé'}
              {step === 'done'        && 'Tu peux maintenant te connecter'}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-400 active:scale-90">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="px-6 pb-8 space-y-4">

          {/* ── ÉTAPE 1 : Email ── */}
          {step === 'email' && (
            <>
              <input
                type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="ton@email.com"
                className={inputCls}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                autoFocus autoCapitalize="none" autoCorrect="off"
              />
              {error && <p className="text-red-500 text-[11px] font-bold">{error}</p>}
              <button onClick={handleSendOTP} disabled={!email || loading}
                className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white disabled:opacity-40 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#D97706,#92400E)' }}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Envoi...</span> : '📩 Envoyer le code'}
              </button>
            </>
          )}

          {/* ── ÉTAPE 2 : OTP ── */}
          {step === 'otp' && (
            <>
              <p className="text-slate-500 text-[12px] text-center leading-relaxed">
                Saisis le code à 6 chiffres reçu dans tes emails.<br/>
                <span className="text-slate-400">Vérifie aussi le dossier Spam.</span>
              </p>

              {/* Grille OTP */}
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputsRef.current[i] = el; }}
                    type="tel" inputMode="numeric" maxLength={1}
                    value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-[22px] font-black rounded-2xl border-2 outline-none transition-all ${
                      d ? 'border-green-500 bg-green-50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-900'
                    } ${loading ? 'opacity-50' : ''}`}
                    disabled={loading}
                  />
                ))}
              </div>

              {error && <p className="text-red-500 text-[11px] font-bold text-center">{error}</p>}

              {loading && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"/>
                  <span className="text-green-600 text-[12px] font-bold">Vérification...</span>
                </div>
              )}

              {!loading && (
                <button onClick={() => handleVerifyOTP()}
                  disabled={otp.some(d => !d) || loading}
                  className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white disabled:opacity-40 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                  ✓ Valider le code
                </button>
              )}

              <div className="text-center">
                {resendCd > 0
                  ? <p className="text-slate-400 text-[11px] font-bold">Renvoyer dans {resendCd}s</p>
                  : <button onClick={handleResend} className="text-amber-600 text-[12px] font-black underline active:opacity-70">↺ Renvoyer un nouveau code</button>
                }
              </div>
            </>
          )}

          {/* ── ÉTAPE 3 : Nouveau mot de passe ── */}
          {step === 'newpassword' && (
            <>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Nouveau mot de passe (min. 6 car.)"
                  className={inputCls + " pr-12"}
                  autoFocus
                />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password2} onChange={e => { setPassword2(e.target.value); setError(''); }}
                placeholder="Confirme le mot de passe"
                className={inputCls}
                onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
              />

              {/* Indicateur force */}
              {password.length > 0 && (
                <div className="flex gap-1.5">
                  {[6, 8, 12].map((min, i) => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${password.length >= min ? ['bg-red-400','bg-amber-400','bg-green-500'][i] : 'bg-slate-100'}`}/>
                  ))}
                  <span className="text-[10px] text-slate-400 font-bold">
                    {password.length < 6 ? 'Trop court' : password.length < 8 ? 'Faible' : password.length < 12 ? 'Bon' : 'Fort'}
                  </span>
                </div>
              )}

              {error && <p className="text-red-500 text-[11px] font-bold">{error}</p>}
              <button onClick={handleChangePassword} disabled={!password || !password2 || loading}
                className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white disabled:opacity-40 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Modification...</span> : '🔑 Changer le mot de passe'}
              </button>
            </>
          )}

          {/* ── ÉTAPE 4 : Succès ── */}
          {step === 'done' && (
            <>
              <div className="py-6 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✅</span>
                </div>
                <p className="text-slate-600 text-[13px] leading-relaxed">
                  Ton mot de passe a été modifié avec succès.<br/>
                  Tu peux maintenant te connecter avec ton nouveau mot de passe.
                </p>
              </div>
              <button onClick={onClose}
                className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white active:scale-95"
                style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                Se connecter →
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}
