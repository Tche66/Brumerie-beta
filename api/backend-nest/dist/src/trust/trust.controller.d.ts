import { TrustService } from './trust.service';
import { CreateReviewDto } from './dto/create-review.dto';
export declare class TrustController {
    private readonly trustService;
    constructor(trustService: TrustService);
    createReview(dto: CreateReviewDto, req: any): Promise<{
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
    createReport(body: {
        reportedId: string;
        details: string;
    }, req: any): Promise<{
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
