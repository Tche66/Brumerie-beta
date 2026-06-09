// src/components/GuestShell.tsx
// Shell pour les visiteurs non connectés — accès à Home, ProductDetail, SellerProfile, Discover
import React, { useState, useEffect } from 'react';
import { HomePage } from '@/pages/HomePage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { SellerProfilePage } from '@/pages/SellerProfilePage';
import { DiscoverPage } from '@/pages/DiscoverPage';
import { GuestModal } from '@/components/GuestModal';
import { GuestErrorBoundary } from '@/components/ErrorBoundary';
import { Product } from '@/types';

interface GuestShellProps {
  onAuthRequired: () => void;
}

type GuestPage = 'home' | 'product-detail' | 'seller-profile' | 'discover';

export function GuestShell({ onAuthRequired }: GuestShellProps) {
  const [page, setPage]                   = useState<GuestPage>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [guestModal, setGuestModal]       = useState<{ visible: boolean; reason: any }>({ visible: false, reason: 'default' });

  // Deep link : ?product=ID, /p/ID, /vendeur/ID, /s/ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    const productId = params.get('product') || path.match(/^\/p\/([^/]+)/)?.[1];
    const sellerId = path.match(/^\/vendeur\/([^/]+)/)?.[1] || path.match(/^\/s\/([^/]+)/)?.[1];

    if (productId) {
      window.history.replaceState({}, '', '/');
      import('firebase/firestore').then(({ getDoc, doc }) => {
        import('@/config/firebase').then(({ db }) => {
          getDoc(doc(db, 'products', productId)).then((snap: any) => {
            if (snap.exists()) {
              setSelectedProduct({ id: snap.id, ...snap.data() } as any);
              setPage('product-detail');
            }
          }).catch(() => {});
        });
      });
    } else if (sellerId) {
      window.history.replaceState({}, '', '/');
      setSelectedSellerId(sellerId);
      setPage('seller-profile');
    }
  }, []);

  const showGuest = (reason: any) => setGuestModal({ visible: true, reason });
  const hideGuest = () => setGuestModal({ visible: false, reason: 'default' });

  const goHome = () => { setPage('home'); setSelectedProduct(null); setSelectedSellerId(null); };

  return (
    <div className="min-h-full bg-white pb-32">
      {/* Bannière "Mode visiteur" discrète en haut */}
      {(page === 'home' || page === 'discover') && (
        <div className="bg-slate-900 text-white text-[11px] font-bold text-center py-2.5 px-4 flex items-center justify-center gap-3">
          <span>Tu explores Brumerie en visiteur</span>
          <button onClick={onAuthRequired} className="ml-2 px-3 py-1 bg-green-600 rounded-full text-[10px] font-black uppercase tracking-wider">
            S'inscrire
          </button>
        </div>
      )}

      {/* ── Navigation Guest simplifiée (Home / Discover) ── */}
      {(page === 'home' || page === 'discover') && (
        <div className="flex border-b border-slate-100 bg-white sticky top-0 z-50">
          <button
            onClick={goHome}
            className={`flex-1 py-3 text-[12px] font-black uppercase tracking-wider transition-all ${page === 'home' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-400'}`}>
            Accueil
          </button>
          <button
            onClick={() => setPage('discover')}
            className={`flex-1 py-3 text-[12px] font-black uppercase tracking-wider transition-all ${page === 'discover' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-400'}`}>
            Explorer
          </button>
        </div>
      )}

      {/* ── GROS BOUTON FIXE EN BAS — toujours visible ── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[200] px-4 pb-6 pt-3"
        style={{ background: 'linear-gradient(to top, rgba(255,255,255,1) 70%, rgba(255,255,255,0))' }}>
        <button
          onClick={onAuthRequired}
          className="w-full py-5 rounded-[1.5rem] font-black text-[13px] uppercase tracking-widest text-white active:scale-95 transition-all shadow-2xl shadow-green-300"
          style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
          <span className="flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Se connecter · S'inscrire gratuitement
          </span>
        </button>
        <p className="text-center text-[10px] text-slate-400 font-medium mt-2">
          Rejoins des milliers de vendeurs en Côte d'Ivoire
        </p>
      </div>

      {/* Pages accessibles — chaque page encapsulée pour capturer les crashs guest */}
      {page === 'home' && (
        <GuestErrorBoundary onLogin={onAuthRequired}>
          <HomePage
            onProductClick={(product) => { setSelectedProduct(product); setPage('product-detail'); }}
            onSellerClick={(id) => { setSelectedSellerId(id); setPage('seller-profile'); }}
            onProfileClick={() => showGuest('default')}
            onNotificationsClick={() => showGuest('default')}
            onOpenChatWithSeller={() => showGuest('default')}
            isGuest
            onGuestAction={showGuest}
          />
        </GuestErrorBoundary>
      )}

      {page === 'discover' && (
        <GuestErrorBoundary onLogin={onAuthRequired}>
          <DiscoverPage
            onProductClick={(product) => { setSelectedProduct(product); setPage('product-detail'); }}
            onSellerClick={(id) => { setSelectedSellerId(id); setPage('seller-profile'); }}
          />
        </GuestErrorBoundary>
      )}

      {page === 'product-detail' && selectedProduct && (
        <GuestErrorBoundary onLogin={onAuthRequired}>
          <ProductDetailPage
            product={selectedProduct}
            onBack={() => { if (selectedSellerId) setPage('seller-profile'); else goHome(); }}
            onSellerClick={(id) => { setSelectedSellerId(id); setPage('seller-profile'); }}
            onStartChat={() => showGuest('message')}
            onProductClick={(p) => { setSelectedProduct(p); setPage('product-detail'); }}
            onBuyClick={() => showGuest('contact')}
            isGuest
            onGuestAction={showGuest}
          />
        </GuestErrorBoundary>
      )}

      {page === 'seller-profile' && selectedSellerId && (
        <GuestErrorBoundary onLogin={onAuthRequired}>
          <SellerProfilePage
            sellerId={selectedSellerId}
            onBack={() => { if (selectedProduct) setPage('product-detail'); else goHome(); }}
            onProductClick={(p) => { setSelectedProduct(p); setPage('product-detail'); }}
            isGuest
            onGuestAction={showGuest}
          />
        </GuestErrorBoundary>
      )}

      {/* Modal visiteur */}
      <GuestModal
        visible={guestModal.visible}
        reason={guestModal.reason}
        onClose={hideGuest}
        onLogin={() => { hideGuest(); onAuthRequired(); }}
      />
    </div>
  );
}
