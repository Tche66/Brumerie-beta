// src/pages/DettesPage.tsx — Journal de Dettes / Créances Clients
// "Qui me doit quoi depuis quand ?" — outil le plus viral pour vendeurs informels
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserByPhone } from '@/services/userService';
import { db } from '@/config/firebase';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';

interface DettesPageProps {
  onBack: () => void;
  onOpenChat?: (userId: string, userName: string) => void;
}

interface Dette {
  id: string;
  clientNom: string;
  clientPhone?: string;
  article: string;
  montant: number;
  montantPaye: number;
  date: string;        // ISO YYYY-MM-DD
  echeance?: string;   // date limite optionnelle
  statut: 'en_cours' | 'partiel' | 'solde';
  note?: string;
  brumarieUid?: string; // UID Firebase si l'acheteur a un compte Brumerie
  createdAt?: any;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmt(n: number) { return n.toLocaleString('fr-CI') + ' FCFA'; }
function daysAgo(dateISO: string) {
  const d = Math.floor((Date.now() - new Date(dateISO + 'T12:00:00').getTime()) / 86400000);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Hier";
  return `Il y a ${d}j`;
}
function isOverdue(d: Dette) {
  if (!d.echeance || d.statut === 'solde') return false;
  return new Date(d.echeance + 'T12:00:00') < new Date();
}

function whatsappRappel(d: Dette) {
  const restant = d.montant - d.montantPaye;
  const msg = `Bonjour ${d.clientNom} 👋\n\nJe vous rappelle que vous avez un solde en attente :\n\n📦 Article : ${d.article}\n💰 Montant total : ${fmt(d.montant)}\n✅ Déjà payé : ${fmt(d.montantPaye)}\n🔴 Reste à payer : ${fmt(restant)}\n\nMerci de régulariser dès que possible 🙏\n\n— Via Brumerie`;
  const phone = d.clientPhone?.replace(/[^0-9]/g, '') || '';
  return phone
    ? `https://wa.me/${phone.startsWith('225') ? phone : '225' + phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

// ── Formulaire ─────────────────────────────────────────────────
const EMPTY_FORM = {
  clientNom: '', clientPhone: '', article: '',
  montant: '', montantPaye: '0', date: todayISO(), echeance: '', note: '',
  brumarieUid: '',
};

export function DettesPage({ onBack, onOpenChat }: DettesPageProps) {
  const { currentUser, userProfile } = useAuth();

  // ── Tous les hooks d'abord ──────────────────────────────────
  const [dettes, setDettes]         = useState<Dette[]>([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState<'liste' | 'ajouter' | 'detail'>('liste');
  const [selected, setSelected]     = useState<Dette | null>(null);
  const [filter, setFilter]         = useState<'tous' | 'en_cours' | 'solde'>('en_cours');
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [payModal, setPayModal]     = useState<Dette | null>(null);
  const [payAmount, setPayAmount]   = useState('');
  const [search, setSearch]         = useState('');

  // Charger depuis Firestore
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(collection(db, 'dettes'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Dette));
      data.sort((a, b) => b.date.localeCompare(a.date));
      setDettes(data);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [currentUser?.uid]);

  // ── Calculs globaux ────────────────────────────────────────
  const actives  = dettes.filter(d => d.statut !== 'solde');
  const soldees  = dettes.filter(d => d.statut === 'solde');
  const enRetard = dettes.filter(d => isOverdue(d));
  const totalDu  = actives.reduce((s, d) => s + (d.montant - d.montantPaye), 0);

  const filtered = dettes
    .filter(d => filter === 'tous' ? true : filter === 'solde' ? d.statut === 'solde' : d.statut !== 'solde')
    .filter(d => search === '' || d.clientNom.toLowerCase().includes(search.toLowerCase()) || d.article.toLowerCase().includes(search.toLowerCase()));

  // ── Actions ────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!currentUser || !form.clientNom.trim() || !form.article.trim() || !form.montant) return;
    setSaving(true);
    const montantNum = parseFloat(form.montant);
    const payeNum = parseFloat(form.montantPaye) || 0;
    const statut: Dette['statut'] = payeNum >= montantNum ? 'solde' : payeNum > 0 ? 'partiel' : 'en_cours';
    try {
      await addDoc(collection(db, 'dettes'), {
        userId: currentUser.uid,
        clientNom: form.clientNom.trim(),
        clientPhone: form.clientPhone.trim(),
        article: form.article.trim(),
        montant: montantNum,
        montantPaye: payeNum,
        date: form.date,
        echeance: form.echeance || null,
        brumarieUid: (form as any).brumarieUid?.trim() || null,
        statut,
        note: form.note.trim() || null,
        createdAt: serverTimestamp(),
      });
      setForm(EMPTY_FORM);
      setView('liste');
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handlePay = async () => {
    if (!payModal || !payAmount) return;
    const add = parseFloat(payAmount);
    if (isNaN(add) || add <= 0) return;
    const newPaye = Math.min(payModal.montantPaye + add, payModal.montant);
    const newStatut: Dette['statut'] = newPaye >= payModal.montant ? 'solde' : newPaye > 0 ? 'partiel' : 'en_cours';
    try {
      await updateDoc(doc(db, 'dettes', payModal.id), { montantPaye: newPaye, statut: newStatut });
      if (selected?.id === payModal.id) setSelected({ ...selected, montantPaye: newPaye, statut: newStatut });
    } catch (e) { console.error(e); }
    setPayModal(null);
    setPayAmount('');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await deleteDoc(doc(db, 'dettes', deleteConfirm)); }
    catch (e) { console.error(e); }
    setDeleteConfirm(null);
    if (view === 'detail') setView('liste');
  };

  const openDetail = (d: Dette) => { setSelected(d); setView('detail'); };

  // ── Garde Premium ──────────────────────────────────────────
  if (!userProfile?.isPremium) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 pb-24">
        <div className="text-5xl mb-4">📒</div>
        <h2 className="font-black text-[20px] text-slate-900 text-center mb-2">Journal de Dettes</h2>
        <p className="text-[12px] text-slate-500 text-center leading-relaxed mb-6 max-w-xs">
          Le suivi des ventes à crédit et les rappels WhatsApp sont réservés aux vendeurs <strong>⭐ Premium</strong>.
        </p>
        <button onClick={onBack}
          className="w-full max-w-xs py-4 rounded-[2rem] bg-slate-100 text-slate-600 font-black text-[12px] uppercase tracking-widest active:scale-95 transition-all">
          ← Retour
        </button>
      </div>
    );
  }

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">

      {/* HEADER */}
      <div className="bg-white sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={view !== 'liste' ? () => setView('liste') : onBack}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all flex-shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-[14px] uppercase tracking-tight text-slate-900">📒 Journal de Dettes</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            {actives.length} client{actives.length > 1 ? 's' : ''} · {fmt(totalDu)} à encaisser
          </p>
        </div>
        {view === 'liste' && (
          <button onClick={() => setView('ajouter')}
            className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all shadow-lg shadow-green-200">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Ajouter
          </button>
        )}
      </div>

      {/* ── LISTE ── */}
      {view === 'liste' && (
        <div className="px-4 pt-4 space-y-3">

          {/* KPI bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">En cours</p>
              <p className="font-black text-[15px] text-red-600">{actives.length}</p>
            </div>
            <div className={`rounded-2xl p-3 border-2 text-center ${enRetard.length > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">En retard</p>
              <p className={`font-black text-[15px] ${enRetard.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>{enRetard.length}</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-3 border border-green-100 shadow-sm text-center">
              <p className="text-[8px] font-black text-green-600 uppercase mb-1">Total dû</p>
              <p className="font-black text-[11px] text-green-700 leading-tight">{fmt(totalDu)}</p>
            </div>
          </div>

          {/* Alerte retards */}
          {enRetard.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-3">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <p className="font-black text-red-700 text-[12px]">{enRetard.length} paiement{enRetard.length > 1 ? 's' : ''} en retard</p>
                <p className="text-[10px] text-red-500">Envoie un rappel WhatsApp →</p>
              </div>
            </div>
          )}

          {/* Recherche */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client ou article..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-100 bg-white text-[12px] outline-none focus:border-green-400 transition-all"/>
          </div>

          {/* Filtres */}
          <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
            {[
              { id: 'en_cours', label: `En cours (${actives.length})` },
              { id: 'solde',    label: `Soldés (${soldees.length})` },
              { id: 'tous',     label: 'Tous' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id as any)}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all ${
                  filter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Liste des dettes */}
          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-green-500 rounded-full animate-spin mx-auto mb-3"/>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Chargement...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-3xl border-2 border-dashed border-slate-100">
              <p className="text-4xl mb-3">📒</p>
              <p className="font-black text-slate-400 uppercase text-[12px] mb-1">
                {filter === 'en_cours' ? 'Aucune dette en cours' : 'Aucune entrée'}
              </p>
              <p className="text-[10px] text-slate-300 mb-4">Enregistre les ventes à crédit ici</p>
              <button onClick={() => setView('ajouter')}
                className="px-5 py-2.5 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase active:scale-95">
                + Ajouter une dette
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(d => {
                const restant = d.montant - d.montantPaye;
                const pct = d.montant > 0 ? (d.montantPaye / d.montant) * 100 : 0;
                const overdue = isOverdue(d);
                return (
                  <button key={d.id} onClick={() => openDetail(d)}
                    className={`w-full text-left bg-white rounded-2xl p-4 border-2 active:scale-[0.98] transition-all shadow-sm ${
                      overdue ? 'border-red-200' : d.statut === 'solde' ? 'border-green-100' : 'border-slate-100'
                    }`}>
                    <div className="flex items-start gap-3">
                      {/* Avatar initiale */}
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base flex-shrink-0 ${
                        overdue ? 'bg-red-100 text-red-600' : d.statut === 'solde' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {d.clientNom.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-black text-slate-900 text-[13px] truncate">{d.clientNom}</p>
                          <span className={`font-black text-[13px] ml-2 flex-shrink-0 ${
                            d.statut === 'solde' ? 'text-green-600' : overdue ? 'text-red-600' : 'text-slate-800'
                          }`}>
                            {d.statut === 'solde' ? '✅ Soldé' : fmt(restant)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{d.article}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-slate-400">{daysAgo(d.date)}</span>
                          {overdue && <span className="text-[8px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full">EN RETARD</span>}
                          {d.statut === 'partiel' && <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">PARTIEL</span>}
                          {d.echeance && d.statut !== 'solde' && !overdue && <span className="text-[9px] text-slate-400">Échéance {new Date(d.echeance + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                        </div>
                        {/* Barre de progression paiement */}
                        {d.statut !== 'solde' && d.montantPaye > 0 && (
                          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${pct}%` }}/>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── FORMULAIRE AJOUT ── */}
      {view === 'ajouter' && (
        <div className="px-4 pt-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <p className="font-black text-slate-900 text-[15px]">Nouvelle dette client</p>

            {[
              { label: 'Nom du client *', key: 'clientNom', placeholder: 'Ex: Adjoua Koffi', type: 'text' },
              { label: 'Téléphone (pour rappel WhatsApp)', key: 'clientPhone', placeholder: 'Ex: 0707070707', type: 'tel' },
              { label: 'Article / Description *', key: 'article', placeholder: 'Ex: 3 pagnes wax', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{f.label}</p>
                <input value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} type={f.type}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400 transition-all"/>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Montant total *</p>
                <div className="relative">
                  <input value={form.montant}
                    onChange={e => setForm(f => ({ ...f, montant: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="Ex: 25000" type="number" inputMode="numeric"
                    className="w-full px-3 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] font-black outline-none focus:border-green-400 transition-all pr-14"/>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">FCFA</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Déjà payé</p>
                <div className="relative">
                  <input value={form.montantPaye}
                    onChange={e => setForm(f => ({ ...f, montantPaye: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="0" type="number" inputMode="numeric"
                    className="w-full px-3 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] font-black outline-none focus:border-green-400 transition-all pr-14"/>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">FCFA</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date de vente</p>
                <input type="date" value={form.date} max={todayISO()}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[12px] outline-none focus:border-green-400 transition-all"/>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Échéance (optionnel)</p>
                <input type="date" value={form.echeance} min={todayISO()}
                  onChange={e => setForm(f => ({ ...f, echeance: e.target.value }))}
                  className="w-full px-3 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[12px] outline-none focus:border-green-400 transition-all"/>
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Note (optionnel)</p>
              <textarea value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Ex: Paie le vendredi au marché"
                rows={2}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[12px] outline-none focus:border-green-400 transition-all resize-none"/>
            </div>

            <button onClick={handleAdd}
              disabled={saving || !form.clientNom.trim() || !form.article.trim() || !form.montant}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
              {saving
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
                : '📒 Enregistrer la dette'
              }
            </button>
          </div>
        </div>
      )}

      {/* ── DÉTAIL DETTE ── */}
      {view === 'detail' && selected && (() => {
        const restant = selected.montant - selected.montantPaye;
        const pct = selected.montant > 0 ? (selected.montantPaye / selected.montant) * 100 : 0;
        const overdue = isOverdue(selected);
        return (
          <div className="px-4 pt-4 space-y-3">
            {/* Carte principale */}
            <div className={`bg-white rounded-3xl p-5 border-2 shadow-sm ${overdue ? 'border-red-200' : selected.statut === 'solde' ? 'border-green-200' : 'border-slate-100'}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-black text-slate-900 text-xl">{selected.clientNom}</h2>
                  {selected.clientPhone && (
                    <a href={`tel:${selected.clientPhone}`} className="text-[12px] text-green-600 font-bold">
                      📞 {selected.clientPhone}
                    </a>
                  )}
                </div>
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase ${
                  selected.statut === 'solde' ? 'bg-green-100 text-green-700' :
                  overdue ? 'bg-red-100 text-red-600' :
                  selected.statut === 'partiel' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {selected.statut === 'solde' ? '✅ Soldé' : overdue ? '⚠️ En retard' : selected.statut === 'partiel' ? '🔶 Partiel' : '🔴 En cours'}
                </span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-2">
                <div className="flex justify-between"><span className="text-[11px] text-slate-500">Article</span><span className="text-[11px] font-bold text-slate-800">{selected.article}</span></div>
                <div className="flex justify-between"><span className="text-[11px] text-slate-500">Montant total</span><span className="text-[11px] font-bold text-slate-800">{fmt(selected.montant)}</span></div>
                <div className="flex justify-between"><span className="text-[11px] text-slate-500">Déjà payé</span><span className="text-[11px] font-bold text-green-600">{fmt(selected.montantPaye)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-[12px] font-black text-slate-700">Reste à payer</span>
                  <span className={`text-[14px] font-black ${selected.statut === 'solde' ? 'text-green-600' : 'text-red-600'}`}>{fmt(restant)}</span>
                </div>
              </div>

              {/* Barre progression */}
              {selected.montant > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Progression</span>
                    <span className="text-[9px] font-black text-green-600">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }}/>
                  </div>
                </div>
              )}

              <div className="flex gap-2 text-[10px] text-slate-400 flex-wrap">
                <span>📅 Vente : {new Date(selected.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                {selected.echeance && <span>⏰ Échéance : {new Date(selected.echeance + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>}
              </div>
              {selected.note && <p className="text-[11px] text-slate-500 italic mt-2 bg-slate-50 rounded-xl px-3 py-2">"{selected.note}"</p>}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {selected.statut !== 'solde' && (
                <>
                  {/* Enregistrer paiement */}
                  <button onClick={() => { setPayModal(selected); setPayAmount(String(restant)); }}
                    className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                    💰 Enregistrer un paiement
                  </button>
                  {/* Messagerie Brumerie — toujours visible, lookup auto */}
                  {onOpenChat && (
                    <button
                      disabled={lookupLoading}
                      onClick={async () => {
                        if (selected.brumarieUid) {
                          onOpenChat(selected.brumarieUid, selected.clientNom);
                          return;
                        }
                        if (selected.clientPhone) {
                          setLookupLoading(true);
                          try {
                            const user = await getUserByPhone(selected.clientPhone);
                            if (user) {
                              onOpenChat(user.uid, selected.clientNom);
                            } else {
                              alert('Ce client n\'a pas de compte Brumerie. Utilise WhatsApp pour le rappel.');
                            }
                          } finally { setLookupLoading(false); }
                        } else {
                          alert('Ajoute le téléphone du client pour accéder à la messagerie Brumerie.');
                        }
                      }}
                      className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
                      {lookupLoading
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                          Message Brumerie</>
                      }
                    </button>
                  )}
                  {/* Rappel WhatsApp — fallback ou complément */}
                  <a href={whatsappRappel(selected)} target="_blank" rel="noopener noreferrer"
                    className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-2 block text-center"
                    style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 2C6.465 2 2.011 6.46 2.011 11.985a9.916 9.916 0 001.337 5.003L2 22l5.16-1.321a9.955 9.955 0 004.83 1.24c5.524 0 9.979-4.452 9.979-9.977A9.97 9.97 0 0012 2z"/></svg>
                    Envoyer rappel WhatsApp
                  </a>
                </>
              )}
              {/* Supprimer */}
              <button onClick={() => setDeleteConfirm(selected.id)}
                className="w-full py-3.5 rounded-2xl border-2 border-red-100 text-red-500 font-black text-[11px] uppercase tracking-widest active:scale-95 bg-white transition-all">
                🗑️ Supprimer cette entrée
              </button>
            </div>
          </div>
        );
      })()}

      {/* MODALE PAIEMENT */}
      {payModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', height: '100dvh' }}
          onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <p className="font-black text-slate-900 text-[15px]">💰 Enregistrer un paiement</p>
            <p className="text-[12px] text-slate-500">{payModal.clientNom} · Reste : {fmt(payModal.montant - payModal.montantPaye)}</p>
            <div className="relative">
              <input value={payAmount}
                onChange={e => setPayAmount(e.target.value.replace(/[^0-9]/g, ''))}
                type="number" inputMode="numeric" placeholder="Montant reçu"
                className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[16px] font-black outline-none focus:border-green-400 transition-all pr-20"/>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">FCFA</span>
            </div>
            {/* Raccourcis */}
            <div className="flex gap-2">
              {[25, 50, 100].map(pct => {
                const val = Math.round((payModal.montant - payModal.montantPaye) * pct / 100);
                return (
                  <button key={pct} onClick={() => setPayAmount(String(val))}
                    className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase active:scale-95">
                    {pct}%
                  </button>
                );
              })}
              <button onClick={() => setPayAmount(String(payModal.montant - payModal.montantPaye))}
                className="flex-1 py-2 rounded-xl bg-green-100 text-green-700 font-black text-[10px] uppercase active:scale-95">
                Tout
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPayModal(null)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase active:scale-95">
                Annuler
              </button>
              <button onClick={handlePay} disabled={!payAmount || parseFloat(payAmount) <= 0}
                className="flex-[2] py-3.5 rounded-2xl bg-green-600 text-white font-black text-[11px] uppercase active:scale-95 disabled:opacity-40 shadow-lg shadow-green-200">
                ✅ Confirmer
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
              <p className="font-black text-slate-900 text-[15px] mb-1">Supprimer cette dette ?</p>
              <p className="text-[12px] text-slate-400">Cette action est irréversible.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase active:scale-95">
                Annuler
              </button>
              <button onClick={handleDelete}
                className="flex-[2] py-3.5 rounded-2xl bg-red-500 text-white font-black text-[11px] uppercase active:scale-95 shadow-lg shadow-red-100">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
