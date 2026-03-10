// BRUMERIE V13-FIXED — BUILD 2026-03-07-FINAL
// src/App.tsx — Fix hooks violation #300/#310 + architecture propre
import React, { useState, useEffect, useRef } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/services/userService';
import { subscribeTotalUnread } from '@/services/messagingService';
import { AuthPage } from '@/pages/AuthPage';
import { HomePage } from '@/pages/HomePage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { SellPage } from '@/pages/SellPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { BuyerProfilePage } from '@/pages/BuyerProfilePage';
import { SellerProfilePage } from '@/pages/SellerProfilePage';
import { EditProfilePage } from '@/pages/EditProfilePage';
import { VerificationPage } from '@/pages/VerificationPage';
import { CGUPage } from '@/pages/CGUPage';
import { SupportPage } from '@/pages/SupportPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { RoleSelectPage } from '@/pages/RoleSelectPage';
import { ConversationsListPage } from '@/pages/ConversationsListPage';
import { ChatPage } from '@/pages/ChatPage';
import { BottomNav } from '@/components/BottomNav';
import { Product, Conversation } from '@/types';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ShopCustomizePage } from '@/pages/ShopCustomizePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EditProductPage } from '@/pages/EditProductPage';
import { OrderFlowPage } from '@/pages/OrderFlowPage';
import { OrderStatusPage } from '@/pages/OrderStatusPage';
import { ReferralPage } from '@/pages/ReferralPage';
import { GuidePage } from '@/pages/GuidePage';
import { AdminPage } from '@/pages/AdminPage';
import { OnboardingScreen, useOnboarding } from '@/components/OnboardingScreen';
import { ToastContainer } from '@/components/ToastNotification';
import { useToast } from '@/hooks/useToast';
import { subscribeToNotifications } from '@/services/notificationService';
import { playMessageSound, playSystemSound, unlockAudio } from '@/services/soundService';
import { GuestShell } from '@/components/GuestShell';
import { PushNotifPrompt } from '@/components/PushNotifPrompt';
import { NetworkBanner } from '@/components/NetworkBanner';

type Page =
  | 'home' | 'profile' | 'sell' | 'messages'
  | 'product-detail' | 'seller-profile' | 'chat'
  | 'edit-profile' | 'verification' | 'support' | 'cgu'
  | 'settings' | 'privacy' | 'terms' | 'about' | 'notifications'
  | 'order-flow' | 'order-status' | 'shop-customize' | 'dashboard' | 'edit-product' | 'referral' | 'guide' | 'admin';

// ── AuthGate — composant dédié hors auth ──────────────────────
function AuthGate() {
  const { userProfile, currentUser } = useAuth();
  const [showPrivacy, setShowPrivacy] = React.useState(false);
  const [privacyMode, setPrivacyMode] = React.useState<'privacy' | 'terms'>('privacy');
  const _banReason = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ban_reason') : null;

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

// ── Modal switch rôle ─────────────────────────────────────────
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

// ── AppShell — rendu uniquement si authentifié ────────────────
// TOUS les hooks sont déclarés ici, AUCUN return conditionnel avant eux
function AppShell() {
  const { currentUser, userProfile } = useAuth();
  const { toasts, showToast, dismissToast } = useToast();
  const { showOnboarding, doneOnboarding } = useOnboarding();

  // ── État de navigation ──
  const [activePage, setActivePage]               = useState<Page>('home');
  const [pageKey, setPageKey]                      = useState(0); // force re-mount pour animation
  const [selectedProduct, setSelectedProduct]     = useState<Product | null>(null);
  const [productHistory, setProductHistory]       = useState<Product[]>([]);
  const [selectedSellerId, setSelectedSellerId]   = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [productToEdit, setProductToEdit]         = useState<Product | null>(null);
  const [orderFlowProduct, setOrderFlowProduct]   = useState<any>(null);
  const [acceptedOfferPrice, setAcceptedOfferPrice] = useState<number | undefined>(undefined);
  const [selectedOrderId, setSelectedOrderId]     = useState<string>('');
  const [navigationHistory, setNavigationHistory] = useState<Page[]>(['home']);
  const [showRoleSwitch, setShowRoleSwitch]       = useState(false);
  const [unreadMessages, setUnreadMessages]       = useState(0);
  const [showExitConfirm, setShowExitConfirm]     = useState(false);
  const exitConfirmTimer                          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNotifsRef                             = useRef<Set<string>>(new Set());

  const role    = userProfile?.role || 'buyer';
  const isBuyer = role === 'buyer';
  const MAIN_PAGES: Page[] = ['home', 'messages', 'profile', 'order-status', 'dashboard', 'settings', ...(isBuyer ? [] : ['sell' as Page])];

  // ── Helpers navigation (définis AVANT les useEffect) ──────────
  const navigate = (page: Page) => {
    setNavigationHistory((prev: Page[]) => [...prev, page]);
    setActivePage(page);
    setPageKey(k => k + 1);
    window.history.pushState({ page }, '', window.location.pathname);
  };

  // ── Logo / bouton Accueil → reset + scroll top ─────────────
  const handleLogoClick = () => {
    setActivePage('home');
    setNavigationHistory(['home']);
    setSelectedProduct(null);
    setSelectedSellerId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setNavigationHistory((prevNav: Page[]) => {
      if (prevNav.length <= 1) { setActivePage('home'); return ['home']; }
      const h = prevNav.slice(0, -1);
      const prevPage = h[h.length - 1];
      if (prevPage === 'product-detail') {
        setProductHistory((prevStack: Product[]) => {
          if (prevStack.length === 0) return prevStack;
          const newStack = prevStack.slice(0, -1);
          setSelectedProduct(prevStack[prevStack.length - 1]);
          return newStack;
        });
      }
      setActivePage(prevPage);
      return h;
    });
  };

  // ── useEffect #1 — scroll top à chaque changement de page ────
  
useEffect(() => { window.scrollTo(0, 0); }, [activePage, selectedProduct]);

  // ── useEffect : Bouton Retour Android (Capacitor) ─────────────
  // Sans ça, le bouton physique ← ferme l'app au lieu de revenir en arrière
  useEffect(() => {
    let listener: any;
    const setup = async () => {
      // Seulement sur APK Android — jamais sur Netlify/web
      if (!(window as any).Capacitor?.isNativePlatform()) return;
      try {
        const { App: CapacitorApp } = await import('@capacitor/app');
        listener = await CapacitorApp.addListener('backButton', () => {
          // Si un modal/overlay est ouvert, le fermer en priorité
          const hasModal = document.querySelector('[data-modal="true"]');
          if (hasModal) {
            (hasModal as HTMLElement).dispatchEvent(new CustomEvent('capacitor:back'));
            return;
          }
          // Si on est sur la page d'accueil → minimiser l'app (pas quitter)
          if (activePage === 'home') {
            CapacitorApp.minimizeApp();
            return;
          }
          // Sinon : revenir à la page précédente
          goBack();
        });
      } catch {
        // Erreur silencieuse
      }
    };
    setup();
    return () => { listener?.remove?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  // ── useEffect #2 — reset état si déconnexion ─────────────────
  useEffect(() => {
    if (!currentUser) {
      setActivePage('home');
      setSelectedProduct(null);
      setSelectedSellerId(null);
      setSelectedConversation(null);
      setProductHistory([]);
      setNavigationHistory(['home']);
    }
  }, [currentUser]);

  // ── useEffect #3 — messages non-lus ──────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    return subscribeTotalUnread(currentUser.uid, setUnreadMessages);
  }, [currentUser?.uid]);

  // ── useEffect #4 — notifications in-app ──────────────────────
  useEffect(() => {
    if (!currentUser) return;
    return subscribeToNotifications(currentUser.uid, (notifs: any[]) => {
      notifs.filter(n => !n.read).forEach(notif => {
        if (!prevNotifsRef.current.has(notif.id)) {
          prevNotifsRef.current.add(notif.id);
          if (prevNotifsRef.current.size > 1) {
            showToast({
              type: notif.type as any,
              title: notif.title,
              body: notif.body,
              onClick: notif.data?.conversationId
                ? () => handleStartChat(notif.data!.conversationId!)
                : undefined,
            });
            // ── Son de notification ──
            if (notif.type === 'message' || notif.type === 'reply') {
              playMessageSound();
            } else {
              playSystemSound();
            }
          }
        }
      });
    });
  }, [currentUser?.uid]);

  // ── useEffect #5 — vérifier boosts/badges expirant au démarrage ─
  useEffect(() => {
    if (!currentUser?.uid || !userProfile) return;
    // Vérification différée de 3s pour ne pas bloquer le démarrage
    const timer = setTimeout(async () => {
      try {
        const { checkAndNotifyExpiringBoosts, checkAndNotifyExpiringBadge } = await import('@/services/boostService');
        // Vérifier boosts si vendeur
        if (userProfile.role === 'seller') {
          await checkAndNotifyExpiringBoosts(currentUser.uid, userProfile.name || '');
        }
        // Vérifier badge pour tous les utilisateurs vérifiés
        if (userProfile.isVerified) {
          await checkAndNotifyExpiringBadge(currentUser.uid);
        }
      } catch (e) { /* silencieux */ }
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentUser?.uid, userProfile?.isVerified, userProfile?.role]);

  // ── useEffect #6 — bouton retour physique Android + double appui pour quitter ──
  useEffect(() => {
    window.history.replaceState({ page: 'home' }, '', window.location.pathname);
    const handlePopState = () => {
      // Lire l'état courant via setState fonctionnel
      setNavigationHistory(prevNav => {
        const isOnHome = prevNav.length <= 1;
        if (isOnHome) {
          // Sur l'accueil → double appui pour quitter
          setShowExitConfirm(true);
          // Remettre l'état history pour intercepter le prochain appui
          window.history.pushState({ page: 'home' }, '', window.location.pathname);
          // Auto-masquer le message après 3s
          if (exitConfirmTimer.current) clearTimeout(exitConfirmTimer.current);
          exitConfirmTimer.current = setTimeout(() => setShowExitConfirm(false), 3000);
          return prevNav;
        } else {
          // Pas sur l'accueil → naviguer en arrière normalement
          setShowExitConfirm(false);
          window.history.pushState({ page: 'home' }, '', window.location.pathname);
          const h = prevNav.slice(0, -1);
          const prevPage = h[h.length - 1];
          if (prevPage === 'product-detail') {
            setProductHistory((prevStack: Product[]) => {
              if (prevStack.length === 0) return prevStack;
              const newStack = prevStack.slice(0, -1);
              setSelectedProduct(prevStack[prevStack.length - 1]);
              return newStack;
            });
          }
          setActivePage(prevPage || 'home');
          return h.length > 0 ? h : ['home'];
        }
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitConfirmTimer.current) clearTimeout(exitConfirmTimer.current);
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────────────
  const handleProductClick = (product: Product) => {
    if (activePage === 'product-detail' && selectedProduct) {
      setProductHistory(prev => [...prev, selectedProduct]);
    }
    setSelectedProduct(product);
    navigate('product-detail');
  };

  const handleSellerClick = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    navigate('seller-profile');
  };

  const handleBottomNavNavigate = (page: string) => {
    setSelectedProduct(null);
    setSelectedSellerId(null);
    setSelectedConversation(null);
    setProductHistory([]);
    setSelectedOrderId('');
    const target = page === 'orders' ? 'order-status' : page === 'tableau' ? 'dashboard' : page;
    setNavigationHistory((_prev: Page[]) => [target as Page]);
    setActivePage(target as Page);
  };

  const handleOpenConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    navigate('chat');
  };

  const handleStartChat = async (convId: string) => {
    const { getDoc, doc } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');
    const snap = await getDoc(doc(db, 'conversations', convId));
    if (snap.exists()) {
      setSelectedConversation({ id: snap.id, ...snap.data() } as Conversation);
      navigate('chat');
    }
  };

  // Ouvrir le chat avec un vendeur depuis Stories / OrderStatus / etc.
  const handleOpenChatWithSeller = async (sellerId: string, sellerName: string, productId?: string, productTitle?: string) => {
    if (!currentUser || !userProfile) return;
    const { getOrCreateConversation } = await import('@/services/messagingService');
    try {
      const convId = await getOrCreateConversation(
        currentUser.uid,
        sellerId,
        { id: productId || 'direct', title: productTitle || 'Contact direct', price: 0, image: '', neighborhood: '' },
        userProfile.name,
        sellerName,
        userProfile.photoURL,
        undefined,
      );
      await handleStartChat(convId);
    } catch (e) { console.error('[Chat direct]', e); }
  };

  const handleNavigate = (p: string) => {
    if (p === 'switch-to-seller' || p === 'switch-to-buyer') { setShowRoleSwitch(true); return; }
    if (p === 'orders') { setSelectedOrderId(''); navigate('order-status'); return; }
    if (p === 'home' && activePage === 'home') { handleLogoClick(); return; } // refresh si déjà sur accueil
    navigate(p as Page);
  };

  const handleRoleSwitch = async () => {
    if (!currentUser || !userProfile) return;
    await updateUserProfile(currentUser.uid, { role: role === 'buyer' ? 'seller' : 'buyer' });
    setShowRoleSwitch(false);
    window.location.reload();
  };

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <main key={pageKey} style={{ animation: 'pageSlideIn 0.22s cubic-bezier(0.25,0.46,0.45,0.94) both' }}>
        {activePage === 'home' && (
          <HomePage
            onProductClick={handleProductClick}
            onProfileClick={() => navigate('profile')}
            onLogoClick={handleLogoClick}
            onNotificationsClick={() => navigate('notifications')}
            onOpenChatWithSeller={handleOpenChatWithSeller}
          />
        )}
        {activePage === 'product-detail' && selectedProduct && (
          <ProductDetailPage
            product={selectedProduct} onBack={goBack}
            onSellerClick={handleSellerClick}
            onStartChat={handleStartChat}
            onProductClick={handleProductClick}
            onBuyClick={(product) => { setOrderFlowProduct(product); navigate('order-flow'); }}
          />
        )}
        {activePage === 'seller-profile' && selectedSellerId && (
          <SellerProfilePage sellerId={selectedSellerId} onBack={goBack} onProductClick={handleProductClick} />
        )}
        {activePage === 'profile' && isBuyer && (
          <BuyerProfilePage onProductClick={handleProductClick} onNavigate={handleNavigate} />
        )}
        {activePage === 'profile' && !isBuyer && (
          <ProfilePage onProductClick={handleProductClick} onNavigate={handleNavigate} />
        )}
        {activePage === 'messages' && (
          <ConversationsListPage onOpenConversation={handleOpenConversation} />
        )}
        {activePage === 'chat' && selectedConversation && (
          <ChatPage
            conversation={selectedConversation}
            onBack={goBack}
            onProductClick={handleProductClick}
            onBuyAtPrice={(productRef, price) => {
              // Construire un objet product compatible avec OrderFlowPage depuis le productRef
              const productForOrder = {
                id: productRef.id,
                title: productRef.title,
                price: productRef.price,
                images: [productRef.image],
                sellerId: productRef.sellerId,
                sellerName: productRef.sellerName || '',
                sellerPhoto: productRef.sellerPhoto || '',
                neighborhood: productRef.neighborhood || '',
              };
              setOrderFlowProduct(productForOrder);
              setAcceptedOfferPrice(price);
              navigate('order-flow');
            }}
          />
        )}
        {activePage === 'edit-profile' && <EditProfilePage onBack={goBack} onSaved={goBack} />}
        {activePage === 'settings' && <SettingsPage onBack={goBack} onNavigate={handleNavigate} role={role} />}
        {activePage === 'verification' && <VerificationPage onBack={goBack} />}
        {activePage === 'support' && <SupportPage onBack={goBack} />}
        {activePage === 'cgu' && <CGUPage onBack={goBack} />}
        {activePage === 'privacy' && <PrivacyPage onBack={goBack} />}
        {activePage === 'terms' && <PrivacyPage onBack={goBack} isTerms />}
        {activePage === 'about' && <PrivacyPage onBack={goBack} isAbout />}
        {activePage === 'shop-customize' && <ShopCustomizePage onBack={goBack} onSaved={goBack} />}
        {activePage === 'dashboard' && (
          <DashboardPage
            onBack={goBack}
            onUpgrade={() => navigate('verification')}
            onEditProduct={(product: Product) => { setProductToEdit(product); navigate('edit-product'); }}
            onOpenOrder={(orderId: string) => { setSelectedOrderId(orderId); navigate('order-status'); }}
            onOpenChat={async (convId: string) => { await handleStartChat(convId); }}
          />
        )}
        {activePage === 'sell' && !isBuyer && (
          <SellPage onClose={() => handleBottomNavNavigate('home')} onSuccess={() => handleBottomNavNavigate('home')} />
        )}
        {activePage === 'notifications' && (
          <NotificationsPage
            onBack={goBack}
            onOpenConversation={async (convId) => { await handleStartChat(convId); }}
            onOpenOrder={(orderId) => { setSelectedOrderId(orderId); handleBottomNavNavigate('orders'); }}
          />
        )}
        {activePage === 'order-flow' && orderFlowProduct && (
          <OrderFlowPage
            product={orderFlowProduct}
            onBack={goBack}
            acceptedPrice={acceptedOfferPrice}
            onOrderCreated={(orderId) => { setAcceptedOfferPrice(undefined); setSelectedOrderId(orderId); navigate('order-status'); }}
          />
        )}
        {activePage === 'edit-product' && productToEdit && (
          <EditProductPage
            product={productToEdit}
            onBack={goBack}
            onSaved={() => { setProductToEdit(null); goBack(); }}
          />
        )}
        {activePage === 'order-status' && (
          <OrderStatusPage
            orderId={selectedOrderId || undefined}
            onBack={goBack}
            onOpenChatWithSeller={handleOpenChatWithSeller}
          />
        )}
        {activePage === 'referral' && (
          <ReferralPage onBack={goBack} />
        )}
        {activePage === 'guide' && (
          <GuidePage onBack={goBack} />
        )}
        {activePage === 'admin' && (
          <AdminPage onBack={goBack} />
        )}
      </main>

      {MAIN_PAGES.includes(activePage) && (
        <BottomNav activePage={activePage} onNavigate={handleBottomNavNavigate} role={role} unreadMessages={unreadMessages} />
      )}

      {showRoleSwitch && userProfile && (
        <RoleSwitchModal currentRole={role} onConfirm={handleRoleSwitch} onCancel={() => setShowRoleSwitch(false)} />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <PushNotifPrompt />

      {/* Onboarding 1er lancement */}
      {showOnboarding && <OnboardingScreen onDone={doneOnboarding} />}

      {/* Toast double appui pour quitter ── */}
      {showExitConfirm && (
        <div className="fixed bottom-28 left-4 right-4 z-[999] pointer-events-none flex justify-center">
          <div className="bg-slate-950 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl border-2 border-white/20">
            <span className="text-xl">👋</span>
            <p className="text-white text-[13px] font-black whitespace-nowrap tracking-tight">Appuie encore pour quitter</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AppContent — dispatcher auth / app ───────────────────────
// Ce composant ne contient AUCUN hook — juste du routing conditionnel


function AppContent() {
  const { currentUser, userProfile, loading } = useAuth();
  const [showAuth, setShowAuth] = React.useState(false);
  const [maintenance, setMaintenance] = React.useState<{active:boolean;message:string}|null>(null);

  // Vérifier le mode maintenance au démarrage
  React.useEffect(() => {
    import('firebase/firestore').then(({ doc, getDoc }) => {
      import('@/config/firebase').then(({ db }) => {
        getDoc(doc(db, 'system', 'settings')).then((snap: any) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.maintenanceMode) {
              setMaintenance({ active: true, message: data.maintenanceMessage || '🔧 Brumerie est en maintenance. Revenez bientôt !' });
            }
          }
        }).catch(() => {});
      });
    });
  }, []);

  // Mode maintenance — bloquer tous sauf admin
  if (maintenance?.active && currentUser?.uid !== ((import.meta as any).env?.VITE_ADMIN_UID || '__none__')) {
    return (
      <div className="min-h-screen flex items-center justify-center px-8" style={{ background: '#0F172A' }}>
        <div className="text-center">
          <div className="text-6xl mb-6">🔧</div>
          <h2 className="font-black text-white text-[22px] mb-3">Maintenance en cours</h2>
          <p className="text-slate-400 text-[14px] leading-relaxed">{maintenance.message}</p>
        </div>
      </div>
    );
  }

  // Pendant le chargement initial Firebase
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-green-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Chargement…</p>
        </div>
      </div>
    );
  }

  // Pas connecté → mode visiteur avec accès limité
  // Le visiteur peut voir l'accueil, les articles et les profils vendeurs
  // Mais est invité à se connecter pour les actions
  if (!currentUser) {
    // showAuth = true → forcer l'affichage de la page de connexion
    if (showAuth) return <AuthGate />;
    return <GuestShell onAuthRequired={() => setShowAuth(true)} />;
  }

  // Connecté mais rôle manquant → sélection du rôle
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

  // Authentifié + rôle ok → application complète
  return <AppShell />;
}

export default function App() {
  // Débloquer AudioContext iOS au premier touch
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
      <AuthProvider><AppContent /></AuthProvider>
    </ErrorBoundary>
  );
}
