import {
  Controller, Post, Delete, Body, Headers, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Controller('migration')
export class MigrationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private checkKey(key: string) {
    const secret = this.config.get('MIGRATION_SECRET') || 'brumerie-migrate-2026';
    if (key !== secret) throw new UnauthorizedException('Invalid migration key');
  }

  @Delete('reset')
  async resetAll(@Headers('x-migration-key') key: string) {
    this.checkKey(key);
    // Supprimer dans l'ordre pour respecter les foreign keys
    await this.prisma.productComment.deleteMany({});
    await this.prisma.productLike.deleteMany({});
    await this.prisma.bookmark.deleteMany({});
    await this.prisma.repost.deleteMany({});
    await this.prisma.review.deleteMany({});
    await this.prisma.productBoost.deleteMany({});
    await this.prisma.order.deleteMany({});
    await this.prisma.product.deleteMany({});
    return { status: 'reset_complete' };
  }

  @Post('product')
  async importProduct(
    @Headers('x-migration-key') key: string,
    @Body() body: any,
  ) {
    this.checkKey(key);

    const { firebaseId, sellerId, title, description, price, originalPrice,
      category, neighborhood, neighborhoods, images, condition, quantity, status } = body;

    if (!firebaseId || !sellerId || !title) {
      throw new BadRequestException('Missing firebaseId, sellerId or title');
    }

    const existing = await this.prisma.product.findUnique({ where: { firebaseId } });
    if (existing) return { status: 'skipped', id: existing.id };

    const seller = await this.prisma.user.findUnique({
      where: { firebaseUid: sellerId },
      select: { name: true, phone: true, photoURL: true, isVerified: true, isPremium: true },
    });

    if (!seller) throw new BadRequestException(`Seller ${sellerId} not found in Neon`);

    const product = await this.prisma.product.create({
      data: {
        firebaseId,
        title,
        description: description || title,
        price: Math.round(Number(price) || 0),
        originalPrice: originalPrice ? Math.round(Number(originalPrice)) : undefined,
        category: category || 'autre',
        neighborhood: neighborhood || 'Abidjan',
        neighborhoods: neighborhoods || [neighborhood || 'Abidjan'],
        images: images || [],
        condition: ['new', 'like_new', 'second_hand'].includes(condition) ? condition : undefined,
        quantity: quantity || 1,
        status: ['active', 'sold', 'paused', 'draft'].includes(status) ? status : 'active',
        sellerId,
        sellerName: seller.name,
        sellerPhone: seller.phone ?? undefined,
        sellerPhoto: seller.photoURL ?? undefined,
        sellerVerified: seller.isVerified,
        sellerPremium: seller.isPremium,
      },
    });

    return { status: 'created', id: product.id };
  }

  @Post('order')
  async importOrder(
    @Headers('x-migration-key') key: string,
    @Body() body: any,
  ) {
    this.checkKey(key);

    const { firebaseId, buyerId, sellerId, productFirebaseId, productTitle,
      productImage, productPrice, deliveryFee, totalAmount, brumerieFee,
      sellerReceives, paymentMethod, paymentPhone, paymentHolderName,
      deliveryType, isCOD, status } = body;

    if (!firebaseId || !buyerId || !sellerId) {
      throw new BadRequestException('Missing firebaseId, buyerId or sellerId');
    }

    const existing = await this.prisma.order.findUnique({ where: { firebaseId } });
    if (existing) return { status: 'skipped', id: existing.id };

    const buyer = await this.prisma.user.findUnique({
      where: { firebaseUid: buyerId },
      select: { firebaseUid: true, name: true, photoURL: true },
    });
    if (!buyer) throw new BadRequestException(`Buyer ${buyerId} not found in Neon`);

    const seller = await this.prisma.user.findUnique({
      where: { firebaseUid: sellerId },
      select: { firebaseUid: true, name: true, photoURL: true },
    });
    if (!seller) throw new BadRequestException(`Seller ${sellerId} not found in Neon`);

    let productId: string | undefined;
    if (productFirebaseId) {
      const product = await this.prisma.product.findUnique({
        where: { firebaseId: productFirebaseId },
        select: { id: true },
      });
      productId = product?.id;
    }

    if (!productId) {
      throw new BadRequestException(`Product ${productFirebaseId} not found in Neon — migrate products first`);
    }

    const validStatuses = ['initiated','proof_sent','confirmed','ready','picked',
      'delivered','cod_pending','cod_confirmed','cod_delivered','disputed','cancelled'];
    const orderStatus = validStatuses.includes(status) ? status : 'initiated';

    const order = await this.prisma.order.create({
      data: {
        firebaseId,
        buyerId: buyer.firebaseUid,
        buyerName: buyer.name,
        buyerPhoto: buyer.photoURL ?? undefined,
        sellerId: seller.firebaseUid,
        sellerName: seller.name,
        sellerPhoto: seller.photoURL ?? undefined,
        productId,
        productTitle: productTitle || 'Produit',
        productImage: productImage || '',
        productPrice: Math.round(Number(productPrice) || 0),
        deliveryFee: Math.round(Number(deliveryFee) || 0),
        totalAmount: Math.round(Number(totalAmount || productPrice) || 0),
        brumerieFee: Math.round(Number(brumerieFee) || 0),
        sellerReceives: Math.round(Number(sellerReceives || productPrice) || 0),
        paymentMethod: paymentMethod || 'wave',
        paymentPhone: paymentPhone || '',
        paymentHolderName: paymentHolderName || '',
        deliveryType: deliveryType === 'in_person' ? 'in_person' : 'delivery',
        isCOD: isCOD || false,
        status: orderStatus,
      },
    });

    return { status: 'created', id: order.id };
  }
}
