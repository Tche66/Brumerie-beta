import { VerifiedTag } from '@/components/VerifiedTag';
import { ConditionBadge } from '@/components/ConditionBadge';
import React, { useState } from 'react';
import { Product } from '@/types';
import { Bookmark, ShoppingBag, MapPin, Home, Truck, Check } from 'lucide-react';

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
      className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-150 border border-gray-100 dark:border-slate-700"
    >
      {/* Image */}
      <div className="relative aspect-[4/5] bg-gray-100 dark:bg-slate-700 overflow-hidden">
        {!imgLoaded && <div className="absolute inset-0 bg-gray-100 animate-pulse" />}
        <img
          src={imgSrc || 'https://via.placeholder.com/400x500?text=Brumerie'}
          alt={product.title}
          className={`w-full h-full object-cover ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgLoaded(true)}
        />

        {/* Status badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {isBoosted && (
            <span className="bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
              Sponsorise
            </span>
          )}
          {isNew && !isBoosted && (
            <span className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
              Nouveau
            </span>
          )}
          {product.status === 'sold' && (
            <span className="bg-gray-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
              Vendu
            </span>
          )}
          {product.condition && product.status !== 'sold' && (
            <ConditionBadge condition={product.condition} size="sm" />
          )}
          {(() => {
            const p = product as any;
            const nowMs = Date.now();
            const toMs = (val: any): number => { if (!val) return 0; if (typeof val === 'number') return val; if (typeof val.toMillis === 'function') return val.toMillis(); if (val.seconds) return val.seconds * 1000; const d = new Date(val).getTime(); return isNaN(d) ? 0 : d; };
            const promoStart = toMs(p.promoActiveFrom);
            const promoEnd = toMs(p.promoActiveUntil);
            const isActive = p.promoPrice && p.promoPrice < product.price
              && (!promoStart || promoStart <= nowMs)
              && (!promoEnd || promoEnd >= nowMs);
            if (!isActive || product.status === 'sold') return null;
            return <span className="bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">Promo</span>;
          })()}
          {(product as any).hasAcceptedOffer && product.status !== 'sold' && (
            <span className="bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
              Offre
            </span>
          )}
        </div>

        {/* Business icons top right */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          {(product as any).sellerHasPhysicalShop && (
            <div className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center" title="Boutique physique">
              <Home size={14} className="text-emerald-600" />
            </div>
          )}
          {(product as any).sellerManagesDelivery && (
            <div className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center" title="Livraison disponible">
              <Truck size={14} className="text-emerald-600" />
            </div>
          )}
        </div>

        {/* Bookmark */}
        <div className="absolute bottom-2.5 left-2.5">
          <button
            onClick={handleBookmark}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
              saved ? 'bg-emerald-600' : 'bg-white/90 backdrop-blur-sm'
            }`}
          >
            <Bookmark size={14} className={saved ? 'text-white fill-white' : 'text-gray-700'} />
          </button>
        </div>

        {/* Cart */}
        {product.status !== 'sold' && onAddToCart && (
          <div className="absolute bottom-2.5 right-2.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if ('vibrate' in navigator) navigator.vibrate(15);
                setAddedCart(true);
                onAddToCart(product);
                setTimeout(() => setAddedCart(false), 1500);
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                addedCart ? 'bg-emerald-600' : 'bg-white/90 backdrop-blur-sm'
              }`}
            >
              {addedCart ? (
                <Check size={14} className="text-white" />
              ) : (
                <ShoppingBag size={14} className="text-gray-700" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
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
              <div className="flex items-baseline gap-1.5">
                <p className={`price-brumerie text-base ${isFlash ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                  {displayedPrice.toLocaleString('fr-FR')} F
                </p>
                {pct > 0 && (
                  <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-1.5 py-0.5 rounded">-{pct}%</span>
                )}
              </div>
              {crossed && crossed > displayedPrice && (
                <p className="text-xs text-gray-400 line-through mt-0.5">{crossed.toLocaleString('fr-FR')} F</p>
              )}
              {isFlash && (
                <div className="mt-1.5 inline-flex items-center gap-1 bg-red-500 px-2 py-0.5 rounded-md">
                  <span className="text-[10px] font-semibold text-white">{p.flashSaleLabel || 'Vente flash'}</span>
                </div>
              )}
            </>
          );
        })()}

        {/* Titre */}
        <h3 className="text-[13px] font-medium text-gray-700 dark:text-gray-300 mt-1.5 line-clamp-1">
          {product.title}
        </h3>

        {/* Vendeur & Quartier */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2 max-w-[60%]">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              {product.sellerPhoto ? (
                <img src={product.sellerPhoto} alt={product.sellerName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-600 text-[9px] font-semibold">
                  {product.sellerName?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">{product.sellerName}</span>
              {(product.sellerVerified || product.sellerPremium) && (
                <VerifiedTag isVerified={product.sellerVerified} isPremium={product.sellerPremium} showBoth size="xs"/>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <MapPin size={10} />
            <span className="text-[11px] font-medium">{product.neighborhood}</span>
          </div>
        </div>

        {/* Livraison */}
        {(product as any).sellerManagesDelivery && (
          <div className="flex items-center gap-1.5 mt-2">
            <Truck size={11} className="text-emerald-600" />
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              Livraison disponible
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
