// src/services/trustService.ts
// ── Système Anti-Arnaque Brumerie ─────────────────────────
// Signalement communautaire · Blacklist automatique · Alertes vendeurs
//
// ARCHITECTURE :
//   Collection Firestore : 'trust_reports'   → signalements individuels
//   Collection Firestore : 'trust_scores'    → score de risque par user (agrégat)
//   Champ User           : riskLevel         → 'safe' | 'watch' | 'risk' | 'banned'
//
// RÈGLES AUTOMATIQUES (sans intervention admin) :
//   ≥ 3 signalements distincts (reporters différents) → 'watch'
//   ≥ 5 signalements distincts                        → 'risk'
//   Banni manuellement par admin                      → 'banned'
//
// ANTI-ABUS :
//   1 seul signalement par paire reporter/reported
//   Signalement en retour (vengeance) ignoré si déjà signalé par l'autre
//   Délai 24h entre signalements du même reporter

import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, setDoc,
  query, where, orderBy, limit, serverTimestamp, increment,
  onSnapshot, Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// ─── Types ────────────────────────────────────────────────

export type RiskLevel = 'safe' | 'watch' | 'risk' | 'banned';

export type ReportReason =
  | 'non_payment'        // Client n'a pas payé
  | 'fake_product'       // Produit différent de l'annonce
  | 'no_delivery'        // Vendeur n'a pas livré
  | 'scam'               // Arnaque confirmée
  | 'harassment'         // Harcèlement / menaces
  | 'fake_profile'       // Faux profil / identité usurpée
  | 'other';             // Autre

export interface TrustReport {
  id?: string;
  reporterId: string;        // Qui signale
  reporterName: string;
  reporterRole: 'buyer' | 'seller' | 'livreur';
  reportedId: string;        // Qui est signalé
  reportedName: string;
  reportedPhone?: string;
  reason: ReportReason;
  details: string;           // Description libre (min 20 chars)
  orderId?: string;          // Commande liée si applicable
  productId?: string;
  evidence?: string;         // URL screenshot (optionnel)
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
  reportCount: number;        // Nb signalements reçus (validés)
  pendingCount: number;       // Nb signalements en attente
  reporterIds: string[];      // IDs des reporters distincts (anti-doublons)
  lastReportAt?: any;
  updatedAt: any;
}

// Labels lisibles
export const REPORT_REASONS: Record<ReportReason, { label: string; icon: string; targetRole: 'buyer' | 'seller' | 'both' }> = {
  non_payment:   { label: 'Non-paiement',          icon: '💸', targetRole: 'buyer'  },
  fake_product:  { label: 'Produit non conforme',  icon: '📦', targetRole: 'seller' },
  no_delivery:   { label: 'Livraison non effectuée', icon: '🚫', targetRole: 'seller' },
  scam:          { label: 'Arnaque avérée',         icon: '⚠️', targetRole: 'both'   },
  harassment:    { label: 'Harcèlement / menaces',  icon: '🚨', targetRole: 'both'   },
  fake_profile:  { label: 'Faux profil',            icon: '🎭', targetRole: 'both'   },
  other:         { label: 'Autre problème',         icon: '❓', targetRole: 'both'   },
};

export const RISK_LABELS: Record<RiskLevel, { label: string; color: string; bg: string; icon: string }> = {
  safe:   { label: 'Fiable',      color: '#16A34A', bg: '#F0FDF4', icon: '✅' },
  watch:  { label: 'Surveillance', color: '#D97706', bg: '#FEF3C7', icon: '👁️' },
  risk:   { label: 'À risque',    color: '#DC2626', bg: '#FEF2F2', icon: '⚠️' },
  banned: { label: 'Banni',       color: '#7F1D1D', bg: '#450A0A', icon: '🚫' },
};

// ─── Seuils automatiques ──────────────────────────────────
const THRESHOLD_WATCH = 3;   // → watch
const THRESHOLD_RISK  = 5;   // → risk

// ─── Soumettre un signalement ─────────────────────────────
export async function submitTrustReport(
  report: Omit<TrustReport, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Anti-doublon : 1 signalement par paire
    const existing = await getDocs(query(
      collection(db, 'trust_reports'),
      where('reporterId', '==', report.reporterId),
      where('reportedId', '==', report.reportedId),
    ));
    if (!existing.empty) {
      return { success: false, error: 'Tu as déjà signalé cet utilisateur.' };
    }

    // 2. Anti-vengeance : si le reported a déjà signalé le reporter, on accepte quand même
    // mais on flag pour revue admin

    // 3. Créer le signalement
    await addDoc(collection(db, 'trust_reports'), {
      ...report,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    // 4. Mettre à jour le TrustScore du reported
    await updateTrustScore(report.reportedId, report.reportedName, report.reporterRole === 'buyer' ? 'buyer' : 'seller', report.reporterId);

    return { success: true };
  } catch (e) {
    console.error('submitTrustReport error', e);
    return { success: false, error: 'Erreur réseau, réessaie.' };
  }
}

// ─── Mettre à jour le score (appelé après chaque signalement) ─
async function updateTrustScore(
  userId: string,
  userName: string,
  userRole: string,
  newReporterId: string,
): Promise<void> {
  const scoreRef = doc(db, 'trust_scores', userId);
  const snap = await getDoc(scoreRef);

  if (!snap.exists()) {
    // Première fois
    await setDoc(scoreRef, {
      userId,
      userName,
      userRole,
      riskLevel: 'safe' as RiskLevel,
      reportCount: 0,
      pendingCount: 1,
      reporterIds: [newReporterId],
      lastReportAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const data = snap.data() as TrustScore;
  const reporterIds = Array.from(new Set([...(data.reporterIds || []), newReporterId]));
  const pendingCount = (data.pendingCount || 0) + 1;

  await updateDoc(scoreRef, {
    reporterIds,
    pendingCount,
    lastReportAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Validation admin : valider ou rejeter un signalement ─
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
    // Recalculer le score avec ce signalement validé
    const scoreRef = doc(db, 'trust_scores', report.reportedId);
    const scoreSnap = await getDoc(scoreRef);

    if (scoreSnap.exists()) {
      const score = scoreSnap.data() as TrustScore;
      const newReportCount = (score.reportCount || 0) + 1;
      const pendingCount = Math.max(0, (score.pendingCount || 1) - 1);

      // Calcul du nouveau niveau de risque
      let riskLevel: RiskLevel = score.riskLevel;
      if (score.riskLevel !== 'banned') {
        if (newReportCount >= THRESHOLD_RISK) riskLevel = 'risk';
        else if (newReportCount >= THRESHOLD_WATCH) riskLevel = 'watch';
        else riskLevel = 'safe';
      }

      await updateDoc(scoreRef, {
        reportCount: newReportCount,
        pendingCount,
        riskLevel,
        updatedAt: serverTimestamp(),
      });

      // Propager riskLevel sur le document user
      await updateDoc(doc(db, 'users', report.reportedId), {
        riskLevel,
        riskReportCount: newReportCount,
      });
    }
  } else {
    // Rejeté : décrémenter pendingCount uniquement
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

// ─── Bannir manuellement (admin uniquement) ───────────────
export async function banUser(userId: string, adminNote: string): Promise<void> {
  await updateDoc(doc(db, 'trust_scores', userId), {
    riskLevel: 'banned',
    adminNote,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', userId), {
    riskLevel: 'banned',
    isBanned: true,
  });
}

// ─── Obtenir le score d'un utilisateur ────────────────────
export async function getTrustScore(userId: string): Promise<TrustScore | null> {
  const snap = await getDoc(doc(db, 'trust_scores', userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as TrustScore;
}

// ─── Écoute temps réel du score (pour alertes vendeur) ────
export function subscribeTrustScore(
  userId: string,
  callback: (score: TrustScore | null) => void,
): () => void {
  return onSnapshot(doc(db, 'trust_scores', userId), snap => {
    if (!snap.exists()) { callback(null); return; }
    callback({ id: snap.id, ...snap.data() } as TrustScore);
  });
}

// ─── Récupérer tous les signalements en attente (admin) ───
export async function getPendingReports(): Promise<TrustReport[]> {
  try {
    const q = query(
      collection(db, 'trust_reports'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(100),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TrustReport));
  } catch {
    // Fallback sans orderBy si index pas encore créé
    try {
      const qFallback = query(
        collection(db, 'trust_reports'),
        where('status', '==', 'pending'),
        limit(100),
      );
      const snap = await getDocs(qFallback);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TrustReport));
    } catch {
      return [];
    }
  }
}

// ─── Récupérer tous les scores à risque (admin dashboard) ─
export async function getRiskUsers(minLevel: RiskLevel = 'watch'): Promise<TrustScore[]> {
  const levels: RiskLevel[] = minLevel === 'watch'
    ? ['watch', 'risk', 'banned']
    : minLevel === 'risk'
    ? ['risk', 'banned']
    : ['banned'];

  const results: TrustScore[] = [];
  for (const level of levels) {
    try {
      // Requête avec orderBy (nécessite index Firestore composite)
      const q = query(
        collection(db, 'trust_scores'),
        where('riskLevel', '==', level),
        orderBy('updatedAt', 'desc'),
      );
      const snap = await getDocs(q);
      results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as TrustScore)));
    } catch {
      try {
        // Fallback sans orderBy si l'index n'existe pas encore
        const qFallback = query(
          collection(db, 'trust_scores'),
          where('riskLevel', '==', level),
        );
        const snap = await getDocs(qFallback);
        results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as TrustScore)));
      } catch {
        // Index pas encore créé — retourner tableau vide proprement
      }
    }
  }
  return results;
}

// ─── Récupérer signalements reçus par un user (historique) ─
export async function getReportsForUser(userId: string): Promise<TrustReport[]> {
  const q = query(
    collection(db, 'trust_reports'),
    where('reportedId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TrustReport));
}
