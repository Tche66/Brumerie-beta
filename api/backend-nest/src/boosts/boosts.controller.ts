import { Controller, Post, Get, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { BoostsService } from './boosts.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';

@Controller('boosts')
export class BoostsController {
  constructor(private readonly boostsService: BoostsService) {}

  // POST /boosts — créer une demande de boost
  @Post()
  @UseGuards(FirebaseAuthGuard)
  async createBoost(
    @Body() body: { productId: string; duration: string; waveRef?: string },
    @Req() req: any,
  ) {
    return this.boostsService.createBoost({ ...body, sellerId: req.user.uid });
  }

  // GET /boosts/active — IDs des produits boostés
  @Get('active')
  async getBoostedIds() {
    return this.boostsService.getBoostedProductIds();
  }

  // GET /boosts/my — mes boosts
  @Get('my')
  @UseGuards(FirebaseAuthGuard)
  async getMyBoosts(@Req() req: any) {
    return this.boostsService.getSellerBoosts(req.user.uid);
  }

  // GET /boosts/pending — admin: boosts en attente
  @Get('pending')
  @UseGuards(FirebaseAuthGuard)
  async getPending() {
    return this.boostsService.getPendingBoosts();
  }

  // GET /boosts/all — admin: tous les boosts
  @Get('all')
  @UseGuards(FirebaseAuthGuard)
  async getAll() {
    return this.boostsService.getAllBoosts();
  }

  // PATCH /boosts/:id/activate — admin: activer
  @Patch(':id/activate')
  @UseGuards(FirebaseAuthGuard)
  async activate(@Param('id') id: string, @Req() req: any) {
    return this.boostsService.activateBoost(id, req.user.uid);
  }

  // PATCH /boosts/:id/reject — admin: rejeter
  @Patch(':id/reject')
  @UseGuards(FirebaseAuthGuard)
  async reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    return this.boostsService.rejectBoost(id, req.user.uid, body.reason);
  }
}
