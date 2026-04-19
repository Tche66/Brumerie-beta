// src/pages/DelivererDashboardPage.tsx — v18 BruMove
// Interface dédiée livreur : Accueil | Radar | Gains | Profil
// Inspire du prototype BruMove — sans wallet, juste historique + compteur gains

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeDelivererOrders,
  subscribeOpenOrdersInZone,
  toggleDelivererAvailability,
  rejectDelivery,
} from '@/services/deliveryService';
import { EditDelivererProfilePage } from '@/pages/EditDelivererProfilePage';
import { QRDisplay } from '@/components/QRDisplay';
import { buildQRPayload } from '@/utils/qrCode';
import type { Order } from '@/types';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Props {
  onNavigate: (page: string) => void;
  onChat: (userId: string, userName: string) => void;
}

type Tab = 'home' | 'radar' | 'earnings' | 'profile';

// ── Helpers gains ─────────────────────────────────────────────
function getStartOfDay()   { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); }
function getStartOfWeek()  { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); }
function getStartOfMonth() { const d = new Date(); d.setHours(0,0,0,0); d.setDate(1); return d.getTime(); }

function getOrderTimestamp(order: any): number {
  return order.deliveredAt?.toMillis?.() ?? order.deliveredAt?.seconds * 1000 ?? 0;
}

export function DelivererDashboardPage({ onNavigate, onChat }: Props) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [tab, setTab]               = useState<Tab>('home');
  const [orders, setOrders]         = useState<Order[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [available, setAvailable]   = useState(userProfile?.deliveryAvailable ?? true);
  const [toggling, setToggling]     = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showQRDelivery, setShowQRDelivery]   = useState<Order | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    return subscribeDelivererOrders(currentUser.uid, setOrders);
  }, [currentUser?.uid]);

  useEffect(() => {
    const zones = userProfile?.deliveryZones || [];
    if (!zones.length) return;
    return subscribeOpenOrdersInZone(zones, setOpenOrders);
  }, [JSON.stringify(userProfile?.deliveryZones)]);

  // ── Calculs ──────────────────────────────────────────────────
  const myDone     = orders.filter(o => ['delivered','cod_delivered'].includes(o.status));
  const myOngoing  = orders.filter(o => ['ready','cod_confirmed','picked','cod_delivered'].includes(o.status));
  const myAssigned = orders.filter(o => o.status === 'confirmed');
  const openInZone = openOrders.filter(o => !orders.some(m => m.id === o.id));
  const allMissions = [...myAssigned, ...openInZone];

  const now = Date.now();
  const gainsToday = myDone.filter(o => getOrderTimestamp(o) >= getStartOfDay()).reduce((s,o) => s + ((o as any).deliveryFee || 0), 0);
  const gainsWeek  = myDone.filter(o => getOrderTimestamp(o) >= getStartOfWeek()).reduce((s,o) => s + ((o as any).deliveryFee || 0), 0);
  const gainsMonth = myDone.filter(o => getOrderTimestamp(o) >= getStartOfMonth()).reduce((s,o) => s + ((o as any).deliveryFee || 0), 0);
  const totalGains = myDone.reduce((s,o) => s + ((o as any).deliveryFee || 0), 0) || userProfile?.totalEarnings || 0;
  const totalCount = myDone.length || userProfile?.totalDeliveries || 0;

  // Dernière livraison terminée (notification course terminée)
  const lastDone = myDone.sort((a,b) => getOrderTimestamp(b) - getOrderTimestamp(a))[0];
  const lastFee  = lastDone ? ((lastDone as any).deliveryFee || 0) : 0;
  const showLastDone = lastDone && (now - getOrderTimestamp(lastDone)) < 3600000; // < 1h

  const handleToggle = async () => {
    if (!currentUser) return;
    setToggling(true);
    await toggleDelivererAvailability(currentUser.uid, !available);
    setAvailable(v => !v);
    await refreshUserProfile();
    setToggling(false);
  };

  if (showEditProfile) {
    return <EditDelivererProfilePage onBack={() => setShowEditProfile(false)} onSaved={() => { setShowEditProfile(false); refreshUserProfile(); }}/>;
  }
  if (showQRDelivery) {
    const ord = showQRDelivery as any;
    return <QRDisplay title="Mon QR de livraison" subtitle="Montre ce QR à l'acheteur"
      code={ord.deliveryCode || '------'}
      qrPayload={ord.qrDeliveryPayload || buildQRPayload('delivery', showQRDelivery.id, ord.deliveryCode || '')}
      color="#D97706" emoji="🛵"
      instruction="L'acheteur va scanner ce QR pour confirmer la réception."
      onClose={() => setShowQRDelivery(null)}/>;
  }

  // ── BOTTOM NAV interne ────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'home', label: 'Accueil',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
    },
    {
      id: 'radar', label: 'Radar',
      badge: allMissions.length + myOngoing.length,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>,
    },
    {
      id: 'earnings', label: 'Gains',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    },
    {
      id: 'profile', label: 'Profil',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
  ];

  const orange = '#E05A00';

  return (
    <div className="min-h-screen font-sans pb-24" style={{ background: '#F5F5F5' }}>

      {/* ══════════════════════════════════════
          TAB : ACCUEIL
      ══════════════════════════════════════ */}
      {tab === 'home' && (
        <div>
          {/* Header hero orange */}
          <div className="px-5 pt-14 pb-6" style={{ background: `linear-gradient(160deg, ${orange}, #FF7A1A)` }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white/20 flex-shrink-0">
                  {userProfile?.photoURL
                    ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-white font-black text-lg">{(userProfile?.name || 'L').charAt(0).toUpperCase()}</div>
                  }
                </div>
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Bonjour 👋</p>
                  <p className="text-white font-black text-[15px] leading-tight">{userProfile?.name || 'Livreur'}</p>
                  {userProfile?.phone && <p className="text-white/60 text-[10px] font-bold">{userProfile.phone}</p>}
                </div>
              </div>
              {/* Toggle dispo */}
              <button onClick={handleToggle} disabled={toggling}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95"
                style={{ background: available ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)', color: 'white' }}>
                <div className={`w-2 h-2 rounded-full ${available ? 'bg-green-300 animate-pulse' : 'bg-white/40'}`}/>
                {toggling ? '...' : available ? 'En service' : 'Hors service'}
              </button>
            </div>

            {/* Gains aujourd'hui */}
            <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-5">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Gains d'aujourd'hui</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white font-black leading-none" style={{ fontSize: '2.4rem' }}>
                    {gainsToday.toLocaleString('fr-FR')} <span className="text-[1.2rem] opacity-80">FCFA</span>
                  </p>
                  <div className="flex gap-5 mt-3">
                    <div>
                      <p className="text-white/60 text-[9px] uppercase font-bold">Courses</p>
                      <p className="text-white font-black text-[18px]">
                        {myDone.filter(o => getOrderTimestamp(o) >= getStartOfDay()).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-[9px] uppercase font-bold">En cours</p>
                      <p className="text-white font-black text-[18px]">{myOngoing.length}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-[9px] uppercase font-bold">Disponibles</p>
                      <p className="text-white font-black text-[18px]">{openInZone.length}</p>
                    </div>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pt-4 space-y-3">
            {/* Notification course terminée */}
            {showLastDone && lastFee > 0 && (
              <div className="rounded-3xl p-5 flex items-center gap-4"
                style={{ background: `linear-gradient(135deg, ${orange}20, ${orange}08)`, border: `1px solid ${orange}30` }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${orange}20` }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={orange} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <p className="font-black text-[14px]" style={{ color: orange }}>Course terminée !</p>
                  <p className="text-slate-600 text-[11px] font-bold">+{lastFee.toLocaleString('fr-FR')} FCFA ajoutés à tes gains</p>
                </div>
              </div>
            )}

            {/* 3 cartes stats semaine/mois/total */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Aujourd'hui", value: gainsToday, color: orange, bg: '#FFF5EE' },
                { label: 'Cette semaine', value: gainsWeek, color: '#8B5CF6', bg: '#F5F3FF' },
                { label: 'Ce mois', value: gainsMonth, color: '#16A34A', bg: '#F0FDF4' },
              ].map(k => (
                <div key={k.label} className="rounded-2xl p-3 text-center"
                  style={{ background: k.bg }}>
                  <svg className="mx-auto mb-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={k.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                  <p className="font-black text-[15px] leading-none" style={{ color: k.color }}>{k.value.toLocaleString('fr-FR')}</p>
                  <p className="text-[8px] font-black text-slate-500 uppercase mt-1 leading-tight">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Mission disponible — carte principale */}
            {openInZone.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {openInZone.length} course{openInZone.length > 1 ? 's' : ''} dans ta zone
                </p>
                <MissionCardCompact
                  order={openInZone[0]}
                  isAssigned={false}
                  onChatBuyer={() => openInZone[0].buyerId && onChat(openInZone[0].buyerId, openInZone[0].buyerName)}
                  onChatSeller={() => openInZone[0].sellerId && onChat(openInZone[0].sellerId, openInZone[0].sellerName)}
                  onViewAll={() => setTab('radar')}
                  showViewAll={openInZone.length > 1}
                />
              </div>
            )}

            {/* En cours */}
            {myOngoing.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  🛵 {myOngoing.length} livraison{myOngoing.length > 1 ? 's' : ''} en cours
                </p>
                {myOngoing.slice(0, 2).map(order => (
                  <ActiveDeliveryCard key={order.id} order={order}
                    onChatBuyer={() => order.buyerId && onChat(order.buyerId, order.buyerName)}
                    onChatSeller={() => order.sellerId && onChat(order.sellerId, order.sellerName)}
                    currentDelivererId={currentUser?.uid}
                    currentDelivererName={userProfile?.name || ''}
                  />
                ))}
              </div>
            )}

            {/* État vide */}
            {openInZone.length === 0 && myOngoing.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${orange}15` }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={orange} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                </div>
                <p className="font-black text-slate-700 text-[14px] mb-1">Aucune mission</p>
                <p className="text-[11px] text-slate-400">Aucune commande dans ta zone pour l'instant</p>
                {!available && (
                  <button onClick={handleToggle} className="mt-4 px-6 py-3 rounded-2xl font-black text-[11px] uppercase text-white active:scale-95"
                    style={{ background: `linear-gradient(135deg,${orange},#FF7A1A)` }}>
                    Activer ma disponibilité
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB : RADAR
      ══════════════════════════════════════ */}
      {tab === 'radar' && (
        <div>
          <div className="px-5 pt-14 pb-4" style={{ background: `linear-gradient(160deg, ${orange}, #FF7A1A)` }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-white font-black text-[20px] uppercase tracking-tight">Radar</h1>
                <p className="text-white/70 text-[10px] font-bold">
                  {allMissions.length + myOngoing.length} mission{allMissions.length + myOngoing.length !== 1 ? 's' : ''} active{allMissions.length + myOngoing.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={handleToggle} disabled={toggling}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl font-black text-[10px] uppercase text-white active:scale-95"
                style={{ background: available ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }}>
                <div className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-green-300 animate-pulse' : 'bg-white/40'}`}/>
                {available ? 'Dispo' : 'Indispo'}
              </button>
            </div>
          </div>

          <div className="px-4 pt-4 space-y-4">
            {!available && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <p className="font-black text-amber-700 text-[12px]">Tu es hors service</p>
                <p className="text-amber-600 text-[11px]">Active ta disponibilité pour accepter des courses</p>
              </div>
            )}

            {/* En cours */}
            {myOngoing.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">🛵 En cours ({myOngoing.length})</p>
                {myOngoing.map(order => (
                  <ActiveDeliveryCard key={order.id} order={order}
                    onChatBuyer={() => order.buyerId && onChat(order.buyerId, order.buyerName)}
                    onChatSeller={() => order.sellerId && onChat(order.sellerId, order.sellerName)}
                    currentDelivererId={currentUser?.uid}
                    currentDelivererName={userProfile?.name || ''}
                  />
                ))}
              </div>
            )}

            {/* Assignées */}
            {myAssigned.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">📌 Assignées à toi ({myAssigned.length})</p>
                {myAssigned.map(order => (
                  <MissionCard key={order.id} order={order} isAssigned={true}
                    onChatBuyer={() => order.buyerId && onChat(order.buyerId, order.buyerName)}
                    onChatSeller={() => order.sellerId && onChat(order.sellerId, order.sellerName)}
                    currentDelivererId={currentUser?.uid}
                    currentDelivererName={userProfile?.name || ''}
                  />
                ))}
              </div>
            )}

            {/* Disponibles dans la zone */}
            {openInZone.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">🌍 Disponibles dans ta zone ({openInZone.length})</p>
                {openInZone.map(order => (
                  <MissionCard key={order.id} order={order} isAssigned={false}
                    onChatBuyer={() => order.buyerId && onChat(order.buyerId, order.buyerName)}
                    onChatSeller={() => order.sellerId && onChat(order.sellerId, order.sellerName)}
                  />
                ))}
              </div>
            )}

            {allMissions.length === 0 && myOngoing.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📡</div>
                <p className="font-black text-slate-400 text-[13px]">Aucune mission disponible</p>
                <p className="text-[10px] text-slate-400 mt-2">Reviens plus tard ou vérifie tes zones de livraison</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB : GAINS
      ══════════════════════════════════════ */}
      {tab === 'earnings' && (
        <div>
          <div className="px-5 pt-14 pb-6" style={{ background: `linear-gradient(160deg, ${orange}, #FF7A1A)` }}>
            <h1 className="text-white font-black text-[20px] uppercase tracking-tight mb-4">Mes Gains</h1>
            {/* Total cumulé */}
            <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-5 mb-4">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total cumulé</p>
              <p className="text-white font-black leading-none mb-1" style={{ fontSize: '2.2rem' }}>
                {totalGains.toLocaleString('fr-FR')} <span className="text-[1.1rem] opacity-80">FCFA</span>
              </p>
              <p className="text-white/70 text-[11px] font-bold">{totalCount} livraison{totalCount !== 1 ? 's' : ''} réalisée{totalCount !== 1 ? 's' : ''}</p>
            </div>
            {/* 3 périodes */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Aujourd'hui", value: gainsToday },
                { label: 'Cette semaine', value: gainsWeek },
                { label: 'Ce mois', value: gainsMonth },
              ].map(k => (
                <div key={k.label} className="bg-white/15 rounded-2xl p-3 text-center">
                  <p className="text-white font-black text-[17px] leading-none">{k.value.toLocaleString('fr-FR')}</p>
                  <p className="text-white/60 text-[8px] font-bold uppercase mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 pt-4 space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Historique des gains</p>

            {myDone.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
                <p className="text-3xl mb-3">📦</p>
                <p className="font-black text-slate-400 text-[13px]">Aucune livraison pour l'instant</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myDone.sort((a,b) => getOrderTimestamp(b) - getOrderTimestamp(a)).map(order => {
                  const ord = order as any;
                  const fee = ord.deliveryFee || 0;
                  const ts  = getOrderTimestamp(order);
                  const dateStr = ts ? new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null;
                  const timeStr = ts ? new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;
                  return (
                    <div key={order.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${orange}15` }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={orange} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-[12px] truncate">{order.productTitle}</p>
                          <p className="text-[10px] text-slate-500">{ord.sellerNeighborhood || '—'} → {ord.buyerNeighborhood || '—'}</p>
                          {dateStr && <p className="text-[9px] text-slate-400">{dateStr} à {timeStr}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-[15px]" style={{ color: orange }}>+{fee.toLocaleString('fr-FR')}</p>
                          <p className="text-[9px] text-slate-400 font-bold">FCFA</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Courses refusées */}
            {(() => {
              const rejected = orders.filter(o => (o as any).rejectedDeliverers?.some((r: any) => r.delivererId === currentUser?.uid));
              if (!rejected.length) return null;
              return (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Refusées ({rejected.length})</p>
                  {rejected.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl border border-red-100 overflow-hidden mb-2">
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 text-lg">✕</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-700 text-[12px] truncate">{order.productTitle}</p>
                          <p className="text-[10px] text-slate-500">{(order as any).sellerNeighborhood} → {(order as any).buyerNeighborhood}</p>
                        </div>
                        <span className="text-[9px] bg-red-50 text-red-600 font-black px-2 py-0.5 rounded-full">Refusé</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB : PROFIL
      ══════════════════════════════════════ */}
      {tab === 'profile' && (
        <div>
          <div className="px-5 pt-14 pb-8" style={{ background: `linear-gradient(160deg, ${orange}, #FF7A1A)` }}>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[2rem] overflow-hidden bg-white/20 border-4 border-white/30 shadow-xl mb-3">
                {userProfile?.photoURL
                  ? <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full flex items-center justify-center text-white font-black text-4xl">{(userProfile?.name || 'L').charAt(0).toUpperCase()}</div>
                }
              </div>
              <h2 className="text-white font-black text-[18px] uppercase tracking-tight">{userProfile?.name || 'Livreur'}</h2>
              {userProfile?.phone && <p className="text-white/70 text-[11px] font-bold">{userProfile.phone}</p>}
              {(userProfile?.deliveryZones || []).length > 0 && (
                <p className="text-white/70 text-[10px] mt-1">📍 {(userProfile?.deliveryZones || []).join(' · ')}</p>
              )}
              {/* Stats */}
              <div className="flex gap-6 mt-4">
                <div className="text-center">
                  <p className="text-white font-black text-[20px]">{totalCount}</p>
                  <p className="text-white/60 text-[9px] uppercase font-bold">Livraisons</p>
                </div>
                <div className="w-px bg-white/20"/>
                <div className="text-center">
                  <p className="text-white font-black text-[20px]">{totalGains.toLocaleString('fr-FR')}</p>
                  <p className="text-white/60 text-[9px] uppercase font-bold">FCFA gagnés</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pt-4 space-y-3">
            {/* Bio */}
            {userProfile?.deliveryBio && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">À propos</p>
                <p className="text-[12px] text-slate-600 leading-relaxed">"{userProfile.deliveryBio}"</p>
              </div>
            )}

            {/* Tarifs */}
            {(userProfile?.deliveryRates || []).length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Mes tarifs</p>
                {(userProfile?.deliveryRates || []).map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <p className="text-[12px] text-slate-600 font-medium">{r.fromZone} → {r.toZone === 'same' ? 'même quartier' : r.toZone}</p>
                    <p className="font-black text-slate-900 text-[13px]">{r.price.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <button onClick={() => setShowEditProfile(true)}
              className="w-full py-4 bg-white rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-700 active:scale-95 transition-all border border-slate-100 flex items-center justify-center gap-2">
              ✏️ Modifier mon profil livreur
            </button>
            <button onClick={() => onNavigate('settings')}
              className="w-full py-4 bg-white rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-500 active:scale-95 transition-all border border-slate-100 flex items-center justify-center gap-2">
              ⚙️ Paramètres
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV LIVREUR ── */}
      <nav className="fixed bottom-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100"
        style={{ maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)' }}>
        <div className="flex items-center justify-around h-16 px-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-0.5 py-2 px-4 relative transition-all active:scale-95"
              style={{ color: tab === t.id ? orange : '#94A3B8' }}>
              {t.badge && t.badge > 0 ? (
                <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                  style={{ background: orange }}>{t.badge > 9 ? '9+' : t.badge}</span>
              ) : null}
              {t.icon}
              <span className="text-[9px] font-black uppercase tracking-tight">{t.label}</span>
              {tab === t.id && <div className="absolute -bottom-0 w-4 h-0.5 rounded-full" style={{ background: orange }}/>}
            </button>
          ))}
        </div>
        <div className="h-safe-area-inset-bottom"/>
      </nav>
    </div>
  );
}

// ── MissionCardCompact — carte mission sur la page Accueil ─────
function MissionCardCompact({ order, isAssigned, onChatBuyer, onChatSeller, onViewAll, showViewAll }: {
  order: Order; isAssigned: boolean;
  onChatBuyer: () => void; onChatSeller: () => void;
  onViewAll?: () => void; showViewAll?: boolean;
}) {
  const ord = order as any;
  const orange = '#E05A00';
  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
      {/* Barre colorée */}
      <div className="h-1.5" style={{ background: `linear-gradient(90deg,${orange},#FF7A1A)` }}/>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
            {ord.productImage
              ? <img src={ord.productImage} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-[13px] truncate">{order.productTitle}</p>
            <p className="text-[11px] text-slate-500">{ord.sellerNeighborhood || '—'} → {ord.buyerNeighborhood || '—'}</p>
            {ord.isCOD && <p className="text-[10px] font-bold text-blue-600 mt-0.5">💵 Paiement à la livraison</p>}
          </div>
          {ord.deliveryFee > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="font-black text-[16px]" style={{ color: orange }}>{(ord.deliveryFee || 0).toLocaleString('fr-FR')}</p>
              <p className="text-[9px] text-slate-400 font-bold">FCFA</p>
            </div>
          )}
        </div>

        {/* Trajet visuel */}
        <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-3 mb-3">
          <div className="flex flex-col items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"/>
            <div className="w-px h-5 bg-slate-200"/>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"/>
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-[8px] text-slate-400 uppercase font-bold">Collecte</p>
              <p className="text-[11px] font-black text-slate-800">{ord.sellerName || ord.sellerNeighborhood || '—'}</p>
            </div>
            <div>
              <p className="text-[8px] text-slate-400 uppercase font-bold">Livraison</p>
              <p className="text-[11px] font-black text-slate-800">{ord.buyerNeighborhood || '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onChatSeller}
            className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-1.5"
            style={{ background: `linear-gradient(135deg,${orange},#FF7A1A)` }}>
            Contacter vendeur
          </button>
          <button onClick={onChatBuyer}
            className="py-3 px-4 rounded-2xl bg-slate-100 font-black text-[11px] text-slate-600 active:scale-95 transition-all">
            👤
          </button>
        </div>
        {showViewAll && onViewAll && (
          <button onClick={onViewAll}
            className="w-full mt-2 py-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            style={{ color: orange }}>
            Voir toutes les courses →
          </button>
        )}
      </div>
    </div>
  );
}

// ── MissionCard (Radar) ───────────────────────────────────────
function MissionCard({ order, isAssigned, onChatSeller, onChatBuyer, currentDelivererId, currentDelivererName }: {
  order: Order; isAssigned: boolean;
  onChatSeller: () => void; onChatBuyer: () => void;
  currentDelivererId?: string; currentDelivererName?: string;
}) {
  const ord = order as any;
  const orange = '#E05A00';
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 mb-3 ${isAssigned ? 'border-amber-400' : 'border-orange-300'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
          {ord.productImage ? <img src={ord.productImage} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 text-[13px] truncate">{order.productTitle}</p>
          <p className="text-[11px] text-slate-500">{ord.sellerNeighborhood} → {ord.buyerNeighborhood}</p>
          {ord.isCOD && <p className="text-[10px] font-bold text-blue-600">💵 COD</p>}
        </div>
        <div className="text-right">
          {ord.deliveryFee > 0 ? (
            <><p className="font-black text-[15px]" style={{ color: orange }}>{(ord.deliveryFee || 0).toLocaleString('fr-FR')}</p><p className="text-[9px] text-slate-400">FCFA</p></>
          ) : (
            <p className="text-[10px] text-slate-400">Tarif libre</p>
          )}
        </div>
      </div>
      {isAssigned && (
        <div className="bg-amber-50 rounded-xl p-2 mb-3 border border-amber-100">
          <p className="text-[10px] font-black text-amber-700">⏳ Assigné — attente code vendeur</p>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onChatBuyer} className="flex-1 py-2.5 rounded-xl bg-blue-50 font-black text-[10px] text-blue-600 active:scale-95 flex items-center justify-center gap-1">👤 Acheteur</button>
        <button onClick={onChatSeller} className="flex-1 py-2.5 rounded-xl bg-slate-100 font-black text-[10px] text-slate-600 active:scale-95 flex items-center justify-center gap-1">🏪 Vendeur</button>
      </div>
      {isAssigned && currentDelivererId && currentDelivererName && (
        <div className="mt-2">
          <RejectDeliveryButton order={order} delivererId={currentDelivererId} delivererName={currentDelivererName}/>
        </div>
      )}
    </div>
  );
}

// ── ActiveDeliveryCard, RejectDeliveryButton, CODStepsBlock etc. ─
// Tous les composants métier conservés à l'identique
function RejectDeliveryButton({ order, delivererId, delivererName }: { order: Order; delivererId: string; delivererName: string }) {
  const [showModal, setShowModal] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const QUICK_REASONS = ['Zone trop éloignée','Indisponible à cet horaire','Colis trop lourd','Problème avec le vendeur','Autre raison'];
  const handleReject = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    const result = await rejectDelivery({ orderId: order.id, delivererId, delivererName, reason: reason.trim(), order });
    setLoading(false);
    if (result.success) { setDone(true); setShowModal(false); }
  };
  if (done) return <div className="w-full py-2 rounded-xl bg-slate-100 flex items-center justify-center"><span className="text-[10px] font-black text-slate-500">✓ Course refusée</span></div>;
  return (
    <>
      <button onClick={() => setShowModal(true)} className="w-full py-2.5 rounded-xl bg-red-50 border border-red-100 font-black text-[10px] text-red-600 uppercase tracking-widest active:scale-95">✕ Refuser cette mission</button>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[500] flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-7 space-y-5 shadow-2xl">
            <div className="w-10 h-1.5 bg-slate-100 rounded-full mx-auto"/>
            <div className="text-center"><p className="text-2xl mb-2">⚠️</p><h3 className="font-black text-slate-900 text-[16px]">Refuser la mission</h3></div>
            <div className="flex flex-wrap gap-2">{QUICK_REASONS.map(r => <button key={r} onClick={() => setReason(r)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black ${reason === r ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{r}</button>)}</div>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Précise le motif..." rows={2} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-[12px] outline-none resize-none"/>
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setReason(''); }} className="flex-1 py-3.5 rounded-2xl bg-slate-100 font-black text-[11px] uppercase text-slate-600">Annuler</button>
              <button onClick={handleReject} disabled={!reason.trim() || loading} className="flex-1 py-3.5 rounded-2xl font-black text-[11px] uppercase text-white bg-red-500 disabled:opacity-40">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/> : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CashPickupButton({ orderId, order }: { orderId: string; order: Order }) {
  const [loading, setLoading] = React.useState(false);
  const [signed, setSigned] = React.useState(false);
  const alreadyPicked = order.status === 'picked';
  const handleSign = async () => {
    setLoading(true);
    try { await updateDoc(doc(db, 'orders', orderId), { status: 'picked', deliveryPickedAt: serverTimestamp() }); setSigned(true); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  if (alreadyPicked || signed) return <div className="rounded-xl border-2 border-green-300 bg-green-50 p-3 mb-3 flex items-center gap-2"><span>✅</span><p className="text-[11px] font-black text-green-800">Colis récupéré — en route</p></div>;
  return (
    <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-3 mb-3">
      <p className="text-[10px] font-black text-orange-800 mb-2">📦 Confirmer récupération du colis</p>
      <button onClick={handleSign} disabled={loading} className="w-full py-2.5 rounded-xl font-black text-[11px] uppercase text-white active:scale-95 disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#D4500F,#ea580c)' }}>
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/> : '✍️ Colis récupéré chez le vendeur'}
      </button>
    </div>
  );
}

function MobileDeliveryButtons({ orderId, order }: { orderId: string; order: Order }) {
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const ord = order as any;
  if (done) return <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2 mb-3"><span>✅</span><p className="text-[10px] font-black text-green-700">Course terminée — bien joué !</p></div>;
  return (
    <div className="space-y-2 mb-3">
      <button onClick={async () => {
        setLoading(true);
        try {
          await updateDoc(doc(db, 'orders', orderId), { status: 'delivered', deliveredAt: serverTimestamp() });
          const { createNotification } = await import('@/services/notificationService');
          await Promise.all([
            createNotification(ord.buyerId, 'system', '🎉 Livraison confirmée !', `Le livreur confirme t'avoir remis "${ord.productTitle}".`, { orderId, productId: ord.productId }),
            createNotification(ord.sellerId, 'system', '✅ Livraison terminée', `"${ord.productTitle}" a été livré.`, { orderId, productId: ord.productId }),
          ]);
          setDone(true);
        } catch (e) { console.error(e); } finally { setLoading(false); }
      }} disabled={loading}
        className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase text-white active:scale-95 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
        {loading ? '...' : '📦 Colis livré — course terminée'}
      </button>
    </div>
  );
}

function CODStepsBlock({ orderId, order }: { orderId: string; order: Order }) {
  const [loadingStep2, setLoadingStep2] = React.useState(false);
  const [loadingStep3, setLoadingStep3] = React.useState(false);
  const ord = order as any;
  const step2Done = ord.delivererCashCollected;
  const step3Done = ord.sellerCashReturned;
  return (
    <div className="space-y-2 mb-3">
      {!step2Done ? (
        <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-[10px] font-black text-amber-800">💵 Livrer et collecter le paiement</p>
          <button onClick={async () => {
            setLoadingStep2(true);
            try {
              await updateDoc(doc(db, 'orders', orderId), { delivererCashCollected: true, delivererCashCollectedAt: serverTimestamp() });
              const { createNotification } = await import('@/services/notificationService');
              await createNotification(ord.buyerId, 'system', '🚀 Ton article est en route !', `Le livreur arrive avec "${ord.productTitle}".`, { orderId });
            } catch (e) { console.error(e); } finally { setLoadingStep2(false); }
          }} disabled={loadingStep2}
            className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase text-white active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
            {loadingStep2 ? '...' : "📦 Livré — cash collecté"}
          </button>
        </div>
      ) : !step3Done ? (
        <div className="rounded-xl border-2 border-dashed border-green-400 bg-green-50 p-3 space-y-2">
          <p className="text-[10px] font-black text-green-800">🤝 Remettre {(ord.productPrice || 0).toLocaleString('fr-FR')} FCFA au vendeur</p>
          <button onClick={async () => {
            setLoadingStep3(true);
            try {
              await updateDoc(doc(db, 'orders', orderId), { sellerCashReturned: true, sellerCashReturnedAt: serverTimestamp() });
              const { createNotification } = await import('@/services/notificationService');
              await createNotification(ord.sellerId, 'system', '💰 Le livreur dit avoir remis ton argent', `Confirme la réception de ${(ord.productPrice || 0).toLocaleString('fr-FR')} FCFA.`, { orderId });
            } catch (e) { console.error(e); } finally { setLoadingStep3(false); }
          }} disabled={loadingStep3}
            className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase text-white active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
            {loadingStep3 ? '...' : "✍️ Argent remis au vendeur"}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2"><span>✅</span><p className="text-[10px] font-black text-green-700">Argent remis — attente vendeur</p></div>
      )}
    </div>
  );
}

function ActiveDeliveryCard({ order, onChatBuyer, onChatSeller, currentDelivererId, currentDelivererName }: {
  order: Order; onChatBuyer: () => void; onChatSeller: () => void; currentDelivererId?: string; currentDelivererName?: string;
}) {
  const ord = order as any;
  const code = ord.deliveryCode || '';
  const [copied, setCopied] = React.useState(false);
  const [showDetail, setShowDetail] = React.useState(false);
  const orange = '#E05A00';

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); } catch { const el = document.createElement('input'); el.value = code; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const statusLabel = order.status === 'picked'
    ? { icon: '🛵', text: "En route vers l'acheteur", color: '#16A34A', border: 'border-green-500' }
    : ord.isCOD && ['cod_confirmed','ready','confirmed'].includes(order.status)
    ? { icon: '📦', text: 'Récupère le colis chez le vendeur', color: '#2563EB', border: 'border-blue-400' }
    : { icon: '📦', text: 'Va chercher le colis chez le vendeur', color: orange, border: 'border-orange-400' };

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${statusLabel.border} mb-3`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
          {ord.productImage ? <img src={ord.productImage} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 text-[13px] truncate">{order.productTitle}</p>
          <p className="text-[11px] text-slate-500">{ord.sellerNeighborhood} → {ord.buyerNeighborhood}</p>
          <p className="text-[10px] font-bold mt-0.5" style={{ color: statusLabel.color }}>{statusLabel.icon} {statusLabel.text}</p>
        </div>
        <div className="text-right"><p className="font-black text-[15px]" style={{ color: orange }}>{(ord.deliveryFee || 0).toLocaleString('fr-FR')}</p><p className="text-[9px] text-slate-400">FCFA</p></div>
      </div>

      {code ? (
        <div className="rounded-2xl p-4 mb-3" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">🔐 Code — transmets-le à l'acheteur</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-3xl font-black text-yellow-300 tracking-[0.35em] font-mono">{code}</span>
            <button onClick={copyCode} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase text-white active:scale-90 flex-shrink-0"
              style={{ background: copied ? '#16A34A' : 'rgba(255,255,255,0.15)' }}>
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-100"><p className="text-[11px] text-amber-700 font-bold">⏳ Code en cours de génération...</p></div>
      )}

      {!ord.isCOD && ['ready','confirmed'].includes(order.status) && <MobileDeliveryButtons orderId={order.id} order={order}/>}
      {ord.isCOD && ['cod_confirmed','ready','confirmed'].includes(order.status) && <CashPickupButton orderId={order.id} order={order}/>}
      {ord.isCOD && ['picked','cod_delivered'].includes(order.status) && <CODStepsBlock orderId={order.id} order={order}/>}
      {['ready','cod_confirmed','confirmed'].includes(order.status) && currentDelivererId && currentDelivererName && (
        <div className="mb-2"><RejectDeliveryButton order={order} delivererId={currentDelivererId} delivererName={currentDelivererName}/></div>
      )}
      <div className="flex gap-2">
        <button onClick={onChatBuyer} className="flex-1 py-2.5 rounded-xl bg-blue-50 font-black text-[10px] text-blue-600 active:scale-95 flex items-center justify-center gap-1">👤 Acheteur</button>
        <button onClick={onChatSeller} className="flex-1 py-2.5 rounded-xl bg-slate-100 font-black text-[10px] text-slate-600 active:scale-95 flex items-center justify-center gap-1">🏪 Vendeur</button>
      </div>
    </div>
  );
}
