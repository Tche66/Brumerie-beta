import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingModule } from './messaging/messaging.module';
import { OrdersModule } from './orders/orders.module';
import { TrustModule } from './trust/trust.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MessagingModule,
    OrdersModule,
    TrustModule,
    DashboardModule,
  ],
})
export class AppModule {}