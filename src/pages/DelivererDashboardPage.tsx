// src/pages/DelivererDashboardPage.tsx
// Interface principale du livreur — 4 onglets

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeDeliveryRequests, respondToDeliveryRequest,
  confirmPickup, toggleDelivererAvailability, getDelivererHistory,
} from '@/services/deliveryService';
import { BecomeDelivererPage } from '@/pages/BecomeDelivererPage';
import type { DeliveryRequest } from '@/types';

interface Props { onNavigate: (page: string) => void; onChat: (userId: string, userName: string) => void; }

type Tab = 'available' | 'ongoing' | 'earnings' | 'profile';

export function DelivererDashboardPage({ onNavigate, onChat }: Props) {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('available');
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [history, setHistory] = useState<DeliveryRequest[]>([]);
  const [available, setAvailable] = useState(userProfile?.deliveryAvailable ?? true);
  const [toggling, setToggling] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeDeliveryRequests(currentUser.uid, setRequests);
    return unsub;
  }, [currentUser?.uid]);

  useEffect(() => {
    if (tab === 'earnings' && currentUser) {
      getDelivererHistory(currentUser.uid).then(setHistory);
    }
  }, [tab, currentUser?.uid]);

  const pending   = requests.filter(r => r.status === 'pending');
  const ongoing   = requests.filter(r => ['accepted', 'picked'].includes(r.status));
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

  const handleRespond = async (req: DeliveryRequest, accepted: boolean) => {
    if (!userProfile) return;
    await respondToDeliveryRequest(
      req.id, req.orderId,
      currentUser!.uid,
      userProfile.deliveryPartnerName || userProfile.name,
      userProfile.phone || '',
      accepted
    );
  };

  const handlePickup = async (req: DeliveryRequest) => {
    await confirmPickup(req.id, req.orderId);
  };

  const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: 'available', label: 'Disponible', icon: '📦', badge: pending.length },
    { id: 'ongoing',   label: 'En cours',   icon: '🛵', badge: ongoing.length },
    { id: 'earnings',  label: 'Gains',       icon: '💰' },
    { id: 'profile',   label: 'Mon profil',  icon: '👤' },
  ];

  if (showEditProfile) {
    return (
      <BecomeDelivererPage
        onBack={() => setShowEditProfile(false)}
        onDone={() => { setShowEditProfile(false); refreshUserProfile(); }}
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
          {/* Toggle disponibilité */}
          <button onClick={handleToggle} disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
              available ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            <div className={`w-2 h-2 rounded-full ${available ? 'bg-white animate-pulse' : 'bg-slate-400'}`}/>
            {available ? 'Dispo' : 'Indispo'}
          </button>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all relative ${
                tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              <span>{t.icon}</span>
              <br/>
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

        {/* ── ONGLET DISPONIBLE ── */}
        {tab === 'available' && (
          <div className="flex flex-col gap-3">
            {!available && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <p className="font-black text-amber-700 text-[12px]">Tu es en mode indisponible</p>
                <p className="text-amber-600 text-[11px]">Active ta disponibilité pour recevoir des missions</p>
              </div>
            )}
            {pending.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📭</div>
                <p className="font-black text-slate-400 text-[13px]">Pas de nouvelles demandes</p>
                <p className="text-slate-400 text-[11px] mt-1">Les missions dans tes quartiers apparaîtront ici</p>
              </div>
            ) : pending.map(req => (
              <RequestCard key={req.id} req={req}
                onAccept={() => handleRespond(req, true)}
                onReject={() => handleRespond(req, false)}
                onChat={() => onChat(req.orderId, req.buyerName)}/>
            ))}
          </div>
        )}

        {/* ── ONGLET EN COURS ── */}
        {tab === 'ongoing' && (
          <div className="flex flex-col gap-3">
            {ongoing.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🛵</div>
                <p className="font-black text-slate-400 text-[13px]">Aucune livraison en cours</p>
              </div>
            ) : ongoing.map(req => (
              <OngoingCard key={req.id} req={req}
                onPickup={() => handlePickup(req)}
                onChat={() => onChat(req.orderId, req.buyerName)}/>
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
            {history.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400 text-[12px]">Tes livraisons complétées apparaîtront ici</p>
              </div>
            ) : history.map(req => (
              <div key={req.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-lg">✅</div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 text-[12px] truncate">{req.productTitle}</p>
                  <p className="text-[10px] text-slate-400">{req.fromNeighborhood} → {req.toNeighborhood}</p>
                </div>
                <p className="font-black text-green-600 text-[13px] whitespace-nowrap">
                  +{req.estimatedFee.toLocaleString('fr-FR')} F
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
              <p className="text-[11px] font-bold text-green-700">
                📍 {(userProfile?.deliveryZones || []).join(' · ')}
              </p>
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

            <button onClick={() => onNavigate('become-deliverer')}
              className="w-full py-4 bg-slate-100 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-600 active:scale-95 transition-all">
              ✏️ Modifier mon profil livreur
            </button>

            <button onClick={() => onNavigate('settings')}
              className="w-full py-4 bg-slate-100 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-600 active:scale-95 transition-all">
              ⚙️ Paramètres compte
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────

function RequestCard({ req, onAccept, onReject, onChat }: {
  req: DeliveryRequest;
  onAccept: () => void;
  onReject: () => void;
  onChat: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-green-500">
      <div className="flex items-start gap-3 mb-3">
        {req.productImage
          ? <img src={req.productImage} alt="" className="w-12 h-12 rounded-xl object-cover"/>
          : <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl">📦</div>
        }
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 text-[13px] truncate">{req.productTitle}</p>
          <p className="text-[11px] text-slate-500">{req.fromNeighborhood} → {req.toNeighborhood}</p>
          <p className="text-[11px] text-slate-400">Vendeur : {req.sellerName}</p>
        </div>
        <div className="text-right">
          <p className="font-black text-green-600 text-[15px]">{req.estimatedFee.toLocaleString('fr-FR')}</p>
          <p className="text-[9px] text-slate-400 font-bold">FCFA</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onAccept}
          className="flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
          ✅ Accepter
        </button>
        <button onClick={onChat}
          className="px-4 py-3 rounded-xl bg-slate-100 font-black text-[11px] text-slate-600 active:scale-95">
          💬
        </button>
        <button onClick={onReject}
          className="px-4 py-3 rounded-xl bg-red-50 font-black text-[11px] text-red-500 active:scale-95">
          ✕
        </button>
      </div>
    </div>
  );
}

function OngoingCard({ req, onPickup, onChat }: {
  req: DeliveryRequest;
  onPickup: () => void;
  onChat: () => void;
}) {
  const isPicked = req.status === 'picked';
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-amber-400">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isPicked ? 'bg-amber-100' : 'bg-green-100'}`}>
          {isPicked ? '🛵' : '📦'}
        </div>
        <div className="flex-1">
          <p className="font-black text-slate-900 text-[13px]">{req.productTitle}</p>
          <p className="text-[11px] text-slate-400">{req.fromNeighborhood} → {req.toNeighborhood}</p>
          <p className="text-[10px] font-bold mt-0.5" style={{ color: isPicked ? '#d97706' : '#16a34a' }}>
            {isPicked ? '🛵 Colis récupéré — en route' : '✅ Mission acceptée'}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {!isPicked && (
          <button onClick={onPickup}
            className="flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95"
            style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
            📦 Colis récupéré
          </button>
        )}
        {isPicked && (
          <div className="flex-1 py-3 rounded-xl bg-amber-50 text-center font-black text-[11px] text-amber-700 uppercase tracking-widest">
            En route 🛵
          </div>
        )}
        <button onClick={onChat}
          className="px-4 py-3 rounded-xl bg-slate-100 font-black text-[11px] text-slate-600">
          💬
        </button>
      </div>
    </div>
  );
}
