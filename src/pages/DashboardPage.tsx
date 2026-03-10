// src/pages/DashboardPage.tsx — Dashboard SVG pro + Simple vs Vérifié/Premium
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSellerProducts } from '@/services/productService';
import { subscribeSellerReviews } from '@/services/reviewService';
import { subscribeOrdersAsSeller } from '@/services/orderService';
import { subscribeSellerPendingOffers, respondToOffer } from '@/services/messagingService';
import { Product, Order, PLAN_LIMITS, OrderStatus } from '@/types';
import { BoostModal } from '@/components/BoostModal';
import { CountdownBadge } from '@/components/CountdownBadge';
import { subscribeBoostedProductIds, getSellerBoosts } from '@/services/boostService';

// ── SVG Icons ─────────────────────────────────────────────────
const Icon = {
  eye: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  chat: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  check: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  coin: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  star: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  box: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  lock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  trending: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  arrowRight: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  edit: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  flash: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  shield: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  dashboard: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  back: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  order: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
};

interface DashboardPageProps {
  onBack: () => void;
  onUpgrade?: () => void;
  onEditProduct?: (product: Product) => void;
  onOpenOrder?: (orderId: string) => void;
  onOpenChat?: (convId: string) => void;
}

type Tab = 'stats' | 'articles' | 'commandes' | 'ventes' | 'offres';

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; bg: string; color: string }> = {
    initiated:  { label: 'En attente',    bg: '#FEF3C7', color: '#92400E' },
    proof_sent: { label: 'Preuve envoyée',bg: '#DBEAFE', color: '#1D4ED8' },
    confirmed:  { label: 'Confirmé',      bg: '#D1FAE5', color: '#065F46' },
    delivered:  { label: 'Livré',         bg: '#DCFCE7', color: '#166534' },
    disputed:   { label: 'Litige',        bg: '#FFEDD5', color: '#9A3412' },
    cancelled:  { label: 'Annulé',        bg: '#F3F4F6', color: '#374151' },
  };
  const s = map[status] || map.initiated;
  return (
    <span className="px-2 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest flex-shrink-0"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  );
}

// ── Mini sparkline SVG pour les stats ────────────────────────
function Sparkline({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
      <div className="h-full bg-white/60 rounded-full transition-all" style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

export function DashboardPage({ onBack, onUpgrade, onEditProduct, onOpenOrder, onOpenChat }: DashboardPageProps) {
  const { userProfile, currentUser } = useAuth();
  const [products, setProducts]       = useState<Product[]>([]);
  const [orders, setOrders]           = useState<Order[]>([]);
  const [avgRating, setAvgRating]     = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<Tab>('stats');
  const [pendingOffers, setPendingOffers] = useState<any[]>([]);
  const [respondingOffer, setRespondingOffer] = useState<string | null>(null);
  const [boostProduct, setBoostProduct] = useState<Product | null>(null);
  const [activeBoosts, setActiveBoosts] = useState<Record<string, any>>({}); // productId → boost data

  const tier     = userProfile?.isPremium ? 'premium' : userProfile?.isVerified ? 'verified' : 'simple';
  const isSimple = tier === 'simple';
  const limits   = PLAN_LIMITS[tier];


  // Charger boosts actifs du vendeur (pour afficher countdown)
  useEffect(() => {
    if (!currentUser?.uid) return;
    getSellerBoosts(currentUser.uid).then(boosts => {
      const map: Record<string, any> = {};
      const now = Date.now();
      for (const b of boosts) {
        if (b.status === 'active' && b.expiresAt) {
          const expiresMs = b.expiresAt?.toMillis?.() ?? 0;
          if (expiresMs > now) {
            map[b.productId] = b;
          }
        }
      }
      setActiveBoosts(map);
    }).catch(() => {});
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!userProfile?.id) return;
    getSellerProducts(userProfile.id)
      .then(p => { setProducts(p); setLoading(false); })
      .catch(() => setLoading(false));
    const unsubR = subscribeSellerReviews(userProfile.id, (_r: any, avg: number, cnt: number) => {
      setAvgRating(avg); setReviewCount(cnt);
    });
    const unsubO = subscribeOrdersAsSeller(userProfile.id, setOrders);
    const unsubOffers = subscribeSellerPendingOffers(userProfile.id, setPendingOffers);
    return () => { unsubR(); unsubO(); unsubOffers(); };
  }, [userProfile?.id]);

  const activeProducts  = products.filter((p: Product) => p.status === 'active');
  const soldProducts    = products.filter((p: Product) => p.status === 'sold');
  const totalViews      = products.reduce((s: number, p: Product) => s + (p.viewCount || 0), 0);
  const totalContacts   = products.reduce((s: number, p: Product) => s + (p.whatsappClickCount || 0), 0);
  const activeOrders    = orders.filter((o: Order) => !['delivered', 'cancelled'].includes(o.status));
  const completedSales  = orders.filter((o: Order) => o.status === 'delivered');
  const totalRevenue    = completedSales.reduce((s: number, o: Order) => s + (o.sellerReceives || o.totalAmount || 0), 0);
  const avgOrder        = completedSales.length > 0 ? Math.round(totalRevenue / completedSales.length) : 0;

  const dailyChatsUsed  = userProfile?.dailyChatCount || 0;
  const dailyChatsLimit = limits.dailyChats >= 999 ? '∞' : String(limits.dailyChats);
  const productLimit    = limits.products >= 999 ? '∞' : String(limits.products);

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'stats',     label: 'Aperçu' },
    { id: 'articles',  label: 'Articles',  badge: activeProducts.length },
    { id: 'commandes', label: 'Commandes', badge: activeOrders.length },
    { id: 'offres',    label: 'Offres',    badge: pendingOffers.length },
    ...(!isSimple ? [{ id: 'ventes' as Tab, label: 'Ventes', badge: completedSales.length }] : []),
  ];

  const fmt = (ts: any) => {
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

  // Couleurs par tier
  const tierGradient = tier === 'premium'
    ? 'linear-gradient(135deg,#0F0F0F 0%,#1a1a1a 100%)'
    : tier === 'verified'
    ? 'linear-gradient(135deg,#1D9BF0 0%,#0E6FC7 100%)'
    : 'linear-gradient(135deg,#475569 0%,#334155 100%)';

  return (
    <div className="min-h-screen pb-24 bg-slate-50 font-sans">

      {/* ── Header ── */}
      <div className="bg-white px-5 pt-6 pb-0 border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 active:scale-90 transition-all text-slate-900 flex-shrink-0">
            {Icon.back}
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: tierGradient, color: 'white' }}>
              {Icon.dashboard}
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-sm uppercase tracking-widest text-slate-900 leading-none">Tableau de bord</h1>
              <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">{userProfile?.name}</p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex-shrink-0 flex items-center gap-1.5"
            style={{ background: tier === 'premium' ? '#0F0F0F' : tier === 'verified' ? '#1D9BF0' : '#E2E8F0', color: tier === 'simple' ? '#64748B' : 'white' }}>
            {tier !== 'simple' && Icon.shield}
            {tier === 'simple' ? 'Gratuit' : tier}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === tab.id ? 'border-green-600 text-green-700' : 'border-transparent text-slate-400'
              }`}>
              {tab.label}
              {(tab.badge ?? 0) > 0 && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* ══════════════ APERÇU ══════════════ */}
        {activeTab === 'stats' && (
          <>
            {/* Bannière upgrade — Simple seulement */}
            {isSimple && (
              <button onClick={onUpgrade}
                className="w-full rounded-3xl p-5 text-left active:scale-[0.98] transition-all relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#1D9BF0 0%,#0E6FC7 100%)' }}>
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10"/>
                <div className="absolute right-10 bottom-0 w-16 h-16 rounded-full bg-white/5"/>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
                    {Icon.flash}
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-100">Plan actuel : Gratuit</p>
                    <p className="font-black text-white text-[17px] leading-tight mt-0.5">Passe Vérifié →</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {['20 articles', 'Chats illimités', 'Badge bleu', 'Réseaux sociaux', 'Revenus & stats'].map(f => (
                    <span key={f} className="text-[8px] font-black bg-white/20 text-white px-2 py-0.5 rounded-lg">{f}</span>
                  ))}
                </div>
                <div className="inline-flex items-center gap-2 bg-white text-blue-700 font-black text-[10px] uppercase px-4 py-2.5 rounded-2xl shadow-lg">
                  Obtenir le badge Vérifié
                  {Icon.arrowRight}
                </div>
              </button>
            )}

            {/* Carte utilisation plan */}
            <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: tierGradient }}>
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/5"/>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 flex items-center justify-center text-white/60">
                  {Icon.dashboard}
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Utilisation du plan</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-black text-2xl leading-none">
                    {activeProducts.length}
                    <span className="text-white/40 text-sm font-bold">/{productLimit}</span>
                  </p>
                  <p className="text-[8px] uppercase font-bold opacity-60 mt-1 mb-2">Articles actifs</p>
                  <Sparkline value={activeProducts.length} max={typeof productLimit === 'string' ? 999 : parseInt(productLimit)} />
                </div>
                <div>
                  <p className="font-black text-2xl leading-none">
                    {dailyChatsUsed}
                    <span className="text-white/40 text-sm font-bold">/{dailyChatsLimit}</span>
                  </p>
                  <p className="text-[8px] uppercase font-bold opacity-60 mt-1 mb-2">Chats aujourd'hui</p>
                  <Sparkline value={dailyChatsUsed} max={limits.dailyChats >= 999 ? 100 : limits.dailyChats} />
                </div>
              </div>
            </div>

            {/* Grille stats */}
            <div className="grid grid-cols-2 gap-3">
              {/* Contacts — tout le monde */}
              <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                <div className="w-9 h-9 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-3">
                  {Icon.chat}
                </div>
                <p className="font-black text-2xl text-slate-900">{loading ? '…' : totalContacts}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Contacts reçus</p>
              </div>

              {/* Vendus — tout le monde */}
              <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                <div className="w-9 h-9 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-3">
                  {Icon.check}
                </div>
                <p className="font-black text-2xl text-slate-900">{loading ? '…' : soldProducts.length}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Articles vendus</p>
              </div>

              {!isSimple ? (
                <>
                  {/* Vues — Vérifié/Premium */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                    <div className="w-9 h-9 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-3">
                      {Icon.eye}
                    </div>
                    <p className="font-black text-2xl text-slate-900">{loading ? '…' : totalViews}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Vues totales</p>
                  </div>

                  {/* Revenus — Vérifié/Premium */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                    <div className="w-9 h-9 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-3">
                      {Icon.coin}
                    </div>
                    <p className="font-black text-lg text-slate-900 truncate">
                      {loading ? '…' : `${totalRevenue.toLocaleString('fr-FR')} F`}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Revenus totaux</p>
                  </div>
                </>
              ) : (
                /* Simple : bloc verrouillé */
                <button onClick={onUpgrade}
                  className="col-span-2 bg-slate-50 rounded-3xl p-4 border-2 border-dashed border-slate-200 flex items-center gap-4 active:scale-[0.98] transition-all">
                  <div className="w-10 h-10 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
                    {Icon.lock}
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-700 text-[12px]">Vues, revenus & note</p>
                    <p className="text-[9px] text-blue-500 font-bold mt-0.5">Passer Vérifié pour débloquer →</p>
                  </div>
                </button>
              )}
            </div>

            {/* Note moyenne — Vérifié/Premium */}
            {!isSimple && avgRating > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Réputation</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)' }}>
                    <p className="font-black text-2xl text-amber-800">{avgRating.toFixed(1)}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="14" height="14" viewBox="0 0 24 24"
                          fill={avgRating >= s ? '#F59E0B' : '#E2E8F0'} stroke="none">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold">{reviewCount} avis · {
                      avgRating >= 4.5 ? '⭐ Excellent vendeur' :
                      avgRating >= 3.5 ? '👍 Bon vendeur' : '📈 En progression'
                    }</p>
                    {/* Barre de progression vers le prochain seuil */}
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(avgRating / 5) * 100}%`, background: 'linear-gradient(90deg,#F59E0B,#FBBF24)' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Résumé revenus — Vérifié/Premium */}
            {!isSimple && totalRevenue > 0 && (
              <div className="rounded-3xl p-5 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#0F0F0F,#1a1a1a)' }}>
                <div className="absolute right-4 top-4 opacity-10">{Icon.trending}</div>
                <div className="flex items-center gap-2 mb-2">
                  {Icon.trending}
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Performance ventes</p>
                </div>
                <p className="font-black text-3xl mb-3">
                  {totalRevenue.toLocaleString('fr-FR')} <span className="text-lg opacity-50">FCFA</span>
                </p>
                <div className="flex gap-5">
                  <div>
                    <p className="font-black text-lg">{completedSales.length}</p>
                    <p className="text-[8px] uppercase font-bold opacity-50">Ventes réalisées</p>
                  </div>
                  <div className="w-px bg-white/10"/>
                  <div>
                    <p className="font-black text-lg">{avgOrder > 0 ? avgOrder.toLocaleString('fr-FR') : '—'}</p>
                    <p className="text-[8px] uppercase font-bold opacity-50">Panier moyen (F)</p>
                  </div>
                  {reviewCount > 0 && (
                    <>
                      <div className="w-px bg-white/10"/>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400">{Icon.star}</span>
                          <p className="font-black text-lg">{avgRating.toFixed(1)}</p>
                        </div>
                        <p className="text-[8px] uppercase font-bold opacity-50">Note moy.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Commandes en cours */}
            {activeOrders.length > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <div className="w-7 h-7 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                      {Icon.order}
                    </div>
                    <p className="font-black text-[11px] uppercase tracking-widest">En cours</p>
                  </div>
                  <button onClick={() => setActiveTab('commandes')}
                    className="text-[9px] font-black text-green-600 uppercase flex items-center gap-1">
                    Voir tout {Icon.arrowRight}
                  </button>
                </div>
                <div className="space-y-2">
                  {activeOrders.slice(0, 3).map((o: Order) => (
                    <button key={o.id} onClick={() => onOpenOrder?.(o.id)}
                      className="w-full flex items-center gap-3 py-2.5 active:opacity-70 text-left rounded-2xl">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        {o.productImage && <img src={o.productImage} alt="" className="w-full h-full object-cover"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-[10px] truncate">{o.productTitle}</p>
                        <p className="text-[8px] text-slate-400">{o.buyerName} · {o.totalAmount?.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                      <StatusBadge status={o.status}/>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════ ARTICLES ══════════════ */}
        {activeTab === 'articles' && (
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-10 text-center">
                <div className="w-8 h-8 border-4 border-slate-100 border-t-green-600 rounded-full animate-spin mx-auto mb-3"/>
                <p className="text-[9px] text-slate-400 font-black uppercase">Chargement…</p>
              </div>
            ) : products.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-3">
                  {Icon.box}
                </div>
                <p className="font-black text-slate-400 text-[10px] uppercase">Aucun article publié</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {[...products].sort((a: Product, b: Product) => (b.whatsappClickCount || 0) - (a.whatsappClickCount || 0)).map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-[11px] truncate">{p.title}</p>
                      <p className="text-[9px] text-slate-500 font-bold">
                        {p.price.toLocaleString('fr-FR')} FCFA
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="ml-1 text-red-500">
                            -{Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}%
                          </span>
                        )}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[8px] text-slate-400 flex items-center gap-0.5">
                          <span className="text-slate-300">{Icon.chat}</span> {p.whatsappClickCount || 0}
                        </span>
                        {!isSimple && (
                          <span className="text-[8px] text-slate-400 flex items-center gap-0.5">
                            <span className="text-slate-300">{Icon.eye}</span> {p.viewCount || 0}
                          </span>
                        )}
                        {p.quantity && p.quantity > 1 && (
                          <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 rounded font-bold">{p.quantity} en stock</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-[8px] font-black px-2 py-1 rounded-lg ${
                        p.status === 'sold' ? 'bg-slate-100 text-slate-400' : 'bg-green-100 text-green-700'}`}>
                        {p.status === 'sold' ? 'Vendu' : 'Actif'}
                      </span>
                      {onEditProduct && p.status !== 'sold' && (
                        <button onClick={() => onEditProduct(p)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 active:scale-90 transition-all text-slate-500">
                          {Icon.edit}
                        </button>
                      )}
                      {p.status !== 'sold' && (
                        <button onClick={() => setBoostProduct(p)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-amber-50 active:scale-90 transition-all"
                          title="Booster l'annonce">
                          <span className="text-[14px]">⚡</span>
                        </button>
                      )}
                      {/* Compte à rebours si boost actif */}
                      {activeBoosts[p.id] && (
                        <CountdownBadge expiresAt={activeBoosts[p.id].expiresAt} size="sm"/>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ COMMANDES ══════════════ */}
        {activeTab === 'commandes' && (
          activeOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-3">
                {Icon.order}
              </div>
              <p className="font-black text-slate-400 text-[10px] uppercase">Aucune commande en cours</p>
              <p className="text-slate-300 text-[9px] font-bold mt-1">Les nouvelles commandes apparaîtront ici</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-50">
                {activeOrders.map((o: Order) => (
                  <button key={o.id} onClick={() => onOpenOrder?.(o.id)}
                    className="w-full flex items-center gap-3 p-4 active:bg-slate-50 text-left">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                      {o.productImage && <img src={o.productImage} alt="" className="w-full h-full object-cover"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-[11px] truncate">{o.productTitle}</p>
                      <p className="text-[9px] text-slate-500 font-bold">{o.buyerName}</p>
                      <p className="text-[9px] text-slate-400">{o.totalAmount?.toLocaleString('fr-FR')} FCFA · {fmt(o.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={o.status}/>
                      <span className="text-slate-300">{Icon.arrowRight}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {/* ══════════════ OFFRES ══════════════ */}
        {activeTab === 'offres' && (
          pendingOffers.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-3">💰</div>
              <p className="font-black text-slate-400 text-[10px] uppercase">Aucune offre en attente</p>
              <p className="text-slate-300 text-[9px] font-bold mt-1">Les offres de tes acheteurs apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOffers.map((offer: any) => (
                <div key={offer.msgId} className="bg-white rounded-3xl border-2 border-amber-200 overflow-hidden shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                      {offer.productRef?.image && <img src={offer.productRef.image} alt="" className="w-full h-full object-cover"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Offre de {offer.buyerName}</p>
                      <p className="font-black text-slate-900 text-[13px]">{offer.offerPrice.toLocaleString('fr-FR')} FCFA</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] text-slate-400 truncate">{offer.productTitle}</p>
                        {offer.productRef?.price && (
                          <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-lg font-bold">
                            Prix demandé : {offer.productRef.price.toLocaleString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                    {offer.productRef?.price && (
                      <div className={`text-center flex-shrink-0 px-2 py-1 rounded-xl ${
                        offer.offerPrice < offer.productRef.price * 0.7 ? 'bg-red-50' : offer.offerPrice >= offer.productRef.price * 0.9 ? 'bg-green-50' : 'bg-amber-50'
                      }`}>
                        <p className={`font-black text-[11px] ${
                          offer.offerPrice < offer.productRef.price * 0.7 ? 'text-red-600' : offer.offerPrice >= offer.productRef.price * 0.9 ? 'text-green-700' : 'text-amber-700'
                        }`}>
                          -{Math.round((1 - offer.offerPrice / offer.productRef.price) * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!userProfile) return;
                        setRespondingOffer(offer.msgId);
                        try { await respondToOffer(offer.convId, offer.msgId, userProfile.id, userProfile.name, 'refused', userProfile.photoURL); }
                        finally { setRespondingOffer(null); }
                      }}
                      disabled={respondingOffer === offer.msgId}
                      className="flex-1 py-3 rounded-2xl bg-red-100 text-red-700 font-black text-[10px] uppercase active:scale-95 transition-all disabled:opacity-50">
                      ❌ Refuser
                    </button>
                    <button
                      onClick={() => onOpenChat?.(offer.convId)}
                      className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-[10px] uppercase active:scale-95 transition-all">
                      💬 Discuter
                    </button>
                    <button
                      onClick={async () => {
                        if (!userProfile) return;
                        setRespondingOffer(offer.msgId);
                        try { await respondToOffer(offer.convId, offer.msgId, userProfile.id, userProfile.name, 'accepted', userProfile.photoURL); }
                        finally { setRespondingOffer(null); }
                      }}
                      disabled={respondingOffer === offer.msgId}
                      className="flex-[2] py-3 rounded-2xl text-white font-black text-[10px] uppercase active:scale-95 transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                      {respondingOffer === offer.msgId ? '...' : '✅ Accepter'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ══════════════ VENTES — Vérifié/Premium ══════════════ */}
        {activeTab === 'ventes' && !isSimple && (
          <>
            {/* Hero revenus */}
            <div className="rounded-3xl p-5 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#0F0F0F,#1a1a1a)' }}>
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/5"/>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1 flex items-center gap-1.5">
                {Icon.trending} Revenus totaux
              </p>
              <p className="font-black text-3xl mb-3">
                {totalRevenue.toLocaleString('fr-FR')} <span className="text-lg opacity-50">FCFA</span>
              </p>
              <div className="flex gap-5">
                <div>
                  <p className="font-black text-xl">{completedSales.length}</p>
                  <p className="text-[8px] uppercase font-bold opacity-50">Ventes</p>
                </div>
                <div className="w-px bg-white/10"/>
                <div>
                  <p className="font-black text-xl">{avgOrder > 0 ? avgOrder.toLocaleString('fr-FR') : '—'}</p>
                  <p className="text-[8px] uppercase font-bold opacity-50">Panier moyen (F)</p>
                </div>
              </div>
            </div>

            {completedSales.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm">
                <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-3">
                  {Icon.coin}
                </div>
                <p className="font-black text-slate-400 text-[10px] uppercase">Aucune vente complétée</p>
                <p className="text-slate-300 text-[9px] font-bold mt-1">Tes ventes livrées apparaîtront ici</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-50">
                  {completedSales.map((o: Order) => (
                    <button key={o.id} onClick={() => onOpenOrder?.(o.id)}
                      className="w-full flex items-center gap-3 p-4 active:bg-slate-50 text-left">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                        {o.productImage && <img src={o.productImage} alt="" className="w-full h-full object-cover"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-[11px] truncate">{o.productTitle}</p>
                        <p className="text-[9px] text-slate-500 font-bold">{o.buyerName}</p>
                        <p className="text-[9px] text-slate-400">{fmt(o.createdAt)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-green-700 text-sm">+{(o.sellerReceives || o.totalAmount || 0).toLocaleString('fr-FR')}</p>
                        <p className="text-[8px] text-slate-400 font-bold">FCFA</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
