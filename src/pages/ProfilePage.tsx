// src/pages/ProfilePage.tsx — Profil utilisateur Brumerie
import { VerifiedTag } from '@/components/VerifiedTag';
import { CountdownBadge } from '@/components/CountdownBadge';
import { subscribeSellerReviews } from '@/services/reviewService';
import { Review, Product } from '@/types';
import { SocialBar } from '@/components/SocialIcon';
import { ConfirmModal } from '@/components/ConfirmModal';
import { BoostModal } from '@/components/BoostModal';
import React, { useState, useEffect, useRef } from 'react';
import { drawQROnCanvas } from '@/utils/qrCode';
import { useAuth } from '@/contexts/AuthContext';
import { getSellerProducts, markProductAsSold, deleteProduct, updateProductStatus, getProducts } from '@/services/productService';
import { addBookmark, removeBookmark } from '@/services/bookmarkService';

interface ProfilePageProps {
  onProductClick: (product: Product) => void;
  onNavigate?: (page: string) => void;
}

type Tab = 'active' | 'sold' | 'bookmarks';

export function ProfilePage({ onProductClick, onNavigate }: ProfilePageProps) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [showQRModal, setShowQRModal] = useState(false);
  const isOwnProfile = true;
  const [products, setProducts] = useState<Product[]>([]);
  const [bookmarkedProducts, setBookmarkedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const [boostProduct, setBoostProduct] = useState<Product | null>(null);
  const [deleteModalProduct, setDeleteModalProduct] = useState<string | null>(null);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());

  useEffect(() => { if (userProfile) loadUserProducts(); }, [userProfile]);

  useEffect(() => {
    if (!userProfile?.id) return;
    const unsub = subscribeSellerReviews(userProfile.id, (r, _avg, _cnt) => {
      setReviews(r);
    });
    return unsub;
  }, [userProfile?.id]);

  useEffect(() => {
    const ids = userProfile?.bookmarkedProductIds || [];
    setBookmarkIds(new Set(ids));
  }, [userProfile?.bookmarkedProductIds]);

  useEffect(() => {
    if (activeTab === 'bookmarks') loadBookmarks();
  }, [activeTab, bookmarkIds]);

  async function loadUserProducts() {
    if (!userProfile) return;
    setLoading(true);
    try {
      const data = await getSellerProducts(userProfile.id);
      setProducts(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadBookmarks() {
    setBookmarksLoading(true);
    try {
      const ids = [...bookmarkIds];
      if (!ids.length) { setBookmarkedProducts([]); return; }
      const all = await getProducts();
      setBookmarkedProducts(all.filter(p => ids.includes(p.id)));
    } catch (e) { console.error(e); }
    finally { setBookmarksLoading(false); }
  }

  const handleBookmarkToggle = async (id: string) => {
    if (!currentUser) return;
    const isCurrently = bookmarkIds.has(id);
    try {
      if (isCurrently) {
        await removeBookmark(currentUser.uid, id);
        setBookmarkedProducts(prev => prev.filter(p => p.id !== id));
      } else {
        await addBookmark(currentUser.uid, id);
      }
      await refreshUserProfile();
    } catch (e) { console.error('[Profile] bookmark toggle error', e); }
  };

  const activeProducts = products.filter(p => p.status !== 'sold');
  const soldProducts = products.filter(p => p.status === 'sold');

  const displayProducts =
    activeTab === 'active' ? activeProducts :
    activeTab === 'sold' ? soldProducts :
    bookmarkedProducts;

  const handleMarkAsSold = async (id: string) => {
    await markProductAsSold(id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'sold' as const } : p));
    setActionProduct(null);
    setActiveTab('sold');
  };

  const handleRelist = async (id: string) => {
    await updateProductStatus(id, 'active');
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'active' as const } : p));
    setActionProduct(null);
    setActiveTab('active');
  };

  if (!userProfile) return null;

  const memberSince = (() => {
    try {
      const d = userProfile.createdAt?.toDate ? userProfile.createdAt.toDate() : new Date(userProfile.createdAt);
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch { return ''; }
  })();

  const totalViews = products.reduce((a, p) => a + (p.viewCount || 0), 0);
  const totalContacts = products.reduce((a, p) => a + (p.whatsappClickCount || 0), 0);
  const totalLikes = products.reduce((a, p) => a + ((p as any).likeCount || 0), 0);
  const tier = userProfile.isPremium ? 'premium' : userProfile.isVerified ? 'verified' : 'simple';

  return (
    <div className="min-h-screen bg-slate-50 pb-28 font-sans">

      {/* ── HEADER PROFIL — Immersif dark ── */}
      <div className="relative bg-slate-900 pt-12 pb-8 px-5 rounded-b-[3rem] overflow-hidden">
        {/* Pattern background subtil */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        {/* Bouton paramètres */}
        <button onClick={() => onNavigate?.('settings')}
          className="absolute top-5 right-5 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 active:scale-90 transition-all z-10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

        {/* QR Code bouton */}
        <button onClick={() => setShowQRModal(true)}
          className="absolute top-5 left-5 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 active:scale-90 transition-all z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3z"/>
          </svg>
        </button>

        {/* Avatar + Badge */}
        <div className="flex flex-col items-center relative z-10">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
              <img src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${userProfile.name}&background=1a1a1a&color=fff`}
                alt={userProfile.name} className="w-full h-full object-cover" />
            </div>
            {tier !== 'simple' && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <VerifiedTag tier={tier as any} size="sm"/>
              </div>
            )}
          </div>

          {/* Nom */}
          <h1 className="text-xl font-black text-white uppercase tracking-tight mb-1">{userProfile.name}</h1>

          {/* Countdown badge */}
          {isOwnProfile && userProfile.verifiedUntil && tier !== 'simple' && (
            <div className="mb-2">
              <CountdownBadge expiresAt={userProfile.verifiedUntil} size="sm"/>
            </div>
          )}

          {/* Quartier + membre depuis */}
          <div className="flex items-center gap-2 mb-3 flex-wrap justify-center">
            {userProfile.neighborhood && (
              <span className="flex items-center gap-1 text-[10px] text-white/60 font-bold">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {userProfile.neighborhood}
              </span>
            )}
            {memberSince && (
              <span className="text-[10px] text-white/40 font-bold">Depuis {memberSince}</span>
            )}
          </div>

          {/* Bio */}
          {userProfile.bio && (
            <p className="text-[12px] text-white/70 font-medium leading-relaxed text-center max-w-xs mb-3" style={{ whiteSpace: 'pre-line' }}>
              {userProfile.bio}
            </p>
          )}

          {/* Note vendeur */}
          {(userProfile.rating && userProfile.reviewCount) ? (
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <svg key={s} width="12" height="12" viewBox="0 0 24 24"
                    fill={(userProfile.rating || 0) >= s ? '#FBBF24' : '#374151'} stroke="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <span className="text-[10px] font-bold text-white/50">{userProfile.rating?.toFixed(1)} ({userProfile.reviewCount})</span>
            </div>
          ) : null}

          {/* Badges métier */}
          <div className="flex gap-2 flex-wrap justify-center">
            {userProfile.hasPhysicalShop && (
              <span className="flex items-center gap-1 bg-white/10 border border-white/20 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
                Boutique
              </span>
            )}
            {userProfile.managesDelivery && (
              <span className="flex items-center gap-1 bg-white/10 border border-white/20 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                Livraison
              </span>
            )}
          </div>

          {/* Réseaux sociaux */}
          {userProfile.socialLinks && Object.values(userProfile.socialLinks).some(Boolean) && (
            <div className="mt-3">
              <SocialBar links={userProfile.socialLinks} size={32} />
            </div>
          )}
        </div>
      </div>

      {/* ── STATS — Grille 4 colonnes ── */}
      <div className="px-4 -mt-5 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-lg font-black text-slate-900">{activeProducts.length}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Articles</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-slate-900">{soldProducts.length}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Vendus</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-slate-900">{totalLikes}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Likes</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-slate-900">{totalViews}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Vues</p>
          </div>
        </div>
      </div>

      {/* ── ACTIONS RAPIDES ── */}
      <div className="px-4 mt-4 flex gap-2">
        <button onClick={() => onNavigate?.('edit-profile')}
          className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm">
          Modifier profil
        </button>
        <button onClick={() => onNavigate?.('sell')}
          className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg">
          + Publier
        </button>
        {(userProfile?.isVerified || userProfile?.isPremium) && (
          <button onClick={() => onNavigate?.('shop-customize')}
            className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center active:scale-90 transition-all shadow-sm flex-shrink-0">
            <span className="text-lg">🎨</span>
          </button>
        )}
      </div>

      {/* ── ONGLETS ── */}
      <div className="px-4 mt-5">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
          <button onClick={() => setActiveTab('active')}
            className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
            En ligne ({activeProducts.length})
          </button>
          <button onClick={() => setActiveTab('sold')}
            className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${activeTab === 'sold' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
            Vendus ({soldProducts.length})
          </button>
          <button onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all flex items-center justify-center gap-1 ${activeTab === 'bookmarks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            Favoris ({bookmarkIds.size})
          </button>
        </div>
      </div>

      {/* ── GRILLE PRODUITS — catalogue photo ── */}
      <div className="px-4 mt-4">
        {(loading && activeTab !== 'bookmarks') || (bookmarksLoading && activeTab === 'bookmarks') ? (
          <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden">
            {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-slate-100 animate-pulse" />)}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <div className="text-3xl mb-3">{activeTab === 'bookmarks' ? '🔖' : activeTab === 'sold' ? '🎉' : '📷'}</div>
            <p className="font-black text-slate-400 uppercase tracking-tight text-[11px]">
              {activeTab === 'bookmarks' ? 'Aucun favori' : activeTab === 'sold' ? 'Aucune vente' : 'Aucun article'}
            </p>
            {activeTab === 'active' && (
              <button onClick={() => onNavigate?.('sell')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                + Publier
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden">
            {displayProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => onProductClick(product)}
                className="relative aspect-square overflow-hidden bg-slate-100 active:opacity-80 transition-opacity"
              >
                <img
                  src={product.images?.[0] || (product as any).imageUrl || `https://ui-avatars.com/api/?name=${product.title}&background=f1f5f9&color=94a3b8`}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                {/* Tag vendu */}
                {product.status === 'sold' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white text-slate-900 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Vendu
                    </span>
                  </div>
                )}
                {/* Bouton actions (3 dots) — sur ses propres articles */}
                {activeTab !== 'bookmarks' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setActionProduct(product); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center active:scale-90 transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
                      <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                    </svg>
                  </button>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION ADDRESS-WEB ── */}
      <div className="px-4 mt-6">
        <button
          onClick={async () => {
            if (!currentUser) return;
            try {
              const res = await fetch('/api/aw-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: currentUser.uid, email: currentUser.email }),
              });
              const data = await res.json();
              const url = data.magicLink || 'https://addressweb.brumerie.com';
              window.open(url, '_blank', 'noopener,noreferrer');
            } catch {
              window.open('https://addressweb.brumerie.com', '_blank', 'noopener,noreferrer');
            }
          }}
          className="w-full py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black text-[11px] uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {(userProfile as any)?.awAddressCode || 'Mon adresse Address-Web'}
        </button>
      </div>

      {/* ── MODAL QR ── */}
      {showQRModal && currentUser && (
        <ProfileQRModal
          sellerId={currentUser.uid}
          sellerName={userProfile?.name || 'Ma boutique'}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* ── ACTION SHEET ── */}
      {actionProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center p-4" onClick={() => setActionProduct(null)}>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-center mb-5 truncate">{actionProduct.title}</p>
            <div className="flex flex-col gap-2.5">
              {actionProduct.status !== 'sold' ? (
                <button onClick={() => handleMarkAsSold(actionProduct.id)}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all">
                  Marquer comme vendu
                </button>
              ) : (
                <button onClick={() => handleRelist(actionProduct.id)}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all">
                  Remettre en vente
                </button>
              )}
              <button onClick={() => { setBoostProduct(actionProduct); setActionProduct(null); }}
                className="w-full py-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
                Booster
              </button>
              <button onClick={() => setDeleteModalProduct(actionProduct.id)}
                className="w-full py-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all">
                Supprimer
              </button>
              <button onClick={() => setActionProduct(null)} className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        visible={!!deleteModalProduct}
        title="Supprimer l'article ?"
        message="Cette action est irréversible. L'annonce sera définitivement supprimée."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        danger
        onConfirm={async () => {
          if (deleteModalProduct && userProfile) {
            await deleteProduct(deleteModalProduct, userProfile.id);
            setProducts(prev => prev.filter(p => p.id !== deleteModalProduct));
            setActionProduct(null);
          }
          setDeleteModalProduct(null);
        }}
        onCancel={() => setDeleteModalProduct(null)}
      />

      {boostProduct && (
        <BoostModal
          product={boostProduct}
          onClose={() => setBoostProduct(null)}
          onBoosted={() => setBoostProduct(null)}
        />
      )}
    </div>
  );
}

// ── Modal QR boutique vendeur ─────────────────────────────────
function ProfileQRModal({ sellerId, sellerName, onClose }: {
  sellerId: string; sellerName: string; onClose: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);
  const profileUrl = `https://www.brumerie.com/vendeur/${sellerId}`;
  const SIZE = 200;

  React.useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    drawQROnCanvas(canvasRef.current, profileUrl, { dark: '#0f172a', light: '#FFFFFF', margin: 2 })
      .then(() => { if (!cancelled) setReady(true); })
      .catch(e => console.warn('QR error:', e));
    return () => { cancelled = true; };
  }, [profileUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const final = document.createElement('canvas');
    final.width = SIZE + 80;
    final.height = SIZE + 120;
    const ctx = final.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, final.width, final.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, final.width, 56);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BRUMERIE', final.width / 2, 34);
    ctx.drawImage(canvasRef.current, 40, 64, SIZE, SIZE);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(sellerName, final.width / 2, SIZE + 84);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Scanne pour visiter la boutique', final.width / 2, SIZE + 102);
    const link = document.createElement('a');
    link.download = `QR-Brumerie-${sellerName.replace(/\s+/g, '-')}.png`;
    link.href = final.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] w-full max-w-xs overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-7 pb-5 text-center bg-slate-900">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.png" alt="Brumerie" style={{ width:28, height:28, objectFit:'contain', filter:'brightness(0) invert(1)' }}/>
            <span className="text-white font-black text-[15px] tracking-wide">BRUMERIE</span>
          </div>
          <p className="text-white/50 text-[9px] font-bold uppercase tracking-[3px]">QR Code boutique</p>
          <p className="text-white font-black text-[13px] mt-1 truncate px-2">{sellerName}</p>
        </div>

        <div className="px-6 py-5 flex flex-col items-center gap-4">
          <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-md">
            <div style={{ width: SIZE, height: SIZE, position: 'relative' }}>
              {!ready && (
                <div style={{ position:'absolute', inset:0 }} className="flex items-center justify-center bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"/>
                </div>
              )}
              <canvas ref={canvasRef} width={SIZE} height={SIZE}
                style={{ display: ready ? 'block' : 'none', borderRadius: 12 }}/>
            </div>
          </div>

          <p className="text-[9px] text-slate-400 font-mono text-center break-all px-2">{profileUrl}</p>

          <div className="flex gap-3 w-full">
            <button onClick={handleDownload} disabled={!ready}
              className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-slate-900 text-white active:scale-95 transition-all disabled:opacity-40">
              Télécharger
            </button>
            <button onClick={() => { navigator.clipboard?.writeText(profileUrl).catch(()=>{}); }}
              className="px-4 py-3 rounded-2xl font-black text-[11px] uppercase bg-slate-100 text-slate-700 active:scale-95 transition-all">
              Copier
            </button>
          </div>

          <button onClick={onClose}
            className="w-full py-3 rounded-2xl text-[10px] font-bold text-slate-400 active:scale-95">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
