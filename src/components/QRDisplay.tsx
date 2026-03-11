// src/components/QRDisplay.tsx — v17
// Affichage plein écran d'un QR code à faire scanner

import React from 'react';
import { getQRCodeUrl } from '@/utils/qrCode';

interface Props {
  title: string;
  subtitle: string;
  code: string;       // Code alphanumérique de secours (6 chars)
  qrPayload: string;  // Payload complet pour le QR
  color: string;      // Couleur d'accent (hex)
  emoji: string;
  instruction: string;
  onClose: () => void;
}

export function QRDisplay({ title, subtitle, code, qrPayload, color, emoji, instruction, onClose }: Props) {
  const qrUrl = getQRCodeUrl(qrPayload, 260);

  return (
    <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center px-6"
      style={{ background: color }}>
      {/* Bouton fermer */}
      <button onClick={onClose}
        className="absolute top-14 right-5 w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="text-center mb-8">
        <span className="text-5xl">{emoji}</span>
        <h2 className="font-black text-white text-[20px] mt-3 uppercase tracking-tight">{title}</h2>
        <p className="text-white/70 text-[12px] mt-1">{subtitle}</p>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl mb-6 flex flex-col items-center">
        <img
          src={qrUrl}
          alt="QR Code"
          width={220}
          height={220}
          className="rounded-xl"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {/* Code alphanumérique de secours */}
        <div className="mt-4 pt-4 border-t border-slate-100 w-full text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Code de secours</p>
          <div className="bg-slate-900 rounded-xl px-5 py-2 inline-block">
            <span className="text-xl font-black text-yellow-300 tracking-[0.35em] font-mono">{code}</span>
          </div>
        </div>
      </div>

      {/* Instruction */}
      <div className="bg-white/15 rounded-2xl px-6 py-4 max-w-xs text-center">
        <p className="text-white text-[12px] font-bold leading-relaxed">{instruction}</p>
      </div>
    </div>
  );
}
