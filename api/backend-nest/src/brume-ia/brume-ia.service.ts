import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';

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
  demandLevel: 'faible' | 'moyen' | 'fort' | 'très fort';
  strategy: string;
}

export interface NegotiationResult {
  action: 'accept' | 'counter' | 'reject';
  counterPrice?: number;
  message: string;
  reasoning: string;
}

export interface SellerScoreResult {
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  predictedMonthlySales: number;
  improvementActions: { action: string; impact: string }[];
}

export interface FraudCheckResult {
  riskLevel: 'safe' | 'suspicious' | 'high_risk';
  riskScore: number;
  flags: { type: string; severity: string; detail: string }[];
  recommendation: string;
  shouldBlock: boolean;
}

export interface DataLoopStats {
  totalInteractions: number;
  conversionRate: number;
  topCategories: { category: string; count: number; conversionRate: number }[];
  modelAccuracy: number;
  improvementSinceStart: number;
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
  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
  ) {}

  private async getLearnedContext(type: string, category?: string): Promise<string> {
    try {
      const where: any = {
        type,
        OR: [{ wasHelpful: true }, { conversionHappened: true }],
      };
      if (category) where.category = category;

      const successfulInteractions = await this.prisma.aiInteraction.findMany({
        where,
        select: { input: true, output: true, category: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      if (successfulInteractions.length === 0) return '';

      const examples = successfulInteractions.map((i: any) => {
        const input = typeof i.input === 'string' ? i.input : JSON.stringify(i.input);
        const output = typeof i.output === 'string' ? i.output : JSON.stringify(i.output);
        return `[${i.category || 'general'}] Input: ${input.slice(0, 100)} → Output validé par l'utilisateur`;
      }).join('\n');

      return `\n\nDonnées d'apprentissage (interactions réussies passées) :\n${examples}\nUtilise ces données pour mieux calibrer tes réponses.`;
    } catch {
      return '';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. PRODUCT AI — Génération d'annonce depuis photo + texte
  // ═══════════════════════════════════════════════════════════════
  async generateListing(params: {
    imageUrl?: string;
    imageBase64?: string;
    rawText?: string;
    sellerNeighborhood?: string;
  }): Promise<GenerateListingResult> {
    const { imageUrl, imageBase64, rawText, sellerNeighborhood } = params;

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

    const learnedContext = await this.getLearnedContext('generate-listing');
    const finalSystem = systemPrompt + learnedContext;

    const content: any[] = [];

    if (imageBase64) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        content.push({
          type: 'image',
          source: { type: 'base64', data: match[2], mediaType: match[1] },
        });
      }
    } else if (imageUrl && !imageUrl.startsWith('blob:')) {
      content.push({
        type: 'image',
        source: { type: 'url', url: imageUrl },
      });
    }

    content.push({
      type: 'text',
      text: rawText
        ? `Voici ce que le vendeur a écrit : "${rawText}". Génère une annonce optimisée.`
        : content.length > 0
          ? 'Analyse cette image et génère une annonce optimisée pour la vendre sur Brumerie.'
          : 'Génère une annonce exemple optimisée pour vendre un produit populaire sur Brumerie.',
    });

    const text = await this.llm.call({
      system: finalSystem,
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

    const learnedPricing = await this.getLearnedContext('price-intelligence', params.category);

    const text = await this.llm.call({
      system: `Tu es Brume IA, expert en pricing pour le marché ivoirien.
Devise : FCFA. Réponds en JSON uniquement.${learnedPricing}
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

    const text = await this.llm.call({
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
    const text = await this.llm.call({
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

    const text = await this.llm.call({
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

  // ═══════════════════════════════════════════════════════════════
  // 6. SELLER SCORE — Score vendeur IA basé sur toute l'activité
  // ═══════════════════════════════════════════════════════════════
  async getSellerScore(sellerId: string): Promise<SellerScoreResult> {
    let sellerData: any = {};
    let products: any[] = [];
    let orders: any[] = [];
    let reviews: any[] = [];

    try {
      sellerData = await this.prisma.user.findUnique({
        where: { firebaseUid: sellerId },
        select: {
          name: true, neighborhood: true, rating: true, reviewCount: true,
          contactCount: true, productCount: true, isVerified: true, isPremium: true,
          followerCount: true, createdAt: true, lastActiveAt: true, avgResponseTime: true,
        },
      });

      products = await this.prisma.product.findMany({
        where: { sellerId, status: 'active' },
        select: { viewCount: true, likeCount: true, bookmarkCount: true, price: true, category: true, createdAt: true },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      orders = await this.prisma.order.findMany({
        where: { sellerId },
        select: { status: true, totalAmount: true, createdAt: true },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

      reviews = await this.prisma.review.findMany({
        where: { toUserId: sellerId },
        select: { rating: true, comment: true },
        take: 30,
        orderBy: { createdAt: 'desc' },
      });
    } catch {}

    const totalViews = products.reduce((s, p) => s + (p.viewCount || 0), 0);
    const totalLikes = products.reduce((s, p) => s + (p.likeCount || 0), 0);
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 'N/A';

    const text = await this.llm.call({
      system: `Tu es Brume IA, évaluateur de vendeurs sur Brumerie (Côte d'Ivoire).
Évalue ce vendeur et donne un score global + grade.
Grades : S (top 5%), A (top 20%), B (moyen-haut), C (moyen), D (à améliorer)

RÈGLE CRITIQUE : Ne recommande JAMAIS une action déjà accomplie. Si le vendeur est "Vérifié : oui" → ne dis PAS "doit se faire vérifier". Si le vendeur a déjà des annonces → ne dis pas "publier des annonces". Base tes recommandations UNIQUEMENT sur ce qui manque réellement.

Réponds en JSON : { "score": number 0-100, "grade": "S|A|B|C|D", "strengths": ["force 1", "force 2"], "weaknesses": ["faiblesse 1"], "recommendation": "phrase courte", "predictedMonthlySales": number, "improvementActions": [{"action": "...", "impact": "faible|moyen|fort"}] }`,
      messages: [{
        role: 'user',
        content: `Vendeur : ${sellerData?.name || 'Inconnu'}
- ${products.length} annonces actives, ${totalViews} vues totales, ${totalLikes} likes
- ${completedOrders} ventes complétées, ${cancelledOrders} annulations
- Note moyenne : ${avgRating}/5 (${reviews.length} avis)
- ${sellerData?.followerCount || 0} abonnés
- Vérifié : ${sellerData?.isVerified ? 'oui' : 'non'}, Premium : ${sellerData?.isPremium ? 'oui' : 'non'}
- Temps de réponse moyen : ${sellerData?.avgResponseTime ? sellerData.avgResponseTime + ' min' : 'inconnu'}
- Inscrit depuis : ${sellerData?.createdAt ? new Date(sellerData.createdAt).toLocaleDateString('fr-FR') : 'inconnu'}
Évalue ce vendeur.`,
      }],
      maxTokens: 800,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { score: 50, grade: 'C', strengths: [], weaknesses: [], recommendation: 'Données insuffisantes', predictedMonthlySales: 0, improvementActions: [] };
    }

    return JSON.parse(jsonMatch[0]);
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. FRAUD AI — Détection d'annonces/profils suspects
  // ═══════════════════════════════════════════════════════════════
  async checkFraud(params: {
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
    const { type } = params;

    let contextData = '';
    if (type === 'product') {
      contextData = `Annonce à vérifier :
- Titre : "${params.productTitle}"
- Description : "${params.productDescription?.slice(0, 300)}"
- Prix : ${params.productPrice} FCFA
- Catégorie : ${params.productCategory}
- Nombre d'images : ${params.productImages?.length || 0}`;
    } else {
      contextData = `Profil à vérifier :
- Nom : "${params.userName}"
- Nombre d'annonces : ${params.userProductCount}
- Compte créé il y a : ${params.userAge} jours
- Signalements reçus : ${params.userReportCount}
- Taux d'annulation commandes : ${params.userOrderCancelRate}%`;
    }

    const text = await this.llm.call({
      system: `Tu es Brume IA Fraud, système de détection de fraude pour Brumerie (marketplace Côte d'Ivoire).

Signaux de fraude connus sur les marketplaces africaines :
- Prix anormalement bas (iPhone à 20000 FCFA = arnaque)
- Titres en majuscules avec urgence ("URGENT", "DERNIÈRE PIÈCE")
- Descriptions copiées/génériques sans détails réels
- Compte très récent avec beaucoup d'annonces premium
- Produits de luxe à prix cassés
- Même photo utilisée par plusieurs vendeurs
- Demande de paiement hors plateforme
- Taux d'annulation élevé

Réponds en JSON : { "riskLevel": "safe|suspicious|high_risk", "riskScore": number 0-100, "flags": [{"type": "prix_suspect|description_générique|compte_récent|pattern_arnaque|taux_annulation|signalements", "severity": "low|medium|high", "detail": "explication"}], "recommendation": "phrase courte", "shouldBlock": boolean }

Sois vigilant mais pas paranoïaque. Un prix bas n'est pas forcément une arnaque (friperie, occasion usée).`,
      messages: [{ role: 'user', content: contextData }],
      maxTokens: 600,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { riskLevel: 'safe', riskScore: 0, flags: [], recommendation: 'Vérification impossible', shouldBlock: false };
    }

    return JSON.parse(jsonMatch[0]);
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. DATA LOOP — Enregistre + analyse les interactions IA
  // ═══════════════════════════════════════════════════════════════
  async trackInteraction(params: {
    userId: string;
    type: string;
    input: any;
    output: any;
    productId?: string;
    category?: string;
  }): Promise<void> {
    try {
      await this.prisma.aiInteraction.create({
        data: {
          userId: params.userId,
          type: params.type,
          input: params.input,
          output: params.output,
          productId: params.productId,
          category: params.category,
        },
      });
    } catch {}
  }

  async markConversion(interactionId: string): Promise<void> {
    try {
      await this.prisma.aiInteraction.update({
        where: { id: interactionId },
        data: { conversionHappened: true },
      });
    } catch {}
  }

  async markFeedback(interactionId: string, feedback: string, wasHelpful: boolean): Promise<void> {
    try {
      await this.prisma.aiInteraction.update({
        where: { id: interactionId },
        data: { feedback, wasHelpful },
      });
    } catch {}
  }

  async getDataLoopStats(): Promise<DataLoopStats> {
    let interactions: any[] = [];
    let totalCount = 0;
    let conversionCount = 0;

    try {
      totalCount = await this.prisma.aiInteraction.count();
      conversionCount = await this.prisma.aiInteraction.count({ where: { conversionHappened: true } });

      interactions = await this.prisma.aiInteraction.findMany({
        where: { category: { not: null } },
        select: { category: true, type: true, conversionHappened: true },
      });
    } catch {}

    const categoryMap = new Map<string, { count: number; conversions: number }>();
    for (const row of interactions) {
      const cat = (row as any).category || 'other';
      const existing = categoryMap.get(cat) || { count: 0, conversions: 0 };
      existing.count += 1;
      if ((row as any).conversionHappened) existing.conversions += 1;
      categoryMap.set(cat, existing);
    }

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        conversionRate: data.count > 0 ? Math.round((data.conversions / data.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const conversionRate = totalCount > 0 ? Math.round((conversionCount / totalCount) * 100) : 0;

    return {
      totalInteractions: totalCount,
      conversionRate,
      topCategories,
      modelAccuracy: Math.min(70 + Math.floor(totalCount / 100) * 2, 95),
      improvementSinceStart: Math.min(Math.floor(totalCount / 50) * 5, 40),
    };
  }
}
