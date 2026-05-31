import { Controller, Post, Get, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  // GET /delivery/available — livreurs disponibles
  @Get('available')
  async getAvailable(@Query('zone') zone?: string) {
    return this.deliveryService.getAvailableDeliverers(zone);
  }

  // GET /delivery/my-orders — commandes du livreur connecté
  @Get('my-orders')
  @UseGuards(FirebaseAuthGuard)
  async getMyOrders(@Req() req: any) {
    return this.deliveryService.getDelivererOrders(req.user.uid);
  }

  // GET /delivery/fee — calculer le tarif
  @Get('fee')
  async calcFee(
    @Query('delivererId') delivererId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.deliveryService.calcDeliveryFee(delivererId, from, to);
  }

  // POST /delivery/assign — assigner un livreur à une commande
  @Post('assign')
  @UseGuards(FirebaseAuthGuard)
  async assign(
    @Body() body: { orderId: string; delivererId: string; deliveryFee: number },
    @Req() req: any,
  ) {
    return this.deliveryService.assignDeliverer({ ...body, requestedBy: req.user.uid });
  }

  // PATCH /delivery/:orderId/accept — livreur accepte
  @Patch(':orderId/accept')
  @UseGuards(FirebaseAuthGuard)
  async accept(@Param('orderId') orderId: string, @Req() req: any) {
    return this.deliveryService.acceptDelivery(orderId, req.user.uid);
  }

  // PATCH /delivery/:orderId/pickup — livreur prend en charge
  @Patch(':orderId/pickup')
  @UseGuards(FirebaseAuthGuard)
  async pickup(@Param('orderId') orderId: string, @Req() req: any) {
    return this.deliveryService.pickupOrder(orderId, req.user.uid);
  }

  // PATCH /delivery/:orderId/validate — valider avec le code
  @Patch(':orderId/validate')
  @UseGuards(FirebaseAuthGuard)
  async validate(
    @Param('orderId') orderId: string,
    @Body() body: { code: string },
    @Req() req: any,
  ) {
    return this.deliveryService.validateDelivery(orderId, body.code, req.user.uid);
  }
}
