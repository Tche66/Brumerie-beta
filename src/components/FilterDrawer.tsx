// src/components/FilterDrawer.tsx — Filtres avancés (prix, catégorie, quartier, condition, tri)
import React, { useState } from 'react';
import { CATEGORIES, NEIGHBORHOODS } from '@/types';

export interface FilterState {
  priceMin: string;
  priceMax: string;
  category: string;
  neighborhood: string;
  condition: string;
  sortBy: 'recent' | 'price_asc' | 'price_desc' | 'promo';
}

export const DEFAULT_FILTERS: FilterState = {
  priceMin: '', priceMax: '',
  category: 'all', neighborhood: 'all',
  condition: 'all',
  sortBy: 'recent',
};

interface FilterDrawerProps {
  visible: boolean;
  filters: FilterState;
  onApply: (f: FilterState) => void;
  onClose: () => void;
}

const SORT_OPTIONS = [
  { value: 'recent',     label: '🕐 Plus récents' },
  { value: 'price_asc',  label: '💰 Prix croissant' },
  { value: 'price_desc', label: '💎 Prix décroissant' },
  { value: 'promo',      label: '🔥 Promotions' },
] as const;

const CONDITIONS = [
  { value: 'all',         label: 'Tous' },
  { value: 'new',         label: '🟢 Neuf' },
  { value: 'like_new',    label: '🔵 Comme neuf' },
  { value: 'second_hand', label: '🟡 Occasion' },
];

export function FilterDrawer({ visible, filters, onApply, onClose }: FilterDrawerProps) {
  const [local, setLocal] = useState<FilterState>(filters);

  const set = (key: keyof FilterState, val: string) =>
    setLocal((prev: FilterState) => ({ ...prev, [key]: val }));

  const reset = () => setLocal(DEFAULT_FILTERS);

  const activeCount = [
    local.priceMin, local.priceMax,
    local.category !== 'all' ? '1' : '',
    local.neighborhood !== 'all' ? '1' : '',
    local.condition !== 'all' ? '1' : '',
    local.sortBy !== 'recent' ? '1' : '',
  ].filter(Boolean).length;

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"/>
      <div className="relative w-full max-w-md bg-white rounded-t-[3rem] shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s ease-out' }}>

        {/* Handle */}
        <div className="sticky top-0 bg-white rounded-t-[3rem] pt-4 pb-4 px-6 border-b border-slate-50 z-10">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"/>
          <div className="flex items-center justify-between">
            <h2 className="font-black text-[16px] text-slate-900 uppercase tracking-tight">Filtres</h2>
            <button onClick={reset}
              className="text-[11px] font-bold text-red-400 uppercase tracking-widest active:scale-95">
              Tout réinitialiser
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-7">

          {/* Tri */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Trier par</label>
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => set('sortBy', opt.value)}
                  className={`py-3.5 px-4 rounded-2xl text-[12px] font-bold transition-all text-left ${
                    local.sortBy === opt.value
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prix min/max */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
              Fourchette de prix (FCFA)
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input type="number" placeholder="Min" value={local.priceMin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('priceMin', e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-green-500 focus:bg-white outline-none transition-all"/>
              </div>
              <div className="w-4 h-0.5 bg-slate-300 flex-shrink-0"/>
              <div className="flex-1">
                <input type="number" placeholder="Max" value={local.priceMax}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('priceMax', e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-green-500 focus:bg-white outline-none transition-all"/>
              </div>
            </div>
            {/* Raccourcis prix */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {[['0','5000'],['5000','25000'],['25000','100000'],['100000','']].map(([min,max]) => (
                <button key={min+max}
                  onClick={() => setLocal((p: FilterState) => ({ ...p, priceMin: min, priceMax: max }))}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                    local.priceMin === min && local.priceMax === max
                      ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {min === '0' ? '< 5K' : max === '' ? `+${Number(min)/1000}K` : `${Number(min)/1000}K–${Number(max)/1000}K`}
                </button>
              ))}
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Catégorie</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => set('category', 'all')}
                className={`py-3 px-4 rounded-2xl text-[11px] font-bold transition-all text-left ${
                  local.category === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'
                }`}>
                🏪 Toutes
              </button>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => set('category', cat.id)}
                  className={`py-3 px-4 rounded-2xl text-[11px] font-bold transition-all text-left ${
                    local.category === cat.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}>
                  {cat.icon} {cat.label.length > 14 ? cat.label.slice(0,14)+'…' : cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">État</label>
            <div className="flex gap-2 flex-wrap">
              {CONDITIONS.map(c => (
                <button key={c.value} onClick={() => set('condition', c.value)}
                  className={`px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all ${
                    local.condition === c.value ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quartier */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Quartier</label>
            <select value={local.neighborhood} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('neighborhood', e.target.value)}
              className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-green-500 outline-none appearance-none">
              <option value="all">📍 Tous les quartiers</option>
              {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Bouton appliquer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-50 px-6 py-5">
          <button onClick={() => { onApply(local); onClose(); }}
            className="w-full py-5 rounded-[2rem] font-black text-[13px] uppercase tracking-widest text-white shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)', boxShadow: '0 16px 32px rgba(22,163,74,0.25)' }}>
            Appliquer les filtres
            {activeCount > 0 && (
              <span className="bg-white text-green-700 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }`}</style>
    </div>
  );
}
