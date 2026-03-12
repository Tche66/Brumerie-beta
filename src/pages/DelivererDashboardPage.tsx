// src/pages/DelivererDashboardPage.tsx — v17 simplifié
// Dashboard livreur : 4 onglets | Scan QR vendeur | Affiche QR pour acheteur

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeDelivererOrders,
  subscribeOpenOrdersInZone,
  confirmDeliveryByBuyer,
  confirmPickupByDeliverer,
  toggleDelivererAvailability,
} from '@/services/deliveryService';
import { BecomeDelivererPage } from '@/pages/BecomeDelivererPage';
import { EditDelivererProfilePage } from '@/pages/EditDelivererProfilePage';
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
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [available, setAvailable] = useState(userProfile?.deliveryAvailable ?? true);
  const [toggling, setToggling]   = useState(false);

  // QR actions
  const [showQRDelivery, setShowQRDelivery]       = useState<Order | null>(null); // Afficher mon QR pour acheteur
  const [showEditProfile, setShowEditProfile]     = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsub1 = subscribeDelivererOrders(currentUser.uid, setOrders);
    return unsub1;
  }, [currentUser?.uid]);

  // Missions ouvertes dans les zones du livreur
  useEffect(() => {
    const zones = userProfile?.deliveryZones || [];
    if (zones.length === 0) return;
    const unsub = subscribeOpenOrdersInZone(zones, setOpenOrders);
    return unsub;
  }, [JSON.stringify(userProfile?.deliveryZones)]);

  // MISSIONS = commandes ouvertes dans sa zone (pas encore assignées)
  //            + ses commandes assignées en attente de code (confirmed)
  const myAssignedPending = orders.filter(o => o.status === 'confirmed');
  // Dédupliquer : openOrders peut contenir ses commandes assigned
  const myOpenOrders = openOrders.filter(o => o.id && !orders.some(mo => mo.id === o.id));
  const allMissions  = [...myAssignedPending, ...myOpenOrders];
  // EN COURS  = code généré → livreur peut agir
  const myOngoing  = orders.filter(o => ['ready', 'cod_confirmed', 'picked'].includes(o.status));
  const myDone     = orders.filter(o => o.status === 'delivered');
  const myPending  = allMissions; // alias pour le badge
  // Recalcul live depuis les commandes réelles (plus fiable que userProfile stale)
  const myDoneOrders = orders.filter(o => o.status === 'delivered');
  const totalGains = myDoneOrders.reduce((sum, o) => sum + ((o as any).deliveryFee || 0), 0)
    || userProfile?.totalEarnings || 0;
  const totalCount = myDoneOrders.length || userProfile?.totalDeliveries || 0;

  const handleToggle = async () => {
    if (!currentUser) return;
    setToggling(true);
    const newVal = !available;
    await toggleDelivererAvailability(currentUser.uid, newVal);
    setAvailable(newVal);
    await refreshUserProfile();
    setToggling(false);
  };


  const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: 'available', label: 'Missions', icon: '📦', badge: allMissions.length },
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
            {/* Commandes assignées à moi en attente de code */}
            {myAssignedPending.length > 0 && (
              <div className="mb-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">📌 Assignées à toi</p>
                {myAssignedPending.map(order => (
                  <MissionCard key={order.id} order={order} isAssigned={true}
                    onChatBuyer={() => order.buyerId && onChat(order.buyerId, order.buyerName)}
                    onChatSeller={() => order.sellerId && onChat(order.sellerId, order.sellerName)}
                  />
                ))}
              </div>
            )}
            {/* Commandes ouvertes dans ma zone */}
            {myOpenOrders.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">🌍 Dans ta zone</p>
                {myOpenOrders.map(order => (
                  <MissionCard key={order.id} order={order} isAssigned={false}
                    onChatBuyer={() => order.buyerId && onChat(order.buyerId, order.buyerName)}
                    onChatSeller={() => order.sellerId && onChat(order.sellerId, order.sellerName)}
                  />
                ))}
              </div>
            )}
            {allMissions.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📦</div>
                <p className="font-black text-slate-400 text-[13px]">Aucune mission disponible</p>
                <p className="text-[10px] text-slate-400 mt-2">Les commandes de ta zone apparaîtront ici</p>
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET EN COURS (ready / cod_confirmed / picked) ── */}
        {tab === 'ongoing' && (
          <div className="flex flex-col gap-3">
            {myOngoing.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🛵</div>
                <p className="font-black text-slate-400 text-[13px]">Aucune livraison en cours</p>
                <p className="text-[10px] text-slate-400 mt-2">Les commandes avec code généré apparaîtront ici</p>
              </div>
            ) : myOngoing.map(order => (
              <ActiveDeliveryCard
                key={order.id}
                order={order}
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
// MissionCard — deux variantes : assignée (code en route) vs ouverte (pas encore assignée)
function MissionCard({ order, isAssigned, onChatSeller, onChatBuyer }: {
  order: Order;
  isAssigned: boolean;
  onChatSeller: () => void;
  onChatBuyer: () => void;
}) {
  const ord = order as any;
  const borderColor = isAssigned ? 'border-amber-400' : 'border-slate-300';

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 mb-3 ${borderColor}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {ord.productImage
          ? <img src={ord.productImage} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>
          : <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">📦</div>
        }
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 text-[13px] truncate">{order.productTitle}</p>
          <p className="text-[11px] text-slate-500">{ord.sellerNeighborhood} → {ord.buyerNeighborhood}</p>
          <p className="text-[10px] text-slate-400">Vendeur : {order.sellerName}</p>
          {ord.isCOD && <p className="text-[10px] font-bold text-blue-600 mt-0.5">💵 COD — paiement à la livraison</p>}
        </div>
        <div className="text-right flex-shrink-0">
          {isAssigned && ord.deliveryFee > 0 ? (
            <>
              <p className="font-black text-green-600 text-[15px]">{(ord.deliveryFee || 0).toLocaleString('fr-FR')}</p>
              <p className="text-[9px] text-slate-400 font-bold">FCFA</p>
            </>
          ) : (
            <p className="text-[10px] text-slate-400 font-bold">Tarif libre</p>
          )}
        </div>
      </div>

      {/* Statut */}
      {isAssigned ? (
        <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-100">
          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">⏳ Tu es assigné — attente code</p>
          <p className="text-[10px] text-amber-700">
            Le vendeur va valider et tu recevras le code directement dans &quot;En cours&quot;.
          </p>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-200">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">📦 Mission disponible</p>
          <p className="text-[10px] text-slate-500">
            Cette commande est dans ta zone. Contacte le vendeur ou l&apos;acheteur pour te proposer.
          </p>
        </div>
      )}

      {/* Boutons */}
      <div className="flex gap-2">
        <button onClick={onChatBuyer}
          className="flex-1 py-2.5 rounded-xl bg-blue-50 font-black text-[10px] text-blue-600 active:scale-95 flex items-center justify-center gap-1.5">
          <span>👤</span> Acheteur
        </button>
        <button onClick={onChatSeller}
          className="flex-1 py-2.5 rounded-xl bg-slate-100 font-black text-[10px] text-slate-600 active:scale-95 flex items-center justify-center gap-1.5">
          <span>🏪</span> Vendeur
        </button>
      </div>
    </div>
  );
}



// ── PickupConfirmButton — livreur confirme avoir récupéré le colis (cod_confirmed → picked) ──
function PickupConfirmButton({ orderId, order }: { orderId: string; order: Order }) {
  const [loading, setLoading] = React.useState(false);

  const handlePickup = async () => {
    setLoading(true);
    try {
      await confirmPickupByDeliverer(orderId, order);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <button onClick={handlePickup} disabled={loading}
      className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white mb-3 active:scale-95 disabled:opacity-50 transition-all"
      style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
      {loading
        ? <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
            Confirmation...
          </span>
        : '📦 J'ai récupéré le colis chez le vendeur'
      }
    </button>
  );
}

// ── CashCollectButton — livreur confirme avoir collecté le cash COD ──
function CashCollectButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [done, setDone]       = React.useState(false);

  const handleCollect = async () => {
    setLoading(true);
    try {
      const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      await updateDoc(doc(db, 'orders', orderId), {
        delivererCashCollected: true,
        delivererCashCollectedAt: serverTimestamp(),
      });
      setDone(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div className="bg-green-50 rounded-xl p-3 mb-3 border border-green-200 flex items-center gap-2">
      <span className="text-lg">✅</span>
      <p className="text-[11px] font-black text-green-700">Cash collecté — acheteur peut valider</p>
    </div>
  );

  return (
    <button onClick={handleCollect} disabled={loading}
      className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white mb-3 active:scale-95 disabled:opacity-50 transition-all"
      style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
      {loading
        ? <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
            Confirmation...
          </span>
        : '💵 J\'ai collecté le paiement cash'
      }
    </button>
  );
}

// ── ActiveDeliveryCard — EN COURS (ready / cod_confirmed / picked) ─
// Affiche le code directement — le livreur le transmet à l'acheteur
function ActiveDeliveryCard({ order, onChatBuyer, onChatSeller }: {
  order: Order;
  onChatBuyer: () => void;
  onChatSeller: () => void;
}) {
  const ord = order as any;
  const code = ord.deliveryCode || '';
  const [copied, setCopied] = React.useState(false);

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); }
    catch { const el = document.createElement('input'); el.value = code; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusLabel = order.status === 'picked'
    ? { icon: '🛵', text: 'Colis récupéré — en route', color: 'text-green-600', bg: 'border-green-500' }
    : order.status === 'cod_confirmed'
    ? { icon: '💵', text: 'COD — va chercher le colis', color: 'text-blue-600', bg: 'border-blue-400' }
    : { icon: '📦', text: 'Va chercher le colis chez le vendeur', color: 'text-amber-600', bg: 'border-amber-400' };

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${statusLabel.bg}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {ord.productImage
          ? <img src={ord.productImage} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>
          : <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">📦</div>
        }
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 text-[13px] truncate">{order.productTitle}</p>
          <p className="text-[11px] text-slate-500">{ord.sellerNeighborhood} → {ord.buyerNeighborhood}</p>
          <p className={`text-[10px] font-bold mt-0.5 ${statusLabel.color}`}>{statusLabel.icon} {statusLabel.text}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-black text-green-600 text-[15px]">{(ord.deliveryFee || 0).toLocaleString('fr-FR')}</p>
          <p className="text-[9px] text-slate-400 font-bold">FCFA</p>
        </div>
      </div>

      {/* CODE DE LIVRAISON — visible et copiable */}
      {code ? (
        <div className="rounded-2xl p-4 mb-3" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">🔐 Code de livraison — transmets-le à l&apos;acheteur</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-3xl font-black text-yellow-300 tracking-[0.35em] font-mono">{code}</span>
            <button onClick={copyCode}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-90 flex-shrink-0"
              style={{ background: copied ? '#16A34A' : 'rgba(255,255,255,0.15)', color: 'white' }}>
              {copied
                ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round"/></svg>Copié</>
                : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copier</>
              }
            </button>
          </div>
          <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">
            L&apos;acheteur saisit ce code sur Brumerie pour confirmer la réception. La livraison est validée automatiquement.
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-100">
          <p className="text-[11px] text-amber-700 font-bold">⏳ Code en cours de génération...</p>
        </div>
      )}

      {/* Bouton collecte cash COD — visible si COD + picked + pas encore collecté */}
      {/* Bouton récupération colis — cod_confirmed → picked */}
      {ord.isCOD && order.status === 'cod_confirmed' && (
        <PickupConfirmButton orderId={order.id} order={order} />
      )}
      {/* Bouton collecte cash — picked + pas encore collecté */}
      {ord.isCOD && order.status === 'picked' && !ord.delivererCashCollected && (
        <CashCollectButton orderId={order.id} />
      )}
      {ord.isCOD && ord.delivererCashCollected && (
        <div className="bg-green-50 rounded-xl p-3 mb-3 border border-green-200 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <p className="text-[11px] font-black text-green-700">Cash collecté — l&apos;acheteur peut valider la réception</p>
        </div>
      )}

      {/* Boutons contact */}
      <div className="flex gap-2">
        <button onClick={onChatBuyer}
          className="flex-1 py-2.5 rounded-xl bg-blue-50 font-black text-[10px] text-blue-600 active:scale-95 flex items-center justify-center gap-1.5">
          <span>👤</span> Acheteur
        </button>
        <button onClick={onChatSeller}
          className="flex-1 py-2.5 rounded-xl bg-slate-100 font-black text-[10px] text-slate-600 active:scale-95 flex items-center justify-center gap-1.5">
          <span>🏪</span> Vendeur
        </button>
      </div>
    </div>
  );
}
