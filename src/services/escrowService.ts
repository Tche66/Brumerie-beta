const API_BASE = 'https://brumerie-beta-production.up.railway.app';

export interface EscrowInitResult {
  transactionId: string;
  paymentUrl: string;
  status: 'pending';
}

export interface EscrowStatus {
  transactionId: string;
  status: string;
  amount: number;
  commission: number;
  sellerReceives: number;
  currency: string;
  paidAt: string | null;
  releasedAt: string | null;
  autoReleaseAt: string | null;
}

async function getAuthToken(): Promise<string> {
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');
  return user.getIdToken();
}

async function authFetch(endpoint: string, body?: any): Promise<any> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/escrow/${endpoint}`, {
    method: body ? 'POST' : 'GET',
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

export async function initiateEscrowPayment(params: {
  orderId: string;
  amount: number;
  paymentMethod?: string;
  buyerPhone?: string;
  buyerName?: string;
}): Promise<EscrowInitResult> {
  return authFetch('initiate', params);
}

export async function confirmDelivery(orderId: string): Promise<void> {
  await authFetch('confirm-delivery', { orderId });
}

export async function openDispute(orderId: string, reason: string): Promise<void> {
  await authFetch('dispute', { orderId, reason });
}

export async function getEscrowStatus(orderId: string): Promise<EscrowStatus> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/escrow/status/${orderId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function checkEscrowHealth(): Promise<{ configured: boolean; provider: string }> {
  const res = await fetch(`${API_BASE}/escrow/health`);
  return res.json();
}
