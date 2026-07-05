const API_BASE = 'https://brumerie-beta-production.up.railway.app';

export interface GenerateListingResult {
  title: string;
  description: string;
  category: string;
  suggestedPrice: number;
  priceMin: number;
  priceMax: number;
  condition: 'new' | 'like_new' | 'second_hand';
  tags: string[];
  sellScore: number;
  sellTimeEstimate: string;
  tips: string[];
  bestPublishTime: string;
}

export interface PriceIntelligenceResult {
  suggestedPrice: number;
  priceMin: number;
  priceMax: number;
  sellProbability: Record<string, number>;
  competitorCount: number;
  demandLevel: string;
  strategy: string;
}

export interface AssistantResponse {
  message: string;
  suggestions?: string[];
  action?: {
    type: 'navigate' | 'search' | 'create_listing' | 'contact_seller' | 'make_offer' | 'none';
    payload?: any;
  };
}

async function apiCall<T>(endpoint: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}/ai/${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Brume IA indisponible');
  return data.data;
}

export async function generateListing(params: {
  imageUrl?: string;
  rawText?: string;
  sellerNeighborhood?: string;
}): Promise<GenerateListingResult> {
  return apiCall<GenerateListingResult>('generate-listing', params);
}

export async function getPriceIntelligence(params: {
  title: string;
  category: string;
  condition: string;
  sellerPrice?: number;
  neighborhood?: string;
}): Promise<PriceIntelligenceResult> {
  return apiCall<PriceIntelligenceResult>('price-intelligence', params);
}

export async function negotiate(params: {
  productTitle: string;
  productPrice: number;
  offerPrice: number;
  minAcceptablePrice: number;
  buyerMessage?: string;
}): Promise<{ action: string; counterPrice?: number; message: string }> {
  return apiCall('negotiate', params);
}

export async function intelligentSearch(query: string): Promise<{
  query: string;
  intent: string;
  filters: any;
  suggestions: string[];
}> {
  const res = await fetch(`${API_BASE}/ai/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function analyzePerformance(params: {
  title: string;
  price: number;
  viewCount: number;
  contactCount: number;
  bookmarkCount: number;
  likeCount: number;
  daysListed: number;
  category: string;
}): Promise<{ score: number; diagnosis: string; actions: string[] }> {
  return apiCall('analyze-performance', params);
}

export async function chatWithAssistant(params: {
  userId: string;
  userRole: 'buyer' | 'seller';
  userName: string;
  userNeighborhood?: string;
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  context?: {
    currentPage?: string;
    productId?: string;
    productTitle?: string;
    productPrice?: number;
  };
}): Promise<AssistantResponse> {
  return apiCall<AssistantResponse>('assistant', params);
}

export async function getAssistantSuggestions(role: 'buyer' | 'seller'): Promise<string[]> {
  const res = await fetch(`${API_BASE}/ai/assistant/suggestions?role=${role}`);
  const data = await res.json();
  return data.data || [];
}

// ═══ SELLER SCORE ═══

export interface SellerScoreResult {
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  predictedMonthlySales: number;
  improvementActions: { action: string; impact: string }[];
}

export async function getSellerScore(sellerId: string): Promise<SellerScoreResult> {
  const res = await fetch(`${API_BASE}/ai/seller-score/${sellerId}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Brume IA indisponible');
  return data.data;
}

// ═══ FRAUD DETECTION ═══

export interface FraudCheckResult {
  riskLevel: 'safe' | 'suspicious' | 'high_risk';
  riskScore: number;
  flags: { type: string; severity: string; detail: string }[];
  recommendation: string;
  shouldBlock: boolean;
}

export async function checkFraud(params: {
  type: 'product' | 'user';
  productTitle?: string;
  productDescription?: string;
  productPrice?: number;
  productCategory?: string;
  productImages?: string[];
  userName?: string;
  userProductCount?: number;
  userAge?: number;
  userReportCount?: number;
  userOrderCancelRate?: number;
}): Promise<FraudCheckResult> {
  return apiCall<FraudCheckResult>('fraud-check', params);
}

// ═══ DATA LOOP ═══

export interface DataLoopStats {
  totalInteractions: number;
  conversionRate: number;
  topCategories: { category: string; count: number; conversionRate: number }[];
  modelAccuracy: number;
  improvementSinceStart: number;
}

export async function trackInteraction(params: {
  userId: string;
  type: string;
  input: any;
  output: any;
  productId?: string;
  category?: string;
}): Promise<void> {
  await apiCall('track', params);
}

export async function markConversion(interactionId: string): Promise<void> {
  await fetch(`${API_BASE}/ai/track/${interactionId}/conversion`, { method: 'PATCH' });
}

export async function markFeedback(interactionId: string, feedback: string, wasHelpful: boolean): Promise<void> {
  await fetch(`${API_BASE}/ai/track/${interactionId}/feedback`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback, wasHelpful }),
  });
}

export async function getDataLoopStats(): Promise<DataLoopStats> {
  const res = await fetch(`${API_BASE}/ai/data-loop/stats`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Brume IA indisponible');
  return data.data;
}
