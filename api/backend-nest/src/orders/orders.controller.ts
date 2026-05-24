import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { FirebaseAuthGuard } from '../../../src/common/guards/firebase-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(FirebaseAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto, req) {
    return this.ordersService.createOrder(createOrderDto, req.user.uid);
  }

  @Get('my')
  async getMyOrders(req) {
    return this.ordersService.getUserOrders(req.user.uid);
  }
}