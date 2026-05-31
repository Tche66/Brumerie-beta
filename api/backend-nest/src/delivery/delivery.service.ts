import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService) {}

  // ── Livreurs disponibles pour une zone ───────────────────────
  async getAvailableDeliverers(zone?: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'livreur',
        deliveryAvailable: true,
        isBanned: false,
        ...(zone ? { deliveryZones: { has: zone } } : {}),
      },
      select: {
        firebaseUid: true,
        name: true,
        photoURL: true,
        phone: true,
        neighborhood: true,
        deliveryZones: true,
        deliveryPriceSameZone: true,
        deliveryPriceOtherZone: true,
        deliveryBio: true,
        deliveryPhotoURL: true,
        totalDeliveries: true,
        trustScore: true,
        isVerified: true,
      },
      orderBy: [
        { isVerified: 'desc' },
        { totalDeliveries: 'desc' },
      ],
    });
  }

  // ── Assigner un livreur à une commande ────────────────────────
  async assignDeliverer(params: {
    orderId: string;
    delivererId: string;
    deliveryFee: number;
    requestedBy: string;
  }) {
    const order = await this.prisma.order.findUnique({ where: { id: params.orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');

    const canAssign = order.sellerId === params.requestedBy || order.buyerId === params.requestedBy;
    if (!canAssign) throw new ForbiddenException('Accès refusé');

    const deliverer = await this.prisma.user.findUnique({
      where: { firebaseUid: params.delivererId },
      select: { name: true, phone: true },
    });
    if (!deliverer) throw new NotFoundException('Livreur introuvable');

    // Générer le code de livraison
    const deliveryCode = Math.random().toString(36).slice(2, 8).toUpperCase();

    // Nouveau statut selon l'état actuel
    let newStatus = order.status;
    if (order.status === 'confirmed') newStatus = 'ready' as any;

    return this.prisma.order.update({
      where: { id: params.orderId },
      data: {
        delivererId:            params.delivererId,
        delivererName:          deliverer.name,
        delivererPhone:         deliverer.phone ?? undefined,
        delivererProposedBy:    params.requestedBy,
        deliveryFee:            params.deliveryFee,
        deliveryCode,
        deliveryCodeGeneratedAt: new Date(),
        deliveryRequestedAt:    new Date(),
        status:                 newStatus,
      },
    });
  }

  // ── Livreur accepte une commande ──────────────────────────────
  async acceptDelivery(orderId: string, delivererId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.delivererId !== delivererId) throw new ForbiddenException('Accès refusé');

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryAcceptedAt: new Date(),
        status: 'ready' as any,
      },
    });
  }

  // ── Livreur confirme la prise en charge ───────────────────────
  async pickupOrder(orderId: string, delivererId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.delivererId !== delivererId) throw new ForbiddenException('Accès refusé');

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryPickedAt: new Date(),
        status: 'picked' as any,
      },
    });
  }

  // ── Valider la livraison avec le code ─────────────────────────
  async validateDelivery(orderId: string, code: string, delivererId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.delivererId !== delivererId) throw new ForbiddenException('Accès refusé');
    if (order.deliveryCode !== code.toUpperCase()) throw new ForbiddenException('Code incorrect');

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryValidatedAt: new Date(),
        status: 'delivered' as any,
        reviewsUnlocked: true,
      },
    });

    // Incrémenter les stats du livreur
    await this.prisma.user.update({
      where: { firebaseUid: delivererId },
      data: {
        totalDeliveries: { increment: 1 },
        totalEarnings:   { increment: order.deliveryFee },
      },
    });

    return { success: true, message: 'Livraison validée' };
  }

  // ── Commandes disponibles pour un livreur ─────────────────────
  async getDelivererOrders(delivererId: string) {
    return this.prisma.order.findMany({
      where: { delivererId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Calcul du tarif livraison ─────────────────────────────────
  async calcDeliveryFee(delivererId: string, fromZone: string, toZone: string) {
    const deliverer = await this.prisma.user.findUnique({
      where: { firebaseUid: delivererId },
      select: {
        deliveryPriceSameZone: true,
        deliveryPriceOtherZone: true,
      },
    });
    if (!deliverer) throw new NotFoundException('Livreur introuvable');

    const fee = fromZone === toZone
      ? deliverer.deliveryPriceSameZone ?? 1000
      : deliverer.deliveryPriceOtherZone ?? 2000;

    return { fee, fromZone, toZone };
  }
}
