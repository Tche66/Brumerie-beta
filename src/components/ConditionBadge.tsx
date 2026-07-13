// src/components/ConditionBadge.tsx — Badge état du produit réutilisable
import React from 'react';

export type Condition = 'new' | 'like_new' | 'second_hand';

export const CONDITIONS: { id: Condition; label: string; short: string; color: string; bg: string; dot: string }[] = [
  { id: 'new',         label: 'Neuf',         short: 'Neuf',        color: '#FFFFFF', bg: '#16A34A', dot: '#86EFAC' },
  { id: 'like_new',    label: 'Comme neuf',   short: 'Comme neuf',  color: '#FFFFFF', bg: '#0F172A', dot: '#94A3B8' },
  { id: 'second_hand', label: 'Seconde main', short: 'Occasion',    color: '#FFFFFF', bg: '#D97706', dot: '#FDE68A' },
];

export function ConditionBadge({ condition, size = 'sm' }: { condition: Condition; size?: 'sm' | 'md' }) {
  const c = CONDITIONS.find(x => x.id === condition);
  if (!c) return null;
  const isSmall = size === 'sm';
  return (
    <span
      style={{ background: c.bg, color: c.color }}
      className={`inline-flex items-center gap-1.5 font-black rounded-lg uppercase tracking-wider flex-shrink-0 shadow-md ${isSmall ? 'text-[9px] px-2.5 py-1' : 'text-[10px] px-3 py-1.5'}`}>
      <span style={{ width: isSmall ? 5 : 6, height: isSmall ? 5 : 6, borderRadius: '50%', background: c.dot, flexShrink: 0, display: 'inline-block' }} />
      {isSmall ? c.short : c.label}
    </span>
  );
}

// Sélecteur état du produit pour les formulaires
export function ConditionSelector({
  value, onChange
}: { value: Condition | ''; onChange: (v: Condition) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CONDITIONS.map(c => {
        const selected = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            style={selected ? { background: c.bg, borderColor: c.dot, color: c.color } : {}}
            className={`flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl border-2 transition-all active:scale-95 ${
              selected ? 'shadow-sm' : 'border-slate-100 bg-white text-slate-500'
            }`}>
            <span
              style={{ width: 10, height: 10, borderRadius: '50%', background: selected ? c.dot : '#CBD5E1', flexShrink: 0 }} />
            <span className="text-[10px] font-black uppercase tracking-wider leading-tight text-center">
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
