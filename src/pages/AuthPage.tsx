// src/pages/AuthPage.tsx — Inscription OTP + Parrainage · MVP final
import React, { useState, useEffect, useRef } from 'react';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';
import { useAuth } from '@/contexts/AuthContext';
import { NEIGHBORHOODS } from '@/types';

interface AuthPageProps { onNavigate: (page: string) => void; }
type Step = 'form' | 'otp';

export function AuthPage({ onNavigate }: AuthPageProps) {
  const [showForgotModal, setShowForgotModal] = React.useState(false);
  const { signIn, signUp, resetPassword, requestOTP, verifyOTP, signInWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep]       = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // Champs
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [name, setName]               = useState('');
  const [phone, setPhone]             = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [customHood, setCustomHood]   = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [terms, setTerms]             = useState(false);

  // OTP
  const [otp, setOtp]         = useState(['','','','','','']);
  const [devCode, setDevCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Lire ?ref= dans l'URL
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) { setReferralCode(ref.toUpperCase()); setShowReferral(true); }
  }, []);

  // Countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c: number) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const fullOtp = otp.join('');

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const txt = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (txt.length === 6) { setOtp(txt.split('')); refs.current[5]?.focus(); e.preventDefault(); }
  };

  // ── Connexion / Inscription Google ──────────────────────────
  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try {
      await signInWithGoogle();
      // onAuthStateChanged prend la main → redirection automatique
    } catch (err: any) {
      console.error('[Google Auth] code:', err.code, '| message:', err.message);
      // Afficher TOUJOURS l'erreur pour diagnostiquer
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError('Connexion annulée. Réessaie.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Pop-up bloquée — essaie depuis Chrome directement.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domaine non autorisé dans Firebase. Ajoute brumerie-beta.vercel.app dans Authentication > Paramètres > Domaines autorisés.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google non activé dans Firebase. Active-le dans Authentication > Méthode de connexion.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Erreur réseau. Vérifie ta connexion internet.');
      } else {
        setError('Erreur Google (' + (err.code || 'inconnue') + '): ' + (err.message || 'Réessaie.'));
      }
    } finally { setLoading(false); }
  };

  // ── Envoyer OTP ───────────────────────────────────────────────
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!terms)          { setError('Accepte la politique de confidentialité.'); return; }
    if (!name.trim())    { setError('Saisis ton nom complet.'); return; }
    if (!phone.trim())   { setError('Saisis ton numéro WhatsApp.'); return; }
    if (!neighborhood)   { setError('Choisis ton quartier.'); return; }
    if (!email.trim())   { setError('Saisis ton adresse email.'); return; }
    if (password.length < 6) { setError('Mot de passe : 6 caractères minimum.'); return; }

    setLoading(true);
    try {
      const res = await requestOTP(email.trim(), name.trim());
      setStep('otp');
      setCountdown(60);
      setOtp(['','','','','','']);
      if (res.devCode) {
        setDevCode(res.devCode);
      }
      setTimeout(() => refs.current[0]?.focus(), 300);
    } catch (err: any) {
      if (err.message?.includes('Trop de tentatives') || err.message?.includes('429')) {
        setError('Trop de tentatives. Attends 10 minutes.');
      } else if (err.message?.includes('sender') || err.message?.includes('Sender')) {
        setError('Problème de configuration email. Contacte le support Brumerie.');
      } else if (err.message?.includes('invalide') || err.message?.includes('401')) {
        setError('Service email temporairement indisponible. Réessaie dans quelques minutes.');
      } else if (err.message?.includes('Configuration') || err.message?.includes('manquante')) {
        setError('BREVO_API_KEY manquante dans Netlify. Configure la variable env.');
      } else {
        setError("Erreur : " + (err.message || "Impossible d'envoyer le code. Reessaie."));
      }
    } finally { setLoading(false); }
  };

  // ── Renvoyer OTP ──────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setError(''); setLoading(true);
    try {
      const res = await requestOTP(email.trim(), name.trim());
      setCountdown(60);
      setOtp(['','','','','','']);
      if (res.devCode) setDevCode(res.devCode);
      setSuccess('Nouveau code envoyé !');
      setTimeout(() => setSuccess(''), 4000);
      refs.current[0]?.focus();
    } catch { setError('Erreur lors du renvoi. Réessaie.'); }
    finally { setLoading(false); }
  };

  // ── Confirmer OTP + créer compte ──────────────────────────────
  const handleConfirm = async () => {
    if (fullOtp.length !== 6) { setError('Saisis les 6 chiffres.'); return; }
    setError(''); setLoading(true);
    try {
      const res = await verifyOTP(email.trim(), fullOtp);
      if (res === 'expired') {
        setError('Code expiré. Clique sur "Renvoyer le code".');
        setOtp(['','','','','','']);
        refs.current[0]?.focus();
        setLoading(false); return;
      }
      if (res === 'invalid') {
        setError('Code incorrect. Vérifie les 6 chiffres.');
        setLoading(false); return;
      }
      // ✅ Valide → créer le compte
      await signUp(email.trim(), password, {
        name: name.trim(), phone: phone.trim(), neighborhood,
        role: 'buyer',
        referredBy: referralCode.trim() || undefined,
      });
    } catch (err: any) {
      const msg =
        err?.code === 'auth/email-already-in-use' ? 'Cet email est déjà utilisé. Connecte-toi.'
        : err?.code === 'auth/weak-password' ? 'Mot de passe trop court (6 min).'
        : 'Erreur lors de la création. Réessaie.';
      setError(msg);
    } finally { setLoading(false); }
  };

  // ── Connexion ─────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await signIn(email.trim(), password); }
    catch (err: any) {
      setError(err?.code === 'auth/invalid-credential'
        ? 'Email ou mot de passe incorrect.'
        : 'Erreur de connexion. Réessaie.');
    } finally { setLoading(false); }
  };

  const handleForgotPwd = () => {
    // Utilise le flow OTP Brevo au lieu du lien Firebase
    setShowForgotModal(true);
  };

  // ════════════════════════════════════════════════════════════════
  // ÉCRAN OTP
  // ════════════════════════════════════════════════════════════════
  if (step === 'otp') {
    const pct = Math.max(0, (countdown / 60) * 100);
    const r   = 16;
    const circ = 2 * Math.PI * r;

    {showForgotModal && (
    <ForgotPasswordModal onClose={() => setShowForgotModal(false)}/>
  )}
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">

        {/* Header */}
        <div className="relative overflow-hidden flex flex-col items-center pt-14 pb-12 px-6 text-center"
          style={{ background: 'linear-gradient(160deg,#16A34A 0%,#115E2E 100%)' }}>
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/10 blur-3xl"/>
          <div className="absolute -left-8 bottom-0 w-28 h-28 rounded-full bg-white/10 blur-2xl"/>
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-5 shadow-lg">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h2 className="font-black text-white text-[22px] mb-1 leading-tight">Vérifie ton email</h2>
            <p className="text-green-100 text-[12px] font-medium">Code envoyé à</p>
            <p className="text-white font-black text-[15px] mt-0.5 tracking-tight">{email}</p>
          </div>
        </div>

        <div className="flex-1 px-6 pt-8 pb-10 bg-white rounded-t-[3.5rem] -mt-10 z-20 shadow-2xl overflow-y-auto">

          <p className="text-slate-500 text-[13px] text-center font-medium mb-6 leading-relaxed">
            Saisis le code à <strong className="text-slate-900">6 chiffres</strong> reçu dans ta boîte email
          </p>

          {/* MODE DEV */}
          {devCode && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-5 text-center">
              <p className="text-amber-700 text-[9px] font-black uppercase tracking-widest mb-1">🔧 Mode développement</p>
              <p className="text-amber-800 text-[11px] font-bold mb-2">
                La Netlify Function n'est pas encore déployée.<br/>Utilise ce code pour tester :
              </p>
              <p className="font-black text-amber-900 text-4xl tracking-[0.35em] font-mono">{devCode}</p>
            </div>
          )}

          {/* 6 cases OTP */}
          <div className="flex gap-2.5 justify-center mb-4" onPaste={handlePaste}>
            {otp.map((val: string, i: number) => (
              <input
                key={i}
                ref={(el: HTMLInputElement | null) => { refs.current[i] = el; }}
                type="text" inputMode="numeric" maxLength={1} value={val}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKey(i, e)}
                className={`w-[13%] aspect-square text-center text-2xl font-black rounded-2xl border-2 outline-none transition-all ${
                  val ? 'border-green-500 bg-green-50 text-green-800 shadow-md shadow-green-100'
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-green-400 focus:bg-white'
                }`}
              />
            ))}
          </div>

          {/* Dots progress */}
          <div className="flex justify-center gap-2 mb-6">
            {otp.map((val, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all duration-200 ${val ? 'bg-green-500 scale-125' : 'bg-slate-200'}`}/>
            ))}
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-3.5 mb-4">
              <svg className="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-red-600 text-[11px] font-bold leading-snug">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl p-3.5 mb-4">
              <svg className="flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              <p className="text-green-700 text-[11px] font-bold">{success}</p>
            </div>
          )}

          {/* Bouton confirmer */}
          <button onClick={handleConfirm} disabled={loading || fullOtp.length !== 6}
            className="w-full py-5 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[12px] transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] mb-6"
            style={{
              background:  fullOtp.length === 6 ? 'linear-gradient(135deg,#115E2E,#16A34A)' : '#e2e8f0',
              color:       fullOtp.length === 6 ? 'white' : '#94a3b8',
              boxShadow:   fullOtp.length === 6 ? '0 16px 32px rgba(22,163,74,0.3)' : 'none',
            }}>
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Confirmer et créer mon compte</>
            }
          </button>

          {/* Renvoi + Countdown */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px bg-slate-100 flex-1"/>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex-shrink-0">Pas reçu ?</p>
              <div className="h-px bg-slate-100 flex-1"/>
            </div>

            {countdown > 0 ? (
              <div className="flex items-center justify-center gap-3">
                {/* SVG countdown circulaire */}
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg width="48" height="48" className="-rotate-90">
                    <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                    <circle cx="24" cy="24" r={r} fill="none" stroke="#16A34A" strokeWidth="3"
                      strokeDasharray={circ}
                      strokeDashoffset={circ * (1 - pct / 100)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-black text-[12px] text-green-700">
                    {countdown}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-bold text-slate-600">Nouveau code disponible</p>
                  <p className="text-[11px] text-green-600 font-black">dans {countdown} secondes</p>
                </div>
              </div>
            ) : (
              <button onClick={handleResend} disabled={loading}
                className="inline-flex items-center gap-2 bg-green-50 text-green-700 font-black text-[12px] uppercase tracking-widest px-6 py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-40">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                </svg>
                Renvoyer le code
              </button>
            )}
          </div>

          {/* Rappel spam */}
          <div className="mt-5 bg-amber-50 rounded-2xl p-4 flex items-start gap-3 border border-amber-100">
            <span className="text-xl flex-shrink-0">📬</span>
            <div>
              <p className="text-amber-800 text-[11px] font-black mb-1">Tu ne trouves pas l'email ?</p>
              <p className="text-amber-700 text-[10px] font-medium leading-relaxed">
                Vérifie ton dossier <strong>Spam</strong> ou <strong>Courrier indésirable</strong>.
                L'expéditeur est <strong>contact.brumerie@gmail.com</strong>
              </p>
            </div>
          </div>

          <button onClick={() => { setStep('form'); setOtp(['','','','','','']); setError(''); setDevCode(''); }}
            className="w-full mt-4 py-3 text-slate-400 font-bold text-[11px] uppercase tracking-widest active:opacity-70 flex items-center justify-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Modifier mon email
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // FORMULAIRE PRINCIPAL
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Hero */}
      <div className="relative overflow-hidden flex flex-col items-center justify-center pt-20 pb-16 px-6 text-center"
        style={{ background: 'linear-gradient(160deg,#16A34A 0%,#115E2E 100%)' }}>
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/10 blur-3xl"/>
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"/>
        <div className="relative z-10 flex flex-col items-center">
          <img src="/favicon.png" alt="Brumerie" className="w-24 h-24 object-contain drop-shadow-2xl mb-4"/>
          <p className="text-green-50 text-xs font-medium opacity-80 uppercase tracking-[0.1em]">Le commerce de quartier</p>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 px-6 pt-10 pb-12 bg-white rounded-t-[3.5rem] -mt-10 relative z-20 shadow-2xl overflow-y-auto">

        {/* Tabs */}
        <div className="flex bg-slate-50 rounded-[2rem] p-2 mb-8 border border-slate-100">
          {(['Connexion','Inscription'] as const).map((label, i) => (
            <button key={label} onClick={() => { setIsLogin(i === 0); setError(''); setSuccess(''); }}
              className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.15em] transition-all ${(i === 0) === isLogin ? 'bg-white text-green-700 shadow-xl shadow-slate-200' : 'text-slate-400'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Bouton Google ── */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-[2.5rem] border-2 border-slate-200 bg-white font-black text-[13px] text-slate-800 uppercase tracking-[0.15em] active:scale-[0.98] transition-all shadow-sm hover:border-slate-300 hover:shadow-md disabled:opacity-40 mb-6"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              Redirection Google...
            </>
          ) : (
            <>
              {/* Logo Google SVG officiel */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuer avec Google
            </>
          )}
        </button>

        {/* Séparateur */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-slate-100 flex-1"/>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">ou</span>
          <div className="h-px bg-slate-100 flex-1"/>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleSendOTP} className="space-y-5">

          {/* ── Champs inscription ── */}
          {!isLogin && (
            <div className="space-y-5">
              {/* Nom */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 mb-2">Nom complet *</label>
                <input type="text" placeholder="ex: Aminata Diallo" value={name} required
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] text-sm focus:border-green-600 focus:bg-white outline-none transition-all"/>
              </div>
              {/* WhatsApp */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 mb-2">WhatsApp *</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-bold border-r border-slate-200 pr-3">🇨🇮</span>
                  <input type="tel" placeholder="07 00 00 00 00" value={phone} required
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] text-sm focus:border-green-600 focus:bg-white outline-none transition-all"/>
                </div>
              </div>
              {/* Quartier */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 mb-3">Quartier *</label>
                {!customHood ? (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-[2rem]">
                    {NEIGHBORHOODS.slice(0,5).map(n => (
                      <button key={n} type="button" onClick={() => setNeighborhood(n)}
                        className={`py-4 px-3 rounded-2xl border-2 text-[11px] font-bold transition-all ${neighborhood === n ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-white text-slate-500 shadow-sm'}`}>
                        {n}
                      </button>
                    ))}
                    <button type="button" onClick={() => { setCustomHood(true); setNeighborhood(''); }}
                      className="py-4 px-3 rounded-2xl border-2 border-dashed border-slate-300 text-[11px] font-bold text-slate-400 bg-white">
                      + Autre
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input type="text" placeholder="Ton quartier..." value={neighborhood} autoFocus required
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNeighborhood(e.target.value)}
                      className="w-full px-6 py-5 bg-slate-50 border-2 border-green-600 rounded-[1.5rem] text-sm focus:bg-white outline-none transition-all"/>
                    <button type="button" onClick={() => { setCustomHood(false); setNeighborhood(''); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">Annuler</button>
                  </div>
                )}
              </div>
              {/* Code parrainage */}
              {!showReferral ? (
                <button type="button" onClick={() => setShowReferral(true)}
                  className="flex items-center gap-2 text-[11px] font-bold text-green-600 uppercase tracking-widest">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  J'ai un code de parrainage
                </button>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 mb-2">Code parrainage (optionnel)</label>
                  <input type="text" placeholder="ex: KOFFI-X7K2" value={referralCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReferralCode((e.target as HTMLInputElement).value.toUpperCase())}
                    className="w-full px-6 py-5 bg-green-50 border-2 border-green-200 rounded-[1.5rem] text-sm font-black text-green-800 tracking-widest focus:border-green-500 outline-none uppercase"/>
                </div>
              )}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 mb-2">Email *</label>
            <input type="email" placeholder="ton@email.com" value={email} required
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] text-sm focus:border-green-600 focus:bg-white outline-none transition-all"/>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 mb-2">Mot de passe *</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={password} required minLength={6}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="w-full px-6 pr-14 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] text-sm focus:border-green-600 focus:bg-white outline-none transition-all"/>
              <button type="button" onClick={() => setShowPwd((s: boolean) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-2">
                {showPwd
                  ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {/* Mot de passe oublié */}
          {isLogin && (
            <div className="text-right -mt-2">
              <button type="button" onClick={handleForgotPwd}
                className="text-[10px] text-green-600 font-bold uppercase tracking-widest">
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {/* CGU */}
          {!isLogin && (
            <div className="flex items-start gap-4 px-1">
              <div onClick={() => setTerms((v: boolean) => !v)}
                className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center border-2 transition-all cursor-pointer flex-shrink-0 ${terms ? 'bg-green-600 border-green-600 shadow-lg' : 'bg-slate-50 border-slate-200'}`}>
                {terms && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <label className="text-[11px] text-slate-500 leading-snug cursor-pointer" onClick={() => setTerms((v: boolean) => !v)}>
                J'accepte la{' '}
                <button type="button" onClick={e => { e.stopPropagation(); onNavigate('privacy'); }}
                  className="text-slate-900 font-bold underline decoration-green-600/30">
                  Politique de Confidentialité
                </button>
              </label>
            </div>
          )}

          {/* Info OTP */}
          {!isLogin && (
            <div className="flex items-center gap-3 bg-blue-50 rounded-2xl px-4 py-3">
              <svg className="flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9BF0" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <p className="text-[10px] text-blue-700 font-bold">
                Un code de vérification sera envoyé à ton email pour confirmer ton identité.
              </p>
            </div>
          )}

          {/* Erreurs / Succès */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-3.5">
              <svg className="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-red-600 text-[11px] font-bold leading-snug">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-3.5">
              <p className="text-green-700 text-[11px] font-bold">✅ {success}</p>
            </div>
          )}

          {/* Bouton */}
          <button type="submit" disabled={loading || (!isLogin && !terms)}
            className="w-full py-6 rounded-[2.5rem] font-extrabold uppercase tracking-[0.25em] text-[13px] transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98]"
            style={{ background: loading ? '#f1f5f9' : 'linear-gradient(135deg,#115E2E,#16A34A)', color: loading ? '#94a3b8' : 'white', boxShadow: loading ? 'none' : '0 20px 40px rgba(22,163,74,0.3)' }}>
            {loading
              ? <div className="w-6 h-6 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"/>
              : isLogin ? 'Se connecter' : 'Recevoir le code →'
            }
          </button>
        </form>

        {!isLogin && (
          <div className="mt-10 pt-8 border-t border-slate-100 grid grid-cols-3 gap-2 opacity-50">
            {[['Gratuit','Zéro frais'],['Sécurisé','Email vérifié'],['Local','Quartier']].map(([t,s]) => (
              <div key={t} className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-900">{t}</p>
                <p className="text-[8px] text-slate-400 mt-1">{s}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
