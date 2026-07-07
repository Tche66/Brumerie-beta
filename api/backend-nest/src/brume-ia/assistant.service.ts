import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantResponse {
  message: string;
  suggestions?: string[];
  action?: {
    type: 'navigate' | 'search' | 'create_listing' | 'contact_seller' | 'make_offer' | 'none';
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

═══ FORMAT DE RÉPONSE ═══
Réponds UNIQUEMENT en JSON valide :
{
  "message": "ta réponse texte",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "action": {
    "type": "navigate|search|create_listing|contact_seller|make_offer|none",
    "payload": { ... }
  }
}`;

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
      return {
        message: parsed.message || text,
        suggestions: parsed.suggestions || [],
        action: parsed.action || { type: 'none' },
      };
    } catch {
      return {
        message: text,
        suggestions: [],
      };
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
