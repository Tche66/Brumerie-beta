import { Controller, Post, Body, Get, Query } from '@nestjs/common';
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

  // GET /ai/status
  @Get('status')
  status() {
    return {
      name: 'Brume IA',
      version: '1.0.0',
      status: 'active',
      features: [
        'generate-listing',
        'price-intelligence',
        'negotiate',
        'intelligent-search',
        'analyze-performance',
        'assistant-chat',
      ],
    };
  }
}
