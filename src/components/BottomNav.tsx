import React from 'react';

interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  role?: 'buyer' | 'seller' | 'livreur';
  unreadMessages?: number;
  pendingDashboard?: number;
  activeMissions?: number;
  cartCount?: number;
}

function NavItem({ label, active, onClick, badge, children }: {
  label: string; active: boolean; onClick: () => void; badge?: number; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative active:opacity-70 transition-opacity">
      <div className={active ? 'text-slate-900' : 'text-slate-400'}>
        {children}
      </div>
      {badge && badge > 0 ? (
        <div className="absolute top-1 right-1/4 min-w-[16px] h-4 px-1 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-[9px] font-bold text-white">{badge > 99 ? '99+' : badge}</span>
        </div>
      ) : null}
      <span className={`text-[10px] ${active ? 'font-semibold text-slate-900' : 'font-medium text-slate-400'}`}>
        {label}
      </span>
    </button>
  );
}

function IconHome({ active }: { active: boolean }) {
  if (active) return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1z"/></svg>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}

function IconSearch({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "1.8"} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}

function IconCart({ active }: { active: boolean }) {
  if (active) return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zm0 2h12l2 3H4l2-3zm10 6a4 4 0 01-8 0"/></svg>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
}

function IconMessage({ active }: { active: boolean }) {
  if (active) return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
}

function IconUser({ active }: { active: boolean }) {
  if (active) return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}

function IconPlus() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}

function IconGrid({ active }: { active: boolean }) {
  if (active) return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
}

function IconTruck({ active }: { active: boolean }) {
  if (active) return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M1 3h15v13H1zm15 5h4l3 4v4h-4M5.5 18.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 18.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/></svg>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
}

function IconSettings({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>;
}

export function BottomNav({ activePage, onNavigate, role = 'seller', unreadMessages = 0, pendingDashboard = 0, activeMissions = 0, cartCount = 0 }: BottomNavProps) {
  const isBuyer = role === 'buyer';
  const isDeliverer = role === 'livreur';

  if (isDeliverer) return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100"
      style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="flex items-center h-16 px-1 safe-area-pb">
        <NavItem label="Accueil" active={activePage === 'home'} onClick={() => onNavigate('home')}>
          <IconHome active={activePage === 'home'}/>
        </NavItem>
        <NavItem label="Missions" active={activePage === 'deliverer-dashboard'} onClick={() => onNavigate('deliverer-dashboard')} badge={activeMissions}>
          <IconTruck active={activePage === 'deliverer-dashboard'}/>
        </NavItem>
        <NavItem label="Messages" active={activePage === 'messages'} onClick={() => onNavigate('messages')} badge={unreadMessages}>
          <IconMessage active={activePage === 'messages'}/>
        </NavItem>
        <NavItem label="Profil" active={activePage === 'settings'} onClick={() => onNavigate('settings')}>
          <IconSettings active={activePage === 'settings'}/>
        </NavItem>
      </div>
    </nav>
  );

  if (isBuyer) return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100"
      style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="flex items-center h-16 px-1 safe-area-pb">
        <NavItem label="Accueil" active={activePage === 'home'} onClick={() => onNavigate('home')}>
          <IconHome active={activePage === 'home'}/>
        </NavItem>
        <NavItem label="Explorer" active={activePage === 'discover'} onClick={() => onNavigate('discover')}>
          <IconSearch active={activePage === 'discover'}/>
        </NavItem>
        <NavItem label="Panier" active={activePage === 'cart'} onClick={() => onNavigate('cart')} badge={cartCount}>
          <IconCart active={activePage === 'cart'}/>
        </NavItem>
        <NavItem label="Messages" active={activePage === 'messages'} onClick={() => onNavigate('messages')} badge={unreadMessages}>
          <IconMessage active={activePage === 'messages'}/>
        </NavItem>
        <NavItem label="Profil" active={activePage === 'profile'} onClick={() => onNavigate('profile')}>
          <IconUser active={activePage === 'profile'}/>
        </NavItem>
      </div>
    </nav>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100"
      style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="flex items-center h-16 px-1 safe-area-pb">
        <NavItem label="Accueil" active={activePage === 'home'} onClick={() => onNavigate('home')}>
          <IconHome active={activePage === 'home'}/>
        </NavItem>
        <NavItem label="Messages" active={activePage === 'messages'} onClick={() => onNavigate('messages')} badge={unreadMessages}>
          <IconMessage active={activePage === 'messages'}/>
        </NavItem>
        <button onClick={() => onNavigate('sell')}
          className="flex-1 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
            <IconPlus/>
          </div>
        </button>
        <NavItem label="Tableau" active={activePage === 'dashboard'} onClick={() => onNavigate('tableau')} badge={pendingDashboard}>
          <IconGrid active={activePage === 'dashboard'}/>
        </NavItem>
        <NavItem label="Profil" active={activePage === 'profile'} onClick={() => onNavigate('profile')}>
          <IconUser active={activePage === 'profile'}/>
        </NavItem>
      </div>
    </nav>
  );
}
