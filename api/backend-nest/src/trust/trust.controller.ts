import {
  Controller, Post, Get, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { TrustService } from './trust.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('trust')
@UseGuards(FirebaseAuthGuard)
export class TrustController {
  constructor(private readonly trustService: TrustService) {}

  // POST /trust/reviews — créer un avis
  @Post('reviews')
  async createReview(@Body() dto: CreateReviewDto, @Req() req: any) {
    return this.trustService.createReview(dto, req.user.uid);
  }

  // GET /trust/score/:userId — trust score d'un user
  @Get('score/:userId')
  async getTrustScore(@Param('userId') userId: string) {
    return this.trustService.getTrustScore(userId);
  }

  // POST /trust/reports — signaler un utilisateur
  @Post('reports')
  async createReport(
    @Body() body: { reportedId: string; details: string },
    @Req() req: any,
  ) {
    return this.trustService.createTrustReport(req.user.uid, body.reportedId, body.details);
  }
}
