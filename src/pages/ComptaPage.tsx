// src/pages/ComptaPage.tsx — Mini Comptabilité Vendeur Vérifié
// "Ce que j'ai gagné · Ce que j'ai dépensé · Ce qu'il me reste"
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeOrdersAsSeller } from '@/services/orderService';
import { db } from '@/config/firebase';
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';

interface ComptaPageProps {
  onBack: () => void;
}

// ── Types internes ─────────────────────────────────────────────
type EntryType = 'recette' | 'depense';

interface Entry {
  id: string;
  type: EntryType;
  label: string;
  amount: number;
  date: string;       // ISO YYYY-MM-DD
  source: 'brumerie' | 'manuel';
  orderId?: string;
  createdAt?: any;
}

// ── Helpers ────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatFCFA(n: number) {
  return n.toLocaleString('fr-CI') + ' FCFA';
}

function weekOf(dateISO: string) {
  const d = new Date(dateISO);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().slice(0, 10);
}

function groupByDay(entries: Entry[]) {
  const map: Record<string, Entry[]> = {};
  entries.forEach(e => {
    if (!map[e.date]) map[e.date] = [];
    map[e.date].push(e);
  });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

// ── Composants ─────────────────────────────────────────────────
function KpiCard({ icon, label, value, color, sub }: {
  icon: string; label: string; value: number; color: string; sub?: string;
}) {
  return (
    <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{label}</p>
      </div>
      <p className="font-black text-[16px] leading-none" style={{ color }}>
        {value >= 0 ? '+' : ''}{formatFCFA(value)}
      </p>
      {sub && <p className="text-[9px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────
export function ComptaPage({ onBack }: ComptaPageProps) {
  const { currentUser, userProfile } = useAuth();

  // ── Accès restreint vendeur vérifié
  if (!userProfile?.isVerified && !(userProfile as any)?.isPremium) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-8 text-center pb-20">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="font-black text-slate-900 text-xl uppercase tracking-tight mb-2">Vendeur Vérifié</h2>
        <p className="text-slate-500 text-[13px] leading-relaxed mb-6">
          La mini-comptabilité est réservée aux vendeurs avec le badge Vérifié.
          Obtiens ton badge pour accéder à cet outil.
        </p>
        <button onClick={onBack}
          className="px-6 py-3 bg-green-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95">
          Retour
        </button>
      </div>
    );
  }

  const [entries, setEntries]       = useState<Entry[]>([]);
  const [period, setPeriod]         = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [tab, setTab]               = useState<'tableau' | 'ajouter' | 'historique'>('tableau');
  const [loading, setLoading]       = useState(true);

  // Form ajout manuel
  const [form, setForm] = useState({
    type: 'recette' as EntryType,
    label: '',
    amount: '',
    date: todayISO(),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // ── Charger entrées Firestore ─────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'compta'),
      where('userId', '==', currentUser.uid),
    );
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry));
      data.sort((a, b) => b.date.localeCompare(a.date));
      setEntries(data);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [currentUser]);

  // ── Injecter automatiquement les ventes Brumerie livrées ─
  useEffect(() => {
    if (!currentUser) return;
    return subscribeOrdersAsSeller(currentUser.uid, async (orders) => {
      const delivered = orders.filter(o =>
        o.status === 'delivered' || o.status === 'cod_delivered'
      );
      // Pour chaque vente livrée, créer une entrée si pas déjà présente
      const existingOrderIds = new Set(entries.filter(e => e.orderId).map(e => e.orderId));
      for (const order of delivered) {
        if (!existingOrderIds.has(order.id)) {
          const dateStr = order.createdAt?.toDate
            ? order.createdAt.toDate().toISOString().slice(0, 10)
            : todayISO();
          try {
            await addDoc(collection(db, 'compta'), {
              userId:   currentUser.uid,
              type:     'recette',
              label:    `Vente — ${order.productTitle}`,
              amount:   order.productPrice,
              date:     dateStr,
              source:   'brumerie',
              orderId:  order.id,
              createdAt: serverTimestamp(),
            });
          } catch { /* silent — sera réessayé au prochain render */ }
        }
      }
    });
  }, [currentUser, entries]);

  // ── Filtrer par période ───────────────────────────────────
  const filtered = entries.filter(e => {
    const today = todayISO();
    if (period === 'today') return e.date === today;
    if (period === 'week')  return weekOf(e.date) === weekOf(today);
    if (period === 'month') return e.date.slice(0, 7) === today.slice(0, 7);
    return true;
  });

  const recettes  = filtered.filter(e => e.type === 'recette').reduce((s, e) => s + e.amount, 0);
  const depenses  = filtered.filter(e => e.type === 'depense').reduce((s, e) => s + e.amount, 0);
  const benefice  = recettes - depenses;
  const bruteBrumerie = filtered.filter(e => e.type === 'recette' && e.source === 'brumerie').reduce((s, e) => s + e.amount, 0);

  // ── Ajouter entrée manuelle ───────────────────────────────
  const handleAdd = async () => {
    if (!currentUser || !form.label.trim() || !form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'compta'), {
        userId:    currentUser.uid,
        type:      form.type,
        label:     form.label.trim(),
        amount:    parseFloat(form.amount),
        date:      form.date,
        source:    'manuel',
        createdAt: serverTimestamp(),
      });
      setForm({ type: 'recette', label: '', amount: '', date: todayISO() });
      setSaved(true);
      setTimeout(() => { setSaved(false); setTab('tableau'); }, 1200);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  // ── Supprimer entrée manuelle ─────────────────────────────
  const handleDelete = async (id: string) => {
    try { await deleteDoc(doc(db, 'compta', id)); } catch { /* silent */ }
  };

  // ── Export CSV ────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ['Date', 'Type', 'Libellé', 'Montant (FCFA)', 'Source'],
      ...filtered.map(e => [e.date, e.type, e.label, e.amount, e.source]),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brumerie-compta-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const grouped = groupByDay(filtered);

  const periodLabel: Record<typeof period, string> = {
    today: "Aujourd'hui", week: 'Cette semaine', month: 'Ce mois', all: 'Tout',
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">

      {/* ── HEADER ── */}
      <div className="bg-white sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[14px] uppercase tracking-tight text-slate-900">💰 Ma Comptabilité</h1>
          <p className="text-[9px] text-slate-400 font-bold">Vendeur Vérifié · Brumerie</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl text-[9px] font-black text-slate-600 uppercase tracking-widest active:scale-95 transition-all">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── FILTRE PÉRIODE ── */}
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          {(['today', 'week', 'month', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all ${
                period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
              }`}>
              {p === 'today' ? 'Auj.' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Tout'}
            </button>
          ))}
        </div>

        {/* ── KPI CARDS ── */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <KpiCard icon="📈" label="Recettes" value={recettes} color="#16A34A"
              sub={`dont ${formatFCFA(bruteBrumerie)} via Brumerie`}/>
            <KpiCard icon="📉" label="Dépenses" value={-depenses} color="#EF4444"/>
          </div>
          <div className={`rounded-2xl p-4 border-2 ${benefice >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">💎 Bénéfice net estimé</p>
                <p className={`font-black text-2xl ${benefice >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {benefice >= 0 ? '+' : ''}{formatFCFA(benefice)}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">{periodLabel[period]}</p>
              </div>
              <span className="text-4xl">{benefice >= 0 ? '🎉' : '⚠️'}</span>
            </div>
          </div>
        </div>

        {/* ── ONGLETS ── */}
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          {[
            { id: 'tableau',     label: '📊 Tableau' },
            { id: 'ajouter',     label: '+ Saisir' },
            { id: 'historique',  label: '📋 Détail' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all ${
                tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TABLEAU ── */}
        {tab === 'tableau' && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-green-500 rounded-full animate-spin mx-auto mb-3"/>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Chargement...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <p className="text-3xl mb-3">📊</p>
                <p className="font-black text-slate-400 uppercase tracking-tight text-[12px]">Aucune entrée</p>
                <p className="text-[10px] text-slate-300 mt-1">
                  Tes ventes Brumerie s'ajoutent automatiquement
                </p>
                <button onClick={() => setTab('ajouter')}
                  className="mt-4 px-5 py-2.5 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95">
                  + Saisir une entrée
                </button>
              </div>
            ) : (
              <>
                {/* Barres recettes vs dépenses */}
                {(recettes > 0 || depenses > 0) && (
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Répartition</p>
                    {recettes > 0 && (
                      <div className="mb-2">
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] font-bold text-green-600">📈 Recettes</span>
                          <span className="text-[10px] font-black text-green-700">{formatFCFA(recettes)}</span>
                        </div>
                        <div className="h-3 bg-green-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}/>
                        </div>
                      </div>
                    )}
                    {depenses > 0 && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] font-bold text-red-500">📉 Dépenses</span>
                          <span className="text-[10px] font-black text-red-600">{formatFCFA(depenses)}</span>
                        </div>
                        <div className="h-3 bg-red-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full"
                            style={{ width: `${recettes > 0 ? (depenses/recettes)*100 : 100}%`, maxWidth: '100%' }}/>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Résumé par source */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Sources de revenus</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>
                        Via Brumerie
                      </span>
                      <span className="font-black text-[13px] text-green-700">{formatFCFA(bruteBrumerie)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>
                        Hors plateforme
                      </span>
                      <span className="font-black text-[13px] text-blue-700">
                        {formatFCFA(recettes - bruteBrumerie)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conseil personnalisé */}
                {benefice < 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                    <span className="text-2xl flex-shrink-0">💡</span>
                    <div>
                      <p className="font-black text-amber-800 text-[12px] mb-1">Conseil</p>
                      <p className="text-[11px] text-amber-700 leading-snug">
                        Tes dépenses dépassent tes recettes cette période. Vérifie tes coûts de stock et de transport.
                      </p>
                    </div>
                  </div>
                )}
                {recettes > 0 && bruteBrumerie < recettes * 0.5 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
                    <span className="text-2xl flex-shrink-0">🚀</span>
                    <div>
                      <p className="font-black text-blue-800 text-[12px] mb-1">Astuce</p>
                      <p className="text-[11px] text-blue-700 leading-snug">
                        Passe plus de ventes par Brumerie pour avoir un historique complet et être payé plus facilement.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── FORMULAIRE AJOUT ── */}
        {tab === 'ajouter' && (
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <p className="font-black text-slate-900 text-[14px]">Nouvelle entrée</p>

            {/* Type */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'recette', label: '📈 Recette', color: 'green' },
                { id: 'depense', label: '📉 Dépense', color: 'red' },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
                  className={`py-3 rounded-2xl border-2 font-black text-[11px] uppercase tracking-wide transition-all ${
                    form.type === t.id
                      ? t.color === 'green'
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'bg-red-50 border-red-400 text-red-600'
                      : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Libellé */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Libellé</p>
              <input
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder={form.type === 'recette' ? 'Ex: Vente robe rouge' : 'Ex: Achat stock tissu'}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400 transition-all"
              />
            </div>

            {/* Montant */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Montant (FCFA)</p>
              <div className="relative">
                <input
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="Ex: 15000"
                  type="number"
                  inputMode="numeric"
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[15px] font-black outline-none focus:border-green-400 transition-all pr-20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">FCFA</span>
              </div>
            </div>

            {/* Date */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date</p>
              <input
                type="date"
                value={form.date}
                max={todayISO()}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400 transition-all"
              />
            </div>

            {/* CTA */}
            {saved ? (
              <div className="w-full py-4 rounded-2xl bg-green-50 border-2 border-green-200 text-green-700 font-black text-[11px] uppercase tracking-widest text-center">
                ✅ Enregistré !
              </div>
            ) : (
              <button onClick={handleAdd}
                disabled={saving || !form.label.trim() || !form.amount || parseFloat(form.amount) <= 0}
                className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all disabled:opacity-40"
                style={{ background: form.type === 'recette'
                  ? 'linear-gradient(135deg,#16A34A,#115E2E)'
                  : 'linear-gradient(135deg,#EF4444,#B91C1C)' }}>
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
                  : form.type === 'recette' ? '💰 Enregistrer la recette' : '💸 Enregistrer la dépense'
                }
              </button>
            )}
          </div>
        )}

        {/* ── HISTORIQUE ── */}
        {tab === 'historique' && (
          <div className="space-y-4">
            {grouped.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <p className="text-3xl mb-3">📋</p>
                <p className="font-black text-slate-400 uppercase text-[12px]">Aucune entrée</p>
              </div>
            ) : grouped.map(([date, dayEntries]) => {
              const dayRec = dayEntries.filter(e => e.type === 'recette').reduce((s,e) => s+e.amount, 0);
              const dayDep = dayEntries.filter(e => e.type === 'depense').reduce((s,e) => s+e.amount, 0);
              const dayDate = new Date(date + 'T12:00:00');
              const dayLabel = dayDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <div key={date}>
                  {/* En-tête jour */}
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{dayLabel}</p>
                    <div className="flex gap-3">
                      {dayRec > 0 && <span className="text-[10px] font-black text-green-600">+{formatFCFA(dayRec)}</span>}
                      {dayDep > 0 && <span className="text-[10px] font-black text-red-500">-{formatFCFA(dayDep)}</span>}
                    </div>
                  </div>
                  {/* Entrées du jour */}
                  <div className="space-y-2">
                    {dayEntries.map(e => (
                      <div key={e.id} className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          e.type === 'recette' ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          <span className="text-base">{e.type === 'recette' ? '📈' : '📉'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-[12px] truncate">{e.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {e.source === 'brumerie'
                              ? <span className="text-[8px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">Brumerie</span>
                              : <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">Manuel</span>
                            }
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`font-black text-[13px] ${e.type === 'recette' ? 'text-green-600' : 'text-red-500'}`}>
                            {e.type === 'recette' ? '+' : '-'}{e.amount.toLocaleString('fr-CI')}
                          </span>
                          {e.source === 'manuel' && (
                            <button onClick={() => handleDelete(e.id)}
                              className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
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
      </div>
    </div>
  );
}
