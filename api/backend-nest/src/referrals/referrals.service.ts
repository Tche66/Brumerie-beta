import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Paliers de récompense — miroir de REFERRAL_REWARDS frontend
const REFERRAL_REWARDS = [
  { threshold: 1,  extraPublications: 2,  extraChats: 5,  freeVerified: false },
  { threshold: 3,  extraPublications: 5,  extraChats: 10, freeVerified: false },
  { threshold: 5,  extraPublications: 10, extraChats: 20, freeVerified: false },
  { threshold: 10, extraPublications: 20, extraChats: 50, freeVerified: true  },
  { threshold: 20, extraPublications: 50, extraChats: 100, freeVerified: true },
  { threshold: 50, extraPublications: 100, extraChats: 200, freeVerified: true },
];

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  // ── Appliquer un parrainage à l'inscription ───────────────────
  // Un seul code, deux comportements : acheteur → parrainage classique, vendeur → affiliation 12 mois
  async applyReferral(newUserId: string, referralCode: string) {
    if (!referralCode.trim()) throw new BadRequestException('Code invalide');

    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
    });
    if (!referrer) throw new NotFoundException('Code de parrainage introuvable');
    if (referrer.firebaseUid === newUserId) throw new BadRequestException('Vous ne pouvez pas vous parrainer vous-même');

    const newUser = await this.prisma.user.findUnique({
      where: { firebaseUid: newUserId },
      select: { referredById: true, role: true, name: true },
    });
    if (!newUser) throw new NotFoundException('Utilisateur introuvable');
    if (newUser.referredById) throw new BadRequestException('Parrainage déjà appliqué');

    // Créer la relation de parrainage (commune à tous les rôles)
    await this.prisma.referral.create({
      data: { ownerId: referrer.firebaseUid, referredId: newUserId },
    });

    await this.prisma.user.update({
      where: { firebaseUid: newUserId },
      data: { referredById: referrer.firebaseUid },
    });

    // Récompenses parrain (paliers)
    const newCount = referrer.referralCount + 1;
    const rewards = REFERRAL_REWARDS.filter(r => r.threshold <= newCount);
    const topReward = rewards[rewards.length - 1];

    const updateData: any = { referralCount: { increment: 1 } };

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

    // ── Affiliation vendeur — créée dès l'inscription si le PARRAIN est vendeur.
    // Les 12 mois commencent maintenant. Que le filleul soit acheteur ou vendeur,
    // l'affiliation est prête. Les gains ne se déclenchent que quand le filleul
    // fait des ventes (peu importe quand il bascule en vendeur).
    let affiliationCreated = false;

    if (referrer.role === 'seller') {
      const existingAffiliation = await this.prisma.vendorAffiliation.findUnique({
        where: { filleulId: newUserId },
      });

      if (!existingAffiliation) {
        const dateDebut = new Date();
        const dateFin = new Date(dateDebut);
        dateFin.setMonth(dateFin.getMonth() + 12);

        await this.prisma.vendorAffiliation.create({
          data: {
            parrainId: referrer.firebaseUid,
            filleulId: newUserId,
            codeAffiliation: referralCode.toUpperCase(),
            dateDebut,
            dateFin,
          },
        });
        affiliationCreated = true;
      }
    }

    return {
      success: true,
      referrerId: referrer.firebaseUid,
      referrerName: referrer.name,
      affiliationCreated,
      message: affiliationCreated
        ? `Parrainage + Affiliation activés ! Si tu vends sur Brumerie, ${referrer.name} gagnera une part de commission pendant 12 mois.`
        : `Parrainage appliqué ! Ton parrain ${referrer.name} a été récompensé.`,
    };
  }

  // ── Stats de parrainage d'un user ─────────────────────────────
  async getReferralStats(userId: string) {
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
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Prochain palier
    const nextReward = REFERRAL_REWARDS.find(r => r.threshold > (user.referralCount ?? 0));

    return {
      ...user,
      nextReward: nextReward ?? null,
      referralLink: `https://brumerie.com?ref=${user.referralCode}`,
    };
  }

  // ── Filleuls d'un user ────────────────────────────────────────
  async getReferrals(userId: string) {
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

  // ── Trouver un user par code parrainage ───────────────────────
  async getUserByReferralCode(code: string) {
    const user = await this.prisma.user.findUnique({
      where: { referralCode: code.toUpperCase() },
      select: { firebaseUid: true, name: true, photoURL: true },
    });
    if (!user) throw new NotFoundException('Code introuvable');
    return user;
  }
}
