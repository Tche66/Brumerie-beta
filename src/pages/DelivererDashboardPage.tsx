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
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

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
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">🌍 Toutes les missions disponibles</p>
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
                <p className="text-[10px] text-slate-400 mt-2">Aucune nouvelle mission disponible pour le moment. Reviens plus tard !</p>
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
            ) : myDone.map(order => {
              const ord = order as any;
              const fee = ord.deliveryFee || 0;
              const deliveredAt = ord.deliveredAt?.toDate?.() || ord.deliveryPickedAt?.toDate?.() || null;
              const dateStr = deliveredAt ? deliveredAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null;
              const timeStr = deliveredAt ? deliveredAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="flex items-center gap-3 p-3">
                    {ord.productImage
                      ? <img src={ord.productImage} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>
                      : <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-xl flex-shrink-0">✅</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-[12px] truncate">{order.productTitle}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{ord.sellerNeighborhood || '—'} → {ord.buyerNeighborhood || '—'}</p>
                      {dateStr && <p className="text-[9px] text-slate-400 mt-0.5">📅 {dateStr} à {timeStr}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-green-600 text-[15px]">+{fee.toLocaleString('fr-FR')} F</p>
                      {(() => {
                const chosen = ord.chosenPaymentMethod;
                if (chosen) {
                  const icon = chosen.method === 'especes' ? '💵' : '📱';
                  const label = `${icon} ${chosen.methodName}${chosen.phone ? ' · ' + chosen.phone : ''}`;
                  return <p className="text-[9px] text-slate-400 mt-0.5">{label}</p>;
                }
                const isCOD = ord.isCOD;
                const method = ord.paymentInfo?.method;
                const label = isCOD ? '💵 Espèces' : method ? ('📱 ' + (method === 'wave' ? 'Wave' : method === 'orange_money' ? 'Orange Money' : method === 'mtn' ? 'MTN' : method === 'moov' ? 'Moov' : method)) : '📱 Mobile';
                return <p className="text-[9px] text-slate-400 mt-0.5">{label}</p>;
              })()}
                    </div>
                  </div>
                  <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[8px] text-slate-400 uppercase font-bold">Vendeur</p>
                        <p className="text-[10px] font-black text-slate-700 truncate max-w-[90px]">{ord.sellerName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-400 uppercase font-bold">Acheteur</p>
                        <p className="text-[10px] font-black text-slate-700 truncate max-w-[90px]">{ord.buyerName || '—'}</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-green-100 text-green-700 font-black px-2 py-0.5 rounded-full">Livré ✓</span>
                  </div>
                </div>
              );
            })}
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



// ── CashPickupButton — COD espèces uniquement : livreur confirme avoir récupéré le colis ──
function CashPickupButton({ orderId, order }: { orderId: string; order: Order }) {
  // ⚠️ TOUS les hooks AVANT tout return conditionnel (Rules of Hooks)
  const [loading, setLoading] = React.useState(false);
  const [signed, setSigned] = React.useState(false);
  const [signedAt, setSignedAt] = React.useState<string | null>(null);
  const [signError, setSignError] = React.useState<string | null>(null);

  const alreadyPicked = order.status === 'picked';
  const pickupTime = (order as any).deliveryPickedAt?.toDate?.()
    ? new Date((order as any).deliveryPickedAt.toDate()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleSign = async () => {
    setLoading(true);
    setSignError(null);
    try {
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'picked',
        deliveryPickedAt: serverTimestamp(),
      });
      setSigned(true);
      setSignedAt(timeStr);
    } catch (e: any) {
      console.error(e);
      setSignError('Erreur : ' + (e?.message || 'réessaie'));
    } finally {
      setLoading(false);
    }
  };

  // Early returns APRÈS tous les hooks
  if (alreadyPicked || signed) {
    const timeStr = signedAt || pickupTime || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 mb-3 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-[12px] font-black text-green-800">Colis récupéré chez le vendeur</p>
            <p className="text-[10px] text-green-600">Signé à {timeStr} · En route — encaisse à la livraison</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-4 mb-3 space-y-3">
      <div>
        <p className="text-[11px] font-black text-orange-800 mb-0.5">📦 Confirmer récupération du colis</p>
        <p className="text-[10px] text-orange-700 leading-relaxed">
          Signe pour confirmer que tu as récupéré le colis chez le vendeur et que tu es en route vers l&apos;acheteur. Tu encaisseras le paiement à la livraison.
        </p>
      </div>
      <button onClick={handleSign} disabled={loading}
        className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 disabled:opacity-50 transition-all"
        style={{ background: loading ? '#9CA3AF' : 'linear-gradient(135deg,#D4500F,#ea580c)' }}>
        {loading
          ? <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
              Signature en cours...
            </span>
          : <span>✍️ Je confirme avoir récupéré le colis</span>
        }
      </button>
      {signError && <p className="text-[10px] text-red-600 text-center font-bold">{signError}</p>}
    </div>
  );
}



// ── DeliveryDetailModal — infos complètes de la livraison ──
function DeliveryDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const ord = order as any;
  const createdAt = ord.createdAt?.toDate?.() || (ord.createdAt ? new Date(ord.createdAt) : null);
  const pickedAt = ord.deliveryPickedAt?.toDate?.() || null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-end justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
        style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
        <div className="px-6 pt-5 pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-black text-slate-900 text-[16px] uppercase tracking-tight">📋 Détails livraison</p>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black active:scale-90">✕</button>
          </div>

          {/* Article */}
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
            {ord.productImage
              ? <img src={ord.productImage} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0"/>
              : <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-2xl flex-shrink-0">📦</div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-900 text-[13px] truncate">{order.productTitle}</p>
              <p className="text-[11px] text-green-600 font-black mt-0.5">
                {(ord.productPrice || order.price || 0).toLocaleString('fr-FR')} FCFA
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-bold">
                {ord.isCOD ? '💵 Paiement à la livraison (COD)' : '📱 Paiement mobile money'}
              </p>
            </div>
          </div>

          {/* Montants */}
          <div className="bg-green-50 rounded-2xl p-4 space-y-2 border border-green-100">
            <p className="text-[9px] font-black text-green-800 uppercase tracking-widest">💰 Montants</p>
            <div className="flex justify-between">
              <p className="text-[11px] text-slate-600">Prix article</p>
              <p className="font-black text-slate-900 text-[12px]">{(ord.productPrice || 0).toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div className="flex justify-between border-t border-green-100 pt-2">
              <p className="text-[11px] font-black text-green-700">Tes frais de livraison</p>
              <p className="font-black text-green-700 text-[14px]">{(ord.deliveryFee || 0).toLocaleString('fr-FR')} FCFA</p>
            </div>
          </div>

          {/* Trajet */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">📍 Trajet</p>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-green-500"/>
                <div className="w-0.5 h-8 bg-slate-200"/>
                <div className="w-3 h-3 rounded-full bg-blue-500"/>
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Collecte chez le vendeur</p>
                  <p className="font-black text-slate-900 text-[12px]">{ord.sellerNeighborhood || '—'}</p>
                  {ord.sellerName && <p className="text-[10px] text-slate-500">{ord.sellerName}</p>}
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Livraison chez l&apos;acheteur</p>
                  <p className="font-black text-slate-900 text-[12px]">{ord.buyerNeighborhood || '—'}</p>
                  {ord.buyerName && <p className="text-[10px] text-slate-500">{ord.buyerName}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">📞 Contacts</p>
            {ord.sellerPhone && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Vendeur</p>
                  <p className="font-black text-slate-900 text-[12px]">{ord.sellerPhone}</p>
                </div>
                <a href={"tel:" + ord.sellerPhone.replace(/\D/g, '')}
                  className="px-4 py-2 rounded-xl font-black text-[10px] text-white active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
                  📞 Appel
                </a>
              </div>
            )}
            {ord.buyerPhone && (
              <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Acheteur</p>
                  <p className="font-black text-slate-900 text-[12px]">{ord.buyerPhone}</p>
                </div>
                <a href={"tel:" + ord.buyerPhone.replace(/\D/g, '')}
                  className="px-4 py-2 rounded-xl font-black text-[10px] text-white active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
                  📞 Appel
                </a>
              </div>
            )}
          </div>

          {/* Dates */}
          {(createdAt || pickedAt) && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🕐 Chronologie</p>
              {createdAt && (
                <div className="flex justify-between">
                  <p className="text-[10px] text-slate-500">Commande passée</p>
                  <p className="text-[10px] font-bold text-slate-700">
                    {createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
              {pickedAt && (
                <div className="flex justify-between">
                  <p className="text-[10px] text-slate-500">Colis récupéré</p>
                  <p className="text-[10px] font-bold text-slate-700">
                    {pickedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CodCashBlock — bouton collecte cash COD + signalement ──
function CodCashBlock({ order }: { order: Order }) {
  const ord = order as any;
  const sellerPhone = ord.sellerPhone || '';

  return (
    <div className="space-y-2">
      <CashCollectButton orderId={order.id} />
      <div className="flex gap-2">
        {sellerPhone ? (
          <a href={`tel:${sellerPhone}`}
            className="flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-green-700 bg-green-50 border border-green-200 flex items-center justify-center gap-1.5 active:scale-95">
            📞 Vendeur
          </a>
        ) : null}
        <DisputeButton orderId={order.id} />
      </div>
    </div>
  );
}

// ── DisputeButton — signaler un problème ──
function DisputeButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  if (done) return (
    <div className="flex-1 py-2.5 rounded-xl bg-slate-100 flex items-center justify-center">
      <p className="text-[10px] font-black text-slate-500">Signalé ✓</p>
    </div>
  );

  return (
    <button onClick={async () => {
      setLoading(true);
      try {
        await updateDoc(doc(db, 'orders', orderId), { status: 'disputed', disputeReason: 'Livreur — problème encaissement COD' });
        setDone(true);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }} disabled={loading}
      className="flex-1 py-2.5 rounded-xl bg-slate-100 font-black text-[10px] text-slate-600 uppercase tracking-widest active:scale-95 disabled:opacity-50">
      🚨 Signaler
    </button>
  );
}

// ── BuyerPaidDirectlyButton — raccourci : acheteur a payé le vendeur directement ──
function BuyerPaidDirectlyButton({ orderId, order }: { orderId: string; order: Order }) {
  const [loading, setLoading] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const ord = order as any;

  if (!confirm) return (
    <button onClick={() => setConfirm(true)}
      className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 font-black text-[10px] text-slate-500 uppercase tracking-widest active:scale-95 mb-2">
      💳 L&apos;acheteur a payé le vendeur directement
    </button>
  );

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3 space-y-2 mb-2">
      <p className="text-[10px] font-black text-blue-800">Confirmer le paiement direct ?</p>
      <p className="text-[9px] text-blue-700">L&apos;acheteur a payé le vendeur par Wave / mobile money. Tu n&apos;encaisses pas le cash. La course se termine pour toi.</p>
      <div className="flex gap-2">
        <button onClick={() => setConfirm(false)}
          className="flex-1 py-2 rounded-xl bg-slate-100 font-black text-[9px] text-slate-600 active:scale-95">
          Annuler
        </button>
        <button onClick={async () => {
          setLoading(true);
          try {
            await updateDoc(doc(db, 'orders', orderId), {
              buyerPaidSellerDirectly: true,
              buyerPaidSellerDirectlyAt: serverTimestamp(),
            });
            const { createNotification } = await import('@/services/notificationService');
            await Promise.all([
              createNotification(ord.buyerId, 'system',
                '✅ Paiement direct confirmé',
                `Le livreur confirme que tu as payé le vendeur directement pour "${ord.productTitle}".`,
                { orderId, productId: ord.productId }
              ),
              createNotification(ord.sellerId, 'system',
                '✅ Paiement direct confirmé',
                `Le livreur confirme que l\'acheteur t\'a payé directement pour "${ord.productTitle}". Confirme la réception du paiement.`,
                { orderId, productId: ord.productId }
              ),
            ]);
          } catch (e) { console.error(e); }
          finally { setLoading(false); }
        }} disabled={loading}
          className="flex-1 py-2 rounded-xl font-black text-[9px] text-white active:scale-95 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' }}>
          {loading ? '...' : '✅ Confirmer'}
        </button>
      </div>
    </div>
  );
}

// ── CODStepsBlock — flux 3 étapes séquentiel pour COD espèces (après picked) ──
function CODStepsBlock({ orderId, order }: { orderId: string; order: Order }) {
  const [loadingStep2, setLoadingStep2] = React.useState(false);
  const [loadingStep3, setLoadingStep3] = React.useState(false);
  const [errStep2, setErrStep2] = React.useState<string | null>(null);
  const [errStep3, setErrStep3] = React.useState<string | null>(null);
  const ord = order as any;

  const step2Done = ord.delivererCashCollected;
  const step3Done = ord.sellerCashReturned;

  const handleDelivered = async () => {
    setLoadingStep2(true); setErrStep2(null);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        delivererCashCollected: true,
        delivererCashCollectedAt: serverTimestamp(),
      });
      const { createNotification } = await import('@/services/notificationService');
      await Promise.all([
        createNotification(ord.buyerId, 'system',
          '🚀 Ton article est en route !',
          `Le livreur arrive avec "${ord.productTitle}". Prépare le paiement.`,
          { orderId, productId: ord.productId }
        ),
        createNotification(ord.sellerId, 'system',
          '🛵 Livreur en route vers l\'acheteur',
          `Le livreur collecte le paiement. Si tu veux que l\'acheteur paie autrement, contacte-le maintenant.`,
          { orderId, productId: ord.productId }
        ),
      ]);
    } catch (e: any) { setErrStep2(e?.message || 'Erreur'); }
    finally { setLoadingStep2(false); }
  };

  const handleReturnCash = async () => {
    setLoadingStep3(true); setErrStep3(null);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        sellerCashReturned: true,
        sellerCashReturnedAt: serverTimestamp(),
      });
      const { createNotification } = await import('@/services/notificationService');
      await createNotification(ord.sellerId, 'system',
        '💰 Le livreur dit avoir remis ton argent',
        `Confirme la réception de ${(ord.productPrice || 0).toLocaleString('fr-FR')} FCFA dans ta commande.`,
        { orderId, productId: ord.productId }
      );
    } catch (e: any) { setErrStep3(e?.message || 'Erreur'); }
    finally { setLoadingStep3(false); }
  };

  return (
    <div className="space-y-2 mb-3">
      {/* Étape 2 — Livrer + collecter */}
      {!step2Done ? (
        <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-[10px] font-black text-amber-800">💵 Étape 2 — Livrer et collecter le paiement</p>
          <p className="text-[9px] text-amber-700">Une fois chez l&apos;acheteur : remets le colis et collecte le paiement.</p>
          <button onClick={handleDelivered} disabled={loadingStep2}
            className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-white active:scale-95 disabled:opacity-50"
            style={{ background: loadingStep2 ? '#9CA3AF' : 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
            {loadingStep2
              ? <span className="flex items-center justify-center gap-1"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />En cours...</span>
              : '📦 J\'ai livré le colis — cash collecté'
            }
          </button>
          {errStep2 && <p className="text-[9px] text-red-600 text-center font-bold">{errStep2}</p>}
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2">
          <span>✅</span>
          <p className="text-[10px] font-black text-green-700">Colis livré — cash collecté</p>
        </div>
      )}

      {/* Étape 3 — Remettre au vendeur */}
      {step2Done && !step3Done && (
        <div className="rounded-xl border-2 border-dashed border-green-400 bg-green-50 p-3 space-y-2">
          <p className="text-[10px] font-black text-green-800">🤝 Étape 3 — Remettre la part du vendeur</p>
          <p className="text-[9px] text-green-700">Remets <span className="font-black">{(ord.productPrice || 0).toLocaleString('fr-FR')} FCFA</span> au vendeur. Il confirmera la réception.</p>
          <button onClick={handleReturnCash} disabled={loadingStep3}
            className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-white active:scale-95 disabled:opacity-50"
            style={{ background: loadingStep3 ? '#9CA3AF' : 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
            {loadingStep3
              ? <span className="flex items-center justify-center gap-1"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Signature...</span>
              : '✍️ Je signe — j\'ai remis l\'argent au vendeur'
            }
          </button>
          {errStep3 && <p className="text-[9px] text-red-600 text-center font-bold">{errStep3}</p>}
        </div>
      )}
      {step2Done && step3Done && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2">
          <span>✅</span>
          <p className="text-[10px] font-black text-green-700">Argent remis — en attente confirmation vendeur</p>
        </div>
      )}
    </div>
  );
}

function CashCollectButton({ orderId }: { orderId: string }) { return null; }

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
  const [showDetail, setShowDetail] = React.useState(false);

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); }
    catch { const el = document.createElement('input'); el.value = code; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ord2 = order as any;
  const statusLabel = order.status === 'picked'
    ? { icon: '🛵', text: "En route vers l'acheteur", color: 'text-green-600', bg: 'border-green-500' }
    : (order.status === 'cod_confirmed' || order.status === 'ready' || order.status === 'confirmed') && ord2.isCOD
    ? { icon: '📦', text: 'COD — récupère le colis chez le vendeur', color: 'text-blue-600', bg: 'border-blue-400' }
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
      ) : null}

      {/* Bouton voir détails complets */}
      <button onClick={() => setShowDetail(true)}
        className="w-full py-2.5 rounded-xl bg-slate-50 font-black text-[10px] uppercase tracking-widest text-slate-500 border border-slate-100 active:scale-95 mb-2">
        📋 Voir les détails de la livraison
      </button>

      {/* Modal détails livraison */}
      {showDetail && <DeliveryDetailModal order={order} onClose={() => setShowDetail(false)} />}

      {!code && (
        <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-100">
          <p className="text-[11px] text-amber-700 font-bold">⏳ Code en cours de génération...</p>
        </div>
      )}

      {/* COD espèces seulement : bouton "Paiement récupéré chez le vendeur" → picked */}
      {ord.isCOD && ['cod_confirmed', 'ready', 'confirmed'].includes(order.status) && (
        <CashPickupButton orderId={order.id} order={order} />
      )}
      {/* COD espèces : flux 3 étapes + raccourci si acheteur a déjà payé autrement */}
      {ord.isCOD && order.status === 'picked' && (
        <>
          {/* Raccourci : acheteur a payé le vendeur directement */}
          {!ord.delivererCashCollected && !ord.buyerPaidSellerDirectly && (
            <BuyerPaidDirectlyButton orderId={order.id} order={order} />
          )}
          {ord.buyerPaidSellerDirectly ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2 mb-3">
              <span>✅</span>
              <p className="text-[10px] font-black text-green-700">Acheteur a payé le vendeur — course terminée</p>
            </div>
          ) : (
            <CODStepsBlock orderId={order.id} order={order} />
          )}
        </>
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
