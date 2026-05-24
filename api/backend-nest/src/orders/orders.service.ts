import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../infrastructure/event-bus/event-bus.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
  ) {}

  async createOrder(createOrderDto: any, buyerId: string, context?: any) {
    const { sellerId, amount } = createOrderDto;

    // Validate both users exist
    const [buyer, seller] = await Promise.all([
      this.prisma.user.findUnique({ where: { firebaseUid: buyerId } }),
      this.prisma.user.findUnique({ where: { firebaseUid: sellerId } }),
    ]);

    if (!buyer || !seller) {
      throw new Error('Invalid buyer or seller');
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          buyerId: buyer.firebaseUid,
          sellerId: seller.firebaseUid,
          amount,
          status: 'initiated',
        },
      });

      // Emit event for async processing
      await this.eventBus.emit('order.created', {
        orderId: order.id,
        buyerId: buyer.firebaseUid,
        sellerId: seller.firebaseUid,
        amount: order.amount,
        status: order.status,
      }, context);

      return order;
    });
  }

  async getUserOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  }
}