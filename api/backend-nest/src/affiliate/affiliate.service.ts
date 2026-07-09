import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AFFILIATE_RATE = 0.20;
const MONTHLY_CAP = 50000;
const AFFILIATION_DURATION_MONTHS = 12;

@Injectable()
export class AffiliateService {
  private readonly logger = new Logger(AffiliateService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // ENREGISTRER UN GAIN — appelé à chaque release escrow
  // ═══════════════════════════════════════════════════════════════
  async recordEarning(filleulId: string, commissionAmount: number, transactionId: string): Promise<void> {
    const now = new Date();

    const affiliation = await this.prisma.vendorAffiliation.findFirst({
      where: {
        filleulId,
        actif: true,
        dateFin: { gt: now },
      },
    });

    if (!affiliation) return;

    const partBrute = Math.round(commissionAmount * AFFILIATE_RATE);
    const mois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Upsert atomique avec plafond
    const existing = await this.prisma.affiliateEarning.findUnique({
      where: { affiliationId_mois: { affiliationId: affiliation.id, mois } },
    });

    if (existing) {
      const newCumul = existing.montantCumuleBrut + partBrute;
      const newDu = Math.min(newCumul, MONTHLY_CAP);

      await this.prisma.affiliateEarning.update({
        where: { id: existing.id },
        data: { montantCumuleBrut: newCumul, montantDu: newDu },
      });

      this.logger.log(`Affiliate earning updated: parrain=${affiliation.parrainId}, mois=${mois}, cumul=${newCumul}, du=${newDu}, tx=${transactionId}`);
    } else {
      const montantDu = Math.min(partBrute, MONTHLY_CAP);

      await this.prisma.affiliateEarning.create({
        data: {
          affiliationId: affiliation.id,
          mois,
          montantCumuleBrut: partBrute,
          montantDu,
        },
      });

      this.logger.log(`Affiliate earning created: parrain=${affiliation.parrainId}, mois=${mois}, brut=${partBrute}, du=${montantDu}, tx=${transactionId}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INSCRIRE UN FILLEUL — appelé à l'inscription vendeur avec code
  // ═══════════════════════════════════════════════════════════════
  async registerFilleul(filleulId: string, codeAffiliation: string): Promise<boolean> {
    const parrain = await this.prisma.user.findFirst({
      where: { referralCode: codeAffiliation, role: 'seller' },
    });

    if (!parrain) return false;
    if (parrain.firebaseUid === filleulId) return false;

    const existing = await this.prisma.vendorAffiliation.findUnique({
      where: { filleulId },
    });
    if (existing) return false;

    const dateDebut = new Date();
    const dateFin = new Date(dateDebut);
    dateFin.setMonth(dateFin.getMonth() + AFFILIATION_DURATION_MONTHS);

    await this.prisma.vendorAffiliation.create({
      data: {
        parrainId: parrain.firebaseUid,
        filleulId,
        codeAffiliation,
        dateDebut,
        dateFin,
      },
    });

    this.logger.log(`Affiliation created: parrain=${parrain.firebaseUid}, filleul=${filleulId}, expires=${dateFin.toISOString()}`);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD PARRAIN — earnings du parrain
  // ═══════════════════════════════════════════════════════════════
  async getParrainDashboard(parrainId: string) {
    const affiliations = await this.prisma.vendorAffiliation.findMany({
      where: { parrainId },
      include: {
        earnings: { orderBy: { mois: 'desc' }, take: 12 },
      },
    });

    const now = new Date();
    const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalEarnedAllTime = 0;
    let totalThisMonth = 0;
    const filleuls: any[] = [];

    for (const aff of affiliations) {
      const filleul = await this.prisma.user.findUnique({
        where: { firebaseUid: aff.filleulId },
        select: { name: true, photoURL: true, createdAt: true },
      });

      const earningThisMonth = aff.earnings.find(e => e.mois === moisCourant);
      const totalForFilleul = aff.earnings.reduce((sum, e) => sum + e.montantDu, 0);

      totalEarnedAllTime += totalForFilleul;
      totalThisMonth += earningThisMonth?.montantDu || 0;

      filleuls.push({
        id: aff.filleulId,
        name: filleul?.name || 'Vendeur',
        photo: filleul?.photoURL || null,
        dateDebut: aff.dateDebut,
        dateFin: aff.dateFin,
        actif: aff.actif && aff.dateFin > now,
        gainMoisCourant: earningThisMonth?.montantDu || 0,
        gainTotal: totalForFilleul,
      });
    }

    return {
      totalEarnedAllTime,
      totalThisMonth,
      plafondParFilleul: MONTHLY_CAP,
      tauxCommission: AFFILIATE_RATE * 100,
      filleuls,
      moisCourant,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CRON CLOTURE MENSUELLE — payer les parrains
  // ═══════════════════════════════════════════════════════════════
  async closeMonthlyEarnings(): Promise<{ paid: number; failed: number }> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const moisPrecedent = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    const pendingEarnings = await this.prisma.affiliateEarning.findMany({
      where: { mois: moisPrecedent, statut: 'pending', montantDu: { gt: 0 } },
      include: { affiliation: true },
    });

    let paid = 0;
    let failed = 0;

    for (const earning of pendingEarnings) {
      try {
        // TODO: Déclencher virement CinetPay vers parrain
        // Pour le MVP on marque comme paid (virement manuel)
        await this.prisma.affiliateEarning.update({
          where: { id: earning.id },
          data: { statut: 'paid', paidAt: new Date() },
        });
        paid++;
        this.logger.log(`Affiliate payout: parrain=${earning.affiliation.parrainId}, mois=${moisPrecedent}, montant=${earning.montantDu}`);
      } catch (e: any) {
        await this.prisma.affiliateEarning.update({
          where: { id: earning.id },
          data: { statut: 'failed' },
        });
        failed++;
        this.logger.error(`Affiliate payout failed: ${earning.id} - ${e.message}`);
      }
    }

    return { paid, failed };
  }

  // ═══════════════════════════════════════════════════════════════
  // DESACTIVER LES AFFILIATIONS EXPIREES
  // ═══════════════════════════════════════════════════════════════
  async deactivateExpired(): Promise<number> {
    const result = await this.prisma.vendorAffiliation.updateMany({
      where: { actif: true, dateFin: { lte: new Date() } },
      data: { actif: false },
    });
    if (result.count > 0) {
      this.logger.log(`Deactivated ${result.count} expired affiliations`);
    }
    return result.count;
  }
}
