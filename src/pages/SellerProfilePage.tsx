// src/pages/SellerProfilePage.tsx — v3 · Vue Magasin Complète
// Propriétaire : vue magasin avec stats, onglets, brouillons, actions
// Visiteur : profil public avec catalogue, avis, contact
import React, { useState, useEffect } from 'react';
import { Review, Product, User } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { VerifiedTag } from '@/components/VerifiedTag';
import { SocialBar } from '@/components/SocialIcon';
import { getUserById, updateUserProfile } from '@/services/userService';
import { getSellerProducts, updateProduct } from '@/services/productService';
import { addBookmark, removeBookmark } from '@/services/bookmarkService';
import { subscribeSellerReviews } from '@/services/reviewService';
import { drawQROnCanvas } from '@/utils/qrCode';
import { useAuth } from '@/contexts/AuthContext';

// ── QR Code ────────────────────────────────────────────────────
function ShopQRImage({ url }: { url: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);
  const SIZE = 190;
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

// ── Star row ───────────────────────────────────────────────────
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

// ── Stat pill ──────────────────────────────────────────────────
function StatPill({ icon, value, label, color = '#16A34A' }: {
  icon: string; value: string | number; label: string; color?: string;
}) {
  return (
    <div className="flex-1 bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm min-w-0">
      <div className="text-lg mb-0.5">{icon}</div>
      <p className="font-black text-slate-900 text-base leading-none" style={{ color }}>{value}</p>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────
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

  const [seller, setSeller]         = useState<User | null>(null);
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [reviews, setReviews]       = useState<Review[]>([]);
  const [avgRating, setAvgRating]   = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [tab, setTab]               = useState<Tab>('actifs');
  const [showShare, setShowShare]   = useState(false);
  const [showQR, setShowQR]         = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const profileUrl = `https://www.brumerie.com/vendeur/${sellerId}`;

  // ── Data loading ───────────────────────────────────────────
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

  // ── Computed stats ─────────────────────────────────────────
  const activeProducts  = products.filter(p => p.status === 'active');
  const soldProducts    = products.filter(p => p.status === 'sold');
  const pausedProducts  = products.filter(p => p.status === 'paused');
  const draftProducts   = products.filter(p => p.status === 'draft');
  const totalViews      = products.reduce((s, p) => s + (p.viewCount || 0), 0);
  const totalContacts   = products.reduce((s, p) => s + (p.whatsappClickCount || 0), 0);

  const tabProducts: Record<Tab, Product[]> = {
    actifs:    activeProducts,
    vendus:    soldProducts,
    brouillons: [...draftProducts, ...pausedProducts],
  };

  // ── Actions ────────────────────────────────────────────────
  const handleBookmark = async (id: string) => {
    if (!currentUser) return;
    const has = bookmarkIds.has(id);
    if (has) await removeBookmark(currentUser.uid, id);
    else     await addBookmark(currentUser.uid, id);
    await refreshUserProfile();
  };

  const handlePublishDraft = async (product: Product) => {
    setPublishingId(product.id);
    try {
      await updateProduct(product.id, { status: 'active' });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: 'active' as const } : p));
      // Incrémenter le compteur de publications maintenant que c'est publié
      if (currentUser) {
        try {
          const { increment } = await import('firebase/firestore');
          const { db } = await import('@/config/firebase');
          const { doc, updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'users', currentUser.uid), {
            publicationCount: increment(1),
            productCount: increment(1),
          });
        } catch { /* silent */ }
      }
    } finally {
      setPublishingId(null);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${seller?.name} — Boutique sur Brumerie`,
          text: `Découvre la boutique de ${seller?.name} sur Brumerie 🛍`,
          url: profileUrl,
        });
      } catch {}
    } else {
      setShowShare(true);
    }
  };

  const memberSince = (() => {
    if (!seller?.createdAt) return null;
    try {
      const d = (seller.createdAt as any)?.toDate
        ? (seller.createdAt as any).toDate()
        : new Date(seller.createdAt);
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch { return null; }
  })();

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">

      {/* ── HEADER ── */}
      <div className="bg-white sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all flex-shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-black text-[13px] uppercase tracking-widest text-slate-900 flex-1 truncate">
          {isSelf ? '🏪 Ma Boutique' : 'Profil Vendeur'}
        </h1>
        {seller && (
          <>
            <button onClick={() => setShowQR(true)}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="5" y="5" width="3" height="3" fill="#475569" stroke="none"/>
                <rect x="16" y="5" width="3" height="3" fill="#475569" stroke="none"/>
                <rect x="5" y="16" width="3" height="3" fill="#475569" stroke="none"/>
                <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h1v1h-1z"/>
              </svg>
            </button>
            <button onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          </>
        )}
        {!isSelf && isGuest && (
          <button onClick={() => onGuestAction?.('default')}
            className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-full uppercase tracking-wider">
            Se connecter
          </button>
        )}
        {!isSelf && !isGuest && onStartChat && seller && (
          <button onClick={() => onStartChat(sellerId, seller.name)}
            className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-full font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-green-200">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Discuter
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-32 gap-4 animate-pulse">
          <div className="w-14 h-14 border-4 border-slate-100 border-t-green-600 rounded-[2rem] animate-spin"/>
          <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Chargement...</p>
        </div>
      ) : seller ? (
        <>
          {/* ── BANNIÈRE / HERO ── */}
          {(seller as any).shopBanner ? (
            <div className="w-full h-40 overflow-hidden relative">
              <img src={(seller as any).shopBanner} alt="Bannière" className="w-full h-full object-cover"/>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.4))' }}/>
              {(seller as any).flashSaleActive && (seller as any).flashSaleLabel &&
               (!((seller as any).flashSaleExpiry) || new Date((seller as any).flashSaleExpiry) > new Date()) && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase animate-pulse shadow-lg">
                  ⚡ {(seller as any).flashSaleLabel}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-24" style={{
              background: (seller as any).shopThemeColor
                ? `linear-gradient(135deg, ${(seller as any).shopThemeColor}30, ${(seller as any).shopThemeColor}10)`
                : 'linear-gradient(135deg, #e8f5e9, #f0fdf4)'
            }}/>
          )}

          {/* ── CARTE IDENTITÉ ── */}
          <div className="bg-white px-5 pt-0 pb-6 border-b border-slate-100 shadow-sm -mt-6 relative">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative mb-3">
                <div className="w-24 h-24 rounded-[2rem] overflow-hidden bg-slate-100 border-4 border-white shadow-xl">
                  {seller.photoURL
                    ? <img src={seller.photoURL} alt={seller.name} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-4xl font-black">
                        {seller.name?.charAt(0)?.toUpperCase()}
                      </div>
                  }
                </div>
                {/* Badge tier */}
                <div className="absolute -bottom-1 -right-1">
                  <VerifiedTag tier={(seller as any).isPremium ? 'premium' : seller.isVerified ? 'verified' : 'simple'} size="sm"/>
                </div>
              </div>

              {/* Nom */}
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">{seller.name}</h2>

              {/* Étoiles */}
              {avgRating > 0 && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Stars rating={avgRating} size={13}/>
                  <span className="text-[11px] font-black text-amber-600">{avgRating.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400">({reviewCount} avis)</span>
                </div>
              )}

              {/* Slogan boutique */}
              {(seller as any).shopSlogan && (
                <p className="text-[11px] font-bold italic mb-2" style={{ color: (seller as any).shopThemeColor || '#16A34A' }}>
                  "{(seller as any).shopSlogan}"
                </p>
              )}

              {/* Collections */}
              {(seller as any).shopCategories?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap justify-center mb-3">
                  {(seller as any).shopCategories.map((cat: string) => (
                    <span key={cat}
                      className="text-[9px] font-black px-2.5 py-1 rounded-full text-white uppercase"
                      style={{ background: (seller as any).shopThemeColor || '#16A34A' }}>
                      {cat}
                    </span>
                  ))}
                </div>
              )}

              {/* Bio */}
              {(seller as any).bio && (
                <p className="text-[12px] text-slate-500 leading-relaxed max-w-xs mb-3" style={{ whiteSpace: 'pre-line' }}>
                  {(seller as any).bio}
                </p>
              )}

              {/* Meta infos */}
              <div className="flex items-center gap-2 flex-wrap justify-center mb-3">
                {seller.neighborhood && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-50 px-2.5 py-1 rounded-full">
                    📍 {seller.neighborhood}
                  </span>
                )}
                {memberSince && (
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2.5 py-1 rounded-full">
                    🗓 Depuis {memberSince}
                  </span>
                )}
                {seller.hasPhysicalShop && (
                  <span className="text-[10px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded-full">
                    🏠 Boutique physique
                  </span>
                )}
                {seller.managesDelivery && (
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                    🛵 Livraison dispo
                  </span>
                )}
              </div>

              {/* Adresse numérique */}
              {(seller as any).awAddressCode && (
                <a href={`https://addressweb.brumerie.com/${(seller as any).awAddressCode}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-3 active:scale-95 transition-all">
                  🗺 {(seller as any).awAddressCode}
                </a>
              )}

              {/* Téléphone */}
              {seller.phone && (
                <a href={`tel:${seller.phone}`}
                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 mb-3 active:scale-95 transition-all">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
                  <span className="font-black text-slate-700 text-[12px]">{seller.phone}</span>
                </a>
              )}

              {/* Infos magasin physique */}
              {seller.hasPhysicalShop && (seller as any).shopAddress && (
                <div className="bg-slate-50 rounded-2xl px-4 py-3 w-full max-w-xs mb-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">🏪 Boutique physique</p>
                  <p className="text-[11px] font-bold text-slate-800 flex items-start gap-1.5">
                    <span>📍</span>{(seller as any).shopAddress}
                  </p>
                  {(seller as any).shopHours && Object.entries((seller as any).shopHours).filter(([,v]) => v).slice(0,3).map(([day, val]) => (
                    <p key={day} className="text-[10px] text-slate-500 capitalize mt-0.5">{day} : {val as string}</p>
                  ))}
                </div>
              )}

              {/* Liens réseaux sociaux boutique */}
              {((seller as any).shopInstagram || (seller as any).shopTiktok || (seller as any).shopWhatsapp) && (
                <div className="flex gap-2 mb-3 flex-wrap justify-center">
                  {(seller as any).shopWhatsapp && (
                    <a href={`https://wa.me/${((seller as any).shopWhatsapp).replace(/\D/g,'')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[9px] font-black active:scale-95"
                      style={{ background: '#25D366' }}>
                      💬 WhatsApp
                    </a>
                  )}
                  {(seller as any).shopInstagram && (
                    <a href={`https://instagram.com/${(seller as any).shopInstagram}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[9px] font-black active:scale-95"
                      style={{ background: 'linear-gradient(135deg,#E1306C,#F77737)' }}>
                      📸 Instagram
                    </a>
                  )}
                  {(seller as any).shopTiktok && (
                    <a href={`https://tiktok.com/@${(seller as any).shopTiktok}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[9px] font-black active:scale-95"
                      style={{ background: '#000000' }}>
                      🎵 TikTok
                    </a>
                  )}
                </div>
              )}

              {/* Réseaux sociaux */}
              {(seller as any).socialLinks && Object.values((seller as any).socialLinks).some(Boolean) && (
                <div className="mb-3">
                  <SocialBar links={(seller as any).socialLinks} size={32}/>
                </div>
              )}

              {/* Boutons actions visiteur */}
              {!isSelf && !isGuest && onStartChat && (
                <button onClick={() => onStartChat(sellerId, seller.name)}
                  className="w-full max-w-xs py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  Contacter le vendeur
                </button>
              )}

              {/* Boutons actions propriétaire */}
              {isSelf && (
                <div className="flex gap-2 w-full max-w-xs mt-1">
                  <button onClick={() => onNavigate?.('edit-profile')}
                    className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all bg-white">
                    ✏️ Profil
                  </button>
                  <button onClick={() => onNavigate?.('sell')}
                    className="flex-[2] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                    + Publier un article
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── STATS PROPRIÉTAIRE ── */}
          {isSelf && (
            <div className="px-4 py-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">📊 Mes statistiques</p>
              <div className="flex gap-2 mb-2">
                <StatPill icon="👁" value={totalViews} label="Vues totales" color="#3B82F6"/>
                <StatPill icon="💬" value={totalContacts} label="Contacts" color="#8B5CF6"/>
                <StatPill icon="✅" value={soldProducts.length} label="Vendus" color="#16A34A"/>
              </div>
              <div className="flex gap-2">
                <StatPill icon="🛍" value={activeProducts.length} label="En ligne" color="#16A34A"/>
                <StatPill icon="📝" value={draftProducts.length + pausedProducts.length} label="Brouillons" color="#F59E0B"/>
                <StatPill icon="⭐" value={avgRating > 0 ? avgRating.toFixed(1) : '—'} label="Note moy." color="#F59E0B"/>
              </div>
            </div>
          )}

          {/* ── STATS VISITEUR (synthèse) ── */}
          {!isSelf && (
            <div className="px-4 py-3">
              <div className="flex gap-2">
                <StatPill icon="🛍" value={activeProducts.length} label="Articles" color="#16A34A"/>
                <StatPill icon="✅" value={soldProducts.length} label="Vendus" color="#3B82F6"/>
                {avgRating > 0 && <StatPill icon="⭐" value={avgRating.toFixed(1)} label="Note" color="#F59E0B"/>}
              </div>
            </div>
          )}

          {/* ── AVIS CLIENTS ── */}
          {(avgRating > 0 || reviews.length > 0) && (
            <div className="px-4 mb-4">
              {/* Résumé note */}
              <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm mb-3">
                <div className="flex items-center gap-4">
                  <div className="text-center flex-shrink-0">
                    <p className="text-4xl font-black text-slate-900">{avgRating.toFixed(1)}</p>
                    <Stars rating={avgRating} size={13}/>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{reviewCount} avis</p>
                  </div>
                  <div className="flex-1">
                    {/* Barres de distribution si on a assez d'avis */}
                    {reviews.length >= 2 && [5,4,3,2,1].map(star => {
                      const count = reviews.filter(r => r.rating === star).length;
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] text-slate-400 w-2 font-bold">{star}</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }}/>
                          </div>
                          <span className="text-[9px] text-slate-400 w-3 font-bold text-right">{count}</span>
                        </div>
                      );
                    })}
                    {reviews.length < 2 && (
                      <div>
                        <p className="font-black text-slate-800 text-[12px]">Note globale</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Basée sur les commandes livrées</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Liste avis */}
              {reviews.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Derniers avis</p>
                  {reviews.slice(0, isSelf ? 5 : 3).map(review => (
                    <div key={review.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          {review.fromUserPhoto
                            ? <img src={review.fromUserPhoto} alt="" className="w-full h-full object-cover"/>
                            : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-sm">
                                {review.fromUserName?.charAt(0)?.toUpperCase()}
                              </div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-[11px] truncate">{review.fromUserName}</p>
                          {review.fromUserNeighborhood
                            ? <p className="text-[9px] font-bold text-green-600 truncate">📍 {review.fromUserNeighborhood}</p>
                            : review.productTitle
                              ? <p className="text-[9px] text-slate-400 truncate">🛍 {review.productTitle}</p>
                              : null
                          }
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <Stars rating={review.rating} size={10}/>
                          {review.createdAt && (
                            <span className="text-[8px] text-slate-300">
                              {new Date((review.createdAt as any)?.toDate?.() || review.createdAt)
                                .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-[11px] text-slate-600 italic leading-snug">"{review.comment}"</p>
                      )}
                      {review.fromUserNeighborhood && review.productTitle && (
                        <p className="text-[9px] text-slate-300 mt-1 truncate">🛍 {review.productTitle}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ONGLETS CATALOGUE ── */}
          <div className="px-4 mb-4">
            <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-4">
              {([
                { id: 'actifs',     label: 'En ligne',   count: activeProducts.length },
                { id: 'vendus',     label: 'Vendus',     count: soldProducts.length },
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

            {/* ── GRILLE ARTICLES ── */}
            {tab !== 'brouillons' ? (
              tabProducts[tab].length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                  <p className="text-3xl mb-3">{tab === 'actifs' ? '🛍' : '📦'}</p>
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
                  {tabProducts[tab].map(product => (
                    <div key={product.id} className="active:scale-95 transition-transform">
                      <ProductCard
                        product={product}
                        onClick={() => onProductClick(product)}
                        onBookmark={handleBookmark}
                        isBookmarked={bookmarkIds.has(product.id)}
                      />
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* ── BROUILLONS — vue propriétaire seulement ── */
              tabProducts.brouillons.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                  <p className="text-3xl mb-3">📝</p>
                  <p className="font-black text-slate-400 uppercase tracking-tight text-[12px]">Aucun brouillon</p>
                  <p className="text-[10px] text-slate-300 mt-1">Enregistre un article en brouillon lors de la publication</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tabProducts.brouillons.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <div className="flex gap-3 p-3">
                        {/* Miniature */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          {product.images?.[0]
                            ? <img src={product.images[0]} alt="" className="w-full h-full object-cover"/>
                            : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-[13px] truncate">{product.title}</p>
                          <p className="text-[12px] font-bold text-green-600">{product.price?.toLocaleString('fr-CI')} FCFA</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                              product.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {product.status === 'draft' ? '📝 Brouillon' : '⏸ Suspendu'}
                            </span>
                            {product.viewCount ? (
                              <span className="text-[8px] text-slate-400">👁 {product.viewCount}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      {/* Actions brouillon */}
                      <div className="flex border-t border-slate-50 divide-x divide-slate-50">
                        <button onClick={() => onEditProduct?.(product)}
                          className="flex-1 py-2.5 text-[10px] font-black text-slate-600 uppercase tracking-wide active:bg-slate-50 transition-all flex items-center justify-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Modifier
                        </button>
                        <button onClick={() => handlePublishDraft(product)}
                          disabled={publishingId === product.id}
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

      {/* ── MODAL PARTAGE ── */}
      {showShare && seller && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center p-4"
          style={{ height: '100dvh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowShare(false)}>
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="font-black text-slate-900 text-base mb-1">Partager la boutique</p>
            <p className="text-[11px] text-slate-400 mb-4">{seller.name}</p>
            <div className="bg-slate-50 rounded-2xl p-3 mb-4 flex items-center gap-3">
              <p className="text-[10px] text-slate-600 font-mono flex-1 truncate">{profileUrl}</p>
              <button onClick={() => { navigator.clipboard.writeText(profileUrl); setShowShare(false); }}
                className="bg-slate-900 text-white text-[10px] font-black px-3 py-2 rounded-xl uppercase active:scale-95">
                Copier
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { name: 'WhatsApp', ico: '💬', color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(`Découvre ${seller.name} sur Brumerie 🛍 ${profileUrl}`)}` },
                { name: 'Facebook', ico: '👥', color: '#1877F2', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}` },
                { name: 'Twitter', ico: '🐦', color: '#1DA1F2', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Boutique ${seller.name} sur Brumerie`)}&url=${encodeURIComponent(profileUrl)}` },
                { name: 'Telegram', ico: '✈️', color: '#0088CC', url: `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}` },
              ].map(s => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl active:scale-95"
                  style={{ background: `${s.color}15` }}>
                  <span className="text-2xl">{s.ico}</span>
                  <span className="text-[9px] font-black text-slate-600">{s.name}</span>
                </a>
              ))}
            </div>
            <button onClick={() => setShowShare(false)}
              className="w-full py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest active:scale-95">
              Fermer
            </button>
          </div>
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
