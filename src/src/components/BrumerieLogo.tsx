// src/components/BrumerieLogo.tsx — v19.2 : logo caméléon fidèle
// SVG basé sur le vrai logo Brumerie : bouclier + panier + flèches

import React from 'react';

interface BrumerieLogoProps {
  size?: number;
  color?: string;      // force une couleur — sinon currentColor
  className?: string;
}

export function BrumerieLogo({ size = 32, color, className = '' }: BrumerieLogoProps) {
  const c = color || 'currentColor';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-label="Brumerie"
    >
      {/* Bouclier — forme principale */}
      <path
        d="M50 5 L10 20 L10 52 C10 74 28 90 50 96 C72 90 90 74 90 52 L90 20 Z"
        fill={c}
        fillOpacity="0.12"
        stroke={c}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Panier — base */}
      <path
        d="M30 65 L70 65"
        stroke={c}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Panier — corps */}
      <path
        d="M35 55 L65 55"
        stroke={c}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Flèche montante gauche */}
      <path
        d="M40 55 L40 38 M34 44 L40 38 L46 44"
        stroke={c}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Flèche montante droite */}
      <path
        d="M60 55 L60 38 M54 44 L60 38 L66 44"
        stroke={c}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Version avec fond coloré (pour boutons, headers)
export function BrumerieLogoFilled({
  size = 32,
  bgColor = '#1B5E20',
  iconColor = '#FFFFFF',
  borderRadius,
  className = '',
}: {
  size?: number;
  bgColor?: string;
  iconColor?: string;
  borderRadius?: number;
  className?: string;
}) {
  const r = borderRadius ?? size * 0.25;
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <BrumerieLogo size={size * 0.65} color={iconColor} />
    </div>
  );
}
