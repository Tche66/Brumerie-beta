// src/pages/DelivererDashboardPage.tsx — v18 BruMove
// Interface dédiée livreur : Accueil | Radar | Gains | Profil
// <BruIcons.AlertTriangle size={14}/> BecomeDelivererPage gère l'onboarding (5 étapes CGU + identité + zones + tarifs + bio)
// Ce composant n'est affiché que si role === 'livreur' && deliveryCGUAccepted === true

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeDelivererOrders,
  subscribeOpenOrdersInZone,
  confirmDeliveryByBuyer,
  confirmPickupByDeliverer,
  toggleDelivererAvailability,
  rejectDelivery,
} from '@/services/deliveryService';
import { EditDelivererProfilePage } from '@/pages/EditDelivererProfilePage';
import { ConversationsListPage } from '@/pages/ConversationsListPage';
import { ChatPage } from '@/pages/ChatPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { getWeeklyLeaderboard, getDelivererReferralStats } from '@/services/delivererLeaderboardService';
import { ensureReferralCode, buildReferralLink } from '@/services/referralService';
import { QRDisplay } from '@/components/QRDisplay';
import { buildQRPayload } from '@/utils/qrCode';
import type { Order, Conversation } from '@/types';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { BruIcons } from '@/components/BruIcons';

interface Props {
  onNavigate: (page: string) => void;
  onChat: (userId: string, userName: string) => void;
}

type Tab = 'home' | 'radar' | 'earnings' | 'leaderboard' | 'referral' | 'profile';

// ── Helpers ───────────────────────────────────────────────────
const getTs = (o: any): number =>
  o.deliveredAt?.toMillis?.() ?? (o.deliveredAt?.seconds ? o.deliveredAt.seconds * 1000 : 0);
const startOfDay   = () => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); };
const startOfWeek  = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); };
const startOfMonth = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(1); return d.getTime(); };

export function DelivererDashboardPage({ onNavigate, onChat }: Props) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [tab, setTab]               = useState<Tab>('home');
  const [orders, setOrders]         = useState<Order[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [available, setAvailable]   = useState(userProfile?.deliveryAvailable ?? true);
  const [toggling, setToggling]     = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showQRDelivery, setShowQRDelivery]   = useState<Order | null>(null);
  // Messages + Paramètres intégrés — overlay sans quitter le mode livreur
  const [showMessages, setShowMessages]       = useState(false);
  const [activeConv, setActiveConv]           = useState<Conversation | null>(null);
  const [showSettings, setShowSettings]       = useState(false);
  // Classement + Parrainage
  const [leaderboard, setLeaderboard]   = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [referralCode, setReferralCode]   = useState<string>('');
  const [copied, setCopied]               = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    return subscribeDelivererOrders(currentUser.uid, setOrders);
  }, [currentUser?.uid]);

  useEffect(() => {
    const zones = userProfile?.deliveryZones || [];
    if (!zones.length) return;
    return subscribeOpenOrdersInZone(zones, setOpenOrders);
  }, [JSON.stringify(userProfile?.deliveryZones)]);

  // Charger classement et parrainage au montage
  useEffect(() => {
    if (!currentUser) return;
    // Classement
    getWeeklyLeaderboard().then(setLeaderboard).catch(() => {});
    // Code parrainage
    const name = userProfile?.deliveryPartnerName || userProfile?.name || 'BRU';
    ensureReferralCode(currentUser.uid, name).then(code => {
      setReferralCode(code);
      getDelivererReferralStats(currentUser.uid).then(setReferralStats).catch(() => {});
    }).catch(() => {});
  }, [currentUser?.uid]);

  // ── Données calculées ────────────────────────────────────────
  // Toutes les commandes assignées à ce livreur (subscribeDelivererOrders filtre par delivererId)
  // On couvre TOUS les statuts actifs, y compris les intermédiaires (proof_sent, cod_pending, etc.)
  const ACTIVE_STATUSES = ['initiated','proof_sent','confirmed','ready','cod_pending','cod_confirmed','picked','cod_delivered'];
  const myAllActive       = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  // En attente / pas encore en route (code pas encore généré ou vendeur pas encore confirmé)
  const myAssignedPending = orders.filter(o => ['initiated','proof_sent','confirmed','cod_pending','cod_confirmed'].includes(o.status));
  // En cours = code généré, livreur actif
  const myOngoing         = orders.filter(o => ['ready','cod_confirmed','picked','cod_delivered'].includes(o.status));
  const myOpenOrders      = openOrders.filter(o => !orders.some(mo => mo.id === o.id));
  const allMissions       = [...myAllActive, ...myOpenOrders];
  const myDone            = orders.filter(o => ['delivered','cod_delivered'].includes(o.status));
  const totalGains        = myDone.reduce((s,o) => s + ((o as any).deliveryFee || 0), 0) || userProfile?.totalEarnings || 0;
  const totalCount        = myDone.length || userProfile?.totalDeliveries || 0;
  const gainsToday        = myDone.filter(o => getTs(o) >= startOfDay()).reduce((s,o) => s + ((o as any).deliveryFee || 0), 0);
  const gainsWeek         = myDone.filter(o => getTs(o) >= startOfWeek()).reduce((s,o) => s + ((o as any).deliveryFee || 0), 0);
  const gainsMonth        = myDone.filter(o => getTs(o) >= startOfMonth()).reduce((s,o) => s + ((o as any).deliveryFee || 0), 0);
  const lastDone          = [...myDone].sort((a,b) => getTs(b) - getTs(a))[0];
  const showLastBonus     = lastDone && (Date.now() - getTs(lastDone)) < 3600000 && ((lastDone as any).deliveryFee || 0) > 0;

  const handleToggle = async () => {
    if (!currentUser || toggling) return;
    setToggling(true);
    await toggleDelivererAvailability(currentUser.uid, !available);
    setAvailable(v => !v);
    await refreshUserProfile();
    setToggling(false);
  };

  const OG = '#E05A00'; // orange BruMove

  // Wrapper onChat pour ouvrir l'overlay messages au lieu de naviguer dans App
  const handleChat = async (userId: string, userName: string) => {
    // Chercher une conversation existante avec cet utilisateur
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db: fsDb } = await import('@/config/firebase');
      if (!currentUser) return;
      // Chercher conv entre currentUser et userId
      const q = query(collection(fsDb, 'conversations'),
        where('participants', 'array-contains', currentUser.uid));
      const snap = await getDocs(q);
      const existing = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Conversation))
        .find(c => (c as any).participants?.includes(userId));
      if (existing) {
        setActiveConv(existing);
        setShowMessages(true);
      } else {
        // Pas de conv existante — ouvrir la liste pour que l'utilisateur cherche
        setShowMessages(true);
        setActiveConv(null);
      }
    } catch {
      // Fallback : ouvrir la liste de messages
      setShowMessages(true);
      setActiveConv(null);
    }
  };

  // ── Sous-pages ───────────────────────────────────────────────
  if (showEditProfile) {
    return <EditDelivererProfilePage
      onBack={() => setShowEditProfile(false)}
      onSaved={() => { setShowEditProfile(false); refreshUserProfile(); }}
    />;
  }
  if (showQRDelivery) {
    const ord = showQRDelivery as any;
    return <QRDisplay
      title="Mon QR de livraison"
      subtitle="Montre ce QR à l'acheteur"
      code={ord.deliveryCode || '------'}
      qrPayload={ord.qrDeliveryPayload || buildQRPayload('delivery', showQRDelivery.id, ord.deliveryCode || '')}
      color="#D97706" emoji=""
      instruction="L'acheteur va scanner ce QR pour confirmer la réception."
      onClose={() => setShowQRDelivery(null)}
    />;
  }
  // Paramètres en overlay — sans quitter le mode livreur
  if (showSettings) {
    return (
      <SettingsPage
        onBack={() => setShowSettings(false)}
        onNavigate={(page) => {
          // Si l'utilisateur navigue vers une sous-page des settings, rester dans l'overlay
          // Pour les pages qui nécessitent une vraie navigation (ex: become-deliverer déjà fait)
          setShowSettings(false);
          onNavigate(page);
        }}
        role="seller"
      />
    );
  }

  // Messages intégrés — sans quitter le mode livreur ni changer activePage dans App
  if (showMessages) {
    if (activeConv) {
      return (
        <ChatPage
          conversation={activeConv}
          onBack={() => setActiveConv(null)}
          onProductClick={() => {}}
          onBuyAtPrice={() => {}}
        />
      );
    }
    return (
      <div className="min-h-screen font-sans">
        <ConversationsListPage
          onOpenConversation={(conv) => setActiveConv(conv)}
          onOpenConversationById={async (convId) => {
            const { getDoc, doc: fsDoc } = await import('firebase/firestore');
            const { db: fsDb } = await import('@/config/firebase');
            const snap = await getDoc(fsDoc(fsDb, 'conversations', convId));
            if (snap.exists()) setActiveConv({ id: snap.id, ...snap.data() } as Conversation);
          }}
        />
        {/* Bouton retour vers le dashboard livreur */}
        <button
          onClick={() => setShowMessages(false)}
          className="fixed top-14 left-4 z-50 w-10 h-10 rounded-2xl bg-white shadow-md flex items-center justify-center active:scale-90 transition-all"
          style={{ border: '1px solid #F1F5F9' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
      </div>
    );
  }

  // ── Bottom nav interne livreur ────────────────────────────────
  // Nav tabs internes + actions externes (Messages/Paramètres via onNavigate)
  type NavAction = Tab | 'messages' | 'settings';
  const NAV_TABS: { id: NavAction; label: string; badge?: number; isExternal?: boolean; icon: React.ReactNode }[] = [
    {
      id: 'home', label: 'Accueil',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
    },
    {
      id: 'radar', label: 'Missions',
      badge: (allMissions.length > 0 ? allMissions.length : 0),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h5l3 3v5h-8V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    },
    {
      id: 'earnings', label: 'Gains',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    },
    {
      id: 'leaderboard', label: 'Top',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="18 20 18 10"/><polyline points="12 20 12 4"/><polyline points="6 20 6 14"/></svg>,
    },
    {
      id: 'messages', label: 'Messages',
      isExternal: true,
      badge: undefined,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    },
    {
      id: 'profile', label: 'Profil',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
  ];

  return (
    <div className="min-h-screen font-sans pb-24" style={{ background: '#F5F5F5' }}>

      {/* ══════════════════════════════════════
          ONGLET ACCUEIL
      ══════════════════════════════════════ */}
      {tab === 'home' && (
        <>
          {/* Hero orange */}
          <div className="px-5 pt-14 pb-6" style={{ background: `linear-gradient(160deg, ${OG}, #FF7A1A)` }}>
            {/* Header profil */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white/20 flex-shrink-0">
                  {(userProfile?.deliveryPhotoURL || userProfile?.photoURL)
                    ? <img src={(userProfile as any)?.deliveryPhotoURL || userProfile?.photoURL} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-white font-black text-lg">{(userProfile?.name || 'L').charAt(0).toUpperCase()}</div>
                  }
                </div>
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Bonjour 👋</p>
                  <p className="text-white font-black text-[15px]">{userProfile?.deliveryPartnerName || userProfile?.name}</p>
                  {userProfile?.phone && <p className="text-white/60 text-[10px]">{userProfile.phone}</p>}
                </div>
              </div>
              {/* Toggle disponibilité */}
              <button onClick={handleToggle} disabled={toggling}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95"
                style={{ background: available ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)', color: 'white' }}>
                <div className={`w-2 h-2 rounded-full ${available ? 'bg-green-300 animate-pulse' : 'bg-white/40'}`}/>
                {toggling ? '...' : available ? 'En service' : 'Hors service'}
              </button>
            </div>

            {/* Card gains du jour */}
            <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-5">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Aujourd'hui</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white font-black leading-none" style={{ fontSize: '2.4rem' }}>
                    {gainsToday.toLocaleString('fr-FR')} <span className="text-[1.2rem] opacity-80">FCFA</span>
                  </p>
                  <div className="flex gap-5 mt-3">
                    {[
                      { label: 'Courses', val: myDone.filter(o => getTs(o) >= startOfDay()).length },
                      { label: 'En cours', val: myOngoing.length },
                      { label: 'Dispo', val: myOpenOrders.length },
                    ].map(k => (
                      <div key={k.label}>
                        <p className="text-white/60 text-[9px] uppercase font-bold">{k.label}</p>
                        <p className="text-white font-black text-[18px]">{k.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pt-4 space-y-3">
            {/* Bonus dernière course */}
            {showLastBonus && (
              <div className="rounded-3xl p-4 flex items-center gap-4"
                style={{ background: `${OG}15`, border: `1px solid ${OG}30` }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${OG}20` }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={OG} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <p className="font-black text-[14px]" style={{ color: OG }}>Course terminée !</p>
                  <p className="text-slate-600 text-[11px] font-bold">+{((lastDone as any)?.deliveryFee || 0).toLocaleString('fr-FR')} FCFA ajoutés</p>
                </div>
              </div>
            )}

            {/* Indispo warning */}
            {!available && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <p className="font-black text-amber-700 text-[12px]">Tu es hors service</p>
                <button onClick={handleToggle} className="mt-2 px-5 py-2 rounded-xl font-black text-[11px] uppercase text-white"
                  style={{ background: `linear-gradient(135deg,${OG},#FF7A1A)`}}>
                  Activer ma disponibilité
                </button>
              </div>
            )}

            {/* Stats 3 périodes */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Aujourd'hui", value: gainsToday, color: OG, bg: '#FFF5EE' },
                { label: 'Semaine', value: gainsWeek, color: '#8B5CF6', bg: '#F5F3FF' },
                { label: 'Ce mois', value: gainsMonth, color: '#16A34A', bg: '#F0FDF4' },
              ].map(k => (
                <div key={k.label} className="rounded-2xl p-3 text-center" style={{ background: k.bg }}>
                  <p className="font-black text-[15px] leading-none" style={{ color: k.color }}>{k.value.toLocaleString('fr-FR')}</p>
                  <p className="text-[8px] font-black text-slate-500 uppercase mt-0.5 leading-tight">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Mission disponible */}
            {myOpenOrders.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {myOpenOrders.length} course{myOpenOrders.length > 1 ? 's' : ''} dans ta zone
                  </p>
                  {myOpenOrders.length > 1 && (
                    <button onClick={() => setTab('radar')} className="text-[9px] font-black uppercase tracking-widest" style={{ color: OG }}>
                      Voir tout →
                    </button>
                  )}
                </div>
                <MissionCardCompact
                  order={myOpenOrders[0]}
                  onChatBuyer={() => myOpenOrders[0].buyerId && handleChat(myOpenOrders[0].buyerId, myOpenOrders[0].buyerName)}
                  onChatSeller={() => myOpenOrders[0].sellerId && handleChat(myOpenOrders[0].sellerId, myOpenOrders[0].sellerName)}
                />
              </div>
            )}

            {/* Missions assignées à ce livreur (tous statuts actifs) */}
            {myAllActive.filter(o => !['ready','cod_confirmed','picked','cod_delivered'].includes(o.status)).length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  📌 Assignées à toi ({myAllActive.filter(o => !['ready','cod_confirmed','picked','cod_delivered'].includes(o.status)).length})
                </p>
                {myAllActive.filter(o => !['ready','cod_confirmed','picked','cod_delivered'].includes(o.status)).map(order => (
                  <MissionCard key={order.id} order={order} isAssigned={true}
                    onChatBuyer={() => order.buyerId && handleChat(order.buyerId, order.buyerName)}
                    onChatSeller={() => order.sellerId && handleChat(order.sellerId, order.sellerName)}
                    currentDelivererId={currentUser?.uid}
                    currentDelivererName={userProfile?.deliveryPartnerName || userProfile?.name || ''}
                  />
                ))}
              </div>
            )}

            {/* En cours */}
            {myOngoing.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2"><BruIcons.Moto size={14}/> En cours ({myOngoing.length})</p>
                {myOngoing.map(order => (
                  <ActiveDeliveryCard key={order.id} order={order}
                    onChatBuyer={() => order.buyerId && handleChat(order.buyerId, order.buyerName)}
                    onChatSeller={() => order.sellerId && handleChat(order.sellerId, order.sellerName)}
                    currentDelivererId={currentUser?.uid}
                    currentDelivererName={userProfile?.deliveryPartnerName || userProfile?.name || ''}
                  />
                ))}
              </div>
            )}

            {/* État vide */}
            {myAllActive.length === 0 && myOpenOrders.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
                <div className="text-4xl mb-3"></div>
                <p className="font-black text-slate-700 text-[14px] mb-1">Aucune mission pour l'instant</p>
                <p className="text-[11px] text-slate-400">Zones couvertes : {(userProfile?.deliveryZones || []).join(' · ') || '—'}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════
          ONGLET RADAR / MISSIONS
      ══════════════════════════════════════ */}
      {tab === 'radar' && (
        <>
          <div className="px-5 pt-14 pb-4" style={{ background:`linear-gradient(160deg, ${OG}, #FF7A1A)`}}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-white font-black text-[20px] uppercase tracking-tight">Missions</h1>
                <p className="text-white/70 text-[10px] font-bold">
                  {(userProfile?.deliveryZones || []).join(' · ')}
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
                <p className="font-black text-amber-700 text-[12px]">Tu es hors service — active ta disponibilité pour recevoir des missions</p>
              </div>
            )}

            {myOngoing.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2"><BruIcons.Moto size={14}/> En cours ({myOngoing.length})</p>
                {myOngoing.map(order => (
                  <ActiveDeliveryCard key={order.id} order={order}
                    onChatBuyer={() => order.buyerId && handleChat(order.buyerId, order.buyerName)}
                    onChatSeller={() => order.sellerId && handleChat(order.sellerId, order.sellerName)}
                    currentDelivererId={currentUser?.uid}
                    currentDelivererName={userProfile?.deliveryPartnerName || userProfile?.name || ''}
                  />
                ))}
              </div>
            )}

            {myAllActive.filter(o => !['ready','cod_confirmed','picked','cod_delivered'].includes(o.status)).length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  📌 Assignées à toi ({myAllActive.filter(o => !['ready','cod_confirmed','picked','cod_delivered'].includes(o.status)).length})
                </p>
                {myAllActive.filter(o => !['ready','cod_confirmed','picked','cod_delivered'].includes(o.status)).map(order => (
                  <MissionCard key={order.id} order={order} isAssigned={true}
                    onChatBuyer={() => order.buyerId && handleChat(order.buyerId, order.buyerName)}
                    onChatSeller={() => order.sellerId && handleChat(order.sellerId, order.sellerName)}
                    currentDelivererId={currentUser?.uid}
                    currentDelivererName={userProfile?.deliveryPartnerName || userProfile?.name || ''}
                  />
                ))}
              </div>
            )}

            {myOpenOrders.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2"><BruIcons.Globe size={14}/> Disponibles dans ta zone ({myOpenOrders.length})</p>
                {myOpenOrders.map(order => (
                  <MissionCard key={order.id} order={order} isAssigned={false}
                    onChatBuyer={() => order.buyerId && handleChat(order.buyerId, order.buyerName)}
                    onChatSeller={() => order.sellerId && handleChat(order.sellerId, order.sellerName)}
                  />
                ))}
              </div>
            )}

            {myAllActive.length === 0 && myOpenOrders.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4"></div>
                <p className="font-black text-slate-400 text-[13px]">Aucune mission disponible</p>
                <p className="text-[10px] text-slate-400 mt-2">Aucune commande dans tes zones pour l'instant</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════
          ONGLET CLASSEMENT
      ══════════════════════════════════════ */}
      {tab === 'leaderboard' && (
        <>
          <div className="px-5 pt-14 pb-5" style={{ background:`linear-gradient(160deg, ${OG}, #FF7A1A)`}}>
            <h1 className="text-white font-black text-[20px] uppercase tracking-tight">Top livreurs</h1>
            <p className="text-white/70 text-[10px] font-bold mt-0.5">Classement de la semaine en cours</p>
          </div>

          <div className="px-4 pt-4 space-y-3">
            {leaderboard.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
                <p className="text-4xl mb-3"></p>
                <p className="font-black text-slate-400 text-[13px]">Aucune livraison cette semaine</p>
                <p className="text-[11px] text-slate-400 mt-1">Sois le premier du classement !</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((entry, i) => {
                  const isMe = entry.delivererId === currentUser?.uid;
                  const medal = i === 0 ? '' : i === 1 ? '' : i === 2 ? '' :`#${i+1}`;
                  return (
                    <div key={entry.delivererId}
                      className={`bg-white rounded-2xl p-4 border-2 flex items-center gap-3 ${isMe ? 'border-orange-400' : 'border-slate-100'}`}>
                      {/* Médaille */}
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: i < 3 ? `${OG}15`: '#F8FAFC' }}>
                        <span className="text-[18px]">{medal}</span>
                      </div>
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        {entry.photoURL
                          ? <img src={entry.photoURL} alt="" className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-sm">{(entry.deliveryPartnerName || entry.delivererName).charAt(0).toUpperCase()}</div>
                        }
                      </div>
                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-black text-slate-900 text-[13px] truncate">{entry.deliveryPartnerName || entry.delivererName}</p>
                          {isMe && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: OG }}>MOI</span>}
                        </div>
                        <p className="text-[10px] text-slate-400">{entry.zone || '—'}</p>
                      </div>
                      {/* Stats */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-[16px]" style={{ color: OG }}>{entry.weekDeliveries}</p>
                        <p className="text-[8px] text-slate-400 uppercase font-bold">courses</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ma position si hors top 10 */}
            {leaderboard.length > 10 && (() => {
              const myEntry = leaderboard.find(e => e.delivererId === currentUser?.uid);
              if (!myEntry || myEntry.rank <= 10) return null;
              return (
                <div className="bg-white rounded-2xl p-4 border-2 border-dashed border-orange-300 flex items-center gap-3">
                  <span className="text-[16px] font-black text-slate-400">#{myEntry.rank}</span>
                  <div className="flex-1">
                    <p className="font-black text-slate-700 text-[12px]">Ta position</p>
                    <p className="text-[10px] text-slate-400">{myEntry.weekDeliveries} livraisons cette semaine</p>
                  </div>
                  <button onClick={() => getWeeklyLeaderboard().then(setLeaderboard).catch(() => {})}
                    className="text-[9px] font-black uppercase px-3 py-1.5 rounded-xl active:scale-95" style={{ color: OG, background:`${OG}12`}}>
                    ↻ Refresh
                  </button>
                </div>
              );
            })()}

            {/* Parrainage livreur */}
            <div className="mt-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Parrainage livreur</p>
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background:`${OG}15`}}>
                    <span className="text-2xl"></span>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-[13px]">Invite des livreurs</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Quand ton filleul complète 5 livraisons, tu reçois une notification et ton profil est mis en avant.</p>
                  </div>
                </div>

                {/* Code parrainage */}
                {referralCode ? (
                  <div className="bg-slate-50 rounded-2xl p-3 mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Ton code</p>
                      <p className="font-black text-[20px] tracking-widest" style={{ color: OG }}>{referralCode}</p>
                    </div>
                    <button onClick={async () => {
                      const link = buildReferralLink(referralCode);
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: 'Rejoins Brumerie livreur !', text:`Utilise mon code ${referralCode} pour rejoindre Brumerie comme livreur <BruIcons.Moto size={14}/>`, url: link });
                        } else {
                          await navigator.clipboard.writeText(link);
                          setCopied(true); setTimeout(() => setCopied(false), 2000);
                        }
                      } catch {}
                    }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase text-white active:scale-95"
                      style={{ background: copied ? '#16A34A' : `linear-gradient(135deg,${OG},#FF7A1A)` }}>
                      {copied ? '✓ Copié' : 'Partager'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-3 mb-3">
                    <p className="text-[11px] text-slate-400 font-bold">Chargement du code...</p>
                  </div>
                )}

                {/* Stats filleuls */}
                {referralStats && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Invités', val: referralStats.filleulsTotal },
                      { label: 'Actifs', val: referralStats.filleulsActifs },
                      { label: 'Bonus ✓', val: referralStats.filleulsBonus },
                    ].map(k => (
                      <div key={k.label} className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="font-black text-[18px]" style={{ color: OG }}>{k.val}</p>
                        <p className="text-[8px] text-slate-400 uppercase font-bold">{k.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════
          ONGLET GAINS / HISTORIQUE
      ══════════════════════════════════════ */}
      {tab === 'earnings' && (
        <>
          <div className="px-5 pt-14 pb-6" style={{ background: `linear-gradient(160deg, ${OG}, #FF7A1A)`}}>
            <h1 className="text-white font-black text-[20px] uppercase tracking-tight mb-4">Mes Gains</h1>
            <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-5 mb-4">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total cumulé</p>
              <p className="text-white font-black leading-none mb-1" style={{ fontSize: '2.2rem' }}>
                {totalGains.toLocaleString('fr-FR')} <span className="text-[1.1rem] opacity-80">FCFA</span>
              </p>
              <p className="text-white/70 text-[11px] font-bold">{totalCount} livraison{totalCount !== 1 ? 's' : ''} réalisée{totalCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Aujourd'hui", value: gainsToday },
                { label: 'Semaine', value: gainsWeek },
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
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Historique livraisons</p>
            {myDone.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
                <p className="text-3xl mb-3"></p>
                <p className="font-black text-slate-400 text-[13px]">Aucune livraison pour l'instant</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...myDone].sort((a,b) => getTs(b) - getTs(a)).map(order => {
                  const ord = order as any;
                  const fee = ord.deliveryFee || 0;
                  const ts  = getTs(order);
                  const date = ts ? new Date(ts) : null;
                  const isCOD = ord.isCOD;
                  const method = isCOD ? 'Espèces' : 'Mobile';
                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ background:`${OG}15`}}>
                          {ord.productImage
                            ? <img src={ord.productImage} alt="" className="w-full h-full object-cover rounded-2xl"/>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={OG} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-[12px] truncate">{order.productTitle}</p>
                          <p className="text-[10px] text-slate-500">{ord.sellerNeighborhood || '—'} → {ord.buyerNeighborhood || '—'}</p>
                          {date && <p className="text-[9px] text-slate-400">{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {method}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-[15px]" style={{ color: OG }}>+{fee.toLocaleString('fr-FR')}</p>
                          <p className="text-[9px] text-slate-400 font-bold">FCFA</p>
                        </div>
                      </div>
                      <div className="border-t border-slate-50 px-4 py-2 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex gap-4">
                          <div><p className="text-[8px] text-slate-400 uppercase font-bold">Vendeur</p><p className="text-[10px] font-black text-slate-700 truncate max-w-[80px]">{ord.sellerName || '—'}</p></div>
                          <div><p className="text-[8px] text-slate-400 uppercase font-bold">Acheteur</p><p className="text-[10px] font-black text-slate-700 truncate max-w-[80px]">{ord.buyerName || '—'}</p></div>
                        </div>
                        <span className="text-[9px] bg-green-100 text-green-700 font-black px-2 py-0.5 rounded-full">Livré ✓</span>
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
                <div className="space-y-2 mt-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Refusées ({rejected.length})</p>
                  {rejected.map(order => {
                    const ord = order as any;
                    const myRefusal = ord.rejectedDeliverers?.find((r: any) => r.delivererId === currentUser?.uid);
                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-red-100 overflow-hidden">
                        <div className="flex items-center gap-3 p-3">
                          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 text-xl">✕</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-700 text-[12px] truncate">{order.productTitle}</p>
                            <p className="text-[10px] text-slate-500">{ord.sellerNeighborhood} → {ord.buyerNeighborhood}</p>
                          </div>
                          <span className="text-[9px] bg-red-50 text-red-600 font-black px-2 py-0.5 rounded-full">Refusé</span>
                        </div>
                        {myRefusal?.reason && (
                          <div className="border-t border-red-50 px-3 py-2 bg-red-50 flex items-start gap-2">
                            <p className="text-[10px] text-red-700 font-bold">{myRefusal.reason}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════
          ONGLET PROFIL
      ══════════════════════════════════════ */}
      {tab === 'profile' && (
        <>
          <div className="px-5 pt-14 pb-8" style={{ background:`linear-gradient(160deg, ${OG}, #FF7A1A)`}}>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[2rem] overflow-hidden bg-white/20 border-4 border-white/30 shadow-xl mb-3">
                {(userProfile?.deliveryPhotoURL || userProfile?.photoURL)
                  ? <img src={(userProfile as any)?.deliveryPhotoURL || userProfile?.photoURL} alt="" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full flex items-center justify-center text-white font-black text-4xl">{(userProfile?.name || 'L').charAt(0).toUpperCase()}</div>
                }
              </div>
              <h2 className="text-white font-black text-[18px] uppercase tracking-tight">{userProfile?.deliveryPartnerName || userProfile?.name}</h2>
              <p className="text-white/70 text-[10px] mt-0.5 font-bold">
                {userProfile?.phone} · {(userProfile as any)?.deliveryStatus === 'service' ? 'Service de livraison' : (userProfile as any)?.deliveryStatus === 'chauffeur' ? 'Chauffeur / Zem' : 'Livreur indépendant'}
              </p>
              {(userProfile?.deliveryZones || []).length > 0 && (
                <p className="text-white/70 text-[10px] mt-1"><BruIcons.MapPin size={10}/> {(userProfile?.deliveryZones || []).join(' · ')}</p>
              )}
              <div className="flex gap-6 mt-4">
                <div className="text-center"><p className="text-white font-black text-[20px]">{totalCount}</p><p className="text-white/60 text-[9px] uppercase font-bold">Livraisons</p></div>
                <div className="w-px bg-white/20"/>
                <div className="text-center"><p className="text-white font-black text-[20px]">{totalGains.toLocaleString('fr-FR')}</p><p className="text-white/60 text-[9px] uppercase font-bold">FCFA gagnés</p></div>
              </div>
            </div>
          </div>

          <div className="px-4 pt-4 space-y-3">
            {/* Bio */}
            {userProfile?.deliveryBio && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">À propos</p>
                <p className="text-[12px] text-slate-600 leading-relaxed italic">"{userProfile.deliveryBio}"</p>
              </div>
            )}

            {/* Infos véhicule */}
            {(userProfile as any)?.deliveryVehicles?.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Véhicule(s)</p>
                <div className="flex gap-2 flex-wrap">
                  {(userProfile as any).deliveryVehicles.map((v: string) => {
                    const icons: Record<string,string> = { moto: '', voiture: '🚗', velo: '🚲', tricycle: '🛺', pied: '🚶' };
                    const labels: Record<string,string> = { moto: 'Moto / Zem', voiture: 'Voiture', velo: 'Vélo', tricycle: 'Tricycle', pied: 'À pied' };
                    return (
                      <span key={v} className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
                        {icons[v] || ''} {labels[v] || v}
                      </span>
                    );
                  })}
                </div>
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

            {/* Toggle dispo */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-black text-slate-900 text-[13px]">{available ? '🟢 En service' : '⚫ Hors service'}</p>
                <p className="text-[11px] text-slate-400">{available ? 'Tu reçois des missions' : 'Aucune mission envoyée'}</p>
              </div>
              <button onClick={handleToggle} disabled={toggling}
                className={'w-14 h-7 rounded-full transition-all relative ' + (available ? 'bg-green-500' : 'bg-slate-300')}>
                <div className={'w-6 h-6 bg-white rounded-full shadow-md absolute top-0.5 transition-all ' + (available ? 'left-7' : 'left-0.5')}/>
              </button>
            </div>

            {/* Actions */}
            <button onClick={() => setShowEditProfile(true)}
              className="w-full py-4 bg-white rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-700 active:scale-95 border border-slate-100 flex items-center justify-center gap-2">
              Modifier mon profil livreur
            </button>
            <button onClick={() => setTab('leaderboard')}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 flex items-center justify-center gap-2"
              style={{ background:`linear-gradient(135deg,#E05A00,#FF7A1A)`}}>
              <BruIcons.Trophy size={14}/> Classement & Parrainage
            </button>
            <button onClick={() => setShowSettings(true)}
              className="w-full py-4 bg-white rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 active:scale-95 border border-slate-100 flex items-center justify-center gap-2">
              Paramètres
            </button>
          </div>
        </>
      )}

      {/* ── BOTTOM NAV livreur (5 tabs : Accueil / Missions / Gains / Messages / Profil) ── */}
      <nav className="fixed bottom-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100"
        style={{ maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)' }}>
        <div className="flex items-center justify-around h-16 px-1">
          {NAV_TABS.map(t => {
            const isActive = t.id === 'messages' ? showMessages : (!t.isExternal && tab === t.id);
            return (
              <button key={t.id}
                onClick={() => {
                  if (t.id === 'messages') {
                    // Ouvre les messages en overlay — sans quitter le dashboard livreur
                    setShowMessages(true);
                    setActiveConv(null);
                  } else if (t.isExternal) {
                    onNavigate(t.id as string);
                  } else {
                    setTab(t.id as Tab);
                  }
                }}
                className="flex flex-col items-center gap-0.5 py-2 px-3 relative transition-all active:scale-95"
                style={{ color: isActive ? OG : '#94A3B8' }}>
                {t.badge != null && t.badge > 0 ? (
                  <span className="absolute -top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                    style={{ background: OG }}>{t.badge > 9 ? '9+' : t.badge}</span>
                ) : null}
                {t.icon}
                <span className="text-[9px] font-black uppercase tracking-tight">{t.label}</span>
                {isActive && <div className="absolute -bottom-0 w-4 h-0.5 rounded-full" style={{ background: OG }}/>}
              </button>
            );
          })}
        </div>
        <div className="h-safe-area-inset-bottom"/>
      </nav>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// COMPOSANTS MÉTIER — logique inchangée depuis v17
// ══════════════════════════════════════════════════════════════

function MissionCardCompact({ order, onChatBuyer, onChatSeller }: {
  order: Order; onChatBuyer: () => void; onChatSeller: () => void;
}) {
  const ord = order as any;
  const OG = '#E05A00';
  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
      <div className="h-1.5" style={{ background:`linear-gradient(90deg,${OG},#FF7A1A)`}}/>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
            {ord.productImage ? <img src={ord.productImage} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-2xl"><BruIcons.Package size={14}/></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-[13px] truncate">{order.productTitle}</p>
            <p className="text-[11px] text-slate-500">{ord.sellerNeighborhood || '—'} → {ord.buyerNeighborhood || '—'}</p>
            {ord.isCOD && <p className="text-[10px] font-bold text-blue-600">Paiement à la livraison</p>}
          </div>
          {ord.deliveryFee > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="font-black text-[16px]" style={{ color: OG }}>{(ord.deliveryFee || 0).toLocaleString('fr-FR')}</p>
              <p className="text-[9px] text-slate-400 font-bold">FCFA</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-3 mb-3">
          <div className="flex flex-col items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"/>
            <div className="w-px h-5 bg-slate-200"/>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"/>
          </div>
          <div className="flex-1 space-y-2">
            <div><p className="text-[8px] text-slate-400 uppercase font-bold">Collecte</p><p className="text-[11px] font-black text-slate-800">{ord.sellerName || ord.sellerNeighborhood || '—'}</p></div>
            <div><p className="text-[8px] text-slate-400 uppercase font-bold">Livraison</p><p className="text-[11px] font-black text-slate-800">{ord.buyerNeighborhood || '—'}</p></div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onChatSeller}
            className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95"
            style={{ background:`linear-gradient(135deg,${OG},#FF7A1A)`}}>
            Contacter vendeur
          </button>
          <button onClick={onChatBuyer} className="py-3 px-4 rounded-2xl bg-slate-100 font-black text-[11px] text-slate-600 active:scale-95"></button>
        </div>
      </div>
    </div>
  );
}

// ── Matrice ETA inter-quartiers Abidjan (minutes estimées) ────────
const ETA_MATRIX: Record<string, Record<string, number>> = {
  'Yopougon':    { 'Yopougon': 10, 'Cocody': 40, 'Plateau': 35, 'Adjamé': 25, 'Abobo': 30, 'Koumassi': 45, 'Marcory': 45, 'Treichville': 40, 'Port-Bouët': 55, 'default': 35 },
  'Cocody':      { 'Cocody': 10, 'Yopougon': 40, 'Plateau': 20, 'Adjamé': 25, 'Abobo': 35, 'Koumassi': 30, 'Marcory': 25, 'Treichville': 20, 'Port-Bouët': 35, 'default': 25 },
  'Plateau':     { 'Plateau': 8, 'Cocody': 20, 'Yopougon': 35, 'Adjamé': 15, 'Abobo': 30, 'Koumassi': 20, 'Marcory': 15, 'Treichville': 12, 'Port-Bouët': 30, 'default': 20 },
  'Adjamé':      { 'Adjamé': 8, 'Plateau': 15, 'Cocody': 25, 'Yopougon': 25, 'Abobo': 20, 'Koumassi': 30, 'Marcory': 25, 'default': 20 },
  'Abobo':       { 'Abobo': 10, 'Adjamé': 20, 'Yopougon': 30, 'Plateau': 30, 'Cocody': 35, 'default': 30 },
  'Koumassi':    { 'Koumassi': 10, 'Marcory': 12, 'Plateau': 20, 'Treichville': 15, 'Cocody': 30, 'Port-Bouët': 20, 'default': 20 },
  'Marcory':     { 'Marcory': 8, 'Koumassi': 12, 'Plateau': 15, 'Treichville': 10, 'Cocody': 25, 'Port-Bouët': 25, 'default': 18 },
  'Treichville': { 'Treichville': 8, 'Plateau': 12, 'Marcory': 10, 'Koumassi': 15, 'Cocody': 20, 'default': 15 },
  'Port-Bouët':  { 'Port-Bouët': 10, 'Koumassi': 20, 'Marcory': 25, 'Treichville': 30, 'default': 30 },
};

function getETA(from: string, to: string): string {
  const fromKey = Object.keys(ETA_MATRIX).find(k => from?.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes((from || '').toLowerCase()));
  const matrix  = fromKey ? ETA_MATRIX[fromKey] : null;
  const toKey   = matrix ? Object.keys(matrix).find(k => to?.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes((to || '').toLowerCase())) : null;
  const minutes = matrix ? (toKey ? matrix[toKey] : matrix['default'] || 25) : 25;
  if (minutes <= 15) return '10-15 min';
  if (minutes <= 25) return '20-25 min';
  if (minutes <= 35) return '30-35 min';
  return '40-45 min';
}

// ── Bouton "Je suis en route" ────────────────────────────────────
function EnRouteButton({ order, delivererName }: { order: Order; delivererName: string }) {
  const ord = order as any;
  const [sent, setSent]         = React.useState(ord.delivererEnRoute === true);
  const [loading, setLoading]   = React.useState(false);
  const [gpsLink, setGpsLink]   = React.useState<string | null>(null);
  const OG = '#E05A00';

  const eta = getETA(ord.sellerNeighborhood || '', ord.buyerNeighborhood || '');

  const handleEnRoute = async () => {
    setLoading(true);
    try {
      // Obtenir position GPS si disponible
      let gps: string | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        gps =`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        setGpsLink(gps);
      } catch { /* GPS non dispo — continuer sans */ }

      const { updateDoc: ud, doc: fd, serverTimestamp: st } = await import('firebase/firestore');
      const { db: fdb } = await import('@/config/firebase');
      await ud(fd(fdb, 'orders', order.id), {
        delivererEnRoute: true,
        delivererEnRouteAt: st(),
        delivererGpsLink: gps || null,
      });

      const { createNotification } = await import('@/services/notificationService');
      const gpsMsg = gps ? `Position en direct : ${gps}` : '';
      await createNotification(
        order.buyerId, 'system',
        'Ton livreur est en route !',
        `${delivererName} arrive depuis ${ord.sellerNeighborhood || 'chez le vendeur'}. Arrivée estimée : ${eta}.${gpsMsg}`,
        { orderId: order.id }
      );
      setSent(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (sent) return (
    <div className="rounded-2xl p-4 mb-3 border border-green-200 bg-green-50">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg"><BruIcons.Moto size={14}/></span>
        <p className="font-black text-green-800 text-[12px]">En route — acheteur notifié !</p>
      </div>
      <p className="text-[10px] text-green-700">ETA envoyé : {eta}</p>
      {gpsLink && (
        <a href={gpsLink} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 mt-2 text-[10px] font-black text-blue-600 active:scale-95">
          Partager ma position en direct
        </a>
      )}
    </div>
  );

  return (
    <button onClick={handleEnRoute} disabled={loading}
      className="w-full py-3.5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white mb-3 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      style={{ background:`linear-gradient(135deg,${OG},#FF7A1A)`}}>
      {loading
        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Localisation...</>
        : <><span></span> Je suis en route — notifier l'acheteur</>
      }
    </button>
  );
}

function MissionCard({ order, isAssigned, onChatSeller, onChatBuyer, currentDelivererId, currentDelivererName }: {
  order: Order; isAssigned: boolean; onChatSeller: () => void; onChatBuyer: () => void;
  currentDelivererId?: string; currentDelivererName?: string;
}) {
  const ord = order as any;
  const OG = '#E05A00';
  const [showDetail, setShowDetail] = React.useState(false);
  const [accepting, setAccepting]   = React.useState(false);
  const [accepted, setAccepted]     = React.useState(ord.delivererAccepted === true);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const { updateDoc: ud, doc: fd, serverTimestamp: st } = await import('firebase/firestore');
      const { db: fdb } = await import('@/config/firebase');
      await ud(fd(fdb, 'orders', order.id), {
        delivererAccepted: true,
        delivererAcceptedAt: st(),
      });
      const { createNotification } = await import('@/services/notificationService');
      await Promise.all([
        createNotification(order.sellerId, 'system',
          'Livreur a accepté la mission !',`${currentDelivererName} a accepté de livrer "${order.productTitle}". Il vous contactera bientôt.`,
          { orderId: order.id, productId: ord.productId }
        ),
        createNotification(order.buyerId, 'system',
          'Livreur en route !',
          `${currentDelivererName} a accepté votre livraison pour "${order.productTitle}".`,
          { orderId: order.id, productId: ord.productId }
        ),
      ]);
      setAccepted(true);
    } catch (e) { console.error(e); }
    finally { setAccepting(false); }
  };

  return (
    <>
      <div className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 mb-3 ${isAssigned ? (accepted ? 'border-green-500' : 'border-amber-400') : 'border-orange-300'}`}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
            {ord.productImage ? <img src={ord.productImage} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl"><BruIcons.Package size={14}/></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-[13px] truncate">{order.productTitle}</p>
            <p className="text-[11px] text-slate-500">{ord.sellerNeighborhood || '—'} → {ord.buyerNeighborhood || '—'}</p>
            <p className="text-[10px] text-slate-400">Vendeur : {order.sellerName}</p>
            {ord.isCOD && <p className="text-[10px] font-bold text-blue-600"><BruIcons.Money size={14}/> COD — paiement à la livraison</p>}
          </div>
          <div className="text-right flex-shrink-0">
            {ord.deliveryFee > 0
              ? (<><p className="font-black text-[15px]" style={{ color: OG }}>{(ord.deliveryFee).toLocaleString('fr-FR')}</p><p className="text-[9px] text-slate-400">FCFA</p></>)
              : (<p className="text-[10px] text-slate-400">Tarif libre</p>)
            }
          </div>
        </div>

        {/* Statut */}
        {isAssigned ? (
          accepted
            ? <div className="bg-green-50 rounded-xl p-2 mb-3 border border-green-200"><p className="text-[10px] font-black text-green-700"><BruIcons.CheckCircle size={14}/> Mission acceptée — attente code vendeur</p></div>
            : <div className="bg-amber-50 rounded-xl p-2 mb-3 border border-amber-100"><p className="text-[10px] font-black text-amber-700"><BruIcons.Clock size={14}/> Assigné — lis les détails et accepte ou refuse</p></div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-2 mb-3 border border-slate-200"><p className="text-[10px] font-black text-slate-500"><BruIcons.Package size={14}/> Mission disponible dans ta zone</p></div>
        )}

        {/* Bouton Voir détails */}
        <button onClick={() => setShowDetail(true)}
          className="w-full py-2 rounded-xl border border-slate-200 font-black text-[10px] text-slate-600 uppercase tracking-widest mb-2 active:scale-95 bg-slate-50">
          Voir les détails de la course
        </button>

        {/* Accepter / Refuser pour les missions assignées non encore acceptées */}
        {isAssigned && !accepted && currentDelivererId && currentDelivererName && (
          <div className="flex gap-2 mb-2">
            <button onClick={handleAccept} disabled={accepting}
              className="flex-1 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 disabled:opacity-50"
              style={{ background:`linear-gradient(135deg,${OG},#FF7A1A)`}}>
              {accepting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/> : 'Accepter la mission'}
            </button>
            <RejectDeliveryButton order={order} delivererId={currentDelivererId} delivererName={currentDelivererName} compact/>
          </div>
        )}

        {/* Contacts */}
        <div className="flex gap-2">
          <button onClick={onChatBuyer} className="flex-1 py-2.5 rounded-xl bg-blue-50 font-black text-[10px] text-blue-600 active:scale-95 flex items-center justify-center gap-1"><BruIcons.User size={14}/> Acheteur</button>
          <button onClick={onChatSeller} className="flex-1 py-2.5 rounded-xl bg-slate-100 font-black text-[10px] text-slate-600 active:scale-95 flex items-center justify-center gap-1"><BruIcons.Store size={14}/> Vendeur</button>
        </div>

        {/* Refus si déjà acceptée */}
        {isAssigned && accepted && currentDelivererId && currentDelivererName && (
          <div className="mt-2">
            <RejectDeliveryButton order={order} delivererId={currentDelivererId} delivererName={currentDelivererName}/>
          </div>
        )}
      </div>

      {/* Modal détails course */}
      {showDetail && (
        <MissionDetailModal order={order} onClose={() => setShowDetail(false)}
          onAccept={!accepted && isAssigned && currentDelivererId ? () => { handleAccept(); setShowDetail(false); } : undefined}
          onReject={isAssigned && currentDelivererId && currentDelivererName && !accepted
            ? { delivererId: currentDelivererId, delivererName: currentDelivererName }
            : undefined}
          onChatBuyer={onChatBuyer} onChatSeller={onChatSeller}
        />
      )}
    </>
  );
}

// ── Modal Détails Course ────────────────────────────────────────
function MissionDetailModal({ order, onClose, onAccept, onReject, onChatBuyer, onChatSeller }: {
  order: Order;
  onClose: () => void;
  onAccept?: () => void;
  onReject?: { delivererId: string; delivererName: string };
  onChatBuyer: () => void;
  onChatSeller: () => void;
}) {
  const ord = order as any;
  const OG = '#E05A00';
  const createdAt = ord.createdAt?.toDate?.() || (ord.createdAt?.seconds ? new Date(ord.createdAt.seconds * 1000) : null);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[400] flex items-end justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl" style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2"><div className="w-10 h-1.5 bg-slate-200 rounded-full"/></div>

        <div className="px-6 pb-8 space-y-4">
          {/* Titre */}
          <div className="flex items-center justify-between">
            <p className="font-black text-slate-900 text-[17px] uppercase tracking-tight">Détails de la course</p>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 active:scale-90">✕</button>
          </div>

          {/* Article */}
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
              {ord.productImage ? <img src={ord.productImage} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-2xl"></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-900 text-[14px]">{order.productTitle}</p>
              <p className="text-[11px] font-bold mt-0.5" style={{ color: OG }}>
                Frais de livraison : {ord.deliveryFee > 0 ?`${ord.deliveryFee.toLocaleString('fr-FR')} FCFA`: 'À négocier'}
              </p>
              <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                {ord.isCOD ? 'Paiement à la livraison (COD)' : 'Paiement mobile money déjà effectué'}
              </p>
            </div>
          </div>

          {/* Trajet */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Trajet</p>
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"/>
                <div className="w-0.5 flex-1 bg-slate-200 min-h-[28px]"/>
                <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"/>
              </div>
              <div className="flex-1 space-y-4">
                {/* Vendeur */}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Collecte chez le vendeur</p>
                  <p className="font-black text-slate-900 text-[13px]">{ord.sellerNeighborhood || '—'}</p>
                  <p className="text-[11px] text-slate-600 font-bold">{order.sellerName}</p>
                  {ord.sellerPhone ? (
                    <div className="flex gap-2 mt-1.5">
                      <a href={`tel:${ord.sellerPhone.replace(/\s/g,'')}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 font-black text-[10px] text-green-700 active:scale-95">
                        {ord.sellerPhone}
                      </a>
                      <a href={`https://wa.me/${ord.sellerPhone.replace(/\D/g,'')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-500 font-black text-[10px] text-white active:scale-95">
                        WA
                      </a>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">📵 Numéro non disponible</p>
                  )}
                </div>
                {/* Acheteur */}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Livraison chez l'acheteur</p>
                  <p className="font-black text-slate-900 text-[13px]">{ord.buyerNeighborhood || '—'}</p>
                  <p className="text-[11px] text-slate-600 font-bold">{order.buyerName}</p>
                  {ord.buyerPhone ? (
                    <div className="flex gap-2 mt-1.5">
                      <a href={`tel:${ord.buyerPhone.replace(/\s/g,'')}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 font-black text-[10px] text-blue-700 active:scale-95">
                        {ord.buyerPhone}
                      </a>
                      <a href={`https://wa.me/${ord.buyerPhone.replace(/\D/g,'')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-500 font-black text-[10px] text-white active:scale-95">
                        WA
                      </a>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">📵 Numéro non disponible</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Montants */}
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <p className="text-[9px] font-black text-green-800 uppercase tracking-widest mb-2">Ce que tu gagnes</p>
            <div className="flex justify-between items-center">
              <p className="text-[12px] text-slate-600">Frais de livraison</p>
              <p className="font-black text-[18px]" style={{ color: OG }}>
                {ord.deliveryFee > 0 ?`${ord.deliveryFee.toLocaleString('fr-FR')} FCFA`: 'À négocier'}
              </p>
            </div>
            {ord.isCOD && ord.productPrice > 0 && (
              <div className="mt-2 pt-2 border-t border-green-100">
                <p className="text-[10px] text-green-700 font-bold">
                  <BruIcons.AlertTriangle size={14}/> Tu collectes aussi {(ord.productPrice || 0).toLocaleString('fr-FR')} FCFA pour le vendeur — à lui remettre après livraison.
                </p>
              </div>
            )}
          </div>

          {/* Instructions livreur */}
          {ord.deliveryNotes && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1"><BruIcons.FileText size={14}/> Instructions</p>
              <p className="text-[12px] text-slate-800 leading-relaxed">{ord.deliveryNotes}</p>
            </div>
          )}

          {/* Date commande */}
          {createdAt && (
            <p className="text-[10px] text-slate-400 text-center">
              Commande passée le {createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          {/* Contacts rapides */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { onChatSeller(); onClose(); }}
              className="py-3 rounded-2xl bg-slate-100 font-black text-[10px] text-slate-600 uppercase tracking-widest active:scale-95">
              <BruIcons.Store size={14}/> Contacter vendeur
            </button>
            <button onClick={() => { onChatBuyer(); onClose(); }}
              className="py-3 rounded-2xl bg-blue-50 font-black text-[10px] text-blue-600 uppercase tracking-widest active:scale-95">
              Contacter acheteur
            </button>
          </div>

          {/* Accepter / Fermer */}
          {onAccept && (
            <button onClick={onAccept}
              className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-95"
              style={{ background:`linear-gradient(135deg,${OG},#FF7A1A)`}}>
              Accepter cette mission
            </button>
          )}
          {!onAccept && (
            <button onClick={onClose}
              className="w-full py-4 rounded-2xl bg-slate-100 font-black text-[12px] uppercase tracking-widest text-slate-600 active:scale-95">
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RejectDeliveryButton({ order, delivererId, delivererName, compact }: { order: Order; delivererId: string; delivererName: string; compact?: boolean }) {
  const [showModal, setShowModal] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const QUICK = ['Zone trop éloignée','Indisponible à cet horaire','Colis trop lourd','Problème avec le vendeur','Autre raison'];
  const handleReject = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    const r = await rejectDelivery({ orderId: order.id, delivererId, delivererName, reason: reason.trim(), order });
    setLoading(false);
    if (r.success) { setDone(true); setShowModal(false); }
  };
  if (done) return <div className="flex-1 py-2.5 rounded-xl bg-slate-100 flex items-center justify-center"><span className="text-[10px] font-black text-slate-500">✓ Refusé</span></div>;
  return (
    <>
      <button onClick={() => setShowModal(true)} className={compact ? "px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 font-black text-[10px] text-red-600 uppercase tracking-widest active:scale-95 flex items-center justify-center gap-1" : "w-full py-2.5 rounded-xl bg-red-50 border border-red-100 font-black text-[10px] text-red-600 uppercase tracking-widest active:scale-95"}>
        {compact ? '✕' : '✕ Refuser cette mission'}
      </button>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[500] flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-7 space-y-5 shadow-2xl">
            <div className="w-10 h-1.5 bg-slate-100 rounded-full mx-auto"/>
            <div className="text-center"><p className="text-2xl mb-2"></p><h3 className="font-black text-slate-900 text-[16px]">Refuser la mission</h3><p className="text-[11px] text-slate-500 mt-1">Action irréversible — le vendeur sera notifié.</p></div>
            <div className="flex flex-wrap gap-2">{QUICK.map(r => <button key={r} onClick={() => setReason(r)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black ${reason === r ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{r}</button>)}</div>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Ou précise le motif..." rows={2} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-[12px] outline-none resize-none"/>
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
  if (order.status === 'picked' || signed) return <div className="rounded-xl border-2 border-green-300 bg-green-50 p-3 mb-3 flex items-center gap-2"><span></span><p className="text-[11px] font-black text-green-800">Colis récupéré — en route</p></div>;
  return (
    <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-3 mb-3">
      <p className="text-[10px] font-black text-orange-800 mb-2">Confirmer récupération du colis chez le vendeur</p>
      <button onClick={async () => { setLoading(true); try { await updateDoc(doc(db, 'orders', orderId), { status: 'picked', deliveryPickedAt: serverTimestamp() }); setSigned(true); } catch(e){console.error(e);} finally{setLoading(false);} }} disabled={loading}
        className="w-full py-2.5 rounded-xl font-black text-[11px] uppercase text-white active:scale-95 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#D4500F,#ea580c)' }}>
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/> : '✍️ Colis récupéré chez le vendeur'}
      </button>
    </div>
  );
}

function MobileDeliveryButtons({ orderId, order }: { orderId: string; order: Order }) {
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const ord = order as any;
  if (done) return <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2 mb-3"><span></span><p className="text-[10px] font-black text-green-700">Course terminée — bien joué !</p></div>;
  return (
    <div className="space-y-2 mb-3">
      <button onClick={async () => {
        setLoading(true);
        try {
          await updateDoc(doc(db, 'orders', orderId), { status: 'delivered', deliveredAt: serverTimestamp() });
          const { createNotification } = await import('@/services/notificationService');
          await Promise.all([
            createNotification(ord.buyerId,'system','Livraison confirmée !',`Le livreur confirme t'avoir remis "${ord.productTitle}".`,{orderId}),
            createNotification(ord.sellerId,'system','Livraison terminée',`"${ord.productTitle}" a été livré.`,{orderId}),
          ]);
          // Incrémenter stats livreur + vérifier bonus parrainage
          if (ord.delivererId) {
            try {
              const { getDoc: gd, doc: fd2 } = await import('firebase/firestore');
              const { db: db2 } = await import('@/config/firebase');
              const dSnap = await gd(fd2(db2, 'users', ord.delivererId));
              if (dSnap.exists()) {
                const d = dSnap.data();
                const newTotal = (d.totalDeliveries || 0) + 1;
                await updateDoc(fd2(db2, 'users', ord.delivererId), {
                  totalDeliveries: newTotal,
                  totalEarnings: (d.totalEarnings || 0) + (ord.deliveryFee || 0),
                });
                // Vérifier bonus parrainage (seuils 5, 10, 20, 50 livraisons)
                const { checkDelivererReferralBonus } = await import('@/services/delivererLeaderboardService');
                await checkDelivererReferralBonus(ord.delivererId);
              }
            } catch (e) { console.error('[stats livreur]', e); }
          }
          setDone(true);
        } catch(e){console.error(e);} finally{setLoading(false);}
      }} disabled={loading} className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase text-white active:scale-95 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
        {loading ? '...' : 'Colis livré — course terminée'}
      </button>
    </div>
  );
}

function CODStepsBlock({ orderId, order }: { orderId: string; order: Order }) {
  const [l2, setL2] = React.useState(false);
  const [l3, setL3] = React.useState(false);
  const ord = order as any;
  if (ord.sellerCashReturned) return <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2 mb-3"><span></span><p className="text-[10px] font-black text-green-700">Argent remis — attente confirmation vendeur</p></div>;
  if (ord.delivererCashCollected) return (
    <div className="rounded-xl border-2 border-dashed border-green-400 bg-green-50 p-3 space-y-2 mb-3">
      <p className="text-[10px] font-black text-green-800">Remettre {(ord.productPrice||0).toLocaleString('fr-FR')} FCFA au vendeur</p>
      <button onClick={async () => { setL3(true); try { await updateDoc(doc(db,'orders',orderId),{sellerCashReturned:true,sellerCashReturnedAt:serverTimestamp()}); const {createNotification}=await import('@/services/notificationService'); await createNotification(ord.sellerId,'system','Le livreur dit avoir remis ton argent',`Confirme la réception de ${(ord.productPrice||0).toLocaleString('fr-FR')} FCFA.`,{orderId}); } catch(e){console.error(e);} finally{setL3(false);} }} disabled={l3}
        className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase text-white active:scale-95 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
        {l3 ? '...' : "✍️ Argent remis au vendeur"}
      </button>
    </div>
  );
  return (
    <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-3 space-y-2 mb-3">
      <p className="text-[10px] font-black text-amber-800">Livrer et collecter le paiement</p>
      <button onClick={async () => { setL2(true); try { await updateDoc(doc(db,'orders',orderId),{delivererCashCollected:true,delivererCashCollectedAt:serverTimestamp()}); const {createNotification}=await import('@/services/notificationService'); await createNotification(ord.buyerId,'system','🚀 Ton article est en route !',`Le livreur arrive avec "${ord.productTitle}".`,{orderId}); } catch(e){console.error(e);} finally{setL2(false);} }} disabled={l2}
        className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase text-white active:scale-95 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
        {l2 ? '...' : "Livré — cash collecté"}
      </button>
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
  const OG = '#E05A00';
  const copyCode = async () => { try{await navigator.clipboard.writeText(code);}catch{const el=document.createElement('input');el.value=code;document.body.appendChild(el);el.select();document.execCommand('copy');document.body.removeChild(el);} setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const statusColor = order.status === 'picked' ? '#16A34A' : ord.isCOD ? '#2563EB' : OG;
  const statusText  = order.status === 'picked' ? "En route vers l'acheteur" : ord.isCOD ? 'Récupère le colis chez le vendeur' : 'Va chercher le colis chez le vendeur';
  const borderColor = order.status === 'picked' ? 'border-green-500' : ord.isCOD ? 'border-blue-400' : 'border-orange-400';
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${borderColor} mb-3`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
          {ord.productImage ? <img src={ord.productImage} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl"><BruIcons.Package size={14}/></div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 text-[13px] truncate">{order.productTitle}</p>
          <p className="text-[11px] text-slate-500">{ord.sellerNeighborhood} → {ord.buyerNeighborhood}</p>
          <p className="text-[10px] font-bold mt-0.5" style={{ color: statusColor }}>
            {order.status === 'picked' ? '' : ord.isCOD ? '' : ''} {statusText}
          </p>
        </div>
        <div className="text-right"><p className="font-black text-[15px]" style={{ color: OG }}>{(ord.deliveryFee||0).toLocaleString('fr-FR')}</p><p className="text-[9px] text-slate-400">FCFA</p></div>
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
          <p className="text-[9px] text-slate-500 mt-2">L'acheteur saisit ce code sur Brumerie pour confirmer la réception.</p>
        </div>
      ) : (
        <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-100"><p className="text-[11px] text-amber-700 font-bold"><BruIcons.Clock size={14}/> Code en cours de génération...</p></div>
      )}
      {/* Bouton En route — disponible dès que la mission est assignée et active */}
      {['ready','confirmed','cod_confirmed','picked'].includes(order.status) && (
        <EnRouteButton order={order} delivererName={currentDelivererName || 'Le livreur'}/>
      )}
      {!ord.isCOD && ['ready','confirmed'].includes(order.status) && <MobileDeliveryButtons orderId={order.id} order={order}/>}
      {ord.isCOD && ['cod_confirmed','ready','confirmed'].includes(order.status) && <CashPickupButton orderId={order.id} order={order}/>}
      {ord.isCOD && ['picked','cod_delivered'].includes(order.status) && <CODStepsBlock orderId={order.id} order={order}/>}
      {['ready','cod_confirmed','confirmed'].includes(order.status) && currentDelivererId && currentDelivererName && (
        <div className="mb-2"><RejectDeliveryButton order={order} delivererId={currentDelivererId} delivererName={currentDelivererName}/></div>
      )}
      <div className="flex gap-2">
        <button onClick={onChatBuyer} className="flex-1 py-2.5 rounded-xl bg-blue-50 font-black text-[10px] text-blue-600 active:scale-95 flex items-center justify-center gap-1"><BruIcons.User size={14}/> Acheteur</button>
        <button onClick={onChatSeller} className="flex-1 py-2.5 rounded-xl bg-slate-100 font-black text-[10px] text-slate-600 active:scale-95 flex items-center justify-center gap-1"><BruIcons.Store size={14}/> Vendeur</button>
      </div>
    </div>
  );
}
