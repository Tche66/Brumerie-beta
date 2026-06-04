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
exports.ReferralsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const REFERRAL_REWARDS = [
    { threshold: 1, extraPublications: 2, extraChats: 5, freeVerified: false },
    { threshold: 3, extraPublications: 5, extraChats: 10, freeVerified: false },
    { threshold: 5, extraPublications: 10, extraChats: 20, freeVerified: false },
    { threshold: 10, extraPublications: 20, extraChats: 50, freeVerified: true },
    { threshold: 20, extraPublications: 50, extraChats: 100, freeVerified: true },
    { threshold: 50, extraPublications: 100, extraChats: 200, freeVerified: true },
];
let ReferralsService = class ReferralsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async applyReferral(newUserId, referralCode) {
        if (!referralCode.trim())
            throw new common_1.BadRequestException('Code invalide');
        const referrer = await this.prisma.user.findUnique({
            where: { referralCode: referralCode.toUpperCase() },
        });
        if (!referrer)
            throw new common_1.NotFoundException('Code de parrainage introuvable');
        if (referrer.firebaseUid === newUserId)
            throw new common_1.BadRequestException('Vous ne pouvez pas vous parrainer vous-même');
        const newUser = await this.prisma.user.findUnique({
            where: { firebaseUid: newUserId },
            select: { referredById: true },
        });
        if (!newUser)
            throw new common_1.NotFoundException('Utilisateur introuvable');
        if (newUser.referredById)
            throw new common_1.BadRequestException('Parrainage déjà appliqué');
        await this.prisma.referral.create({
            data: { ownerId: referrer.firebaseUid, referredId: newUserId },
        });
        await this.prisma.user.update({
            where: { firebaseUid: newUserId },
            data: { referredById: referrer.firebaseUid },
        });
        const newCount = referrer.referralCount + 1;
        const rewards = REFERRAL_REWARDS.filter(r => r.threshold <= newCount);
        const topReward = rewards[rewards.length - 1];
        const updateData = { referralCount: { increment: 1 } };
        if (topReward) {
            updateData.referralBonusPublications = topReward.extraPublications;
            updateData.referralBonusChats = topReward.extraChats;
            if (topReward.freeVerified && !referrer.referralFreeVerifiedUntil) {
                const until = new Date();
                until.setDate(until.getDate() + 30);
                updateData.referralFreeVerifiedUntil = until;
                updateData.isVerified = true;
            }
        }
        await this.prisma.user.update({
            where: { firebaseUid: referrer.firebaseUid },
            data: updateData,
        });
        return { success: true, referrerId: referrer.firebaseUid };
    }
    async getReferralStats(userId) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: userId },
            select: {
                referralCode: true,
                referralCount: true,
                referralBonusPublications: true,
                referralBonusChats: true,
                referralFreeVerifiedUntil: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Utilisateur introuvable');
        const nextReward = REFERRAL_REWARDS.find(r => r.threshold > (user.referralCount ?? 0));
        return {
            ...user,
            nextReward: nextReward ?? null,
            referralLink: `https://brumerie.com?ref=${user.referralCode}`,
        };
    }
    async getReferrals(userId) {
        return this.prisma.referral.findMany({
            where: { ownerId: userId },
            include: {
                referred: {
                    select: { name: true, photoURL: true, createdAt: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getUserByReferralCode(code) {
        const user = await this.prisma.user.findUnique({
            where: { referralCode: code.toUpperCase() },
            select: { firebaseUid: true, name: true, photoURL: true },
        });
        if (!user)
            throw new common_1.NotFoundException('Code introuvable');
        return user;
    }
};
exports.ReferralsService = ReferralsService;
exports.ReferralsService = ReferralsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReferralsService);
//# sourceMappingURL=referrals.service.js.map