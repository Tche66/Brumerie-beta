import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const BOOST_PLANS = [
  { duration: 'h24', hours: 24,  price: 500  },
  { duration: 'h48', hours: 48,  price: 900  },
  { duration: 'j7',  hours: 168, price: 2500 },
];

@Injectable()
export class BoostsService {
  constructor(private prisma: PrismaService) {}

  // ── Créer une demande de boost ────────────────────────────────
  async createBoost(data: {
    productId: string;
    sellerId: string;
    duration: string;
    waveRef?: string;
  }) {
    const plan = BOOST_PLANS.find(p => p.duration === data.duration);
    if (!plan) throw new ForbiddenException('Durée de boost invalide');

    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      select: { title: true, sellerId: true },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.sellerId !== data.sellerId) throw new ForbiddenException('Accès refusé');

    const seller = await this.prisma.user.findUnique({
      where: { firebaseUid: data.sellerId },
      select: { name: true },
    });

    return this.prisma.productBoost.create({
      data: {
        productId:    data.productId,
        productTitle: product.title,
        sellerId:     data.sellerId,
        sellerName:   seller?.name,
        duration:     data.duration as any,
        price:        plan.price,
        status:       'pending',
        waveRef:      data.waveRef,
      },
    });
  }

  // ── ADMIN — Activer un boost ──────────────────────────────────
  async activateBoost(boostId: string, adminId: string) {
    const boost = await this.prisma.productBoost.findUnique({ where: { id: boostId } });
    if (!boost) throw new NotFoundException('Boost introuvable');

    const plan = BOOST_PLANS.find(p => p.duration === boost.duration)!;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.hours * 60 * 60 * 1000);

    return this.prisma.productBoost.update({
      where: { id: boostId },
      data: {
        status:      'active',
        activatedAt: now,
        activatedBy: adminId,
        startedAt:   now,
        expiresAt,
      },
    });
  }

  // ── ADMIN — Rejeter un boost ──────────────────────────────────
  async rejectBoost(boostId: string, adminId: string, reason?: string) {
    return this.prisma.productBoost.update({
      where: { id: boostId },
      data: {
        status:         'rejected',
        activatedBy:    adminId,
        rejectionReason: reason ?? 'Paiement non confirmé',
      },
    });
  }

  // ── Boosts actifs — IDs des produits boostés ──────────────────
  async getBoostedProductIds(): Promise<string[]> {
    const boosts = await this.prisma.productBoost.findMany({
      where: {
        status: { in: ['active', 'pending'] },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { productId: true },
    });
    return boosts.map(b => b.productId);
  }

  // ── Boosts d'un vendeur ───────────────────────────────────────
  async getSellerBoosts(sellerId: string) {
    return this.prisma.productBoost.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── ADMIN — Boosts en attente ─────────────────────────────────
  async getPendingBoosts() {
    return this.prisma.productBoost.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── ADMIN — Tous les boosts ───────────────────────────────────
  async getAllBoosts() {
    return this.prisma.productBoost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
