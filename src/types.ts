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
// PREMIUM_PRICE non défini — badge PREMIUM bientôt disponible, prix non communiqué

// Limites par plan
// ─── PALIERS DE PARRAINAGE ───────────────────────────────────
// ─── PALIERS DE PARRAINAGE v2 ─────────────────────────────────────
// Philosophie : récompenser VITE (dès 1 filleul) pour créer l'habitude,
// puis augmenter la valeur progressive sans coûter trop cher à Brumerie.
// Un "filleul actif" = compte créé avec au moins 1 article publié.
export const REFERRAL_REWARDS = [
  {
    threshold: 1,
    label: '1er invité 🎁',
    emoji: '🎁',
    tier: 'first',
    extraPublications: 1,
    extraChats: 0,
    freeVerified: false,
    freeVerifiedDays: 0,
    boostCredit: 0,
    boostDuration: '',
    description: '+1 publication bonus débloquée',
    detail: "Ton 1er filleul actif te rapporte immédiatement 1 publication supplémentaire ce mois-ci. C'est cadeau, sans condition.",
  },
  {
    threshold: 3,
    label: '3 invités ⚡',
    emoji: '⚡',
    tier: 'starter',
    extraPublications: 2,
    extraChats: 2,
    freeVerified: false,
    freeVerifiedDays: 0,
    boostCredit: 1,
    boostDuration: '24h',
    description: '+2 publications + +2 chats/jour + 1 boost 24h',
    detail: "3 filleuls actifs = plus de slots pour vendre, plus de conversations pour trouver des acheteurs, et ton 1er boost de visibilité offert.",
  },
  {
    threshold: 7,
    label: '7 invités 🔥',
    emoji: '🔥',
    tier: 'active',
    extraPublications: 3,
    extraChats: 5,
    freeVerified: false,
    freeVerifiedDays: 0,
    boostCredit: 2,
    boostDuration: '24h',
    description: '+3 publications + +5 chats/jour + 2 boosts 24h',
    detail: "7 personnes ont rejoint grâce à toi. Tu mérites une vraie puissance de vente : plus de produits visibles, plus de contacts, et 2 boosts pour dominer les recherches.",
  },
  {
    threshold: 15,
    label: '15 invités 💪',
    emoji: '💪',
    tier: 'influencer',
    extraPublications: 5,
    extraChats: 10,
    freeVerified: true,
    freeVerifiedDays: 14,
    boostCredit: 1,
    boostDuration: '7j',
    description: '+5 publications + messagerie renforcée + Badge Vérifié 14j + 1 boost semaine',
    detail: "15 filleuls actifs — tu es un vrai moteur de croissance Brumerie. Le badge Vérifié s'active 14 jours sur ton profil : tes acheteurs te font plus confiance, tu vends mieux.",
  },
  {
    threshold: 30,
    label: '30 invités 👑',
    emoji: '👑',
    tier: 'champion',
    extraPublications: 10,
    extraChats: 999,
    freeVerified: true,
    freeVerifiedDays: 30,
    boostCredit: 3,
    boostDuration: '7j',
    description: '+10 publications + messagerie illimitée + Badge Vérifié 1 mois + 3 boosts semaine',
    detail: "30 filleuls actifs — tu es Champion Brumerie. Badge Vérifié 30 jours, messagerie totalement illimitée et 3 boosts de 7 jours. Ton profil domine les résultats.",
  },
  {
    threshold: 60,
    label: '60 invités 🏆',
    emoji: '🏆',
    tier: 'legend',
    extraPublications: 20,
    extraChats: 999,
    freeVerified: true,
    freeVerifiedDays: 90,
    boostCredit: 5,
    boostDuration: '7j',
    description: '+20 publications + Badge Vérifié 3 mois + 5 boosts semaine',
    detail: "Légende Brumerie. 60 personnes ont rejoint grâce à toi. Badge Vérifié 90 jours, publications quasi-illimitées et 5 boosts hebdo — la visibilité maximale sur toute la plateforme.",
  },
  {
    threshold: 100,
    label: '100 invités 💎',
    emoji: '💎',
    tier: 'ambassador',
    extraPublications: 999,
    extraChats: 999,
    freeVerified: true,
    freeVerifiedDays: 365,
    boostCredit: 10,
    boostDuration: '7j',
    description: 'Publications illimitées + Badge Vérifié 1 an + 10 boosts semaine + Ambassadeur officiel',
    detail: "Ambassadeur officiel Brumerie. Ton nom est lié à la croissance de la plateforme. Publications et messagerie illimitées, Badge Vérifié 1 an renouvelable, et 10 boosts de 7 jours — statut permanent tant que tes filleuls restent actifs.",
  },
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
  awAddressCode?: string;     // Code Address-Web ex: AW-ABJ-84321
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
  deliveryPhotoURL?: string;       // Photo dédiée au service de livraison
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
  shopUsername?: string;     // ex: "adjoua-mode" → brumerie.com/adjoua-mode
  shopBio?: string;          // Description longue de la boutique
  shopCategories?: string[]; // Collections ex: ['Nouveautés','Pagnes','Promos']
  shopHours?: {              // Horaires magasin physique
    lundi?: string; mardi?: string; mercredi?: string; jeudi?: string;
    vendredi?: string; samedi?: string; dimanche?: string;
  };
  shopAddress?: string;      // Adresse physique texte libre
  shopWhatsapp?: string;     // Numéro WhatsApp boutique
  shopInstagram?: string;    // @handle Instagram
  shopTiktok?: string;       // @handle TikTok
  flashSaleActive?: boolean; // Vente flash en cours
  flashSaleLabel?: string;   // ex: "SOLDES -30% jusqu'à dimanche"
  flashSaleExpiry?: string;  // ISO datetime
  // ─── Parrainage ──────────────────────────────────────────
  advancePaymentAllowed?: boolean; // Ce vendeur peut recevoir des paiements à l'avance (override global)
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
  // ─── Anti-Arnaque / Trust System ─────────────────────────
  riskLevel?: 'safe' | 'watch' | 'risk' | 'banned';
  riskReportCount?: number;  // Nb signalements validés reçus
  isBanned?: boolean;        // Compte banni (accès bloqué)
  // ─── Activité & Présence ─────────────────────────────────
  lastActiveAt?: any;         // Timestamp dernière activité
  avgResponseTime?: number;   // Temps moyen de réponse en minutes
  // ─── Vendeurs suivis (acheteur) ──────────────────────────
  followingSellers?: string[];  // UIDs des vendeurs suivis
  // ─── Wishlist ────────────────────────────────────────────
  wishlistIds?: string[];      // IDs produits dans la wishlist
  wishlistPublic?: boolean;    // Wishlist publique ou privée
  wishlistSlug?: string;       // Slug unique pour lien partage
  // ─── Cashback fidélité ───────────────────────────────────
  loyaltyPoints?: number;      // Points accumulés (100 FCFA = 1 pt)
  loyaltyPointsUsed?: number;  // Points déjà utilisés
  // ─── Boutique fermée ─────────────────────────────────────
  shopClosedUntil?: any;       // Timestamp fermeture (null = ouvert)
  shopClosedMessage?: string;  // Message personnalisé
}

// ─── PRODUCT ──────────────────────────────────────────────
export type ProductStatus = 'active' | 'sold' | 'paused' | 'draft';

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
  hideStats?: boolean;   // Vendeur peut masquer les compteurs vues/contacts (MVP launch)
  priceHistory?: { price: number; date: string }[];
  promoPrice?: number;            // Prix promotionnel permanent
  promoActiveFrom?: string;       // ISO — début promotion programmée
  promoActiveUntil?: string;      // ISO — fin promotion (ou vente flash)
  flashSaleScheduled?: boolean;   // Vente flash programmée (pas encore active)
  flashSaleActive?: boolean;      // Vente flash en cours (champ User déplacé ici)
  flashSaleLabel?: string;        // ex: "-30% jusqu'à dimanche"
  viewsByHour?: Record<string, number>; // {"08": 12, "14": 45} — heures de pointe
  viewsByWeek?: Record<string, number>; // {"2025-W12": 88} — vues par semaine
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
  // ── Groupe de chat ──────────────────────────────────────
  isGroup?: boolean;        // true si groupe
  groupName?: string;       // Nom du groupe
  groupPhoto?: string;      // URL photo du groupe (optionnel)
  groupAdminId?: string;    // UID du créateur/admin
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
  // ── Paiement mobile ──────────────────────────
  | 'initiated'      // Commande créée — acheteur doit payer
  | 'proof_sent'     // Acheteur a envoyé la preuve de paiement
  | 'confirmed'      // Vendeur a confirmé le paiement reçu
  // ── Livraison (commun paiement mobile + COD) ─
  | 'ready'          // Vendeur prêt → code + QR généré → livreur notifié
  | 'picked'         // Livreur a récupéré le colis (scan QR vendeur)
  | 'delivered'      // Acheteur a validé → livraison terminée
  // ── Paiement à la livraison ──────────────────
  | 'cod_pending'    // Commande COD créée — vendeur doit confirmer
  | 'cod_confirmed'  // Vendeur prêt à livrer (COD)
  | 'cod_delivered'  // Acheteur a reçu → attente confirmation vendeur (argent reçu)
  // ── Fin de vie ───────────────────────────────
  | 'disputed'
  | 'cancelled';

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
  // COD autorisation encaissement
  sellerAuthorizedCashCollection?: boolean;  // vendeur autorise le livreur à encaisser
  sellerBlockedCashCollection?: boolean;     // vendeur bloque l'encaissement
  sellerCashAuthAt?: any;
  // Notation livreur
  buyerRatedDeliverer?: boolean;
  sellerRatedDeliverer?: boolean;
  // Confirmation réception argent vendeur (COD)
  sellerReceivedCash?: boolean;
  sellerReceivedCashAt?: any;
  reminderSentAt?: any;
  autoDisputeAt?: any;
  proofSentAt?: any;
  disputeReason?: string;
  sellerBlocked?: boolean;
  createdAt?: any;
  updatedAt?: any;
  // Address-Web — adresse numérique acheteur
  buyerAWCode?: string;          // Code AW de l'acheteur ex: AW-ABJ-84321
  buyerAWRepere?: string;        // Repère résolu au moment de la commande
  buyerAWLatitude?: number;      // Coordonnées GPS résolues
  buyerAWLongitude?: number;
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
export type RatingRole = 'buyer_to_seller' | 'seller_to_buyer' | 'buyer_to_deliverer' | 'seller_to_deliverer';

export interface Review {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  fromUserNeighborhood?: string;  // Quartier de l'acheteur — affiché sur la carte avis
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

