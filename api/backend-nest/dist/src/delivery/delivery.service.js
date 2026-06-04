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
exports.DeliveryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DeliveryService = class DeliveryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAvailableDeliverers(zone) {
        return this.prisma.user.findMany({
            where: {
                role: 'livreur',
                deliveryAvailable: true,
                isBanned: false,
                ...(zone ? { deliveryZones: { has: zone } } : {}),
            },
            select: {
                firebaseUid: true,
                name: true,
                photoURL: true,
                phone: true,
                neighborhood: true,
                deliveryZones: true,
                deliveryPriceSameZone: true,
                deliveryPriceOtherZone: true,
                deliveryBio: true,
                deliveryPhotoURL: true,
                totalDeliveries: true,
                trustScore: true,
                isVerified: true,
            },
            orderBy: [
                { isVerified: 'desc' },
                { totalDeliveries: 'desc' },
            ],
        });
    }
    async assignDeliverer(params) {
        const order = await this.prisma.order.findUnique({ where: { id: params.orderId } });
        if (!order)
            throw new common_1.NotFoundException('Commande introuvable');
        const canAssign = order.sellerId === params.requestedBy || order.buyerId === params.requestedBy;
        if (!canAssign)
            throw new common_1.ForbiddenException('Accès refusé');
        const deliverer = await this.prisma.user.findUnique({
            where: { firebaseUid: params.delivererId },
            select: { name: true, phone: true },
        });
        if (!deliverer)
            throw new common_1.NotFoundException('Livreur introuvable');
        const deliveryCode = Math.random().toString(36).slice(2, 8).toUpperCase();
        let newStatus = order.status;
        if (order.status === 'confirmed')
            newStatus = 'ready';
        return this.prisma.order.update({
            where: { id: params.orderId },
            data: {
                delivererId: params.delivererId,
                delivererName: deliverer.name,
                delivererPhone: deliverer.phone ?? undefined,
                delivererProposedBy: params.requestedBy,
                deliveryFee: params.deliveryFee,
                deliveryCode,
                deliveryCodeGeneratedAt: new Date(),
                deliveryRequestedAt: new Date(),
                status: newStatus,
            },
        });
    }
    async acceptDelivery(orderId, delivererId) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Commande introuvable');
        if (order.delivererId !== delivererId)
            throw new common_1.ForbiddenException('Accès refusé');
        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                deliveryAcceptedAt: new Date(),
                status: 'ready',
            },
        });
    }
    async pickupOrder(orderId, delivererId) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Commande introuvable');
        if (order.delivererId !== delivererId)
            throw new common_1.ForbiddenException('Accès refusé');
        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                deliveryPickedAt: new Date(),
                status: 'picked',
            },
        });
    }
    async validateDelivery(orderId, code, delivererId) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Commande introuvable');
        if (order.delivererId !== delivererId)
            throw new common_1.ForbiddenException('Accès refusé');
        if (order.deliveryCode !== code.toUpperCase())
            throw new common_1.ForbiddenException('Code incorrect');
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                deliveryValidatedAt: new Date(),
                status: 'delivered',
                reviewsUnlocked: true,
            },
        });
        await this.prisma.user.update({
            where: { firebaseUid: delivererId },
            data: {
                totalDeliveries: { increment: 1 },
                totalEarnings: { increment: order.deliveryFee },
            },
        });
        return { success: true, message: 'Livraison validée' };
    }
    async getDelivererOrders(delivererId) {
        return this.prisma.order.findMany({
            where: { delivererId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async calcDeliveryFee(delivererId, fromZone, toZone) {
        const deliverer = await this.prisma.user.findUnique({
            where: { firebaseUid: delivererId },
            select: {
                deliveryPriceSameZone: true,
                deliveryPriceOtherZone: true,
            },
        });
        if (!deliverer)
            throw new common_1.NotFoundException('Livreur introuvable');
        const fee = fromZone === toZone
            ? deliverer.deliveryPriceSameZone ?? 1000
            : deliverer.deliveryPriceOtherZone ?? 2000;
        return { fee, fromZone, toZone };
    }
};
exports.DeliveryService = DeliveryService;
exports.DeliveryService = DeliveryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DeliveryService);
//# sourceMappingURL=delivery.service.js.map