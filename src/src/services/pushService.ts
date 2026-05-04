// src/services/pushService.ts — Gestion des notifications push PWA
import { db } from '@/config/firebase';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

// Clé publique VAPID — à remplacer par ta vraie clé générée
// Génère tes clés sur : https://vapidkeys.com/ 
// Puis ajoute VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY dans Netlify env vars
const VAPID_PUBLIC_KEY = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || '';

// Convertir la clé VAPID Base64 en Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Vérifier si les push sont supportés
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Vérifier la permission actuelle
export function getPushPermission(): NotificationPermission {
  return Notification.permission;
}

// Demander la permission + s'abonner
export async function subscribeToPush(userId: string, neighborhood: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (!VAPID_PUBLIC_KEY) { console.warn('[Push] VAPID_PUBLIC_KEY manquante'); return false; }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as string,
    });

    // Sauvegarder la subscription dans Firestore
    await setDoc(doc(db, 'push_subscriptions', userId), {
      subscription: JSON.parse(JSON.stringify(subscription)),
      userId,
      neighborhood,
      updatedAt: new Date(),
    });

    return true;
  } catch (err) {
    console.error('[Push] Erreur souscription:', err);
    return false;
  }
}

// Se désabonner
export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    await deleteDoc(doc(db, 'push_subscriptions', userId));
  } catch (err) {
    console.error('[Push] Erreur désinscription:', err);
  }
}

// Vérifier si l'user est abonné
export async function isPushSubscribed(userId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'push_subscriptions', userId));
    return snap.exists();
  } catch { return false; }
}

// Envoyer une notification via la Netlify Function
export async function sendPushNotification(
  subscription: object,
  title: string,
  body: string,
  options?: {
    url?: string;
    productId?: string;
    orderId?: string;
    conversationId?: string;
    type?: 'message' | 'commande' | 'confirmation' | 'livraison' | 'offre' | 'note' | 'publication' | 'alerte' | 'story' | 'general';
    image?: string;   // URL image à afficher dans la notif
  }
): Promise<void> {
  try {
    await fetch('/api/push-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        subscription,
        payload: {
          title,
          body,
          type:           options?.type || 'general',
          url:            options?.url,
          productId:      options?.productId,
          orderId:        options?.orderId,
          conversationId: options?.conversationId,
          image:          options?.image,
        },
      }),
    });
  } catch (err) {
    console.error('[Push] Erreur envoi:', err);
  }
}

// ── Compatibilité avec l'ancienne API ────────────────────────────
// Ces fonctions maintiennent la compatibilité avec bookmarkService, messagingService, etc.

export async function requestPushPermission(): Promise<boolean> {
  return isPushSupported() && (await Notification.requestPermission()) === 'granted';
}

export function isPushGranted(): boolean {
  return isPushSupported() && Notification.permission === 'granted';
}

export function showLocalPushNotification(title: string, body: string, data?: any): void {
  if (!isPushGranted()) return;
  navigator.serviceWorker.ready.then(registration => {
    registration.showNotification(title, {
      body,
      icon:    '/notif-icon.png',
      badge:   '/notif-badge.png',
      // Son personnalisé Brumerie (Android uniquement via channel natif)
      silent:  false,
      vibrate: [200, 100, 200],
      data:    data || {},
    });
  }).catch(() => {});
}
