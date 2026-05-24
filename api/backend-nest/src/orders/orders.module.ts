import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../infrastructure/event-bus/event-bus.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService, EventBusService],
})
export class OrdersModule {}