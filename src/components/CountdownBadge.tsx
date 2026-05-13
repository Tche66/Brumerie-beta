// src/components/CountdownBadge.tsx
import React, { useState, useEffect } from 'react';

interface Props {
  expiresAt?: any; // Firestore Timestamp, ISO string, Date, ou undefined
  onExpire?: () => void;
  size?: 'sm' | 'md';
}

function safeGetMs(expiresAt: any): number {
  try {
    if (!expiresAt) return 0;
    // Firestore Timestamp
    if (typeof expiresAt?.toDate === 'function') {
      return expiresAt.toDate().getTime() - Date.now();
    }
    // ISO string ou Date
    const d = new Date(expiresAt);
    const t = d.getTime();
    if (isNaN(t)) return 0;
    return t - Date.now();
  } catch {
    return 0;
  }
}

function msToHuman(ms: number): string {
  if (ms <= 0) return 'Expiré';
  const totalSeconds = Math.floor(ms / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0)  return `${days}j ${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;
  if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Toujours retourne un objet valide — jamais undefined
function urgencyColor(ms: number): { bg: string; text: string; dot: string } {
  const safeMs = isNaN(ms) || ms === undefined ? 0 : ms;
  if (safeMs <= 0)             return { bg: 'bg-slate-100', text: 'text-slate-400', dot: '#94A3B8' };
  if (safeMs < 2 * 3600000)   return { bg: 'bg-red-100',   text: 'text-red-700',   dot: '#DC2626' };
  if (safeMs < 24 * 3600000)  return { bg: 'bg-amber-100', text: 'text-amber-700', dot: '#D97706' };
  return                              { bg: 'bg-green-100', text: 'text-green-700', dot: '#16A34A' };
}

export function CountdownBadge({ expiresAt, onExpire, size = 'sm' }: Props) {
  const [ms, setMs] = useState<number>(() => safeGetMs(expiresAt));

  useEffect(() => {
    // Recalculer immédiatement si expiresAt change
    setMs(safeGetMs(expiresAt));

    const tick = setInterval(() => {
      const remaining = safeGetMs(expiresAt);
      setMs(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [expiresAt]);

  // Toujours un objet valide grâce à urgencyColor
  const colors = urgencyColor(ms);
  const bg   = colors?.bg   ?? 'bg-slate-100';
  const text = colors?.text ?? 'text-slate-400';
  const dot  = colors?.dot  ?? '#94A3B8';

  const label    = msToHuman(ms);
  const isExpired = ms <= 0;
  const isUrgent  = ms > 0 && ms < 24 * 3600000;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold ${size === 'md' ? 'text-[11px]' : 'text-[10px]'} ${bg} ${text}`}
    >
      {!isExpired && isUrgent ? (
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: dot }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: dot }}
          />
        </span>
      ) : (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: dot }}
        />
      )}
      {isExpired ? 'Expiré' : `⏱ ${label}`}
    </span>
  );
}
