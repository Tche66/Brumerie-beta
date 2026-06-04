import { ReferralsService } from './referrals.service';
export declare class ReferralsController {
    private readonly referralsService;
    constructor(referralsService: ReferralsService);
    applyReferral(body: {
        code: string;
    }, req: any): Promise<{
        success: boolean;
        referrerId: string;
    }>;
    getStats(req: any): Promise<{
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
    getMyReferrals(req: any): Promise<({
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
    getByCode(code: string): Promise<{
        firebaseUid: string;
        name: string;
        photoURL: string;
    }>;
}
