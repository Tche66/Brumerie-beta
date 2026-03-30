import { Logo } from '../components/Logo';
import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { MapPin, Navigation, Share2, Copy, CheckCircle, MessageCircle, Home, Eye, Bookmark, BookmarkCheck, QrCode, Camera, Trash2, Loader2, Edit2, ShieldCheck, ThumbsUp } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AddressMap } from '../components/AddressMap';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  getAddressByCode, getShareLink, getGoogleMapsLink,
  getWhatsAppLink, copyToClipboard, uploadAddressPhoto,
  deleteAddressPhoto, verifyAddress, hasUserVerified, supabase, type Address,
} from '../utils/supabaseService';
import { toast } from 'sonner';

export function AddressDetailsPage() {
  const { addressCode } = useParams<{ addressCode: string }>();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('new') === '1';
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [saved, setSaved] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!addressCode) { setLoading(false); return; }
    getAddressByCode(addressCode).then(async addr => {
      setAddress(addr);
      setLoading(false);
      // Vérifier si l'utilisateur est le propriétaire
      const { data: { user } } = await supabase.auth.getUser();
      if (user && addr?.userId === user.id) setIsOwner(true);
    });
    const list = JSON.parse(localStorage.getItem('aw_saved_addresses') || '[]');
    setSaved(list.includes(addressCode));
  }, [addressCode]);

  const handleCopyLink = async () => {
    if (!address) return;
    const ok = await copyToClipboard(getShareLink(address.addressCode));
    toast[ok ? 'success' : 'error'](ok ? 'Lien copié !' : 'Erreur lors de la copie');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo trop lourde (max 5 Mo)'); return; }
    if ((address.photos?.length || 0) >= 5) { toast.error('Maximum 5 photos par adresse'); return; }
    setUploadingPhoto(true);
    try {
      const url = await uploadAddressPhoto(address.id, file);
      setAddress(prev => prev ? { ...prev, photos: [...(prev.photos || []), url] } : prev);
      toast.success('Photo ajoutée !');
    } catch (err: any) { toast.error(err.message); }
    finally { setUploadingPhoto(false); e.target.value = ''; }
  };

  const handleDeletePhoto = async (url: string) => {
    if (!address || !confirm('Supprimer cette photo ?')) return;
    const ok = await deleteAddressPhoto(address.id, url);
    if (ok) setAddress(prev => prev ? { ...prev, photos: prev.photos?.filter(p => p !== url) } : prev);
  };

  const handleCopyCode = async () => {
    if (!address) return;
    const ok = await copyToClipboard(address.addressCode);
    toast[ok ? 'success' : 'error'](ok ? 'Code copié !' : 'Erreur');
  };

  const handleSave = () => {
    const list: string[] = JSON.parse(localStorage.getItem('aw_saved_addresses') || '[]');
    if (!list.includes(addressCode!)) {
      list.push(addressCode!);
      localStorage.setItem('aw_saved_addresses', JSON.stringify(list));
      const details = JSON.parse(localStorage.getItem('aw_saved_details') || '{}');
      details[addressCode!] = { ...address, savedAt: new Date().toISOString() };
      localStorage.setItem('aw_saved_details', JSON.stringify(details));
    }
    setSaved(true);
    toast.success('Adresse sauvegardée dans Mes lieux');
  };

  const handleVerify = async () => {
    if (!address) return;
    setVerifying(true);
    try {
      const result = await verifyAddress(address.id);
      setVerified(result.isVerified);
      setHasVerified(true);
      toast.success(result.isVerified
        ? '✅ Adresse certifiée ! Elle a obtenu 3 confirmations.'
        : `📍 Merci ! ${result.newCount}/3 confirmations`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setVerifying(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Chargement de l'adresse...</p>
      </div>
    </div>
  );

  if (!address) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="p-8 text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Adresse introuvable</h2>
        <p className="text-gray-600 mb-6">
          L'adresse <span className="font-mono font-semibold">{addressCode}</span> n'existe pas.
        </p>
        <Link to="/"><Button><Home className="w-4 h-4 mr-2" />Retour à l'accueil</Button></Link>
      </Card>
    </div>
  );

  const shareLink = getShareLink(address.addressCode);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              
              <h1 className="text-xl font-bold text-gray-900">Address-Web</h1>
            </Link>
            <div className="flex items-center gap-2">
              {isOwner && (
                <Link to={`/${address?.addressCode}/modifier`}>
                  <Button variant="outline" size="sm">
                    <Edit2 className="w-4 h-4 mr-1" />Modifier
                  </Button>
                </Link>
              )}
              <Link to="/create"><Button variant="outline" size="sm">Créer</Button></Link>
            </div>
          </div>
        </div>
      </header>

      {isNew && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Adresse créée avec succès ! Partagez-la maintenant.</span>
          </div>
        </div>
      )}

      <div className="flex-1 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Carte */}
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <div className="h-[400px] lg:h-[500px]">
                  <AddressMap latitude={address.latitude} longitude={address.longitude} repere={address.repere} addressCode={address.addressCode} />
                </div>
              </Card>
              <Button onClick={() => setNavOpen(true)} size="lg" className="w-full text-lg py-6">
                <Navigation className="w-5 h-5 mr-2" />Naviguer vers cette adresse
              </Button>
            </div>

            {/* Détails */}
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Code d'adresse</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-3xl font-bold text-indigo-600 font-mono">{address.addressCode}</h2>
                      {verified && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          <ShieldCheck className="w-3 h-3" />Certifiée
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={handleCopyCode} title="Copier le code">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant={saved ? 'default' : 'outline'} size="icon" onClick={handleSave} disabled={saved} title="Sauvegarder">
                      {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Ville</p>
                    <p className="font-medium">{address.ville}{address.pays ? ` — ${address.pays}` : ''}</p>
                  </div>
                  {address.quartier && (
                    <div>
                      <p className="text-sm text-gray-600">Quartier</p>
                      <p className="font-medium">{address.quartier}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Point de repère</p>
                    <p className="font-medium">{address.repere}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Coordonnées GPS</p>
                    <p className="font-mono text-sm">{address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}</p>
                  </div>
                  {address.viewCount !== undefined && address.viewCount > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Eye className="w-4 h-4" />
                      <span>{address.viewCount} consultation{address.viewCount > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Share2 className="w-5 h-5" />Partager cette adresse
                </h3>
                <div className="space-y-3">
                  <Button onClick={() => window.open(getWhatsAppLink(address.addressCode, address.repere), '_blank')} className="w-full bg-green-600 hover:bg-green-700">
                    <MessageCircle className="w-4 h-4 mr-2" />Partager via WhatsApp
                  </Button>
                  <Button onClick={handleCopyLink} variant="outline" className="w-full">
                    <Copy className="w-4 h-4 mr-2" />Copier le lien
                  </Button>
                  <Button onClick={() => setShowQR(!showQR)} variant="outline" className="w-full">
                    <QrCode className="w-4 h-4 mr-2" />{showQR ? 'Masquer' : 'Afficher'} le QR Code
                  </Button>
                  {/* Bouton vérifier */}
                  {!isOwner && !hasVerified && (
                    <Button
                      variant="outline"
                      className="w-full border-green-200 text-green-700 hover:bg-green-50"
                      onClick={handleVerify}
                      disabled={verifying}
                    >
                      {verifying
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Vérification...</>
                        : <><ThumbsUp className="w-4 h-4 mr-2" />Confirmer cet emplacement ({address.verifiedCount || 0}/3)</>
                      }
                    </Button>
                  )}
                  {hasVerified && (
                    <p className="text-sm text-green-600 text-center flex items-center justify-center gap-1">
                      <CheckCircle className="w-4 h-4" />Vous avez confirmé cette adresse
                    </p>
                  )}
                  {navigator.share && (
                    <Button onClick={() => navigator.share({ title: address.addressCode, text: address.repere, url: shareLink })} variant="outline" className="w-full">
                      <Share2 className="w-4 h-4 mr-2" />Partager via...
                    </Button>
                  )}
                </div>
                {showQR && (
                  <div className="mt-6 p-6 bg-white border rounded-lg text-center">
                    <QRCodeSVG value={shareLink} size={200} className="mx-auto" level="H" includeMargin />
                    <p className="text-sm text-gray-600 mt-4">Scannez ce code pour accéder à l'adresse</p>
                  </div>
                )}
              </Card>

              <Card className="p-4 bg-gray-50">
                <p className="text-xs text-gray-600 mb-2">Lien de partage</p>
                <code className="block text-sm bg-white px-3 py-2 rounded border overflow-x-auto">{shareLink}</code>
              </Card>

              {/* SECTION PHOTOS */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Photos du lieu
                    {(address.photos?.length || 0) > 0 && (
                      <span className="text-xs text-gray-400">({address.photos!.length}/5)</span>
                    )}
                  </h3>
                  {isOwner && (address.photos?.length || 0) < 5 && (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto
                        ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        : <Camera className="w-4 h-4 mr-1" />
                      }
                      Ajouter
                    </Button>
                  )}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>

                {(!address.photos || address.photos.length === 0) ? (
                  <div className="text-center py-6 text-gray-400">
                    {isOwner ? (
                      <div>
                        <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Aucune photo — ajoutez des photos pour aider les visiteurs</p>
                        <Button variant="outline" size="sm" className="mt-3"
                          onClick={() => photoInputRef.current?.click()}>
                          <Camera className="w-4 h-4 mr-1" /> Ajouter une photo
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Aucune photo disponible</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {address.photos.map((url, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100">
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        {isOwner && (
                          <button
                            onClick={() => handleDeletePhoto(url)}
                            className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {isOwner && (address.photos?.length || 0) < 5 && (
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                      >
                        <Camera className="w-5 h-5 mb-1" />
                        <span className="text-xs">Ajouter</span>
                      </button>
                    )}
                  </div>
                )}
              </Card>

              {saved && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex gap-3">
                    <BookmarkCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Sauvegardé dans Mes lieux</p>
                      <p className="text-sm text-blue-700 mt-1">
                        <Link to="/mes-lieux" className="underline">Voir mes lieux sauvegardés →</Link>
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal navigation GPS */}
      {navOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setNavOpen(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded mx-auto mb-6" />
            <h3 className="text-lg font-semibold text-center mb-6">Naviguer avec</h3>
            <div className="space-y-3">
              {[
                { name: 'Google Maps', url: `https://www.google.com/maps?q=${address.latitude},${address.longitude}`, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { name: 'Waze', url: `https://waze.com/ul?ll=${address.latitude},${address.longitude}&navigate=yes`, color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
                { name: 'Apple Maps', url: `maps://?daddr=${address.latitude},${address.longitude}`, color: 'bg-gray-50 text-gray-700 border-gray-200' },
              ].map(app => (
                <a key={app.name} href={app.url} target="_blank" rel="noreferrer"
                  className={`flex items-center justify-between px-5 py-4 rounded-xl border font-medium ${app.color}`}
                  onClick={() => setNavOpen(false)}>
                  {app.name}
                  <Navigation className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <Logo size={28} /><span className="font-semibold">Address-Web</span>
          </Link>
          <p className="text-sm text-gray-500 mt-2">Solution d'adressage numérique pour l'Afrique</p>
        </div>
      </footer>
    </div>
  );
}
