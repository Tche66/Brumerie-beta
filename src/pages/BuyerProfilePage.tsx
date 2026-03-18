// src/pages/BuyerProfilePage.tsx — v19 : Favoris + Articles achetés
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProductCard } from '@/components/ProductCard';
import { removeBookmark } from '@/services/bookmarkService';
import { getProducts } from '@/services/productService';
import { subscribeOrdersAsBuyer } from '@/services/orderService';
import { Product, Order } from '@/types';

interface BuyerProfilePageProps {
  onProductClick: (product: Product) => void;
  onNavigate?: (page: string) => void;
  onOpenOrder?: (orderId: string) => void;
}

type Tab = 'favorites' | 'purchases';

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

export function BuyerProfilePage({ onProductClick, onNavigate, onOpenOrder }: BuyerProfilePageProps) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('favorites');

  // — Favoris —
  const [bookmarkedProducts, setBookmarkedProducts] = useState<Product[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [loadingFavs, setLoadingFavs] = useState(true);

  // — Commandes achetées —
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => { loadBookmarks(); }, [userProfile?.bookmarkedProductIds]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeOrdersAsBuyer(currentUser.uid, (ords) => {
      setOrders(ords);
      setLoadingOrders(false);
    });
    return unsub;
  }, [currentUser]);

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
      <div className="flex border-b border-slate-100 bg-white sticky top-0 z-30">
        {([
          { id: 'favorites' as Tab, label: '❤️ Favoris',         count: bookmarkIds.size },
          { id: 'purchases' as Tab, label: '🛍️ Mes achats',      count: orders.length },
        ] as { id: Tab; label: string; count: number }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === t.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 border-b-2 border-transparent'
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
              }`}>{t.count}</span>
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
        {/* Adresse Address-Web acheteur */}
        {userProfile?.awAddressCode ? (
          <a href={`https://addressweb.brumerie.com/${userProfile.awAddressCode}`}
            target="_blank" rel="noopener noreferrer"
            className="w-full py-4 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em] border-2 border-green-200 text-green-700 bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-2">
            📍 {userProfile.awAddressCode}
          </a>
        ) : (
          <a href="https://addressweb.brumerie.com/creer" target="_blank" rel="noopener noreferrer"
            className="w-full py-4 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em] border-2 border-dashed border-slate-200 text-slate-400 bg-white active:scale-95 transition-all flex items-center justify-center gap-2">
            📍 Créer mon adresse de livraison gratuite
          </a>
        )}
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
