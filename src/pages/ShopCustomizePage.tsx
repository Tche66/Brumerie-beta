// src/pages/ShopCustomizePage.tsx — Boutique Pro v2
// Collections · Vente flash · Lien personnalisé · Magasin physique
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
  { label: 'Doré',          value: '#B45309' },
  { label: 'Indigo',        value: '#4338CA' },
];

const DEFAULT_CATEGORIES = ['Nouveautés', 'Promos', 'Pagnes', 'Mode femme', 'Mode homme', 'Accessoires', 'Électronique', 'Alimentation', 'Beauté', 'Maison'];

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
type Day = typeof DAYS[number];

const TABS = [
  { id: 'identite',  label: '🎨 Identité',  emoji: '🎨' },
  { id: 'catalogue', label: '📦 Catalogue',  emoji: '📦' },
  { id: 'flash',     label: '⚡ Vente Flash', emoji: '⚡' },
  { id: 'magasin',   label: '🏪 Magasin',    emoji: '🏪' },
] as const;
type Tab = typeof TABS[number]['id'];

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
}

export function ShopCustomizePage({ onBack, onSaved }: ShopCustomizePageProps) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();

  // ── Garde Premium ─────────────────────────────────────────
  if (!userProfile?.isPremium) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mb-5 text-4xl"
          style={{ background: 'linear-gradient(135deg,#1a1a1a,#0F0F0F)' }}>
          ⭐
        </div>
        <h2 className="font-black text-[22px] text-slate-900 text-center mb-2">Fonctionnalité Premium</h2>
        <p className="text-[13px] text-slate-500 text-center leading-relaxed mb-6 max-w-xs">
          La personnalisation de boutique (bannière, couleur, slogan, vente flash) est réservée aux vendeurs <strong>Premium</strong>.
        </p>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 w-full max-w-xs mb-6">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">⭐ Inclus dans Premium</p>
          {['🎨 Bannière et couleur de boutique','✨ Slogan personnalisé','🔥 Vente flash','📍 Adresse boutique physique','📒 Journal de dettes'].map(f => (
            <div key={f} className="flex items-center gap-2 py-1.5">
              <span className="text-green-500 font-black text-[10px]">✓</span>
              <p className="text-[11px] text-slate-700">{f}</p>
            </div>
          ))}
        </div>
        <button onClick={onBack}
          className="w-full max-w-xs py-4 rounded-[2rem] bg-slate-100 text-slate-600 font-black text-[12px] uppercase tracking-widest active:scale-95 transition-all">
          ← Retour
        </button>
      </div>
    );
  }

  const [tab, setTab] = useState<Tab>('identite');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // ── Identité ──────────────────────────────────────────────
  const [themeColor, setThemeColor] = useState(userProfile?.shopThemeColor || '#16A34A');
  const [slogan, setSlogan]         = useState(userProfile?.shopSlogan || '');
  const [bio, setBio]               = useState((userProfile as any)?.shopBio || '');
  const [username, setUsername]     = useState((userProfile as any)?.shopUsername || slugify(userProfile?.name || ''));
  const [bannerPreview, setBannerPreview] = useState(userProfile?.shopBanner || '');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [instagram, setInstagram]   = useState((userProfile as any)?.shopInstagram || '');
  const [tiktok, setTiktok]         = useState((userProfile as any)?.shopTiktok || '');
  const [shopWhatsapp, setShopWhatsapp] = useState((userProfile as any)?.shopWhatsapp || userProfile?.phone || '');

  // ── Catalogue / Collections ───────────────────────────────
  const [categories, setCategories] = useState<string[]>((userProfile as any)?.shopCategories || []);
  const [customCat, setCustomCat]   = useState('');

  // ── Vente flash ───────────────────────────────────────────
  const [flashActive, setFlashActive] = useState(!!(userProfile as any)?.flashSaleActive);
  const [flashLabel, setFlashLabel]   = useState((userProfile as any)?.flashSaleLabel || '');
  const [flashExpiry, setFlashExpiry] = useState((userProfile as any)?.flashSaleExpiry?.slice(0, 16) || '');

  // ── Magasin physique ──────────────────────────────────────
  const [hasPhysical, setHasPhysical] = useState(userProfile?.hasPhysicalShop || false);
  const [shopAddress, setShopAddress] = useState((userProfile as any)?.shopAddress || '');
  const [hours, setHours] = useState<Partial<Record<Day, string>>>(
    (userProfile as any)?.shopHours || {}
  );

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 1200);
    setBannerFile(compressed);
    setBannerPreview(URL.createObjectURL(compressed));
  };

  const toggleCategory = (cat: string) => {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const addCustomCat = () => {
    const t = customCat.trim();
    if (t && !categories.includes(t)) { setCategories(prev => [...prev, t]); }
    setCustomCat('');
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setLoading(true); setError(''); setSaved(false);
    try {
      let shopBanner = userProfile?.shopBanner || '';
      if (bannerFile) shopBanner = await uploadToCloudinary(bannerFile);

      await updateUserProfile(currentUser.uid, {
        // Identité
        shopThemeColor: themeColor,
        shopSlogan: slogan.trim(),
        shopBanner,
        shopBio: bio.trim() || null,
        shopUsername: slugify(username) || null,
        shopInstagram: instagram.trim().replace('@', '') || null,
        shopTiktok: tiktok.trim().replace('@', '') || null,
        shopWhatsapp: shopWhatsapp.trim() || null,
        // Catalogue
        shopCategories: categories.length > 0 ? categories : null,
        // Flash
        flashSaleActive: flashActive,
        flashSaleLabel: flashActive ? flashLabel.trim() : null,
        flashSaleExpiry: flashActive && flashExpiry ? new Date(flashExpiry).toISOString() : null,
        // Magasin
        hasPhysicalShop: hasPhysical,
        shopAddress: hasPhysical ? shopAddress.trim() : null,
        shopHours: hasPhysical ? hours : null,
      } as any);

      await refreshUserProfile();
      setSaved(true);
      setTimeout(() => { setSaved(false); onSaved(); }, 1200);
    } catch (e: any) { setError(e.message || 'Erreur, réessaie.'); }
    finally { setLoading(false); }
  };

  const shopUrl = `brumerie.com/${slugify(username) || slugify(userProfile?.name || 'ma-boutique')}`;
  const flashExpired = flashExpiry && new Date(flashExpiry) < new Date();

  return (
    <div className="min-h-screen bg-slate-50 pb-28 font-sans">

      {/* HEADER */}
      <div className="bg-white sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={onBack}
          className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center active:scale-90">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-slate-900 text-[14px] uppercase tracking-tight">🏪 Ma Boutique</h1>
          <p className="text-[9px] text-green-600 font-bold">{shopUrl}</p>
        </div>
      </div>

      {/* APERÇU BOUTIQUE */}
      <div className="mx-4 mt-4 rounded-3xl overflow-hidden shadow-lg border border-slate-100 mb-4">
        <div className="relative h-24 flex items-center justify-center overflow-hidden"
          style={{ background: bannerPreview ? undefined : themeColor }}>
          {bannerPreview
            ? <img src={bannerPreview} alt="" className="w-full h-full object-cover"/>
            : <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Aperçu bannière</p>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"/>
          {flashActive && flashLabel && !flashExpired && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase animate-pulse">
              ⚡ {flashLabel}
            </div>
          )}
        </div>
        <div className="bg-white px-4 py-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-3 border-white shadow-md -mt-6 flex-shrink-0"
            style={{ borderColor: themeColor, borderWidth: 3 }}>
            {userProfile?.photoURL
              ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-white font-black text-lg"
                  style={{ background: themeColor }}>
                  {userProfile?.name?.charAt(0)?.toUpperCase()}
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-[13px]">{userProfile?.name}</p>
            {slogan
              ? <p className="text-[10px] font-bold truncate" style={{ color: themeColor }}>{slogan}</p>
              : <p className="text-[9px] text-slate-300 italic">Ton slogan ici...</p>
            }
            {categories.length > 0 && (
              <div className="flex gap-1 mt-1 overflow-x-auto">
                {categories.slice(0, 3).map(cat => (
                  <span key={cat} className="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                    style={{ background: themeColor + 'CC' }}>
                    {cat}
                  </span>
                ))}
                {categories.length > 3 && <span className="text-[7px] text-slate-400 flex-shrink-0">+{categories.length - 3}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
              {t.emoji}
            </button>
          ))}
        </div>
        <div className="flex justify-center mt-1">
          <p className="text-[9px] font-bold text-slate-400">{TABS.find(t => t.id === tab)?.label}</p>
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* ══ IDENTITÉ ══ */}
        {tab === 'identite' && (
          <>
            {/* Lien personnalisé */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">🔗 Ton lien boutique</p>
              <div className="flex items-center bg-slate-50 rounded-xl border-2 border-slate-100 focus-within:border-green-400 overflow-hidden transition-all">
                <span className="text-[10px] font-bold text-slate-400 pl-3 pr-1 flex-shrink-0">brumerie.com/</span>
                <input value={username}
                  onChange={e => setUsername(slugify(e.target.value))}
                  placeholder="ma-boutique"
                  className="flex-1 py-3 pr-3 bg-transparent text-[13px] font-black text-slate-900 outline-none"/>
              </div>
              <p className="text-[9px] text-slate-400 mt-1">Mets ce lien dans ta bio Instagram, statut WhatsApp, partout 👆</p>
            </div>

            {/* Couleur thème */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">🎨 Couleur de ta marque</p>
              <div className="grid grid-cols-5 gap-3">
                {THEME_COLORS.map(c => (
                  <button key={c.value} onClick={() => setThemeColor(c.value)}
                    className="flex flex-col items-center gap-1.5 active:scale-90 transition-all">
                    <div className="w-11 h-11 rounded-2xl shadow-sm transition-all flex items-center justify-center"
                      style={{
                        background: c.value,
                        boxShadow: themeColor === c.value ? `0 0 0 2px white, 0 0 0 4px ${c.value}` : undefined,
                      }}>
                      {themeColor === c.value && (
                        <svg width="16" height="16" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                      )}
                    </div>
                    <p className="text-[7px] font-bold text-slate-400 text-center leading-tight">{c.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Slogan + Bio */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">📝 Textes</p>
              <div>
                <p className="text-[9px] font-bold text-slate-500 mb-1.5">Slogan (60 car. max)</p>
                <input value={slogan} onChange={e => setSlogan(e.target.value)} maxLength={60}
                  placeholder="Ex: La mode à prix imbattable à Abidjan 🔥"
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400"/>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 mb-1.5">Description boutique</p>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={200}
                  placeholder="Présente ta boutique, ce que tu vends, ton quartier..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-[12px] outline-none focus:border-green-400 resize-none"/>
              </div>
            </div>

            {/* Réseaux sociaux */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">📱 Tes réseaux sociaux</p>
              {[
                { icon: '📸', label: 'Instagram', value: instagram, set: setInstagram, ph: '@ta_boutique' },
                { icon: '🎵', label: 'TikTok',    value: tiktok,    set: setTiktok,    ph: '@ta_boutique' },
                { icon: '💬', label: 'WhatsApp',  value: shopWhatsapp, set: setShopWhatsapp, ph: '0700000000' },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-3">
                  <span className="text-xl flex-shrink-0">{f.icon}</span>
                  <input value={f.value} onChange={e => f.set(e.target.value)}
                    placeholder={f.ph}
                    className="flex-1 px-3 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-[12px] outline-none focus:border-green-400"/>
                </div>
              ))}
            </div>

            {/* Bannière */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">🖼️ Photo de bannière</p>
              <label className={`block w-full rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer ${bannerPreview ? 'border-green-400' : 'border-slate-200'}`}>
                {bannerPreview
                  ? <img src={bannerPreview} alt="" className="w-full h-24 object-cover"/>
                  : <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <span className="text-3xl">🖼️</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Ajouter une bannière</p>
                    </div>
                }
                <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange}/>
              </label>
              {bannerPreview && (
                <button onClick={() => { setBannerPreview(''); setBannerFile(null); }}
                  className="text-[9px] text-red-400 font-bold uppercase mt-2 block">
                  Supprimer la bannière
                </button>
              )}
            </div>
          </>
        )}

        {/* ══ CATALOGUE / COLLECTIONS ══ */}
        {tab === 'catalogue' && (
          <>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Collections sélectionnées</p>
              <p className="text-[10px] text-slate-400 mb-3">Apparaissent comme filtres dans ta boutique</p>
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => toggleCategory(cat)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[10px] uppercase text-white active:scale-95 transition-all"
                      style={{ background: themeColor }}>
                      {cat}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_CATEGORIES.filter(c => !categories.includes(c)).map(cat => (
                  <button key={cat} onClick={() => toggleCategory(cat)}
                    className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-all">
                    + {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Catégorie personnalisée */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Créer une collection personnalisée</p>
              <div className="flex gap-2">
                <input value={customCat} onChange={e => setCustomCat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomCat()}
                  placeholder="Ex: Wax exclusif, Robes de soirée..."
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-[12px] outline-none focus:border-green-400"/>
                <button onClick={addCustomCat} disabled={!customCat.trim()}
                  className="px-4 py-3 rounded-xl bg-green-600 text-white font-black text-[10px] uppercase active:scale-95 disabled:opacity-40">
                  + Ajouter
                </button>
              </div>
              <p className="text-[9px] text-slate-400 mt-2">
                Tu pourras assigner chaque article à une collection lors de la publication.
              </p>
            </div>

            {/* Info */}
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex gap-3">
              <span className="text-xl flex-shrink-0">💡</span>
              <p className="text-[11px] text-green-700 leading-snug">
                Les collections permettent à tes clients de filtrer facilement tes articles — exactement comme les rayons d'un magasin. Un client qui cherche des "Pagnes" trouve directement sans scroller.
              </p>
            </div>
          </>
        )}

        {/* ══ VENTE FLASH ══ */}
        {tab === 'flash' && (
          <>
            {/* Toggle */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-black text-slate-900 text-[14px]">⚡ Activer une vente flash</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Affiche une bannière urgente sur ta boutique</p>
                </div>
                <button onClick={() => setFlashActive(v => !v)}
                  className={`w-14 h-7 rounded-full transition-all relative flex-shrink-0 ${flashActive ? 'bg-red-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${flashActive ? 'left-7' : 'left-0.5'}`}/>
                </button>
              </div>

              {flashActive && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Message de la vente flash</p>
                    <input value={flashLabel} onChange={e => setFlashLabel(e.target.value)} maxLength={50}
                      placeholder="Ex: SOLDES -30% ce weekend seulement 🔥"
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-red-400"/>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Date et heure de fin
                    </p>
                    <input type="datetime-local" value={flashExpiry}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={e => setFlashExpiry(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-red-400"/>
                  </div>
                  {flashExpiry && !flashExpired && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                      <p className="text-[11px] font-black text-red-700 animate-pulse">
                        ⚡ La vente flash sera visible jusqu'au {new Date(flashExpiry).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                  {flashExpired && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      <p className="text-[11px] font-black text-amber-700">⚠️ Cette vente flash est expirée. Change la date ou désactive.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Aperçu vente flash */}
            {flashActive && flashLabel && !flashExpired && (
              <div className="rounded-2xl p-4 border-2 border-red-300 bg-red-50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Aperçu sur ta boutique</p>
                <div className="bg-red-500 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <span className="text-white text-lg">⚡</span>
                  <p className="font-black text-white text-[12px]">{flashLabel}</p>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
              <span className="text-xl flex-shrink-0">💡</span>
              <p className="text-[11px] text-amber-700 leading-snug">
                Les ventes flash créent de l'urgence. En Afrique de l'Ouest, les promotions à durée limitée génèrent jusqu'à 3× plus de contacts que les annonces normales.
              </p>
            </div>
          </>
        )}

        {/* ══ MAGASIN PHYSIQUE ══ */}
        {tab === 'magasin' && (
          <>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-black text-slate-900 text-[14px]">🏠 J'ai un magasin physique</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Affiche tes infos boutique aux clients</p>
                </div>
                <button onClick={() => setHasPhysical(v => !v)}
                  className={`w-14 h-7 rounded-full transition-all relative flex-shrink-0 ${hasPhysical ? 'bg-green-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${hasPhysical ? 'left-7' : 'left-0.5'}`}/>
                </button>
              </div>

              {hasPhysical && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Adresse / Localisation</p>
                    <input value={shopAddress} onChange={e => setShopAddress(e.target.value)}
                      placeholder="Ex: Marché de Yopougon, rangée 3, stand 47"
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400"/>
                  </div>

                  {/* Horaires */}
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Horaires d'ouverture</p>
                    <div className="space-y-2">
                      {DAYS.map(day => (
                        <div key={day} className="flex items-center gap-3">
                          <p className="text-[10px] font-black text-slate-600 w-20 capitalize flex-shrink-0">{day}</p>
                          <input value={hours[day] || ''}
                            onChange={e => setHours(h => ({ ...h, [day]: e.target.value }))}
                            placeholder="Ex: 8h-18h ou Fermé"
                            className="flex-1 px-3 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[11px] outline-none focus:border-green-400"/>
                        </div>
                      ))}
                    </div>
                    {/* Raccourcis */}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => {
                        const h: Partial<Record<Day, string>> = {};
                        DAYS.forEach(d => { h[d] = d === 'dimanche' ? 'Fermé' : '8h-18h'; });
                        setHours(h);
                      }} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-[9px] uppercase active:scale-95">
                        Standard 8h-18h
                      </button>
                      <button onClick={() => setHours({})}
                        className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-[9px] uppercase active:scale-95">
                        Effacer tout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {hasPhysical && shopAddress && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Aperçu sur ta boutique</p>
                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span>📍</span>
                    <p className="text-[11px] text-slate-700 font-bold">{shopAddress}</p>
                  </div>
                  {Object.entries(hours).filter(([, v]) => v).slice(0, 3).map(([day, val]) => (
                    <div key={day} className="flex gap-2">
                      <p className="text-[10px] text-slate-400 w-20 capitalize">{day}</p>
                      <p className="text-[10px] font-bold text-slate-700">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
              <span className="text-xl flex-shrink-0">💡</span>
              <p className="text-[11px] text-blue-700 leading-snug">
                Afficher ton magasin physique rassure les clients et augmente les visites. Les vendeurs avec boutique physique visible reçoivent 2× plus de contacts.
              </p>
            </div>
          </>
        )}

        {/* ERREUR */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
            <p className="text-[11px] font-bold text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* CTA FIXE */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-50 p-4">
        <button onClick={handleSave} disabled={loading}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[12px] text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl"
          style={{ background: `linear-gradient(135deg, ${themeColor}dd, ${themeColor})`, boxShadow: `0 12px 30px ${themeColor}40` }}>
          {loading
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Enregistrement...</span>
            : saved ? '✅ Boutique sauvegardée !'
            : '💾 Sauvegarder ma boutique'
          }
        </button>
      </div>
    </div>
  );
}
