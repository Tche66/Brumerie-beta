import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const BRUMERIE_FEE_PERCENT = 8;
const AUTO_RELEASE_HOURS = 72;

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

  constructor(private prisma: PrismaService) {
    this.apiKey = process.env.CINETPAY_API_KEY || '';
    this.siteId = process.env.CINETPAY_SITE_ID || '';
    this.baseUrl = 'https://api-checkout.cinetpay.com/v2';
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.siteId);
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIER UN PAIEMENT
  // ═══════════════════════════════════════════════════════════════
  async initiatePayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    const {
      orderId, buyerId, amount, currency = 'XOF',
      paymentMethod, buyerPhone, buyerName,
      description, returnUrl, notifyUrl,
    } = params;

    const transactionId = `BRU-${orderId}-${Date.now()}`;
    const commission = Math.round(amount * BRUMERIE_FEE_PERCENT / 100);
    const sellerReceives = amount - commission;

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

    await this.prisma.escrowTransaction.create({
      data: {
        id: transactionId,
        orderId,
        buyerId,
        amount,
        commission,
        sellerReceives,
        currency,
        status: 'pending',
        paymentUrl: data.data.payment_url,
        autoReleaseAt: new Date(Date.now() + AUTO_RELEASE_HOURS * 60 * 60 * 1000),
        metadata: { paymentMethod, buyerPhone },
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'payment_pending', paymentMethod: paymentMethod || 'cinetpay' },
    }).catch(() => {});

    this.logger.log(`Escrow initiated: ${transactionId}, total=${amount}, commission=${commission}, seller=${sellerReceives}`);

    return { transactionId, paymentUrl: data.data.payment_url, status: 'pending' };
  }

  // ═══════════════════════════════════════════════════════════════
  // WEBHOOK CINETPAY — avec idempotence
  // ═══════════════════════════════════════════════════════════════
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    const transactionId = payload.cpm_trans_id;

    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!escrow) {
      this.logger.warn(`Webhook for unknown transaction: ${transactionId}`);
      return;
    }

    // Idempotence : si déjà traité, on ignore
    if (escrow.status !== 'pending') {
      this.logger.log(`Webhook duplicate ignored: ${transactionId} already ${escrow.status}`);
      return;
    }

    // Vérifier le statut auprès de CinetPay (ne jamais faire confiance au payload seul)
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

    if (status === 'ACCEPTED') {
      await this.prisma.escrowTransaction.update({
        where: { id: transactionId },
        data: { status: 'held', paidAt: new Date() },
      });

      await this.prisma.order.update({
        where: { id: escrow.orderId },
        data: { status: 'confirmed' },
      }).catch(() => {});

      this.logger.log(`Payment held in escrow: ${transactionId}`);
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
    // Si status est 'PENDING' → on ne fait rien, on attend le prochain webhook
  }

  // ═══════════════════════════════════════════════════════════════
  // LIBÉRER LES FONDS — avec split commission
  // Appelé par: acheteur confirme OU auto-release OU admin
  // ═══════════════════════════════════════════════════════════════
  async releaseFunds(orderId: string, callerRole: 'buyer' | 'system' | 'admin'): Promise<{ sellerReceives: number; commission: number }> {
    const escrow = await this.prisma.escrowTransaction.findFirst({
      where: { orderId, status: 'held' },
    });

    if (!escrow) {
      throw new Error('Aucune transaction escrow en attente pour cette commande');
    }

    // Le vendeur ne peut JAMAIS appeler release
    // (la vérification se fait dans le controller)

    const { sellerReceives, commission } = escrow;

    // TODO: Quand l'API CinetPay Transfer sera intégrée,
    // faire le virement de `sellerReceives` au vendeur ici.
    // La commission reste sur le compte Brumerie.

    await this.prisma.escrowTransaction.update({
      where: { id: escrow.id },
      data: { status: 'released', releasedAt: new Date() },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'delivered' },
    }).catch(() => {});

    this.logger.log(`Funds released: order=${orderId}, seller=${sellerReceives} XOF, commission=${commission} XOF, by=${callerRole}`);

    return { sellerReceives, commission };
  }

  // ═══════════════════════════════════════════════════════════════
  // REMBOURSEMENT — total ou partiel
  // ═══════════════════════════════════════════════════════════════
  async refundBuyer(orderId: string, reason: string, partialAmount?: number): Promise<void> {
    const escrow = await this.prisma.escrowTransaction.findFirst({
      where: { orderId, status: 'held' },
    });

    if (!escrow) {
      throw new Error('Aucune transaction escrow à rembourser');
    }

    const refundAmount = partialAmount || escrow.amount;

    // TODO: Appel API CinetPay Refund quand disponible

    const newStatus = refundAmount >= escrow.amount ? 'refunded' : 'partial_refund';

    await this.prisma.escrowTransaction.update({
      where: { id: escrow.id },
      data: { status: newStatus, refundReason: reason, refundedAt: new Date() },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'refunded' },
    }).catch(() => {});

    this.logger.log(`Refund (${newStatus}): order=${orderId}, amount=${refundAmount} XOF, reason=${reason}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // OUVRIR UN LITIGE
  // ═══════════════════════════════════════════════════════════════
  async openDispute(orderId: string, reason: string, openedBy: string): Promise<void> {
    const escrow = await this.prisma.escrowTransaction.findFirst({
      where: { orderId, status: 'held' },
    });

    if (!escrow) {
      throw new Error('Aucune transaction escrow pour ouvrir un litige');
    }

    await this.prisma.escrowTransaction.update({
      where: { id: escrow.id },
      data: { status: 'disputed' },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'disputed' },
    }).catch(() => {});

    this.logger.warn(`Dispute opened: order=${orderId}, by=${openedBy}, reason=${reason}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTO-RELEASE — à appeler via cron toutes les heures
  // Libère les fonds si l'acheteur ne confirme pas après 72h
  // ═══════════════════════════════════════════════════════════════
  async processAutoReleases(): Promise<number> {
    const now = new Date();

    const expiredEscrows = await this.prisma.escrowTransaction.findMany({
      where: {
        status: 'held',
        autoReleaseAt: { lte: now },
      },
    });

    let released = 0;
    for (const escrow of expiredEscrows) {
      try {
        await this.releaseFunds(escrow.orderId, 'system');
        released++;
      } catch (e: any) {
        this.logger.error(`Auto-release failed for ${escrow.orderId}: ${e.message}`);
      }
    }

    if (released > 0) {
      this.logger.log(`Auto-release: ${released} transactions libérées`);
    }
    return released;
  }

  // ═══════════════════════════════════════════════════════════════
  // RECONCILIATION — vérifier les paiements pending bloqués
  // ═══════════════════════════════════════════════════════════════
  async reconcilePendingPayments(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const stalePayments = await this.prisma.escrowTransaction.findMany({
      where: {
        status: 'pending',
        createdAt: { lte: oneHourAgo },
      },
    });

    let reconciled = 0;
    for (const escrow of stalePayments) {
      try {
        const verifyResponse = await fetch(`${this.baseUrl}/payment/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apikey: this.apiKey,
            site_id: this.siteId,
            transaction_id: escrow.id,
          }),
        });

        const data = await verifyResponse.json();
        const status = data.data?.status;

        if (status === 'ACCEPTED') {
          await this.prisma.escrowTransaction.update({
            where: { id: escrow.id },
            data: { status: 'held', paidAt: new Date() },
          });
          await this.prisma.order.update({
            where: { id: escrow.orderId },
            data: { status: 'confirmed' },
          }).catch(() => {});
          reconciled++;
          this.logger.log(`Reconciled: ${escrow.id} → held`);
        } else if (status === 'REFUSED' || status === 'ERROR') {
          await this.prisma.escrowTransaction.update({
            where: { id: escrow.id },
            data: { status: 'failed', failReason: 'reconciliation: ' + status },
          });
          reconciled++;
        }
        // Si toujours PENDING après 24h → marquer expired
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (status === 'PENDING' && escrow.createdAt < twentyFourHoursAgo) {
          await this.prisma.escrowTransaction.update({
            where: { id: escrow.id },
            data: { status: 'expired' },
          });
          reconciled++;
        }
      } catch (e: any) {
        this.logger.error(`Reconciliation failed for ${escrow.id}: ${e.message}`);
      }
    }

    return reconciled;
  }

  // ═══════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════
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
      commission: escrow.commission,
      sellerReceives: escrow.sellerReceives,
      currency: escrow.currency,
      paidAt: escrow.paidAt,
      releasedAt: escrow.releasedAt,
      autoReleaseAt: escrow.autoReleaseAt,
    };
  }
}
