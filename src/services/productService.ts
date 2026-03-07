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
  orderBy
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Product } from '@/types';

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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'brumerie_preset'); 

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dk8kfgmqx/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Erreur Cloudinary:", data.error?.message || "Inconnue");
        throw new Error('Upload failed');
      }

      imageUrls.push(data.secure_url);
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
    // CORRECTION : On accepte 'active' et 'sold'. On rejette seulement 'deleted'.
    let q = query(
      collection(db, 'products'),
      where('status', 'in', ['active', 'sold']),
      where('hidden', '!=', true),
      limit(50)
    );

    if (filters?.category && filters.category !== 'all') {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters?.neighborhood && filters.neighborhood !== 'all') {
      q = query(q, where('neighborhood', '==', filters.neighborhood));
    }

    const snapshot = await getDocs(q);
    let products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? (doc.data().createdAt as Timestamp).toDate() : new Date(),
    })) as Product[];

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

/**
 * Récupérer les produits d'un vendeur (Profil) - OPTIMISÉ
 */
export async function getSellerProducts(sellerId: string): Promise<Product[]> {
  try {
    // On récupère tout ce que le vendeur a mis en ligne (Actif ou Vendu)
    const q = query(
      collection(db, 'products'),
      where('sellerId', '==', sellerId),
      where('status', 'in', ['active', 'sold'])
    );
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? (doc.data().createdAt as Timestamp).toDate() : new Date(),
    })) as Product[];
    
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
    return { canPublish: false, reason: 'Erreur technique', count: 0, limit: 0 };
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
