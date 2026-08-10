import { VerifiedTag } from '@/components/VerifiedTag';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeUnreadNotifCount } from '@/services/notificationService';
import { Bell, Search, X } from 'lucide-react';

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
    <header className="bg-white dark:bg-slate-900 sticky top-0 z-50 border-b border-gray-100 dark:border-slate-800">
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">

          {/* Logo */}
          <button onClick={onLogoClick} className="flex-shrink-0 active:scale-95 transition-transform" aria-label="Accueil">
            <img
              src="/logo.png"
              alt="Brumerie"
              className="h-7 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const p = e.currentTarget.parentElement;
                if (p) {
                  const span = document.createElement('span');
                  span.textContent = 'Brumerie';
                  span.style.cssText = "font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:18px;color:#064E3B;letter-spacing:-0.02em";
                  p.appendChild(span);
                }
              }}
            />
          </button>

          {/* Search */}
          <div className={`relative flex-1 transition-all duration-150 ${focused ? 'scale-[1.005]' : ''}`}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-700"
            />
            {searchTerm && (
              <button onClick={() => onSearchChange?.('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Notifications */}
          <button onClick={onNotificationsClick}
            className="relative flex-shrink-0 w-9 h-9 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95">
            <Bell size={16} className="text-gray-600 dark:text-gray-400" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center px-1">
                <span className="text-[9px] font-semibold text-white">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
              </span>
            )}
          </button>

          {/* Avatar */}
          {userProfile && (
            <div className="flex flex-col items-center flex-shrink-0">
              <button onClick={onProfileClick}
                className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 dark:border-slate-600 hover:border-emerald-500 transition-colors active:scale-95">
                {userProfile.photoURL
                  ? <img src={userProfile.photoURL} alt={userProfile.name} className="w-full h-full object-cover"/>
                  : <div className="w-full h-full bg-emerald-50 flex items-center justify-center">
                      <span className="text-emerald-700 font-semibold text-xs">{userProfile.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                }
              </button>
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
