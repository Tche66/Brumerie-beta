// src/components/GuestShell.tsx
// Shell pour les visiteurs non connectés — accès limité à Home, ProductDetail, SellerProfile
import React, { useState } from 'react';
import { HomePage } from '@/pages/HomePage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { SellerProfilePage } from '@/pages/SellerProfilePage';
import { GuestModal } from '@/components/GuestModal';
import { Product } from '@/types';

interface GuestShellProps {
  onAuthRequired: () => void; // appelé quand le visiteur veut se connecter
}

type GuestPage = 'home' | 'product-detail' | 'seller-profile';

export function GuestShell({ onAuthRequired }: GuestShellProps) {
  const [page, setPage]                   = useState<GuestPage>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [guestModal, setGuestModal]       = useState<{ visible: boolean; reason: any }>({ visible: false, reason: 'default' });

  const showGuest = (reason: any) => setGuestModal({ visible: true, reason });
  const hideGuest = () => setGuestModal({ visible: false, reason: 'default' });

  const goHome = () => { setPage('home'); setSelectedProduct(null); setSelectedSellerId(null); };

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Bannière "Mode visiteur" discrète en haut */}
      {page === 'home' && (
        <div className="bg-slate-900 text-white text-[11px] font-bold text-center py-2.5 px-4 flex items-center justify-center gap-3">
          <span>👋 Tu explores Brumerie en visiteur</span>
        </div>
      )}

      {/* ── GROS BOUTON FIXE EN BAS — toujours visible ── */}
      <div className="fixed bottom-0 left-0 right-0 z-[200] px-4 pb-6 pt-3"
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
          Rejoins des milliers de vendeurs en Côte d'Ivoire 🇨🇮
        </p>
      </div>

      {/* Pages accessibles */}
      {page === 'home' && (
        <HomePage
          onProductClick={(product) => { setSelectedProduct(product); setPage('product-detail'); }}
          onProfileClick={() => showGuest('default')}
          onNotificationsClick={() => showGuest('default')}
          isGuest
          onGuestAction={showGuest}
        />
      )}

      {page === 'product-detail' && selectedProduct && (
        <ProductDetailPage
          product={selectedProduct}
          onBack={goHome}
          onSellerClick={(id) => { setSelectedSellerId(id); setPage('seller-profile'); }}
          onStartChat={() => showGuest('message')}
          onProductClick={(p) => { setSelectedProduct(p); setPage('product-detail'); }}
          onBuyClick={() => showGuest('contact')}
          isGuest
          onGuestAction={showGuest}
        />
      )}

      {page === 'seller-profile' && selectedSellerId && (
        <SellerProfilePage
          sellerId={selectedSellerId}
          onBack={() => { if (selectedProduct) setPage('product-detail'); else goHome(); }}
          onProductClick={(p) => { setSelectedProduct(p); setPage('product-detail'); }}
          isGuest
          onGuestAction={showGuest}
        />
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
