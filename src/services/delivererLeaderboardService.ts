// src/services/delivererLeaderboardService.ts
// Classement hebdomadaire livreurs + Parrainage livreur

import {
  collection, doc, getDoc, getDocs, query, where,
  updateDoc, increment, Timestamp, orderBy, limit, onSnapshot
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// ── Dates semaine en cours ───────────────────────────────────────
function getWeekBounds(): { start: Date; end: Date; key: string } {
  const now = new Date();
  const day = now.getDay(); // 0=dim
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  // Clé unique semaine : "2025-W12"
  const year = start.getFullYear();
  const week = Math.ceil(start.getDate() / 7);
  const month = start.getMonth() + 1;
  const key = `${year}-M${month}-W${week}`;
  return { start, end, key };
}

// ── Calculer le classement hebdomadaire par zone ─────────────────
export async function getWeeklyLeaderboard(zone?: string): Promise<{
  rank: number;
  delivererId: string;
  delivererName: string;
  deliveryPartnerName: string;
  photoURL: string;
  zone: string;
  weekDeliveries: number;
  weekEarnings: number;
}[]> {
  const { start, end } = getWeekBounds();
  const startTs = Timestamp.fromDate(start);
  const endTs   = Timestamp.fromDate(end);

  // Charger toutes les livraisons complétées cette semaine
  const q = query(
    collection(db, 'orders'),
    where('status', 'in', ['delivered', 'cod_delivered']),
    where('deliveredAt', '>=', startTs),
    where('deliveredAt', '<', endTs),
  );

  const snap = await getDocs(q).catch(() => null);
  if (!snap) return [];

  // Agréger par livreur
  const byDeliverer: Record<string, {
    delivererId: string; name: string; partnerName: string;
    photo: string; zones: string[]; count: number; earnings: number;
  }> = {};

  for (const d of snap.docs) {
    const o = d.data();
    if (!o.delivererId) continue;
    if (zone && !(o.sellerNeighborhood?.includes(zone) || o.buyerNeighborhood?.includes(zone))) continue;
    const uid = o.delivererId;
    if (!byDeliverer[uid]) {
      byDeliverer[uid] = {
        delivererId: uid,
        name: o.delivererName || '—',
        partnerName: '',
        photo: '',
        zones: [],
        count: 0,
        earnings: 0,
      };
    }
    byDeliverer[uid].count++;
    byDeliverer[uid].earnings += o.deliveryFee || 0;
  }

  // Enrichir avec les infos profil livreur
  const uids = Object.keys(byDeliverer);
  await Promise.all(uids.map(async (uid) => {
    try {
      const uSnap = await getDoc(doc(db, 'users', uid));
      if (uSnap.exists()) {
        const u = uSnap.data();
        byDeliverer[uid].partnerName = u.deliveryPartnerName || u.name || '—';
        byDeliverer[uid].photo = u.deliveryPhotoURL || u.photoURL || '';
        byDeliverer[uid].zones = u.deliveryZones || [];
      }
    } catch {}
  }));

  // Trier par nombre de livraisons desc
  return Object.values(byDeliverer)
    .sort((a, b) => b.count - a.count)
    .map((d, i) => ({
      rank: i + 1,
      delivererId: d.delivererId,
      delivererName: d.name,
      deliveryPartnerName: d.partnerName,
      photoURL: d.photo,
      zone: d.zones.join(' · ') || '—',
      weekDeliveries: d.count,
      weekEarnings: d.earnings,
    }));
}

// ── Parrainage livreur ────────────────────────────────────────────
// Utilise le même referralCode que le compte Brumerie (pas de code séparé)
// Bonus : quand le filleul complète sa 5e livraison, le parrain est récompensé

export const DELIVERER_REFERRAL_THRESHOLD = 5; // livraisons avant bonus parrain
export const DELIVERER_REFERRAL_BONUS_FCFA = 0; // pas d'argent réel (pas de wallet)
// Bonus = badge "Recruteur actif" + visibilité dans le classement

// Vérifier si un parrain doit être récompensé quand un filleul finit une livraison
export async function checkDelivererReferralBonus(delivererId: string): Promise<void> {
  try {
    const dSnap = await getDoc(doc(db, 'users', delivererId));
    if (!dSnap.exists()) return;
    const dData = dSnap.data();

    // Pas de parrain → rien
    if (!dData.referredBy) return;

    // Compter les livraisons de ce livreur
    const { totalDeliveries = 0 } = dData;

    // Au seuil exact de 5, 10, 20 → récompenser le parrain
    const THRESHOLDS = [5, 10, 20, 50];
    if (!THRESHOLDS.includes(totalDeliveries)) return;

    const parainId = dData.referredBy;
    const parainSnap = await getDoc(doc(db, 'users', parainId));
    if (!parainSnap.exists()) return;

    // Incrémenter le compteur de filleuls livreurs actifs du parrain
    await updateDoc(doc(db, 'users', parainId), {
      delivererReferralCount: increment(1),
      delivererReferralBonusAt: Timestamp.now(),
    });

    // Notification pour le parrain
    const { createNotification } = await import('@/services/notificationService');
    await createNotification(
      parainId, 'system',
      '🎉 Ton filleul livreur est actif !',
      `${dData.deliveryPartnerName || dData.name || 'Ton filleul'} vient de compléter ${totalDeliveries} livraisons grâce à ton parrainage !`,
      { delivererId }
    );
  } catch (e) {
    console.error('[delivererReferral]', e);
  }
}

// ── Récupérer les stats de parrainage livreur ───────────────────
export async function getDelivererReferralStats(uid: string): Promise<{
  referralCode: string;
  referralLink: string;
  filleulsTotal: number;
  filleulsActifs: number; // ont fait au moins 1 livraison
  filleulsBonus: number;  // ont atteint le seuil de 5
}> {
  const uSnap = await getDoc(doc(db, 'users', uid));
  if (!uSnap.exists()) return { referralCode: '', referralLink: '', filleulsTotal: 0, filleulsActifs: 0, filleulsBonus: 0 };

  const { referralCode = '', delivererReferralCount = 0 } = uSnap.data();

  // Compter les filleuls devenus livreurs
  const q = query(collection(db, 'users'),
    where('referredBy', '==', uid),
    where('deliveryCGUAccepted', '==', true)
  );
  const snap = await getDocs(q);
  const filleuls = snap.docs.map(d => d.data());
  const actifs = filleuls.filter(f => (f.totalDeliveries || 0) >= 1).length;
  const bonus  = filleuls.filter(f => (f.totalDeliveries || 0) >= DELIVERER_REFERRAL_THRESHOLD).length;

  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  return { referralCode, referralLink, filleulsTotal: filleuls.length, filleulsActifs: actifs, filleulsBonus: bonus };
}

// ── Classement live (realtime) ───────────────────────────────────
export function subscribeLeaderboard(
  callback: (entries: Awaited<ReturnType<typeof getWeeklyLeaderboard>>) => void
): () => void {
  // On re-calcule quand les orders "delivered" changent
  const { start, end } = getWeekBounds();
  const q = query(
    collection(db, 'orders'),
    where('status', 'in', ['delivered', 'cod_delivered']),
    where('deliveredAt', '>=', Timestamp.fromDate(start)),
    limit(500)
  );
  return onSnapshot(q, () => {
    getWeeklyLeaderboard().then(callback).catch(() => {});
  });
}
