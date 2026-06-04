import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
export declare class TrustService {
    private prisma;
    constructor(prisma: PrismaService);
    createReview(dto: CreateReviewDto, reviewerId: string): Promise<{
        id: string;
        productTitle: string;
        fromUserName: string;
        fromUserPhoto: string | null;
        fromUserNeighborhood: string | null;
        role: import(".prisma/client").$Enums.RatingRole;
        rating: number;
        comment: string;
        createdAt: Date;
        orderId: string;
        productId: string;
        fromUserId: string;
        toUserId: string;
    }>;
    private updateTrustScore;
    getTrustScore(userId: string): Promise<{
        id: string;
        updatedAt: Date;
        reviewCount: number;
        userId: string;
        score: number;
    } | {
        userId: string;
        score: number;
        reviewCount: number;
    }>;
    createTrustReport(reporterId: string, reportedId: string, details: string): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.TrustReportStatus;
        details: string;
        adminNote: string | null;
        reviewedAt: Date | null;
        reporterId: string;
        reportedId: string;
    }>;
}
