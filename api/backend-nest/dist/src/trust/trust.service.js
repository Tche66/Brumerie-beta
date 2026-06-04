"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TrustService = class TrustService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createReview(dto, reviewerId) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
        });
        if (!order)
            throw new common_1.NotFoundException('Commande introuvable');
        const isParticipant = order.buyerId === reviewerId ||
            order.sellerId === reviewerId ||
            order.delivererId === reviewerId;
        if (!isParticipant)
            throw new common_1.ForbiddenException('Accès refusé');
        if (!order.reviewsUnlocked)
            throw new common_1.ForbiddenException('Avis non encore débloqués pour cette commande');
        const reviewer = await this.prisma.user.findUnique({
            where: { firebaseUid: reviewerId },
            select: { name: true, photoURL: true },
        });
        if (!reviewer)
            throw new common_1.NotFoundException('Utilisateur introuvable');
        const review = await this.prisma.review.create({
            data: {
                orderId: dto.orderId,
                productId: dto.productId,
                productTitle: dto.productTitle,
                fromUserId: reviewerId,
                fromUserName: reviewer.name,
                fromUserPhoto: reviewer.photoURL ?? undefined,
                fromUserNeighborhood: dto.fromUserNeighborhood,
                toUserId: dto.toUserId,
                role: dto.role,
                rating: dto.rating,
                comment: dto.comment ?? '',
            },
        });
        await this.updateTrustScore(dto.toUserId);
        return review;
    }
    async updateTrustScore(userId) {
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
        await this.prisma.trustScore.upsert({
            where: { userId },
            update: { score, reviewCount: count },
            create: { userId, score, reviewCount: count },
        });
        await this.prisma.user.update({
            where: { firebaseUid: userId },
            data: { trustScore: score, reviewCount: count },
        });
        return score;
    }
    async getTrustScore(userId) {
        const score = await this.prisma.trustScore.findUnique({
            where: { userId },
        });
        return score ?? { userId, score: 5.0, reviewCount: 0 };
    }
    async createTrustReport(reporterId, reportedId, details) {
        if (details.length < 20) {
            throw new common_1.ForbiddenException('Le signalement doit faire au moins 20 caractères');
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
};
exports.TrustService = TrustService;
exports.TrustService = TrustService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TrustService);
//# sourceMappingURL=trust.service.js.map