import { PrismaService } from '../prisma/prisma.service';
export declare class ReferralsService {
    private prisma;
    constructor(prisma: PrismaService);
    applyReferral(newUserId: string, referralCode: string): Promise<{
        success: boolean;
        referrerId: string;
    }>;
    getReferralStats(userId: string): Promise<{
        nextReward: {
            threshold: number;
            extraPublications: number;
            extraChats: number;
            freeVerified: boolean;
        };
        referralLink: string;
        referralCode: string;
        referralCount: number;
        referralBonusPublications: number;
        referralBonusChats: number;
        referralFreeVerifiedUntil: Date;
    }>;
    getReferrals(userId: string): Promise<({
        referred: {
            name: string;
            photoURL: string;
            createdAt: Date;
        };
    } & {
        id: string;
        tier: import(".prisma/client").$Enums.ReferralTier | null;
        createdAt: Date;
        ownerId: string;
        referredId: string;
        rewardClaimed: boolean;
        claimedAt: Date | null;
    })[]>;
    getUserByReferralCode(code: string): Promise<{
        firebaseUid: string;
        name: string;
        photoURL: string;
    }>;
}
