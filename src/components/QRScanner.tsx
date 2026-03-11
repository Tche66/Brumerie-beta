// src/components/QRScanner.tsx — v17.1
// Scanner QR avec fallback saisie manuelle du code 6 chars

import React, { useEffect, useRef, useState } from 'react';
import { startQRScanner, parseQRPayload } from '@/utils/qrCode';

interface Props {
  expectedType: 'pickup' | 'delivery';
  expectedOrderId: string;
  expectedCode?: string;   // Si fourni, valide aussi la saisie manuelle
  onSuccess: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ expectedType, expectedOrderId, expectedCode, onSuccess, onClose }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const stopRef    = useRef<(() => void) | null>(null);
  const [mode, setMode]       = useState<'camera' | 'manual'>('camera');
  const [error, setError]     = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState('');
  const [cameraFailed, setCameraFailed] = useState(false);

  // ── Démarrer le scanner caméra ──────────────────────────────
  useEffect(() => {
    if (mode !== 'camera' || !videoRef.current) return;

    startQRScanner(
      videoRef.current,
      (data) => {
        const parsed = parseQRPayload(data);
        if (!parsed) { setError('QR non reconnu — utilise le code à 6 chiffres'); return; }
        if (parsed.type !== expectedType) {
          setError(expectedType === 'pickup' ? 'Ce QR est pour l\'acheteur' : 'Ce QR est pour le livreur');
          return;
        }
        if (parsed.orderId !== expectedOrderId) { setError('Ce QR ne correspond pas à cette commande'); return; }
        setScanning(false);
        stopRef.current?.();
        onSuccess(parsed.code);
      },
      (err) => {
        console.warn('Camera error:', err);
        setCameraFailed(true);
        setMode('manual');
      },
    ).then(stop => { stopRef.current = stop; });

    return () => { stopRef.current?.(); };
  }, [mode]);

  const handleManualValidate = () => {
    const code = manualCode.trim().toUpperCase();
    if (code.length !== 6) { setManualError('Le code fait 6 caractères'); return; }
    // Si on a le code attendu, vérifier localement
    if (expectedCode && code !== expectedCode.toUpperCase()) {
      setManualError('Code incorrect — réessaie');
      return;
    }
    stopRef.current?.();
    onSuccess(code);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-12 pb-4 flex-shrink-0">
        <button onClick={() => { stopRef.current?.(); onClose(); }}
          className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
        <div>
          <p className="font-black text-white text-[14px]">
            {expectedType === 'pickup' ? '📦 Scanner QR Vendeur' : '✅ Scanner QR Livreur'}
          </p>
          <p className="text-white/50 text-[11px]">
            {expectedType === 'pickup' ? 'Confirme la récupération du colis' : 'Confirme la livraison'}
          </p>
        </div>
      </div>

      {/* Toggle mode */}
      <div className="flex gap-2 px-5 mb-4 flex-shrink-0">
        <button onClick={() => { setMode('camera'); setError(null); }}
          className={'flex-1 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ' +
            (mode === 'camera' ? 'bg-white text-slate-900' : 'bg-white/10 text-white/60')}>
          📷 Caméra
        </button>
        <button onClick={() => { stopRef.current?.(); setMode('manual'); }}
          className={'flex-1 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ' +
            (mode === 'manual' ? 'bg-white text-slate-900' : 'bg-white/10 text-white/60')}>
          ⌨️ Saisir code
        </button>
      </div>

      {/* ── MODE CAMÉRA ── */}
      {mode === 'camera' && (
        <div className="flex-1 relative flex items-center justify-center">
          <video ref={videoRef} playsInline muted
            className="absolute inset-0 w-full h-full object-cover opacity-80"/>

          <div className="relative z-10 w-64 h-64">
            {[['top-0 left-0','border-t-4 border-l-4'],['top-0 right-0','border-t-4 border-r-4'],
              ['bottom-0 left-0','border-b-4 border-l-4'],['bottom-0 right-0','border-b-4 border-r-4'],
            ].map(([pos, border], i) => (
              <div key={i} className={`absolute ${pos} w-10 h-10 ${border} border-white rounded-sm`}/>
            ))}
            {scanning && !error && (
              <div className="absolute left-2 right-2 top-0 h-0.5 bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.8)]"
                style={{ animation: 'scanLine 2s linear infinite' }}/>
            )}
          </div>

          <div className="absolute bottom-10 left-0 right-0 text-center px-8">
            {error ? (
              <div className="bg-red-500/90 rounded-2xl p-4">
                <p className="text-white font-black text-[12px]">{error}</p>
                <button onClick={() => setError(null)} className="mt-2 text-white/80 text-[11px] underline">
                  Réessayer
                </button>
              </div>
            ) : (
              <p className="text-white/70 text-[12px] font-bold">Place le QR dans le cadre</p>
            )}
            <p className="text-white/40 text-[10px] mt-2">
              Pas de caméra ? → utilise "Saisir code"
            </p>
          </div>
        </div>
      )}

      {/* ── MODE SAISIE MANUELLE ── */}
      {mode === 'manual' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
          {cameraFailed && (
            <div className="bg-amber-500/20 rounded-2xl p-4 w-full text-center">
              <p className="text-amber-300 text-[11px] font-bold">
                📷 Caméra non disponible — saisis le code affiché par{' '}
                {expectedType === 'pickup' ? 'le vendeur' : 'le livreur'}
              </p>
            </div>
          )}
          <div className="text-center">
            <p className="text-white/60 text-[12px] mb-2">
              Entre le code à 6 caractères affiché par{' '}
              {expectedType === 'pickup' ? 'le vendeur' : 'le livreur'}
            </p>
          </div>
          <input
            value={manualCode}
            onChange={e => { setManualCode(e.target.value.toUpperCase().slice(0, 6)); setManualError(''); }}
            placeholder="EX: XK9B2R"
            maxLength={6}
            autoFocus
            className="w-full text-center text-[28px] font-black tracking-[0.5em] bg-white/10 text-white border-2 border-white/20 rounded-2xl py-5 outline-none focus:border-green-400 uppercase font-mono"
            style={{ letterSpacing: '0.4em' }}
          />
          {manualError && (
            <p className="text-red-400 font-black text-[12px]">{manualError}</p>
          )}
          <button
            onClick={handleManualValidate}
            disabled={manualCode.length !== 6}
            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white disabled:opacity-30 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)' }}>
            ✅ Valider le code
          </button>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0% { top: 8px; } 50% { top: calc(100% - 8px); } 100% { top: 8px; }
        }
      `}</style>
    </div>
  );
}
