// src/components/PaymentLogo.tsx — Logos réels des Mobile Money
import React from 'react';

interface PaymentLogoProps {
  logo: string;
  name: string;
  color: string;
  size?: number; // px, défaut 40
  className?: string;
}

export function PaymentLogo({ logo, name, color, size = 40, className = '' }: PaymentLogoProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: color + '15', border: `1.5px solid ${color}30` }}
    >
      <img
        src={logo}
        alt={name}
        style={{ width: size * 0.8, height: size * 0.8, objectFit: 'contain' }}
        onError={(e) => {
          // Fallback si l'image ne charge pas
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}
