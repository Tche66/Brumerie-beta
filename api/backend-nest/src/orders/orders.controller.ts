import {
  Controller, Post, Get, Patch, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(FirebaseAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // POST /orders — créer une commande
  @Post()
  async createOrder(@Body() dto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.createOrder(dto, req.user.uid);
  }

  // GET /orders/my — mes commandes
  @Get('my')
  async getMyOrders(@Req() req: any) {
    return this.ordersService.getUserOrders(req.user.uid);
  }

  // GET /orders/:id — détail d'une commande
  @Get(':id')
  async getOrder(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.getOrderById(id, req.user.uid);
  }

  // PATCH /orders/:id/status — mettre à jour le statut
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; extra?: Record<string, any> },
    @Req() req: any,
  ) {
    return this.ordersService.updateOrderStatus(id, req.user.uid, body.status, body.extra);
  }
}
