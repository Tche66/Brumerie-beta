import { Logo } from '../components/Logo';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router';
import { MapPin, ArrowLeft, Loader2, Check, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { getAddressByCode, updateAddress, deleteAddress, type Address } from '../utils/supabaseService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'maison', label: '🏠 Maison' },
  { value: 'commerce', label: '🏪 Commerce' },
  { value: 'bureau', label: '🏢 Bureau' },
  { value: 'restaurant', label: '🍽️ Restaurant' },
  { value: 'entrepot', label: '🏭 Entrepôt' },
  { value: 'evenement', label: '🎉 Événement' },
  { value: 'autre', label: '📍 Autre' },
];

export function EditAddressPage() {
  const { addressCode } = useParams<{ addressCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode Brumerie : edit_token + uid dans l'URL → pas besoin de compte Supabase
  const editToken   = searchParams.get('edit_token');
  const brumerieUid = searchParams.get('uid');
  const isBrumerieMode = !!editToken && !!brumerieUid;

  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  const [form, setForm] = useState({
    repere: '',
    ville: '',
    quartier: '',
    categorie: 'autre',
    isPublic: true,
  });

  useEffect(() => {
    if (!addressCode) return;
    getAddressByCode(addressCode).then(addr => {
      if (!addr) { toast.error('Adresse introuvable'); navigate('/'); return; }

      // Mode Brumerie — vérifier le token et l'uid
      if (isBrumerieMode) {
        // Vérifier l'expiry du token (format: expiry.signature)
        const expiry = parseInt(editToken!.split('.')[0]);
        if (Date.now() > expiry) {
          toast.error('Lien de modification expiré. Demandez un nouveau lien depuis Brumerie.');
          navigate(`/${addressCode}`);
          return;
        }
        setTokenValid(true);
      } else {
        // Mode normal — vérifier que l'utilisateur est propriétaire
        if (!user) { navigate('/auth'); return; }
        if (addr.userId !== user.id) {
          toast.error('Vous ne pouvez pas modifier cette adresse');
          navigate(`/${addressCode}`);
          return;
        }
      }

      setAddress(addr);
      setForm({
        repere:    addr.repere    || '',
        ville:     addr.ville     || '',
        quartier:  addr.quartier  || '',
        categorie: addr.categorie || 'autre',
        isPublic:  addr.isPublic  !== false,
      });
      setLoading(false);
    });
  }, [addressCode, user]);

  const handleSave = async () => {
    if (!address) return;
    if (!form.ville.trim()) { toast.error('La ville est requise'); return; }
    setSaving(true);
    try {
      const ok = await updateAddress(address.id, {
        repere: form.repere.trim() || 'Aucun repère spécifié',
        ville: form.ville.trim(),
        quartier: form.quartier.trim() || undefined,
        categorie: form.categorie,
        isPublic: form.isPublic,
      });
      if (ok) {
        toast.success('✅ Adresse mise à jour');
        navigate(`/${addressCode}`);
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!address) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const ok = await deleteAddress(address.id);
      if (ok) {
        toast.success('Adresse supprimée');
        navigate('/profil');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
    setDeleting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to={`/${addressCode}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" /><span>Retour</span>
            </Link>
            <div className="flex items-center gap-2">
              
              <Logo size={32} /><h1 className="text-xl font-bold text-gray-900">Modifier l'adresse</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Code adresse */}
        <div className="text-center mb-6">
          <span className="font-mono text-2xl font-bold text-indigo-600">{addressCode}</span>
          <p className="text-gray-500 text-sm mt-1">
            {address?.latitude.toFixed(5)}, {address?.longitude.toFixed(5)}
          </p>
        </div>

        <Card className="p-6 space-y-5">
          {/* Ville */}
          <div>
            <Label htmlFor="ville">Ville *</Label>
            <Input
              id="ville"
              value={form.ville}
              onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
              placeholder="Ex: Abidjan"
              className="mt-1"
            />
          </div>

          {/* Quartier */}
          <div>
            <Label htmlFor="quartier">Quartier</Label>
            <Input
              id="quartier"
              value={form.quartier}
              onChange={e => setForm(f => ({ ...f, quartier: e.target.value }))}
              placeholder="Ex: Cocody, Plateau..."
              className="mt-1"
            />
          </div>

          {/* Repère */}
          <div>
            <Label htmlFor="repere">Point de repère</Label>
            <Input
              id="repere"
              value={form.repere}
              onChange={e => setForm(f => ({ ...f, repere: e.target.value }))}
              placeholder="Ex: Maison bleue, portail noir..."
              className="mt-1"
            />
          </div>

          {/* Catégorie */}
          <div>
            <Label>Catégorie</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, categorie: cat.value }))}
                  className={`p-2.5 text-sm rounded-lg border-2 text-left transition-colors ${
                    form.categorie === cat.value
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visibilité */}
          <div>
            <Label>Visibilité</Label>
            <div className="space-y-2 mt-2">
              {[
                { value: true, label: '🌍 Publique', desc: 'Visible sur la carte et via le lien' },
                { value: false, label: '🔒 Privée', desc: 'Accessible uniquement via le lien exact' },
              ].map(opt => (
                <label
                  key={String(opt.value)}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    form.isPublic === opt.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    checked={form.isPublic === opt.value}
                    onChange={() => setForm(f => ({ ...f, isPublic: opt.value }))}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Link to={`/${addressCode}`} className="flex-1">
              <Button variant="outline" className="w-full">Annuler</Button>
            </Link>
            <Button
              onClick={handleSave}
              disabled={saving || !form.ville.trim()}
              className="flex-1"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sauvegarde...</>
                : <><Check className="w-4 h-4 mr-2" />Sauvegarder</>
              }
            </Button>
          </div>
        </Card>

        {/* Zone suppression */}
        <Card className="p-5 mt-4 border-red-100">
          <h3 className="text-sm font-semibold text-red-600 mb-3">⚠️ Zone dangereuse</h3>
          {confirmDelete ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Confirmer la suppression définitive de <strong>{addressCode}</strong> ? Cette action est irréversible.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirmDelete(false)}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Supprimer définitivement'
                  }
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />Supprimer cette adresse
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
