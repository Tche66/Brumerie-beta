// src/components/ProductCardFeed.tsx
// Carte verticale pleine largeur — style Instagram/Depop
// Swipe gauche/droite sur les images + like intégré + partager
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '@/types';
import { VerifiedTag } from '@/components/VerifiedTag';
import { ConditionBadge } from '@/components/ConditionBadge';
import { toggleLike, checkIsLiked } from '@/services/productService';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface ProductCardFeedProps {
  product: Product;
  onClick: () => void;
  onBookmark?: (productId: string) => void;
  isBookmarked?: boolean;
  isBoosted?: boolean;
  onGuestAction?: () => void;
  onSellerClick?: (sellerId: string) => void;
}

function safeTs(val: any): number {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  try { const d = new Date(val).getTime(); return isNaN(d) ? 0 : d; } catch { return 0; }
}

export function ProductCardFeed({
  product, onClick, onBookmark, isBookmarked = false, isBoosted = false, onGuestAction, onSellerClick,
}: ProductCardFeedProps) {
  const { currentUser } = useAuth();
  const images = product.images?.length
    ? product.images
    : [(product as any).imageUrl].filter(Boolean) as string[];

  const [saved, setSaved] = useState(isBookmarked);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => { setSaved(isBookmarked); }, [isBookmarked]);

  // Likes temps réel depuis sous-collection
  useEffect(() => {
    if (!product.id) return;
    const unsub = onSnapshot(collection(db, 'products', product.id, 'likes'), snap => {
      setLikeCount(snap.size);
    });
    return unsub;
  }, [product.id]);

  // Vérifier si déjà liké
  useEffect(() => {
    if (!currentUser || !product.id) return;
    checkIsLiked(product.id, currentUser.uid).then(setIsLiked).catch(() => {});
  }, [product.id, currentUser?.uid]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) { onGuestAction?.(); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    const prev = isLiked;
    setIsLiked(!prev);
    try {
      const result = await toggleLike(product.id, currentUser.uid);
      setIsLiked(result.liked);
    } catch { setIsLiked(prev); }
    finally { setLikeLoading(false); }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = !saved;
    setSaved(newSaved);
    if ('vibrate' in navigator) navigator.vibrate(15);
    try { await onBookmark?.(product.id); }
    catch { setSaved(!newSaved); }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}?product=${product.id}`;
    if (navigator.share) {
      navigator.share({ title: product.title, text: `${product.title} — ${product.price.toLocaleString('fr-FR')} FCFA`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  // Swipe gauche/droite sur les images
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0 && currentImg < images.length - 1) setCurrentImg(i => i + 1);
      if (dx > 0 && currentImg > 0) setCurrentImg(i => i - 1);
    }
    touchStartX.current = null;
  };

  // Prix avec promo
  const now = new Date().toISOString();
  const p = product as any;
  const promoActive = p.promoPrice && p.promoPrice < product.price
    && (!p.promoActiveFrom || p.promoActiveFrom <= now)
    && (!p.promoActiveUntil || p.promoActiveUntil >= now);
  const displayPrice = promoActive ? p.promoPrice : product.price;
  const crossedPrice = promoActive ? product.price : product.originalPrice;
  const pct = crossedPrice && crossedPrice > displayPrice
    ? Math.round(((crossedPrice - displayPrice) / crossedPrice) * 100) : 0;

  const isNew = safeTs(product.createdAt) > Date.now() - 48 * 60 * 60 * 1000;

  return (
    <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">

      {/* ── Header vendeur — cliquable ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={e => { e.stopPropagation(); if (product.sellerId) onSellerClick?.(product.sellerId); }}
          className="w-10 h-10 rounded-2xl overflow-hidden bg-green-50 flex-shrink-0 border border-gray-100 active:scale-90 transition-all"
        >
          {product.sellerPhoto
            ? <img src={product.sellerPhoto} alt={product.sellerName} className="w-full h-full object-cover"/>
            : <div className="w-full h-full flex items-center justify-center text-green-600 font-black text-sm">{product.sellerName?.charAt(0)}</div>
          }
        </button>
        <button
          onClick={e => { e.stopPropagation(); if (product.sellerId) onSellerClick?.(product.sellerId); }}
          className="flex-1 min-w-0 text-left active:opacity-70 transition-all"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-black text-gray-900 truncate">{product.sellerName}</span>
            {(product.sellerVerified || product.sellerPremium) && (
              <VerifiedTag tier={product.sellerPremium ? 'premium' : 'verified'} size="xs"/>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{product.neighborhood}</span>
          </div>
        </button>
        {isBoosted && (
          <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter flex-shrink-0">⚡ Sponsorisé</span>
        )}
      </div>

      {/* ── Galerie images avec swipe ── */}
      <div
        className="relative aspect-square bg-gray-50 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={onClick}
      >
        {/* Image courante */}
        <img
          src={images[currentImg] || 'https://via.placeholder.com/400x400?text=Brumerie'}
          alt={product.title}
          className="w-full h-full object-cover cursor-pointer select-none"
          draggable={false}
        />

        {/* Flèches gauche/droite sur desktop */}
        {images.length > 1 && currentImg > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setCurrentImg(i => i - 1); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center active:scale-90 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
        )}
        {images.length > 1 && currentImg < images.length - 1 && (
          <button
            onClick={e => { e.stopPropagation(); setCurrentImg(i => i + 1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center active:scale-90 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>
          </button>
        )}

        {/* Badges état */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {isNew && <span className="bg-green-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tighter">Nouveau</span>}
          {product.status === 'sold' && <span className="bg-gray-900/90 text-white text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tighter">Vendu</span>}
          {product.condition && product.status !== 'sold' && <ConditionBadge condition={product.condition} size="sm"/>}
          {(p as any).hasAcceptedOffer && product.status !== 'sold' && (
            <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tighter">🤝 Offre</span>
          )}
        </div>
        {/* Badge Vente flash */}
        {(p as any).flashSaleActive && (p as any).flashSaleLabel && (
          <div className="absolute bottom-10 left-0 right-0 mx-3">
            <div className="bg-red-500/95 backdrop-blur-sm text-white text-[9px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 justify-center animate-pulse">
              🔥 {(p as any).flashSaleLabel}
            </div>
          </div>
        )}

        {/* Indicateurs de position */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.slice(0, 6).map((_, idx) => (
              <button
                key={idx}
                onClick={e => { e.stopPropagation(); setCurrentImg(idx); }}
                className={`h-1.5 rounded-full transition-all ${idx === currentImg ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`}
              />
            ))}
          </div>
        )}

        {/* Compteur images */}
        {images.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-lg">
            {currentImg + 1}/{images.length}
          </div>
        )}
      </div>

      {/* ── Actions sociales ── */}
      <div className="flex items-center gap-4 px-4 pt-3 pb-1">
        {/* Like */}
        <button onClick={handleLike} disabled={likeLoading}
          className="flex items-center gap-1.5 active:scale-90 transition-transform disabled:opacity-60"
        >
          <svg width="24" height="24" viewBox="0 0 24 24"
            fill={isLiked ? '#EF4444' : 'none'}
            stroke={isLiked ? '#EF4444' : '#1a1a18'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          {likeCount > 0 && <span className="text-[13px] font-black text-slate-700">{likeCount.toLocaleString('fr-FR')}</span>}
        </button>

        {/* Commentaire — ouvre la fiche */}
        <button onClick={onClick} className="flex items-center gap-1.5 active:scale-90 transition-transform">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          {(product as any).commentCount > 0 && (
            <span className="text-[13px] font-black text-slate-700">{(product as any).commentCount}</span>
          )}
        </button>

        {/* Partager */}
        <button onClick={handleShare} className="flex items-center gap-1.5 active:scale-90 transition-transform">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
          </svg>
        </button>

        {/* Bookmark */}
        <button onClick={handleBookmark} className="flex items-center gap-1.5 active:scale-90 transition-transform ml-auto">
          <svg width="22" height="22" viewBox="0 0 24 24"
            fill={saved ? '#1D9BF0' : 'none'}
            stroke={saved ? '#1D9BF0' : '#1a1a18'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
        </button>
      </div>

      {/* ── Infos produit ── */}
      <div className="px-4 pb-4 cursor-pointer" onClick={onClick}>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-[20px] font-black text-gray-900">{displayPrice.toLocaleString('fr-FR')}</span>
          <span className="text-[11px] font-bold text-slate-400">FCFA</span>
          {pct > 0 && <span className="bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded-lg">-{pct}%</span>}
        </div>
        {crossedPrice && crossedPrice > displayPrice && (
          <p className="text-[10px] text-slate-400 line-through font-bold">{crossedPrice.toLocaleString('fr-FR')} FCFA</p>
        )}
        <p className="text-[13px] font-bold text-gray-700 mt-1 line-clamp-2">{product.title}</p>
        {product.sellerManagesDelivery && (
          <span className="inline-block mt-1.5 text-[9px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">📦 Livraison dispo</span>
        )}
      </div>
    </div>
  );
}
