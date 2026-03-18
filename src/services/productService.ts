// src/services/productService.ts
import {
  collection,
  addDoc,
  deleteField,
  getDocs,
  getDoc,
  doc,
  query,
  limit,
  where,
  updateDoc,
  serverTimestamp,
  Timestamp,
  increment,
  orderBy,
  writeBatch,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Product } from '@/types';
import { uploadToCloudinary } from '@/utils/uploadImage';

// ── Supprimer les champs undefined (Firestore les refuse) ──────
function cleanUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

/**
 * Publier un produit (Version Ultra-Robuste)
 */
export async function createProduct(
  productData: Omit<Product, 'id' | 'createdAt' | 'whatsappClickCount' | 'status'>,
  imageFiles: File[]
): Promise<string> {
  try {
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
      status: 'active' as const,
      createdAt: serverTimestamp(),
      priceHistory: [{ price: productData.price, date: new Date().toISOString() }],
    };

    const docRef = await addDoc(collection(db, 'products'), cleanUndefined(product as Record<string, any>));
    
    // Incrémenter le compteur de publications du vendeur
    try {
      await updateDoc(doc(db, 'users', productData.sellerId), {
        publicationCount: increment(1),
        productCount: increment(1),
      });
    } catch (e) { console.warn('publicationCount non mis à jour:', e); }

    return docRef.id;

  } catch (error: any) {
    console.error("Erreur de publication:", error.message);
    throw error;
  }
}

/**
 * Récupérer les produits (Accueil) - OPTIMISÉ POUR LES VENDUS
 */
export async function getProducts(filters?: {
  category?: string;
  neighborhood?: string;
  searchTerm?: string;
}): Promise<Product[]> {
  try {
    // Requête simple sans index composite — filtres côté client
    const q = query(
      collection(db, 'products'),
      where('status', 'in', ['active', 'sold']),
      limit(200)
    );

    const snapshot = await getDocs(q); // Cache + serveur — plus résilient sur mobile 4G
    let products = snapshot.docs.map(doc => {
      const d = doc.data();
      // Compatibilité : anciens articles ont imageUrl (string), nouveaux ont images (array)
      let images: string[] = [];
      if (Array.isArray(d.images) && d.images.length > 0) {
        images = d.images;
      } else if (typeof d.imageUrl === 'string' && d.imageUrl) {
        images = [d.imageUrl];
      }
      return {
        id: doc.id,
        ...d,
        images,
        createdAt: d.createdAt ? (d.createdAt as Timestamp).toDate() : new Date(),
      };
    }) as Product[];

    // Tous les filtres côté client — pas d'index composite requis
    products = products.filter(p => !(p as any).hidden);
    if (filters?.category && filters.category !== 'all') {
      products = products.filter(p => p.category === filters.category);
    }
    if (filters?.neighborhood && filters.neighborhood !== 'all') {
      products = products.filter(p => {
        const neighborhoods = (p as any).neighborhoods || [p.neighborhood];
        return neighborhoods.includes(filters.neighborhood);
      });
    }

    // Tri : vérifié en premier (+20% visibilité), puis par date
    products.sort((a, b) => {
      const aScore = (a.sellerVerified ? 1 : 0);
      const bScore = (b.sellerVerified ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore; // vérifié d'abord
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      products = products.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }
    return products;
  } catch (error) {
    console.error('Erreur getProducts:', error);
    return [];
  }
}

// ── Pagination : charger une page de produits ───────────────────
export const PRODUCTS_PER_PAGE = 30;

export async function getProductsPage(
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
  filters?: { category?: string; neighborhood?: string }
): Promise<{ products: Product[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
  try {
    const constraints: any[] = [
      where('status', 'in', ['active', 'sold']),
      orderBy('createdAt', 'desc'),
      limit(PRODUCTS_PER_PAGE + 1), // +1 pour détecter s'il y a une suite
    ];
    if (lastDoc) constraints.push(startAfter(lastDoc));

    const snapshot = await getDocs(query(collection(db, 'products'), ...constraints));
    const docs = snapshot.docs;
    const hasMore = docs.length > PRODUCTS_PER_PAGE;
    const pageDocs = hasMore ? docs.slice(0, PRODUCTS_PER_PAGE) : docs;

    let products = pageDocs.map(d => {
      const data = d.data();
      let images: string[] = [];
      if (Array.isArray(data.images) && data.images.length > 0) {
        images = data.images;
      } else if (typeof data.imageUrl === 'string' && data.imageUrl) {
        images = [data.imageUrl];
      }
      return {
        id: d.id,
        ...data,
        images,
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
      } as Product;
    }).filter(p => !(p as any).hidden);

    // Filtres optionnels côté client
    if (filters?.category && filters.category !== 'all') {
      products = products.filter(p => p.category === filters.category);
    }
    if (filters?.neighborhood && filters.neighborhood !== 'all') {
      products = products.filter(p => {
        const nh = (p as any).neighborhoods || [p.neighborhood];
        return nh.includes(filters.neighborhood);
      });
    }

    return {
      products,
      lastDoc: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
      hasMore,
    };
  } catch (error) {
    console.error('Erreur getProductsPage:', error);
    return { products: [], lastDoc: null, hasMore: false };
  }
}

/**
 * Récupérer les produits d'un vendeur (Profil) - OPTIMISÉ
 */
export async function getSellerProducts(sellerId: string): Promise<Product[]> {
  try {
    // Requête simple par sellerId — filtre status côté client
    const q = query(
      collection(db, 'products'),
      where('sellerId', '==', sellerId)
    );
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => {
      const d = doc.data();
      let images: string[] = [];
      if (Array.isArray(d.images) && d.images.length > 0) {
        images = d.images;
      } else if (typeof d.imageUrl === 'string' && d.imageUrl) {
        images = [d.imageUrl];
      }
      return {
        id: doc.id,
        ...d,
        images,
        createdAt: d.createdAt ? (d.createdAt as Timestamp).toDate() : new Date(),
      };
    }).filter((p: any) => p.status !== 'deleted') as Product[];
    
    return products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Erreur getSellerProducts:', error);
    return [];
  }
}

/**
 * Marquer comme vendu (Ne fait plus disparaître le produit)
 */
export async function markProductAsSold(productId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'products', productId), { 
      status: 'sold' 
    });
  } catch (error) {
    console.error("Erreur markProductAsSold:", error);
    throw error;
  }
}

/**
 * Supprimer un produit (Cache le produit de l'app)
 */
export async function deleteProduct(productId: string, sellerId: string): Promise<void> {
  await updateDoc(doc(db, 'products', productId), { status: 'deleted' });
  await updateDoc(doc(db, 'users', sellerId), { publicationCount: increment(-1) });
}

/**
 * Compteur WhatsApp
 */
export async function incrementWhatsAppClick(productId: string): Promise<void> {
  await updateDoc(doc(db, 'products', productId), { whatsappClickCount: increment(1) });
}

export async function incrementViewCount(productId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'products', productId), { viewCount: increment(1) });
  } catch(e) {
    console.error('[incrementViewCount] Firestore refusé — vérifier les règles Firestore :', e);
  }
}

// Sprint 5 — compteur de contacts (remplace WhatsApp click)
export async function incrementContactCount(productId: string, sellerId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'products', productId), { whatsappClickCount: increment(1) });
    await updateDoc(doc(db, 'users', sellerId), { contactCount: increment(1) });
  } catch(e) { console.error('[contactCount]', e); }
}

/**
 * Limite de publication
 */
export async function canUserPublish(userId: string): Promise<{
  canPublish: boolean;
  reason?: string;
  count: number;
  limit: number;
}> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return { canPublish: false, reason: 'Utilisateur non trouvé', count: 0, limit: 0 };
    
    const userData = userDoc.data();
    const count = userData.publicationCount || 0;
    const limit = userData.publicationLimit || 50;
    
    if (count >= limit) return { canPublish: false, reason: `Limite mensuelle atteinte`, count, limit };
    return { canPublish: true, count, limit };
  } catch (error) {
    // En cas d'erreur technique → ne pas bloquer la publication
    console.warn('canUserPublish erreur:', error);
    return { canPublish: true, count: 0, limit: 50 };
  }
}

export function requestVerificationViaWhatsApp(user: { name: string; phone: string }) {
  const msg = `🏅 Demande badge Vendeur Vérifié - ${user.name}`;
  return `https://wa.me/22586867693?text=${encodeURIComponent(msg)}`;
}

export function sendFeedbackViaEmail(feedback: { type: string; message: string; name: string; email: string }) {
  const subject = encodeURIComponent(`Feedback Brumerie - ${feedback.type}`);
  const body = encodeURIComponent(`De: ${feedback.name}\n\n${feedback.message}`);
  return `mailto:contact.brumerie@gmail.com?subject=${subject}&body=${body}`;
}

/**
 * Remettre un produit vendu sur le marché (Re-listing)
 */
export async function updateProductStatus(productId: string, status: 'active' | 'sold'): Promise<void> {
  try {
    await updateDoc(doc(db, 'products', productId), { status });
  } catch (error) {
    console.error('Erreur updateProductStatus:', error);
    throw error;
  }
}

/**
 * Modifier les détails d'un article (titre, prix, description, originalPrice)
 */
export async function updateProduct(
  productId: string,
  data: {
    title?: string;
    description?: string;
    price?: number;
    originalPrice?: number | null;
    category?: string;
    neighborhood?: string;
    neighborhoods?: string[];
    condition?: 'new' | 'like_new' | 'second_hand';
    quantity?: number;
  }
): Promise<void> {
  try {
    // Nettoyer les undefined + remplacer null par deleteField()
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries({ ...data, updatedAt: new Date() })) {
      if (v === undefined) continue;
      if (v === null) { cleaned[k] = deleteField(); }
      else cleaned[k] = v;
    }
    await updateDoc(doc(db, 'products', productId), cleaned);
  } catch (error) {
    console.error('Erreur updateProduct:', error);
    throw error;
  }
}

// ── Sync données vendeur sur tous ses produits ──────────────
// À appeler après : changement de nom, photo, badge vérifié (gain ou perte)
export async function syncSellerDataToProducts(
  sellerId: string,
  data: {
    sellerName?: string;
    sellerPhoto?: string;
    sellerVerified?: boolean;
    sellerPremium?: boolean;
  }
): Promise<void> {
  // Récupérer tous les produits actifs du vendeur
  const q = query(
    collection(db, 'products'),
    where('sellerId', '==', sellerId),
    where('status', 'in', ['active', 'sold']),
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  // Filtrer les champs définis uniquement
  const updatePayload: Record<string, any> = {};
  if (data.sellerName     !== undefined) updatePayload.sellerName     = data.sellerName;
  if (data.sellerPhoto    !== undefined) updatePayload.sellerPhoto    = data.sellerPhoto;
  if (data.sellerVerified !== undefined) updatePayload.sellerVerified = data.sellerVerified;
  if (data.sellerPremium  !== undefined) updatePayload.sellerPremium  = data.sellerPremium;
  if (Object.keys(updatePayload).length === 0) return;

  // Batch write (max 500 docs par batch — limite Firestore)
  const BATCH_SIZE = 400;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + BATCH_SIZE).forEach(d => batch.update(d.ref, updatePayload));
    await batch.commit();
  }
}
