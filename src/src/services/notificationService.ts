// src/services/notificationService.ts
// Notifications stockées dans Firestore notifications/{userId}/items/{notifId}
// Déclenchées côté client lors des actions (message, favori)

import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, orderBy, onSnapshot, serverTimestamp,
  writeBatch, where, limit,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export type NotifType = 'message' | 'reply' | 'favorite' | 'system';

export interface AppNotification {
  id: string;
  userId: string;       // destinataire
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
  createdAt: any;
  // Données contextuelles pour navigation
  data?: {
    conversationId?: string;
    productId?: string;
    senderId?: string;
  };
}

const notifCol = (userId: string) =>
  collection(db, 'notifications', userId, 'items');

// ── Créer une notification ─────────────────────────────────
export async function createNotification(
  userId: string,
  type: NotifType,
  title: string,
  body: string,
  data?: AppNotification['data'],
): Promise<void> {
  if (!userId) return;
  try {
    await addDoc(notifCol(userId), {
      userId,
      type,
      title,
      body,
      read: false,
      createdAt: serverTimestamp(),
      data: data || {},
    });
  } catch (e) {
    console.error('[Notif] createNotification:', e);
  }
}

// ── Marquer une notif comme lue ────────────────────────────
export async function markNotificationRead(
  userId: string,
  notifId: string,
): Promise<void> {
  try {
    await updateDoc(
      doc(db, 'notifications', userId, 'items', notifId),
      { read: true },
    );
  } catch (e) { console.error('[Notif] markRead:', e); }
}

// ── Tout marquer comme lu ──────────────────────────────────
export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const snap = await getDocs(
      query(notifCol(userId), where('read', '==', false)),
    );
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch (e) { console.error('[Notif] markAllRead:', e); }
}

// ── Listener temps réel ────────────────────────────────────
export function subscribeToNotifications(
  userId: string,
  callback: (notifs: AppNotification[]) => void,
): () => void {
  const q = query(
    notifCol(userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, snap => {
    const notifs = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    } as AppNotification));
    callback(notifs);
  });
}

// ── Nombre non-lus ─────────────────────────────────────────
export function subscribeUnreadNotifCount(
  userId: string,
  callback: (count: number) => void,
): () => void {
  const q = query(notifCol(userId), where('read', '==', false));
  return onSnapshot(q, snap => callback(snap.size));
}
