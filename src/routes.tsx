import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const SellerProfilePage = lazy(() => import('@/pages/SellerProfilePage').then(m => ({ default: m.SellerProfilePage })));
const BuyerProfilePage = lazy(() => import('@/pages/BuyerProfilePage').then(m => ({ default: m.BuyerProfilePage })));
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage').then(m => ({ default: m.DiscoverPage })));
const ConversationsListPage = lazy(() => import('@/pages/ConversationsListPage').then(m => ({ default: m.ConversationsListPage })));
const ChatPage = lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })));
const BrumeIAPage = lazy(() => import('@/pages/BrumeIAPage').then(m => ({ default: m.BrumeIAPage })));
const SellPage = lazy(() => import('@/pages/SellPage').then(m => ({ default: m.SellPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const OrderFlowPage = lazy(() => import('@/pages/OrderFlowPage').then(m => ({ default: m.OrderFlowPage })));
const OrderStatusPage = lazy(() => import('@/pages/OrderStatusPage').then(m => ({ default: m.OrderStatusPage })));
const CartPage = lazy(() => import('@/pages/CartPage').then(m => ({ default: m.CartPage })));
const EditProfilePage = lazy(() => import('@/pages/EditProfilePage').then(m => ({ default: m.EditProfilePage })));
const EditProductPage = lazy(() => import('@/pages/EditProductPage').then(m => ({ default: m.EditProductPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const VerificationPage = lazy(() => import('@/pages/VerificationPage').then(m => ({ default: m.VerificationPage })));
const SupportPage = lazy(() => import('@/pages/SupportPage').then(m => ({ default: m.SupportPage })));
const CGUPage = lazy(() => import('@/pages/CGUPage').then(m => ({ default: m.CGUPage })));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ShopCustomizePage = lazy(() => import('@/pages/ShopCustomizePage').then(m => ({ default: m.ShopCustomizePage })));
const ReferralPage = lazy(() => import('@/pages/ReferralPage').then(m => ({ default: m.ReferralPage })));
const GuidePage = lazy(() => import('@/pages/GuidePage').then(m => ({ default: m.GuidePage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })));
const ComptaPage = lazy(() => import('@/pages/ComptaPage').then(m => ({ default: m.ComptaPage })));
const DettesPage = lazy(() => import('@/pages/DettesPage').then(m => ({ default: m.DettesPage })));
const MargeCalculatorPage = lazy(() => import('@/pages/MargeCalculatorPage').then(m => ({ default: m.MargeCalculatorPage })));
const CarnetClientsPage = lazy(() => import('@/pages/CarnetClientsPage').then(m => ({ default: m.CarnetClientsPage })));
const CataloguePage = lazy(() => import('@/pages/CataloguePage').then(m => ({ default: m.CataloguePage })));
const RapportPage = lazy(() => import('@/pages/RapportPage').then(m => ({ default: m.RapportPage })));
const SuggestionsPage = lazy(() => import('@/pages/SuggestionsPage').then(m => ({ default: m.SuggestionsPage })));
const TrustPage = lazy(() => import('@/pages/TrustPage').then(m => ({ default: m.TrustPage })));
const BecomeDelivererPage = lazy(() => import('@/pages/BecomeDelivererPage').then(m => ({ default: m.BecomeDelivererPage })));
const DelivererDashboardPage = lazy(() => import('@/pages/DelivererDashboardPage').then(m => ({ default: m.DelivererDashboardPage })));
const DelivererProfilePage = lazy(() => import('@/pages/DelivererProfilePage').then(m => ({ default: m.DelivererProfilePage })));
const DeliverersListPage = lazy(() => import('@/pages/DeliverersListPage').then(m => ({ default: m.DeliverersListPage })));
const AffiliatePage = lazy(() => import('@/pages/AffiliatePage').then(m => ({ default: m.AffiliatePage })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-3 border-slate-100 border-t-green-600 rounded-full animate-spin" />
    </div>
  );
}

function HomeRoute() {
  const app = useAppState();

  return (
    <HomePage
      onProductClick={app.handleProductClick}
      onSellerClick={app.handleSellerClick}
      onProfileClick={() => app.handleNavigate('profile')}
      onLogoClick={app.handleLogoClick}
      onNotificationsClick={() => app.handleNavigate('notifications')}
      onOpenChatWithSeller={app.handleOpenChatWithSeller}
      onNavigateToVerification={() => app.handleNavigate('verification')}
      onNavigateToChat={() => app.handleNavigate('messages')}
      onSwitchToSeller={() => app.setShowRoleSwitch(true)}
      onOrderFromStory={async (productRef: any, sellerId: string, sellerName: string) => {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/config/firebase');
          const snap = await getDoc(doc(db, 'products', productRef.id));
          const fullProduct = snap.exists()
            ? { id: snap.id, ...snap.data() }
            : { id: productRef.id, title: productRef.title, price: productRef.price,
                images: productRef.imageUrl ? [productRef.imageUrl] : [],
                sellerId, sellerName, neighborhood: '' };
          app.setOrderFlowProduct(fullProduct);
          app.handleNavigate('order-flow');
        } catch {
          app.setOrderFlowProduct({ id: productRef.id, title: productRef.title, price: productRef.price,
            images: productRef.imageUrl ? [productRef.imageUrl] : [],
            sellerId, sellerName, neighborhood: '' });
          app.handleNavigate('order-flow');
        }
      }}
      onBuyClick={(product: any) => { app.setOrderFlowProduct(product); app.handleNavigate('order-flow'); }}
      onOfferClick={(product: any) => { app.setStoryOfferProduct(product); }}
      onOfferFromStory={async (productRef: any, sellerId: string, sellerName: string) => {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/config/firebase');
          const snap = await getDoc(doc(db, 'products', productRef.id));
          const fullProduct = snap.exists()
            ? { id: snap.id, ...snap.data() }
            : { id: productRef.id, title: productRef.title, price: productRef.price,
                images: productRef.imageUrl ? [productRef.imageUrl] : [],
                sellerId, sellerName, neighborhood: '' };
          app.setStoryOfferProduct(fullProduct);
        } catch {
          app.setStoryOfferProduct({ id: productRef.id, title: productRef.title, price: productRef.price,
            images: productRef.imageUrl ? [productRef.imageUrl] : [],
            sellerId, sellerName, neighborhood: '' });
        }
      }}
    />
  );
}

function ProfileRoute() {
  const { currentUser } = useAuth();
  const app = useAppState();

  if (app.isBuyer) {
    return (
      <BuyerProfilePage
        onProductClick={app.handleProductClick}
        onNavigate={app.handleNavigate}
        onOpenOrder={(id: string) => { app.setSelectedOrderId(id); app.handleNavigate('order-status'); }}
        onSellerClick={app.handleSellerClick}
      />
    );
  }

  if (!currentUser) return null;
  return (
    <SellerProfilePage
      sellerId={currentUser.uid}
      onBack={app.goBack}
      onProductClick={app.handleProductClick}
      onStartChat={(sid: string, sname: string) => app.handleOpenChatWithSeller(sid, sname, undefined, 'Contact direct')}
      onEditProduct={(product: Product) => { app.setProductToEdit(product); app.handleNavigate('edit-product'); }}
      onNavigate={app.handleNavigate}
      isGuest={false}
    />
  );
}

export function AppRoutes() {
  const app = useAppState();
  const { currentUser, userProfile, refreshUserProfile } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/explorer" element={
          <DiscoverPage
            onProductClick={app.handleProductClick}
            onSellerClick={(sellerId: string) => app.handleSellerClick(sellerId)}
          />
        } />
        <Route path="/profil" element={<ProfileRoute />} />
        <Route path="/p/:productId" element={
          app.selectedProduct ? (
            <ProductDetailPage
              product={app.selectedProduct}
              onBack={app.goBack}
              onSellerClick={app.handleSellerClick}
              onStartChat={app.handleStartChat}
              onProductClick={app.handleProductClick}
              onBuyClick={(product: any) => { app.setOrderFlowProduct(product); app.handleNavigate('order-flow'); }}
            />
          ) : <HomeRoute />
        } />
        <Route path="/vendeur/:sellerId" element={
          app.selectedSellerId ? (
            <SellerProfilePage
              sellerId={app.selectedSellerId}
              onBack={app.goBack}
              onProductClick={app.handleProductClick}
              onStartChat={(sid: string, sname: string) => app.handleOpenChatWithSeller(sid, sname, undefined, 'Contact direct')}
              onEditProduct={(product: Product) => { app.setProductToEdit(product); app.handleNavigate('edit-product'); }}
              onNavigate={app.handleNavigate}
              isGuest={!currentUser}
              onGuestAction={() => { app.handleNavigate('auth'); }}
              onSellerClick={app.handleSellerClick}
            />
          ) : <HomeRoute />
        } />
        <Route path="/messages" element={
          <ConversationsListPage
            onOpenConversation={app.handleOpenConversation}
            onOpenBrumeIA={() => app.handleNavigate('brume-ia')}
            onOpenConversationById={async (convId: string) => {
              const { getDoc, doc } = await import('firebase/firestore');
              const { db } = await import('@/config/firebase');
              const snap = await getDoc(doc(db, 'conversations', convId));
              if (snap.exists()) {
                app.handleOpenConversation({ id: snap.id, ...snap.data() } as any);
              }
            }}
          />
        } />
        <Route path="/chat" element={
          app.selectedConversation ? (
            <ChatPage
              conversation={app.selectedConversation}
              onBack={app.goBack}
              onProductClick={app.handleProductClick}
              onBuyAtPrice={(productRef: any, price: number) => {
                const productForOrder = {
                  id: productRef.id, title: productRef.title, price: productRef.price,
                  images: [productRef.image], sellerId: productRef.sellerId,
                  sellerName: productRef.sellerName || '', sellerPhoto: productRef.sellerPhoto || '',
                  neighborhood: productRef.neighborhood || '',
                };
                app.setOrderFlowProduct(productForOrder);
                app.setAcceptedOfferPrice(price);
                app.handleNavigate('order-flow');
              }}
            />
          ) : <HomeRoute />
        } />
        <Route path="/brume-ia" element={
          <BrumeIAPage
            onBack={app.goBack}
            onAction={(action: any) => {
              if (action.type === 'navigate' && action.payload?.page) {
                app.handleNavigate(action.payload.page);
              }
            }}
          />
        } />
        <Route path="/publier" element={
          <SellPage onClose={() => app.handleNavigate('home')} onSuccess={() => app.handleNavigate('home')} />
        } />
        <Route path="/tableau" element={
          <DashboardPage
            onBack={app.goBack}
            onUpgrade={() => app.handleNavigate('verification')}
            onEditProduct={(product: Product) => { app.setProductToEdit(product); app.handleNavigate('edit-product'); }}
            onOpenOrder={(orderId: string) => { app.setSelectedOrderId(orderId); app.handleNavigate('order-status'); }}
            onOpenChat={async (convId: string) => { await app.handleStartChat(convId); }}
            onNavigate={(page: string) => app.handleNavigate(page)}
          />
        } />
        <Route path="/commander" element={
          app.orderFlowProduct ? (
            <OrderFlowPage
              product={app.orderFlowProduct}
              onBack={app.goBack}
              acceptedPrice={app.acceptedOfferPrice}
              onOrderCreated={(orderId: string) => { app.setAcceptedOfferPrice(undefined); app.setSelectedOrderId(orderId); app.handleNavigate('order-status'); }}
            />
          ) : <HomeRoute />
        } />
        <Route path="/commandes" element={
          <OrderStatusPage
            orderId={app.selectedOrderId || undefined}
            onBack={app.goBack}
            onOpenChatWithSeller={app.handleOpenChatWithSeller}
          />
        } />
        <Route path="/panier" element={
          <CartPage
            onBack={app.goBack}
            onNavigateToOrders={() => app.handleNavigate('order-status')}
            onBuyClick={(cartItems: any[], _sellerId: string) => {
              const first = cartItems[0];
              if (!first) return;
              const product = {
                id: first.productId,
                title: cartItems.length === 1 ? first.title : `${cartItems.length} articles`,
                price: cartItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0),
                images: [first.image], sellerId: first.sellerId,
                sellerName: first.sellerName, sellerPhoto: first.sellerPhoto,
                neighborhood: first.neighborhood,
              };
              app.setOrderFlowProduct(product);
              app.handleNavigate('order-flow');
            }}
            onProductClick={(productId: string) => {
              import('firebase/firestore').then(({ getDoc, doc }) => {
                import('@/config/firebase').then(({ db }) => {
                  getDoc(doc(db, 'products', productId)).then(snap => {
                    if (snap.exists()) {
                      app.handleProductClick({ id: snap.id, ...snap.data() } as any);
                    }
                  });
                });
              });
            }}
            onSellerClick={app.handleSellerClick}
          />
        } />
        <Route path="/notifications" element={
          <NotificationsPage
            onBack={app.goBack}
            onOpenConversation={async (convId: string) => { await app.handleStartChat(convId); }}
            onOpenOrder={(orderId: string) => {
              app.setSelectedOrderId(orderId);
              if (userProfile?.role === 'livreur') {
                app.handleNavigate('deliverer-dashboard');
              } else {
                app.handleNavigate('order-status');
              }
            }}
          />
        } />
        <Route path="/edit-profil" element={<EditProfilePage onBack={app.goBack} onSaved={app.goBack} />} />
        <Route path="/modifier-produit" element={
          app.productToEdit ? <EditProductPage product={app.productToEdit} onBack={app.goBack} onSaved={() => { app.setProductToEdit(null); app.goBack(); }} /> : <HomeRoute />
        } />
        <Route path="/parametres" element={<SettingsPage onBack={app.goBack} onNavigate={app.handleNavigate} role={app.role === 'livreur' ? 'buyer' : app.role} />} />
        <Route path="/verification" element={<VerificationPage onBack={app.goBack} />} />
        <Route path="/support" element={<SupportPage onBack={app.goBack} />} />
        <Route path="/cgu" element={<CGUPage onBack={app.goBack} />} />
        <Route path="/confidentialite" element={<PrivacyPage onBack={app.goBack} />} />
        <Route path="/conditions" element={<PrivacyPage onBack={app.goBack} isTerms />} />
        <Route path="/a-propos" element={<PrivacyPage onBack={app.goBack} />} />
        <Route path="/personnaliser-boutique" element={<ShopCustomizePage onBack={app.goBack} onSaved={app.goBack} />} />
        <Route path="/parrainage" element={<ReferralPage onBack={app.goBack} />} />
        <Route path="/guide" element={<GuidePage onBack={app.goBack} />} />
        <Route path="/admin" element={
          <AdminPage
            onBack={app.goBack}
            onContact={async (userId: string, userName: string) => {
              await app.handleOpenChatWithSeller(userId, userName, userId, 'Contact Admin');
              app.goBack();
            }}
            onSellerClick={(sellerId: string) => app.handleSellerClick(sellerId)}
          />
        } />
        <Route path="/compta" element={
          <ComptaPage
            onBack={app.goBack}
            onOpenChat={(uid: string, name: string) => app.handleOpenChatWithSeller(uid, name, undefined, 'Contact comptabilité')}
            onNavigate={app.handleNavigate}
          />
        } />
        <Route path="/dettes" element={
          <DettesPage onBack={app.goBack} onOpenChat={(uid: string, name: string) => app.handleOpenChatWithSeller(uid, name, undefined, 'Rappel dette')} />
        } />
        <Route path="/marge" element={<MargeCalculatorPage onBack={app.goBack} />} />
        <Route path="/carnet-clients" element={
          <CarnetClientsPage onBack={app.goBack} onOpenChat={(uid: string, name: string) => app.handleOpenChatWithSeller(uid, name, undefined, 'Contact client')} />
        } />
        <Route path="/catalogue" element={<CataloguePage onBack={app.goBack} />} />
        <Route path="/rapport" element={<RapportPage onBack={app.goBack} />} />
        <Route path="/suggestions" element={<SuggestionsPage onBack={app.goBack} />} />
        <Route path="/trust" element={<TrustPage onBack={app.goBack} />} />
        <Route path="/devenir-livreur" element={
          <BecomeDelivererPage
            onBack={app.goBack}
            onDone={async () => {
              await refreshUserProfile();
              app.handleNavigate('deliverer-dashboard');
            }}
          />
        } />
        <Route path="/livreur" element={
          <DelivererDashboardPage
            onNavigate={app.handleNavigate}
            onChat={async (targetId: string, targetName: string) => {
              await app.handleOpenChatWithSeller(targetId, targetName, targetId, 'Contact Brumerie');
            }}
          />
        } />
        <Route path="/livreur/:delivererId" element={
          app.selectedDelivererId ? <DelivererProfilePage delivererId={app.selectedDelivererId} onBack={app.goBack} /> : <HomeRoute />
        } />
        <Route path="/livreurs" element={
          <DeliverersListPage
            onBack={app.goBack}
            onDelivererClick={(id: string) => { app.setSelectedDelivererId(id); app.handleNavigate('deliverer-profile'); }}
            onContact={async (id: string, name: string) => { await app.handleOpenChatWithSeller(id, name, id, 'Contact livreur'); }}
          />
        } />
        <Route path="/affiliation" element={<AffiliatePage onBack={app.goBack} />} />
        {/* Fallback */}
        <Route path="*" element={<HomeRoute />} />
      </Routes>
    </Suspense>
  );
}
