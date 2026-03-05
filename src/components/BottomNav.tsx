// src/components/BottomNav.tsx — Sprint 5
import React from 'react';

interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  role?: 'buyer' | 'seller';
  unreadMessages?: number;
}

const HomeIcon = (active: boolean, color: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={active ? color : '#94A3B8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);
const MsgIcon = (active: boolean, color: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={active ? color : '#94A3B8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const OrderIcon = (active: boolean, color: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={active ? color : '#94A3B8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);
const DashIcon = (active: boolean, color: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : '#94A3B8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" fill={active ? color + '30' : 'none'}/>
    <rect x="14" y="3" width="7" height="7" fill={active ? color + '30' : 'none'}/>
    <rect x="14" y="14" width="7" height="7" fill={active ? color + '30' : 'none'}/>
    <rect x="3" y="14" width="7" height="7" fill={active ? color + '30' : 'none'}/>
  </svg>
);
const ProfileIcon = (active: boolean, color: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={active ? color : '#94A3B8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

function NavBtn({ id, label, icon, active, onClick, badge }: {
  id: string; label: string; icon: React.ReactNode;
  active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1 px-3 py-2 transition-all active:scale-90 relative">
      {icon}
      {badge && badge > 0 ? (
        <div className="absolute -top-0.5 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
          <span className="text-[7px] font-black text-white">{badge > 9 ? '9+' : badge}</span>
        </div>
      ) : null}
      <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${active ? 'text-green-600' : 'text-slate-400'}`}>
        {label}
      </span>
    </button>
  );
}

export function BottomNav({ activePage, onNavigate, role = 'seller', unreadMessages = 0 }: BottomNavProps) {
  const C = '#16A34A'; // vert vendeur
  const CB = '#3B82F6'; // bleu acheteur
  const isBuyer = role === 'buyer';

  return (
    <nav className="fixed bottom-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100"
      style={{ maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="flex items-center justify-around h-16 px-2">

        {/* ACCUEIL */}
        <NavBtn id="home" label="Accueil" active={activePage === 'home'} onClick={() => onNavigate('home')}
          icon={HomeIcon(activePage === 'home', isBuyer ? CB : C)}/>

        {/* MESSAGES */}
        <NavBtn id="messages" label="Messages" active={activePage === 'messages'} onClick={() => onNavigate('messages')}
          badge={unreadMessages}
          icon={MsgIcon(activePage === 'messages', isBuyer ? CB : C)}/>

        {/* BOUTON + (vendeur uniquement) */}
        {!isBuyer && (
          <button onClick={() => onNavigate('sell')}
            className="-translate-y-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/40 active:scale-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #115E2E, #16A34A)' }}>
            <PlusIcon/>
          </button>
        )}

        {/* COMMANDES (acheteur) / DASHBOARD (vendeur) */}
        <NavBtn
          id="orders"
          label={isBuyer ? 'Commandes' : 'Dashboard'}
          active={isBuyer ? activePage === 'order-status' : activePage === 'dashboard'}
          onClick={() => onNavigate(isBuyer ? 'orders' : 'tableau')}
          icon={isBuyer
            ? OrderIcon(activePage === 'order-status', CB)
            : DashIcon(activePage === 'dashboard', C)
          }
        />

        {/* PROFIL / BOUTIQUE */}
        <NavBtn
          id="profile"
          label={isBuyer ? 'Profil' : 'Boutique'}
          active={activePage === 'profile'}
          onClick={() => onNavigate('profile')}
          icon={ProfileIcon(activePage === 'profile', isBuyer ? CB : C)}
        />
      </div>
      <div className="h-safe-area-inset-bottom"/>
    </nav>
  );
}
