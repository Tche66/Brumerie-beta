// src/pages/CarnetClientsPage.tsx — Mini-CRM vendeur
// "Garde le contact · Relance · Fidélise"
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserByPhone } from '@/services/userService';
import { db } from '@/config/firebase';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';

interface CarnetClientsPageProps {
  onBack: () => void;
  onOpenChat?: (userId: string, userName: string) => void;
}

interface Client {
  id: string;
  nom: string;
  phone?: string;
  quartier?: string;
  note?: string;
  totalAchats: number;
  nbCommandes: number;
  dernierAchat?: string; // ISO
  tags: string[];        // ex: ['fidèle', 'crédit', 'gros client']
  brumarieUid?: string;  // UID Firebase si le client a un compte Brumerie
  createdAt?: any;
}

function fmt(n: number) { return n.toLocaleString('fr-CI') + ' FCFA'; }
function daysAgo(d?: string) {
  if (!d) return '';
  const days = Math.floor((Date.now() - new Date(d + 'T12:00:00').getTime()) / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 30) return `Il y a ${days}j`;
  if (days < 365) return `Il y a ${Math.floor(days/30)} mois`;
  return `Il y a ${Math.floor(days/365)} an${Math.floor(days/365) > 1 ? 's' : ''}`;
}

const TAGS_OPTIONS = ['Fidèle', 'Gros client', 'Crédit', 'VIP', 'À relancer', 'Nouveau'];
const EMPTY_FORM = { nom: '', phone: '', quartier: '', note: '', brumarieUid: '', tags: [] as string[] };

export function CarnetClientsPage({ onBack, onOpenChat }: CarnetClientsPageProps) {
  const { currentUser, userProfile } = useAuth();

  const [clients
  const [clients, setClients]       = useState<Client[]>([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState<'liste' | 'ajouter' | 'detail'>('liste');
  const [selected, setSelected]     = useState<Client | null>(null);
  const [search, setSearch]         = useState('');
  const [sortBy, setSortBy]         = useState<'recent' | 'achats' | 'nom'>('recent');
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [editMode, setEditMode]     = useState(false);
  // Achat rapide
  const [achatModal, setAchatModal] = useState<Client | null>(null);
  const [achatForm, setAchatForm]   = useState({ montant: '', article: '', date: new Date().toISOString().slice(0,10) });

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(collection(db, 'clients_carnet'), where('userId', '==', currentUser.uid));
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
      setClients(data);
      setLoading(false);
    }, () => setLoading(false));
  }, [currentUser?.uid]);

  // Tri + recherche
  const displayed = clients
    .filter(c => search === '' ||
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search) ||
      (c.quartier || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'nom') return a.nom.localeCompare(b.nom);
      if (sortBy === 'achats') return (b.totalAchats || 0) - (a.totalAchats || 0);
      return (b.dernierAchat || '').localeCompare(a.dernierAchat || '');
    });

  const totalClients = clients.length;
  const totalCA = clients.reduce((s, c) => s + (c.totalAchats || 0), 0);
  const aRelancer = clients.filter(c => {
    if (!c.dernierAchat) return false;
    return Math.floor((Date.now() - new Date(c.dernierAchat + 'T12:00:00').getTime()) / 86400000) >= 30;
  });

  const handleAdd = async () => {
    if (!currentUser || !form.nom.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'clients_carnet'), {
        userId: currentUser.uid,
        nom: form.nom.trim(),
        phone: form.phone.trim() || null,
        quartier: form.quartier.trim() || null,
        note: form.note.trim() || null,
        tags: form.tags,
        brumarieUid: (form as any).brumarieUid || null,
        totalAchats: 0,
        nbCommandes: 0,
        dernierAchat: null,
        createdAt: serverTimestamp(),
      });
      setForm(EMPTY_FORM);
      setView('liste');
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleAchat = async () => {
    if (!achatModal || !achatForm.montant) return;
    const montant = parseFloat(achatForm.montant);
    if (isNaN(montant) || montant <= 0) return;
    try {
      await updateDoc(doc(db, 'clients_carnet', achatModal.id), {
        totalAchats: (achatModal.totalAchats || 0) + montant,
        nbCommandes: (achatModal.nbCommandes || 0) + 1,
        dernierAchat: achatForm.date,
      });
      if (selected?.id === achatModal.id) {
        setSelected(prev => prev ? {
          ...prev,
          totalAchats: (prev.totalAchats || 0) + montant,
          nbCommandes: (prev.nbCommandes || 0) + 1,
          dernierAchat: achatForm.date,
        } : null);
      }
    } catch (e) { console.error(e); }
    setAchatModal(null);
    setAchatForm({ montant: '', article: '', date: new Date().toISOString().slice(0,10) });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await deleteDoc(doc(db, 'clients_carnet', deleteConfirm)); }
    catch (e) { console.error(e); }
    setDeleteConfirm(null);
    setView('liste');
  };

  const whatsappMsg = (c: Client, type: 'bonjour' | 'promo' | 'relance') => {
    const msgs = {
      bonjour: `Bonjour ${c.nom} ! 👋\nMerci pour votre fidélité. N'hésitez pas à consulter ma boutique sur Brumerie pour découvrir mes nouveaux articles 🛍`,
      promo: `Bonjour ${c.nom} ! 🎉\nJ'ai une offre spéciale pour vous aujourd'hui. Venez voir ma boutique sur Brumerie !`,
      relance: `Bonjour ${c.nom} ! 👋\nCela fait un moment que je n'ai pas eu de vos nouvelles. J'ai de nouveaux articles qui pourraient vous intéresser 😊`,
    };
    const phone = c.phone?.replace(/[^0-9]/g, '') || '';
    const url = phone
      ? `https://wa.me/${phone.startsWith('225') ? phone : '225' + phone}?text=${encodeURIComponent(msgs[type])}`
      : `https://wa.me/?text=${encodeURIComponent(msgs[type])}`;
    return url;
  };

  // ── Garde Vérifié / Premium — APRÈS les hooks ───────────
  if (userProfile && !userProfile.isVerified && !(userProfile as any).isPremium) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-16 h-16 rounded-3xl bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h2 className="font-black text-[20px] text-slate-900 text-center mb-2">Carnet Clients</h2>
        <p className="text-[12px] text-slate-500 text-center leading-relaxed mb-6 max-w-xs">
          Le mini-CRM est réservé aux vendeurs <strong>Vérifiés</strong> et <strong>Premium</strong>.
        </p>
        <button onClick={onBack}
          className="w-full max-w-xs py-4 rounded-[2rem] bg-slate-100 text-slate-600 font-black text-[12px] uppercase tracking-widest active:scale-95 transition-all">
          ← Retour
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">

      {/* HEADER */}
      <div className="bg-white sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={view !== 'liste' ? () => { setView('liste'); setEditMode(false); } : onBack}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all flex-shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-[14px] uppercase tracking-tight text-slate-900">📇 Carnet Clients</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase">{totalClients} clients · {fmt(totalCA)} CA total</p>
        </div>
        {view === 'liste' && (
          <button onClick={() => setView('ajouter')}
            className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-lg shadow-green-200">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Ajouter
          </button>
        )}
      </div>

      {/* ── LISTE ── */}
      {view === 'liste' && (
        <div className="px-4 pt-4 space-y-3">

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Clients</p>
              <p className="font-black text-[17px] text-slate-900">{totalClients}</p>
            </div>
            <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">CA Total</p>
              <p className="font-black text-[11px] text-green-700 leading-tight">{fmt(totalCA)}</p>
            </div>
            <div className={`rounded-2xl p-3 text-center border-2 ${aRelancer.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">À relancer</p>
              <p className={`font-black text-[17px] ${aRelancer.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{aRelancer.length}</p>
            </div>
          </div>

          {/* Alerte relance */}
          {aRelancer.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
              <span className="text-xl">🔔</span>
              <div className="flex-1">
                <p className="font-black text-amber-800 text-[12px]">{aRelancer.length} client{aRelancer.length > 1 ? 's' : ''} sans achat depuis 30j+</p>
                <p className="text-[10px] text-amber-600">Envoie-leur un message WhatsApp →</p>
              </div>
            </div>
          )}

          {/* Recherche + tri */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2.5 rounded-2xl border-2 border-slate-100 bg-white text-[12px] outline-none focus:border-green-400"/>
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2.5 rounded-2xl border-2 border-slate-100 bg-white text-[10px] font-bold text-slate-600 outline-none">
              <option value="recent">Récents</option>
              <option value="achats">CA ↓</option>
              <option value="nom">A→Z</option>
            </select>
          </div>

          {/* Liste */}
          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-green-500 rounded-full animate-spin mx-auto mb-3"/>
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-3xl border-2 border-dashed border-slate-100">
              <p className="text-4xl mb-3">📇</p>
              <p className="font-black text-slate-400 uppercase text-[12px] mb-1">Aucun client</p>
              <p className="text-[10px] text-slate-300 mb-4">Ajoute tes premiers clients ici</p>
              <button onClick={() => setView('ajouter')}
                className="px-5 py-2.5 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase active:scale-95">
                + Ajouter un client
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map(cl => (
                <button key={cl.id} onClick={() => { setSelected(cl); setView('detail'); }}
                  className="w-full bg-white rounded-2xl p-4 border border-slate-100 active:scale-[0.98] transition-all shadow-sm text-left flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base flex-shrink-0 ${
                    (cl.totalAchats || 0) > 50000 ? 'bg-amber-100 text-amber-600' :
                    (cl.nbCommandes || 0) >= 3 ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {cl.nom.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-black text-slate-900 text-[13px] truncate">{cl.nom}</p>
                      {cl.tags?.includes('VIP') && <span className="text-[8px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded-full flex-shrink-0">⭐ VIP</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {cl.quartier && <span className="text-[10px] text-slate-400">📍 {cl.quartier}</span>}
                      {cl.dernierAchat && <span className="text-[10px] text-slate-400">{daysAgo(cl.dernierAchat)}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-[12px] text-green-700">{fmt(cl.totalAchats || 0)}</p>
                    <p className="text-[9px] text-slate-400">{cl.nbCommandes || 0} achat{(cl.nbCommandes || 0) > 1 ? 's' : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AJOUTER ── */}
      {view === 'ajouter' && (
        <div className="px-4 pt-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <p className="font-black text-slate-900 text-[15px]">Nouveau client</p>
            {[
              { label: 'Nom *', key: 'nom', placeholder: 'Ex: Adjoua Koffi', type: 'text' },
              { label: 'Téléphone', key: 'phone', placeholder: 'Ex: 0707070707', type: 'tel' },
              { label: 'Quartier', key: 'quartier', placeholder: 'Ex: Yopougon', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{f.label}</p>
                <input value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} type={f.type}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400 transition-all"/>
              </div>
            ))}
            {/* Tags */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {TAGS_OPTIONS.map(tag => (
                  <button key={tag} onClick={() => setForm(prev => ({
                    ...prev,
                    tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
                  }))}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all active:scale-95 ${
                      form.tags.includes(tag) ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            {/* UID Brumerie optionnel */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">ID Brumerie (optionnel)</p>
              <input value={(form as any).brumarieUid}
                onChange={e => setForm(prev => ({ ...prev, brumarieUid: e.target.value.trim() }))}
                placeholder="Si ce client a un compte Brumerie"
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[12px] outline-none focus:border-green-400 transition-all"/>
              <p className="text-[9px] text-slate-400 mt-1">Colle son ID pour lui envoyer des messages via Brumerie</p>
            </div>
            {/* Note */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Note</p>
              <textarea value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Ex: Aime les pagnes, commande souvent le vendredi"
                rows={2}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[12px] outline-none focus:border-green-400 transition-all resize-none"/>
            </div>
            <button onClick={handleAdd} disabled={saving || !form.nom.trim()}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/> : '📇 Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* ── DÉTAIL CLIENT ── */}
      {view === 'detail' && selected && (
        <div className="px-4 pt-4 space-y-3">
          {/* Carte identité */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl flex-shrink-0 ${
                (selected.totalAchats || 0) > 50000 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-700'
              }`}>
                {selected.nom.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="font-black text-slate-900 text-xl leading-tight">{selected.nom}</h2>
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="text-[12px] text-green-600 font-bold block">📞 {selected.phone}</a>
                )}
                {selected.quartier && <p className="text-[11px] text-slate-400">📍 {selected.quartier}</p>}
              </div>
            </div>

            {/* Tags */}
            {selected.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selected.tags.map(t => (
                  <span key={t} className="text-[9px] font-black bg-green-100 text-green-700 px-2.5 py-1 rounded-full uppercase">{t}</span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-[8px] text-slate-400 uppercase font-bold mb-0.5">CA Total</p>
                <p className="font-black text-[12px] text-green-700">{fmt(selected.totalAchats || 0)}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-[8px] text-slate-400 uppercase font-bold mb-0.5">Achats</p>
                <p className="font-black text-[14px] text-slate-800">{selected.nbCommandes || 0}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-[8px] text-slate-400 uppercase font-bold mb-0.5">Dernier</p>
                <p className="font-black text-[10px] text-slate-700 leading-tight">{daysAgo(selected.dernierAchat) || '—'}</p>
              </div>
            </div>

            {selected.note && (
              <p className="text-[11px] text-slate-500 italic bg-slate-50 rounded-xl px-3 py-2">"{selected.note}"</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={() => setAchatModal(selected)}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
              🛍 Enregistrer un achat
            </button>

            {/* Contact — Brumerie en primaire, WhatsApp en secondaire */}
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Contacter</p>
            {/* Messagerie Brumerie — lookup auto par téléphone */}
            {onOpenChat && (
              <button
                disabled={lookupLoading}
                onClick={async () => {
                  // Si brumarieUid déjà connu → ouvrir directement
                  if (selected.brumarieUid) {
                    onOpenChat(selected.brumarieUid, selected.nom);
                    return;
                  }
                  // Sinon → chercher par téléphone
                  if (selected.phone) {
                    setLookupLoading(true);
                    try {
                      const user = await getUserByPhone(selected.phone);
                      if (user) {
                        onOpenChat(user.uid, selected.nom);
                      } else {
                        alert('Ce client n\'a pas encore de compte Brumerie. Utilise WhatsApp pour le contacter.');
                      }
                    } finally { setLookupLoading(false); }
                  } else {
                    alert('Ajoute le numéro du client pour retrouver son compte Brumerie.');
                  }
                }}
                className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                {lookupLoading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    Messagerie Brumerie</>
                }
              </button>
            )}
            {/* WhatsApp — toujours disponible si numéro renseigné */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'bonjour', label: '👋 Bonjour', color: '#25D366' },
                { type: 'promo',   label: '🎉 Promo',   color: '#F59E0B' },
                { type: 'relance', label: '🔔 Relance',  color: '#3B82F6' },
              ].map(m => (
                <a key={m.type} href={whatsappMsg(selected, m.type as any)} target="_blank" rel="noopener noreferrer"
                  className="py-3 rounded-2xl text-white font-black text-[9px] uppercase text-center active:scale-95 transition-all block"
                  style={{ background: m.color }}>
                  {m.label}
                </a>
              ))}
            </div>
            {!selected.phone && (
              <p className="text-[9px] text-slate-400 text-center">Ajoute le numéro du client pour activer WhatsApp</p>
            )}

            <button onClick={() => setDeleteConfirm(selected.id)}
              className="w-full py-3.5 rounded-2xl border-2 border-red-100 text-red-500 font-black text-[11px] uppercase active:scale-95 bg-white">
              🗑️ Supprimer ce client
            </button>
          </div>
        </div>
      )}

      {/* MODALE ACHAT */}
      {achatModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', height: '100dvh' }}
          onClick={() => setAchatModal(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <p className="font-black text-slate-900 text-[15px]">🛍 Enregistrer un achat</p>
            <p className="text-[12px] text-slate-500">{achatModal.nom}</p>
            <div className="relative">
              <input value={achatForm.montant}
                onChange={e => setAchatForm(f => ({ ...f, montant: e.target.value.replace(/[^0-9]/g, '') }))}
                type="number" inputMode="numeric" placeholder="Montant"
                className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[16px] font-black outline-none focus:border-green-400 pr-20"/>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">FCFA</span>
            </div>
            <input type="date" value={achatForm.date} max={new Date().toISOString().slice(0,10)}
              onChange={e => setAchatForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400"/>
            <div className="flex gap-3">
              <button onClick={() => setAchatModal(null)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase active:scale-95">
                Annuler
              </button>
              <button onClick={handleAchat} disabled={!achatForm.montant || parseFloat(achatForm.montant) <= 0}
                className="flex-[2] py-3.5 rounded-2xl bg-green-600 text-white font-black text-[11px] uppercase active:scale-95 disabled:opacity-40 shadow-lg shadow-green-200">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', height: '100dvh' }}
          onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-3">🗑️</div>
              <p className="font-black text-slate-900 text-[15px] mb-1">Supprimer ce client ?</p>
              <p className="text-[12px] text-slate-400">Tout son historique sera perdu.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase active:scale-95">Annuler</button>
              <button onClick={handleDelete}
                className="flex-[2] py-3.5 rounded-2xl bg-red-500 text-white font-black text-[11px] uppercase active:scale-95 shadow-lg shadow-red-100">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
