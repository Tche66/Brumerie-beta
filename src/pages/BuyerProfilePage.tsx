// src/pages/BuyerProfilePage.tsx — Profil dédié Acheteur
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProductCard } from '@/components/ProductCard';
import { removeBookmark } from '@/services/bookmarkService';
import { getProducts } from '@/services/productService';
import { Product } from '@/types';

interface BuyerProfilePageProps {
  onProductClick: (product: Product) => void;
  onNavigate?: (page: string) => void;
}

export function BuyerProfilePage({ onProductClick, onNavigate }: BuyerProfilePageProps) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [bookmarkedProducts, setBookmarkedProducts] = useState<Product[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'favorites'>('favorites');

  useEffect(() => {
    loadBookmarks();
  }, [userProfile?.bookmarkedProductIds]);

  async function loadBookmarks() {
    setLoading(true);
    try {
      // ✅ Depuis userProfile directement
      const ids = userProfile?.bookmarkedProductIds || [];
      setBookmarkIds(new Set(ids));
      if (ids.length > 0) {
        const all = await getProducts();
        setBookmarkedProducts(all.filter(p => ids.includes(p.id)));
      } else {
        setBookmarkedProducts([]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const handleRemoveBookmark = async (id: string) => {
    if (!currentUser) return;
    await removeBookmark(currentUser.uid, id);
    await refreshUserProfile(); // Synchro immédiate
  };

  if (!userProfile) return null;

  const memberSince = (() => {
    try {
      const d = userProfile.createdAt?.toDate ? userProfile.createdAt.toDate() : new Date(userProfile.createdAt);
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch { return ''; }
  })();

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">

      {/* Bouton Paramètres */}
      <button onClick={() => onNavigate?.('settings')} className="settings-gear-btn" title="Paramètres">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {/* Hero Acheteur — fond bleu doux */}
      <div className="px-6 pt-14 pb-8" style={{ background: 'linear-gradient(160deg, #EFF6FF 0%, #FFFFFF 100%)' }}>
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-[2.6rem] overflow-hidden border-[6px] border-white shadow-2xl">
              <img
                src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${userProfile.name}&background=EFF6FF&color=3B82F6`}
                alt={userProfile.name} className="w-full h-full object-cover"
              />
            </div>
            {/* Badge Acheteur */}
            <div className="absolute -bottom-1 -right-1 border-4 border-white rounded-full shadow-lg"
              style={{ width: 26, height: 26, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">{userProfile.name}</h1>

          {/* Badge mode */}
          <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest mb-2">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Mode Acheteur
          </span>

          {memberSince && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Membre depuis {memberSince}</p>}
          {userProfile.neighborhood && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#94A3B8"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>
              {userProfile.neighborhood}
            </p>
          )}
        </div>

        {/* Stats Acheteur */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-white rounded-2xl p-4 text-center border border-blue-100 shadow-sm">
            <p className="price-brumerie text-2xl text-blue-600">{bookmarkIds.size}</p>
            <p className="text-[9px] font-bold uppercase text-slate-400">Favoris</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center border border-slate-100 shadow-sm">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#16A34A">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                <path d="M11.99 2C6.465 2 2.011 6.46 2.011 11.985a9.916 9.916 0 001.337 5.003L2 22l5.16-1.321a9.955 9.955 0 004.83 1.24c5.524 0 9.979-4.452 9.979-9.977A9.97 9.97 0 0011.99 2z"/>
              </svg>
            </div>
            <p className="text-[9px] font-bold uppercase text-slate-400">WhatsApp prêt</p>
          </div>
        </div>
      </div>

      {/* Tab Favoris */}
      <div className="px-6 mt-6 mb-4">
        <div className="flex items-center gap-2 mb-5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1D9BF0">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Mes Favoris</h2>
          <span className="ml-auto bg-blue-50 text-blue-600 text-[9px] font-black px-3 py-1 rounded-full">{bookmarkIds.size}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-slate-50 rounded-[2.5rem] animate-pulse" />)}
          </div>
        ) : bookmarkedProducts.length === 0 ? (
          <div className="text-center py-16 bg-blue-50/50 rounded-[2.5rem] border-2 border-dashed border-blue-100">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aucun favori</p>
            <p className="text-[9px] text-slate-300 mt-2 px-4">Appuie sur le signet d'une annonce pour l'enregistrer ici</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {bookmarkedProducts.map(product => (
              <ProductCard key={product.id} product={product}
                onClick={() => onProductClick(product)}
                onBookmark={handleRemoveBookmark}
                isBookmarked={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bouton passer en mode Vendeur */}
      <div className="px-6 mt-8 mb-4 space-y-3">
        <button onClick={() => onNavigate?.('edit-profile')}
          className="btn-secondary-custom w-full py-4 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em]">
          Modifier mon profil
        </button>
        <button onClick={() => onNavigate?.('switch-to-seller')}
          className="w-full py-4 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em] border-2 border-green-200 text-green-700 bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          Passer en mode Vendeur
        </button>
      </div>
    </div>
  );
}
