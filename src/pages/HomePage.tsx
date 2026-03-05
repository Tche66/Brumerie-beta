import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { ProductSkeleton } from '@/components/ProductSkeleton';
import { getProducts } from '@/services/productService';
import { addBookmark, removeBookmark } from '@/services/bookmarkService';
import { FilterDrawer, FilterState, DEFAULT_FILTERS } from '@/components/FilterDrawer';
import { SearchAlertButton } from '@/components/SearchAlertButton';
import { useAuth } from '@/contexts/AuthContext';
import { Product, CATEGORIES, NEIGHBORHOODS } from '@/types';
import { subscribeBoostedProductIds } from '@/services/boostService';
import { StoriesBar } from '@/components/StoriesBar';
import { SystemBanner } from '@/components/SystemBanner';

interface HomePageProps {
  onProductClick: (product: Product) => void;
  isGuest?: boolean;
  onGuestAction?: (reason: string) => void;
  onProfileClick: () => void;
  onNotificationsClick?: () => void;
  onLogoClick?: () => void;
}


const TrustBadges = () => (
  <div className="flex gap-2 mt-5 flex-wrap">
    <div className="trust-badge">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>
      </svg>
      Identité vérifiable
    </div>
    <div className="trust-badge">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      Chat Direct
    </div>
    <div className="trust-badge">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
      Mobile Money très bientôt
    </div>
  </div>
);

export function HomePage({ onProductClick, onProfileClick, onNotificationsClick, onLogoClick, isGuest, onGuestAction }: HomePageProps) {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [boostedIds, setBoostedIds] = useState<Set<string>>(new Set());

  // Écouter les produits boostés
  useEffect(() => {
    return subscribeBoostedProductIds(setBoostedIds);
  }, []);

  // ✅ Favoris directement depuis userProfile — toujours à jour
  const bookmarkIds = new Set(userProfile?.bookmarkedProductIds || []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      let data = await getProducts({
        category: filters.category !== 'all' ? filters.category : undefined,
        neighborhood: filters.neighborhood !== 'all' ? filters.neighborhood : undefined,
        searchTerm: searchTerm || undefined,
      });
      // Filtres côté client (prix, condition, tri)
      if (filters.priceMin) data = data.filter(p => p.price >= Number(filters.priceMin));
      if (filters.priceMax) data = data.filter(p => p.price <= Number(filters.priceMax));
      if (filters.condition !== 'all') data = data.filter(p => p.condition === filters.condition);
      if (filters.sortBy === 'price_asc')  data = [...data].sort((a,b) => a.price - b.price);
      if (filters.sortBy === 'price_desc') data = [...data].sort((a,b) => b.price - a.price);
      if (filters.sortBy === 'promo')      data = [...data].filter(p => p.originalPrice && p.originalPrice > p.price);
      setProducts(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters, searchTerm]);

  useEffect(() => {
    const t = setTimeout(loadProducts, 300);
    return () => clearTimeout(t);
  }, [loadProducts]);

  const handleBookmark = async (productId: string) => {
    if (!currentUser) return;
    const isCurrentlyBookmarked = bookmarkIds.has(productId);
    try {
      if (isCurrentlyBookmarked) {
        await removeBookmark(currentUser.uid, productId);
      } else {
        await addBookmark(currentUser.uid, productId);
      }
      // Rafraîchir le profil pour mettre à jour les bookmarks dans le contexte
      await refreshUserProfile();
    } catch (err) {
      console.error('[HomePage] bookmark error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      <Header onProfileClick={onProfileClick} onSearchChange={setSearchTerm} searchTerm={searchTerm} onNotificationsClick={onNotificationsClick} onLogoClick={onLogoClick} />

      {/* Bannière système admin */}
      <SystemBanner />

      {/* Stories — barre horizontale comme Instagram */}
      <StoriesBar />

      {/* Barre de filtres rapides */}
      <div className="px-5 pt-3 pb-1 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <button onClick={() => setShowFilters(true)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border-2 font-bold text-[11px] transition-all active:scale-95"
          style={{
            borderColor: Object.values(filters).some((v, i) => v !== Object.values(DEFAULT_FILTERS)[i]) ? '#16A34A' : '#E2E8F0',
            background:  Object.values(filters).some((v, i) => v !== Object.values(DEFAULT_FILTERS)[i]) ? '#F0FDF4' : '#F8FAFC',
            color:       Object.values(filters).some((v, i) => v !== Object.values(DEFAULT_FILTERS)[i]) ? '#16A34A' : '#64748B',
          }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          Filtres
          {Object.entries(filters).filter(([k,v]) => v !== (DEFAULT_FILTERS as any)[k]).length > 0 && (
            <span className="bg-green-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {Object.entries(filters).filter(([k,v]) => v !== (DEFAULT_FILTERS as any)[k]).length}
            </span>
          )}
        </button>

        {/* Pill tri actif */}
        {filters.sortBy !== 'recent' && (
          <span className="flex-shrink-0 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-full">
            {filters.sortBy === 'price_asc' ? '💰 Prix ↑' : filters.sortBy === 'price_desc' ? '💎 Prix ↓' : '🔥 Promos'}
          </span>
        )}
        {(filters.priceMin || filters.priceMax) && (
          <span className="flex-shrink-0 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-full">
            {filters.priceMin && filters.priceMax ? `${Number(filters.priceMin)/1000}K–${Number(filters.priceMax)/1000}K FCFA`
              : filters.priceMin ? `+${Number(filters.priceMin)/1000}K FCFA` : `-${Number(filters.priceMax)/1000}K FCFA`}
          </span>
        )}
        {filters.condition !== 'all' && (
          <span className="flex-shrink-0 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-full">
            {filters.condition === 'new' ? '🟢 Neuf' : filters.condition === 'like_new' ? '🔵 Comme neuf' : '🟡 Occasion'}
          </span>
        )}
        {Object.values(filters).some((v, i) => v !== Object.values(DEFAULT_FILTERS)[i]) && (
          <button onClick={() => setFilters(DEFAULT_FILTERS)}
            className="flex-shrink-0 text-[10px] font-black text-red-400 px-3 py-1.5 rounded-full bg-red-50 active:scale-95">
            ✕ Reset
          </button>
        )}
      </div>

      {/* Bouton alerte de recherche — affiché quand il y a un terme de recherche */}
      {searchTerm.trim().length >= 2 && (
        <div className="px-5 pb-2 flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">
            {products.length} résultat{products.length !== 1 ? 's' : ''} pour <strong className="text-slate-700">"{searchTerm}"</strong>
          </span>
          <div className="ml-auto">
            <SearchAlertButton keyword={searchTerm} />
          </div>
        </div>
      )}

      {/* FilterDrawer */}
      <FilterDrawer
        visible={showFilters}
        filters={filters}
        onApply={f => { setFilters(f); }}
        onClose={() => setShowFilters(false)}
      />

      {/* Hero */}
      {!searchTerm && (
        <div className="px-5 pt-6 animate-fade-in">
          <div className="rounded-[3rem] p-8 overflow-hidden relative shadow-2xl shadow-green-100"
            style={{ background: 'linear-gradient(135deg, #16A34A 0%, #115E2E 100%)' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-bold text-white uppercase tracking-[0.2em]">
                  🇨🇮 Abidjan · En direct
                </span>
              </div>
              <h2 className="text-white font-black leading-tight tracking-tight" style={{ fontSize: '2rem' }}>
                Trouve ton bonheur à Babi 🤩
              </h2>
              <p className="text-green-50 text-[11px] font-bold mt-3 uppercase tracking-[0.1em] opacity-80">
                {products.length} pépites dénichées
              </p>
              <TrustBadges />
            </div>
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute right-6 top-6 opacity-40 select-none pointer-events-none">
              <span style={{ fontSize: '52px', lineHeight: 1 }}>🇨🇮</span>
            </div>
          </div>
        </div>
      )}

      {/* Catégories */}
      <div className="mt-8">
        <div className="px-6 mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Catégories</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto px-5 pb-4 scrollbar-hide">
          {ALL_CATEGORIES.map((cat) => {
            const isActive = filters.category === cat.id;
            return (
              <button key={cat.id} onClick={() => setFilters(f => ({ ...f, category: cat.id }))}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-bold transition-all ${isActive ? 'bg-slate-900 text-white shadow-lg -translate-y-0.5' : 'bg-slate-50 text-slate-500'}`}>
                {cat.icon && <span>{cat.icon}</span>}
                <span className="uppercase tracking-wider">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quartiers */}
      <div className="mt-2">
        <div className="flex items-center justify-between px-6 mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">À proximité</h3>
          {filters.neighborhood !== 'all' && (
            <button onClick={() => setFilters(f => ({ ...f, neighborhood: 'all' }))} className="text-[9px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full">
              Effacer
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto px-5 pb-3 scrollbar-hide">
          <button onClick={() => setFilters(f => ({ ...f, neighborhood: 'all' }))}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border-2 transition-all ${filters.neighborhood === 'all' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>
            Tout Abidjan
          </button>
          {NEIGHBORHOODS.map((n) => (
            <button key={n} onClick={() => setFilters(f => ({ ...f, neighborhood: n }))}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border-2 transition-all ${filters.neighborhood === n ? 'border-green-600 bg-green-50 text-green-700 shadow-md' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Grille produits */}
      <div className="px-5 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Derniers arrivages</h3>
          <div className="h-[2px] flex-1 mx-4 bg-slate-50 rounded-full" />
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-4">{[1,2,3,4,5,6].map(i => <ProductSkeleton key={i} />)}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 px-10 bg-slate-50 rounded-[3rem] border-4 border-dashed border-white">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 mb-2">Aucun article trouvé</p>
            <p className="text-[10px] font-bold text-slate-400">Sois le premier à publier !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 animate-fade-up">
            {[...products]
              .sort((a, b) => (boostedIds.has(b.id) ? 1 : 0) - (boostedIds.has(a.id) ? 1 : 0))
              .map((product) => (
              <ProductCard key={product.id} product={product}
                onClick={() => onProductClick(product)}
                onBookmark={handleBookmark}
                isBookmarked={bookmarkIds.has(product.id)}
                isBoosted={boostedIds.has(product.id)}
              />
            ))}
          </div>
        )}
      </div>
      <div className="h-16" />
    </div>
  );
}
