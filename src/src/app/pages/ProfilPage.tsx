import { PageGuide } from '../components/PageGuide';
import { Logo } from '../components/Logo';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  MapPin, Camera, Edit2, LogOut, Trash2, Share2,
  Eye, Plus, ChevronRight, Loader2, Check, Lock, Bell, Globe, X, Copy, Key
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import {
  updateProfile, uploadProfilePhoto, getUserAddresses,
  deleteAddress, signOut, changePassword,
  createApiKey, getApiKeys, revokeApiKey, getUserPlan,
  type Address
} from '../utils/supabaseService';
import { toast } from 'sonner';

const PROFESSIONS = ['particulier', 'commerce', 'entreprise', 'autre'];
const PROFESSION_LABELS: Record<string, string> = {
  particulier: '🏠 Particulier',
  commerce: '🏪 Commerce',
  entreprise: '🏢 Entreprise',
  autre: '📍 Autre',
};

type Tab = 'profil' | 'adresses' | 'parametres';

export function ProfilPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('profil');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Changement de mot de passe
  const [showPassModal, setShowPassModal] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [newKeyVisible, setNewKeyVisible] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [passForm, setPassForm] = useState({ newPass: '', confirmPass: '' });
  const [passLoading, setPassLoading] = useState(false);

  // Form profil — initialisé depuis profile quand disponible
  const [form, setForm] = useState({
    nom: '',
    telephone: '',
    profession: 'particulier',
    bio: '',
  });

  // Sync le form dès que profile est chargé ou change
  useEffect(() => {
    if (profile) {
      setForm({
        nom: profile.nom || '',
        telephone: profile.telephone || '',
        profession: profile.profession || 'particulier',
        bio: (profile as any).bio || '',
      });
    }
  }, [profile]);

  const loadAddresses = async (force = false) => {
    if (addresses !== null && !force) return;
    setLoadingAddresses(true);
    try {
      const list = await getUserAddresses();
      setAddresses(list);
    } catch (err) {
      toast.error('Erreur chargement adresses');
    }
    setLoadingAddresses(false);
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === 'adresses') loadAddresses(true);
    if (t === 'parametres') loadApiKeys();
  };

  const loadApiKeys = async () => {
    setLoadingApiKeys(true);
    try {
      const [keys, plan] = await Promise.all([getApiKeys(), getUserPlan()]);
      setApiKeys(keys);
      setUserPlan(plan.plan);
    } catch (err) {
      toast.error('Erreur chargement clés API');
    }
    setLoadingApiKeys(false);
  };

  const handleCreateApiKey = async () => {
    setGeneratingKey(true);
    try {
      const result = await createApiKey('Ma clé API');
      setNewKeyVisible(result.key);
      await loadApiKeys();
      toast.success('Clé API créée ! Copiez-la maintenant, elle ne sera plus visible.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur création clé');
    }
    setGeneratingKey(false);
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Révoquer cette clé ? Les intégrations utilisant cette clé cesseront de fonctionner.')) return;
    const ok = await revokeApiKey(keyId);
    if (ok) {
      toast.success('Clé révoquée');
      await loadApiKeys();
    } else {
      toast.error('Erreur révocation');
    }
  };

  // Sauvegarder le profil
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        nom: form.nom.trim(),
        telephone: form.telephone.trim(),
        profession: form.profession,
        bio: form.bio.trim(),
      });
      await refreshProfile();
      setEditing(false);
      toast.success('✅ Profil mis à jour');
    } catch (err: any) {
      toast.error('Erreur : ' + (err.message || 'Impossible de sauvegarder'));
    }
    setSaving(false);
  };

  // Upload photo de profil
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop grande (max 5 MB)');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Format non supporté — utilisez JPG, PNG ou WebP');
      return;
    }
    setPhotoUploading(true);
    try {
      await uploadProfilePhoto(file);
      await refreshProfile();
      toast.success('📸 Photo de profil mise à jour');
    } catch (err: any) {
      toast.error('Erreur upload : ' + (err.message || 'Réessayez'));
    }
    setPhotoUploading(false);
    // Reset l'input pour permettre de re-sélectionner le même fichier
    if (fileRef.current) fileRef.current.value = '';
  };

  // Supprimer une adresse
  const handleDeleteAddress = async (addr: Address) => {
    if (!confirm(`Supprimer définitivement l'adresse ${addr.addressCode} ?`)) return;
    const ok = await deleteAddress(addr.id);
    if (ok) {
      setAddresses(prev => prev?.filter(a => a.id !== addr.id) || []);
      toast.success('Adresse supprimée');
    } else {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Changer le mot de passe
  const handleChangePassword = async () => {
    if (passForm.newPass.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères');
      return;
    }
    if (passForm.newPass !== passForm.confirmPass) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setPassLoading(true);
    try {
      const ok = await changePassword(passForm.newPass);
      if (ok) {
        toast.success('✅ Mot de passe modifié');
        setShowPassModal(false);
        setPassForm({ newPass: '', confirmPass: '' });
      } else {
        toast.error('Erreur lors du changement de mot de passe');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
    setPassLoading(false);
  };

  // Déconnexion
  const handleLogout = async () => {
    await signOut();
    toast.success('Déconnecté');
    navigate('/');
  };

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="p-8 text-center max-w-md">
        
        <h2 className="text-xl font-bold mb-2">Connexion requise</h2>
        <p className="text-gray-500 mb-6">Créez un compte pour gérer vos adresses et votre profil.</p>
        <Link to="/auth"><Button className="w-full">Se connecter / S'inscrire</Button></Link>
        <Link to="/" className="block mt-3 text-sm text-gray-400 hover:text-gray-600">Mode visiteur</Link>
      </Card>
    </div>
  );

  const initials = (profile?.nom || user.email || 'U')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            
            <Logo size={32} /><span className="text-xl font-bold text-gray-900">Address-Web</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500">
            <LogOut className="w-4 h-4 mr-1" />Déconnexion
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Avatar + infos rapides */}
        <div className="flex items-center gap-5 mb-8">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-2 border-indigo-200">
              {profile?.photoUrl
                ? <img src={profile.photoUrl} alt="photo profil" className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-indigo-600">{initials}</span>
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={photoUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors"
              title="Changer la photo"
            >
              {photoUploading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Camera className="w-3 h-3" />
              }
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {profile?.nom || 'Mon profil'}
            </h1>
            <p className="text-gray-500 text-sm truncate">{user.email}</p>
            <span className="inline-block mt-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {PROFESSION_LABELS[profile?.profession || 'particulier']}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Adresses', value: profile?.adressesCount ?? '—' },
            { label: 'Membre depuis', value: profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '—' },
            { label: 'Statut', value: user.email_confirmed_at ? '✓ Vérifié' : '⚠ Non vérifié' },
          ].map(s => (
            <Card key={s.label} className="p-3 text-center">
              <p className="text-lg font-bold text-indigo-600">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {(['profil', 'adresses', 'parametres'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'profil' ? '👤 Profil' : t === 'adresses' ? '📍 Adresses' : '⚙️ Paramètres'}
            </button>
          ))}
        </div>

        {/* ==================== TAB PROFIL ==================== */}
        {tab === 'profil' && (
          <Card className="p-6">
            {!editing ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold text-gray-900">Informations personnelles</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />Modifier
                  </Button>
                </div>
                <div className="space-y-0 divide-y divide-gray-50">
                  {[
                    { label: 'Nom complet', value: profile?.nom || '—' },
                    { label: 'Email', value: user.email || '—' },
                    { label: 'Téléphone', value: profile?.telephone || 'Non renseigné' },
                    { label: 'Type', value: PROFESSION_LABELS[profile?.profession || 'particulier'] },
                    { label: 'Bio', value: (profile as any)?.bio || 'Non renseignée' },
                  ].map(f => (
                    <div key={f.label} className="flex justify-between py-3">
                      <span className="text-sm text-gray-500">{f.label}</span>
                      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%] truncate">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-5">
                  <h2 className="font-semibold text-gray-900">Modifier le profil</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditing(false); }}
                    className="text-gray-400"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nom">Nom complet</Label>
                    <Input
                      id="nom"
                      value={form.nom}
                      onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                      placeholder="Votre nom complet"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      value={form.telephone}
                      onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                      placeholder="+225 07 xx xx xx xx"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio courte</Label>
                    <Input
                      id="bio"
                      value={form.bio}
                      onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Ex: Commerçant à Cocody..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Type d'utilisateur</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {PROFESSIONS.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, profession: p }))}
                          className={`p-3 text-sm rounded-lg border-2 text-left transition-colors ${
                            form.profession === p
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-medium'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {PROFESSION_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditing(false)}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sauvegarde...</>
                        : <><Check className="w-4 h-4 mr-2" />Sauvegarder</>
                      }
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ==================== TAB ADRESSES ==================== */}
        {tab === 'adresses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Mes adresses créées</h2>
              <Link to="/create">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />Créer
                </Button>
              </Link>
            </div>

            {loadingAddresses ? (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-gray-500 text-sm mt-3">Chargement...</p>
              </div>
            ) : !addresses || addresses.length === 0 ? (
              <Card className="p-12 text-center">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucune adresse créée</p>
                <p className="text-gray-400 text-sm mt-1">Vos adresses apparaîtront ici</p>
                <Link to="/create">
                  <Button className="mt-4" size="sm">
                    <Plus className="w-4 h-4 mr-1" />Créer ma première adresse
                  </Button>
                </Link>
              </Card>
            ) : (
              addresses.map(addr => (
                <Card key={addr.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-indigo-600 text-sm">{addr.addressCode}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          addr.isPublic
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {addr.isPublic ? '🌍 Public' : '🔒 Privé'}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm font-medium">
                        {addr.ville}{addr.quartier ? ` · ${addr.quartier}` : ''}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{addr.repere}</p>
                      {addr.photos && addr.photos.length > 0 && (
                        <p className="text-xs text-indigo-500 mt-1">
                          📸 {addr.photos.length} photo{addr.photos.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    <Link to={`/${addr.addressCode}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        <Eye className="w-3 h-3 mr-1" />Voir
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/${addr.addressCode}`)
                          .then(() => toast.success('Lien copié !'))
                          .catch(() => toast.error('Impossible de copier'));
                      }}
                    >
                      <Share2 className="w-3 h-3 mr-1" />Partager
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:bg-red-50 border-red-100 px-3"
                      onClick={() => handleDeleteAddress(addr)}
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}


        {/* ==================== TAB API ==================== */}
        {tab === 'api' && (
          <div className="space-y-5">
            {/* Plan actuel */}
            <Card className="p-5 bg-indigo-50 border-indigo-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-indigo-900">
                    Plan actuel : {userPlan === 'free' ? '🆓 Gratuit' : userPlan === 'premium_annual' ? '⭐ Premium' : userPlan === 'premium_lifetime' ? '♾️ Lifetime' : '🏢 Entreprise'}
                  </p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    {userPlan === 'free' ? '100 requêtes/jour' : userPlan === 'enterprise' ? 'Illimité' : '10 000 requêtes/jour'}
                  </p>
                </div>
                <Link to="/plans">
                  <Button size="sm" variant="outline" className="border-indigo-300 text-indigo-700">
                    Upgrader
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Nouvelle clé générée — à copier maintenant */}
            {newKeyVisible && (
              <Card className="p-5 bg-green-50 border-green-300">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  ✅ Nouvelle clé créée — copiez-la maintenant, elle ne sera plus affichée !
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-2 text-xs font-mono text-green-800 break-all">
                    {newKeyVisible}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(newKeyVisible);
                      toast.success('Clé copiée !');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 text-green-700 text-xs"
                  onClick={() => setNewKeyVisible(null)}
                >
                  J'ai sauvegardé ma clé →
                </Button>
              </Card>
            )}

            {/* Liste des clés */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Mes clés API</h3>
                <Button
                  size="sm"
                  onClick={handleCreateApiKey}
                  disabled={generatingKey || apiKeys.length >= 3}
                >
                  {generatingKey
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Génération...</>
                    : '+ Nouvelle clé'
                  }
                </Button>
              </div>

              {loadingApiKeys ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-3">Aucune clé API créée</p>
                  <p className="text-gray-400 text-xs mb-4">Créez une clé pour intégrer Address-Web dans vos applications</p>
                  <Button size="sm" onClick={handleCreateApiKey} disabled={generatingKey}>
                    Créer ma première clé
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map(key => (
                    <div key={key.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm">{key.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${key.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {key.is_active ? 'Active' : 'Révoquée'}
                            </span>
                          </div>
                          <code className="text-xs text-gray-500 font-mono">{key.key_prefix}</code>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>📊 {key.requests_today}/{key.daily_limit === -1 ? '∞' : key.daily_limit} aujourd'hui</span>
                            <span>📈 {key.requests_total} total</span>
                          </div>
                          {key.last_used_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              Dernière utilisation : {new Date(key.last_used_at).toLocaleDateString('fr')}
                            </p>
                          )}
                        </div>
                        {key.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-100 hover:bg-red-50 flex-shrink-0"
                            onClick={() => handleRevokeKey(key.id)}
                          >
                            Révoquer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Doc rapide */}
            <Card className="p-5 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3">Utilisation rapide</h3>
              <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto">
{`curl https://addressweb.brumerie.com/api/v1/addresses/AW-ABJ-84321 \
  -H "Authorization: Bearer VOTRE_CLE_API"`}
              </pre>
              <Link to="/api" className="inline-block mt-3 text-sm text-indigo-600 hover:underline">
                Documentation complète →
              </Link>
            </Card>
          </div>
        )}

        {/* ==================== TAB PARAMÈTRES ==================== */}
        {tab === 'parametres' && (
          <div className="space-y-4">

            {/* API Keys */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔑</span>
                <h3 className="font-semibold text-gray-900">Clés API</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">Gérez vos clés pour intégrer Address-Web dans vos applications.</p>
              {loadingApiKeys ? (
                <div className="text-center py-4"><div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></div>
              ) : (
                <div className="space-y-3">
                  {/* Afficher plan */}
                  <div className="bg-indigo-50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-900">Plan actuel</p>
                      <p className="text-xs text-indigo-600 capitalize">{userPlan}</p>
                    </div>
                    <Link to="/plans">
                      <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 text-xs">Upgrader</Button>
                    </Link>
                  </div>
                  {newKeyVisible && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-700 mb-1">⚠️ Copiez maintenant — visible une seule fois !</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-white border rounded px-2 py-1 flex-1 truncate font-mono">{newKeyVisible}</code>
                        <button onClick={() => { navigator.clipboard.writeText(newKeyVisible!); toast.success('Copié !'); }} className="text-xs text-green-600 hover:text-green-800 font-medium whitespace-nowrap">Copier</button>
                      </div>
                    </div>
                  )}
                  {apiKeys.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm mb-3">Aucune clé API</p>
                      <Button size="sm" onClick={handleCreateApiKey} disabled={generatingKey}>
                        {generatingKey ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Création...</> : '+ Créer ma clé API'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map(key => (
                        <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{key.name}</p>
                            <code className="text-xs text-gray-500 font-mono">{key.key_prefix}</code>
                            <p className="text-xs text-gray-400">{key.requests_today}/{key.daily_limit === -1 ? '∞' : key.daily_limit} req aujourd'hui</p>
                          </div>
                          <button onClick={() => handleRevokeKey(key.id)} className="text-red-400 hover:text-red-600 p-1 ml-2 flex-shrink-0 text-xs">Révoquer</button>
                        </div>
                      ))}
                      {apiKeys.length < 3 && (
                        <Button size="sm" variant="outline" onClick={handleCreateApiKey} disabled={generatingKey} className="w-full text-xs">
                          {generatingKey ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Création...</> : '+ Nouvelle clé'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Sécurité */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Sécurité du compte</h3>
              </div>
              <div className="space-y-1 divide-y divide-gray-50">
                {/* Changer mot de passe */}
                <button
                  className="w-full flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                  onClick={() => setShowPassModal(true)}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">Changer le mot de passe</p>
                    <p className="text-xs text-gray-500 mt-0.5">Mettre à jour votre mot de passe de connexion</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                {/* Email vérifié */}
                <div className="flex items-center justify-between py-3 px-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    user.email_confirmed_at
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {user.email_confirmed_at ? '✓ Vérifié' : '⚠ Non vérifié'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Confidentialité */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Confidentialité</h3>
              </div>
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                La visibilité de chaque adresse (publique/privée) se définit lors de sa création ou en modifiant l'adresse. Vos adresses privées ne sont jamais visibles sur la carte Explorer.
              </p>
            </Card>

            {/* Notifications */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Notifications</h3>
              </div>
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                Les notifications seront disponibles dans une prochaine version.
              </p>
            </Card>

            {/* Support */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">💬 Aide et support</h3>
              <div className="space-y-1 divide-y divide-gray-50">
                {[
                  { label: 'Comment créer une adresse ?', to: '/create' },
                  { label: 'Politique de confidentialité', to: '/politique-confidentialite' },
                  { label: "Conditions d'utilisation", to: '/conditions-utilisation' },
                ].map(item => (
                  <Link key={item.label} to={item.to}>
                    <div className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Danger zone */}
            <Card className="p-6 border-red-100">
              <h3 className="font-semibold text-red-600 mb-4">⚠️ Zone dangereuse</h3>
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />Se déconnecter
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* ==================== MODAL CHANGEMENT MOT DE PASSE ==================== */}
      {showPassModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPassModal(false)}
        >
          <Card
            className="w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Changer le mot de passe</h3>
              <button
                onClick={() => setShowPassModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPass">Nouveau mot de passe</Label>
                <Input
                  id="newPass"
                  type="password"
                  value={passForm.newPass}
                  onChange={e => setPassForm(f => ({ ...f, newPass: e.target.value }))}
                  placeholder="Minimum 8 caractères"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirmPass">Confirmer le nouveau mot de passe</Label>
                <Input
                  id="confirmPass"
                  type="password"
                  value={passForm.confirmPass}
                  onChange={e => setPassForm(f => ({ ...f, confirmPass: e.target.value }))}
                  placeholder="Répéter le mot de passe"
                  className="mt-1"
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                />
              </div>
              {passForm.newPass && passForm.confirmPass && passForm.newPass !== passForm.confirmPass && (
                <p className="text-sm text-red-500">Les mots de passe ne correspondent pas</p>
              )}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setShowPassModal(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={passLoading || !passForm.newPass || passForm.newPass !== passForm.confirmPass}
                  className="flex-1"
                >
                  {passLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Modification...</>
                    : 'Modifier'
                  }
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
      <PageGuide storageKey="profil" steps={[{"icon": "👤", "title": "Votre profil", "desc": "Modifiez votre nom, photo et informations personnelles."}, {"icon": "📍", "title": "Mes adresses", "desc": "Retrouvez vos adresses créées, partagez-les ou supprimez-les."}, {"icon": "🔑", "title": "Clés API", "desc": "Générez une clé API pour intégrer Address-Web dans vos apps."}, {"icon": "⚙️", "title": "Paramètres", "desc": "Changez votre mot de passe ou gérez les paramètres du compte."}]} />
    </>
  );
}
