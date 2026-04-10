// src/pages/MargeCalculatorPage.tsx — Calculateur de marge réelle par produit
// "Est-ce que je gagne vraiment de l'argent sur ce produit ?"
import React, { useState } from 'react';

interface MargeCalculatorPageProps { onBack: () => void; }

interface Calcul {
  prixAchat: number;
  transport: number;
  autresFrais: number;
  prixVente: number;
  qteVendue: number;
  commission: number; // % Brumerie
  fraisLivraison: number;
}

const EMPTY: Calcul = {
  prixAchat: 0, transport: 0, autresFrais: 0,
  prixVente: 0, qteVendue: 1,
  commission: 0, fraisLivraison: 0,
};

function fmt(n: number) {
  return n.toLocaleString('fr-CI');
}

function Field({ label, hint, value, onChange, suffix = 'FCFA', pct = false }: {
  label: string; hint?: string; value: number; onChange: (v: number) => void;
  suffix?: string; pct?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
        {hint && <p className="text-[9px] text-slate-400 italic">{hint}</p>}
      </div>
      <div className="relative">
        <input
          type="number" inputMode="numeric"
          value={value === 0 ? '' : value}
          onChange={e => onChange(parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
          placeholder="0"
          className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[14px] font-black outline-none focus:border-green-400 transition-all pr-20"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}

export function MargeCalculatorPage({ onBack }: MargeCalculatorPageProps) {
  const [c, setC] = useState<Calcul>(EMPTY);
  const [saved, setSaved] = useState<Array<Calcul & { nom: string; date: string }>>([]);
  const [nomProduit, setNomProduit] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [tab, setTab] = useState<'calcul' | 'historique'>('calcul');

  const set = (k: keyof Calcul) => (v: number) => setC(prev => ({ ...prev, [k]: v }));

  // ── Calculs ──────────────────────────────────────────────
  const coutUnitaire = c.prixAchat + c.transport + c.autresFrais;
  const commissionMontant = c.prixVente * (c.commission / 100);
  const recetteNette = c.prixVente - commissionMontant - c.fraisLivraison;
  const margeUnitaire = recetteNette - coutUnitaire;
  const margeTotale = margeUnitaire * c.qteVendue;
  const tauxMarge = c.prixVente > 0 ? (margeUnitaire / c.prixVente) * 100 : 0;
  const coutTotal = coutUnitaire * c.qteVendue;
  const revenus = recetteNette * c.qteVendue;
  const isProfit = margeUnitaire >= 0;
  const seuilRentabilite = coutUnitaire > 0
    ? Math.ceil(coutUnitaire / Math.max(recetteNette, 0.01))
    : 0;

  const reset = () => { setC(EMPTY); setNomProduit(''); };

  const handleSave = () => {
    if (!nomProduit.trim()) return;
    setSaved(prev => [
      { ...c, nom: nomProduit.trim(), date: new Date().toLocaleDateString('fr-FR') },
      ...prev.slice(0, 19),
    ]);
    setShowSave(false);
    setNomProduit('');
  };

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
          <h1 className="font-black text-[14px] uppercase tracking-tight text-slate-900">📊 Calcul de Marge</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Est-ce que je gagne vraiment ?</p>
        </div>
        <button onClick={reset}
          className="text-[9px] font-black text-slate-400 bg-slate-100 px-3 py-2 rounded-xl uppercase tracking-widest active:scale-95">
          Réinitialiser
        </button>
      </div>

      {/* ONGLETS */}
      <div className="px-4 pt-4">
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-4">
          {[
            { id: 'calcul',      label: '📊 Calculer' },
            { id: 'historique',  label: `📋 Historique (${saved.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all ${
                tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CALCULATEUR ── */}
      {tab === 'calcul' && (
        <div className="px-4 space-y-4">

          {/* RÉSULTAT — en haut pour visibilité immédiate */}
          <div className={`rounded-3xl p-5 border-2 ${isProfit ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">Résultat par unité vendue</p>
            <div className="flex items-center justify-between mb-3">
              <div className="text-center flex-1">
                <p className={`font-black text-3xl ${isProfit ? 'text-green-700' : 'text-red-600'}`}>
                  {isProfit ? '+' : ''}{fmt(Math.round(margeUnitaire))}
                </p>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Marge / unité</p>
              </div>
              <div className="w-px h-12 bg-slate-200"/>
              <div className="text-center flex-1">
                <p className={`font-black text-2xl ${tauxMarge >= 20 ? 'text-green-700' : tauxMarge >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                  {tauxMarge.toFixed(1)}%
                </p>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Taux de marge</p>
              </div>
              <div className="w-px h-12 bg-slate-200"/>
              <div className="text-center flex-1">
                <p className={`font-black text-2xl ${isProfit ? 'text-green-700' : 'text-red-600'}`}>
                  {isProfit ? '+' : ''}{fmt(Math.round(margeTotale))}
                </p>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Marge totale</p>
              </div>
            </div>

            {/* Verdict */}
            <div className={`rounded-2xl px-4 py-3 text-center ${isProfit ? 'bg-green-100' : 'bg-red-100'}`}>
              {c.prixVente === 0 ? (
                <p className="text-[11px] font-bold text-slate-500">Saisis ton prix de vente pour voir le résultat</p>
              ) : !isProfit ? (
                <p className="text-[12px] font-black text-red-700">
                  ⚠️ Tu perds {fmt(Math.abs(Math.round(margeUnitaire)))} FCFA par vente ! Augmente ton prix ou réduis tes coûts.
                </p>
              ) : tauxMarge < 15 ? (
                <p className="text-[12px] font-black text-amber-700">
                  🟡 Marge faible ({tauxMarge.toFixed(0)}%). Vise 20%+ pour être vraiment rentable.
                </p>
              ) : (
                <p className="text-[12px] font-black text-green-700">
                  ✅ Bonne marge ! Tu gagnes {tauxMarge.toFixed(0)}% sur ce produit.
                </p>
              )}
            </div>

            {/* Seuil rentabilité */}
            {seuilRentabilite > 0 && c.qteVendue > 0 && (
              <p className="text-[10px] text-center text-slate-500 mt-2">
                Seuil de rentabilité : <strong>{seuilRentabilite} unité{seuilRentabilite > 1 ? 's' : ''}</strong> minimum à vendre pour couvrir tes coûts
              </p>
            )}
          </div>

          {/* PRIX DE VENTE */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">💰 Côté vente</p>
            <Field label="Prix de vente" hint="Ce que paye le client" value={c.prixVente} onChange={set('prixVente')}/>
            <Field label="Quantité vendue" hint="Nb d'unités" value={c.qteVendue} onChange={set('qteVendue')} suffix="unités"/>
            <Field label="Commission Brumerie" hint="En %" value={c.commission} onChange={set('commission')} suffix="%" />
            <Field label="Frais de livraison" hint="Coût livreur à ta charge" value={c.fraisLivraison} onChange={set('fraisLivraison')}/>
          </div>

          {/* COÛTS */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">📦 Côté coûts</p>
            <Field label="Prix d'achat" hint="Par unité" value={c.prixAchat} onChange={set('prixAchat')}/>
            <Field label="Transport / Approvisionnement" hint="Par unité" value={c.transport} onChange={set('transport')}/>
            <Field label="Autres frais" hint="Emballage, téléphone, etc." value={c.autresFrais} onChange={set('autresFrais')}/>
          </div>

          {/* DÉTAIL */}
          {c.prixVente > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Détail du calcul</p>
              <div className="space-y-2">
                {[
                  { label: 'Prix de vente', value: c.prixVente, color: 'text-green-700', sign: '' },
                  { label: `Commission Brumerie (${c.commission}%)`, value: -commissionMontant, color: 'text-red-500', sign: '-' },
                  { label: 'Frais livraison', value: -c.fraisLivraison, color: 'text-red-500', sign: '-' },
                  { label: 'Coût achat/unité', value: -c.prixAchat, color: 'text-red-500', sign: '-' },
                  { label: 'Transport/unité', value: -c.transport, color: 'text-red-500', sign: '-' },
                  { label: 'Autres frais/unité', value: -c.autresFrais, color: 'text-red-500', sign: '-' },
                ].filter(r => r.value !== 0).map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-[11px] text-slate-600">{row.label}</span>
                    <span className={`text-[12px] font-black ${row.color}`}>
                      {row.value > 0 ? '+' : ''}{fmt(Math.round(row.value))} FCFA
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t-2 border-slate-200">
                  <span className="font-black text-[12px] text-slate-800">= Marge nette/unité</span>
                  <span className={`font-black text-[14px] ${isProfit ? 'text-green-700' : 'text-red-600'}`}>
                    {isProfit ? '+' : ''}{fmt(Math.round(margeUnitaire))} FCFA
                  </span>
                </div>
                {c.qteVendue > 1 && (
                  <div className="flex justify-between items-center">
                    <span className="font-black text-[12px] text-slate-800">× {c.qteVendue} unités = Total</span>
                    <span className={`font-black text-[14px] ${isProfit ? 'text-green-700' : 'text-red-600'}`}>
                      {isProfit ? '+' : ''}{fmt(Math.round(margeTotale))} FCFA
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SAUVEGARDER */}
          {c.prixVente > 0 && (
            <button onClick={() => setShowSave(true)}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#16A34A,#115E2E)' }}>
              💾 Sauvegarder ce calcul
            </button>
          )}
        </div>
      )}

      {/* ── HISTORIQUE ── */}
      {tab === 'historique' && (
        <div className="px-4 space-y-3">
          {saved.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-3xl border-2 border-dashed border-slate-100">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-black text-slate-400 uppercase text-[12px]">Aucun calcul sauvegardé</p>
              <p className="text-[10px] text-slate-300 mt-1">Fais un calcul et sauvegarde-le</p>
            </div>
          ) : saved.map((s, i) => {
            const mu = (s.prixVente - s.prixVente * s.commission / 100 - s.fraisLivraison) - (s.prixAchat + s.transport + s.autresFrais);
            const tm = s.prixVente > 0 ? (mu / s.prixVente) * 100 : 0;
            return (
              <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-black text-slate-900 text-[13px]">{s.nom}</p>
                    <p className="text-[9px] text-slate-400">{s.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-[14px] ${mu >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {mu >= 0 ? '+' : ''}{fmt(Math.round(mu))} FCFA
                    </p>
                    <p className={`text-[10px] font-bold ${tm >= 20 ? 'text-green-600' : tm >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                      {tm.toFixed(1)}% marge
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-xl py-2">
                    <p className="text-[9px] text-slate-400 uppercase">Achat</p>
                    <p className="font-black text-[11px] text-slate-700">{fmt(s.prixAchat)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl py-2">
                    <p className="text-[9px] text-slate-400 uppercase">Vente</p>
                    <p className="font-black text-[11px] text-green-700">{fmt(s.prixVente)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl py-2">
                    <p className="text-[9px] text-slate-400 uppercase">Qté</p>
                    <p className="font-black text-[11px] text-slate-700">{s.qteVendue}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE SAUVEGARDER */}
      {showSave && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', height: '100dvh' }}
          onClick={() => setShowSave(false)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <p className="font-black text-slate-900 text-[15px]">💾 Nommer ce calcul</p>
            <input value={nomProduit}
              onChange={e => setNomProduit(e.target.value)}
              placeholder="Ex: Pagne wax 6 yards"
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-[13px] outline-none focus:border-green-400 transition-all"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSave(false)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase active:scale-95">
                Annuler
              </button>
              <button onClick={handleSave} disabled={!nomProduit.trim()}
                className="flex-[2] py-3.5 rounded-2xl bg-green-600 text-white font-black text-[11px] uppercase active:scale-95 disabled:opacity-40 shadow-lg shadow-green-200">
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
