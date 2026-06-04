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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProductsService = class ProductsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createProduct(dto, sellerId) {
        const seller = await this.prisma.user.findUnique({
            where: { firebaseUid: sellerId },
            select: { name: true, phone: true, photoURL: true, isVerified: true, isPremium: true, isBanned: true },
        });
        if (!seller)
            throw new common_1.NotFoundException('Vendeur introuvable');
        if (seller.isBanned)
            throw new common_1.ForbiddenException('Compte suspendu');
        const product = await this.prisma.product.create({
            data: {
                title: dto.title,
                description: dto.description,
                price: dto.price,
                originalPrice: dto.originalPrice,
                category: dto.category,
                neighborhood: dto.neighborhood,
                neighborhoods: dto.neighborhoods ?? [dto.neighborhood],
                images: dto.images,
                condition: dto.condition,
                quantity: dto.quantity ?? 1,
                status: dto.status ?? 'active',
                sellerId,
                sellerName: seller.name,
                sellerPhone: seller.phone ?? undefined,
                sellerPhoto: seller.photoURL ?? undefined,
                sellerVerified: seller.isVerified,
                sellerPremium: seller.isPremium,
            },
        });
        if (dto.status !== 'draft') {
            await this.prisma.user.update({
                where: { firebaseUid: sellerId },
                data: { productCount: { increment: 1 } },
            });
        }
        return product;
    }
    async getProducts(filters) {
        const take = filters?.limit ?? 50;
        const where = {
            status: { in: ['active', 'sold'] },
            ...(filters?.category && filters.category !== 'all' ? { category: filters.category } : {}),
            ...(filters?.neighborhood && filters.neighborhood !== 'all'
                ? { neighborhoods: { has: filters.neighborhood } }
                : {}),
            ...(filters?.search
                ? {
                    OR: [
                        { title: { contains: filters.search, mode: 'insensitive' } },
                        { description: { contains: filters.search, mode: 'insensitive' } },
                        { category: { contains: filters.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const products = await this.prisma.product.findMany({
            where,
            orderBy: [
                { sellerVerified: 'desc' },
                { createdAt: 'desc' },
            ],
            take,
            ...(filters?.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
        });
        return {
            products,
            nextCursor: products.length === take ? products[products.length - 1].id : null,
        };
    }
    async getProductById(productId) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: {
                likes: { select: { userId: true } },
                comments: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!product)
            throw new common_1.NotFoundException('Produit introuvable');
        return product;
    }
    async getSellerProducts(sellerId, status) {
        return this.prisma.product.findMany({
            where: {
                sellerId,
                ...(status ? { status: status } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateProduct(productId, dto, userId) {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new common_1.NotFoundException('Produit introuvable');
        if (product.sellerId !== userId)
            throw new common_1.ForbiddenException('Accès refusé');
        return this.prisma.product.update({
            where: { id: productId },
            data: { ...dto },
        });
    }
    async deleteProduct(productId, userId) {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new common_1.NotFoundException('Produit introuvable');
        if (product.sellerId !== userId)
            throw new common_1.ForbiddenException('Accès refusé');
        await this.prisma.product.delete({ where: { id: productId } });
        await this.prisma.user.update({
            where: { firebaseUid: userId },
            data: { productCount: { decrement: 1 } },
        });
        return { deleted: true };
    }
    async incrementView(productId) {
        return this.prisma.product.update({
            where: { id: productId },
            data: { viewCount: { increment: 1 } },
        });
    }
    async incrementWhatsApp(productId) {
        return this.prisma.product.update({
            where: { id: productId },
            data: { whatsappClickCount: { increment: 1 } },
        });
    }
    async toggleLike(productId, userId) {
        const existing = await this.prisma.productLike.findUnique({
            where: { productId_userId: { productId, userId } },
        });
        if (existing) {
            await this.prisma.productLike.delete({
                where: { productId_userId: { productId, userId } },
            });
            await this.prisma.product.update({
                where: { id: productId },
                data: { likeCount: { decrement: 1 } },
            });
            return { liked: false };
        }
        else {
            await this.prisma.productLike.create({ data: { productId, userId } });
            await this.prisma.product.update({
                where: { id: productId },
                data: { likeCount: { increment: 1 } },
            });
            return { liked: true };
        }
    }
    async addComment(productId, userId, text, photoUrl) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: userId },
            select: { name: true, photoURL: true, isVerified: true },
        });
        if (!user)
            throw new common_1.NotFoundException('Utilisateur introuvable');
        if (text.length > 500)
            throw new common_1.ForbiddenException('Commentaire trop long');
        const comment = await this.prisma.productComment.create({
            data: {
                productId,
                userId,
                userName: user.name,
                userPhoto: user.photoURL ?? undefined,
                userVerified: user.isVerified,
                text,
                photoUrl,
            },
        });
        await this.prisma.product.update({
            where: { id: productId },
            data: { commentCount: { increment: 1 } },
        });
        return comment;
    }
    async deleteComment(commentId, userId) {
        const comment = await this.prisma.productComment.findUnique({
            where: { id: commentId },
            include: { product: { select: { sellerId: true } } },
        });
        if (!comment)
            throw new common_1.NotFoundException('Commentaire introuvable');
        const canDelete = comment.userId === userId || comment.product.sellerId === userId;
        if (!canDelete)
            throw new common_1.ForbiddenException('Accès refusé');
        await this.prisma.productComment.delete({ where: { id: commentId } });
        await this.prisma.product.update({
            where: { id: comment.productId },
            data: { commentCount: { decrement: 1 } },
        });
        return { deleted: true };
    }
    async getTrending() {
        return this.prisma.product.findMany({
            where: { status: 'active' },
            orderBy: [
                { likeCount: 'desc' },
                { viewCount: 'desc' },
            ],
            take: 20,
        });
    }
    async toggleBookmark(productId, userId) {
        const existing = await this.prisma.bookmark.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        if (existing) {
            await this.prisma.bookmark.delete({
                where: { userId_productId: { userId, productId } },
            });
            await this.prisma.product.update({
                where: { id: productId },
                data: { bookmarkCount: { decrement: 1 } },
            });
            return { bookmarked: false };
        }
        else {
            await this.prisma.bookmark.create({ data: { userId, productId } });
            await this.prisma.product.update({
                where: { id: productId },
                data: { bookmarkCount: { increment: 1 } },
            });
            return { bookmarked: true };
        }
    }
    async getUserBookmarks(userId) {
        const bookmarks = await this.prisma.bookmark.findMany({
            where: { userId },
            include: { product: true },
            orderBy: { createdAt: 'desc' },
        });
        return bookmarks.map(b => b.product);
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map