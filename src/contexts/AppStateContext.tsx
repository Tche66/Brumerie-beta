import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Product, Conversation } from '@/types';
import { subscribeTotalUnread, getOrCreateConversation } from '@/services/messagingService';
import { subscribeOrdersAsSeller } from '@/services/orderService';
import { updatePresence } from '@/services/shopFeaturesService';
import { updateUserProfile, addRecentlyViewed, getUserById } from '@/services/userService';
import { subscribeToNotifications } from '@/services/notificationService';
import { playMessageSound, playSystemSound } from '@/services/soundService';
import { getCartCount } from '@/services/cartService';
import { getDoc, doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface AppState {
  selectedProduct: Product | null;
  selectedSellerId: string | null;
  selectedConversation: Conversation | null;
  productToEdit: Product | null;
  orderFlowProduct: any;
  storyOfferProduct: any;
  acceptedOfferPrice: number | undefined;
  selectedOrderId: string;
  selectedDelivererId: string | null;
  showRoleSwitch: boolean;
  showNeighborhoodModal: boolean;
  unreadMessages: number;
  pendingDashboard: number;
  activeMissions: number;
  cartCount: number;
}

interface AppActions {
  handleProductClick: (product: Product) => void;
  handleSellerClick: (sellerId: string) => void;
  handleOpenConversation: (conv: Conversation) => void;
  handleStartChat: (convId: string) => Promise<void>;
  handleOpenChatWithSeller: (sellerId: string, sellerName: string, productId?: string, productTitle?: string) => Promise<void>;
  handleNavigate: (page: string) => void;
  handleRoleSwitch: () => Promise<void>;
  handleLogoClick: () => void;
  goBack: () => void;
  setSelectedProduct: (p: Product | null) => void;
  setSelectedSellerId: (id: string | null) => void;
  setSelectedConversation: (c: Conversation | null) => void;
  setProductToEdit: (p: Product | null) => void;
  setOrderFlowProduct: (p: any) => void;
  setStoryOfferProduct: (p: any) => void;
  setAcceptedOfferPrice: (price: number | undefined) => void;
  setSelectedOrderId: (id: string) => void;
  setSelectedDelivererId: (id: string | null) => void;
  setShowRoleSwitch: (show: boolean) => void;
  setShowNeighborhoodModal: (show: boolean) => void;
}

type AppStateContextType = AppState & AppActions & {
  role: 'buyer' | 'seller' | 'livreur';
  isBuyer: boolean;
  toasts: any[];
  showToast: (t: any) => void;
  dismissToast: (id: string) => void;
};

const AppStateContext = createContext<AppStateContextType | null>(null);

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

const PAGE_TO_PATH: Record<string, string> = {
  home: '/',
  discover: '/explorer',
  messages: '/messages',
  profile: '/profil',
  settings: '/parametres',
  sell: '/publier',
  'order-status': '/commandes',
  dashboard: '/tableau',
  notifications: '/notifications',
  cart: '/panier',
  'edit-profile': '/edit-profil',
  verification: '/verification',
  support: '/support',
  cgu: '/cgu',
  privacy: '/confidentialite',
  terms: '/conditions',
  about: '/a-propos',
  'shop-customize': '/personnaliser-boutique',
  'order-flow': '/commander',
  referral: '/parrainage',
  guide: '/guide',
  admin: '/admin',
  compta: '/compta',
  dettes: '/dettes',
  marge: '/marge',
  'carnet-clients': '/carnet-clients',
  catalogue: '/catalogue',
  rapport: '/rapport',
  suggestions: '/suggestions',
  trust: '/trust',
  'become-deliverer': '/devenir-livreur',
  'deliverer-dashboard': '/livreur',
  'deliverers-list': '/livreurs',
  'brume-ia': '/brume-ia',
  affiliate: '/affiliation',
  'edit-product': '/modifier-produit',
  chat: '/chat',
};

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile } = useAuth();
  const { toasts, showToast, dismissToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [_productHistory, setProductHistory] = useState<Product[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [orderFlowProduct, setOrderFlowProduct] = useState<any>(null);
  const [storyOfferProduct, setStoryOfferProduct] = useState<any>(null);
  const [acceptedOfferPrice, setAcceptedOfferPrice] = useState<number | undefined>(undefined);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedDelivererId, setSelectedDelivererId] = useState<string | null>(null);
  const [showRoleSwitch, setShowRoleSwitch] = useState(false);
  const [showNeighborhoodModal, setShowNeighborhoodModal] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingDashboard, setPendingDashboard] = useState(0);
  const [activeMissions, setActiveMissions] = useState(0);
  const [cartCount, setCartCount] = useState(() => getCartCount());

  const prevNotifsRef = useRef<Set<string>>(new Set());

  const role = (userProfile?.role || 'buyer') as 'buyer' | 'seller' | 'livreur';
  const isBuyer = role === 'buyer';

  const navTo = useCallback((page: string, extra?: { productId?: string; sellerId?: string }) => {
    let path = PAGE_TO_PATH[page];
    if (!path) path = `/${page}`;
    if (page === 'product-detail' && extra?.productId) path = `/p/${extra.productId}`;
    if (page === 'seller-profile' && extra?.sellerId) path = `/vendeur/${extra.sellerId}`;
    if (page === 'deliverer-profile' && extra?.sellerId) path = `/livreur/${extra.sellerId}`;
    navigate(path);
  }, [navigate]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleLogoClick = useCallback(() => {
    setSelectedProduct(null);
    setSelectedSellerId(null);
    navigate('/');
    window.scrollTo(0, 0);
  }, [navigate]);

  const handleProductClick = useCallback((product: Product) => {
    if (selectedProduct) {
      setProductHistory(prev => [...prev, selectedProduct]);
    }
    setSelectedProduct(product);
    navigate(`/p/${product.id}`);
    if (currentUser?.uid) {
      addRecentlyViewed(currentUser.uid, product.id).catch(() => {});
    }
  }, [selectedProduct, currentUser?.uid, navigate]);

  const handleSellerClick = useCallback((sellerId: string) => {
    if (currentUser?.uid === sellerId) {
      navigate('/profil');
      return;
    }
    setSelectedSellerId(sellerId);
    navigate(`/vendeur/${sellerId}`);
  }, [currentUser?.uid, navigate]);

  const handleStartChat = useCallback(async (convId: string) => {
    const snap = await getDoc(doc(db, 'conversations', convId));
    if (snap.exists()) {
      setSelectedConversation({ id: snap.id, ...snap.data() } as Conversation);
      navigate('/chat');
    }
  }, [navigate]);

  const handleOpenConversation = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
    navigate('/chat');
  }, [navigate]);

  const handleOpenChatWithSeller = useCallback(async (
    sellerId: string, sellerName: string, productId?: string, productTitle?: string
  ) => {
    if (!currentUser || !userProfile) return;
    if (currentUser.uid === sellerId) return;
    try {
      const sellerData = await getUserById(sellerId);
      const directId = productId || [currentUser.uid, sellerId].sort().join('_direct_');
      const convId = await getOrCreateConversation(
        currentUser.uid, sellerId,
        { id: directId, title: productTitle || 'Contact direct', price: 0, image: '', neighborhood: '' },
        userProfile.name, sellerName || sellerData?.name || 'Vendeur',
        userProfile.photoURL, sellerData?.photoURL || undefined,
      );
      await handleStartChat(convId);
    } catch (e) { console.error('[Chat direct]', e); }
  }, [currentUser, userProfile, handleStartChat]);

  const handleNavigate = useCallback((p: string) => {
    if (p === 'switch-to-seller' || p === 'switch-to-buyer') { setShowRoleSwitch(true); return; }
    if (p === 'orders') { setSelectedOrderId(''); navTo('order-status'); return; }
    if (p === 'home' && location.pathname === '/') { handleLogoClick(); return; }
    navTo(p);
  }, [navTo, location.pathname, handleLogoClick]);

  const handleRoleSwitch = useCallback(async () => {
    if (!currentUser || !userProfile) return;
    await updateUserProfile(currentUser.uid, { role: role === 'buyer' ? 'seller' : 'buyer' });
    setShowRoleSwitch(false);
    window.location.reload();
  }, [currentUser, userProfile, role]);

  // Scroll top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Unread messages subscription
  useEffect(() => {
    if (!currentUser) return;
    return subscribeTotalUnread(currentUser.uid, setUnreadMessages);
  }, [currentUser?.uid]);

  // Dashboard badge (seller)
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    if (userProfile.role === 'seller') {
      return subscribeOrdersAsSeller(currentUser.uid, (orders) => {
        const active = orders.filter(o =>
          !['delivered', 'cod_delivered', 'cancelled', 'disputed'].includes(o.status)
        ).length;
        setPendingDashboard(active);
      });
    }
    return undefined;
  }, [currentUser?.uid, userProfile?.role]);

  // Deliverer active missions
  useEffect(() => {
    if (!currentUser || userProfile?.role !== 'livreur') return;
    const qr = query(collection(db, 'orders'), where('delivererId', '==', currentUser.uid));
    const unsub = onSnapshot(qr, (snap) => {
      const active = snap.docs.filter((d) => {
        const s = d.data().status;
        return !['delivered', 'cod_delivered', 'cancelled'].includes(s);
      }).length;
      setActiveMissions(active);
    }, () => {});
    return unsub;
  }, [currentUser?.uid, userProfile?.role]);

  // Presence
  useEffect(() => {
    if (!currentUser) return;
    updatePresence(currentUser.uid).catch(() => {});
    const t = setInterval(() => updatePresence(currentUser.uid).catch(() => {}), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [currentUser?.uid]);

  // Cart count
  useEffect(() => {
    const handler = () => setCartCount(getCartCount());
    window.addEventListener('cart-updated', handler);
    return () => window.removeEventListener('cart-updated', handler);
  }, []);

  // Notifications
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

  // Google onboarding modal
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    const needsOnboarding = (userProfile as any).needsOnboarding
      || ((userProfile as any).authProvider === 'google' && (!userProfile.neighborhood || !userProfile.phone));
    if (needsOnboarding) {
      const t = setTimeout(() => setShowNeighborhoodModal(true), 600);
      return () => clearTimeout(t);
    }
  }, [currentUser?.uid, (userProfile as any)?.needsOnboarding, userProfile?.neighborhood, userProfile?.phone]);

  // Redirect livreur
  useEffect(() => {
    if (!userProfile || userProfile.role !== 'livreur') return;
    const nonDelivererPaths = ['/', '/tableau', '/publier', '/explorer', '/profil', '/devenir-livreur'];
    if (nonDelivererPaths.includes(location.pathname)) {
      const t = setTimeout(() => navigate('/livreur'), 300);
      return () => clearTimeout(t);
    }
  }, [userProfile?.role, location.pathname, navigate]);

  // Boost/badge expiry check (placeholder for future implementation)
  useEffect(() => {
    if (!currentUser?.uid || !userProfile) return;
    // checkAndNotifyExpiringBoosts / checkAndNotifyExpiringBadge removed — not yet implemented
  }, [currentUser?.uid, userProfile?.isVerified, userProfile?.role]);

  // AW address reminder
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    const key = `aw_prompt_${currentUser.uid}`;
    if (localStorage.getItem(key)) return;
    if (!userProfile.awAddressCode) {
      const timer = setTimeout(async () => {
        try {
          const { createNotification } = await import('@/services/notificationService');
          await createNotification(
            currentUser.uid, 'system',
            "\u{1F4CD} Tu n'as pas encore d'adresse numérique",
            "Crée ton code Address-Web gratuit pour recevoir tes livraisons n'importe où en Afrique.",
          );
          localStorage.setItem(key, '1');
        } catch { /* silent */ }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.uid, userProfile?.awAddressCode]);

  const value: AppStateContextType = {
    selectedProduct, selectedSellerId, selectedConversation, productToEdit,
    orderFlowProduct, storyOfferProduct, acceptedOfferPrice, selectedOrderId,
    selectedDelivererId, showRoleSwitch, showNeighborhoodModal,
    unreadMessages, pendingDashboard, activeMissions, cartCount,
    role, isBuyer, toasts, showToast, dismissToast,
    handleProductClick, handleSellerClick, handleOpenConversation, handleStartChat,
    handleOpenChatWithSeller, handleNavigate, handleRoleSwitch, handleLogoClick, goBack,
    setSelectedProduct, setSelectedSellerId, setSelectedConversation, setProductToEdit,
    setOrderFlowProduct, setStoryOfferProduct, setAcceptedOfferPrice, setSelectedOrderId,
    setSelectedDelivererId, setShowRoleSwitch, setShowNeighborhoodModal,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
