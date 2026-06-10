// src/services/trustService.ts — v2 hybride NestJS + Firestore
// Logique anti-arnaque Brumerie — signalements communautaires
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, setDoc,
  query, where, orderBy, limit, serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { trustApi } from './apiClient';

// ─── Types ────────────────────────────────────────────────────────
export type RiskLevel = 'safe' | 'watch' | 'risk' | 'banned';

export type ReportReason =
  | 'non_payment' | 'fake_product' | 'no_delivery'
  | 'stolen_package' | 'scam' | 'harassment' | 'fake_profile' | 'other';

export interface TrustReport {
  id?: string;
  reporterId: string;
  reporterName: string;
  reporterRole: 'buyer' | 'seller' | 'livreur';
  reportedId: string;
  reportedName: string;
  reportedPhone?: string;
  reason: ReportReason;
  details: string;
  orderId?: string;
  productId?: string;
  evidence?: string;
  status: 'pending' | 'validated' | 'rejected';
  adminNote?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface TrustScore {
  userId: string;
  userName: string;
  userPhone?: string;
  userRole: string;
  riskLevel: RiskLevel;
  reportCount: number;
  pendingCount: number;
  reporterIds: string[];
  lastReportAt?: any;
  updatedAt: any;
}

export const REPORT_REASONS: Record<ReportReason, { label: string; icon: string; targetRole: 'buyer' | 'seller' | 'livreur' | 'both' }> = {
  non_payment:    { label: 'Non-paiement',            icon: '💸', targetRole: 'buyer'   },
  fake_product:   { label: 'Produit non conforme',    icon: '📦', targetRole: 'seller'  },
  no_delivery:    { label: 'Livraison non effectuée', icon: '🚫', targetRole: 'seller'  },
  stolen_package: { label: 'Colis volé / détourné',  icon: '🏍️', targetRole: 'livreur' },
  scam:           { label: 'Arnaque avérée',          icon: '⚠️', targetRole: 'both'    },
  harassment:     { label: 'Harcèlement / menaces',  icon: '🚨', targetRole: 'both'    },
  fake_profile:   { label: 'Faux profil',             icon: '🎭', targetRole: 'both'    },
  other:          { label: 'Autre problème',          icon: '❓', targetRole: 'both'    },
};

export const RISK_LABELS: Record<RiskLevel, { label: string; color: string; bg: string; icon: string }> = {
  safe:   { label: 'Fiable',       color: '#16A34A', bg: '#F0FDF4', icon: '✅' },
  watch:  { label: 'Surveillance', color: '#D97706', bg: '#FEF3C7', icon: '👁️' },
  risk:   { label: 'À risque',     color: '#DC2626', bg: '#FEF2F2', icon: '⚠️' },
  banned: { label: 'Banni',        color: '#7F1D1D', bg: '#450A0A', icon: '🚫' },
};

const THRESHOLD_WATCH = 3;
const THRESHOLD_RISK  = 5;

// ─── Soumettre un signalement — Firestore + sync Neon ─────────────
export async function submitTrustReport(
  report: Omit<TrustReport, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Anti-doublon
    try {
      const existing = await getDocs(query(
        collection(db, 'trust_reports'),
        where('reporterId', '==', report.reporterId),
        where('reportedId', '==', report.reportedId),
      ));
      if (!existing.empty) return { success: false, error: 'Tu as déjà signalé cet utilisateur.' };
    } catch {}

    const cleanReport: Record<string, any> = {
      reporterId:   report.reporterId,
      reporterName: report.reporterName,
      reporterRole: report.reporterRole,
      reportedId:   report.reportedId,
      reportedName: report.reportedName,
      reason:       report.reason,
      details:      report.details,
      status:       'pending',
      createdAt:    serverTimestamp(),
    };
    if (report.reportedPhone) cleanReport.reportedPhone = report.reportedPhone;
    if (report.orderId)       cleanReport.orderId       = report.orderId;
    if (report.productId)     cleanReport.productId     = report.productId;

    // Firestore — source de vérité
    await addDoc(collection(db, 'trust_reports'), cleanReport);

    // Sync Neon en background
    trustApi.report(report.reportedId, report.details).catch(() => {});

    // Mettre à jour TrustScore local
    const isManualId = report.reportedId.startsWith('manual_')
      || report.reportedId.startsWith('+')
      || report.reportedId.length < 15;
    await updateTrustScore(
      report.reportedId, report.reportedName,
      report.reporterRole, report.reporterId, isManualId,
    );

    return { success: true };
  } catch (e: any) {
    if (e?.code === 'permission-denied') return { success: false, error: 'Permission refusée. Vérifie que tu es bien connecté.' };
    if (e?.code === 'unavailable') return { success: false, error: 'Connexion internet instable. Réessaie.' };
    return { success: false, error: 'Une erreur est survenue. Réessaie.' };
  }
}

// ─── Mettre à jour le score ───────────────────────────────────────
async function updateTrustScore(
  userId: string, userName: string, userRole: string,
  newReporterId: string, isManualId = false,
): Promise<void> {
  const scoreRef = doc(db, 'trust_scores', userId);
  const snap = await getDoc(scoreRef);

  if (!snap.exists()) {
    await setDoc(scoreRef, {
      userId, userName, userRole,
      riskLevel: 'safe' as RiskLevel,
      reportCount: 0, pendingCount: 1,
      reporterIds: [newReporterId],
      isManualEntry: isManualId,
      lastReportAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const data = snap.data() as TrustScore;
  const reporterIds = Array.from(new Set([...(data.reporterIds || []), newReporterId]));
  await updateDoc(scoreRef, {
    reporterIds,
    pendingCount: (data.pendingCount || 0) + 1,
    lastReportAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Validation admin ─────────────────────────────────────────────
export async function validateReport(
  reportId: string,
  action: 'validated' | 'rejected',
  adminNote?: string,
): Promise<void> {
  const reportRef = doc(db, 'trust_reports', reportId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) return;
  const report = snap.data() as TrustReport;

  await updateDoc(reportRef, {
    status: action,
    adminNote: adminNote || '',
    updatedAt: serverTimestamp(),
  });

  if (action === 'validated') {
    const scoreRef = doc(db, 'trust_scores', report.reportedId);
    const scoreSnap = await getDoc(scoreRef);
    if (scoreSnap.exists()) {
      const score = scoreSnap.data() as TrustScore;
      const newReportCount = (score.reportCount || 0) + 1;
      const pendingCount = Math.max(0, (score.pendingCount || 1) - 1);
      let riskLevel: RiskLevel = score.riskLevel;
      if (score.riskLevel !== 'banned') {
        if (newReportCount >= THRESHOLD_RISK)  riskLevel = 'risk';
        else if (newReportCount >= THRESHOLD_WATCH) riskLevel = 'watch';
        else riskLevel = 'safe';
      }
      await updateDoc(scoreRef, { reportCount: newReportCount, pendingCount, riskLevel, updatedAt: serverTimestamp() });

      const isManual = (scoreSnap.data() as any).isManualEntry === true
        || report.reportedId.startsWith('manual_')
        || report.reportedId.startsWith('+')
        || report.reportedId.length < 15;
      if (!isManual) {
        updateDoc(doc(db, 'users', report.reportedId), { riskLevel, riskReportCount: newReportCount }).catch(() => {});
      }
    }
  } else {
    const scoreRef = doc(db, 'trust_scores', report.reportedId);
    const scoreSnap = await getDoc(scoreRef);
    if (scoreSnap.exists()) {
      await updateDoc(scoreRef, {
        pendingCount: Math.max(0, (scoreSnap.data()?.pendingCount || 1) - 1),
        updatedAt: serverTimestamp(),
      });
    }
  }
}

// ─── Bannir (admin) ───────────────────────────────────────────────
export async function banUser(userId: string, adminNote: string): Promise<void> {
  await updateDoc(doc(db, 'trust_scores', userId), {
    riskLevel: 'banned', adminNote, updatedAt: serverTimestamp(),
  });
  const isManual = userId.startsWith('manual_') || userId.startsWith('+') || userId.length < 15;
  if (!isManual) {
    updateDoc(doc(db, 'users', userId), { riskLevel: 'banned', isBanned: true }).catch(() => {});
  }
}

// ─── Lectures ────────────────────────────────────────────────────
export async function getTrustScore(userId: string): Promise<TrustScore | null> {
  // Essayer Neon — mais seulement si le retour contient un riskLevel valide
  try {
    const score = await trustApi.getScore(userId) as any;
    if (score && score.riskLevel) return score;
  } catch {}
  // Fallback Firestore
  try {
    const snap = await getDoc(doc(db, 'trust_scores', userId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as TrustScore;
  } catch { return null; }
}

export function subscribeTrustScore(
  userId: string,
  callback: (score: TrustScore | null) => void,
): () => void {
  return onSnapshot(doc(db, 'trust_scores', userId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } as TrustScore : null);
  });
}

export async function getPendingReports(): Promise<TrustReport[]> {
  try {
    const q = query(collection(db, 'trust_reports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TrustReport));
  } catch {
    try {
      const snap = await getDocs(query(collection(db, 'trust_reports'), where('status', '==', 'pending'), limit(100)));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TrustReport));
    } catch { return []; }
  }
}

export async function getRiskUsers(minLevel: RiskLevel = 'watch'): Promise<TrustScore[]> {
  const levels: RiskLevel[] = minLevel === 'watch' ? ['watch', 'risk', 'banned']
    : minLevel === 'risk' ? ['risk', 'banned'] : ['banned'];
  const results: TrustScore[] = [];
  for (const level of levels) {
    try {
      const snap = await getDocs(query(collection(db, 'trust_scores'), where('riskLevel', '==', level), orderBy('updatedAt', 'desc')));
      results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as TrustScore)));
    } catch {
      try {
        const snap = await getDocs(query(collection(db, 'trust_scores'), where('riskLevel', '==', level)));
        results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as TrustScore)));
      } catch {}
    }
  }
  return results;
}

export async function getReportsForUser(userId: string): Promise<TrustReport[]> {
  const q = query(collection(db, 'trust_reports'), where('reportedId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TrustReport));
}
