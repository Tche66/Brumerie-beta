// src/pages/SellerProfilePage.tsx — v5 · Bannière grande, logos réseaux, horaires accordéon
import React, { useState, useEffect } from 'react';
import { Review, Product, User } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { VerifiedTag } from '@/components/VerifiedTag';
import { SocialIcon, SocialBar, SocialNetwork } from '@/components/SocialIcon';
import { getUserById, updateUserProfile } from '@/services/userService';
import { formatLastSeen, getActivityColor, isShopClosed, formatShopClosedUntil, followSeller, unfollowSeller } from '@/services/shopFeaturesService';
import { getSellerProducts, updateProduct } from '@/services/productService';
import { addBookmark, removeBookmark } from '@/services/bookmarkService';
import { subscribeSellerReviews } from '@/services/reviewService';
import { drawQROnCanvas } from '@/utils/qrCode';
import { useAuth } from '@/contexts/AuthContext';
import { BruIcons } from '@/components/BruIcons';

// ── QR Code ────────────────────────────────────────────────────
function ShopQRImage({ url }: { url: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);
  const SIZE = 180;
  React.useEffect(() => {
    if (!canvasRef.current || !url) return;
    let cancelled = false;
    drawQROnCanvas(canvasRef.current, url, { dark: '#0f5c2e', light: '#FFFFFF', margin: 2 })
      .then(() => { if (!cancelled) setReady(true); })
      .catch(e => console.warn('QR error:', e));
    return () => { cancelled = true; };
  }, [url]);
  return (
    <div style={{ width: SIZE, height: SIZE, position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, background: '#f8fafc', borderRadius: 12 }}
          className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      )}
      <canvas ref={canvasRef} width={SIZE} height={SIZE}
        style={{ display: ready ? 'block' : 'none', borderRadius: 12 }} />
    </div>
  );
}

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24"
          fill={rating >= s ? '#FBBF24' : '#E2E8F0'} stroke="none">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

interface SellerProfilePageProps {
  sellerId: string;
  onBack: () => void;
  onProductClick: (product: Product) => void;
  onStartChat?: (sellerId: string, sellerName: string) => void;
  onEditProduct?: (product: Product) => void;
  onNavigate?: (page: string) => void;
  isGuest?: boolean;
  onGuestAction?: (reason: string) => void;
}

type Tab = 'actifs' | 'vendus' | 'brouillons';

export function SellerProfilePage({
  sellerId, onBack, onProductClick, onStartChat,
  onEditProduct, onNavigate, isGuest, onGuestAction,
}: SellerProfilePageProps) {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const isSelf = currentUser?.uid === sellerId;

  const [seller, setSeller]             = useState<User | null>(null);
  const [products, setProducts]         = useState<Product[]>([]);
  const [loading, setLoading]           = useState(true);
  const [bookmarkIds, setBookmarkIds]   = useState<Set<string>>(new Set());
  const [reviews, setReviews]           = useState<Review[]>([]);
  const [avgRating, setAvgRating]       = useState(0);
  const [reviewCount, setReviewCount]   = useState(0);
  const [tab, setTab]                   = useState<Tab>('actifs');
  const [showQR, setShowQR]             = useState(false);
  const [showAllHours, setShowAllHours] = useState(false);
  const [isFollowing, setIsFollowing]   = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const profileUrl = `https://www.brumerie.com/vendeur/${sellerId}`;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [sellerData, sellerProducts] = await Promise.all([
        getUserById(sellerId),
        getSellerProducts(sellerId),
      ]);
      setSeller(sellerData);
      setProducts(sellerProducts);
      setLoading(false);
    })();
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) return;
    return subscribeSellerReviews(sellerId, (r, avg, cnt) => {
      setReviews(r); setAvgRating(avg); setReviewCount(cnt);
    });
  }, [sellerId]);

  useEffect(() => {
    setBookmarkIds(new Set(userProfile?.bookmarkedProductIds || []));
  }, [userProfile?.bookmarkedProductIds]);

  // Sync état suivi depuis profil acheteur
  useEffect(() => {
    setIsFollowing(!!(userProfile?.followingSellers?.includes(sellerId)));
  }, [userProfile?.followingSellers, sellerId]);

  // Charger le nombre de followers du vendeur
  useEffect(() => {
    if (!sellerId) return;
    import('firebase/firestore').then(({ getDocs, query, collection, where }) =>
      import('@/config/firebase').then(({ db }) => {
        getDocs(query(collection(db, 'users'), where('followingSellers', 'array-contains', sellerId)))
          .then(snap => setFollowersCount(snap.size))
          .catch(() => {});
      })
    );
  }, [sellerId]);

  const activeProducts = products.filter(p => p.status === 'active');
  const soldProducts   = products.filter(p => p.status === 'sold');
  const draftProducts  = products.filter(p => p.status === 'draft' || p.status === 'paused');

  const totalViews    = products.reduce((s, p) => s + (p.viewCount || 0), 0);
  const totalContacts = products.reduce((s, p) => s + (p.whatsappClickCount || 0), 0);

  const s = seller as any; // shorthand pour les champs étendus

  const handleBookmark = async (id: string) => {
    if (!currentUser) return;
    if (bookmarkIds.has(id)) await removeBookmark(currentUser.uid, id);
    else await addBookmark(currentUser.uid, id);
    await refreshUserProfile();
  };

  const handlePublishDraft = async (product: Product) => {
    setPublishingId(product.id);
    try {
      await updateProduct(product.id, { status: 'active' });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: 'active' as const } : p));
      if (currentUser) {
        try {
          const { increment, doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('@/config/firebase');
          await updateDoc(doc(db, 'users', currentUser.uid), { publicationCount: increment(1), productCount: increment(1) });
        } catch {}
      }
    } finally { setPublishingId(null); }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${seller?.name} — Boutique Brumerie`, text: `Découvre la boutique de ${seller?.name} sur Brumerie <BruIcons.ShoppingBag size={14}/>`, url: profileUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(profileUrl).catch(() => {});
    }
  };

  const memberSince = (() => {
    if (!seller?.createdAt) return null;
    try {
      const d = (seller.createdAt as any)?.toDate ? (seller.createdAt as any).toDate() : new Date(seller.createdAt);
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch { return null; }
  })();

  const tier = s?.isPremium ? 'premium' : seller?.isVerified ? 'verified' : 'simple';
  const hasFlash = s?.flashSaleActive && s?.flashSaleLabel && (!s?.flashSaleExpiry || new Date(s.flashSaleExpiry) > new Date());
  const hasSocials = s?.shopWhatsapp || s?.shopInstagram || s?.shopTiktok;
  const hasSocialLinks = s?.socialLinks && Object.values(s.socialLinks).some(Boolean);

  return (
    <div className="min-h-screen pb-24 font-sans bg-slate-50">

      {/* ── HEADER ── */}
      <div className="bg-white sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all flex-shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="font-black text-[13px] uppercase tracking-widest text-slate-900 flex-1 truncate">
          {isSelf ? '<BruIcons.Store size={14}/> Ma Boutique' : 'Profil Vendeur'}
        </h1>
        {seller && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowQR(true)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="5" y="5" width="3" height="3" fill="#475569" stroke="none"/>
                <rect x="16" y="5" width="3" height="3" fill="#475569" stroke="none"/>
                <rect x="5" y="16" width="3" height="3" fill="#475569" stroke="none"/>
                <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h1v1h-1z"/>
              </svg>
            </button>
            <button onClick={handleShare} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          </div>
        )}
        {!isSelf && isGuest && (
          <button onClick={() => onGuestAction?.('default')} className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-full uppercase tracking-wider">
            Se connecter
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-32 gap-4">
          <div className="w-14 h-14 border-4 border-slate-100 border-t-green-600 rounded-[2rem] animate-spin"/>
          <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Chargement...</p>
        </div>
      ) : seller ? (
        <>
          {/* ══════════════════════════════════════════
              SECTION 1 — BANNIÈRE + IDENTITÉ
          ══════════════════════════════════════════ */}

          {/* Bannière */}
          {s?.shopBanner ? (
            <div className="w-full h-56 overflow-hidden relative">
              <img src={s.shopBanner} alt="Bannière" className="w-full h-full object-cover"/>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5))' }}/>
              {hasFlash && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase animate-pulse shadow-lg">
                  <BruIcons.Zap size={14}/> {s.flashSaleLabel}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-40 relative overflow-hidden" style={{
              background: s?.shopThemeColor
                ? `linear-gradient(135deg, ${s.shopThemeColor}40, ${s.shopThemeColor}15)`
                : 'linear-gradient(135deg,#e8f5e9,#f0fdf4)'
            }}>
              {hasFlash && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase animate-pulse shadow-lg">
                  <BruIcons.Zap size={14}/> {s.flashSaleLabel}
                </div>
              )}
            </div>
          )}

          {/* Carte identité */}
          <div className="bg-white border-b border-slate-100 shadow-sm px-5 pb-6 -mt-6 relative">
            <div className="flex flex-col items-center text-center">

              {/* Avatar + badge */}
              <div className="relative mb-3">
                <div className="w-24 h-24 rounded-[2rem] overflow-hidden bg-slate-100 border-4 border-white shadow-xl">
                  {seller.photoURL
                    ? <img src={seller.photoURL} alt={seller.name} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-4xl font-black">{seller.name?.charAt(0)?.toUpperCase()}</div>
                  }
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <VerifiedTag tier={tier as any} size="sm"/>
                </div>
              </div>

              {/* Boutique fermée — bandeau visible */}
              {isShopClosed(seller?.shopClosedUntil) && (
                <div className="w-full mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <p className="font-black text-amber-800 text-[12px]"><BruIcons.Lock size={14}/> Boutique temporairement fermée</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    Réouvre le {formatShopClosedUntil(seller?.shopClosedUntil)}
                  </p>
                  {seller?.shopClosedMessage && (
                    <p className="text-[10px] text-amber-600 italic mt-1">"{seller.shopClosedMessage}"</p>
                  )}
                </div>
              )}

              {/* Nom + note */}
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">{seller.name}</h2>

              {/* Dernier vu */}
              {seller?.lastActiveAt && (() => {
                const color = getActivityColor(seller.lastActiveAt);
                return (
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color === 'green' ? 'bg-green-500 animate-pulse' : color === 'amber' ? 'bg-amber-400' : 'bg-slate-300'}`}/>
                    <span className="text-[10px] font-bold text-slate-500">{formatLastSeen(seller.lastActiveAt)}</span>
                  </div>
                );
              })()}
              {avgRating > 0 && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Stars rating={avgRating} size={13}/>
                  <span className="text-[11px] font-black text-amber-600">{avgRating.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400">({reviewCount} avis)</span>
                </div>
              )}

              {/* Slogan */}
              {s?.shopSlogan && (
                <p className="text-[11px] font-bold italic mb-2" style={{ color: s?.shopThemeColor || '#16A34A' }}>
                  "{s.shopSlogan}"
                </p>
              )}

              {/* Catégories boutique */}
              {s?.shopCategories?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap justify-center mb-3">
                  {s.shopCategories.map((cat: string) => (
                    <span key={cat} className="text-[9px] font-black px-2.5 py-1 rounded-full text-white uppercase"
                      style={{ background: s?.shopThemeColor || '#16A34A' }}>
                      {cat}
                    </span>
                  ))}
                </div>
              )}

              {/* Bio */}
              {s?.bio && (
                <p className="text-[12px] text-slate-500 leading-relaxed max-w-xs mb-4" style={{ whiteSpace: 'pre-line' }}>
                  {s.bio}
                </p>
              )}

              {/* Pills infos */}
              <div className="flex items-center gap-2 flex-wrap justify-center mb-4">
                {seller.neighborhood && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-50 px-2.5 py-1 rounded-full">
                    <BruIcons.MapPin size={10}/> {seller.neighborhood}
                  </span>
                )}
                {memberSince && (
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2.5 py-1 rounded-full">
                    🗓 Depuis {memberSince}
                  </span>
                )}
                {seller.managesDelivery && (
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                    <BruIcons.Moto size={14}/> Livraison dispo
                  </span>
                )}
                {seller.hasPhysicalShop && (
                  <span className="text-[10px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded-full">
                    🏠 Boutique physique
                  </span>
                )}
                {s?.awAddressCode && (
                  <a href={`https://addressweb.brumerie.com/${s.awAddressCode}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-black bg-sky-50 border border-sky-200 text-sky-700 px-2.5 py-1 rounded-full active:scale-95 transition-all">
                    🗺 {s.awAddressCode}
                  </a>
                )}
              </div>

              {/* CTA principal — visiteur */}
              {!isSelf && !isGuest && currentUser && (
                <button
                  disabled={followLoading}
                  onClick={async () => {
                    if (!currentUser) return;
                    setFollowLoading(true);
                    try {
                      if (isFollowing) {
                        await unfollowSeller(currentUser.uid, sellerId);
                        setIsFollowing(false);
                        setFollowersCount(c => Math.max(0, c - 1));
                      } else {
                        await followSeller(currentUser.uid, sellerId, seller.name);
                        setIsFollowing(true);
                        setFollowersCount(c => c + 1);
                      }
                      await refreshUserProfile();
                    } catch {}
                    setFollowLoading(false);
                  }}
                  className="px-5 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 border-2 flex-shrink-0"
                  style={{
                    borderColor: s?.shopThemeColor || '#16A34A',
                    color: isFollowing ? 'white' : (s?.shopThemeColor || '#16A34A'),
                    background: isFollowing ? (s?.shopThemeColor || '#16A34A') : 'transparent',
                  }}>
                  {followLoading ? '...' : isFollowing ? '✓ Suivi' : '+ Suivre'}
                </button>
              )}
              {!isSelf && !isGuest && onStartChat && (
                <button onClick={() => onStartChat(sellerId, seller.name)}
                  className="w-full max-w-xs py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-all mb-2"
                  style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  Contacter le vendeur
                </button>
              )}

              {/* CTA propriétaire */}
              {isSelf && (
                <div className="flex gap-2 w-full max-w-xs mt-1">
                  <button onClick={() => onNavigate?.('edit-profile')}
                    className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all bg-white">
                    <BruIcons.Edit size={14}/> Profil
                  </button>
                  <button onClick={() => onNavigate?.('sell')}
                    className="flex-[2] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                    + Publier
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════
              SECTION 2 — STATS
          ══════════════════════════════════════════ */}
          <div className="px-4 pt-4 pb-2">
            <div className="grid grid-cols-3 gap-2">
              {isSelf ? (
                <>
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                    <p className="font-black text-blue-600 text-lg leading-none">{totalViews}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Vues</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                    <p className="font-black text-purple-600 text-lg leading-none">{totalContacts}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Contacts</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                    <p className="font-black text-green-600 text-lg leading-none">{soldProducts.length}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Vendus</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                    <p className="font-black text-green-600 text-lg leading-none">{activeProducts.length}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">En ligne</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                    <p className="font-black text-purple-600 text-lg leading-none">{followersCount}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Abonnés</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                    <p className="font-black text-amber-500 text-lg leading-none">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Note</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                    <p className="font-black text-green-600 text-lg leading-none">{activeProducts.length}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Articles</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                    <p className="font-black text-purple-600 text-lg leading-none">{followersCount}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Abonnés</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                    <p className="font-black text-amber-500 text-lg leading-none">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Note</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════
              SECTION 3 — CONTACT & INFOS BOUTIQUE
              (téléphone + physique + réseaux — 1 seul bloc)
          ══════════════════════════════════════════ */}
          {(seller.phone || seller.hasPhysicalShop || hasSocials || hasSocialLinks) && (
            <div className="mx-4 mt-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Téléphone */}
              {seller.phone && (
                <a href={`tel:${seller.phone}`}
                  className="flex items-center gap-3 px-5 py-4 border-b border-slate-50 active:bg-slate-50 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</p>
                    <p className="font-black text-slate-800 text-[13px]">{seller.phone}</p>
                  </div>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </a>
              )}

              {/* Boutique physique — avec accordéon horaires */}
              {seller.hasPhysicalShop && s?.shopAddress && (
                <div className="px-5 py-4 border-b border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5"><BruIcons.Store size={14}/> Boutique physique</p>
                  <p className="text-[12px] font-bold text-slate-800 flex items-start gap-1.5 mb-2">
                    <span className="flex-shrink-0"><BruIcons.MapPin size={10}/></span>{s.shopAddress}
                  </p>
                  {s?.shopHours && (() => {
                    const allHours = Object.entries(s.shopHours).filter(([,v]) => v);
                    if (allHours.length === 0) return null;
                    const visible = showAllHours ? allHours : allHours.slice(0, 2);
                    return (
                      <div>
                        {visible.map(([day, val]) => (
                          <p key={day} className="text-[10px] text-slate-500 capitalize mt-0.5">{day} : {val as string}</p>
                        ))}
                        {allHours.length > 2 && (
                          <button onClick={() => setShowAllHours(v => !v)}
                            className="mt-1.5 text-[9px] font-black text-green-600 flex items-center gap-1 active:scale-95 transition-all">
                            {showAllHours ? (
                              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>Masquer</>
                            ) : (
                              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>Voir tous les {allHours.length} jours</>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Réseaux sociaux — WhatsApp boutique + SocialBar (logos officiels) */}
              {(s?.shopWhatsapp || (s?.socialLinks && Object.values(s.socialLinks).some(Boolean))) && (
                <div className="px-5 py-4">
                  {/* WhatsApp boutique en premier — bouton vert */}
                  {s?.shopWhatsapp && (
                    <a href={`https://wa.me/${s.shopWhatsapp.replace(/\D/g,'')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-[11px] font-black active:scale-95 transition-all mb-4"
                      style={{ background: '#25D366' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2.0001C6.477 2.0001 2 6.4771 2 11.9991c0 1.993.577 3.85 1.568 5.422L2.005 22.0001l4.698-1.539A9.976 9.976 0 0012 21.9991c5.523 0 9.999-4.477 9.999-9.999C21.999 6.4771 17.522 2.0001 11.999 2.0001z"/></svg>
                      WhatsApp
                    </a>
                  )}
                  {/* Logos officiels via SocialBar */}
                  {s?.socialLinks && Object.values(s.socialLinks).some(Boolean) && (
                    <SocialBar links={s.socialLinks} size={38}/>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════
              SECTION 4 — AVIS CLIENTS
          ══════════════════════════════════════════ */}
          {reviews.length > 0 && (
            <div className="mx-4 mt-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">⭐ Avis clients</p>

              {/* Résumé compact */}
              <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm mb-3 flex items-center gap-4">
                <div className="text-center flex-shrink-0">
                  <p className="text-3xl font-black text-slate-900">{avgRating.toFixed(1)}</p>
                  <Stars rating={avgRating} size={11}/>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">{reviewCount} avis</p>
                </div>
                <div className="flex-1">
                  {[5,4,3,2,1].map(star => {
                    const count = reviews.filter(r => r.rating === star).length;
                    const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] text-slate-400 w-2 font-bold">{star}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }}/>
                        </div>
                        <span className="text-[9px] text-slate-400 w-3 font-bold text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Liste avis */}
              <div className="space-y-2">
                {reviews.slice(0, isSelf ? 5 : 3).map(review => (
                  <div key={review.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        {review.fromUserPhoto
                          ? <img src={review.fromUserPhoto} alt="" className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-sm">{review.fromUserName?.charAt(0)?.toUpperCase()}</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-[11px] truncate">{review.fromUserName}</p>
                        <p className="text-[9px] text-slate-400 truncate">
                          {review.fromUserNeighborhood ? `<BruIcons.MapPin size={10}/> ${review.fromUserNeighborhood}` : review.productTitle ? `<BruIcons.ShoppingBag size={14}/> ${review.productTitle}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <Stars rating={review.rating} size={10}/>
                        {review.createdAt && (
                          <span className="text-[8px] text-slate-300">
                            {new Date((review.createdAt as any)?.toDate?.() || review.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {review.comment && <p className="text-[11px] text-slate-600 italic leading-snug">"{review.comment}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              SECTION 5 — CATALOGUE
          ══════════════════════════════════════════ */}
          <div className="px-4 mt-4">
            {/* Onglets */}
            <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-4">
              {([
                { id: 'actifs',    label: 'En ligne',  count: activeProducts.length },
                { id: 'vendus',    label: 'Vendus',    count: soldProducts.length },
                ...(isSelf ? [{ id: 'brouillons', label: 'Brouillons', count: draftProducts.length }] : []),
              ] as { id: Tab; label: string; count: number }[]).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                    tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                  }`}>
                  {t.label}
                  {t.count > 0 && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                      tab === t.id ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-400'
                    }`}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Grille articles actifs / vendus */}
            {(tab === 'actifs' || tab === 'vendus') && (
              (tab === 'actifs' ? activeProducts : soldProducts).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                  <p className="text-3xl mb-3">{tab === 'actifs' ? '<BruIcons.ShoppingBag size={14}/>' : '<BruIcons.Package size={14}/>'}</p>
                  <p className="font-black text-slate-400 uppercase tracking-tight text-[12px]">
                    {tab === 'actifs' ? (isSelf ? 'Aucun article en ligne' : 'Boutique vide') : 'Aucune vente pour l\'instant'}
                  </p>
                  {isSelf && tab === 'actifs' && (
                    <button onClick={() => onNavigate?.('sell')}
                      className="mt-4 px-5 py-2.5 rounded-2xl bg-green-600 text-white font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                      + Publier mon 1er article
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(tab === 'actifs' ? activeProducts : soldProducts).map(product => (
                    <div key={product.id} className="active:scale-95 transition-transform">
                      <ProductCard product={product} onClick={() => onProductClick(product)}
                        onBookmark={handleBookmark} isBookmarked={bookmarkIds.has(product.id)}/>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Brouillons — propriétaire seulement */}
            {tab === 'brouillons' && isSelf && (
              draftProducts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                  <p className="text-3xl mb-3"><BruIcons.FileText size={14}/></p>
                  <p className="font-black text-slate-400 uppercase tracking-tight text-[12px]">Aucun brouillon</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {draftProducts.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <div className="flex gap-3 p-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          {product.images?.[0] ? <img src={product.images[0]} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-2xl"><BruIcons.Package size={14}/></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-[13px] truncate">{product.title}</p>
                          <p className="text-[12px] font-bold text-green-600">{product.price?.toLocaleString('fr-CI')} FCFA</p>
                          <span className={`inline-block mt-1 text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${product.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {product.status === 'draft' ? '<BruIcons.FileText size={14}/> Brouillon' : '⏸ Suspendu'}
                          </span>
                        </div>
                      </div>
                      <div className="flex border-t border-slate-50 divide-x divide-slate-50">
                        <button onClick={() => onEditProduct?.(product)}
                          className="flex-1 py-2.5 text-[10px] font-black text-slate-600 uppercase tracking-wide active:bg-slate-50 transition-all flex items-center justify-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Modifier
                        </button>
                        <button onClick={() => handlePublishDraft(product)} disabled={publishingId === product.id}
                          className="flex-[2] py-2.5 text-[10px] font-black text-green-700 uppercase tracking-wide active:bg-green-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                          {publishingId === product.id
                            ? <><span className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/>Publication...</>
                            : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Mettre en ligne</>
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center pt-32 text-center px-10">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Vendeur Fantôme</h3>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Ce profil n'existe pas.</p>
          <button onClick={onBack} className="mt-10 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95">
            Retourner au quartier
          </button>
        </div>
      )}

      {/* ── MODAL QR CODE ── */}
      {showQR && seller && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ height: '100dvh', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-xs overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-7 pb-5 text-center" style={{ background: 'linear-gradient(150deg,#16A34A,#0f5c2e)' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src="/logo.png" alt="Brumerie" style={{ width:28, height:28, objectFit:'contain', filter:'brightness(0) invert(1)' }}/>
                <span className="text-white font-black text-[14px] tracking-wide">BRUMERIE</span>
              </div>
              <p className="text-white/60 text-[9px] font-bold uppercase tracking-[3px]">QR Code boutique</p>
              <p className="text-white font-black text-[13px] mt-1 truncate px-2">{seller.name}</p>
            </div>
            <div className="px-6 py-5 flex flex-col items-center">
              <div className="bg-white rounded-2xl p-3 border-2 border-green-100 shadow-lg mb-4">
                <ShopQRImage url={profileUrl}/>
              </div>
              <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Scanne pour visiter</p>
              <p className="text-[9px] text-slate-400 font-medium mb-4 truncate max-w-full px-2">{profileUrl}</p>
              <button onClick={() => setShowQR(false)}
                className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95"
                style={{ background: 'linear-gradient(135deg,#0f5c2e,#16A34A)' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
