import { Controller, Post, Body, Get, Query, Param, Patch, UseGuards } from '@nestjs/common';
import { BrumeIaService } from './brume-ia.service';
import { AssistantService, AssistantMessage } from './assistant.service';
import { LlmService } from '../llm/llm.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';

@Controller('ai')
export class BrumeIaController {
  constructor(
    private readonly brumeIa: BrumeIaService,
    private readonly assistant: AssistantService,
    private readonly llm: LlmService,
  ) {}

  // POST /ai/generate-listing
  @Post('generate-listing')
  @UseGuards(FirebaseAuthGuard)
  async generateListing(
    @Body() body: { imageUrl?: string; imageBase64?: string; rawText?: string; sellerNeighborhood?: string },
  ) {
    try {
      const result = await this.brumeIa.generateListing(body);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Brume IA indisponible' };
    }
  }

  // POST /ai/price-intelligence
  @Post('price-intelligence')
  @UseGuards(FirebaseAuthGuard)
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
  @Post('negotiate')
  @UseGuards(FirebaseAuthGuard)
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
  @Get('search')
  @UseGuards(FirebaseAuthGuard)
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
  @Post('analyze-performance')
  @UseGuards(FirebaseAuthGuard)
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
  @Post('assistant')
  @UseGuards(FirebaseAuthGuard)
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
  @Get('seller-score/:sellerId')
  @UseGuards(FirebaseAuthGuard)
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
  @Post('fraud-check')
  @UseGuards(FirebaseAuthGuard)
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
  @UseGuards(FirebaseAuthGuard)
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
  @Patch('track/:id/conversion')
  @UseGuards(FirebaseAuthGuard)
  async markConversion(@Param('id') id: string) {
    try {
      await this.brumeIa.markConversion(id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // PATCH /ai/track/:id/feedback
  @Patch('track/:id/feedback')
  @UseGuards(FirebaseAuthGuard)
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
      version: '3.0.0',
      status: 'active',
      provider: {
        active: this.llm.getActiveProviderName(),
        available: this.llm.getAvailableProviders(),
      },
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
