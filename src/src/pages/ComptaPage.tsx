// src/pages/ComptaPage.tsx — Comptabilité Professionnelle Brumerie
// Intègre : recettes/dépenses · dettes · marge · rapport · messagerie
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { subscribeOrdersAsSeller } from '@/services/orderService';
import { getSellerProducts } from '@/services/productService';
import { Product } from '@/types';

interface ComptaPageProps {
  onBack: () => void;
  onOpenChat?: (userId: string, userName: string) => void;
  onNavigate?: (page: string) => void;
}

type EntryType = 'recette' | 'depense';
interface Entry {
  id: string; type: EntryType; label: string; amount: number;
  date: string; source: string; orderId?: string; category?: string;
}
interface Dette {
  id: string; clientNom: string; clientPhone?: string; article: string;
  montant: number; montantPaye: number; date: string; statut: string;
}

// Catégories de dépenses
const DEPENSE_CATS = ['Stock', 'Transport', 'Livraison', 'Téléphone', 'Emballage', 'Commission', 'Autre'];
const RECETTE_CATS = ['Vente Brumerie', 'Vente directe', 'Acompte', 'Autre'];

function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmt(n: number) { return n.toLocaleString('fr-CI') + ' FCFA'; }
function fmtShort(n: number) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(0) + 'k';
  return n.toLocaleString('fr-CI');
}
function weekOf(d: string) {
  const dt = new Date(d + 'T12:00:00'); const day = dt.getDay();
  return new Date(dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1))).toISOString().slice(0, 10);
}
function groupByDay(entries: Entry[]) {
  const map: Record<string, Entry[]> = {};
  entries.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e); });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

export function ComptaPage({ onBack, onOpenChat, onNavigate }: ComptaPageProps) {
  const { currentUser, userProfile } = useAuth();

  // ── Tous les hooks d'abord ──
  const [entries, setEntries]     = useState<Entry[]>([]);
  const [dettes, setDettes]       = useState<Dette[]>([]);
  const [orders, setOrders]       = useState<any[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [period, setPeriod]       = useState<'today'|'week'|'month'|'all'>('month');
  const [tab, setTab]             = useState<'dashboard'|'saisir'|'detail'|'marge'|'dettes'>('dashboard');
  const [form, setForm]           = useState({
    type: 'recette' as EntryType, label: '', amount: '', date: todayISO(),
    category: '' as string,
  });
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Marge calculator (intégré)
  const [marge, setMarge]         = useState({ achat: '', vente: '', transport: '', autres: '', qte: '1' });
  // Dette rapide
  const [detteForm, setDetteForm] = useState({ nom: '', phone: '', article: '', montant: '', paye: '0', date: todayISO() });
  const [savingDette, setSavingDette] = useState(false);
  const [payModal, setPayModal]   = useState<Dette | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const isVerified = !!(userProfile?.isVerified || (userProfile as any)?.isPremium);

  // Charger entrées compta
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(collection(db, 'compta'), where('userId', '==', currentUser.uid));
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry));
      data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setEntries(data); setLoading(false);
    }, () => setLoading(false));
  }, [currentUser?.uid]);

  // Charger dettes
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(collection(db, 'dettes'), where('userId', '==', currentUser.uid));
    return onSnapshot(q, snap => {
      setDettes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Dette)));
    });
  }, [currentUser?.uid]);

  // Charger commandes + produits
  useEffect(() => {
    if (!currentUser?.uid || !isVerified) return;
    const unsub = subscribeOrdersAsSeller(currentUser.uid, setOrders);
    getSellerProducts(currentUser.uid).then(setProducts);
    return unsub;
  }, [currentUser?.uid, isVerified]);

  // Injecter ventes Brumerie auto
  useEffect(() => {
    if (!currentUser?.uid || !isVerified || entries.length === 0) return;
    const delivered = orders.filter(o => o.status === 'delivered' || o.status === 'cod_delivered');
    const existingIds = new Set(entries.filter(e => e.orderId).map(e => e.orderId));
    delivered.forEach(async order => {
      if (!existingIds.has(order.id)) {
        const dateStr = order.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || todayISO();
        try {
          await addDoc(collection(db, 'compta'), {
            userId: currentUser.uid, type: 'recette',
            label: `Vente — ${order.productTitle}`,
            amount: order.productPrice, date: dateStr,
            source: 'brumerie', orderId: order.id,
            category: 'Vente Brumerie', createdAt: serverTimestamp(),
          });
        } catch {}
      }
    });
  }, [orders.length, entries.length, currentUser?.uid, isVerified]);

  // ── Garde accès non-vérifié ──
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-8 text-center pb-20">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="font-black text-slate-900 text-xl uppercase mb-2">Badge Vérifié requis</h2>
        <p className="text-slate-400 text-[13px] leading-relaxed mb-6 max-w-xs">
          La comptabilité professionnelle est réservée aux vendeurs avec le badge Vérifié actif.
        </p>
        <button onClick={() => onNavigate?.('verification')}
          className="px-6 py-3.5 bg-green-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 mb-3 shadow-lg shadow-green-200">
          Activer mon badge Vérifié
        </button>
        <button onClick={onBack} className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
          Retour
        </button>
      </div>
    );
  }

  // ── Calculs période ──
  const today = todayISO();
  const filtered = entries.filter(e => {
    if (!e.date) return false;
    if (period === 'today') return e.date === today;
    if (period === 'week')  return weekOf(e.date) === weekOf(today);
    if (period === 'month') return e.date.slice(0, 7) === today.slice(0, 7);
    return true;
  });

  const recettes    = filtered.filter(e => e.type === 'recette').reduce((s, e) => s + (e.amount || 0), 0);
  const depenses    = filtered.filter(e => e.type === 'depense').reduce((s, e) => s + (e.amount || 0), 0);
  const benefice    = recettes - depenses;
  const viaBrumerie = filtered.filter(e => e.source === 'brumerie').reduce((s, e) => s + (e.amount || 0), 0);
  const grouped     = groupByDay(filtered);

  // Dettes actives
  const dettesActives = dettes.filter(d => d.statut !== 'solde');
  const totalDu = dettesActives.reduce((s, d) => s + (d.montant - d.montantPaye), 0);

  // Marge calculator
  const achatN = parseFloat(marge.achat) || 0;
  const venteN = parseFloat(marge.vente) || 0;
  const transportN = parseFloat(marge.transport) || 0;
  const autresN = parseFloat(marge.autres) || 0;
  const qteN = parseFloat(marge.qte) || 1;
  const coutUnit = achatN + transportN + autresN;
  const margeUnit = venteN - coutUnit;
  const margeTotale = margeUnit * qteN;
  const tauxMarge = venteN > 0 ? (margeUnit / venteN) * 100 : 0;

  // Actions
  const handleAdd = async () => {
    if (!currentUser || !form.label.trim() || !form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'compta'), {
        userId: currentUser.uid, type: form.type,
        label: form.label.trim(), amount: parseFloat(form.amount),
        date: form.date, category: form.category || null,
        source: 'manuel', createdAt: serverTimestamp(),
      });
      setForm({ type: 'recette', label: '', amount: '', date: todayISO(), category: '' });
      setSaved(true);
      setTimeout(() => { setSaved(false); setTab('dashboard'); }, 1200);
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await deleteDoc(doc(db, 'compta', deleteConfirm)); }
    catch {} finally { setDeleteConfirm(null); }
  };

  const handleAddDette = async () => {
    if (!currentUser || !detteForm.nom.trim() || !detteForm.article.trim() || !detteForm.montant) return;
    setSavingDette(true);
    const m = parseFloat(detteForm.montant), p = parseFloat(detteForm.paye) || 0;
    const statut = p >= m ? 'solde' : p > 0 ? 'partiel' : 'en_cours';
    try {
      await addDoc(collection(db, 'dettes'), {
        userId: currentUser.uid, clientNom: detteForm.nom.trim(),
        clientPhone: detteForm.phone.trim() || null,
        article: detteForm.article.trim(), montant: m, montantPaye: p,
        date: detteForm.date, statut, createdAt: serverTimestamp(),
      });
      setDetteForm({ nom: '', phone: '', article: '', montant: '', paye: '0', date: todayISO() });
    } catch {} finally { setSavingDette(false); }
  };

  const handlePay = async () => {
    if (!payModal || !payAmount) return;
    const add = parseFloat(payAmount);
    if (isNaN(add) || add <= 0) return;
    const newPaye = Math.min(payModal.montantPaye + add, payModal.montant);
    const newStatut = newPaye >= payModal.montant ? 'solde' : 'partiel';
    try { await updateDoc(doc(db, 'dettes', payModal.id), { montantPaye: newPaye, statut: newStatut }); }
    catch {}
    setPayModal(null); setPayAmount('');
  };

  const handleExport = () => {
    const rows = [['Date','Type','Catégorie','Libellé','Montant','Source'],
      ...filtered.map(e => [e.date, e.type, e.category||'', e.label, String(e.amount||0), e.source])];
    const csv = '\uFEFF' + rows.map(r => r.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    Object.assign(document.createElement('a'), { href: url, download: `compta-brumerie-${today}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  const periodLabel: Record<string, string> = { today: "Auj.", week: 'Semaine', month: 'Mois', all: 'Tout' };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">

      {/* HEADER */}
      <div className="bg-white sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all flex-shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-[14px] uppercase tracking-tight text-slate-900">💰 Comptabilité Pro</h1>
          <p className="text-[9px] text-green-600 font-bold uppercase tracking-widest">✓ Vendeur Vérifié · Brumerie</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl text-[9px] font-black text-slate-600 uppercase active:scale-95">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          CSV
        </button>
      </div>

      {/* PÉRIODE */}
      <div className="px-4 pt-3">
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          {(['today','week','month','all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all ${period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ONGLETS */}
      <div className="px-4 pt-3">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {[
            { id: 'dashboard', label: '📊 Tableau' },
            { id: 'saisir',    label: '+ Saisir' },
            { id: 'detail',    label: '📋 Détail' },
            { id: 'marge',     label: '📐 Marge' },
            { id: 'dettes',    label: `💳 Dettes (${dettesActives.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${tab === t.id ? 'bg-green-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">

        {/* ══ DASHBOARD ══ */}
        {tab === 'dashboard' && (
          <div className="space-y-3">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm text-center">
                <p className="text-[8px] font-black text-green-600 uppercase mb-1">📈 Recettes</p>
                <p className="font-black text-[13px] text-green-700 leading-tight">{fmtShort(recettes)}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm text-center">
                <p className="text-[8px] font-black text-red-500 uppercase mb-1">📉 Dépenses</p>
                <p className="font-black text-[13px] text-red-600 leading-tight">{fmtShort(depenses)}</p>
              </div>
              <div className={`rounded-2xl p-3 border-2 text-center ${benefice >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">💎 Bénéfice</p>
                <p className={`font-black text-[13px] leading-tight ${benefice >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {benefice >= 0 ? '+' : ''}{fmtShort(benefice)}
                </p>
              </div>
            </div>

            {/* Barre visuelle */}
            {(recettes > 0 || depenses > 0) && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-600">Recettes vs Dépenses</span>
                  <span className={`text-[10px] font-black ${benefice >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tauxMarge >= 0 ? '+' : ''}{benefice !== 0 && recettes > 0 ? ((benefice/recettes)*100).toFixed(0) : 0}% marge
                  </span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${recettes > 0 ? Math.min((viaBrumerie/recettes)*100, 100) : 0}%` }}/>
                  <div className="h-full bg-green-300 transition-all" style={{ width: `${recettes > 0 ? Math.min(((recettes-viaBrumerie)/recettes)*100, 100) : 0}%` }}/>
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="text-[8px] text-slate-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Via Brumerie: {fmt(viaBrumerie)}</span>
                  <span className="text-[8px] text-slate-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-300 inline-block"/>Hors: {fmt(recettes - viaBrumerie)}</span>
                </div>
              </div>
            )}

            {/* Dettes en attente */}
            {dettesActives.length > 0 && (
              <button onClick={() => setTab('dettes')}
                className="w-full bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] text-left">
                <span className="text-2xl">💳</span>
                <div className="flex-1">
                  <p className="font-black text-amber-800 text-[13px]">{dettesActives.length} client{dettesActives.length > 1 ? 's' : ''} te doivent de l'argent</p>
                  <p className="text-[11px] text-amber-600 font-bold">{fmt(totalDu)} à encaisser → Voir</p>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}

            {/* Dépenses par catégorie */}
            {depenses > 0 && (() => {
              const bycat: Record<string, number> = {};
              filtered.filter(e => e.type === 'depense').forEach(e => {
                const cat = e.category || 'Autre';
                bycat[cat] = (bycat[cat] || 0) + e.amount;
              });
              const cats = Object.entries(bycat).sort((a, b) => b[1] - a[1]).slice(0, 5);
              return (
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Dépenses par catégorie</p>
                  <div className="space-y-2">
                    {cats.map(([cat, val]) => (
                      <div key={cat}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[10px] font-bold text-slate-600">{cat}</span>
                          <span className="text-[10px] font-black text-red-500">{fmt(val)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${(val/depenses)*100}%` }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Conseil */}
            <div className="bg-slate-900 rounded-2xl p-4">
              <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-2">💡 Analyse Brumerie</p>
              {recettes === 0 ? (
                <p className="text-[11px] text-white leading-snug">Commence à enregistrer tes ventes pour avoir une vue complète de ton activité.</p>
              ) : benefice < 0 ? (
                <p className="text-[11px] text-white leading-snug">⚠️ Tes dépenses dépassent tes recettes. Utilise l'onglet <strong>Marge</strong> pour identifier tes produits rentables.</p>
              ) : tauxMarge > 0 && (benefice/recettes) < 0.2 ? (
                <p className="text-[11px] text-white leading-snug">Marge de {((benefice/recettes)*100).toFixed(0)}%. Vise 20%+ en réduisant les coûts de stock et transport.</p>
              ) : (
                <p className="text-[11px] text-white leading-snug">✅ Bonne santé financière ! Marge de {((benefice/recettes)*100).toFixed(0)}% sur la période.</p>
              )}
            </div>

            {loading && (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-green-500 rounded-full animate-spin mx-auto"/>
              </div>
            )}
          </div>
        )}

        {/* ══ SAISIR ══ */}
        {tab === 'saisir' && (
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <p className="font-black text-slate-900 text-[15px]">Nouvelle entrée</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'recette', label: '📈 Recette', active: 'bg-green-50 border-green-500 text-green-700' },
                { id: 'depense', label: '📉 Dépense', active: 'bg-red-50 border-red-400 text-red-600' },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id, category: '' }))}
                  className={`py-3 rounded-2xl border-2 font-black text-[11px] uppercase tracking-wide transition-all ${form.type === t.id ? t.active : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* Catégorie */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Catégorie</p>
              <div className="flex flex-wrap gap-2">
                {(form.type === 'recette' ? RECETTE_CATS : DEPENSE_CATS).map(cat => (
                  <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all active:scale-95 ${form.category === cat ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Libellé</p>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder={form.type === 'recette' ? 'Ex: Vente pagne wax' : 'Ex: Achat stock tissu'}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400 transition-all"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Montant (FCFA)</p>
                <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, '') }))}
                  type="number" inputMode="numeric" placeholder="0"
                  className="w-full px-3 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[14px] font-black outline-none focus:border-green-400 transition-all"/>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date</p>
                <input type="date" value={form.date} max={todayISO()}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[11px] outline-none focus:border-green-400 transition-all"/>
              </div>
            </div>
            {saved ? (
              <div className="w-full py-4 rounded-2xl bg-green-50 border-2 border-green-200 text-green-700 font-black text-[11px] uppercase text-center">✅ Enregistré !</div>
            ) : (
              <button onClick={handleAdd} disabled={saving || !form.label.trim() || !form.amount || parseFloat(form.amount) <= 0}
                className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 disabled:opacity-40 transition-all"
                style={{ background: form.type === 'recette' ? 'linear-gradient(135deg,#16A34A,#115E2E)' : 'linear-gradient(135deg,#EF4444,#B91C1C)' }}>
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/> : form.type === 'recette' ? '💰 Enregistrer la recette' : '💸 Enregistrer la dépense'}
              </button>
            )}
          </div>
        )}

        {/* ══ DÉTAIL ══ */}
        {tab === 'detail' && (
          <div className="space-y-4">
            {grouped.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <p className="text-3xl mb-3">📋</p>
                <p className="font-black text-slate-400 uppercase text-[12px]">Aucune entrée</p>
                <button onClick={() => setTab('saisir')} className="mt-4 px-5 py-2.5 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase active:scale-95">+ Saisir</button>
              </div>
            ) : grouped.map(([date, dayEntries]) => {
              const dayRec = dayEntries.filter(e => e.type === 'recette').reduce((s,e) => s+e.amount, 0);
              const dayDep = dayEntries.filter(e => e.type === 'depense').reduce((s,e) => s+e.amount, 0);
              const label = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <div key={date}>
                  <div className="flex justify-between items-center px-1 mb-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
                    <div className="flex gap-2">
                      {dayRec > 0 && <span className="text-[10px] font-black text-green-600">+{fmtShort(dayRec)}</span>}
                      {dayDep > 0 && <span className="text-[10px] font-black text-red-500">-{fmtShort(dayDep)}</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {dayEntries.map(e => (
                      <div key={e.id} className="bg-white rounded-2xl px-4 py-3 border border-slate-100 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${e.type === 'recette' ? 'bg-green-50' : 'bg-red-50'}`}>
                          {e.type === 'recette' ? '📈' : '📉'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-[12px] truncate">{e.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {e.category && <span className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{e.category}</span>}
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${e.source === 'brumerie' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                              {e.source === 'brumerie' ? '🛍 Brumerie' : '✍️ Manuel'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`font-black text-[13px] ${e.type === 'recette' ? 'text-green-600' : 'text-red-500'}`}>
                            {e.type === 'recette' ? '+' : '-'}{(e.amount||0).toLocaleString('fr-CI')}
                          </span>
                          {e.source !== 'brumerie' && (
                            <button onClick={() => setDeleteConfirm(e.id)} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center active:scale-90">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ MARGE ══ */}
        {tab === 'marge' && (
          <div className="space-y-3">
            {/* Résultat */}
            <div className={`rounded-3xl p-5 border-2 ${margeUnit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <div>
                  <p className={`font-black text-[18px] ${margeUnit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {margeUnit >= 0 ? '+' : ''}{fmtShort(Math.round(margeUnit))}
                  </p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase">Marge/unité</p>
                </div>
                <div>
                  <p className={`font-black text-[18px] ${tauxMarge >= 20 ? 'text-green-700' : tauxMarge >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    {tauxMarge.toFixed(0)}%
                  </p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase">Taux</p>
                </div>
                <div>
                  <p className={`font-black text-[18px] ${margeTotale >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {margeTotale >= 0 ? '+' : ''}{fmtShort(Math.round(margeTotale))}
                  </p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase">Total</p>
                </div>
              </div>
              <div className={`rounded-xl px-4 py-2.5 text-center ${margeUnit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {venteN === 0 ? (
                  <p className="text-[11px] text-slate-500">Saisis ton prix de vente</p>
                ) : margeUnit < 0 ? (
                  <p className="text-[12px] font-black text-red-700">⚠️ Tu perds {fmt(Math.abs(Math.round(margeUnit)))} par vente !</p>
                ) : tauxMarge < 15 ? (
                  <p className="text-[12px] font-black text-amber-700">🟡 Marge faible. Vise 20%+ minimum.</p>
                ) : (
                  <p className="text-[12px] font-black text-green-700">✅ Bonne marge — produit rentable !</p>
                )}
              </div>
            </div>
            {/* Champs */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
              <p className="text-[9px] font-black text-green-700 uppercase tracking-widest">💰 Vente</p>
              {[
                { label: 'Prix de vente', key: 'vente', ph: '25000' },
                { label: 'Quantité', key: 'qte', ph: '1' },
              ].map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <p className="text-[10px] font-bold text-slate-600 w-28 flex-shrink-0">{f.label}</p>
                  <input value={(marge as any)[f.key]}
                    onChange={e => setMarge(m => ({ ...m, [f.key]: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder={f.ph} type="number" inputMode="numeric"
                    className="flex-1 px-3 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[13px] font-black outline-none focus:border-green-400"/>
                </div>
              ))}
              <p className="text-[9px] font-black text-red-600 uppercase tracking-widest pt-1">📦 Coûts / unité</p>
              {[
                { label: 'Prix achat', key: 'achat', ph: '15000' },
                { label: 'Transport', key: 'transport', ph: '500' },
                { label: 'Autres frais', key: 'autres', ph: '200' },
              ].map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <p className="text-[10px] font-bold text-slate-600 w-28 flex-shrink-0">{f.label}</p>
                  <input value={(marge as any)[f.key]}
                    onChange={e => setMarge(m => ({ ...m, [f.key]: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder={f.ph} type="number" inputMode="numeric"
                    className="flex-1 px-3 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[13px] font-black outline-none focus:border-green-400"/>
                </div>
              ))}
            </div>
            {/* Enregistrer en dépense */}
            {coutUnit > 0 && (
              <button onClick={async () => {
                if (!currentUser) return;
                await addDoc(collection(db, 'compta'), {
                  userId: currentUser.uid, type: 'depense',
                  label: `Coût produit (${qteN} unité${qteN > 1 ? 's' : ''})`,
                  amount: coutUnit * qteN, date: todayISO(),
                  category: 'Stock', source: 'manuel', createdAt: serverTimestamp(),
                });
              }} className="w-full py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-black text-[10px] uppercase active:scale-95 bg-white">
                💾 Enregistrer ces coûts en dépense
              </button>
            )}
          </div>
        )}

        {/* ══ DETTES ══ */}
        {tab === 'dettes' && (
          <div className="space-y-3">
            {/* Résumé */}
            {dettesActives.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-black text-amber-800 text-[13px]">{dettesActives.length} dette{dettesActives.length > 1 ? 's' : ''} en cours</p>
                  <p className="text-[11px] text-amber-600">{fmt(totalDu)} à encaisser</p>
                </div>
                <span className="text-3xl">💳</span>
              </div>
            )}
            {/* Formulaire ajout rapide */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
              <p className="font-black text-slate-900 text-[13px]">+ Nouvelle dette</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'nom', ph: 'Nom client *', type: 'text' },
                  { key: 'phone', ph: 'Téléphone', type: 'tel' },
                  { key: 'article', ph: 'Article *', type: 'text' },
                ].map(f => (
                  <input key={f.key} value={(detteForm as any)[f.key]}
                    onChange={e => setDetteForm(df => ({ ...df, [f.key]: e.target.value }))}
                    placeholder={f.ph} type={f.type}
                    className={`px-3 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-[12px] outline-none focus:border-green-400 ${f.key === 'article' ? 'col-span-2' : ''}`}/>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input value={detteForm.montant}
                    onChange={e => setDetteForm(df => ({ ...df, montant: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="Montant total" type="number" inputMode="numeric"
                    className="w-full px-3 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-[12px] font-black outline-none focus:border-green-400 pr-12"/>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400">FCFA</span>
                </div>
                <div className="relative">
                  <input value={detteForm.paye}
                    onChange={e => setDetteForm(df => ({ ...df, paye: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="Déjà payé" type="number" inputMode="numeric"
                    className="w-full px-3 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-[12px] font-black outline-none focus:border-green-400 pr-12"/>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400">FCFA</span>
                </div>
              </div>
              <button onClick={handleAddDette}
                disabled={savingDette || !detteForm.nom.trim() || !detteForm.article.trim() || !detteForm.montant}
                className="w-full py-3 rounded-2xl bg-amber-500 text-white font-black text-[10px] uppercase active:scale-95 disabled:opacity-40">
                {savingDette ? '...' : '💳 Enregistrer la dette'}
              </button>
            </div>
            {/* Liste dettes */}
            {dettes.length > 0 && (
              <div className="space-y-2">
                {dettes.slice(0, 10).map(d => {
                  const restant = d.montant - d.montantPaye;
                  const pct = d.montant > 0 ? (d.montantPaye / d.montant) * 100 : 0;
                  return (
                    <div key={d.id} className={`bg-white rounded-2xl p-4 border-2 ${d.statut === 'solde' ? 'border-green-100' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base flex-shrink-0 ${d.statut === 'solde' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {d.clientNom.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between">
                            <p className="font-black text-[13px] text-slate-900 truncate">{d.clientNom}</p>
                            <span className={`font-black text-[12px] ml-2 ${d.statut === 'solde' ? 'text-green-600' : 'text-amber-600'}`}>
                              {d.statut === 'solde' ? '✅ Soldé' : fmt(restant)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{d.article}</p>
                          {d.statut !== 'solde' && d.montantPaye > 0 && (
                            <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }}/>
                            </div>
                          )}
                        </div>
                      </div>
                      {d.statut !== 'solde' && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => { setPayModal(d); setPayAmount(String(restant)); }}
                            className="flex-1 py-2 rounded-xl bg-green-100 text-green-700 font-black text-[9px] uppercase active:scale-95">
                            💰 Paiement reçu
                          </button>
                          {onOpenChat && d.clientPhone && (
                            <button onClick={async () => {
                              const { getUserByPhone } = await import('@/services/userService');
                              const user = await getUserByPhone(d.clientPhone!);
                              if (user) onOpenChat(user.uid, d.clientNom);
                              else window.open(`https://wa.me/${d.clientPhone?.replace(/\D/g,'')}?text=${encodeURIComponent(`Bonjour ${d.clientNom}, rappel dette de ${fmt(restant)} pour ${d.article}`)}`, '_blank');
                            }}
                              className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 font-black text-[9px] uppercase active:scale-95">
                              💬 Rappel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALE PAIEMENT DETTE */}
      {payModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', height: '100dvh' }}
          onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="font-black text-[15px]">💰 Paiement reçu</p>
            <p className="text-[12px] text-slate-500">{payModal.clientNom} · Reste : {fmt(payModal.montant - payModal.montantPaye)}</p>
            <div className="flex gap-2">
              {[25,50,100].map(p => (
                <button key={p} onClick={() => setPayAmount(String(Math.round((payModal.montant - payModal.montantPaye)*p/100)))}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase active:scale-95">{p}%</button>
              ))}
              <button onClick={() => setPayAmount(String(payModal.montant - payModal.montantPaye))}
                className="flex-1 py-2 rounded-xl bg-green-100 text-green-700 font-black text-[10px] uppercase active:scale-95">Tout</button>
            </div>
            <div className="relative">
              <input value={payAmount} onChange={e => setPayAmount(e.target.value.replace(/[^0-9]/g,''))}
                type="number" inputMode="numeric" placeholder="Montant reçu"
                className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[16px] font-black outline-none focus:border-green-400 pr-20"/>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">FCFA</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPayModal(null)} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase active:scale-95">Annuler</button>
              <button onClick={handlePay} disabled={!payAmount || parseFloat(payAmount)<=0}
                className="flex-[2] py-3.5 rounded-2xl bg-green-600 text-white font-black text-[11px] uppercase active:scale-95 disabled:opacity-40 shadow-lg shadow-green-200">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', height: '100dvh' }}
          onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center"><div className="text-4xl mb-3">🗑️</div>
              <p className="font-black text-[15px] mb-1">Supprimer cette entrée ?</p>
              <p className="text-[12px] text-slate-400">Action irréversible.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase active:scale-95">Annuler</button>
              <button onClick={handleDelete} className="flex-[2] py-3.5 rounded-2xl bg-red-500 text-white font-black text-[11px] uppercase active:scale-95 shadow-lg shadow-red-100">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
