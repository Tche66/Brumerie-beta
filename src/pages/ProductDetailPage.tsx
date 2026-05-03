import { VerifiedTag } from '@/components/VerifiedTag';
import { ConditionBadge } from '@/components/ConditionBadge';
import React, { useState, useRef, useEffect } from 'react';
import { Product, CATEGORIES, Review } from '@/types';
import { formatPrice, formatRelativeDate } from '@/utils/helpers';
import { getProducts, incrementViewCount, incrementContactCount, toggleLike, checkIsLiked, addComment, deleteComment, subscribeComments } from '@/services/productService';
import { repostProduct } from '@/services/shopFeaturesService';
import type { ProductComment } from '@/types';
import { addBookmark, removeBookmark } from '@/services/bookmarkService';
import { addToWishlist, removeFromWishlist, followSeller, unfollowSeller } from '@/services/shopFeaturesService';
import { useAuth } from '@/contexts/AuthContext';
import { BoostModal } from '@/components/BoostModal';
import { ImageLightbox } from '@/components/ImageLightbox';
import { getOrCreateConversation, checkChatLimit, sendOfferCard } from '@/services/messagingService';
import { subscribeSellerReviews } from '@/services/reviewService';
import { ProductCard } from '@/components/ProductCard';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { shareProduct } from '@/utils/shareProduct';
import { ReportUserModal } from '@/components/ReportUserModal';
import { getTrustScore, TrustScore } from '@/services/trustService';
import { RiskAlertBanner } from '@/components/RiskBadge';


interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
  onSellerClick: (sellerId: string) => void;
  onStartChat?: (convId: string) => void;
  onBuyClick?: (product: any) => void;
  onProductClick?: (product: Product) => void;
  isGuest?: boolean;
  onGuestAction?: (reason: string) => void;
}

export function ProductDetailPage({ product: productRaw, onBack, onSellerClick, onStartChat, onBuyClick, onProductClick, isGuest, onGuestAction }: ProductDetailPageProps) {
  // Normalisation rétro-compatible : anciens articles peuvent avoir imageUrl (string) au lieu de images (array)
  const product = {
    ...productRaw,
    images: productRaw.images?.length ? productRaw.images : ((productRaw as any).imageUrl ? [(productRaw as any).imageUrl] : []),
  };
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isFollowingSeller, setIsFollowingSeller] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerInput, setOfferInput] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [lastDist, setLastDist] = useState<number | null>(null);
  const [chatLimitError, setChatLimitError] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  // Trust system — signalement lié au vendeur + score de risque vendeur
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [sellerRiskScore, setSellerRiskScore] = useState<TrustScore | null>(null);
  const [sellerDelivery, setSellerDelivery] = useState<{ name?: string; phone?: string } | null>(null);
  // Compteurs live — initialisés à -1 (chargement) pour éviter le flash
  const [liveViewCount, setLiveViewCount] = useState<number>(-1);
  const [liveContactCount, setLiveContactCount] = useState<number>(-1);
  const viewIncrementedRef = useRef(false); // évite double incrément en StrictMode
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Social Commerce — Likes & Commentaires ──
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; userName: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showRepost, setShowRepost] = useState(false);
  const [repostComment, setRepostComment] = useState('');
  const [sendingRepost, setSendingRepost] = useState(false);
  const [repostDone, setRepostDone] = useState(false);

  const categoryLabel = CATEGORIES.find(c => c.id === product.category)?.label || product.category;

  // ── Abonnement temps réel + incrément vue en une seule opération ──
  useEffect(() => {
    viewIncrementedRef.current = false;
    const isSeller = currentUser?.uid === product.sellerId;

    const unsub = onSnapshot(doc(db, 'products', product.id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setLiveViewCount(data.viewCount ?? 0);
      setLiveContactCount(data.whatsappClickCount ?? 0);
      // ✅ likeCount temps réel — sync immédiate entre tous les utilisateurs
      setLikeCount(data.likeCount ?? 0);

      // Incrémenter UNE SEULE FOIS après le premier snapshot — jamais pour le vendeur
      if (!viewIncrementedRef.current && !isSeller && currentUser) {
        viewIncrementedRef.current = true;
        incrementViewCount(product.id).catch(e =>
          console.error('[ViewCount] Règles Firestore — voir FIRESTORE_RULES.md :', e)
        );
      }
    });

    return () => {
      viewIncrementedRef.current = false;
      unsub();
    };
  }, [product.id, currentUser?.uid]);

  // Bookmark + Wishlist + Following sync
  useEffect(() => {
    const ids      = userProfile?.bookmarkedProductIds || [];
    const wishIds  = (userProfile as any)?.wishlistIds || [];
    const followIds = (userProfile as any)?.followingSellers || [];
    setIsBookmarked(ids.includes(product.id));
    setIsInWishlist(wishIds.includes(product.id));
    setIsFollowingSeller(followIds.includes(product.sellerId));
  }, [userProfile, product.id, product.sellerId]);

  // Reviews du vendeur
  useEffect(() => {
    if (!product.sellerId) return;
    const unsub = subscribeSellerReviews(product.sellerId, (r, avg, cnt) => {
      setReviews(r);
      setAvgRating(avg);
      setReviewCount(cnt);
    });
    return unsub;
  }, [product.sellerId]);

  // Récupérer info livreur partenaire du vendeur
  useEffect(() => {
    if (!product.sellerId) return;
    getDoc(doc(db, 'users', product.sellerId)).then(snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.managesDelivery && (data.deliveryPartnerName || data.deliveryPartnerPhone)) {
        setSellerDelivery({ name: data.deliveryPartnerName, phone: data.deliveryPartnerPhone });
      }
    }).catch(() => {});
  }, [product.sellerId]);

  // Charger le score de risque du vendeur pour afficher une alerte si nécessaire
  useEffect(() => {
    if (!product.sellerId) return;
    getTrustScore(product.sellerId).then(score => {
      if (score && score.riskLevel !== 'safe') setSellerRiskScore(score);
    }).catch(() => {});
  }, [product.sellerId]);

  // ── Init like status + subscribe comments ──
  useEffect(() => {
    if (!currentUser || !product.id) return;
    checkIsLiked(product.id, currentUser.uid).then(liked => setIsLiked(liked)).catch(() => {});
  }, [product.id, currentUser?.uid]);

  // likeCount initialisé via onSnapshot ci-dessus (temps réel)

  useEffect(() => {
    if (!product.id) return;
    const unsub = subscribeComments(product.id, (c) => setComments(c));
    return unsub;
  }, [product.id]);

  // Produits similaires (même catégorie, pas le même)
  useEffect(() => {
    getProducts({ category: product.category }).then(all => {
      setSimilarProducts(
        all.filter(p => p.id !== product.id && p.status !== 'sold').slice(0, 6)
      );
    }).catch(() => {});
  }, [product.id, product.category]);

  const handleStartChat = async () => {
    if (isGuest) { onGuestAction?.('message'); return; }
    if (!currentUser || !userProfile) return;
    if (currentUser.uid === product.sellerId) return;
    const limitCheck = await checkChatLimit(currentUser.uid);
    if (!limitCheck.allowed) { setChatLimitError(limitCheck.reason || ''); return; }
    setChatLimitError('');
    setStartingChat(true);
    try {
      const convId = await getOrCreateConversation(
        currentUser.uid, product.sellerId,
        { id: product.id, title: product.title, price: product.price, image: product.images?.[0] || '', neighborhood: product.neighborhood },
        userProfile.name, product.sellerName, userProfile.photoURL, product.sellerPhoto,
      );
      // ✅ Comptabiliser le contact via le messenger (pas WhatsApp)
      await incrementContactCount(product.id, product.sellerId);
      onStartChat?.(convId);
    } catch (e) { console.error('[Chat]', e); }
    finally { setStartingChat(false); }
  };

  const handleBookmark = async () => {
    if (isGuest) { onGuestAction?.('bookmark'); return; }
    if (!currentUser) return;
    const next = !isBookmarked;
    setIsBookmarked(next);
    try {
      if (next) await addBookmark(currentUser.uid, product.id);
      else await removeBookmark(currentUser.uid, product.id);
      await refreshUserProfile();
    } catch { setIsBookmarked(!next); }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      const newIndex = Math.round(scrollRef.current.scrollLeft / width);
      if (newIndex !== currentImageIndex) setCurrentImageIndex(newIndex);
    }
  };

  const scrollToImage = (index: number) => {
    scrollRef.current?.scrollTo({ left: scrollRef.current.offsetWidth * index, behavior: 'smooth' });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setLastDist(Math.hypot(dx, dy));
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      setScale(Math.min(Math.max(scale * (dist / lastDist), 1), 3));
      setLastDist(dist);
    }
  };
  const handleTouchEnd = () => { setLastDist(null); if (scale < 1.1) setScale(1); };
  const handleDoubleTap = () => setScale(prev => prev > 1 ? 1 : 2);

  const handleShare = async () => {
    try {
      await shareProduct(product);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {}
  };



  const handleSendOffer = async () => {
    if (!currentUser || !userProfile || !offerInput.trim()) return;
    const offerPrice = parseInt(offerInput.replace(/\D/g, ''), 10);
    if (!offerPrice || offerPrice <= 0) return;
    setSendingOffer(true);
    try {
      const convId = await getOrCreateConversation(
        currentUser.uid, product.sellerId,
        { id: product.id, title: product.title, price: product.price, image: product.images?.[0] || '', neighborhood: product.neighborhood },
        userProfile.name, product.sellerName, userProfile.photoURL, product.sellerPhoto,
      );
      await sendOfferCard(
        convId, currentUser.uid, userProfile.name,
        {
          id: product.id, title: product.title, price: product.price,
          image: product.images?.[0] || '', sellerId: product.sellerId,
          neighborhood: product.neighborhood,
          sellerName: product.sellerName, sellerPhoto: product.sellerPhoto,
        },
        offerPrice,
        userProfile.photoURL,
      );
      setShowOfferModal(false);
      setOfferInput('');
      onStartChat?.(convId);
    } catch (e) { console.error(e); }
    finally { setSendingOffer(false); }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    const subject = encodeURIComponent('Signalement produit - Brumerie');
    const body = encodeURIComponent(`Produit : ${product.title}\nVendeur : ${product.sellerName}\nID : ${product.id}\nRaison : ${reportReason}`);
    window.open(`mailto:contact.brumerie@gmail.com?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
    setReportSent(true);
    setTimeout(() => setShowReportModal(false), 2000);
  };

  const handleLike = async () => {
    if (isGuest) { onGuestAction?.('like'); return; }
    if (!currentUser || likeLoading) return;
    setLikeLoading(true);
    const prevLiked = isLiked;
    const prevCount = likeCount;
    // Optimistic update
    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      const result = await toggleLike(product.id, currentUser.uid);
      setIsLiked(result.liked);
      setLikeCount(result.count);
    } catch {
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (isGuest) { onGuestAction?.('comment'); return; }
    if (!currentUser || !userProfile || !commentText.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      await addComment(
        product.id,
        currentUser.uid,
        userProfile.name,
        commentText.trim(),
        userProfile.photoURL,
        userProfile.verified || userProfile.sellerVerified,
      );
      setCommentText('');
    } catch (e) { console.error('[Comment]', e); }
    finally { setSendingComment(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(product.id, commentId);
    } catch (e) { console.error('[DeleteComment]', e); }
  };

  const handleAddReply = async (parentId: string) => {
    if (isGuest) { onGuestAction?.('comment'); return; }
    if (!currentUser || !userProfile || !replyText.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      await addComment(
        product.id,
        currentUser.uid,
        userProfile.name,
        replyText.trim(),
        userProfile.photoURL,
        userProfile.verified || userProfile.sellerVerified,
        parentId,
      );
      setReplyText('');
      setReplyTo(null);
    } catch (e) { console.error('[Reply]', e); }
    finally { setSendingReply(false); }
  };

  const handleRepost = async () => {
    if (isGuest) { onGuestAction?.('repost'); return; }
    if (!currentUser || !userProfile || sendingRepost) return;
    setSendingRepost(true);
    try {
      await repostProduct(
        currentUser.uid,
        userProfile.name,
        userProfile.photoURL || undefined,
        {
          id: product.id,
          title: product.title,
          images: product.images || [],
          price: product.price,
          sellerId: product.sellerId,
          sellerName: product.sellerName || '',
        },
        repostComment.trim() || "Regarde cet article sur Brumerie !"
      );
      setRepostDone(true);
      setShowRepost(false);
      setRepostComment('');
      setTimeout(() => setRepostDone(false), 3000);
    } catch (e) {
      console.error('[Repost] Erreur:', e);
      // Ne pas laisser le spinner bloqué même en cas d'erreur règle Firestore
    } finally {
      setSendingRepost(false);
    }
  };

  const createdAtDate = product.createdAt?.toDate ? product.createdAt.toDate() : new Date(product.createdAt);
  const isNew = new Date().getTime() - createdAtDate.getTime() < 48 * 60 * 60 * 1000;
  const isSelf = currentUser?.uid === product.sellerId;
  const [showBoost, setShowBoost] = useState(false);

  // Helper livraison (évite regex/template literals imbriqués dans JSX)
  const getDeliveryLink = () => {
    if (!sellerDelivery?.phone) return '';
    const phone = sellerDelivery.phone.replace(/\D/g, '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent('Livraison pour ' + product.title + ' sur Brumerie');
  };

  return (
    <div className="min-h-screen bg-white pb-32 font-sans">

      {/* ── SLIDER PHOTOS ── */}
      <div className="relative bg-slate-100" style={{ aspectRatio: '1/1' }}>
        <div ref={scrollRef} onScroll={handleScroll}
          className="flex overflow-x-auto h-full snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}>
          {product.images.map((img, idx) => (
            <div key={idx} className="w-full h-full flex-shrink-0 snap-center overflow-hidden"
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              onDoubleClick={handleDoubleTap}
              style={{ cursor: scale > 1 ? 'grab' : 'zoom-in' }}
              onClick={() => { if (scale <= 1) { setLightboxIndex(idx); setLightboxOpen(true); } }}>
              <img src={img} alt={product.title}
                className="w-full h-full object-cover transition-transform duration-200"
                style={{ transform: idx === currentImageIndex ? `scale(${scale})` : 'scale(1)' }}
                draggable={false}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/600x600/f1f5f9/94a3b8?text=${encodeURIComponent(product.title)}`;
                }} />
            </div>
          ))}
        </div>

        {scale === 1 && product.images.length > 0 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full">
            <p className="text-[9px] text-white font-bold">Tap pour agrandir & zoomer</p>
          </div>
        )}

        {/* Boutons top */}
        <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-center z-10">
          <button onClick={onBack} className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#0F172A" strokeWidth="3"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="flex gap-2">
            {/* Bookmark favori */}
            <div className="flex flex-col items-center gap-0.5">
              <button onClick={handleBookmark} className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24"
                  fill={isBookmarked ? '#1D9BF0' : 'none'}
                  stroke={isBookmarked ? '#1D9BF0' : '#0F172A'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                </svg>
              </button>
              {((product as any).bookmarkCount || 0) > 0 && (
                <span className="text-[8px] font-black text-blue-600 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-sm">
                  ❤️ {(product as any).bookmarkCount}
                </span>
              )}
            </div>
            {/* Wishlist ✨ */}
            {!isGuest && currentUser && (
              <div className="flex flex-col items-center gap-0.5">
                <button
                  onClick={async () => {
                    if (!currentUser) return;
                    try {
                      if (isInWishlist) {
                        await removeFromWishlist(currentUser.uid, product.id);
                        setIsInWishlist(false);
                      } else {
                        await addToWishlist(currentUser.uid, product.id);
                        setIsInWishlist(true);
                      }
                      await refreshUserProfile();
                    } catch {}
                  }}
                  className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all">
                  <span className="text-[18px]">{isInWishlist ? '✨' : '☆'}</span>
                </button>
                <span className="text-[8px] font-black bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-sm text-slate-500">
                  {isInWishlist ? 'Wishlist' : 'Wishlist'}
                </span>
              </div>
            )}
            {/* Suivre le vendeur */}
            {!isGuest && currentUser && !isSelf && (
              <div className="flex flex-col items-center gap-0.5">
                <button
                  disabled={followingLoading}
                  onClick={async () => {
                    if (!currentUser) return;
                    setFollowingLoading(true);
                    try {
                      if (isFollowingSeller) {
                        await unfollowSeller(currentUser.uid, product.sellerId);
                        setIsFollowingSeller(false);
                      } else {
                        await followSeller(currentUser.uid, product.sellerId, product.sellerName || '');
                        setIsFollowingSeller(true);
                      }
                      await refreshUserProfile();
                    } catch {}
                    setFollowingLoading(false);
                  }}
                  className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all disabled:opacity-50">
                  <span className="text-[18px]">{followingLoading ? '⏳' : isFollowingSeller ? '🔔' : '🔕'}</span>
                </button>
                <span className="text-[8px] font-black bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-sm"
                  style={{ color: isFollowingSeller ? '#16A34A' : '#64748B' }}>
                  {isFollowingSeller ? 'Suivi' : 'Suivre'}
                </span>
              </div>
            )}
            {/* Partager */}
            <div className="flex flex-col items-center gap-0.5">
              <button onClick={handleShare} className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all">
              {copySuccess
                ? <span className="text-[10px] font-black text-green-600">OK</span>
                : <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0F172A" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </button>
            </div>
          </div>
        </div>

        {/* Badges status */}
        <div className="absolute top-24 right-6 flex flex-col gap-2 z-10">
          {isNew && <span className="bg-green-600 text-white text-[9px] font-black px-4 py-2 rounded-full shadow-lg uppercase">NOUVEAU</span>}
          {product.status === 'sold' && <span className="bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-full shadow-lg uppercase">VENDU</span>}
        </div>

        {/* Dots */}
        {product.images.length > 1 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
            {product.images.map((_, idx) => (
              <button key={idx} onClick={() => scrollToImage(idx)}
                className={`rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-5 h-2' : 'bg-white/40 w-2 h-2'}`}/>
            ))}
          </div>
        )}
        <div className="absolute bottom-6 left-6 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full">
          <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{currentImageIndex + 1} / {product.images.length}</p>
        </div>
      </div>

      {/* ── BARRE SOCIAL — Likes ── */}
      <div className="px-6 py-3 flex items-center gap-4 border-b border-slate-100 bg-white">
        {/* Like button */}
        <button
          onClick={handleLike}
          disabled={likeLoading}
          className="flex items-center gap-2 active:scale-90 transition-transform disabled:opacity-60"
        >
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${isLiked ? 'bg-red-50' : 'bg-slate-100'}`}>
            <svg width="18" height="18" viewBox="0 0 24 24"
              fill={isLiked ? '#EF4444' : 'none'}
              stroke={isLiked ? '#EF4444' : '#64748B'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </div>
          <span className={`text-[13px] font-black ${isLiked ? 'text-red-500' : 'text-slate-500'}`}>
            {likeCount > 0 ? likeCount.toLocaleString('fr-FR') : "J'aimer"}
          </span>
        </button>

        {/* Commentaires — scroll vers section */}
        <button
          onClick={() => {
            const el = document.getElementById('comments-section');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="flex items-center gap-2 active:scale-90 transition-transform"
        >
          <div className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <span className="text-[13px] font-black text-slate-500">
            {comments.length > 0 ? comments.length : 'Commenter'}
          </span>
        </button>

        {/* Repost */}
        <button
          onClick={() => setShowRepost(v => !v)}
          className="flex items-center gap-2 active:scale-90 transition-transform"
        >
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${repostDone ? 'bg-green-100' : 'bg-slate-100'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={repostDone ? '#16A34A' : '#64748B'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17,1 21,5 17,9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7,23 3,19 7,15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
            </svg>
          </div>
          <span className={`text-[13px] font-black ${repostDone ? 'text-green-600' : 'text-slate-500'}`}>
            {repostDone ? "Partagé ✓" : "Repost"}
          </span>
        </button>

        {/* Partager */}
        <button
          onClick={handleShare}
          className="flex items-center gap-2 active:scale-90 transition-transform ml-auto"
        >
          <div className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center">
            {copySuccess
              ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
              : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
            }
          </div>
          <span className="text-[13px] font-black text-slate-500">Partager</span>
        </button>
      </div>

      {/* ── MODAL REPOST ── */}
      {showRepost && (
        <div className="px-6 py-4 bg-green-50 border-b border-green-100">
          <p className="text-[11px] font-black text-green-700 uppercase tracking-wider mb-3">
            🔄 Partager avec un commentaire
          </p>
          <div className="bg-white rounded-2xl border-2 border-green-200 overflow-hidden mb-3">
            <textarea
              autoFocus
              value={repostComment}
              onChange={e => setRepostComment(e.target.value)}
              placeholder="Ajoute ton commentaire... (optionnel)"
              rows={2}
              maxLength={200}
              className="w-full px-4 pt-3 pb-2 bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 outline-none resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowRepost(false); setRepostComment(''); }}
              className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-wider active:scale-95 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleRepost}
              disabled={sendingRepost}
              className="flex-1 py-3 rounded-2xl text-white text-[11px] font-black uppercase tracking-wider disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}
            >
              {sendingRepost
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <>🔄 Repost</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── INFOS PRODUIT ── */}
      <div className="px-6 py-8">

        {/* Prix + catégorie */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              {/* Prix affiché — promo active ou prix normal */}
              {(() => {
                const p = product as any;
                const now = new Date().toISOString();
                const promoActive = p.promoPrice && p.promoPrice < product.price
                  && (!p.promoActiveFrom || p.promoActiveFrom <= now)
                  && (!p.promoActiveUntil || p.promoActiveUntil >= now);
                const displayPrice = promoActive ? p.promoPrice : product.price;
                const crossed = promoActive ? product.price : product.originalPrice;
                const pct = crossed ? Math.round(((crossed - displayPrice) / crossed) * 100) : 0;
                return (
                  <>
                    {p.flashSaleLabel && promoActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full mb-1">
                        🔥 {p.flashSaleLabel}
                        {p.promoActiveUntil && <span className="text-orange-400">· jusqu'au {new Date(p.promoActiveUntil).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                      </span>
                    )}
                    <p className="price-brumerie text-[38px] text-slate-900 leading-none" style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, letterSpacing:'-0.04em' }}>
                      {displayPrice.toLocaleString('fr-FR')} <span className="text-[20px] text-slate-400 font-bold" style={{ fontFamily:"'DM Sans',sans-serif" }}>FCFA</span>
                    </p>
                    {crossed && crossed > displayPrice && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 line-through text-[15px] font-bold">{crossed.toLocaleString('fr-FR')}</span>
                        <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-xl">-{pct}%</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 mt-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#94A3B8"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>
              <span>{product.neighborhood}</span>
              <span className="w-1 h-1 bg-slate-200 rounded-full"/>
              <span>{formatRelativeDate(product.createdAt)}</span>
            </div>
          </div>
          <span className="bg-slate-100 text-slate-700 text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest">{categoryLabel}</span>
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-3 leading-tight uppercase">{product.title}</h1>

        {/* État + Quantité */}
        {(product.condition || (product.quantity && product.quantity > 1)) && (
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {product.condition && <ConditionBadge condition={product.condition} size="md" />}
            {product.quantity && product.quantity > 1 && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                {product.quantity} disponibles
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <div className="bg-slate-50 rounded-3xl p-5 mb-6 border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Description</p>
          <p className="text-slate-700 text-sm leading-relaxed font-medium" style={{ whiteSpace: 'pre-line' }}>{product.description || 'Aucune description fournie.'}</p>
        </div>

        {/* ── TAGS VENDEURS ── */}
        {product.taggedSellerNames && product.taggedSellerNames.length > 0 && (
          <div className="mb-5 px-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vendeurs tagués</p>
            <div className="flex flex-wrap gap-2">
              {product.taggedSellerNames.map((name, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl text-[11px] font-black text-green-700">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  @{name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── SIGNAUX DE CONFIANCE ── */}
        <div className="mb-6 space-y-3">

          {/* Compteurs — masquables par le vendeur */}
          {!product.hideStats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                <p className="text-lg font-black text-slate-900">
                  {liveContactCount === -1 ? '…' : liveContactCount}
                </p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">intéressés</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                <p className="text-lg font-black text-slate-900">
                  {liveViewCount === -1 ? '…' : liveViewCount}
                </p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Vues</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
                <p className={`text-sm font-black ${product.status === 'sold' ? 'text-red-500' : 'text-green-600'}`}>
                  {product.status === 'sold' ? 'Vendu' : 'Dispo'}
                </p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Statut</p>
              </div>
            </div>
          )}
          {product.hideStats && (
            <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-green-600 text-base">✅</span>
              <span className="text-[11px] font-bold text-green-700">Article disponible · Publié sur Brumerie</span>
            </div>
          )}

          {/* ── Alerte vendeur à risque ── */}
          {sellerRiskScore && sellerRiskScore.riskLevel !== 'safe' && !isSelf && (
            <RiskAlertBanner
              level={sellerRiskScore.riskLevel}
              reportCount={sellerRiskScore.reportCount}
              userName={product.sellerName}
            />
          )}

          {/* Badges de confiance */}
          <div className="grid grid-cols-2 gap-2">
            {/* Vendeur vérifié */}
            {(product.sellerVerified || product.sellerPremium) && (
              <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></svg>
                <div>
                  <p className="text-[10px] font-black text-green-800">Vendeur Vérifié</p>
                  <p className="text-[9px] text-green-600">Identité contrôlée</p>
                </div>
              </div>
            )}
            {/* Paiement sécurisé */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <div>
                <p className="text-[10px] font-black text-blue-800">Paiement Mobile Money</p>
                <p className="text-[9px] text-blue-600">Wave · Orange · MTN</p>
              </div>
            </div>
            {/* Article récent */}
            {isNew && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                <div>
                  <p className="text-[10px] font-black text-amber-800">Nouveau</p>
                  <p className="text-[9px] text-amber-600">Publié récemment</p>
                </div>
              </div>
            )}
            {/* Livraison disponible */}
            {sellerDelivery?.phone && (
              <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="16" r="1"/><circle cx="20" cy="16" r="1"/></svg>
                <div>
                  <p className="text-[10px] font-black text-purple-800">Livraison dispo</p>
                  <p className="text-[9px] text-purple-600">Dans ton quartier</p>
                </div>
              </div>
            )}
          </div>

          {/* Garantie Brumerie */}
          <div className="bg-slate-900 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-xl flex-shrink-0">🛡️</span>
            <div>
              <p className="text-[11px] font-black text-white mb-1">Protection acheteur Brumerie</p>
              <p className="text-[10px] text-slate-400 leading-snug">
                Problème avec ta commande ? Notre équipe intervient sur WhatsApp <span className="text-green-400 font-bold">+225 05 86 86 76 93</span>. Chaque vendeur est soumis à nos règles d'utilisation.
              </p>
            </div>
          </div>
        </div>

        {/* ── CARTE VENDEUR enrichie ── */}
        <button onClick={() => onSellerClick(product.sellerId)}
          className="w-full bg-slate-900 rounded-[2.5rem] p-5 flex items-center gap-4 active:scale-95 transition-all shadow-2xl mb-6">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/10 border-2 border-white/20 shrink-0">
            {product.sellerPhoto
              ? <img src={product.sellerPhoto} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center bg-green-500 text-white text-xl font-black">{product.sellerName?.charAt(0).toUpperCase()}</div>
            }
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-black text-white text-sm uppercase truncate">{product.sellerName}</span>
              {(product.sellerVerified || product.sellerPremium) && (
                <VerifiedTag tier={product.sellerPremium ? 'premium' : 'verified'} size="xs" />
              )}
            </div>
            {/* Note du vendeur */}
            {avgRating > 0 && (
              <div className="flex items-center gap-1.5 mb-1">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={avgRating >= s ? '#FBBF24' : '#374151'} stroke="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <span className="text-[9px] text-slate-400 font-bold">{avgRating.toFixed(1)} ({reviewCount} avis)</span>
              </div>
            )}
            <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Voir le vendeur →</p>
          </div>
        </button>

        {/* ── AVIS DU VENDEUR ── */}
        {reviews.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-slate-900 text-sm uppercase tracking-tight">Avis sur ce vendeur</p>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={avgRating >= s ? '#FBBF24' : '#E2E8F0'} stroke="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <span className="text-[10px] font-black text-slate-500">{avgRating.toFixed(1)}</span>
              </div>
            </div>
            <div className="space-y-3">
              {reviews.slice(0, 3).map(r => (
                <div key={r.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                      {r.fromUserPhoto
                        ? <img src={r.fromUserPhoto} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-sm">{r.fromUserName?.charAt(0)}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-[11px] truncate">{r.fromUserName}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1,2,3,4,5].map(s => (
                          <svg key={s} width="9" height="9" viewBox="0 0 24 24" fill={r.rating >= s ? '#FBBF24' : '#E2E8F0'} stroke="none">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                  {r.comment && <p className="text-[11px] text-slate-600 italic">"{r.comment}"</p>}
                </div>
              ))}
              {reviews.length > 3 && (
                <button onClick={() => onSellerClick(product.sellerId)}
                  className="w-full py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-2xl">
                  Voir tous les {reviewCount} avis →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── COMMENTAIRES ── */}
        <div id="comments-section" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="font-black text-slate-900 text-sm uppercase tracking-tight">
              Commentaires {comments.length > 0 && <span className="text-slate-400 font-bold">({comments.length})</span>}
            </p>
            {comments.length > 3 && (
              <button
                onClick={() => setShowAllComments(v => !v)}
                className="text-[10px] font-black text-green-600 uppercase tracking-wider"
              >
                {showAllComments ? 'Réduire' : `Voir tous (${comments.length})`}
              </button>
            )}
          </div>

          {/* Input nouveau commentaire */}
          {!isGuest && currentUser && (
            <div className="flex items-end gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                {userProfile?.photoURL
                  ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-sm">{userProfile?.name?.charAt(0)}</div>
                }
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:border-green-400 transition-all overflow-hidden">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  placeholder="Ajouter un commentaire..."
                  rows={commentText.length > 60 ? 3 : 1}
                  className="w-full px-4 pt-3 pb-1 bg-transparent text-[13px] font-medium text-slate-700 placeholder:text-slate-400 outline-none resize-none"
                />
                {commentText.trim() && (
                  <div className="flex justify-end px-3 pb-2">
                    <button
                      onClick={handleAddComment}
                      disabled={sendingComment || !commentText.trim()}
                      className="px-4 py-1.5 rounded-xl text-white text-[11px] font-black uppercase tracking-wider disabled:opacity-50 active:scale-95 transition-all flex items-center gap-1.5"
                      style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}
                    >
                      {sendingComment
                        ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        : <>Publier</>
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {isGuest && (
            <button
              onClick={() => onGuestAction?.('comment')}
              className="w-full py-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 text-[12px] font-bold mb-4 active:scale-95 transition-all"
            >
              Connecte-toi pour commenter
            </button>
          )}

          {/* Liste des commentaires */}
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <p className="text-[12px] font-bold text-slate-400">Sois le premier à commenter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                // Séparer commentaires racines et réponses
                const roots = (showAllComments ? comments : comments.slice(-3))
                  .filter(c => !(c as any).parentId);
                const replies = comments.filter(c => !!(c as any).parentId);
                const getReplies = (parentId: string) =>
                  replies.filter(r => (r as any).parentId === parentId);

                const formatDate = (createdAt: any) => {
                  if (!createdAt?.toDate) return '';
                  const d = createdAt.toDate();
                  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  return `${date} · ${time}`;
                };

                const CommentBubble = ({ c, isReply = false }: { c: any; isReply?: boolean }) => (
                  <div className={`flex gap-2.5 ${isReply ? 'ml-10' : ''}`}>
                    <div className={`${isReply ? 'w-7 h-7' : 'w-8 h-8'} rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 mt-0.5`}>
                      {c.userPhoto
                        ? <img src={c.userPhoto} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-[10px]">{c.userName?.charAt(0).toUpperCase()}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`${isReply ? 'bg-green-50 border border-green-100' : 'bg-slate-50'} rounded-2xl rounded-tl-sm px-3 py-2.5`}>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="font-black text-slate-900 text-[11px]">{c.userName}</span>
                          {c.userVerified && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                              <polyline points="9,12 11,14 15,10"/>
                            </svg>
                          )}
                          {isReply && <span className="text-[9px] text-green-600 font-bold bg-green-100 px-1.5 py-0.5 rounded-full">réponse</span>}
                        </div>
                        <p className="text-[13px] text-slate-700 leading-snug">{c.text}</p>
                      </div>
                      {/* Actions sous le commentaire */}
                      <div className="flex items-center gap-3 mt-1 px-2 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatDate(c.createdAt)}
                        </span>
                        {/* Répondre — visible pour tout utilisateur connecté */}
                        {!isGuest && currentUser && !isReply && (
                          <button
                            onClick={() => {
                              if (replyTo?.id === c.id) {
                                setReplyTo(null);
                                setReplyText('');
                              } else {
                                setReplyTo({ id: c.id, userName: c.userName });
                                setReplyText('');
                              }
                            }}
                            className="text-[10px] font-black text-slate-400 hover:text-green-600 transition-colors"
                          >
                            Répondre
                          </button>
                        )}
                        {/* Supprimer — auteur du commentaire OU vendeur du produit */}
                        {currentUser && (c.userId === currentUser.uid || currentUser.uid === product.sellerId) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-[10px] font-bold text-slate-300 hover:text-red-400 transition-colors"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>

                      {/* Input réponse inline */}
                      {replyTo?.id === c.id && !isGuest && currentUser && (
                        <div className="mt-2 ml-1 flex items-end gap-2">
                          <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                            {userProfile?.photoURL
                              ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover"/>
                              : <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-[8px]">{userProfile?.name?.charAt(0)}</div>
                            }
                          </div>
                          <div className="flex-1 bg-white border-2 border-green-300 rounded-2xl overflow-hidden">
                            <textarea
                              autoFocus
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddReply(c.id); }
                                if (e.key === 'Escape') { setReplyTo(null); setReplyText(''); }
                              }}
                              placeholder={`Répondre à ${c.userName}…`}
                              rows={1}
                              className="w-full px-3 pt-2 pb-1 bg-transparent text-[12px] font-medium text-slate-700 placeholder:text-slate-400 outline-none resize-none"
                            />
                            {replyText.trim() && (
                              <div className="flex justify-between items-center px-3 pb-2">
                                <button
                                  onClick={() => { setReplyTo(null); setReplyText(''); }}
                                  className="text-[10px] font-bold text-slate-400"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => handleAddReply(c.id)}
                                  disabled={sendingReply || !replyText.trim()}
                                  className="px-3 py-1 rounded-xl text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-50 active:scale-95 transition-all"
                                  style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}
                                >
                                  {sendingReply
                                    ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                    : "Répondre"
                                  }
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );

                return roots.map(c => (
                  <div key={c.id}>
                    <CommentBubble c={c} />
                    {/* Réponses imbriquées */}
                    {getReplies(c.id).length > 0 && (
                      <div className="mt-2 space-y-2">
                        {getReplies(c.id).map(r => (
                          <CommentBubble key={r.id} c={r} isReply />
                        ))}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* ── PRODUITS SIMILAIRES ── */}
        {similarProducts.length > 0 && (
          <div className="mb-8">
            <p className="font-black text-slate-900 text-sm uppercase tracking-tight mb-4">Articles similaires</p>
            <div className="grid grid-cols-2 gap-3">
              {similarProducts.slice(0, 4).map(p => (
                <div key={p.id} className="active:scale-95 transition-transform">
                  <ProductCard
                    product={p}
                    onClick={() => onProductClick?.(p)}
                    onBookmark={() => {}}
                    isBookmarked={false}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signaler */}
        <button onClick={() => setShowTrustModal(true)}
          className="w-full py-3 flex items-center justify-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Signaler ce vendeur
        </button>
      </div>

      {/* ── FOOTER FIXE ── */}
      {chatLimitError && (
        <div className="fixed bottom-24 left-4 right-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 z-40 shadow-lg">
          <p className="text-[11px] font-bold text-amber-700">⚠️ {chatLimitError}</p>
          <button onClick={() => setChatLimitError('')} className="absolute top-2 right-3 text-amber-400 font-black text-sm">×</button>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-50 p-4">
        {product.status === 'sold' ? (
          <div className="w-full py-5 rounded-2xl bg-slate-100 text-slate-300 font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center">VENDU</div>
        ) : isSelf ? (
          <button onClick={() => setShowBoost(true)}
            className="w-full py-4 rounded-2xl bg-blue-500 text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-100">
            ⚡ Booster cet article
          </button>
        ) : (
          <>
          <div className="flex gap-3">
            <button onClick={handleStartChat} disabled={startingChat}
              className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 bg-slate-100 text-slate-700 active:scale-95 transition-all disabled:opacity-50">
              {startingChat
                ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"/>
                : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Discuter</>
              }
            </button>

            {!isGuest && currentUser?.uid !== product.sellerId && product.status !== 'sold' && (
              <button onClick={() => setShowOfferModal(true)}
                className="flex-1 py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-widest border-2 border-slate-200 text-slate-700 bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                💰 Offre
              </button>
            )}
            <button onClick={() => { if (isGuest) { onGuestAction?.('contact'); return; } onBuyClick?.(product); }}
              className="flex-[2] py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white flex items-center justify-center gap-2 shadow-xl shadow-green-200 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              Acheter
            </button>
          </div>

          {sellerDelivery?.phone && (
            <a
              href={getDeliveryLink()}
              target="_blank" rel="noopener noreferrer"
              className="mt-3 w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all border-2 border-green-200 text-green-700 bg-green-50">
              🚚 Livraison disponible — Contacter {sellerDelivery.name || 'le livreur'}
            </a>
          )}
          </>
        )}
      </div>

      {/* ── MODAL SIGNALEMENT — branché sur Trust System ── */}
      {showTrustModal && (
        <ReportUserModal
          reportedId={product.sellerId}
          reportedName={product.sellerName}
          reportedRole="seller"
          productId={product.id}
          onClose={() => setShowTrustModal(false)}
        />
      )}

      {lightboxOpen && (
        <ImageLightbox images={product.images} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)}/>
      )}

      {/* ── MODAL FAIRE UNE OFFRE ── */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-end justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8" style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"/>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
                <img src={product.images?.[0]} alt="" className="w-full h-full object-cover"/>
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm truncate">{product.title}</p>
                <p className="text-green-600 font-black">{product.price.toLocaleString('fr-FR')} FCFA</p>
                <p className="text-[10px] text-slate-400 font-bold">Prix demandé par le vendeur</p>
              </div>
            </div>
            <p className="font-black text-slate-900 text-lg uppercase tracking-tight mb-1">Faire une offre</p>
            <p className="text-slate-400 text-[11px] mb-5">Proposez votre prix — le vendeur pourra accepter ou refuser.</p>
            <div className="relative mb-5">
              <input
                type="number"
                value={offerInput}
                onChange={e => setOfferInput(e.target.value)}
                placeholder={`Ex: ${Math.round(product.price * 0.85).toLocaleString('fr-FR')}`}
                className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-[18px] font-black border-2 border-transparent focus:border-green-400 focus:bg-white outline-none transition-all"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">FCFA</span>
            </div>
            {offerInput && parseInt(offerInput) > 0 && (
              <div className={`text-[11px] font-bold mb-4 px-3 py-2 rounded-xl ${
                parseInt(offerInput) < product.price * 0.5
                  ? 'bg-red-50 text-red-600'
                  : parseInt(offerInput) >= product.price
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {parseInt(offerInput) < product.price * 0.5
                  ? '⚠️ Offre très basse — peu de chances d\'être acceptée'
                  : parseInt(offerInput) >= product.price
                  ? '✅ Offre au prix ou supérieure — sera acceptée !'
                  : `💡 Réduction de ${Math.round((1 - parseInt(offerInput) / product.price) * 100)}% — bonne proposition`
                }
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowOfferModal(false); setOfferInput(''); }}
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-700 font-black text-[11px] uppercase">Annuler</button>
              <button
                onClick={handleSendOffer}
                disabled={!offerInput || parseInt(offerInput) <= 0 || sendingOffer}
                className="flex-[2] py-4 rounded-2xl text-white font-black text-[11px] uppercase disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                {sendingOffer ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : '💰 Envoyer l\'offre'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Boost Modal */}
      {showBoost && (
        <BoostModal
          product={product}
          onClose={() => setShowBoost(false)}
          onBoosted={() => setShowBoost(false)}
        />
      )}
    </div>
  );
}