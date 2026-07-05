// src/components/ProductCardFeed.tsx
// Carte verticale pleine largeur — style marketplace immersif (TikTok/Shein)
// Image plein écran + actions latérales + infos en bas
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '@/types';
import { VerifiedTag } from '@/components/VerifiedTag';
import { ConditionBadge } from '@/components/ConditionBadge';
import { toggleLike, checkIsLiked } from '@/services/productService';
import { followSeller, unfollowSeller } from '@/services/shopFeaturesService';
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
  onStartChat?: (sellerId: string, sellerName: string, productId?: string, productTitle?: string) => void;
  onBuyClick?: (product: Product) => void;
  onOfferClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

function safeTs(val: any): number {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  try { const d = new Date(val).getTime(); return isNaN(d) ? 0 : d; } catch { return 0; }
}

export function ProductCardFeed({
  product, onClick, onBookmark, isBookmarked = false, isBoosted = false, onGuestAction, onSellerClick, onStartChat, onBuyClick, onOfferClick, onAddToCart,
}: ProductCardFeedProps) {
  const { currentUser, userProfile } = useAuth();
  const images = product.images?.length
    ? product.images
    : [(product as any).imageUrl].filter(Boolean) as string[];

  const [saved, setSaved] = useState(isBookmarked);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [shared, setShared] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => { setSaved(isBookmarked); }, [isBookmarked]);

  useEffect(() => {
    if (!userProfile) return;
    const followIds = (userProfile as any)?.followingSellers || [];
    setIsFollowing(followIds.includes(product.sellerId));
  }, [userProfile, product.sellerId]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) { onGuestAction?.(); return; }
    if (followLoading || currentUser.uid === product.sellerId) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowSeller(currentUser.uid, product.sellerId);
        setIsFollowing(false);
      } else {
        await followSeller(currentUser.uid, product.sellerId, product.sellerName || '');
        setIsFollowing(true);
      }
    } catch {}
    setFollowLoading(false);
  };

  useEffect(() => {
    if (!product.id) return;
    const unsub = onSnapshot(collection(db, 'products', product.id, 'likes'), snap => {
      setLikeCount(snap.size);
    }, () => {});
    return unsub;
  }, [product.id]);

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
    if ('vibrate' in navigator) navigator.vibrate(10);
    const url = `${window.location.origin}/p/${product.id}`;
    if (navigator.share) {
      navigator.share({ title: product.title, text: `${product.title} — ${product.price.toLocaleString('fr-FR')} FCFA sur Brumerie`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

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

  // Prix avec promo / vente flash
  const nowMs = Date.now();
  const p = product as any;
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
  const isFlashSale = promoActive && (p.flashSaleActive || (!promoStart && p.promoPrice));
  const displayPrice = promoActive ? p.promoPrice : product.price;
  const crossedPrice = promoActive ? product.price : product.originalPrice;
  const pct = crossedPrice && crossedPrice > displayPrice
    ? Math.round(((crossedPrice - displayPrice) / crossedPrice) * 100) : 0;

  const isNew = safeTs(product.createdAt) > Date.now() - 48 * 60 * 60 * 1000;

  return (
    <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">

      {/* ── Zone image immersive avec overlays ── */}
      <div
        className="relative aspect-[3/4] bg-gray-50 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={onClick}
      >
        {/* Image courante */}
        <img
          src={images[currentImg] || 'https://via.placeholder.com/400x530?text=Brumerie'}
          alt={product.title}
          className="w-full h-full object-cover cursor-pointer select-none"
          draggable={false}
        />

        {/* Gradient overlay bas pour lisibilité */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        {/* ── Header vendeur — overlay en haut ── */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-2.5 px-4 pt-4 pb-8 bg-gradient-to-b from-black/40 to-transparent">
          <button
            onClick={e => { e.stopPropagation(); if (product.sellerId) onSellerClick?.(product.sellerId); }}
            className="w-9 h-9 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm flex-shrink-0 border-2 border-white/60 active:scale-90 transition-all"
          >
            {product.sellerPhoto
              ? <img src={product.sellerPhoto} alt={product.sellerName} className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-white font-black text-xs">{product.sellerName?.charAt(0)}</div>
            }
          </button>
          <button
            onClick={e => { e.stopPropagation(); if (product.sellerId) onSellerClick?.(product.sellerId); }}
            className="flex items-center gap-1.5 active:opacity-70 transition-all min-w-0"
          >
            <span className="text-[13px] font-black text-white drop-shadow-md truncate max-w-[100px]">{product.sellerName}</span>
          </button>
          {(product.sellerVerified || product.sellerPremium) && (
            <span className="flex-shrink-0 drop-shadow-lg">
              <VerifiedTag tier={product.sellerPremium ? 'premium' : 'verified'} size="md"/>
            </span>
          )}
          {/* Bouton Suivre — juste après le badge */}
          {currentUser?.uid !== product.sellerId && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`text-[10px] font-black px-3 py-1.5 rounded-full active:scale-90 transition-all flex-shrink-0 disabled:opacity-50 ${
                isFollowing
                  ? 'bg-white/20 backdrop-blur-md text-white border border-white/40'
                  : 'bg-green-500 text-white shadow-lg'
              }`}
            >
              {followLoading ? '...' : isFollowing ? 'Suivi ✓' : 'Suivre'}
            </button>
          )}
        </div>

        {/* ── Badge état (Neuf, etc.) sous le header ── */}
        {product.condition && product.status !== 'sold' && (
          <div className="absolute top-14 right-16 z-10">
            <ConditionBadge condition={product.condition} size="sm"/>
          </div>
        )}

        {/* ── Actions latérales droites — style TikTok ── */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
          {/* Like — Pouce */}
          <button onClick={handleLike} disabled={likeLoading}
            className={`flex flex-col items-center gap-0.5 transition-all disabled:opacity-60 ${isLiked ? 'animate-[thumbPop_0.4s_ease]' : 'active:scale-90'}`}
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300 ${isLiked ? 'bg-blue-500 border-blue-400 scale-110' : 'bg-white/20 backdrop-blur-md border-white/30'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24"
                fill={isLiked ? 'white' : 'none'}
                stroke={isLiked ? 'white' : 'white'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
              </svg>
            </div>
            {likeCount > 0 && <span className="text-[11px] font-black text-white drop-shadow-md">{likeCount}</span>}
          </button>

          {/* Offre */}
          <button onClick={e => {
              e.stopPropagation();
              if (!currentUser) { onGuestAction?.(); return; }
              if (onOfferClick) { onOfferClick(product); } else { onClick(); }
            }}
            className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
          >
            <div className="w-11 h-11 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <span className="text-[9px] font-black text-white drop-shadow-md">Offre</span>
          </button>

          {/* Panier */}
          <button onClick={e => {
              e.stopPropagation();
              if (!currentUser) { onGuestAction?.(); return; }
              if ('vibrate' in navigator) navigator.vibrate(15);
              onAddToCart?.(product);
              setCartAdded(true);
              setTimeout(() => setCartAdded(false), 2000);
            }}
            className={`flex flex-col items-center gap-0.5 transition-all ${cartAdded ? 'animate-[cartBounce_0.5s_ease]' : 'active:scale-90'}`}
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-colors ${cartAdded ? 'bg-green-500' : 'bg-orange-500'}`}>
              {cartAdded ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                </svg>
              )}
            </div>
            <span className="text-[9px] font-black text-white drop-shadow-md">{cartAdded ? 'Ajouté !' : 'Panier'}</span>
          </button>

          {/* Partager */}
          <button onClick={handleShare}
            className={`flex flex-col items-center gap-0.5 transition-all ${shared ? 'animate-[sharePop_0.5s_ease]' : 'active:scale-90'}`}
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300 ${shared ? 'bg-green-500 border-green-400' : 'bg-white/20 backdrop-blur-md border-white/30'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </div>
            <span className="text-[9px] font-black text-white drop-shadow-md">{shared ? 'Copié !' : 'Partager'}</span>
          </button>

        </div>

        {/* ── Badges en bas à gauche de l'image ── */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
          {isNew && <span className="bg-green-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-md">Nouveau</span>}
          {product.status === 'sold' && <span className="bg-gray-900/90 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter">Vendu</span>}
          {(p as any).hasAcceptedOffer && product.status !== 'sold' && (
            <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">🤝 Offre</span>
          )}
          {isBoosted && (
            <span className="bg-amber-500 text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-md">⚡ Sponsorisé</span>
          )}
        </div>

        {/* ── Bouton "Voir plus" en bas de l'image ── */}
        <button
          onClick={onClick}
          className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md text-gray-800 text-[11px] font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-md active:scale-95 transition-all mt-8"
          style={{ marginTop: '2rem', position: 'absolute', bottom: '12px', left: '12px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          Voir plus
        </button>

        {/* Indicateurs de position images */}
        {images.length > 1 && (
          <div className="absolute top-16 left-0 right-0 flex justify-center gap-1.5">
            {images.slice(0, 6).map((_: string, idx: number) => (
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
          <div className="absolute top-16 right-3 bg-black/50 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-full">
            {currentImg + 1}/{images.length}
          </div>
        )}

        {/* Badge Vente flash */}
        {isFlashSale && (
          <div className="absolute bottom-16 left-3 right-16">
            <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-4 py-2 rounded-2xl flex items-center gap-2 justify-center shadow-xl shadow-red-500/30"
              style={{ animation: 'pulse 2s infinite' }}>
              <span className="text-sm">🔥</span>
              <span>{p.flashSaleLabel || `-${pct}% VENTE FLASH`}</span>
              {promoEnd > 0 && (
                <span className="text-[8px] font-bold opacity-80 ml-1">
                  · {Math.max(0, Math.ceil((promoEnd - nowMs) / 3600000))}h
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Infos produit en bas ── */}
      <div className="px-4 py-4 cursor-pointer" onClick={onClick}>
        {/* Titre */}
        <h3 className="text-[16px] font-black text-gray-900 leading-tight line-clamp-2">
          {product.title}
        </h3>

        {/* Description courte si dispo */}
        {product.description && (
          <p className="text-[12px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Tags catégorie */}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {product.category && (
            <span className="text-[10px] font-bold text-green-700 border border-green-200 bg-green-50 px-2.5 py-1 rounded-full">
              #{product.category}
            </span>
          )}
          {product.neighborhood && (
            <span className="text-[10px] font-bold text-slate-500 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-full">
              📍 {product.neighborhood}
            </span>
          )}
          {product.sellerManagesDelivery && (
            <span className="text-[10px] font-bold text-purple-700 border border-purple-200 bg-purple-50 px-2.5 py-1 rounded-full">
              📦 Livraison
            </span>
          )}
        </div>

        {/* Prix */}
        <div className="flex items-baseline gap-2 mt-3">
          <span className={`text-[22px] font-black ${isFlashSale ? 'text-red-600' : 'text-gray-900'}`}>{displayPrice.toLocaleString('fr-FR')}</span>
          <span className="text-[12px] font-bold text-slate-400">FCFA</span>
          {pct > 0 && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isFlashSale ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>
              -{pct}%
            </span>
          )}
        </div>
        {crossedPrice && crossedPrice > displayPrice && (
          <p className="text-[11px] text-slate-400 line-through font-bold">{crossedPrice.toLocaleString('fr-FR')} FCFA</p>
        )}

        {/* Stats sociales */}
        {((product as any).viewCount > 0 || product.whatsappClickCount > 0) && (
          <div className="flex items-center gap-3 mt-2">
            {(product as any).viewCount > 0 && (
              <span className="text-[10px] font-bold text-slate-400">⭐ {(product as any).viewCount} vues</span>
            )}
            {product.whatsappClickCount > 0 && !product.hideStats && (
              <span className="text-[10px] font-bold text-slate-400">💬 {product.whatsappClickCount} contact{product.whatsappClickCount > 1 ? 's' : ''}</span>
            )}
          </div>
        )}

        {/* ── Boutons CTA en bas ── */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={e => {
              e.stopPropagation();
              if (!currentUser) { onGuestAction?.(); return; }
              if (onStartChat && product.sellerId) {
                onStartChat(product.sellerId, product.sellerName || '', product.id, product.title);
              } else {
                onClick();
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-green-500 text-green-600 rounded-full font-black text-[12px] active:scale-95 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            Discuter
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              if (!currentUser) { onGuestAction?.(); return; }
              if (onBuyClick) { onBuyClick(product); } else { onClick(); }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full font-black text-[12px] active:scale-95 transition-all shadow-lg"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
            </svg>
            Acheter
          </button>
        </div>
      </div>
    </div>
  );
}
