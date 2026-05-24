import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class TrustService {
  constructor(private prisma: PrismaService) {}

  // ── Créer un avis ─────────────────────────────────────────────
  async createReview(dto: CreateReviewDto, reviewerId: string) {
    // Vérifier que la commande existe et que le reviewer est participant
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    const isParticipant =
      order.buyerId === reviewerId ||
      order.sellerId === reviewerId ||
      order.delivererId === reviewerId;

    if (!isParticipant) throw new ForbiddenException('Accès refusé');
    if (!order.reviewsUnlocked) throw new ForbiddenException('Avis non encore débloqués pour cette commande');

    // Récupérer les infos du reviewer
    const reviewer = await this.prisma.user.findUnique({
      where: { firebaseUid: reviewerId },
      select: { name: true, photoURL: true },
    });
    if (!reviewer) throw new NotFoundException('Utilisateur introuvable');

    const review = await this.prisma.review.create({
      data: {
        orderId:              dto.orderId,
        productId:            dto.productId,
        productTitle:         dto.productTitle,
        fromUserId:           reviewerId,
        fromUserName:         reviewer.name,
        fromUserPhoto:        reviewer.photoURL ?? undefined,
        fromUserNeighborhood: dto.fromUserNeighborhood,
        toUserId:             dto.toUserId,
        role:                 dto.role,
        rating:               dto.rating,
        comment:              dto.comment ?? '',
      },
    });

    // Mettre à jour le trust score du destinataire
    await this.updateTrustScore(dto.toUserId);

    return review;
  }

  // ── Trust score avec lissage Amazon ──────────────────────────
  private async updateTrustScore(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { toUserId: userId },
      select: { rating: true },
    });

    const count = reviews.length;
    const smoothingFactor = 3;
    const defaultScore = 5;

    let weighted = defaultScore;
    if (count > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = sum / count;
      weighted = (avg * count + defaultScore * smoothingFactor) / (count + smoothingFactor);
    }

    const score = Math.round(weighted * 100) / 100;

    // Upsert trust_scores
    await this.prisma.trustScore.upsert({
      where: { userId },
      update: { score, reviewCount: count },
      create: { userId, score, reviewCount: count },
    });

    // Dénormaliser sur le user
    await this.prisma.user.update({
      where: { firebaseUid: userId },
      data: { trustScore: score, reviewCount: count },
    });

    return score;
  }

  // ── Récupérer le trust score d'un user ───────────────────────
  async getTrustScore(userId: string) {
    const score = await this.prisma.trustScore.findUnique({
      where: { userId },
    });
    return score ?? { userId, score: 5.0, reviewCount: 0 };
  }

  // ── Créer un signalement ─────────────────────────────────────
  async createTrustReport(
    reporterId: string,
    reportedId: string,
    details: string,
  ) {
    if (details.length < 20) {
      throw new ForbiddenException('Le signalement doit faire au moins 20 caractères');
    }

    return this.prisma.trustReport.create({
      data: {
        reporterId,
        reportedId,
        details,
        status: 'pending',
      },
    });
  }
}
