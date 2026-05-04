// src/components/SearchAlertButton.tsx
// Bouton "🔔 M'alerter" dans la barre de recherche
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToKeyword, unsubscribeFromKeyword, isSubscribedToKeyword } from '@/services/searchAlertService';
import { isPushSupported, subscribeToPush, getPushPermission } from '@/services/pushService';

interface Props {
  keyword: string;
}

export function SearchAlertButton({ keyword }: Props) {
  const { currentUser, userProfile } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);

  useEffect(() => {
    if (!currentUser || !keyword.trim()) return;
    isSubscribedToKeyword(currentUser.uid, keyword)
      .then(setSubscribed)
      .catch(() => {});
  }, [currentUser, keyword]);

  if (!currentUser) return null;

  const alertId = `${currentUser.uid}_${keyword.toLowerCase().replace(/\s+/g, '_')}`;

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribeFromKeyword(alertId);
        setSubscribed(false);
      } else {
        // Demander la permission push si nécessaire
        if (isPushSupported() && getPushPermission() === 'default') {
          await subscribeToPush(currentUser.uid, userProfile?.neighborhood || '');
        }
        await subscribeToKeyword(currentUser.uid, keyword, userProfile?.neighborhood);
        setSubscribed(true);
        setDone(true);
        setTimeout(() => setDone(false), 2500);
      }
    } catch (e) {
      console.error('[SearchAlert]', e);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
        subscribed
          ? 'bg-green-600 text-white shadow-md shadow-green-200'
          : 'bg-slate-100 text-slate-600 border border-slate-200'
      }`}
      title={subscribed ? 'Désactiver l\'alerte' : 'M\'alerter pour ce mot-clé'}
    >
      {done ? (
        <>✅ Alerte activée</>
      ) : subscribed ? (
        <>🔔 Alerté</>
      ) : (
        <>🔔 M'alerter</>
      )}
    </button>
  );
}
