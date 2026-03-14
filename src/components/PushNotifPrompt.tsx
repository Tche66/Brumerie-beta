// src/components/PushNotifPrompt.tsx
// Demande permissions notifications + caméra — UNE SEULE FOIS par installation
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isPushSupported, getPushPermission, subscribeToPush } from '@/services/pushService';

const isCapacitor = typeof (window as any).Capacitor !== 'undefined';

// Clés localStorage pour mémoriser le choix
const KEY_NOTIF  = 'brumerie_notif_prompted';
const KEY_CAMERA = 'brumerie_camera_prompted';

export function PushNotifPrompt() {
  const { currentUser, userProfile } = useAuth();
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState<'notif' | 'camera'>('notif');

  useEffect(() => {
    if (!currentUser || !userProfile) return;

    // ✅ Déjà répondu aux deux → ne plus jamais afficher
    const notifDone  = localStorage.getItem(KEY_NOTIF);
    const cameraDone = localStorage.getItem(KEY_CAMERA);
    if (notifDone && cameraDone) return;

    const timer = setTimeout(async () => {
      if (notifDone) {
        // Notif déjà traitée → passer direct caméra si pas encore faite
        if (!cameraDone && isCapacitor) { setStep('camera'); setShow(true); }
        return;
      }

      if (isCapacitor) {
        try {
          const notifPlugin = (window as any).Capacitor?.Plugins?.PushNotifications;
          if (notifPlugin) {
            const perm = await notifPlugin.checkPermissions();
            if (perm?.receive === 'granted') {
              // Déjà accordé nativement → marquer comme fait
              localStorage.setItem(KEY_NOTIF, '1');
              if (!cameraDone) { setStep('camera'); setShow(true); }
            } else {
              setShow(true);
            }
          } else { setShow(true); }
        } catch { setShow(true); }
        return;
      }

      // PWA web
      if (!isPushSupported()) return;
      if (getPushPermission() !== 'default') {
        localStorage.setItem(KEY_NOTIF, '1');
        return;
      }
      setShow(true);
    }, 4_000);

    return () => clearTimeout(timer);
  }, [currentUser?.uid]);

  if (!show) return null;

  const dismiss = () => {
    // Marquer les deux comme traités même si ignoré
    localStorage.setItem(KEY_NOTIF,  '1');
    localStorage.setItem(KEY_CAMERA, '1');
    setShow(false);
  };

  const handleAcceptNotif = async () => {
    setLoading(true);
    try {
      if (isCapacitor) {
        const notifPlugin = (window as any).Capacitor?.Plugins?.PushNotifications;
        if (notifPlugin) await notifPlugin.requestPermissions();
      } else {
        await subscribeToPush(currentUser!.uid, userProfile?.neighborhood || '');
      }
    } catch (e) { console.warn(e); }
    localStorage.setItem(KEY_NOTIF, '1');
    setLoading(false);
    if (isCapacitor) {
      const cameraDone = localStorage.getItem(KEY_CAMERA);
      if (!cameraDone) { setStep('camera'); return; }
    }
    dismiss();
  };

  const handleAcceptCamera = async () => {
    setLoading(true);
    try {
      const cam = (window as any).Capacitor?.Plugins?.Camera;
      if (cam) await cam.requestPermissions();
    } catch (e) { console.warn(e); }
    localStorage.setItem(KEY_CAMERA, '1');
    setLoading(false);
    dismiss();
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[150] max-w-sm mx-auto"
      style={{ animation: 'slideUp 0.4s ease-out' }}>
      <div className="bg-slate-900 rounded-[2.5rem] p-5 shadow-2xl border border-white/10">
        {step === 'notif' ? (
          <>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(22,163,74,0.2)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-black text-white text-[13px] mb-1">Activer les notifications</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Reçois des alertes pour tes commandes, messages et nouveaux articles.
                </p>
              </div>
              <button onClick={dismiss} className="text-slate-500 text-xl leading-none flex-shrink-0 -mt-1">×</button>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAcceptNotif} disabled={loading}
                className="flex-1 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all disabled:opacity-60 text-white"
                style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
                {loading ? '…' : '🔔 Activer'}
              </button>
              <button onClick={dismiss}
                className="flex-1 py-3.5 bg-white/10 text-slate-300 font-bold text-[11px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all">
                Plus tard
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                style={{ background: 'rgba(59,130,246,0.2)' }}>📷</div>
              <div className="flex-1">
                <p className="font-black text-white text-[13px] mb-1">Accès à la caméra</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Nécessaire pour prendre des photos de tes articles à vendre.
                </p>
              </div>
              <button onClick={dismiss} className="text-slate-500 text-xl leading-none flex-shrink-0 -mt-1">×</button>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAcceptCamera} disabled={loading}
                className="flex-1 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all disabled:opacity-60 text-white"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
                {loading ? '…' : '📷 Autoriser'}
              </button>
              <button onClick={dismiss}
                className="flex-1 py-3.5 bg-white/10 text-slate-300 font-bold text-[11px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all">
                Ignorer
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes slideUp { from { transform:translateY(30px);opacity:0 } to { transform:translateY(0);opacity:1 } }`}</style>
    </div>
  );
}
