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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OrdersService = class OrdersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createOrder(dto, buyerId) {
        const buyer = await this.prisma.user.findUnique({
            where: { firebaseUid: buyerId },
            select: { firebaseUid: true, name: true, photoURL: true, isBanned: true },
        });
        if (!buyer)
            throw new common_1.NotFoundException('Acheteur introuvable');
        if (buyer.isBanned)
            throw new common_1.ForbiddenException('Compte suspendu');
        const seller = await this.prisma.user.findUnique({
            where: { firebaseUid: dto.sellerId },
            select: { firebaseUid: true, name: true, isBanned: true },
        });
        if (!seller)
            throw new common_1.NotFoundException('Vendeur introuvable');
        if (seller.isBanned)
            throw new common_1.ForbiddenException('Vendeur suspendu');
        const order = await this.prisma.order.create({
            data: {
                buyerId: buyer.firebaseUid,
                buyerName: buyer.name,
                buyerPhoto: buyer.photoURL ?? undefined,
                sellerId: seller.firebaseUid,
                sellerName: dto.sellerName,
                sellerPhoto: dto.sellerPhoto,
                productId: dto.productId,
                productTitle: dto.productTitle,
                productImage: dto.productImage,
                productPrice: dto.productPrice,
                deliveryFee: dto.deliveryFee,
                totalAmount: dto.totalAmount,
                brumerieFee: dto.brumerieFee ?? 0,
                sellerReceives: dto.sellerReceives,
                paymentMethod: dto.paymentMethod,
                paymentPhone: dto.paymentPhone,
                paymentHolderName: dto.paymentHolderName,
                paymentWaveLink: dto.paymentWaveLink,
                deliveryType: dto.deliveryType,
                isCOD: dto.isCOD ?? false,
                buyerAWCode: dto.buyerAWCode,
                buyerAWRepere: dto.buyerAWRepere,
                buyerAWLatitude: dto.buyerAWLatitude,
                buyerAWLongitude: dto.buyerAWLongitude,
                status: 'initiated',
            },
        });
        return order;
    }
    async getUserOrders(userId) {
        return this.prisma.order.findMany({
            where: {
                OR: [
                    { buyerId: userId },
                    { sellerId: userId },
                    { delivererId: userId },
                ],
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getOrderById(orderId, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order)
            throw new common_1.NotFoundException('Commande introuvable');
        const isParticipant = order.buyerId === userId ||
            order.sellerId === userId ||
            order.delivererId === userId;
        if (!isParticipant)
            throw new common_1.ForbiddenException('Accès refusé');
        return order;
    }
    async updateOrderStatus(orderId, userId, status, extra) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Commande introuvable');
        const isParticipant = order.buyerId === userId ||
            order.sellerId === userId ||
            order.delivererId === userId;
        if (!isParticipant)
            throw new common_1.ForbiddenException('Accès refusé');
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: status, updatedAt: new Date(), ...extra },
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map