// src/components/ProductCard.tsx
import { VerifiedTag } from '@/components/VerifiedTag';
import { ConditionBadge } from '@/components/ConditionBadge';
import React, { useState } from 'react';
import { Product } from '@/types';
import { formatPrice } from '@/utils/helpers';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onBookmark?: (productId: string) => void;
  onAddToCart?: (product: Product) => void;
  isBookmarked?: boolean;
  isBoosted?: boolean;
}

export function ProductCard({ product, onClick, onBookmark, onAddToCart, isBookmarked = false, isBoosted = false }: ProductCardProps) {
  const imgSrc = (product.images?.length ? product.images[0] : null) ||
    (product as any).imageUrl || null;
  const [imgLoaded, setImgLoaded] = useState(!imgSrc);
  const [saved, setSaved] = useState(isBookmarked);
  const [addedCart, setAddedCart] = useState(false);

  React.useEffect(() => { setSaved(isBookmarked); }, [isBookmarked]);

  const isNew = product.createdAt
    ? (() => { try { if (!product.createdAt) return false; const ts = product.createdAt?.toMillis?.() ?? (product.createdAt?.seconds ? product.createdAt.seconds * 1000 : new Date(product.createdAt).getTime()); return !isNaN(ts) && new Date().getTime() - ts < 48 * 60 * 60 * 1000; } catch { return false; } })()
    : false;

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newSaved = !saved;
    setSaved(newSaved);
    if ('vibrate' in navigator) navigator.vibrate(15);
    try {
      await onBookmark?.(product.id);
    } catch {
      setSaved(!newSaved);
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[2rem] overflow-hidden cursor-pointer active:scale-[0.97] transition-all duration-200 border border-gray-100 shadow-sm hover:shadow-md"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] bg-gray-50 overflow-hidden">
        {!imgLoaded && <div className="absolute inset-0 bg-gray-100 animate-pulse" />}
        <img
          src={imgSrc || 'https://via.placeholder.com/400x500?text=Brumerie'}
          alt={product.title}
          className={`w-full h-full object-cover transition-transform duration-500 hover:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgLoaded(true)}
        />

        {/* Status badges top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {isBoosted && (
            <span className="bg-amber-500 text-white text-[9px] font-black px-2.5 py-1 rounded-lg shadow-lg uppercase tracking-tighter flex items-center gap-1">
              ⚡ Sponsorisé
            </span>
          )}
          {isNew && !isBoosted && (
            <span className="bg-green-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg shadow-lg uppercase tracking-tighter">
              Nouveau
            </span>
          )}
          {product.status === 'sold' && (
            <span className="bg-gray-900/90 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tighter">
              Vendu
            </span>
          )}
          {product.condition && product.status !== 'sold' && (
            <ConditionBadge condition={product.condition} size="sm" />
          )}
          {(product as any).hasAcceptedOffer && product.status !== 'sold' && (
            <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-lg shadow-md uppercase tracking-tighter">
              🤝 Offre
            </span>
          )}
        </div>

        {/* Business badges top right */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {product.sellerHasPhysicalShop && (
            <div className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center shadow-sm border border-gray-100" title="Boutique physique">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
          )}
          {product.sellerManagesDelivery && (
            <div className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center shadow-sm border border-gray-100" title="Livraison disponible">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
                <path d="M8 17.5h7M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
          )}
        </div>

        {/* Bookmark button */}
        <div className="absolute bottom-3 left-3 flex flex-col items-center gap-0.5">
          <button
            onClick={handleBookmark}
            className={`bookmark-btn ${saved ? 'saved' : ''}`}
            title={saved ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? '#1D9BF0' : 'none'} stroke={saved ? '#1D9BF0' : '#64748B'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          {((product as any).bookmarkCount || 0) > 0 && (
            <span className="text-[8px] font-black text-blue-600 bg-white/90 rounded-full px-1 py-0.5 leading-none shadow-sm">
              ❤️{(product as any).bookmarkCount}
            </span>
          )}
        </div>

        {/* Bouton Panier — bottom right */}
        {product.status !== 'sold' && onAddToCart && (
          <div className="absolute bottom-3 right-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if ('vibrate' in navigator) navigator.vibrate(15);
                setAddedCart(true);
                onAddToCart(product);
                setTimeout(() => setAddedCart(false), 1500);
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-90 ${
                addedCart ? 'bg-green-500' : 'bg-white/90 backdrop-blur-md border border-gray-100'
              }`}
              title="Ajouter au panier"
            >
              {addedCart ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                </svg>
              )}
            </button>
          </div>
        )}

      </div>

      {/* Content */}
      <div className="p-4">
        {/* Prix */}
        {(() => {
          const p = product as any;
          const nowMs = Date.now();
          const toMs = (val: any): number => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            if (typeof val.toMillis === 'function') return val.toMillis();
            if (val.seconds) return val.seconds * 1000;
            const d = new Date(val).getTime();
            return isNaN(d) ? 0 : d;
          };
          const promoStart = toMs(p.promoActiveFrom);
          const promoEnd = toMs(p.promoActiveUntil);
          const promoActive = p.promoPrice && p.promoPrice < product.price
            && (!promoStart || promoStart <= nowMs)
            && (!promoEnd || promoEnd >= nowMs);
          const isFlash = promoActive && (p.flashSaleActive || (!promoStart && p.promoPrice));
          const displayedPrice = promoActive ? p.promoPrice : product.price;
          const crossed = promoActive ? product.price : product.originalPrice;
          const pct = crossed && crossed > displayedPrice ? Math.round(((crossed - displayedPrice) / crossed) * 100) : 0;

          return (
            <>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <p className={`price-brumerie text-[18px] ${isFlash ? 'text-red-600' : 'text-gray-900'}`}>
                  {displayedPrice.toLocaleString('fr-FR')}
                </p>
                <span className="text-[10px] font-bold text-slate-400 ml-0.5">FCFA</span>
                {pct > 0 && (
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg ${isFlash ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>-{pct}%</span>
                )}
              </div>
              {crossed && crossed > displayedPrice && (
                <p className="text-[9px] text-slate-400 line-through font-bold">{crossed.toLocaleString('fr-FR')} FCFA</p>
              )}
              {isFlash && (
                <p className="text-[9px] font-black text-white bg-gradient-to-r from-red-600 to-orange-500 px-2 py-0.5 rounded-lg mt-1 inline-flex items-center gap-1">
                  🔥 {p.flashSaleLabel || 'VENTE FLASH'}
                </p>
              )}
            </>
          );
        })()}

        {/* Titre */}
        <h3 className="text-[11px] font-bold text-gray-500 mt-1 line-clamp-1 uppercase tracking-tight">
          {product.title}
        </h3>

        {/* Vendeur & Quartier */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2 max-w-[65%]">
            <div className="w-6 h-6 rounded-lg overflow-hidden bg-green-50 flex-shrink-0 border border-gray-100">
              {product.sellerPhoto ? (
                <img src={product.sellerPhoto} alt={product.sellerName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-green-600 text-[10px] font-black uppercase">
                  {product.sellerName?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="text-[10px] font-black text-gray-800 truncate flex-shrink min-w-0">{product.sellerName}</span>
              {(product.sellerVerified || product.sellerPremium) && (
                <VerifiedTag
                  tier={product.sellerPremium ? 'premium' : 'verified'}
                  size="xs"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{product.neighborhood}</span>
          </div>
        </div>

        {/* ── Livraison ── */}
        {product.sellerManagesDelivery && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[8px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">
              📦 Livraison dispo
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
