// src/components/OnboardingScreen.tsx — 3 écrans au 1er lancement seulement
import React, { useState } from 'react';

const SLIDES = [
  {
    emoji: '🛍️',
    title: 'Bienvenue sur\nBrumerie',
    sub: 'Le marché en ligne d\'Abidjan.\nAchète et vends en toute confiance.',
    color: '#16A34A',
  },
  {
    emoji: '🔍',
    title: 'Trouve ce\nque tu cherches',
    sub: 'Parcours les annonces, fais une offre,\npaye par Mobile Money ou à la livraison.',
    color: '#3B82F6',
  },
  {
    emoji: '🚀',
    title: 'Vends en\n2 minutes',
    sub: 'Publie ton article avec une photo,\nfixe ton prix et reçois tes paiements.',
    color: '#F59E0B',
  },
];

interface OnboardingScreenProps {
  onDone: () => void;
}

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  const next = () => {
    if (isLast) { onDone(); return; }
    setIdx(i => i + 1);
  };

  return (
    <div className="fixed inset-0 z-[600] flex flex-col items-center justify-between pb-16 pt-20 px-8" style={{ height: \'100dvh\' }}
      style={{ background: '#0F172A' }}>

      {/* Skip */}
      {!isLast && (
        <button onClick={onDone}
          className="absolute top-12 right-6 text-[11px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          Passer
        </button>
      )}

      {/* Contenu */}
      <div className="flex-1 flex flex-col items-center justify-center text-center"
        key={idx} style={{ animation: 'fadeSlide 0.35s ease-out' }}>

        {/* Emoji dans un cercle coloré */}
        <div className="w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl"
          style={{ background: slide.color + '22', border: `2px solid ${slide.color}44` }}>
          <span className="text-6xl">{slide.emoji}</span>
        </div>

        <h2 className="font-black text-white text-[26px] leading-tight mb-4 whitespace-pre-line"
          style={{ letterSpacing: '-0.5px' }}>
          {slide.title}
        </h2>
        <p className="text-[14px] leading-relaxed whitespace-pre-line"
          style={{ color: 'rgba(255,255,255,0.5)' }}>
          {slide.sub}
        </p>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mb-10">
        {SLIDES.map((_, i) => (
          <div key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === idx ? 24 : 8,
              height: 8,
              background: i === idx ? slide.color : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* Bouton */}
      <button onClick={next}
        className="w-full max-w-xs py-5 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-95 transition-all shadow-2xl"
        style={{ background: `linear-gradient(135deg, ${slide.color}, ${slide.color}cc)` }}>
        {isLast ? "C'est parti ! 🎉" : 'Suivant →'}
      </button>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// Hook pour gérer l'état d'onboarding (localStorage)
export function useOnboarding() {
  const KEY = 'brumerie_onboarded_v1';
  const [show, setShow] = useState(() => {
    try { return !localStorage.getItem(KEY); }
    catch { return false; }
  });

  const done = () => {
    try { localStorage.setItem(KEY, '1'); } catch {}
    setShow(false);
  };

  return { showOnboarding: show, doneOnboarding: done };
}
