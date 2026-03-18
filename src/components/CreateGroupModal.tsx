// src/components/CreateGroupModal.tsx — v19
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createGroupConversation } from '@/services/messagingService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (convId: string) => void;
}

interface Contact {
  uid: string;
  name: string;
  photo?: string;
  neighborhood?: string;
}

export function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const { currentUser, userProfile } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Charger les contacts depuis les conversations existantes
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
    );
    getDocs(q).then(snap => {
      const uidsSet = new Set<string>();
      snap.docs.forEach(d => {
        const data = d.data();
        (data.participants || []).forEach((uid: string) => {
          if (uid !== currentUser.uid) uidsSet.add(uid);
        });
      });
      // Construire la liste contacts avec noms depuis participantNames
      const contactMap: Record<string, Contact> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        const names = data.participantNames || {};
        const photos = data.participantPhotos || {};
        Object.keys(names).forEach(uid => {
          if (uid !== currentUser.uid && !contactMap[uid]) {
            const photo = photos[uid];
            contactMap[uid] = {
              uid,
              name: names[uid] || 'Utilisateur',
              ...(photo ? { photo } : {}),
            };
          }
        });
      });
      setContacts(Object.values(contactMap));
      setLoadingContacts(false);
    }).catch(() => setLoadingContacts(false));
  }, [currentUser]);

  const toggle = (uid: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(uid) ? s.delete(uid) : s.add(uid);
      return s;
    });
  };

  const handleCreate = async () => {
    if (!currentUser || !userProfile) return;
    if (!groupName.trim()) { setError('Donne un nom au groupe.'); return; }
    if (selected.size < 1) { setError('Ajoute au moins 1 membre.'); return; }

    setCreating(true); setError('');
    try {
      const memberIds = [currentUser.uid, ...Array.from(selected)];
      const membersInfo: Record<string, { name: string; photo?: string }> = {
        [currentUser.uid]: {
          name: userProfile.name,
          ...(userProfile.photoURL ? { photo: userProfile.photoURL } : {}),
        },
      };
      contacts.filter(c => selected.has(c.uid)).forEach(c => {
        membersInfo[c.uid] = {
          name: c.name,
          ...(c.photo ? { photo: c.photo } : {}),
        };
      });

      const convId = await createGroupConversation({
        adminId: currentUser.uid,
        adminName: userProfile.name,
        ...(userProfile.photoURL ? { adminPhoto: userProfile.photoURL } : {}),
        groupName: groupName.trim(),
        memberIds,
        membersInfo,
      });
      onCreated(convId);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
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
          <div className="w-10 h-1 bg-slate-100 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-900 text-[15px] uppercase tracking-tight">Nouveau groupe</h2>
            <button onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-50 flex items-center justify-center active:scale-90 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Nom du groupe */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nom du groupe *</p>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Ex: Clients Yopougon, Livreurs Cocody..."
              maxLength={50}
              className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-[13px] font-bold outline-none border-2 border-transparent focus:border-green-400 transition-all"
            />
          </div>

          {/* Membres sélectionnés */}
          {selected.size > 0 && (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                {selected.size} membre{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {contacts.filter(c => selected.has(c.uid)).map(c => (
                  <button key={c.uid} onClick={() => toggle(c.uid)}
                    className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-1.5 active:scale-95 transition-all">
                    <span className="text-[11px] font-bold text-green-700 truncate" style={{ maxWidth: 80 }}>{c.name}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recherche contacts */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Ajouter des membres</p>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Chercher un contact..."
              className="w-full bg-slate-50 rounded-2xl px-4 py-2.5 text-[12px] font-bold outline-none border-2 border-transparent focus:border-green-400 transition-all mb-3"
            />

            {loadingContacts ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex-shrink-0" />
                    <div className="h-3 bg-slate-100 rounded-full flex-1" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-bold text-center py-4">
                {contacts.length === 0
                  ? 'Commence des conversations pour ajouter des membres ici.'
                  : 'Aucun contact trouvé.'}
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map(contact => {
                  const isSelected = selected.has(contact.uid);
                  return (
                    <button key={contact.uid} onClick={() => toggle(contact.uid)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98] ${
                        isSelected ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-transparent'
                      }`}>
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                        {contact.photo
                          ? <img src={contact.photo} alt="" className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-sm">
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                        }
                      </div>
                      <p className="flex-1 text-[12px] font-bold text-slate-900 text-left truncate">{contact.name}</p>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'bg-green-600 border-green-600' : 'border-slate-300'
                      }`}>
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-[11px] font-bold text-center">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 border-t border-slate-50 flex-shrink-0">
          <button onClick={handleCreate}
            disabled={creating || !groupName.trim() || selected.size === 0}
            className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white disabled:opacity-40 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)', boxShadow: '0 10px 30px rgba(22,163,74,0.3)' }}>
            {creating
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  Création...
                </span>
              : `✅ Créer le groupe${selected.size > 0 ? ` (${selected.size + 1})` : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
