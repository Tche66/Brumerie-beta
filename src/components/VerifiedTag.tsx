import React from 'react';

interface VerifiedTagProps {
  tier?: 'simple' | 'verified' | 'premium';
  isVerified?: boolean;
  isPremium?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function VerifiedTag({ tier, isVerified, isPremium, size = 'md' }: VerifiedTagProps) {
  const effectiveTier = tier || (isPremium ? 'premium' : isVerified ? 'verified' : 'simple');

  if (effectiveTier === 'simple') return null;

  const pad = { xs: 'px-1.5 py-0.5', sm: 'px-2 py-0.5', md: 'px-2.5 py-1', lg: 'px-3 py-1.5' };
  const txt = { xs: 'text-[7px]', sm: 'text-[8px]', md: 'text-[9px]', lg: 'text-[10px]' };
  const ico = { xs: 8, sm: 9, md: 10, lg: 12 };

  if (effectiveTier === 'verified') return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${pad[size]} ${txt[size]}`}
      style={{ background: '#EFF6FF', color: '#1D9BF0', border: '1px solid #BFDBFE' }}>
      <svg width={ico[size]} height={ico[size]} viewBox="0 0 24 24" fill="none" stroke="#1D9BF0" strokeWidth="3" strokeLinecap="round">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      Verifie
    </span>
  );

  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${pad[size]} ${txt[size]}`}
      style={{ background: '#1a1a1a', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
      <svg width={ico[size]} height={ico[size]} viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      Premium
    </span>
  );
}
