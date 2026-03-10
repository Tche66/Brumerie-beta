// src/services/storyService.ts — Stories vendeurs vérifiés (48h)
import {
  collection, doc, addDoc, updateDoc, getDocs, onSnapshot,
  query, where, orderBy, serverTimestamp, Timestamp, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Story } from '@/types';

const storiesCol = collection(db, 'stories');

// ── Publier une story ─────────────────────────────────────────
export async function publishStory(params: {
  sellerId: string;
  sellerName: string;
  sellerPhoto?: string;
  imageUrl: string;
  caption?: string;
  productRef?: { id: string; title: string; price: number };
}): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48h

  // Firestore rejette les champs `undefined` — on les exclut explicitement
  const data: Record<string, any> = {
    sellerId: params.sellerId,
    sellerName: params.sellerName,
    imageUrl: params.imageUrl,
    isVerified: true,
    views: [],
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  };
  if (params.sellerPhoto) data.sellerPhoto = params.sellerPhoto;
  if (params.caption)     data.caption     = params.caption;
  if (params.productRef)  data.productRef  = params.productRef;

  const ref = await addDoc(storiesCol, data);
  return ref.id;
}

// ── Marquer une story comme vue ───────────────────────────────
export async function markStoryViewed(storyId: string, userId: string): Promise<void> {
  try {
    const ref = doc(storiesCol, storyId);
    const { arrayUnion } = await import('firebase/firestore');
    await updateDoc(ref, { views: arrayUnion(userId) });
  } catch {}
}

// ── Supprimer une story ───────────────────────────────────────
export async function deleteStory(storyId: string): Promise<void> {
  await deleteDoc(doc(storiesCol, storyId));
}

// ── Écouter les stories actives (non expirées) ────────────────
export function subscribeActiveStories(
  callback: (stories: Story[]) => void,
): () => void {
  const now = Timestamp.now();
  // Requête simple sans orderBy — pas d'index composite requis
  // Le tri se fait côté client
  const q = query(
    storiesCol,
    where('expiresAt', '>', now),
  );
  return onSnapshot(q, snap => {
    const stories = snap.docs.map(d => ({ id: d.id, ...d.data() } as Story));
    // Tri côté client par date de création (plus récent en premier)
    stories.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    // Grouper par vendeur — 1 cercle par vendeur (dernière story en premier)
    const bySellerMap = new Map<string, Story>();
    for (const s of stories) {
      const existing = bySellerMap.get(s.sellerId);
      if (!existing || (s.createdAt?.toMillis?.() || 0) > (existing.createdAt?.toMillis?.() || 0)) {
        bySellerMap.set(s.sellerId, s);
      }
    }
    callback(Array.from(bySellerMap.values()));
  }, (error) => {
    console.error('[Stories] subscribeActiveStories error:', error);
    callback([]);
  });
}

// ── Récupérer toutes les stories d'un vendeur ─────────────────
export async function getSellerStories(sellerId: string): Promise<Story[]> {
  const now = Timestamp.now();
  // Requête simple par sellerId — filtre expiresAt côté client
  const q = query(
    storiesCol,
    where('sellerId', '==', sellerId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Story))
    .filter(s => s.expiresAt?.toMillis?.() > now.toMillis())
    .sort((a, b) => (a.expiresAt?.toMillis?.() || 0) - (b.expiresAt?.toMillis?.() || 0));
}
