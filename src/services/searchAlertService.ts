// src/services/searchAlertService.ts — v2 hybride NestJS + Firestore
import { db } from '@/config/firebase';
import {
  collection, doc, setDoc, deleteDoc, getDocs,
  query, where, serverTimestamp, limit,
} from 'firebase/firestore';
import { api } from './apiClient';

export interface SearchAlert {
  id: string;
  userId: string;
  keyword: string;
  neighborhood?: string;
  createdAt: any;
}

// ── S'abonner à un mot-clé ────────────────────────────────────────
export async function subscribeToKeyword(
  userId: string,
  keyword: string,
  neighborhood?: string,
): Promise<string> {
  const alertId = `${userId}_${keyword.toLowerCase().replace(/\s+/g, '_')}`;

  // Firestore — source de vérité
  await setDoc(doc(db, 'search_alerts', alertId), {
    id: alertId, userId,
    keyword: keyword.toLowerCase().trim(),
    neighborhood: neighborhood || null,
    createdAt: serverTimestamp(),
  });

  // Sync Neon en background
  api.post('/search-alerts', { keyword, neighborhood }).catch(() => {});

  return alertId;
}

// ── Se désabonner ─────────────────────────────────────────────────
export async function unsubscribeFromKeyword(alertId: string): Promise<void> {
  await deleteDoc(doc(db, 'search_alerts', alertId));
  // Extraire le keyword de l'alertId pour le backend si besoin
  api.delete(`/search-alerts/${alertId}`).catch(() => {});
}

// ── Récupérer les alertes ─────────────────────────────────────────
export async function getUserAlerts(userId: string): Promise<SearchAlert[]> {
  try {
    const q = query(collection(db, 'search_alerts'), where('userId', '==', userId), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SearchAlert);
  } catch { return []; }
}

// ── Vérifier si abonné ────────────────────────────────────────────
export async function isSubscribedToKeyword(userId: string, keyword: string): Promise<boolean> {
  try {
    const alertId = `${userId}_${keyword.toLowerCase().replace(/\s+/g, '_')}`;
    const q = query(collection(db, 'search_alerts'), where('id', '==', alertId), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch { return false; }
}
