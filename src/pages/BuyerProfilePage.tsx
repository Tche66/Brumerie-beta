// src/pages/BuyerProfilePage.tsx — v21 · Design premium Brumerie
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProductCard } from '@/components/ProductCard';
import { removeBookmark } from '@/services/bookmarkService';
import { getProducts } from '@/services/productService';
import { subscribeOrdersAsBuyer } from '@/services/orderService';
import { Product, Order } from '@/types';
import { AWAddressPicker } from '@/components/AWAddressPicker';
import { updateUserProfile } from '@/services/userService';
import {
  removeFromWishlist, toggleWishlistPublic, buildWishlistLink,
  unfollowSeller, getRedeemablePoints,
  CASHBACK_RATE, CASHBACK_REDEEM, CASHBACK_VALUE,
  formatLastSeen,
} from '@/services/shopFeaturesService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface BuyerProfilePageProps {
  onProductClick: (product: Product) => void;
  onNavigate?: (page: string) => void;
  onOpenOrder?: (orderId: string) => void;
  onSellerClick?: (sellerId: string) => void;
}

type Tab = 'favorites' | 'purchases' | 'wishlist' | 'following' | 'cashback';

const GREEN = '#2d5a27';

function fmtDate(ts: any): string {
  if (!ts) return '';
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  delivered:     { label: '✅ Livré',         color: '#16A34A', bg: '#F0FDF4' },
  cod_delivered: { label: '✅ Livré',         color: '#16A34A', bg: '#F0FDF4' },
  cancelled:     { label: '✕ Annulé',        color: '#EF4444', bg: '#FEF2F2' },
  confirmed:     { label: '💳 Confirmé',     color: '#3B82F6', bg: '#EFF6FF' },
  cod_confirmed: { label: '🛵 En livraison', color: '#8B5CF6', bg: '#F5F3FF' },
  ready:         { label: '📦 Prêt',         color: '#D97706', bg: '#FFFBEB' },
  picked:        { label: '🛵 En route',     color: '#8B5CF6', bg: '#F5F3FF' },
  initiated:     { label: '⏳ En attente',   color: '#94A3B8', bg: '#F8FAFC' },
  proof_sent:    { label: '📸 Preuve',       color: '#3B82F6', bg: '#EFF6FF' },
  cod_pending:   { label: '⏳ En attente',   color: '#94A3B8', bg: '#F8FAFC' },
};

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="text-center py-14 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <span className="text-4xl block mb-3">{icon}</span>
      <p className="font-black text-slate-500 text-[13px]">{title}</p>
      <p className="text-[10px] text-slate-300 mt-2 px-6 leading-relaxed">{sub}</p>
    </div>
  );
}

export function BuyerProfilePage({ onProductClick, onNavigate, onOpenOrder, onSellerClick }: BuyerProfilePageProps) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('favorites');

  // Favoris
  const [bookmarkedProducts, setBookmarkedProducts] = useState<Product[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [loadingFavs, setLoadingFavs] = useState(true);

  // Achats
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Wishlist
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [wishlistPublic, setWishlistPublic] = useState(false);
  const [wishlistLink, setWishlistLink] = useState('');
  const [wishlistCopied, setWishlistCopied] = useState(false);

  // Vendeurs suivis
  const [followedSellers, setFollowedSellers] = useState<any[]>([]);

  // Cashback
  const pts = (userProfile as any)?.loyaltyPoints || 0;
  const { redeemable, discount: cashbackDiscount } = getRedeemablePoints(pts);

  // ── Chargements ────────────────────────────────────────────────
  useEffect(() => { loadBookmarks(); }, [userProfile?.bookmarkedProductIds]);

  useEffect(() => {
    if (!currentUser) return;
    return subscribeOrdersAsBuyer(currentUser.uid, (ords) => {
      setOrders(ords); setLoadingOrders(false);
    });
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!userProfile) return;
    const ids: string[] = (userProfile as any).wishlistIds || [];
    setWishlistPublic((userProfile as any).wishlistPublic || false);
    const slug = (userProfile as any).wishlistSlug;
    if (slug) setWishlistLink(buildWishlistLink(slug));
    if (!ids.length) { setWishlistProducts([]); return; }
    Promise.all(ids.map(id =>
      getDoc(doc(db, 'products', id)).then(d => d.exists() ? { id: d.id, ...d.data() } as Product : null)
    )).then(list => setWishlistProducts(list.filter(Boolean) as Product[])).catch(() => {});
  }, [JSON.stringify((userProfile as any)?.wishlistIds), (userProfile as any)?.wishlistSlug]);

  useEffect(() => {
    if (!userProfile) return;
    const ids: string[] = (userProfile as any).followingSellers || [];
    if (!ids.length) { setFollowedSellers([]); return; }
    Promise.all(ids.map(id =>
      getDoc(doc(db, 'users', id)).then(d => d.exists() ? { id: d.id, ...d.data() } : null)
    )).then(list => setFollowedSellers(list.filter(Boolean) as any[])).catch(() => {});
  }, [JSON.stringify((userProfile as any)?.followingSellers)]);

  async function loadBookmarks() {
    setLoadingFavs(true);
    try {
      const ids = userProfile?.bookmarkedProductIds || [];
      setBookmarkIds(new Set(ids));
      if (ids.length) {
        const all = await getProducts();
        setBookmarkedProducts(all.filter(p => ids.includes(p.id)));
      } else { setBookmarkedProducts([]); }
    } catch {}
    finally { setLoadingFavs(false); }
  }

  if (!userProfile) return null;

  const completedOrders = orders.filter(o => ['delivered','cod_delivered'].includes(o.status));
  const activeOrders    = orders.filter(o => !['delivered','cod_delivered','cancelled'].includes(o.status));

  const memberSince = (() => {
    try {
      const d = (userProfile as any).createdAt?.toDate
        ? (userProfile as any).createdAt.toDate()
        : new Date((userProfile as any).createdAt);
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch { return ''; }
  })();

  const TABS: { id: Tab; emoji: string; label: string; count: number }[] = [
    { id: 'favorites', emoji: '❤️',  label: 'Favoris',  count: bookmarkIds.size },
    { id: 'purchases', emoji: '🛍️', label: 'Achats',   count: orders.length },
    { id: 'wishlist',  emoji: '✨',  label: 'Wishlist', count: wishlistProducts.length },
    { id: 'following', emoji: '🔔',  label: 'Je suis',  count: ((userProfile as any).followingSellers || []).length },
    { id: 'cashback',  emoji: '🎁',  label: 'Points',   count: pts },
  ];

  return (
    <div className="min-h-screen pb-28" style={{ background: '#F5F7FA', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(155deg, #1a3d17 0%, #2d5a27 40%, #4a8a42 75%, #d4e8d0 100%)' }}/>
        {/* Décorations */}
        <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }}/>
        <div className="absolute top-24 -left-10 w-32 h-32 rounded-full"
          style={{ background: 'rgba(200,150,42,0.12)' }}/>
        <div className="absolute bottom-0 right-8 w-20 h-20 rounded-full"
          style={{ background: 'rgba(255,255,255,0.04)' }}/>

        <div className="relative px-5 pt-14 pb-7">
          {/* Bouton paramètres */}
          <button onClick={() => onNavigate?.('settings')}
            className="absolute top-[3.5rem] right-5 w-9 h-9 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>

          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-[72px] h-[72px] rounded-[1.4rem] overflow-hidden shadow-2xl"
                style={{ border: '3px solid rgba(255,255,255,0.35)' }}>
                <img
                  src={userProfile.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name || 'U')}&background=2d5a27&color=ffffff&bold=true`}
                  alt="" className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-white rounded-full px-2 py-0.5 shadow-lg whitespace-nowrap">
                <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: GREEN }}>Acheteur</span>
              </div>
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-white font-black text-[19px] tracking-tight leading-tight truncate uppercase">
                {userProfile.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {(userProfile as any).neighborhood && (
                  <span className="text-white/65 text-[10px] font-bold flex items-center gap-1">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="rgba(255,255,255,0.65)"><path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>
                    {(userProfile as any).neighborhood}
                  </span>
                )}
                {memberSince && (
                  <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">
                    · Depuis {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              { val: bookmarkIds.size,       label: 'Favoris',  icon: '❤️' },
              { val: activeOrders.length,    label: 'En cours', icon: '⏳' },
              { val: completedOrders.length, label: 'Achetés',  icon: '✅' },
            ].map(s => (
              <div key={s.label}
                className="rounded-2xl p-3 text-center flex flex-col items-center gap-0.5"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
                <span className="text-base leading-none">{s.icon}</span>
                <p className="text-white font-black text-[20px] leading-none">{s.val}</p>
                <p className="text-white/55 text-[8px] font-bold uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ ONGLETS ══════════════════════════════════════════════ */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-shrink-0 flex flex-col items-center gap-0.5 px-4 pt-3 pb-2.5 transition-all relative min-w-[60px]">
              {tab === t.id && (
                <div className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-full" style={{ background: GREEN }}/>
              )}
              <span className="text-[18px] leading-none">{t.emoji}</span>
              <span className="text-[8px] font-black uppercase tracking-widest"
                style={{ color: tab === t.id ? GREEN : '#94A3B8' }}>
                {t.label}
              </span>
              {t.count > 0 && (
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full"
                  style={{
                    background: tab === t.id ? `${GREEN}18` : '#F1F5F9',
                    color:      tab === t.id ? GREEN : '#94A3B8',
                  }}>
                  {t.count > 99 ? '99+' : t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══ CONTENU ONGLETS ══════════════════════════════════════ */}
      <div className="px-4 pt-4 space-y-3">

        {/* ─── FAVORIS ────────────────────────────────────────────── */}
        {tab === 'favorites' && (
          loadingFavs ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-slate-100 rounded-3xl animate-pulse"/>)}
            </div>
          ) : bookmarkedProducts.length === 0 ? (
            <EmptyState icon="🔖" title="Aucun favori"
              sub="Appuie sur le signet sur une annonce pour l'enregistrer ici"/>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {bookmarkedProducts.map(p => (
                <ProductCard key={p.id} product={p} onClick={() => onProductClick(p)}
                  onBookmark={async (id) => {
                    if (!currentUser) return;
                    await removeBookmark(currentUser.uid, id);
                    await refreshUserProfile();
                  }} isBookmarked/>
              ))}
            </div>
          )
        )}

        {/* ─── ACHATS ──────────────────────────────────────────────── */}
        {tab === 'purchases' && (
          loadingOrders ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse"/>)}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState icon="🛍️" title="Aucun achat" sub="Tes commandes apparaîtront ici"/>
          ) : (
            <div className="space-y-2.5">
              {orders.map(order => {
                const s = STATUS_MAP[order.status] || { label: order.status, color: '#94A3B8', bg: '#F8FAFC' };
                return (
                  <button key={order.id}
                    onClick={() => onOpenOrder ? onOpenOrder(order.id) : onNavigate?.('orders')}
                    className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-sm active:scale-[0.98] transition-all text-left flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                      {(order as any).productImage
                        ? <img src={(order as any).productImage} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-[12px] truncate">{order.productTitle}</p>
                      <p className="text-[10px] text-slate-500 truncate">{order.sellerName}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="font-black text-[13px]" style={{ color: GREEN }}>
                          {(order.productPrice || 0).toLocaleString('fr-FR')}
                          <span className="text-[9px] text-slate-400 font-bold ml-0.5">FCFA</span>
                        </p>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full"
                          style={{ color: s.color, background: s.bg }}>{s.label}</span>
                      </div>
                      <p className="text-[9px] text-slate-300 font-bold mt-0.5">{fmtDate(order.createdAt)}</p>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* ─── WISHLIST ────────────────────────────────────────────── */}
        {tab === 'wishlist' && (
          <>
            {/* Header partage */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-black text-slate-900 text-[14px]">✨ Ma Wishlist</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{wishlistProducts.length} article{wishlistProducts.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[9px] text-slate-400 font-bold">Publique</p>
                  <button
                    onClick={async () => {
                      if (!currentUser) return;
                      const next = !wishlistPublic;
                      setWishlistPublic(next);
                      await toggleWishlistPublic(currentUser.uid, next).catch(() => {});
                      await refreshUserProfile();
                    }}
                    className="w-10 h-6 rounded-full transition-all relative flex-shrink-0"
                    style={{ background: wishlistPublic ? GREEN : '#E2E8F0' }}>
                    <div className="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all"
                      style={{ left: wishlistPublic ? '1.125rem' : '0.125rem' }}/>
                  </button>
                </div>
              </div>
              {wishlistPublic && wishlistLink && (
                <div className="mt-2 rounded-xl p-2.5 flex items-center gap-2" style={{ background: `${GREEN}10` }}>
                  <p className="flex-1 text-[9px] font-bold truncate" style={{ color: GREEN }}>{wishlistLink}</p>
                  <button
                    onClick={async () => {
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: 'Ma Wishlist Brumerie', url: wishlistLink });
                        } else {
                          await navigator.clipboard.writeText(wishlistLink);
                          setWishlistCopied(true);
                          setTimeout(() => setWishlistCopied(false), 2000);
                        }
                      } catch {}
                    }}
                    className="px-3 py-1.5 rounded-xl font-black text-[9px] uppercase text-white active:scale-95 flex-shrink-0"
                    style={{ background: GREEN }}>
                    {wishlistCopied ? '✓ Copié' : '📤 Partager'}
                  </button>
                </div>
              )}
            </div>

            {wishlistProducts.length === 0 ? (
              <EmptyState icon="✨" title="Wishlist vide"
                sub="Appuie sur ☆ depuis une fiche produit pour l'ajouter ici"/>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {wishlistProducts.map(p => (
                  <div key={p.id} className="relative">
                    <ProductCard product={p} onClick={() => onProductClick(p)}
                      bookmarkedIds={new Set((userProfile as any)?.wishlistIds || [])}/>
                    <button
                      onClick={async () => {
                        if (!currentUser) return;
                        await removeFromWishlist(currentUser.uid, p.id);
                        setWishlistProducts(prev => prev.filter(x => x.id !== p.id));
                        await refreshUserProfile();
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center text-red-400 font-black text-[13px] active:scale-90 z-10">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── VENDEURS SUIVIS ─────────────────────────────────────── */}
        {tab === 'following' && (
          followedSellers.length === 0 ? (
            <EmptyState icon="🔔" title="Aucun vendeur suivi"
              sub="Depuis une fiche produit, clique 🔕 pour suivre un vendeur et être notifié de ses nouvelles publications"/>
          ) : (
            <div className="space-y-2.5">
              {followedSellers.map((seller: any) => (
                <div key={seller.id}
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 active:bg-slate-50 transition-all cursor-pointer"
                  onClick={() => onSellerClick?.(seller.id)}>
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                    {(seller.deliveryPhotoURL || seller.photoURL)
                      ? <img src={seller.deliveryPhotoURL || seller.photoURL} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center font-black text-white text-xl"
                          style={{ background: GREEN }}>{(seller.name || '?').charAt(0).toUpperCase()}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-black text-slate-900 text-[13px] truncate">{seller.name}</p>
                      {seller.isVerified && <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0">🔵</span>}
                      {seller.isPremium  && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex-shrink-0">⭐</span>}
                    </div>
                    {seller.shopSlogan && (
                      <p className="text-[10px] text-slate-400 truncate italic mt-0.5">"{seller.shopSlogan}"</p>
                    )}
                    <p className="text-[9px] text-slate-300 mt-0.5">{formatLastSeen(seller.lastActiveAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!currentUser) return;
                        await unfollowSeller(currentUser.uid, seller.id);
                        setFollowedSellers(prev => prev.filter((s: any) => s.id !== seller.id));
                        await refreshUserProfile();
                      }}
                      className="text-[8px] font-black text-red-400 bg-red-50 px-2 py-1 rounded-xl active:scale-95 transition-all">
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ─── CASHBACK / POINTS ───────────────────────────────────── */}
        {tab === 'cashback' && (
          <>
            {/* Carte points */}
            <div className="rounded-3xl p-6 text-white overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #1a3d17, #2d5a27, #4a8a42)' }}>
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}/>
              <div className="absolute bottom-2 left-2 w-16 h-16 rounded-full" style={{ background: 'rgba(200,150,42,0.15)' }}/>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-3">🎁 Fidélité Brumerie</p>
              <p className="font-black leading-none mb-1" style={{ fontSize: '3rem' }}>{pts.toLocaleString('fr-FR')}</p>
              <p className="text-white/60 font-bold text-[11px]">points accumulés</p>
              {redeemable > 0 && (
                <div className="mt-4 rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <p className="font-black text-[13px]">🎉 {redeemable} pts utilisables</p>
                  <p className="text-white/65 text-[10px] mt-0.5">= {cashbackDiscount.toLocaleString('fr-FR')} FCFA de réduction sur ton prochain achat</p>
                </div>
              )}
            </div>

            {/* Comment ça marche */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-widest mb-4" style={{ color: GREEN }}>Comment ça marche</p>
              {[
                { icon: '🛍️', title: 'Achète sur Brumerie',  sub: `Chaque ${CASHBACK_RATE} FCFA d'achat = 1 point` },
                { icon: '📈', title: 'Accumule tes points',   sub: `${CASHBACK_REDEEM} pts = ${CASHBACK_VALUE.toLocaleString('fr-FR')} FCFA de réduction` },
                { icon: '💳', title: 'Utilise ta réduction',  sub: 'Applique ton bon au moment du paiement suivant' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: `${GREEN}12` }}>
                    {step.icon}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-[12px]">{step.title}</p>
                    <p className="text-[10px] text-slate-400">{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Historique */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: GREEN }}>
                Derniers points gagnés
              </p>
              {orders.filter(o => ['delivered','cod_delivered'].includes(o.status)).length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4">
                  Tes points s'accumuleront ici après chaque achat livré
                </p>
              ) : (
                orders.filter(o => ['delivered','cod_delivered'].includes(o.status)).slice(0, 5).map(o => {
                  const earned = Math.floor(((o as any).totalAmount || 0) / CASHBACK_RATE);
                  return (
                    <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        {(o as any).productImage
                          ? <img src={(o as any).productImage} alt="" className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center text-sm">📦</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-700 text-[11px] truncate">{o.productTitle}</p>
                        <p className="text-[9px] text-slate-400">
                          {((o as any).totalAmount || 0).toLocaleString('fr-FR')} FCFA · {fmtDate(o.createdAt)}
                        </p>
                      </div>
                      <span className="font-black text-[12px]" style={{ color: GREEN }}>+{earned} pts</span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ══ ADRESSE ADDRESSWEB — visible sur tous les onglets ══════ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <AWAddressPicker
            value={(userProfile as any).awAddressCode || ''}
            onChange={async (code) => {
              if (currentUser && code) {
                await updateUserProfile(currentUser.uid, { awAddressCode: code });
                await refreshUserProfile();
              }
            }}
            onSaveToProfile={async (code) => {
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

        {/* ══ ACTIONS BAS DE PAGE ════════════════════════════════════ */}
        <button onClick={() => onNavigate?.('edit-profile')}
          className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-white border border-slate-200 text-slate-700 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2">
          ✏️ Modifier mon profil
        </button>
        <button onClick={() => onNavigate?.('switch-to-seller')}
          className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${GREEN}, #4a8a42)` }}>
          🏪 Passer en mode Vendeur
        </button>
      </div>
    </div>
  );
}
