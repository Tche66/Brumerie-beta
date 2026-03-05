// src/components/NetworkBanner.tsx
// Détection réseau hors ligne — optimisé pour réseau mobile Afrique (Orange, MTN, Moov)
import React, { useState, useEffect, useRef } from 'react';

export function NetworkBanner() {
  const [status, setStatus] = useState<'online' | 'offline' | 'slow'>('online');
  const [visible, setVisible] = useState(false);
  const [justRestored, setJustRestored] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const goOffline = () => {
      setStatus('offline');
      setVisible(true);
      setJustRestored(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };

    const goOnline = () => {
      setStatus('online');
      setJustRestored(true);
      setVisible(true);
      // Masquer le bandeau "Connexion restaurée" après 3s
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        setJustRestored(false);
      }, 3000);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);

    // Vérification initiale
    if (!navigator.onLine) goOffline();

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[500] flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest"
      style={{
        background: justRestored
          ? 'linear-gradient(90deg,#16A34A,#15803D)'
          : 'linear-gradient(90deg,#1E293B,#0F172A)',
        animation: 'slideDown .25s cubic-bezier(.2,.8,.2,1)',
        boxShadow: '0 2px 16px rgba(0,0,0,.25)',
      }}
    >
      {justRestored ? (
        <>
          <span className="text-base">✅</span>
          <span className="text-white">Connexion restaurée</span>
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"/>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"/>
          </span>
          <span className="text-amber-300">Pas de connexion</span>
          <span className="text-slate-500 normal-case tracking-normal font-bold text-[10px]">
            — Les articles déjà chargés restent visibles
          </span>
        </>
      )}
      <style>{`@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}
