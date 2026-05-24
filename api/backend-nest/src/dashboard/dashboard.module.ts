import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { DLQDashboardController } from './dlq.controller';

@Module({
  controllers: [MetricsController, DLQDashboardController],
})
export class DashboardModule {}
