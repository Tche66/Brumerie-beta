// src/pages/ConversationsListPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToConversations } from '@/services/messagingService';
import { Conversation } from '@/types';

interface ConversationsListPageProps {
  onOpenConversation: (conv: Conversation) => void;
}

function timeAgo(ts: any): string {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'maintenant';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

export function ConversationsListPage({ onOpenConversation }: ConversationsListPageProps) {
  const { currentUser, userProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToConversations(currentUser.uid, (convs) => {
      setConversations(convs);
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount?.[currentUser?.uid || ''] || 0), 0);

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-6 pt-14 pb-5 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Messages</h1>
            {totalUnread > 0 && (
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">
                {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="px-6 pt-6 space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded-full w-3/4" />
                <div className="h-2.5 bg-slate-50 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-32 px-10 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Aucun message</h3>
          <p className="text-slate-400 text-[11px] font-medium leading-relaxed">
            Commence une conversation en cliquant sur <strong>"Discuter"</strong> depuis une annonce.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {conversations.map((conv) => {
            const otherId = conv.participants.find(p => p !== currentUser?.uid) || '';
            const otherName = conv.participantNames?.[otherId] || 'Utilisateur';
            const otherPhoto = conv.participantPhotos?.[otherId];
            const unread = conv.unreadCount?.[currentUser?.uid || ''] || 0;
            const isLastMine = conv.lastSenderId === currentUser?.uid;

            return (
              <button key={conv.id} onClick={() => onOpenConversation(conv)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 active:bg-slate-100 transition-all text-left">

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                    {otherPhoto ? (
                      <img src={otherPhoto} alt={otherName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-green-50">
                        <span className="text-green-700 font-black text-xl">{otherName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  {/* Miniature produit */}
                  {conv.productImage && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg overflow-hidden border-2 border-white shadow-sm">
                      <img src={conv.productImage} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-[13px] tracking-tight truncate ${unread > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                      {otherName}
                    </p>
                    <span className="text-[9px] text-slate-400 font-bold ml-2 flex-shrink-0">
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-green-700 truncate mb-1 uppercase tracking-wider">
                    {conv.productTitle}
                  </p>
                  <p className={`text-[11px] truncate ${unread > 0 ? 'font-bold text-slate-700' : 'text-slate-400 font-medium'}`}>
                    {isLastMine ? 'Toi : ' : ''}{conv.lastMessage || 'Conversation ouverte'}
                  </p>
                </div>

                {/* Badge non-lu */}
                {unread > 0 && (
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ml-2">
                    <span className="text-[9px] font-black text-white">{unread > 9 ? '9+' : unread}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
