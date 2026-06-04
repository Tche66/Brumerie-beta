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
exports.BoostsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const BOOST_PLANS = [
    { duration: 'h24', hours: 24, price: 500 },
    { duration: 'h48', hours: 48, price: 900 },
    { duration: 'j7', hours: 168, price: 2500 },
];
let BoostsService = class BoostsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createBoost(data) {
        const plan = BOOST_PLANS.find(p => p.duration === data.duration);
        if (!plan)
            throw new common_1.ForbiddenException('Durée de boost invalide');
        const product = await this.prisma.product.findUnique({
            where: { id: data.productId },
            select: { title: true, sellerId: true },
        });
        if (!product)
            throw new common_1.NotFoundException('Produit introuvable');
        if (product.sellerId !== data.sellerId)
            throw new common_1.ForbiddenException('Accès refusé');
        const seller = await this.prisma.user.findUnique({
            where: { firebaseUid: data.sellerId },
            select: { name: true },
        });
        return this.prisma.productBoost.create({
            data: {
                productId: data.productId,
                productTitle: product.title,
                sellerId: data.sellerId,
                sellerName: seller?.name,
                duration: data.duration,
                price: plan.price,
                status: 'pending',
                waveRef: data.waveRef,
            },
        });
    }
    async activateBoost(boostId, adminId) {
        const boost = await this.prisma.productBoost.findUnique({ where: { id: boostId } });
        if (!boost)
            throw new common_1.NotFoundException('Boost introuvable');
        const plan = BOOST_PLANS.find(p => p.duration === boost.duration);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + plan.hours * 60 * 60 * 1000);
        return this.prisma.productBoost.update({
            where: { id: boostId },
            data: {
                status: 'active',
                activatedAt: now,
                activatedBy: adminId,
                startedAt: now,
                expiresAt,
            },
        });
    }
    async rejectBoost(boostId, adminId, reason) {
        return this.prisma.productBoost.update({
            where: { id: boostId },
            data: {
                status: 'rejected',
                activatedBy: adminId,
                rejectionReason: reason ?? 'Paiement non confirmé',
            },
        });
    }
    async getBoostedProductIds() {
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
    async getSellerBoosts(sellerId) {
        return this.prisma.productBoost.findMany({
            where: { sellerId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPendingBoosts() {
        return this.prisma.productBoost.findMany({
            where: { status: 'pending' },
            orderBy: { createdAt: 'asc' },
        });
    }
    async getAllBoosts() {
        return this.prisma.productBoost.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
};
exports.BoostsService = BoostsService;
exports.BoostsService = BoostsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BoostsService);
//# sourceMappingURL=boosts.service.js.map