import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { ProductSkeleton } from '@/components/ProductSkeleton';
import { getProducts, getProductsPage, PRODUCTS_PER_PAGE } from '@/services/productService';
import { addBookmark, removeBookmark } from '@/services/bookmarkService';
import { FilterDrawer, FilterState, DEFAULT_FILTERS } from '@/components/FilterDrawer';
import { SearchAlertButton } from '@/components/SearchAlertButton';
import { useAuth } from '@/contexts/AuthContext';
import { Product, CATEGORIES, NEIGHBORHOODS } from '@/types';
import { useAppConfig } from '@/hooks/useAppConfig';
import { subscribeBoostedProductIds } from '@/services/boostService';
import { StoriesBar } from '@/components/StoriesBar';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SystemBanner } from '@/components/SystemBanner';

interface HomePageProps {
  onProductClick: (product: Product) => void;
  isGuest?: boolean;
  onGuestAction?: (reason: string) => void;
  onProfileClick: () => void;
  onNotificationsClick?: () => void;
  onLogoClick?: () => void;
  onOpenChatWithSeller?: (sellerId: string, sellerName: string, productId?: string, productTitle?: string) => void;
  onNavigateToVerification?: () => void;
  onNavigateToChat?: () => void;
  onOrderFromStory?: (productRef: { id: string; title: string; price: number; imageUrl?: string }, sellerId: string, sellerName: string) => void;
  onOfferFromStory?: (productRef: { id: string; title: string; price: number; imageUrl?: string }, sellerId: string, sellerName: string) => void;
}


interface HeroBadgesProps {
  onNavigateToVerification?: () => void;
  onNavigateToChat?: () => void;
  isGuest?: boolean;
  onGuestAction?: (reason: string) => void;
  productCount?: number;
}

const HeroBadges = ({ onNavigateToVerification, onNavigateToChat, isGuest, onGuestAction, productCount = 0 }: HeroBadgesProps) => (
  <div className="flex gap-2 mt-5 flex-wrap">
    <button
      onClick={() => isGuest ? onGuestAction?.('verification') : onNavigateToVerification?.()}
      className="trust-badge active:scale-95 transition-all cursor-pointer">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>
      </svg>
      Identité vérifiable
    </button>
    <button
      onClick={() => isGuest ? onGuestAction?.('chat') : onNavigateToChat?.()}
      className="trust-badge active:scale-95 transition-all cursor-pointer">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      Chat Direct
    </button>
    <div className="trust-badge">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      Livraison locale
    </div>
  </div>
);

export function HomePage({ onProductClick, onProfileClick, onNotificationsClick, onLogoClick, isGuest, onGuestAction, onOpenChatWithSeller, onOrderFromStory, onOfferFromStory, onNavigateToVerification, onNavigateToChat }: HomePageProps) {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const appConfig = useAppConfig();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [boostedIds, setBoostedIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [neighborhoodSellerCount, setNeighborhoodSellerCount] = useState<number>(0);

  // Catégories et quartiers enrichis avec les custom (ajoutés via Suggestions)
  const ALL_CATEGORIES = [
    { id: 'all', label: 'Tout', icon: '🏪' },
    ...CATEGORIES,
    ...(appConfig.customCategories || []).map((label, i) => ({ id: `custom_${i}`, label, icon: '🏷️' })),
  ];
  const ALL_NEIGHBORHOODS = [
    ...NEIGHBORHOODS,
    ...(appConfig.customNeighborhoods || []),
  ];

  // Écouter les produits boostés
  useEffect(() => {
    return subscribeBoostedProductIds(setBoostedIds);
  }, []);

  // ── Texte hero modifiable depuis admin ──
  const [heroText, setHeroText] = useState('Trouve ton bonheur à Babi 🤩');
  const [heroBannerUrl, setHeroBannerUrl] = useState('');
  const [heroBannerExpiry, setHeroBannerExpiry] = useState<number | null>(null);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'homeConfig'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.heroText) setHeroText(d.heroText);
        if (d.heroBannerUrl) {
          const expiry = d.heroBannerExpiry?.toMillis?.() || 0;
          if (expiry === 0 || expiry > Date.now()) {
            setHeroBannerUrl(d.heroBannerUrl);
            setHeroBannerExpiry(expiry || null);
          } else {
            setHeroBannerUrl(''); // bannière expirée → retour texte
          }
        } else {
          setHeroBannerUrl('');
        }
      }
    });
    return unsub;
  }, []);

  // ✅ Favoris directement depuis userProfile — toujours à jour
  const bookmarkIds = new Set(userProfile?.bookmarkedProductIds || []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setLastDoc(null);
    setHasMore(false);
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
    } catch (e) {
      console.error(e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);
    try {
      const result = await getProductsPage(lastDoc, {
        category: filters.category !== 'all' ? filters.category : undefined,
        neighborhood: filters.neighborhood !== 'all' ? filters.neighborhood : undefined,
      });
      setProducts(prev => {
        const ids = new Set(prev.map(p => p.id));
        const news = result.products.filter(p => !ids.has(p.id));
        return [...prev, ...news];
      });
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (e) { console.error(e); }
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, lastDoc, filters]);

  useEffect(() => {
    const t = setTimeout(loadProducts, 300);
    return () => clearTimeout(t);
  }, [loadProducts]);

  // Compter les vendeurs dans le même quartier que l'utilisateur
  useEffect(() => {
    if (!userProfile?.neighborhood || products.length === 0) return;
    const userNeighborhood = userProfile.neighborhood.trim().toLowerCase();
    // Collecter les sellerIds uniques ayant au moins un produit dans ce quartier
    const sellerIds = new Set<string>();
    products.forEach(p => {
      const pNeighborhood = (p.neighborhood || '').trim().toLowerCase();
      if (pNeighborhood === userNeighborhood && p.sellerId) {
        sellerIds.add(p.sellerId);
      }
    });
    // Exclure le vendeur courant lui-même
    if (userProfile?.uid) sellerIds.delete(userProfile.uid);
    setNeighborhoodSellerCount(sellerIds.size);
  }, [products, userProfile?.neighborhood, userProfile?.uid]);

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
      <StoriesBar onSellerClick={onOpenChatWithSeller ? (sellerId) => onOpenChatWithSeller(sellerId, '') : undefined} onOpenChatWithSeller={onOpenChatWithSeller} onOrderFromStory={onOrderFromStory} onOfferFromStory={onOfferFromStory} />

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
        customCategories={appConfig.customCategories || []}
        customNeighborhoods={appConfig.customNeighborhoods || []}
      />

      {/* Ancrage local — vendeurs dans le même quartier */}
      {!searchTerm && userProfile?.neighborhood && neighborhoodSellerCount > 0 && (
        <button
          onClick={() => setFilters(f => ({ ...f, neighborhood: userProfile.neighborhood }))}
          className="mx-5 mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl w-[calc(100%-2.5rem)] active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1.5px solid #BBF7D0' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#16A34A22' }}>
            <span style={{ fontSize: 18 }}>📍</span>
          </div>
          <div className="flex-1 text-left">
            <p className="font-black text-slate-900 text-[12px] leading-tight">
              {neighborhoodSellerCount} vendeur{neighborhoodSellerCount > 1 ? 's' : ''} actif{neighborhoodSellerCount > 1 ? 's' : ''} à {userProfile.neighborhood}
            </p>
            <p className="text-[10px] font-bold text-green-700 mt-0.5">
              Appuie pour voir leurs articles →
            </p>
          </div>
        </button>
      )}

      {/* Hero */}
      {!searchTerm && (
        <div className="px-5 pt-6 animate-fade-in">
          <div className="rounded-[3rem] overflow-hidden relative shadow-2xl shadow-green-100"
            style={{ background: 'linear-gradient(135deg, #16A34A 0%, #115E2E 100%)' }}>
            {/* Bannière image admin — si active remplace le fond vert */}
            {heroBannerUrl ? (
              <div className="relative">
                <img src={heroBannerUrl} alt="Bannière Brumerie" className="w-full object-cover" style={{ maxHeight: 220 }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white font-black text-[11px] uppercase tracking-[0.2em] mb-1">🇨🇮 Abidjan · En direct</p>
                  <h2 className="text-white font-black leading-tight tracking-tight" style={{ fontSize: '1.6rem' }}>{heroText}</h2>
                  <p className="text-white/80 text-[11px] font-bold mt-2 uppercase tracking-[0.1em]">{products.length} pépites dénichées</p>
                  <HeroBadges onNavigateToVerification={onNavigateToVerification} onNavigateToChat={onNavigateToChat} isGuest={isGuest} onGuestAction={onGuestAction} productCount={products.length} />
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-bold text-white uppercase tracking-[0.2em]">
                      🇨🇮 Abidjan · En direct
                    </span>
                  </div>
                  <h2 className="text-white font-black leading-tight tracking-tight" style={{ fontSize: '2rem' }}>
                    {heroText}
                  </h2>
                  <p className="text-green-50 text-[11px] font-bold mt-3 uppercase tracking-[0.1em] opacity-80">
                    {products.length} pépites dénichées
                  </p>
                  <HeroBadges onNavigateToVerification={onNavigateToVerification} onNavigateToChat={onNavigateToChat} isGuest={isGuest} onGuestAction={onGuestAction} productCount={products.length} />
                </div>
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute right-6 top-6 opacity-40 select-none pointer-events-none">
                  <span style={{ fontSize: '52px', lineHeight: 1 }}>🇨🇮</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRUST BAR — Réassurance acheteur/vendeur ── */}
      {!searchTerm && (
        <div className="flex gap-3 overflow-x-auto px-5 pt-5 pb-1 scrollbar-hide">
          {[
            { icon: '🛡️', title: 'Achat protégé', sub: 'Signalement en 1 clic' },
            { icon: '✅', title: 'Vendeurs vérifiés', sub: 'Identité contrôlée' },
            { icon: '📦', title: 'Livraison locale', sub: 'Dans ton quartier' },
            { icon: '💬', title: 'Chat direct', sub: 'Répond en quelques min' },
            { icon: '💰', title: 'Mobile Money', sub: 'Wave · Orange · MTN' },
          ].map(item => (
            <div key={item.title} className="flex-shrink-0 flex items-center gap-2.5 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-[10px] font-black text-slate-900 whitespace-nowrap">{item.title}</p>
                <p className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{item.sub}</p>
              </div>
            </div>
          ))}
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
          {ALL_NEIGHBORHOODS.map((n) => (
            <button key={n} onClick={() => setFilters(f => ({ ...f, neighborhood: n }))}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border-2 transition-all ${filters.neighborhood === n ? 'border-green-600 bg-green-50 text-green-700 shadow-md' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* ── BANNIÈRE ADDRESS-WEB ── Canal de pub permanent ── */}
      {!searchTerm && (
        <div className="mx-4 mt-4 mb-2 rounded-[1.8rem] overflow-hidden shadow-lg"
          style={{ background: 'linear-gradient(135deg,#0EA5E9,#0369A1)' }}>
          <div className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl">
              📍
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-[11px] leading-tight">
                Tu as une adresse numérique ?
              </p>
              <p className="text-white/75 text-[9px] font-medium mt-0.5 leading-tight">
                Address-Web : reçois des livraisons n'importe où en Afrique sans adresse postale
              </p>
            </div>
            <a href="https://addressweb.brumerie.com" target="_blank" rel="noopener noreferrer"
              className="flex-shrink-0 bg-white text-sky-700 font-black text-[8px] uppercase tracking-widest px-3 py-2 rounded-xl active:scale-90 transition-all">
              Essayer →
            </a>
          </div>
        </div>
      )}

      {/* ── CTA VENDRE — Conversion vendeur en contexte ── */}
      {!searchTerm && !userProfile?.role?.includes('seller') && (
        <div className="mx-5 mt-4">
          <div className="rounded-[2rem] overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, #1A1A18 0%, #2d2d2a 100%)' }}>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] mb-1">💡 Vendeurs d'Abidjan</p>
                <p className="text-white font-black text-[14px] leading-tight">Ta boutique en ligne<br/>gratuite t'attend.</p>
                <p className="text-slate-400 text-[10px] mt-1">Vends. Sois payé. Livre. Tout en un.</p>
              </div>
              <div className="flex-shrink-0">
                <div className="bg-green-500 rounded-2xl px-4 py-3 flex items-center gap-1.5 shadow-lg shadow-green-900/30">
                  <span className="text-white font-black text-[11px] uppercase tracking-wide">Commencer</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ARTICLES LES PLUS CONSULTÉS — Social proof dynamique ── */}
      {!searchTerm && products.filter(p => (p.viewCount || 0) > 0 || (p.whatsappClickCount || 0) > 0).length >= 3 && (
        <div className="mt-8">
          <div className="px-5 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-base">🔥</span>
              <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-tight">Tendances maintenant</h3>
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-full">
              Les + vus
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide">
            {[...products]
              .sort((a, b) => ((b.viewCount || 0) + (b.whatsappClickCount || 0) * 3) - ((a.viewCount || 0) + (a.whatsappClickCount || 0) * 3))
              .slice(0, 8)
              .map(product => {
                const imgSrc = product.images?.[0] || (product as any).imageUrl;
                const heat = (product.viewCount || 0) + (product.whatsappClickCount || 0) * 3;
                return (
                  <button key={product.id} onClick={() => onProductClick(product)}
                    className="flex-shrink-0 w-36 bg-white rounded-[1.5rem] overflow-hidden border border-slate-100 shadow-sm active:scale-95 transition-all text-left">
                    <div className="relative aspect-square bg-slate-50 overflow-hidden">
                      <img src={imgSrc} alt={product.title} className="w-full h-full object-cover" />
                      {heat > 5 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-lg">
                          🔥 {heat > 20 ? 'Très demandé' : 'Populaire'}
                        </span>
                      )}
                      {product.sellerVerified && (
                        <span className="absolute bottom-2 right-2 bg-green-600 rounded-lg w-5 h-5 flex items-center justify-center">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></svg>
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[11px] font-black text-slate-900">{product.price.toLocaleString('fr-FR')} <span className="text-[9px] font-bold text-slate-400">FCFA</span></p>
                      <p className="text-[9px] font-bold text-slate-500 truncate mt-0.5">{product.title}</p>
                      {product.whatsappClickCount && product.whatsappClickCount > 0 && !product.hideStats ? (
                        <p className="text-[8px] font-black text-green-600 mt-1">💬 {product.whatsappClickCount} contact{product.whatsappClickCount > 1 ? 's' : ''}</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Grille produits */}
      <div className="px-5 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Derniers arrivages</h3>
          <div className="h-[2px] flex-1 mx-4 bg-slate-50 rounded-full" />
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-4">{[1,2,3,4,5,6].map(i => <ProductSkeleton key={i} />)}</div>
        ) : loadError ? (
          <div className="text-center py-16 px-8 bg-red-50 rounded-[3rem] border-2 border-red-100">
            <div className="text-4xl mb-3">😕</div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-700 mb-2">Impossible de charger</p>
            <p className="text-[10px] font-bold text-red-400 mb-5">Vérifie ta connexion internet</p>
            <button onClick={loadProducts}
              className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl active:scale-95 transition-all">
              🔄 Réessayer
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 px-10 bg-slate-50 rounded-[3rem] border-4 border-dashed border-white">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 mb-2">Aucun article trouvé</p>
            <p className="text-[10px] font-bold text-slate-400">
              {searchTerm || filters.category !== 'all' || filters.neighborhood !== 'all'
                ? 'Essaie de modifier tes filtres'
                : 'Sois le premier à publier !'}
            </p>
          </div>
        ) : (
          <>
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

            {/* Bouton Voir plus */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button onClick={loadMore} disabled={loadingMore}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white disabled:opacity-60 active:scale-95 transition-all shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
                  {loadingMore ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Chargement...</span></>
                  ) : (
                    <>📦 Voir plus d'articles</>
                  )}
                </button>
              </div>
            )}

            {/* Fin de liste */}
            {!hasMore && products.length > 10 && (
              <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest py-6">
                — {products.length} articles affichés —
              </p>
            )}
          </>
        )}
      </div>
      <div className="h-16" />
    </div>
  );
}
