// src/components/PaymentLogo.tsx — Logos Mobile Money avec fallback
import React, { useState } from 'react';

interface PaymentLogoProps {
  logo: string;
  name: string;
  color: string;
  size?: number;
  className?: string;
}

const EMOJI_MAP: Record<string, string> = {
  'Wave': '🌊',
  'Orange Money': '🟠',
  'MTN Mobile Money': '🟡',
  'Moov Money': '🔵',
};

export function PaymentLogo({ logo, name, color, size = 40, className = '' }: PaymentLogoProps) {
  const [imgError, setImgError] = useState(false);
  const emoji = EMOJI_MAP[name] || '💳';

  return (
    <div
      className={`flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: color + '15', border: `1.5px solid ${color}30` }}
    >
      {imgError ? (
        <span style={{ fontSize: size * 0.5 }}>{emoji}</span>
      ) : (
        <img
          src={logo}
          alt={name}
          style={{ width: size * 0.8, height: size * 0.8, objectFit: 'contain' }}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}
