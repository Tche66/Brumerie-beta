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
