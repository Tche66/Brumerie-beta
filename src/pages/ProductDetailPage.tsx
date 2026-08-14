import { ChevronLeft } from 'lucide-react';
import { VerifiedTag } from '@/components/VerifiedTag';
import { ConditionBadge } from '@/components/ConditionBadge';
import React, { useState, useRef, useEffect } from 'react';
import { Product, CATEGORIES, Review } from '@/types';
import { formatPrice, formatRelativeDate } from '@/utils/helpers';
import { getProducts, incrementViewCount, incrementContactCount, toggleLike, checkIsLiked, addComment, deleteComment, subscribeComments, deleteProduct, updateProductStatus } from '@/services/productService';
import { uploadToCloudinary } from '@/utils/uploadImage';
import { searchAllUsers } from '@/services/userService';
import type { ProductComment } from '@/types';
import { addBookmark, removeBookmark } from '@/services/bookmarkService';
import { followSeller, unfollowSeller } from '@/services/shopFeaturesService';
import { useAuth } from '@/contexts/AuthContext';
import { BoostModal } from '@/components/BoostModal';
import { ImageLightbox } from '@/components/ImageLightbox';
import { getOrCreateConversation, checkChatLimit, sendOfferCard } from '@/services/messagingService';
import { subscribeSellerReviews } from '@/services/reviewService';
import { ProductCard } from '@/components/ProductCard';
import { onSnapshot, doc, getDoc, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { shareProduct } from '@/utils/shareProduct';
import { ReportUserModal } from '@/components/ReportUserModal';
import { getTrustScore, TrustScore } from '@/services/trustService';
import { RiskAlertBanner } from '@/components/RiskBadge';
import { setProductMeta } from '@/utils/seo';
import { addToCart } from '@/services/cartService';


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
  const [sellerWhatsapp, setSellerWhatsapp] = useState<string>('');
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
  const [commentPhoto, setCommentPhoto] = useState<File | null>(null);
  const [commentPhotoPreview, setCommentPhotoPreview] = useState<string | null>(null);
  const [uploadingCommentPhoto, setUploadingCommentPhoto] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const [showAllComments, setShowAllComments] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; userName: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const categoryLabel = CATEGORIES.find(c => c.id === product.category)?.label || product.category;

  // ── SEO — meta tags dynamiques pour Google ──
  useEffect(() => {
    setProductMeta({
      title: product.title,
      description: product.description || '',
      price: product.price,
      images: product.images || [],
      neighborhood: product.neighborhood,
      category: product.category,
      sellerName: product.sellerName || '',
      id: product.id,
    });
  }, [product.id]);

  // ── Abonnement temps réel + incrément vue en une seule opération ──
  useEffect(() => {
    viewIncrementedRef.current = false;
    const isSeller = currentUser?.uid === product.sellerId;

    const unsub = onSnapshot(doc(db, 'products', product.id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setLiveViewCount(data.viewCount ?? 0);
      setLiveContactCount(data.whatsappClickCount ?? 0);
      setLikeCount(data.likeCount ?? 0);

      if (!viewIncrementedRef.current && !isSeller && currentUser) {
        viewIncrementedRef.current = true;
        incrementViewCount(product.id).catch(e =>
          console.error('[ViewCount] Règles Firestore — voir FIRESTORE_RULES.md :', e)
        );
      }
    }, () => {});

    return () => {
      viewIncrementedRef.current = false;
      unsub();
    };
  }, [product.id, currentUser?.uid]);

  // Bookmark + Following sync
  useEffect(() => {
    const ids = userProfile?.bookmarkedProductIds || [];
    const followIds = (userProfile as any)?.followingSellers || [];
    setIsBookmarked(ids.includes(product.id));
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
      setSellerWhatsapp(data.shopWhatsapp || data.phone || '');
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

  // ── Compteur likes temps réel depuis la sous-collection ──
  // Contourne la règle Firestore sur le document produit
  useEffect(() => {
    if (!product.id) return;
    const unsub = onSnapshot(
      collection(db, 'products', product.id, 'likes'),
      (snap) => setLikeCount(snap.size),
      () => {}
    );
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
    if (!currentUser || !userProfile || (!commentText.trim() && !commentPhoto) || sendingComment) return;
    setSendingComment(true);
    try {
      let photoUrl: string | undefined;
      if (commentPhoto) {
        setUploadingCommentPhoto(true);
        try {
          photoUrl = await uploadToCloudinary(commentPhoto);
        } catch (e) {
          console.error('[Comment photo upload]', e);
        } finally {
          setUploadingCommentPhoto(false);
        }
      }
      await addComment(
        product.id,
        currentUser.uid,
        userProfile.name,
        commentText.trim() || '📷',
        userProfile.photoURL,
        userProfile.verified || userProfile.sellerVerified,
        undefined,
        photoUrl,
      );
      setCommentText('');
      setCommentPhoto(null);
      setCommentPhotoPreview(null);
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

  const createdAtDate = (() => {
    try {
      if (!product.createdAt) return new Date(0);
      if (typeof product.createdAt.toDate === 'function') return product.createdAt.toDate();
      if (product.createdAt.seconds) return new Date(product.createdAt.seconds * 1000);
      const d = new Date(product.createdAt);
      return isNaN(d.getTime()) ? new Date(0) : d;
    } catch { return new Date(0); }
  })();
  const isNew = new Date().getTime() - createdAtDate.getTime() < 48 * 60 * 60 * 1000;
  const isSelf = currentUser?.uid === product.sellerId;
  const [showBoost, setShowBoost] = useState(false);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markingSold, setMarkingSold] = useState(false);

  // Helper livraison (évite regex/template literals imbriqués dans JSX)
  const getDeliveryLink = () => {
    if (!sellerDelivery?.phone) return '';
    const phone = sellerDelivery.phone.replace(/\D/g, '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent('Livraison pour ' + product.title + ' sur Brumerie');
  };

  return (
    <div className="min-h-screen bg-white pb-32 font-sans">

      {/* ── ZONE IMAGE IMMERSIVE ── */}
      <div className="relative bg-slate-100" style={{ aspectRatio: '3/4' }}>
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
                  (e.target as HTMLImageElement).src = `https://placehold.co/600x800/f1f5f9/94a3b8?text=${encodeURIComponent(product.title)}`;
                }} />
            </div>
          ))}
        </div>

        {/* Gradient overlay haut et bas */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        {/* ── Header : Retour + Vendeur overlay ── */}
        <div className="absolute top-0 inset-x-0 px-4 pt-5 pb-8 flex items-center gap-3 z-10">
          <button onClick={onBack} className="w-10 h-10 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-all">
            <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => onSellerClick(product.sellerId)}
            className="w-9 h-9 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm flex-shrink-0 border-2 border-white/60 active:scale-95 transition-all"
          >
            {product.sellerPhoto
              ? <img src={product.sellerPhoto} alt={product.sellerName} className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-white font-semibold text-xs">{product.sellerName?.charAt(0)}</div>
            }
          </button>
          <button
            onClick={() => onSellerClick(product.sellerId)}
            className="flex items-center gap-1.5 active:opacity-70 transition-all"
          >
            <span className="text-sm font-semibold text-white drop-shadow-md truncate max-w-[120px]">{product.sellerName}</span>
            {(product.sellerVerified || product.sellerPremium) && (
              <VerifiedTag tier={product.sellerPremium ? 'premium' : 'verified'} size="sm"/>
            )}
          </button>
          {/* Bouton Suivre */}
          {!isGuest && currentUser && !isSelf && (
            <button
              disabled={followingLoading}
              onClick={async () => {
                if (!currentUser) return;
                setFollowingLoading(true);
                try {
                  if (isFollowingSeller) {
                    await unfollowSeller(currentUser.uid, product.sellerId, userProfile?.name);
                    setIsFollowingSeller(false);
                  } else {
                    await followSeller(currentUser.uid, product.sellerId, product.sellerName || '', userProfile?.name);
                    setIsFollowingSeller(true);
                  }
                  await refreshUserProfile();
                } catch {}
                setFollowingLoading(false);
              }}
              className={`ml-auto px-4 py-1.5 rounded-lg text-xs font-medium active:scale-95 transition-all disabled:opacity-50 ${
                isFollowingSeller
                  ? 'bg-white/20 backdrop-blur-md text-white border border-white/30'
                  : 'bg-green-500 text-white'
              }`}
            >
              {followingLoading ? '...' : isFollowingSeller ? 'Suivi ✓' : 'Suivre'}
            </button>
          )}
        </div>

        {/* ── Badge état (Neuf, etc.) ── */}
        {product.condition && product.status !== 'sold' && (
          <div className="absolute top-16 left-4 z-10">
            <ConditionBadge condition={product.condition} size="md"/>
          </div>
        )}


        {/* ── Badges status en bas à gauche ── */}
        <div className="absolute bottom-14 left-4 flex flex-col gap-2 z-10">
          {isNew && <span className="bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-full">Nouveau</span>}
          {product.status === 'sold' && <span className="bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-full">Vendu</span>}
        </div>

        {/* Dots indicateurs */}
        {product.images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
            {product.images.map((_: string, idx: number) => (
              <button key={idx} onClick={() => scrollToImage(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-5' : 'bg-white/50 w-1.5'}`}/>
            ))}
          </div>
        )}

        {/* Compteur images */}
        {product.images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-full z-10">
            {currentImageIndex + 1}/{product.images.length}
          </div>
        )}
      </div>

      {/* ── BARRE SOCIAL COMPACTE ── */}
      <div className="px-5 py-3 flex items-center gap-5 border-b border-slate-100 bg-white">
        {/* Commentaires */}
        <button
          onClick={() => {
            const el = document.getElementById('comments-section');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <span className="text-sm font-medium text-slate-500">
            {comments.length > 0 ? `${comments.length} commentaire${comments.length > 1 ? 's' : ''}` : 'Commenter'}
          </span>
        </button>

        {/* Partager */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={copySuccess ? '#16A34A' : '#64748B'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span className={`text-sm font-medium ${copySuccess ? 'text-green-600' : 'text-slate-500'}`}>
            {copySuccess ? 'Copié ✓' : 'Partager'}
          </span>
        </button>

        {/* Favoris */}
        <button
          onClick={async () => {
            if (isGuest) { onGuestAction?.('bookmark'); return; }
            if (!currentUser) return;
            if (isBookmarked) { await removeBookmark(currentUser.uid, product.id); }
            else { await addBookmark(currentUser.uid, product.id); }
            setIsBookmarked(!isBookmarked);
            await refreshUserProfile();
          }}
          className="flex items-center gap-1.5 active:scale-95 transition-transform ml-auto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked ? '#16A34A' : 'none'} stroke={isBookmarked ? '#16A34A' : '#64748B'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
          <span className={`text-sm font-medium ${isBookmarked ? 'text-green-600' : 'text-slate-500'}`}>
            {isBookmarked ? 'Enregistre' : 'Enregistrer'}
          </span>
        </button>
      </div>


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
                    {(p.flashSaleLabel || p.flashSaleActive) && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-gradient-to-r from-red-500 to-orange-500 px-3 py-1.5 rounded-full mb-2 animate-pulse shadow-md">
                        🔥 {p.flashSaleLabel || 'Vente flash en cours'}
                        {p.promoActiveUntil && (
                          <span className="opacity-80 font-bold">· jusqu'au {new Date(p.promoActiveUntil).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                        )}
                      </div>
                    )}
                    <p className="price-brumerie text-2xl text-slate-900 leading-none" style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, letterSpacing:'-0.02em' }}>
                      {displayPrice.toLocaleString('fr-FR')} <span className="text-[20px] text-slate-400 font-bold" style={{ fontFamily:"'DM Sans',sans-serif" }}>FCFA</span>
                    </p>
                    {crossed && crossed > displayPrice && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 line-through text-[15px] font-bold">{crossed.toLocaleString('fr-FR')} F</span>
                        <span className="bg-red-500 text-white text-xs font-medium px-2.5 py-1 rounded-lg shadow-sm">-{pct}%</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 mt-2 text-gray-500 font-medium text-xs">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#94A3B8"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>
              <span>{product.neighborhood}</span>
              <span className="w-1 h-1 bg-slate-200 rounded-full"/>
              <span>{formatRelativeDate(product.createdAt)}</span>
            </div>
          </div>
          <span className="bg-slate-100 text-slate-700 text-xs font-medium px-4 py-2 rounded-xl">{categoryLabel}</span>
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-3 leading-tight">{product.title}</h1>

        {/* État + Quantité */}
        {(product.condition || (product.quantity && product.quantity > 1)) && (
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {product.condition && <ConditionBadge condition={product.condition} size="md" />}
            {product.quantity && product.quantity > 1 && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">
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
        {(() => {
          const desc = product.description || 'Aucune description fournie.';
          const isLong = desc.length > 200;
          return (
            <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-100">
              <p className="text-xs font-medium text-gray-500 mb-3">Description</p>
              <p className="text-slate-700 text-sm leading-relaxed font-medium" style={{ whiteSpace: 'pre-line' }}>
                {isLong && !expandedDesc ? desc.slice(0, 200) + '...' : desc}
              </p>
              {isLong && (
                <button
                  onClick={() => setExpandedDesc(v => !v)}
                  className="mt-3 text-xs font-medium text-green-600 active:scale-95 transition-all"
                >
                  {expandedDesc ? '▲ Réduire' : '▼ Voir plus'}
                </button>
              )}
            </div>
          );
        })()}

        {/* ── CONTACTER LE VENDEUR ── */}
        {!isSelf && !isGuest && currentUser && product.status !== 'sold' && (
          <div className="mb-6 flex gap-2">
            <button
              onClick={async () => {
                if (!currentUser || !userProfile) return;
                try {
                  const convId = await getOrCreateConversation(
                    currentUser.uid,
                    product.sellerId,
                    { id: product.id, title: product.title, price: product.price, image: product.images?.[0] || '', neighborhood: product.neighborhood || '' },
                    userProfile.name || '',
                    product.sellerName || '',
                    userProfile.photoURL || '',
                    product.sellerPhoto || '',
                  );
                  if (convId) onStartChat?.(convId);
                } catch (e) {
                  console.error('[Contacter vendeur]', e);
                }
              }}
              className="flex-1 py-4 rounded-lg bg-slate-900 text-white font-medium text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              Contacter le vendeur
            </button>
            {sellerWhatsapp && (
              <a
                href={`https://wa.me/${sellerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Bonjour ! Je suis interesse par votre article "' + product.title + '" sur Brumerie.')}`}
                target="_blank" rel="noopener noreferrer"
                className="w-14 py-4 rounded-lg bg-green-500 flex items-center justify-center active:scale-95 transition-all shadow-sm"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                </svg>
              </a>
            )}
          </div>
        )}

        {/* ── TAGS VENDEURS ── */}
        {product.taggedSellerNames && product.taggedSellerNames.length > 0 && (
          <div className="mb-5 px-1">
            <p className="text-xs font-medium text-gray-500 mb-2">Vendeurs tagués</p>
            <div className="flex flex-wrap gap-2">
              {product.taggedSellerNames.map((name, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl text-xs font-medium text-green-700">
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
              <div className="bg-white rounded-lg p-3 text-center border border-slate-100 shadow-sm">
                <p className="text-lg font-semibold text-slate-900">
                  {liveContactCount === -1 ? '…' : liveContactCount}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">intéressés</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border border-slate-100 shadow-sm">
                <p className="text-lg font-semibold text-slate-900">
                  {liveViewCount === -1 ? '…' : liveViewCount}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Vues</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border border-slate-100 shadow-sm">
                <p className={`text-sm font-semibold ${product.status === 'sold' ? 'text-red-500' : 'text-green-600'}`}>
                  {product.status === 'sold' ? 'Vendu' : 'Dispo'}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Statut</p>
              </div>
            </div>
          )}
          {product.hideStats && (
            <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 flex items-center gap-2">
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
              <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></svg>
                <div>
                  <p className="text-xs font-medium text-green-800">Vendeur Vérifié</p>
                  <p className="text-[9px] text-green-600">Identité contrôlée</p>
                </div>
              </div>
            )}
            {/* Paiement sécurisé */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <div>
                <p className="text-xs font-medium text-blue-800">Paiement Mobile Money</p>
                <p className="text-[9px] text-blue-600">Wave · Orange · MTN</p>
              </div>
            </div>
            {/* Article récent */}
            {isNew && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                <div>
                  <p className="text-xs font-medium text-amber-800">Nouveau</p>
                  <p className="text-[9px] text-amber-600">Publié récemment</p>
                </div>
              </div>
            )}
            {/* Livraison disponible */}
            {sellerDelivery?.phone && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="16" r="1"/><circle cx="20" cy="16" r="1"/></svg>
                <div>
                  <p className="text-xs font-medium text-purple-800">Livraison dispo</p>
                  <p className="text-[9px] text-purple-600">Dans ton quartier</p>
                </div>
              </div>
            )}
          </div>

          {/* Garantie Brumerie */}
          <div className="bg-slate-900 rounded-lg px-5 py-4 flex items-start gap-3">
            <span className="text-xl flex-shrink-0">🛡️</span>
            <div>
              <p className="text-xs font-medium text-white mb-1">Protection acheteur Brumerie</p>
              <p className="text-[10px] text-slate-400 leading-snug">
                Problème avec ta commande ? Notre équipe intervient sur WhatsApp <span className="text-green-400 font-bold">+225 05 86 86 76 93</span>. Chaque vendeur est soumis à nos règles d'utilisation.
              </p>
            </div>
          </div>
        </div>

        {/* ── CARTE VENDEUR enrichie ── */}
        <button onClick={() => onSellerClick(product.sellerId)}
          className="w-full bg-slate-900 rounded-xl p-5 flex items-center gap-4 active:scale-95 transition-all shadow-sm mb-6">
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 border-2 border-white/20 shrink-0">
            {product.sellerPhoto
              ? <img src={product.sellerPhoto} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center bg-green-500 text-white text-xl font-semibold">{product.sellerName?.charAt(0).toUpperCase()}</div>
            }
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-white text-sm truncate">{product.sellerName}</span>
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
            <p className="text-xs text-gray-500 font-medium">Voir le vendeur →</p>
          </div>
        </button>


        {/* ── COMMENTAIRES ── */}
        <div id="comments-section" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-slate-900 text-sm">
              Commentaires {comments.length > 0 && <span className="text-slate-400 font-bold">({comments.length})</span>}
            </p>
            {comments.length > 3 && (
              <button
                onClick={() => setShowAllComments(v => !v)}
                className="text-xs font-medium text-green-600"
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
                  : <div className="w-full h-full flex items-center justify-center text-slate-500 font-semibold text-sm">{userProfile?.name?.charAt(0)}</div>
                }
              </div>
              {/* ── Dropdown mentions @utilisateur ── */}
              {mentionResults.length > 0 && (
                <div className="mb-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  {mentionResults.map(user => (
                    <button key={user.id}
                      onClick={() => {
                        // Remplacer @query par @nom dans le texte
                        const before = commentText.slice(0, mentionStart);
                        const after = commentText.slice(mentionStart + 1 + mentionQuery.length);
                        setCommentText(before + '@' + user.name + ' ' + after);
                        setMentionResults([]);
                        setMentionStart(-1);
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-slate-50 active:bg-slate-100 transition-all border-b border-slate-50 last:border-none"
                    >
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                        {user.photoURL
                          ? <img src={user.photoURL} alt="" className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center text-slate-500 font-semibold text-xs">{user.name?.charAt(0)?.toUpperCase()}</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-[12px] truncate">{user.name}</p>
                        {user.neighborhood && <p className="text-[10px] text-slate-400 truncate">{user.neighborhood}</p>}
                      </div>
                      {(user.isVerified || user.isPremium) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          <polyline points="9,12 11,14 15,10"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 bg-slate-50 rounded-lg border-2 border-transparent focus-within:border-green-400 transition-all overflow-hidden">
                {/* Preview photo sélectionnée */}
                {commentPhotoPreview && (
                  <div className="relative mx-3 mt-3">
                    <img src={commentPhotoPreview} alt="" className="w-24 h-24 object-cover rounded-lg border border-slate-200"/>
                    <button
                      onClick={() => { setCommentPhoto(null); setCommentPhotoPreview(null); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-semibold shadow-md active:scale-95 transition-all"
                    >✕</button>
                  </div>
                )}
                <textarea
                  value={commentText}
                  onChange={e => {
                    const val = e.target.value;
                    setCommentText(val);
                    // Détecter @ pour les mentions
                    const cursor = e.target.selectionStart || 0;
                    const before = val.slice(0, cursor);
                    const atIdx = before.lastIndexOf('@');
                    if (atIdx >= 0 && !before.slice(atIdx + 1).includes(' ') && before.slice(atIdx + 1).length >= 1) {
                      const q = before.slice(atIdx + 1);
                      setMentionStart(atIdx);
                      setMentionQuery(q);
                      setMentionLoading(true);
                      searchAllUsers(q, 5)
                        .then(setMentionResults)
                        .catch(() => {})
                        .finally(() => setMentionLoading(false));
                    } else {
                      setMentionResults([]);
                      setMentionStart(-1);
                    }
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  placeholder={commentPhoto ? "Ajouter un texte... (optionnel)" : "Ajouter un commentaire... (@ pour mentionner)"}
                  rows={commentText.length > 60 ? 3 : 1}
                  className="w-full px-4 pt-3 pb-1 bg-transparent text-[13px] font-medium text-slate-700 placeholder:text-slate-400 outline-none resize-none"
                />
                {(commentText.trim() || commentPhoto) && (
                  <div className="flex items-center justify-between px-3 pb-2">
                    {/* Bouton ajouter photo */}
                    <label className="cursor-pointer active:scale-95 transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setCommentPhoto(file);
                          const reader = new FileReader();
                          reader.onload = () => setCommentPhotoPreview(reader.result as string);
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                      <div className="w-7 h-7 rounded-xl bg-slate-200 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                        </svg>
                      </div>
                    </label>
                    <button
                      onClick={handleAddComment}
                      disabled={sendingComment || uploadingCommentPhoto || (!commentText.trim() && !commentPhoto)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5"
                    >
                      {sendingComment || uploadingCommentPhoto
                        ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        : <>Publier</>
                      }
                    </button>
                  </div>
                )}
                {/* Bouton photo visible même si pas encore de texte */}
                {!commentText.trim() && !commentPhoto && (
                  <div className="flex items-center px-3 pb-2 pt-1">
                    <label className="cursor-pointer active:scale-95 transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setCommentPhoto(file);
                          const reader = new FileReader();
                          reader.onload = () => setCommentPhotoPreview(reader.result as string);
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                        </svg>
                        Photo
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {isGuest && (
            <button
              onClick={() => onGuestAction?.('comment')}
              className="w-full py-4 rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 text-[12px] font-bold mb-4 active:scale-95 transition-all"
            >
              Connecte-toi pour commenter
            </button>
          )}

          {/* Liste des commentaires */}
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-3">
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
                    <div className={`${isReply ? 'w-7 h-7' : 'w-8 h-8'} rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 mt-0.5 cursor-pointer active:scale-95 transition-all`}
                      onClick={() => c.userId && onSellerClick(c.userId)}>
                      {c.userPhoto
                        ? <img src={c.userPhoto} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center text-slate-500 font-semibold text-[10px]">{c.userName?.charAt(0).toUpperCase()}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`${isReply ? 'bg-green-50 border border-green-100' : 'bg-slate-50'} rounded-lg rounded-tl-sm px-3 py-2.5`}>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="font-semibold text-slate-900 text-[11px] cursor-pointer active:text-green-700 transition-colors"
                            onClick={() => c.userId && onSellerClick(c.userId)}>{c.userName}</span>
                          {c.userVerified && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                              <polyline points="9,12 11,14 15,10"/>
                            </svg>
                          )}
                          {isReply && <span className="text-[9px] text-green-600 font-bold bg-green-100 px-1.5 py-0.5 rounded-full">réponse</span>}
                        </div>
                        {c.text && c.text !== '📷' && (
                          <p className="text-[13px] text-slate-700 leading-snug">{c.text}</p>
                        )}
                        {c.photoUrl && (
                          <div className="mt-2">
                            <img
                              src={c.photoUrl}
                              alt="photo commentaire"
                              className="max-w-[220px] rounded-lg border border-slate-200 cursor-pointer active:opacity-80 transition-opacity"
                              onClick={() => window.open(c.photoUrl, '_blank')}
                            />
                          </div>
                        )}
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
                            className="text-xs font-medium text-slate-400 hover:text-green-600 transition-colors"
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
                              : <div className="w-full h-full flex items-center justify-center text-slate-500 font-semibold text-[8px]">{userProfile?.name?.charAt(0)}</div>
                            }
                          </div>
                          <div className="flex-1 bg-white border-2 border-green-300 rounded-lg overflow-hidden">
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
                                  className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-medium disabled:opacity-50 active:scale-[0.98] transition-all"
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
            <p className="font-semibold text-slate-900 text-sm mb-4">Articles similaires</p>
            <div className="grid grid-cols-2 gap-3">
              {similarProducts.slice(0, 4).map(p => (
                <div key={p.id} className="active:scale-95 transition-transform">
                  <ProductCard
                    product={p}
                    onClick={() => onProductClick?.(p)}
                    onAddToCart={(prod) => addToCart(prod)}
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
          className="w-full py-3 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Signaler ce vendeur
        </button>
      </div>

      {/* ── FOOTER FIXE ── */}
      {chatLimitError && (
        <div className="fixed bottom-24 left-4 right-4 bg-amber-50 border border-amber-200 rounded-lg p-4 z-40 shadow-sm">
          <p className="text-[11px] font-bold text-amber-700">⚠️ {chatLimitError}</p>
          <button onClick={() => setChatLimitError('')} className="absolute top-2 right-3 text-amber-400 font-semibold text-sm">×</button>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-50 p-4">
        {product.status === 'sold' ? (
          <div className="w-full py-5 rounded-lg bg-slate-100 text-slate-300 font-medium text-sm flex items-center justify-center">VENDU</div>
        ) : isSelf ? (
          <div className="flex gap-2">
            <button onClick={() => onBack()}
              className="flex-1 py-4 rounded-lg border-2 border-slate-200 text-slate-600 font-medium text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Modifier
            </button>
            <button onClick={() => setShowBoost(true)}
              className="flex-1 py-4 rounded-lg bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Boost
            </button>
            <button onClick={() => setShowOwnerMenu(true)}
              className="w-12 py-4 rounded-lg bg-slate-100 flex items-center justify-center active:scale-95 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
          </div>
        ) : (
          <>
          <div className="flex gap-3">
            {!isGuest && currentUser?.uid !== product.sellerId && (
              <button onClick={() => setShowOfferModal(true)}
                className="flex-1 py-5 rounded-lg font-medium text-sm border-2 border-slate-200 text-slate-700 bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                💰 Offre
              </button>
            )}
            <button onClick={() => {
                if (isGuest) { onGuestAction?.('cart'); return; }
                addToCart(product);
                setAddedToCart(true);
                setTimeout(() => setAddedToCart(false), 2500);
              }}
              className={`flex-1 py-5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                addedToCart ? 'bg-green-500 text-white shadow-sm' : 'bg-orange-500 text-white shadow-sm'
              }`}>
              {addedToCart ? (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Ajouté !</>
              ) : (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg> Panier</>
              )}
            </button>
            <button onClick={() => { if (isGuest) { onGuestAction?.('contact'); return; } onBuyClick?.(product); }}
              className="flex-[2] py-5 rounded-lg bg-emerald-600 font-medium text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
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
              className="mt-3 w-full py-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 active:scale-95 transition-all border-2 border-green-200 text-green-700 bg-green-50">
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
          <div className="bg-white rounded-xl w-full max-w-md p-8" style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"/>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                <img src={product.images?.[0]} alt="" className="w-full h-full object-cover"/>
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm truncate">{product.title}</p>
                <p className="text-green-600 font-semibold">{product.price.toLocaleString('fr-FR')} FCFA</p>
                <p className="text-[10px] text-slate-400 font-bold">Prix demandé par le vendeur</p>
              </div>
            </div>
            <p className="font-semibold text-slate-900 text-lg uppercase tracking-tight mb-1">Faire une offre</p>
            <p className="text-slate-400 text-[11px] mb-5">Proposez votre prix — le vendeur pourra accepter ou refuser.</p>
            <div className="relative mb-5">
              <input
                type="number"
                value={offerInput}
                onChange={e => setOfferInput(e.target.value)}
                placeholder={`Ex: ${Math.round(product.price * 0.85).toLocaleString('fr-FR')}`}
                className="w-full bg-slate-50 rounded-lg px-5 py-4 text-[18px] font-semibold border-2 border-transparent focus:border-green-400 focus:bg-white outline-none transition-all"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 font-semibold text-slate-400 text-sm">FCFA</span>
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
                className="flex-1 py-4 rounded-lg bg-slate-100 text-slate-700 font-medium text-sm">Annuler</button>
              <button
                onClick={handleSendOffer}
                disabled={!offerInput || parseInt(offerInput) <= 0 || sendingOffer}
                className="flex-[2] py-4 rounded-lg bg-emerald-600 text-white font-medium text-sm disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                {sendingOffer ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : '💰 Envoyer l\'offre'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── MENU ACTIONS PROPRIETAIRE ── */}
      {showOwnerMenu && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowOwnerMenu(false)} />
          <div className="relative w-full bg-white rounded-t-[2rem] p-5 pb-8 animate-slide-up">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5"/>
            <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Gérer mon article</h3>
            <div className="space-y-2">
              <button onClick={() => { setShowOwnerMenu(false); onBack(); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-lg bg-slate-50 active:bg-slate-100 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-800">Modifier l'annonce</p>
                  <p className="text-[9px] text-slate-400">Changer titre, prix, photos...</p>
                </div>
              </button>

              <button onClick={async () => {
                  setShowOwnerMenu(false);
                  setMarkingSold(true);
                  try {
                    await updateProductStatus(product.id, 'sold');
                    onBack();
                  } catch {} finally { setMarkingSold(false); }
                }}
                disabled={markingSold}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-lg bg-slate-50 active:bg-slate-100 transition-all">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-800">{markingSold ? 'En cours...' : 'Marquer comme vendu'}</p>
                  <p className="text-[9px] text-slate-400">L'article ne sera plus visible</p>
                </div>
              </button>

              <button onClick={() => setShowBoost(true)}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-lg bg-slate-50 active:bg-slate-100 transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-800">Booster l'article</p>
                  <p className="text-[9px] text-slate-400">Plus de visibilité pendant 7 jours</p>
                </div>
              </button>

              <button onClick={() => { setShowOwnerMenu(false); setShowDeleteConfirm(true); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-lg bg-red-50 active:bg-red-100 transition-all">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-red-600">Supprimer l'annonce</p>
                  <p className="text-[9px] text-red-400">Action irréversible</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMATION SUPPRESSION ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center px-6" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-[340px] shadow-sm">
            <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-slate-900 text-center mb-2">Supprimer cette annonce ?</h3>
            <p className="text-[11px] text-slate-500 text-center mb-1 font-bold">"{product.title}"</p>
            <p className="text-[10px] text-slate-400 text-center mb-6">Cette action est irréversible. L'annonce sera définitivement supprimée.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3.5 rounded-lg border-2 border-slate-200 text-slate-600 font-medium text-sm active:scale-95 transition-all">
                Annuler
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deleteProduct(product.id, product.sellerId);
                    setShowDeleteConfirm(false);
                    onBack();
                  } catch (e: any) {
                    alert('Erreur: ' + (e.message || 'Impossible de supprimer'));
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="flex-1 py-3.5 rounded-lg bg-red-500 text-white font-medium text-sm active:scale-95 transition-all disabled:opacity-50">
                {deleting ? 'Suppression...' : 'Supprimer'}
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