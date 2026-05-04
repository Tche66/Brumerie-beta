import { PageGuide } from '../components/PageGuide';
import { Logo } from '../components/Logo';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { signIn, signUp, signInWithGoogle, supabase } from '../utils/supabaseService';
import { toast } from 'sonner';

type Mode = 'login' | 'register' | 'forgot';

const PROFESSIONS = [
  { value: 'particulier', label: '🏠 Particulier' },
  { value: 'commerce',    label: '🏪 Commerce / Boutique' },
  { value: 'entreprise',  label: '🏢 Entreprise' },
  { value: 'autre',       label: '📍 Autre' },
];

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode]         = useState<Mode>('login');
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', nom: '', profession: 'particulier' });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Google OAuth ────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Supabase redirige vers /profil automatiquement après OAuth
    } catch (err: any) {
      toast.error(err.message || 'Erreur connexion Google');
      setGoogleLoading(false);
    }
  };

  // ── Email / Mot de passe ────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.email) { toast.error('Email requis'); return; }
    if (mode !== 'forgot' && !form.password) { toast.error('Mot de passe requis'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password);
        toast.success('Connexion réussie !');
        navigate('/profil');
      } else if (mode === 'register') {
        if (!form.nom.trim()) { toast.error('Nom requis'); setLoading(false); return; }
        if (form.password.length < 8) { toast.error('Mot de passe : minimum 8 caractères'); setLoading(false); return; }
        await signUp(form.email, form.password, form.nom, form.profession);
        toast.success('Compte créé ! Vérifiez votre email pour confirmer.');
        navigate('/profil');
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Invalid login') || msg.includes('invalid_credentials'))
        toast.error('Email ou mot de passe incorrect');
      else if (msg.includes('already registered') || msg.includes('already been registered'))
        toast.error('Cet email est déjà utilisé');
      else if (msg.includes('Email not confirmed'))
        toast.error('Confirmez votre email avant de vous connecter');
      else
        toast.error(msg || 'Une erreur est survenue');
    }
    setLoading(false);
  };

  // ── Mot de passe oublié ─────────────────────────────────────────
  const handleForgot = async () => {
    if (!form.email) { toast.error("Entrez votre email d'abord"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success('Email de réinitialisation envoyé !');
    } catch (err: any) { toast.error(err.message || 'Erreur envoi email'); }
    setLoading(false);
  };

  const titles: Record<Mode, string> = {
    login: 'Connexion', register: 'Créer un compte', forgot: 'Mot de passe oublié',
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-xl font-bold text-gray-900">Address-Web</span>
          </Link>
          <Link to="/"><Button variant="ghost" size="sm" className="text-gray-500">Continuer sans compte</Button></Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="p-8">

            {/* Retour pour forgot */}
            {mode === 'forgot' && (
              <button onClick={() => { setMode('login'); setResetSent(false); }}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
                <ArrowLeft className="w-4 h-4" /> Retour à la connexion
              </button>
            )}

            {/* Logo + titre */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4"><Logo size={64} /></div>
              <h1 className="text-2xl font-bold text-gray-900">{titles[mode]}</h1>
              {mode !== 'forgot' && (
                <p className="text-gray-500 mt-1 text-sm">
                  {mode === 'login' ? 'Accédez à vos adresses et votre profil' : 'Créez vos adresses permanentes et personnalisées'}
                </p>
              )}
            </div>

            {/* ── MODE FORGOT ── */}
            {mode === 'forgot' ? (
              <div className="space-y-4">
                {resetSent ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">✉️</span>
                    </div>
                    <p className="font-medium text-gray-900">Email envoyé !</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Vérifiez votre boîte mail à <strong>{form.email}</strong>
                    </p>
                    <Button variant="outline" className="mt-6 w-full"
                      onClick={() => { setMode('login'); setResetSent(false); }}>
                      Retour à la connexion
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="email-forgot">Votre email</Label>
                      <Input id="email-forgot" type="email" value={form.email}
                        onChange={e => set('email', e.target.value)}
                        placeholder="votre@email.com" className="mt-1"
                        onKeyDown={e => e.key === 'Enter' && handleForgot()} />
                    </div>
                    <Button onClick={handleForgot} disabled={loading || !form.email} className="w-full" size="lg">
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Envoi...</> : 'Envoyer le lien'}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              /* ── MODE LOGIN / REGISTER ── */
              <div className="space-y-4">

                {/* ════ BOUTON GOOGLE ════ */}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full flex items-center justify-center gap-3 border-gray-300 hover:bg-gray-50 font-medium"
                  onClick={handleGoogle}
                  disabled={googleLoading || loading}
                >
                  {googleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {mode === 'login' ? 'Continuer avec Google' : "S'inscrire avec Google"}
                </Button>

                {/* Séparateur */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs text-gray-400">
                    <span className="bg-white px-3">ou avec votre email</span>
                  </div>
                </div>

                {/* Nom (inscription) */}
                {mode === 'register' && (
                  <div>
                    <Label htmlFor="nom">Nom complet *</Label>
                    <Input id="nom" value={form.nom} onChange={e => set('nom', e.target.value)}
                      placeholder="Ex : Konan Serge" className="mt-1" />
                  </div>
                )}

                {/* Email */}
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="serge@exemple.com" className="mt-1" />
                </div>

                {/* Mot de passe */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="password">Mot de passe *</Label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => setMode('forgot')}
                        className="text-xs text-indigo-600 hover:underline">
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPass ? 'text' : 'password'}
                      value={form.password} onChange={e => set('password', e.target.value)}
                      placeholder={mode === 'register' ? 'Min. 8 caractères' : '••••••••'}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                    <button type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Type d'utilisateur (inscription) */}
                {mode === 'register' && (
                  <div>
                    <Label>Type d'utilisateur</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {PROFESSIONS.map(p => (
                        <button key={p.value} type="button" onClick={() => set('profession', p.value)}
                          className={`p-2.5 text-sm rounded-lg border text-left transition-colors ${
                            form.profession === p.value
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bouton soumettre */}
                <Button onClick={handleSubmit} disabled={loading || googleLoading}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white" size="lg">
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Chargement...</>
                    : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                </Button>

                {/* Switcher login ↔ register */}
                <div className="text-center pt-1">
                  <button type="button"
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                      mode === 'login'
                        ? 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
                  </button>
                </div>
              </div>
            )}

            {/* Mentions légales */}
            {mode === 'register' && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  En créant un compte, vous acceptez nos{' '}
                  <Link to="/conditions-utilisation" className="text-indigo-500 hover:underline">conditions d'utilisation</Link>
                  {' '}et notre{' '}
                  <Link to="/politique-confidentialite" className="text-indigo-500 hover:underline">politique de confidentialité</Link>
                </p>
              </div>
            )}
          </Card>

          {/* Visiteur */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 mb-3">Sans compte, vous pouvez :</p>
            <div className="flex justify-center gap-6 text-sm text-gray-500 flex-wrap">
              <span>🔍 Rechercher</span><span>🗺️ Explorer la carte</span><span>🧭 Naviguer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <PageGuide storageKey="auth" steps={[{"icon":"👋","title":"Connexion ou inscription","desc":"Créez un compte gratuit pour créer et gérer vos adresses."},{"icon":"🔵","title":"Connexion Google","desc":"Cliquez sur Continuer avec Google pour vous connecter en un clic sans mot de passe."},{"icon":"📧","title":"Ou par email","desc":"Vous pouvez aussi créer un compte avec votre email et un mot de passe."}]} />
    </>
  );
}
