// src/components/GuestModal.tsx
// Drawer affiché quand un visiteur non connecté tente une action protégée
import React from 'react';

interface GuestModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  reason?: 'contact' | 'bookmark' | 'sell' | 'message' | 'offer' | 'default';
}

const REASONS = {
  contact:  { icon: '💬', title: 'Contacte le vendeur',     sub: 'Connecte-toi pour écrire au vendeur via WhatsApp ou la messagerie.' },
  bookmark: { icon: '🔖', title: 'Sauvegarde cet article',  sub: 'Connecte-toi pour retrouver tes articles favoris à tout moment.' },
  sell:     { icon: '🛍', title: 'Vends sur Brumerie',      sub: 'Crée ton compte gratuit et publie ton premier article en 2 minutes.' },
  message:  { icon: '✉️', title: 'Envoie un message',       sub: 'Connecte-toi pour discuter avec les vendeurs.' },
  offer:    { icon: '💰', title: 'Fais une offre',          sub: 'Connecte-toi pour proposer ton prix au vendeur.' },
  default:  { icon: '🔒', title: 'Connecte-toi pour continuer', sub: 'Rejoins la communauté Brumerie gratuitement.' },
};

export function GuestModal({ visible, onClose, onLogin, reason = 'default' }: GuestModalProps) {
  const { icon, title, sub } = REASONS[reason];

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center"
      onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"/>

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white rounded-t-[3rem] px-6 pt-5 pb-10 shadow-2xl"
        style={{ animation: 'slideUp 0.3s ease-out' }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>

        {/* Handle */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6"/>

        {/* Icône */}
        <div className="w-16 h-16 bg-green-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
          {icon}
        </div>

        <h2 className="text-[20px] font-black text-slate-900 text-center mb-2 leading-tight">
          {title}
        </h2>
        <p className="text-slate-400 text-[13px] text-center font-medium leading-relaxed mb-8">
          {sub}
        </p>

        {/* Boutons */}
        <button onClick={onLogin}
          className="w-full py-5 rounded-[2rem] font-black text-[13px] uppercase tracking-widest text-white shadow-xl active:scale-[0.98] transition-all mb-3"
          style={{ background: 'linear-gradient(135deg,#115E2E,#16A34A)', boxShadow: '0 16px 32px rgba(22,163,74,0.25)' }}>
          Se connecter / S'inscrire
        </button>
        <button onClick={onClose}
          className="w-full py-4 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
          Continuer à explorer
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
