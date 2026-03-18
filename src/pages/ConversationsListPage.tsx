// src/pages/ConversationsListPage.tsx — v19 : groupes de chat
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToConversations } from '@/services/messagingService';
import { Conversation } from '@/types';
import { CreateGroupModal } from '@/components/CreateGroupModal';

interface ConversationsListPageProps {
  onOpenConversation: (conv: Conversation) => void;
  onOpenConversationById?: (convId: string) => void;
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

export function ConversationsListPage({ onOpenConversation, onOpenConversationById }: ConversationsListPageProps) {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'groups' | 'direct'>('all');

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToConversations(currentUser.uid, (convs) => {
      setConversations(convs);
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount?.[currentUser?.uid || ''] || 0), 0);

  // Filtres
  const filtered = conversations.filter(c => {
    if (activeFilter === 'groups') return !!c.isGroup;
    if (activeFilter === 'direct') return !c.isGroup;
    return true;
  });

  const groupCount  = conversations.filter(c => c.isGroup).length;
  const directCount = conversations.filter(c => !c.isGroup).length;

  const handleGroupCreated = (convId: string) => {
    setShowCreateGroup(false);
    // Ouvrir la conversation créée
    const conv = conversations.find(c => c.id === convId);
    if (conv) onOpenConversation(conv);
    else onOpenConversationById?.(convId);
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">

      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-5 pt-14 pb-4 border-b border-slate-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Messages</h1>
            {totalUnread > 0 && (
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">
                {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
              </p>
            )}
          </div>
          {/* Bouton créer un groupe */}
          <button onClick={() => setShowCreateGroup(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white active:scale-95 transition-all shadow-lg"
            style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
            Groupe
          </button>
        </div>

        {/* Filtres onglets */}
        <div className="flex gap-2">
          {([
            { id: 'all',    label: 'Tout',     count: conversations.length },
            { id: 'direct', label: '💬 Directs', count: directCount },
            { id: 'groups', label: '👥 Groupes',  count: groupCount },
          ] as { id: 'all'|'groups'|'direct'; label: string; count: number }[]).map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                activeFilter === f.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-500 border border-slate-100'
              }`}>
              {f.label}
              {f.count > 0 && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                  activeFilter === f.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                }`}>{f.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
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
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 px-10 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
            {activeFilter === 'groups' ? 'Aucun groupe' : activeFilter === 'direct' ? 'Aucun message direct' : 'Aucun message'}
          </h3>
          <p className="text-slate-400 text-[11px] font-medium leading-relaxed">
            {activeFilter === 'groups'
              ? 'Crée un groupe avec le bouton en haut à droite.'
              : 'Commence une conversation depuis une annonce.'}
          </p>
          {activeFilter === 'groups' && (
            <button onClick={() => setShowCreateGroup(true)}
              className="mt-5 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
              + Créer un groupe
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {filtered.map((conv) => {
            const uid = currentUser?.uid || '';
            const unread = conv.unreadCount?.[uid] || 0;
            const isLastMine = conv.lastSenderId === uid;

            // Groupe vs direct
            const isGroup = !!conv.isGroup;
            const displayName = isGroup
              ? (conv.groupName || 'Groupe')
              : (() => {
                  const otherId = (conv.participants || []).find(p => p !== uid) || '';
                  return (conv as any).participantNames?.[otherId] || 'Utilisateur';
                })();
            const displayPhoto = isGroup
              ? conv.groupPhoto
              : (() => {
                  const otherId = (conv.participants || []).find(p => p !== uid) || '';
                  return (conv as any).participantPhotos?.[otherId] || undefined;
                })();
            const memberCount = isGroup ? (conv.participants || []).length : 0;

            return (
              <button key={conv.id} onClick={() => onOpenConversation(conv)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-all text-left">

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                    {isGroup ? (
                      displayPhoto
                        ? <img src={displayPhoto} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                            </svg>
                          </div>
                    ) : (
                      displayPhoto
                        ? <img src={displayPhoto} alt={displayName} className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center bg-green-50">
                            <span className="text-green-700 font-black text-xl">{displayName.charAt(0).toUpperCase()}</span>
                          </div>
                    )}
                  </div>
                  {/* Miniature produit (convs directes) */}
                  {!isGroup && (conv as any).productImage && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg overflow-hidden border-2 border-white shadow-sm">
                      <img src={(conv as any).productImage} alt="" className="w-full h-full object-cover"/>
                    </div>
                  )}
                  {/* Badge groupe */}
                  {isGroup && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
                      style={{ background: '#16A34A' }}>
                      <span className="text-[7px] font-black text-white">{memberCount}</span>
                    </div>
                  )}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={`text-[13px] tracking-tight truncate ${unread > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                        {displayName}
                      </p>
                      {isGroup && (
                        <span className="flex-shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                          style={{ background: '#F0FDF4', color: '#16A34A' }}>
                          Groupe
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold ml-2 flex-shrink-0">
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  {!isGroup && (conv as any).productTitle && (
                    <p className="text-[10px] font-bold text-green-700 truncate mb-0.5 uppercase tracking-wider">
                      {(conv as any).productTitle}
                    </p>
                  )}
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

      {/* Modal création groupe */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </div>
  );
}
