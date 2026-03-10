import { SocialBar } from '@/components/SocialIcon';
import { VerifiedTag } from '@/components/VerifiedTag';
import React, { useState, useEffect } from 'react';
import { subscribeSellerReviews } from '@/services/reviewService';
import { Review, Product, User } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { getUserById } from '@/services/userService';
import { getSellerProducts } from '@/services/productService';
import { addBookmark, removeBookmark } from '@/services/bookmarkService';
import { useAuth } from '@/contexts/AuthContext';

interface SellerProfilePageProps {
  sellerId: string;
  onBack: () => void;
  onProductClick: (product: Product) => void;
  onStartChat?: (sellerId: string, sellerName: string) => void;
  isGuest?: boolean;
  onGuestAction?: (reason: string) => void;
}

export function SellerProfilePage({ sellerId, onBack, onProductClick, onStartChat, isGuest, onGuestAction }: SellerProfilePageProps) {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [seller, setSeller] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

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

  // ✅ Reviews du vendeur — abonnement temps réel
  useEffect(() => {
    if (!sellerId) return;
    const unsub = subscribeSellerReviews(sellerId, (r, avg, cnt) => {
      setReviews(r);
      setAvgRating(avg);
      setReviewCount(cnt);
    });
    return unsub;
  }, [sellerId]);

  // ✅ Favoris depuis userProfile
  useEffect(() => {
    const ids = userProfile?.bookmarkedProductIds || [];
    setBookmarkIds(new Set(ids));
  }, [userProfile?.bookmarkedProductIds]);

  const handleBookmark = async (id: string) => {
    if (!currentUser) return;
    const isCurrently = bookmarkIds.has(id);
    if (isCurrently) { await removeBookmark(currentUser.uid, id); }
    else { await addBookmark(currentUser.uid, id); }
    await refreshUserProfile();
  };

  const totalContacts = products.reduce((acc, p) => acc + (p.whatsappClickCount || 0), 0);
  const soldCount = products.filter(p => p.status === 'sold').length;

  // ── Partage profil ────────────────────────────────────────
  const [showShare, setShowShare] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const profileUrl = `https://www.brumerie.com/vendeur/${sellerId}`;

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

  const copyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setShowShare(false);
  };

  // Date membre lisible
  const memberSince = (() => {
    if (!seller?.createdAt) return null;
    try {
      const d = (seller.createdAt as any)?.toDate ? (seller.createdAt as any).toDate() : new Date(seller.createdAt);
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch { return null; }
  })();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-50 px-6 py-5 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 flex-1">Profil Vendeur</h1>
        {/* Bouton QR code */}
        {seller && (
          <button onClick={() => setShowQR(true)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 active:scale-90 transition-all"
            title="QR Code boutique">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              <rect x="5" y="5" width="3" height="3" fill="#475569"/><rect x="16" y="5" width="3" height="3" fill="#475569"/><rect x="5" y="16" width="3" height="3" fill="#475569"/>
              <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h1v1h-1z"/>
            </svg>
          </button>
        )}
        {/* Bouton partage */}
        {seller && (
          <button onClick={handleShare}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 active:scale-90 transition-all"
            title="Partager la boutique">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        )}
        {isGuest && (
          <button onClick={() => onGuestAction?.('default')}
            className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-full uppercase tracking-wider">
            Se connecter
          </button>
        )}
        {!isGuest && onStartChat && seller && (
          <button
            onClick={() => onStartChat(seller.uid, seller.name)}
            className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-green-200">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Contacter
          </button>
        )}
      </div>

      {/* ── MODAL PARTAGE ── */}
      {showShare && seller && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center p-4"
          style={{ height: '100dvh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowShare(false)}>
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm" style={{ maxHeight: '85dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <p className="font-black text-slate-900 text-base mb-1">Partager la boutique</p>
            <p className="text-[11px] text-slate-400 font-medium mb-5">{seller.name}</p>
            {/* Lien */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <p className="text-[11px] text-slate-600 font-mono flex-1 truncate">{profileUrl}</p>
              <button onClick={copyLink}
                className="bg-slate-900 text-white text-[10px] font-black px-3 py-2 rounded-xl uppercase tracking-wide active:scale-95">
                Copier
              </button>
            </div>
            {/* Réseaux sociaux */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { name: 'WhatsApp', ico: '💬', color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(`Découvre ${seller.name} sur Brumerie 🛍 ${profileUrl}`)}` },
                { name: 'Facebook', ico: '👥', color: '#1877F2', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}` },
                { name: 'Twitter', ico: '🐦', color: '#1DA1F2', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Découvre ${seller.name} sur Brumerie 🛍`)}&url=${encodeURIComponent(profileUrl)}` },
                { name: 'Telegram', ico: '✈️', color: '#0088CC', url: `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(`Boutique ${seller.name} sur Brumerie`)}` },
              ].map(s => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl active:scale-95 transition-all"
                  style={{ background: `${s.color}15` }}>
                  <span className="text-2xl">{s.ico}</span>
                  <span className="text-[9px] font-black text-slate-600">{s.name}</span>
                </a>
              ))}
            </div>
            <button onClick={() => setShowShare(false)}
              className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest active:scale-95">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL QR CODE — Design Brumerie ── */}
      {showQR && seller && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ height: '100dvh', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-xs overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>

            {/* Header vert Brumerie */}
            <div className="px-6 pt-7 pb-5 text-center" style={{ background: 'linear-gradient(150deg, #16A34A 0%, #0f5c2e 100%)' }}>
              {/* Mini logo */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="white" opacity="0.9"/>
                    <path d="M8 10h8M8 14h5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-white font-black text-[15px] tracking-wide">BRUMERIE</span>
              </div>
              <p className="text-white/60 text-[9px] font-bold uppercase tracking-[3px]">QR Code boutique</p>
              <p className="text-white font-black text-[14px] mt-1 truncate px-2">{seller.name}</p>
            </div>

            {/* Zone QR */}
            <div className="px-6 py-5 flex flex-col items-center">
              <div className="bg-white rounded-2xl p-3 border-2 border-green-100 shadow-lg mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}&color=0f5c2e&bgcolor=FFFFFF`}
                  alt="QR Code"
                  width={190} height={190}
                  className="rounded-xl block"
                />
              </div>

              {/* Slogan */}
              <div className="flex items-center gap-2 mb-1">
                <div className="h-px flex-1 bg-green-100"/>
                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Trouve ton bonheur ici</p>
                <div className="h-px flex-1 bg-green-100"/>
              </div>
              <p className="text-[9px] text-slate-400 font-medium mb-5">Scanne pour visiter la boutique</p>

              <button onClick={() => setShowQR(false)}
                className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #0f5c2e, #16A34A)' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-32 gap-6 animate-pulse">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-green-600 rounded-[2rem] animate-spin" />
          <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Chargement...</p>
        </div>
      ) : seller ? (
        <div className="animate-fade-up">
          {/* Bannière boutique — vérifié/premium uniquement */}
          {(seller.isVerified || (seller as any).isPremium) && (seller as any).shopBanner && (
            <div className="w-full h-36 overflow-hidden relative">
              <img src={(seller as any).shopBanner} alt="Bannière boutique"
                className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.3) 100%)' }} />
            </div>
          )}
          {/* Fond couleur si pas de bannière mais couleur définie */}
          {(seller.isVerified || (seller as any).isPremium) && !(seller as any).shopBanner && (seller as any).shopThemeColor && (
            <div className="w-full h-16" style={{ background: (seller as any).shopThemeColor + '25' }} />
          )}

          <div className="bg-white px-6 pt-10 pb-8 border-b border-slate-100 shadow-sm mb-6">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative mb-5">
                <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden bg-slate-100 border-4 border-white shadow-2xl">
                  {seller.photoURL ? (
                    <img src={seller.photoURL} alt={seller.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-4xl font-black">
                      {seller.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>

              </div>

              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">{seller.name}</h2>
              {/* Étoiles résumé dans le hero */}
              {(avgRating > 0) ? (
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} width="12" height="12" viewBox="0 0 24 24"
                        fill={avgRating >= s ? '#FBBF24' : '#E2E8F0'} stroke="none">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-slate-500">{avgRating.toFixed(1)} ({reviewCount} avis)</span>
                </div>
              ) : null}
              {seller.shopSlogan && (
                <p className="text-[11px] font-bold mb-2" style={{ color: seller.shopThemeColor || '#16A34A' }}>
                  {seller.shopSlogan}
                </p>
              )}
              <div className="mb-2">
                <VerifiedTag
                  tier={(seller as any).isPremium ? 'premium' : seller.isVerified ? 'verified' : 'simple'}
                  size="lg"
                />
              </div>

              <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-3 flex-wrap justify-center">
                {seller.neighborhood && (
                  <span className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#94A3B8"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>
                    {seller.neighborhood}
                  </span>
                )}
                {memberSince && (
                  <>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span>Membre depuis {memberSince}</span>
                  </>
                )}
              </div>

              {/* Badges boutique/livraison visibles pour les clients */}
              <div className="flex gap-2 flex-wrap justify-center">
                {seller.hasPhysicalShop && (
                  <span className="flex items-center gap-1.5 bg-slate-900 text-white text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
                    Boutique physique
                  </span>
                )}
                {seller.managesDelivery && (
                  <span className="flex items-center gap-1.5 bg-green-600 text-white text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M8 17.5h7M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                    Livraison disponible
                  </span>
                )}
              </div>

              {/* Bio — visible pour tous les vendeurs */}
              {(seller as any).bio && (
                <p className="text-[12px] text-slate-600 font-medium leading-relaxed text-center px-4 mt-4 max-w-xs">
                  {(seller as any).bio}
                </p>
              )}

              {/* Liens sociaux avec vrais logos — tous vendeurs */}
              {(seller as any).socialLinks && Object.values((seller as any).socialLinks).some(Boolean) && (
                <div className="mt-3">
                  <SocialBar links={(seller as any).socialLinks} size={34} />
                </div>
              )}

            </div>

          </div>

          {/* ── Avis clients ── */}
          {(avgRating > 0 || reviews.length > 0) && (
            <div className="px-6 mb-6">
              {/* Résumé note */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-black text-slate-900">{avgRating.toFixed(1)}</p>
                    <div className="flex gap-0.5 mt-1 justify-center">
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="14" height="14" viewBox="0 0 24 24"
                          fill={avgRating >= s ? '#FBBF24' : '#E2E8F0'} stroke="none">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{reviewCount} avis</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-[12px]">Note globale</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Basée sur les commandes livrées</p>
                  </div>
                </div>
              </div>

              {/* Liste des avis */}
              {reviews.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Derniers avis</p>
                  {reviews.slice(0, 5).map(review => (
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
                          <p className="text-[9px] text-slate-400 truncate">{review.productTitle}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} width="11" height="11" viewBox="0 0 24 24"
                              fill={review.rating >= s ? '#FBBF24' : '#E2E8F0'} stroke="none">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-[11px] text-slate-600 italic">"{review.comment}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Catalogue */}
          <div className="px-6 space-y-4">
            <div className="flex items-center justify-between px-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Catalogue du vendeur</p>
              <span className="bg-slate-100 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full">{products.filter(p => p.status !== 'sold').length}</span>
            </div>

            {products.filter(p => p.status !== 'sold').length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <p className="font-black text-slate-400 uppercase tracking-tighter text-sm">Boutique vide</p>
                <p className="text-slate-300 text-[10px] font-bold uppercase mt-1">Reviens plus tard !</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 pb-10">
                {products.filter(p => p.status !== 'sold').map((product) => (
                  <div key={product.id} className="active:scale-95 transition-transform duration-300">
                    <ProductCard product={product} onClick={() => onProductClick(product)}
                      onBookmark={handleBookmark}
                      isBookmarked={bookmarkIds.has(product.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center pt-32 text-center px-10 animate-fade-up">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Vendeur Fantôme</h3>
          <p className="text-slate-400 text-[10px] font-bold uppercase leading-relaxed tracking-widest">Ce profil n'existe pas.</p>
          <button onClick={onBack} className="mt-10 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">
            Retourner au quartier
          </button>
        </div>
      )}
    </div>
  );
}
