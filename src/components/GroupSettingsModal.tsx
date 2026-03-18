// src/components/GroupSettingsModal.tsx — v19
// Modal de gestion de groupe : ajouter/supprimer membres (admin uniquement)
import React, { useState, useEffect } from 'react';
import { Conversation } from '@/types';
import { addMemberToGroup } from '@/services/messagingService';
import { collection, query, where, getDocs, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Props {
  conversation: Conversation;
  currentUserId: string;
  onClose: () => void;
}

interface Contact { uid: string; name: string; photo?: string; }

export function GroupSettingsModal({ conversation, currentUserId, onClose }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'members' | 'add'>('members');

  const members = conversation.participants || [];
  const membersInfo = (conversation as any).participantsInfo || {};

  // Charger contacts disponibles à ajouter (depuis conversations existantes)
  useEffect(() => {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserId)
    );
    getDocs(q).then(snap => {
      const map: Record<string, Contact> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        const names = data.participantNames || {};
        const photos = data.participantPhotos || {};
        Object.keys(names).forEach(uid => {
          if (uid !== currentUserId && !members.includes(uid) && !map[uid]) {
            map[uid] = { uid, name: names[uid] || 'Utilisateur', photo: photos[uid] };
          }
        });
      });
      setContacts(Object.values(map));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAdd = async (contact: Contact) => {
    setBusy(contact.uid);
    try {
      await addMemberToGroup(
        conversation.id,
        contact.uid,
        { name: contact.name, ...(contact.photo ? { photo: contact.photo } : {}) },
        membersInfo[currentUserId]?.name || 'Admin',
      );
      setContacts(prev => prev.filter(c => c.uid !== contact.uid));
    } catch (e) { console.error(e); }
    finally { setBusy(''); }
  };

  const handleRemove = async (uid: string) => {
    if (uid === currentUserId) return; // ne peut pas se retirer soi-même
    if (!confirm(`Retirer ${membersInfo[uid]?.name || 'ce membre'} du groupe ?`)) return;
    setBusy(uid);
    try {
      await updateDoc(doc(db, 'conversations', conversation.id), {
        participants: arrayRemove(uid),
        [`unreadCount.${uid}`]: 0,
      });
    } catch (e) { console.error(e); }
    finally { setBusy(''); }
  };

  const filtered = contacts.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[400] flex items-end justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
        style={{ maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-100 rounded-full mx-auto mb-4"/>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-900 text-[15px] uppercase tracking-tight">
              ⚙️ Gérer le groupe
            </h2>
            <button onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-50 flex items-center justify-center active:scale-90">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          {/* Onglets */}
          <div className="flex gap-2">
            {[
              { id: 'members' as const, label: `👥 Membres (${members.length})` },
              { id: 'add' as const, label: '➕ Ajouter' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  tab === t.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div className="overflow-y-auto flex-1 px-4 py-3">

          {/* Onglet membres */}
          {tab === 'members' && (
            <div className="space-y-2">
              {members.map(uid => {
                const info = membersInfo[uid] || {};
                const isAdmin = uid === (conversation as any).groupAdminId;
                const isMe = uid === currentUserId;
                return (
                  <div key={uid} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                      {info.photo
                        ? <img src={info.photo} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-sm">
                            {(info.name || '?')[0].toUpperCase()}
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-[12px] truncate">
                        {info.name || 'Membre'} {isMe ? '(Toi)' : ''}
                      </p>
                      {isAdmin && (
                        <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">👑 Admin</span>
                      )}
                    </div>
                    {!isAdmin && !isMe && (
                      <button
                        onClick={() => handleRemove(uid)}
                        disabled={busy === uid}
                        className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center active:scale-90 transition-all disabled:opacity-50">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Onglet ajouter */}
          {tab === 'add' && (
            <>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Chercher un contact..."
                className="w-full bg-slate-50 rounded-2xl px-4 py-2.5 text-[12px] font-bold outline-none border-2 border-transparent focus:border-green-400 transition-all mb-3"
              />
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-2xl animate-pulse"/>)}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[11px] text-slate-400 font-bold py-8">
                  {contacts.length === 0 ? 'Aucun contact disponible' : 'Aucun résultat'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filtered.map(contact => (
                    <div key={contact.uid} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                        {contact.photo
                          ? <img src={contact.photo} alt="" className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-sm">
                              {contact.name[0].toUpperCase()}
                            </div>
                        }
                      </div>
                      <p className="flex-1 font-bold text-slate-900 text-[12px] truncate">{contact.name}</p>
                      <button
                        onClick={() => handleAdd(contact)}
                        disabled={busy === contact.uid}
                        className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                        {busy === contact.uid ? '...' : '+ Ajouter'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
