const API_BASE = 'https://brumerie-beta-production.up.railway.app';

// ── Types Escrow ────────────────────────────────────────────────────

export type EscrowStatus =
  | 'pending_payment'    // Acheteur n'a pas encore payé
  | 'paid'              // Paiement reçu, fonds bloqués
  | 'in_delivery'       // Commande en cours de livraison
  | 'delivered'         // Acheteur a confirmé réception → libération vendeur
  | 'disputed'          // Litige ouvert, fonds gelés
  | 'dispute_evidence'  // Collecte de preuves en cours
  | 'dispute_mediation' // Médiation plateforme
  | 'refunded'          // Remboursement total acheteur
  | 'partial_refund'    // Remboursement partiel
  | 'released'          // Fonds libérés au vendeur
  | 'cancelled';        // Commande annulée avant paiement

export type DisputeResolution = 'refund_buyer' | 'pay_seller' | 'split';

export interface EscrowTransaction {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  productPrice: number;
  buyerProtectionFee: number;
  brumerieFee: number;
  sellerReceives: number;
  buyerPays: number;
  status: EscrowStatus;
  paidAt: string | null;
  releasedAt: string | null;
  disputedAt: string | null;
  resolvedAt: string | null;
  autoReleaseAt: string | null;
  disputeReason: string | null;
  disputeResolution: DisputeResolution | null;
  refundAmount: number | null;
}

export interface EscrowInitResult {
  transactionId: string;
  paymentUrl: string;
  status: 'pending_payment';
}

export interface DisputeDetails {
  orderId: string;
  reason: string;
  buyerEvidence: string[];
  sellerEvidence: string[];
  sellerResponseDeadline: string;
  status: 'open' | 'evidence' | 'mediation' | 'resolved';
  resolution: DisputeResolution | null;
  resolvedAt: string | null;
}

// ── Auth helpers ────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');
  return user.getIdToken();
}

async function authFetch(endpoint: string, body?: any, method?: string): Promise<any> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/escrow/${endpoint}`, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erreur escrow');
  return data.data;
}

// ── API Escrow ──────────────────────────────────────────────────────

export async function initiateEscrowPayment(params: {
  orderId: string;
  amount: number;
  buyerProtectionFee: number;
  totalAmount: number;
  paymentMethod?: string;
  buyerPhone?: string;
  buyerName?: string;
}): Promise<EscrowInitResult> {
  return authFetch('initiate', params);
}

export async function getEscrowStatus(orderId: string): Promise<EscrowTransaction> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/escrow/status/${orderId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function confirmDeliveryAndRelease(orderId: string): Promise<void> {
  await authFetch('confirm-delivery', { orderId });
}

// ── Litiges ─────────────────────────────────────────────────────────

export async function openDispute(orderId: string, reason: string, evidence?: string[]): Promise<void> {
  await authFetch('dispute/open', { orderId, reason, evidence });
}

export async function submitDisputeEvidence(orderId: string, evidence: string[], role: 'buyer' | 'seller'): Promise<void> {
  await authFetch('dispute/evidence', { orderId, evidence, role });
}

export async function respondToDispute(orderId: string, response: string, evidence?: string[]): Promise<void> {
  await authFetch('dispute/respond', { orderId, response, evidence });
}

export async function getDisputeDetails(orderId: string): Promise<DisputeDetails> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/escrow/dispute/${orderId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ── Admin : résolution litiges ──────────────────────────────────────

export async function resolveDispute(orderId: string, resolution: DisputeResolution, refundPercent?: number): Promise<void> {
  await authFetch('dispute/resolve', { orderId, resolution, refundPercent });
}

export async function forceReleaseFunds(orderId: string): Promise<void> {
  await authFetch('force-release', { orderId });
}

export async function forceRefund(orderId: string, percent: number): Promise<void> {
  await authFetch('force-refund', { orderId, percent });
}

// ── Santé du service ────────────────────────────────────────────────

export async function checkEscrowHealth(): Promise<{ configured: boolean; provider: string }> {
  const res = await fetch(`${API_BASE}/escrow/health`);
  return res.json();
}
