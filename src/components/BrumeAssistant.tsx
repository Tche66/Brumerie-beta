import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const FLOAT_VISIBLE_KEY = 'brume-ia-float-visible';

export function BrumeAssistant({ onAction }: { onAction?: (action: { type: string; payload?: any }) => void }) {
  const { currentUser } = useAuth();
  const [visible, setVisible] = useState(() => localStorage.getItem(FLOAT_VISIBLE_KEY) !== 'false');

  useEffect(() => {
    const handleStorage = () => {
      setVisible(localStorage.getItem(FLOAT_VISIBLE_KEY) !== 'false');
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1000);
    return () => { window.removeEventListener('storage', handleStorage); clearInterval(interval); };
  }, []);

  if (!currentUser || !visible) return null;

  return (
    <button
      onClick={() => onAction?.({ type: 'navigate', payload: { page: 'brume-ia' } })}
      className="fixed bottom-24 right-4 z-[100] w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 shadow-2xl shadow-green-500/30 flex items-center justify-center active:scale-90 transition-all"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 017 7c0 3-1.5 5-3 6.5V18H8v-2.5C6.5 14 5 12 5 9a7 7 0 017-7z"/>
        <path d="M9 22h6"/>
      </svg>
    </button>
  );
}
