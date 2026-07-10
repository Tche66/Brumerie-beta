// src/pages/BuyerProfilePage.tsx — v22 · Design premium Brumerie · Vert exclusif · SVG pro
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProductCard } from '@/components/ProductCard';
import { removeBookmark } from '@/services/bookmarkService';
import { getProducts, getProductById } from '@/services/productService';
import { subscribeOrdersAsBuyer } from '@/services/orderService';
import { Product, Order } from '@/types';
import { AWAddressPicker } from '@/components/AWAddressPicker';
import { updateUserProfile, getSuggestedSellers } from '@/services/userService';
import {
  removeFromWishlist, toggleWishlistPublic, buildWishlistLink,
  followSeller, unfollowSeller, getRedeemablePoints,
  CASHBACK_RATE, CASHBACK_REDEEM, CASHBACK_VALUE,
  formatLastSeen,
  getUserReposts, deleteRepost,
} from '@/services/shopFeaturesService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface BuyerProfilePageProps {
  onProductClick: (product: Product) => void;
  onNavigate?: (page: string) => void;
  onOpenOrder?: (orderId: string) => void;
  onSellerClick?: (sellerId: string) => void;
}

type Tab = 'favorites' | 'purchases' | 'wishlist' | 'following' | 'cashback' | 'recent' | 'reposts';

// ── Palette Brumerie — Dark premium ──────────────────────────────
const G1  = '#0f172a';   // slate-900
const G2  = '#1e293b';   // slate-800
const G3  = '#334155';   // slate-700
const GOLD = '#f59e0b';  // amber-500
const CREAM = '#f8fafc'; // slate-50
const INK  = '#0f172a';  // slate-900

// ── Helpers ───────────────────────────────────────────────────────
function fmtDate(ts: any): string {
  if (!ts) return '';
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  delivered:     { label: 'Livré',         color: '#16a34a', bg: '#f0fdf4' },
  cod_delivered: { label: 'Livré',         color: '#16a34a', bg: '#f0fdf4' },
  cancelled:     { label: 'Annulé',        color: '#B91C1C', bg: '#FEE2E2' },
  confirmed:     { label: 'Confirmé',      color: '#16a34a', bg: '#f0fdf4' },
  cod_confirmed: { label: 'En livraison',  color: GOLD,  bg: '#fffbeb' },
  ready:         { label: 'Prêt',          color: GOLD,  bg: '#fffbeb' },
  picked:        { label: 'En route',      color: GOLD,  bg: '#fffbeb' },
  initiated:     { label: 'En attente',    color: '#71717A', bg: '#F4F4F5' },
  proof_sent:    { label: 'Preuve',        color: '#0ea5e9', bg: '#f0f9ff' },
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

// ── Accordéon adresse — discret, replié par défaut ────────────────
function AddressAccordion({ awCode, currentUser, onSave, onRemove }: {
  awCode: string; currentUser: any;
  onSave: (code: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const hasAddress = !!awCode;

  return (
    <div className="bg-white rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${G2}15`, boxShadow: `0 2px 12px ${G1}06` }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 active:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${G2}10` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G2} strokeWidth="2" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="text-[11px] font-black text-slate-700">Adresse de livraison</p>
            <p className="text-[9px] text-slate-400 font-medium">
              {hasAddress ? '••••••' + awCode.slice(-5) : 'Non configurée'}
            </p>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-50">
          <AWAddressPicker
            value={awCode}
            onChange={async (code) => { if (code) await onSave(code); }}
            onSaveToProfile={async (code) => { await onSave(code); }}
            onRemoveFromProfile={onRemove}
            showSaveToProfile
            label=""
            placeholder="AW-ABJ-84321"
            firebaseUid={currentUser?.uid}
          />
        </div>
      )}
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
  const [suggestedSellers, setSuggestedSellers] = useState<any[]>([]);
  const [recentlyViewed, setRecentlyViewed]     = useState<Product[]>([]);
  const [loadingRecent, setLoadingRecent]       = useState(false);
  const [reposts, setReposts]                   = useState<any[]>([]);
  const [loadingReposts, setLoadingReposts]     = useState(false);

  const pts = (userProfile as any)?.loyaltyPoints || 0;
  const { redeemable, discount: cashbackDiscount } = getRedeemablePoints(pts);

  useEffect(() => { loadBookmarks(); }, [userProfile?.bookmarkedProductIds]);

  // Charger "Vu récemment" quand l'onglet est sélectionné
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    const ids: string[] = (userProfile as any).recentlyViewedIds || [];
    if (!ids.length) { setRecentlyViewed([]); return; }
    setLoadingRecent(true);
    Promise.all(
      ids.slice(0, 20).map(id =>
        getProductById(id).catch(() => null)
      )
    )
      .then(list => setRecentlyViewed(list.filter(Boolean) as Product[]))
      .catch(() => {})
      .finally(() => setLoadingRecent(false));
  }, [JSON.stringify((userProfile as any)?.recentlyViewedIds)]);
  useEffect(() => {
    if (tab !== 'reposts' || !currentUser) return;
    setLoadingReposts(true);
    getUserReposts(currentUser.uid)
      .then(setReposts)
      .catch(() => {})
      .finally(() => setLoadingReposts(false));
  }, [tab, currentUser?.uid]);

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

  useEffect(() => {
    if (!currentUser) return;
    getSuggestedSellers(
      currentUser.uid,
      (userProfile as any)?.followingSellers || [],
      userProfile?.neighborhood,
      4,
    ).then(setSuggestedSellers).catch(() => {});
  }, [currentUser?.uid, followedSellers.length]);

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
    { id: 'following', icon: Icons.bell(),   label: 'Suivis',   count: ((userProfile as any).followingSellers || []).length },
  ];

  const MORE_TABS: { id: Tab; icon: React.ReactNode; label: string; count: number }[] = [
    { id: 'reposts',   icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
        </svg>
      ), label: 'Partages', count: reposts.length },
    { id: 'wishlist',  icon: Icons.star(),   label: 'Wishlist', count: wishlistProducts.length },
    { id: 'cashback',  icon: Icons.gift(),   label: 'Points',   count: pts },
    { id: 'recent',    icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
        </svg>
      ), label: 'Récent', count: recentlyViewed.length },
  ];


  const loyaltyLevel = pts >= 500 ? 'Gold' : pts >= 100 ? 'Silver' : 'Brumeur';
  const loyaltyColor = pts >= 500 ? '#F59E0B' : pts >= 100 ? '#94A3B8' : '#16A34A';

  return (
    <div className="min-h-screen pb-28 bg-slate-50">

      {/* ══ HEADER PROFIL — Brumerie Style ═══════════════════════════ */}
      <div className="relative bg-white rounded-b-[2rem] shadow-sm">
        {/* Bannière verte signature Brumerie */}
        <div className="h-20 rounded-b-[2rem] relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #065F46 0%, #16A34A 50%, #0F172A 100%)' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 5c0 8-7 15-7 15s7-7 14 0\' fill=\'none\' stroke=\'white\' stroke-width=\'0.5\'/%3E%3C/svg%3E")' }}/>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-11">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2a7 7 0 017 7c0 3-1.5 5-3 6.5V18H8v-2.5C6.5 14 5 12 5 9a7 7 0 017-7z"/>
              </svg>
              <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Brumerie</span>
            </div>
            <button onClick={() => onNavigate?.('settings')}
              className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all border border-white/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Profil info */}
        <div className="px-4 pb-5">
          <div className="flex items-end gap-4 -mt-10">
            {/* Avatar avec ring vert */}
            <div className="relative">
              <div className="w-[76px] h-[76px] rounded-full overflow-hidden border-4 border-white shadow-xl flex-shrink-0">
                <img
                  src={userProfile.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name || 'U')}&background=065F46&color=fff&bold=true`}
                  alt="" className="w-full h-full object-cover"
                />
              </div>
              {/* Badge niveau */}
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[7px] font-black text-white shadow-lg"
                style={{ background: loyaltyColor }}>
                {loyaltyLevel}
              </div>
            </div>

            {/* Stats inline */}
            <div className="flex-1 flex items-center justify-around pb-1">
              <div className="text-center">
                <p className="text-[16px] font-black text-slate-900">{bookmarkIds.size}</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase">Favoris</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-black text-slate-900">{completedOrders.length}</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase">Achats</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-black text-slate-900">{((userProfile as any).followingSellers || []).length}</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase">Suivis</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-black" style={{ color: loyaltyColor }}>{pts}</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase">Points</p>
              </div>
            </div>
          </div>

          {/* Nom + infos */}
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-black text-slate-900">{userProfile.name}</p>
              {(userProfile as any).isVerified && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#16A34A" stroke="white" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {(userProfile as any).neighborhood && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {(userProfile as any).neighborhood}
                </span>
              )}
              {memberSince && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                  {memberSince}
                </span>
              )}
            </div>
            {(userProfile as any).bio && (
              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{(userProfile as any).bio}</p>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 mt-4">
            <button onClick={() => onNavigate?.('edit-profile')}
              className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-[10px] font-black text-slate-700 uppercase tracking-widest active:scale-95 transition-all">
              Modifier
            </button>
            <button onClick={() => onNavigate?.('affiliate')}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-green-200"
              style={{ background: 'linear-gradient(135deg, #16A34A, #065F46)' }}>
              Affiliation
            </button>
            <button onClick={() => {
                const text = `Rejoins Brumerie ! ${userProfile.referralCode ? 'Code: ' + userProfile.referralCode : ''} https://brumerie.com`;
                navigator.share ? navigator.share({ title: 'Brumerie', text }) : navigator.clipboard.writeText(text);
              }}
              className="w-11 py-2.5 rounded-xl border-2 border-slate-200 flex items-center justify-center active:scale-95 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ══ ONGLETS — Brumerie pills vertes ═══════════════════════════ */}
      <div className="sticky top-0 z-30 bg-slate-50 pt-3 pb-2 px-3">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2" style={{ minWidth: 'max-content' }}>
            {[...TABS, ...MORE_TABS].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}>
                <div className="w-3.5 h-3.5 flex items-center justify-center">{t.icon}</div>
                {t.label}
                {t.count > 0 && (
                  <span className={`text-[7px] font-black min-w-[14px] h-[14px] rounded-full flex items-center justify-center ${
                    tab === t.id ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {t.count > 99 ? '99+' : t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
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
            <div>
              <EmptyState svgIcon={Icons.following_empty()} title="Aucun vendeur suivi"
                sub="Suis des vendeurs pour être notifié de leurs nouveaux articles"/>
              {suggestedSellers.length > 0 && (
                <div className="mt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">Suggestions pour toi</p>
                  <div className="space-y-2">
                    {suggestedSellers.map((s: any) => (
                      <div key={s.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-slate-100">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 cursor-pointer"
                          onClick={() => onSellerClick?.(s.id)}>
                          {s.photoURL
                            ? <img src={s.photoURL} alt="" className="w-full h-full object-cover"/>
                            : <div className="w-full h-full flex items-center justify-center font-black text-slate-400">{s.name?.charAt(0)}</div>}
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSellerClick?.(s.id)}>
                          <p className="text-[12px] font-bold text-slate-800 truncate">{s.name}</p>
                          <p className="text-[9px] text-slate-400">{s.neighborhood || ''}{s.isVerified ? ' · Vérifié' : ''}</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!currentUser) return;
                            await followSeller(currentUser.uid, s.id, s.name || '', userProfile?.name);
                            await refreshUserProfile();
                            setSuggestedSellers(prev => prev.filter(x => x.id !== s.id));
                          }}
                          className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-white bg-green-600 active:scale-95 transition-all flex-shrink-0">
                          Suivre
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
                        await unfollowSeller(currentUser.uid, seller.id, userProfile?.name);
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

        {/* ── VU RÉCEMMENT ── */}
        {tab === 'recent' && (
          <div className="px-4 pb-8">
            {loadingRecent ? (
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="aspect-square bg-slate-100 rounded-2xl animate-pulse"/>
                ))}
              </div>
            ) : recentlyViewed.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <div className="text-4xl mb-3">👁️</div>
                <p className="font-black text-slate-400 uppercase tracking-tight text-[12px]">
                  Aucun article consulté récemment
                </p>
                <p className="text-[10px] text-slate-300 mt-1">
                  Les articles que tu consultes apparaissent ici
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {recentlyViewed.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => onProductClick?.(product)}
                    onBookmark={() => {}}
                    isBookmarked={bookmarkIds.has(product.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── REPOSTS / PARTAGES ──────────────────────────────────── */}
        {tab === 'reposts' && (
          <div className="px-4 pb-8">
            {loadingReposts ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse"/>
                ))}
              </div>
            ) : reposts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <div className="text-4xl mb-3">🔄</div>
                <p className="font-black text-slate-400 uppercase tracking-tight text-[12px]">
                  Aucun partage
                </p>
                <p className="text-[10px] text-slate-300 mt-1">
                  Les articles que tu repartages apparaissent ici
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reposts.map((repost) => (
                  <div key={repost.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => {
                        const fakeProduct = {
                          id: repost.originalProductId,
                          title: repost.originalProductTitle,
                          images: [repost.originalProductImage],
                          price: repost.originalProductPrice,
                          sellerId: repost.originalSellerId,
                          sellerName: repost.originalSellerName,
                        } as any;
                        onProductClick?.(fakeProduct);
                      }}
                      className="w-full flex items-center gap-3 p-3 active:bg-slate-50 transition-all text-left"
                    >
                      <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                        {repost.originalProductImage && (
                          <img src={repost.originalProductImage} alt="" className="w-full h-full object-cover"/>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate">{repost.originalProductTitle}</p>
                        <p className="text-[10px] font-black text-green-600">{repost.originalProductPrice?.toLocaleString()} FCFA</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          Vendeur : {repost.originalSellerName}
                          {repost.comment && <span className="text-slate-500"> · "{repost.comment.slice(0, 30)}"</span>}
                        </p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                    <div className="flex border-t border-slate-50">
                      <button
                        onClick={() => {
                          const fakeProduct = {
                            id: repost.originalProductId,
                            title: repost.originalProductTitle,
                            images: [repost.originalProductImage],
                            price: repost.originalProductPrice,
                            sellerId: repost.originalSellerId,
                            sellerName: repost.originalSellerName,
                          } as any;
                          onProductClick?.(fakeProduct);
                        }}
                        className="flex-1 py-2.5 text-[9px] font-black text-blue-600 uppercase tracking-widest text-center active:bg-blue-50 transition-all">
                        Voir
                      </button>
                      <div className="w-px bg-slate-100"/>
                      <button
                        onClick={async () => {
                          await deleteRepost(repost.id);
                          setReposts(prev => prev.filter(r => r.id !== repost.id));
                        }}
                        className="flex-1 py-2.5 text-[9px] font-black text-red-500 uppercase tracking-widest text-center active:bg-red-50 transition-all">
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ ADRESSE ADDRESSWEB — accordéon discret ══════════════════ */}
        <AddressAccordion
          awCode={(userProfile as any).awAddressCode || ''}
          currentUser={currentUser}
          onSave={async (code) => {
            if (currentUser) {
              await updateUserProfile(currentUser.uid, { awAddressCode: code });
              await refreshUserProfile();
            }
          }}
          onRemove={async () => {
            if (currentUser) {
              await updateUserProfile(currentUser.uid, { awAddressCode: '' });
              await refreshUserProfile();
            }
          }}
        />

        {/* ══ ACTIONS RAPIDES ════════════════════════════════════ */}
        <div className="flex gap-3">
          <button onClick={() => onNavigate?.('edit-profile')}
            className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all bg-white border border-slate-200 text-slate-600">
            {Icons.edit()}
            Modifier
          </button>
          <button onClick={() => onNavigate?.('switch-to-seller')}
            className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all bg-green-600">
            {Icons.store()}
            Vendre
          </button>
        </div>
      </div>
    </div>
  );
}
