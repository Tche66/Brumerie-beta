import { Injectable, Logger } from '@nestjs/common';
import { DLQService } from './dlq.service';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private handlers: Map<string, Function[]> = new Map();

  constructor(private dlq: DLQService) {}

  // S'abonner à un événement
  on(eventName: string, handler: Function) {
    const existing = this.handlers.get(eventName) ?? [];
    this.handlers.set(eventName, [...existing, handler]);
  }

  // Émettre un événement
  async emit(eventName: string, payload: any, context?: any) {
    const handlers = this.handlers.get(eventName) ?? [];
    this.logger.log(`Event: ${eventName} — ${handlers.length} handler(s)`);

    for (const handler of handlers) {
      try {
        await handler(payload, context);
      } catch (err: any) {
        this.logger.error(`Handler failed for ${eventName}: ${err.message}`);
        await this.dlq.enqueueDeadLetter({
          eventName,
          payload,
          error: err.message,
        });
      }
    }
  }
}
