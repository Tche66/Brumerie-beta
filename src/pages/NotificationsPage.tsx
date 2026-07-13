// src/pages/NotificationsPage.tsx — v19 : onglets par catégorie
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToNotifications, markNotificationRead,
  markAllNotificationsRead, AppNotification,
} from '@/services/notificationService';
import { requestPushPermission, isPushGranted } from '@/services/pushService';

interface NotificationsPageProps {
  onBack: () => void;
  onOpenConversation?: (convId: string) => void;
  onOpenOrder?: (orderId: string) => void;
}

type TabFilter = 'all' | 'messages' | 'orders' | 'system';

function timeAgo(ts: any): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'maintenant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

// Icônes par type
const ICONS: Record<string, React.ReactNode> = {
  message: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  reply: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  favorite: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#16A34A">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  new_favorite: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#16A34A">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  order: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  ),
  like: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#EF4444" stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  ),
  comment: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  comment_reply: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,14 4,9 9,4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/>
    </svg>
  ),
  repost: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17,1 21,5 17,9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7,23 3,19 7,15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
    </svg>
  ),
  follow: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/>
    </svg>
  ),
  new_product: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
    </svg>
  ),
  system: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

const BG: Record<string, string> = {
  message:      'bg-blue-50',
  reply:        'bg-blue-50',
  favorite:     'bg-green-50',
  new_favorite: 'bg-green-50',
  order:        'bg-amber-50',
  system:       'bg-slate-50',
};

// Catégorisation d'une notif → tab
function getTab(notif: AppNotification): TabFilter {
  const t = notif.type as string;
  if (t === 'message' || t === 'reply') return 'messages';
  if (t === 'order') return 'orders';
  // Détection par title pour les notifs anciennes sans type 'order'
  const title = notif.title || '';
  if (
    title.includes('commande') || title.includes('paiement') ||
    title.includes('Livraison') || title.includes('livraison') ||
    title.includes('reçu') || title.includes('Litige') ||
    title.includes('mission') || title.includes('Mission') ||
    title.includes('COD') || title.includes('collecté')
  ) return 'orders';
  if (t === 'favorite' || t === 'new_favorite') return 'system';
  return 'system';
}

const TABS: { id: TabFilter; label: string; emoji: string }[] = [
  { id: 'all',      label: 'Tout',      emoji: '🔔' },
  { id: 'messages', label: 'Messages',  emoji: '💬' },
  { id: 'orders',   label: 'Commandes', emoji: '📦' },
  { id: 'system',   label: 'Système',   emoji: '⚙️' },
];

export function NotificationsPage({ onBack, onOpenConversation, onOpenOrder }: NotificationsPageProps) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushGranted, setPushGranted] = useState(isPushGranted());
  const [requestingPush, setRequestingPush] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, notifs => {
      setNotifications(notifs);
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    await markAllNotificationsRead(currentUser.uid);
  };

  const handleNotifClick = async (notif: AppNotification) => {
    if (!currentUser) return;
    if (!notif.read) await markNotificationRead(currentUser.uid, notif.id);
    if (notif.data?.orderId && onOpenOrder) { onOpenOrder(notif.data.orderId); return; }
    if (notif.data?.conversationId && onOpenConversation) { onOpenConversation(notif.data.conversationId); return; }
    const title = notif.title || '';
    if (
      title.includes('commande') || title.includes('paiement') ||
      title.includes('Livraison') || title.includes('reçu') ||
      title.includes('Litige') || title.includes('Nouvelle')
    ) { onOpenOrder?.(''); }
  };

  const handleEnablePush = async () => {
    if (!currentUser) return;
    setRequestingPush(true);
    const granted = await requestPushPermission(currentUser.uid);
    setPushGranted(granted);
    setRequestingPush(false);
  };

  // Filtrage selon l'onglet actif
  const filtered = activeTab === 'all'
    ? notifications
    : notifications.filter(n => getTab(n) === activeTab);

  const unreadTotal = notifications.filter(n => !n.read).length;

  // Compteurs par onglet pour les badges
  const counts: Record<TabFilter, number> = {
    all:      notifications.filter(n => !n.read).length,
    messages: notifications.filter(n => !n.read && getTab(n) === 'messages').length,
    orders:   notifications.filter(n => !n.read && getTab(n) === 'orders').length,
    system:   notifications.filter(n => !n.read && getTab(n) === 'system').length,
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">

      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 pt-12 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 active:scale-90 transition-all">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-black text-slate-900 text-[15px] uppercase tracking-tight">Notifications</h1>
            {unreadTotal > 0 && (
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">
                {unreadTotal} non lue{unreadTotal > 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadTotal > 0 && (
            <button onClick={handleMarkAllRead}
              className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-xl active:scale-95 transition-all">
              Tout lire
            </button>
          )}
        </div>

        {/* Onglets catégories */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const badge = counts[tab.id];
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 flex-shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                }`}>
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                {badge > 0 && (
                  <span className={`w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center ${
                    isActive ? 'bg-white text-slate-900' : 'bg-blue-500 text-white'
                  }`}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bannière activation push */}
      {!pushGranted && (
        <div className="mx-6 mt-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-[2rem] p-5 border border-blue-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-black text-blue-900 text-[12px] uppercase tracking-tight mb-1">Activer les notifications</p>
              <p className="text-blue-700 text-[10px] font-medium leading-relaxed mb-3">
                Reçois une alerte dès qu'un message ou une commande arrive.
              </p>
              <button onClick={handleEnablePush} disabled={requestingPush}
                className="bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50">
                {requestingPush ? 'En cours...' : 'Activer maintenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste notifications filtrées */}
      <div className="mt-4">
        {loading ? (
          <div className="space-y-3 px-6 mt-4">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded-full w-3/4" />
                  <div className="h-2.5 bg-slate-50 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 px-10 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
              {activeTab === 'all' ? 'Aucune notification' : `Aucune notif ${TABS.find(t => t.id === activeTab)?.label.toLowerCase()}`}
            </h3>
            <p className="text-slate-400 text-[11px] font-medium leading-relaxed">
              {activeTab === 'all'
                ? 'Les nouvelles activités apparaîtront ici.'
                : 'Change d\'onglet pour voir les autres notifications.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(notif => (
              <button key={notif.id} onClick={() => handleNotifClick(notif)}
                className={`w-full flex items-start gap-4 px-6 py-4 text-left transition-all active:bg-slate-50 ${!notif.read ? 'bg-blue-50/40' : ''}`}>
                {/* Icône */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${BG[notif.type as string] || 'bg-slate-50'}`}>
                  {ICONS[notif.type as string] || ICONS.system}
                </div>
                {/* Contenu */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[12px] leading-snug tracking-tight ${!notif.read ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[9px] text-slate-400 font-bold flex-shrink-0 mt-0.5">
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">{notif.body}</p>
                </div>
                {/* Point non-lu */}
                {!notif.read && (
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
