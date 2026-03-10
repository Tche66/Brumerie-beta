// src/pages/ShopCustomizePage.tsx — Sprint 7
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/services/userService';
import { uploadToCloudinary } from '@/utils/uploadImage';
import { compressImage } from '@/utils/helpers';

interface ShopCustomizePageProps { onBack: () => void; onSaved: () => void; }

const THEME_COLORS = [
  { label: 'Vert Brumerie', value: '#16A34A' },
  { label: 'Noir Premium',  value: '#0F172A' },
  { label: 'Violet',        value: '#7C3AED' },
  { label: 'Rouge',         value: '#DC2626' },
  { label: 'Bleu',          value: '#2563EB' },
  { label: 'Orange',        value: '#EA580C' },
  { label: 'Rose',          value: '#DB2777' },
  { label: 'Teal',          value: '#0D9488' },
];

export function ShopCustomizePage({ onBack, onSaved }: ShopCustomizePageProps) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();

  const [themeColor, setThemeColor] = useState(userProfile?.shopThemeColor || '#16A34A');
  const [slogan, setSlogan] = useState(userProfile?.shopSlogan || '');
  const [bannerPreview, setBannerPreview] = useState(userProfile?.shopBanner || '');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 800);
    setBannerFile(compressed);
    setBannerPreview(URL.createObjectURL(compressed));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setLoading(true); setError('');
    try {
      let shopBanner = userProfile?.shopBanner || '';
      if (bannerFile) {
        shopBanner = await uploadToCloudinary(bannerFile);
      }
      await updateUserProfile(currentUser.uid, {
        shopThemeColor: themeColor,
        shopSlogan: slogan.trim(),
        shopBanner,
      });
      await refreshUserProfile();
      onSaved();
    } catch (e: any) { setError(e.message || 'Erreur, réessaie.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 px-5 py-5 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center active:scale-90">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="font-black text-slate-900 text-sm uppercase tracking-widest">Personnaliser ma boutique</h1>
      </div>

      {/* Aperçu */}
      <div className="mx-5 mt-6 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 mb-8">
        {/* Bannière */}
        <div className="relative h-28 flex items-center justify-center"
          style={{ background: bannerPreview ? 'transparent' : themeColor }}>
          {bannerPreview
            ? <img src={bannerPreview} alt="Bannière" className="w-full h-full object-cover"/>
            : <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Aperçu bannière</p>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"/>
        </div>
        {/* Profil mini */}
        <div className="bg-white px-5 py-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-4 border-white shadow-lg -mt-7 flex-shrink-0"
            style={{ borderColor: themeColor }}>
            {userProfile?.photoURL
              ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-white font-black text-xl"
                  style={{ background: themeColor }}>
                  {userProfile?.name?.charAt(0).toUpperCase()}
                </div>
            }
          </div>
          <div>
            <p className="font-black text-slate-900">{userProfile?.name}</p>
            {slogan
              ? <p className="text-[11px] font-bold mt-0.5" style={{ color: themeColor }}>{slogan}</p>
              : <p className="text-[10px] text-slate-300 italic">Ton slogan ici...</p>
            }
          </div>
        </div>
      </div>

      <div className="px-5 space-y-6">

        {/* Couleur thème */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Couleur de ta boutique</p>
          <div className="grid grid-cols-4 gap-3">
            {THEME_COLORS.map(c => (
              <button key={c.value} onClick={() => setThemeColor(c.value)}
                className="flex flex-col items-center gap-2 active:scale-90 transition-all">
                <div className="w-12 h-12 rounded-2xl shadow-sm transition-all"
                  style={{
                    background: c.value,
                    boxShadow: themeColor === c.value ? `0 0 0 3px white, 0 0 0 5px ${c.value}` : undefined,
                    transform: themeColor === c.value ? 'scale(1.1)' : undefined,
                  }}>
                  {themeColor === c.value && (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="18" height="18" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                  )}
                </div>
                <p className="text-[8px] font-bold text-slate-500 text-center leading-tight">{c.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Slogan */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Slogan de ta boutique</p>
          <input type="text" value={slogan} onChange={e => setSlogan(e.target.value)}
            placeholder="Ex: La mode à prix imbattable à Abidjan 🔥"
            maxLength={60}
            className="w-full bg-white px-5 py-4 rounded-2xl text-[13px] border-2 border-transparent focus:border-green-500 outline-none shadow-sm font-medium"/>
          <p className="text-[9px] text-slate-400 font-bold text-right">{slogan.length}/60</p>
        </div>

        {/* Bannière */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Photo de bannière (optionnel)</p>
          <label className={`block w-full rounded-3xl border-2 border-dashed overflow-hidden cursor-pointer transition-all active:scale-98 ${bannerPreview ? 'border-green-400' : 'border-slate-200 bg-white'}`}>
            {bannerPreview
              ? <img src={bannerPreview} alt="Bannière" className="w-full h-32 object-cover"/>
              : <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ajouter une bannière</p>
                  <p className="text-[9px] text-slate-300">Image horizontale recommandée</p>
                </div>
            }
            <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange}/>
          </label>
          {bannerPreview && (
            <button onClick={() => { setBannerPreview(''); setBannerFile(null); }}
              className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
              Supprimer la bannière
            </button>
          )}
        </div>

        {error && <p className="text-red-500 text-[11px] font-bold text-center">{error}</p>}

        <button onClick={handleSave} disabled={loading}
          className="w-full py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-[12px] text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${themeColor}cc, ${themeColor})`, boxShadow: `0 20px 40px ${themeColor}40` }}>
          {loading
            ? <div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Enregistrement...</div>
            : 'Sauvegarder ma boutique'
          }
        </button>
      </div>
    </div>
  );
}
