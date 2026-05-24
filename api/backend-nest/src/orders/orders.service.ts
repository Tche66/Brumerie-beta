import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // ── Créer une commande ────────────────────────────────────────
  async createOrder(dto: CreateOrderDto, buyerId: string) {
    // Vérifier que l'acheteur existe
    const buyer = await this.prisma.user.findUnique({
      where: { firebaseUid: buyerId },
      select: { firebaseUid: true, name: true, photoURL: true, isBanned: true },
    });
    if (!buyer) throw new NotFoundException('Acheteur introuvable');
    if (buyer.isBanned) throw new ForbiddenException('Compte suspendu');

    // Vérifier que le vendeur existe
    const seller = await this.prisma.user.findUnique({
      where: { firebaseUid: dto.sellerId },
      select: { firebaseUid: true, name: true, isBanned: true },
    });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    if (seller.isBanned) throw new ForbiddenException('Vendeur suspendu');

    // Créer la commande
    const order = await this.prisma.order.create({
      data: {
        buyerId:          buyer.firebaseUid,
        buyerName:        buyer.name,
        buyerPhoto:       buyer.photoURL ?? undefined,
        sellerId:         seller.firebaseUid,
        sellerName:       dto.sellerName,
        sellerPhoto:      dto.sellerPhoto,
        productId:        dto.productId,
        productTitle:     dto.productTitle,
        productImage:     dto.productImage,
        productPrice:     dto.productPrice,
        deliveryFee:      dto.deliveryFee,
        totalAmount:      dto.totalAmount,
        brumerieFee:      dto.brumerieFee ?? 0,
        sellerReceives:   dto.sellerReceives,
        paymentMethod:    dto.paymentMethod,
        paymentPhone:     dto.paymentPhone,
        paymentHolderName: dto.paymentHolderName,
        paymentWaveLink:  dto.paymentWaveLink,
        deliveryType:     dto.deliveryType,
        isCOD:            dto.isCOD ?? false,
        buyerAWCode:      dto.buyerAWCode,
        buyerAWRepere:    dto.buyerAWRepere,
        buyerAWLatitude:  dto.buyerAWLatitude,
        buyerAWLongitude: dto.buyerAWLongitude,
        status:           'initiated',
      },
    });

    return order;
  }

  // ── Récupérer les commandes d'un user (acheteur ou vendeur) ──
  async getUserOrders(userId: string) {
    return this.prisma.order.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
          { delivererId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Récupérer une commande par ID ─────────────────────────────
  async getOrderById(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    const isParticipant =
      order.buyerId === userId ||
      order.sellerId === userId ||
      order.delivererId === userId;

    if (!isParticipant) throw new ForbiddenException('Accès refusé');
    return order;
  }

  // ── Mettre à jour le statut ───────────────────────────────────
  async updateOrderStatus(
    orderId: string,
    userId: string,
    status: string,
    extra?: Record<string, any>,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');

    const isParticipant =
      order.buyerId === userId ||
      order.sellerId === userId ||
      order.delivererId === userId;

    if (!isParticipant) throw new ForbiddenException('Accès refusé');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as any, updatedAt: new Date(), ...extra },
    });
  }
}
