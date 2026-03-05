// src/pages/NotificationsPage.tsx
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

function timeAgo(ts: any): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'maintenant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

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
  system: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

const BG: Record<string, string> = {
  message: 'bg-blue-50',
  reply: 'bg-blue-50',
  favorite: 'bg-green-50',
  system: 'bg-slate-50',
};

export function NotificationsPage({ onBack, onOpenConversation, onOpenOrder }: NotificationsPageProps) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushGranted, setPushGranted] = useState(isPushGranted());
  const [requestingPush, setRequestingPush] = useState(false);

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
    // Naviguer vers la commande si orderId dans les données
    if (notif.data?.orderId && onOpenOrder) {
      onOpenOrder(notif.data.orderId);
      return;
    }
    // Naviguer vers la conversation si conversationId
    if (notif.data?.conversationId && onOpenConversation) {
      onOpenConversation(notif.data.conversationId);
      return;
    }
    // Naviguer vers les commandes si c'est une notif de commande
    if (notif.title?.includes('commande') || notif.title?.includes('paiement') ||
        notif.title?.includes('Livraison') || notif.title?.includes('reçu') ||
        notif.title?.includes('Litige') || notif.title?.includes('Nouvelle')) {
      onOpenOrder?.('');
    }
  };

  const handleEnablePush = async () => {
    if (!currentUser) return;
    setRequestingPush(true);
    const granted = await requestPushPermission(currentUser.uid);
    setPushGranted(granted);
    setRequestingPush(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md sticky top-0 z-40 px-6 py-5 flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 active:scale-90 transition-all">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-slate-900 text-base uppercase tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead}
            className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-xl active:scale-95 transition-all">
            Tout lire
          </button>
        )}
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
                Reçois une alerte dès qu'un message ou un favori arrive, même quand Brumerie est en arrière-plan.
              </p>
              <button onClick={handleEnablePush} disabled={requestingPush}
                className="bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50">
                {requestingPush ? 'En cours...' : 'Activer maintenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste notifications */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-3 px-6">
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
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 px-10 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Aucune notification</h3>
            <p className="text-slate-400 text-[11px] font-medium leading-relaxed">
              Les nouvelles activités sur tes annonces et messages apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map(notif => (
              <button key={notif.id} onClick={() => handleNotifClick(notif)}
                className={`w-full flex items-start gap-4 px-6 py-4 text-left transition-all active:bg-slate-50 ${!notif.read ? 'bg-blue-50/40' : ''}`}>
                {/* Icône */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${BG[notif.type] || 'bg-slate-50'}`}>
                  {ICONS[notif.type]}
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
