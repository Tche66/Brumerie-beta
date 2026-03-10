// src/pages/EditProfilePage.tsx — Sprint 5 : paiement + livraison vendeur, simplifié acheteur
import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { verifyBeforeUpdateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { NEIGHBORHOODS, MOBILE_PAYMENT_METHODS, PaymentInfo } from '@/types';
import { PaymentLogo } from '@/components/PaymentLogo';
import { compressImage } from '@/utils/helpers';
import { uploadToCloudinary } from '@/utils/uploadImage';

interface EditProfilePageProps { onBack: () => void; onSaved: () => void; }

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-14 h-7 rounded-full transition-all relative ${value ? 'bg-green-600 shadow-lg shadow-green-100' : 'bg-slate-200'}`}>
      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${value ? 'right-1' : 'left-1'}`} />
    </button>
  );
}

export function EditProfilePage({ onBack, onSaved }: EditProfilePageProps) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const role = userProfile?.role || 'buyer';
  const isSeller = role === 'seller';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Charger le profil frais depuis Firestore
  React.useEffect(() => { refreshUserProfile(); }, []);

  // ── Changement email ──────────────────────────────────────
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  const handleChangeEmail = async () => {
    if (!currentUser || !newEmail.trim() || !currentPassword.trim()) return;
    setEmailLoading(true); setEmailError(''); setEmailSuccess('');
    try {
      // Réauthentifier d'abord (obligatoire par Firebase)
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      // Firebase envoie un email de vérification à la NOUVELLE adresse
      // Le changement sera effectif seulement après que l'utilisateur clique le lien
      await verifyBeforeUpdateEmail(currentUser, newEmail.trim());
      setEmailSuccess(`📧 Email de confirmation envoyé à ${newEmail.trim()} — Clique le lien reçu pour valider le changement.`);
      setNewEmail(''); setCurrentPassword('');
      setTimeout(() => { setShowEmailChange(false); setEmailSuccess(''); }, 6000);
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') setEmailError('Mot de passe incorrect.');
      else if (e.code === 'auth/email-already-in-use') setEmailError('Cet email est déjà utilisé par un autre compte.');
      else if (e.code === 'auth/invalid-email') setEmailError('Adresse email invalide.');
      else if (e.code === 'auth/requires-recent-login') setEmailError('Session expirée. Déconnecte-toi et reconnecte-toi pour réessayer.');
      else if (e.code === 'auth/too-many-requests') setEmailError('Trop de tentatives. Réessaie dans quelques minutes.');
      else setEmailError('Erreur : ' + (e.message || 'Réessaie.'));
    } finally { setEmailLoading(false); }
  };

  // ── Champs communs ────────────────────────────────────────
  const [name, setName] = useState(userProfile?.name || '');
  const [neighborhood, setNeighborhood] = useState(userProfile?.neighborhood || '');
  const [isCustomNeighborhood, setIsCustomNeighborhood] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // ── Champs vendeur ────────────────────────────────────────
  const [hasPhysicalShop, setHasPhysicalShop] = useState(userProfile?.hasPhysicalShop || false);
  const [managesDelivery, setManagesDelivery] = useState(userProfile?.managesDelivery || false);
  const [deliveryPriceSameZone, setDeliveryPriceSameZone] = useState<string>(
    String((userProfile as any)?.deliveryPriceSameZone || '')
  );
  const [deliveryPartnerName, setDeliveryPartnerName] = useState((userProfile as any)?.deliveryPartnerName || '');
  const [deliveryPartnerPhone, setDeliveryPartnerPhone] = useState((userProfile as any)?.deliveryPartnerPhone || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [socialLinks, setSocialLinks] = useState({
    instagram: userProfile?.socialLinks?.instagram || '',
    tiktok:    userProfile?.socialLinks?.tiktok    || '',
    facebook:  userProfile?.socialLinks?.facebook  || '',
    twitter:   userProfile?.socialLinks?.twitter   || '',
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentInfo[]>(
    userProfile?.defaultPaymentMethods || []
  );

  // Sync quand le profil est rechargé depuis Firestore
  React.useEffect(() => {
    if (userProfile?.defaultPaymentMethods) {
      setPaymentMethods(userProfile.defaultPaymentMethods);
    }
  }, [userProfile?.defaultPaymentMethods?.length]);
  const [addingPM, setAddingPM] = useState(false);
  const [newPM, setNewPM] = useState({ method: 'wave', phone: '', holderName: '', waveLink: '' });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 400);
    setPhotoFile(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
  };

  const handleAddPM = () => {
    if (!newPM.phone.trim() || !newPM.holderName.trim()) return;
    setPaymentMethods(prev => [...prev, {
      method: newPM.method, phone: newPM.phone.trim(),
      holderName: newPM.holderName.trim(), waveLink: newPM.waveLink.trim(),
    } as any]);
    setNewPM({ method: 'wave', phone: '', holderName: '', waveLink: '' });
    setAddingPM(false);
  };

  const handleSave = async () => {
    if (!currentUser || !userProfile) return;
    if (!name.trim() || !neighborhood) { setError('Nom et quartier obligatoires'); return; }
    setLoading(true); setError('');
    try {
            let photoURL = userProfile.photoURL || '';
      if (photoFile) {
        photoURL = await uploadToCloudinary(photoFile, 'brumerie_avatars');
      }

      const updateData: any = { name: name.trim(), neighborhood, photoURL };
      // Bio accessible à tous les vendeurs
      if (isSeller) {
        updateData.bio = bio.trim();
        updateData.hasPhysicalShop = hasPhysicalShop;
        updateData.managesDelivery = managesDelivery;
        updateData.defaultPaymentMethods = paymentMethods;
        if (managesDelivery) {
          updateData.deliveryPriceSameZone = Number(deliveryPriceSameZone) || 0;
          updateData.deliveryPriceOtherZone = Number(deliveryPriceSameZone) || 0;
          if (deliveryPartnerName.trim()) updateData.deliveryPartnerName = deliveryPartnerName.trim();
          if (deliveryPartnerPhone.trim()) updateData.deliveryPartnerPhone = deliveryPartnerPhone.trim();
        }
        // Liens sociaux réservés aux vérifié + premium
        if (userProfile?.isVerified || userProfile?.isPremium) {
          updateData.socialLinks = {
            instagram: socialLinks.instagram.trim(),
            tiktok:    socialLinks.tiktok.trim(),
            facebook:  socialLinks.facebook.trim(),
            twitter:   socialLinks.twitter.trim(),
          };
        }
      }

      await updateDoc(doc(db, 'users', currentUser.uid), updateData);

      // Sync nom + photo sur tous les produits existants du vendeur
      if (isSeller) {
        try {
          await syncSellerDataToProducts(currentUser.uid, {
            sellerName: name.trim(),
            sellerPhoto: photoURL,
          });
        } catch (e) { console.warn('[EditProfile] sync produits échoué', e); }
      }

      await refreshUserProfile();
      onSaved();
    } catch (err: any) {
      setError(`Erreur : ${err.message || 'Réessaie.'}`);
    } finally { setLoading(false); }
  };

  const currentAvatar = photoPreview || userProfile?.photoURL;

  return (
    <div className="min-h-full bg-white pb-20 font-sans">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-50 px-6 py-5 flex items-center justify-between border-b border-slate-50">
        <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 active:scale-90 transition-all border border-slate-100">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="font-bold text-[11px] uppercase tracking-[0.2em] text-slate-900">Mon Profil</h1>
        <div className="w-12"/>
      </div>

      <div className="px-6 py-8 space-y-8 animate-fade-up">

        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden bg-slate-50 border-4 border-white shadow-2xl">
              {currentAvatar
                ? <img src={currentAvatar} alt="Profil" className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center bg-green-50">
                    <span className="text-green-600 text-4xl font-black">{name.charAt(0).toUpperCase()}</span>
                  </div>
              }
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl active:scale-90 transition-all border-4 border-white">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden"/>
        </div>

        {/* Identité */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identité</p>
          <div className="bg-slate-50 rounded-3xl p-5 space-y-4 border border-slate-100">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{isSeller ? 'Nom du Business / Prénom' : 'Ton prénom'}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder={isSeller ? 'Ex: Boutique de Marie' : 'Ex: Koffi'}
                className="w-full px-5 py-4 bg-white rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-green-500 outline-none"/>
            </div>

            {/* ── Email — lecture seule (modifier dans Paramètres > Sécurité) ── */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Adresse email</label>
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <p className="flex-1 text-sm font-bold text-slate-500 truncate">{currentUser?.email}</p>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Paramètres</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-1.5 ml-1">
                Pour modifier ton email, va dans Paramètres → Sécurité.
              </p>
            </div>

            {/* Quartier */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Quartier</label>
              {!isCustomNeighborhood ? (
                <div className="grid grid-cols-2 gap-2">
                  {NEIGHBORHOODS.slice(0, 5).map(n => (
                    <button key={n} onClick={() => setNeighborhood(n)}
                      className={`py-3 px-3 rounded-xl border-2 text-[11px] font-bold transition-all ${neighborhood === n ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-white text-slate-500 shadow-sm'}`}>
                      {n}
                    </button>
                  ))}
                  <button onClick={() => { setIsCustomNeighborhood(true); setNeighborhood(''); }}
                    className="py-3 px-3 rounded-xl border-2 border-dashed border-slate-200 text-[11px] font-bold text-slate-400 bg-white">
                    + Autre
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" placeholder="Nom de ton quartier..." value={neighborhood}
                    onChange={e => setNeighborhood(e.target.value)} autoFocus
                    className="w-full px-5 py-4 bg-white border-2 border-green-500 rounded-2xl text-sm font-bold outline-none"/>
                  <button onClick={() => { setIsCustomNeighborhood(false); setNeighborhood(userProfile?.neighborhood || ''); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION VENDEUR UNIQUEMENT ── */}
        {isSeller && (<>

          {/* Bio */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bio / Description</p>
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Décris ton activité, tes spécialités, ce qui te différencie..."
              rows={3}
              className="w-full px-5 py-4 bg-slate-50 rounded-3xl text-sm font-medium border border-slate-100 focus:ring-2 focus:ring-green-500 outline-none resize-none"/>
            <p className="text-[9px] text-slate-400 ml-1">{bio.length}/200 caractères</p>
          </div>

          {/* Liens sociaux — Vérifié uniquement */}
          {(userProfile?.isVerified || userProfile?.isPremium) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 ml-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liens réseaux sociaux</p>
                <span className="text-[8px] font-black px-2 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#1D9BF0' }}>Vérifié</span>
              </div>
              <div className="bg-slate-50 rounded-3xl p-4 space-y-3 border border-slate-100">
                {([
                  { key: 'instagram' as const, label: 'Instagram', placeholder: '@moncompte ou lien', logo: '/assets/social/instagram.jpg' },
                  { key: 'tiktok'    as const, label: 'TikTok',    placeholder: '@moncompte ou lien', logo: '/assets/social/tiktok.jpg'    },
                  { key: 'facebook'  as const, label: 'Facebook',  placeholder: 'Lien page Facebook', logo: '/assets/social/facebook.png'  },
                  { key: 'twitter'   as const, label: 'X (Twitter)',placeholder: '@moncompte',         logo: '/assets/social/twitter.jpg'   },
                ] as { key: keyof typeof socialLinks; label: string; placeholder: string; logo: string }[]).map(({ key, label, placeholder, logo }) => (
                  <div key={key} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-slate-100">
                    <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                      <img src={logo} alt={label} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
                      <input
                        value={socialLinks[key]}
                        onChange={e => setSocialLinks(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full text-[12px] font-medium text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Options boutique + livraison */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Options vendeur</p>
            <div className="bg-slate-50 rounded-3xl p-5 space-y-5 border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-slate-900">Boutique physique</p>
                    <p className="text-[9px] text-slate-400 font-medium">Local pour recevoir clients</p>
                  </div>
                </div>
                <Toggle value={hasPhysicalShop} onChange={setHasPhysicalShop}/>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M8 17.5h7M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-slate-900">Livraison</p>
                    <p className="text-[9px] text-slate-400 font-medium">Je gère l'expédition</p>
                  </div>
                </div>
                <Toggle value={managesDelivery} onChange={setManagesDelivery}/>
              </div>

              {/* Prix de livraison si activé */}
              {managesDelivery && (
                <div className="bg-white rounded-2xl p-4 space-y-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tarif de livraison (FCFA)</p>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block mb-1.5">🚚 Livraison Abidjan</label>
                    <div className="relative">
                      <input type="number" value={deliveryPriceSameZone}
                        onChange={e => setDeliveryPriceSameZone(e.target.value)}
                        placeholder="Ex: 1000"
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-[12px] font-black border-2 border-transparent focus:border-green-500 outline-none"/>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold">FCFA</span>
                    </div>
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pt-2">Livreur partenaire</p>
                  <input type="text" value={deliveryPartnerName}
                    onChange={e => setDeliveryPartnerName(e.target.value)}
                    placeholder="Nom du livreur (ex: Kouassi Express)"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-[12px] border-2 border-transparent focus:border-green-500 outline-none"/>
                  <input type="tel" value={deliveryPartnerPhone}
                    onChange={e => setDeliveryPartnerPhone(e.target.value)}
                    placeholder="Numéro WhatsApp livreur (+225...)"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-[12px] border-2 border-transparent focus:border-green-500 outline-none"/>
                  <p className="text-[9px] text-slate-400 font-medium">L'acheteur pourra contacter ton livreur directement via WhatsApp.</p>
                </div>
              )}
            </div>
          </div>

          {/* Moyens de paiement */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Moyens de paiement</p>
            <div className="space-y-3">
              {paymentMethods.map((pm, idx) => {
                const m = MOBILE_PAYMENT_METHODS.find(x => x.id === pm.method);
                return (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
                    {m && <PaymentLogo logo={m.logo} name={m.name} color={m.color} size={36} />}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-[11px]">{m?.name}</p>
                      <p className="text-slate-500 text-[10px] font-bold truncate">
                        {pm.phone} · {pm.holderName}
                        {(pm as any).waveLink && <span className="text-blue-500 ml-1">· Lien Wave ✓</span>}
                      </p>
                    </div>
                    <button onClick={() => setPaymentMethods(prev => prev.filter((_, i) => i !== idx))}
                      className="w-7 h-7 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                );
              })}
              {!addingPM ? (
                <button onClick={() => setAddingPM(true)}
                  className="w-full flex items-center justify-center gap-2 bg-green-50 border-2 border-dashed border-green-200 rounded-2xl py-4 text-green-700 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Ajouter un moyen de paiement
                </button>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nouveau moyen</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MOBILE_PAYMENT_METHODS.map(m => (
                      <button key={m.id} onClick={() => setNewPM(p => ({ ...p, method: m.id }))}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${newPM.method === m.id ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}`}>
                        <PaymentLogo logo={m.logo} name={m.name} color={m.color} size={28} />
                        <span className="text-[10px] font-black text-slate-700">{m.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                  <input value={newPM.phone} onChange={e => setNewPM(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Numéro mobile (ex: 0700000000)" type="tel"
                    className="w-full px-4 py-3 bg-white rounded-xl text-[12px] font-mono border-2 border-transparent focus:border-green-500 outline-none"/>
                  <input value={newPM.holderName} onChange={e => setNewPM(p => ({ ...p, holderName: e.target.value }))}
                    placeholder="Nom du titulaire"
                    className="w-full px-4 py-3 bg-white rounded-xl text-[12px] border-2 border-transparent focus:border-green-500 outline-none"/>
                  {newPM.method === 'wave' && (
                    <input value={newPM.waveLink} onChange={e => setNewPM(p => ({ ...p, waveLink: e.target.value }))}
                      placeholder="Lien Wave (optionnel) — wave.com/send?..."
                      className="w-full px-4 py-3 bg-white rounded-xl text-[11px] border-2 border-transparent focus:border-blue-400 outline-none"/>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setAddingPM(false)} className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-500 font-black text-[10px] uppercase">Annuler</button>
                    <button onClick={handleAddPM} disabled={!newPM.phone.trim() || !newPM.holderName.trim()}
                      className="flex-1 py-3 rounded-xl bg-green-600 text-white font-black text-[10px] uppercase disabled:opacity-40 active:scale-95 transition-all">
                      Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>)}

        {error && (
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <p className="text-red-600 text-xs font-bold text-center">{error}</p>
          </div>
        )}

        <button onClick={handleSave} disabled={loading}
          className="w-full py-6 rounded-[2.5rem] font-bold uppercase tracking-[0.2em] text-[12px] transition-all shadow-2xl active:scale-[0.98] disabled:opacity-50 text-white"
          style={{ background: 'linear-gradient(135deg, #115E2E, #16A34A)', boxShadow: '0 20px 40px rgba(22,163,74,0.3)' }}>
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              Enregistrement...
            </div>
          ) : 'Enregistrer les changements'}
        </button>
      </div>
    </div>
  );
}
