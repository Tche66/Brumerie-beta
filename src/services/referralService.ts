// src/services/referralService.ts — migré vers backend NestJS
import { referralsApi } from './apiClient';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

// ── Générer un code (conservé pour rétrocompatibilité) ────────────
export function generateReferralCode(name: string): string {
  const base = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'BRU';
  const nums = Math.floor(1000 + Math.random() * 9000);
  return `${base}${nums}`;
}

// ── Assigner un code parrainage — délégué au backend ─────────────
export async function ensureReferralCode(uid: string, name: string): Promise<string> {
  // Le backend génère automatiquement le code à la création du user (sync)
  // On lit depuis Firestore pour rétrocompatibilité
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists() && snap.data().referralCode) return snap.data().referralCode;
  return generateReferralCode(name);
}

// ── Trouver un user par son code parrainage ───────────────────────
export async function getUserByReferralCode(code: string): Promise<string | null> {
  if (!code.trim()) return null;
  try {
    const user = await referralsApi.getByCode(code) as any;
    return user?.firebaseUid ?? null;
  } catch {
    return null;
  }
}

// ── Appliquer un parrainage à l'inscription ───────────────────────
export async function applyReferral(newUserId: string, referralCode: string): Promise<boolean> {
  if (!referralCode.trim()) return false;
  try {
    await referralsApi.apply(referralCode);
    return true;
  } catch (e) {
    console.warn('[Referral] Apply failed:', e);
    return false;
  }
}

// ── Stats parrainage ──────────────────────────────────────────────
export async function getReferralStats(uid: string) {
  try {
    const stats = await referralsApi.getStats() as any;
    return {
      code:              stats.referralCode || '',
      count:             stats.referralCount || 0,
      bonusPublications: stats.referralBonusPublications || 0,
      bonusChats:        stats.referralBonusChats || 0,
      freeVerifiedUntil: stats.referralFreeVerifiedUntil || null,
      nextReward:        stats.nextReward || null,
      referralLink:      stats.referralLink || '',
    };
  } catch {
    return null;
  }
}

// ── Lien de parrainage ────────────────────────────────────────────
export function buildReferralLink(code: string): string {
  return `${window.location.origin}?ref=${code}`;
}

// ── Recalculer — délégué au backend ──────────────────────────────
export async function recalculateReferralCount(uid: string): Promise<number> {
  try {
    const stats = await referralsApi.getStats() as any;
    return stats.referralCount || 0;
  } catch {
    return 0;
  }
}
