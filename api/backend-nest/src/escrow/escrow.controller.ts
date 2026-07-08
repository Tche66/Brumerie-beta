import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { EscrowService } from './escrow.service';

@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrow: EscrowService) {}

  // POST /escrow/initiate — L'acheteur initie un paiement escrow
  @Post('initiate')
  async initiatePayment(
    @Body() body: {
      orderId: string;
      buyerId: string;
      amount: number;
      paymentMethod?: string;
      buyerPhone?: string;
      buyerName?: string;
    },
  ) {
    try {
      if (!this.escrow.isConfigured()) {
        return { success: false, error: 'Paiement CinetPay non configuré. Contacte le support.' };
      }
      const result = await this.escrow.initiatePayment(body);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erreur paiement' };
    }
  }

  // POST /escrow/webhook — Callback CinetPay (ne pas protéger par auth)
  @Post('webhook')
  async webhook(@Body() payload: any) {
    try {
      await this.escrow.handleWebhook(payload);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // POST /escrow/release — Libérer les fonds au vendeur (après livraison confirmée)
  @Post('release')
  async releaseFunds(@Body() body: { orderId: string }) {
    try {
      await this.escrow.releaseFunds(body.orderId);
      return { success: true, message: 'Fonds libérés au vendeur' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // POST /escrow/refund — Rembourser l'acheteur (litige résolu en faveur acheteur)
  @Post('refund')
  async refundBuyer(@Body() body: { orderId: string; reason: string }) {
    try {
      await this.escrow.refundBuyer(body.orderId, body.reason);
      return { success: true, message: 'Remboursement effectué' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // GET /escrow/status/:orderId — Vérifier le statut escrow d'une commande
  @Get('status/:orderId')
  async getStatus(@Param('orderId') orderId: string) {
    const status = await this.escrow.getEscrowStatus(orderId);
    if (!status) return { success: false, error: 'Aucune transaction escrow pour cette commande' };
    return { success: true, data: status };
  }

  // GET /escrow/health — Vérifier que CinetPay est configuré
  @Get('health')
  health() {
    return {
      configured: this.escrow.isConfigured(),
      provider: 'CinetPay',
      mode: process.env.CINETPAY_MODE || 'sandbox',
    };
  }
}
