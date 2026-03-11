// src/types.ts — Sprint 7

// ─── QUARTIERS ───────────────────────────────────────────
export const NEIGHBORHOODS = [
  'Yopougon','Cocody','Abobo','Adjamé','Plateau','Marcory','Treichville',
  'Koumassi','Port-Bouët','Attécoubé','Bingerville','Songon','Jacqueville',
  'Braffedon','Deux-Plateaux','Riviera','Angré','Bonoumin',
  'Palmeraie','Sogefiha','Williamsville','Gbagba','Avocatier','Biabou',
  'Locodjro','Selmer','Belleville','Niangon','Sideci','Doukouré',
  'Wassakara','Sagbé','Ancien Agban','Banco','Baoulé','Belleville-Yop',
  'Dar-es-Salam','Doukouré Sud','Gesco',
];

export const CITIES = ['Abidjan','Bouaké','Yamoussoukro','San-Pédro','Korhogo'];
const MAX_CITIES = 3;
export { MAX_CITIES };

// ─── CATÉGORIES ──────────────────────────────────────────
export const CATEGORIES = [
  { id: 'fashion',      label: 'Mode & Prêt-à-porter',    icon: '👗' },
  { id: 'thrift',       label: 'Friperie & Yougouyougou',  icon: '🛍️' },
  { id: 'shoes',        label: 'Chaussures & Sneakers',   icon: '👟' },
  { id: 'beauty',       label: 'Beauté & Mèches',         icon: '💇‍♀️' },
  { id: 'phones',       label: 'High-Tech & Smartphones', icon: '📱' },
  { id: 'accessories',  label: 'Accessoires & Montres',   icon: '⌚' },
  { id: 'electronics',  label: 'Électroménager',          icon: '📺' },
  { id: 'food',         label: 'Alimentation & Épicerie', icon: '🧺' },
  { id: 'babies',       label: 'Univers Bébé',            icon: '🍼' },
  { id: 'furniture',    label: 'Maison & Déco',           icon: '🖼️' },
];

// ─── PAIEMENT MOBILE ──────────────────────────────────────
export const MOBILE_PAYMENT_METHODS = [
  { id: 'wave',  name: 'Wave',             logo: '/assets/payments/wave.png',   color: '#1BA6F9' },
  { id: 'om',    name: 'Orange Money',     logo: '/assets/payments/orange.png', color: '#FF7900' },
  { id: 'mtn',   name: 'MTN Mobile Money', logo: '/assets/payments/mtn.jpg',    color: '#FFCC00' },
  { id: 'moov',  name: 'Moov Money',       logo: '/assets/payments/moov.png',   color: '#FF6B00' },
];

export const BRUMERIE_FEE_PERCENT = 0; // MVP — pas de commission
export const SUPPORT_EMAIL = 'support@brumerie.com';
export const CONTACT_EMAIL = 'contact@brumerie.com';
export const SUPPORT_WHATSAPP = '2250586867693';
export const VERIFICATION_PRICE = 3000; // FCFA/mois — badge VÉRIFIÉ
export const PREMIUM_PRICE = 5000;      // FCFA/mois — badge PREMIUM (futur)

// Limites par plan
// ─── PALIERS DE PARRAINAGE ───────────────────────────────────
export const REFERRAL_REWARDS = [
  { threshold: 10, label: '10 invités', extraPublications: 1, extraChats: 0, freeVerified: false,
    description: '+1 publication par mois' },
  { threshold: 15, label: '15 invités', extraPublications: 1, extraChats: 1, freeVerified: false,
    description: '+1 publication + +1 conversation/jour' },
  { threshold: 20, label: '20 invités', extraPublications: 2, extraChats: 1, freeVerified: false,
    description: '+2 publications + +1 conversation/jour' },
  { threshold: 30, label: '30 invités', extraPublications: 3, extraChats: 2, freeVerified: false,
    description: '+3 publications + +2 conversations/jour' },
  { threshold: 50, label: '50 invités', extraPublications: 5, extraChats: 3, freeVerified: true,
    description: 'Badge Vérifié offert 1 mois + +5 publications' },
];

export const PLAN_LIMITS = {
  simple:   { products: 5,  dailyChats: 5,  boost: 0   },
  verified: { products: 20, dailyChats: 999, boost: 20  },
  premium:  { products: 999, dailyChats: 999, boost: 100 },
} as const;

// ─── USER ─────────────────────────────────────────────────
export interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  neighborhood?: string;
  photoURL?: string;
  role: 'buyer' | 'seller' | 'livreur';
  isVerified?: boolean;
  isPremium?: boolean;
  tier?: 'simple' | 'verified' | 'premium';   // Plan actuel du vendeur
  dailyChatCount?: number;    // Compteur chats du jour (reset à minuit)
  lastChatReset?: string;     // Date ISO du dernier reset
  productCount?: number;      // Nb d'articles actifs (pour limite)
  hasPhysicalShop?: boolean;
  managesDelivery?: boolean;
  bio?: string;
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    twitter?: string;
  };
  rating?: number;
  reviewCount?: number;
  contactCount?: number;
  bookmarkedProductIds: string[];
  defaultPaymentMethods?: PaymentInfo[];
  deliveryPriceSameZone?: number;
  deliveryPriceOtherZone?: number;
  // ─── Livreur partenaire ───────────────────────────────────
  deliveryPartnerName?: string;   // ex: "Kouassi Express"
  deliveryPartnerPhone?: string;  // ex: "+225 07 12 34 56" (WhatsApp)
  // Champs spécifiques au rôle livreur
  deliveryZones?: string[];        // Max 2 quartiers couverts
  deliveryRates?: DeliveryRate[];  // Tarifs propres du livreur
  deliveryBio?: string;            // ex: "Livraison rapide Cocody/Plateau"
  deliveryAvailable?: boolean;     // Disponible ou pas
  totalDeliveries?: number;        // Nb livraisons effectuées
  totalEarnings?: number;          // Gains cumulés (FCFA)
  createdAt?: any;
  // Sprint 7 — Boutique personnalisable
  shopThemeColor?: string;   // ex: '#16A34A'
  shopBanner?: string;       // URL image bannière
  shopSlogan?: string;       // ex: "La mode à prix imbattable"
  // ─── Parrainage ──────────────────────────────────────────
  referralCode?: string;     // Code unique ex: "KOFFI-X7K2"
  referredBy?: string;       // UID du parrain
  referralCount?: number;    // Nombre d'invités actifs
  referralBonusPublications?: number; // Publications bonus obtenues
  referralBonusChats?: number;        // Chats bonus obtenus
  referralFreeVerifiedUntil?: any;    // Badge Vérifié offert jusqu'à (Date)
  // ─── Vérification email OTP ──────────────────────────────
  emailVerified?: boolean;   // Email vérifié par OTP
  otpCode?: string;          // Code OTP temporaire (stocké hashé)
  otpExpires?: any;          // Expiration OTP
}

// ─── PRODUCT ──────────────────────────────────────────────
export type ProductStatus = 'active' | 'sold' | 'paused';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;   // Prix avant réduction (optionnel)
  condition?: 'new' | 'like_new' | 'second_hand';  // État du produit
  quantity?: number;        // Quantité disponible (1 par défaut)
  category: string;
  neighborhood: string;
  neighborhoods?: string[];
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerPhone?: string;
  sellerPhoto?: string;
  sellerVerified?: boolean;
  sellerPremium?: boolean;
  status: ProductStatus;
  whatsappClickCount?: number;
  viewCount?: number;
  bookmarkCount?: number;
  priceHistory?: { price: number; date: string }[];
  createdAt?: any;
  paymentMethods?: PaymentInfo[];
}

// ─── MESSAGING ────────────────────────────────────────────
export type MessageType = 'text' | 'product_card' | 'system' | 'offer_card' | 'seller_offer_card';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  type: MessageType;
  text?: string;
  productRef?: {
    id: string; title: string; price: number; image: string; sellerId: string;
    neighborhood?: string; sellerName?: string; sellerPhoto?: string;
  };
  // Pour offer_card (acheteur fait une offre)
  offerPrice?: number;
  offerStatus?: 'pending' | 'accepted' | 'refused' | 'counter_offered';
  // Pour seller_offer_card (vendeur propose un prix personnalisé)
  sellerCustomPrice?: number;
  readBy: string[];
  createdAt: any;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantsInfo: Record<string, { name: string; photo?: string; isVerified?: boolean }>;
  lastMessage?: string;
  lastMessageAt?: any;
  lastSenderId?: string;
  productRef?: { id: string; title: string; price: number; image: string; sellerId: string };
  unreadCount?: Record<string, number>;
  createdAt?: any;
}

// ─── NOTIFICATIONS ────────────────────────────────────────
export type NotificationType = 'message' | 'new_favorite' | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: any;
}

// ─── PAIEMENT ─────────────────────────────────────────────
export interface PaymentInfo {
  method: string;
  phone: string;
  holderName: string;
  waveLink?: string;
}

// ─── COMMANDES ────────────────────────────────────────────
export type OrderStatus =
  | 'initiated'          // Commande créée, attente paiement acheteur
  | 'proof_sent'         // Preuve de paiement envoyée
  | 'confirmed'          // Vendeur confirme réception paiement
  | 'ready'              // Vendeur prêt à livrer → code généré
  | 'delivery_requested' // Livreur assigné, en attente de prise en charge
  | 'delivery_accepted'  // Livreur a accepté la mission
  | 'delivery_picked'    // Livreur a récupéré le colis
  | 'delivered'          // Acheteur a validé le code → livré
  | 'disputed'
  | 'cancelled'
  | 'cod_pending'
  | 'cod_confirmed';

export interface OrderProof {
  screenshotUrl: string;
  transactionRef: string;
  submittedAt: any;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerPhoto?: string;
  sellerId: string;
  sellerName: string;
  sellerPhoto?: string;
  productId: string;
  productTitle: string;
  productImage: string;
  productPrice: number;
  deliveryFee: number;
  totalAmount: number;
  brumerieFee: number;
  sellerReceives: number;
  paymentInfo: PaymentInfo;
  proof?: OrderProof;
  status: OrderStatus;
  deliveryType: 'delivery' | 'in_person';
  isCOD?: boolean; // Paiement à la livraison
  reminderSentAt?: any;
  autoDisputeAt?: any;
  proofSentAt?: any;
  disputeReason?: string;
  sellerBlocked?: boolean;
  createdAt?: any;
  updatedAt?: any;
  // Livraison — code escrow
  deliveryCode?: string;         // Code 6 chars ex: XK9B2R (visible acheteur + vendeur)
  deliveryCodeGeneratedAt?: any; // Timestamp génération
  deliveryValidatedAt?: any;     // Timestamp validation par acheteur
  // Sprint 7 — notation
  buyerReviewed?: boolean;
  sellerReviewed?: boolean;
  reviewsUnlocked?: boolean;     // true dès que le code est validé
  // ─── Livraison partenaire ──────────────────────────────
  delivererId?: string;          // UID du livreur assigné
  delivererName?: string;
  delivererPhone?: string;
  delivererProposedBy?: 'buyer' | 'seller' | 'admin'; // qui a proposé le livreur
  deliveryRequestedAt?: any;
  deliveryAcceptedAt?: any;
  deliveryPickedAt?: any;
}

// ─── NOTATION Sprint 7 ───────────────────────────────────
export type RatingRole = 'buyer_to_seller' | 'seller_to_buyer';

export interface Review {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  toUserId: string;
  role: RatingRole;
  rating: number;
  comment: string;
  createdAt: any;
}

// ─── STORIES ────────────────────────────────────────────────
export interface Story {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerPhoto?: string;
  isVerified: boolean;
  imageUrl: string;
  caption?: string;         // texte promotionnel
  productRef?: {            // article lié (optionnel)
    id: string;
    title: string;
    price: number;
  };
  createdAt: any;
  expiresAt: any;           // createdAt + 48h
  views: string[];          // userIds qui ont vu
}

// ─── BOOST ──────────────────────────────────────────────────
export type BoostDuration = '24h' | '48h' | '7j';
export interface BoostPlan {
  duration: BoostDuration;
  label: string;
  price: number;            // FCFA
  hours: number;
}
export const BOOST_PLANS: BoostPlan[] = [
  { duration: '24h', label: '24 heures', price: 500,  hours: 24  },
  { duration: '48h', label: '48 heures', price: 800,  hours: 48  },
  { duration: '7j',  label: '7 jours',   price: 2000, hours: 168 },
];

export interface ProductBoost {
  id?: string;
  productId: string;
  productTitle?: string;
  sellerId: string;
  sellerName?: string;
  duration: BoostDuration;
  price: number;
  status: 'pending' | 'active' | 'rejected';
  startedAt: any;
  expiresAt: any;
  waveRef?: string;
  activatedAt?: any;
  activatedBy?: string;
  rejectionReason?: string;
}

// UID admin — défini dans .env comme VITE_ADMIN_UID
export const ADMIN_UID = (typeof import.meta !== 'undefined' && (import.meta as any).env)
  ? (import.meta as any).env.VITE_ADMIN_UID || ''
  : '';

// ─── LIVREUR ──────────────────────────────────────────────
export interface DeliveryRate {
  fromZone: string;   // quartier de départ
  toZone: string;     // quartier d'arrivée ('same' = même quartier)
  price: number;      // FCFA
}

export interface DeliveryRequest {
  id: string;
  orderId: string;
  delivererId: string;
  proposedBy: 'buyer' | 'seller' | 'admin' | 'livreur';
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'pending_seller' | 'rejected_by_seller' | 'picked';
  fromNeighborhood: string;
  toNeighborhood: string;
  estimatedFee: number;
  buyerName: string;
  buyerId?: string;
  sellerName: string;
  sellerId?: string;
  productTitle: string;
  productImage?: string;
  createdAt?: any;
  respondedAt?: any;
  pickedAt?: any;
}
