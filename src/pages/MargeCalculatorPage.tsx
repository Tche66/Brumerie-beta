// src/pages/MargeCalculatorPage.tsx — Calculateur de marge réelle par produit
// "Est-ce que je gagne vraiment de l'argent sur ce produit ?"
import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

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
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <div className="relative">
        <input
          type="number" inputMode="numeric"
          value={value === 0 ? '' : value}
          onChange={e => onChange(parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
          placeholder="0"
          className="w-full px-4 py-3.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-sm font-semibold outline-none focus:border-emerald-500 transition-all pr-20"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">{suffix}</span>
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24 font-sans">

      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 sticky top-0 z-50 px-4 py-4 flex items-center gap-3 border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <button onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700 active:scale-95 transition-all flex-shrink-0">
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="font-semibold text-sm text-slate-900 dark:text-gray-100">Calcul de Marge</h1>
          <p className="text-xs text-gray-400">Est-ce que je gagne vraiment ?</p>
        </div>
        <button onClick={reset}
          className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-3 py-2 rounded-lg active:scale-[0.98]">
          Reinitialiser
        </button>
      </div>

      {/* ONGLETS */}
      <div className="px-4 pt-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 mb-4">
          {[
            { id: 'calcul',      label: 'Calculer' },
            { id: 'historique',  label: `Historique (${saved.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-gray-100 shadow-sm' : 'text-gray-400'
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
          <div className={`rounded-xl p-5 border-2 ${isProfit ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}`}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 text-center">Resultat par unite vendue</p>
            <div className="flex items-center justify-between mb-3">
              <div className="text-center flex-1">
                <p className={`font-bold text-2xl ${isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isProfit ? '+' : ''}{fmt(Math.round(margeUnitaire))}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Marge / unite</p>
              </div>
              <div className="w-px h-12 bg-gray-200 dark:bg-slate-600"/>
              <div className="text-center flex-1">
                <p className={`font-bold text-xl ${tauxMarge >= 20 ? 'text-green-700 dark:text-green-400' : tauxMarge >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {tauxMarge.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Taux de marge</p>
              </div>
              <div className="w-px h-12 bg-gray-200 dark:bg-slate-600"/>
              <div className="text-center flex-1">
                <p className={`font-bold text-xl ${isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isProfit ? '+' : ''}{fmt(Math.round(margeTotale))}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Marge totale</p>
              </div>
            </div>

            {/* Verdict */}
            <div className={`rounded-lg px-4 py-3 text-center ${isProfit ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
              {c.prixVente === 0 ? (
                <p className="text-xs font-medium text-gray-500">Saisis ton prix de vente pour voir le resultat</p>
              ) : !isProfit ? (
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Tu perds {fmt(Math.abs(Math.round(margeUnitaire)))} FCFA par vente ! Augmente ton prix ou reduis tes couts.
                </p>
              ) : tauxMarge < 15 ? (
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Marge faible ({tauxMarge.toFixed(0)}%). Vise 20%+ pour etre vraiment rentable.
                </p>
              ) : (
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Bonne marge ! Tu gagnes {tauxMarge.toFixed(0)}% sur ce produit.
                </p>
              )}
            </div>

            {/* Seuil rentabilité */}
            {seuilRentabilite > 0 && c.qteVendue > 0 && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                Seuil de rentabilite : <strong>{seuilRentabilite} unite{seuilRentabilite > 1 ? 's' : ''}</strong> minimum a vendre pour couvrir tes couts
              </p>
            )}
          </div>

          {/* PRIX DE VENTE */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 space-y-4">
            <p className="text-xs font-medium text-green-700 dark:text-green-400">Cote vente</p>
            <Field label="Prix de vente" hint="Ce que paye le client" value={c.prixVente} onChange={set('prixVente')}/>
            <Field label="Quantite vendue" hint="Nb d'unites" value={c.qteVendue} onChange={set('qteVendue')} suffix="unites"/>
            <Field label="Commission Brumerie" hint="En %" value={c.commission} onChange={set('commission')} suffix="%" />
            <Field label="Frais de livraison" hint="Cout livreur a ta charge" value={c.fraisLivraison} onChange={set('fraisLivraison')}/>
          </div>

          {/* COÛTS */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 space-y-4">
            <p className="text-xs font-medium text-red-600 dark:text-red-400">Cote couts</p>
            <Field label="Prix d'achat" hint="Par unite" value={c.prixAchat} onChange={set('prixAchat')}/>
            <Field label="Transport / Approvisionnement" hint="Par unite" value={c.transport} onChange={set('transport')}/>
            <Field label="Autres frais" hint="Emballage, telephone, etc." value={c.autresFrais} onChange={set('autresFrais')}/>
          </div>

          {/* DÉTAIL */}
          {c.prixVente > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-400 mb-3">Detail du calcul</p>
              <div className="space-y-2">
                {[
                  { label: 'Prix de vente', value: c.prixVente, color: 'text-green-700 dark:text-green-400', sign: '' },
                  { label: `Commission Brumerie (${c.commission}%)`, value: -commissionMontant, color: 'text-red-500 dark:text-red-400', sign: '-' },
                  { label: 'Frais livraison', value: -c.fraisLivraison, color: 'text-red-500 dark:text-red-400', sign: '-' },
                  { label: 'Cout achat/unite', value: -c.prixAchat, color: 'text-red-500 dark:text-red-400', sign: '-' },
                  { label: 'Transport/unite', value: -c.transport, color: 'text-red-500 dark:text-red-400', sign: '-' },
                  { label: 'Autres frais/unite', value: -c.autresFrais, color: 'text-red-500 dark:text-red-400', sign: '-' },
                ].filter(r => r.value !== 0).map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-slate-700 last:border-0">
                    <span className="text-xs text-gray-600 dark:text-gray-300">{row.label}</span>
                    <span className={`text-sm font-semibold ${row.color}`}>
                      {row.value > 0 ? '+' : ''}{fmt(Math.round(row.value))} FCFA
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t-2 border-gray-200 dark:border-slate-600">
                  <span className="font-semibold text-sm text-slate-800 dark:text-gray-200">= Marge nette/unite</span>
                  <span className={`font-bold text-base ${isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isProfit ? '+' : ''}{fmt(Math.round(margeUnitaire))} FCFA
                  </span>
                </div>
                {c.qteVendue > 1 && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-slate-800 dark:text-gray-200">x {c.qteVendue} unites = Total</span>
                    <span className={`font-bold text-base ${isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
              className="w-full py-4 rounded-xl font-medium text-sm text-white bg-emerald-600 active:scale-[0.98] transition-all">
              Sauvegarder ce calcul
            </button>
          )}
        </div>
      )}

      {/* ── HISTORIQUE ── */}
      {tab === 'historique' && (
        <div className="px-4 space-y-3">
          {saved.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-semibold text-gray-400 text-sm">Aucun calcul sauvegarde</p>
              <p className="text-xs text-gray-300 dark:text-gray-500 mt-1">Fais un calcul et sauvegarde-le</p>
            </div>
          ) : saved.map((s, i) => {
            const mu = (s.prixVente - s.prixVente * s.commission / 100 - s.fraisLivraison) - (s.prixAchat + s.transport + s.autresFrais);
            const tm = s.prixVente > 0 ? (mu / s.prixVente) * 100 : 0;
            return (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-gray-100 text-sm">{s.nom}</p>
                    <p className="text-xs text-gray-400">{s.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-base ${mu >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {mu >= 0 ? '+' : ''}{fmt(Math.round(mu))} FCFA
                    </p>
                    <p className={`text-xs font-medium ${tm >= 20 ? 'text-green-600' : tm >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                      {tm.toFixed(1)}% marge
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg py-2">
                    <p className="text-xs text-gray-400">Achat</p>
                    <p className="font-semibold text-xs text-slate-700 dark:text-gray-200">{fmt(s.prixAchat)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg py-2">
                    <p className="text-xs text-gray-400">Vente</p>
                    <p className="font-semibold text-xs text-green-700 dark:text-green-400">{fmt(s.prixVente)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg py-2">
                    <p className="text-xs text-gray-400">Qte</p>
                    <p className="font-semibold text-xs text-slate-700 dark:text-gray-200">{s.qteVendue}</p>
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
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-sm p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-slate-900 dark:text-gray-100 text-base">Nommer ce calcul</p>
            <input value={nomProduit}
              onChange={e => setNomProduit(e.target.value)}
              placeholder="Ex: Pagne wax 6 yards"
              className="w-full px-4 py-3.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm outline-none focus:border-emerald-500 transition-all"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSave(false)}
                className="flex-1 py-3.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-medium text-sm active:scale-[0.98]">
                Annuler
              </button>
              <button onClick={handleSave} disabled={!nomProduit.trim()}
                className="flex-[2] py-3.5 rounded-lg bg-emerald-600 text-white font-medium text-sm active:scale-[0.98] disabled:opacity-40 shadow-sm">
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
