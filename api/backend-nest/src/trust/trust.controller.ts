import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TrustService } from './trust.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('trust')
@UseGuards(FirebaseAuthGuard)
export class TrustController {
  constructor(private readonly trustService: TrustService) {}

  @Post('reviews')
  async createReview(@Body() createReviewDto: CreateReviewDto, req) {
    return this.trustService.createReview(createReviewDto, req.user.uid);
  }
}