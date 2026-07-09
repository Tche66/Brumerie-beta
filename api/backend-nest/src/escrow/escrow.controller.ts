import { Controller, Post, Body, Get, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('escrow')
export class EscrowController {
  constructor(
    private readonly escrow: EscrowService,
    private readonly prisma: PrismaService,
  ) {}

  // POST /escrow/initiate — Acheteur initie un paiement
  @Post('initiate')
  @UseGuards(FirebaseAuthGuard)
  async initiatePayment(
    @Req() req: any,
    @Body() body: {
      orderId: string;
      amount: number;
      paymentMethod?: string;
      buyerPhone?: string;
      buyerName?: string;
    },
  ) {
    try {
      if (!this.escrow.isConfigured()) {
        return { success: false, error: 'Paiement CinetPay non configuré.' };
      }
      const result = await this.escrow.initiatePayment({
        ...body,
        buyerId: req.user.uid,
      });
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erreur paiement' };
    }
  }

  // POST /escrow/webhook — Callback CinetPay (PAS protégé par auth)
  @Post('webhook')
  async webhook(@Body() payload: any) {
    try {
      await this.escrow.handleWebhook(payload);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // POST /escrow/confirm-delivery — Acheteur confirme réception → libère fonds
  @Post('confirm-delivery')
  @UseGuards(FirebaseAuthGuard)
  async confirmDelivery(@Req() req: any, @Body() body: { orderId: string }) {
    try {
      const order = await this.prisma.order.findUnique({ where: { id: body.orderId } });
      if (!order) return { success: false, error: 'Commande introuvable' };

      // Seul l'acheteur peut confirmer la réception
      if (order.buyerId !== req.user.uid) {
        throw new ForbiddenException('Seul l\'acheteur peut confirmer la réception');
      }

      const result = await this.escrow.releaseFunds(body.orderId, 'buyer');
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // POST /escrow/dispute — Acheteur ou vendeur ouvre un litige
  @Post('dispute')
  @UseGuards(FirebaseAuthGuard)
  async dispute(@Req() req: any, @Body() body: { orderId: string; reason: string }) {
    try {
      const order = await this.prisma.order.findUnique({ where: { id: body.orderId } });
      if (!order) return { success: false, error: 'Commande introuvable' };

      if (order.buyerId !== req.user.uid && order.sellerId !== req.user.uid) {
        throw new ForbiddenException('Non autorisé');
      }

      await this.escrow.openDispute(body.orderId, body.reason, req.user.uid);
      return { success: true, message: 'Litige ouvert' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // POST /escrow/admin/release — Admin force la libération (litige tranché)
  @Post('admin/release')
  @UseGuards(FirebaseAuthGuard)
  async adminRelease(@Req() req: any, @Body() body: { orderId: string }) {
    try {
      this.assertAdmin(req.user.uid);
      const result = await this.escrow.releaseFunds(body.orderId, 'admin');
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // POST /escrow/admin/refund — Admin force un remboursement
  @Post('admin/refund')
  @UseGuards(FirebaseAuthGuard)
  async adminRefund(@Req() req: any, @Body() body: { orderId: string; reason: string; partialAmount?: number }) {
    try {
      this.assertAdmin(req.user.uid);
      await this.escrow.refundBuyer(body.orderId, body.reason, body.partialAmount);
      return { success: true, message: 'Remboursement effectué' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  private assertAdmin(uid: string) {
    const adminUids = (process.env.ADMIN_UIDS || '').split(',').filter(Boolean);
    if (!adminUids.includes(uid)) {
      throw new ForbiddenException('Admin uniquement');
    }
  }

  // GET /escrow/status/:orderId — Statut escrow (participants seulement)
  @Get('status/:orderId')
  @UseGuards(FirebaseAuthGuard)
  async getStatus(@Req() req: any, @Param('orderId') orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: 'Commande introuvable' };

    if (order.buyerId !== req.user.uid && order.sellerId !== req.user.uid) {
      throw new ForbiddenException('Non autorisé');
    }

    const status = await this.escrow.getEscrowStatus(orderId);
    if (!status) return { success: false, error: 'Aucune transaction escrow' };
    return { success: true, data: status };
  }

  // POST /escrow/cron/auto-release — Appelé par un cron externe
  @Post('cron/auto-release')
  async cronAutoRelease(@Body() body: { secret?: string }) {
    if (body.secret !== (process.env.CRON_SECRET || 'brumerie-cron-2026')) {
      throw new ForbiddenException('Secret invalide');
    }
    const count = await this.escrow.processAutoReleases();
    return { success: true, released: count };
  }

  // POST /escrow/cron/reconcile — Réconcilier les paiements perdus
  @Post('cron/reconcile')
  async cronReconcile(@Body() body: { secret?: string }) {
    if (body.secret !== (process.env.CRON_SECRET || 'brumerie-cron-2026')) {
      throw new ForbiddenException('Secret invalide');
    }
    const count = await this.escrow.reconcilePendingPayments();
    return { success: true, reconciled: count };
  }

  // GET /escrow/health
  @Get('health')
  health() {
    return {
      configured: this.escrow.isConfigured(),
      provider: 'CinetPay',
      mode: process.env.CINETPAY_MODE || 'sandbox',
      features: ['split-commission', 'auto-release-72h', 'idempotent-webhook', 'reconciliation', 'disputes'],
    };
  }
}
