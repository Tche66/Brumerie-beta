import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProductCard {
  id: string;
  title: string;
  price: number;
  image: string;
  condition: string;
  neighborhood: string;
  sellerName: string;
  sellerId: string;
  sellerAvatar?: string;
  isVerified?: boolean;
  flashSale?: boolean;
  originalPrice?: number;
}

export interface AssistantResponse {
  message: string;
  suggestions?: string[];
  products?: ProductCard[];
  action?: {
    type: 'navigate' | 'search' | 'create_listing' | 'contact_seller' | 'make_offer' | 'show_products' | 'none';
    payload?: any;
  };
}

@Injectable()
export class AssistantService {
  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
  ) {}

  async chat(params: {
    userId: string;
    userRole: 'buyer' | 'seller';
    userName: string;
    userNeighborhood?: string;
    message: string;
    history?: AssistantMessage[];
    context?: {
      currentPage?: string;
      productId?: string;
      productTitle?: string;
      productPrice?: number;
    };
  }): Promise<AssistantResponse> {
    const { userId, userRole, userName, userNeighborhood, message, history, context } = params;

    const isSeller = userRole === 'seller';

    const systemPrompt = `Tu es Brume IA, l'assistant intelligent intégré à Brumerie — la première plateforme de social commerce en Côte d'Ivoire.

Tu parles en français décontracté mais professionnel. Tu tutoies l'utilisateur. Tu es concis, utile et proactif.

═══ QUI TU AIDES ═══
- Nom : ${userName}
- Rôle : ${isSeller ? 'Vendeur' : 'Acheteur'}
- Quartier : ${userNeighborhood || 'Non défini'}
${context?.currentPage ? `- Page actuelle : ${context.currentPage}` : ''}
${context?.productTitle ? `- Produit consulté : "${context.productTitle}" à ${context.productPrice} FCFA` : ''}

═══ QU'EST-CE QUE BRUMERIE ═══
Brumerie est le premier social commerce de Côte d'Ivoire. C'est un mélange entre une marketplace (comme Jumia) et un réseau social (comme Instagram). Les utilisateurs peuvent acheter, vendre, suivre des vendeurs, liker, commenter, partager des produits, publier des stories, et négocier via un système d'offres intégré.

═══ CE QUE TU PEUX FAIRE ═══

${isSeller ? `
POUR LES VENDEURS :
- Créer/améliorer des annonces
- Conseiller sur les prix basé sur le marché local
- Expliquer comment vendre plus vite
- Aider avec les commandes et livraisons
- Donner des stats et tendances
- Configurer la négociation automatique
` : `
POUR LES ACHETEURS :
- Trouver des produits ("je cherche un iPhone pas cher à Cocody")
- Comparer les prix entre vendeurs
- Vérifier la fiabilité d'un vendeur
- Conseiller sur les offres à faire
- Aider avec les commandes
- Expliquer le fonctionnement de Brumerie
`}

═══ RÈGLES ═══
1. Sois CONCIS — 2-4 phrases max
2. Propose une ACTION concrète quand pertinent
3. Ne donne JAMAIS d'info personnelle d'un autre utilisateur
4. Si tu ne sais pas → oriente vers le support
5. Parle TOUJOURS en français sauf si l'utilisateur écrit en anglais
6. Si hors Brumerie → "Je suis Brume IA, je t'aide uniquement avec Brumerie"
7. Si l'utilisateur cherche un produit ou demande des recommandations → utilise l'action "show_products" avec les filtres
8. RÈGLE CRITIQUE : Ne recommande JAMAIS une action déjà accomplie. Vérifie les données fournies AVANT de conseiller. Si un vendeur est vérifié → ne dis pas "fais-toi vérifier". Si une info est déjà présente → ne la redemande pas. Base tes conseils sur ce qui MANQUE réellement.

═══ FORMAT DE RÉPONSE ═══
Réponds UNIQUEMENT en JSON valide :
{
  "message": "ta réponse texte",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "action": {
    "type": "navigate|search|create_listing|contact_seller|make_offer|show_products|none",
    "payload": { ... }
  }
}

Pour "show_products" → payload doit contenir les filtres de recherche :
{
  "type": "show_products",
  "payload": {
    "query": "mot clé optionnel",
    "category": "phones|fashion|thrift|shoes|beauty|accessories|electronics|food|babies|furniture|vehicles|services",
    "neighborhood": "quartier optionnel",
    "priceMin": number ou null,
    "priceMax": number ou null,
    "condition": "new|like_new|second_hand ou null"
  }
}
UTILISE "show_products" dès que l'utilisateur cherche, demande, ou veut voir des produits. C'est ta SUPER FONCTION — elle affiche de vrais produits du catalogue Brumerie directement dans le chat !`;

    const msgs: { role: 'user' | 'assistant'; content: string }[] = [];

    if (history?.length) {
      for (const h of history.slice(-10)) {
        msgs.push({ role: h.role, content: h.content });
      }
    }

    msgs.push({ role: 'user', content: message });

    const text = await this.llm.call({
      system: systemPrompt,
      messages: msgs,
      maxTokens: 600,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        message: text || 'Désolé, je n\'ai pas compris. Reformule ta question ?',
        suggestions: ['Aide-moi à vendre', 'Je cherche un produit', 'Comment ça marche ?'],
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const response: AssistantResponse = {
        message: parsed.message || text,
        suggestions: parsed.suggestions || [],
        action: parsed.action || { type: 'none' },
      };

      if (parsed.action?.type === 'show_products' && parsed.action.payload) {
        const products = await this.searchProducts({
          query: parsed.action.payload.query || undefined,
          category: parsed.action.payload.category || undefined,
          neighborhood: parsed.action.payload.neighborhood || undefined,
          priceMin: parsed.action.payload.priceMin || undefined,
          priceMax: parsed.action.payload.priceMax || undefined,
          condition: parsed.action.payload.condition || undefined,
          limit: 5,
        });
        response.products = products;
      }

      return response;
    } catch {
      return {
        message: text,
        suggestions: [],
      };
    }
  }

  async searchProducts(params: {
    category?: string;
    query?: string;
    neighborhood?: string;
    priceMin?: number;
    priceMax?: number;
    condition?: string;
    limit?: number;
  }): Promise<ProductCard[]> {
    try {
      const where: any = { status: 'active' };

      if (params.category) where.category = params.category;
      if (params.neighborhood) where.neighborhood = { contains: params.neighborhood, mode: 'insensitive' };
      if (params.condition) where.condition = params.condition;
      if (params.priceMin || params.priceMax) {
        where.price = {};
        if (params.priceMin) where.price.gte = params.priceMin;
        if (params.priceMax) where.price.lte = params.priceMax;
      }
      if (params.query) {
        where.OR = [
          { title: { contains: params.query, mode: 'insensitive' } },
          { description: { contains: params.query, mode: 'insensitive' } },
          { tags: { has: params.query.toLowerCase() } },
        ];
      }

      const products = await this.prisma.product.findMany({
        where,
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
          condition: true,
          neighborhood: true,
          flashSaleActive: true,
          originalPrice: true,
          seller: {
            select: {
              firebaseUid: true,
              name: true,
              photoURL: true,
              isVerified: true,
            },
          },
        },
        orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
        take: params.limit || 5,
      });

      return products.map((p: any) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        image: p.images?.[0] || '',
        condition: p.condition || 'second_hand',
        neighborhood: p.neighborhood || 'Abidjan',
        sellerName: p.seller?.name || 'Vendeur',
        sellerId: p.seller?.firebaseUid || '',
        sellerAvatar: p.seller?.photoURL || '',
        isVerified: p.seller?.isVerified || false,
        flashSale: p.flashSaleActive || false,
        originalPrice: p.originalPrice || undefined,
      }));
    } catch {
      return [];
    }
  }

  getQuickSuggestions(userRole: 'buyer' | 'seller'): string[] {
    if (userRole === 'seller') {
      return [
        'Comment vendre plus vite ?',
        'Aide-moi à créer une annonce',
        'Quel prix mettre ?',
        'Mes stats de vente',
        'Comment booster un article ?',
        'Un acheteur me pose un problème',
      ];
    }
    return [
      'Je cherche un produit',
      'C\'est quoi un vendeur vérifié ?',
      'Comment faire une offre ?',
      'Je veux signaler un vendeur',
      'Comment fonctionne la livraison ?',
      'Aide avec ma commande',
    ];
  }
}
