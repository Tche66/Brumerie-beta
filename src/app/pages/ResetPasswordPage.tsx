import { Logo } from '../components/Logo';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { supabase } from '../utils/supabaseService';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase injecte la session depuis le lien email automatiquement
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    // Vérifier si session déjà active
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });
  }, []);

  const handleReset = async () => {
    if (password.length < 8) { toast.error('Minimum 8 caractères'); return; }
    if (password !== confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success('Mot de passe modifié !');
      setTimeout(() => navigate('/profil'), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la modification');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            
              <Logo size={32} /><span className="text-xl font-bold text-gray-900">Address-Web</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {done
                  ? <CheckCircle className="w-8 h-8 text-green-600" />
                  : <img src="/logo.png" alt="Address-Web" style={{width:32,height:32,objectFit:"contain"}} />
                }
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {done ? 'Mot de passe modifié !' : 'Nouveau mot de passe'}
              </h1>
              <p className="text-gray-500 mt-2 text-sm">
                {done
                  ? 'Vous allez être redirigé vers votre profil...'
                  : 'Choisissez un nouveau mot de passe sécurisé'
                }
              </p>
            </div>

            {!done && (
              <div className="space-y-4">
                {!sessionReady && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                    ⚠️ Lien en cours de validation... Si rien ne se passe, vérifiez que vous avez bien cliqué depuis le lien reçu par email.
                  </div>
                )}
                <div>
                  <Label>Nouveau mot de passe</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Minimum 8 caractères"
                      disabled={!sessionReady}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Confirmer le mot de passe</Label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Répéter le mot de passe"
                    className="mt-1"
                    disabled={!sessionReady}
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                  />
                  {password && confirm && password !== confirm && (
                    <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                  )}
                </div>
                <Button
                  onClick={handleReset}
                  disabled={loading || !sessionReady || !password || password !== confirm}
                  className="w-full"
                  size="lg"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Modification...</>
                    : 'Modifier mon mot de passe'
                  }
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
