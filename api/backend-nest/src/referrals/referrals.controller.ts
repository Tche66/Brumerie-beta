import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // POST /referrals/apply — appliquer un code parrainage
  @Post('apply')
  @UseGuards(FirebaseAuthGuard)
  async applyReferral(@Body() body: { code: string }, @Req() req: any) {
    return this.referralsService.applyReferral(req.user.uid, body.code);
  }

  // GET /referrals/stats — mes stats parrainage
  @Get('stats')
  @UseGuards(FirebaseAuthGuard)
  async getStats(@Req() req: any) {
    return this.referralsService.getReferralStats(req.user.uid);
  }

  // GET /referrals/my — mes filleuls
  @Get('my')
  @UseGuards(FirebaseAuthGuard)
  async getMyReferrals(@Req() req: any) {
    return this.referralsService.getReferrals(req.user.uid);
  }

  // GET /referrals/code/:code — trouver un user par son code
  @Get('code/:code')
  async getByCode(@Param('code') code: string) {
    return this.referralsService.getUserByReferralCode(code);
  }
}
