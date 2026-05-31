// src/services/apiClient.ts
// Client HTTP centralisé — toutes les requêtes vers le backend NestJS
import { auth } from '@/config/firebase';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://brumerie-beta-production.up.railway.app';

// ── Récupérer le token Firebase JWT ──────────────────────────────
async function getToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// ── Requête générique ─────────────────────────────────────────────
async function request<T>(
  method: string,
  path: string,
  body?: any,
  requiresAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(error.message || `Erreur ${res.status}`);
  }

  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────
export const api = {
  get:    <T>(path: string, auth = true) => request<T>('GET', path, undefined, auth),
  post:   <T>(path: string, body?: any, auth = true) => request<T>('POST', path, body, auth),
  put:    <T>(path: string, body?: any, auth = true) => request<T>('PUT', path, body, auth),
  patch:  <T>(path: string, body?: any, auth = true) => request<T>('PATCH', path, body, auth),
  delete: <T>(path: string, auth = true) => request<T>('DELETE', path, undefined, auth),
};

// ═══════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════
export const usersApi = {
  sync: (data: { firebaseUid: string; email: string; name: string; phone?: string; photoURL?: string; role?: string }) =>
    api.post('/users/sync', data),

  getMe: () =>
    api.get('/users/me'),

  updateMe: (data: Record<string, any>) =>
    api.put('/users/me', data),

  updatePresence: () =>
    api.patch('/users/me/presence'),

  getPublicProfile: (firebaseUid: string) =>
    api.get(`/users/${firebaseUid}`, false),

  follow: (sellerId: string) =>
    api.post(`/users/${sellerId}/follow`),

  search: (q: string, neighborhood?: string) =>
    api.get(`/users/search?q=${encodeURIComponent(q)}${neighborhood ? `&neighborhood=${neighborhood}` : ''}`, false),
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════
export const productsApi = {
  getAll: (params?: { category?: string; neighborhood?: string; search?: string; cursor?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return api.get(`/products${qs ? `?${qs}` : ''}`, false);
  },

  getById: (id: string) =>
    api.get(`/products/${id}`, false),

  getTrending: () =>
    api.get('/products/trending', false),

  getBySelller: (sellerId: string, status?: string) =>
    api.get(`/products/seller/${sellerId}${status ? `?status=${status}` : ''}`, false),

  create: (data: Record<string, any>) =>
    api.post('/products', data),

  update: (id: string, data: Record<string, any>) =>
    api.put(`/products/${id}`, data),

  delete: (id: string) =>
    api.delete(`/products/${id}`),

  incrementView: (id: string) =>
    api.patch(`/products/${id}/view`, undefined, false),

  incrementWhatsApp: (id: string) =>
    api.patch(`/products/${id}/whatsapp`, undefined, false),

  toggleLike: (id: string) =>
    api.post(`/products/${id}/like`),

  toggleBookmark: (id: string) =>
    api.post(`/products/${id}/bookmark`),

  getBookmarks: () =>
    api.get('/products/bookmarks'),

  addComment: (id: string, text: string, photoUrl?: string) =>
    api.post(`/products/${id}/comments`, { text, photoUrl }),

  deleteComment: (productId: string, commentId: string) =>
    api.delete(`/products/${productId}/comments/${commentId}`),
};

// ═══════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════
export const ordersApi = {
  create: (data: Record<string, any>) =>
    api.post('/orders', data),

  getMyOrders: () =>
    api.get('/orders/my'),

  getById: (id: string) =>
    api.get(`/orders/${id}`),

  updateStatus: (id: string, status: string, extra?: Record<string, any>) =>
    api.patch(`/orders/${id}/status`, { status, extra }),
};

// ═══════════════════════════════════════════════════════════════
// DELIVERY
// ═══════════════════════════════════════════════════════════════
export const deliveryApi = {
  getAvailable: (zone?: string) =>
    api.get(`/delivery/available${zone ? `?zone=${zone}` : ''}`, false),

  getMyOrders: () =>
    api.get('/delivery/my-orders'),

  calcFee: (delivererId: string, from: string, to: string) =>
    api.get(`/delivery/fee?delivererId=${delivererId}&from=${from}&to=${to}`, false),

  assign: (orderId: string, delivererId: string, deliveryFee: number) =>
    api.post('/delivery/assign', { orderId, delivererId, deliveryFee }),

  accept: (orderId: string) =>
    api.patch(`/delivery/${orderId}/accept`),

  pickup: (orderId: string) =>
    api.patch(`/delivery/${orderId}/pickup`),

  validate: (orderId: string, code: string) =>
    api.patch(`/delivery/${orderId}/validate`, { code }),
};

// ═══════════════════════════════════════════════════════════════
// TRUST
// ═══════════════════════════════════════════════════════════════
export const trustApi = {
  createReview: (data: Record<string, any>) =>
    api.post('/trust/reviews', data),

  getScore: (userId: string) =>
    api.get(`/trust/score/${userId}`, false),

  report: (reportedId: string, details: string) =>
    api.post('/trust/reports', { reportedId, details }),
};

// ═══════════════════════════════════════════════════════════════
// REFERRALS
// ═══════════════════════════════════════════════════════════════
export const referralsApi = {
  apply: (code: string) =>
    api.post('/referrals/apply', { code }),

  getStats: () =>
    api.get('/referrals/stats'),

  getMyReferrals: () =>
    api.get('/referrals/my'),

  getByCode: (code: string) =>
    api.get(`/referrals/code/${code}`, false),
};

// ═══════════════════════════════════════════════════════════════
// BOOSTS
// ═══════════════════════════════════════════════════════════════
export const boostsApi = {
  create: (productId: string, duration: string, waveRef?: string) =>
    api.post('/boosts', { productId, duration, waveRef }),

  getActive: () =>
    api.get('/boosts/active', false),

  getMy: () =>
    api.get('/boosts/my'),

  getPending: () =>
    api.get('/boosts/pending'),

  activate: (id: string) =>
    api.patch(`/boosts/${id}/activate`),

  reject: (id: string, reason?: string) =>
    api.patch(`/boosts/${id}/reject`, { reason }),
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
export const dashboardApi = {
  health: () =>
    api.get('/dashboard/health', false),
};
