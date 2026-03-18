// src/components/BrumerieLogo.tsx — v19 : logo caméléon
// Utilise currentColor → s'adapte automatiquement à l'environnement

import React from 'react';

interface BrumerieLogoProps {
  size?: number;           // taille en px (défaut 32)
  color?: string;          // couleur forcée (défaut: currentColor = hérite du parent)
  className?: string;
}

export function BrumerieLogo({ size = 32, color, className = '' }: BrumerieLogoProps) {
  const c = color || 'currentColor';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-label="Brumerie"
    >
      {/* Bouclier */}
      <path
        d="M16 2L3 7.5V17c0 7 5.5 12.5 13 14 7.5-1.5 13-7 13-14V7.5L16 2z"
        fill={c}
        opacity="0.15"
      />
      <path
        d="M16 2L3 7.5V17c0 7 5.5 12.5 13 14 7.5-1.5 13-7 13-14V7.5L16 2z"
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Panier — flèches vers le haut */}
      <path
        d="M10 18h12M13 15l3-4 3 4"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21h12"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

// Version pleine (fond + icône) — pour les endroits qui nécessitent un fond
export function BrumerieLogoFilled({ size = 32, bgColor = '#1B5E20', iconColor = '#FFFFFF', className = '' }: {
  size?: number; bgColor?: string; iconColor?: string; className?: string;
}) {
  const r = size * 0.28;
  return (
    <div
      className={className}
      style={{
        width: size, height: size,
        borderRadius: r,
        background: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <BrumerieLogo size={size * 0.62} color={iconColor} />
    </div>
  );
}
