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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async upsertUser(dto) {
        return this.prisma.user.upsert({
            where: { firebaseUid: dto.firebaseUid },
            update: {
                email: dto.email,
                name: dto.name,
                phone: dto.phone,
                photoURL: dto.photoURL,
            },
            create: {
                firebaseUid: dto.firebaseUid,
                email: dto.email,
                name: dto.name,
                phone: dto.phone,
                photoURL: dto.photoURL,
                role: dto.role ?? 'buyer',
                referralCode: this.generateReferralCode(dto.name),
            },
        });
    }
    async getUserByFirebaseUid(firebaseUid) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: {
                id: true,
                firebaseUid: true,
                email: true,
                name: true,
                phone: true,
                photoURL: true,
                role: true,
                tier: true,
                neighborhood: true,
                bio: true,
                isVerified: true,
                isPremium: true,
                isBanned: true,
                trustScore: true,
                reviewCount: true,
                followerCount: true,
                referralCode: true,
                referralCount: true,
                loyaltyPoints: true,
                hasPhysicalShop: true,
                managesDelivery: true,
                deliveryAvailable: true,
                deliveryPriceSameZone: true,
                deliveryPriceOtherZone: true,
                deliveryZones: true,
                shopUsername: true,
                shopBio: true,
                shopSlogan: true,
                shopThemeColor: true,
                shopBanner: true,
                shopWhatsapp: true,
                shopInstagram: true,
                shopTiktok: true,
                shopCategories: true,
                wishlistPublic: true,
                wishlistSlug: true,
                createdAt: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Utilisateur introuvable');
        return user;
    }
    async getPublicProfile(firebaseUid) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: {
                firebaseUid: true,
                name: true,
                photoURL: true,
                role: true,
                tier: true,
                neighborhood: true,
                bio: true,
                isVerified: true,
                isPremium: true,
                trustScore: true,
                reviewCount: true,
                followerCount: true,
                hasPhysicalShop: true,
                managesDelivery: true,
                deliveryAvailable: true,
                deliveryPriceSameZone: true,
                deliveryPriceOtherZone: true,
                deliveryZones: true,
                shopUsername: true,
                shopBio: true,
                shopSlogan: true,
                shopThemeColor: true,
                shopBanner: true,
                shopWhatsapp: true,
                shopInstagram: true,
                shopTiktok: true,
                shopCategories: true,
                wishlistPublic: true,
                createdAt: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Utilisateur introuvable');
        return user;
    }
    async updateProfile(firebaseUid, dto) {
        if (dto.shopUsername) {
            const existing = await this.prisma.user.findFirst({
                where: {
                    shopUsername: dto.shopUsername,
                    NOT: { firebaseUid },
                },
            });
            if (existing)
                throw new common_1.ConflictException('Ce nom de boutique est déjà pris');
        }
        return this.prisma.user.update({
            where: { firebaseUid },
            data: { ...dto },
        });
    }
    async toggleFollow(followerId, sellerId) {
        const follower = await this.prisma.user.findUnique({
            where: { firebaseUid: followerId },
            select: { followingSellerIds: true },
        });
        if (!follower)
            throw new common_1.NotFoundException('Utilisateur introuvable');
        const isFollowing = follower.followingSellerIds.includes(sellerId);
        if (isFollowing) {
            await this.prisma.user.update({
                where: { firebaseUid: followerId },
                data: {
                    followingSellerIds: {
                        set: follower.followingSellerIds.filter(id => id !== sellerId),
                    },
                },
            });
            await this.prisma.user.update({
                where: { firebaseUid: sellerId },
                data: { followerCount: { decrement: 1 } },
            });
            return { following: false };
        }
        else {
            await this.prisma.user.update({
                where: { firebaseUid: followerId },
                data: {
                    followingSellerIds: {
                        push: sellerId,
                    },
                },
            });
            await this.prisma.user.update({
                where: { firebaseUid: sellerId },
                data: { followerCount: { increment: 1 } },
            });
            return { following: true };
        }
    }
    async searchSellers(query, neighborhood) {
        return this.prisma.user.findMany({
            where: {
                role: { in: ['seller', 'livreur'] },
                isBanned: false,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { shopUsername: { contains: query, mode: 'insensitive' } },
                    { bio: { contains: query, mode: 'insensitive' } },
                ],
                ...(neighborhood ? { neighborhood } : {}),
            },
            select: {
                firebaseUid: true,
                name: true,
                photoURL: true,
                tier: true,
                neighborhood: true,
                trustScore: true,
                isVerified: true,
                isPremium: true,
                shopUsername: true,
                shopBio: true,
            },
            take: 20,
        });
    }
    async updatePresence(firebaseUid) {
        return this.prisma.user.update({
            where: { firebaseUid },
            data: { lastActiveAt: new Date() },
        });
    }
    generateReferralCode(name) {
        const base = name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${base}${suffix}`;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map