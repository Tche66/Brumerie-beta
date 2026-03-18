// src/pages/ProfilePage.tsx
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

import { ProductCard } from '@/components/ProductCard';
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
  const isOwnProfile = true; // ProfilePage affiche toujours SON propre profil
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

  // ✅ Favoris depuis userProfile — toujours synchronisés
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

  // Date d'inscription lisible
  const memberSince = (() => {
    try {
      const d = userProfile.createdAt?.toDate ? userProfile.createdAt.toDate() : new Date(userProfile.createdAt);
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch { return ''; }
  })();

  const totalWA = products.reduce((a, p) => a + (p.whatsappClickCount || 0), 0);

  return (
    <div className="min-h-screen bg-white page-container pb-24">

      {/* Bannière boutique — vérifié/premium avec bannière */}
      {(userProfile.isVerified || userProfile.isPremium) && userProfile.shopBanner && (
        <div className="w-full h-32 overflow-hidden relative">
          <img src={userProfile.shopBanner} alt="Bannière boutique" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.9) 100%)' }} />
        </div>
      )}
      {(userProfile.isVerified || userProfile.isPremium) && !userProfile.shopBanner && userProfile.shopThemeColor && (
        <div className="w-full h-16" style={{ background: userProfile.shopThemeColor + '25' }} />
      )}

      {/* Bouton Paramètres */}
      <button onClick={() => onNavigate?.('settings')} className="settings-gear-btn" title="Paramètres">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {/* Header profil */}
      <div className="px-6 pt-14 pb-6 flex flex-col items-center">
        <div className="relative mb-4 z-10">
          <div className="w-24 h-24 rounded-[2.6rem] overflow-hidden border-[6px] border-slate-50 shadow-2xl">
            <img src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${userProfile.name}`} alt={userProfile.name} className="w-full h-full object-cover" />
          </div>

        </div>

        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">{userProfile.name}</h1>
        {/* Badge uniquement si Vérifié ou Premium */}
        {(userProfile.isVerified || userProfile.isPremium) && (
          <div className="mb-2 flex flex-col items-center gap-1">
            <VerifiedTag
              tier={userProfile.isPremium ? 'premium' : 'verified'}
              size="md"
            />
            {/* Compte à rebours badge si c'est notre propre profil */}
            {isOwnProfile && userProfile.verifiedUntil && (
              <CountdownBadge expiresAt={userProfile.verifiedUntil} size="sm"/>
            )}
          </div>
        )}
        {/* Étoiles résumé */}
        {(userProfile.rating && userProfile.reviewCount) ? (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <svg key={s} width="13" height="13" viewBox="0 0 24 24"
                  fill={(userProfile.rating || 0) >= s ? '#FBBF24' : '#E2E8F0'} stroke="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ))}
            </div>
            <span className="text-[10px] font-black text-slate-500">{userProfile.rating?.toFixed(1)} ({userProfile.reviewCount} avis)</span>
          </div>
        ) : null}
        {memberSince && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-3">Membre depuis {memberSince}</p>}

        {/* Badges boutique/livraison */}
        <div className="flex gap-2 mb-4 flex-wrap justify-center">
          {userProfile.hasPhysicalShop && (
            <span className="flex items-center gap-1.5 bg-slate-900 text-white text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
              Boutique physique
            </span>
          )}
          {userProfile.managesDelivery && (
            <span className="flex items-center gap-1.5 bg-green-600 text-white text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M8 17.5h7M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
              Livraison disponible
            </span>
          )}
        </div>

        {/* Bio — tous vendeurs */}
        {userProfile.bio && (
          <p className="text-[12px] text-slate-600 font-medium leading-relaxed text-center px-2 mb-3 max-w-xs">
            {userProfile.bio}
          </p>
        )}

        {/* Liens réseaux sociaux avec vrais logos */}
        {userProfile.socialLinks && Object.values(userProfile.socialLinks).some(Boolean) && (
          <div className="flex justify-center mb-3">
            <SocialBar links={userProfile.socialLinks} size={36} />
          </div>
        )}

      </div>{/* fin header profil */}

      {/* Tabs 3 onglets */}
      <div className="flex px-6 gap-2 mb-5">
        <button onClick={() => setActiveTab('active')}
          className={`flex-1 py-3.5 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
          Articles ({activeProducts.length})
        </button>
        <button onClick={() => setActiveTab('sold')}
          className={`flex-1 py-3.5 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === 'sold' ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
          Marqur vendu ({soldProducts.length})
        </button>
        <button onClick={() => setActiveTab('bookmarks')}
          className={`flex-1 py-3.5 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${activeTab === 'bookmarks' ? 'text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
          style={activeTab === 'bookmarks' ? { background: '#16A34A' } : {}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill={activeTab === 'bookmarks' ? 'white' : '#94A3B8'} stroke="none">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          Favoris ({bookmarkIds.size})
        </button>
      </div>

      {/* Contenu */}
      <div className="px-6">
        {(loading && activeTab !== 'bookmarks') || (bookmarksLoading && activeTab === 'bookmarks') ? (
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-slate-50 rounded-[2.5rem] animate-pulse" />)}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
              {activeTab === 'bookmarks' ? 'Aucun favori enregistré' : 'Aucun article ici'}
            </p>
            {activeTab === 'bookmarks' && (
              <p className="text-[9px] text-slate-300 mt-2 px-4">Appuie sur le signet d'une annonce pour l'enregistrer</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {displayProducts.map((product) => (
              <div key={product.id} className="relative">
                <ProductCard product={product} onClick={() => onProductClick(product)}
                  onBookmark={handleBookmarkToggle}
                  isBookmarked={bookmarkIds.has(product.id)}
                />
                {activeTab !== 'bookmarks' && (
                  <button onClick={(e) => { e.stopPropagation(); setActionProduct(product); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-md rounded-xl shadow-lg flex items-center justify-center text-slate-900 active:scale-90 transition-all z-10 border border-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modifier profil + Personnaliser boutique */}
      <div className="px-6 mt-6 mb-4 flex flex-col gap-3">
        <button onClick={() => onNavigate?.('edit-profile')}
          className="btn-secondary-custom w-full py-4 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em]">
          Modifier mon profil
        </button>
        {(userProfile?.isVerified || userProfile?.isPremium) && (
          <button onClick={() => onNavigate?.('shop-customize')}
            className="w-full py-4 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em] border-2 border-green-200 text-green-700 bg-green-50 active:scale-[0.98] transition-all">
            🎨 Personnaliser ma boutique
          </button>
        )}
        {/* Bouton QR boutique — tous les vendeurs */}
        {currentUser && (
          <button onClick={() => setShowQRModal(true)}
            className="w-full py-4 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em] border-2 border-slate-200 text-slate-700 bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/>
              <rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4" rx="0.5"/>
            </svg>
            Mon QR Boutique
          </button>
        )}
        {/* Adresse Address-Web */}
        {userProfile?.awAddressCode ? (
          <a href={`https://addressweb.brumerie.com/${userProfile.awAddressCode}`}
            target="_blank" rel="noopener noreferrer"
            className="w-full py-4 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em] border-2 border-green-200 text-green-700 bg-green-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            📍 {userProfile.awAddressCode}
          </a>
        ) : (
          <a href="https://addressweb.brumerie.com/creer"
            target="_blank" rel="noopener noreferrer"
            className="w-full py-4 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em] border-2 border-dashed border-slate-200 text-slate-400 bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            📍 Créer mon adresse AW gratuite
          </a>
        )}
      </div>

      {/* Modal QR Boutique vendeur */}
      {showQRModal && currentUser && (
        <ProfileQRModal
          sellerId={currentUser.uid}
          sellerName={userProfile?.name || 'Ma boutique'}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* Action Sheet */}
      {actionProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center p-4" onClick={() => setActionProduct(null)}>
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 animate-slide-up" style={{ maxHeight: '85dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center mb-6 line-clamp-1">{actionProduct.title}</p>
            <div className="flex flex-col gap-3">
              {actionProduct.status !== 'sold' ? (
                <button onClick={() => handleMarkAsSold(actionProduct.id)}
                  className="w-full py-5 rounded-3xl bg-green-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-green-100 active:scale-95 transition-all">
                  Marquer comme Vendu 🎉
                </button>
              ) : (
                <button onClick={() => handleRelist(actionProduct.id)}
                  className="w-full py-5 rounded-3xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all">
                  Remettre en vente
                </button>
              )}
              <button onClick={() => setDeleteModalProduct(actionProduct.id)}
                className="w-full py-5 rounded-3xl bg-red-50 text-red-600 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all">
                Supprimer l'annonce
              </button>
              <button onClick={() => { setBoostProduct(actionProduct); setActionProduct(null); }}
                className="w-full py-5 rounded-3xl bg-blue-500 text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-100">
                ⚡ Booster l'annonce
              </button>
              <button onClick={() => setActionProduct(null)} className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest">
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

      {/* Boost Modal */}
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

// ── Modal QR boutique vendeur — avec téléchargement PNG ─────────
function ProfileQRModal({ sellerId, sellerName, onClose }: {
  sellerId: string; sellerName: string; onClose: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);
  const profileUrl = `https://www.brumerie.com/vendeur/${sellerId}`;
  const SIZE = 220;

  React.useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    drawQROnCanvas(canvasRef.current, profileUrl, { dark: '#0f5c2e', light: '#FFFFFF', margin: 2 })
      .then(() => { if (!cancelled) setReady(true); })
      .catch(e => console.warn('QR error:', e));
    return () => { cancelled = true; };
  }, [profileUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    // Créer un canvas final avec branding
    const final = document.createElement('canvas');
    final.width = SIZE + 80;
    final.height = SIZE + 120;
    const ctx = final.getContext('2d')!;
    // Fond blanc
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, final.width, final.height);
    // Header vert
    ctx.fillStyle = '#1B5E20';
    ctx.fillRect(0, 0, final.width, 56);
    // Texte BRUMERIE
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BRUMERIE', final.width / 2, 34);
    // QR code
    ctx.drawImage(canvasRef.current, 40, 64, SIZE, SIZE);
    // Nom vendeur
    ctx.fillStyle = '#1B5E20';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(sellerName, final.width / 2, SIZE + 84);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Scanne pour visiter la boutique', final.width / 2, SIZE + 102);
    // Télécharger
    const link = document.createElement('a');
    link.download = `QR-Brumerie-${sellerName.replace(/\s+/g, '-')}.png`;
    link.href = final.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] w-full max-w-xs overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-7 pb-5 text-center" style={{ background: 'linear-gradient(150deg,#16A34A,#0f5c2e)' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.png" alt="Brumerie" style={{ width:28, height:28, objectFit:'contain', filter:'brightness(0) invert(1)' }}/>
            <span className="text-white font-black text-[15px] tracking-wide">BRUMERIE</span>
          </div>
          <p className="text-white/70 text-[9px] font-bold uppercase tracking-[3px]">Mon QR Code boutique</p>
          <p className="text-white font-black text-[13px] mt-1 truncate px-2">{sellerName}</p>
        </div>

        {/* QR */}
        <div className="px-6 py-5 flex flex-col items-center gap-4">
          <div className="bg-white rounded-2xl p-3 border-2 border-green-100 shadow-lg">
            <div style={{ width: SIZE, height: SIZE, position: 'relative' }}>
              {!ready && (
                <div style={{ position:'absolute', inset:0 }} className="flex items-center justify-center bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin"/>
                </div>
              )}
              <canvas ref={canvasRef} width={SIZE} height={SIZE}
                style={{ display: ready ? 'block' : 'none', borderRadius: 12 }}/>
            </div>
          </div>

          {/* URL */}
          <p className="text-[9px] text-slate-400 font-mono text-center break-all px-2">{profileUrl}</p>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button onClick={handleDownload} disabled={!ready}
              className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#1B5E20,#16A34A)' }}>
              ⬇️ Télécharger
            </button>
            <button onClick={() => {
              navigator.clipboard?.writeText(profileUrl).catch(()=>{});
            }}
              className="px-4 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-slate-100 text-slate-700 active:scale-95 transition-all">
              📋
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
