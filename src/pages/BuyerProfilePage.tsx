// src/pages/BuyerProfilePage.tsx — v20 : Favoris + Achats + Wishlist + Suivre vendeurs + Cashback
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProductCard } from '@/components/ProductCard';
import { removeBookmark } from '@/services/bookmarkService';
import { getProducts, subscribeSellerProducts } from '@/services/productService';
import { subscribeOrdersAsBuyer } from '@/services/orderService';
import { Product, Order } from '@/types';
import { AWAddress } from '@/services/awService';
import { AWAddressPicker } from '@/components/AWAddressPicker';
import { updateUserProfile } from '@/services/userService';
import {
  addToWishlist, removeFromWishlist, toggleWishlistPublic, buildWishlistLink,
  followSeller, unfollowSeller,
  getRedeemablePoints,
  CASHBACK_RATE, CASHBACK_REDEEM, CASHBACK_VALUE,
  formatLastSeen,
} from '@/services/shopFeaturesService';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface BuyerProfilePageProps {
  onProductClick: (product: Product) => void;
  onNavigate?: (page: string) => void;
  onOpenOrder?: (orderId: string) => void;
  onSellerClick?: (sellerId: string) => void;
}

type Tab = 'favorites' | 'purchases' | 'wishlist' | 'cashback' | 'following';

// Icône statut commande
function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    delivered:     { label: '✅ Reçu',       color: '#16A34A', bg: '#F0FDF4' },
    cod_delivered: { label: '✅ Reçu',       color: '#16A34A', bg: '#F0FDF4' },
    cancelled:     { label: '❌ Annulé',     color: '#EF4444', bg: '#FEF2F2' },
    disputed:      { label: '⚠️ Litige',     color: '#D97706', bg: '#FFFBEB' },
    confirmed:     { label: '💰 Confirmé',   color: '#3B82F6', bg: '#EFF6FF' },
    cod_confirmed: { label: '🛵 En livraison', color: '#8B5CF6', bg: '#F5F3FF' },
    ready:         { label: '📦 Prêt',       color: '#D97706', bg: '#FFFBEB' },
    picked:        { label: '🛵 En route',   color: '#8B5CF6', bg: '#F5F3FF' },
    initiated:     { label: '⏳ En attente', color: '#94A3B8', bg: '#F8FAFC' },
    proof_sent:    { label: '📸 Preuve envoyée', color: '#3B82F6', bg: '#EFF6FF' },
    cod_pending:   { label: '⏳ En attente', color: '#94A3B8', bg: '#F8FAFC' },
  };
  const s = map[status] || { label: status, color: '#94A3B8', bg: '#F8FAFC' };
  return (
    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function fmtDate(ts: any): string {
  if (!ts) return '';
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

export function BuyerProfilePage({ onProductClick, onNavigate, onOpenOrder, onSellerClick }: BuyerProfilePageProps) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('favorites');

  // — Favoris —
  const [bookmarkedProducts, setBookmarkedProducts] = useState<Product[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [loadingFavs, setLoadingFavs] = useState(true);

  // — Commandes achetées —
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // — Wishlist —
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [wishlistPublic, setWishlistPublic]     = useState<boolean>(userProfile?.wishlistPublic || false);
  const [wishlistLink, setWishlistLink]         = useState('');
  const [wishlistCopied, setWishlistCopied]     = useState(false);

  // — Vendeurs suivis —
  const [followingSellers, setFollowingSellers] = useState<string[]>(userProfile?.followingSellers || []);
  const [followedSellersData, setFollowedSellersData] = useState<any[]>([]);

  // — Cashback —
  const pts = userProfile?.loyaltyPoints || 0;
  const { redeemable, discount: cashbackDiscount } = getRedeemablePoints(pts);

  useEffect(() => { loadBookmarks(); }, [userProfile?.bookmarkedProductIds]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeOrdersAsBuyer(currentUser.uid, (ords) => {
      setOrders(ords);
      setLoadingOrders(false);
    });
    return unsub;
  }, [currentUser]);

  // — useEffect wishlist —
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    const ids: string[] = userProfile.wishlistIds || [];
    setWishlistPublic(userProfile.wishlistPublic || false);
    if (userProfile.wishlistSlug) setWishlistLink(buildWishlistLink(userProfile.wishlistSlug));
    if (!ids.length) { setWishlistProducts([]); return; }
    Promise.all(ids.map(id => getDoc(doc(db, 'products', id)).then(d => d.exists() ? { id: d.id, ...d.data() } as Product : null)))
      .then(list => setWishlistProducts(list.filter(Boolean) as Product[]))
      .catch(() => {});
  }, [currentUser?.uid, JSON.stringify(userProfile?.wishlistIds)]);

  // — useEffect vendeurs suivis —
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    const ids: string[] = userProfile.followingSellers || [];
    setFollowingSellers(ids);
    if (!ids.length) { setFollowedSellersData([]); return; }
    Promise.all(ids.map(id => getDoc(doc(db, 'users', id)).then(d => d.exists() ? { id: d.id, ...d.data() } : null)))
      .then(list => setFollowedSellersData(list.filter(Boolean) as any[]))
      .catch(() => {});
  }, [currentUser?.uid, JSON.stringify(userProfile?.followingSellers)]);

  async function loadBookmarks() {
    setLoadingFavs(true);
    try {
      const ids = userProfile?.bookmarkedProductIds || [];
      setBookmarkIds(new Set(ids));
      if (ids.length > 0) {
        const all = await getProducts();
        setBookmarkedProducts(all.filter(p => ids.includes(p.id)));
      } else {
        setBookmarkedProducts([]);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingFavs(false); }
  }

  const handleRemoveBookmark = async (id: string) => {
    if (!currentUser) return;
    await removeBookmark(currentUser.uid, id);
    await refreshUserProfile();
  };

  if (!userProfile) return null;

  const memberSince = (() => {
    try {
      const d = userProfile.createdAt?.toDate ? userProfile.createdAt.toDate() : new Date(userProfile.createdAt);
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch { return ''; }
  })();

  const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'cod_delivered');
  const activeOrders    = orders.filter(o => !['delivered', 'cod_delivered', 'cancelled'].includes(o.status));

  return (
    <div className="min-h-screen pb-24 font-sans" style={{ background: '#F8FAFC' }}>

      {/* Bouton Paramètres */}
      <button onClick={() => onNavigate?.('settings')} className="settings-gear-btn" title="Paramètres">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {/* Hero Acheteur */}
      <div className="px-6 pt-14 pb-6" style={{ background: 'linear-gradient(160deg,#EFF6FF 0%,#FFFFFF 100%)' }}>
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-[2.6rem] overflow-hidden border-[6px] border-white shadow-2xl">
              <img
                src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=EFF6FF&color=3B82F6`}
                alt={userProfile.name} className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 border-4 border-white rounded-full shadow-lg"
              style={{ width:26, height:26, background:'#3B82F6', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">{userProfile.name}</h1>
          <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest mb-2">
            Mode Acheteur
          </span>
          {memberSince && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Membre depuis {memberSince}</p>}
          {userProfile.neighborhood && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#94A3B8"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>
              {userProfile.neighborhood}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white rounded-2xl p-3 text-center border border-blue-100 shadow-sm">
            <p className="price-brumerie text-xl text-blue-600">{bookmarkIds.size}</p>
            <p className="text-[9px] font-bold uppercase text-slate-400">Favoris</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center border border-amber-100 shadow-sm">
            <p className="price-brumerie text-xl text-amber-600">{activeOrders.length}</p>
            <p className="text-[9px] font-bold uppercase text-slate-400">En cours</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center border border-green-100 shadow-sm">
            <p className="price-brumerie text-xl text-green-600">{completedOrders.length}</p>
            <p className="text-[9px] font-bold uppercase text-slate-400">Achetés</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-slate-100 bg-white sticky top-0 z-30 overflow-x-auto">
        {([
          { id: 'favorites'  as Tab, icon: '❤️',  label: 'Favoris',   count: bookmarkIds.size },
          { id: 'purchases'  as Tab, icon: '🛍️', label: 'Achats',    count: orders.length },
          { id: 'wishlist'   as Tab, icon: '✨',  label: 'Wishlist',  count: wishlistProducts.length },
          { id: 'following'  as Tab, icon: '👤',  label: 'Je suis',   count: followingSellers.length },
          { id: 'cashback'   as Tab, icon: '🎁',  label: 'Points',    count: pts },
        ] as { id: Tab; icon: string; label: string; count: number }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-4 py-3 text-[8px] font-black uppercase tracking-widest transition-all ${
              tab === t.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 border-b-2 border-transparent'
            }`}>
            <span className="text-[16px] leading-none">{t.icon}</span>
            <span>{t.label}</span>
            {t.count > 0 && (
              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
              }`}>{t.count > 99 ? '99+' : t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      <div className="px-4 mt-5">

        {/* ── FAVORIS ── */}
        {tab === 'favorites' && (
          loadingFavs ? (
            <div className="grid grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-slate-100 rounded-[2.5rem] animate-pulse" />)}
            </div>
          ) : bookmarkedProducts.length === 0 ? (
            <div className="text-center py-16 bg-blue-50/50 rounded-[2.5rem] border-2 border-dashed border-blue-100">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aucun favori</p>
              <p className="text-[9px] text-slate-300 mt-2 px-4">Appuie sur le signet d'une annonce pour l'enregistrer ici</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {bookmarkedProducts.map(product => (
                <ProductCard key={product.id} product={product}
                  onClick={() => onProductClick(product)}
                  onBookmark={handleRemoveBookmark}
                  isBookmarked={true}
                />
              ))}
            </div>
          )
        )}

        {/* ── MES ACHATS ── */}
        {tab === 'purchases' && (
          loadingOrders ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                </svg>
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aucun achat</p>
              <p className="text-[9px] text-slate-300 mt-2">Tes commandes passées apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <button key={order.id}
                  onClick={() => onOpenOrder ? onOpenOrder(order.id) : onNavigate?.('orders')}
                  className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-sm active:scale-[0.98] transition-all text-left flex items-center gap-3">
                  {/* Image produit */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                    {order.productImage
                      ? <img src={order.productImage} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                    }
                  </div>
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-[12px] truncate">{order.productTitle}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">{order.sellerName}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="price-brumerie text-[13px] text-slate-900">
                        {order.productPrice.toLocaleString('fr-FR')} <span className="text-[9px] font-bold text-slate-400">FCFA</span>
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-[9px] text-slate-300 font-bold mt-1">{fmtDate(order.createdAt)}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* Actions bas de page */}
      <div className="px-6 mt-8 mb-4 space-y-3">
        <button onClick={() => onNavigate?.('edit-profile')}
          className="btn-secondary-custom w-full py-4 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em]">
          Modifier mon profil
        </button>
        {/* ══ WISHLIST ══ */}
        {tab === 'wishlist' && (
          <div className="space-y-3">
            {/* Header partage */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-black text-slate-900 text-[14px]">✨ Ma Wishlist</p>
                  <p className="text-[10px] text-slate-400">{wishlistProducts.length} article{wishlistProducts.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[9px] text-slate-400 font-bold">Publique</p>
                  <button onClick={async () => {
                    if (!currentUser) return;
                    const next = !wishlistPublic;
                    setWishlistPublic(next);
                    await toggleWishlistPublic(currentUser.uid, next).catch(() => {});
                    await refreshUserProfile();
                    if (next && userProfile?.wishlistSlug) setWishlistLink(buildWishlistLink(userProfile.wishlistSlug));
                  }}
                    className={`w-10 h-6 rounded-full transition-all relative ${wishlistPublic ? 'bg-blue-500' : 'bg-slate-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all ${wishlistPublic ? 'left-4.5' : 'left-0.5'}`}/>
                  </button>
                </div>
              </div>
              {wishlistPublic && wishlistLink && (
                <div className="bg-blue-50 rounded-2xl p-3 flex items-center gap-2">
                  <p className="flex-1 text-[9px] text-blue-700 font-bold truncate">{wishlistLink}</p>
                  <button onClick={async () => {
                    try {
                      if (navigator.share) await navigator.share({ title: 'Ma Wishlist Brumerie', url: wishlistLink });
                      else { await navigator.clipboard.writeText(wishlistLink); setWishlistCopied(true); setTimeout(() => setWishlistCopied(false), 2000); }
                    } catch {}
                  }}
                    className="px-3 py-1.5 rounded-xl font-black text-[9px] uppercase text-white bg-blue-500 active:scale-95 flex-shrink-0">
                    {wishlistCopied ? '✓ Copié' : '📤 Partager'}
                  </button>
                </div>
              )}
            </div>
            {wishlistProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">✨</p>
                <p className="font-black text-slate-400 text-[13px]">Ta wishlist est vide</p>
                <p className="text-[11px] text-slate-400 mt-1">Ajoute des articles depuis les fiches produit</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {wishlistProducts.map(p => (
                  <div key={p.id} className="relative">
                    <ProductCard key={p.id} product={p} onClick={() => onProductClick(p)} isFavorited bookmarkedIds={new Set(userProfile?.wishlistIds || [])}/>
                    <button onClick={async () => {
                      if (currentUser) {
                        await removeFromWishlist(currentUser.uid, p.id);
                        setWishlistProducts(prev => prev.filter(x => x.id !== p.id));
                        await refreshUserProfile();
                      }
                    }}
                      className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-red-500 font-black text-sm active:scale-90 z-10">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ VENDEURS SUIVIS ══ */}
        {tab === 'following' && (
          <div className="space-y-3">
            {followedSellersData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">👤</p>
                <p className="font-black text-slate-400 text-[13px]">Tu ne suis encore aucun vendeur</p>
                <p className="text-[11px] text-slate-400 mt-1">Depuis une boutique, clique "Suivre" pour être notifié des nouveaux articles</p>
              </div>
            ) : (
              followedSellersData.map((seller: any) => {
                const lastSeen = formatLastSeen(seller.lastActiveAt);
                return (
                  <div key={seller.id} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 active:bg-slate-50 transition-all cursor-pointer"
                    onClick={() => onSellerClick?.(seller.id)}>
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                      {(seller.deliveryPhotoURL || seller.photoURL)
                        ? <img src={seller.deliveryPhotoURL || seller.photoURL} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-xl">{(seller.name || '?').charAt(0).toUpperCase()}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-[13px] truncate">{seller.name}</p>
                      {seller.shopSlogan && <p className="text-[10px] text-slate-500 truncate italic">"{seller.shopSlogan}"</p>}
                      <p className="text-[9px] text-slate-400 mt-0.5">{lastSeen}</p>
                    </div>
                    <button onClick={async () => {
                      if (!currentUser) return;
                      await unfollowSeller(currentUser.uid, seller.id);
                      setFollowingSellers(prev => prev.filter(id => id !== seller.id));
                      setFollowedSellersData(prev => prev.filter((s: any) => s.id !== seller.id));
                      await refreshUserProfile();
                    }}
                      className="text-[9px] font-black text-red-500 bg-red-50 px-3 py-1.5 rounded-xl active:scale-95 flex-shrink-0">
                      Ne plus suivre
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══ CASHBACK POINTS ══ */}
        {tab === 'cashback' && (
          <div className="space-y-3">
            {/* Solde points */}
            <div className="rounded-3xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#0F172A,#1E293B)' }}>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">🎁 Fidélité Brumerie</p>
              <p className="font-black leading-none mb-1" style={{ fontSize: '2.5rem' }}>{pts.toLocaleString('fr-FR')}</p>
              <p className="text-white/60 font-bold text-[11px]">points accumulés</p>
              {redeemable > 0 && (
                <div className="mt-4 bg-white/10 rounded-2xl p-3">
                  <p className="font-black text-[13px]">🎉 Tu peux utiliser {redeemable} pts</p>
                  <p className="text-white/70 text-[10px] mt-0.5">= {cashbackDiscount.toLocaleString('fr-FR')} FCFA de réduction sur ton prochain achat</p>
                </div>
              )}
            </div>

            {/* Comment ça marche */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Comment ça marche</p>
              {[
                { icon: '🛍️', title: 'Achète sur Brumerie', sub: `Chaque ${CASHBACK_RATE} FCFA d'achat = 1 point` },
                { icon: '📈', title: 'Accumule tes points', sub: `${CASHBACK_REDEEM} points = ${CASHBACK_VALUE.toLocaleString('fr-FR')} FCFA de réduction` },
                { icon: '💰', title: 'Utilise ta réduction', sub: 'Applique ton bon de réduction lors du prochain paiement' },
              ].map(step => (
                <div key={step.title} className="flex items-center gap-3">
                  <span className="text-2xl flex-shrink-0">{step.icon}</span>
                  <div>
                    <p className="font-black text-slate-800 text-[12px]">{step.title}</p>
                    <p className="text-[10px] text-slate-400">{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Historique points — les 5 dernières commandes livrées */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Derniers points gagnés</p>
              {orders.filter(o => ['delivered','cod_delivered'].includes(o.status)).slice(0,5).length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4">Aucun achat encore — tes points s'accumulent ici</p>
              ) : (
                orders.filter(o => ['delivered','cod_delivered'].includes(o.status)).slice(0,5).map(o => {
                  const pts_earned = Math.floor((o.totalAmount || 0) / CASHBACK_RATE);
                  return (
                    <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        {o.productImage ? <img src={o.productImage} alt="" className="w-full h-full object-cover"/> : <span className="text-sm flex items-center justify-center h-full">📦</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-700 text-[11px] truncate">{o.productTitle}</p>
                        <p className="text-[9px] text-slate-400">{(o.totalAmount || 0).toLocaleString('fr-FR')} FCFA</p>
                      </div>
                      <span className="font-black text-green-600 text-[12px]">+{pts_earned} pts</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Adresse Address-Web acheteur — inline ── */}
        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
          <AWAddressPicker
            value={userProfile?.awAddressCode || ''}
            onChange={async (code, addr) => {
              if (currentUser && code) {
                await updateUserProfile(currentUser.uid, { awAddressCode: code });
                await refreshUserProfile();
              }
            }}
            onSaveToProfile={async (code, addr) => {
              if (currentUser) {
                await updateUserProfile(currentUser.uid, { awAddressCode: code });
                await refreshUserProfile();
              }
            }}
            onRemoveFromProfile={async () => {
              if (currentUser) {
                await updateUserProfile(currentUser.uid, { awAddressCode: '' });
                await refreshUserProfile();
              }
            }}
            showSaveToProfile
            label="Mon adresse de livraison"
            placeholder="AW-ABJ-84321"
            firebaseUid={currentUser?.uid}
          />
        </div>
        <button onClick={() => onNavigate?.('switch-to-seller')}
          className="w-full py-4 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em] border-2 border-green-200 text-green-700 bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          Passer en mode Vendeur
        </button>
      </div>
    </div>
  );
}
