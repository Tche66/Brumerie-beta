// src/pages/DelivererDashboardPage.tsx — v17 simplifié
// Dashboard livreur : 4 onglets | Scan QR vendeur | Affiche QR pour acheteur

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeDelivererOrders,
  confirmPickupByDeliverer,
  confirmDeliveryByBuyer,
  toggleDelivererAvailability,
} from '@/services/deliveryService';
import { BecomeDelivererPage } from '@/pages/BecomeDelivererPage';
import { EditDelivererProfilePage } from '@/pages/EditDelivererProfilePage';
import { QRScanner } from '@/components/QRScanner';
import { QRDisplay } from '@/components/QRDisplay';
import { buildQRPayload } from '@/utils/qrCode';
import type { Order } from '@/types';

interface Props {
  onNavigate: (page: string) => void;
  onChat: (userId: string, userName: string) => void;
}

type Tab = 'available' | 'ongoing' | 'earnings' | 'profile';

export function DelivererDashboardPage({ onNavigate, onChat }: Props) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [tab, setTab]             = useState<Tab>('available');
  const [orders, setOrders]       = useState<Order[]>([]);
  const [available, setAvailable] = useState(userProfile?.deliveryAvailable ?? true);
  const [toggling, setToggling]   = useState(false);

  // QR actions
  const [showScanPickup, setShowScanPickup]       = useState<Order | null>(null); // Scanner QR vendeur
  const [showQRDelivery, setShowQRDelivery]       = useState<Order | null>(null); // Afficher mon QR pour acheteur
  const [showEditProfile, setShowEditProfile]     = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    return subscribeDelivererOrders(currentUser.uid, setOrders);
  }, [currentUser?.uid]);

  // Missions disponibles = commandes 'ready' avec delivererId == moi ou pas encore assigné
  // En v17, le livreur est assigné par le vendeur/acheteur → il voit ses missions
  // Missions à récupérer : commande prête, peu importe le type de paiement
  const myPending  = orders.filter(o => ['ready', 'cod_confirmed'].includes(o.status));
  // En route : colis récupéré chez vendeur
  const myOngoing  = orders.filter(o => o.status === 'picked');
  const myDone     = orders.filter(o => o.status === 'delivered');
  const totalGains = userProfile?.totalEarnings || 0;
  const totalCount = userProfile?.totalDeliveries || 0;

  const handleToggle = async () => {
    if (!currentUser) return;
    setToggling(true);
    const newVal = !available;
    await toggleDelivererAvailability(currentUser.uid, newVal);
    setAvailable(newVal);
    await refreshUserProfile();
    setToggling(false);
  };

  const handlePickupScanned = async (code: string, order: Order) => {
    if (!currentUser) return;
    const expectedCode = (order as any).deliveryCode || '';
    // Vérifier le code si on l'a (QR ou saisie manuelle)
    if (expectedCode && code.toUpperCase() !== expectedCode.toUpperCase()) {
      alert('Code incorrect — demande le bon code au vendeur');
      return;
    }
    setShowScanPickup(null);
    const result = await confirmPickupByDeliverer(order.id, order);
    if (!result.success) alert(result.error);
    // Feedback visuel
    else setTab('ongoing');
  };

  const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: 'available', label: 'Missions', icon: '📦', badge: myPending.length },
    { id: 'ongoing',   label: 'En cours', icon: '🛵', badge: myOngoing.length },
    { id: 'earnings',  label: 'Gains',    icon: '💰' },
    { id: 'profile',   label: 'Profil',   icon: '👤' },
  ];

  if (showEditProfile) {
    return (
      <EditDelivererProfilePage
        onBack={() => setShowEditProfile(false)}
        onSaved={() => { setShowEditProfile(false); refreshUserProfile(); }}
      />
    );
  }

  // ── QR Scanner : livreur scanne QR du vendeur ──
  if (showScanPickup) {
    return (
      <QRScanner
        expectedType="pickup"
        expectedOrderId={showScanPickup.id}
        expectedCode={(showScanPickup as any).deliveryCode}
        onSuccess={(code) => handlePickupScanned(code, showScanPickup)}
        onClose={() => setShowScanPickup(null)}
      />
    );
  }

  // ── QR Display : livreur montre son QR à l'acheteur ──
  if (showQRDelivery) {
    const ord = showQRDelivery as any;
    return (
      <QRDisplay
        title="Mon QR de livraison"
        subtitle="Montre ce QR à l'acheteur"
        code={ord.deliveryCode || '------'}
        qrPayload={ord.qrDeliveryPayload || buildQRPayload('delivery', showQRDelivery.id, ord.deliveryCode || '')}
        color="#D97706"
        emoji="🛵"
        instruction="L'acheteur va scanner ce QR avec son téléphone pour confirmer la réception."
        onClose={() => setShowQRDelivery(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-black text-slate-900 text-lg uppercase tracking-tight">
              {userProfile?.deliveryPartnerName || 'Mon espace livreur'}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              📍 {(userProfile?.deliveryZones || []).join(' · ')}
            </p>
          </div>
          <button onClick={handleToggle} disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
              available ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            <div className={`w-2 h-2 rounded-full ${available ? 'bg-white animate-pulse' : 'bg-slate-400'}`}/>
            {available ? 'Dispo' : 'Indispo'}
          </button>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all relative ${
                tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              <span>{t.icon}</span><br/>
              <span>{t.label}</span>
              {t.badge && t.badge > 0 ? (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-[7px] font-black text-white">{t.badge}</span>
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">

        {/* ── ONGLET MISSIONS (assigned, pas encore picked) ── */}
        {tab === 'available' && (
          <div className="flex flex-col gap-3">
            {!available && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <p className="font-black text-amber-700 text-[12px]">Tu es en mode indisponible</p>
                <p className="text-amber-600 text-[11px]">Active ta disponibilité pour recevoir des missions</p>
              </div>
            )}
            {myPending.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📭</div>
                <p className="font-black text-slate-400 text-[13px]">Aucune mission en attente</p>
                <p className="text-slate-400 text-[11px] mt-1">Tes missions assignées apparaîtront ici</p>
              </div>
            ) : myPending.map(order => (
              <MissionCard
                key={order.id}
                order={order}
                onScanVendeur={() => setShowScanPickup(order)}
                onChatSeller={() => order.sellerId && onChat(order.sellerId, order.sellerName)}
                onChatBuyer={() => order.buyerId && onChat(order.buyerId, order.buyerName)}
              />
            ))}
          </div>
        )}

        {/* ── ONGLET EN COURS (picked → livraison) ── */}
        {tab === 'ongoing' && (
          <div className="flex flex-col gap-3">
            {myOngoing.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🛵</div>
                <p className="font-black text-slate-400 text-[13px]">Aucune livraison en cours</p>
              </div>
            ) : myOngoing.map(order => (
              <OngoingCard
                key={order.id}
                order={order}
                onShowQR={() => setShowQRDelivery(order)}
                onChatBuyer={() => order.buyerId && onChat(order.buyerId, order.buyerName)}
                onChatSeller={() => order.sellerId && onChat(order.sellerId, order.sellerName)}
              />
            ))}
          </div>
        )}

        {/* ── ONGLET GAINS ── */}
        {tab === 'earnings' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
                <p className="text-3xl font-black text-green-600">{totalCount}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Livraisons</p>
              </div>
              <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
                <p className="text-2xl font-black text-slate-900">{totalGains.toLocaleString('fr-FR')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">FCFA gagnés</p>
              </div>
            </div>
            <p className="font-black text-slate-500 text-[10px] uppercase tracking-widest">Historique</p>
            {myDone.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400 text-[12px]">Tes livraisons complétées apparaîtront ici</p>
              </div>
            ) : myDone.map(order => (
              <div key={order.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-lg">✅</div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 text-[12px] truncate">{order.productTitle}</p>
                  <p className="text-[10px] text-slate-400">{order.sellerNeighborhood} → {order.buyerNeighborhood}</p>
                </div>
                <p className="font-black text-green-600 text-[13px] whitespace-nowrap">
                  +{((order as any).deliveryFee || 0).toLocaleString('fr-FR')} F
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── ONGLET PROFIL ── */}
        {tab === 'profile' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Mon service</p>
              <p className="font-black text-slate-900 text-base mb-1">{userProfile?.deliveryPartnerName}</p>
              <p className="text-[12px] text-slate-500 mb-3">{userProfile?.deliveryBio || 'Aucune description'}</p>
              <p className="text-[11px] font-bold text-green-700">📍 {(userProfile?.deliveryZones || []).join(' · ')}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Mes tarifs</p>
              {(userProfile?.deliveryRates || []).map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <p className="text-[12px] text-slate-600 font-medium">
                    {r.fromZone} → {r.toZone === 'same' ? 'même quartier' : r.toZone}
                  </p>
                  <p className="font-black text-slate-900 text-[13px]">{r.price.toLocaleString('fr-FR')} FCFA</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowEditProfile(true)}
              className="w-full py-4 bg-slate-100 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-600 active:scale-95 transition-all">
              ✏️ Modifier mon profil
            </button>
            <button onClick={() => onNavigate('settings')}
              className="w-full py-4 bg-slate-100 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-600 active:scale-95 transition-all">
              ⚙️ Paramètres
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mission Card — Colis à récupérer chez le vendeur ─────────────
function MissionCard({ order, onScanVendeur, onChatSeller, onChatBuyer }: {
  order: Order;
  onScanVendeur: () => void;
  onChatSeller: () => void;
  onChatBuyer: () => void;
}) {
  const ord = order as any;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-green-500">
      <div className="flex items-start gap-3 mb-3">
        {ord.productImage
          ? <img src={ord.productImage} alt="" className="w-12 h-12 rounded-xl object-cover"/>
          : <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl">📦</div>
        }
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 text-[13px] truncate">{order.productTitle}</p>
          <p className="text-[11px] text-slate-500">{ord.sellerNeighborhood} → {ord.buyerNeighborhood}</p>
          <p className="text-[11px] text-slate-400">Vendeur : {order.sellerName}</p>
        </div>
        <div className="text-right">
          <p className="font-black text-green-600 text-[15px]">{(ord.deliveryFee || 0).toLocaleString('fr-FR')}</p>
          <p className="text-[9px] text-slate-400 font-bold">FCFA</p>
        </div>
      </div>

      {/* Étape 1 : scanner QR du vendeur pour récupérer le colis */}
      <div className="bg-green-50 rounded-xl p-3 mb-3">
        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">📦 Étape 1 — Récupérer le colis</p>
        <p className="text-[11px] text-green-600">
          Va chez le vendeur et scanne son QR pour confirmer la prise en charge.
          {(order as any).isCOD && <span> 💡 COD — l&apos;acheteur te paiera à la livraison.</span>}
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={onScanVendeur}
          className="flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
          📷 Scanner QR Vendeur
        </button>
        <button onClick={onChatBuyer} title="Chat acheteur"
          className="px-3 py-3 rounded-xl bg-blue-50 font-black text-[9px] text-blue-600 active:scale-95 flex flex-col items-center gap-0.5">
          <span>👤</span><span>Acheteur</span>
        </button>
        <button onClick={onChatSeller} title="Chat vendeur"
          className="px-3 py-3 rounded-xl bg-slate-100 font-black text-[9px] text-slate-600 active:scale-95 flex flex-col items-center gap-0.5">
          <span>🏪</span><span>Vendeur</span>
        </button>
      </div>
    </div>
  );
}

// ── Ongoing Card — Livraison en route ─────────────────────────────
function OngoingCard({ order, onShowQR, onChatBuyer, onChatSeller }: {
  order: Order;
  onShowQR: () => void;
  onChatBuyer: () => void;
  onChatSeller: () => void;
}) {
  const ord = order as any;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-amber-400">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">🛵</div>
        <div className="flex-1">
          <p className="font-black text-slate-900 text-[13px]">{order.productTitle}</p>
          <p className="text-[11px] text-slate-400">{ord.sellerNeighborhood} → {ord.buyerNeighborhood}</p>
          <p className="text-[10px] font-bold text-amber-600 mt-0.5">🛵 Colis récupéré — en route</p>
        </div>
      </div>

      {/* Étape 2 : montrer QR à l'acheteur */}
      <div className="bg-amber-50 rounded-xl p-3 mb-3">
        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">✅ Étape 2 — Livrer à l'acheteur</p>
        <p className="text-[11px] text-amber-600">À l'arrivée, affiche ton QR à l'acheteur pour qu'il le scanne et confirme.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={onShowQR}
          className="flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95"
          style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
          📲 Afficher mon QR
        </button>
        <button onClick={onChatBuyer} title="Chat acheteur"
          className="px-3 py-3 rounded-xl bg-blue-50 font-black text-[9px] text-blue-600 active:scale-95 flex flex-col items-center gap-0.5">
          <span>👤</span><span>Acheteur</span>
        </button>
        <button onClick={onChatSeller} title="Chat vendeur"
          className="px-3 py-3 rounded-xl bg-slate-100 font-black text-[9px] text-slate-600 active:scale-95 flex flex-col items-center gap-0.5">
          <span>🏪</span><span>Vendeur</span>
        </button>
      </div>
    </div>
  );
}
