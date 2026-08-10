import React from 'react';
import { Home, MessageCircle, ShoppingBag, LayoutGrid, User, Plus, Search, Truck, Settings } from 'lucide-react';

interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  role?: 'buyer' | 'seller' | 'livreur';
  unreadMessages?: number;
  pendingDashboard?: number;
  activeMissions?: number;
  cartCount?: number;
}

function NavBtn({ label, icon, active, onClick, badge, color }: {
  label: string; icon: React.ReactNode;
  active: boolean; onClick: () => void; badge?: number; color: string;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-3 py-2 transition-all active:scale-95 relative">
      <div className={active ? `text-[${color}]` : 'text-gray-400'} style={active ? { color } : undefined}>
        {icon}
      </div>
      {badge && badge > 0 ? (
        <div className="absolute top-0.5 right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-[8px] font-semibold text-white">{badge > 9 ? '9+' : badge}</span>
        </div>
      ) : null}
      <span className={`text-[10px] font-medium transition-colors ${active ? '' : 'text-gray-400'}`}
        style={active ? { color } : undefined}>
        {label}
      </span>
    </button>
  );
}

export function BottomNav({ activePage, onNavigate, role = 'seller', unreadMessages = 0, pendingDashboard = 0, activeMissions = 0, cartCount = 0 }: BottomNavProps) {
  const GREEN = '#059669';
  const BLUE = '#2563EB';
  const ORANGE = '#D97706';
  const isBuyer = role === 'buyer';
  const isDeliverer = role === 'livreur';

  if (isDeliverer) return (
    <nav className="fixed bottom-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800"
      style={{ maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="flex items-center justify-around h-16 px-2">
        <NavBtn label="Accueil" active={activePage === 'home'} onClick={() => onNavigate('home')} color={ORANGE}
          icon={<Home size={20} strokeWidth={activePage === 'home' ? 2.2 : 1.8} />}/>
        <NavBtn label="Missions" active={activePage === 'deliverer-dashboard'} onClick={() => onNavigate('deliverer-dashboard')} color={ORANGE}
          badge={activeMissions}
          icon={<Truck size={20} strokeWidth={activePage === 'deliverer-dashboard' ? 2.2 : 1.8} />}/>
        <NavBtn label="Messages" active={activePage === 'messages'} onClick={() => onNavigate('messages')} color={ORANGE}
          badge={unreadMessages}
          icon={<MessageCircle size={20} strokeWidth={activePage === 'messages' ? 2.2 : 1.8} />}/>
        <NavBtn label="Reglages" active={activePage === 'settings'} onClick={() => onNavigate('settings')} color={ORANGE}
          icon={<Settings size={20} strokeWidth={activePage === 'settings' ? 2.2 : 1.8} />}/>
      </div>
      <div className="h-safe-area-inset-bottom"/>
    </nav>
  );

  if (isBuyer) return (
    <nav className="fixed bottom-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800"
      style={{ maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="flex items-center justify-around h-16 px-1">
        <NavBtn label="Accueil" active={activePage === 'home'} onClick={() => onNavigate('home')} color={BLUE}
          icon={<Home size={20} strokeWidth={activePage === 'home' ? 2.2 : 1.8} />}/>
        <NavBtn label="Panier" active={activePage === 'cart'} onClick={() => onNavigate('cart')} color={BLUE}
          badge={cartCount}
          icon={<ShoppingBag size={20} strokeWidth={activePage === 'cart' ? 2.2 : 1.8} />}/>
        {/* Discover button */}
        <button onClick={() => onNavigate('discover')}
          className="-translate-y-3 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ background: BLUE }}>
          <Search size={20} className="text-white" strokeWidth={2} />
        </button>
        <NavBtn label="Messages" active={activePage === 'messages'} onClick={() => onNavigate('messages')} color={BLUE}
          badge={unreadMessages}
          icon={<MessageCircle size={20} strokeWidth={activePage === 'messages' ? 2.2 : 1.8} />}/>
        <NavBtn label="Profil" active={activePage === 'profile'} onClick={() => onNavigate('profile')} color={BLUE}
          icon={<User size={20} strokeWidth={activePage === 'profile' ? 2.2 : 1.8} />}/>
      </div>
      <div className="h-safe-area-inset-bottom"/>
    </nav>
  );

  // Seller nav
  return (
    <nav className="fixed bottom-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800"
      style={{ maxWidth: 480, width: '100%', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="flex items-center justify-around h-16 px-2">
        <NavBtn label="Accueil" active={activePage === 'home'} onClick={() => onNavigate('home')} color={GREEN}
          icon={<Home size={20} strokeWidth={activePage === 'home' ? 2.2 : 1.8} />}/>
        <NavBtn label="Messages" active={activePage === 'messages'} onClick={() => onNavigate('messages')} color={GREEN}
          badge={unreadMessages}
          icon={<MessageCircle size={20} strokeWidth={activePage === 'messages' ? 2.2 : 1.8} />}/>
        {/* Sell button */}
        <button onClick={() => onNavigate('sell')}
          className="-translate-y-3 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ background: GREEN }}>
          <Plus size={22} className="text-white" strokeWidth={2.5} />
        </button>
        <NavBtn label="Dashboard" active={activePage === 'dashboard'} onClick={() => onNavigate('tableau')} color={GREEN}
          badge={pendingDashboard}
          icon={<LayoutGrid size={20} strokeWidth={activePage === 'dashboard' ? 2.2 : 1.8} />}/>
        <NavBtn label="Reglages" active={activePage === 'settings'} onClick={() => onNavigate('settings')} color={GREEN}
          icon={<Settings size={20} strokeWidth={activePage === 'settings' ? 2.2 : 1.8} />}/>
      </div>
      <div className="h-safe-area-inset-bottom"/>
    </nav>
  );
}
