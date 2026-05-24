import { Controller, Get, Post, Param } from '@nestjs/common';
import { DLQService } from '../infrastructure/event-bus/dlq.service';

@Controller('dashboard/dlq')
export class DLQDashboardController {
  constructor(private dlq: DLQService) {}

  @Get()
  async getDLQ() {
    return this.dlq.getDLQItems();
  }

  @Post(':id/replay')
  async replayDLQItem(@Param('id') id: string) {
    const item = await this.dlq.replayDLQItem(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return { status: 'queued_for_replay', item };
  }
}