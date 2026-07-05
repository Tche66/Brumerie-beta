import { Controller, Post, Body, Get, Query, Param, Patch } from '@nestjs/common';
import { BrumeIaService } from './brume-ia.service';
import { AssistantService, AssistantMessage } from './assistant.service';

@Controller('ai')
export class BrumeIaController {
  constructor(
    private readonly brumeIa: BrumeIaService,
    private readonly assistant: AssistantService,
  ) {}

  // POST /ai/generate-listing
  // Le vendeur envoie une photo + texte brut → Brume IA retourne une annonce complète
  @Post('generate-listing')
  async generateListing(
    @Body() body: { imageUrl?: string; rawText?: string; sellerNeighborhood?: string },
  ) {
    try {
      const result = await this.brumeIa.generateListing(body);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Brume IA indisponible' };
    }
  }

  // POST /ai/price-intelligence
  // Analyse prix marché pour un produit
  @Post('price-intelligence')
  async priceIntelligence(
    @Body() body: { title: string; category: string; condition: string; sellerPrice?: number; neighborhood?: string },
  ) {
    try {
      const result = await this.brumeIa.analyzePrice(body);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Brume IA indisponible' };
    }
  }

  // POST /ai/negotiate
  // Agent de négociation automatique
  @Post('negotiate')
  async negotiate(
    @Body() body: {
      productTitle: string;
      productPrice: number;
      offerPrice: number;
      minAcceptablePrice: number;
      buyerMessage?: string;
      previousOffers?: { price: number; from: 'buyer' | 'seller' }[];
    },
  ) {
    try {
      const result = await this.brumeIa.negotiate(body);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Brume IA indisponible' };
    }
  }

  // GET /ai/search?q=...
  // Recherche intelligente en langage naturel
  @Get('search')
  async intelligentSearch(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return { success: false, error: 'Requête trop courte' };
    }
    try {
      const result = await this.brumeIa.intelligentSearch(query.trim());
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Brume IA indisponible' };
    }
  }

  // POST /ai/analyze-performance
  // Diagnostic de performance d'une annonce
  @Post('analyze-performance')
  async analyzePerformance(
    @Body() body: {
      title: string; price: number; viewCount: number;
      contactCount: number; bookmarkCount: number; likeCount: number;
      daysListed: number; category: string;
    },
  ) {
    try {
      const result = await this.brumeIa.analyzePerformance(body);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Brume IA indisponible' };
    }
  }

  // POST /ai/assistant
  // Chat avec Brume IA — assistant intelligent contextuel
  @Post('assistant')
  async assistantChat(
    @Body() body: {
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
    },
  ) {
    if (!body.message?.trim()) {
      return { success: false, error: 'Message requis' };
    }
    try {
      const result = await this.assistant.chat(body);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Brume IA indisponible' };
    }
  }

  // GET /ai/assistant/suggestions?role=buyer|seller
  // Suggestions rapides pour démarrer une conversation
  @Get('assistant/suggestions')
  assistantSuggestions(@Query('role') role: string) {
    const suggestions = this.assistant.getQuickSuggestions(
      role === 'seller' ? 'seller' : 'buyer',
    );
    return { success: true, data: suggestions };
  }

  // GET /ai/seller-score/:sellerId
  // Score IA du vendeur basé sur toute son activité
  @Get('seller-score/:sellerId')
  async sellerScore(@Param('sellerId') sellerId: string) {
    if (!sellerId) return { success: false, error: 'sellerId requis' };
    try {
      const result = await this.brumeIa.getSellerScore(sellerId);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Brume IA indisponible' };
    }
  }

  // POST /ai/fraud-check
  // Détection de fraude sur une annonce ou un profil
  @Post('fraud-check')
  async fraudCheck(
    @Body() body: {
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
    },
  ) {
    try {
      const result = await this.brumeIa.checkFraud(body);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Brume IA indisponible' };
    }
  }

  // POST /ai/track
  // Enregistre une interaction IA (data loop)
  @Post('track')
  async trackInteraction(
    @Body() body: {
      userId: string;
      type: string;
      input: any;
      output: any;
      productId?: string;
      category?: string;
    },
  ) {
    try {
      await this.brumeIa.trackInteraction(body);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // PATCH /ai/track/:id/conversion
  // Marque une interaction comme ayant mené à une conversion (vente)
  @Patch('track/:id/conversion')
  async markConversion(@Param('id') id: string) {
    try {
      await this.brumeIa.markConversion(id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // PATCH /ai/track/:id/feedback
  // L'utilisateur donne son avis sur une recommandation IA
  @Patch('track/:id/feedback')
  async markFeedback(
    @Param('id') id: string,
    @Body() body: { feedback: string; wasHelpful: boolean },
  ) {
    try {
      await this.brumeIa.markFeedback(id, body.feedback, body.wasHelpful);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // GET /ai/data-loop/stats
  // Stats du data flywheel pour le dashboard
  @Get('data-loop/stats')
  async dataLoopStats() {
    try {
      const result = await this.brumeIa.getDataLoopStats();
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // GET /ai/status
  @Get('status')
  status() {
    return {
      name: 'Brume IA',
      version: '2.0.0',
      status: 'active',
      features: [
        'generate-listing',
        'price-intelligence',
        'negotiate',
        'intelligent-search',
        'analyze-performance',
        'seller-score',
        'fraud-detection',
        'data-loop',
        'assistant-chat',
      ],
    };
  }
}
