// src/components/CountdownBadge.tsx — Compte à rebours temps réel
import React, { useState, useEffect } from 'react';

interface Props {
  expiresAt: any; // Firestore Timestamp ou Date
  onExpire?: () => void;
  size?: 'sm' | 'md';
}

function msToHuman(ms: number): string {
  if (ms <= 0) return 'Expiré';
  const totalMinutes = Math.floor(ms / 60000);
  const days    = Math.floor(totalMinutes / 1440);
  const hours   = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0)  return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function urgencyColor(ms: number): { bg: string; text: string; dot: string } {
  if (ms <= 0)              return { bg: 'bg-slate-100', text: 'text-slate-400', dot: '#94A3B8' };
  if (ms < 2 * 3600000)    return { bg: 'bg-red-100',   text: 'text-red-700',   dot: '#DC2626' }; // < 2h
  if (ms < 24 * 3600000)   return { bg: 'bg-amber-100', text: 'text-amber-700', dot: '#D97706' }; // < 24h
  return                          { bg: 'bg-green-100',  text: 'text-green-700', dot: '#16A34A' }; // ok
}

export function CountdownBadge({ expiresAt, onExpire, size = 'sm' }: Props) {
  const [ms, setMs] = useState(() => {
    const d = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return d.getTime() - Date.now();
  });

  useEffect(() => {
    const tick = setInterval(() => {
      const d = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
      const remaining = d.getTime() - Date.now();
      setMs(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        onExpire?.();
      }
    }, 30000); // refresh toutes les 30s
    return () => clearInterval(tick);
  }, [expiresAt]);

  const { bg, text, dot } = urgencyColor(ms);
  const label = msToHuman(ms);
  const isExpired = ms <= 0;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold ${size === 'md' ? 'text-[11px]' : 'text-[10px]'} ${bg} ${text}`}>
      {/* Point clignotant si urgent */}
      {!isExpired && ms < 24 * 3600000 ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: dot }}/>
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: dot }}/>
        </span>
      ) : (
        <span className="w-2 h-2 rounded-full" style={{ background: dot }}/>
      )}
      {isExpired ? 'Expiré' : `⏱ ${label}`}
    </span>
  );
}
