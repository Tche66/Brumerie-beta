// src/pages/BookmarksPage.tsx
import React, { useState, useEffect } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { getProducts } from '@/services/productService';
import { Product } from '@/types';

interface BookmarksPageProps {
  onBack: () => void;
  onProductClick: (product: Product) => void;
}

export function BookmarksPage({ onBack, onProductClick }: BookmarksPageProps) {
  const [bookmarkedProducts, setBookmarkedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
  }, []);

  async function loadBookmarks() {
    setLoading(true);
    try {
      const saved = localStorage.getItem('brumerie_bookmarks');
      const ids: string[] = saved ? JSON.parse(saved) : [];
      if (ids.length === 0) { setLoading(false); return; }

      const all = await getProducts();
      const bookmarked = all.filter(p => ids.includes(p.id));
      setBookmarkedProducts(bookmarked);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleBookmark = (productId: string) => {
    // Remove from local list
    setBookmarkedProducts(prev => prev.filter(p => p.id !== productId));
    // Update localStorage
    const saved = localStorage.getItem('brumerie_bookmarks');
    const ids: string[] = saved ? JSON.parse(saved) : [];
    const next = ids.filter(id => id !== productId);
    localStorage.setItem('brumerie_bookmarks', JSON.stringify(next));
  };

  return (
    <div className="min-h-screen bg-white page-container animate-fade-in">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-50 px-6 py-5 flex items-center gap-4 border-b border-slate-50">
        <button
          onClick={onBack}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-900 active:scale-90 transition-all border border-slate-100"
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1D9BF0" stroke="#1D9BF0" strokeWidth="0">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h1 className="font-bold text-[11px] uppercase tracking-[0.2em] text-slate-900">
            Mes Favoris
          </h1>
        </div>
        {bookmarkedProducts.length > 0 && (
          <span className="ml-auto text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
            {bookmarkedProducts.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-5">
            {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-slate-50 rounded-[2.5rem] animate-pulse" />)}
          </div>
        ) : bookmarkedProducts.length === 0 ? (
          <div className="text-center py-20 px-6 bg-slate-50 rounded-[3rem] border-4 border-dashed border-white mt-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 mb-2">Aucun favori</h3>
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wide">
              Appuie sur le{' '}
              <svg className="inline w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#1D9BF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              {' '}pour enregistrer un article
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 animate-fade-up">
            {bookmarkedProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => onProductClick(product)}
                onBookmark={handleBookmark}
                isBookmarked={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
