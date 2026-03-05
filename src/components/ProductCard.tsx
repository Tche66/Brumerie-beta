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
  isBookmarked?: boolean;
  isBoosted?: boolean;
}

// Badge Vérifié — bleu réseau social


export function ProductCard({ product, onClick, onBookmark, isBookmarked = false, isBoosted = false }: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [saved, setSaved] = useState(isBookmarked);
  
  // Sync with prop when it changes externally
  React.useEffect(() => { setSaved(isBookmarked); }, [isBookmarked]);

  const isNew = product.createdAt
    ? new Date().getTime() - new Date(product.createdAt).getTime() < 48 * 60 * 60 * 1000
    : false;

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newSaved = !saved;
    setSaved(newSaved); // optimistic update
    if ('vibrate' in navigator) navigator.vibrate(15);
    try {
      await onBookmark?.(product.id);
    } catch {
      setSaved(!newSaved); // revert on error
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
          src={product.images[0] || 'https://via.placeholder.com/400x500?text=Brumerie'}
          alt={product.title}
          className={`w-full h-full object-cover transition-transform duration-500 hover:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
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
        <button
          onClick={handleBookmark}
          className={`bookmark-btn absolute bottom-3 left-3 ${saved ? 'saved' : ''}`}
          title={saved ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? '#1D9BF0' : 'none'} stroke={saved ? '#1D9BF0' : '#64748B'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>

        {/* Stock badge bottom right — dans l'image, toujours contenu */}
        {product.quantity && product.quantity > 1 && product.status !== 'sold' && (
          <div className="absolute bottom-3 right-3">
            <span className="bg-slate-900/85 backdrop-blur-sm text-white text-[9px] font-black px-2.5 py-1 rounded-xl shadow-lg">
              {product.quantity} en stock
            </span>
          </div>
        )}

        {/* WhatsApp Count — décalé si stock badge présent */}
        {product.whatsappClickCount > 0 && (
          <div className={`absolute right-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${product.quantity && product.quantity > 1 && product.status !== 'sold' ? 'bottom-10' : 'bottom-3'}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.99 2.008C6.465 2.008 2.011 6.46 2.011 11.985a9.916 9.916 0 001.337 5.003L2 22l5.16-1.321a9.955 9.955 0 004.83 1.24c5.524 0 9.979-4.452 9.979-9.977 0-2.665-1.038-5.168-2.921-7.054A9.926 9.926 0 0011.99 2.008z"/></svg>
            <span>{product.whatsappClickCount}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Prix - Font Syne unique Brumerie */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <p className="price-brumerie text-[18px] text-gray-900">
            {product.price.toLocaleString('fr-FR')}
          </p>
          <span className="text-[10px] font-bold text-slate-400 ml-0.5">FCFA</span>

        {product.originalPrice && product.originalPrice > product.price && (() => {
            const pct = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
            return (
              <span className="bg-red-100 text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded-lg">-{pct}%</span>
            );
          })()}
        </div>
        {product.originalPrice && product.originalPrice > product.price && (
          <p className="text-[9px] text-slate-400 line-through font-bold">
            {product.originalPrice.toLocaleString('fr-FR')} FCFA
          </p>
        )}

        {/* Titre */}
        <h3 className="text-[11px] font-bold text-gray-500 mt-1 line-clamp-1 uppercase tracking-tight">
          {product.title}
        </h3>

        {/* Vendeur & Quartier */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2 max-w-[65%]">
            {/* Avatar */}
            <div className="w-6 h-6 rounded-lg overflow-hidden bg-green-50 flex-shrink-0 border border-gray-100">
              {product.sellerPhoto ? (
                <img src={product.sellerPhoto} alt={product.sellerName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-green-600 text-[10px] font-black uppercase">
                  {product.sellerName?.charAt(0)}
                </div>
              )}
            </div>
            {/* Nom + badge sur même ligne, badge APRÈS le nom */}
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
      </div>
    </div>
  );
}
