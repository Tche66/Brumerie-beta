import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { EventBusModule } from './infrastructure/event-bus/event-bus.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { TrustModule } from './trust/trust.module';
import { MessagingModule } from './messaging/messaging.module';
import { DeliveryModule } from './delivery/delivery.module';
import { ReferralsModule } from './referrals/referrals.module';
import { BoostsModule } from './boosts/boosts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MigrationModule } from './migration/migration.module';
import { SeoModule } from './seo/seo.module';
import { BrumeIaModule } from './brume-ia/brume-ia.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    PrismaModule,
    EventBusModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    TrustModule,
    MessagingModule,
    DeliveryModule,
    ReferralsModule,
    BoostsModule,
    DashboardModule,
    MigrationModule,
    SeoModule,
    BrumeIaModule,
  ],
})
export class AppModule {}
