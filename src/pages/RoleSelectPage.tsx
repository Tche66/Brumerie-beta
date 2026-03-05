// src/pages/RoleSelectPage.tsx
// Écran de choix de rôle — affiché à l'inscription
import React, { useState } from 'react';

interface RoleSelectPageProps {
  onSelect: (role: 'buyer' | 'seller') => void;
  userName?: string;
}

export function RoleSelectPage({ onSelect, userName }: RoleSelectPageProps) {
  const [selected, setSelected] = useState<'buyer' | 'seller' | null>(null);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12 font-sans">

      {/* Logo */}
      <img src="/favicon.png" alt="Brumerie" className="w-14 h-14 object-contain mb-8 drop-shadow-lg" />

      <div className="text-center mb-10">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">
          {userName ? `Bienvenue, ${userName} !` : 'Bienvenue !'}
        </h1>
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
          Comment tu veux utiliser Brumerie ?
        </p>
        <p className="text-slate-300 text-[10px] mt-1">(Tu pourras changer dans les paramètres)</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">

        {/* Card Acheteur */}
        <button
          onClick={() => setSelected('buyer')}
          className={`w-full rounded-[2.5rem] p-6 border-2 text-left transition-all active:scale-95 ${
            selected === 'buyer'
              ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-100'
              : 'border-slate-100 bg-slate-50 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selected === 'buyer' ? 'bg-blue-500' : 'bg-white border border-slate-100'}`}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke={selected === 'buyer' ? 'white' : '#94A3B8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <div>
              <p className={`font-black text-base uppercase tracking-tight ${selected === 'buyer' ? 'text-blue-700' : 'text-slate-900'}`}>
                Je suis Acheteur
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Consommateur</p>
            </div>
            {selected === 'buyer' && (
              <div className="ml-auto w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
          <ul className="space-y-2">
            {[
              'Parcourir les annonces du quartier',
              'Contacter les vendeurs sur WhatsApp',
              'Enregistrer tes coups de cœur',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selected === 'buyer' ? 'bg-blue-400' : 'bg-slate-200'}`} />
                {item}
              </li>
            ))}
          </ul>
        </button>

        {/* Card Vendeur */}
        <button
          onClick={() => setSelected('seller')}
          className={`w-full rounded-[2.5rem] p-6 border-2 text-left transition-all active:scale-95 ${
            selected === 'seller'
              ? 'border-green-500 bg-green-50 shadow-xl shadow-green-100'
              : 'border-slate-100 bg-slate-50 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selected === 'seller' ? 'bg-green-600' : 'bg-white border border-slate-100'}`}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke={selected === 'seller' ? 'white' : '#94A3B8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <div>
              <p className={`font-black text-base uppercase tracking-tight ${selected === 'seller' ? 'text-green-700' : 'text-slate-900'}`}>
                Je suis Vendeur
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Commerçant</p>
            </div>
            {selected === 'seller' && (
              <div className="ml-auto w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
          <ul className="space-y-2">
            {[
              'Publier tes articles à vendre',
              'Gérer ton catalogue et tes ventes',
              'Recevoir des contacts WhatsApp directs',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selected === 'seller' ? 'bg-green-400' : 'bg-slate-200'}`} />
                {item}
              </li>
            ))}
          </ul>
        </button>
      </div>

      {/* Bouton confirmer */}
      <div className="w-full max-w-sm mt-8">
        <button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className={`w-full py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
            selected
              ? selected === 'buyer'
                ? 'bg-blue-500 text-white shadow-xl shadow-blue-200 active:scale-95'
                : 'bg-green-600 text-white shadow-xl shadow-green-200 active:scale-95'
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          {selected === 'buyer' ? 'Commencer à explorer' :
           selected === 'seller' ? 'Créer ma boutique' :
           'Choisir un mode'}
        </button>
      </div>

      <p className="text-[9px] text-slate-300 mt-6 uppercase tracking-widest text-center">
        Tu peux changer de mode à tout moment dans Paramètres
      </p>
    </div>
  );
}
