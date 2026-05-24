import { Global, Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { DLQService } from './dlq.service';

@Global()
@Module({
  providers: [EventBusService, DLQService],
  exports: [EventBusService, DLQService],
})
export class EventBusModule {}
