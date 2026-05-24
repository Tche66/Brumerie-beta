import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrustService {
  constructor(private prisma: PrismaService) {}

  async createReview(createReviewDto: any, reviewerId: string) {
    const { reviewedId, rating, comment } = createReviewDto;

    const review = await this.prisma.review.create({
      data: {
        reviewerId,
        reviewedId,
        rating,
        comment,
      },
    });

    // Update trust score with smoothing
    await this.updateTrustScore(reviewedId);

    return review;
  }

  private async updateTrustScore(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { reviewedId: userId },
    });

    const count = reviews.length;

    if (count === 0) {
      return this.prisma.user.update({
        where: { id: userId },
        data: { trustScore: 5.0 },
      });
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = sum / count;

    // Amazon-style smoothing
    const smoothingFactor = 3;
    const defaultScore = 5;
    const weighted = (avg * count + defaultScore * smoothingFactor) / (count + smoothingFactor);

    return this.prisma.user.update({
      where: { id: userId },
      data: { trustScore: Math.round(weighted * 100) / 100 },
    });
  }
}