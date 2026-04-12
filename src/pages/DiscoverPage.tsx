// src/pages/DiscoverPage.tsx — v19 : Page Découvrir (acheteur uniquement)
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProducts } from '@/services/productService';
import { ProductCard } from '@/components/ProductCard';
import { addBookmark, removeBookmark } from '@/services/bookmarkService';
import { Product, CATEGORIES, NEIGHBORHOODS } from '@/types';
import { useAppConfig } from '@/hooks/useAppConfig';

interface DiscoverPageProps {
  onProductClick: (product: Product) => void;
  onSellerClick?: (sellerId: string) => void;
}

function timeAgo(ts: any): string {
  if (!ts) return '';
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 3600) return 'il y a ' + Math.floor(diff / 60) + ' min';
    if (diff < 86400) return 'il y a ' + Math.floor(diff / 3600) + 'h';
    return 'il y a ' + Math.floor(diff / 86400) + 'j';
  } catch { return ''; }
}

export function DiscoverPage({ onProductClick, onSellerClick }: DiscoverPageProps) {
  const { userProfile, currentUser } = useAuth();
  const appConfig = useAppConfig();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Catégories enrichies avec les custom
  const allCustomCategories = [
    ...CATEGORIES,
    ...(appConfig.customCategories || []).map((label, i) => ({ id: `custom_${i}`, label, icon: '🏷️' })),
  ];

  useEffect(() => {
    setBookmarkIds(new Set(userProfile?.bookmarkedProductIds || []));
  }, [userProfile?.bookmarkedProductIds]);

  useEffect(() => {
    getProducts().then(data => {
      setAllProducts(data.filter(p => p.status === 'active'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleBookmark = async (productId: string) => {
    if (!currentUser) return;
    if (bookmarkIds.has(productId)) {
      await removeBookmark(currentUser.uid, productId);
      setBookmarkIds(prev => { const s = new Set(prev); s.delete(productId); return s; });
    } else {
      await addBookmark(currentUser.uid, productId);
      setBookmarkIds(prev => new Set([...prev, productId]));
    }
  };

  // Produits filtrés par catégorie
  const filtered = allProducts.filter(p => {
    const matchCat = !activeCategory || p.category === activeCategory;
    const matchSearch = !searchTerm || 
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  // Sections calculées
  const newArrivals  = [...allProducts]
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .slice(0, 6);

  const promos = allProducts
    .filter(p => p.originalPrice && p.originalPrice > p.price)
    .slice(0, 6);

  const verifiedSellers = allProducts
    .filter(p => p.sellerVerified)
    .reduce((acc: { sellerId: string; sellerName: string; sellerPhoto?: string; neighborhood?: string; count: number }[], p) => {
      const existing = acc.find(s => s.sellerId === p.sellerId);
      if (existing) { existing.count++; }
      else acc.push({ sellerId: p.sellerId, sellerName: p.sellerName || '', sellerPhoto: p.sellerPhoto, neighborhood: p.neighborhood, count: 1 });
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Quartier de l'utilisateur en priorité
  const localProducts = userProfile?.neighborhood
    ? allProducts.filter(p => p.neighborhood === userProfile.neighborhood).slice(0, 6)
    : [];

  const neighborhood = userProfile?.neighborhood;

  if (loading) return (
    <div className="min-h-screen bg-white pb-24 pt-14 px-4">
      <div className="animate-pulse space-y-6">
        <div className="h-6 bg-slate-100 rounded-full w-1/2 mx-auto" />
        <div className="flex gap-3 overflow-hidden">
          {[1,2,3,4].map(i => <div key={i} className="w-24 h-8 bg-slate-100 rounded-2xl flex-shrink-0" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-slate-100 rounded-[2.5rem]" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 font-sans" style={{ background: '#F8FAFC' }}>

      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="font-black text-slate-900 text-[20px] uppercase tracking-tight">Découvrir</h1>
            <p className="text-[10px] text-slate-400 font-bold">
              {allProducts.length} articles à Abidjan
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1B5E20,#16A34A)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
        </div>

        {/* Filtres catégories */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 transition-all active:scale-95 ${
              !activeCategory ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
            🏪 Tout
          </button>
          {allCustomCategories.map(cat => (
            <button key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 transition-all active:scale-95 ${
                activeCategory === cat.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-100'
              }`}>
              {cat.icon} {cat.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-8">

        {/* ── Section filtrée si catégorie active ── */}
        {activeCategory && (
          <Section
            title={`${allCustomCategories.find(c => c.id === activeCategory)?.icon} ${allCustomCategories.find(c => c.id === activeCategory)?.label}`}
            count={filtered.length}>
            {filtered.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-bold text-center py-8">Aucun article dans cette catégorie</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filtered.slice(0, 10).map(p => (
                  <ProductCard key={p.id} product={p}
                    onClick={() => onProductClick(p)}
                    onBookmark={handleBookmark}
                    isBookmarked={bookmarkIds.has(p.id)}
                  />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── BARRE DE RECHERCHE ── */}
      <div className="px-4 mb-4">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Chercher un article, une marque..."
            className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl border-2 border-slate-100 focus:border-green-400 outline-none text-[13px] font-medium shadow-sm transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 active:scale-90">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── CARD ADDRESS-WEB ── */}
        {!activeCategory && (
          <div className="px-4 mb-2">
            <div className="rounded-[2rem] overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#0369A1,#0EA5E9)' }}>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🌍</div>
                  <div>
                    <p className="text-white font-black text-[12px]">Address-Web Africa</p>
                    <p className="text-white/70 text-[9px]">Ton adresse numérique partout en Afrique</p>
                  </div>
                </div>
                <p className="text-white/80 text-[10px] font-medium leading-relaxed mb-3">
                  En Afrique, 60% des rues n'ont pas de nom officiel. Address-Web te donne un code unique <span className="font-black text-white">AW-ABJ-84321</span> qui pointe vers tes coordonnées GPS exactes — pour recevoir des livraisons, partager ta boutique ou ton domicile.
                </p>
                <div className="flex gap-2">
                  <a href="https://addressweb.brumerie.com/creer" target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest text-sky-800 bg-white active:scale-95 transition-all text-center">
                    📍 Créer gratuitement
                  </a>
                  <a href="https://addressweb.brumerie.com" target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest text-white bg-white/20 active:scale-95 transition-all">
                    En savoir +
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Vendeurs Vérifiés en vedette ── */}
        {!activeCategory && verifiedSellers.length > 0 && (
          <Section title="✅ Vendeurs vérifiés" subtitle="Identité contrôlée par Brumerie">
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {verifiedSellers.map(seller => (
                <button key={seller.sellerId}
                  onClick={() => onSellerClick?.(seller.sellerId)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 bg-white rounded-[2rem] px-4 py-4 border border-slate-100 shadow-sm active:scale-95 transition-all"
                  style={{ minWidth: 100 }}>
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-green-50">
                      {seller.sellerPhoto
                        ? <img src={seller.sellerPhoto} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center text-xl font-black text-green-600">
                            {seller.sellerName.charAt(0).toUpperCase()}
                          </div>
                      }
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
                      style={{ background: '#1D9BF0' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-black text-slate-900 text-[10px] truncate" style={{ maxWidth: 80 }}>{seller.sellerName}</p>
                    {seller.neighborhood && (
                      <p className="text-[8px] text-slate-400 font-bold">📍 {seller.neighborhood}</p>
                    )}
                    <p className="text-[8px] text-green-600 font-bold mt-0.5">{seller.count} article{seller.count > 1 ? 's' : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* ── Près de chez toi ── */}
        {!activeCategory && localProducts.length > 0 && neighborhood && (
          <Section title={`📍 Près de chez toi — ${neighborhood}`} subtitle="Articles dans ton quartier">
            <div className="grid grid-cols-2 gap-4">
              {localProducts.map(p => (
                <ProductCard key={p.id} product={p}
                  onClick={() => onProductClick(p)}
                  onBookmark={handleBookmark}
                  isBookmarked={bookmarkIds.has(p.id)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* ── Promos en cours ── */}
        {!activeCategory && promos.length > 0 && (
          <Section title="🔥 Promotions" subtitle="Articles avec prix réduit">
            <div className="grid grid-cols-2 gap-4">
              {promos.map(p => (
                <ProductCard key={p.id} product={p}
                  onClick={() => onProductClick(p)}
                  onBookmark={handleBookmark}
                  isBookmarked={bookmarkIds.has(p.id)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* ── Nouvelles arrivées ── */}
        {!activeCategory && newArrivals.length > 0 && (
          <Section title="🆕 Nouvelles arrivées" subtitle="Publiés récemment">
            <div className="grid grid-cols-2 gap-4">
              {newArrivals.map(p => (
                <ProductCard key={p.id} product={p}
                  onClick={() => onProductClick(p)}
                  onBookmark={handleBookmark}
                  isBookmarked={bookmarkIds.has(p.id)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* ── Toutes les catégories ── */}
        {!activeCategory && (
          <Section title="🗂️ Toutes les catégories">
            <div className="grid grid-cols-2 gap-3">
              {allCustomCategories.map(cat => {
                const count = allProducts.filter(p => p.category === cat.id).length;
                return (
                  <button key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm active:scale-95 transition-all text-left">
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-[11px] truncate">{cat.label}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{count} article{count > 1 ? 's' : ''}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

      </div>
    </div>
  );
}

// Composant section réutilisable
function Section({ title, subtitle, count, children }: {
  title: string; subtitle?: string; count?: number; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-end justify-between mb-3 px-1">
        <div>
          <h2 className="font-black text-slate-900 text-[13px] uppercase tracking-tight">{title}</h2>
          {subtitle && <p className="text-[9px] text-slate-400 font-bold mt-0.5">{subtitle}</p>}
        </div>
        {count !== undefined && (
          <span className="text-[9px] text-slate-400 font-bold">{count} résultat{count > 1 ? 's' : ''}</span>
        )}
      </div>
      {children}
    </div>
  );
}
