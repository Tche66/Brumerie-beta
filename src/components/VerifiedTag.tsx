// src/components/VerifiedTag.tsx — Sprint 7 : 3 niveaux Simple / Vérifié / Premium
import React from 'react';

interface VerifiedTagProps {
  tier?: 'simple' | 'verified' | 'premium';
  isVerified?: boolean;   // compat backward
  isPremium?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function VerifiedTag({ tier, isVerified, isPremium, size = 'md' }: VerifiedTagProps) {
  // Résoudre le tier effectif
  const effectiveTier = tier || (isPremium ? 'premium' : isVerified ? 'verified' : 'simple');

  const pad = { xs: 'px-1.5 py-0.5', sm: 'px-2 py-1', md: 'px-2.5 py-1', lg: 'px-3.5 py-1.5' };
  const txt = { xs: 'text-[6px]', sm: 'text-[7px]', md: 'text-[8px]', lg: 'text-[10px]' };
  const ico = { xs: 8, sm: 9, md: 10, lg: 12 };

  // ── Simple : aucun badge affiché ──
  if (effectiveTier === 'simple') return null;

  // ── Vérifié : bleu #1D9BF0 ──
  if (effectiveTier === 'verified') return (
    <span
      className={`inline-flex items-center gap-1.5 font-black uppercase tracking-wider text-white rounded-full ${pad[size]} ${txt[size]}`}
      style={{
        background: '#1D9BF0',
        boxShadow: '0 4px 12px rgba(29, 155, 240, 0.35)',
      }}>
      <svg width={ico[size]} height={ico[size]} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      Vérifié
    </span>
  );

  // ── Premium : noir/or ──
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-black uppercase tracking-wider rounded-full ${pad[size]} ${txt[size]}`}
      style={{
        background: 'linear-gradient(135deg, #1a1a1a, #0F0F0F)',
        color: '#F59E0B',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
        border: '1px solid rgba(245,158,11,0.3)',
      }}>
      <svg width={ico[size]} height={ico[size]} viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      Premium
    </span>
  );
}
