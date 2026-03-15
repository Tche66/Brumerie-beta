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


// ── Bouton copier le code ────────────────────────────────────────
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback pour navigateurs sans clipboard API
      const el = document.createElement('input');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button onClick={handleCopy}
      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90"
      style={{ background: copied ? '#16A34A' : 'rgba(255,255,255,0.2)' }}
      title="Copier le code">
      {copied
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      }
    </button>
  );
}

export function QRDisplay({ title, subtitle, code, qrPayload, color, emoji, instruction, onClose }: Props) {
  // QR avec zone centrale réservée pour le logo (erreur de correction = 30% → H)
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

      {/* QR Code + logo Brumerie centré */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl mb-6 flex flex-col items-center">
        <div className="relative" style={{ width: 220, height: 220 }}>
          <img
            src={qrUrl}
            alt="QR Code"
            width={220}
            height={220}
            className="rounded-xl"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Logo Brumerie — overlay centré sur zone de repos du QR */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-xl flex items-center justify-center shadow-sm"
              style={{ width: 46, height: 46, background: '#1B5E20', padding: 4 }}>
              <img
                src="/logo.png"
                alt="Brumerie"
                style={{ width: 38, height: 38, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                onError={(e) => {
                  // Fallback SVG si logo.png absent
                  const el = e.target as HTMLImageElement;
                  el.style.display = 'none';
                  const parent = el.parentElement!;
                  parent.innerHTML = '<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 2L4 8v8c0 7 5 12 12 14 7-2 12-7 12-14V8L16 2z" fill="white"/><path d="M11 15l3 3 7-7" stroke="#1B5E20" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>';
                }}
              />
            </div>
          </div>
        </div>
        {/* Code alphanumérique + bouton copier */}
        <div className="mt-4 pt-4 border-t border-slate-100 w-full text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-2">Code de secours</p>
          <div className="flex items-center justify-center gap-2">
            <div className="bg-slate-900 rounded-xl px-5 py-2">
              <span className="text-xl font-black text-yellow-300 tracking-[0.35em] font-mono">{code}</span>
            </div>
            <CopyButton code={code} />
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
