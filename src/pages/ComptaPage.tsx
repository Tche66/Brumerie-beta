// src/pages/ComptaPage.tsx — Comptabilité Vendeur Vérifié v3
// RÈGLE CRITIQUE : tous les hooks avant tout return conditionnel
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';

interface ComptaPageProps { onBack: () => void; }
type EntryType = 'recette' | 'depense';
interface Entry {
  id: string; type: EntryType; label: string; amount: number;
  date: string; source: string; orderId?: string;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmt(n: number) { return n.toLocaleString('fr-CI') + ' FCFA'; }
function weekOf(d: string) {
  const dt = new Date(d + 'T12:00:00');
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return dt.toISOString().slice(0, 10);
}
function groupByDay(entries: Entry[]) {
  const map: Record<string, Entry[]> = {};
  entries.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e); });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

export function ComptaPage({ onBack }: ComptaPageProps) {
  const { currentUser, userProfile } = useAuth();

  // ─── TOUS LES HOOKS EN PREMIER ─────────────────────────────
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [period, setPeriod]     = useState<'today'|'week'|'month'|'all'>('week');
  const [tab, setTab]           = useState<'tableau'|'saisir'|'detail'>('tableau');
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState({
    type: 'recette' as EntryType, label: '', amount: '', date: todayISO(),
  });
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const isVerified = !!(userProfile?.isVerified || (userProfile as any)?.isPremium);

  // Charger depuis Firestore
  useEffect(() => {
    if (!currentUser?.uid || !isVerified) { setLoading(false); return; }
    const q = query(collection(db, 'compta'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry));
      data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setEntries(data);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [currentUser?.uid, isVerified]);

  // ─── RETURN CONDITIONNEL après les hooks ───────────────────
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-8 text-center pb-20">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="font-black text-slate-900 text-xl uppercase mb-2">Badge Vérifié requis</h2>
        <p className="text-slate-400 text-[13px] leading-relaxed mb-6 max-w-xs">
          La comptabilité est réservée aux vendeurs avec le badge Vérifié actif.
        </p>
        <button onClick={onBack}
          className="px-6 py-3.5 bg-green-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95">
          Retour
        </button>
      </div>
    );
  }

  // ─── Calculs ───────────────────────────────────────────────
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
  const viaBrumerie = filtered.filter(e => e.type === 'recette' && e.source === 'brumerie').reduce((s, e) => s + (e.amount || 0), 0);
  const grouped     = groupByDay(filtered);

  const periodLabel: Record<string, string> = {
    today: "Aujourd'hui", week: 'Semaine', month: 'Ce mois', all: 'Tout',
  };

  // ─── Actions ───────────────────────────────────────────────
  const handleAdd = async () => {
    if (!currentUser || !form.label.trim() || !form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'compta'), {
        userId: currentUser.uid,
        type: form.type,
        label: form.label.trim(),
        amount: parseFloat(form.amount),
        date: form.date,
        source: 'manuel',
        createdAt: serverTimestamp(),
      });
      setForm({ type: 'recette', label: '', amount: '', date: todayISO() });
      setSaved(true);
      setTimeout(() => { setSaved(false); setTab('tableau'); }, 1500);
    } catch (e) { console.error('ComptaPage add:', e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteDoc(doc(db, 'compta', id)); }
    catch (e) { console.error('ComptaPage delete:', e); }
  };

  const handleExport = () => {
    const rows = [
      ['Date', 'Type', 'Libellé', 'Montant (FCFA)', 'Source'],
      ...filtered.map(e => [e.date, e.type, e.label, String(e.amount || 0), e.source]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    Object.assign(document.createElement('a'), { href: url, download: `compta-brumerie-${today}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  // ─── Rendu ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">

      {/* HEADER */}
      <div className="bg-white sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
        <button onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 active:scale-90 transition-all flex-shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="#0F0F0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-[14px] uppercase tracking-tight text-slate-900">💰 Ma Comptabilité</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Vendeur Vérifié · Brumerie</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl text-[9px] font-black text-slate-600 uppercase active:scale-95">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          CSV
        </button>
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* PÉRIODE */}
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          {(['today','week','month','all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all ${
                period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
              }`}>
              {periodLabel[p]}
            </button>
          ))}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm text-center">
            <p className="text-[8px] font-black text-green-600 uppercase mb-1">📈 Recettes</p>
            <p className="font-black text-[13px] text-green-700 leading-tight">{fmt(recettes)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm text-center">
            <p className="text-[8px] font-black text-red-500 uppercase mb-1">📉 Dépenses</p>
            <p className="font-black text-[13px] text-red-600 leading-tight">{fmt(depenses)}</p>
          </div>
          <div className={`rounded-2xl p-3 border-2 text-center ${benefice >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">💎 Bénéfice</p>
            <p className={`font-black text-[13px] leading-tight ${benefice >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {benefice >= 0 ? '+' : ''}{fmt(benefice)}
            </p>
          </div>
        </div>

        {/* ONGLETS */}
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          {[
            { id: 'tableau', label: '📊 Vue' },
            { id: 'saisir',  label: '+ Saisir' },
            { id: 'detail',  label: '📋 Détail' },
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
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-green-500 rounded-full animate-spin mx-auto mb-3"/>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Chargement...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <p className="text-4xl mb-3">📊</p>
                <p className="font-black text-slate-400 uppercase text-[12px] mb-1">Aucune entrée</p>
                <p className="text-[10px] text-slate-300 mb-4">Les ventes Brumerie livrées s'ajoutent auto</p>
                <button onClick={() => setTab('saisir')}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase active:scale-95">
                  + Saisir une entrée
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Barres */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Répartition</p>
                  {[
                    { label: '📈 Recettes', value: recettes, bg: 'bg-green-500', track: 'bg-green-100', color: 'text-green-700', pct: 100 },
                    { label: '📉 Dépenses', value: depenses, bg: 'bg-red-400', track: 'bg-red-100', color: 'text-red-600', pct: recettes > 0 ? Math.min((depenses/recettes)*100, 100) : 100 },
                  ].map(bar => bar.value > 0 && (
                    <div key={bar.label} className="mb-3 last:mb-0">
                      <div className="flex justify-between mb-1">
                        <span className={`text-[10px] font-bold ${bar.color}`}>{bar.label}</span>
                        <span className={`text-[10px] font-black ${bar.color}`}>{fmt(bar.value)}</span>
                      </div>
                      <div className={`h-2.5 ${bar.track} rounded-full overflow-hidden`}>
                        <div className={`h-full ${bar.bg} rounded-full`} style={{ width: `${bar.pct}%` }}/>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Sources */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Sources de revenus</p>
                  <div className="space-y-2">
                    {[
                      { dot: 'bg-green-500', label: 'Via Brumerie', value: viaBrumerie, color: 'text-green-700' },
                      { dot: 'bg-blue-400', label: 'Hors plateforme', value: recettes - viaBrumerie, color: 'text-blue-700' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${row.dot} flex-shrink-0`}/>
                          {row.label}
                        </span>
                        <span className={`font-black text-[12px] ${row.color}`}>{fmt(row.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Conseils */}
                {benefice < 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                    <span className="text-xl flex-shrink-0">💡</span>
                    <p className="text-[11px] text-amber-700 leading-snug">
                      <strong>Conseil :</strong> Tes dépenses dépassent tes recettes. Vérifie tes coûts de stock et de transport.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SAISIR ── */}
        {tab === 'saisir' && (
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <p className="font-black text-slate-900 text-[15px]">Nouvelle entrée</p>
            {/* Type */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'recette', label: '📈 Recette', active: 'bg-green-50 border-green-500 text-green-700' },
                { id: 'depense', label: '📉 Dépense', active: 'bg-red-50 border-red-400 text-red-600' },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
                  className={`py-3 rounded-2xl border-2 font-black text-[11px] uppercase tracking-wide transition-all ${
                    form.type === t.id ? t.active : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* Libellé */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Libellé</p>
              <input value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder={form.type === 'recette' ? 'Ex: Vente robe rouge' : 'Ex: Achat stock tissu'}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400 transition-all"/>
            </div>
            {/* Montant */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Montant (FCFA)</p>
              <div className="relative">
                <input value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="Ex: 15000" type="number" inputMode="numeric"
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[15px] font-black outline-none focus:border-green-400 transition-all pr-20"/>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">FCFA</span>
              </div>
            </div>
            {/* Date */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date</p>
              <input type="date" value={form.date} max={todayISO()}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400 transition-all"/>
            </div>
            {/* CTA */}
            {saved ? (
              <div className="w-full py-4 rounded-2xl bg-green-50 border-2 border-green-200 text-green-700 font-black text-[11px] uppercase text-center">
                ✅ Enregistré !
              </div>
            ) : (
              <button onClick={handleAdd}
                disabled={saving || !form.label.trim() || !form.amount || parseFloat(form.amount) <= 0}
                className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 disabled:opacity-40 transition-all"
                style={{ background: form.type === 'recette' ? 'linear-gradient(135deg,#16A34A,#115E2E)' : 'linear-gradient(135deg,#EF4444,#B91C1C)' }}>
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
                  : form.type === 'recette' ? '💰 Enregistrer la recette' : '💸 Enregistrer la dépense'
                }
              </button>
            )}
          </div>
        )}

        {/* ── DÉTAIL ── */}
        {tab === 'detail' && (
          <div className="space-y-4">
            {grouped.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <p className="text-3xl mb-3">📋</p>
                <p className="font-black text-slate-400 uppercase text-[12px]">Aucune entrée</p>
              </div>
            ) : grouped.map(([date, dayEntries]) => {
              const dayRec = dayEntries.filter(e => e.type === 'recette').reduce((s, e) => s + (e.amount||0), 0);
              const dayDep = dayEntries.filter(e => e.type === 'depense').reduce((s, e) => s + (e.amount||0), 0);
              const label = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <div key={date}>
                  <div className="flex justify-between items-center px-1 mb-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
                    <div className="flex gap-3">
                      {dayRec > 0 && <span className="text-[10px] font-black text-green-600">+{fmt(dayRec)}</span>}
                      {dayDep > 0 && <span className="text-[10px] font-black text-red-500">-{fmt(dayDep)}</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {dayEntries.map(e => (
                      <div key={e.id} className="bg-white rounded-2xl px-4 py-3 border border-slate-100 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${e.type === 'recette' ? 'bg-green-50' : 'bg-red-50'}`}>
                          {e.type === 'recette' ? '📈' : '📉'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-[12px] truncate">{e.label}</p>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            e.source === 'brumerie' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {e.source === 'brumerie' ? '🛍 Brumerie' : '✍️ Manuel'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`font-black text-[13px] ${e.type === 'recette' ? 'text-green-600' : 'text-red-500'}`}>
                            {e.type === 'recette' ? '+' : '-'}{(e.amount||0).toLocaleString('fr-CI')}
                          </span>
                          {e.source !== 'brumerie' && (
                            <button onClick={() => handleDelete(e.id)}
                              className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center active:scale-90">
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
