// src/components/PushNotifPrompt.tsx
// Demande permissions notifications + caméra sur Android (Capacitor)
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isPushSupported, getPushPermission, subscribeToPush, isPushSubscribed } from '@/services/pushService';

// Détection Capacitor Android
const isCapacitor = typeof (window as any).Capacitor !== 'undefined';

export function PushNotifPrompt() {
  const { currentUser, userProfile } = useAuth();
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [step, setStep]       = useState<'notif' | 'camera'>('notif');

  useEffect(() => {
    if (!currentUser || !userProfile) return;

    const timer = setTimeout(async () => {
      // Sur Capacitor — demander via l'API native Capacitor
      if (isCapacitor) {
        const { Capacitor } = window as any;
        // Vérifier si permissions déjà accordées
        try {
          const notifPlugin = (window as any).Capacitor?.Plugins?.PushNotifications;
          if (notifPlugin) {
            const permResult = await notifPlugin.checkPermissions();
            if (permResult?.receive !== 'granted') setShow(true);
          } else {
            setShow(true);
          }
        } catch { setShow(true); }
        return;
      }

      // Sur PWA web classique
      if (!isPushSupported()) return;
      if (getPushPermission() !== 'default') return;
      const alreadySubscribed = await isPushSubscribed(currentUser.uid);
      if (!alreadySubscribed) setShow(true);
    }, 5_000); // 5s après login sur mobile, 30s en web

    return () => clearTimeout(timer);
  }, [currentUser, userProfile]);

  if (!show || done) return null;

  const handleAcceptNotif = async () => {
    setLoading(true);
    try {
      if (isCapacitor) {
        // Capacitor native request
        const notifPlugin = (window as any).Capacitor?.Plugins?.PushNotifications;
        if (notifPlugin) await notifPlugin.requestPermissions();
      } else {
        await subscribeToPush(currentUser!.uid, userProfile?.neighborhood || '');
      }
    } catch (e) { console.warn('[Notif permission]', e); }
    setLoading(false);
    // Passer à la demande caméra si Capacitor
    if (isCapacitor) {
      setStep('camera');
    } else {
      setDone(true); setShow(false);
    }
  };

  const handleAcceptCamera = async () => {
    setLoading(true);
    try {
      const cameraPlugin = (window as any).Capacitor?.Plugins?.Camera;
      if (cameraPlugin) await cameraPlugin.requestPermissions();
    } catch (e) { console.warn('[Camera permission]', e); }
    setLoading(false);
    setDone(true); setShow(false);
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[150] max-w-sm mx-auto"
      style={{ animation: 'slideUp 0.4s ease-out' }}>
      <div className="bg-slate-900 rounded-[2.5rem] p-5 shadow-2xl border border-white/10">
        {step === 'notif' ? (
          <>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ background: 'rgba(22,163,74,0.2)' }}>
                <img src="/assets/Logos/logo-app-icon.png" alt="Brumerie"
                  className="w-8 h-8 object-contain"
                  onError={(e) => { e.currentTarget.style.display='none'; }}/>
              </div>
              <div className="flex-1">
                <p className="font-black text-white text-[13px] mb-1">Activer les notifications</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Reçois des alertes pour tes commandes, messages et nouveaux articles.
                </p>
              </div>
              <button onClick={() => { setDone(true); setShow(false); }}
                className="text-slate-500 text-xl leading-none flex-shrink-0 -mt-1">×</button>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAcceptNotif} disabled={loading}
                className="flex-1 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all disabled:opacity-60 text-white"
                style={{ background: 'linear-gradient(135deg, #16A34A, #115E2E)' }}>
                {loading ? '…' : '🔔 Activer'}
              </button>
              <button onClick={() => isCapacitor ? setStep('camera') : (setDone(true), setShow(false))}
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
              <button onClick={() => { setDone(true); setShow(false); }}
                className="text-slate-500 text-xl leading-none flex-shrink-0 -mt-1">×</button>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAcceptCamera} disabled={loading}
                className="flex-1 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all disabled:opacity-60 text-white"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
                {loading ? '…' : '📷 Autoriser'}
              </button>
              <button onClick={() => { setDone(true); setShow(false); }}
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
