import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Données marché local pour le contexte IA
const MARKET_CONTEXT = {
  currency: 'FCFA',
  country: 'Côte d\'Ivoire',
  city: 'Abidjan',
  categories: [
    'fashion', 'thrift', 'shoes', 'beauty', 'phones',
    'accessories', 'electronics', 'food', 'babies', 'furniture',
    'vehicles', 'services',
  ],
  priceRanges: {
    fashion: { min: 1000, max: 50000, avg: 8000 },
    thrift: { min: 500, max: 15000, avg: 3000 },
    shoes: { min: 3000, max: 80000, avg: 12000 },
    beauty: { min: 500, max: 30000, avg: 5000 },
    phones: { min: 30000, max: 800000, avg: 150000 },
    accessories: { min: 1000, max: 50000, avg: 8000 },
    electronics: { min: 10000, max: 500000, avg: 80000 },
    food: { min: 500, max: 20000, avg: 3000 },
    babies: { min: 1000, max: 30000, avg: 5000 },
    furniture: { min: 5000, max: 300000, avg: 40000 },
    vehicles: { min: 100000, max: 15000000, avg: 2000000 },
    services: { min: 2000, max: 100000, avg: 15000 },
  },
  neighborhoods: [
    'Yopougon', 'Cocody', 'Abobo', 'Adjamé', 'Plateau', 'Marcory',
    'Treichville', 'Koumassi', 'Port-Bouët', 'Attécoubé', 'Bingerville',
    'Deux-Plateaux', 'Riviera', 'Angré',
  ],
};

export interface GenerateListingResult {
  title: string;
  description: string;
  category: string;
  suggestedPrice: number;
  priceMin: number;
  priceMax: number;
  condition: 'new' | 'like_new' | 'second_hand';
  tags: string[];
  sellScore: number; // 0-100 probabilité de vente
  sellTimeEstimate: string; // "2-3 jours"
  tips: string[]; // conseils pour mieux vendre
  bestPublishTime: string; // "18h-20h"
}

export interface PriceIntelligenceResult {
  suggestedPrice: number;
  priceMin: number;
  priceMax: number;
  sellProbability: Record<string, number>; // "2j": 85, "7j": 95, "14j": 99
  competitorCount: number;
  demandLevel: 'faible' | 'moyen' | 'fort' | 'très fort';
  strategy: string;
}

export interface NegotiationResult {
  action: 'accept' | 'counter' | 'reject';
  counterPrice?: number;
  message: string;
  reasoning: string;
}

export interface BuyerSearchResult {
  query: string;
  intent: string;
  filters: {
    category?: string;
    priceMin?: number;
    priceMax?: number;
    condition?: string;
    neighborhood?: string;
  };
  suggestions: string[];
}

@Injectable()
export class BrumeIaService {
  private anthropic: Anthropic | null = null;
  private bedrock: BedrockRuntimeClient | null = null;
  private useProvider: 'bedrock' | 'anthropic';

  constructor(private prisma: PrismaService) {
    // Priorité : Bedrock si AWS configuré, sinon Anthropic direct
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.useProvider = 'bedrock';
      this.bedrock = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    } else {
      this.useProvider = 'anthropic';
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      });
    }
  }

  // Appel unifié — fonctionne avec Bedrock OU Anthropic direct
  private async callClaude(params: {
    system: string;
    messages: { role: 'user' | 'assistant'; content: any }[];
    maxTokens?: number;
  }): Promise<string> {
    const { system, messages, maxTokens = 1500 } = params;
    const model = 'us.anthropic.claude-sonnet-4-20250514-v1:0';

    if (this.useProvider === 'bedrock' && this.bedrock) {
      const body = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        system,
        messages,
      });

      const command = new InvokeModelCommand({
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(body),
      });

      const response = await this.bedrock.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));
      return result.content?.[0]?.text || '';
    }

    // Fallback Anthropic direct
    if (this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages,
      });
      return response.content[0].type === 'text' ? response.content[0].text : '';
    }

    throw new Error('Brume IA: aucun provider configuré (AWS_ACCESS_KEY_ID ou ANTHROPIC_API_KEY requis)');
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. PRODUCT AI — Génération d'annonce depuis photo + texte
  // ═══════════════════════════════════════════════════════════════
  async generateListing(params: {
    imageUrl?: string;
    rawText?: string;
    sellerNeighborhood?: string;
  }): Promise<GenerateListingResult> {
    const { imageUrl, rawText, sellerNeighborhood } = params;

    const systemPrompt = `Tu es Brume IA, l'assistant intelligent de Brumerie — la première plateforme de social commerce en Côte d'Ivoire.

Ton rôle : transformer une photo et/ou un texte brut en annonce professionnelle optimisée pour vendre VITE.

Contexte marché :
- Devise : FCFA (Franc CFA)
- Zone : Abidjan, Côte d'Ivoire
- Catégories disponibles : ${MARKET_CONTEXT.categories.join(', ')}
- Prix moyens par catégorie : ${JSON.stringify(MARKET_CONTEXT.priceRanges)}
${sellerNeighborhood ? `- Quartier du vendeur : ${sellerNeighborhood}` : ''}

Tu dois TOUJOURS répondre en JSON valide avec cette structure exacte :
{
  "title": "titre accrocheur (max 60 caractères)",
  "description": "description vendeuse en français (150-250 mots, inclure détails produit, état, avantages)",
  "category": "une des catégories disponibles",
  "suggestedPrice": nombre en FCFA,
  "priceMin": prix minimum raisonnable,
  "priceMax": prix maximum raisonnable,
  "condition": "new" ou "like_new" ou "second_hand",
  "tags": ["tag1", "tag2", "tag3"],
  "sellScore": nombre 0-100 (probabilité de vente en 7 jours),
  "sellTimeEstimate": "estimation temps de vente",
  "tips": ["conseil 1 pour mieux vendre", "conseil 2"],
  "bestPublishTime": "tranche horaire idéale"
}

Règles :
- Prix TOUJOURS en FCFA, arrondis aux 500 FCFA
- Description en français accessible (pas trop formel)
- Titre accrocheur qui donne envie
- sellScore réaliste basé sur le prix et la demande locale
- tips concrets et actionnables`;

    const content: any[] = [];

    if (imageUrl) {
      content.push({
        type: 'image',
        source: { type: 'url', url: imageUrl },
      });
    }

    content.push({
      type: 'text',
      text: rawText
        ? `Voici ce que le vendeur a écrit : "${rawText}". Génère une annonce optimisée.`
        : 'Analyse cette image et génère une annonce optimisée pour la vendre sur Brumerie.',
    });

    const text = await this.callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content }],
      maxTokens: 1500,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Brume IA: réponse invalide');

    return JSON.parse(jsonMatch[0]);
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. PRICE INTELLIGENCE — Analyse prix marché
  // ═══════════════════════════════════════════════════════════════
  async analyzePrice(params: {
    title: string;
    category: string;
    condition: string;
    sellerPrice?: number;
    neighborhood?: string;
  }): Promise<PriceIntelligenceResult> {
    // Chercher produits similaires dans la DB
    let similarProducts: any[] = [];
    try {
      similarProducts = await this.prisma.product.findMany({
        where: {
          category: params.category,
          status: 'active',
        },
        select: { price: true, neighborhood: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } catch {}

    const avgPrice = similarProducts.length > 0
      ? Math.round(similarProducts.reduce((s, p) => s + (p.price || 0), 0) / similarProducts.length)
      : (MARKET_CONTEXT.priceRanges as any)[params.category]?.avg || 10000;

    const text = await this.callClaude({
      system: `Tu es Brume IA, expert en pricing pour le marché ivoirien.
Devise : FCFA. Réponds en JSON uniquement.
Données marché : ${similarProducts.length} produits similaires, prix moyen ${avgPrice} FCFA.
Structure : { "suggestedPrice": number, "priceMin": number, "priceMax": number, "sellProbability": {"2j": number, "7j": number, "14j": number}, "competitorCount": number, "demandLevel": "faible|moyen|fort|très fort", "strategy": "conseil pricing" }`,
      messages: [{
        role: 'user',
        content: `Produit : "${params.title}", catégorie : ${params.category}, état : ${params.condition}, quartier : ${params.neighborhood || 'Abidjan'}${params.sellerPrice ? `, prix vendeur : ${params.sellerPrice} FCFA` : ''}. Analyse le prix optimal.`,
      }],
      maxTokens: 800,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Brume IA: erreur pricing');

    return JSON.parse(jsonMatch[0]);
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. AI NEGOTIATION — Négocie pour le vendeur automatiquement
  // ═══════════════════════════════════════════════════════════════
  async negotiate(params: {
    productTitle: string;
    productPrice: number;
    offerPrice: number;
    minAcceptablePrice: number;
    buyerMessage?: string;
    previousOffers?: { price: number; from: 'buyer' | 'seller' }[];
  }): Promise<NegotiationResult> {
    const { productTitle, productPrice, offerPrice, minAcceptablePrice, buyerMessage, previousOffers } = params;

    const text = await this.callClaude({
      system: `Tu es Brume IA, agent de négociation pour un vendeur sur Brumerie (Côte d'Ivoire).

Règles :
- Prix en FCFA
- Le vendeur a fixé un prix minimum acceptable : ${minAcceptablePrice} FCFA
- Sois poli mais ferme
- Si l'offre >= prix minimum → accepte
- Si l'offre est entre 70-99% du minimum → contre-offre
- Si l'offre < 70% du minimum → rejette poliment
- Ton message doit être court, naturel, en français ivoirien décontracté

Réponds en JSON : { "action": "accept|counter|reject", "counterPrice": number ou null, "message": "message à envoyer à l'acheteur", "reasoning": "explication interne" }`,
      messages: [{
        role: 'user',
        content: `Produit : "${productTitle}" à ${productPrice} FCFA.
L'acheteur propose ${offerPrice} FCFA${buyerMessage ? ` avec le message : "${buyerMessage}"` : ''}.
${previousOffers?.length ? `Historique négo : ${JSON.stringify(previousOffers)}` : ''}
Que faire ?`,
      }],
      maxTokens: 500,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Brume IA: erreur négociation');

    return JSON.parse(jsonMatch[0]);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. BUYER AI SEARCH — Recherche en langage naturel
  // ═══════════════════════════════════════════════════════════════
  async intelligentSearch(query: string): Promise<BuyerSearchResult> {
    const text = await this.callClaude({
      system: `Tu es Brume IA, assistant achat sur Brumerie (marketplace Côte d'Ivoire).
L'utilisateur cherche un produit en langage naturel. Traduis sa requête en filtres de recherche.
Catégories : ${MARKET_CONTEXT.categories.join(', ')}
Quartiers : ${MARKET_CONTEXT.neighborhoods.join(', ')}
Réponds en JSON : { "query": "requête reformulée", "intent": "ce que l'utilisateur veut", "filters": { "category": string|null, "priceMin": number|null, "priceMax": number|null, "condition": string|null, "neighborhood": string|null }, "suggestions": ["suggestion 1", "suggestion 2"] }`,
      messages: [{
        role: 'user',
        content: query,
      }],
      maxTokens: 400,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Brume IA: erreur recherche');

    return JSON.parse(jsonMatch[0]);
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. POST-PUBLICATION MONITOR — Conseils après publication
  // ═══════════════════════════════════════════════════════════════
  async analyzePerformance(params: {
    title: string;
    price: number;
    viewCount: number;
    contactCount: number;
    bookmarkCount: number;
    likeCount: number;
    daysListed: number;
    category: string;
  }): Promise<{ score: number; diagnosis: string; actions: string[] }> {
    const { title, price, viewCount, contactCount, bookmarkCount, likeCount, daysListed } = params;

    const conversionRate = viewCount > 0 ? ((contactCount / viewCount) * 100).toFixed(1) : '0';
    const engagementRate = viewCount > 0 ? (((likeCount + bookmarkCount) / viewCount) * 100).toFixed(1) : '0';

    const text = await this.callClaude({
      system: `Tu es Brume IA, analyste de performance pour Brumerie.
Analyse les stats d'une annonce et donne des conseils concrets.
Réponds en JSON : { "score": number 0-100, "diagnosis": "phrase courte expliquant la situation", "actions": ["action concrète 1", "action 2", "action 3"] }`,
      messages: [{
        role: 'user',
        content: `Annonce "${title}" à ${price} FCFA (${params.category}).
Stats après ${daysListed} jour(s) :
- ${viewCount} vues
- ${contactCount} contacts
- ${bookmarkCount} favoris
- ${likeCount} likes
- Taux conversion : ${conversionRate}%
- Taux engagement : ${engagementRate}%
Diagnostic et actions recommandées ?`,
      }],
      maxTokens: 500,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { score: 50, diagnosis: 'Analyse indisponible', actions: [] };

    return JSON.parse(jsonMatch[0]);
  }
}
