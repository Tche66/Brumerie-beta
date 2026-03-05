// src/components/PWAInstallBanner.tsx
import React, { useState, useEffect } from 'react';

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed as PWA?
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Already dismissed permanently?
    const dismissed = localStorage.getItem('pwa_dismissed');
    if (dismissed) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Auto-show after 30s (also handles iOS which has no beforeinstallprompt)
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 30000);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        setShowBanner(false);
        return;
      }
    } else {
      // iOS fallback
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        setShowIOSGuide(true);
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_dismissed', '1');
  };

  if (installed) return null;

  return (
    <>
      {/* Bouton fixe discret — toujours visible (sauf si installé) */}
      <button
        onClick={handleInstall}
        className="fixed left-4 z-[150] flex items-center gap-2 bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-2 rounded-2xl shadow-xl border border-white/10 transition-all hover:bg-slate-800 active:scale-95"
        style={{ bottom: showBanner ? 140 : 90 }}
        title="Installer l'app Brumerie"
      >
        <img src="/favicon.png" alt="" className="w-4 h-4 object-contain" />
        <span className="hidden sm:inline">Installer</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>

      {/* Bannière auto (après 30s ou prompt Android) */}
      {showBanner && (
        <div
          className="fixed left-4 right-4 z-[160] flex items-center gap-3 bg-slate-900 text-white rounded-3xl px-4 py-3.5 shadow-2xl border border-white/10"
          style={{
            bottom: 80,
            maxWidth: 448,
            margin: '0 auto',
            animation: 'slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          <img src="/favicon.png" alt="Brumerie" className="w-10 h-10 object-contain rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold leading-tight">Installe Brumerie</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Accès rapide depuis ton écran d'accueil</p>
          </div>
          <button
            onClick={handleInstall}
            className="flex-shrink-0 bg-green-500 hover:bg-green-400 text-white text-[10px] font-bold px-3 py-2 rounded-xl transition-colors active:scale-95"
          >
            Installer
          </button>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
