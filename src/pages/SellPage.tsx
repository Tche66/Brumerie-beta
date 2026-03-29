import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { playSuccessSound } from '@/services/soundService';
import { createProduct, canUserPublish } from '@/services/productService';
import { ConditionSelector, Condition } from '@/components/ConditionBadge';
import { compressImage } from '@/utils/helpers';
import { CATEGORIES, NEIGHBORHOODS, PLAN_LIMITS } from '@/types';

interface SellPageProps {
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = ['Photos', 'Infos', 'Détails'];
const MAX_CITIES = 3;

const Icon = ({ name }: { name: string }) => {
  if (name === 'gallery') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
  if (name === 'camera') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
  return null;
};

export function SellPage({ onClose, onSuccess }: SellPageProps) {
  const { userProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canPublish, setCanPublish] = useState(true);
  const [success, setSuccess] = useState(false);

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [condition, setCondition] = useState<Condition | ''>('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  // Multi-ville : jusqu'à 3 quartiers
  const [selectedCities, setSelectedCities] = useState<string[]>(
    userProfile?.neighborhood ? [userProfile.neighborhood] : []
  );

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Avertissement si pas de photo de profil
  const hasProfilePhoto = !!userProfile?.photoURL;

  useEffect(() => {
    if (userProfile) {
      canUserPublish(userProfile.id).then((check) => {
        setCanPublish(check.canPublish);
        if (!check.canPublish) setError('Limite de publications atteinte.');
      });
    }
  }, [userProfile]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (files.length + images.length > 5) { setError('Maximum 5 photos.'); return; }
    setError('');
    setLoading(true);
    try {
      for (const file of files) {
        // Skip compression pour HEIC/HEIF (iOS) ou fichiers > 10MB — upload direct
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic');
        const isTooLarge = file.size > 10 * 1024 * 1024;
        const fileToUse = (isHeic || isTooLarge) ? file : await compressImage(file);
        setImages(prev => [...prev, fileToUse]);
        setImagePreviews(prev => [...prev, URL.createObjectURL(fileToUse)]);
      }
    } catch(err) {
      // En cas d'erreur de compression — utiliser le fichier original
      for (const file of files) {
        setImages(prev => [...prev, file]);
        setImagePreviews(prev => [...prev, URL.createObjectURL(file)]);
      }
    } finally {
      setLoading(false);
    }
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  // ── Caméra/Galerie natives sur APK (Capacitor) ──────────────
  const isCapacitor = typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform?.();

  // Ouvre galerie via input HTML
  const triggerInput = (ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current) {
      ref.current.value = '';
      ref.current.click();
    }
  };

  // Caméra native via @capacitor/camera — seule façon fiable sur Android
  const handleNativeCamera = async () => {
    if (images.length >= 5) { setError('Maximum 5 photos.'); return; }
    try {
      const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 80,
        correctOrientation: true,
        saveToGallery: false,
      });
      // Convertir l'URI en File
      const uri = photo.path || photo.webPath;
      if (!uri) return;
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const preview = URL.createObjectURL(blob);
      setImages(prev => [...prev, file]);
      setImagePreviews(prev => [...prev, preview]);
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('user denied')) {
        setError("Impossible d'ouvrir la caméra");
      }
    }
  };

  // Galerie — input HTML suffit
  const handleNativeGallery = () => triggerInput(galleryRef);

  const toggleCity = (city: string) => {
    setSelectedCities(prev => {
      if (prev.includes(city)) return prev.filter(c => c !== city);
      if (prev.length >= MAX_CITIES) return prev; // max 3
      return [...prev, city];
    });
  };

  const handleSubmit = async () => {
    // Vérifier limite produits selon le plan
    const tier = userProfile?.isPremium ? 'premium' : userProfile?.isVerified ? 'verified' : 'simple';
    const productLimit = PLAN_LIMITS[tier].products;
    const currentProductCount = userProfile?.productCount || 0;
    if (currentProductCount >= productLimit) {
      setError(`Limite de ${productLimit} produits atteinte pour le plan ${tier}. Passe au plan supérieur !`);
      return;
    }
    if (!userProfile || !canPublish) return;
    if (selectedCities.length === 0) { setError('Sélectionne au moins une ville.'); return; }
    setLoading(true);
    try {
      // Construire le payload sans aucun champ undefined (Firestore refuse)
      const productPayload: Record<string, any> = {
        title:        title.trim(),
        price:        parseFloat(price),
        description:  description.trim(),
        category,
        neighborhood: selectedCities[0],
        neighborhoods: selectedCities,
        sellerId:      userProfile.id,
        sellerName:    userProfile.name,
        sellerPhone:   userProfile.phone || '',
        sellerVerified: userProfile.isVerified || false,
        images: [],
      };
      // Champs optionnels : ne les inclure que s'ils ont une vraie valeur
      if (originalPrice.trim() && parseFloat(originalPrice) > parseFloat(price)) {
        productPayload.originalPrice = parseFloat(originalPrice);
      }
      if (condition) {
        productPayload.condition = condition;
      }
      if (parseInt(quantity) > 1) {
        productPayload.quantity = parseInt(quantity);
      }
      if (userProfile.photoURL) {
        productPayload.sellerPhoto = userProfile.photoURL;
      }
      await createProduct(productPayload as any, images);
      setSuccess(true);
      playSuccessSound();
      setTimeout(() => onSuccess(), 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la publication. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-white z-[70] flex flex-col items-center justify-center px-8 text-center"
        style={{ height: '100dvh', animation: 'fadeUp .35s cubic-bezier(.2,.8,.2,1) both' }}>

        {/* Emoji animé — canvas-confetti non requis */}
        <div style={{ fontSize: 72, animation: 'bounceIn .5s cubic-bezier(.34,1.56,.64,1) both', marginBottom: 20 }}>
          🎉
        </div>

        {/* Cercle vert check */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-5"
          style={{ animation: 'bounceIn .5s .1s cubic-bezier(.34,1.56,.64,1) both' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
        </div>

        <h2 className="text-2xl font-black mb-2 text-slate-900 uppercase tracking-tight"
          style={{ animation: 'fadeUp .4s .15s ease both' }}>
          Article publié !
        </h2>
        <p className="text-slate-500 text-sm mb-8"
          style={{ animation: 'fadeUp .4s .2s ease both' }}>
          Ton annonce est visible par la communauté Brumerie.
        </p>

        {/* Emojis décoratifs flottants */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {['🛍️','✨','💫','🎊','⭐','🥳'].map((e, i) => (
            <span key={i} style={{
              position: 'absolute',
              fontSize: 24 + (i % 3) * 8,
              left: `${10 + i * 15}%`,
              top: `${15 + (i % 2) * 20}%`,
              animation: `floatEmoji ${1.5 + i * 0.3}s ${i * 0.15}s ease-in-out infinite alternate`,
              opacity: 0.6,
            }}>{e}</span>
          ))}
        </div>

        <style>{`
          @keyframes bounceIn {
            from { transform: scale(0.3); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
          @keyframes floatEmoji {
            from { transform: translateY(0) rotate(-5deg); }
            to   { transform: translateY(-16px) rotate(5deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-black transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <div className="flex items-center gap-3">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-green-600 w-4' : i < step ? 'bg-green-300' : 'bg-slate-200'}`} />
            </div>
          ))}
          <span className="font-bold text-xs tracking-[0.2em] uppercase text-slate-900 ml-1">{STEPS[step]}</span>
        </div>
        <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-bold">{step + 1}/{STEPS.length}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">

        {/* Avertissement photo de profil */}
        {!hasProfilePhoto && (
          <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 items-start">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <p className="text-[10px] text-amber-900 font-bold leading-relaxed">
              <span className="font-black uppercase">Photo de profil recommandée</span><br/>
              Les annonces avec une photo de profil sont plus crédibles et obtiennent plus de contacts. Ajoute-en une dans ton profil !
            </p>
          </div>
        )}

        {/* ÉTAPE 0 — Photos */}
        {step === 0 && (
          <div className="space-y-8 animate-fade-up">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Photos de l'article</h3>
              {images.length === 1 && (
                <p className="text-amber-600 text-[10px] font-black uppercase mt-1">⚠️ Ajoute au moins 1 photo de plus</p>
              )}
              <p className="text-slate-400 text-sm mt-2">Minimum 2 photos, maximum 5. La première = couverture.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {imagePreviews.map((preview, i) => (
                <div key={i} className="relative aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-slate-100 shadow-sm">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-md rounded-full text-white flex items-center justify-center text-xs">✕</button>
                  {i === 0 && <div className="absolute bottom-0 inset-x-0 bg-green-600 py-1.5 text-[8px] text-center text-white font-bold uppercase tracking-widest">Principale</div>}
                </div>
              ))}
              {images.length < 5 && (
                <div onClick={() => {
                  if (isCapacitor) {
                    (userProfile?.isVerified || userProfile?.isPremium) ? handleNativeGallery() : handleNativeCamera();
                  } else {
                    (userProfile?.isVerified || userProfile?.isPremium) ? galleryRef.current?.click() : cameraRef.current?.click();
                  }
                }}
                  className="aspect-[4/5] rounded-[1.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 bg-slate-50 active:scale-95 transition-all cursor-pointer">
                  <span className="text-slate-300 text-3xl font-light">+</span>
                  <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Ajouter</span>
                </div>
              )}
            </div>
            {/* Vendeur Simple = caméra uniquement | Vérifié/Premium = galerie + caméra */}
            {(userProfile?.isVerified || userProfile?.isPremium) ? (
              <div className="flex gap-3">
                <button onClick={() => triggerInput(galleryRef)} className="flex-1 flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-[2rem] font-bold text-xs uppercase tracking-widest active:scale-95">
                  <Icon name="gallery" /> Galerie
                </button>
                <button onClick={() => triggerInput(cameraRef)} className="flex-1 flex items-center justify-center gap-3 py-5 bg-slate-50 text-slate-900 rounded-[2rem] font-bold text-xs uppercase tracking-widest border border-slate-100 active:scale-95">
                  <Icon name="camera" /> Caméra
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button onClick={() => triggerInput(cameraRef)} className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-[2rem] font-bold text-xs uppercase tracking-widest active:scale-95">
                  <Icon name="camera" /> Prendre une photo
                </button>
                <p className="text-center text-[9px] text-slate-400 font-bold">
                  📸 Photos réelles uniquement · <span className="text-blue-500">Devenir Vérifié via Paramètres</span> pour accéder à la galerie
                </p>
              </div>
            )}
            {/* Un seul input sans capture — Android affiche le menu caméra/galerie nativement */}
            <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
          </div>
        )}

        {/* ÉTAPE 1 — Infos */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-up">
            <h3 className="text-2xl font-black text-slate-900">Informations</h3>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1 block mb-2">Titre de l'annonce</label>
              <input type="text" placeholder="ex: iPhone 13 Pro Max" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-5 py-5 bg-slate-50 rounded-2xl text-sm border-2 border-transparent focus:border-green-600 focus:bg-white outline-none transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1 block mb-2">Prix (FCFA)</label>
              <input type="number" placeholder="0" value={price} onChange={e => setPrice(e.target.value)}
                className="w-full px-5 py-5 bg-slate-50 rounded-2xl text-lg border-2 border-transparent focus:border-green-600 focus:bg-white outline-none transition-all font-bold text-green-700" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1 block mb-2">Ancien prix — optionnel <span className="text-amber-500">🏷️ Affiche une réduction</span></label>
              <input type="number" placeholder="Ex: 25000 (si tu fais une promo)" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)}
                className="w-full px-5 py-5 bg-slate-50 rounded-2xl text-sm border-2 border-transparent focus:border-amber-400 focus:bg-white outline-none transition-all font-bold text-slate-500" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1 block mb-2">Description</label>
              <textarea rows={4} placeholder="Accessoires inclus, troc possible ?..." value={description} onChange={e => setDescription(e.target.value)}
                className="w-full px-5 py-5 bg-slate-50 rounded-2xl text-sm border-2 border-transparent focus:border-green-600 focus:bg-white outline-none transition-all resize-none" />
            </div>

            {/* État du produit */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1 block mb-3">
                État du produit <span className="text-slate-300 normal-case font-medium">(recommandé)</span>
              </label>
              <ConditionSelector value={condition} onChange={setCondition} />
            </div>

            {/* Quantité */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1 block mb-2">
                Quantité disponible
              </label>
              <div className="flex items-center gap-4 bg-slate-50 rounded-2xl px-5 py-4">
                <button type="button" onClick={() => setQuantity((q: string) => String(Math.max(1, parseInt(q) - 1)))}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 font-black text-slate-700 text-lg active:scale-90 transition-all shadow-sm">
                  −
                </button>
                <div className="flex-1 text-center">
                  <p className="font-black text-2xl text-slate-900">{quantity}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    {parseInt(quantity) <= 1 ? 'Article unique' : `${quantity} en stock`}
                  </p>
                </div>
                <button type="button" onClick={() => setQuantity((q: string) => String(parseInt(q) + 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-white font-black text-lg active:scale-90 transition-all shadow-sm">
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 — Catégorie & Multi-ville */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-up">
            <h3 className="text-2xl font-black text-slate-900">Catégorie & Zones</h3>

            {/* Catégories */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-3">1. Choisir la catégorie</label>
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-4 rounded-[2rem]">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setCategory(cat.id)}
                    className={`py-3.5 px-3 rounded-2xl text-[11px] font-bold transition-all border flex items-center gap-2 ${
                      category === cat.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600'
                    }`}>
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-ville */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                  2. Zones de vente <span className="text-green-600">(max {MAX_CITIES})</span>
                </label>
                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${
                  selectedCities.length >= MAX_CITIES ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {selectedCities.length}/{MAX_CITIES} sélectionnées
                </span>
              </div>

              {/* Villes sélectionnées */}
              {selectedCities.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedCities.map(city => (
                    <div key={city} className="flex items-center gap-1.5 bg-green-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8z"/></svg>
                      {city}
                      <button onClick={() => toggleCity(city)} className="ml-1 text-green-200 hover:text-white">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 bg-green-50/50 p-4 rounded-[2rem] border border-green-100/50 max-h-72 overflow-y-auto">
                {NEIGHBORHOODS.map(n => {
                  const isSelected = selectedCities.includes(n);
                  const isDisabled = !isSelected && selectedCities.length >= MAX_CITIES;
                  return (
                    <button key={n} onClick={() => !isDisabled && toggleCity(n)}
                      className={`py-3.5 px-3 rounded-xl text-[11px] font-bold transition-all border flex items-center gap-1.5 ${
                        isSelected ? 'bg-green-600 border-green-600 text-white shadow-md' :
                        isDisabled ? 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed' :
                        'bg-white border-green-50 text-green-700 active:scale-95'
                      }`}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                        <path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/>
                      </svg>
                      {n}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-400 mt-2 text-center">
                Sélectionne jusqu'à 3 zones pour mieux toucher tes acheteurs
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100">
            <p className="text-red-600 text-xs font-bold text-center">{error}</p>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="p-6 border-t border-slate-50 bg-white">
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="flex-1 py-5 rounded-[2rem] bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all">
              Retour
            </button>
          )}
          <button
            onClick={() => step < 2 ? setStep(step + 1) : handleSubmit()}
            disabled={loading || (step === 0 && images.length < 2) || (step === 1 && (!title || !price)) || (step === 2 && (!category || selectedCities.length === 0))}
            className="flex-[2] py-5 rounded-[2rem] bg-green-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-green-100 disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : step === 2 ? 'Publier 🎉' : 'Continuer'}
          </button>
        </div>
      </div>
    </div>
  );
}
