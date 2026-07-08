import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface InitPaymentParams {
  orderId: string;
  buyerId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  buyerPhone?: string;
  buyerName?: string;
  description?: string;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface InitPaymentResult {
  transactionId: string;
  paymentUrl: string;
  status: 'pending';
}

export interface WebhookPayload {
  cpm_trans_id: string;
  cpm_site_id: string;
  cpm_trans_date: string;
  cpm_amount: string;
  cpm_currency: string;
  cpm_payment_config: string;
  cpm_phone_prefixe: string;
  cpm_celphone_num: string;
  cpm_designation: string;
  cpm_custom: string;
  cpm_error_message: string;
  payment_method: string;
  cel_phone_num: string;
  cpm_result: string;
  cpm_trans_status: string;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  private apiKey: string;
  private siteId: string;
  private baseUrl: string;
  private secretKey: string;

  constructor(private prisma: PrismaService) {
    this.apiKey = process.env.CINETPAY_API_KEY || '';
    this.siteId = process.env.CINETPAY_SITE_ID || '';
    this.secretKey = process.env.CINETPAY_SECRET_KEY || '';
    this.baseUrl = 'https://api-checkout.cinetpay.com/v2';
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.siteId);
  }

  async initiatePayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    const {
      orderId, buyerId, amount, currency = 'XOF',
      paymentMethod, buyerPhone, buyerName,
      description, returnUrl, notifyUrl,
    } = params;

    const transactionId = `BRU-${orderId}-${Date.now()}`;

    const body = {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: transactionId,
      amount: Math.round(amount),
      currency,
      description: description || `Commande Brumerie #${orderId}`,
      return_url: returnUrl || `${process.env.FRONTEND_URL || 'https://brumerie.com'}/order/${orderId}?payment=success`,
      notify_url: notifyUrl || `${process.env.API_URL || 'https://brumerie-beta-production.up.railway.app'}/escrow/webhook`,
      customer_id: buyerId,
      customer_name: buyerName || '',
      customer_phone_number: buyerPhone || '',
      channels: paymentMethod || 'ALL',
      metadata: JSON.stringify({ orderId, buyerId }),
    };

    const response = await fetch(`${this.baseUrl}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.code !== '201') {
      this.logger.error(`CinetPay init failed: ${JSON.stringify(data)}`);
      throw new Error(data.message || 'Erreur lors de l\'initialisation du paiement');
    }

    // Enregistrer la transaction escrow
    await this.prisma.escrowTransaction.create({
      data: {
        id: transactionId,
        orderId,
        buyerId,
        amount,
        currency,
        status: 'pending',
        paymentUrl: data.data.payment_url,
        metadata: { paymentMethod, buyerPhone },
      },
    });

    // Mettre à jour la commande
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'payment_pending',
        paymentMethod: paymentMethod || 'cinetpay',
      },
    }).catch(() => {});

    this.logger.log(`Escrow initiated: ${transactionId} for order ${orderId}, amount ${amount} ${currency}`);

    return {
      transactionId,
      paymentUrl: data.data.payment_url,
      status: 'pending',
    };
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    const transactionId = payload.cpm_trans_id;

    // Vérifier le statut auprès de CinetPay
    const verifyResponse = await fetch(`${this.baseUrl}/payment/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: transactionId,
      }),
    });

    const verifyData = await verifyResponse.json();
    const status = verifyData.data?.status;

    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!escrow) {
      this.logger.warn(`Webhook for unknown transaction: ${transactionId}`);
      return;
    }

    if (status === 'ACCEPTED') {
      await this.prisma.escrowTransaction.update({
        where: { id: transactionId },
        data: { status: 'held', paidAt: new Date() },
      });

      await this.prisma.order.update({
        where: { id: escrow.orderId },
        data: { status: 'confirmed' },
      }).catch(() => {});

      this.logger.log(`Payment confirmed & held in escrow: ${transactionId}`);
    } else if (status === 'REFUSED' || status === 'ERROR') {
      await this.prisma.escrowTransaction.update({
        where: { id: transactionId },
        data: { status: 'failed', failReason: verifyData.data?.description || status },
      });

      await this.prisma.order.update({
        where: { id: escrow.orderId },
        data: { status: 'cancelled' },
      }).catch(() => {});

      this.logger.warn(`Payment failed: ${transactionId} - ${status}`);
    }
  }

  async releaseFunds(orderId: string): Promise<void> {
    const escrow = await this.prisma.escrowTransaction.findFirst({
      where: { orderId, status: 'held' },
    });

    if (!escrow) {
      throw new Error('Aucune transaction escrow en attente pour cette commande');
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Commande introuvable');

    // Déclencher le transfert vers le vendeur via CinetPay
    const transferBody = {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: `RELEASE-${escrow.id}-${Date.now()}`,
      amount: escrow.amount,
      currency: escrow.currency,
      recipient_id: order.sellerId,
      metadata: JSON.stringify({ orderId, escrowId: escrow.id }),
    };

    // Note: Le transfert réel dépend de l'API CinetPay Transfer
    // Pour l'instant on marque comme released et le paiement
    // sera effectué manuellement ou via l'API Transfer quand disponible
    await this.prisma.escrowTransaction.update({
      where: { id: escrow.id },
      data: { status: 'released', releasedAt: new Date() },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'delivered' },
    }).catch(() => {});

    this.logger.log(`Funds released for order ${orderId}: ${escrow.amount} ${escrow.currency}`);
  }

  async refundBuyer(orderId: string, reason: string): Promise<void> {
    const escrow = await this.prisma.escrowTransaction.findFirst({
      where: { orderId, status: 'held' },
    });

    if (!escrow) {
      throw new Error('Aucune transaction escrow à rembourser');
    }

    // CinetPay refund via API
    // Pour l'instant on marque en refunded
    await this.prisma.escrowTransaction.update({
      where: { id: escrow.id },
      data: { status: 'refunded', refundReason: reason, refundedAt: new Date() },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    }).catch(() => {});

    this.logger.log(`Refund processed for order ${orderId}: ${reason}`);
  }

  async getEscrowStatus(orderId: string) {
    const escrow = await this.prisma.escrowTransaction.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    if (!escrow) return null;

    return {
      transactionId: escrow.id,
      status: escrow.status,
      amount: escrow.amount,
      currency: escrow.currency,
      paidAt: escrow.paidAt,
      releasedAt: escrow.releasedAt,
    };
  }
}
