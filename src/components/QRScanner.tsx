// src/components/QRScanner.tsx — v17
// Modal caméra pour scanner un QR code Brumerie

import React, { useEffect, useRef, useState } from 'react';
import { startQRScanner, parseQRPayload } from '@/utils/qrCode';

interface Props {
  expectedType: 'pickup' | 'delivery';
  expectedOrderId: string;
  onSuccess: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ expectedType, expectedOrderId, onSuccess, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError]     = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    startQRScanner(
      videoRef.current,
      (data) => {
        const parsed = parseQRPayload(data);
        if (!parsed) {
          setError('QR code non reconnu. Utilise le QR Brumerie correct.');
          return;
        }
        if (parsed.type !== expectedType) {
          setError(
            expectedType === 'pickup'
              ? 'Ce QR est pour l\'acheteur, pas pour toi.'
              : 'Ce QR est pour le livreur, pas pour l\'acheteur.'
          );
          return;
        }
        if (parsed.orderId !== expectedOrderId) {
          setError('Ce QR ne correspond pas à cette commande.');
          return;
        }
        setScanning(false);
        stopRef.current?.();
        onSuccess(parsed.code);
      },
      (err) => setError(err),
    ).then(stop => { stopRef.current = stop; });

    return () => { stopRef.current?.(); };
  }, []);

  return (
    <div className="fixed inset-0 z-[500] bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-14 pb-4 flex-shrink-0">
        <button onClick={() => { stopRef.current?.(); onClose(); }}
          className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
        <div>
          <p className="font-black text-white text-[14px]">
            {expectedType === 'pickup' ? '📦 Scanner QR Vendeur' : '✅ Scanner QR Livreur'}
          </p>
          <p className="text-white/50 text-[11px]">
            {expectedType === 'pickup'
              ? 'Scanne le QR affiché par le vendeur'
              : 'Scanne le QR affiché par le livreur'}
          </p>
        </div>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative flex items-center justify-center">
        <video ref={videoRef} playsInline muted
          className="absolute inset-0 w-full h-full object-cover opacity-80"/>

        {/* Cadre de scan */}
        <div className="relative z-10 w-64 h-64">
          {/* Coins du cadre */}
          {[['top-0 left-0', 'border-t-4 border-l-4'],
            ['top-0 right-0', 'border-t-4 border-r-4'],
            ['bottom-0 left-0', 'border-b-4 border-l-4'],
            ['bottom-0 right-0', 'border-b-4 border-r-4'],
          ].map(([pos, border], i) => (
            <div key={i} className={`absolute ${pos} w-10 h-10 ${border} border-white rounded-sm`}/>
          ))}
          {/* Ligne de scan animée */}
          {scanning && !error && (
            <div className="absolute left-2 right-2 top-0 h-0.5 bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.8)]"
              style={{ animation: 'scanLine 2s linear infinite' }}/>
          )}
        </div>

        {/* Texte guide */}
        <div className="absolute bottom-12 left-0 right-0 text-center px-8">
          {error ? (
            <div className="bg-red-500/90 rounded-2xl p-4 mb-4">
              <p className="text-white font-black text-[12px]">{error}</p>
              <button onClick={() => setError(null)}
                className="mt-2 text-white/80 text-[11px] underline">
                Réessayer
              </button>
            </div>
          ) : (
            <p className="text-white/70 text-[12px] font-bold">
              {scanning ? 'Place le QR dans le cadre' : '✅ QR détecté !'}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 8px; }
          50% { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
      `}</style>
    </div>
  );
}
