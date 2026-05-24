import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { DLQDashboardController } from './dlq.controller';
import { DLQService } from '../infrastructure/event-bus/dlq.service';

@Module({
  controllers: [MetricsController, DLQDashboardController],
  providers: [DLQService],
})
export class DashboardModule {}