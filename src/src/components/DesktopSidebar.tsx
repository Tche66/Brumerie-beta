// src/components/DesktopSidebar.tsx
// Panneau décoratif affiché à gauche de l'app sur grands écrans (>= 1100px)
import React from 'react';

export function DesktopSidebar() {
  return (
    <div id="desktop-sidebar">
      <div className="flex flex-col gap-6 text-right max-w-xs">

        {/* Logo + tagline */}
        <div>
          <div className="flex items-center justify-end gap-3 mb-3">
            <div>
              <h1 className="text-white font-black text-3xl tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                🛍 Brumerie
              </h1>
              <p className="text-green-400 text-xs font-bold uppercase tracking-widest mt-0.5">Abidjan · Côte d'Ivoire 🇨🇮</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Le marché digital de quartier.<br />
            Achetez et vendez local, simplement.
          </p>
        </div>

        {/* Stats visuelles */}
        <div className="flex flex-col gap-3">
          {[
            { icon: '📦', label: '10 catégories', sub: 'Mode, High-Tech, Beauté...' },
            { icon: '✅', label: 'Vendeurs Vérifiés', sub: 'Identité contrôlée par Brumerie' },
            { icon: '💳', label: '4 modes de paiement', sub: 'Wave · Orange · MTN · Moov' },
            { icon: '🛡️', label: 'Code de livraison', sub: 'Confirmez avant de payer' },
          ].map((item) => (
            <div key={item.label}
              className="flex items-center gap-3 justify-end bg-white/5 border border-white/8 rounded-2xl px-4 py-3 backdrop-blur-sm">
              <div className="text-right">
                <p className="text-white font-bold text-[13px]">{item.label}</p>
                <p className="text-slate-500 text-[11px] font-medium">{item.sub}</p>
              </div>
              <span className="text-xl flex-shrink-0">{item.icon}</span>
            </div>
          ))}
        </div>

        {/* Lien web */}
        <div className="flex flex-col items-end gap-2">
          <a href="https://brumerie.com" target="_blank" rel="noopener noreferrer"
            className="text-green-400 text-xs font-black uppercase tracking-widest hover:text-green-300 transition-colors">
            brumerie.com →
          </a>
          <p className="text-slate-600 text-[10px] font-medium">contact@brumerie.com</p>
        </div>

        {/* Indicateur "app mobile" */}
        <div className="flex items-center justify-end gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">App Mobile PWA</p>
        </div>

      </div>
    </div>
  );
}
