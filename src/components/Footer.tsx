import React from 'react';
import { Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">

        {/* Logo + Tagline */}
        <div className="space-y-4">
          <img src="/logo.png" alt="Brumerie" className="h-10 w-auto" />
          <p className="text-sm text-gray-400 leading-relaxed">
            Le social commerce de ton quartier
          </p>
          <div className="pt-2">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Moyens de paiement</p>
            <p className="text-sm text-gray-300 mt-1">Mobile Money &bull; Wave &bull; Orange Money</p>
          </div>
        </div>

        {/* Liens utiles */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300">Liens utiles</h4>
          <ul className="space-y-2">
            {['À propos', 'Comment ça marche', 'FAQ', 'Contact'].map((label) => (
              <li key={label}>
                <span
                  className="text-sm text-gray-400 hover:text-emerald-400 cursor-pointer transition-colors"
                  onClick={() => {}}
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Légal */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300">Légal</h4>
          <ul className="space-y-2">
            {['CGU', 'Politique de confidentialité', 'Politique de remboursement'].map((label) => (
              <li key={label}>
                <span
                  className="text-sm text-gray-400 hover:text-emerald-400 cursor-pointer transition-colors"
                  onClick={() => {}}
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Nous suivre */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300">Nous suivre</h4>
          <div className="flex items-center gap-4">
            {/* Instagram */}
            <span
              className="text-gray-400 hover:text-emerald-400 cursor-pointer transition-colors"
              onClick={() => {}}
              aria-label="Instagram"
            >
              <Instagram size={22} />
            </span>
            {/* TikTok (SVG inline car lucide-react n'a pas d'icône TikTok) */}
            <span
              className="text-gray-400 hover:text-emerald-400 cursor-pointer transition-colors"
              onClick={() => {}}
              aria-label="TikTok"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.88 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.1V9.4a6.33 6.33 0 00-.82-.05A6.34 6.34 0 003.15 15.7 6.34 6.34 0 009.49 22a6.34 6.34 0 006.34-6.34V9.08a8.16 8.16 0 004.76 1.52V7.15a4.83 4.83 0 01-1-.46z" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* Ligne du bas */}
      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-gray-800">
        <p className="text-sm text-gray-500 text-center">
          &copy; 2024 Brumerie &mdash; Made with ❤️ in Côte d'Ivoire 🇨🇮
        </p>
      </div>
    </footer>
  );
}
