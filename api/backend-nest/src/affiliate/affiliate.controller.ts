import { Controller, Post, Body, Get, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';

@Controller('affiliate')
export class AffiliateController {
  constructor(private readonly affiliate: AffiliateService) {}

  // GET /affiliate/dashboard — Gains affiliation du vendeur connecté
  @Get('dashboard')
  @UseGuards(FirebaseAuthGuard)
  async dashboard(@Req() req: any) {
    try {
      const data = await this.affiliate.getParrainDashboard(req.user.uid);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // POST /affiliate/register — Inscrire un filleul avec un code
  @Post('register')
  @UseGuards(FirebaseAuthGuard)
  async register(@Req() req: any, @Body() body: { codeAffiliation: string }) {
    try {
      const created = await this.affiliate.registerFilleul(req.user.uid, body.codeAffiliation);
      if (!created) return { success: false, error: 'Code invalide ou déjà utilisé' };
      return { success: true, message: 'Affiliation enregistrée' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // POST /affiliate/cron/close-month — Clôture mensuelle (cron externe)
  @Post('cron/close-month')
  async cronCloseMonth(@Body() body: { secret?: string }) {
    if (body.secret !== (process.env.CRON_SECRET || 'brumerie-cron-2026')) {
      throw new ForbiddenException('Secret invalide');
    }
    const result = await this.affiliate.closeMonthlyEarnings();
    return { success: true, ...result };
  }

  // POST /affiliate/cron/deactivate-expired — Désactiver affiliations expirées
  @Post('cron/deactivate-expired')
  async cronDeactivate(@Body() body: { secret?: string }) {
    if (body.secret !== (process.env.CRON_SECRET || 'brumerie-cron-2026')) {
      throw new ForbiddenException('Secret invalide');
    }
    const count = await this.affiliate.deactivateExpired();
    return { success: true, deactivated: count };
  }
}
