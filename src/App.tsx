import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppStateProvider, useAppState } from '@/contexts/AppStateContext';
import { updateUserProfile } from '@/services/userService';
import { AuthPage } from '@/pages/AuthPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { RoleSelectPage } from '@/pages/RoleSelectPage';
import { BottomNav } from '@/components/BottomNav';
import { OnboardingScreen, useOnboarding } from '@/components/OnboardingScreen';
import { ToastContainer } from '@/components/ToastNotification';
import { GuestShell } from '@/components/GuestShell';
import { PushNotifPrompt } from '@/components/PushNotifPrompt';
import { NetworkBanner } from '@/components/NetworkBanner';
import { OfferModal } from '@/components/OfferModal';
import { GoogleNeighborhoodModal } from '@/components/GoogleNeighborhoodModal';
import { BrumeAssistant } from '@/components/BrumeAssistant';
import { unlockAudio } from '@/services/soundService';
import { sendOfferCard, getOrCreateConversation } from '@/services/messagingService';
import { AppRoutes } from '@/routes';

function AuthGate() {
  const { userProfile, currentUser } = useAuth();
  const [showPrivacy, setShowPrivacy] = React.useState(false);
  const [privacyMode, setPrivacyMode] = React.useState<'privacy' | 'terms'>('privacy');

  const handleNavigate = (page: string) => {
    if (page === 'privacy') { setPrivacyMode('privacy'); setShowPrivacy(true); }
    else if (page === 'terms') { setPrivacyMode('terms'); setShowPrivacy(true); }
  };

  if (showPrivacy) return <PrivacyPage onBack={() => setShowPrivacy(false)} isTerms={privacyMode === 'terms'} />;
  if (currentUser && userProfile && !userProfile.role) {
    return (
      <RoleSelectPage
        userName={userProfile.name}
        onSelect={async (role) => { await updateUserProfile(currentUser.uid, { role }); window.location.reload(); }}
      />
    );
  }
  return <AuthPage onNavigate={handleNavigate} />;
}

function RoleSwitchModal({ currentRole, onConfirm, onCancel }: {
  currentRole: 'buyer' | 'seller'; onConfirm: () => void; onCancel: () => void;
}) {
  const newRole = currentRole === 'buyer' ? 'seller' : 'buyer';
  const isGoingSeller = newRole === 'seller';
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-end justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-8">
        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6" />
        <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center mx-auto mb-6 ${isGoingSeller ? 'bg-green-50' : 'bg-blue-50'}`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke={isGoingSeller ? '#16A34A' : '#3B82F6'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isGoingSeller
              ? <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>
              : <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>}
          </svg>
        </div>
        <h3 className="text-xl font-black text-slate-900 text-center uppercase tracking-tight mb-2">
          Passer en mode {isGoingSeller ? 'Vendeur' : 'Acheteur'}
        </h3>
        <p className="text-slate-400 text-[11px] text-center font-medium mb-8 leading-relaxed">
          {isGoingSeller ? 'Tu pourras publier des articles et gérer ta boutique.' : 'Tu passeras en mode exploration.'}
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={onConfirm}
            className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all text-white shadow-xl ${isGoingSeller ? 'bg-green-600 shadow-green-200' : 'bg-blue-500 shadow-blue-200'}`}>
            Confirmer le changement
          </button>
          <button onClick={onCancel} className="w-full py-4 text-slate-400 font-bold text-[11px] uppercase tracking-widest">Annuler</button>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { currentUser, userProfile } = useAuth();
  const app = useAppState();
  const { showOnboarding, doneOnboarding } = useOnboarding();

  const role = app.role;
  const isBuyer = app.isBuyer;
  const MAIN_PAGES = ['/', '/messages', '/explorer', '/profil', '/commandes', '/tableau', '/parametres', '/panier', ...(isBuyer ? [] : ['/publier'])];

  return (
    <div className="min-h-full bg-white">
      <main style={{ animation: 'pageSlideIn 0.22s cubic-bezier(0.25,0.46,0.45,0.94) both' }}>
        <AppRoutes />
      </main>

      {MAIN_PAGES.includes(window.location.pathname) && role !== 'livreur' && (
        <BottomNav
          activePage={window.location.pathname === '/' ? 'home' : window.location.pathname.slice(1)}
          onNavigate={(page) => {
            const target = page === 'orders' ? 'order-status' : page === 'tableau' ? 'dashboard' : page;
            app.handleNavigate(target);
          }}
          role={role}
          unreadMessages={app.unreadMessages}
          pendingDashboard={app.pendingDashboard}
          activeMissions={app.activeMissions}
          cartCount={app.cartCount}
        />
      )}

      {app.showRoleSwitch && userProfile && (
        <RoleSwitchModal currentRole={role as 'buyer' | 'seller'} onConfirm={app.handleRoleSwitch} onCancel={() => app.setShowRoleSwitch(false)} />
      )}

      <ToastContainer toasts={app.toasts} onDismiss={app.dismissToast} />
      <PushNotifPrompt />

      {showOnboarding && <OnboardingScreen onDone={doneOnboarding} />}

      {app.showNeighborhoodModal && (
        <GoogleNeighborhoodModal onDone={() => app.setShowNeighborhoodModal(false)} />
      )}

      <BrumeAssistant onAction={(action) => {
        if (action.type === 'open-product' && action.payload?.product) {
          app.setSelectedProduct(action.payload.product);
          app.handleProductClick(action.payload.product);
        } else if (action.type === 'navigate' && action.payload?.page) {
          app.handleNavigate(action.payload.page);
        }
      }} />

      {app.storyOfferProduct && currentUser && userProfile && (
        <OfferModal
          product={app.storyOfferProduct}
          visible={true}
          onClose={() => app.setStoryOfferProduct(null)}
          onSend={async (offerPrice, _message) => {
            const convId = await getOrCreateConversation(
              currentUser.uid, app.storyOfferProduct.sellerId,
              { id: app.storyOfferProduct.id, title: app.storyOfferProduct.title, price: app.storyOfferProduct.price,
                image: app.storyOfferProduct.images?.[0] || '', neighborhood: app.storyOfferProduct.neighborhood || '' },
              userProfile.name, app.storyOfferProduct.sellerName || '', userProfile.photoURL, app.storyOfferProduct.sellerPhoto || '',
            );
            await sendOfferCard(
              convId, currentUser.uid, userProfile.name,
              { id: app.storyOfferProduct.id, title: app.storyOfferProduct.title, price: app.storyOfferProduct.price,
                image: app.storyOfferProduct.images?.[0] || '', sellerId: app.storyOfferProduct.sellerId,
                neighborhood: app.storyOfferProduct.neighborhood || '',
                sellerName: app.storyOfferProduct.sellerName || '', sellerPhoto: app.storyOfferProduct.sellerPhoto || '' },
              offerPrice, userProfile.photoURL,
            );
            app.setStoryOfferProduct(null);
            await app.handleStartChat(convId);
          }}
        />
      )}
    </div>
  );
}

function AppContent() {
  const { currentUser, userProfile, loading } = useAuth();
  const [showAuth, setShowAuth] = React.useState(false);
  const [maintenance, setMaintenance] = React.useState<{active: boolean; message: string} | null>(null);

  React.useEffect(() => {
    import('firebase/firestore').then(({ doc, getDoc }) => {
      import('@/config/firebase').then(({ db }) => {
        getDoc(doc(db, 'system', 'settings')).then((snap: any) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.maintenanceMode) {
              setMaintenance({ active: true, message: data.maintenanceMessage || 'Brumerie est en maintenance. Revenez bientôt !' });
            }
          }
        }).catch(() => {});
      });
    });
  }, []);

  const adminUid = (import.meta as any).env?.VITE_ADMIN_UID || '__none__';
  const isCurrentUserAdmin = currentUser?.uid === adminUid;

  if (maintenance?.active && !loading && currentUser && !isCurrentUserAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8" style={{ background: '#0F172A' }}>
        <div className="text-center">
          <div className="text-6xl mb-6">🔧</div>
          <h2 className="font-black text-white text-[22px] mb-3">Maintenance en cours</h2>
          <p className="text-slate-400 text-[14px] leading-relaxed">{maintenance.message}</p>
        </div>
        <button
          onClick={async () => {
            const { getAuth, signOut } = await import('firebase/auth');
            await signOut(getAuth());
          }}
          className="mt-8 flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 border border-slate-700 active:scale-95 transition-all">
          Se déconnecter
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-green-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Chargement...</p>
        </div>
      </div>
    );
  }

  if (currentUser && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="Brumerie" className="w-16 h-16 object-contain animate-pulse mb-2"/>
          <div className="w-10 h-10 border-4 border-slate-100 border-t-green-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Connexion Google...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (showAuth) return <AuthGate />;
    return <GuestShell onAuthRequired={() => setShowAuth(true)} />;
  }

  if (userProfile && !userProfile.role) {
    return (
      <RoleSelectPage
        userName={userProfile.name}
        onSelect={async (role) => {
          await updateUserProfile(currentUser.uid, { role });
          window.location.reload();
        }}
      />
    );
  }

  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}

export default function App() {
  React.useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  return (
    <ErrorBoundary>
      <NetworkBanner />
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
