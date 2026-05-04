import { Link, useLocation } from 'react-router';
import { Home, Search, Plus, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const { user } = useAuth();

  const hidden = ['/create', '/politique-confidentialite', '/conditions-utilisation', '/system-status', '/auth'].some(p => path.startsWith(p));
  if (hidden) return null;

  const items = [
    { to: '/', icon: <Home className="w-5 h-5" />, label: 'Accueil', active: path === '/' },
    { to: '/explorer', icon: <Search className="w-5 h-5" />, label: 'Explorer', active: path === '/explorer' },
    { to: '/create', icon: <Plus className="w-6 h-6" />, label: 'Créer', active: path === '/create', isPrimary: true },
    {
      to: user ? '/profil' : '/auth',
      icon: <User className="w-5 h-5" />,
      label: user ? 'Profil' : 'Connexion',
      active: path === '/profil' || path === '/auth',
    },
  ];

  return (
    <>
      <div className="h-20 md:hidden" />
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around px-2 py-2">
          {items.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                item.isPrimary
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 -mt-4 px-5 py-3'
                  : item.active
                  ? 'text-indigo-600'
                  : 'text-gray-400'
              }`}
            >
              {item.icon}
              <span className={`text-xs font-medium ${item.isPrimary ? 'text-white' : ''}`}>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
