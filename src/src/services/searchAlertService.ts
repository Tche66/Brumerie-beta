// src/services/searchAlertService.ts — Alertes de recherche par mot-clé
import { db } from '@/config/firebase';
import {
  collection, doc, setDoc, deleteDoc, getDocs,
  query, where, serverTimestamp, limit
} from 'firebase/firestore';

export interface SearchAlert {
  id: string;
  userId: string;
  keyword: string;
  neighborhood?: string;
  createdAt: any;
}

// S'abonner à un mot-clé
export async function subscribeToKeyword(
  userId: string,
  keyword: string,
  neighborhood?: string
): Promise<string> {
  const alertId = `${userId}_${keyword.toLowerCase().replace(/\s+/g, '_')}`;
  await setDoc(doc(db, 'search_alerts', alertId), {
    id: alertId,
    userId,
    keyword: keyword.toLowerCase().trim(),
    neighborhood: neighborhood || null,
    createdAt: serverTimestamp(),
  });
  return alertId;
}

// Se désabonner d'un mot-clé
export async function unsubscribeFromKeyword(alertId: string): Promise<void> {
  await deleteDoc(doc(db, 'search_alerts', alertId));
}

// Récupérer les alertes de l'utilisateur
export async function getUserAlerts(userId: string): Promise<SearchAlert[]> {
  const q = query(
    collection(db, 'search_alerts'),
    where('userId', '==', userId),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d: any) => d.data() as SearchAlert);
}

// Vérifier si l'user est abonné à ce mot-clé
export async function isSubscribedToKeyword(
  userId: string,
  keyword: string
): Promise<boolean> {
  const alertId = `${userId}_${keyword.toLowerCase().replace(/\s+/g, '_')}`;
  const q = query(
    collection(db, 'search_alerts'),
    where('id', '==', alertId),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
