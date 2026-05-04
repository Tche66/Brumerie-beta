// src/pages/BuyerProfilePage.tsx — v22 · Design premium Brumerie · Vert exclusif · SVG pro
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

// ── Palette Brumerie — ZERO bleu ─────────────────────────────────
const G1  = '#1a3d17';   // vert très foncé
const G2  = '#2d5a27';   // vert principal
const G3  = '#4a8a42';   // vert clair
const GOLD = '#c8962a';  // or Abidjan
const CREAM = '#faf7f2'; // crème
const INK  = '#1a1a18';  // encre

// ── Helpers ───────────────────────────────────────────────────────
function fmtDate(ts: any): string {
  if (!ts) return '';
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  delivered:     { label: 'Livré',         color: G2,    bg: '#E8F5E2' },
  cod_delivered: { label: 'Livré',         color: G2,    bg: '#E8F5E2' },
  cancelled:     { label: 'Annulé',        color: '#B91C1C', bg: '#FEE2E2' },
  confirmed:     { label: 'Confirmé',      color: G2,    bg: '#E8F5E2' },
  cod_confirmed: { label: 'En livraison',  color: GOLD,  bg: '#FDF3E0' },
  ready:         { label: 'Prêt',          color: GOLD,  bg: '#FDF3E0' },
  picked:        { label: 'En route',      color: GOLD,  bg: '#FDF3E0' },
  initiated:     { label: 'En attente',    color: '#71717A', bg: '#F4F4F5' },
  proof_sent:    { label: 'Preuve',        color: G3,    bg: '#E8F5E2' },
  cod_pending:   { label: 'En attente',    color: '#71717A', bg: '#F4F4F5' },
};

// ── SVG Icons système — taille standard 18px ─────────────────────
const Icons = {
  heart: (filled = false) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? G2 : 'none'} stroke={filled ? G2 : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  ),
  bag: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  ),
  star: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  bell: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  gift: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  settings: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  pin: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a8 8 0 00-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/>
    </svg>
  ),
  chevron: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  ),
  check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  share: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  edit: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  store: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  package: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  bookmark: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
    </svg>
  ),
  wishlist_empty: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/>
    </svg>
  ),
  following_empty: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="17" y1="11" x2="23" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/>
    </svg>
  ),
  trending: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
};

// ── EmptyState avec SVG ───────────────────────────────────────────
function EmptyState({ svgIcon, title, sub }: { svgIcon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="text-center py-14 bg-white rounded-3xl" style={{ border: `1.5px dashed ${G3}40` }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: `${G2}10`, color: `${G3}` }}>
        {svgIcon}
      </div>
      <p className="font-black text-[13px]" style={{ color: INK }}>{title}</p>
      <p className="text-[10px] mt-2 px-8 leading-relaxed" style={{ color: '#A3A3A3' }}>{sub}</p>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────
export function BuyerProfilePage({ onProductClick, onNavigate, onOpenOrder, onSellerClick }: BuyerProfilePageProps) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('favorites');

  const [bookmarkedProducts, setBookmarkedProducts] = useState<Product[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [loadingFavs, setLoadingFavs]   = useState(true);
  const [orders, setOrders]             = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [wishlistPublic, setWishlistPublic]     = useState(false);
  const [wishlistLink, setWishlistLink]         = useState('');
  const [wishlistCopied, setWishlistCopied]     = useState(false);
  const [followedSellers, setFollowedSellers]   = useState<any[]>([]);

  const pts = (userProfile as any)?.loyaltyPoints || 0;
  const { redeemable, discount: cashbackDiscount } = getRedeemablePoints(pts);

  useEffect(() => { loadBookmarks(); }, [userProfile?.bookmarkedProductIds]);
  useEffect(() => {
    if (!currentUser) return;
    return subscribeOrdersAsBuyer(currentUser.uid, (ords) => { setOrders(ords); setLoadingOrders(false); });
  }, [currentUser?.uid]);
  useEffect(() => {
    if (!userProfile) return;
    const ids: string[] = (userProfile as any).wishlistIds || [];
    setWishlistPublic((userProfile as any).wishlistPublic || false);
    const slug = (userProfile as any).wishlistSlug;
    if (slug) setWishlistLink(buildWishlistLink(slug));
    if (!ids.length) { setWishlistProducts([]); return; }
    Promise.all(ids.map(id => getDoc(doc(db, 'products', id)).then(d => d.exists() ? { id: d.id, ...d.data() } as Product : null)))
      .then(list => setWishlistProducts(list.filter(Boolean) as Product[])).catch(() => {});
  }, [JSON.stringify((userProfile as any)?.wishlistIds)]);
  useEffect(() => {
    if (!userProfile) return;
    const ids: string[] = (userProfile as any).followingSellers || [];
    if (!ids.length) { setFollowedSellers([]); return; }
    Promise.all(ids.map(id => getDoc(doc(db, 'users', id)).then(d => d.exists() ? { id: d.id, ...d.data() } : null)))
      .then(list => setFollowedSellers(list.filter(Boolean) as any[])).catch(() => {});
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
    } catch {} finally { setLoadingFavs(false); }
  }

  if (!userProfile) return null;

  const completedOrders = orders.filter(o => ['delivered','cod_delivered'].includes(o.status));
  const activeOrders    = orders.filter(o => !['delivered','cod_delivered','cancelled'].includes(o.status));
  const memberSince = (() => {
    try {
      const d = (userProfile as any).createdAt?.toDate ? (userProfile as any).createdAt.toDate() : new Date((userProfile as any).createdAt);
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch { return ''; }
  })();

  const TABS: { id: Tab; icon: React.ReactNode; label: string; count: number }[] = [
    { id: 'favorites', icon: Icons.heart(),  label: 'Favoris',  count: bookmarkIds.size },
    { id: 'purchases', icon: Icons.bag(),    label: 'Achats',   count: orders.length },
    { id: 'wishlist',  icon: Icons.star(),   label: 'Wishlist', count: wishlistProducts.length },
    { id: 'following', icon: Icons.bell(),   label: 'Je suis',  count: ((userProfile as any).followingSellers || []).length },
    { id: 'cashback',  icon: Icons.gift(),   label: 'Points',   count: pts },
  ];

  return (
    <div className="min-h-screen pb-28" style={{ background: CREAM }}>

      {/* ══ HERO — pleine largeur, vert dominant ════════════════════ */}
      <div className="relative overflow-hidden">
        {/* Fond texture vert + motif géométrique */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(155deg, ${G1} 0%, ${G2} 50%, ${G3} 100%)`,
        }}/>
        {/* Grille décorative subtile */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '24px 24px' }}/>
        {/* Accents or */}
        <div className="absolute top-10 right-10 w-36 h-36 rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }}/>
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, white, transparent 70%)` }}/>

        <div className="relative px-5 pt-14 pb-7">
          {/* Paramètres */}
          <button onClick={() => onNavigate?.('settings')}
            className="absolute top-14 right-5 w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
            {Icons.settings()}
          </button>

          {/* Avatar + nom */}
          <div className="flex items-end gap-4">
            <div className="relative flex-shrink-0">
              {/* Anneau or */}
              <div className="absolute -inset-1 rounded-[1.6rem]"
                style={{ background: `linear-gradient(135deg, ${GOLD}80, transparent 60%)` }}/>
              <div className="relative w-[74px] h-[74px] rounded-[1.4rem] overflow-hidden shadow-2xl">
                <img
                  src={userProfile.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name || 'U')}&background=1a3d17&color=c8962a&bold=true`}
                  alt="" className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex-1 min-w-0 pb-1.5">
              <h1 style={{
                color: 'white', fontFamily: "'Syne', 'DM Sans', sans-serif",
                fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em',
                lineHeight: 1.1, textTransform: 'uppercase',
              }} className="truncate">
                {userProfile.name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {(userProfile as any).neighborhood && (
                  <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    <span style={{ color: GOLD }}>{Icons.pin()}</span>
                    {(userProfile as any).neighborhood}
                  </span>
                )}
                {memberSince && (
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Depuis {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3 stats — glassmorphism */}
          <div className="grid grid-cols-3 gap-2.5 mt-5">
            {[
              { val: bookmarkIds.size,       label: 'Favoris',  accent: GOLD },
              { val: activeOrders.length,    label: 'En cours', accent: 'white' },
              { val: completedOrders.length, label: 'Achetés',  accent: '#a3d99a' },
            ].map(s => (
              <div key={s.label}
                className="rounded-2xl py-3 px-2 text-center"
                style={{
                  background: 'rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}>
                <p className="font-black text-[24px] leading-none" style={{ color: s.accent }}>{s.val}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ ONGLETS — vert actif, jamais bleu ═══════════════════════ */}
      <div className="bg-white sticky top-0 z-30"
        style={{ borderBottom: `1px solid ${G2}20`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-shrink-0 flex flex-col items-center gap-1 px-4 pt-3 pb-2.5 relative min-w-[58px] transition-colors"
              style={{ color: tab === t.id ? G2 : '#A3A3A3' }}>
              {/* Indicateur bas */}
              {tab === t.id && (
                <div className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-full"
                  style={{ background: `linear-gradient(90deg, ${G2}, ${G3})` }}/>
              )}
              <div className="w-5 h-5 flex items-center justify-center">{t.icon}</div>
              <span className="text-[7.5px] font-black uppercase tracking-widest leading-none">{t.label}</span>
              {t.count > 0 && (
                <span className="absolute top-1.5 right-2 text-[7px] font-black w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background: tab === t.id ? G2 : '#E5E7EB',
                    color: tab === t.id ? 'white' : '#71717A',
                  }}>
                  {t.count > 99 ? '+' : t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══ CONTENU ONGLETS ═════════════════════════════════════════ */}
      <div className="px-4 pt-4 space-y-3">

        {/* ─── FAVORIS ──────────────────────────────────────────────── */}
        {tab === 'favorites' && (
          loadingFavs ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-white rounded-3xl animate-pulse" style={{ border: `1px solid ${G2}15` }}/>)}
            </div>
          ) : bookmarkedProducts.length === 0 ? (
            <EmptyState svgIcon={Icons.bookmark()} title="Aucun favori"
              sub="Appuie sur le signet d'une annonce pour l'enregistrer ici"/>
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

        {/* ─── ACHATS ───────────────────────────────────────────────── */}
        {tab === 'purchases' && (
          loadingOrders ? (
            <div className="space-y-2.5">
              {[1,2,3].map(i => <div key={i} className="h-[76px] bg-white rounded-2xl animate-pulse" style={{ border: `1px solid ${G2}15` }}/>)}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState svgIcon={Icons.package()} title="Aucun achat"
              sub="Tes commandes apparaîtront ici dès ton premier achat"/>
          ) : (
            <div className="space-y-2">
              {orders.map(order => {
                const s = STATUS_MAP[order.status] || { label: order.status, color: '#71717A', bg: '#F4F4F5' };
                return (
                  <button key={order.id}
                    onClick={() => onOpenOrder ? onOpenOrder(order.id) : onNavigate?.('orders')}
                    className="w-full bg-white rounded-2xl p-3.5 text-left flex items-center gap-3 active:scale-[0.98] transition-all"
                    style={{ border: `1px solid ${G2}12`, boxShadow: `0 2px 12px ${G1}08` }}>
                    {/* Image */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ background: `${G2}10` }}>
                      {(order as any).productImage
                        ? <img src={(order as any).productImage} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center" style={{ color: G3 }}>{Icons.package()}</div>
                      }
                    </div>
                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[12px] truncate" style={{ color: INK }}>{order.productTitle}</p>
                      <p className="text-[10px] truncate mt-0.5" style={{ color: '#A3A3A3' }}>{order.sellerName}</p>
                      <div className="flex items-center justify-between mt-1.5 gap-2">
                        <span className="font-black text-[12px]" style={{ color: G2 }}>
                          {(order.productPrice || 0).toLocaleString('fr-FR')}
                          <span className="font-bold text-[9px] ml-0.5" style={{ color: '#A3A3A3' }}>FCFA</span>
                        </span>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ color: s.color, background: s.bg }}>{s.label}</span>
                      </div>
                    </div>
                    <span style={{ color: '#D4D4D4' }}>{Icons.chevron()}</span>
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* ─── WISHLIST ─────────────────────────────────────────────── */}
        {tab === 'wishlist' && (
          <>
            {/* Contrôle partage */}
            <div className="bg-white rounded-2xl p-4"
              style={{ border: `1px solid ${G2}15`, boxShadow: `0 2px 12px ${G1}06` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-[14px]" style={{ color: INK }}>Ma Wishlist</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#A3A3A3' }}>{wishlistProducts.length} article{wishlistProducts.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold" style={{ color: '#A3A3A3' }}>Publique</span>
                  <button
                    onClick={async () => {
                      if (!currentUser) return;
                      const next = !wishlistPublic;
                      setWishlistPublic(next);
                      await toggleWishlistPublic(currentUser.uid, next).catch(() => {});
                      await refreshUserProfile();
                    }}
                    className="w-10 h-6 rounded-full transition-all relative"
                    style={{ background: wishlistPublic ? G2 : '#E5E7EB' }}>
                    <div className="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all"
                      style={{ left: wishlistPublic ? '1.125rem' : '0.125rem' }}/>
                  </button>
                </div>
              </div>
              {wishlistPublic && wishlistLink && (
                <div className="mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{ background: `${G2}10`, border: `1px solid ${G2}20` }}>
                  <p className="flex-1 text-[9px] font-bold truncate" style={{ color: G2 }}>{wishlistLink}</p>
                  <button
                    onClick={async () => {
                      try {
                        if (navigator.share) await navigator.share({ title: 'Ma Wishlist Brumerie', url: wishlistLink });
                        else { await navigator.clipboard.writeText(wishlistLink); setWishlistCopied(true); setTimeout(() => setWishlistCopied(false), 2000); }
                      } catch {}
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase text-white active:scale-95 flex-shrink-0"
                    style={{ background: G2, color: 'white' }}>
                    <span style={{ color: 'white' }}>{Icons.share()}</span>
                    {wishlistCopied ? 'Copié' : 'Partager'}
                  </button>
                </div>
              )}
            </div>

            {wishlistProducts.length === 0 ? (
              <EmptyState svgIcon={Icons.wishlist_empty()} title="Wishlist vide"
                sub="Sur une fiche produit, appuie sur le bouton étoile pour ajouter un article ici"/>
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
                      className="absolute top-2 right-2 w-6 h-6 bg-white/95 rounded-full shadow flex items-center justify-center active:scale-90 z-10"
                      style={{ border: `1px solid ${G2}20` }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── VENDEURS SUIVIS ──────────────────────────────────────── */}
        {tab === 'following' && (
          followedSellers.length === 0 ? (
            <EmptyState svgIcon={Icons.following_empty()} title="Aucun vendeur suivi"
              sub="Depuis une fiche produit, clique sur le bouton de suivi pour être notifié des nouveaux articles"/>
          ) : (
            <div className="space-y-2">
              {followedSellers.map((seller: any) => (
                <div key={seller.id}
                  className="bg-white rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer"
                  style={{ border: `1px solid ${G2}12`, boxShadow: `0 2px 12px ${G1}06` }}
                  onClick={() => onSellerClick?.(seller.id)}>
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0"
                    style={{ border: `2px solid ${G2}20` }}>
                    {(seller.deliveryPhotoURL || seller.photoURL)
                      ? <img src={seller.deliveryPhotoURL || seller.photoURL} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center font-black text-white"
                          style={{ background: `linear-gradient(135deg, ${G2}, ${G3})`, fontSize: '1.1rem' }}>
                          {(seller.name || '?').charAt(0).toUpperCase()}
                        </div>
                    }
                  </div>
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-black text-[13px] truncate" style={{ color: INK }}>{seller.name}</p>
                      {seller.isVerified && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill={G2}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      )}
                      {seller.isPremium && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={GOLD}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      )}
                    </div>
                    {seller.shopSlogan && (
                      <p className="text-[10px] truncate italic mt-0.5" style={{ color: '#A3A3A3' }}>"{seller.shopSlogan}"</p>
                    )}
                    <p className="text-[9px] mt-0.5" style={{ color: '#C4C4C4' }}>{formatLastSeen(seller.lastActiveAt)}</p>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span style={{ color: '#D4D4D4' }}>{Icons.chevron()}</span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!currentUser) return;
                        await unfollowSeller(currentUser.uid, seller.id);
                        setFollowedSellers(prev => prev.filter((s: any) => s.id !== seller.id));
                        await refreshUserProfile();
                      }}
                      className="text-[8px] font-black px-2 py-1 rounded-lg active:scale-95 transition-all"
                      style={{ color: '#EF4444', background: '#FEF2F2' }}>
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ─── CASHBACK / POINTS ────────────────────────────────────── */}
        {tab === 'cashback' && (
          <>
            {/* Carte points — style carte de fidélité premium */}
            <div className="rounded-3xl overflow-hidden relative"
              style={{ background: `linear-gradient(135deg, ${G1} 0%, ${G2} 60%, ${G3} 100%)`, minHeight: '160px' }}>
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '18px 18px' }}/>
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-15"
                style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)`, transform: 'translate(20%, -20%)' }}/>
              <div className="relative px-6 py-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      BRUMERIE · FIDÉLITÉ
                    </p>
                    <p className="font-black leading-none mt-1" style={{ fontSize: '2.6rem', color: 'white', fontFamily: "'Syne', sans-serif" }}>
                      {pts.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>points</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: `${GOLD}25`, border: `1px solid ${GOLD}40` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={GOLD}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </div>
                </div>
                {redeemable > 0 && (
                  <div className="rounded-2xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: GOLD }}>{Icons.check()}</span>
                      <div>
                        <p className="font-black text-[12px] text-white">{redeemable} pts utilisables</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          = {cashbackDiscount.toLocaleString('fr-FR')} FCFA de réduction
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comment ça marche */}
            <div className="bg-white rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${G2}15` }}>
              <div className="px-5 pt-5 pb-1">
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: G2 }}>Comment ça marche</p>
              </div>
              {[
                { icon: Icons.bag(),     title: 'Achète sur Brumerie',  sub: `${CASHBACK_RATE} FCFA = 1 point` },
                { icon: Icons.trending(),title: 'Accumule tes points',  sub: `${CASHBACK_REDEEM} pts = ${CASHBACK_VALUE.toLocaleString('fr-FR')} FCFA de réduction` },
                { icon: Icons.check(),   title: 'Utilise ta réduction', sub: 'Applique le bon lors du prochain paiement' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5"
                  style={{ borderTop: i > 0 ? `1px solid ${G2}08` : undefined }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${G2}10`, color: G2 }}>
                    {step.icon}
                  </div>
                  <div>
                    <p className="font-black text-[12px]" style={{ color: INK }}>{step.title}</p>
                    <p className="text-[10px]" style={{ color: '#A3A3A3' }}>{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Historique */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: `1px solid ${G2}15` }}>
              <div className="px-5 pt-5 pb-2">
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: G2 }}>Derniers points gagnés</p>
              </div>
              {orders.filter(o => ['delivered','cod_delivered'].includes(o.status)).length === 0 ? (
                <p className="text-[11px] text-center py-6 px-5" style={{ color: '#A3A3A3' }}>
                  Tes points apparaîtront ici après chaque achat livré
                </p>
              ) : orders.filter(o => ['delivered','cod_delivered'].includes(o.status)).slice(0, 5).map((o, i, arr) => {
                const earned = Math.floor(((o as any).totalAmount || 0) / CASHBACK_RATE);
                return (
                  <div key={o.id} className="flex items-center gap-3 px-5 py-3"
                    style={{ borderTop: i > 0 ? `1px solid ${G2}08` : `1px solid ${G2}08` }}>
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ background: `${G2}10` }}>
                      {(o as any).productImage
                        ? <img src={(o as any).productImage} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center" style={{ color: G3 }}>{Icons.package()}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[11px] truncate" style={{ color: INK }}>{o.productTitle}</p>
                      <p className="text-[9px]" style={{ color: '#A3A3A3' }}>
                        {((o as any).totalAmount || 0).toLocaleString('fr-FR')} FCFA · {fmtDate(o.createdAt)}
                      </p>
                    </div>
                    <span className="font-black text-[12px]" style={{ color: G2 }}>+{earned} pts</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══ ADRESSE ADDRESSWEB — toujours visible ══════════════════ */}
        <div className="bg-white rounded-2xl p-4"
          style={{ border: `1px solid ${G2}15`, boxShadow: `0 2px 12px ${G1}06` }}>
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

        {/* ══ BOUTONS BAS DE PAGE ════════════════════════════════════ */}
        <button onClick={() => onNavigate?.('edit-profile')}
          className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ background: 'white', border: `1.5px solid ${G2}30`, color: G2 }}>
          <span style={{ color: G2 }}>{Icons.edit()}</span>
          Modifier mon profil
        </button>

        <button onClick={() => onNavigate?.('switch-to-seller')}
          className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ background: `linear-gradient(135deg, ${G1}, ${G2})`, boxShadow: `0 4px 20px ${G2}40` }}>
          <span style={{ color: 'white' }}>{Icons.store()}</span>
          Passer en mode Vendeur
        </button>
      </div>
    </div>
  );
}
