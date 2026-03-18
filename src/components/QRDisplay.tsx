// src/components/QRDisplay.tsx — v17
// Affichage plein écran d'un QR code à faire scanner

import React from 'react';
import { drawQROnCanvas } from '@/utils/qrCode';

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

// ── Génération QR via lib qrcode (bundlée par Vite) ─────────────
function useQRCanvas(data: string, size: number) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!canvasRef.current || !data) return;
    let cancelled = false;
    drawQROnCanvas(canvasRef.current, data, { dark: '#0F172A', light: '#FFFFFF', margin: 2 })
      .then(() => { if (!cancelled) setReady(true); })
      .catch(e => console.warn('QR error:', e));
    return () => { cancelled = true; };
  }, [data, size]);

  return { canvasRef, ready };
}

export function QRDisplay({ title, subtitle, code, qrPayload, color, emoji, instruction, onClose }: Props) {
  const { canvasRef, ready } = useQRCanvas(qrPayload, 210);

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

      <div className="text-center mb-6">
        <span className="text-5xl">{emoji}</span>
        <h2 className="font-black text-white text-[20px] mt-3 uppercase tracking-tight">{title}</h2>
        <p className="text-white/70 text-[12px] mt-1">{subtitle}</p>
      </div>

      {/* Card blanche : logo + nom AU-DESSUS, QR propre en dessous */}
      <div className="bg-white rounded-[2.5rem] px-6 pt-5 pb-6 shadow-2xl mb-6 flex flex-col items-center">

        {/* En-tête branding — logo transparent + BRUMERIE */}
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 w-full justify-center">
          <img src="/logo.png" alt="Brumerie" style={{ width:26, height:26, objectFit:'contain' }} />
          <span className="font-black text-slate-900 text-[15px] uppercase tracking-[0.15em]">Brumerie</span>
        </div>

        {/* QR Code — généré localement, zéro réseau requis */}
        <div style={{ width: 210, height: 210, position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
          {!ready && (
            <div style={{ position: 'absolute', inset: 0, background: '#f8fafc', borderRadius: 12 }}
              className="flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={210}
            height={210}
            style={{ display: ready ? 'block' : 'none', borderRadius: 12 }}
          />
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
