import React, { useState, useEffect, useRef } from 'react';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';
import { useAuth } from '@/contexts/AuthContext';
import { NEIGHBORHOODS } from '@/types';
import { ChevronLeft, Mail, Eye, EyeOff, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface AuthPageProps { onNavigate: (page: string) => void; }
type Step = 'form' | 'otp';

export function AuthPage({ onNavigate }: AuthPageProps) {
  const [showForgotModal, setShowForgotModal] = React.useState(false);
  const { signIn, signUp, resetPassword, requestOTP, verifyOTP, signInWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep]       = useState<Step>('form');
  const [loading, setLoading]   = useState(false);
  const [googleStep, setGoogleStep] = useState<'idle'|'waiting'|'done'>('idle');
  const isCapacitorApp = typeof (window as any).Capacitor !== 'undefined';
  const [error, setError]       = useState('');
  const [success, setSuccess] = useState('');

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

  const [otp, setOtp]         = useState(['','','','','','']);
  const [devCode, setDevCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('brumerie_ref_code');
    if (ref) { setReferralCode(ref.toUpperCase()); setShowReferral(true); }
  }, []);

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

  const handleGoogle = async () => {
    setError('');
    setGoogleStep('waiting');
    setLoading(true);
    try {
      await signInWithGoogle();
      setGoogleStep('done');
    } catch (err: any) {
      const code = err.message || err.code || '';
      if (code.includes('timeout')) {
        setError('Delai depasse. Verifie que tu as bien choisi ton compte Google.');
      } else if (code.includes('expired')) {
        setError('Session expiree. Reessaie.');
      } else {
        setError('Erreur Google : ' + (err.message || 'Reessaie.'));
      }
      setGoogleStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!terms)          { setError('Accepte la politique de confidentialite.'); return; }
    if (!name.trim())    { setError('Saisis ton nom complet.'); return; }
    if (!phone.trim())   { setError('Saisis ton numero WhatsApp.'); return; }
    if (!neighborhood)   { setError('Choisis ton quartier.'); return; }
    if (!email.trim())   { setError('Saisis ton adresse email.'); return; }
    if (password.length < 6) { setError('Mot de passe : 6 caracteres minimum.'); return; }

    setLoading(true);
    try {
      const res = await requestOTP(email.trim(), name.trim());
      setStep('otp');
      setCountdown(60);
      setOtp(['','','','','','']);
      if (res.devCode) setDevCode(res.devCode);
      setTimeout(() => refs.current[0]?.focus(), 300);
    } catch (err: any) {
      if (err.message?.includes('Trop de tentatives') || err.message?.includes('429')) {
        setError('Trop de tentatives. Attends 10 minutes.');
      } else if (err.message?.includes('sender') || err.message?.includes('Sender')) {
        setError('Probleme de configuration email. Contacte le support Brumerie.');
      } else if (err.message?.includes('invalide') || err.message?.includes('401')) {
        setError('Service email temporairement indisponible. Reessaie dans quelques minutes.');
      } else if (err.message?.includes('Configuration') || err.message?.includes('manquante')) {
        setError('BREVO_API_KEY manquante dans Netlify. Configure la variable env.');
      } else {
        setError("Erreur : " + (err.message || "Impossible d'envoyer le code. Reessaie."));
      }
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setError(''); setLoading(true);
    try {
      const res = await requestOTP(email.trim(), name.trim());
      setCountdown(60);
      setOtp(['','','','','','']);
      if (res.devCode) setDevCode(res.devCode);
      setSuccess('Nouveau code envoye !');
      setTimeout(() => setSuccess(''), 4000);
      refs.current[0]?.focus();
    } catch { setError('Erreur lors du renvoi. Reessaie.'); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (fullOtp.length !== 6) { setError('Saisis les 6 chiffres.'); return; }
    setError(''); setLoading(true);
    try {
      const res = await verifyOTP(email.trim(), fullOtp);
      if (res === 'expired') {
        setError('Code expire. Clique sur "Renvoyer le code".');
        setOtp(['','','','','','']);
        refs.current[0]?.focus();
        setLoading(false); return;
      }
      if (res === 'invalid') {
        setError('Code incorrect. Verifie les 6 chiffres.');
        setLoading(false); return;
      }
      await signUp(email.trim(), password, {
        name: name.trim(), phone: phone.trim(), neighborhood,
        role: 'buyer',
        referredBy: referralCode.trim() || undefined,
      });
    } catch (err: any) {
      const msg =
        err?.code === 'auth/email-already-in-use' ? 'Cet email est deja utilise. Connecte-toi.'
        : err?.code === 'auth/weak-password' ? 'Mot de passe trop court (6 min).'
        : 'Erreur lors de la creation. Reessaie.';
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await signIn(email.trim(), password); }
    catch (err: any) {
      setError(err?.code === 'auth/invalid-credential'
        ? 'Email ou mot de passe incorrect.'
        : 'Erreur de connexion. Reessaie.');
    } finally { setLoading(false); }
  };

  const handleForgotPwd = () => {
    setShowForgotModal(true);
  };

  // ═══ ECRAN OTP ═══
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">

        {/* Header */}
        <div className="bg-emerald-700 px-6 pt-14 pb-16 text-center">
          <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-white" />
          </div>
          <h2 className="font-semibold text-white text-xl mb-1">Verifie ton email</h2>
          <p className="text-emerald-100 text-sm">Code envoye a</p>
          <p className="text-white font-semibold text-sm mt-0.5">{email}</p>
        </div>

        <div className="flex-1 px-6 pt-8 pb-10 bg-white dark:bg-slate-800 rounded-t-3xl -mt-6 z-20 overflow-y-auto">

          <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
            Saisis le code a <strong className="text-gray-900 dark:text-white">6 chiffres</strong> recu dans ta boite email
          </p>

          {/* MODE DEV */}
          {devCode && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-5 text-center">
              <p className="text-amber-700 text-xs font-semibold mb-1">Mode developpement</p>
              <p className="text-amber-800 dark:text-amber-300 text-xs mb-2">
                Utilise ce code pour tester :
              </p>
              <p className="font-bold text-amber-900 dark:text-amber-200 text-3xl tracking-[0.3em] font-mono">{devCode}</p>
            </div>
          )}

          {/* 6 cases OTP */}
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {otp.map((val: string, i: number) => (
              <input
                key={i}
                ref={(el: HTMLInputElement | null) => { refs.current[i] = el; }}
                type="text" inputMode="numeric" maxLength={1} value={val}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKey(i, e)}
                className={`w-11 h-12 text-center text-xl font-semibold rounded-lg border outline-none transition-all ${
                  val ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-3 mb-4">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg p-3 mb-4">
              <Check size={14} className="text-emerald-600 flex-shrink-0" />
              <p className="text-emerald-700 dark:text-emerald-400 text-xs">{success}</p>
            </div>
          )}

          {/* Bouton confirmer */}
          <button onClick={handleConfirm} disabled={loading || fullOtp.length !== 6}
            className={`w-full py-3.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] mb-6 ${
              fullOtp.length === 6 ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-400'
            }`}>
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : 'Confirmer et creer mon compte'
            }
          </button>

          {/* Renvoi + Countdown */}
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-3">Pas recu ?</p>
            {countdown > 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Nouveau code disponible dans <span className="font-semibold text-emerald-600">{countdown}s</span>
              </p>
            ) : (
              <button onClick={handleResend} disabled={loading}
                className="inline-flex items-center gap-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium text-sm px-4 py-2.5 rounded-lg active:scale-[0.98] transition-transform disabled:opacity-40">
                <RefreshCw size={14} />
                Renvoyer le code
              </button>
            )}
          </div>

          {/* Rappel spam */}
          <div className="mt-5 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3.5 flex items-start gap-2.5 border border-amber-100 dark:border-amber-800">
            <Mail size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-800 dark:text-amber-300 text-xs font-medium mb-0.5">Tu ne trouves pas l'email ?</p>
              <p className="text-amber-700 dark:text-amber-400 text-xs">
                Verifie ton dossier Spam. L'expediteur est contact.brumerie@gmail.com
              </p>
            </div>
          </div>

          <button onClick={() => { setStep('form'); setOtp(['','','','','','']); setError(''); setDevCode(''); }}
            className="w-full mt-4 py-2.5 text-gray-400 font-medium text-sm active:opacity-70 flex items-center justify-center gap-1.5">
            <ChevronLeft size={14} />
            Modifier mon email
          </button>
        </div>
      </div>
    );
  }

  // ═══ FORMULAIRE PRINCIPAL ═══
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)}/>
      )}

      {/* Hero */}
      <div className="bg-emerald-700 flex flex-col items-center justify-center pt-16 pb-20 px-6 text-center">
        <img src="/logo.png" alt="Brumerie" className="w-16 h-16 object-contain mb-3"/>
        <p className="text-emerald-100 text-xs font-medium">Le commerce de quartier</p>
      </div>

      {/* Contenu */}
      <div className="flex-1 px-6 pt-8 pb-12 bg-white dark:bg-slate-800 rounded-t-3xl -mt-8 relative z-20 overflow-y-auto">

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1 mb-7">
          {(['Connexion','Inscription'] as const).map((label, i) => (
            <button key={label} onClick={() => { setIsLogin(i === 0); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${(i === 0) === isLogin ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Bouton Google */}
        <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 font-medium text-sm text-gray-800 dark:text-white active:scale-[0.98] transition-transform hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-40 mb-5"
          >
            {googleStep === 'waiting' ? (
              <div className="flex flex-col items-center gap-1 w-full">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-emerald-600 rounded-full animate-spin" />
                  <span>En attente de Google...</span>
                </div>
                <span className="text-xs text-gray-400">
                  Choisis ton compte dans l'onglet ouvert
                </span>
              </div>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuer avec Google
              </>
            )}
          </button>

        {/* Separateur */}
        <div className="flex items-center gap-4 mb-5">
          <div className="h-px bg-gray-200 dark:bg-slate-600 flex-1"/>
          <span className="text-xs text-gray-400">ou</span>
          <div className="h-px bg-gray-200 dark:bg-slate-600 flex-1"/>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleSendOTP} className="space-y-4">

          {/* Champs inscription */}
          {!isLogin && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nom complet *</label>
                <input type="text" placeholder="ex: Aminata Diallo" value={name} required
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-600 outline-none transition-colors"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">WhatsApp *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm border-r border-gray-200 dark:border-slate-600 pr-2.5">+225</span>
                  <input type="tel" placeholder="07 00 00 00 00" value={phone} required
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                    className="w-full pl-16 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-600 outline-none transition-colors"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Quartier *</label>
                {!customHood ? (
                  <div className="grid grid-cols-2 gap-2">
                    {NEIGHBORHOODS.slice(0,5).map(n => (
                      <button key={n} type="button" onClick={() => setNeighborhood(n)}
                        className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${neighborhood === n ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300'}`}>
                        {n}
                      </button>
                    ))}
                    <button type="button" onClick={() => { setCustomHood(true); setNeighborhood(''); }}
                      className="py-2.5 px-3 rounded-lg border border-dashed border-gray-300 dark:border-slate-500 text-sm font-medium text-gray-400">
                      + Autre
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input type="text" placeholder="Ton quartier..." value={neighborhood} autoFocus required
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNeighborhood(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-emerald-500 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-600 outline-none"/>
                    <button type="button" onClick={() => { setCustomHood(false); setNeighborhood(''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-red-500">Annuler</button>
                  </div>
                )}
              </div>
              {!showReferral ? (
                <button type="button" onClick={() => setShowReferral(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  + J'ai un code de parrainage
                </button>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Code parrainage (optionnel)</label>
                  <input type="text" placeholder="ex: KOFFI-X7K2" value={referralCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReferralCode((e.target as HTMLInputElement).value.toUpperCase())}
                    className="w-full px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-sm font-mono font-semibold text-emerald-800 dark:text-emerald-300 focus:border-emerald-500 outline-none uppercase"/>
                </div>
              )}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email *</label>
            <input type="email" placeholder="ton@email.com" value={email} required
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-600 outline-none transition-colors"/>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Mot de passe *</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} placeholder="6 caracteres minimum" value={password} required minLength={6}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="w-full px-4 pr-12 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-600 outline-none transition-colors"/>
              <button type="button" onClick={() => setShowPwd((s: boolean) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Mot de passe oublie */}
          {isLogin && (
            <div className="text-right">
              <button type="button" onClick={handleForgotPwd}
                className="text-xs text-emerald-600 font-medium">
                Mot de passe oublie ?
              </button>
            </div>
          )}

          {/* CGU */}
          {!isLogin && (
            <div className="flex items-start gap-3 pt-1">
              <div onClick={() => setTerms((v: boolean) => !v)}
                className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-all cursor-pointer flex-shrink-0 ${terms ? 'bg-emerald-600 border-emerald-600' : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500'}`}>
                {terms && <Check size={12} className="text-white" />}
              </div>
              <label className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed cursor-pointer" onClick={() => setTerms((v: boolean) => !v)}>
                J'accepte les{' '}
                <button type="button" onClick={e => { e.stopPropagation(); onNavigate('terms'); }}
                  className="text-gray-900 dark:text-white font-medium underline">
                  CGU
                </button>
                {' '}et la{' '}
                <button type="button" onClick={e => { e.stopPropagation(); onNavigate('privacy'); }}
                  className="text-gray-900 dark:text-white font-medium underline">
                  Politique de Confidentialite
                </button>
              </label>
            </div>
          )}

          {/* Info OTP */}
          {!isLogin && (
            <div className="flex items-center gap-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3.5 py-2.5">
              <Mail size={14} className="text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Un code de verification sera envoye a ton email.
              </p>
            </div>
          )}

          {/* Erreurs */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-3">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg p-3">
              <p className="text-emerald-700 dark:text-emerald-400 text-xs">{success}</p>
            </div>
          )}

          {/* Bouton */}
          <button type="submit" disabled={loading || (!isLogin && !terms)}
            className="w-full py-3.5 rounded-lg font-medium text-sm transition-all disabled:opacity-30 flex items-center justify-center gap-2 active:scale-[0.98] bg-emerald-600 text-white mt-2"
            style={{ opacity: loading ? 0.5 : undefined }}>
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : isLogin ? 'Se connecter' : 'Recevoir le code'
            }
          </button>
        </form>
      </div>
    </div>
  );
}
