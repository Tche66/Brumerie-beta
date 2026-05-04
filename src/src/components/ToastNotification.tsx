// src/components/ToastNotification.tsx
// Toast in-app — fonctionne toujours, sans permission
import React, { useEffect, useState, useCallback } from 'react';

export interface ToastData {
  id: string;
  type: 'message' | 'reply' | 'favorite' | 'system';
  title: string;
  body: string;
  onClick?: () => void;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Slide-in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss après 4s
    const t2 = setTimeout(() => dismiss(), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [onDismiss, toast.id]);

  const colors = {
    message:  { bg: '#1D4ED8', icon: '#93C5FD', bar: '#3B82F6' },
    reply:    { bg: '#1D4ED8', icon: '#93C5FD', bar: '#60A5FA' },
    favorite: { bg: '#115E2E', icon: '#86EFAC', bar: '#16A34A' },
    system:   { bg: '#374151', icon: '#D1D5DB', bar: '#6B7280' },
  };
  const c = colors[toast.type];

  const icons = {
    message: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    reply: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    favorite: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    system: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  };

  return (
    <div
      onClick={() => { toast.onClick?.(); dismiss(); }}
      style={{
        transform: visible && !leaving ? 'translateY(0) scale(1)' : 'translateY(-110%) scale(0.96)',
        opacity: visible && !leaving ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        background: c.bg,
        cursor: toast.onClick ? 'pointer' : 'default',
      }}
      className="relative flex items-center gap-3 px-4 py-3.5 rounded-[1.5rem] shadow-2xl overflow-hidden w-full max-w-sm"
    >
      {/* Barre colorée gauche */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[1.5rem]" style={{ background: c.bar }} />

      {/* Icône */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ml-1"
        style={{ background: 'rgba(255,255,255,0.15)' }}>
        {icons[toast.type]}
      </div>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-black text-[12px] truncate tracking-tight">{toast.title}</p>
        <p className="text-white/70 font-medium text-[10px] truncate mt-0.5">{toast.body}</p>
      </div>

      {/* Bouton fermer */}
      <button onClick={e => { e.stopPropagation(); dismiss(); }}
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-1"
        style={{ background: 'rgba(255,255,255,0.15)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Barre de progression */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: 'rgba(255,255,255,0.2)' }}>
        <div className="h-full origin-left"
          style={{
            background: 'rgba(255,255,255,0.5)',
            animation: 'toast-progress 4s linear forwards',
          }} />
      </div>
    </div>
  );
}

// ── Container global des toasts ────────────────────────────
interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-0 right-0 z-[9999] flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ maxWidth: 480, margin: '0 auto', left: '50%', transform: 'translateX(-50%)', width: '100%' }}>
      {toasts.map(t => (
        <div key={t.id} className="w-full pointer-events-auto">
          <Toast toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
