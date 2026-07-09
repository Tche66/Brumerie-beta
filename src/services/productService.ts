// src/services/productService.ts — v21 hybride Neon (lecture) + Firestore (realtime)
import {
  collection, addDoc, deleteDoc, getDocs, getDoc, doc, setDoc,
  query, limit, where, updateDoc, serverTimestamp,
  Timestamp, increment, orderBy, writeBatch,
  startAfter, QueryDocumentSnapshot, DocumentData,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Product } from '@/types';
import { uploadToCloudinary } from '@/utils/uploadImage';
import { createNotification } from '@/services/notificationService';
import { productsApi } from './apiClient';

// -- Helpers --------------------------------------------------------------
function safeGetTime(val: any): number {
  if (!val) return 0;
  if (typeof val.getTime === 'function') return val.getTime() || 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  try { const d = new Date(val); return isNaN(d.getTime()) ? 0 : d.getTime(); } catch { return 0; }
}

function cleanUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function normalizeProduct(p: any): Product {
  return {
    ...p,
    id: p.firebaseId || p.id,
    images: Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : (p.imageUrl ? [p.imageUrl] : []),
    createdAt: p.createdAt ? (typeof p.createdAt === 'string' ? new Date(p.createdAt) : p.createdAt?.toDate?.() || p.createdAt) : new Date(),
    sellerVerified: p.sellerVerified ?? p.seller_verified ?? false,
    sellerPremium: p.sellerPremium ?? p.seller_premium ?? false,
    sellerName: p.sellerName || p.seller_name || '',
    sellerPhoto: p.sellerPhoto || p.seller_photo || '',
  } as Product;
}

export const PRODUCTS_PER_PAGE = 30;

// =========================================================================
// LECTURE — Neon (via NestJS) avec fallback Firestore
// =========================================================================

// -- Liste des produits (accueil) -----------------------------------------
export async function getProducts(filters?: {
  category?: string;
  neighborhood?: string;
  searchTerm?: string;
  city?: string;
}): Promise<Product[]> {
  try {
    let products = await getProductsFromFirestore(filters);
    if (filters?.city && filters.city !== 'all') {
      products = products.filter(p => (p as any).city === filters.city || !((p as any).city));
    }
    return products;
  } catch {
    const params: Record<string, string> = {};
    if (filters?.category && filters.category !== 'all') params.category = filters.category;
    if (filters?.neighborhood && filters.neighborhood !== 'all') params.neighborhood = filters.neighborhood;
    if (filters?.searchTerm) params.search = filters.searchTerm;
    const data = await productsApi.getAll(params) as any;
    let products = (Array.isArray(data) ? data : data.products || []).map(normalizeProduct);
    products = products.filter((p: any) => !p.hidden);
    if (filters?.city && filters.city !== 'all') {
      products = products.filter(p => (p as any).city === filters.city || !((p as any).city));
    }
    return products;
  }
}

// -- Pagination -----------------------------------------------------------
export async function getProductsPage(
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
  filters?: { category?: string; neighborhood?: string }
): Promise<{ products: Product[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
  // La pagination curseur reste sur Firestore (Neon utilise offset/cursor string)
  try {
    const constraints: any[] = [
      where('status', 'in', ['active', 'sold']),
      orderBy('createdAt', 'desc'),
      limit(PRODUCTS_PER_PAGE + 1),
    ];
    if (lastDoc) constraints.push(startAfter(lastDoc));
    const snapshot = await getDocs(query(collection(db, 'products'), ...constraints));
    const docs = snapshot.docs;
    const hasMore = docs.length > PRODUCTS_PER_PAGE;
    const pageDocs = hasMore ? docs.slice(0, PRODUCTS_PER_PAGE) : docs;

    let products = pageDocs.map(d => {
      const data = d.data();
      return normalizeProduct({ id: d.id, ...data });
    }).filter((p: any) => !p.hidden);

    if (filters?.category && filters.category !== 'all') products = products.filter(p => p.category === filters.category);
    if (filters?.neighborhood && filters.neighborhood !== 'all') {
      products = products.filter(p => {
        const n = (p as any).neighborhoods || [p.neighborhood];
        return n.includes(filters.neighborhood);
      });
    }

    return { products, lastDoc: hasMore ? pageDocs[pageDocs.length - 1] : null, hasMore };
  } catch { return { products: [], lastDoc: null, hasMore: false }; }
}

// -- Produits d'un vendeur ------------------------------------------------
export async function getSellerProducts(sellerId: string): Promise<Product[]> {
  try {
    const data = await productsApi.getBySelller(sellerId) as any;
    const products = (Array.isArray(data) ? data : []).map(normalizeProduct);
    // Si Neon retourne des resultats, les utiliser
    if (products.length > 0) return products;
    // Sinon fallback Firestore (produits pas encore migres)
  } catch { /* Neon echoue → fallback */ }

  // Fallback Firestore
  try {
    const q = query(collection(db, 'products'), where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  } catch { return []; }
}

// -- Produit par ID -------------------------------------------------------
export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const data = await productsApi.getById(productId) as any;
    if (!data || !data.id) throw new Error('not found');
    return normalizeProduct(data);
  } catch {
    // Fallback Firestore
    try {
      const snap = await getDoc(doc(db, 'products', productId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Product;
    } catch { return null; }
  }
}

// -- Trending -------------------------------------------------------------
export async function getTrendingProducts(): Promise<Product[]> {
  try {
    const data = await productsApi.getTrending() as any;
    return (Array.isArray(data) ? data : []).map(normalizeProduct);
  } catch {
    try {
      const q = query(collection(db, 'products'), where('status', '==', 'active'), limit(30));
      const snap = await getDocs(q);
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      return products.sort((a, b) => ((b as any).likeCount || 0) - ((a as any).likeCount || 0));
    } catch { return []; }
  }
}

// -- Feed following -------------------------------------------------------
export async function getFollowingFeed(followingIds: string[]): Promise<Product[]> {
  if (!followingIds.length) return [];
  try {
    const chunks = Array.from({ length: Math.ceil(followingIds.length / 10) }, (_, i) => followingIds.slice(i * 10, i * 10 + 10));
    const results = await Promise.all(chunks.map(chunk =>
      getDocs(query(collection(db, 'products'), where('sellerId', 'in', chunk), where('status', '==', 'active'), limit(20)))
    ));
    const products = results.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    return products.sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt));
  } catch { return []; }
}

// =========================================================================
// ECRITURE — Firestore (source) + sync Neon en background
// =========================================================================

// -- Creer un produit -----------------------------------------------------
export async function createProduct(
  productData: Omit<Product, 'id' | 'createdAt' | 'whatsappClickCount' | 'status'>,
  imageFiles: File[]
): Promise<string> {
  const imageUrls: string[] = [];
  for (const file of imageFiles) {
    const url = await uploadToCloudinary(file, 'brumerie_products');
    imageUrls.push(url);
  }

  const product = {
    ...productData,
    images: imageUrls,
    whatsappClickCount: 0,
    viewCount: 0,
    status: (productData as any).status || 'active',
    createdAt: serverTimestamp(),
    priceHistory: [{ price: productData.price, date: new Date().toISOString() }],
  };

  const docRef = await addDoc(collection(db, 'products'), cleanUndefined(product as Record<string, any>));

  if ((productData as any).status !== 'draft') {
    updateDoc(doc(db, 'users', productData.sellerId), {
      publicationCount: increment(1),
      productCount: increment(1),
    }).catch(() => {});
  }

  // Sync Neon en background
  productsApi.create({
    ...productData,
    images: imageUrls,
    status: (productData as any).status || 'active',
    firebaseId: docRef.id,
  }).catch(() => {});

  return docRef.id;
}

// -- Mettre a jour --------------------------------------------------------
export async function updateProduct(
  productId: string,
  updates: Partial<Product>,
): Promise<void> {
  const clean = cleanUndefined(updates as Record<string, any>);
  await updateDoc(doc(db, 'products', productId), { ...clean, updatedAt: serverTimestamp() });
  productsApi.update(productId, clean).catch(() => {});
}

// -- Marquer vendu --------------------------------------------------------
export async function markProductAsSold(productId: string): Promise<void> {
  await updateDoc(doc(db, 'products', productId), { status: 'sold' });
  productsApi.update(productId, { status: 'sold' }).catch(() => {});
}

// -- Mettre a jour le statut ----------------------------------------------
export async function updateProductStatus(productId: string, status: 'active' | 'sold'): Promise<void> {
  await updateDoc(doc(db, 'products', productId), { status });
  productsApi.update(productId, { status }).catch(() => {});
}

// -- Supprimer ------------------------------------------------------------
export async function deleteProduct(productId: string, sellerId: string): Promise<void> {
  // D'abord marquer comme supprimé (pour les listeners temps réel)
  await updateDoc(doc(db, 'products', productId), { status: 'deleted' }).catch(() => {});
  // Puis supprimer le document
  await deleteDoc(doc(db, 'products', productId));
  updateDoc(doc(db, 'users', sellerId), { productCount: increment(-1) }).catch(() => {});
  productsApi.delete(productId).catch(() => {});
}

// =========================================================================
// COMPTEURS — dual write
// =========================================================================

export async function incrementWhatsAppClick(productId: string): Promise<void> {
  updateDoc(doc(db, 'products', productId), { whatsappClickCount: increment(1) }).catch(() => {});
  productsApi.incrementWhatsApp(productId).catch(() => {});
}

export async function incrementViewCount(productId: string): Promise<void> {
  updateDoc(doc(db, 'products', productId), { viewCount: increment(1) }).catch(() => {});
  productsApi.incrementView(productId).catch(() => {});
}

export async function incrementContactCount(productId: string, sellerId: string): Promise<void> {
  updateDoc(doc(db, 'products', productId), { contactCount: increment(1) }).catch(() => {});
  updateDoc(doc(db, 'users', sellerId), { contactCount: increment(1) }).catch(() => {});
}

// =========================================================================
// SOCIAL — Likes & Commentaires (Firestore realtime + sync Neon)
// =========================================================================

export async function toggleLike(productId: string, userId: string): Promise<{ liked: boolean }> {
  const likeRef = doc(db, 'products', productId, 'likes', userId);
  const snap = await getDoc(likeRef);

  if (snap.exists()) {
    await deleteDoc(likeRef);
    updateDoc(doc(db, 'products', productId), { likeCount: increment(-1) }).catch(() => {});
    productsApi.toggleLike(productId).catch(() => {});
    return { liked: false };
  } else {
    await setDoc(likeRef, { userId, createdAt: serverTimestamp() });
    updateDoc(doc(db, 'products', productId), { likeCount: increment(1) }).catch(() => {});
    productsApi.toggleLike(productId).catch(() => {});
    return { liked: true };
  }
}

export async function checkIsLiked(productId: string, userId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'products', productId, 'likes', userId));
    return snap.exists();
  } catch { return false; }
}

export async function addComment(
  productId: string, userId: string, userName: string,
  text: string, userPhoto?: string, parentId?: string, photoUrl?: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'products', productId, 'comments'), {
    userId, userName, userPhoto: userPhoto || null, text,
    parentId: parentId || null, photoUrl: photoUrl || null,
    createdAt: serverTimestamp(),
  });
  updateDoc(doc(db, 'products', productId), { commentCount: increment(1) }).catch(() => {});
  productsApi.addComment(productId, text, photoUrl).catch(() => {});
  return ref.id;
}

export async function deleteComment(productId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'products', productId, 'comments', commentId));
  updateDoc(doc(db, 'products', productId), { commentCount: increment(-1) }).catch(() => {});
  productsApi.deleteComment(productId, commentId).catch(() => {});
}

// -- Realtime comments (Firestore onSnapshot) -----------------------------
export function subscribeComments(
  productId: string,
  callback: (comments: any[]) => void,
): () => void {
  const q = query(collection(db, 'products', productId, 'comments'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => callback([]));
}

// =========================================================================
// UTILS
// =========================================================================

export async function syncSellerDataToProducts(sellerId: string, updates: { name?: string; photoURL?: string; isVerified?: boolean }): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, 'products'), where('sellerId', '==', sellerId), where('status', 'in', ['active', 'draft'])));
    if (snap.empty) return;
    const batch = writeBatch(db);
    const data: Record<string, any> = {};
    if (updates.name) data.sellerName = updates.name;
    if (updates.photoURL) data.sellerPhoto = updates.photoURL;
    if (updates.isVerified !== undefined) data.sellerVerified = updates.isVerified;
    snap.docs.forEach(d => batch.update(d.ref, data));
    await batch.commit();
  } catch (e) { console.error('syncSellerDataToProducts:', e); }
}

export async function canUserPublish(userId: string): Promise<{ canPublish: boolean; reason?: string; remaining?: number }> {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return { canPublish: false, reason: 'Utilisateur introuvable' };
    const user = userSnap.data();
    if (user.isBanned) return { canPublish: false, reason: 'Compte suspendu' };
    return { canPublish: true };
  } catch { return { canPublish: true }; }
}

export function requestVerificationViaWhatsApp(user: { name: string; phone: string }) {
  const msg = `Bonjour, je suis ${user.name} (${user.phone}). Je souhaite obtenir la vérification Brumerie.`;
  window.open(`https://wa.me/2250000000000?text=${encodeURIComponent(msg)}`, '_blank');
}

export function sendFeedbackViaEmail(feedback: { type: string; message: string; name: string; email: string }) {
  const subject = `[Brumerie] ${feedback.type} — ${feedback.name}`;
  window.open(`mailto:contact@brumerie.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(feedback.message)}`, '_blank');
}

// -- Fallback interne (Firestore direct) ----------------------------------
async function getProductsFromFirestore(filters?: {
  category?: string;
  neighborhood?: string;
  searchTerm?: string;
}): Promise<Product[]> {
  try {
    const q = query(collection(db, 'products'), where('status', 'in', ['active', 'sold']), limit(200));
    const snapshot = await getDocs(q);

    let products = snapshot.docs.map(d => normalizeProduct({ id: d.id, ...d.data() }));
    products = products.filter((p: any) => !p.hidden);
    if (filters?.category && filters.category !== 'all') products = products.filter(p => p.category === filters.category);
    if (filters?.neighborhood && filters.neighborhood !== 'all') {
      products = products.filter(p => {
        const neighborhoods = (p as any).neighborhoods || [p.neighborhood];
        return neighborhoods.includes(filters.neighborhood);
      });
    }
    products.sort((a, b) => {
      const aScore = a.sellerVerified ? 1 : 0;
      const bScore = b.sellerVerified ? 1 : 0;
      if (bScore !== aScore) return bScore - aScore;
      return safeGetTime(b.createdAt) - safeGetTime(a.createdAt);
    });
    if (filters?.searchTerm) {
      const s = filters.searchTerm.toLowerCase();
      products = products.filter(p => p.title.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s));
    }
    return products;
  } catch { return []; }
}
