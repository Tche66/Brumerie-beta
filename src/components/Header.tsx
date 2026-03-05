// src/components/Header.tsx — Sprint 6 : Logo | Cloche | Search | Avatar
import { VerifiedTag } from '@/components/VerifiedTag';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeUnreadNotifCount } from '@/services/notificationService';

interface HeaderProps {
  onProfileClick?: () => void;
  onSearchChange?: (term: string) => void;
  searchTerm?: string;
  onNotificationsClick?: () => void;
  onLogoClick?: () => void;
}

export function Header({ onProfileClick, onSearchChange, searchTerm = '', onNotificationsClick, onLogoClick }: HeaderProps) {
  const { userProfile, currentUser } = useAuth();
  const [focused, setFocused] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeUnreadNotifCount(currentUser.uid, setUnreadNotifs);
    return unsub;
  }, [currentUser]);

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
      <div className="px-4 py-3">

        {/* Ligne unique : Logo | Cloche | Search | Avatar */}
        <div className="flex items-center gap-2">

          {/* Logo — cliquable pour revenir à l'accueil et rafraîchir */}
          <button onClick={onLogoClick} className="flex-shrink-0 active:scale-95 transition-all" aria-label="Accueil">
            <img
              src="/assets/Logos/logo-horizontal.png"
              alt="Brumerie"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                // Fallback texte si le logo ne charge pas — sans innerHTML (XSS safe)
                e.currentTarget.style.display = 'none';
                const p = e.currentTarget.parentElement;
                if (p) {
                  const span = document.createElement('span');
                  span.textContent = 'BRUMERIE';
                  span.style.cssText = "font-family:'Syne',sans-serif;font-weight:900;font-size:18px;color:#115E2E;letter-spacing:-0.04em";
                  p.appendChild(span);
                }
              }}
            />
          </button>

          {/* Cloche notifications */}
          <button onClick={onNotificationsClick}
            className="relative flex-shrink-0 w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center hover:border-slate-300 transition-all active:scale-90">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadNotifs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center px-1 border-2 border-white">
                <span className="text-[8px] font-black text-white">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
              </span>
            )}
          </button>

          {/* Barre de recherche — prend tout l'espace disponible */}
          <div className={`relative flex-1 transition-all duration-200 ${focused ? 'scale-[1.01]' : ''}`}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Chercher un article, une marque..."
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 transition-all duration-200 focus:outline-none focus:border-green-400 focus:bg-white"
            />
            {searchTerm && (
              <button onClick={() => onSearchChange?.('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>

          {/* Avatar — tout à droite après la search */}
          {userProfile && (
            <div className="flex flex-col items-center flex-shrink-0">
            <button onClick={onProfileClick}
              className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-green-100 hover:border-green-500 transition-all duration-200 active:scale-90">
              {userProfile.photoURL
                ? <img src={userProfile.photoURL} alt={userProfile.name} className="w-full h-full object-cover"/>
                : <div className="w-full h-full bg-green-50 flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">{userProfile.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
              }

            </button>
            {/* Badge uniquement si Vérifié ou Premium — jamais Simple */}
            {(userProfile.isVerified || (userProfile as any).isPremium) && (
              <VerifiedTag
                tier={(userProfile as any).isPremium ? 'premium' : 'verified'}
                size="sm"
              />
            )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
