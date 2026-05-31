import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { EventBusModule } from './infrastructure/event-bus/event-bus.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { MessagingModule } from './messaging/messaging.module';
import { OrdersModule } from './orders/orders.module';
import { TrustModule } from './trust/trust.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    PrismaModule,
    EventBusModule,
    UsersModule,
    ProductsModule,
    MessagingModule,
    OrdersModule,
    TrustModule,
    DashboardModule,
  ],
})
export class AppModule {}
